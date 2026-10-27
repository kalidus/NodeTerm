// ============================================
// SERVICIO DE WORKER DE ESTADÍSTICAS DEL SISTEMA
// Gestiona el worker que calcula las estadísticas del sistema
// ============================================

const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

function resolveWorkerExecPath() {
  const npmNode = process.env.npm_node_execpath;
  if (npmNode && fs.existsSync(npmNode)) {
    return npmNode;
  }
  return process.execPath;
}

let statsWorker = null;
let statsWorkerReady = false;
let statsWorkerQueue = [];
let pendingStatsSkips = 0;
let isShuttingDown = false;
let demandActive = false;
let powerPaused = false;
let baseIntervalMs = 2000;
let windowActivity = { minimized: false, focused: true };

function clampInterval(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return 2000;
  return Math.max(1000, Math.min(20000, Math.round(n)));
}

function desiredIntervalMs() {
  if (windowActivity.minimized) return Math.max(baseIntervalMs, 10000);
  if (!windowActivity.focused) {
    return Math.max(baseIntervalMs, Math.min(10000, baseIntervalMs * 2));
  }
  return baseIntervalMs;
}

function sendToWorker(msg) {
  if (!statsWorker || !statsWorkerReady) return;
  try {
    statsWorker.send(msg);
  } catch (_) {}
}

function syncWorkerRunState() {
  if (isShuttingDown) return;
  if (powerPaused || !demandActive) {
    sendToWorker('pause-stats');
    return;
  }
  ensureStatsWorker();
  sendToWorker('resume-stats');
  sendToWorker({ type: 'set-interval', interval: desiredIntervalMs() });
}

function startStatsWorker() {
  if (statsWorker || isShuttingDown) return;

  const workerPath = path.join(__dirname, '../../../system-stats-worker.js');
  const execPath = resolveWorkerExecPath();
  const env = { ...process.env };
  if (execPath === process.execPath) {
    env.ELECTRON_RUN_AS_NODE = '1';
  }

  statsWorker = fork(workerPath, [], {
    execPath,
    execArgv: [],
    silent: true,
    env
  });
  statsWorkerReady = true;
  console.log('[MEM] Stats worker arrancado (primer uso)');

  statsWorker.on('exit', () => {
    statsWorkerReady = false;
    statsWorker = null;
    if (!isShuttingDown) {
      setTimeout(() => {
        if (isShuttingDown || !demandActive || powerPaused) return;
        startStatsWorker();
        syncWorkerRunState();
      }, 1000);
    }
  });

  statsWorker.on('message', (msg) => {
    if (pendingStatsSkips > 0) {
      pendingStatsSkips -= 1;
      return;
    }
    const entry = statsWorkerQueue.shift();
    if (!entry || entry.settled) return;
    entry.settled = true;
    if (entry.timer) clearTimeout(entry.timer);
    if (msg && msg.type === 'stats') {
      entry.resolve(msg.data);
    } else {
      entry.resolve(getFallbackStats('WorkerError'));
    }
  });
}

const os = require('os');

function getFallbackStats(model = 'NoData') {
  return {
    cpu: { usage: 0, cores: 0, model },
    memory: { used: 0, total: 0, percentage: 0 },
    disks: [],
    network: { download: 0, upload: 0 },
    networkInterfaces: [],
    temperature: { cpu: 0, gpu: 0 },
    hostname: os.hostname(),
    platform: process.platform,
    arch: os.arch(),
    kernel: os.release(),
    osVersion: (typeof os.version === 'function' ? os.version() : ''),
    osPrettyName: '',
    uptime: ''
  };
}

function ensureStatsWorker() {
  if (!statsWorker && !isShuttingDown) {
    startStatsWorker();
  }
}

async function getSystemStats() {
  return new Promise((resolve) => {
    if (!demandActive || powerPaused || isShuttingDown) {
      resolve(getFallbackStats(powerPaused ? 'PowerPaused' : 'NoDemand'));
      return;
    }
    ensureStatsWorker();
    if (!statsWorkerReady) {
      resolve(getFallbackStats('NoWorker'));
      return;
    }

    const entry = { resolve, timer: null, settled: false };
    const finish = (value, skipLateReply) => {
      if (entry.settled) return;
      entry.settled = true;
      if (entry.timer) clearTimeout(entry.timer);
      const idx = statsWorkerQueue.indexOf(entry);
      if (idx >= 0) statsWorkerQueue.splice(idx, 1);
      if (skipLateReply) pendingStatsSkips += 1;
      resolve(value);
    };

    entry.timer = setTimeout(() => finish(getFallbackStats('Timeout'), true), 15000);
    statsWorkerQueue.push(entry);

    try {
      statsWorker.send('get-stats');
    } catch (e) {
      finish(getFallbackStats('ErrorSend'));
    }
  });
}

