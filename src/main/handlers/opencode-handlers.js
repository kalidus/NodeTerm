const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');
const { getNodeTermDataDir } = require('../utils/file-utils');

const CONFIG_DIR = getNodeTermDataDir();
const OPENCODE_CONFIG_PATH = path.join(CONFIG_DIR, 'opencode-config.json');

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

function getOpenCodeConfig() {
  const openCodeConfig = readJsonFile(OPENCODE_CONFIG_PATH);

  return {
    binaryPath: openCodeConfig.binaryPath || '',
    extraArgs: openCodeConfig.extraArgs || ''
  };
}

function sanitizeOpenCodeConfig(config = {}) {
  return {
    binaryPath: String(config.binaryPath || '').trim(),
    extraArgs: String(config.extraArgs || '').trim()
  };
}

function validateOpenCodeConfig(config = {}) {
  const normalized = sanitizeOpenCodeConfig(config);

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
        timeout: 8 * 60 * 1000,
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
        timeout: 8 * 60 * 1000,
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
          timeout: 8 * 60 * 1000,
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

async function findOpenCodeBinaryPath() {
  const config = getOpenCodeConfig();
  const customPath = String(config.binaryPath || '').trim();
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  const isWin = process.platform === 'win32';
  const checks = isWin
    ? ['where', ['opencode.cmd']]
    : ['which', ['opencode']];

  try {
    const result = await execFileAsync(checks[0], checks[1], { windowsHide: true });
    const firstLine = String(result.stdout || '').split(/\r?\n/).find(Boolean);
    return firstLine ? firstLine.trim() : null;
  } catch {
    return null;
  }
}

async function getOpenCodeCliStatus() {
  const binaryPath = await findOpenCodeBinaryPath();
  if (!binaryPath) {
    return {
      installed: false,
      binaryPath: null,
      version: null
    };
  }

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

async function installOpenCodeCli() {
  if (process.platform === 'win32') {
    await runWindowsCommand('npm install -g opencode-ai');
  } else {
    await execFileAsync(
      'npm',
      ['install', '-g', 'opencode-ai'],
      {
        windowsHide: true,
        timeout: 8 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
  }

  const status = await getOpenCodeCliStatus();
  if (!status.installed) {
    throw new Error('La instalación terminó pero no se encontró el binario de OpenCode en PATH');
  }
  return status;
}

async function uninstallOpenCodeCli() {
  if (process.platform === 'win32') {
    await runWindowsCommand('npm uninstall -g opencode-ai');
  } else {
    await execFileAsync(
      'npm',
      ['uninstall', '-g', 'opencode-ai'],
      {
        windowsHide: true,
        timeout: 8 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
  }
}

function registerOpenCodeHandlers() {
  ipcMain.handle('opencode:get-config', async () => {
    return getOpenCodeConfig();
  });

  ipcMain.handle('opencode:set-config', async (event, payload = {}) => {
    try {
      const normalized = sanitizeOpenCodeConfig(payload);
      const validation = validateOpenCodeConfig(normalized);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const current = readJsonFile(OPENCODE_CONFIG_PATH);
      writeJsonFile(OPENCODE_CONFIG_PATH, {
        ...current,
        ...normalized,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('opencode:validate-config', async (event, payload = {}) => {
    const merged = {
      ...getOpenCodeConfig(),
      ...payload
    };
    return validateOpenCodeConfig(merged);
  });

  ipcMain.handle('opencode:cli-status', async () => {
    try {
      const status = await getOpenCodeCliStatus();
      return { success: true, ...status };
    } catch (error) {
      return { success: false, error: error.message || 'No se pudo verificar OpenCode CLI' };
    }
  });

  ipcMain.handle('opencode:cli-install', async () => {
    try {
      const status = await installOpenCodeCli();
      return { success: true, ...status };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });

  ipcMain.handle('opencode:cli-uninstall', async () => {
    try {
      await uninstallOpenCodeCli();
      return { success: true };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });
}

module.exports = {
  registerOpenCodeHandlers,
  getOpenCodeConfig
};
