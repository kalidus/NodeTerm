// Startup profiler
const { logTiming } = require('./src/main/utils/startup-profiler');
logTiming('Inicio del proceso main.js');

// DOMMatrix polyfill (debe cargarse ANTES de cualquier módulo que use jsdom)
const { initializeDOMMatrixPolyfill } = require('./src/main/polyfills/dommatrix-polyfill');
initializeDOMMatrixPolyfill();
logTiming('Polyfill DOMMatrix cargado');

// Declarar variables
let alternativePtyConfig, SafeWindowsTerminal, registerAllHandlers, cleanupTunnels;
let orphanCleanupInterval = null;

// Importar utilidades centralizadas (fuera del try-catch para acceso global)
const { parseDfOutput, parseNetDev, getGuacdPrefPath, sendToRenderer, cleanupOrphanedConnections } = require('./src/main/utils');
logTiming('Utils cargados');

// Importar servicios centralizados (fuera del try-catch para acceso global)
// Nota: Docker se importará después de que se carguen fs y path
let Docker = null;

const { WSL, PowerShell, Cygwin } = require('./src/main/services');
logTiming('Servicios WSL/PowerShell/Cygwin cargados');

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
  } catch (_) {}
}

const { app, BrowserWindow, ipcMain, clipboard, dialog, Menu, powerMonitor, screen } = require('electron');
logTiming('Electron cargado');
const path = require('path');
const url = require('url');

