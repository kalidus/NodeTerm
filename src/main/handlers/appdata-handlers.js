/**
 * Handlers para sincronización de localStorage entre instancias
 *
 * Problema: Las instancias secundarias usan un UserData temporal y no tienen acceso
 * al localStorage de la instancia principal.
 *
 * Solución: Sincronizar datos críticos a un archivo compartido (%APPDATA%/nodeterm/app-data.json)
 * La instancia secundaria carga estos datos al iniciar.
 */

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  getNodeTermDataDir,
  serializeAppDataFile,
  parseAppDataFileContent,
  isAppDataPlainJson
} = require('../utils/file-utils');
const { SYNC_KEYS } = require('../../shared/sync-keys');

const APP_DATA_PATH = path.join(getNodeTermDataDir(), 'app-data.json');

const READ_MAX_RETRIES = 8;

function readAppDataFromDisk() {
  if (!fs.existsSync(APP_DATA_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(APP_DATA_PATH, 'utf8');
  const parsed = parseAppDataFileContent(raw);

  if (!isAppDataPlainJson(raw) && process.env.NODETERM_IS_SECONDARY_INSTANCE !== 'true') {
    try {
      fs.writeFileSync(APP_DATA_PATH, serializeAppDataFile(parsed), 'utf8');
      console.log('✅ [AppData] Migrado app-data.json a JSON plano (multi-instancia)');
    } catch (migrateErr) {
      console.warn('⚠️ [AppData] No se pudo migrar a JSON plano:', migrateErr.message);
    }
  }

  return parsed;
}

function backoffMs(attemptIndex, totalRetries) {
  const attempt = totalRetries - attemptIndex;
  return Math.min(50 * attempt, 400);
}

/**
 * Registra los handlers de sincronización de datos de aplicación
 */
function registerAppDataHandlers(dependencies) {
  ipcMain.handle('appdata:get-all', async () => {
    let retries = READ_MAX_RETRIES;
    while (retries > 0) {
      try {
        if (!fs.existsSync(APP_DATA_PATH)) {
          return null;
        }
        return readAppDataFromDisk();
      } catch (e) {
        console.warn(
          `⚠️ [AppData] Error parseando app-data.json (intento ${READ_MAX_RETRIES - retries + 1}/${READ_MAX_RETRIES}):`,
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

  ipcMain.handle('appdata:save-all', async (event, data) => {
    try {
      const dataWithMeta = {
        ...data,
        _syncedAt: new Date().toISOString()
      };

      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tempPath = path.join(path.dirname(APP_DATA_PATH), `app-data.${uniqueId}.tmp`);

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
            try { fs.unlinkSync(tempPath); } catch (unlinkErr) { /* noop */ }
            throw err;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      return { success: true };
    } catch (error) {
      console.error('❌ [AppData] Error guardando datos:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('appdata:get-last-modified', async () => {
    try {
      if (fs.existsSync(APP_DATA_PATH)) {
        return fs.statSync(APP_DATA_PATH).mtimeMs;
      }
      return 0;
    } catch (error) {
      console.error('Error obteniendo mtime:', error);
      return 0;
    }
  });

  ipcMain.handle('appdata:get-sync-keys', async () => SYNC_KEYS);
}

module.exports = {
  registerAppDataHandlers,
  SYNC_KEYS
};
