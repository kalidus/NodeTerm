const { ipcMain } = require('electron');

function registerOpenWebUIHandlers({ openWebUIService }) {
  if (!openWebUIService) {
    console.warn('[OpenWebUI] Servicio no disponible, los handlers no se registrarán.');
    return;
  }

  const wrap = async (executor) => {
    try {
      const status = await executor();
      return { success: true, status };
    } catch (error) {
      console.error('[OpenWebUI] Error en IPC:', error);
      return {
        success: false,
        error: error.message || 'Error ejecutando acción',
        status: openWebUIService.getStatus()
      };
    }
  };

  ipcMain.handle('openwebui:start', () => wrap(() => openWebUIService.start()));

  ipcMain.handle('openwebui:get-status', async () => {
    try {
      return {
        success: true,
        status: openWebUIService.getStatus()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener el estado'
      };
    }
  });

  ipcMain.handle('openwebui:stop', () => wrap(() => openWebUIService.stop()));

  ipcMain.handle('openwebui:get-url', () => {
    return {
      success: true,
      url: openWebUIService.getBaseUrl()
    };
  });

  ipcMain.handle('openwebui:get-data-dir', () => {
    try {
      return {
        success: true,
        dataDir: openWebUIService.getDataDir()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener el directorio de datos'
      };
    }
  });

  ipcMain.handle('openwebui:restart-container', async () => {
    try {
      const status = await openWebUIService.restartContainer();
      return {
        success: true,
        status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo reiniciar el contenedor'
      };
    }
  });
}

module.exports = {
  registerOpenWebUIHandlers
};



