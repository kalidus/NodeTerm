const { ipcMain } = require('electron');

function registerLibreChatHandlers({ libreChatService }) {
  if (!libreChatService) {
    console.warn('[LibreChat] Servicio no disponible, los handlers no se registrarán.');
    return;
  }

  const wrap = async (executor) => {
    try {
      const status = await executor();
      return { success: true, status };
    } catch (error) {
      console.error('[LibreChat] Error en IPC:', error);
      return {
        success: false,
        error: error.message || 'Error ejecutando acción',
        status: libreChatService.getStatus()
      };
    }
  };

  ipcMain.handle('librechat:start', () => wrap(() => libreChatService.start()));

  ipcMain.handle('librechat:get-status', async () => {
    try {
      return {
        success: true,
        status: libreChatService.getStatus()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener el estado'
      };
    }
  });

  ipcMain.handle('librechat:stop', () => wrap(() => libreChatService.stop()));

  ipcMain.handle('librechat:get-url', () => {
    return {
      success: true,
      url: libreChatService.getBaseUrl()
    };
  });

  ipcMain.handle('librechat:get-data-dir', () => {
    try {
      return {
        success: true,
        dataDir: libreChatService.getDataDir()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener el directorio de datos'
      };
    }
  });

  ipcMain.handle('librechat:check-update', () => wrap(() => libreChatService.checkForUpdate()));
  ipcMain.handle('librechat:apply-update', () => wrap(() => libreChatService.applyUpdate()));
}

module.exports = {
  registerLibreChatHandlers
};
