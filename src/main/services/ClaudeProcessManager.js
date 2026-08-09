const os = require('os');
const fs = require('fs');
const { sendToRenderer } = require('../utils');

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
      return { customPath, error: `Ruta personalizada no existe: ${customPath}`, candidates: [] };
    }
    return { customPath, candidates: [customPath] };
  }

  const isWin = os.platform() === 'win32';
  return {
    customPath: null,
    candidates: isWin ? ['claude.cmd', 'claude.exe', 'claude'] : ['claude']
  };
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

function startClaudeSession(tabId, options = {}) {
  const { cols = 120, rows = 30 } = options;

  if (claudeProcesses[tabId]) {
    try {
      claudeProcesses[tabId].kill();
    } catch (_) {}
    delete claudeProcesses[tabId];
  }

  try {
    const config = typeof getClaudeConfig === 'function' ? getClaudeConfig() : {};
    const { customPath, error, candidates } = resolveClaudeCandidates(config);

    if (error) {
      throw new Error(error);
    }

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
      cols,
      rows,
      cwd: os.homedir(),
      env
    };

    if (os.platform() === 'win32') {
      spawnOptions.windowsHide = false;
      spawnOptions.useConpty = false;
      spawnOptions.backend = 'winpty';
    }

    let ptyProcess = null;
    let usedCommand = null;
    let lastError = null;

    for (const cmd of candidates) {
      try {
        ptyProcess = getPtyFn().spawn(cmd, args, spawnOptions);
        usedCommand = cmd;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!ptyProcess) {
      if (customPath) {
        throw new Error(`No se pudo ejecutar Claude en la ruta configurada: ${customPath}. Error: ${lastError?.message || 'desconocido'}`);
      }
      throw new Error(
        `No se encontró Claude Code en PATH. Comandos probados: ${candidates.join(', ')}. ` +
        `Instálalo y/o configura la ruta en Ajustes > Terminal por Defecto > Claude Code.`
      );
    }

    claudeProcesses[tabId] = ptyProcess;

    ptyProcess.onData((data) => {
      if (!isAppQuitting.value) {
        sendToRenderer(mainWindow, `claude:data:${tabId}`, data);
      }
    });

    ptyProcess.onExit((event) => {
      const exitCode = typeof event === 'object' ? event?.exitCode : event;
      delete claudeProcesses[tabId];

      if (!isAppQuitting.value && exitCode !== 0) {
        sendToRenderer(mainWindow, `claude:error:${tabId}`, `Claude finalizó con código ${exitCode}`);
      }
    });

    sendToRenderer(mainWindow, `claude:ready:${tabId}`);
    if (usedCommand) {
      sendToRenderer(mainWindow, `claude:data:${tabId}`, `\r\n[Claude] usando comando: ${usedCommand}\r\n`);
    }
  } catch (error) {
    sendToRenderer(mainWindow, `claude:error:${tabId}`, `No se pudo iniciar Claude Code: ${error.message}`);
  }
}

function writeToClaude(tabId, data) {
  if (!claudeProcesses[tabId]) return;
  try {
    claudeProcesses[tabId].write(data);
  } catch (error) {
    sendToRenderer(mainWindow, `claude:error:${tabId}`, `Error enviando datos: ${error.message}`);
  }
}

function resizeClaude(tabId, { cols, rows }) {
  if (!claudeProcesses[tabId]) return;
  try {
    claudeProcesses[tabId].resize(cols, rows);
  } catch (error) {
    sendToRenderer(mainWindow, `claude:error:${tabId}`, `Error redimensionando terminal: ${error.message}`);
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
