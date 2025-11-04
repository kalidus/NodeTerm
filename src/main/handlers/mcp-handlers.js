/**
 * MCP Handlers - IPC handlers para comunicación entre renderer y MCPs
 */

const { ipcMain } = require('electron');
const { mcpService } = require('../services/MCPService');

/**
 * Registrar todos los handlers IPC para MCP
 */
function registerMCPHandlers() {
  console.log('🔌 [MCP Handlers] Registrando handlers IPC...');

  // Inicializar servicio MCP
  ipcMain.handle('mcp:initialize', async () => {
    try {
      await mcpService.initialize();
      return { success: true };
    } catch (error) {
      console.error('[MCP Handlers] Error inicializando:', error);
      return { success: false, error: error.message };
    }
  });

  // Listar servidores MCP instalados
  ipcMain.handle('mcp:list-installed', async () => {
    try {
      const servers = mcpService.listInstalledServers();
      return { success: true, servers };
    } catch (error) {
      console.error('[MCP Handlers] Error listando servidores:', error);
      return { success: false, error: error.message, servers: [] };
    }
  });

  // Instalar nuevo servidor MCP
  ipcMain.handle('mcp:install', async (event, { serverId, config }) => {
    try {
      const result = await mcpService.installMCPServer(serverId, config);
      return result;
    } catch (error) {
      console.error('[MCP Handlers] Error instalando servidor:', error);
      return { success: false, error: error.message };
    }
  });

  // Desinstalar servidor MCP
  ipcMain.handle('mcp:uninstall', async (event, serverId) => {
    try {
      const result = await mcpService.uninstallMCPServer(serverId);
      return result;
    } catch (error) {
      console.error('[MCP Handlers] Error desinstalando servidor:', error);
      return { success: false, error: error.message };
    }
  });

  // Activar/desactivar servidor MCP
  ipcMain.handle('mcp:toggle', async (event, { serverId, enabled }) => {
    try {
      const result = await mcpService.toggleMCPServer(serverId, enabled);
      return result;
    } catch (error) {
      console.error('[MCP Handlers] Error alternando servidor:', error);
      return { success: false, error: error.message };
    }
  });

  // Iniciar servidor MCP
  ipcMain.handle('mcp:start', async (event, serverId) => {
    try {
      const result = await mcpService.startMCPServer(serverId);
      return result;
    } catch (error) {
      console.error('[MCP Handlers] Error iniciando servidor:', error);
      return { success: false, error: error.message };
    }
  });

  // Detener servidor MCP
  ipcMain.handle('mcp:stop', async (event, serverId) => {
    try {
      const result = await mcpService.stopMCPServer(serverId);
      return result;
    } catch (error) {
      console.error('[MCP Handlers] Error deteniendo servidor:', error);
      return { success: false, error: error.message };
    }
  });

  // Listar todas las tools disponibles
  ipcMain.handle('mcp:list-tools', async () => {
    try {
      const tools = mcpService.listAllTools();
      return { success: true, tools };
    } catch (error) {
      console.error('[MCP Handlers] Error listando tools:', error);
      return { success: false, error: error.message, tools: [] };
    }
  });

  // Listar todos los resources disponibles
  ipcMain.handle('mcp:list-resources', async () => {
    try {
      const resources = mcpService.listAllResources();
      return { success: true, resources };
    } catch (error) {
      console.error('[MCP Handlers] Error listando resources:', error);
      return { success: false, error: error.message, resources: [] };
    }
  });

  // Listar todos los prompts disponibles
  ipcMain.handle('mcp:list-prompts', async () => {
    try {
      const prompts = mcpService.listAllPrompts();
      return { success: true, prompts };
    } catch (error) {
      console.error('[MCP Handlers] Error listando prompts:', error);
      return { success: false, error: error.message, prompts: [] };
    }
  });

  // Llamar a una tool específica
  ipcMain.handle('mcp:call-tool', async (event, { serverId, toolName, args }) => {
    try {
      const result = await mcpService.callTool(serverId, toolName, args);
      return { success: true, result };
    } catch (error) {
      console.error('[MCP Handlers] Error llamando tool:', error);
      return { success: false, error: error.message };
    }
  });

  // Obtener un resource específico
  ipcMain.handle('mcp:get-resource', async (event, { serverId, resourceUri }) => {
    try {
      const result = await mcpService.getResource(serverId, resourceUri);
      return { success: true, result };
    } catch (error) {
      console.error('[MCP Handlers] Error obteniendo resource:', error);
      return { success: false, error: error.message };
    }
  });

  // Obtener un prompt con argumentos
  ipcMain.handle('mcp:get-prompt', async (event, { serverId, promptName, args }) => {
    try {
      const result = await mcpService.getPrompt(serverId, promptName, args);
      return { success: true, result };
    } catch (error) {
      console.error('[MCP Handlers] Error obteniendo prompt:', error);
      return { success: false, error: error.message };
    }
  });

  // Refrescar capabilities de un servidor
  ipcMain.handle('mcp:refresh-capabilities', async (event, serverId) => {
    try {
      await mcpService.refreshServerCapabilities(serverId);
      return { success: true };
    } catch (error) {
      console.error('[MCP Handlers] Error refrescando capabilities:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ [MCP Handlers] Handlers IPC registrados correctamente');
}

/**
 * Limpiar handlers al cerrar la app
 */
async function cleanupMCPHandlers() {
  console.log('🧹 [MCP Handlers] Limpiando...');
  await mcpService.cleanup();
}

module.exports = {
  registerMCPHandlers,
  cleanupMCPHandlers
};

