/**
 * Handlers IPC del sistema de actualizaciones.
 */

const { ipcMain } = require('electron');

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

/**
 * @param {{ getUpdateService: () => any }} dependencies
 */
function registerUpdaterHandlers(dependencies = {}) {
  const { getUpdateService } = dependencies;
  if (typeof getUpdateService !== 'function') {
    console.error('[UPDATER] registerUpdaterHandlers: falta getUpdateService');
    return;
  }

  safeHandle('updater:check', async () => {
    try {
      return await getUpdateService().checkForUpdates();
    } catch (error) {
      console.error('[UPDATER] Error checking for updates:', error);
      return { success: false, error: error.message };
    }
  });

  safeHandle('updater:download', async () => {
    try {
      return await getUpdateService().downloadUpdate();
    } catch (error) {
      console.error('[UPDATER] Error downloading update:', error);
      return { success: false, error: error.message };
    }
  });

  safeHandle('updater:quit-and-install', async () => {
    try {
      getUpdateService().quitAndInstall();
      return { success: true };
    } catch (error) {
      console.error('[UPDATER] Error installing update:', error);
      return { success: false, error: error.message };
    }
  });

  safeHandle('updater:get-config', async () => {
    try {
      const config = getUpdateService().getConfig();
      return { success: true, config };
    } catch (error) {
      console.error('[UPDATER] Error getting config:', error);
      return { success: false, error: error.message };
    }
  });

  safeHandle('updater:update-config', async (_event, newConfig) => {
    try {
      const updateService = getUpdateService();
      const config = updateService.updateConfig(newConfig);
      updateService.restart();
      return { success: true, config };
    } catch (error) {
      console.error('[UPDATER] Error updating config:', error);
      return { success: false, error: error.message };
    }
  });

  safeHandle('updater:get-info', async () => {
    try {
      const info = getUpdateService().getUpdateInfo();
      return { success: true, ...info };
    } catch (error) {
      console.error('[UPDATER] Error getting update info:', error);
      return { success: false, error: error.message };
    }
  });

  safeHandle('updater:clear-cache', async () => {
    try {
      return getUpdateService().clearUpdateCache();
    } catch (error) {
      console.error('[UPDATER] Error clearing update cache:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerUpdaterHandlers
};
