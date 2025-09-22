/**
 * Índice centralizado para todos los handlers del proceso principal
 * 
 * Este archivo centraliza la importación y registro de todos los handlers
 * para mantener una estructura organizada y facilitar el mantenimiento.
 */

const { registerAppHandlers } = require('./app-handlers');
const { registerSystemHandlers } = require('./system-handlers');
const { registerGuacamoleHandlers } = require('./guacamole-handlers');
const registerSSHHandlers = require('./ssh-handlers');

/**
 * Registra todos los handlers del sistema
 * @param {Object} dependencies - Dependencias necesarias para los handlers
 * @param {BrowserWindow} dependencies.mainWindow - Ventana principal
 * @param {Function} dependencies.disconnectAllGuacamoleConnections - Función para desconectar conexiones Guacamole
 * @param {Object} dependencies.guacdService - Servicio de guacd
 * @param {Object} dependencies.guacamoleServer - Servidor Guacamole
 * @param {Number} dependencies.guacamoleServerReadyAt - Timestamp de inicialización del servidor
 * @param {Function} dependencies.sendToRenderer - Función para enviar datos al renderer
 * @param {Object} dependencies.guacdInactivityTimeoutMs - Variable de timeout
 * @param {Function} dependencies.getGuacamoleServer - Función getter para obtener el servidor actual
 * @param {Function} dependencies.getGuacamoleServerReadyAt - Función getter para obtener el timestamp actual
 * @param {Object} dependencies.packageJson - Información del package.json
 * @param {Object} dependencies.sshConnections - Conexiones SSH activas
 * @param {Function} dependencies.cleanupOrphanedConnections - Función para limpiar conexiones
 * @param {Object} dependencies.isAppQuitting - Variable de estado de cierre
 */
function registerAllHandlers(dependencies) {
  console.log('🔧 Registrando handlers del sistema...');
  
  // Registrar handlers de aplicación (UI, versión, cierre)
  registerAppHandlers(dependencies);
  console.log('✅ Handlers de aplicación registrados');
  
  // Registrar handlers del sistema
  registerSystemHandlers();
  console.log('✅ Handlers del sistema registrados');
  
  // Registrar handlers de Guacamole
  registerGuacamoleHandlers(dependencies);
  console.log('✅ Handlers de Guacamole registrados');
  
  // Registrar handlers SSH
  registerSSHHandlers(dependencies);
  console.log('✅ Handlers SSH registrados');
  
  console.log('🎉 Todos los handlers registrados correctamente');
}

module.exports = {
  registerAllHandlers,
  registerAppHandlers,
  registerSystemHandlers,
  registerGuacamoleHandlers,
  registerSSHHandlers
};
