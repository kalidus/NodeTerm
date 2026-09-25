// ============================================
// SERVICIO DE WORKER DE ESTADÍSTICAS DEL SISTEMA
// Gestiona el worker que calcula las estadísticas del sistema
// ============================================

const { fork } = require('child_process');
const path = require('path');

let statsWorker = null;
let statsWorkerReady = false;
let statsWorkerQueue = [];
let isShuttingDown = false;

function startStatsWorker() {
  if (statsWorker || isShuttingDown) return;

  statsWorker = fork(path.join(__dirname, '../../../system-stats-worker.js'));
  statsWorkerReady = true;
  console.log('[MEM] Stats worker arrancado (primer uso)');

  statsWorker.on('exit', () => {
    statsWorkerReady = false;
    statsWorker = null;
    if (!isShuttingDown) {
      setTimeout(startStatsWorker, 1000);
    }
  });

  statsWorker.on('message', (msg) => {
    if (statsWorkerQueue.length > 0) {
      const { resolve, timeout } = statsWorkerQueue.shift();
      clearTimeout(timeout);
      if (msg.type === 'stats') {
        resolve(msg.data);
      } else {
        resolve(getFallbackStats('WorkerError'));
      }
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
    ensureStatsWorker();
    if (!statsWorkerReady) {
      resolve(getFallbackStats('NoWorker'));
      return;
    }

    const timeout = setTimeout(() => {
      resolve(getFallbackStats('Timeout'));
    }, 15000); // 15 segundos de timeout

    statsWorkerQueue.push({ resolve, timeout });

    try {
      statsWorker.send('get-stats');
    } catch (e) {
      clearTimeout(timeout);
      resolve(getFallbackStats('ErrorSend'));
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
}

function setStatsWorkerInterval(intervalMs) {
  if (statsWorker && statsWorkerReady) {
    try {
      statsWorker.send({ type: 'set-interval', interval: intervalMs });
    } catch (_) {}
  }
}

function pauseStatsWorker() {
  if (statsWorker && statsWorkerReady) {
    try {
      statsWorker.send('pause-stats');
    } catch (_) {}
  }
}

function resumeStatsWorker() {
  if (statsWorker && statsWorkerReady) {
    try {
      statsWorker.send('resume-stats');
    } catch (_) {}
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
  pauseStatsWorker,
  resumeStatsWorker
};
