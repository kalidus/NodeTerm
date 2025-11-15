const { ipcMain } = require('electron');

function registerAnythingLLMHandlers({ anythingLLMService }) {
  if (!anythingLLMService) {
    console.warn('[AnythingLLM] Servicio no disponible, los handlers no se registrarán.');
    return;
  }

  const wrap = async (executor) => {
    try {
      const status = await executor();
      return { success: true, status };
    } catch (error) {
      console.error('[AnythingLLM] Error en IPC:', error);
      return {
        success: false,
        error: error.message || 'Error ejecutando acción',
        status: anythingLLMService.getStatus()
      };
    }
  };

  ipcMain.handle('anythingllm:start', () => wrap(() => anythingLLMService.start()));

  ipcMain.handle('anythingllm:get-status', async () => {
    try {
      return {
        success: true,
        status: anythingLLMService.getStatus()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener el estado'
      };
    }
  });

  ipcMain.handle('anythingllm:stop', () => wrap(() => anythingLLMService.stop()));

  ipcMain.handle('anythingllm:get-url', () => {
    return {
      success: true,
      url: anythingLLMService.getBaseUrl()
    };
  });
}

module.exports = {
  registerAnythingLLMHandlers
};

