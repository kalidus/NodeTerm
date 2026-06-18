// ============================================================================
// 🎯 REFACTORIZACIONES COMPLETADAS
// ============================================================================
// ✅ 1. SSHStatsService: Toda la lógica de procesamiento de estadísticas SSH
//    (CPU, memoria, disco, red, etc.) movida a src/main/services/SSHStatsService.js
//    - statsLoop() ahora es un wrapper delgado
//    - wallixStatsLoop() se crea via createBastionStatsLoop()
//    - Eliminadas ~500 líneas de código duplicado
//
// ✅ 2. SSHAuthService: Toda la lógica de autenticación SSH centralizada
//    en src/main/services/SSHAuthService.js
//    - Autenticación manual con password
//    - Keyboard-interactive authentication
//    - Manejo de errores de autenticación
//    - Reintentos y reconexión automática
//    - Eliminadas ~300 líneas de código duplicado
//
// ✅ 3. SSHConnectionCleanupService: Limpieza de conexiones SSH centralizada
//    en src/main/services/SSHConnectionCleanupService.js
//    - Limpieza de timeouts y buffers
//    - Cierre seguro de streams y conexiones
//    - Manejo de conexiones compartidas
//    - Eliminadas ~120 líneas de código duplicado
//
// ✅ 4. SSHWriteBufferService: Sistema de buffering Wallix/Bastion
//    en src/main/services/SSHWriteBufferService.js
//    - Micro-batching optimizado para reducir lag
//    - Flush inteligente (inmediato para comandos, delayed para typing)
//    - Eliminadas ~50 líneas de código inline
//
// ✅ 5. tab-events-handler: Registro dinámico de eventos IPC para pestañas
//    movido a src/main/handlers/tab-events-handler.js
//    - registerTabEvents() ahora se importa del módulo
//    - Reducidas ~140 líneas de main.js
//    - Mejor organización y mantenibilidad
//
// 📊 RESULTADO FINAL:
//    • 5 refactorizaciones completadas
//    • ~1110 líneas reducidas del main.js
//    • 4 nuevos módulos/servicios creados
//    • Mejor mantenibilidad y testabilidad
// ============================================================================

// Startup profiler
const { logTiming } = require('./src/main/utils/startup-profiler');
logTiming('Inicio del proceso main.js');

// DOMMatrix polyfill (debe cargarse ANTES de cualquier módulo que use jsdom)
const { initializeDOMMatrixPolyfill } = require('./src/main/polyfills/dommatrix-polyfill');
initializeDOMMatrixPolyfill();
logTiming('Polyfill DOMMatrix cargado');

// macOS: permisos de spawn-helper antes de cargar servicios que requieren node-pty
require('./src/main/utils/ensureMacPtyPermissions')();
logTiming('ensureMacPtyPermissions (macOS)');

// Declarar variables
let alternativePtyConfig, SafeWindowsTerminal, registerAllHandlers, cleanupTunnels;
let orphanCleanupInterval = null;

// Importar utilidades centralizadas (fuera del try-catch para acceso global)
const { parseDfOutput, parseNetDev, getGuacdPrefPath, sendToRenderer, cleanupOrphanedConnections } = require('./src/main/utils');
logTiming('Utils cargados');

// Importar servicios centralizados (fuera del try-catch para acceso global)
// Nota: Docker se importará después de que se carguen fs y path
let Docker = null;

const {
  getWSL, getPowerShell, getCygwin, getClaude, getOpenCode, getGeminiCli, getCodexCli, getAntigravityCli, getHermesCli
} = require('./src/main/services/lazy-services');

function createServiceProxy(getter) {
  return new Proxy({}, {
    get(_target, prop) {
      const mod = getter();
      const val = mod[prop];
      return typeof val === 'function' ? val.bind(mod) : val;
    }
  });
}

const WSL = createServiceProxy(getWSL);
const PowerShell = createServiceProxy(getPowerShell);
const Cygwin = createServiceProxy(getCygwin);
const Claude = createServiceProxy(getClaude);
const OpenCode = createServiceProxy(getOpenCode);
const GeminiCli = createServiceProxy(getGeminiCli);
const CodexCli = createServiceProxy(getCodexCli);
const AntigravityCli = createServiceProxy(getAntigravityCli);
const HermesCli = createServiceProxy(getHermesCli);

const { getClaudeConfig } = require('./src/main/handlers/claude-handlers');
const { getOpenCodeConfig } = require('./src/main/handlers/opencode-handlers');
const { getGeminiCliConfig } = require('./src/main/handlers/geminicli-handlers');
const { getCodexCliConfig } = require('./src/main/handlers/codexcli-handlers');
const { getAntigravityCliConfig } = require('./src/main/handlers/antigravitycli-handlers');
const { getHermesCliConfig } = require('./src/main/handlers/hermescli-handlers');
logTiming('Proxies de servicios terminal/CLI registrados (carga diferida)');

// Servicio de estadísticas SSH
const sshStatsService = require('./src/main/services/SSHStatsService');
logTiming('SSHStatsService cargado');

// Servicio de autenticación SSH
const sshAuthService = require('./src/main/services/SSHAuthService');
logTiming('SSHAuthService cargado');

const {
  buildSshConnectOptions,
  buildShellOptions,
  appendForwardingFlagsToCacheKey,
  getBastionForwardingWarning,
  isProxyJumpEnabled,
  requiresDedicatedSshSession,
  applyHostKeyPolicy
} = require('./src/utils/sshConnectOptions');
const sshKnownHostsService = require('./src/main/services/SSHKnownHostsService');
const { connectViaProxyJump } = require('./src/main/services/SSHProxyJumpService');

// Servicio de limpieza de conexiones SSH
const sshCleanupService = require('./src/main/services/SSHConnectionCleanupService');
logTiming('SSHConnectionCleanupService cargado');

// Servicio de buffering de escritura SSH (Wallix)
const sshWriteBufferService = require('./src/main/services/SSHWriteBufferService');
logTiming('SSHWriteBufferService cargado');

// Handler de registro de eventos de pestañas
const { registerTabEvents, isTabRegistered } = require('./src/main/handlers/tab-events-handler');
logTiming('Tab events handler cargado');

// Importar procesador de PDFs
// const pdfProcessor = require('./src/services/PDFProcessor'); // DESHABILITADO: pdf-parse eliminado

try {
  // Importar configuraciones de terminal desde archivo externo
  ({ alternativePtyConfig } = require('./src/main/config/terminal-configs'));

  // Importar clase SafeWindowsTerminal desde archivo externo
  SafeWindowsTerminal = require('./src/main/classes/SafeWindowsTerminal');

  // Importar manejadores centralizados
  ({ registerAllHandlers } = require('./src/main/handlers'));
  ({ cleanupTunnels } = require('./src/main/handlers/ssh-tunnel-handlers'));
} catch (err) {
  console.error('[MAIN] ERROR EN IMPORTACIONES:', err);
  console.error('[MAIN] Stack trace:', err.stack);
  process.exit(1);
}

// 🚀 OPTIMIZACIÓN: Solo cargar electron-reloader en desarrollo
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reloader')(module, {
      ignore: [
        'resources/**',           // Ignorar carpeta resources (Cygwin, etc.)
        'node_modules/**',
        'dist/**',
        '**/*.map',
        '.git/**'
      ],
      watchRenderer: true
    });
  } catch (_) { }
}

const { app, BrowserWindow, ipcMain, clipboard, dialog, Menu, powerMonitor, screen } = require('electron');
logTiming('Electron cargado');

// Windows: mismo ID que build.appId en prod (barra tras auto-update NSIS); ID distinto en dev
if (process.platform === 'win32') {
  app.setAppUserModelId(app.isPackaged ? 'com.electron.nodeterm' : 'com.electron.nodeterm.dev');
}

const path = require('path');
const url = require('url');

const os = require('os');
const fs = require('fs');

const { migrateDataFromHomeDir, getNodeTermDataDir } = require('./src/main/utils/file-utils');

// ============================================================================
// 🔒 MULTI-INSTANCE SUPPORT (Fix for "Cache Lock" errors)
// ============================================================================
// Electron applications by default lock the User Data directory (net::disk_cache).
// To allow multiple instances, we check if the lock is available.
// - Primary Instance: Gets the lock, uses standard UserData.
// - Secondary Instance: Fails to get lock, switches to a TEMP UserData directory.
//
// NOTE: Secondary instances will have empty localStorage/Cookies but share:
// - Connection History (~/.nodeterm/connection_history.json)
// - Themes (via sync to ~/.nodeterm/theme.json)
// ============================================================================

// Guardar para evitar errores si app no está disponible (ej: ejecutando con node puro)
if (!app) {
  console.error('❌ [CRITICAL] Electron "app" object is undefined. Ensure you are running with "electron ."');
  process.exit(1);
}

// Establecer el directorio userData centralizado a nodeterm (minúsculas)
try {
  app.setPath('userData', getNodeTermDataDir());
  console.log(`✅ [MAIN] UserData principal configurado en: ${getNodeTermDataDir()}`);
} catch (err) {
  console.error('❌ [MAIN] Error configurando UserData principal:', err);
}

const gotTheLock = app.requestSingleInstanceLock();
process.env.NODETERM_IS_SECONDARY_INSTANCE = gotTheLock ? 'false' : 'true';

if (gotTheLock) {
  setImmediate(() => migrateDataFromHomeDir());
}

if (!gotTheLock) {
  console.log('⚠️ [MAIN] Instancia secundaria detectada (Lock no obtenido)');
  console.log('⚠️ [MAIN] Cambiando a directorio UserData temporal para evitar bloqueo de caché...');

  const tempUserData = path.join(app.getPath('temp'), `NodeTerm-Instance-${process.pid}`);

  try {
    // Intentar limpiar directorio temporal previo si existe
    if (fs.existsSync(tempUserData)) {
      try { fs.rmSync(tempUserData, { recursive: true, force: true }); } catch (e) { }
    }
    fs.mkdirSync(tempUserData, { recursive: true });
    app.setPath('userData', tempUserData);
    console.log(`✅ [MAIN] UserData redirigido a: ${tempUserData}`);
  } catch (error) {
    console.error('❌ [MAIN] Error configurando UserData temporal:', error);
    // Fallback: Dejar que continúe, aunque probablemente fallará con net::ERR_CACHE_LOCK
  }
} else {
  console.log('🔒 [MAIN] Instancia primaria (Lock obtenido)');
  // Opcional: Manejar evento 'second-instance' si quisiéramos enfocar la ventana existente
  // en lugar de abrir una nueva. Pero el usuario quiere ventanas independientes.
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Si quisiéramos Single Window, aquí haríamos mainWindow.restore() y .focus()
    // Pero para Multi-Window, dejamos que la segunda instancia corra con su propio UserData
    console.log('ℹ️ [MAIN] Otra instancia intentó iniciar (detectado via second-instance event)');
  });
}
// ============================================================================

// 🚀 OPTIMIZACIÓN: Docker con lazy loading (no se usa hasta listar contenedores)
function getDocker() {
  if (Docker === null) {
    try {
      Docker = require('./src/main/services/DockerService');
    } catch (importError) {
      console.error('❌ Error importing Docker service:', importError.message);
      Docker = false; // Marcar como fallido para no reintentar
    }
  }
  return Docker || null;
}

// ============================================
// 🚀 OPTIMIZACIÓN: LAZY LOADING DE MÓDULOS PESADOS
// Estos módulos se cargan solo cuando se necesitan por primera vez
// ============================================

// Módulos con lazy loading (se cargan bajo demanda)
let _SSH2Promise = null;
let _SSH2Client = null;
let _NodeSSH = null;
let _SftpClient = null;
let _si = null;
let _GuacamoleLite = null;

// Getters para módulos con lazy loading
function getSSH2Promise() {
  if (!_SSH2Promise) {
    _SSH2Promise = require('ssh2-promise');
    try {
      const SSHConnection = _SSH2Promise.SSH;
      if (SSHConnection && SSHConnection.prototype && typeof SSHConnection.prototype.shell === 'function') {
        SSHConnection.prototype.shell = function (wndopts = {}, opts) {
          return this.connect().then(() => {
            return new Promise((resolve, reject) => {
              let finalWndopts = wndopts;
              let finalOpts = opts;
              if (wndopts && (wndopts.x11 !== undefined || wndopts.env !== undefined) && !opts) {
                const { x11, env, ...rest } = wndopts;
                finalWndopts = rest;
                finalOpts = { x11, env };
              }
              this.sshConnection.shell(finalWndopts, finalOpts, (err, stream) => err ? reject(err) : resolve(stream));
            });
          });
        };
      }
    } catch (e) {
      console.error('[SSH PATCH] Error patching SSHConnection.shell:', e);
    }
  }
  return _SSH2Promise;
}

function getSSH2Client() {
  if (!_SSH2Client) _SSH2Client = require('ssh2').Client;
  return _SSH2Client;
}

function getNodeSSH() {
  if (!_NodeSSH) _NodeSSH = require('node-ssh').NodeSSH;
  return _NodeSSH;
}

function getSftpClient() {
  if (!_SftpClient) _SftpClient = require('ssh2-sftp-client');
  return _SftpClient;
}

function getSystemInfo() {
  if (!_si) _si = require('systeminformation');
  return _si;
}

function getGuacamoleLite() {
  if (!_GuacamoleLite) _GuacamoleLite = require('guacamole-lite');
  return _GuacamoleLite;
}

// Módulos que se usan inmediatamente (carga normal)
const packageJson = require('./package.json');
const { createBastionShell } = require('./src/components/bastion-ssh');
// RdpManager ahora se carga con lazy loading en src/main/handlers/rdp-handlers.js
const { fork } = require('child_process');

// 🚀 OPTIMIZACIÓN: Servicios con instanciación diferida
let _guacdService = null;
let _anythingLLMService = null;
let _openWebUIService = null;
let _libreChatService = null;
let _agentZeroService = null;
let _openClawService = null;
let _openNotebookService = null;

function getGuacdService() {
  if (!_guacdService) {
    const GuacdService = require('./src/services/GuacdService');
    _guacdService = new GuacdService();
  }
  return _guacdService;
}

function getAnythingLLMService() {
  if (!_anythingLLMService) {
    const AnythingLLMService = require('./src/services/AnythingLLMService');
    _anythingLLMService = new AnythingLLMService();
  }
  return _anythingLLMService;
}

function getOpenWebUIService() {
  if (!_openWebUIService) {
    const OpenWebUIService = require('./src/services/OpenWebUIService');
    _openWebUIService = new OpenWebUIService();
  }
  return _openWebUIService;
}

function getLibreChatService() {
  if (!_libreChatService) {
    const LibreChatService = require('./src/services/LibreChatService');
    _libreChatService = new LibreChatService();
  }
  return _libreChatService;
}

function getAgentZeroService() {
  if (!_agentZeroService) {
    const AgentZeroService = require('./src/services/AgentZeroService');
    _agentZeroService = new AgentZeroService();
  }
  return _agentZeroService;
}

function getOpenClawService() {
  if (!_openClawService) {
    const OpenClawService = require('./src/services/OpenClawService');
    _openClawService = new OpenClawService();
  }
  return _openClawService;
}

