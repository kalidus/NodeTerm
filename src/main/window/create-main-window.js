'use strict';

// ============================================================================
// 🪟 Creación de la ventana principal de NodeTerm
// Extraído de main.js para mejorar organización y mantenibilidad.
// Exporta createMainWindow(deps) que recibe todas las dependencias cerradas
// desde main.js a través del objeto `deps`.
// ============================================================================

const path = require('path');
const url = require('url');
const fs = require('fs');
const { BrowserWindow, screen, app, ipcMain, Menu } = require('electron');

// Splash HTML (11 temas unificados con unlock)
const { buildSplashHtml } = require('../utils/splash-html');
const { normalizeSplashStyle } = require('../utils/splash-styles');

function getSplashHtml(style) {
  return buildSplashHtml(style, { preview: false });
}

/**
 * Crea la ventana principal de NodeTerm y su splash de arranque.
 *
 * @param {object} deps - Dependencias inyectadas desde main.js:
 *   getMainWindow, setMainWindow, isAppQuitting, guacamoleLifecycle,
 *   findSSHConnection, sendToRenderer, sshConnections, sshConnectionPool,
 *   cleanupOrphanedConnections, getGuacdService, peekGuacdService,
 *   getAnythingLLMService, getOpenWebUIService, getLibreChatService,
 *   getAgentZeroService, getOpenClawService, getOpenNotebookService,
 *   packageJson, getOrCreateGuacamoleSecretKey,
 *   setupConnectionSearchShortcutBridge, getNodeTermDataDir,
 *   disconnectAllGuacamoleConnections, createServiceProxy,
 *   initializeGuacamoleServices, stopGuacamoleServices, loadGuacamoleEnabled,
 *   WSL, PowerShell, Cygwin, Claude, OpenCode, CodexCli, AntigravityCli,
 *   HermesCli, getClaudeConfig, getOpenCodeConfig, getCodexCliConfig,
 *   getAntigravityCliConfig, getHermesCliConfig, getPty, alternativePtyConfig,
 *   SafeWindowsTerminal, UbuntuProcessManager, WSLDistroProcessManager,
 *   getUpdateServiceLazy, ensureRecordingHandlersRegistered, getDocker,
 *   logTiming, appRoot
 */
