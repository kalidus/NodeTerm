/**
 * SSH Tunnel Handlers - Handlers IPC para túneles SSH
 * 
 * Expone las funcionalidades del SSHTunnelService al proceso renderer
 */

const { ipcMain } = require('electron');
const SSHTunnelService = require('../services/SSHTunnelService');

// Instancia singleton del servicio
let tunnelService = null;

// Referencia a la ventana principal para enviar eventos
let mainWindowRef = null;

/**
 * Obtiene o crea la instancia del servicio
 */
function getService() {
  if (!tunnelService) {
    tunnelService = new SSHTunnelService();
    
    // Configurar listeners para eventos del servicio
    tunnelService.on('tunnel-status', (data) => {
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('ssh-tunnel:status-changed', data);
      }
    });
    
    tunnelService.on('tunnel-log', (data) => {
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('ssh-tunnel:log', data);
      }
    });
    
    tunnelService.on('tunnel-removed', (data) => {
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('ssh-tunnel:removed', data);
      }
    });
  }
  return tunnelService;
}

/**
 * Registra todos los handlers de túneles SSH
 * @param {Object} dependencies - Dependencias (mainWindow)
 */
function registerSSHTunnelHandlers(dependencies = {}) {
  const { mainWindow } = dependencies;
  mainWindowRef = mainWindow;

  // === CREAR/INICIAR TÚNEL ===
  ipcMain.handle('ssh-tunnel:start', async (event, config) => {
    try {
      if (!config) {
        return { success: false, error: 'Configuración requerida' };
      }
      
      // Validar campos obligatorios
      if (!config.sshHost || !config.sshUser) {
        return { success: false, error: 'Host y usuario SSH son obligatorios' };
      }
      
      if (!config.sshPassword && !config.privateKeyPath) {
        return { success: false, error: 'Se requiere contraseña o clave privada' };
      }
      
      if (!config.tunnelType) {
        return { success: false, error: 'Tipo de túnel es obligatorio' };
      }
      
      // Validaciones específicas por tipo
      switch (config.tunnelType) {
        case 'local':
          if (!config.localPort || !config.remoteHost || !config.remotePort) {
            return { success: false, error: 'Para túnel local se requiere: puerto local, host remoto y puerto remoto' };
          }
          break;
        case 'remote':
          if (!config.localPort || !config.remotePort) {
            return { success: false, error: 'Para túnel remoto se requiere: puerto local y puerto remoto' };
          }
          break;
        case 'dynamic':
          if (!config.localPort) {
            return { success: false, error: 'Para proxy SOCKS se requiere: puerto local' };
          }
          break;
        default:
          return { success: false, error: `Tipo de túnel desconocido: ${config.tunnelType}` };
      }
      
      const service = getService();
      const result = await service.startTunnel(config);
      
      return result;
    } catch (err) {
      console.error('[ssh-tunnel:start] Error:', err);
      return { success: false, error: err?.message || 'Error desconocido al crear túnel' };
    }
  });

  // === DETENER TÚNEL ===
  ipcMain.handle('ssh-tunnel:stop', async (event, { tunnelId }) => {
    try {
      if (!tunnelId) {
        return { success: false, error: 'ID de túnel requerido' };
      }
      
      const service = getService();
      const result = await service.stopTunnel(tunnelId);
      
      return result;
    } catch (err) {
      console.error('[ssh-tunnel:stop] Error:', err);
      return { success: false, error: err?.message || 'Error al detener túnel' };
    }
  });

  // === ELIMINAR TÚNEL ===
  ipcMain.handle('ssh-tunnel:remove', async (event, { tunnelId }) => {
    try {
      if (!tunnelId) {
        return { success: false, error: 'ID de túnel requerido' };
      }
      
      const service = getService();
      const result = await service.removeTunnel(tunnelId);
      
      return result;
    } catch (err) {
      console.error('[ssh-tunnel:remove] Error:', err);
      return { success: false, error: err?.message || 'Error al eliminar túnel' };
    }
  });

  // === OBTENER ESTADO ===
  ipcMain.handle('ssh-tunnel:status', async (event, { tunnelId }) => {
    try {
      if (!tunnelId) {
        return { success: false, error: 'ID de túnel requerido' };
      }
      
      const service = getService();
      const result = service.getTunnelStatus(tunnelId);
      
      return result;
    } catch (err) {
      console.error('[ssh-tunnel:status] Error:', err);
      return { success: false, error: err?.message || 'Error al obtener estado' };
    }
  });

  // === OBTENER LOGS ===
  ipcMain.handle('ssh-tunnel:logs', async (event, { tunnelId }) => {
    try {
      if (!tunnelId) {
        return { success: false, error: 'ID de túnel requerido' };
      }
      
      const service = getService();
      const result = service.getTunnelLogs(tunnelId);
      
      return result;
    } catch (err) {
      console.error('[ssh-tunnel:logs] Error:', err);
      return { success: false, error: err?.message || 'Error al obtener logs' };
    }
  });

  // === LISTAR TÚNELES ACTIVOS ===
  ipcMain.handle('ssh-tunnel:list-active', async () => {
    try {
      const service = getService();
      const result = service.listActiveTunnels();
      
      return result;
    } catch (err) {
      console.error('[ssh-tunnel:list-active] Error:', err);
      return { success: false, error: err?.message || 'Error al listar túneles', tunnels: [] };
    }
  });

  // === CERRAR TODOS (para cleanup) ===
  ipcMain.handle('ssh-tunnel:close-all', async () => {
    try {
      const service = getService();
      await service.closeAll();
      
      return { success: true };
    } catch (err) {
      console.error('[ssh-tunnel:close-all] Error:', err);
      return { success: false, error: err?.message || 'Error al cerrar túneles' };
    }
  });

  console.log('✅ [SSH Tunnel Handlers] Registrados correctamente');
}

/**
 * Cierra todos los túneles (llamar al cerrar la app)
 */
async function cleanupTunnels() {
  if (tunnelService) {
    await tunnelService.closeAll();
  }
}

module.exports = {
  registerSSHTunnelHandlers,
  cleanupTunnels,
  getService
};
