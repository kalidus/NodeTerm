/**
 * Handlers para sincronizacion de localStorage entre instancias
 *
 * Las instancias secundarias usan UserData temporal y leen app-data.json compartido.
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

const APP_DATA_PATH = path.join(getNodeTermDataDir(), 'app-data.json');
const APP_DATA_DIR = path.dirname(APP_DATA_PATH);

const READ_MAX_RETRIES = 8;
const WATCH_FALLBACK_MS = 15000;

let cachedData = null;
let cachedMtime = 0;
let watcher = null;
let watchFallbackTimer = null;
let watchNotifyTimer = null;
let watchStarted = false;

function getFileMtime() {
  try {
    if (!fs.existsSync(APP_DATA_PATH)) return 0;
    return fs.statSync(APP_DATA_PATH).mtimeMs;
  } catch (_) {
    return 0;
  }
}

function invalidateAppDataCache() {
  cachedData = null;
  cachedMtime = 0;
}

function readAppDataFromDisk() {
  if (!fs.existsSync(APP_DATA_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(APP_DATA_PATH, 'utf8');
  const parsed = parseAppDataFileContent(raw);

  if (!isAppDataPlainJson(raw) && process.env.NODETERM_IS_SECONDARY_INSTANCE !== 'true') {
    try {
      fs.writeFileSync(APP_DATA_PATH, serializeAppDataFile(parsed), 'utf8');
      console.log('[AppData] Migrado app-data.json a JSON plano (multi-instancia)');
    } catch (migrateErr) {
      console.warn('[AppData] No se pudo migrar a JSON plano:', migrateErr.message);
    }
  }

  return parsed;
}

function getAppDataCached() {
  const mtime = getFileMtime();
  if (cachedData && mtime && mtime === cachedMtime) {
    return cachedData;
  }
  const parsed = readAppDataFromDisk();
  cachedData = parsed;
  cachedMtime = mtime;
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
    const mtime = getFileMtime();
    if (mtime && cachedMtime && mtime === cachedMtime) {
      return;
    }
    invalidateAppDataCache();
    notifyAppDataChanged();
  }, 120);
}

function startWatchFallback() {
  if (watchFallbackTimer) return;
  watchFallbackTimer = setInterval(() => {
    const mtime = getFileMtime();
    if (mtime && cachedMtime && mtime === cachedMtime) return;
    invalidateAppDataCache();
    notifyAppDataChanged();
  }, WATCH_FALLBACK_MS);
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
      if (name && name !== 'app-data.json' && !name.startsWith('app-data.')) {
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
        if (!fs.existsSync(APP_DATA_PATH)) {
          return null;
        }
        return getAppDataCached();
      } catch (e) {
        invalidateAppDataCache();
        console.warn(
          `[AppData] Error parseando app-data.json (intento ${READ_MAX_RETRIES - retries + 1}/${READ_MAX_RETRIES}):`,
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

  safeHandle('appdata:save-all', async (event, data) => {
    try {
      const dataWithMeta = {
        ...data,
        _syncedAt: new Date().toISOString()
      };

      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tempPath = path.join(APP_DATA_DIR, `app-data.${uniqueId}.tmp`);

      const serialized = serializeAppDataFile(dataWithMeta);
      fs.writeFileSync(tempPath, serialized, 'utf8');

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

      cachedData = dataWithMeta;
      cachedMtime = getFileMtime();
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
      return getFileMtime();
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