function createMainWindow(deps) {
  const {
    getMainWindow,
    setMainWindow,
    isAppQuitting,
    guacamoleLifecycle,
    findSSHConnection,
    sendToRenderer,
    sshConnections,
    sshConnectionPool,
    cleanupOrphanedConnections,
    getGuacdService,
    peekGuacdService,
    getAnythingLLMService,
    getOpenWebUIService,
    getLibreChatService,
    getAgentZeroService,
    getOpenClawService,
    getOpenNotebookService,
    packageJson,
    getOrCreateGuacamoleSecretKey,
    setupConnectionSearchShortcutBridge,
    getNodeTermDataDir,
    disconnectAllGuacamoleConnections,
    createServiceProxy,
    initializeGuacamoleServices,
    stopGuacamoleServices,
    loadGuacamoleEnabled,
    WSL,
    PowerShell,
    Cygwin,
    Claude,
    OpenCode,
    CodexCli,
    AntigravityCli,
    HermesCli,
    getClaudeConfig,
    getOpenCodeConfig,
    getCodexCliConfig,
    getAntigravityCliConfig,
    getHermesCliConfig,
    getPty,
    alternativePtyConfig,
    SafeWindowsTerminal,
    UbuntuProcessManager,
    WSLDistroProcessManager,
    getUpdateServiceLazy,
    ensureRecordingHandlersRegistered,
    getDocker,
    logTiming,
    appRoot,
  } = deps;

  logTiming('createWindow() iniciado');

  // Referencia local a mainWindow; se sincroniza con main.js via setMainWindow()
  let mainWindow = getMainWindow();

  const { loadPreferredSplashStyleSync } = require('../utils/file-utils');
  const style = normalizeSplashStyle(loadPreferredSplashStyleSync());

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
      icon: path.join(appRoot, 'src/assets/app-icon.png'),
      backgroundColor: style === 'terminal-minimalist' ? '#000000' : (style === 'hologram-hud' ? '#06040d' : (style === 'synthwave-outrun' ? '#0f021a' : '#0a0f18')),
      show: true,
      resizable: false,
      alwaysOnTop: true,
      icon: path.join(appRoot, 'src/assets/app-icon.png'),
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    // 🚀 OPTIMIZACIÓN: loadURL con data URI es instantáneo (no I/O de disco)
    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSplashHtml(style))}`);
    splashWindow.focus();
  } catch (e) {
    console.warn('[SPLASH] No se pudo crear ventana de splash:', e?.message);
  }

  const { getInitialWindowBounds, saveWindowBounds } = require('../utils/window-bounds');
  const initialBounds = getInitialWindowBounds(getNodeTermDataDir());

  // Si es una instancia secundaria y no está maximizada, aplicar offset tipo cascada para que no tape a la primera
  if (process.env.NODETERM_IS_SECONDARY_INSTANCE === 'true' && !initialBounds.isMaximized) {
    if (typeof initialBounds.x === 'number') initialBounds.x += 30;
    if (typeof initialBounds.y === 'number') initialBounds.y += 30;
  }

  mainWindow = new BrowserWindow({
    width: initialBounds.width,
    height: initialBounds.height,
    x: initialBounds.x,
    y: initialBounds.y,
    minWidth: 200,
    minHeight: 100,
    title: 'NodeTerm',
    icon: path.join(appRoot, 'src/assets/app-icon.png'),
    frame: false,
    show: false,
    paintWhenInitiallyHidden: true,
    transparent: false,
    backgroundColor: '#0a0f1f',
    icon: path.join(appRoot, 'src/assets/app-icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(appRoot, 'preload.js'),
      // Necesario para el visor PDF integrado de Chromium (Biblioteca).
      // En Electron moderno solo habilita ese visor: NPAPI/PPAPI ya no existen.
      plugins: true,
      v8CacheOptions: 'code',
      enableBlinkFeatures: 'PreciseMemoryInfo',
      backgroundThrottling: false
    }
  });
  // Sincronizar la referencia con main.js inmediatamente tras crear la ventana
  setMainWindow(mainWindow);
  logTiming('BrowserWindow creado');
  // Diagnostico RDP: las lineas de linea de tiempo del renderer salen tambien en la terminal
  // del proceso main, junto a las del bridge, para ver las dos mitades con el mismo orden.
  mainWindow.webContents.on('console-message', (event, level, message) => {
    const text = typeof message === 'string' ? message : (event && event.message);
    if (typeof text === 'string' && (text.includes('[RDP') || text.includes('[IronRDP'))) {
      console.log(text);
    }
  });
  setupConnectionSearchShortcutBridge(mainWindow);

  // 🛡️ SEGURIDAD: Control de ventanas emergentes en mainWindow (delegar al pop-up interno)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        mainWindow.webContents.send('system:open-browser-popup', { url });
      } catch (e) {
        console.warn('⚠️ [Security] Error delegando ventana emergente:', e?.message);
      }
    }
    return { action: 'deny' };
  });

  // 🛡️ SEGURIDAD: Confinamiento estricto de navegación en mainWindow
  // Solo la carga de la SPA local (dist/index.html o localhost:3000) está permitida en la ventana principal
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!navigationUrl || typeof navigationUrl !== 'string') {
      event.preventDefault();
      return;
    }

    const isLocalDev = navigationUrl.startsWith('http://localhost:3000') || navigationUrl.startsWith('http://127.0.0.1:3000');
    const isAppBundle = navigationUrl.startsWith('file://') && (
      navigationUrl.includes('/dist/index.html') ||
      navigationUrl.includes('\\dist\\index.html') ||
      navigationUrl.includes('/src/index.html') ||
      navigationUrl.includes('\\src\\index.html')
    );

    if (isLocalDev || isAppBundle) {
      return;
    }

    // Bloquear cualquier otra navegación para proteger el renderer privilegiado
    event.preventDefault();
    console.warn('🛡️ [Security] Navegación bloqueada en ventana principal:', navigationUrl);

    // Si es un enlace HTTP/HTTPS, abrir en ventana emergente interna de NodeTerm
    if (navigationUrl.startsWith('http://') || navigationUrl.startsWith('https://')) {
      try {
        mainWindow.webContents.send('system:open-browser-popup', { url: navigationUrl });
      } catch (_) { }
    }
  });

  // 🛡️ SEGURIDAD: Prevenir privilegios peligrosos en webviews incrustados
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInWorker = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    // Forzar same-origin policy aunque el <webview> pida webSecurity=no
    webPreferences.webSecurity = true;
  });

  // Cierre de la ventana principal
  mainWindow.on('close', () => {
    try { saveWindowBounds(getNodeTermDataDir(), mainWindow); } catch (_) { }
    isAppQuitting.value = true;
    app.quit();
  });

  let saveBoundsTimer = null;
  const scheduleSaveBounds = () => {
    if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
    saveBoundsTimer = setTimeout(() => {
      try { saveWindowBounds(getNodeTermDataDir(), mainWindow); } catch (_) { }
    }, 400);
  };
  mainWindow.on('resize', scheduleSaveBounds);
  mainWindow.on('move', scheduleSaveBounds);

  const hasActiveGraphicalSessions = () => {
    if (guacamoleLifecycle.getConnections().size > 0) return true;
    try {
      const rdp = require('../services/RdpNativeBridgeService');
      if (rdp.activeConnections && rdp.activeConnections.size > 0) return true;
    } catch (_) { }
    try {
      const vnc = require('../services/VncNativeBridgeService');
      if (vnc.activeConnections && vnc.activeConnections.size > 0) return true;
    } catch (_) { }
    return false;
  };

  const syncBackgroundThrottling = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const shouldThrottle = mainWindow.isMinimized() && !hasActiveGraphicalSessions();
    try {
      mainWindow.webContents.setBackgroundThrottling(shouldThrottle);
    } catch (_) { }
  };
  mainWindow.on('minimize', syncBackgroundThrottling);
  mainWindow.on('restore', syncBackgroundThrottling);

  // 🛡️ SEGURIDAD GLOBAL: Confinamiento de todos los webContents (incluyendo webviews dinámicos)
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      // 1. Confinar ventanas emergentes iniciadas desde dentro del webview hacia el popup seguro
      contents.setWindowOpenHandler(({ url }) => {
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          try {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('system:open-browser-popup', { url });
            }
          } catch (_) { }
        }
        return { action: 'deny' };
      });

      // 2. Prevenir que un webview navegue a esquemas locales o peligrosos (file://, javascript:, chrome://)
      contents.on('will-navigate', (navEvent, navUrl) => {
        if (!navUrl) return;
        try {
          const parsed = new URL(navUrl);
          const allowed = ['http:', 'https:', 'about:'];
          if (!allowed.includes(parsed.protocol)) {
            navEvent.preventDefault();
            console.warn('🛡️ [Security] Navegación bloqueada en webview (protocolo no permitido):', parsed.protocol);
          }
        } catch {
          navEvent.preventDefault();
        }
      });

      // 3. Prevenir will-redirect a protocolos no permitidos
      contents.on('will-redirect', (redirEvent, redirUrl) => {
        if (!redirUrl) return;
        try {
          const parsed = new URL(redirUrl);
          const allowed = ['http:', 'https:', 'about:'];
          if (!allowed.includes(parsed.protocol)) {
            redirEvent.preventDefault();
            console.warn('🛡️ [Security] Redirección bloqueada en webview (protocolo no permitido):', parsed.protocol);
          }
        } catch {
          redirEvent.preventDefault();
        }
      });
    }
  });

  // 🔒 CRÍTICO: Registrar handlers de seguridad ANTES de que la ventana cargue
  // Esto asegura que security:get-master-key esté disponible cuando el renderer arranque
  try {
    const { registerCriticalHandlers } = require('../handlers');
    registerCriticalHandlers({
      mainWindow,
      getMainWindow: () => mainWindow,
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
      // Platform terminal detection (WSL / Cygwin / Docker)
      WSL,
      Cygwin,
      getDocker,
      // Guacamole dependencies for critical phase registration (no instanciar si esta off)
      getGuacdService,
      peekGuacdService,
      guacamoleServer: guacamoleLifecycle.getServer(),
      guacamoleServerReadyAt: guacamoleLifecycle.getServerReadyAt(),
      sendToRenderer,
      guacdInactivityTimeoutMs: guacamoleLifecycle.getInactivityTimeoutMs(),
      getGuacamoleServer: () => guacamoleLifecycle.getServer(),
      getGuacamoleServerReadyAt: () => guacamoleLifecycle.getServerReadyAt(),
      getOrCreateGuacamoleSecretKey: getOrCreateGuacamoleSecretKey,
      isGuacamoleInitializing: () => guacamoleLifecycle.isInitializing(),
      isGuacamoleInitialized: () => guacamoleLifecycle.isInitialized(),
      getGuacamoleWebSocketPort: () => guacamoleLifecycle.getWebSocketPort(),
      initializeGuacamoleServices,
      stopGuacamoleServices,
      getUpdateService: getUpdateServiceLazy
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

    const distPath = path.join(appRoot, 'dist', 'index.html');
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
      pathname: path.join(appRoot, 'dist', 'index.html'),
      protocol: 'file:',
      slashes: true,
      query: { splash: style }
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
    closeSplash();
    if (mainWindow && !mainWindow.isDestroyed()) {
      const { applyWindowCornersOnStartup } = require('../handlers/window-handlers');
      applyWindowCornersOnStartup(mainWindow);
      if (initialBounds.isMaximized) {
        try { mainWindow.maximize(); } catch (_) { }
      }
      mainWindow.show();
      try { mainWindow.focus(); } catch (_) { }
    }

    // 🚀 OPTIMIZACIÓN: Dejar respirar el hilo principal y el compositor (Wayland/X11)
    // antes de arrancar los servicios secundarios pesados para garantizar interactividad inmediata
    setTimeout(() => {
      initializeServicesAfterShow().catch(err => {
        console.error('❌ [POST-SHOW] Error en initializeServicesAfterShow:', err);
      });
    }, 600);
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
    // Inicializar Guacamole en background solo si está habilitado por el usuario en APPs
    try {
      const isGuacEnabled = await loadGuacamoleEnabled();
      if (isGuacEnabled) {
        console.log('🚀 [POST-SHOW] Guacamole está habilitado. Inicializando servicios...');
        initializeGuacamoleServices().catch((error) => {
          console.error('❌ [POST-SHOW] Error en inicialización de Guacamole:', error);
        });
      }
    } catch (e) {
      console.warn('⚠️ [POST-SHOW] Error comprobando estado de Guacamole:', e);
    }

    // 🚀 OPTIMIZACIÓN: Registrar handlers SECUNDARIOS después de que la ventana sea visible
    // Estos handlers no son críticos para el arranque y pueden esperar
    try {
      const { registerSecondaryHandlers, registerSSHTunnelHandlers } = require('../handlers');

      // Recrear dependencias aquí ya que getHandlerDependencies está en otro scope
      const handlerDependencies = {
        mainWindow,
        getMainWindow: () => mainWindow,
        findSSHConnection,
        disconnectAllGuacamoleConnections,
        getGuacdService,
        peekGuacdService,
        guacamoleServer: guacamoleLifecycle.getServer(),
        guacamoleServerReadyAt: guacamoleLifecycle.getServerReadyAt(),
        sendToRenderer,
        guacdInactivityTimeoutMs: guacamoleLifecycle.getInactivityTimeoutMs(),
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
        getUpdateService: getUpdateServiceLazy,
        getGuacamoleServer: () => guacamoleLifecycle.getServer(),
        getGuacamoleServerReadyAt: () => guacamoleLifecycle.getServerReadyAt(),
        getOrCreateGuacamoleSecretKey: getOrCreateGuacamoleSecretKey,
        isGuacamoleInitializing: () => guacamoleLifecycle.isInitializing(),
        isGuacamoleInitialized: () => guacamoleLifecycle.isInitialized(),
        getGuacamoleWebSocketPort: () => guacamoleLifecycle.getWebSocketPort(),
        initializeGuacamoleServices,
        stopGuacamoleServices
      };

      // Registrar handlers secundarios (System Services, RDP, MCP, Nextcloud, SSH, etc.)
      registerSecondaryHandlers(handlerDependencies);

      // Registrar handlers de túnel SSH (último paso)
      registerSSHTunnelHandlers(handlerDependencies);

      // Iniciar McpApiServer si está habilitado
      try {
        const mcpApiServer = require('../services/McpApiServer');
        mcpApiServer.setDependencies({
          mainWindow,
          getConnectionsFn: null // Se inyecta localmente en _getConnections
        });
        const mcpConfig = mcpApiServer.loadConfig();
        if (mcpConfig.enabled) {
          mcpApiServer.start(mcpConfig.port).catch(err => {
            console.error('❌ [POST-SHOW] Error iniciando MCP API Server:', err.message);
          });
        }
      } catch (mcpErr) {
        console.error('❌ [POST-SHOW] Error configurando MCP API Server:', mcpErr);
      }

      // 🎮 DIAGNÓSTICO GPU ACTIVA (tras renderizar la ventana con hardware acceleration)
      try {
        const gpuFeatures = app.getGPUFeatureStatus();
        console.log('🎮 [NodeTerm GPU Compositor]', {
          canvas_2d: gpuFeatures['2d_canvas'],
          gpu_compositing: gpuFeatures['gpu_compositing'],
          rasterization: gpuFeatures['rasterization'],
          video_decode: gpuFeatures['video_decode'],
          webgl: gpuFeatures['webgl'],
          webgl2: gpuFeatures['webgl2'] || gpuFeatures['webgl']
        });

        if (mainWindow && !mainWindow.isDestroyed()) {
          const rendererGl = await mainWindow.webContents.executeJavaScript(`
            (async () => {
              const cvs = document.createElement('canvas');
              const gl = cvs.getContext('webgl2') || cvs.getContext('webgl');
              let glInfo = null;
              if (gl) {
                const ext = gl.getExtension('WEBGL_debug_renderer_info');
                glInfo = {
                  vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
                  renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
                  webgl2: gl instanceof WebGL2RenderingContext
                };
              }
              let videoDecodeH264 = 'no soportado';
              if (typeof VideoDecoder !== 'undefined' && typeof VideoDecoder.isConfigSupported === 'function') {
                try {
                  const res = await VideoDecoder.isConfigSupported({
                    codec: 'avc1.42001f',
                    hardwareAcceleration: 'prefer-hardware'
                  });
                  videoDecodeH264 = res.supported ? ('soportado (' + res.config.hardwareAcceleration + ')') : 'no';
                } catch (e) {
                  videoDecodeH264 = 'error: ' + e.message;
                }
              }
              return { glInfo, videoDecodeH264 };
            })()
          `).catch(() => null);

          if (rendererGl) {
            console.log('🎮 [NodeTerm GPU Activa]', rendererGl.glInfo || 'Sin WebGL');
            console.log('🎮 [NodeTerm VideoDecoder H.264]', rendererGl.videoDecodeH264);
          }
        }
      } catch (gpuErr) {
        console.warn('🎮 [NodeTerm GPU] Error diagnosticando estado post-show:', gpuErr?.message || gpuErr);
      }
    } catch (error) {
      console.error('❌ [POST-SHOW] Error registrando handlers:', error);
      console.error('❌ Stack:', error.stack);
    }
  }

  // DevTools solo bajo demanda en desarrollo (NODETERM_DEVTOOLS=1); F12 sigue disponible.
  if (process.env.NODE_ENV === 'development' && process.env.NODETERM_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    setMainWindow(null); // Sincronizar la referencia nula con main.js
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

    ipcMain.handle('fs:mkdir-recursive', async (event, dirPath) => {
      try {
        // ✅ VALIDACIÓN CRÍTICA: Validar input antes de procesar
        if (!dirPath || typeof dirPath !== 'string' || dirPath.trim() === '') {
          return { success: false, error: 'path inválido o vacío' };
        }
        const fsp = require('fs').promises;
        await fsp.mkdir(dirPath.trim(), { recursive: true });
        return { success: true };
      } catch (error) {
        return { success: false, error: error?.message || 'Error desconocido al crear directorio' };
      }
    });

    ipcMain.handle('shell:open-path', async (event, openPath) => {
      try {
        // ✅ VALIDACIÓN CRÍTICA: Validar input antes de procesar
        if (!openPath || typeof openPath !== 'string' || openPath.trim() === '') {
          return { success: false, error: 'path inválido o vacío' };
        }
        const { shell } = require('electron');
        await shell.openPath(openPath.trim());
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
      getGuacdService,
      peekGuacdService,
      guacamoleServer: guacamoleLifecycle.getServer(),
      guacamoleServerReadyAt: guacamoleLifecycle.getServerReadyAt(),
      sendToRenderer,
      guacdInactivityTimeoutMs: guacamoleLifecycle.getInactivityTimeoutMs(),
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
      getGuacamoleServer: () => guacamoleLifecycle.getServer(),
      getGuacamoleServerReadyAt: () => guacamoleLifecycle.getServerReadyAt(),
      getGuacamoleWebSocketPort: () => guacamoleLifecycle.getWebSocketPort(),
      getOrCreateGuacamoleSecretKey: getOrCreateGuacamoleSecretKey,
      isGuacamoleInitializing: () => guacamoleLifecycle.isInitializing(),
      isGuacamoleInitialized: () => guacamoleLifecycle.isInitialized()
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

module.exports = { createMainWindow };
