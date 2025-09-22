/**
 * Índice centralizado para todos los handlers del proceso principal
 * 
 * Este archivo centraliza la importación y registro de todos los handlers
 * para mantener una estructura organizada y facilitar el mantenimiento.
 */

const { registerAppHandlers } = require('./app-handlers');
const { registerSystemHandlers } = require('./system-handlers');
const registerSSHHandlers = require('./ssh-handlers');

/**
 * Registra todos los handlers del sistema
 * @param {Object} dependencies - Dependencias necesarias para los handlers
 * @param {BrowserWindow} dependencies.mainWindow - Ventana principal
 * @param {Function} dependencies.disconnectAllGuacamoleConnections - Función para desconectar conexiones Guacamole
 */
function registerAllHandlers(dependencies) {
  console.log('🔧 Registrando handlers del sistema...');
  
  // Registrar handlers de aplicación
  registerAppHandlers(dependencies);
  console.log('✅ Handlers de aplicación registrados');
  
  // Registrar handlers del sistema
  registerSystemHandlers();
  console.log('✅ Handlers del sistema registrados');
  
  // Registrar handlers SSH
  registerSSHHandlers(dependencies);
  console.log('✅ Handlers SSH registrados');
  
  console.log('🎉 Todos los handlers registrados correctamente');
}

module.exports = {
  registerAllHandlers,
  registerAppHandlers,
  registerSystemHandlers,
  registerSSHHandlers
};
