const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');
const { getNodeTermDataDir } = require('../utils/file-utils');

const CONFIG_DIR = getNodeTermDataDir();
const HERMESCLI_CONFIG_PATH = path.join(CONFIG_DIR, 'hermescli-config.json');

const BINARY_NAMES_WIN = ['hermes.exe', 'hermes.cmd', 'hermes'];
const BINARY_NAMES_UNIX = ['hermes'];
const INSTALL_PS1_URL = 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1';
const INSTALL_SH_URL = 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh';

function getDefaultHermesBinaryCandidates() {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return [
      path.join(localAppData, 'hermes', 'bin', 'hermes.exe'),
      path.join(localAppData, 'hermes', 'bin', 'hermes.cmd')
    ];
  }
  return [
    path.join(home, '.local', 'bin', 'hermes'),
    path.join(home, '.hermes', 'bin', 'hermes')
  ];
}

function getWindowsPathFromRegistry() {
  if (process.platform !== 'win32') {
    return process.env.PATH || '';
  }

  const powershellExe = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  return new Promise((resolve) => {
    execFile(
      powershellExe,
      [
        '-NoProfile',
        '-Command',
        "[Environment]::GetEnvironmentVariable('Path','User') + ';' + [Environment]::GetEnvironmentVariable('Path','Machine')"
      ],
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        resolve(String(stdout || '').trim() || process.env.PATH || '');
      }
    );
  });
}

function persistDiscoveredBinaryPath(binaryPath) {
  if (!binaryPath || !fs.existsSync(binaryPath)) return;
  const current = readJsonFile(HERMESCLI_CONFIG_PATH);
  if (String(current.binaryPath || '').trim()) return;

  writeJsonFile(HERMESCLI_CONFIG_PATH, {
    ...current,
    binaryPath,
    updatedAt: new Date().toISOString()
  });
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeJsonFile(filePath, data) {
  ensureConfigDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function getHermesCliConfig() {
  const config = readJsonFile(HERMESCLI_CONFIG_PATH);

  return {
    binaryPath: config.binaryPath || '',
    extraArgs: config.extraArgs || ''
  };
}

function sanitizeHermesCliConfig(config = {}) {
  return {
    binaryPath: String(config.binaryPath || '').trim(),
    extraArgs: String(config.extraArgs || '').trim()
  };
}

function validateHermesCliConfig(config = {}) {
  const normalized = sanitizeHermesCliConfig(config);

  if (normalized.binaryPath && !fs.existsSync(normalized.binaryPath)) {
    return {
      valid: false,
      error: `No existe el binario en la ruta configurada: ${normalized.binaryPath}`
    };
  }

  return { valid: true };
}

function execFileAsync(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        reject({
          ...error,
          stdout: stdout || '',
          stderr: stderr || ''
        });
        return;
      }
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function resolveBinaryFromPath(binaryName) {
  const isWin = process.platform === 'win32';
  const checks = isWin
    ? ['where', [binaryName]]
    : ['which', [binaryName]];

  const env = { ...process.env };
  if (isWin) {
    env.PATH = await getWindowsPathFromRegistry();
  }

  try {
    const result = await execFileAsync(checks[0], checks[1], { windowsHide: true, env });
    const firstLine = String(result.stdout || '').split(/\r?\n/).find(Boolean);
    return firstLine ? firstLine.trim() : null;
  } catch {
    return null;
  }
}

function findInCommonInstallDirs() {
  const home = os.homedir();
  const names = process.platform === 'win32' ? BINARY_NAMES_WIN : BINARY_NAMES_UNIX;
  const dirs = [];

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    dirs.push(
      path.join(localAppData, 'hermes', 'bin'),
      path.join(home, '.local', 'bin')
    );
  } else {
    dirs.push(
      path.join(home, '.local', 'bin'),
      path.join(home, '.hermes', 'bin')
    );
  }

  for (const dir of dirs) {
    if (!dir || !fs.existsSync(dir)) continue;
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

async function findHermesCliBinaryPath() {
  const config = getHermesCliConfig();
  const customPath = String(config.binaryPath || '').trim();
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  for (const candidate of getDefaultHermesBinaryCandidates()) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const fromDirs = findInCommonInstallDirs();
  if (fromDirs) return fromDirs;

  const names = process.platform === 'win32' ? BINARY_NAMES_WIN : BINARY_NAMES_UNIX;
  for (const name of names) {
    const found = await resolveBinaryFromPath(name);
    if (found) return found;
  }

  return null;
}

async function getHermesCliStatus() {
  const binaryPath = await findHermesCliBinaryPath();
  if (!binaryPath) {
    return {
      installed: false,
      binaryPath: null,
      version: null
    };
  }

  persistDiscoveredBinaryPath(binaryPath);

  try {
    const { stdout } = await execFileAsync(binaryPath, ['--version'], { windowsHide: true });
    return {
      installed: true,
      binaryPath,
      version: String(stdout || '').trim() || 'unknown'
    };
  } catch {
    return {
      installed: true,
      binaryPath,
      version: 'unknown'
    };
  }
}

async function installHermesCliWindows() {
  ensureConfigDir();
  const scriptPath = path.join(CONFIG_DIR, '_hermes-install.ps1');
  const powershellExe = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

  await execFileAsync(
    powershellExe,
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Invoke-WebRequest -Uri '${INSTALL_PS1_URL}' -OutFile '${scriptPath.replace(/'/g, "''")}'`
    ],
    {
      windowsHide: true,
      timeout: 20 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024
    }
  );

  await execFileAsync(
    powershellExe,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    {
      windowsHide: true,
      timeout: 20 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024
    }
  );
}