function getOpenNotebookService() {
  if (!_openNotebookService) {
    const OpenNotebookService = require('./src/services/OpenNotebookService');
    _openNotebookService = new OpenNotebookService();
  }
  return _openNotebookService;
}

// ============================================================================
// 🚀 OPTIMIZACIÓN: Parche de GuacdClient DIFERIDO
// Se aplicará la primera vez que se use Guacamole, no al arrancar
// ============================================================================
let _guacdClientPatched = false;
function ensureGuacdClientPatched() {
  if (_guacdClientPatched) return;
  _guacdClientPatched = true;

  try {
    const GuacdClient = require('guacamole-lite/lib/GuacdClient.js');

    // Guardar el método send original
    const originalSend = GuacdClient.prototype.send;

    // Parchar el método send para actualizar lastActivity al ENVIAR datos
    GuacdClient.prototype.send = function (data, afterOpened = false) {
      this.lastActivity = Date.now();
      return originalSend.call(this, data, afterOpened);
    };

    // Parchar el constructor para desactivar el watchdog de 10s inmediatamente
    const originalProcessConnectionOpen = GuacdClient.prototype.processConnectionOpen;
    GuacdClient.prototype.processConnectionOpen = function () {
      if (this.activityCheckInterval) {
        clearInterval(this.activityCheckInterval);
        this.activityCheckInterval = null;
      }
      return originalProcessConnectionOpen.call(this);
    };

    console.log('✅ [GuacdClient] Parche de watchdog bidireccional aplicado correctamente');
  } catch (e) {
    console.error('❌ [GuacdClient] Error aplicando parche de watchdog:', e?.message || e);
  }
}

// 🚀 OPTIMIZACIÓN: Lazy loading de UpdateService, Recording y SessionRecorder
let _updateService = null;
let _sessionRecorder = null;
let _recordingHandlersRegistered = false;

function getUpdateServiceLazy() {
  if (!_updateService) {
    const { getUpdateService } = require('./src/main/services/UpdateService');
    _updateService = getUpdateService(); // Llamar al getter del módulo, no a esta función
  }
  return _updateService;
}

function getSessionRecorder() {
  if (!_sessionRecorder) {
    const SessionRecorder = require('./src/services/SessionRecorder');
    _sessionRecorder = new SessionRecorder();
  }
  return _sessionRecorder;
}

function ensureRecordingHandlersRegistered() {
  if (_recordingHandlersRegistered) return;
  _recordingHandlersRegistered = true;

  const { registerRecordingHandlers, setSessionRecorder } = require('./src/main/handlers/recording-handlers');
  setSessionRecorder(getSessionRecorder());
  registerRecordingHandlers();
}

// Helper para obtener directorio de grabaciones (ahora en módulo separado)
const { getRecordingsDirectory } = require('./src/main/utils/recording-utils');
// 🚀 OPTIMIZACIÓN: Servicios AnythingLLM y OpenWebUI ahora usan lazy loading
// Ver getAnythingLLMService() y getOpenWebUIService() arriba

let mainWindow;

function getDefaultConnectionSearchShortcut() {
  if (process.platform === 'darwin') {
    return { meta: true, ctrl: false, alt: false, shift: false, code: 'Space' };
  }

  return { meta: false, ctrl: true, alt: false, shift: false, code: 'Space' };
}

const DEFAULT_CONNECTION_SEARCH_SHORTCUT = getDefaultConnectionSearchShortcut();
let connectionSearchShortcut = { ...DEFAULT_CONNECTION_SEARCH_SHORTCUT };
let connectionSearchShortcutBridgeReady = false;

function normalizeConnectionSearchShortcut(shortcut = DEFAULT_CONNECTION_SEARCH_SHORTCUT) {
  return {
    meta: !!(shortcut && shortcut.meta),
    ctrl: !!(shortcut && shortcut.ctrl),
    alt: !!(shortcut && shortcut.alt),
    shift: !!(shortcut && shortcut.shift),
    code: shortcut && typeof shortcut.code === 'string' && shortcut.code
      ? shortcut.code
      : DEFAULT_CONNECTION_SEARCH_SHORTCUT.code,
  };
}

function matchesConnectionSearchInput(input, shortcut) {
  if (!input || input.type !== 'keyDown') {
    return false;
  }

  const config = normalizeConnectionSearchShortcut(shortcut);
  const codeMatches = input.code === config.code
    || (config.code === 'Space' && (input.code === 'Space' || input.key === ' '));
  return (
    !!input.meta === config.meta
    && !!input.control === config.ctrl
    && !!input.alt === config.alt
    && !!input.shift === config.shift
    && codeMatches
  );
}

function setupConnectionSearchShortcutBridge(windowInstance) {
  if (!connectionSearchShortcutBridgeReady) {
    connectionSearchShortcutBridgeReady = true;
    ipcMain.on('connection-search:set-shortcut', (event, shortcut) => {
      if (!mainWindow || event.sender !== mainWindow.webContents) {
        return;
      }
      connectionSearchShortcut = normalizeConnectionSearchShortcut(shortcut);
    });
  }

  windowInstance.webContents.on('before-input-event', (event, input) => {
    if (!windowInstance.isFocused() || windowInstance.isDestroyed()) {
      return;
    }

    if (!matchesConnectionSearchInput(input, connectionSearchShortcut)) {
      return;
    }

    event.preventDefault();
    windowInstance.webContents.send('connection-search:toggle');
  });
}

const isAppQuitting = { value: false }; // Flag para evitar operaciones durante el cierre
let appCleanupInProgress = false;
let appCleanupCompleted = false;

// Los handlers SSH se registrarán después de definir findSSHConnection

// Manejador global para errores no capturados relacionados con ConPTY y SSH
process.on('uncaughtException', (error) => {
  if (error.message && (error.message.includes('AttachConsole failed') || error.message.includes('Malformed DISCONNECT packet'))) {
    console.warn('Error capturado y suprimido:', error.message);
    return; // Suprimir el error sin crashear la aplicación
  }

  // Para otros errores no capturados, mantener el comportamiento por defecto
  console.error('Error no capturado:', error);
  throw error;
});

// Manejador para promesas rechazadas no capturadas
process.on('unhandledRejection', (reason, promise) => {
  // Suprimir errores conocidos de ConPTY y SSH
  if (reason && reason.message && (reason.message.includes('AttachConsole failed') || reason.message.includes('Malformed DISCONNECT packet'))) {
    console.warn('Promise rechazada con error capturado y suprimido:', reason.message);
    return; // Suprimir el error
  }

  // Log detallado del error para debugging
  console.error('❌ Promise rechazada no manejada:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise?.toString?.() || 'unknown'
  });

  // En desarrollo, mostrar más información
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack completo:', reason?.stack || 'No stack available');
  }

  // Intentar prevenir crash: si es un error crítico, intentar cerrar limpiamente
  // NO hacer process.exit() aquí porque podría causar pérdida de datos
  // Solo loguear y dejar que el sistema maneje el error
});

// Store active SSH connections and their shells
const sshConnections = {};
// Estado persistente para stats de bastión (CPU, red, etc.) por tabId
const bastionStatsState = {};
// Cache for Welcome Messages (MOTD) to show them on every new tab.
const motdCache = {};
// Pool de conexiones SSH compartidas para evitar múltiples conexiones al mismo servidor
const sshConnectionPool = {};

// 🚀 OPTIMIZACIÓN: RDP Manager movido a src/main/handlers/rdp-handlers.js
// Se maneja completamente con lazy loading en ese módulo

// Guacamole services - guacdService ahora usa lazy loading via getGuacdService()
let guacamoleServer = null;
let guacamoleServerReadyAt = 0; // timestamp when guacamole-lite websocket server became ready
// Track active guacamole client connections
const activeGuacamoleConnections = new Set();
// Watchdog configurable para inactividad de guacd (ms). 0 = desactivado.
// Por defecto 2h (120 min) = sincronizado con el Umbral de actividad de sesión del frontend
let guacdInactivityTimeoutMs = 7200000;
// Flag para evitar inicialización múltiple
let guacamoleInitializing = false;
let guacamoleInitialized = false;
// Logs detallados (debug) para Guacamole/guacd
const DEBUG_GUACAMOLE = process.env.NODETERM_DEBUG_GUACAMOLE === '1';

// Sistema de throttling para conexiones SSH (ahora en módulo separado)
const connectionThrottle = require('./src/main/utils/connection-throttle');

// 🚀 OPTIMIZACIÓN: Limpieza automática diferida - se inicia después de ready-to-show
const ConnectionPoolCleaner = require('./src/main/services/ConnectionPoolCleaner');

// Helper function to parse 'df -P' command output
// Funciones de parsing movidas a main/utils/parsing-utils.js

/**
 * Obtiene o crea una clave secreta única para Guacamole
 * La clave se genera una vez por instalación y se guarda de forma segura
 */
async function getOrCreateGuacamoleSecretKey() {
  const crypto = require('crypto');
  const fs = require('fs').promises;
  const os = require('os');

  // Usar path persistente centralizado en AppData para compartir clave entre instancias
  // (app.getPath('userData') cambia en instancias secundarias)
  const configDir = getNodeTermDataDir();

  // Asegurar que el directorio existe
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch (e) { }

  const keyPath = path.join(configDir, 'guacamole-secret.key');

  try {
    // Intentar cargar clave existente
    const existingKey = await fs.readFile(keyPath);
    if (existingKey.length === 32) {
      console.log('🔐 [Guacamole] Clave secreta cargada desde archivo');
      return existingKey;
    } else {
      console.warn('⚠️ [Guacamole] Clave existente tiene tamaño incorrecto, generando nueva');
    }
  } catch (error) {
    // Archivo no existe o error al leerlo, generar nueva clave
    console.log('🔐 [Guacamole] Generando nueva clave secreta única...');
  }

  // Generar nueva clave aleatoria de 32 bytes (256 bits) para AES-256-CBC
  const newKey = crypto.randomBytes(32);

  try {
    // Guardar clave con permisos restrictivos (solo lectura para el usuario)
    await fs.writeFile(keyPath, newKey, { mode: 0o600 });
    console.log('✅ [Guacamole] Clave secreta única generada y guardada de forma segura');
  } catch (writeError) {
    console.error('❌ [Guacamole] Error guardando clave secreta:', writeError);
    // Continuar con la clave en memoria aunque no se haya guardado
  }

  return newKey;
}

// ✅ BUG FIX: Promise para sincronizar inicializaciones concurrentes
let guacamoleInitPromise = null;

/**
 * Inicializa servicios de Guacamole de forma asíncrona
 * ✅ OPTIMIZACIÓN: Refactorizada usando GuacamoleConfigService
 */
async function initializeGuacamoleServices() {
  // ✅ BUG FIX: Si ya hay una inicialización en curso, esperar a que termine
  if (guacamoleInitPromise) {
    console.log('✅ Servicios Guacamole ya inicializándose, esperando...');
    return await guacamoleInitPromise;
  }

  // Si ya está inicializado, retornar inmediatamente
  if (guacamoleInitialized) {
    console.log('✅ Servicios Guacamole ya inicializados, omitiendo...');
    return;
  }

  // Importar servicio de configuración
  const GuacamoleConfigService = require('./src/main/services/GuacamoleConfigService');

  // Importar utilidad de puertos
  const { findFreePort } = require('./src/main/utils/net-utils');

  // Crear nueva promesa de inicialización
  guacamoleInitPromise = (async () => {
    try {
      guacamoleInitializing = true;

      // 🚀 OPTIMIZACIÓN: Aplicar parche de GuacdClient justo antes de inicializar
      ensureGuacdClientPatched();
      console.log('🚀 Inicializando servicios Guacamole...');

      // Cargar método preferido persistido antes de inicializar
      try {
        const pref = await loadPreferredGuacdMethod();
        if (pref) {
          getGuacdService().setPreferredMethod(pref);
        }
      } catch { }

      // Inicializar GuacdService
      const guacdReady = await getGuacdService().initialize();

      if (!guacdReady) {
        console.warn('⚠️ No se pudo inicializar guacd. RDP Guacamole no estará disponible.');
        guacamoleInitializing = false;
        return;
      }

      // Esperar a que guacd esté realmente accesible
      const guacdStatus = getGuacdService().getStatus();
      await GuacamoleConfigService.waitForGuacdReady(getGuacdService(), guacdStatus);

      // Encontrar puerto libre con reintentos robustos
      // Intentar vincular directamente el servidor Guacamole a puertos sucesivos
      let websocketPort = 8081;
      let serverCreated = false;
      const MAX_RETRIES = 20;

      const guacdOptions = getGuacdService().getGuacdOptions();
      // ✅ SEGURIDAD: Obtener o crear clave secreta única por instalación
      const SECRET_KEY = await getOrCreateGuacamoleSecretKey();

      // Desactivar watchdogs de inactividad para evitar cierres falsos
      process.env.DISABLE_GUACD_WATCHDOG = '1';

      const clientOptions = {
        crypt: {
          cypher: 'AES-256-CBC',
          key: SECRET_KEY
        },
        log: {
          level: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'NORMAL'
        },
        maxInactivityTime: 0
      };

      // Configurar timeout de inactividad
      guacdInactivityTimeoutMs = await GuacamoleConfigService.getConfiguredInactivityTimeout(
        loadGuacdInactivityTimeout,
        guacdInactivityTimeoutMs
      );

      // Bucle de reintentos para encontrar puerto libre
      const GuacamoleLite = getGuacamoleLite();
      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          websocketPort = 8081 + i;
          const websocketOptions = { port: websocketPort };

          if (DEBUG_GUACAMOLE) console.log(`🔄 Intentando iniciar WebSocket en puerto ${websocketPort} (intento ${i + 1}/${MAX_RETRIES})`);

          guacamoleServer = new GuacamoleLite(websocketOptions, guacdOptions, clientOptions);

          // Verificar si se vinculó correctamente añadiendo un handler de error temporal
          // (GuacamoleLite puede emitir errores asíncronos en el socket)
          await new Promise((resolve, reject) => {
            const errorHandler = (err) => {
              if (err.code === 'EADDRINUSE') {
                reject(err);
              }
            };

            // Hack: Acceder al WebSocketServer interno si es posible, o esperar un tick
            // Como GuacamoleLite no expone evento 'listening' fácil, confiamos en que si no falla en 100ms, está bien.
            // O mejor, intentamos capturar el error del servidor interno.
            if (guacamoleServer && guacamoleServer.webSocketServer) {
              guacamoleServer.webSocketServer.on('error', errorHandler);
            }
            // Si el constructor lanza error sincrónico, ya estaría en catch.
            // Esperamos un momento para ver si hay error asíncrono de binding.
            setTimeout(() => {
              if (guacamoleServer && guacamoleServer.webSocketServer) {
                guacamoleServer.webSocketServer.removeListener('error', errorHandler);
              }
              resolve();
            }, 100);
          });

          serverCreated = true;
          console.log(`✅ Servidor Guacamole-lite iniciado en puerto ${websocketPort}`);
          break; // Éxito
        } catch (error) {
          if (error.code === 'EADDRINUSE') {
            console.log(`⚠️ Puerto ${websocketPort} ocupado, probando siguiente...`);
            guacamoleServer = null; // Limpiar para el GC
            continue;
          } else {
            console.error('❌ Error no relacionado con puerto:', error);
            throw error; // Re-lanzar si no es puerto ocupado
          }
        }
      }

      if (!serverCreated) {
        throw new Error(`No se pudo encontrar un puerto libre entre 8081 y ${8081 + MAX_RETRIES}`);
      }

      // Reconstituyendo websocketOptions para el resto del código
      const websocketOptions = { port: websocketPort };

      if (DEBUG_GUACAMOLE) {
        console.log('🌐 [initializeGuacamoleServices] Servidor Guacamole-lite creado:', !!guacamoleServer);
        console.log('🌐 [initializeGuacamoleServices] Servidor tiene port:', guacamoleServer.port || 'no definido');
      }

      // Configurar eventos del servidor usando el servicio
      GuacamoleConfigService.setupGuacamoleServerEvents(
        guacamoleServer,
        activeGuacamoleConnections,
        guacdInactivityTimeoutMs
      );

      guacamoleServerReadyAt = Date.now();
      guacamoleInitialized = true;
      guacamoleInitializing = false;

      console.log('✅ Servicios Guacamole inicializados correctamente');
      console.log(`🌐 Servidor WebSocket: localhost:${websocketOptions.port}`);
      console.log(`🔧 GuacD: ${guacdOptions.host}:${guacdOptions.port}`);

      if (DEBUG_GUACAMOLE) {
        console.log(`📊 [initializeGuacamoleServices] guacamoleServer asignado:`, !!guacamoleServer);
      }

      return true;
    } catch (error) {
      console.error('❌ Error inicializando servicios Guacamole:', error);
      guacamoleInitializing = false;
      throw error;
    } finally {
      guacamoleInitPromise = null;
    }
  })();

  return await guacamoleInitPromise;
}

