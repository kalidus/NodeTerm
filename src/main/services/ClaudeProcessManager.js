const os = require('os');
const fs = require('fs');

let claudeProcesses = {};
let mainWindow = null;
let getPtyFn = null;
let isAppQuitting = { value: false };
let getClaudeConfig = null;

function initialize(dependencies) {
  mainWindow = dependencies.mainWindow;
  getPtyFn = dependencies.getPty;
  isAppQuitting = dependencies.isAppQuitting || { value: false };
  getClaudeConfig = dependencies.getClaudeConfig;
}

function resolveClaudeCandidates(config = {}) {
  const customPath = String(config.binaryPath || '').trim();
  if (customPath) {
    if (!fs.existsSync(customPath)) {
      throw new Error(`Claude binary no encontrado en: ${customPath}`);
    }
    return [customPath];
  }

  if (os.platform() === 'win32') {
    return ['claude.cmd', 'claude.exe', 'claude'];
  }
  return ['claude'];
}

function isNotFoundError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('file not found') || msg.includes('enoent') || msg.includes('not found');
}

function buildClaudeArgs(config = {}) {
  const args = [];

  const model = String(config.defaultModel || '').trim();
  if (model) {
    args.push('--model', model);
  }

  const extraArgsRaw = String(config.extraArgs || '').trim();
  if (extraArgsRaw) {
    args.push(...extraArgsRaw.split(/\s+/).filter(Boolean));
  }

  return args;
}

async function startClaudeSession(tabId, { cols, rows } = {}) {
  if (isAppQuitting.value) return;
  if (!getPtyFn) return;

  try {
    if (claudeProcesses[tabId]) return;

    const config = typeof getClaudeConfig === 'function'
      ? await getClaudeConfig()
      : {};

    const args = buildClaudeArgs(config);
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor'
    };

    if (config.authToken) {
      env.ANTHROPIC_API_KEY = config.authToken;
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

    const candidates = resolveClaudeCandidates(config);
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
        throw new Error(`No se pudo ejecutar Claude en la ruta configurada: ${configuredPath}. Error: ${lastError?.message || 'desconocido'}`);
      }
      throw new Error(
        `No se encontró Claude Code en PATH. Comandos probados: ${candidates.join(', ')}. ` +
        `Instálalo y/o configura la ruta en Ajustes > Terminal por Defecto > Claude Code.`
      );
    }

    claudeProcesses[tabId] = ptyProcess;

    ptyProcess.onData((data) => {
      if (mainWindow?.webContents) {
        mainWindow.webContents.send(`claude:data:${tabId}`, data);
      }
    });

    ptyProcess.onExit((event) => {
      const exitCode = typeof event === 'object' ? event?.exitCode : event;
      delete claudeProcesses[tabId];

      if (!isAppQuitting.value && mainWindow?.webContents && exitCode !== 0) {
        mainWindow.webContents.send(`claude:error:${tabId}`, `Claude finalizó con código ${exitCode}`);
      }
    });

    mainWindow?.webContents?.send(`claude:ready:${tabId}`);
    if (usedCommand && mainWindow?.webContents) {
      mainWindow.webContents.send(`claude:data:${tabId}`, `\r\n[Claude] usando comando: ${usedCommand}\r\n`);
    }
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`claude:error:${tabId}`, `No se pudo iniciar Claude Code: ${error.message}`);
    }
  }
}

function writeToClaude(tabId, data) {
  if (!claudeProcesses[tabId]) return;
  try {
    claudeProcesses[tabId].write(data);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`claude:error:${tabId}`, `Error enviando datos: ${error.message}`);
    }
  }
}

function resizeClaude(tabId, { cols, rows }) {
  if (!claudeProcesses[tabId]) return;
  try {
    claudeProcesses[tabId].resize(cols, rows);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`claude:error:${tabId}`, `Error redimensionando terminal: ${error.message}`);
    }
  }
}

function stopClaude(tabId) {
  const processRef = claudeProcesses[tabId];
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
    delete claudeProcesses[tabId];
  }
}

function cleanup() {
  Object.keys(claudeProcesses).forEach((tabId) => stopClaude(tabId));
  claudeProcesses = {};
}

module.exports = {
  initialize,
  setDependencies: initialize,
  startClaudeSession,
  writeToClaude,
  resizeClaude,
  stopClaude,
  cleanup
};