async function installHermesCli() {
  if (process.platform === 'win32') {
    await installHermesCliWindows();
  } else {
    await new Promise((resolve, reject) => {
      exec(
        `curl -fsSL ${INSTALL_SH_URL} | bash`,
        {
          shell: '/bin/bash',
          windowsHide: true,
          timeout: 20 * 60 * 1000,
          maxBuffer: 10 * 1024 * 1024
        },
        (error, stdout, stderr) => {
          if (error) {
            reject({
              ...error,
              stdout: stdout || '',
              stderr: stderr || ''
            });
            return;
          }
          resolve({ stdout: stdout || '', stderr: stderr || '' });
        }
      );
    });
  }

  const binaryPath = await findHermesCliBinaryPath();
  if (binaryPath) {
    persistDiscoveredBinaryPath(binaryPath);
    return getHermesCliStatus();
  }

  const expectedPaths = getDefaultHermesBinaryCandidates().join(', ');
  throw new Error(
    'La instalación terminó pero no se encontró hermes.exe. Ruta esperada: ' +
    `${expectedPaths}. Comprueba tu conexión, antivirus o firewall, vuelve a pulsar "Instalar CLI" ` +
    'y, si hace falta, pega esa ruta en "Ruta binario" en Clientes de IA.'
  );
}

async function uninstallHermesCli() {
  throw new Error(
    'Hermes CLI no ofrece desinstalación automática desde NodeTerm. ' +
    'Elimina el directorio %LOCALAPPDATA%\\hermes manualmente o consulta https://hermes-agent.org/es/'
  );
}

function registerHermesCliHandlers() {
  [
    'hermescli:get-config',
    'hermescli:set-config',
    'hermescli:validate-config',
    'hermescli:cli-status',
    'hermescli:cli-install',
    'hermescli:cli-uninstall'
  ].forEach((ch) => {
    try {
      ipcMain.removeHandler(ch);
    } catch (_) {
      // noop
    }
  });

  ipcMain.handle('hermescli:get-config', async () => getHermesCliConfig());

  ipcMain.handle('hermescli:set-config', async (event, payload = {}) => {
    try {
      const normalized = sanitizeHermesCliConfig(payload);
      const validation = validateHermesCliConfig(normalized);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const current = readJsonFile(HERMESCLI_CONFIG_PATH);
      writeJsonFile(HERMESCLI_CONFIG_PATH, {
        ...current,
        ...normalized,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('hermescli:validate-config', async (event, payload = {}) => {
    const merged = {
      ...getHermesCliConfig(),
      ...payload
    };
    return validateHermesCliConfig(merged);
  });

  ipcMain.handle('hermescli:cli-status', async () => {
    try {
      const status = await getHermesCliStatus();
      return { success: true, ...status };
    } catch (error) {
      return { success: false, error: error.message || 'No se pudo verificar Hermes CLI' };
    }
  });

  ipcMain.handle('hermescli:cli-install', async () => {
    try {
      const status = await installHermesCli();
      return { success: true, ...status };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });

  ipcMain.handle('hermescli:cli-uninstall', async () => {
    try {
      await uninstallHermesCli();
      return { success: true };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });
}

module.exports = {
  registerHermesCliHandlers,
  getHermesCliConfig
};