// === Preferencias Guacd (persistencia en userData) ===
// Funciones movidas a src/main/utils/file-utils.js
const {
  loadPreferredGuacdMethod,
  savePreferredGuacdMethod,
  loadGuacdInactivityTimeout,
  saveGuacdInactivityTimeout
} = require('./src/main/utils/file-utils');

// Handlers de Guacamole movidos a src/main/handlers/guacamole-handlers.js

// 🚀 OPTIMIZACIÓN: Splash inline para evitar I/O del disco en arranque frío
// Esto elimina el delay de 13+ segundos al cargar desde disco en primer arranque
const getSplashHtml = (style) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      overflow: hidden;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
    }
    
    /* COMMON LAYOUT */
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      z-index: 2;
      padding: 24px;
      width: 100%;
      max-width: 400px;
    }
    
    .logo-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
    }
    
    .logo-wrapper {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .logo-icon {
      width: 80px;
      height: 80px;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      transition: all 0.3s ease;
    }
    
    .brand {
      font-weight: 700;
      font-size: 28px;
      letter-spacing: -0.5px;
      margin-top: 4px;
      transition: all 0.3s ease;
    }
    
    .tagline {
      font-size: 11px;
      letter-spacing: 1px;
      font-weight: 500;
      text-transform: uppercase;
      opacity: 0.6;
    }

    /* PROGRESS BAR */
    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      margin-top: 8px;
    }
    
    .progress-container {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      position: relative;
    }
    
    .progress-bar {
      height: 100%;
      width: 0%;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .progress-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      opacity: 0.8;
    }
    
    .status {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .status-icon {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid transparent;
      animation: spin 0.7s linear infinite;
    }
    
    .progress-percent {
      font-weight: bold;
    }

    /* GRID & DECORATIONS */
    .cyber-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      opacity: 0;
      transition: opacity 0.5s ease;
    }

    /* HUD FRAME & TICKER */
    .hud-frame {
      display: none;
      width: 100%;
      height: 115px;
      border: 1px solid transparent;
      position: relative;
      padding: 6px 12px;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 10px;
      overflow: hidden;
      margin-top: 4px;
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    }
    
    .terminal-ticker {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
      scrollbar-width: none;
    }
    .terminal-ticker::-webkit-scrollbar { display: none; }
    
    .ticker-line {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.85;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ==========================================
       THEMES DEFINITIONS
       ========================================== */

    /* 1. CLASSIC THEME */
    body.theme-classic {
      background: linear-gradient(180deg, #1a2332 0%, #0f1722 50%, #0a0f18 100%);
      color: #e3f2fd;
    }
    body.theme-classic .logo-icon {
      background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
      box-shadow: 0 0 0 1px rgba(100, 116, 139, 0.3), inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.3);
    }
    body.theme-classic .prompt { color: #4ade80; font-size: 22px; font-weight: bold; }
    body.theme-classic .code { color: #64748b; font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-classic .brand { color: #ffffff; }
    body.theme-classic .progress-container { background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(59, 130, 246, 0.2); }
    body.theme-classic .progress-bar { background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%); }
    body.theme-classic .status-icon { border: 2px solid rgba(59, 130, 246, 0.4); border-top-color: #3b82f6; }

    /* 2. HOLOGRAM HUD THEME */
    body.theme-hologram-hud {
      background: #06040d;
      color: #bbf7ff;
    }
    body.theme-hologram-hud .cyber-grid {
      opacity: 1;
      background-image: 
        linear-gradient(rgba(0, 242, 254, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 242, 254, 0.03) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    body.theme-hologram-hud .logo-icon {
      background: rgba(13, 10, 31, 0.8);
      border: 1px solid #00f2fe;
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.3), inset 0 0 10px rgba(0, 242, 254, 0.2);
    }
    body.theme-hologram-hud .prompt { color: #00f2fe; font-size: 22px; font-weight: bold; text-shadow: 0 0 8px rgba(0, 242, 254, 0.6); }
    body.theme-hologram-hud .code { color: #9d4edd; font-size: 16px; font-weight: bold; text-shadow: 0 0 8px rgba(157, 78, 221, 0.6); margin-top: 2px; }
    body.theme-hologram-hud .brand { color: #00f2fe; text-shadow: 0 0 12px rgba(0, 242, 254, 0.5); }
    body.theme-hologram-hud .tagline { color: #9d4edd; text-shadow: 0 0 8px rgba(157, 78, 221, 0.4); }
    body.theme-hologram-hud .hud-frame {
      display: block;
      border: 1px solid rgba(0, 242, 254, 0.2);
      background: rgba(0, 242, 254, 0.02);
      color: #00f2fe;
    }
    body.theme-hologram-hud .progress-container { background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.3); }
    body.theme-hologram-hud .progress-bar { background: #00f2fe; box-shadow: 0 0 8px #00f2fe; }
    body.theme-hologram-hud .status-icon { border: 2px solid rgba(0, 242, 254, 0.2); border-top-color: #00f2fe; }

    /* 3. SYNTHWAVE OUTRUN THEME */
    body.theme-synthwave-outrun {
      background: #0f021a;
      color: #ff9de2;
    }
    body.theme-synthwave-outrun .cyber-grid {
      opacity: 1;
      background-image: linear-gradient(rgba(255, 0, 127, 0.04) 1px, transparent 1px);
      background-size: 100% 12px;
    }
    body.theme-synthwave-outrun .logo-icon {
      background: rgba(20, 2, 33, 0.8);
      border: 1px solid #ff007f;
      box-shadow: 0 0 15px rgba(255, 0, 127, 0.4), inset 0 0 8px rgba(255, 0, 127, 0.2);
    }
    body.theme-synthwave-outrun .prompt { color: #ff007f; font-size: 22px; font-weight: bold; text-shadow: 0 0 8px rgba(255, 0, 127, 0.6); }
    body.theme-synthwave-outrun .code { color: #ffea00; font-size: 16px; font-weight: bold; text-shadow: 0 0 8px rgba(255, 234, 0, 0.6); margin-top: 2px; }
    body.theme-synthwave-outrun .brand { color: #ff007f; text-shadow: 0 0 12px rgba(255, 0, 127, 0.5); }
    body.theme-synthwave-outrun .tagline { color: #ffea00; text-shadow: 0 0 8px rgba(255, 234, 0, 0.4); }
    body.theme-synthwave-outrun .hud-frame {
      display: block;
      border: 1px solid rgba(255, 0, 127, 0.2);
      background: rgba(255, 0, 127, 0.02);
      color: #ff9de2;
    }
    body.theme-synthwave-outrun .progress-container { background: rgba(255, 0, 127, 0.08); border: 1px solid rgba(255, 0, 127, 0.3); }
    body.theme-synthwave-outrun .progress-bar { background: linear-gradient(90deg, #ff007f 0%, #ffea00 100%); box-shadow: 0 0 8px #ff007f; }
    body.theme-synthwave-outrun .status-icon { border: 2px solid rgba(255, 0, 127, 0.2); border-top-color: #ff007f; }

    /* 4. TERMINAL MINIMALIST THEME */
    body.theme-terminal-minimalist {
      background: #000000;
      color: #00ff66;
      font-family: 'Fira Code', 'Courier New', monospace;
    }
    body.theme-terminal-minimalist .logo-icon {
      background: #000000;
      border: 1px solid #00ff66;
      box-shadow: 0 0 10px rgba(0, 255, 102, 0.2);
    }
    body.theme-terminal-minimalist .prompt { color: #00ff66; font-size: 22px; font-weight: bold; text-shadow: 0 0 6px rgba(0, 255, 102, 0.5); }
    body.theme-terminal-minimalist .code { color: #008833; font-size: 16px; font-weight: bold; margin-top: 2px; }
    body.theme-terminal-minimalist .brand { color: #00ff66; text-shadow: 0 0 8px rgba(0, 255, 102, 0.4); }
    body.theme-terminal-minimalist .tagline { color: #00aa44; }
    body.theme-terminal-minimalist .hud-frame {
      display: block;
      border: 1px solid rgba(0, 255, 102, 0.2);
      background: rgba(0, 255, 102, 0.01);
      color: #00ff66;
    }
    body.theme-terminal-minimalist .progress-container { background: #000000; border: 1px solid rgba(0, 255, 102, 0.4); }
    body.theme-terminal-minimalist .progress-bar { background: #00ff66; box-shadow: 0 0 6px #00ff66; }
    body.theme-terminal-minimalist .status-icon { border: 2px solid rgba(0, 255, 102, 0.2); border-top-color: #00ff66; }
  </style>
</head>
<body class="theme-${style}">
  <div class="cyber-grid"></div>
  <div class="container">
    <div class="logo-section">
      <div class="logo-wrapper">
        <div class="logo-icon">
          <span class="prompt">&gt;_</span>
          <span class="code">&lt;/&gt;_</span>
        </div>
      </div>
      <div>
        <div class="brand">NodeTerm</div>
        <div class="tagline">Secure. Reliable. Connected.</div>
      </div>
    </div>
    
    <div class="hud-frame">
      <div class="terminal-ticker" id="ticker">
        <div class="ticker-line">&gt;&gt; BOOTING NODETERM SHELL PROTOCOLS...</div>
      </div>
    </div>

    <div class="progress-section">
      <div class="progress-container">
        <div class="progress-bar" id="progressBar"></div>
      </div>
      <div class="progress-row">
        <div class="status" id="status">
          <div class="status-icon"></div>
          <span id="statusText">Iniciando...</span>
        </div>
        <div class="progress-percent" id="progressPercent">0%</div>
      </div>
    </div>
  </div>
</body>
</html>`;

function createWindow() {
  logTiming('createWindow() iniciado');

  const { loadPreferredSplashStyleSync } = require('./src/main/utils/file-utils');
  const style = loadPreferredSplashStyleSync();

  // 🚀 SPLASH PRIMERO: antes que la main para no ver ni un frame en negro
  let splashWindow = null;
  const closeSplash = () => {
    try {
      if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null; }
    } catch (_) { }
  };
  const setSplashStep = (sw, stepIndex, done, text) => {
    if (!sw || sw.isDestroyed()) return;
    // Calcular porcentaje basado en el paso (1-4 = 25%, 50%, 75%, 100%)
    const percent = stepIndex * 25;
    sw.webContents.executeJavaScript(
      `(function(){
        var bar = document.getElementById('progressBar');
        var pct = document.getElementById('progressPercent');
        var txt = document.getElementById('statusText');
        if(bar) bar.style.width = '${percent}%';
        if(pct) pct.textContent = '${percent}%';
        if(txt) txt.textContent = ${JSON.stringify(text)};
        
        var ticker = document.getElementById('ticker');
        if (ticker) {
          var line = document.createElement('div');
          line.className = 'ticker-line';
          line.textContent = '>> ' + ${JSON.stringify(text.toUpperCase())} + '... ' + (${done} ? 'OK' : 'IN_PROGRESS');
          ticker.appendChild(line);
          ticker.scrollTop = ticker.scrollHeight;
        }
      })();`
    ).catch(() => { });
  };
  try {
    const d = screen.getPrimaryDisplay();
    const r = d.workArea || d.bounds;
    const W = 420, H = 400;
    const x = Math.round(r.x + (r.width - W) / 2);
    const y = Math.round(r.y + (r.height - H) / 2);
    splashWindow = new BrowserWindow({
      x, y, width: W, height: H,
      frame: false,
      transparent: false,
      backgroundColor: style === 'terminal-minimalist' ? '#000000' : (style === 'hologram-hud' ? '#06040d' : (style === 'synthwave-outrun' ? '#0f021a' : '#0a0f18')),
      show: true,
      resizable: false,
      alwaysOnTop: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    // 🚀 OPTIMIZACIÓN: loadURL con data URI es instantáneo (no I/O de disco)
    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSplashHtml(style))}`);
    splashWindow.focus();
  } catch (e) {
    console.warn('[SPLASH] No se pudo crear ventana de splash:', e?.message);
  }

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 200,
    minHeight: 100,
    title: 'NodeTerm',
    frame: false,
    show: false,
    transparent: false,
    backgroundColor: '#0a0f1f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
      v8CacheOptions: 'code',
      enableBlinkFeatures: 'PreciseMemoryInfo'
    }
  });
  logTiming('BrowserWindow creado');
  setupConnectionSearchShortcutBridge(mainWindow);

  // Cierre instantaneo al usar la X de la ventana.
  mainWindow.on('close', () => {
    isAppQuitting.value = true;
    app.exit(0);
  });

  // 🔒 CRÍTICO: Registrar handlers de seguridad ANTES de que la ventana cargue
  // Esto asegura que security:get-master-key esté disponible cuando el renderer arranque
  try {
    const { registerCriticalHandlers } = require('./src/main/handlers');
    registerCriticalHandlers({
      mainWindow,
      packageJson,
      disconnectAllGuacamoleConnections,
      sshConnections,
      cleanupOrphanedConnections,
      isAppQuitting,
      anythingLLMService: createServiceProxy(getAnythingLLMService),
      openWebUIService: createServiceProxy(getOpenWebUIService),
      libreChatService: createServiceProxy(getLibreChatService),
      agentZeroService: createServiceProxy(getAgentZeroService),
      openClawService: createServiceProxy(getOpenClawService),
      openNotebookService: createServiceProxy(getOpenNotebookService),
      // Guacamole dependencies for critical phase registration
      guacdService: getGuacdService(),
      guacamoleServer,
      guacamoleServerReadyAt,
      sendToRenderer,
      guacdInactivityTimeoutMs,
      getGuacamoleServer: () => guacamoleServer,
      getGuacamoleServerReadyAt: () => guacamoleServerReadyAt,
      getOrCreateGuacamoleSecretKey: getOrCreateGuacamoleSecretKey,
      isGuacamoleInitializing: () => guacamoleInitializing,
      isGuacamoleInitialized: () => guacamoleInitialized,
      getGuacamoleWebSocketPort: () => (guacamoleServer ? guacamoleServer.port : null)
    });
  } catch (err) {
    console.error('❌ Error registrando handlers críticos:', err?.message || err);
    if (err?.stack) console.error(err.stack);
  }

  // 🚀 OPTIMIZACIÓN: Precalentamiento de guacd DIFERIDO hasta después de ready-to-show
  // Se ejecutará en initializeServicesAfterShow() para no bloquear el arranque

  // 🔧 ESPERAR A QUE WEBPACK TERMINE DE COMPILAR EN DESARROLLO
  // Función para verificar si el archivo compilado existe
  async function waitForWebpackBuild(maxWaitMs = 30000) {
    if (process.env.NODE_ENV !== 'development') {
      return true; // En producción, el archivo debería existir siempre
    }

    const distPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(distPath)) {
      return true;
    }
    const startTime = Date.now();

    return new Promise((resolve) => {
      function checkFile() {
        try {
          if (fs.existsSync(distPath)) {
            console.log('✅ Archivo compilado encontrado, cargando ventana...');
            resolve(true);
            return;
          }

          const elapsed = Date.now() - startTime;
          if (elapsed >= maxWaitMs) {
            console.warn(`⚠️ Timeout esperando compilación de webpack (${maxWaitMs}ms), intentando cargar de todos modos...`);
            resolve(false);
            return;
          }

          // Revisar cada 500ms
          setTimeout(checkFile, 500);
        } catch (error) {
          console.error('❌ Error verificado archivo compilado:', error.message);
          resolve(false);
        }
      }

      // Empezar a verificar inmediatamente
      checkFile();
    });
  }

  // Cargar la ventana esperando a que webpack termine
  (async () => {
    // 🚀 OPTIMIZACIÓN: No bloquear la carga principal esperando al splash
    // El splash se actualiza de forma asíncrona cuando esté listo
    const splashReady = new Promise((resolve) => {
      if (!splashWindow || splashWindow.isDestroyed()) { resolve(); return; }
      splashWindow.webContents.once('did-finish-load', resolve);
      // Fallback más largo por si el splash tarda (no bloquea la carga principal)
      setTimeout(resolve, 2000);
    });

    // Actualizar splash de forma asíncrona (no bloquear)
    splashReady.then(() => {
      setSplashStep(splashWindow, 1, true, 'Iniciando NodeTerm');
      setSplashStep(splashWindow, 2, false, process.env.NODE_ENV === 'development' ? 'Esperando compilación...' : 'Preparando ventana...');
    });

    // Continuar inmediatamente sin esperar al splash
    await waitForWebpackBuild();

    // Actualizar splash cuando esté listo
    splashReady.then(() => {
      setSplashStep(splashWindow, 2, true, 'Preparando ventana');
      setSplashStep(splashWindow, 3, false, 'Cargando interfaz...');
    });

    const urlToLoad = url.format({
      pathname: path.join(__dirname, 'dist', 'index.html'),
      protocol: 'file:',
      slashes: true
    });

    try {
      logTiming('Iniciando loadURL...');
      await mainWindow.loadURL(urlToLoad);
      logTiming('loadURL completado');
    } catch (error) {
      console.error('❌ Error cargando ventana:', error.message);
      closeSplash();
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      }, 2000);
    }
  })();

  let hasShownMainWindow = false;
  const showMainWindow = () => {
    if (hasShownMainWindow) return;
    hasShownMainWindow = true;
    logTiming('🎯 Showing main window - React App ready');
    if (splashWindow && !splashWindow.isDestroyed()) {
      try { splashWindow.setAlwaysOnTop(false); } catch (_) {}
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      applyWindowCornersOnStartup(mainWindow);
    }
    closeSplash();

    // 🚀 OPTIMIZACIÓN: Inicializar servicios pesados DESPUÉS de mostrar la ventana
    // Usar setImmediate para ejecutar en el siguiente tick del event loop
    setImmediate(() => {
      initializeServicesAfterShow().catch(err => {
        console.error('❌ [POST-SHOW] Error en initializeServicesAfterShow:', err);
      });
    });
  };

  // Escuchar evento de sincronización del React renderer
  ipcMain.once('app:renderer-ready', () => {
    showMainWindow();
  });

  // Mostrar ventana cuando esté lista para mostrar (con timer de seguridad fallback)
  mainWindow.once('ready-to-show', () => {
    logTiming('🎯 ready-to-show - VENTANA LISTA (Esperando renderer o timeout)');
    
    // Timer de seguridad fallback (5 segundos) por si el renderer tiene un error fatal o tarda demasiado
    setTimeout(() => {
      showMainWindow();
    }, 5000);
  });

  // 🚀 OPTIMIZACIÓN: Función para inicializar servicios pesados después del arranque
  async function initializeServicesAfterShow() {
    // Inicializar Guacamole en background (no bloquea la UI)
    initializeGuacamoleServices().catch((error) => {
      console.error('❌ [POST-SHOW] Error en inicialización de Guacamole:', error);
    });

    // 🚀 OPTIMIZACIÓN: Registrar handlers SECUNDARIOS después de que la ventana sea visible
    // Estos handlers no son críticos para el arranque y pueden esperar
    try {
      const { registerSecondaryHandlers, registerSSHTunnelHandlers } = require('./src/main/handlers');

      // Recrear dependencias aquí ya que getHandlerDependencies está en otro scope
      const handlerDependencies = {
        mainWindow,
        findSSHConnection,
        disconnectAllGuacamoleConnections,
        guacdService: getGuacdService(),
        guacamoleServer,
        guacamoleServerReadyAt,
        sendToRenderer,
        guacdInactivityTimeoutMs,
        anythingLLMService: createServiceProxy(getAnythingLLMService),
        openWebUIService: createServiceProxy(getOpenWebUIService),
        libreChatService: createServiceProxy(getLibreChatService),
        agentZeroService: createServiceProxy(getAgentZeroService),
        openClawService: createServiceProxy(getOpenClawService),
        openNotebookService: createServiceProxy(getOpenNotebookService),
        packageJson,
        sshConnections,
        sshConnectionPool,
        cleanupOrphanedConnections,
        isAppQuitting,
        getGuacamoleServer: () => guacamoleServer,
        getGuacamoleServerReadyAt: () => guacamoleServerReadyAt,
        getOrCreateGuacamoleSecretKey: getOrCreateGuacamoleSecretKey,
        isGuacamoleInitializing: () => guacamoleInitializing,
        isGuacamoleInitialized: () => guacamoleInitialized
      };

      // Registrar handlers secundarios (System Services, RDP, MCP, Nextcloud, SSH, etc.)
      registerSecondaryHandlers(handlerDependencies);

      // Registrar handlers de túnel SSH (último paso)
      registerSSHTunnelHandlers(handlerDependencies);
      console.log('✅ [POST-SHOW] Todos los handlers secundarios registrados');
    } catch (error) {
      console.error('❌ [POST-SHOW] Error registrando handlers:', error);
      console.error('❌ Stack:', error.stack);
    }
  }

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    closeSplash();
  });

  // 🛡️ PROTECCIÓN: Capturar errores de renderer para evitar crashes silenciosos
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('🔴 Renderer process crashed:', details);

    // Si el crash fue por memoria, mostrar mensaje al usuario
    if (details.reason === 'oom' || details.reason === 'killed') {
      const { dialog } = require('electron');
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Error de Memoria',
        message: 'La aplicación se quedó sin memoria',
        detail: 'Esto puede ocurrir cuando el modelo de IA genera respuestas muy largas. La aplicación se recargará automáticamente.\n\nConsejo: Intenta hacer preguntas más específicas o divide las tareas grandes en partes más pequeñas.',
        buttons: ['Recargar']
      }).then(() => {
        if (mainWindow) {
          mainWindow.reload();
        }
      });
    }
  });

  mainWindow.removeMenu();

  // Menú de desarrollo para abrir DevTools
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'editMenu' },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://electronjs.org');
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 🚀 OPTIMIZACIÓN: Establecer dependencias de servicios DESPUÉS de did-finish-load
  // Esto permite que la ventana se muestre más rápido
  mainWindow.webContents.once('did-finish-load', () => {
    logTiming('did-finish-load - HTML/JS cargado');
    setSplashStep(splashWindow, 3, true, 'Cargando interfaz');
    setSplashStep(splashWindow, 4, true, 'Listo');
    // Diferir configuración de servicios para no bloquear el render inicial
    setImmediate(() => {
      try {
        WSL.setMainWindow(mainWindow);
        WSL.setDependencies({
          mainWindow,
          isAppQuitting
        });

        PowerShell.setDependencies({
          mainWindow,
          getPty,
          alternativePtyConfig,
          SafeWindowsTerminal,
          isAppQuitting
        });

        UbuntuProcessManager.setDependencies({
          mainWindow,
          getPty,
          isAppQuitting
        });

        WSLDistroProcessManager.setDependencies({
          mainWindow,
          getPty,
          isAppQuitting
        });

        Cygwin.setMainWindow(mainWindow);
        Claude.setDependencies({
          mainWindow,
          getPty,
          isAppQuitting,
          getClaudeConfig
        });
        OpenCode.setDependencies({
          mainWindow,
          getPty,
          isAppQuitting,
          getOpenCodeConfig
        });
        GeminiCli.setDependencies({
          mainWindow,
          getPty,
          isAppQuitting,
          getGeminiCliConfig
        });
        CodexCli.setDependencies({
          mainWindow,
          getPty,
          isAppQuitting,
          getCodexCliConfig
        });
        AntigravityCli.setDependencies({
          mainWindow,
          getPty,
          isAppQuitting,
          getAntigravityCliConfig
        });
        HermesCli.setDependencies({
          mainWindow,
          getPty,
          isAppQuitting,
          getHermesCliConfig
        });
        const docker = getDocker();
        if (docker && docker.setMainWindow) {
          docker.setMainWindow(mainWindow);
        }
      } catch (err) {
        console.error('[MAIN] Error estableciendo dependencias de servicios:', err);
      }
    });

    // Servicio de actualizaciones DIFERIDO 5s
    setTimeout(() => {
      const updateService = getUpdateServiceLazy();
      updateService.setMainWindow(mainWindow);
      updateService.startAutoCheck();
    }, 5000);
  });

  // Registrar todos los handlers después de crear la ventana
  try {
    // 🚀 OPTIMIZACIÓN: Registrar handlers de grabación de forma diferida
    setTimeout(() => ensureRecordingHandlersRegistered(), 200);

    // Handlers simples para auditoría
    ipcMain.handle('app:get-user-data-path', () => {
      return app.getPath('userData');
    });

    ipcMain.handle('fs:mkdir-recursive', async (event, path) => {
      try {
        // ✅ VALIDACIÓN CRÍTICA: Validar input antes de procesar
        if (!path || typeof path !== 'string' || path.trim() === '') {
          return { success: false, error: 'path inválido o vacío' };
        }
        const fs = require('fs').promises;
        await fs.mkdir(path.trim(), { recursive: true });
        return { success: true };
      } catch (error) {
        return { success: false, error: error?.message || 'Error desconocido al crear directorio' };
      }
    });

    ipcMain.handle('shell:open-path', async (event, path) => {
      try {
        // ✅ VALIDACIÓN CRÍTICA: Validar input antes de procesar
        if (!path || typeof path !== 'string' || path.trim() === '') {
          return { success: false, error: 'path inválido o vacío' };
        }
        const { shell } = require('electron');
        await shell.openPath(path.trim());
        return { success: true };
      } catch (error) {
        return { success: false, error: error?.message || 'Error desconocido al abrir path' };
      }
    });

    // Preparar dependencias para los handlers (función helper para reutilizar)
    const getHandlerDependencies = () => ({
      mainWindow,
      findSSHConnection,
      disconnectAllGuacamoleConnections,
      guacdService: getGuacdService(),
      guacamoleServer,
      guacamoleServerReadyAt,
      sendToRenderer,
      guacdInactivityTimeoutMs,
      anythingLLMService: getAnythingLLMService(),
      openWebUIService: getOpenWebUIService(),
      libreChatService: getLibreChatService(),
      agentZeroService: getAgentZeroService(),
      openClawService: getOpenClawService(),
      openNotebookService: getOpenNotebookService(),
      packageJson,
      sshConnections,
      sshConnectionPool,
      cleanupOrphanedConnections,
      isAppQuitting,
      getGuacamoleServer: () => guacamoleServer,
      getGuacamoleServerReadyAt: () => guacamoleServerReadyAt,
      getGuacamoleWebSocketPort: () => (guacamoleServer ? guacamoleServer.port : null),
      getOrCreateGuacamoleSecretKey: getOrCreateGuacamoleSecretKey,
      isGuacamoleInitializing: () => guacamoleInitializing,
      isGuacamoleInitialized: () => guacamoleInitialized
    });

    // 🔒 NOTA: Los handlers CRÍTICOS ya se registran al inicio de createWindow() (línea 879)
    // Los handlers SECUNDARIOS se registran después de ready-to-show en initializeServicesAfterShow()
    // Por lo tanto, registerAllHandlers() ya NO es necesario aquí

    // 🚀 OPTIMIZACIÓN: Guacamole se inicializa en initializeServicesAfterShow()
    // después de que la ventana se muestre, para no bloquear el arranque

  } catch (err) {
    console.error('[MAIN] Error registrando handlers:', err);
  }
}

// Funciones de WSL movidas a main/services/WSLService.js

// ✅ OPTIMIZACIÓN: Manejadores MCP movidos a mcp-handlers.js
// Se registran automáticamente desde registerSecondaryHandlers() en handlers/index.js
// NO es necesario registrarlos aquí para evitar duplicados

// Cache para evitar logs repetidos de WSL
let wslDetectionLogged = false;
let wslDetectionResultLogged = false;

// IPC handler para detectar todas las distribuciones WSL
ipcMain.handle('detect-wsl-distributions', async () => {
  if (!wslDetectionLogged) {
    console.log('🚀 [MAIN] Detectando distribuciones WSL...');
    wslDetectionLogged = true;
  }

  try {
    const distributions = await WSL.detectAllWSLDistributions();
    if (!wslDetectionResultLogged) {
      console.log('✅ [MAIN] Detección completada:', distributions.length, 'distribuciones encontradas');
      if (distributions.length > 0) {
        distributions.forEach(distro => console.log(`  - ${distro.name} (${distro.label}, ${distro.category})`));
      }
      wslDetectionResultLogged = true;
    }
    return distributions;
  } catch (error) {
    console.error('❌ [MAIN] Error en detección de distribuciones WSL:', error);
    return [];
  }
});

// Mantener compatibilidad con el handler anterior para Ubuntu
ipcMain.handle('detect-ubuntu-availability', async () => {
  try {
    const distributions = await WSL.detectAllWSLDistributions();
    return distributions;
  } catch (error) {
    console.error('❌ Error en detección de distribuciones WSL:', error);
    return [];
  }
});

// Handler para detectar disponibilidad de Cygwin embebido
ipcMain.handle('cygwin:detect', async () => {
  try {
    const result = Cygwin.CygwinHandlers.detect();
    return result;
  } catch (error) {
    console.error('❌ Error detecting Cygwin:', error);
    return { available: false, path: null, error: error.message };
  }
});

// Handler para listar contenedores Docker

ipcMain.handle('docker:list', async () => {
  try {
    const docker = getDocker();
    if (!docker || !docker.DockerHandlers) {
      return { success: false, available: false, containers: [], error: 'Docker service not initialized' };
    }
    const result = docker.DockerHandlers.list();
    return result;
  } catch (error) {
    console.error('❌ Error listing Docker containers:', error.message);
    return { success: false, available: false, containers: [], error: error.message };
  }
});


// Variable global para controlar instalación de Cygwin
let cygwinInstalling = false;

// Handler para instalar Cygwin portable automáticamente
// NOTA: Actualmente usa descarga de paquete pre-empaquetado
// Para crear el paquete: .\scripts\package-cygwin.ps1
ipcMain.handle('cygwin:install', async () => {
  // Prevenir múltiples instalaciones simultáneas
  if (cygwinInstalling) {
    console.log('⚠️ Instalación de Cygwin ya en progreso, ignorando solicitud duplicada');
    return {
      success: false,
      error: 'Ya hay una instalación de Cygwin en progreso. Por favor espera a que termine.'
    };
  }

  try {
    cygwinInstalling = true;

    // TODO: Cambiar a CygwinDownloader cuando el paquete esté en GitHub
    // Por ahora, ejecutar script local para testing
    console.log('🚀 Iniciando instalación automática de Cygwin...');

    const { spawn } = require('child_process');
    const scriptPath = path.join(app.getAppPath(), 'scripts', 'create-cygwin-portable.ps1');

    return new Promise((resolve) => {
      const ps = spawn('powershell.exe', [
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath,
        '-OutputDir', path.join(app.getAppPath(), 'resources', 'cygwin64')
      ], {
        stdio: 'inherit',  // Mostrar salida en consola
        windowsHide: false
      });

      ps.on('close', (code) => {
        cygwinInstalling = false;
        if (code === 0) {
          console.log('✅ Cygwin instalado correctamente');
          resolve({ success: true });
        } else {
          console.error('❌ Error en instalación de Cygwin. Código:', code);
          resolve({
            success: false,
            error: `Instalación falló con código ${code}`
          });
        }
      });

      ps.on('error', (error) => {
        cygwinInstalling = false;
        console.error('❌ Error ejecutando script:', error);
        resolve({
          success: false,
          error: `Error ejecutando PowerShell: ${error.message}`
        });
      });
    });

  } catch (error) {
    cygwinInstalling = false;
    console.error('❌ Error en handler cygwin:install:', error);
    return {
      success: false,
      error: error.message + '\n\nPor favor, ejecuta manualmente:\n.\\scripts\\create-cygwin-portable.ps1'
    };
  }
});

app.on('ready', () => {
  logTiming('app ready event');
  sshKnownHostsService.setUserDataPath(app.getPath('userData'));
  try {
    const { registerBootstrapIpcHandlers } = require('./src/main/handlers');
    registerBootstrapIpcHandlers();
    logTiming('Bootstrap IPC handlers registrados');
  } catch (err) {
    console.error('❌ Error registrando bootstrap IPC handlers:', err?.message || err);
    if (err?.stack) console.error(err.stack);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ============================================================================
// POWER MONITOR: Detectar suspensión/reanudación del sistema
// Cuando Windows apaga las pantallas o entra en suspensión, WSL puede suspenderse
// Al reanudar, notificamos al frontend para que verifique/reconecte sesiones RDP
// ============================================================================
let systemSuspendedAt = null;

powerMonitor.on('suspend', () => {
  console.log('💤 [PowerMonitor] Sistema entrando en suspensión...');
  systemSuspendedAt = Date.now();

  // Notificar al renderer que el sistema se va a suspender
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('system:suspend');
  }
});

powerMonitor.on('resume', async () => {
  const suspendDuration = systemSuspendedAt ? Math.round((Date.now() - systemSuspendedAt) / 1000) : 0;
  console.log(`☀️ [PowerMonitor] Sistema reanudado después de ${suspendDuration}s de suspensión`);
  systemSuspendedAt = null;

  // Si WSL está en uso, puede necesitar tiempo para despertar
  // Esperar un poco antes de notificar al frontend
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verificar si guacd (WSL) sigue accesible
  if (_guacdService && getGuacdService().getStatus) {
    const status = getGuacdService().getStatus();
    if (status.method === 'wsl') {
      console.log('🔄 [PowerMonitor] Verificando que guacd en WSL siga accesible...');
      try {
        const isAvailable = await getGuacdService().isPortAvailable(status.port);
        if (isAvailable) {
          // Puerto disponible = guacd no está escuchando, puede haberse suspendido
          console.warn('⚠️ [PowerMonitor] guacd en WSL parece suspendido, intentando reiniciar...');
          await getGuacdService().restart();
        } else {
          console.log('✅ [PowerMonitor] guacd en WSL sigue accesible');
        }
      } catch (e) {
        console.warn('⚠️ [PowerMonitor] Error verificando guacd:', e?.message);
      }
    }
  }

  // Notificar al renderer que el sistema se ha reanudado
  // El frontend debería verificar las conexiones RDP activas
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('system:resume', { suspendDuration });
  }
});

powerMonitor.on('lock-screen', () => {
  console.log('🔒 [PowerMonitor] Pantalla bloqueada');
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('system:lock-screen');
  }
});

powerMonitor.on('unlock-screen', async () => {
  console.log('🔓 [PowerMonitor] Pantalla desbloqueada');

  // Cuando se desbloquea, las pantallas estaban apagadas
  // Verificar conexión WSL y notificar al frontend
  if (_guacdService && getGuacdService().getStatus) {
    const status = getGuacdService().getStatus();
    if (status.method === 'wsl') {
      console.log('🔄 [PowerMonitor] Verificando guacd WSL tras desbloqueo...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const isAvailable = await getGuacdService().isPortAvailable(status.port);
        if (isAvailable) {
          console.warn('⚠️ [PowerMonitor] guacd WSL no responde tras desbloqueo, reiniciando...');
          await getGuacdService().restart();
        }
      } catch { }
    }
  }

  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('system:unlock-screen');
  }
});

// Monitor de idle del sistema - detecta cuando las pantallas se apagan por inactividad
let lastIdleCheck = Date.now();
let wasIdle = false;

setInterval(() => {
  try {
    // powerMonitor.getSystemIdleTime() devuelve segundos de inactividad
    const idleSeconds = powerMonitor.getSystemIdleTime();
    const isCurrentlyIdle = idleSeconds > 60; // Más de 1 minuto de inactividad

    // Si pasamos de idle a activo, verificar conexión WSL
    if (wasIdle && !isCurrentlyIdle) {
      console.log(`🔄 [IdleMonitor] Usuario activo después de ${idleSeconds}s de inactividad`);

      // Verificar conexión WSL
      if (_guacdService && getGuacdService().getStatus) {
        const status = getGuacdService().getStatus();
        if (status.method === 'wsl' && status.isRunning) {
          // Notificar al frontend para que verifique las sesiones RDP
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('system:resume', {
              suspendDuration: idleSeconds,
              reason: 'idle-recovery'
            });
          }
        }
      }
    }

    wasIdle = isCurrentlyIdle;
    lastIdleCheck = Date.now();
  } catch { }
}, 10000); // Verificar cada 10 segundos

// Handler get-version-info movido a src/main/handlers/application-handlers.js

// IPC handlers para funciones de View
// Handlers de aplicación movidos a main/handlers/app-handlers.js

// IPC handlers para clipboard - Ya están definidos más adelante en el archivo

// IPC handler to check if an SSH connection already exists
ipcMain.handle('ssh:check-connection', async (event, tabId) => {
  // Verificar si existe una conexión SSH activa para este tabId
  return sshConnections[tabId] !== undefined &&
    sshConnections[tabId].stream !== undefined &&
    !sshConnections[tabId].stream.destroyed;
});

// IPC handler to establish an SSH connection
ipcMain.on('ssh:connect', async (event, { tabId, config }) => {
  // Mostrar mensaje de conexión al inicio
  const hostName = config.name || config.label || config.host;
  sendToRenderer(event.sender, `ssh:data:${tabId}`, `Connecting to ${hostName}...\r\n`);

  const bastionForwardingWarning = getBastionForwardingWarning(config);
  if (bastionForwardingWarning) {
    sendToRenderer(event.sender, `ssh:data:${tabId}`, `[WARN] ${bastionForwardingWarning}\r\n`);
  }

  // Para bastiones: usar cacheKey único por destino (permite reutilización)
  // Para SSH directo: usar pooling normal para eficiencia
  const baseCacheKey = config.useBastionWallix
    ? `bastion-${config.bastionUser}@${config.bastionHost}->${config.username}@${config.host}:${config.port || 22}`
    : `${config.username}@${config.host}:${config.port || 22}`;
  const cacheKey = appendForwardingFlagsToCacheKey(baseCacheKey, config);

  // Aplicar throttling solo para SSH directo (bastiones son únicos)
  if (!config.useBastionWallix) {
    const lastAttempt = connectionThrottle.lastAttempt.get(cacheKey) || 0;
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;

    if (timeSinceLastAttempt < connectionThrottle.minInterval) {
      const waitTime = connectionThrottle.minInterval - timeSinceLastAttempt;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    connectionThrottle.lastAttempt.set(cacheKey, Date.now());
  }

  // Para bastiones: cada terminal tiene su propia conexión independiente (no pooling)
  // Para SSH directo: usar pooling normal para eficiencia
  let ssh;
  let isReusedConnection = false;

  if (config.useBastionWallix) {
    // BASTIÓN: Usar ssh2 puro para crear una conexión y shell independientes
    const bastionConfig = {
      bastionHost: config.bastionHost,
      port: 22,
      bastionUser: config.bastionUser
    };

    // Si hay password, usarlo. Si no, permitir autenticación interactiva
    if (config.password && config.password.trim()) {
      bastionConfig.password = config.password;
    }
    let shellStream;
    const { conn } = createBastionShell(
      bastionConfig,
      (data) => {
        const dataStr = data.toString('utf-8');

        // Grabar output si hay grabación activa
        if (getSessionRecorder().isRecording(tabId)) {
          getSessionRecorder().recordOutput(tabId, dataStr);
        }

        sendToRenderer(event.sender, `ssh:data:${tabId}`, dataStr);
      },
      // ✅ REFACTORIZADO: Handler de cierre usando SSHConnectionCleanupService
      sshCleanupService.createCloseHandler(
        tabId,
        { originalKey: config.originalKey || tabId },
        sshConnections,
        bastionStatsState,
        event.sender
      ),
      (err) => {
        // ✅ REFACTORIZADO: Manejo de errores de autenticación con SSHAuthService
        const conn = sshConnections[tabId];
        sshAuthService.handleAuthError(conn, event.sender, tabId, err);
      },
      (stream) => {
        if (sshConnections[tabId]) {
          sshConnections[tabId].stream = stream;

          // ✅ FIX: Desactivar modo de password manual cuando el stream está listo
          sshAuthService.disableManualPasswordMode(sshConnections[tabId]);

          // Si hay un resize pendiente, aplicarlo ahora
          const pending = sshConnections[tabId]._pendingResize;
          if (pending && stream && !stream.destroyed && typeof stream.setWindow === 'function') {
            const safeRows = Math.max(1, Math.min(300, pending.rows || 24));
            const safeCols = Math.max(1, Math.min(500, pending.cols || 80));
            stream.setWindow(safeRows, safeCols);
            sshConnections[tabId]._pendingResize = null;
          }
          // Lanzar bucle de stats SOLO cuando el stream está listo
          // Solo iniciar stats si esta pestaña está activa
          if (activeStatsTabId === tabId) {
            wallixStatsLoop();
          }
        }
      }
    );
    // Guardar la conexión para gestión posterior (stream se asigna en onShellReady)
    sshConnections[tabId] = {
      ssh: conn,
      stream: undefined,
      config,
      cacheKey,
      originalKey: config.originalKey || tabId,
      previousCpu: null,
      statsTimeout: null,
      previousNet: null,
      previousTime: null,
      statsLoopRunning: false
    };

    // ✅ REFACTORIZADO: Inicializar estado de autenticación con SSHAuthService
    sshAuthService.initializeAuthState(sshConnections[tabId], config.password && config.password.trim());

    // Si no hay password, mostrar prompt inmediatamente
    if (!(config.password && config.password.trim())) {
      sshAuthService.enableManualPasswordMode(sshConnections[tabId], event.sender, tabId, 'Por favor, introduce el password');
    }

    // ✅ REFACTORIZADO: Función de bucle de stats para Wallix/bastión ahora usa SSHStatsService
    const wallixStatsLoop = sshStatsService.createBastionStatsLoop(tabId, config, bastionStatsState, sshConnections, event.sender);

    // Asignar la función wallixStatsLoop al objeto de conexión
    sshConnections[tabId].wallixStatsLoop = wallixStatsLoop;

    sendToRenderer(event.sender, `ssh:ready:${tabId}`);
    sendToRenderer(event.sender, 'ssh-connection-ready', {
      originalKey: config.originalKey || tabId,
      tabId: tabId
    });
    return;
  } else {
    // SSH DIRECTO: pooling normal salvo cuando hay forwarding o ProxyJump activos
    const connectHelpers = {
      notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message),
      connectOptionsContext: {
        knownHostsService: sshKnownHostsService,
        notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message)
      },
      applyHostKey: (connectConfig, host, port, sessionConfig) => applyHostKeyPolicy(
        connectConfig,
        host,
        port,
        sessionConfig,
        {
          knownHostsService: sshKnownHostsService,
          notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message)
        }
      )
    };
    const directConnect = buildSshConnectOptions(config, connectHelpers.connectOptionsContext);

    const beginDedicatedSshSession = (ssh2Client, jumpClient = null) => {
      sshConnections[tabId] = {
        ssh: ssh2Client,
        jumpClient,
        stream: null,
        config,
        cacheKey,
        originalKey: config.originalKey || tabId,
        previousCpu: null,
        statsTimeout: null,
        previousNet: null,
        previousTime: null
      };

      sshAuthService.initializeAuthState(
        sshConnections[tabId],
        !!(config.password && config.password.trim())
      );

      sshAuthService.setupSSH2ClientListeners(
        ssh2Client,
        sshConnections[tabId],
        tabId,
        config,
        event.sender,
        {
          onReady: (realHostname, finalDistroId) => {
            setTimeout(() => {
              if (sshConnections[tabId] && sshConnections[tabId].ssh) {
                statsLoop(tabId, realHostname, finalDistroId, config.host);
              }
            }, 1000);
          },
          onError: null,
          getSessionRecorder: () => getSessionRecorder()
        }
      );

      if (!(config.password && config.password.trim())) {
        sshAuthService.enableManualPasswordMode(
          sshConnections[tabId],
          event.sender,
          tabId,
          'Por favor, introduce el password'
        );
      }
    };

    if (isProxyJumpEnabled(config)) {
      sendToRenderer(
        event.sender,
        `ssh:data:${tabId}`,
        `Connecting via jump ${config.jumpUser}@${config.jumpHost}:${config.jumpPort || 22}...\r\n`
      );

      try {
        const { jumpClient, targetClient } = await connectViaProxyJump({
          config,
          Client: getSSH2Client(),
          buildSshConnectOptions: (sessionConfig) => buildSshConnectOptions(
            sessionConfig,
            connectHelpers.connectOptionsContext
          ),
          applyHostKeyPolicy: connectHelpers.applyHostKey
        });

        beginDedicatedSshSession(targetClient, jumpClient);
        return;
      } catch (jumpError) {
        const jumpMessage = jumpError?.message || jumpError || 'Error desconocido en ProxyJump';
        sendToRenderer(event.sender, `ssh:error:${tabId}`, jumpMessage);
        sendToRenderer(event.sender, 'ssh-connection-error', {
          originalKey: config.originalKey || tabId,
          tabId,
          error: jumpMessage
        });
        return;
      }
    }

    if (requiresDedicatedSshSession(config)) {
      if (directConnect.agentForwardingRequestedButUnavailable) {
        sendToRenderer(
          event.sender,
          `ssh:data:${tabId}`,
          '[WARN] Agent Forwarding activo pero no se encontro un agente SSH local.\r\n'
        );
      }

      const ssh2Client = new (getSSH2Client())();
      beginDedicatedSshSession(ssh2Client);
      ssh2Client.connect(directConnect.connectConfig);
      return;
    }

    const existingPoolConnection = sshConnectionPool[cacheKey];
    if (existingPoolConnection) {
      try {
        await existingPoolConnection.exec('echo "test"');
        ssh = existingPoolConnection;
        isReusedConnection = true;
      } catch (testError) {
        try {
          existingPoolConnection.close();
        } catch (e) { }
        delete sshConnectionPool[cacheKey];
      }
    }
    if (!ssh) {
      ssh = new (getSSH2Promise())(directConnect.connectConfig);
      sshConnectionPool[cacheKey] = ssh;
    }
  }

  try {
    // For subsequent connections, send the cached MOTD immediately.
    if (motdCache[cacheKey]) {
      sendToRenderer(event.sender, `ssh:data:${tabId}`, motdCache[cacheKey]);
    }

    // Conectar SSH si es necesario
    if (!isReusedConnection) {
      // Solo conectar si es una conexión nueva (no reutilizada del pool)
      ssh.setMaxListeners(300);

      await ssh.connect();

      // Guardar en el pool solo para SSH directo (bastiones son independientes)
      if (!config.useBastionWallix) {
        ssh._createdAt = Date.now();
        ssh._lastUsed = Date.now();
        sshConnectionPool[cacheKey] = ssh;
      }
    }

    // Crear shell con reintentos
    let stream;
    let shellAttempts = 0;
    const maxShellAttempts = 3;

    while (shellAttempts < maxShellAttempts) {
      try {
        // Añadir pequeño delay entre intentos
        if (shellAttempts > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * shellAttempts));
        }

        // Si es una conexión Wallix, usar configuración específica para bastiones
        if (ssh._isWallixConnection && ssh._wallixTarget) {
          // Para bastiones Wallix, esperar un poco antes de crear shell
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Intentar con configuración específica para Wallix
          try {
            stream = await ssh.shell({
              term: 'xterm-256color',
              cols: 80,
              rows: 24,
              modes: {
                ECHO: 1,
                TTY_OP_ISPEED: 14400,
                TTY_OP_OSPEED: 14400
              }
            });
          } catch (shellError) {
            // Fallback con configuración mínima
            stream = await ssh.shell('xterm-256color');
          }

          // Enviar comando para verificar hostname
          stream.write('hostname\n');

          // Esperar un poco para procesar
          await new Promise(resolve => setTimeout(resolve, 500));

        } else {
          // Conexión SSH directa normal
          stream = await ssh.shell(buildShellOptions(config));
        }

        break;
      } catch (shellError) {
        shellAttempts++;

        if (shellAttempts >= maxShellAttempts) {
          throw new Error(`No se pudo crear shell después de ${maxShellAttempts} intentos: ${shellError?.message || shellError || 'Unknown error'}`);
        }
      }
    }

    // Configurar límites de listeners para el stream
    stream.setMaxListeners(0); // Sin límite para streams individuales

    const storedOriginalKey = config.originalKey || tabId;
    sshConnections[tabId] = {
      ssh,
      stream,
      config,
      cacheKey,
      originalKey: storedOriginalKey,
      previousCpu: null,
      statsTimeout: null,
      previousNet: null,
      previousTime: null
    };

    // Lanzar statsLoop para conexiones SSH directas (no bastion)
    if (!config.useBastionWallix) {
      let realHostname = 'unknown';
      let osRelease = '';
      try {
        realHostname = (await ssh.exec('hostname')).trim();
      } catch (e) { }
      try {
        osRelease = await ssh.exec('cat /etc/os-release');
      } catch (e) { osRelease = 'ID=linux'; }
      const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
      const finalDistroId = distroId.replace(/"/g, '').toLowerCase();
      // Si ya hay un statsTimeout para este tabId, lo limpio antes de lanzar uno nuevo
      if (sshConnections[tabId].statsTimeout) {
        clearTimeout(sshConnections[tabId].statsTimeout);
      }
      statsLoop(tabId, realHostname, finalDistroId, config.host);
    }

    // Set up the data listener immediately to capture the MOTD
    let isFirstPacket = true;
    stream.on('data', (data) => {
      try {
        const dataStr = data.toString('utf-8');

        if (isFirstPacket) {
          isFirstPacket = false;
          // If the MOTD is not cached yet (it's the first-ever connection)
          if (!motdCache[cacheKey]) {
            motdCache[cacheKey] = dataStr; // Cache it
            sendToRenderer(event.sender, `ssh:data:${tabId}`, dataStr); // And send it
          }
          // If it was already cached, we've already sent the cached version.
          // We do nothing here, effectively suppressing the duplicate message.

          // La configuración original ya funciona correctamente
          return;
        }

        // Grabar output si hay grabación activa
        if (getSessionRecorder().isRecording(tabId)) {
          getSessionRecorder().recordOutput(tabId, dataStr);
        }

        // For all subsequent packets, just send them
        sendToRenderer(event.sender, `ssh:data:${tabId}`, dataStr);
      } catch (e) {
        // log o ignora
      }
    });

    stream.on('close', async () => {
      sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
      const conn = sshConnections[tabId];
      if (conn && conn.statsTimeout) {
        clearTimeout(conn.statsTimeout);
      }

      // Detener grabación automática si está activa
      if (getSessionRecorder().isRecording(tabId)) {
        try {
          const recording = getSessionRecorder().stopRecording(tabId);

          // Guardar grabación automáticamente (siempre guardar cuando hay una grabación activa)
          const autoRecordingEnabled = true; // Asumir que si hay grabación activa, debe guardarse
          if (autoRecordingEnabled) {
            // Guardar archivo en disco
            const fsPromises = require('fs').promises;
            const recordingsDir = await getRecordingsDirectory(app.getPath('userData'));

            // Crear directorio si no existe
            await fsPromises.mkdir(recordingsDir, { recursive: true });

            // Generar formato asciicast
            const asciicastContent = getSessionRecorder().toAsciicast(recording);
            const filename = `${recording.id}.cast`;
            const filepath = path.join(recordingsDir, filename);

            // Guardar archivo
            await fsPromises.writeFile(filepath, asciicastContent, 'utf-8');

            // Guardar metadata en archivo separado para índice rápido
            const metadataPath = path.join(recordingsDir, `${recording.id}.meta.json`);
            const metadata = {
              id: recording.id,
              filepath,
              filename,
              ...recording.metadata,
              duration: recording.duration,
              endTime: recording.endTime,
              eventCount: recording.eventCount,
              bytesRecorded: recording.bytesRecorded,
              createdAt: Date.now()
            };

            await fsPromises.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

            console.log(`💾 Grabación automática guardada: ${filename}`);
          }
        } catch (error) {
          console.error('Error guardando grabación automática:', error);
        }
      }

      // Enviar evento de desconexión
      const disconnectOriginalKey = conn?.originalKey || tabId;
      sendToRenderer(event.sender, 'ssh-connection-disconnected', {
        originalKey: disconnectOriginalKey,
        tabId: tabId
      });

      delete sshConnections[tabId];
    });



    sendToRenderer(event.sender, `ssh:ready:${tabId}`);

    // Enviar evento de conexión exitosa
    const originalKey = config.originalKey || tabId;
    sendToRenderer(event.sender, 'ssh-connection-ready', {
      originalKey: originalKey,
      tabId: tabId
    });

    // After setting up the shell, get the hostname/distro and start the stats loop
    // let realHostname = 'unknown';
    // let osRelease = '';
    // try {
    //   realHostname = (await ssh.exec('hostname')).trim();
    // } catch (e) {
    //   // Si falla, dejamos 'unknown'
    // }
    // try {
    //   osRelease = await ssh.exec('cat /etc/os-release');
    // } catch (e) {
    //   osRelease = 'ID=linux'; // fallback si no existe el archivo
    // }
    // const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
    // const finalDistroId = distroId.replace(/"/g, '').toLowerCase();
    // statsLoop(tabId, realHostname, finalDistroId, config.host);

  } catch (err) {
    // Detectar si es un error de autenticación
    const isAuthError = err && (
      (typeof err === 'string' && (
        err.includes('All configured authentication methods failed') ||
        err.includes('authentication') ||
        err.includes('Authentication failed')
      )) ||
      (err.message && (
        err.message.includes('All configured authentication methods failed') ||
        err.message.includes('authentication') ||
        err.message.includes('Authentication failed')
      ))
    );

    // Si es error de autenticación, permitir reintento interactivo
    if (isAuthError && !config.useBastionWallix) {
      try {
        // Limpiar conexión problemática del pool
        if (ssh && cacheKey && sshConnectionPool[cacheKey] === ssh) {
          try {
            ssh.close();
          } catch (closeError) {
            // Ignorar errores de cierre
          }
          delete sshConnectionPool[cacheKey];
        }

        // Usar ssh2 Client directamente para permitir autenticación interactiva
        const ssh2Client = new (getSSH2Client())();

        // ✅ REFACTORIZADO: Crear conexión con estado de autenticación usando SSHAuthService
        sshConnections[tabId] = {
          ssh: ssh2Client,
          stream: null,
          config,
          cacheKey,
          originalKey: config.originalKey || tabId,
          previousCpu: null,
          statsTimeout: null,
          previousNet: null,
          previousTime: null
        };

        // Inicializar estado de autenticación
        sshAuthService.initializeAuthState(sshConnections[tabId], false);

        // Configurar todos los listeners de SSH2 usando el servicio
        sshAuthService.setupSSH2ClientListeners(
          ssh2Client,
          sshConnections[tabId],
          tabId,
          config,
          event.sender,
          {
            onReady: (realHostname, finalDistroId) => {
              // Inicializar statsLoop después de conectar
              setTimeout(() => {
                if (sshConnections[tabId] && sshConnections[tabId].ssh) {
                  statsLoop(tabId, realHostname, finalDistroId, config.host);
                }
              }, 1000);
            },
            onError: null,
            getSessionRecorder: () => getSessionRecorder()
          }
        );

        // ✅ REFACTORIZADO: Crear configuración SSH con SSHAuthService
        // NO incluir password si falló antes - forzar autenticación interactiva
        const includePassword = config.password && config.password.trim() && !isAuthError;
        const connectConfig = sshAuthService.createInteractiveSSHConfig(config, includePassword, {
          knownHostsService: sshKnownHostsService,
          notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message)
        });

        // Si no hay password configurado, activar modo manual inmediatamente
        if (!config.password || !config.password.trim()) {
          sshAuthService.enableManualPasswordMode(
            sshConnections[tabId],
            event.sender,
            tabId,
            'Por favor, introduce el password'
          );
        }

        ssh2Client.connect(connectConfig);

        // No mostrar error, permitir que el usuario reintente interactivamente
        return;

      } catch (retryError) {
        console.error('Error en reintento interactivo:', retryError);
        // Continuar con el manejo de error normal
      }
    }

    // Limpiar conexión problemática del pool
    if (ssh && cacheKey && sshConnectionPool[cacheKey] === ssh) {
      try {
        ssh.close();
      } catch (closeError) {
        // Ignorar errores de cierre
      }
      delete sshConnectionPool[cacheKey];
    }

    // Crear mensaje de error más descriptivo
    let errorMsg = 'Error desconocido al conectar por SSH';
    if (err) {
      if (typeof err === 'string') {
        errorMsg = err;
      } else if (err.message) {
        errorMsg = err.message;
      } else if (err.code) {
        errorMsg = `Error de conexión: ${err.code}`;
      } else {
        try {
          errorMsg = JSON.stringify(err);
        } catch (jsonError) {
          errorMsg = 'Error de conexión SSH';
        }
      }
    }

    // Solo mostrar error si NO es de autenticación (ya lo manejamos arriba)
    if (!isAuthError) {
      sendToRenderer(event.sender, `ssh:error:${tabId}`, errorMsg);

      // Enviar evento de error de conexión
      const errorOriginalKey = config.originalKey || tabId;
      sendToRenderer(event.sender, 'ssh-connection-error', {
        originalKey: errorOriginalKey,
        tabId: tabId,
        error: errorMsg
      });
    }
  }
});

// IPC handler to send data to the SSH shell
ipcMain.on('ssh:data', (event, { tabId, data }) => {
  const conn = sshConnections[tabId];

  if (!conn) {
    return;
  }

  // ✅ REFACTORIZADO: Procesar input manual de password con SSHAuthService
  if (conn.manualPasswordMode) {
    const password = sshAuthService.processManualPasswordInput(conn, data, event.sender, tabId);

    // Si processManualPasswordInput retorna un password, reconectar
    if (password) {
      // Cerrar conexión anterior si existe
      if (conn.ssh && typeof conn.ssh.end === 'function') {
        try {
          conn.ssh.end();
        } catch (e) { }
      }

      // Reconectar con el password proporcionado
      const newConfig = { ...conn.config, password: password };

      // Si es conexión Bastion, usar createBastionShell
      if (newConfig.useBastionWallix) {
        const bastionConfig = {
          bastionHost: newConfig.bastionHost,
          port: 22,
          bastionUser: newConfig.bastionUser,
          password: password
        };

        const { conn: newBastionConn } = createBastionShell(
          bastionConfig,
          (data) => {
            const dataStr = data.toString('utf-8');
            if (getSessionRecorder().isRecording(tabId)) {
              getSessionRecorder().recordOutput(tabId, dataStr);
            }
            sendToRenderer(event.sender, `ssh:data:${tabId}`, dataStr);
          },
          // ✅ REFACTORIZADO: Handler de cierre usando SSHConnectionCleanupService
          sshCleanupService.createCloseHandler(
            tabId,
            conn,
            sshConnections,
            bastionStatsState,
            event.sender
          ),
          (err) => {
            // ✅ REFACTORIZADO: Manejo de errores de autenticación con SSHAuthService
            sshAuthService.handleAuthError(conn, event.sender, tabId, err);
          },
          (stream) => {
            if (sshConnections[tabId]) {
              sshConnections[tabId].stream = stream;

              // ✅ FIX: Desactivar modo de password manual cuando el stream está listo
              sshAuthService.disableManualPasswordMode(sshConnections[tabId]);

              const pending = sshConnections[tabId]._pendingResize;
              if (pending && stream && !stream.destroyed && typeof stream.setWindow === 'function') {
                const safeRows = Math.max(1, Math.min(300, pending.rows || 24));
                const safeCols = Math.max(1, Math.min(500, pending.cols || 80));
                stream.setWindow(safeRows, safeCols);
                sshConnections[tabId]._pendingResize = null;
              }

              // ✅ REFACTORIZADO: Crear función wallixStatsLoop usando SSHStatsService
              if (!conn.wallixStatsLoop) {
                conn.wallixStatsLoop = sshStatsService.createBastionStatsLoop(tabId, newConfig, bastionStatsState, sshConnections, event.sender);
              }

              if (activeStatsTabId === tabId) {
                conn.wallixStatsLoop();
              }
            }
          }
        );

        // Actualizar conexión
        conn.ssh = newBastionConn;
        conn.config = newConfig;

        // ✅ FIX: Desactivar modo de password manual después de conectar exitosamente
        sshAuthService.disableManualPasswordMode(conn);

        sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\n✅ Conectado exitosamente.\r\n');
        sendToRenderer(event.sender, `ssh:ready:${tabId}`);
        sendToRenderer(event.sender, 'ssh-connection-ready', {
          originalKey: conn.originalKey || tabId,
          tabId: tabId,
          password: password // Incluir password para que el renderer lo guarde
        });
      } else {
        // ✅ REFACTORIZADO: Reconexión SSH directa usando SSHAuthService
        const ssh2Client = new (getSSH2Client())();

        // Configurar listeners usando el servicio
        sshAuthService.setupSSH2ClientListeners(
          ssh2Client,
          conn,
          tabId,
          newConfig,
          event.sender,
          {
            onReady: (realHostname, finalDistroId) => {
              // Inicializar statsLoop
              setTimeout(() => {
                if (sshConnections[tabId] && sshConnections[tabId].ssh) {
                  statsLoop(tabId, realHostname, finalDistroId, newConfig.host);
                }
              }, 1000);
            },
            onError: null,
            getSessionRecorder: () => getSessionRecorder()
          },
          password // Pasar password capturado manualmente
        );

        const reconnectOptions = buildSshConnectOptions(newConfig, {
          includePassword: true,
          knownHostsService: sshKnownHostsService,
          notify: (message) => sendToRenderer(event.sender, `ssh:data:${tabId}`, message)
        });
        ssh2Client.connect(reconnectOptions.connectConfig);
      }
    }
    return;
  }

  // ✅ REFACTORIZADO: Procesar keyboard-interactive con SSHAuthService
  if (sshAuthService.processKeyboardInteractiveInput(conn, data, event.sender, tabId)) {
    return; // Input procesado por keyboard-interactive
  }

  // ✅ REFACTORIZADO: Enviar datos al stream con buffering optimizado para Wallix
  if (conn && conn.stream && !conn.stream.destroyed) {
    // Intentar usar buffering (retorna true si aplica, false si no)
    const buffered = sshWriteBufferService.writeWithBuffering(
      conn,
      data,
      tabId,
      getSessionRecorder
    );

    // Si no se usó buffering, usar comportamiento directo
    if (!buffered) {
      // SSH directo: sin buffering
      if (getSessionRecorder().isRecording(tabId)) {
        getSessionRecorder().recordInput(tabId, data);
      }

      conn.stream.write(data);
    }
  }
});

// IPC handler to handle terminal resize
ipcMain.on('ssh:resize', (event, { tabId, rows, cols }) => {
  const conn = sshConnections[tabId];
  if (conn) {
    // Guardar el último tamaño solicitado
    conn._pendingResize = { rows, cols };
    if (conn.stream && !conn.stream.destroyed) {
      try {
        const safeRows = Math.max(1, Math.min(300, rows || 24));
        const safeCols = Math.max(1, Math.min(500, cols || 80));
        conn.stream.setWindow(safeRows, safeCols);
        conn._pendingResize = null; // Aplicado correctamente
      } catch (resizeError) {
        // Error redimensionando terminal
      }
    }
  }
});

// ✅ REFACTORIZADO: Handler de desconexión SSH usando SSHConnectionCleanupService
ipcMain.on('ssh:disconnect', (event, tabId) => {
  const conn = sshConnections[tabId];
  if (conn) {
    sshCleanupService.cleanupConnection(
      tabId,
      conn,
      sshConnections,
      sshConnectionPool,
      bastionStatsState,
      event.sender
    );
  }
});

// Handler app-quit movido a src/main/handlers/application-handlers.js

/**
 * Detiene contenedores Docker de clientes de IA lo antes posible al cerrar.
 * - Usa siempre get*Service() para aplicar buildDockerCommand (ruta a docker.exe en Windows empaquetado).
 * - Se ejecuta antes de cleanupTunnels/SSH para que un túnel lento no deje OpenClaw/Agent Zero en marcha.
 */
async function stopAiClientDockerContainersOnQuit() {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  const dockerBin = getAgentZeroService().resolveDockerCommand();
  const dockerPrefix = /\s/.test(dockerBin) ? `"${dockerBin}"` : dockerBin;

  const stopTasks = [
    getAnythingLLMService().stop().catch(() => null),
    getOpenWebUIService().stop().catch(() => null),
    getLibreChatService().stop().catch(() => null),
    getAgentZeroService().stop().catch(() => null),
    getOpenClawService().stop().catch(() => null)
  ];

  // Respaldo conservador: SOLO stop para no perder estado/contenido de contenedores.
  const forcedNames = [
    'nodeterm-anythingllm',
    'nodeterm-openwebui',
    'nodeterm-librechat',
    'nodeterm-librechat-mongo'
  ];
  for (const name of forcedNames) {
    stopTasks.push(execAsync(`${dockerPrefix} stop ${name}`).catch(() => null));
  }

  await Promise.all(stopTasks);
}

// Limpieza robusta también en before-quit
app.on('before-quit', async (event) => {
  if (appCleanupCompleted) {
    return;
  }

  if (appCleanupInProgress) {
    event.preventDefault();
    return;
  }

  appCleanupInProgress = true;
  event.preventDefault();
  isAppQuitting.value = true;

  // ✅ MEMORY LEAK FIX: Limpiar intervalo de limpieza de conexiones huérfanas
  if (orphanCleanupInterval) {
    clearInterval(orphanCleanupInterval);
    orphanCleanupInterval = null;
  }

  try {
    await stopAiClientDockerContainersOnQuit();
  } catch (e) {
    console.error('[quit] Error deteniendo contenedores Docker de clientes IA:', e?.message || e);
  }

  // ✅ REFACTORIZADO: Limpiar todas las conexiones SSH con SSHConnectionCleanupService
  sshCleanupService.cleanupAllConnections(sshConnections);

  // Limpiar también el pool de conexiones con mejor limpieza
  Object.values(sshConnectionPool).forEach(poolConn => {
    try {
      // Limpiar listeners del pool también
      poolConn.removeAllListeners('error');
      poolConn.removeAllListeners('close');
      poolConn.removeAllListeners('end');
      if (poolConn.ssh) {
        poolConn.ssh.removeAllListeners('error');
        poolConn.ssh.removeAllListeners('close');
        poolConn.ssh.removeAllListeners('end');
      }
      poolConn.close();
    } catch (e) {
      // Ignorar errores
    }
  });

  // Cleanup SSH tunnels
  try {
    await cleanupTunnels();
  } catch (error) {
    console.error('Error cleaning up SSH tunnels:', error);
  }

  // Cleanup Cygwin processes
  if (Cygwin && Cygwin.CygwinHandlers) {
    try {
      Cygwin.CygwinHandlers.cleanup();
    } catch (error) {
      console.error('Error cleaning up Cygwin:', error);
    }
  }

  // Cleanup Docker processes
  const docker = getDocker();
  if (docker && docker.DockerHandlers) {
    try {
      docker.DockerHandlers.cleanup();
    } catch (error) {
      console.error('Error cleaning up Docker processes:', error);
    }
  }

  appCleanupCompleted = true;
  appCleanupInProgress = false;
  app.quit();
});

// Handlers del sistema (clipboard, dialog, import) movidos a main/handlers/system-handlers.js

// Function to safely send to mainWindow
// Funciones sendToRenderer y cleanupOrphanedConnections movidas a main/utils/connection-utils.js

// Ejecutar limpieza cada 10 minutos
orphanCleanupInterval = setInterval(() => cleanupOrphanedConnections(sshConnectionPool, sshConnections), 10 * 60 * 1000);

// Helper function to find SSH connection by host/username or by tabId
async function findSSHConnection(tabId, sshConfig = null) {
  // Primero intentar por tabId (para conexiones directas de terminal)
  if (sshConnections[tabId]) {
    return sshConnections[tabId];
  }

  // Si no existe por tabId y tenemos sshConfig, buscar cualquier conexión al mismo servidor
  if (sshConfig && sshConfig.host && sshConfig.username) {
    // Para bastiones: buscar cualquier conexión activa al mismo destino via bastión
    if (sshConfig.useBastionWallix) {
      // Buscar en conexiones activas cualquier conexión que vaya al mismo destino via bastión
      for (const conn of Object.values(sshConnections)) {
        if (conn.config &&
          conn.config.useBastionWallix &&
          conn.config.bastionHost === sshConfig.bastionHost &&
          conn.config.bastionUser === sshConfig.bastionUser &&
          conn.config.host === sshConfig.host &&
          conn.config.username === sshConfig.username &&
          (conn.config.port || 22) === (sshConfig.port || 22)) {
          return conn;
        }
      }
    }
  }
  // Si no se encuentra, retornar null
  return null;
}

// Los handlers se registrarán después de crear la ventana principal

// --- INICIO BLOQUE RESTAURACIÓN STATS ---
// ✅ REFACTORIZADO: Función de statsLoop ahora usa SSHStatsService
async function statsLoop(tabId, realHostname, finalDistroId, host) {
  return sshStatsService.startStatsLoop(tabId, sshConnections[tabId], realHostname, finalDistroId, host, mainWindow, sshConnections);
}
// --- FIN BLOQUE RESTAURACIÓN STATS ---

// ✅ REFACTORIZADO: activeStatsTabId ahora se maneja en SSHStatsService
// Variable local mantenida para compatibilidad con código existente
let activeStatsTabId = null;

ipcMain.on('ssh:set-active-stats-tab', (event, tabId) => {
  activeStatsTabId = tabId;
  sshStatsService.setActiveStatsTab(tabId);

  // Detener loops inactivos
  sshStatsService.stopInactiveStatsLoops(sshConnections, tabId);

  // Iniciar loop para la pestaña activa
  const conn = sshConnections[tabId];
  if (conn && !conn.statsTimeout && !conn.statsLoopRunning) {
    if (conn.config.useBastionWallix) {
      if (typeof conn.wallixStatsLoop === 'function') {
        conn.wallixStatsLoop();
      }
    } else {
      statsLoop(tabId, conn.realHostname || 'unknown', conn.finalDistroId || 'linux', conn.config.host);
    }
  }
});

// ✅ REFACTORIZADO: Intervalo de polling ahora se maneja en SSHStatsService
ipcMain.on('statusbar:set-polling-interval', (event, intervalSec) => {
  const sec = Math.max(1, Math.min(20, parseInt(intervalSec, 10) || 3));
  const intervalMs = sec * 1000;
  sshStatsService.setPollingInterval(intervalMs);
});

// Optimización: pausar estadísticas cuando la ventana pierda el foco
ipcMain.on('window:focus-changed', (event, isFocused) => {
  if (statsWorkerReady && statsWorker) {
    if (isFocused) {
      statsWorker.send('resume-stats');
    } else {
      statsWorker.send('pause-stats');
    }
  }
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.handle('window:maximize', () => {
  if (mainWindow) mainWindow.maximize();
});
ipcMain.handle('window:unmaximize', () => {
  if (mainWindow) mainWindow.unmaximize();
});
ipcMain.handle('window:isMaximized', () => {
  if (mainWindow) return mainWindow.isMaximized();
  return false;
});
ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});
ipcMain.handle('window:set-corners', (event, layoutId) => {
  console.log(`[WindowCorners] IPC window:set-corners received with layoutId: ${layoutId}`);
  if (mainWindow) {
    applyWindowCornersForLayout(mainWindow, layoutId);
  } else {
    console.warn('[WindowCorners] IPC received but mainWindow is null');
  }
});

function applyWindowCornersForLayout(win, layoutId) {
  console.log(`[WindowCorners] applyWindowCornersForLayout called with layoutId: ${layoutId}`);
  if (process.platform !== 'win32' || !win || win.isDestroyed()) {
    console.log(`[WindowCorners] Skipping: platform=${process.platform}, winExists=${!!win}, winDestroyed=${win ? win.isDestroyed() : 'N/A'}`);
    return;
  }
  
  // Preference values:
  // 0 = DWMWCP_DEFAULT (System decides)
  // 1 = DWMWCP_DONOTROUND (Square corners)
  // 2 = DWMWCP_ROUND (Rounded corners)
  // 3 = DWMWCP_ROUNDSMALL (Slightly rounded corners)
  let preference = 2; // Default to rounded
  
  if (layoutId === 'unified' || layoutId === 'unified-rounded' || layoutId === 'cyberpunk') {
    preference = 1; // Square corners
  }
  
  try {
    const hwnd = win.getNativeWindowHandle();
    let hwndAddress = 0;
    try {
      if (hwnd.length >= 8) {
        hwndAddress = hwnd.readBigInt64LE(0).toString();
      } else if (hwnd.length >= 4) {
        hwndAddress = hwnd.readInt32LE(0).toString();
      } else {
        hwndAddress = hwnd.readUInt32LE(0).toString();
      }
    } catch (e) {
      hwndAddress = parseInt(hwnd.toString('hex'), 16).toString();
    }

    const { spawn } = require('child_process');
    console.log(`[WindowCorners] Executing inline DWM corners update for HWND=${hwndAddress} preference=${preference}`);
    
    const minimalEnv = {};
    const keysToKeep = ['SystemRoot', 'windir', 'PATH', 'PSModulePath', 'USERPROFILE', 'SystemDrive', 'TEMP', 'TMP'];
    for (const key of keysToKeep) {
      if (process.env[key]) {
        minimalEnv[key] = process.env[key];
      }
    }

    const psScript = `
$code = @"
using System;
using System.Runtime.InteropServices;
public class DwmApi {
    [DllImport("dwmapi.dll")]
    public static extern int DwmSetWindowAttribute(IntPtr hwnd, int dwAttribute, ref int pvAttribute, int cbAttribute);
}
public class User32 {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hwnd, IntPtr hwndInsertAfter, int x, int y, int cx, int cy, uint flags);
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$hwndIntPtr = [IntPtr]([long]${hwndAddress})
$pref = ${preference}
$res = [DwmApi]::DwmSetWindowAttribute($hwndIntPtr, 33, [ref]$pref, 4)
$flags = 0x0020 -bor 0x0002 -bor 0x0001 -bor 0x0004 -bor 0x0010
$posRes = [User32]::SetWindowPos($hwndIntPtr, [IntPtr]0, 0, 0, 0, 0, $flags)
Write-Host "SUCCESS HWND=${hwndAddress} preference=${preference} DwmRes=$res SetWindowPosRes=$posRes"
`;

    const encodedScript = Buffer.from(psScript, 'utf-16le').toString('base64');

    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encodedScript
    ], {
      env: minimalEnv
    });

    child.on('error', (err) => {
      console.error('[WindowCorners] Failed to start PowerShell child process:', err);
    });
    
    child.stdout.on('data', (data) => {
      console.log(`[WindowCorners] PowerShell stdout: ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[WindowCorners] PowerShell stderr: ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.warn(`[WindowCorners] PowerShell process exited with code ${code}`);
      } else {
        console.log(`[WindowCorners] PowerShell process finished successfully`);
      }
    });
  } catch (err) {
    console.error('[WindowCorners] Error setting window corner preference:', err);
  }
}

function applyWindowCornersOnStartup(win) {
  try {
    const appDataPath = path.join(getNodeTermDataDir(), 'app-data.json');
    if (fs.existsSync(appDataPath)) {
      const raw = fs.readFileSync(appDataPath, 'utf8');
      const { parseAppDataFileContent } = require('./src/main/utils/file-utils');
      const parsed = parseAppDataFileContent(raw);
      if (parsed && parsed.ui_layout) {
        applyWindowCornersForLayout(win, parsed.ui_layout);
      }
    }
  } catch (err) {
    console.error('[WindowCorners] Error applying startup corners:', err);
  }
}


// === Update System Handlers ===
ipcMain.handle('updater:check', async () => {
  try {
    const updateService = getUpdateServiceLazy();
    const result = await updateService.checkForUpdates();
    return result;
  } catch (error) {
    console.error('[UPDATER] Error checking for updates:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    const updateService = getUpdateServiceLazy();
    const result = await updateService.downloadUpdate();
    return result;
  } catch (error) {
    console.error('[UPDATER] Error downloading update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:quit-and-install', async () => {
  try {
    const updateService = getUpdateServiceLazy();
    updateService.quitAndInstall();
    return { success: true };
  } catch (error) {
    console.error('[UPDATER] Error installing update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:get-config', async () => {
  try {
    const updateService = getUpdateServiceLazy();
    const config = updateService.getConfig();
    return { success: true, config };
  } catch (error) {
    console.error('[UPDATER] Error getting config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:update-config', async (event, newConfig) => {
  try {
    const updateService = getUpdateServiceLazy();
    const config = updateService.updateConfig(newConfig);
    updateService.restart(); // Reiniciar el servicio con la nueva configuración
    return { success: true, config };
  } catch (error) {
    console.error('[UPDATER] Error updating config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:get-info', async () => {
  try {
    const updateService = getUpdateServiceLazy();
    const info = updateService.getUpdateInfo();
    return { success: true, ...info };
  } catch (error) {
    console.error('[UPDATER] Error getting update info:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:clear-cache', async () => {
  try {
    const updateService = getUpdateServiceLazy();
    const result = updateService.clearUpdateCache();
    return result;
  } catch (error) {
    console.error('[UPDATER] Error clearing update cache:', error);
    return { success: false, error: error.message };
  }
});

// === RDP Support ===
// ✅ OPTIMIZACIÓN: Handlers de RDP movidos a src/main/handlers/rdp-handlers.js
// Se registran automáticamente desde registerSecondaryHandlers() en handlers/index.js

// Cleanup on app quit
app.on('before-quit', () => {
  // Disconnect all RDP connections
  const { getRdpHandlers } = require('./src/main/handlers');
  getRdpHandlers().cleanupRdpConnections();

  // Cleanup Guacamole services
  if (_guacdService) {
    getGuacdService().stop();
  }
});

// === Guacamole Support ===
// Handlers de Guacamole movidos a src/main/handlers/guacamole-handlers.js

// Handlers de Guacamole movidos a src/main/handlers/guacamole-handlers.js

// Helper to disconnect all active guacamole connections
async function disconnectAllGuacamoleConnections() {
  try {
    console.log(`🧹 Cerrando ${activeGuacamoleConnections.size} conexiones Guacamole activas...`);
    for (const conn of Array.from(activeGuacamoleConnections)) {
      try {
        // guacamole-lite clientConnection may expose close() or ws property
        if (typeof conn.close === 'function') {
          conn.close();
        } else if (conn.ws && typeof conn.ws.close === 'function') {
          conn.ws.close();
        }
      } catch (e) {
        // swallow per-connection errors
      } finally {
        activeGuacamoleConnections.delete(conn);
      }
    }
    // Conexiones Guacamole cerradas
  } catch (e) {
    console.warn('⚠️ Error cerrando conexiones Guacamole:', e?.message || e);
  }
}

// Handler guacamole:disconnect-all movido a src/main/handlers/guacamole-handlers.js

// Handler guacamole:create-token movido a src/main/handlers/guacamole-handlers.js

// === Terminal Support ===
// 🚀 OPTIMIZACIÓN: node-pty con lazy loading (módulo nativo muy pesado)
let _pty = null;
function getPty() {
  if (!_pty) {
    _pty = require('node-pty');
  }
  return _pty;
}

// Start PowerShell session
ipcMain.on('powershell:start', (event, { cols, rows }) => {
  const tabId = 'default'; // Fallback para compatibilidad
  PowerShell.PowerShellHandlers.start(tabId, { cols, rows });
});

// Start PowerShell session with specific tab ID - Global listener with auto-registration
ipcMain.on(/^powershell:start:(.+)$/, (event, { cols, rows }) => {
  const channel = event.senderFrame ? event.channel : arguments[1];
  const tabId = channel.split(':')[2];

  // ✅ REFACTORIZADO: Registrar eventos para este tab si no están registrados
  if (!isTabRegistered(tabId)) {
    registerTabEventsWrapper(tabId);
  }

  PowerShell.PowerShellHandlers.start(tabId, { cols, rows });
});

// === WSL Terminal Support ===

// Start WSL session
ipcMain.on('wsl:start', (event, { cols, rows }) => {
  const tabId = 'default';
  WSL.WSLHandlers.start(tabId, { cols, rows });
});

// Send data to WSL
ipcMain.on('wsl:data', (event, data) => {
  const tabId = 'default';
  WSL.WSLHandlers.data(tabId, data);
});

// Resize WSL terminal
ipcMain.on('wsl:resize', (event, { cols, rows }) => {
  const tabId = 'default';
  WSL.WSLHandlers.resize(tabId, { cols, rows });
});

// Stop WSL session
ipcMain.on('wsl:stop', () => {
  const tabId = 'default';
  WSL.WSLHandlers.stop(tabId);
});

// Funciones de manejo para WSL
// Función handleWSLStart movida a src/main/services/WSLService.js

// Función startWSLSession movida a src/main/services/WSLService.js

// Función handleWSLData movida a src/main/services/WSLService.js

// Función handleWSLResize movida a src/main/services/WSLService.js

// Función handleWSLStop movida a src/main/services/WSLService.js

// === WSL Distributions Terminal Support ===

// Store active WSL distribution processes (specific distributions)
const wslDistroProcesses = {};

// WSL Distro Process Manager (ahora en servicio separado)
const WSLDistroProcessManager = require('./src/main/services/WSLDistroProcessManager');

// Ubuntu Process Manager (ahora en servicio separado)
const UbuntuProcessManager = require('./src/main/services/UbuntuProcessManager');

// Función detectUbuntuAvailability movida a src/main/services/WSLService.js

// Funciones de manejo para distribuciones WSL (genéricas)
// Función handleWSLDistroStart movida a src/main/services/WSLService.js

// Funciones de manejo para Ubuntu (compatibilidad)
// Función handleUbuntuStart movida a src/main/services/WSLService.js

// Función para distribuciones WSL (ahora usa WSLDistroProcessManager)
function startWSLDistroSession(tabId, { cols, rows, distroInfo }) {
  // Inicializar WSLDistroProcessManager si no está inicializado
  if (!WSLDistroProcessManager._initialized) {
    WSLDistroProcessManager.initialize({
      mainWindow,
      getPty,
      isAppQuitting
    });
    WSLDistroProcessManager._initialized = true;
  }

  return WSLDistroProcessManager.startWSLDistroSession(tabId, { cols, rows, distroInfo });
}

// Función para Ubuntu (ahora usa UbuntuProcessManager)
function startUbuntuSession(tabId, { cols, rows, ubuntuInfo }) {
  // Inicializar UbuntuProcessManager si no está inicializado
  if (!UbuntuProcessManager._initialized) {
    UbuntuProcessManager.initialize({
      mainWindow,
      getPty,
      isAppQuitting
    });
    UbuntuProcessManager._initialized = true;
  }

  return UbuntuProcessManager.startUbuntuSession(tabId, { cols, rows, ubuntuInfo });
}

// Funciones de manejo para distribuciones WSL genéricas
function handleWSLDistroData(tabId, data) {
  WSLDistroProcessManager.writeToWSLDistro(tabId, data);
}

function handleUbuntuData(tabId, data) {
  // Si hay un proceso en wslDistroProcesses, usarlo (nuevo sistema)
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].write(data);
    } catch (error) {
      console.error(`Error writing to Ubuntu ${tabId}:`, error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`ubuntu:error:${tabId}`, `Write error: ${error.message}`);
      }
    }
  } else {
    // Fallback al UbuntuProcessManager
    UbuntuProcessManager.writeToUbuntu(tabId, data);
  }
}

function handleWSLDistroResize(tabId, { cols, rows }) {
  WSLDistroProcessManager.resizeWSLDistro(tabId, { cols, rows });
}

function handleUbuntuResize(tabId, { cols, rows }) {
  // Si hay un proceso en wslDistroProcesses, usarlo (nuevo sistema)
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing Ubuntu ${tabId}:`, error);
    }
  } else {
    // Fallback al UbuntuProcessManager
    UbuntuProcessManager.resizeUbuntu(tabId, { cols, rows });
  }
}

