const { ipcMain } = require('electron');

function registerAgentZeroHandlers({ agentZeroService }) {
  if (!agentZeroService) {
    console.warn('[AgentZero] Servicio no disponible, los handlers no se registrarán.');
    return;
  }

  const wrap = async (executor) => {
    try {
      const status = await executor();
      return { success: true, status };
    } catch (error) {
      console.error('[AgentZero] Error en IPC:', error);
      return {
        success: false,
        error: error.message || 'Error ejecutando acción',
        status: agentZeroService.getStatus()
      };
    }
  };

  ipcMain.handle('agentzero:start', () => wrap(() => agentZeroService.start()));

  ipcMain.handle('agentzero:get-status', async () => {
    try {
      return {
        success: true,
        status: agentZeroService.getStatus()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener el estado'
      };
    }
  });

  ipcMain.handle('agentzero:stop', () => wrap(() => agentZeroService.stop()));

  ipcMain.handle('agentzero:get-url', () => {
    return {
      success: true,
      url: agentZeroService.getBaseUrl()
    };
  });

  ipcMain.handle('agentzero:get-data-dir', () => {
    try {
      return {
        success: true,
        dataDir: agentZeroService.getDataDir()
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
  registerAgentZeroHandlers
};
