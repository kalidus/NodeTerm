const os = require('os');
const fs = require('fs');

let codexCliProcesses = {};
let mainWindow = null;
let getPtyFn = null;
let isAppQuitting = { value: false };
let getCodexCliConfig = null;

function initialize(dependencies) {
  mainWindow = dependencies.mainWindow;
  getPtyFn = dependencies.getPty;
  isAppQuitting = dependencies.isAppQuitting || { value: false };
  getCodexCliConfig = dependencies.getCodexCliConfig;
}

function resolveCodexCliCandidates(config = {}) {
  const customPath = String(config.binaryPath || '').trim();
  if (customPath) {
    if (!fs.existsSync(customPath)) {
      throw new Error(`Codex CLI binary no encontrado en: ${customPath}`);
    }
    return [customPath];
  }

  if (os.platform() === 'win32') {
    return ['codex.cmd', 'codex.exe', 'codex'];
  }
  return ['codex'];
}

function isNotFoundError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('file not found') || msg.includes('enoent') || msg.includes('not found');
}

function buildCodexCliArgs(config = {}) {
  const args = [];

  const extraArgsRaw = String(config.extraArgs || '').trim();
  if (extraArgsRaw) {
    args.push(...extraArgsRaw.split(/\s+/).filter(Boolean));
  }

  return args;
}

async function startCodexCliSession(tabId, { cols, rows } = {}) {
  if (isAppQuitting.value) return;
  if (!getPtyFn) return;

  try {
    if (codexCliProcesses[tabId]) return;

    const config = typeof getCodexCliConfig === 'function'
      ? await getCodexCliConfig()
      : {};

    const args = buildCodexCliArgs(config);
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor'
    };

    const apiKey = String(config.apiKey || '').trim();
    if (apiKey) {
      env.OPENAI_API_KEY = apiKey;
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

    const candidates = resolveCodexCliCandidates(config);
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
        throw new Error(`No se pudo ejecutar Codex CLI en la ruta configurada: ${configuredPath}. Error: ${lastError?.message || 'desconocido'}`);
      }
      throw new Error(
        `No se encontró Codex CLI en PATH. Comandos probados: ${candidates.join(', ')}. ` +
        `Instálalo y/o configura la ruta en Ajustes > Terminal por Defecto > Codex CLI.`
      );
    }

    codexCliProcesses[tabId] = ptyProcess;

    ptyProcess.onData((data) => {
      if (mainWindow?.webContents) {
        mainWindow.webContents.send(`codexcli:data:${tabId}`, data);
      }
    });

    ptyProcess.onExit((event) => {
      const exitCode = typeof event === 'object' ? event?.exitCode : event;
      delete codexCliProcesses[tabId];

      if (!isAppQuitting.value && mainWindow?.webContents && exitCode !== 0) {
        mainWindow.webContents.send(`codexcli:error:${tabId}`, `Codex CLI finalizó con código ${exitCode}`);
      }
    });

    mainWindow?.webContents?.send(`codexcli:ready:${tabId}`);
    if (usedCommand && mainWindow?.webContents) {
      mainWindow.webContents.send(`codexcli:data:${tabId}`, `\r\n[Codex CLI] usando comando: ${usedCommand}\r\n`);
    }
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`codexcli:error:${tabId}`, `No se pudo iniciar Codex CLI: ${error.message}`);
    }
  }
}

function writeToCodexCli(tabId, data) {
  if (!codexCliProcesses[tabId]) return;
  try {
    codexCliProcesses[tabId].write(data);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`codexcli:error:${tabId}`, `Error enviando datos: ${error.message}`);
    }
  }
}

function resizeCodexCli(tabId, { cols, rows }) {
  if (!codexCliProcesses[tabId]) return;
  try {
    codexCliProcesses[tabId].resize(cols, rows);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`codexcli:error:${tabId}`, `Error redimensionando terminal: ${error.message}`);
    }
  }
}

function stopCodexCli(tabId) {
  const processRef = codexCliProcesses[tabId];
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
    delete codexCliProcesses[tabId];
  }
}

function cleanup() {
  Object.keys(codexCliProcesses).forEach((tabId) => stopCodexCli(tabId));
  codexCliProcesses = {};
}

module.exports = {
  initialize,
  setDependencies: initialize,
  startCodexCliSession,
  writeToCodexCli,
  resizeCodexCli,
  stopCodexCli,
  cleanup
};
