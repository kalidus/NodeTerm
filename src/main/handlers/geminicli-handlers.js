const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.nodeterm');
const GEMINICLI_CONFIG_PATH = path.join(CONFIG_DIR, 'geminicli-config.json');

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

function getGeminiCliConfig() {
  const geminiCliConfig = readJsonFile(GEMINICLI_CONFIG_PATH);

  return {
    binaryPath: geminiCliConfig.binaryPath || '',
    extraArgs: geminiCliConfig.extraArgs || ''
  };
}

function sanitizeGeminiCliConfig(config = {}) {
  return {
    binaryPath: String(config.binaryPath || '').trim(),
    extraArgs: String(config.extraArgs || '').trim()
  };
}

function validateGeminiCliConfig(config = {}) {
  const normalized = sanitizeGeminiCliConfig(config);

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

async function findGeminiCliBinaryPath() {
  const config = getGeminiCliConfig();
  const customPath = String(config.binaryPath || '').trim();
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  const isWin = process.platform === 'win32';
  const checks = isWin
    ? ['where', ['gemini.cmd']]
    : ['which', ['gemini']];

  try {
    const result = await execFileAsync(checks[0], checks[1], { windowsHide: true });
    const firstLine = String(result.stdout || '').split(/\r?\n/).find(Boolean);
    return firstLine ? firstLine.trim() : null;
  } catch {
    return null;
  }
}

async function getGeminiCliStatus() {
  const binaryPath = await findGeminiCliBinaryPath();
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

async function installGeminiCli() {
  if (process.platform === 'win32') {
    await runWindowsCommand('npm install -g @google/gemini-cli');
  } else {
    await execFileAsync(
      'npm',
      ['install', '-g', '@google/gemini-cli'],
      {
        windowsHide: true,
        timeout: 8 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
  }

  const status = await getGeminiCliStatus();
  if (!status.installed) {
    throw new Error('La instalación terminó pero no se encontró el binario de Gemini CLI en PATH');
  }
  return status;
}

async function uninstallGeminiCli() {
  if (process.platform === 'win32') {
    await runWindowsCommand('npm uninstall -g @google/gemini-cli');
  } else {
    await execFileAsync(
      'npm',
      ['uninstall', '-g', '@google/gemini-cli'],
      {
        windowsHide: true,
        timeout: 8 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
  }
}

function registerGeminiCliHandlers() {
  // Limpiar handlers previos para evitar errores en hot-reload
  ['geminicli:get-config', 'geminicli:set-config', 'geminicli:validate-config',
    'geminicli:cli-status', 'geminicli:cli-install', 'geminicli:cli-uninstall'
  ].forEach(ch => { try { ipcMain.removeHandler(ch); } catch (_) {} });

  ipcMain.handle('geminicli:get-config', async () => {
    return getGeminiCliConfig();
  });

  ipcMain.handle('geminicli:set-config', async (event, payload = {}) => {
    try {
      const normalized = sanitizeGeminiCliConfig(payload);
      const validation = validateGeminiCliConfig(normalized);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const current = readJsonFile(GEMINICLI_CONFIG_PATH);
      writeJsonFile(GEMINICLI_CONFIG_PATH, {
        ...current,
        ...normalized,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('geminicli:validate-config', async (event, payload = {}) => {
    const merged = {
      ...getGeminiCliConfig(),
      ...payload
    };
    return validateGeminiCliConfig(merged);
  });

  ipcMain.handle('geminicli:cli-status', async () => {
    try {
      const status = await getGeminiCliStatus();
      return { success: true, ...status };
    } catch (error) {
      return { success: false, error: error.message || 'No se pudo verificar Gemini CLI' };
    }
  });

  ipcMain.handle('geminicli:cli-install', async () => {
    try {
      const status = await installGeminiCli();
      return { success: true, ...status };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });

  ipcMain.handle('geminicli:cli-uninstall', async () => {
    try {
      await uninstallGeminiCli();
      return { success: true };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });
}

module.exports = {
  registerGeminiCliHandlers,
  getGeminiCliConfig
};
