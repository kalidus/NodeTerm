const { ipcMain } = require('electron');

function registerOpenClawHandlers({ openClawService }) {
  if (!openClawService) {
    console.warn('[OpenClaw] Servicio no disponible, los handlers no se registrarán.');
    return;
  }

  const wrap = async (executor) => {
    try {
      const status = await executor();
      return { success: true, status };
    } catch (error) {
      console.error('[OpenClaw] Error en IPC:', error);
      return {
        success: false,
        error: error.message || 'Error ejecutando acción',
        status: openClawService.getStatus()
      };
    }
  };

  ipcMain.handle('openclaw:start', () => wrap(() => openClawService.start()));

  ipcMain.handle('openclaw:get-status', async () => {
    try {
      return {
        success: true,
        status: openClawService.getStatus()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener el estado'
      };
    }
  });

  ipcMain.handle('openclaw:stop', () => wrap(() => openClawService.stop()));

  ipcMain.handle('openclaw:get-url', () => {
    return {
      success: true,
      url: openClawService.getBaseUrl()
    };
  });

  ipcMain.handle('openclaw:get-data-dir', () => {
    try {
      return {
        success: true,
        dataDir: openClawService.getDataDir()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener el directorio de datos'
      };
    }
  });
}

module.exports = {
  registerOpenClawHandlers
};
