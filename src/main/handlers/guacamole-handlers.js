/**
 * Handlers IPC para funcionalidades de Guacamole
 * - Configuración de timeout de guacd
 * - Estado de Guacamole
 * - Creación de tokens
 * - Gestión de conexiones
 */

const { ipcMain } = require('electron');

/**
 * Registra todos los handlers IPC de Guacamole
 * @param {Object} dependencies - Dependencias necesarias
 * @param {Object} dependencies.guacdService - Servicio de guacd
 * @param {Object} dependencies.guacamoleServer - Servidor Guacamole
 * @param {Function} dependencies.sendToRenderer - Función para enviar datos al renderer
 * @param {Function} dependencies.disconnectAllGuacamoleConnections - Función para desconectar conexiones
 * @param {Object} dependencies.guacdInactivityTimeoutMs - Variable de timeout
 */
function registerGuacamoleHandlers({
  guacdService,
  guacamoleServer,
  sendToRenderer,
  disconnectAllGuacamoleConnections,
  guacdInactivityTimeoutMs
}) {
  // IPC para configurar el watchdog de guacd desde la UI
  ipcMain.handle('guacamole:set-guacd-timeout-ms', async (event, timeoutMs) => {
    try {
      const parsed = parseInt(timeoutMs, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        return { success: false, error: 'Invalid timeout value' };
      }
      
      // Actualizar la variable global
      guacdInactivityTimeoutMs.value = parsed;
      
      // Si el servicio guacd está activo, actualizar su configuración
      if (guacdService && typeof guacdService.setInactivityTimeout === 'function') {
        guacdService.setInactivityTimeout(parsed);
      }
      
      return { success: true, value: parsed };
    } catch (error) {
      console.error('Error setting guacd timeout:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('guacamole:get-guacd-timeout-ms', async () => {
    return { success: true, value: guacdInactivityTimeoutMs.value };
  });

  // Handler para crear pestañas de Guacamole
  ipcMain.on('guacamole:create-tab', (event, data) => {
    // Reenviar el evento al renderer para crear la pestaña
    sendToRenderer(event.sender, 'guacamole:create-tab', data);
  });

  // IPC handlers for Guacamole RDP connections
  ipcMain.handle('guacamole:get-status', async (event) => {
    return {
      guacd: guacdService.getStatus(),
      server: guacamoleServer ? {
        running: true,
        port: guacamoleServer.port || 'unknown'
      } : { running: false }
    };
  });

  // Permitir establecer el método preferido desde la UI (docker|wsl|mock)
  ipcMain.handle('guacamole:set-preferred-method', async (event, method) => {
    try {
      if (guacdService && typeof guacdService.setPreferredMethod === 'function') {
        guacdService.setPreferredMethod(method);
        return { success: true, method };
      } else {
        return { success: false, error: 'GuacdService not available' };
      }
    } catch (error) {
      console.error('Error setting preferred method:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('guacamole:disconnect-all', async () => {
    await disconnectAllGuacamoleConnections();
    return { success: true };
  });

  ipcMain.handle('guacamole:create-token', async (event, config) => {
    try {
      console.log('📋 [MAIN] CONFIG COMPLETO RECIBIDO:', config);
      // Si guacd está en modo mock, informar al usuario y rechazar
      if (guacdService && guacdService.getStatus().method === 'mock') {
        return {
          success: false,
          error: 'Guacd está en modo mock. No se pueden crear conexiones reales.',
          mock: true
        };
      }
      
      // Validar configuración básica
      if (!config || !config.host || !config.username) {
        return {
          success: false,
          error: 'Configuración incompleta: host y username son requeridos'
        };
      }
      
      // Crear token de conexión
      const token = await guacdService.createConnectionToken(config);
      
      if (token) {
        return {
          success: true,
          token,
          config: {
            host: config.host,
            port: config.port || 3389,
            username: config.username,
            protocol: config.protocol || 'rdp'
          }
        };
      } else {
        return {
          success: false,
          error: 'No se pudo crear el token de conexión'
        };
      }
    } catch (error) {
      console.error('Error creating Guacamole token:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido al crear token'
      };
    }
  });
}

module.exports = {
  registerGuacamoleHandlers
};
