const { ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { getNodeTermDataDir } = require('../utils/file-utils');
const { VAULT_SECURITY_VERSION } = require('../services/vault-security-migrations');
const { DEFAULT_VAULT_ID } = require('../../shared/vault-connection-trees');

function getSecurityConfigPath() {
  if (process.env.NODETERM_TEST_DATA_DIR) {
    return path.join(process.env.NODETERM_TEST_DATA_DIR, 'security.json');
  }
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

/**
 * null = vault principal (campos en la raíz de security.json).
 * string = vault extra (security.json.vaults[id]).
 */
function normalizeVaultId(vaultId) {
  if (vaultId == null || vaultId === '' || vaultId === DEFAULT_VAULT_ID) {
    return null;
  }
  const safe = String(vaultId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe || safe !== String(vaultId)) return null;
  return safe;
}

function extractVaultIdFromArgs(first, second) {
  // save-master-key: payload puede traer vaultId
  if (first && typeof first === 'object' && !Array.isArray(first) && first.vaultId != null) {
    return normalizeVaultId(first.vaultId);
  }
  // get-*: (event, vaultId)
  if (typeof first === 'string') return normalizeVaultId(first);
  // set-remember: (event, remember, vaultId)
  if (typeof second === 'string') return normalizeVaultId(second);
  return null;
}

function getVaultSecuritySlice(config, vaultId) {
  if (!vaultId) {
    return {
      masterKeyEncrypted: config.masterKeyEncrypted,
      masterKey: config.masterKey,
      vaultVerifier: config.vaultVerifier,
      rememberPassword: config.rememberPassword,
      vaultSecurityVersion: config.vaultSecurityVersion
    };
  }
  const vaults = config.vaults && typeof config.vaults === 'object' ? config.vaults : {};
  const slice = vaults[vaultId] && typeof vaults[vaultId] === 'object' ? vaults[vaultId] : {};
  return { ...slice };
}

function applyVaultSecuritySlice(config, vaultId, slice) {
  if (!vaultId) {
    if (slice.masterKeyEncrypted !== undefined) config.masterKeyEncrypted = slice.masterKeyEncrypted;
    if (slice.masterKey !== undefined) config.masterKey = slice.masterKey;
    if (slice.vaultVerifier !== undefined) config.vaultVerifier = slice.vaultVerifier;
    if (slice.rememberPassword !== undefined) config.rememberPassword = slice.rememberPassword;
    if (slice.vaultSecurityVersion !== undefined) {
      config.vaultSecurityVersion = slice.vaultSecurityVersion;
    }
    if (slice.deleteMasterKey) {
      delete config.masterKey;
      delete config.masterKeyEncrypted;
    }
    if (slice.deleteVerifier) {
      delete config.vaultVerifier;
    }
    if (slice.deleteRemember) {
      delete config.rememberPassword;
    }
    return;
  }
  if (!config.vaults || typeof config.vaults !== 'object') {
    config.vaults = {};
  }
  const prev = config.vaults[vaultId] && typeof config.vaults[vaultId] === 'object'
    ? { ...config.vaults[vaultId] }
    : {};
  if (slice.masterKeyEncrypted !== undefined) prev.masterKeyEncrypted = slice.masterKeyEncrypted;
  if (slice.masterKey !== undefined) prev.masterKey = slice.masterKey;
  if (slice.vaultVerifier !== undefined) prev.vaultVerifier = slice.vaultVerifier;
  if (slice.rememberPassword !== undefined) prev.rememberPassword = slice.rememberPassword;
  if (slice.vaultSecurityVersion !== undefined) {
    prev.vaultSecurityVersion = slice.vaultSecurityVersion;
  }
  if (slice.deleteMasterKey) {
    delete prev.masterKey;
    delete prev.masterKeyEncrypted;
  }
  if (slice.deleteVerifier) {
    delete prev.vaultVerifier;
  }
  if (slice.deleteRemember) {
    delete prev.rememberPassword;
  }
  prev.updatedAt = new Date().toISOString();
  config.vaults[vaultId] = prev;
}

function decryptMasterKeyValue(encryptedB64) {
  if (!encryptedB64 || !safeStorage || !safeStorage.isEncryptionAvailable()) return null;
  try {
    const buffer = Buffer.from(encryptedB64, 'base64');
    const decrypted = safeStorage.decryptString(buffer);
    try {
      return JSON.parse(decrypted);
    } catch (_) {
      return decrypted;
    }
  } catch (decErr) {
    console.error('❌ [Security] Falló descifrado con safeStorage:', decErr.message);
    return null;
  }
}

function registerSecurityHandlers(dependencies) {
  // Sin assertTrustedIpcSender en get-master-key: un false-negative rompía el auto-unlock.
  // El preload ya limita los canales security:*.
  // vaultId opcional: sin él = vault principal (comportamiento histórico).
  safeHandle('security:get-master-key', async (_event, vaultIdArg) => {
    try {
      const vaultId = normalizeVaultId(vaultIdArg);
      const config = readSecurityConfig();
      const slice = getVaultSecuritySlice(config, vaultId);

      // Un "no recordar" explícito gana sobre una clave residual en disco.
      if (slice.rememberPassword === false) {
        return null;
      }

      if (slice.masterKeyEncrypted) {
        const decrypted = decryptMasterKeyValue(slice.masterKeyEncrypted);
        if (decrypted != null) return decrypted;
      }

      if (slice.masterKey) {
        if (!vaultId && safeStorage && safeStorage.isEncryptionAvailable()) {
          try {
            const payloadStr = typeof slice.masterKey === 'string'
              ? slice.masterKey
              : JSON.stringify(slice.masterKey);
            const encryptedBuffer = safeStorage.encryptString(payloadStr);
            applyVaultSecuritySlice(config, null, {
              masterKeyEncrypted: encryptedBuffer.toString('base64'),
              deleteMasterKey: false
            });
            delete config.masterKey;
            writeSecurityConfig(config);
            try {
              return JSON.parse(payloadStr);
            } catch (_) {
              return slice.masterKey;
            }
          } catch (migErr) {
            console.warn('⚠️ [Security] No se pudo migrar masterKey legado:', migErr.message);
          }
        }
        return slice.masterKey;
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
      let vaultId = null;

      if (typeof payload === 'string') {
        masterKey = payload;
      } else if (payload && typeof payload === 'object') {
        vaultId = normalizeVaultId(payload.vaultId);
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
      if (!vaultId) {
        config.updatedAt = new Date().toISOString();
      }

      const sliceUpdate = {};

      if (rememberPassword !== undefined) {
        sliceUpdate.rememberPassword = !!rememberPassword;
      }

      if (verifier) {
        sliceUpdate.vaultVerifier = verifier;
        sliceUpdate.vaultSecurityVersion = VAULT_SECURITY_VERSION;
      }

      const effectiveRemember =
        rememberPassword !== undefined
          ? !!rememberPassword
          : getVaultSecuritySlice(config, vaultId).rememberPassword;

      if (effectiveRemember === false) {
        sliceUpdate.deleteMasterKey = true;
        applyVaultSecuritySlice(config, vaultId, sliceUpdate);
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
          sliceUpdate.masterKeyEncrypted = encryptedBuffer.toString('base64');
          sliceUpdate.deleteMasterKey = false;
          applyVaultSecuritySlice(config, vaultId, sliceUpdate);
          if (!vaultId) {
            delete config.masterKey;
          } else if (config.vaults && config.vaults[vaultId]) {
            delete config.vaults[vaultId].masterKey;
          }
        } catch (encErr) {
          console.warn('⚠️ [Security] No se pudo cifrar la clave maestra:', encErr.message);
          return {
            success: false,
            error: 'No se pudo cifrar la clave maestra para recordarla en este dispositivo.'
          };
        }
      } else {
        applyVaultSecuritySlice(config, vaultId, sliceUpdate);
      }

      writeSecurityConfig(config);
      return { success: true };
    } catch (error) {
      console.error('❌ [Security] Error guardando clave maestra:', error.message);
      return { success: false, error: error.message };
    }
  });

  safeHandle('security:has-master-key', async (_event, vaultIdArg) => {
    try {
      const vaultId = normalizeVaultId(vaultIdArg);
      const slice = getVaultSecuritySlice(readSecurityConfig(), vaultId);
      return !!(slice.masterKeyEncrypted || slice.masterKey || slice.vaultVerifier);
    } catch (error) {
      return false;
    }
  });

  safeHandle('security:get-vault-verifier', async (_event, vaultIdArg) => {
    try {
      const vaultId = normalizeVaultId(vaultIdArg);
      const slice = getVaultSecuritySlice(readSecurityConfig(), vaultId);
      return slice.vaultVerifier || null;
    } catch (error) {
      return null;
    }
  });

  safeHandle('security:get-remember-password', async (_event, vaultIdArg) => {
    try {
      const vaultId = normalizeVaultId(vaultIdArg);
      const slice = getVaultSecuritySlice(readSecurityConfig(), vaultId);
      // false explícito: no recordar, aunque quede una clave cifrada residual.
      if (slice.rememberPassword === false) return false;
      if (slice.rememberPassword === true || slice.masterKeyEncrypted || slice.masterKey) {
        return true;
      }
      // Sin elección guardada. El diálogo de desbloqueo usa true como default.
      return null;
    } catch (error) {
      return null;
    }
  });

  safeHandle('security:set-remember-password', async (event, remember, vaultIdArg) => {
    try {
      const vaultId = normalizeVaultId(vaultIdArg);
      const config = readSecurityConfig();
      const sliceUpdate = { rememberPassword: !!remember };
      if (!remember) {
        sliceUpdate.deleteMasterKey = true;
      }
      if (!vaultId) {
        config.updatedAt = new Date().toISOString();
      }
      applyVaultSecuritySlice(config, vaultId, sliceUpdate);
      writeSecurityConfig(config);
      return { success: true };
    } catch (error) {
      console.error('❌ [Security] Error guardando rememberPassword:', error.message);
      return { success: false, error: error.message };
    }
  });

  safeHandle('security:clear-master-key', async (_event, vaultIdArg) => {
    try {
      const vaultId = normalizeVaultId(vaultIdArg);
      const config = readSecurityConfig();
      if (!vaultId) {
        delete config.masterKey;
        delete config.masterKeyEncrypted;
        delete config.vaultVerifier;
        delete config.rememberPassword;
      } else if (config.vaults && config.vaults[vaultId]) {
        delete config.vaults[vaultId];
      }
      writeSecurityConfig(config);
      return { success: true };
    } catch (error) {
      console.error('❌ [Security] Error borrando clave maestra:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerSecurityHandlers,
  normalizeVaultId,
  getVaultSecuritySlice,
  applyVaultSecuritySlice,
  readSecurityConfig,
  writeSecurityConfig,
  getSecurityConfigPath
};
