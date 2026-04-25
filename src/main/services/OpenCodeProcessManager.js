const os = require('os');
const fs = require('fs');

let openCodeProcesses = {};
let mainWindow = null;
let getPtyFn = null;
let isAppQuitting = { value: false };
let getOpenCodeConfig = null;

function initialize(dependencies) {
  mainWindow = dependencies.mainWindow;
  getPtyFn = dependencies.getPty;
  isAppQuitting = dependencies.isAppQuitting || { value: false };
  getOpenCodeConfig = dependencies.getOpenCodeConfig;
}

function resolveOpenCodeCandidates(config = {}) {
  const customPath = String(config.binaryPath || '').trim();
  if (customPath) {
    if (!fs.existsSync(customPath)) {
      throw new Error(`OpenCode binary no encontrado en: ${customPath}`);
    }
    return [customPath];
  }

  if (os.platform() === 'win32') {
    return ['opencode.cmd', 'opencode.exe', 'opencode'];
  }
  return ['opencode'];
}

function isNotFoundError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('file not found') || msg.includes('enoent') || msg.includes('not found');
}

function buildOpenCodeArgs(config = {}) {
  const args = [];

  const extraArgsRaw = String(config.extraArgs || '').trim();
  if (extraArgsRaw) {
    args.push(...extraArgsRaw.split(/\s+/).filter(Boolean));
  }

  return args;
}

async function startOpenCodeSession(tabId, { cols, rows } = {}) {
  if (isAppQuitting.value) return;
  if (!getPtyFn) return;

  try {
    if (openCodeProcesses[tabId]) return;

    const config = typeof getOpenCodeConfig === 'function'
      ? await getOpenCodeConfig()
      : {};

    const args = buildOpenCodeArgs(config);
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor'
    };

    const spawnOptions = {
      name: 'xterm-256color',
      cols: cols || 120,
      rows: rows || 30,
      cwd: os.homedir(),
      env
    };

    if (os.platform() === 'win32') {
      spawnOptions.windowsHide = false;
      spawnOptions.useConpty = true;
    }

    const candidates = resolveOpenCodeCandidates(config);
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
        throw new Error(`No se pudo ejecutar OpenCode en la ruta configurada: ${configuredPath}. Error: ${lastError?.message || 'desconocido'}`);
      }
      throw new Error(
        `No se encontró OpenCode en PATH. Comandos probados: ${candidates.join(', ')}. ` +
        `Instálalo y/o configura la ruta en Ajustes > Terminal por Defecto > OpenCode.`
      );
    }

    openCodeProcesses[tabId] = ptyProcess;

    ptyProcess.onData((data) => {
      if (mainWindow?.webContents) {
        mainWindow.webContents.send(`opencode:data:${tabId}`, data);
      }
    });

    ptyProcess.onExit((event) => {
      const exitCode = typeof event === 'object' ? event?.exitCode : event;
      delete openCodeProcesses[tabId];

      if (!isAppQuitting.value && mainWindow?.webContents && exitCode !== 0) {
        mainWindow.webContents.send(`opencode:error:${tabId}`, `OpenCode finalizó con código ${exitCode}`);
      }
    });

    mainWindow?.webContents?.send(`opencode:ready:${tabId}`);
    if (usedCommand && mainWindow?.webContents) {
      mainWindow.webContents.send(`opencode:data:${tabId}`, `\r\n[OpenCode] usando comando: ${usedCommand}\r\n`);
    }
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`opencode:error:${tabId}`, `No se pudo iniciar OpenCode: ${error.message}`);
    }
  }
}

function writeToOpenCode(tabId, data) {
  if (!openCodeProcesses[tabId]) return;
  try {
    openCodeProcesses[tabId].write(data);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`opencode:error:${tabId}`, `Error enviando datos: ${error.message}`);
    }
  }
}

function resizeOpenCode(tabId, { cols, rows }) {
  if (!openCodeProcesses[tabId]) return;
  try {
    openCodeProcesses[tabId].resize(cols, rows);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`opencode:error:${tabId}`, `Error redimensionando terminal: ${error.message}`);
    }
  }
}

function stopOpenCode(tabId) {
  const processRef = openCodeProcesses[tabId];
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
    delete openCodeProcesses[tabId];
  }
}

function cleanup() {
  Object.keys(openCodeProcesses).forEach((tabId) => stopOpenCode(tabId));
  openCodeProcesses = {};
}

module.exports = {
  initialize,
  setDependencies: initialize,
  startOpenCodeSession,
  writeToOpenCode,
  resizeOpenCode,
  stopOpenCode,
  cleanup
};
