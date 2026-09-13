const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');
const { getNodeTermDataDir } = require('./file-utils');

const CONFIG_DIR = getNodeTermDataDir();
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

function createAiCliHandler(options) {
  const {
    channelPrefix,
    configFileName,
    securityKeyField = null,
    securityKeyOutputName = null,
    npmPackage,
    binaryNamesWin = [`${channelPrefix}.cmd`, `${channelPrefix}.exe`, channelPrefix],
    binaryNamesUnix = [channelPrefix],
    hasDefaultModel = false,
    versionFlag = '--version'
  } = options;

  const configPath = path.join(CONFIG_DIR, configFileName);

  function getConfig() {
    const config = readJsonFile(configPath);
    const security = securityKeyField ? readJsonFile(SECURITY_CONFIG_PATH) : {};

    const result = {
      binaryPath: config.binaryPath || '',
      extraArgs: config.extraArgs || ''
    };

    if (hasDefaultModel) {
      result.defaultModel = config.defaultModel || '';
    }

    if (securityKeyField && securityKeyOutputName) {
      result[securityKeyOutputName] = security[securityKeyField] || '';
    }

    return result;
  }

  function sanitizeConfig(inputConfig = {}) {
    const sanitized = {
      binaryPath: String(inputConfig.binaryPath || '').trim(),
      extraArgs: String(inputConfig.extraArgs || '').trim()
    };

    if (hasDefaultModel) {
      sanitized.defaultModel = String(inputConfig.defaultModel || '').trim();
    }

    return sanitized;
  }

  function validateConfig(inputConfig = {}) {
    const normalized = sanitizeConfig(inputConfig);
    if (normalized.binaryPath && !fs.existsSync(normalized.binaryPath)) {
      return {
        valid: false,
        error: `No existe el binario en la ruta configurada: ${normalized.binaryPath}`
      };
    }
    return { valid: true };
  }

  async function findBinaryPath() {
    const config = getConfig();
    const customPath = String(config.binaryPath || '').trim();
    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }

    const isWin = process.platform === 'win32';
    const names = isWin ? binaryNamesWin : binaryNamesUnix;
    const lookupCmd = isWin ? 'where' : 'which';

    for (const name of names) {
      try {
        const result = await execFileAsync(lookupCmd, [name], { windowsHide: true });
        const firstLine = String(result.stdout || '').split(/\r?\n/).find(Boolean);
        if (firstLine && firstLine.trim()) {
          return firstLine.trim();
        }
      } catch {
        // continuar buscando el siguiente candidato
      }
    }

    return null;
  }

  async function getCliStatus() {
    const binaryPath = await findBinaryPath();
    if (!binaryPath) {
      return {
        installed: false,
        binaryPath: null,
        version: null
      };
    }

    try {
      const { stdout } = await execFileAsync(binaryPath, [versionFlag], { windowsHide: true });
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

  async function installCli() {
    if (process.platform === 'win32') {
      await runWindowsCommand(`npm install -g ${npmPackage}`);
    } else {
      await execFileAsync(
        'npm',
        ['install', '-g', npmPackage],
        {
          windowsHide: true,
          timeout: 8 * 60 * 1000,
          maxBuffer: 10 * 1024 * 1024
        }
      );
    }

    const status = await getCliStatus();
    if (!status.installed) {
      throw new Error(`La instalación terminó pero no se encontró el binario de ${channelPrefix} en PATH`);
    }
    return status;
  }

  async function uninstallCli() {
    if (process.platform === 'win32') {
      await runWindowsCommand(`npm uninstall -g ${npmPackage}`);
    } else {
      await execFileAsync(
        'npm',
        ['uninstall', '-g', npmPackage],
        {
          windowsHide: true,
          timeout: 8 * 60 * 1000,
          maxBuffer: 10 * 1024 * 1024
        }
      );
    }
  }

  function registerHandlers() {
    ipcMain.handle(`${channelPrefix}:get-config`, async () => {
      const config = getConfig();
      if (securityKeyOutputName && config[securityKeyOutputName]) {
        return {
          ...config,
          [securityKeyOutputName]: '********'
        };
      }
      return config;
    });

    ipcMain.handle(`${channelPrefix}:set-config`, async (event, payload = {}) => {
      try {
        let secValue = undefined;
        const rest = { ...payload };

        if (securityKeyOutputName && securityKeyOutputName in payload) {
          secValue = payload[securityKeyOutputName];
          delete rest[securityKeyOutputName];
        }

        const normalized = sanitizeConfig(rest);
        const validation = validateConfig(normalized);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const current = readJsonFile(configPath);
        writeJsonFile(configPath, {
          ...current,
          ...normalized,
          updatedAt: new Date().toISOString()
        });

        if (securityKeyField && typeof secValue === 'string') {
          const security = readJsonFile(SECURITY_CONFIG_PATH);
          if (secValue.trim()) {
            security[securityKeyField] = secValue.trim();
          } else {
            delete security[securityKeyField];
          }
          security.updatedAt = new Date().toISOString();
          writeJsonFile(SECURITY_CONFIG_PATH, security);
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(`${channelPrefix}:validate-config`, async (event, payload = {}) => {
      const merged = {
        ...getConfig(),
        ...payload
      };
      return validateConfig(merged);
    });

    ipcMain.handle(`${channelPrefix}:cli-status`, async () => {
      try {
        const status = await getCliStatus();
        return { success: true, ...status };
      } catch (error) {
        return { success: false, error: error.message || `No se pudo verificar ${channelPrefix} CLI` };
      }
    });

    ipcMain.handle(`${channelPrefix}:cli-install`, async () => {
      try {
        const status = await installCli();
        return { success: true, ...status };
      } catch (error) {
        const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
        return { success: false, error: details };
      }
    });

    ipcMain.handle(`${channelPrefix}:cli-uninstall`, async () => {
      try {
        await uninstallCli();
        return { success: true };
      } catch (error) {
        const details = (error.stderr || error.stdout || error.message || 'Error desconocido').toString();
        return { success: false, error: details };
      }
    });
  }

  return {
    getConfig,
    sanitizeConfig,
    validateConfig,
    findBinaryPath,
    getCliStatus,
    installCli,
    uninstallCli,
    registerHandlers
  };
}

module.exports = {
  createAiCliHandler,
  execFileAsync,
  runWindowsCommand
};
