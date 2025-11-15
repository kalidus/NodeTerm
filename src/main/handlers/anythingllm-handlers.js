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

  ipcMain.handle('anythingllm:get-data-dir', () => {
    try {
      return {
        success: true,
        dataDir: anythingLLMService.getDataDir()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener el directorio de datos'
      };
    }
  });

  ipcMain.handle('anythingllm:read-json-file', async (_, filename) => {
    try {
      const data = await anythingLLMService.readJsonFile(filename);
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo leer el archivo'
      };
    }
  });

  ipcMain.handle('anythingllm:write-json-file', async (_, filename, data) => {
    try {
      await anythingLLMService.writeJsonFile(filename, data);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo escribir el archivo'
      };
    }
  });

  ipcMain.handle('anythingllm:read-mcp-config', async () => {
    try {
      const config = await anythingLLMService.readMCPConfig();
      return {
        success: true,
        config
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo leer la configuración MCP'
      };
    }
  });

  ipcMain.handle('anythingllm:write-mcp-config', async (_, config) => {
    try {
      await anythingLLMService.writeMCPConfig(config);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo escribir la configuración MCP'
      };
    }
  });

  ipcMain.handle('anythingllm:add-mcp-server', async (_, serverName, serverConfig) => {
    try {
      const config = await anythingLLMService.addMCPServer(serverName, serverConfig);
      return {
        success: true,
        config
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo añadir el servidor MCP'
      };
    }
  });

  ipcMain.handle('anythingllm:remove-mcp-server', async (_, serverName) => {
    try {
      const config = await anythingLLMService.removeMCPServer(serverName);
      return {
        success: true,
        config
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo eliminar el servidor MCP'
      };
    }
  });

  ipcMain.handle('anythingllm:list-data-files', async () => {
    try {
      const files = await anythingLLMService.listDataFiles();
      return {
        success: true,
        files
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo listar los archivos'
      };
    }
  });

  ipcMain.handle('anythingllm:diagnose-mcp-config', async () => {
    try {
      const diagnostics = await anythingLLMService.diagnoseMCPConfig();
      return {
        success: true,
        diagnostics
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo diagnosticar la configuración MCP'
      };
    }
  });

  ipcMain.handle('anythingllm:add-volume-mapping', async (_, hostPath, containerPath) => {
    try {
      const volume = await anythingLLMService.addVolumeMapping(hostPath, containerPath);
      return {
        success: true,
        volume
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo añadir el mapeo de volumen'
      };
    }
  });

  ipcMain.handle('anythingllm:remove-volume-mapping', async (_, volumeId) => {
    try {
      await anythingLLMService.removeVolumeMapping(volumeId);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo eliminar el mapeo de volumen'
      };
    }
  });

  ipcMain.handle('anythingllm:get-volume-mappings', async () => {
    try {
      const volumes = anythingLLMService.getVolumeMappings();
      return {
        success: true,
        volumes
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudieron obtener los mapeos de volúmenes'
      };
    }
  });

  ipcMain.handle('anythingllm:get-container-path', async (_, hostPath) => {
    try {
      const containerPath = anythingLLMService.getContainerPathForHostPath(hostPath);
      return {
        success: true,
        containerPath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener la ruta del contenedor'
      };
    }
  });

  ipcMain.handle('anythingllm:restart-container', async () => {
    try {
      await anythingLLMService.removeContainer();
      await anythingLLMService.startContainer();
      await anythingLLMService.waitForHealth();
      return {
        success: true,
        status: anythingLLMService.getStatus()
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
  registerAnythingLLMHandlers
};

