/**
 * MCPClientService - Cliente para comunicar con servidores MCP vía IPC
 * 
 * Wrapper para las llamadas IPC al main process que gestiona los servidores MCP.
 * Proporciona:
 * - Manejo de errores consistente
 * - Cache de tools/resources disponibles
 * - Estado reactivo para UI
 * - Integración con AIService
 */

import mcpLogger from '../utils/mcpLogger';

class MCPClientService {
  constructor() {
    this.initialized = false;
    this.servers = [];
    this.toolsCache = [];
    this.resourcesCache = [];
    this.promptsCache = [];
    this.lastRefresh = null;
    this.refreshInterval = null;
    this.listeners = new Set();
  }

  /**
   * Inicializar el servicio
   */
  async initialize() {
    if (this.initialized) return { success: true };

    try {
      console.log('🔧 [MCP Client] Inicializando...');
      
      const result = await window.electron.mcp.initialize();
      
      if (result.success) {
        this.initialized = true;
        
        // Cargar estado inicial
        await this.refreshAll();
        
        // Auto-refresh cada 30 segundos
        this.startAutoRefresh();
        
        console.log('✅ [MCP Client] Inicializado correctamente');
      } else {
        console.error('❌ [MCP Client] Error inicializando:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ [MCP Client] Error inicializando:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Iniciar auto-refresh periódico
   */
  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      this.refreshAll().catch(error => {
        console.error('[MCP Client] Error en auto-refresh:', error);
      });
    }, 30000); // 30 segundos
  }

  /**
   * Detener auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Refrescar todo el estado (servidores + tools + resources + prompts)
   */
  async refreshAll() {
    try {
      await Promise.all([
        this.refreshServers(),
        this.refreshTools(),
        this.refreshResources(),
        this.refreshPrompts()
      ]);

      this.lastRefresh = Date.now();
      this.notifyListeners('refresh', { timestamp: this.lastRefresh });
      
      return { success: true };
    } catch (error) {
      console.error('[MCP Client] Error refrescando:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refrescar lista de servidores instalados
   */
  async refreshServers() {
    try {
      const result = await window.electron.mcp.listInstalled();
      
      if (result.success) {
        this.servers = result.servers || [];
        this.notifyListeners('servers-updated', this.servers);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error refrescando servidores:', error);
      return { success: false, error: error.message, servers: [] };
    }
  }

  /**
   * Refrescar lista de tools disponibles
   */
  async refreshTools() {
    try {
      const result = await window.electron.mcp.listTools();
      
      if (result.success) {
        this.toolsCache = result.tools || [];
        this.notifyListeners('tools-updated', this.toolsCache);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error refrescando tools:', error);
      return { success: false, error: error.message, tools: [] };
    }
  }

  /**
   * Refrescar lista de resources disponibles
   */
  async refreshResources() {
    try {
      const result = await window.electron.mcp.listResources();
      
      if (result.success) {
        this.resourcesCache = result.resources || [];
        this.notifyListeners('resources-updated', this.resourcesCache);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error refrescando resources:', error);
      return { success: false, error: error.message, resources: [] };
    }
  }

  /**
   * Refrescar lista de prompts disponibles
   */
  async refreshPrompts() {
    try {
      const result = await window.electron.mcp.listPrompts();
      
      if (result.success) {
        this.promptsCache = result.prompts || [];
        this.notifyListeners('prompts-updated', this.promptsCache);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error refrescando prompts:', error);
      return { success: false, error: error.message, prompts: [] };
    }
  }

  /**
   * Obtener lista de servidores instalados
   */
  getServers() {
    return this.servers;
  }

  /**
   * Obtener servidores activos (running)
   */
  getActiveServers() {
    return this.servers.filter(s => s.running && s.state === 'ready');
  }

  /**
   * Obtener todas las tools disponibles
   */
  getAvailableTools() {
    return this.toolsCache;
  }

  /**
   * Obtener tools por servidor
   */
  getToolsByServer(serverId) {
    return this.toolsCache.filter(t => t.serverId === serverId);
  }

  /**
   * Obtener todos los resources disponibles
   */
  getAvailableResources() {
    return this.resourcesCache;
  }

  /**
   * Obtener resources por servidor
   */
  getResourcesByServer(serverId) {
    return this.resourcesCache.filter(r => r.serverId === serverId);
  }

  /**
   * Obtener todos los prompts disponibles
   */
  getAvailablePrompts() {
    return this.promptsCache;
  }

  /**
   * Obtener prompts por servidor
   */
  getPromptsByServer(serverId) {
    return this.promptsCache.filter(p => p.serverId === serverId);
  }

  /**
   * Instalar nuevo servidor MCP
   */
  async installServer(serverId, config) {
    try {
      console.log(`📦 [MCP Client] Instalando servidor: ${serverId}`);
      console.log('   Config:', JSON.stringify(config, null, 2));
      
      // Verificar que window.electron.mcp existe
      if (!window.electron || !window.electron.mcp || !window.electron.mcp.install) {
        throw new Error('API MCP no disponible. Verifica que preload.js esté cargado correctamente.');
      }
      
      const result = await window.electron.mcp.install(serverId, config);
      console.log('   Resultado IPC:', result);
      
      if (result.success) {
        console.log(`✅ [MCP Client] Servidor ${serverId} instalado`);
        await this.refreshServers();
        this.notifyListeners('server-installed', { serverId });
      } else {
        console.error(`❌ [MCP Client] Error instalando ${serverId}:`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error instalando servidor:', error);
      console.error('   Stack:', error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Desinstalar servidor MCP
   */
  async uninstallServer(serverId) {
    try {
      console.log(`🗑️ [MCP Client] Desinstalando servidor: ${serverId}`);
      
      const result = await window.electron.mcp.uninstall(serverId);
      
      if (result.success) {
        console.log(`✅ [MCP Client] Servidor ${serverId} desinstalado`);
        await this.refreshAll();
        this.notifyListeners('server-uninstalled', { serverId });
      } else {
        console.error(`❌ [MCP Client] Error desinstalando ${serverId}:`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error desinstalando servidor:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Activar/desactivar servidor MCP
   */
  async toggleServer(serverId, enabled) {
    try {
      console.log(`🔄 [MCP Client] ${enabled ? 'Activando' : 'Desactivando'} servidor: ${serverId}`);
      
      const result = await window.electron.mcp.toggle(serverId, enabled);
      
      if (result.success) {
        console.log(`✅ [MCP Client] Servidor ${serverId} ${enabled ? 'activado' : 'desactivado'}`);
        await this.refreshAll();
        this.notifyListeners('server-toggled', { serverId, enabled });
      } else {
        console.error(`❌ [MCP Client] Error alternando ${serverId}:`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error alternando servidor:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Iniciar servidor MCP
   */
  async startServer(serverId) {
    try {
      console.log(`🚀 [MCP Client] Iniciando servidor: ${serverId}`);
      
      const result = await window.electron.mcp.start(serverId);
      
      if (result.success) {
        console.log(`✅ [MCP Client] Servidor ${serverId} iniciado`);
        await this.refreshAll();
        this.notifyListeners('server-started', { serverId });
      } else {
        console.error(`❌ [MCP Client] Error iniciando ${serverId}:`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error iniciando servidor:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detener servidor MCP
   */
  async stopServer(serverId) {
    try {
      console.log(`🛑 [MCP Client] Deteniendo servidor: ${serverId}`);
      
      const result = await window.electron.mcp.stop(serverId);
      
      if (result.success) {
        console.log(`✅ [MCP Client] Servidor ${serverId} detenido`);
        await this.refreshAll();
        this.notifyListeners('server-stopped', { serverId });
      } else {
        console.error(`❌ [MCP Client] Error deteniendo ${serverId}:`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error deteniendo servidor:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Llamar a una tool específica
   */
  async callTool(serverId, toolName, args = {}) {
    const context = mcpLogger.logToolCallStart(serverId, toolName, args);
    
    try {
      console.log(`🔧 [MCP Client] Llamando tool: ${toolName} en ${serverId}`);
      console.log('   Argumentos:', args);
      
      const result = await window.electron.mcp.callTool(serverId, toolName, args);
      
      if (result.success) {
        console.log(`✅ [MCP Client] Tool ${toolName} ejecutada correctamente`);
        mcpLogger.logToolCallSuccess(context, result.result);
        this.notifyListeners('tool-called', { serverId, toolName, args, result: result.result });
      } else {
        console.error(`❌ [MCP Client] Error ejecutando tool ${toolName}:`, result.error);
        mcpLogger.logToolCallError(context, new Error(result.error));
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error llamando tool:', error);
      mcpLogger.logToolCallError(context, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener un resource específico
   */
  async getResource(serverId, resourceUri) {
    try {
      console.log(`📦 [MCP Client] Obteniendo resource: ${resourceUri} de ${serverId}`);
      
      const result = await window.electron.mcp.getResource(serverId, resourceUri);
      
      if (result.success) {
        console.log(`✅ [MCP Client] Resource obtenido correctamente`);
        this.notifyListeners('resource-fetched', { serverId, resourceUri, result: result.result });
      } else {
        console.error(`❌ [MCP Client] Error obteniendo resource:`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error obteniendo resource:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener un prompt con argumentos
   */
  async getPrompt(serverId, promptName, args = {}) {
    try {
      console.log(`💬 [MCP Client] Obteniendo prompt: ${promptName} de ${serverId}`);
      
      const result = await window.electron.mcp.getPrompt(serverId, promptName, args);
      
      if (result.success) {
        console.log(`✅ [MCP Client] Prompt obtenido correctamente`);
        this.notifyListeners('prompt-fetched', { serverId, promptName, args, result: result.result });
      } else {
        console.error(`❌ [MCP Client] Error obteniendo prompt:`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error obteniendo prompt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refrescar capabilities de un servidor específico
   */
  async refreshServerCapabilities(serverId) {
    try {
      const result = await window.electron.mcp.refreshCapabilities(serverId);
      
      if (result.success) {
        await this.refreshAll();
      }
      
      return result;
    } catch (error) {
      console.error('[MCP Client] Error refrescando capabilities:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Agregar listener para cambios
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notificar a todos los listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('[MCP Client] Error en listener:', error);
      }
    });
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    const activeServers = this.getActiveServers();
    
    return {
      totalServers: this.servers.length,
      activeServers: activeServers.length,
      totalTools: this.toolsCache.length,
      totalResources: this.resourcesCache.length,
      totalPrompts: this.promptsCache.length,
      lastRefresh: this.lastRefresh,
      servers: this.servers.map(s => ({
        id: s.id,
        running: s.running,
        state: s.state,
        toolsCount: s.toolsCount,
        resourcesCount: s.resourcesCount,
        promptsCount: s.promptsCount
      }))
    };
  }

  /**
   * Verificar si hay servidores activos
   */
  hasActiveServers() {
    return this.getActiveServers().length > 0;
  }

  /**
   * Verificar si hay tools disponibles
   */
  hasAvailableTools() {
    return this.toolsCache.length > 0;
  }

  /**
   * Limpiar recursos
   */
  cleanup() {
    this.stopAutoRefresh();
    this.listeners.clear();
    this.servers = [];
    this.toolsCache = [];
    this.resourcesCache = [];
    this.promptsCache = [];
    this.initialized = false;
  }
}

// Singleton instance
const mcpClient = new MCPClientService();

export { mcpClient, MCPClientService };
export default mcpClient;

