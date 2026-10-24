/**
 * Handlers para sincronizacion de localStorage entre instancias
 *
 * Settings viven en app-data.json; vault cifrado en vault/*.bin (sidecars).
 * Las instancias secundarias usan UserData temporal y leen estos ficheros compartidos.
 */

const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  getNodeTermDataDir,
  serializeAppDataFile,
  parseAppDataFileContent,
  isAppDataPlainJson
} = require('../utils/file-utils');
const { SYNC_KEYS } = require('../utils/sync-keys');
const {
  VAULT_SIDECAR_KEYS,
  extractAndPersistVaultSidecars,
  migrateEmbeddedVaultToSidecars,
  stripVaultKeysFromObject,
  getVaultSidecarsMtimeMax,
  getVaultSidecarStamps,
  readVaultSidecar,
  listVaultSidecarBasenames,
  ensureVaultDir,
  getVaultDir
} = require('../utils/vault-sidecar');

const APP_DATA_PATH = path.join(getNodeTermDataDir(), 'app-data.json');
const APP_DATA_DIR = path.dirname(APP_DATA_PATH);

const READ_MAX_RETRIES = 8;
const WATCH_FALLBACK_MS = 15000;

let cachedData = null;
let cachedStamp = 0;
let watcher = null;
let vaultWatcher = null;
let watchFallbackTimer = null;
let watchNotifyTimer = null;
let watchStarted = false;

function getAppDataMtime() {
  try {
    if (!fs.existsSync(APP_DATA_PATH)) return 0;
    return fs.statSync(APP_DATA_PATH).mtimeMs;
  } catch (_) {
    return 0;
  }
}

function getContentStamp() {
  return Math.max(getAppDataMtime(), getVaultSidecarsMtimeMax());
}

function invalidateAppDataCache() {
  cachedData = null;
  cachedStamp = 0;
}

function readAppDataFromDisk() {
  let parsed = null;
  const isSecondary = process.env.NODETERM_IS_SECONDARY_INSTANCE === 'true';

  if (fs.existsSync(APP_DATA_PATH)) {
    const raw = fs.readFileSync(APP_DATA_PATH, 'utf8');
    parsed = parseAppDataFileContent(raw);

    let needsRewrite = false;
    if (parsed && parsed.nodeterm_master_key) {
      delete parsed.nodeterm_master_key;
      needsRewrite = true;
    }

    // Solo primaria escribe sidecars desde keys embebidas; merge sigue pudiendo usar embebido.
    if (!isSecondary) {
      const migratedVault = migrateEmbeddedVaultToSidecars(parsed);
      if (migratedVault) {
        needsRewrite = true;
      }
    }

    if ((!isAppDataPlainJson(raw) || needsRewrite) && !isSecondary) {
      try {
        const toWrite = stripVaultKeysFromObject(parsed);
        fs.writeFileSync(APP_DATA_PATH, serializeAppDataFile(toWrite), { encoding: 'utf8', mode: 0o600 });
        parsed = toWrite;
        console.log('[AppData] Normalizado app-data.json (compacto, vault en sidecars)');
      } catch (migrateErr) {
        console.warn('[AppData] No se pudo guardar app-data.json saneado:', migrateErr.message);
      }
    }
  }

  // No rehidratar .bin aquí: get-all solo lleva settings. Blobs vía appdata:get-vault.
  // Si aún no hay sidecar, se conserva la key embebida (migración pendiente / secundaria).
  if (parsed) {
    const stamps = getVaultSidecarStamps();
    for (const key of VAULT_SIDECAR_KEYS) {
      if (stamps[key] > 0) {
        delete parsed[key];
      }
    }
  }

  return parsed;
}

function getAppDataCached() {
  const stamp = getContentStamp();
  if (cachedData && stamp && stamp === cachedStamp) {
    return cachedData;
  }
  const parsed = readAppDataFromDisk();
  cachedData = parsed;
  cachedStamp = stamp || getContentStamp();
  return parsed;
}

function notifyAppDataChanged() {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('appdata:changed');
      }
    } catch (_) {}
  }
}

function scheduleWatchNotify() {
  if (watchNotifyTimer) clearTimeout(watchNotifyTimer);
  watchNotifyTimer = setTimeout(() => {
    watchNotifyTimer = null;
    const stamp = getContentStamp();
    if (stamp && cachedStamp && stamp === cachedStamp) {
      return;
    }
    invalidateAppDataCache();
    notifyAppDataChanged();
  }, 120);
}