function isWorkerReady() {
  return statsWorkerReady;
}

function stopStatsWorker() {
  isShuttingDown = true;
  if (statsWorker) {
    try {
      statsWorker.removeAllListeners('exit');
      statsWorker.kill('SIGKILL');
    } catch (e) {
      // Ignore
    }
    statsWorker = null;
    statsWorkerReady = false;
  }
  statsWorkerQueue = [];
  pendingStatsSkips = 0;
}

function setStatsBaseInterval(intervalMs) {
  baseIntervalMs = clampInterval(intervalMs);
  if (demandActive && !powerPaused) {
    sendToWorker({ type: 'set-interval', interval: desiredIntervalMs() });
  }
}

function setStatsWorkerInterval(intervalMs) {
  setStatsBaseInterval(intervalMs);
}

function setWindowActivity(activity = {}) {
  if (typeof activity.minimized === 'boolean') windowActivity.minimized = activity.minimized;
  if (typeof activity.focused === 'boolean') windowActivity.focused = activity.focused;
  if (demandActive && !powerPaused) {
    sendToWorker({ type: 'set-interval', interval: desiredIntervalMs() });
  }
}

/**
 * Hay (o no) consumidores visibles en el renderer.
 * Sin demanda el worker permanece residente pero sin temporizador.
 */
function setStatsDemand(active, intervalMs) {
  if (intervalMs != null && intervalMs !== '') {
    baseIntervalMs = clampInterval(intervalMs);
  }
  demandActive = !!active;
  syncWorkerRunState();
}

function pauseStatsWorker() {
  powerPaused = true;
  sendToWorker('pause-stats');
}

function resumeStatsWorker() {
  powerPaused = false;
  syncWorkerRunState();
}

function parentProcessAlive(parentPid) {
  const pid = Number(parentPid);
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err && err.code === 'EPERM';
  }
}

function killPid(pid) {
  try {
    process.kill(pid, 'SIGKILL');
  } catch (_) {}
}

/**
 * Cierra system-stats-worker.js cuyo proceso padre ya no existe.
 * Cubre sesiones de desarrollo matadas con SIGKILL antes de este arreglo.
 */
function reapOrphanStatsWorkers() {
  const { execFileSync } = require('child_process');
  try {
    if (process.platform === 'win32') {
      const script = [
        "$procs = @(Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" |",
        "  Where-Object { $_.CommandLine -like '*system-stats-worker.js*' })",
        'foreach ($p in $procs) {',
        '  $alive = $false',
        '  if ($p.ParentProcessId) {',
        '    $alive = $null -ne (Get-Process -Id $p.ParentProcessId -ErrorAction SilentlyContinue)',
        '  }',
        '  if (-not $alive) {',
        '    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue',
        '    Write-Output $p.ProcessId',
        '  }',
        '}'
      ].join('\n');
      const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 12000
      });
      const killed = String(out || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (killed.length) {
        console.log(`[MEM] Workers de estadísticas huérfanos cerrados: ${killed.join(', ')}`);
      }
      return;
    }

    const out = execFileSync('ps', ['-ax', '-o', 'pid=,ppid=,command='], {
      encoding: 'utf8',
      timeout: 8000
    });
    const killed = [];
    for (const line of String(out || '').split('\n')) {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.*system-stats-worker\.js.*)$/);
      if (!match) continue;
      const pid = parseInt(match[1], 10);
      const ppid = parseInt(match[2], 10);
      if (pid === process.pid || parentProcessAlive(ppid)) continue;
      killPid(pid);
      killed.push(String(pid));
    }
    if (killed.length) {
      console.log(`[MEM] Workers de estadísticas huérfanos cerrados: ${killed.join(', ')}`);
    }
  } catch (err) {
    console.warn('[MEM] No se pudo barrer workers de estadísticas huérfanos:', err?.message || err);
  }
}

module.exports = {
  startStatsWorker,
  ensureStatsWorker,
  getSystemStats,
  isWorkerReady,
  stopStatsWorker,
  getFallbackStats,
  setStatsWorkerInterval,
  setStatsBaseInterval,
  setWindowActivity,
  setStatsDemand,
  pauseStatsWorker,
  resumeStatsWorker,
  reapOrphanStatsWorkers
};
