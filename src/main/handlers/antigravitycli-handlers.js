const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');
const { getNodeTermDataDir } = require('../utils/file-utils');

const CONFIG_DIR = getNodeTermDataDir();
const ANTIGRAVITYCLI_CONFIG_PATH = path.join(CONFIG_DIR, 'antigravitycli-config.json');

const BINARY_NAMES_WIN = ['agy.cmd', 'agy.exe', 'agy', 'antigravity.cmd', 'antigravity.exe', 'antigravity'];
const BINARY_NAMES_UNIX = ['agy', 'antigravity'];
const INSTALL_PS1_URL = 'https://antigravity.google/cli/install.ps1';
const INSTALL_SH_URL = 'https://antigravity.google/cli/install.sh';

function getDefaultAgyBinaryCandidates() {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return [
      path.join(localAppData, 'agy', 'bin', 'agy.exe'),
      path.join(localAppData, 'agy', 'bin', 'agy.cmd')
    ];
  }
  return [
    path.join(home, '.local', 'bin', 'agy'),
    path.join(home, '.agy', 'bin', 'agy')
  ];
}

function getWindowsPathFromRegistry() {
  if (process.platform !== 'win32') {
    return process.env.PATH || '';
  }

  const powershellExe = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  try {
    const { stdout } = execFileSyncToResult(
      powershellExe,
      [
        '-NoProfile',
        '-Command',
        "[Environment]::GetEnvironmentVariable('Path','User') + ';' + [Environment]::GetEnvironmentVariable('Path','Machine')"
      ]
    );
    return String(stdout || '').trim() || process.env.PATH || '';
  } catch {
    return process.env.PATH || '';
  }
}

