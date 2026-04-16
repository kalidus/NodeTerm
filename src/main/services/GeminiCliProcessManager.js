const os = require('os');
const fs = require('fs');

let geminiCliProcesses = {};
let mainWindow = null;
let getPtyFn = null;
let isAppQuitting = { value: false };
let getGeminiCliConfig = null;

function initialize(dependencies) {
  mainWindow = dependencies.mainWindow;
  getPtyFn = dependencies.getPty;
  isAppQuitting = dependencies.isAppQuitting || { value: false };
  getGeminiCliConfig = dependencies.getGeminiCliConfig;
}

function resolveGeminiCliCandidates(config = {}) {
  const customPath = String(config.binaryPath || '').trim();
  if (customPath) {
    if (!fs.existsSync(customPath)) {
      throw new Error(`Gemini CLI binary no encontrado en: ${customPath}`);
    }
    return [customPath];
  }

  if (os.platform() === 'win32') {
    return ['gemini.cmd', 'gemini.exe', 'gemini'];
  }
  return ['gemini'];
}

function isNotFoundError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('file not found') || msg.includes('enoent') || msg.includes('not found');
}

function buildGeminiCliArgs(config = {}) {
  const args = [];

  const extraArgsRaw = String(config.extraArgs || '').trim();
  if (extraArgsRaw) {
    args.push(...extraArgsRaw.split(/\s+/).filter(Boolean));
  }

  return args;
}

async function startGeminiCliSession(tabId, { cols, rows } = {}) {
  if (isAppQuitting.value) return;
  if (!getPtyFn) return;

  try {
    if (geminiCliProcesses[tabId]) return;

    const config = typeof getGeminiCliConfig === 'function'
      ? await getGeminiCliConfig()
      : {};

    const args = buildGeminiCliArgs(config);
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
    const apiKey = String(config.apiKey || '').trim();
    if (apiKey) {
      // Compatibilidad con distintas variantes del CLI de Gemini.
      env.GEMINI_API_KEY = apiKey;
      env.GOOGLE_API_KEY = apiKey;
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

    const candidates = resolveGeminiCliCandidates(config);
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
        throw new Error(`No se pudo ejecutar Gemini CLI en la ruta configurada: ${configuredPath}. Error: ${lastError?.message || 'desconocido'}`);
      }
      throw new Error(
        `No se encontró Gemini CLI en PATH. Comandos probados: ${candidates.join(', ')}. ` +
        `Instálalo y/o configura la ruta en Ajustes > Terminal por Defecto > Gemini CLI.`
      );
    }

    geminiCliProcesses[tabId] = ptyProcess;

    ptyProcess.onData((data) => {
      if (mainWindow?.webContents) {
        mainWindow.webContents.send(`geminicli:data:${tabId}`, data);
      }
    });

    ptyProcess.onExit((event) => {
      const exitCode = typeof event === 'object' ? event?.exitCode : event;
      delete geminiCliProcesses[tabId];

      if (!isAppQuitting.value && mainWindow?.webContents && exitCode !== 0) {
        mainWindow.webContents.send(`geminicli:error:${tabId}`, `Gemini CLI finalizó con código ${exitCode}`);
      }
    });

    mainWindow?.webContents?.send(`geminicli:ready:${tabId}`);
    if (usedCommand && mainWindow?.webContents) {
      mainWindow.webContents.send(`geminicli:data:${tabId}`, `\r\n[Gemini CLI] usando comando: ${usedCommand}\r\n`);
    }
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`geminicli:error:${tabId}`, `No se pudo iniciar Gemini CLI: ${error.message}`);
    }
  }
}

function writeToGeminiCli(tabId, data) {
  if (!geminiCliProcesses[tabId]) return;
  try {
    geminiCliProcesses[tabId].write(data);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`geminicli:error:${tabId}`, `Error enviando datos: ${error.message}`);
    }
  }
}

function resizeGeminiCli(tabId, { cols, rows }) {
  if (!geminiCliProcesses[tabId]) return;
  try {
    geminiCliProcesses[tabId].resize(cols, rows);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`geminicli:error:${tabId}`, `Error redimensionando terminal: ${error.message}`);
    }
  }
}

function stopGeminiCli(tabId) {
  const processRef = geminiCliProcesses[tabId];
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
    delete geminiCliProcesses[tabId];
  }
}

function cleanup() {
  Object.keys(geminiCliProcesses).forEach((tabId) => stopGeminiCli(tabId));
  geminiCliProcesses = {};
}

module.exports = {
  initialize,
  setDependencies: initialize,
  startGeminiCliSession,
  writeToGeminiCli,
  resizeGeminiCli,
  stopGeminiCli,
  cleanup
};
