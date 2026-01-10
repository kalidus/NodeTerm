/**
 * Índice centralizado para todos los handlers del proceso principal
 * 
 * Este archivo centraliza la importación y registro de todos los handlers
 * para mantener una estructura organizada y facilitar el mantenimiento.
 * 
 * 🚀 OPTIMIZACIÓN: Los handlers se registran en dos fases:
 * - CRÍTICOS: Se registran inmediatamente (app, sistema)
 * - DIFERIDOS: Se registran después de 50ms (SSH, Guacamole, MCP, etc.)
 */

// 🚀 OPTIMIZACIÓN: Lazy loading de handlers para reducir tiempo de arranque
let _appHandlers = null;
let _systemHandlers = null;
let _guacamoleHandlers = null;
let _anythingLLMHandlers = null;
let _openWebUIHandlers = null;
let _sshHandlers = null;
let _mcpHandlers = null;
let _fileHandlers = null;
let _networkToolsHandlers = null;

function getAppHandlers() {
  if (!_appHandlers) _appHandlers = require('./app-handlers');
  return _appHandlers;
}

function getSystemHandlers() {
  if (!_systemHandlers) _systemHandlers = require('./system-handlers');
  return _systemHandlers;
}

function getGuacamoleHandlers() {
  if (!_guacamoleHandlers) _guacamoleHandlers = require('./guacamole-handlers');
  return _guacamoleHandlers;
}

function getAnythingLLMHandlers() {
  if (!_anythingLLMHandlers) _anythingLLMHandlers = require('./anythingllm-handlers');
  return _anythingLLMHandlers;
}

function getOpenWebUIHandlers() {
  if (!_openWebUIHandlers) _openWebUIHandlers = require('./openwebui-handlers');
  return _openWebUIHandlers;
}

function getSSHHandlers() {
  if (!_sshHandlers) _sshHandlers = require('./ssh-handlers');
  return _sshHandlers;
}

function getMCPHandlers() {
  if (!_mcpHandlers) _mcpHandlers = require('./mcp-handlers');
  return _mcpHandlers;
}

function getFileHandlers() {
  if (!_fileHandlers) _fileHandlers = require('./file-handlers');
  return _fileHandlers;
}

function getNetworkToolsHandlers() {
  if (!_networkToolsHandlers) _networkToolsHandlers = require('./network-tools-handlers');
  return _networkToolsHandlers;
}

/**
 * Registra handlers CRÍTICOS inmediatamente (necesarios para mostrar la UI)
 */
function registerCriticalHandlers(dependencies) {
  // Handlers de aplicación (UI, versión, cierre) - CRÍTICOS
  getAppHandlers().registerAppHandlers(dependencies);
  
  // Handlers del sistema - CRÍTICOS
  getSystemHandlers().registerSystemHandlers();
}

/**
 * Registra handlers SECUNDARIOS (pueden esperar)
 */
function registerSecondaryHandlers(dependencies) {
  // Handlers de Guacamole
  getGuacamoleHandlers().registerGuacamoleHandlers(dependencies);
  getAnythingLLMHandlers().registerAnythingLLMHandlers(dependencies);
  getOpenWebUIHandlers().registerOpenWebUIHandlers(dependencies);
  
  // Handlers SSH
  getSSHHandlers()(dependencies);
  
  // Handlers MCP
  getMCPHandlers().registerMCPHandlers();
  
  // Handlers de archivos (SFTP/FTP/SCP)
  getFileHandlers().registerFileHandlers();
  
  // Handlers de herramientas de red
  getNetworkToolsHandlers().registerNetworkToolsHandlers();
}

/**
 * Registra todos los handlers del sistema
 * 🚀 OPTIMIZACIÓN: Registro progresivo para arranque más rápido
 * 
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
  // 🚀 FASE 1: Registrar handlers CRÍTICOS inmediatamente
  registerCriticalHandlers(dependencies);
  
  // 🚀 FASE 2: Registrar handlers SECUNDARIOS después de 50ms
  // Esto permite que la UI se renderice mientras se registran los handlers menos urgentes
  setTimeout(() => {
    registerSecondaryHandlers(dependencies);
  }, 50);
}

module.exports = {
  registerAllHandlers,
  registerCriticalHandlers,
  registerSecondaryHandlers,
  // Getters para acceso individual a handlers (lazy loading)
  getAppHandlers,
  getSystemHandlers,
  getGuacamoleHandlers,
  getAnythingLLMHandlers,
  getOpenWebUIHandlers,
  getSSHHandlers,
  getMCPHandlers,
  getFileHandlers,
  getNetworkToolsHandlers
};
