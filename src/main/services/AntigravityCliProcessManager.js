const os = require('os');
const fs = require('fs');

let antigravityCliProcesses = {};
let mainWindow = null;
let getPtyFn = null;
let isAppQuitting = { value: false };
let getAntigravityCliConfig = null;

function initialize(dependencies) {
  mainWindow = dependencies.mainWindow;
  getPtyFn = dependencies.getPty;
  isAppQuitting = dependencies.isAppQuitting || { value: false };
  getAntigravityCliConfig = dependencies.getAntigravityCliConfig;
}

function resolveAntigravityCliCandidates(config = {}) {
  const customPath = String(config.binaryPath || '').trim();
  if (customPath) {
    if (!fs.existsSync(customPath)) {
      throw new Error(`Antigravity CLI binary no encontrado en: ${customPath}`);
    }
    return [customPath];
  }

  if (os.platform() === 'win32') {
    return ['agy.cmd', 'agy.exe', 'agy', 'antigravity.cmd', 'antigravity.exe', 'antigravity'];
  }
  return ['agy', 'antigravity'];
}

function isNotFoundError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('file not found') || msg.includes('enoent') || msg.includes('not found');
}

function buildAntigravityCliArgs(config = {}) {
  const args = [];

  const extraArgsRaw = String(config.extraArgs || '').trim();
  if (extraArgsRaw) {
    args.push(...extraArgsRaw.split(/\s+/).filter(Boolean));
  }

  return args;
}

async function startAntigravityCliSession(tabId, { cols, rows } = {}) {
  if (isAppQuitting.value) return;
  if (!getPtyFn) return;

  try {
    if (antigravityCliProcesses[tabId]) return;

    const config = typeof getAntigravityCliConfig === 'function'
      ? await getAntigravityCliConfig()
      : {};

    const args = buildAntigravityCliArgs(config);
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor'
    };
    if (!env.BROWSER) {
      if (os.platform() === 'win32') {
        env.BROWSER = 'explorer.exe';
      } else if (os.platform() === 'darwin') {
        env.BROWSER = 'open';
      } else {
        env.BROWSER = 'xdg-open';
      }
    }

    const spawnOptions = {
      name: 'xterm-256color',
      cols: cols || 120,
      rows: rows || 30,
      cwd: os.homedir(),
      env
    };

    if (os.platform() === 'win32') {
      spawnOptions.windowsHide = false;
      spawnOptions.useConpty = false;
      spawnOptions.backend = 'winpty';
    }

    const candidates = resolveAntigravityCliCandidates(config);
    let ptyProcess = null;
    let lastError = null;
    let usedCommand = null;

    for (const command of candidates) {
      try {
        ptyProcess = getPtyFn().spawn(command, args, spawnOptions);
        usedCommand = command;
        break;
      } catch (err) {
        lastError = err;
        if (!isNotFoundError(err)) {
          break;
        }
      }
    }

    if (!ptyProcess) {
      const configuredPath = String(config.binaryPath || '').trim();
      if (configuredPath) {
        throw new Error(`No se pudo ejecutar Antigravity CLI en la ruta configurada: ${configuredPath}. Error: ${lastError?.message || 'desconocido'}`);
      }
      throw new Error(
        `No se encontró Antigravity CLI en PATH. Comandos probados: ${candidates.join(', ')}. ` +
        `Instálalo desde Clientes de IA o configura la ruta del binario.`
      );
    }

    antigravityCliProcesses[tabId] = ptyProcess;

    ptyProcess.onData((data) => {
      if (mainWindow?.webContents) {
        mainWindow.webContents.send(`antigravitycli:data:${tabId}`, data);
      }
    });

    ptyProcess.onExit((event) => {
      const exitCode = typeof event === 'object' ? event?.exitCode : event;
      delete antigravityCliProcesses[tabId];

      if (!isAppQuitting.value && mainWindow?.webContents && exitCode !== 0) {
        mainWindow.webContents.send(`antigravitycli:error:${tabId}`, `Antigravity CLI finalizó con código ${exitCode}`);
      }
    });

    mainWindow?.webContents?.send(`antigravitycli:ready:${tabId}`);
    if (usedCommand && mainWindow?.webContents) {
      mainWindow.webContents.send(`antigravitycli:data:${tabId}`, `\r\n[Antigravity CLI] usando comando: ${usedCommand}\r\n`);
    }
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`antigravitycli:error:${tabId}`, `No se pudo iniciar Antigravity CLI: ${error.message}`);
    }
  }
}

function writeToAntigravityCli(tabId, data) {
  if (!antigravityCliProcesses[tabId]) return;
  try {
    antigravityCliProcesses[tabId].write(data);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`antigravitycli:error:${tabId}`, `Error enviando datos: ${error.message}`);
    }
  }
}

function resizeAntigravityCli(tabId, { cols, rows }) {
  if (!antigravityCliProcesses[tabId]) return;
  try {
    antigravityCliProcesses[tabId].resize(cols, rows);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`antigravitycli:error:${tabId}`, `Error redimensionando terminal: ${error.message}`);
    }
  }
}

function stopAntigravityCli(tabId) {
  const processRef = antigravityCliProcesses[tabId];
  if (!processRef) return;

  try {
    processRef._isIntentionallyStopped = true;
    if (typeof processRef.removeAllListeners === 'function') {
      processRef.removeAllListeners();
    }
    processRef.kill();
  } catch (error) {
    // noop
  } finally {
    delete antigravityCliProcesses[tabId];
  }
}

function cleanup() {
  Object.keys(antigravityCliProcesses).forEach((tabId) => stopAntigravityCli(tabId));
  antigravityCliProcesses = {};
}

module.exports = {
  initialize,
  setDependencies: initialize,
  startAntigravityCliSession,
  writeToAntigravityCli,
  resizeAntigravityCli,
  stopAntigravityCli,
  cleanup
};
