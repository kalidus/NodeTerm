const { ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { getNodeTermDataDir } = require('../utils/file-utils');
const { VAULT_SECURITY_VERSION } = require('../services/vault-security-migrations');

function getSecurityConfigPath() {
  return path.join(getNodeTermDataDir(), 'security.json');
}

function readSecurityConfig() {
  const SECURITY_CONFIG_PATH = getSecurityConfigPath();
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
  const SECURITY_CONFIG_PATH = getSecurityConfigPath();
  fs.writeFileSync(SECURITY_CONFIG_PATH, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 });
}

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

function registerSecurityHandlers(dependencies) {
  // Sin assertTrustedIpcSender en get-master-key: un false-negative rompía el auto-unlock.
  // El preload ya limita los canales security:*.
  safeHandle('security:get-master-key', async () => {
    try {
      const config = readSecurityConfig();

      if (config.rememberPassword === false && !config.masterKeyEncrypted && !config.masterKey) {
        return null;
      }

      if (config.masterKeyEncrypted && safeStorage && safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(config.masterKeyEncrypted, 'base64');
          const decrypted = safeStorage.decryptString(buffer);
          try {
            return JSON.parse(decrypted);
          } catch (_) {
            return decrypted;
          }
        } catch (decErr) {
          console.error('❌ [Security] Falló descifrado con safeStorage:', decErr.message);
        }
      }

      if (config.masterKey) {
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
          try {
            const payloadStr = typeof config.masterKey === 'string'
              ? config.masterKey
              : JSON.stringify(config.masterKey);
            const encryptedBuffer = safeStorage.encryptString(payloadStr);
            config.masterKeyEncrypted = encryptedBuffer.toString('base64');
            const legacy = config.masterKey;
            delete config.masterKey;
            writeSecurityConfig(config);
            try {
              return JSON.parse(payloadStr);
            } catch (_) {
              return legacy;
            }
          } catch (migErr) {
            console.warn('⚠️ [Security] No se pudo migrar masterKey legado:', migErr.message);
          }
        }
        return config.masterKey;
      }

      return null;
    } catch (error) {
      console.warn('⚠️ [Security] Error leyendo seguridad:', error.message);
      return null;
    }
  });

  safeHandle('security:save-master-key', async (event, payload) => {
    try {
      let masterKey = null;
      let verifier = null;
      let rememberPassword;

      if (typeof payload === 'string') {
        masterKey = payload;
      } else if (payload && typeof payload === 'object') {
        const isEncryptedBlob = !!(payload.salt && payload.iv && payload.data);
        if (isEncryptedBlob) {
          masterKey = payload;
        } else {
          masterKey = payload.masterKey ?? payload.encryptedMasterKey ?? null;
          verifier = payload.verifier ?? payload.vaultVerifier ?? null;
          rememberPassword = payload.rememberPassword;
        }
      }

      const config = readSecurityConfig();
      config.updatedAt = new Date().toISOString();

      if (rememberPassword !== undefined) {
        config.rememberPassword = !!rememberPassword;
      }

      if (verifier) {
        config.vaultVerifier = verifier;
        config.vaultSecurityVersion = VAULT_SECURITY_VERSION;
      }

      if (config.rememberPassword === false) {
        delete config.masterKey;
        delete config.masterKeyEncrypted;
      } else if (masterKey) {
        const payloadStr = typeof masterKey === 'string' ? masterKey : JSON.stringify(masterKey);
        if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
          return {
            success: false,
            error: 'El sistema no permite cifrar la clave maestra (safeStorage no disponible). El vault sigue usable introduciendo la clave manualmente.'
          };
        }
        try {
          const encryptedBuffer = safeStorage.encryptString(payloadStr);
          config.masterKeyEncrypted = encryptedBuffer.toString('base64');
          delete config.masterKey;
        } catch (encErr) {
          console.warn('⚠️ [Security] No se pudo cifrar la clave maestra:', encErr.message);
          return {
            success: false,
            error: 'No se pudo cifrar la clave maestra para recordarla en este dispositivo.'
          };
        }
      }

      writeSecurityConfig(config);
      return { success: true };
    } catch (error) {
      console.error('❌ [Security] Error guardando clave maestra:', error.message);
      return { success: false, error: error.message };
    }
  });

  safeHandle('security:has-master-key', async () => {
    try {
      const config = readSecurityConfig();
      return !!(config.masterKeyEncrypted || config.masterKey || config.vaultVerifier);
    } catch (error) {
      return false;
    }
  });

  safeHandle('security:get-vault-verifier', async () => {
    try {
      const config = readSecurityConfig();
      return config.vaultVerifier || null;
    } catch (error) {
      return null;
    }
  });

  safeHandle('security:get-remember-password', async () => {
    try {
      const config = readSecurityConfig();
      return config.rememberPassword === true || !!config.masterKeyEncrypted;
    } catch (error) {
      return false;
    }
  });

  safeHandle('security:set-remember-password', async (event, remember) => {
    try {
      const config = readSecurityConfig();
      config.rememberPassword = !!remember;
      if (!remember) {
        delete config.masterKey;
        delete config.masterKeyEncrypted;
      }
      config.updatedAt = new Date().toISOString();
      writeSecurityConfig(config);
      return { success: true };
    } catch (error) {
      console.error('❌ [Security] Error guardando rememberPassword:', error.message);
      return { success: false, error: error.message };
    }
  });

  safeHandle('security:clear-master-key', async () => {
    try {
      const config = readSecurityConfig();
      delete config.masterKey;
      delete config.masterKeyEncrypted;
      delete config.vaultVerifier;
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
