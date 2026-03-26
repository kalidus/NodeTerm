/**
 * Manejadores IPC para sincronización con MCP Server
 * Gestiona conexiones SSH y contraseñas en memoria
 */

const { ipcMain } = require('electron');
const { mcpService } = require('../services/MCPService');

// Variables para tracking de cambios
let lastConnectionCount = 0;
let lastPasswordCount = 0;

/**
 * Registra todos los manejadores IPC relacionados con MCP
 */
function registerMCPHandlers() {
  // Inicialización del servicio MCP (idempotente)
  ipcMain.handle('mcp:initialize', async () => {
    try {
      await mcpService.initialize();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:list-installed', async () => {
    try {
      await mcpService.initialize();
      const servers = mcpService.listInstalledServers();
      return { success: true, servers };
    } catch (error) {
      return { success: false, error: error.message, servers: [] };
    }
  });

  ipcMain.handle('mcp:install', async (_, { serverId, config } = {}) => {
    try {
      await mcpService.initialize();
      if (!serverId || !config) {
        return { success: false, error: 'Parámetros inválidos: serverId y config son requeridos' };
      }
      return await mcpService.installMCPServer(serverId, config);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:uninstall', async (_, serverId) => {
    try {
      await mcpService.initialize();
      if (!serverId) {
        return { success: false, error: 'Parámetro inválido: serverId es requerido' };
      }
      return await mcpService.uninstallMCPServer(serverId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:toggle', async (_, { serverId, enabled } = {}) => {
    try {
      await mcpService.initialize();
      if (!serverId || typeof enabled !== 'boolean') {
        return { success: false, error: 'Parámetros inválidos: serverId y enabled(boolean) son requeridos' };
      }
      return await mcpService.toggleMCPServer(serverId, enabled);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:start', async (_, serverId) => {
    try {
      await mcpService.initialize();
      if (!serverId) {
        return { success: false, error: 'Parámetro inválido: serverId es requerido' };
      }
      return await mcpService.startMCPServer(serverId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:stop', async (_, serverId) => {
    try {
      await mcpService.initialize();
      if (!serverId) {
        return { success: false, error: 'Parámetro inválido: serverId es requerido' };
      }
      return await mcpService.stopMCPServer(serverId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:update-config', async (_, { serverId, config } = {}) => {
    try {
      await mcpService.initialize();
      if (!serverId || !config) {
        return { success: false, error: 'Parámetros inválidos: serverId y config son requeridos' };
      }
      return await mcpService.updateMCPServerConfig(serverId, config);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:list-tools', async () => {
    try {
      await mcpService.initialize();
      const tools = mcpService.listAllTools();
      return { success: true, tools };
    } catch (error) {
      return { success: false, error: error.message, tools: [] };
    }
  });

  ipcMain.handle('mcp:list-resources', async () => {
    try {
      await mcpService.initialize();
      const resources = mcpService.listAllResources();
      return { success: true, resources };
    } catch (error) {
      return { success: false, error: error.message, resources: [] };
    }
  });

  ipcMain.handle('mcp:list-prompts', async () => {
    try {
      await mcpService.initialize();
      const prompts = mcpService.listAllPrompts();
      return { success: true, prompts };
    } catch (error) {
      return { success: false, error: error.message, prompts: [] };
    }
  });

  ipcMain.handle('mcp:call-tool', async (_, { serverId, toolName, args } = {}) => {
    try {
      await mcpService.initialize();
      if (!serverId || !toolName) {
        return { success: false, error: 'Parámetros inválidos: serverId y toolName son requeridos' };
      }
      const result = await mcpService.callTool(serverId, toolName, args || {});
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:get-resource', async (_, { serverId, resourceUri } = {}) => {
    try {
      await mcpService.initialize();
      if (!serverId || !resourceUri) {
        return { success: false, error: 'Parámetros inválidos: serverId y resourceUri son requeridos' };
      }
      const result = await mcpService.getResource(serverId, resourceUri);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:get-prompt', async (_, { serverId, promptName, args } = {}) => {
    try {
      await mcpService.initialize();
      if (!serverId || !promptName) {
        return { success: false, error: 'Parámetros inválidos: serverId y promptName son requeridos' };
      }
      const result = await mcpService.getPrompt(serverId, promptName, args || {});
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:refresh-capabilities', async (_, serverId) => {
    try {
      await mcpService.initialize();
      if (!serverId) {
        return { success: false, error: 'Parámetro inválido: serverId es requerido' };
      }
      await mcpService.refreshServerCapabilities(serverId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 🔗 IPC Handler para sincronizar conexiones SSH con el MCP (EN MEMORIA, SIN ARCHIVO)
  ipcMain.on('app:save-ssh-connections-for-mcp', async (event, connections) => {
    try {
      if (!Array.isArray(connections)) {
        console.warn('[SSH MCP] ⚠️ Parámetro no es un array:', typeof connections);
        return;
      }
      
      // Guardar en memoria en el MCP Server
      if (global.sshTerminalServer) {
        global.sshTerminalServer.nodeTermConnections = connections;
        // Solo loggear la primera vez o cuando cambia el número de conexiones
        if (lastConnectionCount !== connections.length) {
          console.log(`✅ [SSH MCP] ${connections.length} conexiones SSH sincronizadas en memoria`);
          lastConnectionCount = connections.length;
        }
      } else {
        console.warn('⚠️ [SSH MCP] SSH Terminal Server no disponible aún');
      }
    } catch (error) {
      console.error('[APP SSH] ❌ Error sincronizando conexiones:', error.message);
    }
  });

  // 🔐 IPC Handler para sincronizar PASSWORDS con el MCP (KeepPass, Password Manager, etc.)
  ipcMain.on('app:save-passwords-for-mcp', async (event, passwords) => {
    try {
      if (!Array.isArray(passwords)) {
        console.warn('[Password MCP] ⚠️ Parámetro no es un array:', typeof passwords);
        return;
      }
      
      // Guardar en memoria en el MCP Server
      if (global.sshTerminalServer) {
        global.sshTerminalServer.nodeTermPasswords = passwords;
        // Solo loggear la primera vez o cuando cambia el número
        if (lastPasswordCount !== passwords.length) {
          console.log(`✅ [Password MCP] ${passwords.length} contraseñas sincronizadas en memoria`);
          lastPasswordCount = passwords.length;
        }
      } else {
        console.warn('⚠️ [Password MCP] MCP Server no disponible aún');
      }
    } catch (error) {
      console.error('[APP Password] ❌ Error sincronizando contraseñas:', error.message);
    }
  });

  console.log('✅ [MCP Handlers] Registrados');
}

module.exports = { registerMCPHandlers };
