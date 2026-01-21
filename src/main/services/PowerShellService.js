/**
 * Servicio para gestión de PowerShell (ahora delegando a PowerShellProcessManager)
 * - Inicio de sesiones PowerShell
 * - Gestión de procesos PowerShell
 * - Handlers para operaciones PowerShell
 */

const PowerShellProcessManager = require('./PowerShellProcessManager');

// Referencia a getPty (lazy loaded)
let getPtyFn = null;

/**
 * Establece las dependencias necesarias para el servicio
 * @param {Object} dependencies - Dependencias del servicio
 * @param {BrowserWindow} dependencies.mainWindow - Ventana principal
 * @param {Object} dependencies.alternativePtyConfig - Configuración alternativa de PTY
 * @param {Function} dependencies.SafeWindowsTerminal - Clase SafeWindowsTerminal
 * @param {boolean} dependencies.isAppQuitting - Flag de cierre de aplicación
 */
function setDependencies({ mainWindow, alternativePtyConfig, SafeWindowsTerminal, isAppQuitting, getPty }) {
  getPtyFn = getPty;
  
  // Inicializar PowerShellProcessManager con las dependencias
  PowerShellProcessManager.initialize({
    mainWindow,
    getPty,
    alternativePtyConfig,
    SafeWindowsTerminal,
    isAppQuitting
  });
  
  if (isAppQuitting !== undefined) {
    PowerShellProcessManager.setAppQuitting(isAppQuitting);
  }
}

// Funciones delegadas al PowerShellProcessManager

/**
 * Handlers para operaciones PowerShell (delegando a PowerShellProcessManager)
 */
const PowerShellHandlers = {
  start: (tabId, { cols, rows }) => PowerShellProcessManager.startPowerShellSession(tabId, { cols, rows }),
  data: (tabId, data) => PowerShellProcessManager.writeToPowerShell(tabId, data),
  resize: (tabId, { cols, rows }) => PowerShellProcessManager.resizePowerShell(tabId, { cols, rows }),
  stop: (tabId) => PowerShellProcessManager.stopPowerShell(tabId)
};

module.exports = {
  setDependencies,
  PowerShellHandlers,
  cleanup: () => PowerShellProcessManager.cleanup(),
  getProcesses: () => PowerShellProcessManager.getProcesses()
};
