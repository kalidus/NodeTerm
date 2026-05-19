const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { getNodeTermDataDir } = require('../utils/file-utils');

const SECURITY_CONFIG_PATH = path.join(getNodeTermDataDir(), 'security.json');

function readSecurityConfig() {
  if (!fs.existsSync(SECURITY_CONFIG_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(SECURITY_CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error('⚠️ [Security] Error parseando security.json:', e);
    return {};
  }
}

function writeSecurityConfig(config) {
  fs.writeFileSync(SECURITY_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function registerSecurityHandlers(dependencies) {
  ipcMain.handle('security:get-master-key', async () => {
    try {
      const config = readSecurityConfig();
      return config.masterKey || null;
    } catch (error) {
      console.warn('⚠️ [Security] Error leyendo seguridad:', error.message);
      return null;
    }
  });

  ipcMain.handle('security:save-master-key', async (event, payload) => {
    try {
      let encryptedMasterKey = payload;
      let rememberPassword;

      const isEncryptedBlob =
        payload &&
        typeof payload === 'object' &&
        (payload.salt || payload.iv || payload.data);

      if (payload && typeof payload === 'object' && !isEncryptedBlob) {
        encryptedMasterKey = payload.encryptedMasterKey ?? payload;
        rememberPassword = payload.rememberPassword;
      }

      const config = readSecurityConfig();
      config.masterKey = encryptedMasterKey;
      config.updatedAt = new Date().toISOString();

      if (rememberPassword !== undefined) {
        config.rememberPassword = !!rememberPassword;
      }

      writeSecurityConfig(config);
      return { success: true };
    } catch (error) {
      console.error('❌ [Security] Error guardando clave maestra:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('security:has-master-key', async () => {
    try {
      const config = readSecurityConfig();
      return !!config.masterKey;
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('security:get-remember-password', async () => {
    try {
      const config = readSecurityConfig();
      return config.rememberPassword === true;
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('security:set-remember-password', async (event, remember) => {
    try {
      const config = readSecurityConfig();
      config.rememberPassword = !!remember;
      config.updatedAt = new Date().toISOString();
      writeSecurityConfig(config);
      return { success: true };
    } catch (error) {
      console.error('❌ [Security] Error guardando rememberPassword:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('security:clear-master-key', async () => {
    try {
      const config = readSecurityConfig();
      delete config.masterKey;
      delete config.rememberPassword;
      writeSecurityConfig(config);
      return { success: true };
    } catch (error) {
      console.error('❌ [Security] Error borrando clave maestra:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerSecurityHandlers
};