const os = require('os');
const fs = require('fs');

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
  if (!_SSH2Promise) _SSH2Promise = require('ssh2-promise');
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
    GuacdClient.prototype.send = function(data, afterOpened = false) {
      this.lastActivity = Date.now();
      return originalSend.call(this, data, afterOpened);
    };
    
    // Parchar el constructor para desactivar el watchdog de 10s inmediatamente
    const originalProcessConnectionOpen = GuacdClient.prototype.processConnectionOpen;
    GuacdClient.prototype.processConnectionOpen = function() {
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
let isAppQuitting = false; // Flag para evitar operaciones durante el cierre

// Los handlers SSH se registrarán después de definir findSSHConnection

// Manejador global para errores no capturados relacionados con ConPTY
process.on('uncaughtException', (error) => {
  if (error.message && error.message.includes('AttachConsole failed')) {
    console.warn('Error AttachConsole capturado y suprimido:', error.message);
    return; // Suprimir el error sin crashear la aplicación
  }
  
  // Para otros errores no capturados, mantener el comportamiento por defecto
  console.error('Error no capturado:', error);
  throw error;
});

// Manejador para promesas rechazadas no capturadas
process.on('unhandledRejection', (reason, promise) => {
  // Suprimir errores conocidos de ConPTY
  if (reason && reason.message && reason.message.includes('AttachConsole failed')) {
    console.warn('Promise rechazada con error AttachConsole capturado:', reason.message);
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
  const keyPath = path.join(app.getPath('userData'), 'guacamole-secret.key');
  
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
      } catch {}
      
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

      // Configurar servidor Guacamole-lite
      const websocketOptions = { port: 8081 };
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

      // Crear servidor Guacamole-lite
      guacamoleServer = new (getGuacamoleLite())(websocketOptions, guacdOptions, clientOptions);
      
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
const SPLASH_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      background: linear-gradient(180deg, #1b2330 0%, #0e1116 50%);
      color: #e3f2fd;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
    }
    .h { display: flex; align-items: center; gap: 12px; }
    .s {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.25);
      border-top-color: #79b8ff;
      animation: r 720ms linear infinite;
    }
    @keyframes r { to { transform: rotate(360deg); } }
    .b { font-weight: 600; font-size: 20px; opacity: .95; }
    ul { list-style: none; padding: 0; text-align: left; min-width: 240px; }
    ul li { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 14px; opacity: .9; }
    ul li .i { width: 18px; text-align: center; font-size: 16px; color: #79b8ff; }
    ul li.done .i { color: #7ee787; }
  </style>
</head>
<body>
  <div class="h"><div class="s"></div><span class="b">NodeTerm</span></div>
  <ul>
    <li id="step1"><span class="i">○</span><span class="l">Iniciando NodeTerm...</span></li>
    <li id="step2"><span class="i">○</span><span class="l">Preparando ventana...</span></li>
    <li id="step3"><span class="i">○</span><span class="l">Cargando interfaz...</span></li>
    <li id="step4"><span class="i">○</span><span class="l">Iniciando sesión...</span></li>
  </ul>
</body>
</html>`;

function createWindow() {
  logTiming('createWindow() iniciado');

  // 🚀 SPLASH PRIMERO: antes que la main para no ver ni un frame en negro
  let splashWindow = null;
  const closeSplash = () => {
    try {
      if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null; }
    } catch (_) {}
  };
  const setSplashStep = (sw, stepIndex, done, text) => {
    if (!sw || sw.isDestroyed()) return;
    const icon = done ? '✓' : '○';
    sw.webContents.executeJavaScript(
      `(function(){ var e=document.getElementById('step${stepIndex}'); if(e){ e.innerHTML='<span class="i">${icon}</span><span class="l">'+${JSON.stringify(text)}+'</span>'; e.classList.toggle('done',${!!done}); } })();`
    ).catch(() => {});
  };
  try {
    const d = screen.getPrimaryDisplay();
    const r = d.workArea || d.bounds;
    const W = 420, H = 320;
    const x = Math.round(r.x + (r.width - W) / 2);
    const y = Math.round(r.y + (r.height - H) / 2);
    splashWindow = new BrowserWindow({
      x, y, width: W, height: H,
      frame: false,
      transparent: false,
      backgroundColor: '#1b2330',
      show: true,
      resizable: false,
      alwaysOnTop: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    // 🚀 OPTIMIZACIÓN: loadURL con data URI es instantáneo (no I/O de disco)
    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`);
    splashWindow.focus();
  } catch (e) {
    console.warn('[SPLASH] No se pudo crear ventana de splash:', e?.message);
  }

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1400,
    minHeight: 600,
    title: 'NodeTerm',
    frame: false,
    show: false,
    backgroundColor: '#0e1116',
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

  // 🚀 OPTIMIZACIÓN: Precalentamiento de guacd DIFERIDO hasta después de ready-to-show
  // Se ejecutará en initializeServicesAfterShow() para no bloquear el arranque

  // 🔧 ESPERAR A QUE WEBPACK TERMINE DE COMPILAR EN DESARROLLO
  // Función para verificar si el archivo compilado existe
  async function waitForWebpackBuild(maxWaitMs = 30000) {
    if (process.env.NODE_ENV !== 'development') {
      return true; // En producción, el archivo debería existir siempre
    }

    const distPath = path.join(__dirname, 'dist', 'index.html');
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
          console.error('❌ Error verificando archivo compilado:', error.message);
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

  // Mostrar ventana cuando esté lista para mostrar
  mainWindow.once('ready-to-show', () => {
    logTiming('🎯 ready-to-show - VENTANA VISIBLE');
    if (splashWindow && !splashWindow.isDestroyed()) { try { splashWindow.setAlwaysOnTop(false); } catch (_) {} }
    if (mainWindow) mainWindow.show();
    closeSplash();

    // 🚀 OPTIMIZACIÓN: Inicializar servicios pesados DESPUÉS de mostrar la ventana
    // Usar setImmediate para ejecutar en el siguiente tick del event loop
    setImmediate(() => {
      initializeServicesAfterShow().catch(err => {
        console.error('❌ [POST-SHOW] Error en initializeServicesAfterShow:', err);
      });
    });
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
        anythingLLMService: getAnythingLLMService(),
        openWebUIService: getOpenWebUIService(),
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
        PowerShell.setDependencies({
          mainWindow,
          getPty,
          alternativePtyConfig,
          SafeWindowsTerminal,
          isAppQuitting
        });
        Cygwin.setMainWindow(mainWindow);
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
    });
    
    // 🚀 OPTIMIZACIÓN: Registrar handlers principales (sin túnel SSH)
    registerAllHandlers(getHandlerDependencies());
    
    // Handlers registrados exitosamente
    // Nota: get-user-home ya está registrado en registerSystemHandlers()
    
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
      } catch {}
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
  } catch {}
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
  
  // Para bastiones: usar cacheKey único por destino (permite reutilización)
  // Para SSH directo: usar pooling normal para eficiencia
  const cacheKey = config.useBastionWallix 
    ? `bastion-${config.bastionUser}@${config.bastionHost}->${config.username}@${config.host}:${config.port || 22}`
    : `${config.username}@${config.host}:${config.port || 22}`;
  
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
      () => {
        sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
        if (sshConnections[tabId] && sshConnections[tabId].statsTimeout) {
          clearTimeout(sshConnections[tabId].statsTimeout);
        }
        sendToRenderer(event.sender, 'ssh-connection-disconnected', {
          originalKey: config.originalKey || tabId,
          tabId: tabId
        });
        // Limpiar estado persistente de bastión al cerrar la pestaña
        delete bastionStatsState[tabId];
        delete sshConnections[tabId];
      },
      (err) => {
        const conn = sshConnections[tabId];
        // Detectar errores de autenticación
        const isAuthError = err.message && (
          err.message.includes('authentication') ||
          err.message.includes('Authentication failed') ||
          err.message.includes('All configured authentication methods failed')
        );
        
        if (isAuthError && conn) {
          // Activar modo manual de password para reintento interactivo
          conn.manualPasswordMode = true;
          conn.manualPasswordBuffer = '';
          sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\nAutenticación fallida. Por favor, introduce el password:\r\nPassword: `);
        } else {
          sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
        }
      },
      (stream) => {
        if (sshConnections[tabId]) {
          sshConnections[tabId].stream = stream;
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
      statsLoopRunning: false,
      // Si no hay password, activar modo manual inmediatamente
      manualPasswordMode: !(config.password && config.password.trim()),
      manualPasswordBuffer: ''
    };
    
    // Si no hay password, mostrar prompt inmediatamente
    if (!(config.password && config.password.trim())) {
      sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\nPor favor, introduce el password:\r\nPassword: `);
    }
    
    // Función de bucle de stats para Wallix/bastión
    function wallixStatsLoop() {
      const connObj = sshConnections[tabId];
      if (activeStatsTabId !== tabId) {
        if (connObj) {
          connObj.statsTimeout = null;
          connObj.statsLoopRunning = false;
        }
        return;
      }
      if (!connObj || !connObj.ssh || !connObj.stream) {
        return;
      }
      if (connObj.statsLoopRunning) {
        return;
      }
      
      connObj.statsLoopRunning = true;

      try {
        // // console.log('[WallixStats] Lanzando bucle de stats para bastión', tabId);
        
        if (connObj.ssh.execCommand) {
          const command = 'grep "cpu " /proc/stat && free -b && df -P && uptime && cat /proc/net/dev && hostname && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo "" && cat /etc/os-release';
          connObj.ssh.execCommand(command, (err, result) => {
            if (err || !result) {
              // Enviar stats básicas en caso de error
              const fallbackStats = {
                cpu: '0.00',
                mem: { total: 0, used: 0 },
                disk: [],
                uptime: 'Error',
                network: { rx_speed: 0, tx_speed: 0 },
                hostname: 'Bastión',
                distro: 'linux',
                ip: config.host
              };
              sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, fallbackStats);
              
              // Reintentar en 5 segundos
              if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed && activeStatsTabId === tabId) {
                sshConnections[tabId].statsLoopRunning = false;
                sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000);
              } else {
                if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
              }
              return;
            }
            
            const output = result.stdout;
            // // console.log('[WallixStats] Output recibido, length:', output.length);
            // // console.log('[WallixStats] Raw output preview:', JSON.stringify(output.substring(0, 300)));
            
            try {
              const parts = output.trim().split('\n');
              // // console.log('[WallixStats] Parts found:', parts.length);
              // // console.log('[WallixStats] First 5 parts:', parts.slice(0, 5));
              
              // CPU - buscar línea que empiece con "cpu "
              const cpuLineIndex = parts.findIndex(line => line.trim().startsWith('cpu '));
              let cpuLoad = '0.00';
              if (cpuLineIndex >= 0) {
                const cpuLine = parts[cpuLineIndex];
                const cpuTimes = cpuLine.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
                // Usar estado persistente para bastión
                const previousCpu = bastionStatsState[tabId]?.previousCpu;
                if (cpuTimes.length >= 8) {
                  const currentCpu = { user: cpuTimes[0], nice: cpuTimes[1], system: cpuTimes[2], idle: cpuTimes[3], iowait: cpuTimes[4], irq: cpuTimes[5], softirq: cpuTimes[6], steal: cpuTimes[7] };
                  if (previousCpu) {
                    const prevIdle = previousCpu.idle + previousCpu.iowait;
                    const currentIdle = currentCpu.idle + currentCpu.iowait;
                    const prevTotal = Object.values(previousCpu).reduce((a, b) => a + b, 0);
                    const currentTotal = Object.values(currentCpu).reduce((a, b) => a + b, 0);
                    const totalDiff = currentTotal - prevTotal;
                    const idleDiff = currentIdle - prevIdle;
                    if (totalDiff > 0) {
                      cpuLoad = ((totalDiff - idleDiff) * 100 / totalDiff).toFixed(2);
                    }
                  }
                  // Guardar estado persistente para bastión
                  if (!bastionStatsState[tabId]) bastionStatsState[tabId] = {};
                  bastionStatsState[tabId].previousCpu = currentCpu;
                }
              }
              
              // Memoria
              const memLine = parts.find(line => line.startsWith('Mem:')) || '';
              const memParts = memLine.split(/\s+/);
              const mem = {
                total: parseInt(memParts[1], 10) || 0,
                used: parseInt(memParts[2], 10) || 0,
              };
              
              // Disco
              const dfIndex = parts.findIndex(line => line.trim().startsWith('Filesystem'));
              const disks = dfIndex >= 0 ? (function() {
                const lines = parts.slice(dfIndex).filter(l => l.trim() !== '');
                lines.shift(); // Remove header
                return lines.map(line => {
                  const p = line.trim().split(/\s+/);
                  if (p.length >= 6) {
                    const use = parseInt(p[p.length - 2], 10);
                    const name = p[p.length - 1];
                    if (name && name.startsWith('/') && !isNaN(use) && !name.startsWith('/sys') && !name.startsWith('/opt') && !name.startsWith('/run') && name !== '/boot/efi' && !name.startsWith('/dev') && !name.startsWith('/var')) {
                      return { fs: name, use };
                    }
                  }
                  return null;
                }).filter(Boolean);
              })() : [];
              
              // Uptime
              const uptimeLine = parts.find(line => line.includes(' up '));
              let uptime = 'N/A';
              if (uptimeLine) {
                const match = uptimeLine.match(/up (.*?),/);
                if (match && match[1]) {
                  uptime = match[1].trim();
                }
              }
              
              // Network
              const netIndex = parts.findIndex(line => line.trim().includes('Inter-|   Receive'));
              let network = { rx_speed: 0, tx_speed: 0 };
              if (netIndex >= 0) {
                const netLines = parts.slice(netIndex + 2, netIndex + 4);
                let totalRx = 0, totalTx = 0;
                netLines.forEach(line => {
                  const p = line.trim().split(/\s+/);
                  if (p.length >= 10) {
                    totalRx += parseInt(p[1], 10) || 0;
                    totalTx += parseInt(p[9], 10) || 0;
                  }
                });
                // Usar estado persistente para bastión
                const previousNet = bastionStatsState[tabId]?.previousNet;
                const previousTime = bastionStatsState[tabId]?.previousTime;
                const currentTime = Date.now();
                if (previousNet && previousTime) {
                  const timeDiff = (currentTime - previousTime) / 1000;
                  const rxDiff = totalRx - previousNet.totalRx;
                  const txDiff = totalTx - previousNet.totalTx;
                  network.rx_speed = Math.max(0, rxDiff / timeDiff);
                  network.tx_speed = Math.max(0, txDiff / timeDiff);
                }
                if (!bastionStatsState[tabId]) bastionStatsState[tabId] = {};
                bastionStatsState[tabId].previousNet = { totalRx, totalTx };
                bastionStatsState[tabId].previousTime = currentTime;
              }
              
              // Hostname, IP y distro
              let hostname = 'Bastión';
              let finalDistroId = 'linux';
              let ip = '';
              // Buscar hostname real
              const hostnameLineIndex = parts.findIndex(line => 
                line && !line.includes('=') && !line.includes(':') && 
                !line.includes('/') && !line.includes('$') && 
                line.trim().length > 0 && line.trim().length < 50 &&
                !line.includes('cpu') && !line.includes('Mem') && 
                !line.includes('total') && !line.includes('Filesystem')
              );
              if (hostnameLineIndex >= 0 && hostnameLineIndex < parts.length - 5) {
                hostname = parts[hostnameLineIndex].trim();
              }
              // Buscar IP real (línea después de hostname)
              let ipLine = '';
              if (hostnameLineIndex >= 0 && hostnameLineIndex < parts.length - 4) {
                ipLine = parts[hostnameLineIndex + 1]?.trim() || '';
              }
              // Tomar la última IP válida (no 127.0.0.1, no vacía)
              if (ipLine) {
                const ipCandidates = ipLine.split(/\s+/).filter(s => s && s !== '127.0.0.1' && s !== '::1');
                if (ipCandidates.length > 0) {
                  ip = ipCandidates[ipCandidates.length - 1];
                }
              }
              if (!ip) ip = config.host;
              // Buscar distro y versionId en os-release (todo el output)
              let versionId = '';
              try {
                const osReleaseLines = parts;
                let idLine = osReleaseLines.find(line => line.trim().startsWith('ID='));
                let idLikeLine = osReleaseLines.find(line => line.trim().startsWith('ID_LIKE='));
                let versionIdLine = osReleaseLines.find(line => line.trim().startsWith('VERSION_ID='));
                let rawDistro = '';
                if (idLine) {
                  const match = idLine.match(/^ID=("?)([^"\n]*)\1$/);
                  if (match) rawDistro = match[2].toLowerCase();
                }
                if (["rhel", "redhat", "redhatenterpriseserver", "red hat enterprise linux"].includes(rawDistro)) {
                  finalDistroId = "rhel";
                } else if (rawDistro === 'linux' && idLikeLine) {
                  const match = idLikeLine.match(/^ID_LIKE=("?)([^"\n]*)\1$/);
                  const idLike = match ? match[2].toLowerCase() : '';
                  if (idLike.includes('rhel') || idLike.includes('redhat')) {
                    finalDistroId = "rhel";
                  } else {
                    finalDistroId = rawDistro;
                  }
                } else if (rawDistro) {
                  finalDistroId = rawDistro;
                }
                if (versionIdLine) {
                  const match = versionIdLine.match(/^VERSION_ID=("?)([^"\n]*)\1$/);
                  if (match) versionId = match[2];
                }
              } catch (e) {}
              const stats = {
                cpu: cpuLoad,
                mem,
                disk: disks,
                uptime,
                network,
                hostname,
                distro: finalDistroId,
                versionId,
                ip
              };
              
              sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
              
            } catch (parseErr) {
              // Error parseando stats
            }
            
            // Programar siguiente ejecución
            if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed && activeStatsTabId === tabId) {
              sshConnections[tabId].statsLoopRunning = false;
              sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 2000);
            } else {
              if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
            }
          });
          
        } else {
          // Fallback con stats básicas
          const stats = {
            cpu: '0.00',
            mem: { total: 0, used: 0 },
            disk: [],
            uptime: 'N/A',
            network: { rx_speed: 0, tx_speed: 0 },
            hostname: 'Bastión',
            distro: 'linux',
            ip: config.host
          };
          sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
        }
        
      } catch (e) {
        // Reintentar en 5 segundos
        if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed && activeStatsTabId === tabId) {
          sshConnections[tabId].statsLoopRunning = false;
          sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000);
        } else {
          if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
        }
      }
    }
    
    // Asignar la función wallixStatsLoop al objeto de conexión
    sshConnections[tabId].wallixStatsLoop = wallixStatsLoop;
    
    sendToRenderer(event.sender, `ssh:ready:${tabId}`);
    sendToRenderer(event.sender, 'ssh-connection-ready', {
      originalKey: config.originalKey || tabId,
      tabId: tabId
    });
    return;
  } else {
    // SSH DIRECTO: Lógica de pooling normal
    const existingPoolConnection = sshConnectionPool[cacheKey];
    if (existingPoolConnection) {
      try {
        await existingPoolConnection.exec('echo "test"');
        ssh = existingPoolConnection;
        isReusedConnection = true;
      } catch (testError) {
        try {
          existingPoolConnection.close();
        } catch (e) {}
        delete sshConnectionPool[cacheKey];
      }
    }
    if (!ssh) {
      const directConfig = {
        host: config.host,
        username: config.username,
        port: config.port || 22
      };
      
      // Si hay password, usarlo. Si no, permitir autenticación interactiva
      if (config.password && config.password.trim()) {
        directConfig.password = config.password;
      } else {
        // Permitir autenticación interactiva (el usuario introducirá el password en la terminal)
        directConfig.tryKeyboard = true;
      }
      
      ssh = new (getSSH2Promise())(directConfig);
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
          stream = await ssh.shell({ 
            term: 'xterm-256color',
            cols: 80,
            rows: 24
          });
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
      } catch (e) {}
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
        
        // Guardar referencia inicial para capturar entrada durante autenticación
        sshConnections[tabId] = {
          ssh: ssh2Client,
          stream: null,
          config,
          cacheKey,
          originalKey: config.originalKey || tabId,
          previousCpu: null,
          statsTimeout: null,
          previousNet: null,
          previousTime: null,
          manualPasswordMode: true, // Activar modo manual de password
          manualPasswordBuffer: ''
        };
        
        // Manejar autenticación interactiva
        ssh2Client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
          const conn = sshConnections[tabId];
          if (conn) {
            // Mostrar instrucciones y prompts en la terminal
            if (instructions) {
              sendToRenderer(event.sender, `ssh:data:${tabId}`, instructions + '\r\n');
            }
            
            // Mostrar el primer prompt
            if (prompts.length > 0 && prompts[0].prompt) {
              sendToRenderer(event.sender, `ssh:data:${tabId}`, prompts[0].prompt);
            } else if (prompts.length > 0) {
              sendToRenderer(event.sender, `ssh:data:${tabId}`, 'Password: ');
            }
            
            // Guardar callback para cuando el usuario escriba
            conn.keyboardInteractiveFinish = finish;
            conn.keyboardInteractivePrompts = prompts;
            conn.keyboardInteractiveResponses = [];
            conn._currentResponse = '';
            
            // NO llamar finish() aquí - esperar a que el usuario escriba
          }
        });
        
        // Crear shell cuando la conexión esté lista
        ssh2Client.on('ready', () => {
          ssh2Client.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, async (err, shellStream) => {
            if (err) {
              sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
              ssh2Client.end();
              return;
            }
            
            const conn = sshConnections[tabId];
            if (!conn) return;
            
            // Crear wrapper para exec compatible con statsLoop
            // IMPORTANTE: Guardar el método original antes de reemplazarlo para evitar recursión
            const originalExec = ssh2Client.exec.bind(ssh2Client);
            
            const execWrapper = (command) => {
              return new Promise((resolve, reject) => {
                // Usar el método original, no el wrapper
                originalExec(command, (err, stream) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  let output = '';
                  stream.on('data', (data) => {
                    output += data.toString('utf-8');
                  });
                  stream.on('close', (code) => {
                    if (code === 0) {
                      resolve(output);
                    } else {
                      reject(new Error(`Command failed with code ${code}`));
                    }
                  });
                  stream.stderr.on('data', (data) => {
                    output += data.toString('utf-8');
                  });
                });
              });
            };
            
            // Agregar método exec para compatibilidad con statsLoop
            ssh2Client.exec = execWrapper;
            
            // Obtener hostname y distro para stats
            let realHostname = 'unknown';
            let osRelease = '';
            try {
              realHostname = (await execWrapper('hostname')).trim() || 'unknown';
            } catch (e) {
              console.warn('[SSH] Error obteniendo hostname:', e);
            }
            try {
              osRelease = await execWrapper('cat /etc/os-release');
            } catch (e) {
              osRelease = 'ID=linux';
            }
            const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
            const finalDistroId = distroId.replace(/"/g, '').toLowerCase();
            
            // Actualizar conexión
            conn.ssh = ssh2Client;
            conn.stream = shellStream;
            conn.realHostname = realHostname;
            conn.finalDistroId = finalDistroId;
            conn.manualPasswordMode = false; // Desactivar modo manual
            
            // Configurar listeners del stream
            shellStream.on('data', (data) => {
              const dataStr = data.toString('utf-8');
              if (getSessionRecorder().isRecording(tabId)) {
                getSessionRecorder().recordOutput(tabId, dataStr);
              }
              sendToRenderer(event.sender, `ssh:data:${tabId}`, dataStr);
            });
            
            shellStream.on('close', () => {
              sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
              if (sshConnections[tabId] && sshConnections[tabId].statsTimeout) {
                clearTimeout(sshConnections[tabId].statsTimeout);
              }
              sendToRenderer(event.sender, 'ssh-connection-disconnected', {
                originalKey: conn.originalKey || tabId,
                tabId: tabId
              });
              delete sshConnections[tabId];
              ssh2Client.end();
            });
            
            shellStream.stderr?.on('data', (data) => {
              sendToRenderer(event.sender, `ssh:data:${tabId}`, data.toString('utf-8'));
            });
            
            sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\n✅ Conectado exitosamente.\r\n');
            sendToRenderer(event.sender, `ssh:ready:${tabId}`);
            sendToRenderer(event.sender, 'ssh-connection-ready', {
              originalKey: conn.originalKey || tabId,
              tabId: tabId
            });
            
            // Inicializar statsLoop después de un breve delay (IMPORTANTE: para que la status bar funcione)
            setTimeout(() => {
              if (sshConnections[tabId] && sshConnections[tabId].ssh) {
                statsLoop(tabId, realHostname, finalDistroId, config.host);
              }
            }, 1000);
          });
        });
        
        ssh2Client.on('error', (err) => {
          const conn = sshConnections[tabId];
          // Si es error de autenticación, activar modo manual para reintentar
          if (err.message && (err.message.includes('authentication') || err.message.includes('Authentication failed') || err.message.includes('All configured authentication methods failed'))) {
            if (conn) {
              conn.manualPasswordMode = true;
              conn.manualPasswordBuffer = '';
            }
            sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\nAutenticación fallida. Por favor, introduce el password:\r\nPassword: `);
            return;
          }
          sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
        });
        
        // Conectar con autenticación interactiva
        const connectConfig = {
          host: config.host,
          username: config.username,
          port: config.port || 22,
          tryKeyboard: true, // Permitir autenticación interactiva
          readyTimeout: 30000,
          keepaliveInterval: 60000
        };
        
        // NO incluir password si falló antes - forzar autenticación interactiva
        // Si no hay password configurado, no incluirlo
        if (config.password && config.password.trim() && !isAuthError) {
          connectConfig.password = config.password;
        }
        
        // Si no hay password configurado, activar modo manual inmediatamente
        if (!config.password || !config.password.trim()) {
          const conn = sshConnections[tabId];
          if (conn) {
            conn.manualPasswordMode = true;
            conn.manualPasswordBuffer = '';
            // Mostrar prompt inmediatamente con mensaje claro
            sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\nPor favor, introduce el password:\r\nPassword: `);
          }
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
  
  // Si hay modo manual de password activo (cuando keyboard-interactive no funciona o password incorrecto)
  if (conn.manualPasswordMode) {
    // Acumular la entrada del usuario
    if (!conn.manualPasswordBuffer) {
      conn.manualPasswordBuffer = '';
    }
    
    // Si el usuario presiona Enter, reconectar con el password
    if (data.includes('\r') || data.includes('\n')) {
      const password = (conn.manualPasswordBuffer + data.replace(/[\r\n]/g, '')).trim();
      
      if (password) {
        // Limpiar modo manual
        conn.manualPasswordMode = false;
        conn.manualPasswordBuffer = '';
        
        // Cerrar conexión anterior si existe
        if (conn.ssh && typeof conn.ssh.end === 'function') {
          try {
            conn.ssh.end();
          } catch (e) {}
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
            () => {
              sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
              if (sshConnections[tabId] && sshConnections[tabId].statsTimeout) {
                clearTimeout(sshConnections[tabId].statsTimeout);
              }
              sendToRenderer(event.sender, 'ssh-connection-disconnected', {
                originalKey: conn.originalKey || tabId,
                tabId: tabId
              });
              delete bastionStatsState[tabId];
              delete sshConnections[tabId];
            },
            (err) => {
              const isAuthError = err.message && (
                err.message.includes('authentication') ||
                err.message.includes('Authentication failed') ||
                err.message.includes('All configured authentication methods failed')
              );
              
              if (isAuthError) {
                conn.manualPasswordMode = true;
                conn.manualPasswordBuffer = '';
                sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\nPassword incorrecto. Intenta de nuevo:\r\nPassword: `);
              } else {
                sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
              }
            },
            (stream) => {
              if (sshConnections[tabId]) {
                sshConnections[tabId].stream = stream;
                const pending = sshConnections[tabId]._pendingResize;
                if (pending && stream && !stream.destroyed && typeof stream.setWindow === 'function') {
                  const safeRows = Math.max(1, Math.min(300, pending.rows || 24));
                  const safeCols = Math.max(1, Math.min(500, pending.cols || 80));
                  stream.setWindow(safeRows, safeCols);
                  sshConnections[tabId]._pendingResize = null;
                }
                
                // Crear función wallixStatsLoop si no existe
                if (!conn.wallixStatsLoop) {
                  function wallixStatsLoop() {
                    const connObj = sshConnections[tabId];
                    if (activeStatsTabId !== tabId) {
                      if (connObj) {
                        connObj.statsTimeout = null;
                        connObj.statsLoopRunning = false;
                      }
                      return;
                    }
                    if (!connObj || !connObj.ssh || !connObj.stream) {
                      return;
                    }
                    if (connObj.statsLoopRunning) {
                      return;
                    }
                    
                    connObj.statsLoopRunning = true;

                    try {
                      if (connObj.ssh.execCommand) {
                        const command = 'grep "cpu " /proc/stat && free -b && df -P && uptime && cat /proc/net/dev && hostname && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo "" && cat /etc/os-release';
                        connObj.ssh.execCommand(command, (err, result) => {
                          if (err || !result) {
                            const fallbackStats = {
                              cpu: '0.00',
                              mem: { total: 0, used: 0 },
                              disk: [],
                              uptime: 'Error',
                              network: { rx_speed: 0, tx_speed: 0 },
                              hostname: 'Bastión',
                              distro: 'linux',
                              ip: newConfig.host
                            };
                            sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, fallbackStats);
                            
                            if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed && activeStatsTabId === tabId) {
                              sshConnections[tabId].statsLoopRunning = false;
                              sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000);
                            } else {
                              if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
                            }
                            return;
                          }
                          
                          const output = result.stdout;
                          
                          try {
                            const parts = output.trim().split('\n');
                            
                            const cpuLineIndex = parts.findIndex(line => line.trim().startsWith('cpu '));
                            let cpuLoad = '0.00';
                            if (cpuLineIndex >= 0) {
                              const cpuLine = parts[cpuLineIndex];
                              const cpuTimes = cpuLine.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
                              const previousCpu = bastionStatsState[tabId]?.previousCpu;
                              if (cpuTimes.length >= 8) {
                                const currentCpu = { user: cpuTimes[0], nice: cpuTimes[1], system: cpuTimes[2], idle: cpuTimes[3], iowait: cpuTimes[4], irq: cpuTimes[5], softirq: cpuTimes[6], steal: cpuTimes[7] };
                                if (previousCpu) {
                                  const prevIdle = previousCpu.idle + previousCpu.iowait;
                                  const currentIdle = currentCpu.idle + currentCpu.iowait;
                                  const prevTotal = Object.values(previousCpu).reduce((a, b) => a + b, 0);
                                  const currentTotal = Object.values(currentCpu).reduce((a, b) => a + b, 0);
                                  const totalDiff = currentTotal - prevTotal;
                                  const idleDiff = currentIdle - prevIdle;
                                  if (totalDiff > 0) {
                                    cpuLoad = ((1 - idleDiff / totalDiff) * 100).toFixed(2);
                                  }
                                }
                                if (!bastionStatsState[tabId]) bastionStatsState[tabId] = {};
                                bastionStatsState[tabId].previousCpu = currentCpu;
                              }
                            }
                            
                            const freeLineIndex = parts.findIndex(line => line.trim().startsWith('Mem:'));
                            let mem = { total: 0, used: 0 };
                            if (freeLineIndex >= 0) {
                              const memParts = parts[freeLineIndex].trim().split(/\s+/);
                              if (memParts.length >= 4) {
                                mem.total = parseInt(memParts[1], 10);
                                mem.used = parseInt(memParts[2], 10);
                              }
                            }
                            
                            const dfLines = parts.filter(line => line.trim() && !line.includes('Filesystem') && !line.includes('tmpfs') && !line.includes('devtmpfs'));
                            const disks = dfLines.slice(0, 3).map(line => {
                              const dfParts = line.trim().split(/\s+/);
                              if (dfParts.length >= 5) {
                                return {
                                  mount: dfParts[5] || '/',
                                  total: parseInt(dfParts[1], 10) * 1024,
                                  used: parseInt(dfParts[2], 10) * 1024
                                };
                              }
                              return null;
                            }).filter(d => d !== null);
                            
                            const uptimeLine = parts.find(line => line.includes('up'));
                            let uptime = 'N/A';
                            if (uptimeLine) {
                              uptime = uptimeLine.replace(/.*up\s+/, '').trim();
                            }
                            
                            const netLineIndex = parts.findIndex(line => line.trim().startsWith('Inter-face') || line.trim().startsWith('face'));
                            let network = { rx_speed: 0, tx_speed: 0 };
                            if (netLineIndex >= 0 && netLineIndex + 1 < parts.length) {
                              const netLine = parts[netLineIndex + 1];
                              const netParts = netLine.trim().split(/\s+/);
                              if (netParts.length >= 10) {
                                const rx = parseInt(netParts[1], 10);
                                const tx = parseInt(netParts[9], 10);
                                const previousNet = bastionStatsState[tabId]?.previousNet;
                                const previousTime = bastionStatsState[tabId]?.previousTime;
                                const currentTime = Date.now();
                                if (previousNet && previousTime) {
                                  const timeDiff = (currentTime - previousTime) / 1000;
                                  if (timeDiff > 0) {
                                    network.rx_speed = Math.max(0, (rx - previousNet.rx) / timeDiff);
                                    network.tx_speed = Math.max(0, (tx - previousNet.tx) / timeDiff);
                                  }
                                }
                                if (!bastionStatsState[tabId]) bastionStatsState[tabId] = {};
                                bastionStatsState[tabId].previousNet = { rx, tx };
                                bastionStatsState[tabId].previousTime = currentTime;
                              }
                            }
                            
                            const hostnameLine = parts.find(line => line.trim() && !line.includes(':') && !line.includes('=') && !line.includes('Filesystem') && !line.includes('Mem:') && !line.includes('cpu ') && !line.includes('up') && !line.includes('Inter-face') && !line.includes('face'));
                            const hostname = hostnameLine ? hostnameLine.trim() : 'Bastión';
                            
                            const ipLine = parts.find(line => /^\d+\.\d+\.\d+\.\d+/.test(line.trim()));
                            const ip = ipLine ? ipLine.trim().split(/\s+/)[0] : newConfig.host;
                            
                            const osReleaseLines = parts.filter(line => line.includes('='));
                            let finalDistroId = 'linux';
                            let versionId = '';
                            try {
                              let idLine = osReleaseLines.find(line => line.trim().startsWith('ID='));
                              let idLikeLine = osReleaseLines.find(line => line.trim().startsWith('ID_LIKE='));
                              let versionIdLine = osReleaseLines.find(line => line.trim().startsWith('VERSION_ID='));
                              let rawDistro = '';
                              if (idLine) {
                                const match = idLine.match(/^ID=("?)([^"\n]*)\1$/);
                                if (match) rawDistro = match[2].toLowerCase();
                              }
                              if (["rhel", "redhat", "redhatenterpriseserver", "red hat enterprise linux"].includes(rawDistro)) {
                                finalDistroId = "rhel";
                              } else if (rawDistro === 'linux' && idLikeLine) {
                                const match = idLikeLine.match(/^ID_LIKE=("?)([^"\n]*)\1$/);
                                const idLike = match ? match[2].toLowerCase() : '';
                                if (idLike.includes('rhel') || idLike.includes('redhat')) {
                                  finalDistroId = "rhel";
                                } else {
                                  finalDistroId = rawDistro;
                                }
                              } else if (rawDistro) {
                                finalDistroId = rawDistro;
                              }
                              if (versionIdLine) {
                                const match = versionIdLine.match(/^VERSION_ID=("?)([^"\n]*)\1$/);
                                if (match) versionId = match[2];
                              }
                            } catch (e) {}
                            const stats = {
                              cpu: cpuLoad,
                              mem,
                              disk: disks,
                              uptime,
                              network,
                              hostname,
                              distro: finalDistroId,
                              versionId,
                              ip
                            };
                            
                            sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
                            
                          } catch (parseErr) {
                            // Error parseando
                          }
                          
                          if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed && activeStatsTabId === tabId) {
                            sshConnections[tabId].statsLoopRunning = false;
                            sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 2000);
                          } else {
                            if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
                          }
                        });
                        
                      } else {
                        const stats = {
                          cpu: '0.00',
                          mem: { total: 0, used: 0 },
                          disk: [],
                          uptime: 'N/A',
                          network: { rx_speed: 0, tx_speed: 0 },
                          hostname: 'Bastión',
                          distro: 'linux',
                          ip: newConfig.host
                        };
                        sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
                      }
                      
                    } catch (e) {
                      if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed && activeStatsTabId === tabId) {
                        sshConnections[tabId].statsLoopRunning = false;
                        sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000);
                      } else {
                        if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
                      }
                    }
                  }
                  
                  conn.wallixStatsLoop = wallixStatsLoop;
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
          
          sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\n✅ Conectado exitosamente.\r\n');
          sendToRenderer(event.sender, `ssh:ready:${tabId}`);
          sendToRenderer(event.sender, 'ssh-connection-ready', {
            originalKey: conn.originalKey || tabId,
            tabId: tabId
          });
        } else {
          // Conexión SSH directa
          const ssh2Client = new (getSSH2Client())();
          
          ssh2Client.on('ready', () => {
            ssh2Client.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, async (err, shellStream) => {
              if (err) {
                sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
                ssh2Client.end();
                // Activar modo manual de nuevo para reintentar
                conn.manualPasswordMode = true;
                conn.manualPasswordBuffer = '';
                sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\nPassword incorrecto. Intenta de nuevo:\r\nPassword: `);
                return;
              }
              
              // Crear wrapper para exec compatible con statsLoop
              // IMPORTANTE: Guardar el método original antes de reemplazarlo para evitar recursión
              const originalExec = ssh2Client.exec.bind(ssh2Client);
              
              const execWrapper = (command) => {
                return new Promise((resolve, reject) => {
                  // Usar el método original, no el wrapper
                  originalExec(command, (err, stream) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    let output = '';
                    stream.on('data', (data) => {
                      output += data.toString('utf-8');
                    });
                    stream.on('close', (code) => {
                      if (code === 0) {
                        resolve(output);
                      } else {
                        reject(new Error(`Command failed with code ${code}`));
                      }
                    });
                    stream.stderr.on('data', (data) => {
                      output += data.toString('utf-8');
                    });
                  });
                });
              };
              
              // Agregar método exec para compatibilidad con statsLoop
              ssh2Client.exec = execWrapper;
              
              // Obtener hostname y distro para stats
              let realHostname = 'unknown';
              let osRelease = '';
              try {
                realHostname = (await execWrapper('hostname')).trim() || 'unknown';
              } catch (e) {
                console.warn('[SSH] Error obteniendo hostname:', e);
              }
              try {
                osRelease = await execWrapper('cat /etc/os-release');
              } catch (e) {
                osRelease = 'ID=linux';
              }
              const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
              const finalDistroId = distroId.replace(/"/g, '').toLowerCase();
              
              // Actualizar conexión
              conn.ssh = ssh2Client;
              conn.stream = shellStream;
              conn.realHostname = realHostname;
              conn.finalDistroId = finalDistroId;
              
              // Configurar listeners del stream
              shellStream.on('data', (data) => {
                const dataStr = data.toString('utf-8');
                if (getSessionRecorder().isRecording(tabId)) {
                  getSessionRecorder().recordOutput(tabId, dataStr);
                }
                sendToRenderer(event.sender, `ssh:data:${tabId}`, dataStr);
              });
              
              shellStream.on('close', () => {
                sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
                if (sshConnections[tabId] && sshConnections[tabId].statsTimeout) {
                  clearTimeout(sshConnections[tabId].statsTimeout);
                }
                sendToRenderer(event.sender, 'ssh-connection-disconnected', {
                  originalKey: conn.originalKey || tabId,
                  tabId: tabId
                });
                delete sshConnections[tabId];
                ssh2Client.end();
              });
              
              shellStream.stderr?.on('data', (data) => {
                sendToRenderer(event.sender, `ssh:data:${tabId}`, data.toString('utf-8'));
              });
              
              sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\n✅ Conectado exitosamente.\r\n');
              sendToRenderer(event.sender, `ssh:ready:${tabId}`);
              sendToRenderer(event.sender, 'ssh-connection-ready', {
                originalKey: conn.originalKey || tabId,
                tabId: tabId
              });
              
              // CRÍTICO: Inicializar statsLoop después de un breve delay para que la status bar funcione
              setTimeout(() => {
                if (sshConnections[tabId] && sshConnections[tabId].ssh) {
                  statsLoop(tabId, realHostname, finalDistroId, conn.config.host);
                }
              }, 1000);
            });
          });
          
          ssh2Client.on('error', (err) => {
            sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
            // Activar modo manual de nuevo para reintentar
            conn.manualPasswordMode = true;
            conn.manualPasswordBuffer = '';
            sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\nPassword incorrecto. Intenta de nuevo:\r\nPassword: `);
          });
          
          ssh2Client.connect({
            host: newConfig.host,
            username: newConfig.username,
            port: newConfig.port || 22,
            password: password,
            readyTimeout: 30000,
            keepaliveInterval: 60000
          });
        }
      } else {
        sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\nPassword vacío. Por favor, introduce el password:\r\nPassword: `);
      }
    } else {
      // Acumular caracteres (ocultar en terminal para password)
      // Solo acumular si no es Enter (Enter se procesa arriba)
      if (!data.includes('\r') && !data.includes('\n')) {
        // Detectar backspace (\b o \x7f)
        if (data === '\b' || data === '\x7f' || data.charCodeAt(0) === 8 || data.charCodeAt(0) === 127) {
          // Eliminar último carácter del buffer si existe
          if (conn.manualPasswordBuffer.length > 0) {
            conn.manualPasswordBuffer = conn.manualPasswordBuffer.slice(0, -1);
            // Enviar backspace + espacio + backspace para borrar visualmente el asterisco
            sendToRenderer(event.sender, `ssh:data:${tabId}`, '\b \b');
          } else {
            // Si no hay caracteres, solo enviar el backspace sin efecto
            sendToRenderer(event.sender, `ssh:data:${tabId}`, '\b');
          }
        } else {
          // Carácter normal: acumular y mostrar asterisco
          conn.manualPasswordBuffer += data;
          // Mostrar asteriscos en lugar del password
          sendToRenderer(event.sender, `ssh:data:${tabId}`, '*');
        }
      }
    }
    return;
  }
  
  // Si hay autenticación interactiva pendiente (keyboard-interactive)
  if (conn && conn.keyboardInteractiveFinish && conn.keyboardInteractivePrompts) {
    // Acumular la entrada del usuario
    if (!conn._currentResponse) {
      conn._currentResponse = '';
    }
    
    // Si el usuario presiona Enter, procesar la respuesta
    if (data.includes('\r') || data.includes('\n')) {
      // Agregar la respuesta actual (sin el Enter)
      const response = (conn._currentResponse + data.replace(/[\r\n]/g, '')).trim();
      if (response) {
        conn.keyboardInteractiveResponses.push(response);
      } else if (conn.keyboardInteractiveResponses.length < conn.keyboardInteractivePrompts.length) {
        // Respuesta vacía también cuenta
        conn.keyboardInteractiveResponses.push('');
      }
      
      conn._currentResponse = '';
      
      // Si tenemos todas las respuestas, enviarlas
      if (conn.keyboardInteractiveResponses.length >= conn.keyboardInteractivePrompts.length) {
        const responses = conn.keyboardInteractiveResponses.slice(0, conn.keyboardInteractivePrompts.length);
        const finish = conn.keyboardInteractiveFinish;
        
        // Limpiar estado de autenticación interactiva antes de llamar finish
        conn.keyboardInteractiveFinish = null;
        conn.keyboardInteractivePrompts = null;
        conn.keyboardInteractiveResponses = [];
        conn._currentResponse = '';
        
        // Enviar las respuestas
        finish(responses);
      } else {
        // Mostrar el siguiente prompt
        const nextIndex = conn.keyboardInteractiveResponses.length;
        if (nextIndex < conn.keyboardInteractivePrompts.length && conn.keyboardInteractivePrompts[nextIndex].prompt) {
          sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\n' + conn.keyboardInteractivePrompts[nextIndex].prompt);
        }
      }
    } else {
      // Acumular caracteres (la entrada se mostrará en la terminal normalmente)
      conn._currentResponse += data;
    }
    return;
  }
  
  // Comportamiento normal: enviar datos al stream
  if (conn && conn.stream && !conn.stream.destroyed) {
    // OPTIMIZACIÓN: Para conexiones Wallix/Bastion, usar buffering para reducir lag
    const isWallixConnection = conn.config?.useBastionWallix || conn.ssh?._isWallixConnection;
    
    if (isWallixConnection) {
      // Inicializar buffer de escritura si no existe
      if (!conn._writeBuffer) {
        conn._writeBuffer = '';
        conn._writeBufferTimeout = null;
      }
      
      // Acumular datos en el buffer
      conn._writeBuffer += data;
      
      // Cancelar timeout previo si existe
      if (conn._writeBufferTimeout) {
        clearTimeout(conn._writeBufferTimeout);
      }
      
      // Función para flush del buffer
      const flushBuffer = () => {
        if (conn._writeBuffer && conn.stream && !conn.stream.destroyed) {
          const bufferedData = conn._writeBuffer;
          conn._writeBuffer = '';
          conn._writeBufferTimeout = null;
          
          // Grabar input de forma asíncrona (no bloqueante)
          if (getSessionRecorder().isRecording(tabId)) {
            setImmediate(() => {
              getSessionRecorder().recordInput(tabId, bufferedData);
            });
          }
          
          // Escribir al stream
          conn.stream.write(bufferedData);
        }
      };
      
      // Flush inmediato para caracteres especiales (Enter, Ctrl+C, etc.)
      const hasSpecialChar = data.includes('\r') || data.includes('\n') || 
                             data.includes('\x03') || data.includes('\x04') ||
                             data.includes('\x1b'); // ESC
      
      if (hasSpecialChar || conn._writeBuffer.length >= 8) {
        // Flush inmediato para comandos o buffers largos
        flushBuffer();
      } else {
        // Para caracteres normales, hacer micro-batching con timeout corto
        conn._writeBufferTimeout = setTimeout(flushBuffer, 5);
      }
    } else {
      // SSH directo: comportamiento original sin buffering
      // Grabar input si hay grabación activa
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

// IPC handler to terminate an SSH connection
ipcMain.on('ssh:disconnect', (event, tabId) => {
  const conn = sshConnections[tabId];
  if (conn) {
    try {
      // Limpiar timeout de stats
      if (conn.statsTimeout) {
        clearTimeout(conn.statsTimeout);
        conn.statsTimeout = null;
      }
      
      // Limpiar buffer de escritura pendiente (Wallix)
      if (conn._writeBufferTimeout) {
        clearTimeout(conn._writeBufferTimeout);
        conn._writeBufferTimeout = null;
      }
      
      // Flush buffer pendiente antes de cerrar
      if (conn._writeBuffer && conn.stream && !conn.stream.destroyed) {
        try {
          conn.stream.write(conn._writeBuffer);
        } catch (e) {
          // Ignorar errores al escribir durante el cierre
        }
        conn._writeBuffer = '';
      }
      
      // Para conexiones Wallix, solo necesitamos cerrar el stream principal
      if (conn.ssh && conn.ssh._isWallixConnection) {
        // Cerrando conexión Wallix
      }
      
      // Limpiar listeners del stream de forma más agresiva
      if (conn.stream) {
        try {
          conn.stream.removeAllListeners();
          if (!conn.stream.destroyed) {
            conn.stream.destroy();
          }
        } catch (streamError) {
          // Error destroying stream
        }
      }
      
      // Verificar si otras pestañas están usando la misma conexión SSH
      const otherTabsUsingConnection = Object.values(sshConnections)
        .filter(c => c !== conn && c.cacheKey === conn.cacheKey);
      
      // Solo cerrar la conexión SSH si no hay otras pestañas usándola
      // (Para bastiones, cada terminal es independiente, así que siempre cerrar)
      if (otherTabsUsingConnection.length === 0 && conn.ssh && conn.cacheKey) {
        try {
      // Enviar evento de desconexión
      const disconnectOriginalKey = conn.originalKey || conn.cacheKey;
      sendToRenderer(event.sender, 'ssh-connection-disconnected', { 
        originalKey: disconnectOriginalKey
      });
      
      // Limpiar listeners específicos de la conexión SSH de forma más selectiva
      if (conn.ssh.ssh) {
        // Solo remover listeners específicos en lugar de todos
        conn.ssh.ssh.removeAllListeners('error');
        conn.ssh.ssh.removeAllListeners('close');
        conn.ssh.ssh.removeAllListeners('end');
      }
      
      // Limpiar listeners del SSH2Promise también
      conn.ssh.removeAllListeners('error');
      conn.ssh.removeAllListeners('close');
      conn.ssh.removeAllListeners('end');
      
      conn.ssh.close();
      delete sshConnectionPool[conn.cacheKey];
        } catch (closeError) {
          // Error closing SSH connection
        }
      }
      
    } catch (error) {
      // Error cleaning up SSH connection
    } finally {
      // Always delete the connection
      delete sshConnections[tabId];
    }
  }
});

// Handler app-quit movido a src/main/handlers/application-handlers.js

// Limpieza robusta también en before-quit
app.on('before-quit', async () => {
  isAppQuitting = true;
  
  // ✅ MEMORY LEAK FIX: Limpiar intervalo de limpieza de conexiones huérfanas
  if (orphanCleanupInterval) {
    clearInterval(orphanCleanupInterval);
    orphanCleanupInterval = null;
  }
  
  Object.values(sshConnections).forEach(conn => {
    if (conn.statsTimeout) {
      clearTimeout(conn.statsTimeout);
    }
    if (conn.stream) {
      try {
        conn.stream.removeAllListeners();
        if (!conn.stream.destroyed) {
          conn.stream.destroy();
        }
      } catch (e) {
        // Ignorar errores
      }
    }
    if (conn.ssh) {
      try {
        if (conn.ssh.ssh) {
          // Limpiar listeners específicos en lugar de todos en before-quit
          conn.ssh.ssh.removeAllListeners('error');
          conn.ssh.ssh.removeAllListeners('close');
          conn.ssh.ssh.removeAllListeners('end');
        }
        // Limpiar listeners del SSH2Promise también
        conn.ssh.removeAllListeners('error');
        conn.ssh.removeAllListeners('close');
        conn.ssh.removeAllListeners('end');
        conn.ssh.close();
      } catch (e) {
        // Ignorar errores
      }
    }
  });
  
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
// Función de statsLoop para conexiones directas (SSH2Promise)
async function statsLoop(tabId, realHostname, finalDistroId, host) {
  const conn = sshConnections[tabId];
  if (activeStatsTabId !== tabId) {
    if (conn) {
      conn.statsTimeout = null;
    }
    return;
  }
  if (!conn || !conn.ssh || !conn.stream || conn.stream.destroyed) {
    return;
  }
  try {
    // CPU
    const cpuStatOutput = await conn.ssh.exec("grep 'cpu ' /proc/stat");
    const cpuTimes = cpuStatOutput.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
    let cpuLoad = '0.00';
    const currentCpu = { user: cpuTimes[0], nice: cpuTimes[1], system: cpuTimes[2], idle: cpuTimes[3], iowait: cpuTimes[4], irq: cpuTimes[5], softirq: cpuTimes[6], steal: cpuTimes[7] };
    const previousCpu = conn.previousCpu;
    if (previousCpu) {
      const prevIdle = previousCpu.idle + previousCpu.iowait;
      const currentIdle = currentCpu.idle + currentCpu.iowait;
      const prevTotal = Object.values(previousCpu).reduce((a, b) => a + b, 0);
      const currentTotal = Object.values(currentCpu).reduce((a, b) => a + b, 0);
      const totalDiff = currentTotal - prevTotal;
      const idleDiff = currentIdle - prevIdle;
      if (totalDiff > 0) {
        cpuLoad = ((totalDiff - idleDiff) * 100 / totalDiff).toFixed(2);
      }
    }
    conn.previousCpu = currentCpu;
    // Memoria, disco, uptime, red
    const allStatsRes = await conn.ssh.exec("free -b && df -P && uptime && cat /proc/net/dev && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo ''");
    const parts = allStatsRes.trim().split('\n');
    // Memoria
    const memLine = parts.find(line => line.startsWith('Mem:')) || '';
    const memParts = memLine.split(/\s+/);
    const mem = {
      total: parseInt(memParts[1], 10) || 0,
      used: parseInt(memParts[2], 10) || 0,
    };
    // Disco
    const dfIndex = parts.findIndex(line => line.trim().startsWith('Filesystem'));
    const dfOutput = parts.slice(dfIndex).join('\n');
    const disks = parseDfOutput(dfOutput);
    // Uptime
    const uptimeLine = parts.find(line => line.includes(' up '));
    let uptime = '';
    if (uptimeLine) {
      const match = uptimeLine.match(/up (.*?),/);
      if (match && match[1]) {
        uptime = match[1].trim();
      }
    }
    // Red
    const netIndex = parts.findIndex(line => line.trim().includes('Inter-|   Receive'));
    const netOutput = parts.slice(netIndex).join('\n');
    const currentNet = parseNetDev(netOutput);
    const previousNet = conn.previousNet;
    const previousTime = conn.previousTime;
    const currentTime = Date.now();
    let network = { rx_speed: 0, tx_speed: 0 };
    if (previousNet && previousTime) {
      const timeDiff = (currentTime - previousTime) / 1000;
      const rxDiff = currentNet.totalRx - previousNet.totalRx;
      const txDiff = currentNet.totalTx - previousNet.totalTx;
      network.rx_speed = Math.max(0, rxDiff / timeDiff);
      network.tx_speed = Math.max(0, txDiff / timeDiff);
    }
    conn.previousNet = currentNet;
    conn.previousTime = currentTime;
    // Buscar IP real (última línea, tomar la última IP válida)
    let ip = '';
    if (parts.length > 0) {
      const ipLine = parts[parts.length - 1].trim();
      const ipCandidates = ipLine.split(/\s+/).filter(s => s && s !== '127.0.0.1' && s !== '::1');
      if (ipCandidates.length > 0) {
        ip = ipCandidates[ipCandidates.length - 1];
      }
    }
    if (!ip) ip = host;
    // Normalización de distro (RedHat) y obtención de versionId
    let versionId = '';
    try {
      // Buscar ID, ID_LIKE y VERSION_ID en todo el output
      const osReleaseLines = parts;
      let idLine = osReleaseLines.find(line => line.trim().startsWith('ID='));
      let idLikeLine = osReleaseLines.find(line => line.trim().startsWith('ID_LIKE='));
      let versionIdLine = osReleaseLines.find(line => line.trim().startsWith('VERSION_ID='));
      let rawDistro = '';
      if (idLine) {
        const match = idLine.match(/^ID=("?)([^"\n]*)\1$/);
        if (match) rawDistro = match[2].toLowerCase();
      }
      if (["rhel", "redhat", "redhatenterpriseserver", "red hat enterprise linux"].includes(rawDistro)) {
        finalDistroId = "rhel";
      } else if (rawDistro === 'linux' && idLikeLine) {
        const match = idLikeLine.match(/^ID_LIKE=("?)([^"\n]*)\1$/);
        const idLike = match ? match[2].toLowerCase() : '';
        if (idLike.includes('rhel') || idLike.includes('redhat')) {
          finalDistroId = "rhel";
        } else {
          finalDistroId = rawDistro;
        }
      } else if (rawDistro) {
        finalDistroId = rawDistro;
      }
      if (versionIdLine) {
        const match = versionIdLine.match(/^VERSION_ID=("?)([^"\n]*)\1$/);
        if (match) versionId = match[2];
      }
    } catch (e) {}
    const stats = {
      cpu: cpuLoad,
      mem,
      disk: disks,
      uptime,
      network,
      hostname: realHostname,
      distro: finalDistroId,
      versionId,
      ip
    };
    // Actualizar los valores en la conexión para que siempre estén correctos al reactivar la pestaña
    conn.realHostname = realHostname;
    conn.finalDistroId = finalDistroId;
    sendToRenderer(mainWindow.webContents, `ssh-stats:update:${tabId}`, stats);
  } catch (e) {
    // Silenciar errores de stats
  } finally {
    const finalConn = sshConnections[tabId];
    if (finalConn && finalConn.ssh && finalConn.stream && !finalConn.stream.destroyed) {
      finalConn.statsTimeout = setTimeout(() => statsLoop(tabId, realHostname, finalDistroId, host), statusBarPollingIntervalMs);
    }
  }
}
// --- FIN BLOQUE RESTAURACIÓN STATS ---

let activeStatsTabId = null;

ipcMain.on('ssh:set-active-stats-tab', (event, tabId) => {
  activeStatsTabId = tabId;
  Object.entries(sshConnections).forEach(([id, conn]) => {
    if (id !== String(tabId)) {
      if (conn.statsTimeout) {
        clearTimeout(conn.statsTimeout);
        conn.statsTimeout = null;
      }
      conn.statsLoopRunning = false;
    }
  });
  const conn = sshConnections[tabId];
  if (conn && !conn.statsTimeout && !conn.statsLoopRunning) {
    if (conn.config.useBastionWallix) {
      if (typeof conn.wallixStatsLoop === 'function') {
        conn.wallixStatsLoop();
      }
    } else {
      if (typeof statsLoop === 'function') {
        statsLoop(tabId, conn.realHostname || 'unknown', conn.finalDistroId || 'linux', conn.config.host);
      }
    }
  }
});

let statusBarPollingIntervalMs = 3000; // Reducido de 5000ms a 3000ms por defecto
ipcMain.on('statusbar:set-polling-interval', (event, intervalSec) => {
  const sec = Math.max(1, Math.min(20, parseInt(intervalSec, 10) || 3)); // Cambio de 5 a 3
  statusBarPollingIntervalMs = sec * 1000;
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
  
  // Registrar eventos para este tab si no están registrados
  if (!registeredTabEvents.has(tabId)) {
    registerTabEvents(tabId);
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

// Set para trackear tabs con eventos registrados
const registeredTabEvents = new Set();

// Sistema de registro dinámico para eventos de pestañas
function registerTabEvents(tabId) {
  registeredTabEvents.add(tabId);
  // PowerShell events
  ipcMain.removeAllListeners(`powershell:start:${tabId}`);
  ipcMain.removeAllListeners(`powershell:data:${tabId}`);
  ipcMain.removeAllListeners(`powershell:resize:${tabId}`);
  ipcMain.removeAllListeners(`powershell:stop:${tabId}`);
  
  ipcMain.on(`powershell:start:${tabId}`, (event, data) => {
    PowerShell.PowerShellHandlers.start(tabId, data);
  });
  
  ipcMain.on(`powershell:data:${tabId}`, (event, data) => {
    PowerShell.PowerShellHandlers.data(tabId, data);
  });
  
  ipcMain.on(`powershell:resize:${tabId}`, (event, data) => {
    PowerShell.PowerShellHandlers.resize(tabId, data);
  });
  
  ipcMain.on(`powershell:stop:${tabId}`, (event) => {
    PowerShell.PowerShellHandlers.stop(tabId);
  });
  
  // WSL events
  ipcMain.removeAllListeners(`wsl:start:${tabId}`);
  ipcMain.removeAllListeners(`wsl:data:${tabId}`);
  ipcMain.removeAllListeners(`wsl:resize:${tabId}`);
  ipcMain.removeAllListeners(`wsl:stop:${tabId}`);
  
  ipcMain.on(`wsl:start:${tabId}`, (event, data) => {
    WSL.WSLHandlers.start(tabId, data);
  });
  
  ipcMain.on(`wsl:data:${tabId}`, (event, data) => {
    WSL.WSLHandlers.data(tabId, data);
  });
  
  ipcMain.on(`wsl:resize:${tabId}`, (event, data) => {
    WSL.WSLHandlers.resize(tabId, data);
  });
  
  ipcMain.on(`wsl:stop:${tabId}`, (event) => {
    WSL.WSLHandlers.stop(tabId);
  });
  
  // Ubuntu events
  ipcMain.removeAllListeners(`ubuntu:start:${tabId}`);
  ipcMain.removeAllListeners(`ubuntu:data:${tabId}`);
  ipcMain.removeAllListeners(`ubuntu:resize:${tabId}`);
  ipcMain.removeAllListeners(`ubuntu:stop:${tabId}`);
  
  ipcMain.on(`ubuntu:start:${tabId}`, (event, data) => {
    startUbuntuSession(tabId, data);
  });
  
  ipcMain.on(`ubuntu:data:${tabId}`, (event, data) => {
    handleUbuntuData(tabId, data);
  });
  
  ipcMain.on(`ubuntu:resize:${tabId}`, (event, data) => {
    handleUbuntuResize(tabId, data);
  });
  
  ipcMain.on(`ubuntu:stop:${tabId}`, (event) => {
    handleUbuntuStop(tabId);
  });
  
  // WSL Distribution events (generic for all non-Ubuntu distributions)
  ipcMain.removeAllListeners(`wsl-distro:start:${tabId}`);
  ipcMain.removeAllListeners(`wsl-distro:data:${tabId}`);
  ipcMain.removeAllListeners(`wsl-distro:resize:${tabId}`);
  ipcMain.removeAllListeners(`wsl-distro:stop:${tabId}`);
  
  ipcMain.on(`wsl-distro:start:${tabId}`, (event, data) => {
    startWSLDistroSession(tabId, data);
  });
  
  ipcMain.on(`wsl-distro:data:${tabId}`, (event, data) => {
    handleWSLDistroData(tabId, data);
  });
  
  ipcMain.on(`wsl-distro:resize:${tabId}`, (event, data) => {
    handleWSLDistroResize(tabId, data);
  });
  
  ipcMain.on(`wsl-distro:stop:${tabId}`, (event) => {
    handleWSLDistroStop(tabId);
  });
  
  // Cygwin events
  ipcMain.removeAllListeners(`cygwin:start:${tabId}`);
  ipcMain.removeAllListeners(`cygwin:data:${tabId}`);
  ipcMain.removeAllListeners(`cygwin:resize:${tabId}`);
  ipcMain.removeAllListeners(`cygwin:stop:${tabId}`);
  
  ipcMain.on(`cygwin:start:${tabId}`, (event, data) => {
    Cygwin.CygwinHandlers.start(tabId, data);
  });
  
  ipcMain.on(`cygwin:data:${tabId}`, (event, data) => {
    Cygwin.CygwinHandlers.data(tabId, data);
  });
  
  ipcMain.on(`cygwin:resize:${tabId}`, (event, data) => {
    Cygwin.CygwinHandlers.resize(tabId, data);
  });
  
  ipcMain.on(`cygwin:stop:${tabId}`, (event) => {
    Cygwin.CygwinHandlers.stop(tabId);
  });

  // Handlers para Docker (lazy loading)
  const dockerSvc = getDocker();
  if (dockerSvc && dockerSvc.DockerHandlers) {
    ipcMain.removeAllListeners(`docker:start:${tabId}`);
    ipcMain.removeAllListeners(`docker:data:${tabId}`);
    ipcMain.removeAllListeners(`docker:resize:${tabId}`);
    ipcMain.removeAllListeners(`docker:stop:${tabId}`);
    
    ipcMain.on(`docker:start:${tabId}`, (event, data) => {
      dockerSvc.DockerHandlers.start(tabId, data.containerName, data);
    });
    
    ipcMain.on(`docker:data:${tabId}`, (event, data) => {
      dockerSvc.DockerHandlers.data(tabId, data);
    });
    
    ipcMain.on(`docker:resize:${tabId}`, (event, data) => {
      dockerSvc.DockerHandlers.resize(tabId, data);
    });
    
    ipcMain.on(`docker:stop:${tabId}`, (event) => {
      dockerSvc.DockerHandlers.stop(tabId);
    });
  }
}



// Evento para registrar nuevas pestañas
ipcMain.on('register-tab-events', (event, tabId) => {
  registerTabEvents(tabId);
});

// Using dynamic tab registration instead of predefined tabs

// Cleanup terminals on app quit
app.on('before-quit', (event) => {
  isAppQuitting = true;
  
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
});

// ✅ OPTIMIZACIÓN: getSystemStats() eliminada - ahora usa StatsWorkerService exclusivamente

// 🚀 OPTIMIZACIÓN: Servicios del sistema diferidos
// Estos servicios y sus handlers se registran en system-services-handlers.js
// Se inicializan después de ready-to-show para no bloquear el arranque

// ✅ OPTIMIZACIÓN: Manejadores de Nextcloud movidos a nextcloud-handlers.js
// Se registran automáticamente desde registerSecondaryHandlers() en handlers/index.js
// NO es necesario registrarlos aquí para evitar ejecución prematura