function handleWSLDistroStop(tabId) {
  WSLDistroProcessManager.stopWSLDistro(tabId);
}

function handleUbuntuStop(tabId) {
  UbuntuProcessManager.stopUbuntu(tabId);
}

// Función de detección alternativa más simple
function detectUbuntuSimple() {
  return new Promise((resolve) => {
    const platform = os.platform();
    // Función de detección simple iniciada

    if (platform !== 'win32') {
      // En sistemas no Windows, asumir que bash está disponible
      resolve(true);
    } else {
      // En Windows, intentar ejecutar ubuntu de forma más directa
      const { exec } = require('child_process');

      exec('ubuntu', {
        timeout: 3000,
        windowsHide: true
      }, (error, stdout, stderr) => {
        // Si no hay error ENOENT, significa que ubuntu existe
        const isAvailable = !error || error.code !== 'ENOENT';
        resolve(isAvailable);
      });
    }
  });
}

// ✅ REFACTORIZADO: Sistema de registro dinámico para eventos de pestañas movido a tab-events-handler.js
// Wrapper local para mantener compatibilidad con código existente
function registerTabEventsWrapper(tabId) {
  registerTabEvents(tabId, {
    PowerShell,
    WSL,
    Cygwin,
    Claude,
    OpenCode,
    GeminiCli,
    CodexCli,
    AntigravityCli,
    HermesCli,
    startUbuntuSession,
    handleUbuntuData,
    handleUbuntuResize,
    handleUbuntuStop,
    startWSLDistroSession,
    handleWSLDistroData,
    handleWSLDistroResize,
    handleWSLDistroStop,
    getDocker
  });
}

