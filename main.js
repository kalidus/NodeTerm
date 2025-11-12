// Declarar variables
let alternativePtyConfig, SafeWindowsTerminal, registerAllHandlers;

// Importar utilidades centralizadas (fuera del try-catch para acceso global)
const { parseDfOutput, parseNetDev, getGuacdPrefPath, sendToRenderer, cleanupOrphanedConnections } = require('./src/main/utils');

// Importar servicios centralizados (fuera del try-catch para acceso global)
const { WSL, PowerShell, Cygwin } = require('./src/main/services');

// Importar procesador de PDFs
const pdfProcessor = require('./src/services/PDFProcessor');

try {
  // Importar configuraciones de terminal desde archivo externo
  ({ alternativePtyConfig } = require('./src/main/config/terminal-configs'));

  // Importar clase SafeWindowsTerminal desde archivo externo
  SafeWindowsTerminal = require('./src/main/classes/SafeWindowsTerminal');

  // Importar manejadores centralizados
  ({ registerAllHandlers } = require('./src/main/handlers'));
} catch (err) {
  console.error('[MAIN] ERROR EN IMPORTACIONES:', err);
  console.error('[MAIN] Stack trace:', err.stack);
  process.exit(1);
}

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

const { app, BrowserWindow, ipcMain, clipboard, dialog, Menu } = require('electron');
const path = require('path');
const url = require('url');

// ============================================
// 🚨 VERIFICACIÓN CRÍTICA DE CAMBIOS APLICADOS
// (logs temporales eliminados)
// ============================================
const os = require('os');
const fs = require('fs');
const SSH2Promise = require('ssh2-promise');
const { NodeSSH } = require('node-ssh');
const packageJson = require('./package.json');
const { createBastionShell } = require('./src/components/bastion-ssh');
const RdpManager = require('./src/utils/RdpManager');
const SftpClient = require('ssh2-sftp-client');
const si = require('systeminformation');
const { fork } = require('child_process');
const GuacdService = require('./src/services/GuacdService');
const GuacamoleLite = require('guacamole-lite');
const { getUpdateService } = require('./src/main/services/UpdateService');
const { registerRecordingHandlers, setSessionRecorder } = require('./src/main/handlers/recording-handlers');

// Importar y crear instancia de SessionRecorder para grabaciones
const SessionRecorder = require('./src/services/SessionRecorder');
const sessionRecorder = new SessionRecorder();

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
  if (reason && reason.message && reason.message.includes('AttachConsole failed')) {
    console.warn('Promise rechazada con error AttachConsole capturado:', reason.message);
    return; // Suprimir el error
  }
  
  console.error('Promise rechazada no manejada:', reason);
});

// Store active SSH connections and their shells
const sshConnections = {};
// Estado persistente para stats de bastión (CPU, red, etc.) por tabId
const bastionStatsState = {};
// Cache for Welcome Messages (MOTD) to show them on every new tab.
const motdCache = {};
// Pool de conexiones SSH compartidas para evitar múltiples conexiones al mismo servidor
const sshConnectionPool = {};

// RDP Manager instance
const rdpManager = new RdpManager();

// Guacamole services
const guacdService = new GuacdService();
let guacamoleServer = null;
let guacamoleServerReadyAt = 0; // timestamp when guacamole-lite websocket server became ready
// Track active guacamole client connections
const activeGuacamoleConnections = new Set();
// Watchdog configurable para inactividad de guacd (ms). 0 = desactivado. Por defecto 1h
let guacdInactivityTimeoutMs = 3600000;
// Flag para evitar inicialización múltiple
let guacamoleInitializing = false;
let guacamoleInitialized = false;

