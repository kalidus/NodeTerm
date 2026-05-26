const os = require('os');
const fs = require('fs');
const path = require('path');

let hermesCliProcesses = {};
let mainWindow = null;
let getPtyFn = null;
let isAppQuitting = { value: false };
let getHermesCliConfig = null;

function initialize(dependencies) {
  mainWindow = dependencies.mainWindow;
  getPtyFn = dependencies.getPty;
  isAppQuitting = dependencies.isAppQuitting || { value: false };
  getHermesCliConfig = dependencies.getHermesCliConfig;
}

function getDefaultHermesBinaryPath() {
  if (os.platform() === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'hermes', 'bin', 'hermes.exe');
  }
  return path.join(os.homedir(), '.local', 'bin', 'hermes');
}

function resolveHermesCliCandidates(config = {}) {
  const customPath = String(config.binaryPath || '').trim();
  if (customPath) {
    if (!fs.existsSync(customPath)) {
      throw new Error(`Hermes CLI binary no encontrado en: ${customPath}`);
    }
    return [customPath];
  }

  const defaultPath = getDefaultHermesBinaryPath();
  if (os.platform() === 'win32') {
    return [defaultPath, 'hermes.exe', 'hermes.cmd', 'hermes'];
  }
  return [defaultPath, 'hermes'];
}

function isNotFoundError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('file not found') || msg.includes('enoent') || msg.includes('not found');
}

function buildHermesCliArgs(config = {}) {
  const args = [];

  const extraArgsRaw = String(config.extraArgs || '').trim();
  if (extraArgsRaw) {
    args.push(...extraArgsRaw.split(/\s+/).filter(Boolean));
  }

  return args;
}

function buildHermesEnv(baseEnv) {
  const env = { ...baseEnv };

  if (os.platform() === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const hermesBin = path.join(localAppData, 'hermes', 'bin');
    if (fs.existsSync(hermesBin)) {
      const pathSep = ';';
      const currentPath = env.PATH || '';
      if (!currentPath.toLowerCase().includes(hermesBin.toLowerCase())) {
        env.PATH = `${hermesBin}${pathSep}${currentPath}`;
      }
    }
  }

  return env;
}

async function startHermesCliSession(tabId, { cols, rows } = {}) {
  if (isAppQuitting.value) return;
  if (!getPtyFn) return;

  try {
    if (hermesCliProcesses[tabId]) return;

    const config = typeof getHermesCliConfig === 'function'
      ? await getHermesCliConfig()
      : {};

    const args = buildHermesCliArgs(config);
    const env = buildHermesEnv({
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor'
    });
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

    const candidates = resolveHermesCliCandidates(config);
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
        throw new Error(`No se pudo ejecutar Hermes CLI en la ruta configurada: ${configuredPath}. Error: ${lastError?.message || 'desconocido'}`);
      }
      throw new Error(
        `No se encontró Hermes CLI en PATH. Comandos probados: ${candidates.join(', ')}. ` +
        `Instálalo desde Clientes de IA o configura la ruta del binario.`
      );
    }

    hermesCliProcesses[tabId] = ptyProcess;

    ptyProcess.onData((data) => {
      if (mainWindow?.webContents) {
        mainWindow.webContents.send(`hermescli:data:${tabId}`, data);
      }
    });

    ptyProcess.onExit((event) => {
      const exitCode = typeof event === 'object' ? event?.exitCode : event;
      delete hermesCliProcesses[tabId];

      if (!isAppQuitting.value && mainWindow?.webContents && exitCode !== 0) {
        mainWindow.webContents.send(`hermescli:error:${tabId}`, `Hermes CLI finalizó con código ${exitCode}`);
      }
    });

    mainWindow?.webContents?.send(`hermescli:ready:${tabId}`);
    if (usedCommand && mainWindow?.webContents) {
      mainWindow.webContents.send(`hermescli:data:${tabId}`, `\r\n[Hermes CLI] usando comando: ${usedCommand}\r\n`);
    }
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`hermescli:error:${tabId}`, `No se pudo iniciar Hermes CLI: ${error.message}`);
    }
  }
}

function writeToHermesCli(tabId, data) {
  if (!hermesCliProcesses[tabId]) return;
  try {
    hermesCliProcesses[tabId].write(data);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`hermescli:error:${tabId}`, `Error enviando datos: ${error.message}`);
    }
  }
}

function resizeHermesCli(tabId, { cols, rows }) {
  if (!hermesCliProcesses[tabId]) return;
  try {
    hermesCliProcesses[tabId].resize(cols, rows);
  } catch (error) {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(`hermescli:error:${tabId}`, `Error redimensionando terminal: ${error.message}`);
    }
  }
}

function stopHermesCli(tabId) {
  const processRef = hermesCliProcesses[tabId];
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
    delete hermesCliProcesses[tabId];
  }
}

function cleanup() {
  Object.keys(hermesCliProcesses).forEach((tabId) => stopHermesCli(tabId));
  hermesCliProcesses = {};
}

module.exports = {
  initialize,
  setDependencies: initialize,
  startHermesCliSession,
  writeToHermesCli,
  resizeHermesCli,
  stopHermesCli,
  cleanup
};
