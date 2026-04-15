const { ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.nodeterm');
const CLAUDE_CONFIG_PATH = path.join(CONFIG_DIR, 'claude-config.json');
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

function getClaudeConfig() {
  const claudeConfig = readJsonFile(CLAUDE_CONFIG_PATH);
  const security = readJsonFile(SECURITY_CONFIG_PATH);

  return {
    binaryPath: claudeConfig.binaryPath || '',
    defaultModel: claudeConfig.defaultModel || '',
    extraArgs: claudeConfig.extraArgs || '',
    authToken: security.claudeAuthToken || ''
  };
}

function sanitizeClaudeConfig(config = {}) {
  return {
    binaryPath: String(config.binaryPath || '').trim(),
    defaultModel: String(config.defaultModel || '').trim(),
    extraArgs: String(config.extraArgs || '').trim()
  };
}

function validateClaudeConfig(config = {}) {
  const normalized = sanitizeClaudeConfig(config);

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

async function findClaudeBinaryPath() {
  const config = getClaudeConfig();
  const customPath = String(config.binaryPath || '').trim();
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  const isWin = process.platform === 'win32';
  const checks = isWin
    ? ['where', ['claude.cmd']]
    : ['which', ['claude']];

  try {
    const result = await execFileAsync(checks[0], checks[1], { windowsHide: true });
    const firstLine = String(result.stdout || '').split(/\r?\n/).find(Boolean);
    return firstLine ? firstLine.trim() : null;
  } catch {
    return null;
  }
}

async function getClaudeCliStatus() {
  const binaryPath = await findClaudeBinaryPath();
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

async function installClaudeCli() {
  if (process.platform === 'win32') {
    await runWindowsCommand('npm install -g @anthropic-ai/claude-code');
  } else {
    await execFileAsync(
      'npm',
      ['install', '-g', '@anthropic-ai/claude-code'],
      {
        windowsHide: true,
        timeout: 8 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
  }

  const status = await getClaudeCliStatus();
  if (!status.installed) {
    throw new Error('La instalación terminó pero no se encontró el binario de Claude en PATH');
  }
  return status;
}

async function uninstallClaudeCli() {
  if (process.platform === 'win32') {
    await runWindowsCommand('npm uninstall -g @anthropic-ai/claude-code');
  } else {
    await execFileAsync(
      'npm',
      ['uninstall', '-g', '@anthropic-ai/claude-code'],
      {
        windowsHide: true,
        timeout: 8 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }
    );
  }
}

function registerClaudeHandlers() {
  ipcMain.handle('claude:get-config', async () => {
    const config = getClaudeConfig();
    return {
      ...config,
      authToken: config.authToken ? '********' : ''
    };
  });

  ipcMain.handle('claude:set-config', async (event, payload = {}) => {
    try {
      const { authToken, ...rest } = payload;
      const normalized = sanitizeClaudeConfig(rest);
      const validation = validateClaudeConfig(normalized);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const current = readJsonFile(CLAUDE_CONFIG_PATH);
      writeJsonFile(CLAUDE_CONFIG_PATH, {
        ...current,
        ...normalized,
        updatedAt: new Date().toISOString()
      });

      if (typeof authToken === 'string') {
        const security = readJsonFile(SECURITY_CONFIG_PATH);
        if (authToken.trim()) {
          security.claudeAuthToken = authToken.trim();
        } else {
          delete security.claudeAuthToken;
        }
        security.updatedAt = new Date().toISOString();
        writeJsonFile(SECURITY_CONFIG_PATH, security);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('claude:validate-config', async (event, payload = {}) => {
    const merged = {
      ...getClaudeConfig(),
      ...payload
    };
    return validateClaudeConfig(merged);
  });

  ipcMain.handle('claude:cli-status', async () => {
    try {
      const status = await getClaudeCliStatus();
      return { success: true, ...status };
    } catch (error) {
      return { success: false, error: error.message || 'No se pudo verificar Claude CLI' };
    }
  });

  ipcMain.handle('claude:cli-install', async () => {
    try {
      const status = await installClaudeCli();
      return { success: true, ...status };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });

  ipcMain.handle('claude:cli-uninstall', async () => {
    try {
      await uninstallClaudeCli();
      return { success: true };
    } catch (error) {
      const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
      return { success: false, error: details };
    }
  });
}

module.exports = {
  registerClaudeHandlers,
  getClaudeConfig
};
