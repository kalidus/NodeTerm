/**
 * Índice centralizado para todos los handlers del proceso principal
 * 
 * Este archivo centraliza la importación y registro de todos los handlers
 * para mantener una estructura organizada y facilitar el mantenimiento.
 */

const { registerAppHandlers } = require('./app-handlers');
const { registerSystemHandlers } = require('./system-handlers');
const { registerGuacamoleHandlers } = require('./guacamole-handlers');
const { registerAnythingLLMHandlers } = require('./anythingllm-handlers');
const { registerOpenWebUIHandlers } = require('./openwebui-handlers');
const registerSSHHandlers = require('./ssh-handlers');
const { registerMCPHandlers } = require('./mcp-handlers');
const { registerFileHandlers } = require('./file-handlers');
const { registerNetworkToolsHandlers } = require('./network-tools-handlers');

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
  // Registrando handlers silenciosamente
  
  // Registrar handlers de aplicación (UI, versión, cierre)
  registerAppHandlers(dependencies);
  
  // Registrar handlers del sistema
  registerSystemHandlers();
  
  // Registrar handlers de Guacamole
  registerGuacamoleHandlers(dependencies);
  registerAnythingLLMHandlers(dependencies);
  registerOpenWebUIHandlers(dependencies);
  
  // Registrar handlers SSH
  registerSSHHandlers(dependencies);
  
  // Registrar handlers MCP
  registerMCPHandlers();
  
  // Registrar handlers de archivos (SFTP/FTP/SCP)
  registerFileHandlers();
  
  // Registrar handlers de herramientas de red
  registerNetworkToolsHandlers();
}

module.exports = {
  registerAllHandlers,
  registerAppHandlers,
  registerSystemHandlers,
  registerGuacamoleHandlers,
  registerAnythingLLMHandlers,
  registerOpenWebUIHandlers,
  registerSSHHandlers,
  registerMCPHandlers,
  registerNetworkToolsHandlers
};
