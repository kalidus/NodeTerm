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
let _systemServicesHandlers = null;
let _rdpHandlers = null;
let _guacamoleHandlers = null;
let _anythingLLMHandlers = null;
let _openWebUIHandlers = null;
let _libreChatHandlers = null;
let _agentZeroHandlers = null;
let _openClawHandlers = null;
let _openNotebookHandlers = null;
let _sshHandlers = null;
let _mcpHandlers = null;
let _nextcloudHandlers = null;
let _fileHandlers = null;
let _networkToolsHandlers = null;
let _sshTunnelHandlers = null;
let _themeHandlers = null;
let _securityHandlers = null;
let _appdataHandlers = null;
let _localFsHandlers = null;
let _claudeHandlers = null;
let _opencodeHandlers = null;
let _geminicliHandlers = null;
let _codexcliHandlers = null;

function getAppHandlers() {
  if (!_appHandlers) _appHandlers = require('./app-handlers');
  return _appHandlers;
}

function getSystemHandlers() {
  if (!_systemHandlers) _systemHandlers = require('./system-handlers');
  return _systemHandlers;
}

function getSystemServicesHandlers() {
  if (!_systemServicesHandlers) _systemServicesHandlers = require('./system-services-handlers');
  return _systemServicesHandlers;
}

function getRdpHandlers() {
  if (!_rdpHandlers) _rdpHandlers = require('./rdp-handlers');
  return _rdpHandlers;
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

function getLibreChatHandlers() {
  if (!_libreChatHandlers) _libreChatHandlers = require('./librechat-handlers');
  return _libreChatHandlers;
}

function getAgentZeroHandlers() {
  if (!_agentZeroHandlers) _agentZeroHandlers = require('./agentzero-handlers');
  return _agentZeroHandlers;
}

function getOpenClawHandlers() {
  if (!_openClawHandlers) _openClawHandlers = require('./openclaw-handlers');
  return _openClawHandlers;
}

function getOpenNotebookHandlers() {
  if (!_openNotebookHandlers) _openNotebookHandlers = require('./opennotebook-handlers');
  return _openNotebookHandlers;
}

function getSSHHandlers() {
  if (!_sshHandlers) _sshHandlers = require('./ssh-handlers');
  return _sshHandlers;
}

function getMCPHandlers() {
  if (!_mcpHandlers) _mcpHandlers = require('./mcp-handlers');
  return _mcpHandlers;
}

function getNextcloudHandlers() {
  if (!_nextcloudHandlers) _nextcloudHandlers = require('./nextcloud-handlers');
  return _nextcloudHandlers;
}

function getFileHandlers() {
  if (!_fileHandlers) _fileHandlers = require('./file-handlers');
  return _fileHandlers;
}

function getNetworkToolsHandlers() {
  if (!_networkToolsHandlers) _networkToolsHandlers = require('./network-tools-handlers');
  return _networkToolsHandlers;
}

function getSSHTunnelHandlers() {
  if (!_sshTunnelHandlers) _sshTunnelHandlers = require('./ssh-tunnel-handlers');
  return _sshTunnelHandlers;
}

function getThemeHandlers() {
  if (!_themeHandlers) _themeHandlers = require('./theme-handlers');
  return _themeHandlers;
}

function getSecurityHandlers() {
  if (!_securityHandlers) _securityHandlers = require('./security-handlers');
  return _securityHandlers;
}

function getAppDataHandlers() {
  if (!_appdataHandlers) _appdataHandlers = require('./appdata-handlers');
  return _appdataHandlers;
}

function getLocalFsHandlers() {
  if (!_localFsHandlers) _localFsHandlers = require('./local-fs-handlers');
  return _localFsHandlers;
}

function getClaudeHandlers() {
  if (!_claudeHandlers) _claudeHandlers = require('./claude-handlers');
  return _claudeHandlers;
}

function getOpenCodeHandlers() {
  if (!_opencodeHandlers) _opencodeHandlers = require('./opencode-handlers');
  return _opencodeHandlers;
}

function getGeminiCliHandlers() {
  if (!_geminicliHandlers) _geminicliHandlers = require('./geminicli-handlers');
  return _geminicliHandlers;
}

function getCodexCliHandlers() {
  if (!_codexcliHandlers) _codexcliHandlers = require('./codexcli-handlers');
  return _codexcliHandlers;
}

/**
 * Registra handlers CRÍTICOS inmediatamente (necesarios para mostrar la UI)
 */
function registerCriticalHandlers(dependencies) {
  // Handlers de aplicación (UI, versión, cierre) - CRÍTICOS
  getAppHandlers().registerAppHandlers(dependencies);

  // Handlers del sistema - CRÍTICOS (clipboard y dialog)
  getSystemHandlers().registerSystemHandlers();

  // Handlers de seguridad - CRÍTICOS (Master Key)
  getSecurityHandlers().registerSecurityHandlers(dependencies);

  // Handlers de tema - CRÍTICOS (necesarios para cargar el tema al inicio)
  getThemeHandlers().registerThemeHandlers(dependencies);

  // Handlers de datos de aplicación - CRÍTICOS (sincronización localStorage entre instancias)
  getAppDataHandlers().registerAppDataHandlers(dependencies);

  // Handlers de Claude Code (configuración gestionada por app)
  getClaudeHandlers().registerClaudeHandlers();

  // Handlers de OpenCode (configuración gestionada por app)
  getOpenCodeHandlers().registerOpenCodeHandlers();

  // Handlers de Gemini CLI (configuración gestionada por app)
  getGeminiCliHandlers().registerGeminiCliHandlers();

  // Handlers de Codex CLI (configuración gestionada por app)
  getCodexCliHandlers().registerCodexCliHandlers();

  // 🚀 CRÍTICO: Handlers de servicios de IA secundarios (para precalentamiento inmediato)
  getAnythingLLMHandlers().registerAnythingLLMHandlers(dependencies);
  getOpenWebUIHandlers().registerOpenWebUIHandlers(dependencies);
  getLibreChatHandlers().registerLibreChatHandlers(dependencies);
  getAgentZeroHandlers().registerAgentZeroHandlers(dependencies);
  getOpenClawHandlers().registerOpenClawHandlers(dependencies);
  getOpenNotebookHandlers().registerOpenNotebookHandlers(dependencies);

  // 🚀 CRÍTICO: Registrar handlers de monitoreo INMEDIATAMENTE
  // El REGISTRO es ligero (solo IPC), lo PESADO es la EJECUCIÓN (que es on-demand)
  // Esto evita errores de "No handler registered" cuando el frontend los llama
  getSystemHandlers().registerSystemMonitoringHandlers();

  // 🚀 CRÍTICO: System stats handler debe estar disponible INMEDIATAMENTE
  // porque TODOS los componentes del frontend lo llaman al cargar
  const { ipcMain } = require('electron');
  ipcMain.handle('get-system-stats', async () => {
    try {
      const StatsWorkerService = require('../services/StatsWorkerService');
      const stats = await StatsWorkerService.getSystemStats();
      // Asegurar que hostname esté presente (fallback si el worker no lo envió)
      if (stats && !stats.hostname) {
        stats.hostname = require('os').hostname();
      }
      return stats;
    } catch (error) {
      // Devolver stats vacías si el worker aún no está listo
      const os = require('os');
      return {
        cpu: { usage: 0, cores: 0 },
        memory: { total: 0, used: 0, free: 0 },
        disks: [],
        network: { download: 0, upload: 0 },
        hostname: os.hostname(),
        platform: process.platform,
        arch: os.arch(),
        kernel: os.release(),
        osVersion: (typeof os.version === 'function' ? os.version() : '')
      };
    }
  });
}

/**
 * Registra handlers SECUNDARIOS (pueden esperar)
 */
function registerSecondaryHandlers(dependencies) {
  // Handlers de servicios del sistema (historial, estadísticas)
  getSystemServicesHandlers().registerSystemServicesHandlers(dependencies);

  // Handlers RDP (Remote Desktop Protocol)
  getRdpHandlers().registerRdpHandlers(dependencies);

  // Handlers de Guacamole
  getGuacamoleHandlers().registerGuacamoleHandlers(dependencies);

  // Handlers SSH
  getSSHHandlers()(dependencies);

  // Handlers MCP y Nextcloud (no críticos para el arranque)
  getMCPHandlers().registerMCPHandlers();
  getNextcloudHandlers().registerNextcloudHandlers();

  // Handlers de archivos (SFTP/FTP/SCP y Local)
  getFileHandlers().registerFileHandlers(dependencies);
  getLocalFsHandlers().registerLocalFsHandlers();

  // Handlers de herramientas de red
  getNetworkToolsHandlers().registerNetworkToolsHandlers();

  // NOTA: Theme handlers ahora se registran en registerCriticalHandlers()

  // 🚀 OPTIMIZACIÓN: Handlers de túneles SSH se registran DESPUÉS de ready-to-show
  // Ver registerSSHTunnelHandlers() que se llama desde main.js
}

/**
 * 🚀 OPTIMIZACIÓN: Registra handlers de túneles SSH después de que la ventana sea visible
 * Estos handlers no son críticos para el arranque y pueden esperar
 */
function registerSSHTunnelHandlers(dependencies) {
  getSSHTunnelHandlers().registerSSHTunnelHandlers(dependencies);
}

/**
 * Registra todos los handlers del sistema
 * 🚀 OPTIMIZACIÓN: Solo registra handlers CRÍTICOS
 * Los handlers SECUNDARIOS se registran después de ready-to-show
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
  // 🚀 Solo registrar handlers CRÍTICOS (necesarios para mostrar la UI)
  registerCriticalHandlers(dependencies);
  // ℹ️ Los handlers SECUNDARIOS se registran después de ready-to-show
  // desde initializeServicesAfterShow() en main.js
}

module.exports = {
  registerAllHandlers,
  registerCriticalHandlers,
  registerSecondaryHandlers,
  registerSSHTunnelHandlers, // 🚀 Nueva función para registrar handlers de túnel SSH después de ready-to-show
  // Getters para acceso individual a handlers (lazy loading)
  getAppHandlers,
  getSystemHandlers,
  getSystemServicesHandlers,
  getRdpHandlers,
  getGuacamoleHandlers,
  getAnythingLLMHandlers,
  getOpenWebUIHandlers,
  getLibreChatHandlers,
  getAgentZeroHandlers,
  getOpenClawHandlers,
  getOpenNotebookHandlers,
  getSSHHandlers,
  getMCPHandlers,
  getNextcloudHandlers,
  getFileHandlers,
  getNetworkToolsHandlers,
  getSSHTunnelHandlers,
  getThemeHandlers,
  getSecurityHandlers,
  getAppDataHandlers,
  getLocalFsHandlers,
  getClaudeHandlers,
  getOpenCodeHandlers,
  getGeminiCliHandlers,
  getCodexCliHandlers
};