// Sistema de throttling para conexiones SSH
const connectionThrottle = {
  pending: new Map(), // Conexiones en proceso por cacheKey
  lastAttempt: new Map(), // Último intento por cacheKey
  minInterval: 2000, // Mínimo 2 segundos entre intentos al mismo servidor
  
  async throttle(cacheKey, connectionFn) {
    // Si ya hay una conexión pendiente para este servidor, esperar
    if (this.pending.has(cacheKey)) {
      // console.log(`Esperando conexión pendiente para ${cacheKey}...`);
      return await this.pending.get(cacheKey);
    }
    
    // Verificar intervalo mínimo
    const lastAttempt = this.lastAttempt.get(cacheKey) || 0;
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    
    if (timeSinceLastAttempt < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastAttempt;
      // console.log(`Throttling conexión a ${cacheKey}, esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Crear la conexión
    this.lastAttempt.set(cacheKey, Date.now());
    const connectionPromise = connectionFn();
    this.pending.set(cacheKey, connectionPromise);
    
    try {
      const result = await connectionPromise;
      return result;
    } finally {
      this.pending.delete(cacheKey);
    }
  }
};

// Función para limpiar conexiones SSH huérfanas cada 60 segundos
setInterval(() => {
  const activeKeys = new Set(Object.values(sshConnections).map(conn => conn.cacheKey));
  
  for (const [poolKey, poolConnection] of Object.entries(sshConnectionPool)) {
    if (!activeKeys.has(poolKey)) {
      // Verificar si la conexión es realmente antigua (más de 5 minutos sin uso)
      const connectionAge = Date.now() - (poolConnection._lastUsed || poolConnection._createdAt || 0);
      if (connectionAge > 5 * 60 * 1000) { // 5 minutos
        // console.log(`Limpiando conexión SSH huérfana: ${poolKey} (sin uso por ${Math.round(connectionAge/1000)}s)`);
        try {
          // Limpiar listeners antes de cerrar
          if (poolConnection.ssh) {
            poolConnection.ssh.removeAllListeners();
          }
          poolConnection.close();
        } catch (e) {
          // console.warn(`Error closing orphaned connection: ${e.message}`);
        }
        delete sshConnectionPool[poolKey];
      }
    } else {
      // Marcar como usado recientemente
      poolConnection._lastUsed = Date.now();
    }
  }
}, 60000); // Cambiar a 60 segundos para dar más tiempo

// Helper function to parse 'df -P' command output
// Funciones de parsing movidas a main/utils/parsing-utils.js

/**
 * Inicializa servicios de Guacamole de forma asíncrona
 */
async function initializeGuacamoleServices() {
  // Evitar inicialización múltiple
  if (guacamoleInitializing || guacamoleInitialized) {
    console.log('✅ Servicios Guacamole ya inicializados o en proceso, omitiendo...');
    return;
  }
  
  guacamoleInitializing = true;
  
  try {
    console.log('🚀 Inicializando servicios Guacamole...');
    // Cargar método preferido persistido antes de inicializar
    try {
      const pref = await loadPreferredGuacdMethod();
      if (pref) {
        guacdService.setPreferredMethod(pref);
      }
    } catch {}
    
    // Inicializar GuacdService
    const guacdReady = await guacdService.initialize();
    
    if (!guacdReady) {
      console.warn('⚠️ No se pudo inicializar guacd. RDP Guacamole no estará disponible.');
      return;
    }

    // Configurar servidor Guacamole-lite
    const websocketOptions = {
      port: 8081 // Puerto para WebSocket de Guacamole
    };

    const guacdOptions = guacdService.getGuacdOptions();
    
    // Generar clave de 32 bytes para AES-256-CBC
    const crypto = require('crypto');
    const SECRET_KEY_RAW = 'NodeTermGuacamoleSecretKey2024!';
    const SECRET_KEY = crypto.createHash('sha256').update(SECRET_KEY_RAW).digest(); // 32 bytes exactos
    
    // Desactivar watchdogs de inactividad para evitar cierres falsos
    // 1) Watchdog de WebSocket (lado cliente en guacamole-lite): maxInactivityTime=0 → desactivado
    // 2) Watchdog de guacd (lado backend guacd): variable de entorno
    process.env.DISABLE_GUACD_WATCHDOG = '1';

    const clientOptions = {
      crypt: {
        cypher: 'AES-256-CBC',
        key: SECRET_KEY // Clave de encriptación de 32 bytes
      },
      log: {
        level: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'NORMAL'
      },
      maxInactivityTime: 0 // Desactivar cierre por inactividad del WS
    };

    // Configurar watchdog de inactividad para guacd (lado backend) de forma configurable
    // GUACD_INACTIVITY_TIMEOUT_MS: 0 para desactivar, valor en ms para activar (por defecto 1h)
    const envTimeoutRaw = process.env.GUACD_INACTIVITY_TIMEOUT_MS;
    // 1 hora por defecto si no se ha cambiado por IPC
    if (typeof envTimeoutRaw === 'string' && envTimeoutRaw.trim() !== '') {
      const parsed = parseInt(envTimeoutRaw, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        guacdInactivityTimeoutMs = parsed;
      }
    }
    // Crear servidor Guacamole-lite
    guacamoleServer = new GuacamoleLite(websocketOptions, guacdOptions, clientOptions);
    
    // Configurar eventos del servidor
    guacamoleServer.on('open', (clientConnection) => {
      try {
        // Nueva conexión Guacamole abierta
        activeGuacamoleConnections.add(clientConnection);

        // Parche en runtime del watchdog de guacd (reemplaza el de 10s por uno configurable o lo desactiva)
        try {
          const guacdClient = clientConnection && clientConnection.guacdClient ? clientConnection.guacdClient : null;
          if (guacdClient) {
            if (guacdClient.activityCheckInterval) {
              clearInterval(guacdClient.activityCheckInterval);
            }

            if (guacdInactivityTimeoutMs > 0) {
              guacdClient.activityCheckInterval = setInterval(() => {
                try {
                  if (Date.now() > (guacdClient.lastActivity + guacdInactivityTimeoutMs)) {
                    guacdClient.close(new Error('guacd was inactive for too long'));
                  }
                } catch (e) {
                  // Si ocurre un error al cerrar, evitar que detenga el loop
                }
              }, 1000);
              // Watchdog guacd aplicado
            } else {
              // Watchdog guacd desactivado
            }
          } else {
            console.warn('⚠️  No se encontró guacdClient para aplicar watchdog');
          }
        } catch (e) {
          console.warn('⚠️  Error aplicando watchdog de guacd:', e?.message || e);
        }
      } catch (e) {
        console.warn('No se pudo registrar conexión Guacamole:', e?.message || e);
      }
    });

    guacamoleServer.on('close', (clientConnection) => {
      try {
        console.log('🔚 Conexión Guacamole cerrada:', clientConnection.connectionId);
        activeGuacamoleConnections.delete(clientConnection);
      } catch (e) {
        // noop
      }
    });

    guacamoleServer.on('error', (clientConnection, error) => {
      console.error('❌ Error en conexión Guacamole:', error);
    });

    guacamoleServerReadyAt = Date.now();
    guacamoleInitialized = true;
    console.log('✅ Servicios Guacamole inicializados correctamente');
    console.log(`🌐 Servidor WebSocket: localhost:${websocketOptions.port}`);
    console.log(`🔧 GuacD: ${guacdOptions.host}:${guacdOptions.port}`);
    
  } catch (error) {
    console.error('❌ Error inicializando servicios Guacamole:', error);
    guacamoleInitializing = false; // Reset flag en caso de error
  }
}

// === Preferencias Guacd (persistencia en userData) ===
// Funciones movidas a src/main/utils/file-utils.js
const { loadPreferredGuacdMethod, savePreferredGuacdMethod } = require('./src/main/utils/file-utils');

// Handlers de Guacamole movidos a src/main/handlers/guacamole-handlers.js

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1400,
    minHeight: 600,
    title: 'NodeTerm',
    frame: false, // Oculta la barra de título nativa para usar una personalizada
    show: false, // mostrar solo cuando esté lista para evitar parpadeos
    backgroundColor: '#0e1116', // fondo inicial oscuro consistente con splash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 🚀 PRECALENTAMIENTO: Iniciar guacd en paralelo mientras se carga la UI
  // Esto reduce significativamente el tiempo de primera conexión RDP
  (async () => {
    try {
      console.log('🔥 Precalentando guacd en background...');
      const pref = await loadPreferredGuacdMethod();
      if (pref) {
        guacdService.setPreferredMethod(pref);
      }
      // Solo precalentar si no está ya inicializando o inicializado
      if (!guacamoleInitializing && !guacamoleInitialized) {
        await guacdService.initialize();
        console.log('✅ Guacd precalentado y listo');
      } else {
        console.log('✅ Guacd ya está inicializado o en proceso');
      }
    } catch (error) {
      console.warn('⚠️ Error en precalentamiento de guacd:', error.message);
    }
  })();

  mainWindow.loadURL(
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : url.format({
          pathname: path.join(__dirname, 'dist', 'index.html'),
          protocol: 'file:',
          slashes: true
        })
  );

  // Mostrar ventana cuando esté lista para mostrar
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) mainWindow.show();
  });

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
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

  // Establecer dependencias de los servicios
  try {
    WSL.setMainWindow(mainWindow);
    PowerShell.setDependencies({
      mainWindow,
      alternativePtyConfig,
      SafeWindowsTerminal,
      isAppQuitting
    });
    Cygwin.setMainWindow(mainWindow);
    
    // Inicializar servicio de actualizaciones
    const updateService = getUpdateService();
    updateService.setMainWindow(mainWindow);
    
    // Cargar configuración desde localStorage (se sincronizará desde el renderer)
    // La configuración se cargará cuando el renderer la solicite
    
    // Iniciar comprobación automática si está habilitada
    mainWindow.webContents.once('did-finish-load', () => {
      // Esperar 5 segundos antes de iniciar el servicio de actualización
      setTimeout(() => {
        updateService.startAutoCheck();
      }, 5000);
    });
  } catch (err) {
    console.error('[MAIN] Error estableciendo dependencias de servicios:', err);
  }

  // Registrar todos los handlers después de crear la ventana
  try {
    // Inicializar SessionRecorder
    setSessionRecorder(sessionRecorder);
    
  // Registrar handlers de grabación
  registerRecordingHandlers();
  
  // Handlers simples para auditoría
  ipcMain.handle('app:get-user-data-path', () => {
    return app.getPath('userData');
  });
  
  ipcMain.handle('fs:mkdir-recursive', async (event, path) => {
    try {
      const fs = require('fs').promises;
      await fs.mkdir(path, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('shell:open-path', async (event, path) => {
    try {
      const { shell } = require('electron');
      await shell.openPath(path);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
    
    registerAllHandlers({ 
      mainWindow, 
      findSSHConnection,
      disconnectAllGuacamoleConnections,
      guacdService,
      guacamoleServer,
      guacamoleServerReadyAt,
      sendToRenderer,
      guacdInactivityTimeoutMs,
      packageJson,
      sshConnections,
      cleanupOrphanedConnections,
      isAppQuitting,
      getGuacamoleServer: () => guacamoleServer,
      getGuacamoleServerReadyAt: () => guacamoleServerReadyAt
    });
    
    // Handlers registrados exitosamente
    
    // Inicializar servicios de Guacamole después de registrar los handlers
    initializeGuacamoleServices().catch((error) => {
      console.error('❌ Error en inicialización de Guacamole:', error);
    });
    
  } catch (err) {
    console.error('[MAIN] Error registrando handlers:', err);
  }
}

// Funciones de WSL movidas a main/services/WSLService.js

// 🔗 IPC Handler para sincronizar conexiones SSH con el MCP (usando on() para mayor compatibilidad)
ipcMain.on('app:save-ssh-connections-for-mcp', async (event, connections) => {
  try {
    console.log('🔴 [MAIN SSH HANDLER] ¡¡¡EJECUTADO!!!');
    console.log('[SSH MCP] Handler invocado con conexiones:', Array.isArray(connections) ? connections.length : 'NO ES ARRAY');
    
    if (!Array.isArray(connections)) {
      console.warn('[SSH MCP] ⚠️ Parámetro no es un array:', typeof connections);
      return;
    }
    
    const fs = require('fs').promises;
    const path = require('path');
    
    const userDataPath = app.getPath('userData');
    const sshConnectionsPath = path.join(userDataPath, 'mcp-ssh-connections.json');
    
    console.log(`📝 [SSH MCP] Guardando ${connections.length} conexiones en ${sshConnectionsPath}`);
    
    // Guardar las conexiones en un archivo que el MCP pueda leer
    await fs.writeFile(sshConnectionsPath, JSON.stringify(connections, null, 2), 'utf8');
    
    console.log(`🔗 [SSH MCP] ✅ Guardadas ${connections.length} conexiones SSH correctamente`);
  } catch (error) {
    console.error('[APP SSH] ❌ Error guardando conexiones:', error.message);
  }
});

// IPC handler para detectar todas las distribuciones WSL
ipcMain.handle('detect-wsl-distributions', async () => {
  // console.log('🚀 Detectando distribuciones WSL...'); // Eliminado por limpieza de logs
  
  try {
    const distributions = await WSL.detectAllWSLDistributions();
    // console.log('✅ Detección completada:', distributions.length, 'distribuciones encontradas'); // Eliminado por limpieza de logs
    // distributions.forEach(distro => console.log(`  - ${distro.label} (${distro.executable})`)); // Eliminado por limpieza de logs
    return distributions;
  } catch (error) {
    console.error('❌ Error en detección de distribuciones WSL:', error);
    return [];
  }
});

// Mantener compatibilidad con el handler anterior para Ubuntu
ipcMain.handle('detect-ubuntu-availability', async () => {
  // console.log('🚀 Detectando distribuciones WSL (compatibilidad Ubuntu)...'); // Eliminado por limpieza de logs
  
  try {
    const distributions = await WSL.detectAllWSLDistributions();
    // console.log('✅ Detección completada:', distributions.length, 'distribuciones encontradas'); // Eliminado por limpieza de logs
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
    console.log('🔍 Cygwin detection result:', result.available ? '✅ Available' : '❌ Not available');
    return result;
  } catch (error) {
    console.error('❌ Error detecting Cygwin:', error);
    return { available: false, path: null, error: error.message };
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

app.on('ready', createWindow);

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

// Handler get-version-info movido a src/main/handlers/application-handlers.js

// IPC handlers para funciones de View
// Handlers de aplicación movidos a main/handlers/app-handlers.js

// IPC handlers para clipboard - Ya están definidos más adelante en el archivo

// IPC handler to establish an SSH connection
ipcMain.on('ssh:connect', async (event, { tabId, config }) => {
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
      // console.log(`Throttling conexión SSH directa a ${cacheKey}, esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    connectionThrottle.lastAttempt.set(cacheKey, Date.now());
  } else {
    // console.log(`Conexión bastión - sin throttling (pooling habilitado)`);
  }
  
  // Para bastiones: cada terminal tiene su propia conexión independiente (no pooling)
  // Para SSH directo: usar pooling normal para eficiencia
  let ssh;
  let isReusedConnection = false;

  if (config.useBastionWallix) {
    // BASTIÓN: Usar ssh2 puro para crear una conexión y shell independientes
    // console.log(`Bastión ${cacheKey} - creando nueva conexión con ssh2 (bastion-ssh.js)`);
    const bastionConfig = {
      bastionHost: config.bastionHost,
      port: 22,
      bastionUser: config.bastionUser,
      password: config.password
    };
    let shellStream;
    const { conn } = createBastionShell(
      bastionConfig,
      (data) => {
        const dataStr = data.toString('utf-8');
        
        // Grabar output si hay grabación activa
        if (sessionRecorder.isRecording(tabId)) {
          sessionRecorder.recordOutput(tabId, dataStr);
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
        sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
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
      statsLoopRunning: false
    };
    
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
        // console.log('[WallixStats] Conexión no disponible, saltando stats');
        return;
      }
      if (connObj.statsLoopRunning) {
        // console.log(`[STATS] Ejecutando wallixStatsLoop para tabId ${tabId} (activo: ${activeStatsTabId})`);
        return;
      }
      
      connObj.statsLoopRunning = true;
      // console.log(`[STATS] Ejecutando wallixStatsLoop para tabId ${tabId} (activo: ${activeStatsTabId})`);

      try {
        // // console.log('[WallixStats] Lanzando bucle de stats para bastión', tabId);
        
        if (connObj.ssh.execCommand) {
          const command = 'grep "cpu " /proc/stat && free -b && df -P && uptime && cat /proc/net/dev && hostname && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo "" && cat /etc/os-release';
          connObj.ssh.execCommand(command, (err, result) => {
            if (err || !result) {
              // console.warn('[WallixStats] Error ejecutando comando:', err);
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
              
              // // console.log('[WallixStats] Enviando stats:', JSON.stringify(stats, null, 2));
              sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
              
            } catch (parseErr) {
              // console.warn('[WallixStats] Error parseando stats:', parseErr);
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
          // console.warn('[WallixStats] execCommand no disponible en conexión bastión');
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
        // console.warn('[WallixStats] Error general:', e);
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
        // console.log(`Reutilizando conexión del pool para terminal SSH directo ${cacheKey}`);
      } catch (testError) {
        // console.log(`Conexión del pool no válida para terminal ${cacheKey}, creando nueva...`);
        try {
          existingPoolConnection.close();
        } catch (e) {}
        delete sshConnectionPool[cacheKey];
      }
    }
    if (!ssh) {
      // console.log(`Creando nueva conexión SSH directa para terminal ${cacheKey}`);
      const directConfig = {
        host: config.host,
        username: config.username,
        password: config.password,
        port: config.port || 22
      };
      ssh = new SSH2Promise(directConfig);
      sshConnectionPool[cacheKey] = ssh;
    }
  }

  // Eliminar función statsLoop y llamadas relacionadas
  // const statsLoop = async (hostname, distro, ip) => {
  //   // Verificación robusta de la conexión
  //   const conn = sshConnections[tabId];
  //   if (!conn || !conn.ssh || !conn.stream || conn.stream.destroyed) {
  //     return; // Stop if connection is closed or invalid
  //   }

  //   try {
  //     // --- Get CPU stats first
  //     const cpuStatOutput = await ssh.exec("grep 'cpu ' /proc/stat");
  //     const cpuTimes = cpuStatOutput.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
  //     const currentCpu = { user: cpuTimes[0], nice: cpuTimes[1], system: cpuTimes[2], idle: cpuTimes[3], iowait: cpuTimes[4], irq: cpuTimes[5], softirq: cpuTimes[6], steal: cpuTimes[7] };

  //     let cpuLoad = '0.00';
  //     const previousCpu = sshConnections[tabId].previousCpu;

  //     if (previousCpu) {
  //         const prevIdle = previousCpu.idle + previousCpu.iowait;
  //         const currentIdle = currentCpu.idle + currentCpu.iowait;
  //         const prevTotal = Object.values(previousCpu).reduce((a, b) => a + b, 0);
  //         const currentTotal = Object.values(currentCpu).reduce((a, b) => a + b, 0);
  //         const totalDiff = currentTotal - prevTotal;
  //         const idleDiff = currentIdle - prevIdle;
  //         if (totalDiff > 0) {
  //             cpuLoad = ((totalDiff - idleDiff) * 100 / totalDiff).toFixed(2);
  //         }
  //     }
  //     sshConnections[tabId].previousCpu = currentCpu;

  //     // --- Get Memory, Disk, Uptime and Network stats ---
  //     const allStatsRes = await ssh.exec("free -b && df -P && uptime && cat /proc/net/dev");
  //     const parts = allStatsRes.trim().split('\n');

  //     // Parse Memory
  //     const memLine = parts.find(line => line.startsWith('Mem:'));
  //     const memParts = memLine.split(/\s+/);
  //     const mem = {
  //         total: parseInt(memParts[1], 10),
  //         used: parseInt(memParts[2], 10),
  //     };

  //     // Parse Disk
  //     const dfIndex = parts.findIndex(line => line.trim().startsWith('Filesystem'));
  //     const dfOutput = parts.slice(dfIndex).join('\n');
  //     const disks = parseDfOutput(dfOutput);

  //     // Parse Uptime
  //     const uptimeLine = parts.find(line => line.includes(' up '));
  //     let uptime = '';
  //     if (uptimeLine) {
  //       const match = uptimeLine.match(/up (.*?),/);
  //       if (match && match[1]) {
  //         uptime = match[1].trim();
  //       }
  //     }

  //     // Parse Network
  //     const netIndex = parts.findIndex(line => line.trim().includes('Inter-|   Receive'));
  //     const netOutput = parts.slice(netIndex).join('\n');
  //     const currentNet = parseNetDev(netOutput);
  //     const previousNet = sshConnections[tabId].previousNet;
  //     const previousTime = sshConnections[tabId].previousTime;
  //     const currentTime = Date.now();
  //     let network = { rx_speed: 0, tx_speed: 0 };

  //     if (previousNet && previousTime) {
  //         const timeDiff = (currentTime - previousTime) / 1000; // in seconds
  //         const rxDiff = currentNet.totalRx - previousNet.totalRx;
  //         const txDiff = currentNet.totalTx - previousNet.totalTx;

  //         network.rx_speed = Math.max(0, rxDiff / timeDiff);
  //         network.tx_speed = Math.max(0, txDiff / timeDiff);
  //     }
  //     sshConnections[tabId].previousNet = currentNet;
  //     sshConnections[tabId].previousTime = currentTime;

  //     const stats = { 
  //         cpu: cpuLoad, 
  //         mem, 
  //         disk: disks, 
  //         uptime, 
  //         network, 
  //         hostname: hostname,
  //         distro: distro,
  //         ip: ip
  //     };
  //     sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
  //   } catch (e) {
  //     // console.error(`Error fetching stats for ${tabId}:`, e.message);
  //   } finally {
  //     // Verificar nuevamente que la conexión siga válida antes de programar siguiente loop
  //     const finalConn = sshConnections[tabId];
  //     if (finalConn && finalConn.ssh && finalConn.stream && !finalConn.stream.destroyed) {
  //       finalConn.statsTimeout = setTimeout(() => statsLoop(hostname, distro, ip), 2000);
  //     }
  //   }
  // };

  try {
    // For subsequent connections, send the cached MOTD immediately.
    if (motdCache[cacheKey]) {
      sendToRenderer(event.sender, `ssh:data:${tabId}`, motdCache[cacheKey]);
    }

    // Conectar SSH si es necesario
    if (!isReusedConnection) {
      // Solo conectar si es una conexión nueva (no reutilizada del pool)
      // console.log(`Conectando SSH para terminal ${cacheKey}...`);
      
      // Configurar límites de listeners ANTES de conectar (aumentado para evitar warnings)
      ssh.setMaxListeners(300);
      
      // console.log(`Iniciando conexión SSH para ${cacheKey}...`);
      // console.log(`Configuración: Host=${config.host}, Usuario=${config.username}, Puerto=${config.port || 22}`);
      // if (config.useBastionWallix) {
      //   console.log(`Bastión Wallix: Host=${config.bastionHost}, Usuario=${config.bastionUser}`);
      // }
      
      await ssh.connect();
      // console.log(`Conectado exitosamente a terminal ${cacheKey}`);
      
      // SSH2Promise está conectado y listo para usar
      // console.log('SSH2Promise conectado correctamente, procediendo a crear shell...');
      
      // Guardar en el pool solo para SSH directo (bastiones son independientes)
      if (!config.useBastionWallix) {
        ssh._createdAt = Date.now();
        ssh._lastUsed = Date.now();
        sshConnectionPool[cacheKey] = ssh;
        // console.log(`Conexión SSH directa ${cacheKey} guardada en pool para reutilización`);
      } else {
        // console.log(`Conexión bastión ${cacheKey} - NO guardada en pool (independiente)`);
      }
    } else {
      // console.log(`Usando conexión SSH directa existente del pool para terminal ${cacheKey}`);
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
          // console.log(`Conexión Wallix detectada: ${config.bastionHost} -> ${ssh._wallixTarget.host}:${ssh._wallixTarget.port}`);
          
          // Para bastiones Wallix, esperar un poco antes de crear shell
          // console.log('Esperando estabilización de conexión Wallix...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // console.log('Creando shell usando SSH2Promise con configuración Wallix...');
          
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
            // console.warn('Error con configuración Wallix, intentando configuración básica:', shellError.message);
            // Fallback con configuración mínima
            stream = await ssh.shell('xterm-256color');
          }
          
          // console.log('Shell de bastión Wallix creado exitosamente');
          
          // Para Wallix, verificar dónde estamos conectados
          // console.log('Verificando estado de conexión Wallix...');
          
          // Enviar comando para verificar hostname
          stream.write('hostname\n');
          
          // Esperar un poco para procesar
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // console.log('Para conexiones Wallix, el bastión maneja automáticamente la conexión al servidor destino');
          
        } else {
          // Conexión SSH directa normal
          // console.log('Creando shell SSH directo...');
          stream = await ssh.shell({ 
            term: 'xterm-256color',
            cols: 80,
            rows: 24
          });
        }
        
        break;
      } catch (shellError) {
        shellAttempts++;
        // console.warn(`Intento ${shellAttempts} de crear shell falló para ${cacheKey}:`, shellError?.message || shellError || 'Unknown error');
        
        if (shellAttempts >= maxShellAttempts) {
          throw new Error(`No se pudo crear shell después de ${maxShellAttempts} intentos: ${shellError?.message || shellError || 'Unknown error'}`);
        }
      }
    }
    
    // Configurar límites de listeners para el stream
    stream.setMaxListeners(0); // Sin límite para streams individuales

    const storedOriginalKey = config.originalKey || tabId;
    // console.log('Guardando conexión SSH con originalKey:', storedOriginalKey, 'para tabId:', tabId);
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
    // Log para depuración: mostrar todos los tabId activos
    // console.log('[DEBUG] Conexiones SSH activas:', Object.keys(sshConnections));

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
        if (sessionRecorder.isRecording(tabId)) {
          sessionRecorder.recordOutput(tabId, dataStr);
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
      if (sessionRecorder.isRecording(tabId)) {
        try {
          const recording = sessionRecorder.stopRecording(tabId);
          
          // Guardar grabación automáticamente (siempre guardar cuando hay una grabación activa)
          const autoRecordingEnabled = true; // Asumir que si hay grabación activa, debe guardarse
          if (autoRecordingEnabled) {
            // Guardar archivo en disco
            const userDataPath = app.getPath('userData');
            const recordingsDir = path.join(userDataPath, 'recordings');
            
            // Crear directorio si no existe
            await fs.mkdir(recordingsDir, { recursive: true });
            
            // Generar formato asciicast
            const asciicastContent = sessionRecorder.toAsciicast(recording);
            const filename = `${recording.id}.cast`;
            const filepath = path.join(recordingsDir, filename);
            
            // Guardar archivo
            await fs.writeFile(filepath, asciicastContent, 'utf-8');
            
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
            
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
            
            console.log(`💾 Grabación automática guardada: ${filename}`);
          }
        } catch (error) {
          console.error('Error guardando grabación automática:', error);
        }
      }
      
      // Enviar evento de desconexión
      const disconnectOriginalKey = conn?.originalKey || tabId;
      // console.log('🔌 SSH desconectado - enviando evento para originalKey:', disconnectOriginalKey);
      sendToRenderer(event.sender, 'ssh-connection-disconnected', { 
        originalKey: disconnectOriginalKey,
        tabId: tabId 
      });
      
      delete sshConnections[tabId];
    });



    sendToRenderer(event.sender, `ssh:ready:${tabId}`);
    
    // Enviar evento de conexión exitosa
    const originalKey = config.originalKey || tabId;
    // console.log('✅ SSH conectado - enviando evento para originalKey:', originalKey);
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
    // console.error(`Error en conexión SSH para ${tabId}:`, err);
    
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
    
    sendToRenderer(event.sender, `ssh:error:${tabId}`, errorMsg);
    
    // Enviar evento de error de conexión
    const errorOriginalKey = config.originalKey || tabId;
    // console.log('❌ SSH error - enviando evento para originalKey:', errorOriginalKey, 'error:', errorMsg);
    sendToRenderer(event.sender, 'ssh-connection-error', { 
      originalKey: errorOriginalKey,
      tabId: tabId,
      error: errorMsg 
    });
  }
});

// IPC handler to send data to the SSH shell
ipcMain.on('ssh:data', (event, { tabId, data }) => {
  const conn = sshConnections[tabId];
  if (conn && conn.stream && !conn.stream.destroyed) {
    // Grabar input si hay grabación activa
    if (sessionRecorder.isRecording(tabId)) {
      sessionRecorder.recordInput(tabId, data);
    }
    
    conn.stream.write(data);
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
                // console.warn(`Error redimensionando terminal ${tabId}:`, resizeError?.message || resizeError || 'Unknown error');
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
      
      // Para conexiones Wallix, solo necesitamos cerrar el stream principal
      if (conn.ssh && conn.ssh._isWallixConnection) {
        // console.log('Cerrando conexión Wallix');
      }
      
      // Limpiar listeners del stream de forma más agresiva
      if (conn.stream) {
        try {
          conn.stream.removeAllListeners();
          if (!conn.stream.destroyed) {
            conn.stream.destroy();
          }
        } catch (streamError) {
          // console.warn(`Error destroying stream: ${streamError?.message || streamError || 'Unknown error'}`);
        }
      }
      
      // Verificar si otras pestañas están usando la misma conexión SSH
      const otherTabsUsingConnection = Object.values(sshConnections)
        .filter(c => c !== conn && c.cacheKey === conn.cacheKey);
      
      // Solo cerrar la conexión SSH si no hay otras pestañas usándola
      // (Para bastiones, cada terminal es independiente, así que siempre cerrar)
      if (otherTabsUsingConnection.length === 0 && conn.ssh && conn.cacheKey) {
        try {
                // console.log(`Cerrando conexión SSH compartida para ${conn.cacheKey} (última pestaña)`);
      
      // Enviar evento de desconexión
      const disconnectOriginalKey = conn.originalKey || conn.cacheKey;
      // console.log('🔌 SSH cerrado - enviando evento para originalKey:', disconnectOriginalKey);
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
          // console.warn(`Error closing SSH connection: ${closeError?.message || closeError || 'Unknown error'}`);
        }
      } else {
        // console.log(`Manteniendo conexión SSH para ${conn.cacheKey} (${otherTabsUsingConnection.length} pestañas restantes)`);
      }
      
    } catch (error) {
      // console.error(`Error cleaning up SSH connection ${tabId}:`, error);
    } finally {
      // Always delete the connection
      delete sshConnections[tabId];
    }
  }
});

// Handler app-quit movido a src/main/handlers/application-handlers.js

// Limpieza robusta también en before-quit
app.on('before-quit', () => {
  isAppQuitting = true;
  
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
  
  // Cleanup Cygwin processes
  if (Cygwin && Cygwin.CygwinHandlers) {
    try {
      Cygwin.CygwinHandlers.cleanup();
    } catch (error) {
      console.error('Error cleaning up Cygwin processes:', error);
    }
  }
});

// Handlers del sistema (clipboard, dialog, import) movidos a main/handlers/system-handlers.js





// Function to safely send to mainWindow
// Funciones sendToRenderer y cleanupOrphanedConnections movidas a main/utils/connection-utils.js

// Ejecutar limpieza cada 10 minutos
setInterval(() => cleanupOrphanedConnections(sshConnectionPool, sshConnections), 10 * 60 * 1000);

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
          // Aquí antes había un console.log(` incompleto que causaba error de sintaxis
          // Si se desea loggear, usar una línea válida como:
          // console.log('Conexión encontrada para bastion:', conn);
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
  // Eliminar o comentar console.log(`[STATS] Ejecutando statsLoop para tabId ${tabId} (activo: ${activeStatsTabId})`);
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
    // LOG DEBUG: Enviar stats a cada tabId
    // console.log('[DEBUG][BACKEND] Enviando stats a', `ssh-stats:update:${tabId}`, JSON.stringify(stats));
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
    const updateService = getUpdateService();
    const result = await updateService.checkForUpdates();
    return result;
  } catch (error) {
    console.error('[UPDATER] Error checking for updates:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    const updateService = getUpdateService();
    const result = await updateService.downloadUpdate();
    return result;
  } catch (error) {
    console.error('[UPDATER] Error downloading update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:quit-and-install', async () => {
  try {
    const updateService = getUpdateService();
    updateService.quitAndInstall();
    return { success: true };
  } catch (error) {
    console.error('[UPDATER] Error installing update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:get-config', async () => {
  try {
    const updateService = getUpdateService();
    const config = updateService.getConfig();
    return { success: true, config };
  } catch (error) {
    console.error('[UPDATER] Error getting config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:update-config', async (event, newConfig) => {
  try {
    const updateService = getUpdateService();
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
    const updateService = getUpdateService();
    const info = updateService.getUpdateInfo();
    return { success: true, ...info };
  } catch (error) {
    console.error('[UPDATER] Error getting update info:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:clear-cache', async () => {
  try {
    const updateService = getUpdateService();
    const result = updateService.clearUpdateCache();
    return result;
  } catch (error) {
    console.error('[UPDATER] Error clearing update cache:', error);
    return { success: false, error: error.message };
  }
});

// === RDP Support ===
// IPC handlers for RDP connections
ipcMain.handle('rdp:connect', async (event, config) => {
  try {
    const connectionId = await rdpManager.connect(config);
    
    // Setup process handlers for events
    const connection = rdpManager.activeConnections.get(connectionId);
    if (connection) {
      rdpManager.setupProcessHandlers(
        connection.process,
        connectionId,
        (connectionId) => {
          // On connect
          sendToRenderer(event.sender, 'rdp:connected', { connectionId });
        },
        (connectionId, exitInfo) => {
          // On disconnect
          sendToRenderer(event.sender, 'rdp:disconnected', { connectionId, exitInfo });
        },
        (connectionId, error) => {
          // On error
          sendToRenderer(event.sender, 'rdp:error', { connectionId, error: error.message });
        }
      );
    }
    
    return {
      success: true,
      connectionId: connectionId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('rdp:disconnect', async (event, connectionId) => {
  return rdpManager.disconnect(connectionId);
});

ipcMain.handle('rdp:disconnect-all', async (event) => {
  return rdpManager.disconnectAll();
});

ipcMain.handle('rdp:get-active-connections', async (event) => {
  return rdpManager.getActiveConnections();
});

ipcMain.handle('rdp:get-presets', async (event) => {
  return rdpManager.getPresets();
});

// Handler para crear pestañas de Guacamole movido a src/main/handlers/guacamole-handlers.js

// Handler para mostrar ventana RDP si está minimizada
ipcMain.handle('rdp:show-window', async (event, { server }) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    // En Windows, buscar ventanas de mstsc.exe
    if (process.platform === 'win32') {
      try {
        // Probar primero con un comando simple para verificar si hay procesos mstsc
        const { stdout: tasklistOutput } = await execAsync('tasklist /FI "IMAGENAME eq mstsc.exe" /FO CSV /NH');
        
        if (!tasklistOutput.includes('mstsc.exe')) {
          return { success: false, message: 'No se encontraron procesos mstsc.exe activos' };
        }
        
        // Crear un script PowerShell temporal
        const fs = require('fs');
        const path = require('path');
        const tempDir = require('os').tmpdir();
        const scriptPath = path.join(tempDir, 'restore_rdp.ps1');
        
        const scriptContent = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Win32 {
  [DllImport("user32.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

try {
  $processes = Get-Process mstsc -ErrorAction SilentlyContinue
  Write-Host "Procesos encontrados: $($processes.Count)"
  
  if ($processes.Count -eq 0) {
    Write-Host "ERROR: No se encontraron procesos mstsc.exe"
    exit 1
  }
  
  foreach ($process in $processes) {
    Write-Host "Proceso ID: $($process.Id), Ventana: $($process.MainWindowHandle)"
    
    if ($process.MainWindowHandle -ne [IntPtr]::Zero) {
      [Win32]::ShowWindow($process.MainWindowHandle, 9)
      [Win32]::SetForegroundWindow($process.MainWindowHandle)
      Write-Host "SUCCESS: Ventana restaurada para proceso $($process.Id)"
      break
    } else {
      Write-Host "ERROR: Proceso $($process.Id) no tiene ventana válida"
    }
  }
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
}
        `;
        
        fs.writeFileSync(scriptPath, scriptContent);
        
        const { stdout: psOutput, stderr: psError } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
        
        // Limpiar el archivo temporal
        try {
          fs.unlinkSync(scriptPath);
        } catch (e) {
          // Ignorar errores de limpieza
        }
        

        
        if (psOutput.includes('SUCCESS:')) {
          return { success: true, message: 'Ventana RDP restaurada' };
        } else {
          return { success: false, message: `No se pudo restaurar la ventana RDP. Output: ${psOutput}` };
        }
      } catch (error) {
        console.log('Error ejecutando PowerShell:', error);
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, message: 'Función solo disponible en Windows' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para desconectar sesión RDP específica
ipcMain.handle('rdp:disconnect-session', async (event, { server }) => {
  try {
    // Buscar y terminar procesos mstsc.exe que coincidan con el servidor
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      try {
        // Terminar todos los procesos mstsc.exe
        await execAsync('taskkill /F /IM mstsc.exe');
        return { success: true, message: 'Sesiones RDP terminadas' };
      } catch (error) {
        // Si no hay procesos para terminar, no es un error
        if (error.message.includes('not found')) {
          return { success: true, message: 'No hay sesiones RDP activas' };
        }
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, message: 'Función solo disponible en Windows' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Cleanup RDP connections on app quit
app.on('before-quit', () => {
  // Disconnect all RDP connections
  rdpManager.disconnectAll();
  rdpManager.cleanupAllTempFiles();
  
  // Cleanup Guacamole services
  if (guacdService) {
    guacdService.stop();
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
// ipcMain.handle('guacamole:create-token', async (event, config) => {
  // try {
  //   console.log('📋 [MAIN] CONFIG COMPLETO RECIBIDO:', config);
    // // Si guacd está en modo mock, informar al usuario y rechazar
    // try {
    //   if (guacdService && guacdService.getStatus && guacdService.getStatus().method === 'mock') {
    //     const message = 'RDP requiere Docker Desktop o WSL. Activa Docker Desktop o instala/activa WSL para utilizar RDP con Guacamole.';
    //     console.warn('⚠️  [MAIN] Intento de crear token con guacd en modo mock. ' + message);
    //     return { success: false, error: message };
    //   }
    // } catch {}
    
    // // Calcular resolución final: priorizar width/height, luego parsear resolution
    // let finalWidth = config.width || 1024;
    // let finalHeight = config.height || 768;
    
    // // Si no hay width/height específicos pero sí resolution, parsearla
    // if (!config.width && !config.height && config.resolution) {
    //   const [width, height] = config.resolution.split('x');
    //   if (width && height) {
    //     finalWidth = parseInt(width);
    //     finalHeight = parseInt(height);
    //     console.log(`🔄 [MAIN] Parseando resolution "${config.resolution}" → ${finalWidth}x${finalHeight}`);
    //   }
    // }

    // // Normalizar profundidad de color
    // let normalizedColorDepth = 32;
    // try {
    //   const candidateDepth = parseInt(config.colorDepth, 10);
    //   const allowedDepths = [8, 16, 24, 32];
    //   if (allowedDepths.includes(candidateDepth)) {
    //     normalizedColorDepth = candidateDepth;
    //   }
    // } catch {}

    // console.log('🔐 [MAIN] Creando token para configuración RDP:', {
    //   hostname: config.hostname,
    //   username: config.username,
    //   password: config.password ? '***OCULTA***' : 'NO DEFINIDA',
    //   port: config.port,
    //   width: finalWidth,     // ← Mostrar resolución final calculada
    //   height: finalHeight,   // ← Mostrar resolución final calculada
    //   dpi: config.dpi,
    //   colorDepth: normalizedColorDepth,
    //   enableDrive: config.enableDrive,
    //   enableWallpaper: config.enableWallpaper,
    //   redirectClipboard: config.redirectClipboard,
    //   security: config.security,
    //   resolution: config.resolution, // ← Mostrar resolution original si existe
    //   autoResize: config.autoResize  // ← Mostrar autoResize si existe
    // });
    
    // if (!guacamoleServer) {
    //   throw new Error('Servidor Guacamole no está inicializado');
    // }

    // const crypto = require('crypto');
    // const CIPHER = 'AES-256-CBC';
    // // La clave debe ser exactamente 32 bytes para AES-256-CBC
    // const SECRET_KEY_RAW = 'NodeTermGuacamoleSecretKey2024!';
    // const SECRET_KEY = crypto.createHash('sha256').update(SECRET_KEY_RAW).digest(); // 32 bytes exactos

    // // Preparar campos de drive si el usuario lo activó
    // let driveSettings = {};
    // try {
    //   if (config.enableDrive) {
        // // Si llega una carpeta de host desde UI, resolverla según método actual
        // let resolvedDrivePath = null;
        // if (config.driveHostDir && typeof config.driveHostDir === 'string' && config.driveHostDir.trim().length > 0 && typeof guacdService.resolveDrivePath === 'function') {
        //   resolvedDrivePath = guacdService.resolveDrivePath(config.driveHostDir);
        // } else if (typeof guacdService.getDrivePathForCurrentMethod === 'function') {
        //   resolvedDrivePath = guacdService.getDrivePathForCurrentMethod();
        // }
        // const drivePath = resolvedDrivePath;
        // const driveName = guacdService.getDriveName ? guacdService.getDriveName() : 'NodeTerm Drive';
        // if (typeof drivePath === 'string' && drivePath.trim().length > 0) {
        //   driveSettings = {
        //     'enable-drive': true,
        //     'drive-path': drivePath,
        //     'drive-name': driveName,
        //     'create-drive-path': true
        //   };
        // } else {
        //   // fallback: solo activar drive sin ruta explícita
        //   driveSettings = {
        //     'enable-drive': true,
        //     'create-drive-path': true
        //   };
        // }
      // }
    // } catch (e) {
      // // Si algo falla, no bloquear la conexión, sólo loguear
      // console.warn('⚠️  [MAIN] No se pudo calcular drive-path para Guacamole:', e?.message || e);
    // }

    // const tokenObject = {
    //   connection: {
    //     type: "rdp",
    //     settings: {
    //       hostname: config.hostname,
    //       username: config.username,
    //       password: config.password,
    //       port: config.port || 3389,
    //       security: config.security || "any",
    //       "ignore-cert": true,
    //       // Drive redirection
    //       ...driveSettings,
    //       "enable-wallpaper": config.enableWallpaper || false,
    //       width: finalWidth,
    //       height: finalHeight,
    //       dpi: config.dpi || 96,
    //       "color-depth": normalizedColorDepth,
          // // Características visuales opcionales (solo si están activadas)
          // "enable-desktop-composition": config.enableDesktopComposition === true ? true : undefined,
          // "enable-font-smoothing": config.enableFontSmoothing === true ? true : undefined,
          // "enable-theming": config.enableTheming === true ? true : undefined,
          // "enable-full-window-drag": config.enableFullWindowDrag === true ? true : undefined,
          // "enable-menu-animations": config.enableMenuAnimations === true ? true : undefined,
          // // Configuración específica para resize dinámico
          // "resize-method": config.autoResize ? "display-update" : "reconnect",
          // "enable-desktop-composition": config.autoResize ? true : false,
          // "enable-full-window-drag": config.autoResize ? true : false,
          // // Portapapeles: desactivar solo si el usuario lo deshabilitó
          // "disable-clipboard": (config.redirectClipboard === false) ? true : undefined,
          // // Compatibilidad Windows 11: desactivar GFX cuando se active la casilla
          // "enable-gfx": (config.enableGfx === true) ? true : undefined,
          // // Flags de prueba (enviar solo el activo si es true). Guacamole ignora claves con undefined.
          // "disable-glyph-caching": config.disableGlyphCaching === true ? true : undefined,
          // "disable-offscreen-caching": config.disableOffscreenCaching === true ? true : undefined,
          // "disable-bitmap-caching": config.disableBitmapCaching === true ? true : undefined,
          // "disable-copy-rect": config.disableCopyRect === true ? true : undefined
        // }
      // }
    // };
    
    // console.log('📄 [MAIN] Token objeto final:', {
    //   type: tokenObject.connection.type,
    //   settings: {
    //     ...tokenObject.connection.settings,
    //     password: tokenObject.connection.settings.password ? '***OCULTA***' : 'NO DEFINIDA'
    //   }
    // });

    // // Encriptar token usando Crypt de guacamole-lite para asegurar compatibilidad de formato
    // const Crypt = require('guacamole-lite/lib/Crypt.js');
    // const crypt = new Crypt(CIPHER, SECRET_KEY);
    // const token = crypt.encrypt(tokenObject);
    // // Añadir '&' al final para asegurar separación si el cliente añade más parámetros
    // const websocketUrl = `ws://localhost:8081/?token=${encodeURIComponent(token)}&`;
    
    // console.log('🌐 [MAIN] URL WebSocket generada:', websocketUrl.substring(0, 50) + '...');
    
    // return {
    //   success: true,
    //   token: token,
    //   websocketUrl: websocketUrl
    // };
  // } catch (error) {
    // return {
    //   success: false,
    //   error: error.message
    // };
  // }
// });

// === Terminal Support ===
const pty = require('node-pty');

let powershellProcesses = {}; // Cambiar a objeto para múltiples procesos
// wslProcesses ahora se maneja en WSLService.js

// Función getLinuxShell movida a src/main/services/WSLService.js

// Start PowerShell session
ipcMain.on('powershell:start', (event, { cols, rows }) => {
  const tabId = 'default'; // Fallback para compatibilidad
  PowerShell.PowerShellHandlers.start(tabId, { cols, rows });
});

// Start terminal session with tab ID (PowerShell on Windows, native shell on Linux/macOS)
function startPowerShellSession(tabId, { cols, rows }) {
  // No iniciar nuevos procesos si la app está cerrando
  if (isAppQuitting) {
    console.log(`Evitando iniciar PowerShell para ${tabId} - aplicación cerrando`);
    return;
  }
  
  try {
    // Verificar si ya hay un proceso activo
    if (powershellProcesses[tabId]) {
      const platform = os.platform();
      const shellName = platform === 'win32' ? 'PowerShell' : 'Terminal';
      console.log(`${shellName} ya existe para ${tabId}, reutilizando proceso existente`);
      
      // Simular mensaje de bienvenida y refrescar prompt para procesos reutilizados
      if (mainWindow && mainWindow.webContents) {
        const welcomeMsg = `\r\n\x1b[32m=== Sesión ${shellName} reutilizada ===\x1b[0m\r\n`;
        mainWindow.webContents.send(`powershell:data:${tabId}`, welcomeMsg);
      }
      
      // Refrescar prompt para mostrar estado actual
      setTimeout(() => {
        if (powershellProcesses[tabId]) {
          try {
            powershellProcesses[tabId].write('\r');
          } catch (e) {
            console.log(`Error refrescando prompt para ${tabId}:`, e.message);
          }
        }
      }, 300);
      
      return;
    }

    // Determine shell and arguments based on OS
    let shell, args;
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Usar Windows PowerShell directamente para mayor estabilidad
      shell = 'powershell.exe';
      args = ['-NoExit'];
    } else if (platform === 'linux' || platform === 'darwin') {
      // For Linux and macOS, detect the best available shell
      shell = getLinuxShell();
      args = []; // Most Linux shells don't need special args for interactive mode
    } else {
      // Fallback to PowerShell Core for other platforms
      shell = 'pwsh';
      args = ['-NoExit'];
    }

    // Spawn PowerShell process con configuración ultra-conservative
    const spawnOptions = {
      name: 'xterm-256color',
      cols: cols || 120,
      rows: rows || 30,
      cwd: os.homedir(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      },
      windowsHide: false
    };
    
    // Platform-specific configurations
    if (os.platform() === 'win32') {
      spawnOptions.useConpty = false;              // Deshabilitar ConPTY completamente
      spawnOptions.conptyLegacy = false;           // No usar ConPTY legacy
      spawnOptions.experimentalUseConpty = false;  // Deshabilitar experimental
      spawnOptions.backend = 'winpty';             // Forzar uso de WinPTY
    } else if (os.platform() === 'linux' || os.platform() === 'darwin') {
      // Linux/macOS specific configurations for better compatibility
      spawnOptions.windowsHide = undefined;        // Not applicable on Unix
      spawnOptions.env = {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        LANG: process.env.LANG || 'en_US.UTF-8',   // Ensure proper locale
        LC_ALL: process.env.LC_ALL || 'en_US.UTF-8'
      };
    }
    
    // Intentar crear el proceso con manejo de errores robusto
    let spawnSuccess = false;
    let lastError = null;
    
    // Intentar con diferentes configuraciones hasta que una funcione
    const configsToTry = [
      // Configuración principal
      spawnOptions,
      // Configuración conservadora
      { ...alternativePtyConfig.conservative, cwd: os.homedir() },
      // Configuración con WinPTY
      { ...alternativePtyConfig.winpty, cwd: os.homedir() },
      // Configuración mínima
      { ...alternativePtyConfig.minimal, cwd: os.homedir() }
    ];
    
    for (let i = 0; i < configsToTry.length && !spawnSuccess; i++) {
      try {
        // línea eliminada: console.log(`Intentando configuración ${i + 1}/${configsToTry.length} para PowerShell ${tabId}...`);
        powershellProcesses[tabId] = pty.spawn(shell, args, configsToTry[i]);
        spawnSuccess = true;
        // línea eliminada: console.log(`Configuración ${i + 1} exitosa para PowerShell ${tabId}`);
      } catch (spawnError) {
        lastError = spawnError;
        console.warn(`Configuración ${i + 1} falló para PowerShell ${tabId}:`, spawnError.message);
        
        // Limpiar proceso parcialmente creado
        if (powershellProcesses[tabId]) {
          try {
            powershellProcesses[tabId].kill();
          } catch (e) {
            // Ignorar errores de limpieza
          }
          delete powershellProcesses[tabId];
        }
      }
    }
    
    if (!spawnSuccess) {
      // Último recurso: usar SafeWindowsTerminal para Windows
      if (os.platform() === 'win32') {
        try {
          console.log(`Intentando SafeWindowsTerminal como último recurso para ${tabId}...`);
          const safeTerminal = new SafeWindowsTerminal(shell, args, {
            cwd: os.homedir(),
            env: process.env,
            windowsHide: false
          });
          
          powershellProcesses[tabId] = safeTerminal.spawn();
          spawnSuccess = true;
          // línea eliminada: console.log(`SafeWindowsTerminal exitoso para ${tabId}`);
        } catch (safeError) {
          console.error(`SafeWindowsTerminal también falló para ${tabId}:`, safeError.message);
        }
      }
      
      if (!spawnSuccess) {
        throw new Error(`No se pudo iniciar PowerShell para ${tabId} después de probar todas las configuraciones: ${lastError?.message || 'Error desconocido'}`);
      }
    }

    // Handle PowerShell output
    powershellProcesses[tabId].onData((data) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`powershell:data:${tabId}`, data);
      }
    });
    


    // Handle PowerShell exit
    powershellProcesses[tabId].onExit((exitCode, signal) => {
      //console.log(`PowerShell process for tab ${tabId} exited with code:`, exitCode, 'signal:', signal, 'type:', typeof exitCode);
      
      // Extraer el código de salida real
      let actualExitCode = exitCode;
      if (typeof exitCode === 'object' && exitCode !== null) {
        // Si es un objeto con propiedad exitCode, usar ese valor
        if (exitCode.exitCode !== undefined) {
          actualExitCode = exitCode.exitCode;
        } else {
          // Si es otro tipo de objeto, intentar convertirlo
          actualExitCode = parseInt(JSON.stringify(exitCode), 10) || 0;
        }
      } else if (typeof exitCode === 'string') {
        // Si es string, intentar parsearlo
        actualExitCode = parseInt(exitCode, 10) || 0;
      } else if (typeof exitCode === 'number') {
        actualExitCode = exitCode;
      } else {
        actualExitCode = 0;
      }
      
      //console.log(`PowerShell ${tabId} actual exit code:`, actualExitCode);
      
      // Limpiar el proceso actual
      delete powershellProcesses[tabId];
      
      // Determinar si es una terminación que requiere reinicio automático
      // Solo reiniciar para códigos específicos de fallo de ConPTY, no para terminaciones normales
      const needsRestart = actualExitCode === -1073741510; // Solo fallo de ConPTY
      
      if (needsRestart) {
        // Para fallos específicos como ConPTY, reiniciar automáticamente
        console.log(`PowerShell ${tabId} falló con código ${actualExitCode}, reiniciando en 1 segundo...`);
        setTimeout(() => {
          if (!isAppQuitting && mainWindow && mainWindow.webContents) {
            console.log(`Reiniciando PowerShell ${tabId} después de fallo...`);
            // Usar las dimensiones originales o por defecto
            const originalCols = cols || 120;
            const originalRows = rows || 30;
            startPowerShellSession(tabId, { cols: originalCols, rows: originalRows });
          }
        }, 1000);
      } else {
        // Para terminaciones normales (código 0) o errores (código 1), no reiniciar automáticamente
        if (actualExitCode === 0) {
          console.log(`PowerShell ${tabId} terminó normalmente (código ${actualExitCode})`);
        } else {
          console.log(`PowerShell ${tabId} terminó con error (código ${actualExitCode})`);
          if (mainWindow && mainWindow.webContents) {
            const exitCodeStr = typeof exitCode === 'object' ? JSON.stringify(exitCode) : String(exitCode);
            mainWindow.webContents.send(`powershell:error:${tabId}`, `PowerShell process exited with code ${exitCodeStr}`);
          }
        }
      }
    });
    
    // Agregar manejador de errores del proceso
    if (powershellProcesses[tabId] && powershellProcesses[tabId].pty) {
      powershellProcesses[tabId].pty.on('error', (error) => {
        if (error.message && error.message.includes('AttachConsole failed')) {
          console.warn(`Error AttachConsole en PowerShell ${tabId}:`, error.message);
        } else {
          console.error(`Error en proceso PowerShell ${tabId}:`, error);
        }
      });
    }

    // Send ready signal
    // setTimeout(() => {
    //   if (mainWindow && mainWindow.webContents) {
    //     mainWindow.webContents.send(`powershell:ready:${tabId}`);
    //   }
    // }, 500);

    // línea eliminada: console.log(`PowerShell ${tabId} iniciado exitosamente`);

  } catch (error) {
    console.error(`Error starting PowerShell for tab ${tabId}:`, error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(`powershell:error:${tabId}`, `Failed to start PowerShell: ${error.message}`);
    }
  }
}

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

// Using only tab-specific PowerShell handlers for better control

// Funciones de manejo para PowerShell
// Función handlePowerShellStart movida a src/main/services/PowerShellService.js

// Función handlePowerShellData movida a src/main/services/PowerShellService.js

// Función handlePowerShellResize movida a src/main/services/PowerShellService.js

// Función handlePowerShellStop movida a src/main/services/PowerShellService.js

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

// Store active Ubuntu processes (for backward compatibility)
const ubuntuProcesses = {};

// Función detectUbuntuAvailability movida a src/main/services/WSLService.js

// Funciones de manejo para distribuciones WSL (genéricas)
// Función handleWSLDistroStart movida a src/main/services/WSLService.js

// Funciones de manejo para Ubuntu (compatibilidad)
// Función handleUbuntuStart movida a src/main/services/WSLService.js

// Función genérica para iniciar cualquier distribución WSL
function startWSLDistroSession(tabId, { cols, rows, distroInfo }) {
    if (isAppQuitting) {
        console.log(`Evitando iniciar distribución WSL para ${tabId} - aplicación cerrando`);
        return;
    }

    try {
        // Kill existing process if it exists
        if (wslDistroProcesses[tabId]) {
            try {
                wslDistroProcesses[tabId].kill();
            } catch (e) {
                console.error(`Error killing existing WSL distro process for tab ${tabId}:`, e);
            }
        }

        // Determine shell and arguments for WSL distribution
        let shell, args;
        
        // Usar el ejecutable específico de la distribución
        if (distroInfo && distroInfo.executable) {
            shell = distroInfo.executable;
        } else {
            // Fallback a wsl.exe genérico
            shell = 'wsl.exe';
            console.log('⚠️ Sin info específica, usando wsl.exe genérico');
        }
        
        // Configurar argumentos para iniciar en el directorio home de WSL
        if (shell === 'wsl.exe' || (distroInfo && distroInfo.executable && distroInfo.executable.includes('wsl'))) {
            args = ['--cd', '~']; // Iniciar en el directorio home de WSL
        } else {
            args = []; // Para otros shells, no usar argumentos específicos
        }

        // Environment variables
        const env = {
            ...process.env,
        };

        // Múltiples configuraciones para mayor compatibilidad con WSL
        const wslConfigurations = [
            // Configuración 1: Por defecto con ConPTY deshabilitado y WinPTY forzado
            {
                env,
                cwd: undefined,
                name: 'xterm-color',
                cols: cols,
                rows: rows,
                encoding: null,
                useConpty: false,
                conptyLegacy: false,
                experimentalUseConpty: false,
                backend: 'winpty',
                windowsHide: false
            },
            // Configuración 2: Conservativa sin ConPTY 
            {
                env,
                cwd: undefined,
                name: 'xterm',
                cols: cols || 80,
                rows: rows || 24,
                encoding: null,
                useConpty: false,
                conptyLegacy: false,
                experimentalUseConpty: false,
                backend: 'winpty',
                windowsHide: false
            },
            // Configuración 3: Mínima con WinPTY
            {
                env,
                cwd: undefined,
                name: 'xterm',
                cols: cols || 80,
                rows: rows || 24,
                useConpty: false,
                backend: 'winpty',
                windowsHide: false
            }
        ];

        let spawnSuccess = false;
        let lastError = null;

        // Intentar cada configuración hasta que una funcione
        for (let i = 0; i < wslConfigurations.length && !spawnSuccess; i++) {
            try {
                // console.log(`Intentando configuración ${i + 1}/${wslConfigurations.length} para WSL ${shell} ${tabId}...`); // Eliminado por limpieza de logs
                wslDistroProcesses[tabId] = pty.spawn(shell, args, wslConfigurations[i]);
                // console.log(`Configuración ${i + 1} exitosa para WSL ${shell} ${tabId}`); // Eliminado por limpieza de logs
                spawnSuccess = true;
            } catch (spawnError) {
                console.warn(`Configuración ${i + 1} falló para WSL ${shell} ${tabId}:`, spawnError.message);
                lastError = spawnError;
                
                // Limpiar proceso fallido si existe
                if (wslDistroProcesses[tabId]) {
                    try {
                        wslDistroProcesses[tabId].kill();
                    } catch (e) {
                        // Ignorar errores de limpieza
                    }
                    delete wslDistroProcesses[tabId];
                }
            }
        }

        if (!spawnSuccess) {
            throw new Error(`No se pudo iniciar WSL ${shell} para ${tabId} después de probar todas las configuraciones: ${lastError?.message || 'Error desconocido'}`);
        }

        // Handle distribution output
        wslDistroProcesses[tabId].onData((data) => {
            // Proteger acceso si el proceso ya no existe
            if (!wslDistroProcesses[tabId]) return;
            // Send ready only on first data reception
            if (!wslDistroProcesses[tabId]._hasReceivedData) {
                wslDistroProcesses[tabId]._hasReceivedData = true;
                // console.log(`WSL terminal ${shell} ready for ${tabId}`); // Eliminado por limpieza de logs
                if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
                    const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                    mainWindow.webContents.send(`${channelName}:ready:${tabId}`);
                }
            }
            
            if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
                const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                mainWindow.webContents.send(`${channelName}:data:${tabId}`, data);
            }
        });

        // Handle distribution exit  
        wslDistroProcesses[tabId].onExit((exitCode, signal) => {
            // console.log(`WSL ${shell} (${tabId}) exited with code:`, exitCode, 'signal:', signal); // Eliminado por limpieza de logs
            //console.log(`WSL ${shell} (${tabId}) exited with code:`, exitCode, 'signal:', signal);

            if (isAppQuitting) {
                console.log(`App is closing, ignoring exit for ${tabId}`);
                return;
            }

            if (!mainWindow || mainWindow.isDestroyed()) {
                console.log(`Main window destroyed, ignoring exit for ${tabId}`);
                return;
            }

            let actualExitCode = exitCode;
            if (exitCode === null && signal) {
                actualExitCode = `killed by ${signal}`;
            }

            // Determinar si necesita reinicio automático (solo para errores específicos de ConPTY)
            const needsRestart = exitCode === -1073741510; // Error específico de ConPTY
            
            if (needsRestart) {
                console.log(`WSL ${shell} (${tabId}) falló con error de ConPTY, reiniciando en 2 segundos...`);
                setTimeout(() => {
                    if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
                        console.log(`Reiniciando WSL ${shell} (${tabId}) después de error de ConPTY...`);
                        startWSLDistroSession(tabId, { cols: cols || 80, rows: rows || 24, distroInfo });
                    }
                }, 2000);
            } else if (exitCode !== 0 && exitCode !== null) {
               // console.warn(`WSL distro process for tab ${tabId} exited unexpectedly`);
                // Silenciar el mensaje de error de proceso cerrado inesperadamente
                // const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                // mainWindow.webContents.send(`${channelName}:error:${tabId}`,
                //     `${distroInfo?.label || 'WSL Distribution'} session ended unexpectedly (code: ${actualExitCode})`);
            }

            // Clean up
            delete wslDistroProcesses[tabId];
        });

        // Ready will be sent when first data is received (see onData handler above)
        // console.log(`WSL terminal ${shell} configured for ${tabId}, waiting for data...`); // Eliminado por limpieza de logs

    } catch (error) {
        console.error(`Error starting WSL distro session for tab ${tabId}:`, error);
        if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
            const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
            mainWindow.webContents.send(`${channelName}:error:${tabId}`,
                `Failed to start ${distroInfo?.label || 'WSL Distribution'}: ${error.message}`);
        }
    }
}

// Función original para Ubuntu (para compatibilidad)
function startUbuntuSession(tabId, { cols, rows, ubuntuInfo }) {
  // No iniciar nuevos procesos si la app está cerrando
  if (isAppQuitting) {
    console.log(`Evitando iniciar Ubuntu para ${tabId} - aplicación cerrando`);
    return;
  }
  
  try {
    // Kill existing process if any
    if (ubuntuProcesses[tabId]) {
      try {
        ubuntuProcesses[tabId].kill();
      } catch (e) {
        console.error(`Error killing existing Ubuntu process for tab ${tabId}:`, e);
      }
    }

    // Determine shell and arguments for Ubuntu
    let shell, args;
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Usar el ejecutable específico de la versión de Ubuntu
      if (ubuntuInfo && ubuntuInfo.executable) {
        shell = ubuntuInfo.executable;
        console.log(`🎯 Usando ejecutable específico: ${shell} para ${ubuntuInfo.label || 'Ubuntu'}`);
      } else {
        // Fallback a ubuntu.exe genérico
        shell = 'ubuntu.exe';
        console.log('⚠️ Sin info específica, usando ubuntu.exe genérico');
      }
      args = []; // Ubuntu funciona mejor sin argumentos
    } else {
      // For non-Windows platforms, use bash directly
      shell = '/bin/bash';
      args = ['--login'];
    }

    // Spawn Ubuntu process con configuración simplificada
    const spawnOptions = {
      name: 'xterm-256color',
      cols: cols || 120,
      rows: rows || 30,
      cwd: os.homedir(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      },
      windowsHide: false
    };
    
    // Platform-specific configurations
    if (os.platform() === 'win32') {
      spawnOptions.useConpty = false;              // Deshabilitar ConPTY completamente
      spawnOptions.conptyLegacy = false;           // No usar ConPTY legacy
      spawnOptions.experimentalUseConpty = false;  // Deshabilitar experimental
      spawnOptions.backend = 'winpty';             // Forzar uso de WinPTY
    }
    
    ubuntuProcesses[tabId] = pty.spawn(shell, args, spawnOptions);

    // Handle Ubuntu output
    ubuntuProcesses[tabId].onData((data) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`ubuntu:data:${tabId}`, data);
      }
    });

    // Handle Ubuntu exit
    ubuntuProcesses[tabId].onExit((exitCode, signal) => {
      //console.log(`Ubuntu process for tab ${tabId} exited with code:`, exitCode, 'signal:', signal);
      
      // Extraer el código de salida real
      let actualExitCode = exitCode;
      if (typeof exitCode === 'object' && exitCode !== null) {
        if (exitCode.exitCode !== undefined) {
          actualExitCode = exitCode.exitCode;
        } else {
          actualExitCode = parseInt(JSON.stringify(exitCode), 10) || 0;
        }
      } else if (typeof exitCode === 'string') {
        actualExitCode = parseInt(exitCode, 10) || 0;
      }
      
      if (actualExitCode !== 0 && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
        // Silenciar el mensaje de error de proceso cerrado inesperadamente
        // console.warn(`Ubuntu process for tab ${tabId} exited unexpectedly`);
        // No enviar mensaje de error al frontend para evitar mostrar errores al usuario
        // if (mainWindow && mainWindow.webContents) {
        //   mainWindow.webContents.send(`ubuntu:error:${tabId}`, 
        //     `Ubuntu session ended unexpectedly (code: ${actualExitCode})`);
        // }
      }
      
      // Cleanup
      delete ubuntuProcesses[tabId];
    });

    // Send ready signal
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(`ubuntu:ready:${tabId}`);
    }

  } catch (error) {
    console.error(`Error starting Ubuntu session for tab ${tabId}:`, error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(`ubuntu:error:${tabId}`, 
        `Failed to start Ubuntu: ${error.message}`);
    }
  }
}

// Funciones de manejo para distribuciones WSL genéricas
function handleWSLDistroData(tabId, data) {
  // Intentar primero con WSL distro processes
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].write(data);
    } catch (error) {
      console.error(`Error writing to WSL distro ${tabId}:`, error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`wsl-distro:error:${tabId}`, `Write error: ${error.message}`);
      }
    }
  } else {
    console.warn(`No WSL distro process found for ${tabId}`);
  }
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
  } else if (ubuntuProcesses[tabId]) {
    // Fallback al sistema legacy de Ubuntu
    try {
      ubuntuProcesses[tabId].write(data);
    } catch (error) {
      console.error(`Error writing to Ubuntu ${tabId}:`, error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`ubuntu:error:${tabId}`, `Write error: ${error.message}`);
      }
    }
  } else {
    console.warn(`No Ubuntu process found for ${tabId}`);
  }
}

function handleWSLDistroResize(tabId, { cols, rows }) {
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing WSL distro ${tabId}:`, error);
    }
  }
}

function handleUbuntuResize(tabId, { cols, rows }) {
  // Si hay un proceso en wslDistroProcesses, usarlo (nuevo sistema)
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing Ubuntu ${tabId}:`, error);
    }
  } else if (ubuntuProcesses[tabId]) {
    // Fallback al sistema legacy de Ubuntu
    try {
      ubuntuProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing Ubuntu ${tabId}:`, error);
    }
  }
}

function handleWSLDistroStop(tabId) {
  if (wslDistroProcesses[tabId]) {
    try {
      // console.log(`Deteniendo proceso WSL distro para tab ${tabId}`); // Eliminado por limpieza de logs
      const process = wslDistroProcesses[tabId];
      
      // Remover listeners antes de terminar el proceso
      process.removeAllListeners();
      
      // En Windows, usar destroy() para forzar terminación
      if (os.platform() === 'win32') {
        try {
          process.kill(); // Intento graceful primero
        } catch (e) {
          // Si kill() falla, usar destroy()
          try {
            process.destroy();
          } catch (destroyError) {
            console.warn(`Error con destroy() en WSL distro ${tabId}:`, destroyError.message);
          }
        }
      } else {
        // En sistemas POSIX, usar SIGTERM
        process.kill('SIGTERM');
        
        // Dar tiempo para que termine graciosamente
        setTimeout(() => {
          if (wslDistroProcesses[tabId]) {
            try {
              wslDistroProcesses[tabId].kill('SIGKILL');
            } catch (e) {
              // Ignorar errores de terminación forzada
            }
          }
        }, 1000);
      }
      
      delete wslDistroProcesses[tabId];
    } catch (error) {
      console.error(`Error stopping WSL distro ${tabId}:`, error);
    }
  }
}

function handleUbuntuStop(tabId) {
  if (ubuntuProcesses[tabId]) {
    try {
      // console.log(`Deteniendo proceso Ubuntu para tab ${tabId} (nuevo sistema)`); // Eliminado por limpieza de logs
      // console.log(`Deteniendo proceso Ubuntu para tab ${tabId}`); // Eliminado por limpieza de logs
      const process = ubuntuProcesses[tabId];
      
      // Remover listeners antes de terminar el proceso
      process.removeAllListeners();
      
      // En Windows, usar destroy() para forzar terminación
      if (os.platform() === 'win32') {
        try {
          process.kill(); // Intento graceful primero
        } catch (e) {
          // Si kill() falla, usar destroy()
          try {
            process.destroy();
          } catch (destroyError) {
            console.warn(`Error con destroy() en Ubuntu ${tabId}:`, destroyError.message);
          }
        }
      } else {
        // En sistemas POSIX, usar SIGTERM
        process.kill('SIGTERM');
        
        // Dar tiempo para que termine graciosamente
        setTimeout(() => {
          if (ubuntuProcesses[tabId]) {
            try {
              ubuntuProcesses[tabId].kill('SIGKILL');
            } catch (e) {
              // Ignorar errores de terminación forzada
            }
          }
        }, 1000);
      }
      
      delete ubuntuProcesses[tabId];
    } catch (error) {
      console.error(`Error stopping Ubuntu ${tabId}:`, error);
    }
  }
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
}



// Evento para registrar nuevas pestañas
ipcMain.on('register-tab-events', (event, tabId) => {
  // console.log(`Registering events for tab: ${tabId}`); // Eliminado por limpieza de logs
  registerTabEvents(tabId);
});

// Using dynamic tab registration instead of predefined tabs

// Cleanup terminals on app quit
app.on('before-quit', (event) => {
  isAppQuitting = true;
  
  // Cleanup all PowerShell processes
  Object.keys(powershellProcesses).forEach(tabId => {
    try {
      const process = powershellProcesses[tabId];
      if (process) {
        process.removeAllListeners();
        
        // En Windows, usar destroy() para forzar terminación
        if (os.platform() === 'win32') {
          try {
            process.kill(); // Intento graceful primero
          } catch (e) {
            // Si kill() falla, usar destroy()
            try {
              process.destroy();
            } catch (destroyError) {
              console.warn(`Error con destroy() en PowerShell ${tabId} on quit:`, destroyError.message);
            }
          }
        } else {
          process.kill('SIGTERM');
          // Terminación forzada después de 500ms en sistemas POSIX
          setTimeout(() => {
            if (powershellProcesses[tabId]) {
              try {
                powershellProcesses[tabId].kill('SIGKILL');
              } catch (e) {
                // Ignorar errores
              }
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error(`Error cleaning up PowerShell ${tabId} on quit:`, error);
    }
  });
  
  // WSL processes cleanup is now handled by WSLService.js
  
  // Cleanup all Ubuntu processes
  Object.keys(ubuntuProcesses).forEach(tabId => {
    try {
      const process = ubuntuProcesses[tabId];
      if (process) {
        process.removeAllListeners();
        
        // En Windows, usar destroy() para forzar terminación
        if (os.platform() === 'win32') {
          try {
            process.kill(); // Intento graceful primero
          } catch (e) {
            // Si kill() falla, usar destroy()
            try {
              process.destroy();
            } catch (destroyError) {
              console.warn(`Error con destroy() en Ubuntu ${tabId} on quit:`, destroyError.message);
            }
          }
        } else {
          process.kill('SIGTERM');
          // Terminación forzada después de 500ms en sistemas POSIX
          setTimeout(() => {
            if (ubuntuProcesses[tabId]) {
              try {
                ubuntuProcesses[tabId].kill('SIGKILL');
              } catch (e) {
                // Ignorar errores
              }
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error(`Error cleaning up Ubuntu ${tabId} on quit:`, error);
    }
  });
});

// Sticky stats para main.js también
let mainLastValidStats = {
  cpu: { usage: 0, cores: 0, model: 'Iniciando...' },
  memory: { used: 0, total: 0, percentage: 0 },
  disks: [],
  network: { download: 0, upload: 0 },
  temperature: { cpu: 0, gpu: 0 }
};

// Sistema de estadísticas del sistema con datos reales
async function getSystemStats() {
  const platform = os.platform();
  // Comenzar con los últimos valores válidos conocidos
  const stats = {
    cpu: { ...mainLastValidStats.cpu },
    memory: { ...mainLastValidStats.memory },
    disks: [...mainLastValidStats.disks],
    network: { ...mainLastValidStats.network },
    temperature: { ...mainLastValidStats.temperature }
  };

  // Memoria (siempre funciona con os nativo)
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    if (totalMem > 0) {
      stats.memory.total = Math.round(totalMem / (1024 * 1024 * 1024) * 10) / 10;
      stats.memory.used = Math.round(usedMem / (1024 * 1024 * 1024) * 10) / 10;
      stats.memory.percentage = Math.round((usedMem / totalMem) * 100 * 10) / 10;
    }
  } catch (error) {
    // Mantener valores anteriores si falla
  }

  // CPU con timeout individual
  try {
    const cpuData = await Promise.race([
      si.currentLoad(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('CPU timeout')), 3000))
    ]);
    
    if (cpuData && typeof cpuData.currentLoad === 'number') {
      stats.cpu.usage = Math.round(cpuData.currentLoad * 10) / 10;
      stats.cpu.cores = cpuData.cpus ? cpuData.cpus.length : os.cpus().length;
      stats.cpu.model = os.cpus()[0]?.model || 'CPU';
    }
  } catch (error) {
    // Mantener valores anteriores de CPU si falla
  }

  // Discos con timeout reducido
  try {
    const diskData = await Promise.race([
      si.fsSize(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Disk timeout')), 2500)) // Reducido de 5000ms a 2500ms
    ]);
    
    // Solo actualizar discos si obtenemos datos válidos y completos
    if (diskData && diskData.length > 0) {
      stats.disks = diskData.map(disk => ({
        name: disk.fs,
        used: Math.round(disk.used / (1024 * 1024 * 1024) * 10) / 10,
        total: Math.round(disk.size / (1024 * 1024 * 1024) * 10) / 10,
        percentage: Math.round((disk.used / disk.size) * 100),
        isNetwork: false // Simplificado para main.js
      }));
    }
    // Si falla o no hay datos, mantener la lista anterior de discos
  } catch (error) {
    // Mantener discos anteriores si falla
  }

  // Red diferencial (solo interfaces activas y físicas, Mbps)
  try {
    const netIfaces = await si.networkInterfaces();
    const netStats = await si.networkStats();
    const now = Date.now();
    // Filtrar solo interfaces físicas y activas
    const validIfaces = netIfaces.filter(i => i.operstate === 'up' && !i.virtual && !i.internal);
    const validNames = validIfaces.map(i => i.iface);
    const filteredStats = netStats.filter(s => validNames.includes(s.iface));
    let rx = 0, tx = 0;
    if (lastNetStats && lastNetTime) {
      // Sumar la diferencia de bytes para todas las interfaces válidas
      for (const stat of filteredStats) {
        const prev = lastNetStats.find(s => s.iface === stat.iface);
        if (prev) {
          rx += Math.max(0, stat.rx_bytes - prev.rx_bytes);
          tx += Math.max(0, stat.tx_bytes - prev.tx_bytes);
        }
      }
      const dt = (now - lastNetTime) / 1000; // segundos
      if (dt > 0) {
        // Convertir a Mbps (1 byte = 8 bits, 1e6 bits = 1 Mbit)
        stats.network.download = Math.round((rx * 8 / 1e6) / dt * 10) / 10;
        stats.network.upload = Math.round((tx * 8 / 1e6) / dt * 10) / 10;
      }
    }
    // Guardar para la próxima llamada
    lastNetStats = filteredStats.map(s => ({ iface: s.iface, rx_bytes: s.rx_bytes, tx_bytes: s.tx_bytes }));
    lastNetTime = now;
  } catch (error) {}

  // Temperatura con timeout individual  
  try {
    const tempData = await Promise.race([
      si.cpuTemperature(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Temperature timeout')), 2000))
    ]);
    
    if (tempData && typeof tempData.main === 'number' && tempData.main > 0) {
      stats.temperature.cpu = tempData.main;
    }
    // Si falla o no hay datos, mantener temperatura anterior
  } catch (error) {}

  // Guardar los stats actuales como últimos válidos
  mainLastValidStats = {
    cpu: { ...stats.cpu },
    memory: { ...stats.memory },
    disks: [...stats.disks],
    network: { ...stats.network },
    temperature: { ...stats.temperature }
  };

  return stats;
}

// Historial de conexiones
let connectionHistory = {
  recent: [],
  favorites: []
};

// Cargar historial de conexiones
function loadConnectionHistory() {
  try {
    const historyPath = path.join(os.homedir(), '.nodeterm', 'connection_history.json');
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      connectionHistory = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error cargando historial de conexiones:', error);
  }
}

// Guardar historial de conexiones
function saveConnectionHistory() {
  try {
    const historyDir = path.join(os.homedir(), '.nodeterm');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    
    const historyPath = path.join(historyDir, 'connection_history.json');
    fs.writeFileSync(historyPath, JSON.stringify(connectionHistory, null, 2));
  } catch (error) {
    console.error('Error guardando historial de conexiones:', error);
  }
}

// Agregar conexión al historial
function addToConnectionHistory(connection) {
  const historyItem = {
    id: Date.now().toString(),
    name: connection.name || `${connection.username}@${connection.host}`,
    host: connection.host,
    username: connection.username,
    port: connection.port || 22,
    lastConnected: new Date(),
    status: 'success',
    connectionTime: Math.random() * 3 + 0.5 // Simular tiempo de conexión
  };
  
  // Remover entrada existente si ya existe
  connectionHistory.recent = connectionHistory.recent.filter(
    item => !(item.host === connection.host && item.username === connection.username && item.port === (connection.port || 22))
  );
  
  // Agregar al inicio
  connectionHistory.recent.unshift(historyItem);
  
  // Mantener solo las últimas 10 conexiones
  connectionHistory.recent = connectionHistory.recent.slice(0, 10);
  
  saveConnectionHistory();
}

// Manejadores IPC para historial de conexiones
ipcMain.handle('get-connection-history', async () => {
  loadConnectionHistory();
  return connectionHistory;
});

ipcMain.handle('add-connection-to-history', async (event, connection) => {
  addToConnectionHistory(connection);
  return true;
});

ipcMain.handle('toggle-favorite-connection', async (event, connectionId) => {
  try {
    loadConnectionHistory();
    
    // Buscar en recientes
    const recentIndex = connectionHistory.recent.findIndex(conn => conn.id === connectionId);
    if (recentIndex !== -1) {
      const connection = connectionHistory.recent[recentIndex];
      if (connection.isFavorite) {
        // Quitar de favoritos
        connection.isFavorite = false;
        connectionHistory.favorites = connectionHistory.favorites.filter(fav => fav.id !== connectionId);
      } else {
        // Agregar a favoritos
        connection.isFavorite = true;
        connectionHistory.favorites.push({ ...connection });
      }
    }
    
    saveConnectionHistory();
    return connectionHistory;
  } catch (error) {
    console.error('Error toggle favorite connection:', error);
    return connectionHistory;
  }
});

// Inicializar historial al inicio
loadConnectionHistory();

// Variables estáticas para el cálculo diferencial de red
let lastNetStats = null;
let lastNetTime = null;

// --- Worker persistente para stats ---
let statsWorker = null;
let statsWorkerReady = false;
let statsWorkerQueue = [];

function startStatsWorker() {
  if (statsWorker) {
    try { statsWorker.kill(); } catch {}
    statsWorker = null;
    statsWorkerReady = false;
  }
  statsWorker = fork(path.join(__dirname, 'system-stats-worker.js'));
  statsWorkerReady = true;
  statsWorker.on('exit', () => {
    statsWorkerReady = false;
    // Reiniciar automáticamente si muere
    setTimeout(startStatsWorker, 1000);
  });
  statsWorker.on('message', (msg) => {
    if (statsWorkerQueue.length > 0) {
      const { resolve, timeout } = statsWorkerQueue.shift();
      clearTimeout(timeout);
      if (msg.type === 'stats') {
        resolve(msg.data);
      } else {
        resolve({
          cpu: { usage: 0, cores: 0, model: 'Error' },
          memory: { used: 0, total: 0, percentage: 0 },
          disks: [],
          network: { download: 0, upload: 0 },
          temperature: { cpu: 0, gpu: 0 }
        });
      }
    }
  });
}

startStatsWorker();

ipcMain.handle('get-system-stats', async () => {
  return new Promise((resolve) => {
    if (!statsWorkerReady) {
      // Si el worker no está listo, devolver fallback
      resolve({
        cpu: { usage: 0, cores: 0, model: 'NoWorker' },
        memory: { used: 0, total: 0, percentage: 0 },
        disks: [],
        network: { download: 0, upload: 0 },
        temperature: { cpu: 0, gpu: 0 }
      });
      return;
    }
    const timeout = setTimeout(() => {
      resolve({
        cpu: { usage: 0, cores: 0, model: 'Timeout' },
        memory: { used: 0, total: 0, percentage: 0 },
        disks: [],
        network: { download: 0, upload: 0 },
        temperature: { cpu: 0, gpu: 0 }
      });
    }, 15000); // Aumentar de 7 a 15 segundos
    statsWorkerQueue.push({ resolve, timeout });
    try {
      statsWorker.send('get-stats');
    } catch (e) {
      clearTimeout(timeout);
      resolve({
        cpu: { usage: 0, cores: 0, model: 'ErrorSend' },
        memory: { used: 0, total: 0, percentage: 0 },
        disks: [],
        network: { download: 0, upload: 0 },
        temperature: { cpu: 0, gpu: 0 }
      });
    }
  });
});

// Manejador para peticiones HTTP de Nextcloud con configuración SSL personalizada
ipcMain.handle('nextcloud:http-request', async (event, { url, options, ignoreSSLErrors }) => {
  try {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    
    // Configurar opciones para la petición
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...(ignoreSSLErrors && isHttps && {
        rejectUnauthorized: false,
        requestCert: false,
        agent: false
      })
    };

    return new Promise((resolve, reject) => {
      const client = isHttps ? https : http;
      
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      // Si hay body, enviarlo
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  } catch (error) {
    throw error;
  }
});