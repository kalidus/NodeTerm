const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');
const { getNodeTermDataDir } = require('../utils/file-utils');

const CONFIG_DIR = getNodeTermDataDir();
const CODEXCLI_CONFIG_PATH = path.join(CONFIG_DIR, 'codexcli-config.json');
const SECURITY_CONFIG_PATH = path.join(CONFIG_DIR, 'security.json');

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

function getCodexCliConfig() {
  const codexCliConfig = readJsonFile(CODEXCLI_CONFIG_PATH);
  const security = readJsonFile(SECURITY_CONFIG_PATH);

  return {
    binaryPath: codexCliConfig.binaryPath || '',
    extraArgs: codexCliConfig.extraArgs || '',
    apiKey: security.codexApiKey || ''
  };
}

function sanitizeCodexCliConfig(config = {}) {
  return {
    binaryPath: String(config.binaryPath || '').trim(),
    extraArgs: String(config.extraArgs || '').trim()
  };
}

function validateCodexCliConfig(config = {}) {
  const normalized = sanitizeCodexCliConfig(config);

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

async function findCodexCliBinaryPath() {
  const config = getCodexCliConfig();
  const customPath = String(config.binaryPath || '').trim();
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  const isWin = process.platform === 'win32';
  const checks = isWin
    ? ['where', ['codex.cmd']]
    : ['which', ['codex']];

  try {
    const result = await execFileAsync(checks[0], checks[1], { windowsHide: true });
    const firstLine = String(result.stdout || '').split(/\r?\n/).find(Boolean);
    return firstLine ? firstLine.trim() : null;
  } catch {
    return null;
  }
}

async function getCodexCliStatus() {
  const binaryPath = await findCodexCliBinaryPath();
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

async function installCodexCli() {
  if (process.platform === 'win32') {
    await runWindowsCommand('npm install -g @openai/codex');
  } else {
    await execFileAsync(
      'npm',
      ['install', '-g', '@openai/codex'],
      {
        windowsHide: true,
        timeout: 8 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
  }

  const status = await getCodexCliStatus();
  if (!status.installed) {
    throw new Error('La instalación terminó pero no se encontró el binario de Codex CLI en PATH');
  }
  return status;
}

async function uninstallCodexCli() {
  if (process.platform === 'win32') {
    await runWindowsCommand('npm uninstall -g @openai/codex');
  } else {
    await execFileAsync(
      'npm',
      ['uninstall', '-g', '@openai/codex'],
      {
        windowsHide: true,
        timeout: 8 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
  }
}

function registerCodexCliHandlers() {
  ['codexcli:get-config', 'codexcli:set-config', 'codexcli:validate-config',
    'codexcli:cli-status', 'codexcli:cli-install', 'codexcli:cli-uninstall'
  ].forEach(ch => { try { ipcMain.removeHandler(ch); } catch (_) {} });

  ipcMain.handle('codexcli:get-config', async () => {
    const config = getCodexCliConfig();
    return {
      ...config,
      apiKey: config.apiKey ? '********' : ''
    };
  });

  ipcMain.handle('codexcli:set-config', async (event, payload = {}) => {
    try {
      const { apiKey, ...rest } = payload;
      const normalized = sanitizeCodexCliConfig(rest);
      const validation = validateCodexCliConfig(normalized);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const current = readJsonFile(CODEXCLI_CONFIG_PATH);
      writeJsonFile(CODEXCLI_CONFIG_PATH, {
        ...current,
        ...normalized,
        updatedAt: new Date().toISOString()
      });

      if (typeof apiKey === 'string') {
        const security = readJsonFile(SECURITY_CONFIG_PATH);
        if (apiKey.trim()) {
          security.codexApiKey = apiKey.trim();
        } else {
          delete security.codexApiKey;
        }
        security.updatedAt = new Date().toISOString();
        writeJsonFile(SECURITY_CONFIG_PATH, security);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('codexcli:validate-config', async (event, payload = {}) => {
    const merged = {
      ...getCodexCliConfig(),
      ...payload
    };
    return validateCodexCliConfig(merged);
  });

  ipcMain.handle('codexcli:cli-status', async () => {
    try {
      const status = await getCodexCliStatus();
      return { success: true, ...status };
    } catch (error) {
      return { success: false, error: error.message || 'No se pudo verificar Codex CLI' };
    }
  });

  ipcMain.handle('codexcli:cli-install', async () => {
    try {
      const status = await installCodexCli();
      return { success: true, ...status };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });

  ipcMain.handle('codexcli:cli-uninstall', async () => {
    try {
      await uninstallCodexCli();
      return { success: true };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });
}

module.exports = {
  registerCodexCliHandlers,
  getCodexCliConfig
};