function startWatchFallback() {
  if (watchFallbackTimer) return;
  watchFallbackTimer = setInterval(() => {
    const stamp = getContentStamp();
    if (stamp && cachedStamp && stamp === cachedStamp) return;
    invalidateAppDataCache();
    notifyAppDataChanged();
  }, WATCH_FALLBACK_MS);
}

function isWatchedAppDataName(name) {
  if (!name) return true;
  return name === 'app-data.json' || name.startsWith('app-data.');
}

function isWatchedVaultName(name) {
  if (!name) return true;
  const basenames = listVaultSidecarBasenames();
  if (basenames.includes(name)) return true;
  return name.endsWith('.bin') || name.endsWith('.tmp');
}

function startAppDataWatch() {
  if (watchStarted) return;
  watchStarted = true;

  try {
    if (!fs.existsSync(APP_DATA_DIR)) {
      fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    }
    watcher = fs.watch(APP_DATA_DIR, { persistent: false }, (_event, filename) => {
      const name = filename ? String(filename) : '';
      if (name && !isWatchedAppDataName(name) && name !== 'vault') {
        return;
      }
      scheduleWatchNotify();
    });
    watcher.on('error', () => {
      startWatchFallback();
    });
  } catch (_) {
    startWatchFallback();
  }

  try {
    ensureVaultDir();
    vaultWatcher = fs.watch(getVaultDir(), { persistent: false }, (_event, filename) => {
      const name = filename ? String(filename) : '';
      if (name && !isWatchedVaultName(name)) {
        return;
      }
      scheduleWatchNotify();
    });
    vaultWatcher.on('error', () => {
      startWatchFallback();
    });
  } catch (_) {
    startWatchFallback();
  }
}

function backoffMs(attemptIndex, totalRetries) {
  const attempt = totalRetries - attemptIndex;
  return Math.min(50 * attempt, 400);
}

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

function registerAppDataHandlers(dependencies) {
  startAppDataWatch();

  safeHandle('appdata:get-all', async () => {
    let retries = READ_MAX_RETRIES;
    while (retries > 0) {
      try {
        const hasAppData = fs.existsSync(APP_DATA_PATH);
        const hasVault = getVaultSidecarsMtimeMax() > 0;
        if (!hasAppData && !hasVault) {
          return null;
        }
        const settings = getAppDataCached() || {};
        return { ...settings, _vaultStamps: getVaultSidecarStamps() };
      } catch (e) {
        invalidateAppDataCache();
        console.warn(
          `[AppData] Error leyendo datos compartidos (intento ${READ_MAX_RETRIES - retries + 1}/${READ_MAX_RETRIES}):`,
          e.message || e
        );
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, backoffMs(retries, READ_MAX_RETRIES)));
        }
      }
    }
    return null;
  });

  safeHandle('appdata:get-vault', async (_event, key) => {
    if (!VAULT_SIDECAR_KEYS.includes(key)) {
      return null;
    }
    try {
      return readVaultSidecar(key);
    } catch (error) {
      console.warn(`[AppData] Error leyendo vault ${key}:`, error.message || error);
      return null;
    }
  });

  safeHandle('appdata:save-all', async (event, data) => {
    try {
      const dataWithMeta = {
        ...data,
        _syncedAt: new Date().toISOString()
      };
      delete dataWithMeta.nodeterm_master_key;

      const { settingsData } = extractAndPersistVaultSidecars(dataWithMeta);

      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tempPath = path.join(APP_DATA_DIR, `app-data.${uniqueId}.tmp`);

      const serialized = serializeAppDataFile(settingsData);
      fs.writeFileSync(tempPath, serialized, { encoding: 'utf8', mode: 0o600 });

      let renameRetries = 5;
      let success = false;
      while (renameRetries > 0 && !success) {
        try {
          fs.renameSync(tempPath, APP_DATA_PATH);
          success = true;
        } catch (err) {
          renameRetries--;
          if (renameRetries === 0) {
            try { fs.unlinkSync(tempPath); } catch (_) { /* noop */ }
            throw err;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      cachedData = settingsData;
      cachedStamp = getContentStamp();
      notifyAppDataChanged();
      return { success: true };
    } catch (error) {
      invalidateAppDataCache();
      console.error('[AppData] Error guardando datos:', error.message);
      return { success: false, error: error.message };
    }
  });

  safeHandle('appdata:get-last-modified', async () => {
    try {
      return getContentStamp();
    } catch (error) {
      console.error('Error obteniendo mtime:', error);
      return 0;
    }
  });

  safeHandle('appdata:get-sync-keys', async () => SYNC_KEYS);
}

module.exports = {
  registerAppDataHandlers,
  SYNC_KEYS
};
