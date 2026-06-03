/**
 * IPC handlers para importación de contraseñas desde navegadores.
 */

const { ipcMain } = require('electron');
const BrowserPasswordImportService = require('../services/BrowserPasswordImportService');

function registerBrowserImportHandlers() {
  ipcMain.handle('browser-import:list-profiles', async () => {
    try {
      return BrowserPasswordImportService.listProfiles();
    } catch (e) {
      return { ok: false, error: e?.message || 'Error listando perfiles' };
    }
  });

  ipcMain.handle('browser-import:import-chromium', async (_event, opts = {}) => {
    try {
      const { browserId, userDataPath, profileDir } = opts;
      if (!browserId || !userDataPath || !profileDir) {
        return { ok: false, error: 'Parámetros incompletos (browserId, userDataPath, profileDir)' };
      }
      return BrowserPasswordImportService.importChromiumProfile({
        browserId,
        userDataPath,
        profileDir
      });
    } catch (e) {
      return { ok: false, error: e?.message || 'Error importando perfil Chromium' };
    }
  });

  ipcMain.handle('browser-import:import-firefox', async (_event, opts = {}) => {
    try {
      const { profilePath, masterPassword } = opts;
      if (!profilePath) {
        return { ok: false, error: 'profilePath requerido' };
      }
      return BrowserPasswordImportService.importFirefoxProfile({
        profilePath,
        masterPassword: masterPassword || ''
      });
    } catch (e) {
      return { ok: false, error: e?.message || 'Error importando perfil Firefox' };
    }
  });
}

module.exports = { registerBrowserImportHandlers };
