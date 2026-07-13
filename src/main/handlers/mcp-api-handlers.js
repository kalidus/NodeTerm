/**
 * Handlers IPC para la gestión del servidor MCP API
 * 
 * Permite al renderer (panel de Settings) controlar:
 * - Configuración (enabled, apiKey, port)
 * - Estado del servidor (running, port, uptime)
 * - Generación de API keys
 * - Start/stop/restart del servidor
 */

const { ipcMain } = require('electron');
const mcpApiServer = require('../services/McpApiServer');

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

function registerMcpApiHandlers() {
  // Obtener configuración actual
  safeHandle('mcp-api:get-config', async () => {
    try {
      const config = mcpApiServer.loadConfig();
      return config;
    } catch (error) {
      console.error('❌ [MCP-API] Error obteniendo config:', error.message);
      return { enabled: false, apiKey: '', port: 19800 };
    }
  });

  // Guardar configuración + auto start/stop
  safeHandle('mcp-api:save-config', async (event, config) => {
    try {
      const result = mcpApiServer.saveConfig(config);
      if (!result.success) return result;

      // Auto start/stop según el estado de enabled
      if (config.enabled && !mcpApiServer.getStatus().running) {
        try {
          await mcpApiServer.start(config.port);
        } catch (startErr) {
          return { success: false, error: startErr.message };
        }
      } else if (!config.enabled && mcpApiServer.getStatus().running) {
        await mcpApiServer.stop();
      }

      return { success: true };
    } catch (error) {
      console.error('❌ [MCP-API] Error guardando config:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Generar nueva API key
  safeHandle('mcp-api:generate-api-key', async () => {
    try {
      const apiKey = mcpApiServer.generateApiKey();
      return { success: true, apiKey };
    } catch (error) {
      console.error('❌ [MCP-API] Error generando API key:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Obtener estado del servidor
  safeHandle('mcp-api:get-status', async () => {
    try {
      return mcpApiServer.getStatus();
    } catch (error) {
      console.error('❌ [MCP-API] Error obteniendo estado:', error.message);
      return { running: false, port: 19800, enabled: false };
    }
  });

  // Reiniciar servidor
  safeHandle('mcp-api:restart-server', async () => {
    try {
      const result = await mcpApiServer.restart();
      return result;
    } catch (error) {
      console.error('❌ [MCP-API] Error reiniciando servidor:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerMcpApiHandlers
};
