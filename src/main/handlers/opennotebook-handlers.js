const { ipcMain } = require('electron');

function registerOpenNotebookHandlers({ openNotebookService }) {
  if (!openNotebookService) {
    console.warn('[OpenNotebook] Servicio no disponible, los handlers no se registrarán.');
    return;
  }

  const wrap = async (executor) => {
    try {
      const status = await executor();
      return { success: true, status };
    } catch (error) {
      console.error('[OpenNotebook] Error en IPC:', error);
      return {
        success: false,
        error: error.message || 'Error ejecutando acción',
        status: openNotebookService.getStatus()
      };
    }
  };

  ipcMain.handle('opennotebook:start', () => wrap(() => openNotebookService.start()));

  ipcMain.handle('opennotebook:get-status', async () => {
    try {
      return {
        success: true,
        status: openNotebookService.getStatus()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener el estado'
      };
    }
  });

  ipcMain.handle('opennotebook:stop', () => wrap(() => openNotebookService.stop()));

  ipcMain.handle('opennotebook:get-url', () => {
    return {
      success: true,
      url: openNotebookService.getBaseUrl()
    };
  });

  ipcMain.handle('opennotebook:get-data-dir', () => {
    try {
      return {
        success: true,
        dataDir: openNotebookService.getDataDir()
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
  registerOpenNotebookHandlers
};