function execFileSyncToResult(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

function persistDiscoveredBinaryPath(binaryPath) {
  if (!binaryPath || !fs.existsSync(binaryPath)) return;
  const current = readJsonFile(ANTIGRAVITYCLI_CONFIG_PATH);
  if (String(current.binaryPath || '').trim()) return;

  writeJsonFile(ANTIGRAVITYCLI_CONFIG_PATH, {
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

function getAntigravityCliConfig() {
  const config = readJsonFile(ANTIGRAVITYCLI_CONFIG_PATH);

  return {
    binaryPath: config.binaryPath || '',
    extraArgs: config.extraArgs || ''
  };
}

function sanitizeAntigravityCliConfig(config = {}) {
  return {
    binaryPath: String(config.binaryPath || '').trim(),
    extraArgs: String(config.extraArgs || '').trim()
  };
}

function validateAntigravityCliConfig(config = {}) {
  const normalized = sanitizeAntigravityCliConfig(config);

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

async function runWindowsCommand(command) {
  const errors = [];

  const cmdExe = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
  try {
    return await execFileAsync(
      cmdExe,
      ['/d', '/s', '/c', command],
      {
        windowsHide: true,
        timeout: 10 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
  } catch (err) {
    errors.push(`cmd.exe: ${err?.message || err}`);
  }

  const powershellExe = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  try {
    return await execFileAsync(
      powershellExe,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
      {
        windowsHide: true,
        timeout: 10 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
  } catch (err) {
    errors.push(`powershell.exe: ${err?.message || err}`);
  }

  try {
    return await new Promise((resolve, reject) => {
      exec(
        command,
        {
          windowsHide: true,
          timeout: 10 * 60 * 1000,
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
  } catch (err) {
    errors.push(`exec fallback: ${err?.message || err}`);
  }

  throw new Error(`No se pudo ejecutar comando en Windows. Detalle: ${errors.join(' | ')}`);
}

async function resolveBinaryFromPath(binaryName) {
  const isWin = process.platform === 'win32';
  const checks = isWin
    ? ['where', [binaryName]]
    : ['which', [binaryName]];

  const env = { ...process.env };
  if (isWin) {
    env.PATH = getWindowsPathFromRegistry();
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
      path.join(localAppData, 'agy', 'bin'),
      path.join(localAppData, 'antigravity', 'staging'),
      path.join(localAppData, 'Programs', 'antigravity'),
      path.join(localAppData, 'Google', 'Antigravity', 'bin'),
      path.join(home, '.antigravity', 'bin'),
      path.join(home, '.local', 'bin'),
      path.join(home, 'AppData', 'Roaming', 'npm')
    );
  } else {
    dirs.push(
      path.join(home, '.local', 'bin'),
      path.join(home, '.agy', 'bin'),
      path.join(home, '.antigravity', 'bin')
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

async function findAntigravityCliBinaryPath() {
  const config = getAntigravityCliConfig();
  const customPath = String(config.binaryPath || '').trim();
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  for (const candidate of getDefaultAgyBinaryCandidates()) {
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

async function getAntigravityCliStatus() {
  const binaryPath = await findAntigravityCliBinaryPath();
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

async function installAntigravityCliWindows() {
  ensureConfigDir();
  const scriptPath = path.join(CONFIG_DIR, '_antigravity-install.ps1');
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
      timeout: 10 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024
    }
  );

  await execFileAsync(
    powershellExe,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    {
      windowsHide: true,
      timeout: 10 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024
    }
  );
}

async function installAntigravityCli() {
  if (process.platform === 'win32') {
    await installAntigravityCliWindows();
  } else {
    await new Promise((resolve, reject) => {
      exec(
        `curl -fsSL ${INSTALL_SH_URL} | bash`,
        {
          shell: '/bin/bash',
          windowsHide: true,
          timeout: 10 * 60 * 1000,
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

  let binaryPath = await findAntigravityCliBinaryPath();
  if (binaryPath) {
    persistDiscoveredBinaryPath(binaryPath);
    const status = await getAntigravityCliStatus();
    return status;
  }

  const expectedPaths = getDefaultAgyBinaryCandidates().join(', ');
  throw new Error(
    'La instalación terminó pero no se encontró agy.exe. Ruta esperada: ' +
    `${expectedPaths}. Comprueba tu conexión, antivirus o firewall, vuelve a pulsar "Instalar CLI" ` +
    'y, si hace falta, pega esa ruta en "Ruta binario" en Clientes de IA.'
  );
}

async function uninstallAntigravityCli() {
  throw new Error(
    'Antigravity CLI no ofrece desinstalación automática desde NodeTerm. ' +
    'Elimina el binario manualmente o consulta https://antigravity.google/docs/cli-features'
  );
}

function registerAntigravityCliHandlers() {
  [
    'antigravitycli:get-config',
    'antigravitycli:set-config',
    'antigravitycli:validate-config',
    'antigravitycli:cli-status',
    'antigravitycli:cli-install',
    'antigravitycli:cli-uninstall'
  ].forEach((ch) => {
    try {
      ipcMain.removeHandler(ch);
    } catch (_) {
      // noop
    }
  });

  ipcMain.handle('antigravitycli:get-config', async () => {
    return getAntigravityCliConfig();
  });

  ipcMain.handle('antigravitycli:set-config', async (event, payload = {}) => {
    try {
      const normalized = sanitizeAntigravityCliConfig(payload);
      const validation = validateAntigravityCliConfig(normalized);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const current = readJsonFile(ANTIGRAVITYCLI_CONFIG_PATH);
      writeJsonFile(ANTIGRAVITYCLI_CONFIG_PATH, {
        ...current,
        ...normalized,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('antigravitycli:validate-config', async (event, payload = {}) => {
    const merged = {
      ...getAntigravityCliConfig(),
      ...payload
    };
    return validateAntigravityCliConfig(merged);
  });

  ipcMain.handle('antigravitycli:cli-status', async () => {
    try {
      const status = await getAntigravityCliStatus();
      return { success: true, ...status };
    } catch (error) {
      return { success: false, error: error.message || 'No se pudo verificar Antigravity CLI' };
    }
  });

  ipcMain.handle('antigravitycli:cli-install', async () => {
    try {
      const status = await installAntigravityCli();
      return { success: true, ...status };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });

  ipcMain.handle('antigravitycli:cli-uninstall', async () => {
    try {
      await uninstallAntigravityCli();
      return { success: true };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });
}

module.exports = {
  registerAntigravityCliHandlers,
  getAntigravityCliConfig
};