// Evento para registrar nuevas pestañas
ipcMain.on('register-tab-events', (event, tabId) => {
  registerTabEventsWrapper(tabId);
});

// Using dynamic tab registration instead of predefined tabs

// Cleanup terminals on app quit
app.on('before-quit', (event) => {
  isAppQuitting.value = true;

  // Cleanup all PowerShell processes (ahora manejado por PowerShellProcessManager)
  try {
    PowerShell.cleanup();
  } catch (error) {
    console.error('Error cleaning up PowerShell processes on quit:', error);
  }

  // WSL processes cleanup is now handled by WSLService.js

  // Cleanup all Ubuntu processes (ahora manejado por UbuntuProcessManager)
  try {
    UbuntuProcessManager.cleanup();
  } catch (error) {
    console.error('Error cleaning up Ubuntu processes on quit:', error);
  }

  try {
    Claude.cleanup();
  } catch (error) {
    console.error('Error cleaning up Claude processes on quit:', error);
  }

  try {
    OpenCode.cleanup();
  } catch (error) {
    console.error('Error cleaning up OpenCode processes on quit:', error);
  }

  try {
    GeminiCli.cleanup();
  } catch (error) {
    console.error('Error cleaning up GeminiCli processes on quit:', error);
  }

  try {
    CodexCli.cleanup();
  } catch (error) {
    console.error('Error cleaning up CodexCli processes on quit:', error);
  }

  try {
    AntigravityCli.cleanup();
  } catch (error) {
    console.error('Error cleaning up AntigravityCli processes on quit:', error);
  }

  try {
    HermesCli.cleanup();
  } catch (error) {
    console.error('Error cleaning up HermesCli processes on quit:', error);
  }
});

// ✅ OPTIMIZACIÓN: getSystemStats() eliminada - ahora usa StatsWorkerService exclusivamente

// 🚀 OPTIMIZACIÓN: Servicios del sistema diferidos
// Estos servicios y sus handlers se registran en system-services-handlers.js
// Se inicializan después de ready-to-show para no bloquear el arranque

// ✅ OPTIMIZACIÓN: Manejadores de Nextcloud movidos a nextcloud-handlers.js
// Se registran automáticamente desde registerSecondaryHandlers() en handlers/index.js
// NO es necesario registrarlos aquí para evitar ejecución prematura
// Restart attempt

// Domain fix attempt
