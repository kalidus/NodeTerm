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
let idleMonitorInterval = null;

// Importar utilidades centralizadas (fuera del try-catch para acceso global)
const { parseDfOutput, parseNetDev, getGuacdPrefPath, sendToRenderer, cleanupOrphanedConnections } = require('./src/main/utils');
logTiming('Utils cargados');

// Importar servicios centralizados (fuera del try-catch para acceso global)
// Nota: Docker se importará después de que se carguen fs y path
let Docker = null;

const {
  getWSL, getPowerShell, getCygwin, getClaude, getOpenCode, getCodexCli, getAntigravityCli, getHermesCli
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
const CodexCli = createServiceProxy(getCodexCli);
const AntigravityCli = createServiceProxy(getAntigravityCli);
const HermesCli = createServiceProxy(getHermesCli);

const { getClaudeConfig } = require('./src/main/handlers/claude-handlers');
const { getOpenCodeConfig } = require('./src/main/handlers/opencode-handlers');
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
  applyHostKeyPolicy,
  isHandshakeOrKexError
} = require('./src/utils/sshConnectOptions');
const sshKnownHostsService = require('./src/main/services/SSHKnownHostsService');
const { connectViaProxyJump } = require('./src/main/services/SSHProxyJumpService');
const { extractMotdBanner } = require('./src/main/utils/ssh-motd');

// Servicio de limpieza de conexiones SSH
const sshCleanupService = require('./src/main/services/SSHConnectionCleanupService');
logTiming('SSHConnectionCleanupService cargado');

// Servicio de buffering de escritura SSH (Wallix)
const sshWriteBufferService = require('./src/main/services/SSHWriteBufferService');
logTiming('SSHWriteBufferService cargado');

// Handler de registro de eventos de pestañas
const { registerTabEvents, isTabRegistered, clearAllRegisteredTabs } = require('./src/main/handlers/tab-events-handler');
logTiming('Tab events handler cargado');

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

const { app, BrowserWindow, ipcMain, clipboard, dialog, Menu, powerMonitor, screen, shell, session, protocol } = require('electron');
logTiming('Electron cargado');

// 📚 Biblioteca: el esquema debe declararse antes de app.ready para que el visor
// pueda usar el lector PDF nativo y <img>/<video> sin cargar el blob en el renderer.
try {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'nodeterm-library',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: false
      }
    }
  ]);
} catch (err) {
  console.error('[MAIN] Error registrando esquema nodeterm-library:', err?.message || err);
}

try {
  require('./src/main/handlers/home-wallpaper-handlers').registerHomeWallpaperHandlers();
} catch (err) {
  console.error('[MAIN] Error registrando home wallpaper handlers:', err?.message || err);
}

function resolveV8MaxOldSpaceMb() {
  const envRaw = process.env.NODETERM_MAX_OLD_SPACE_SIZE;
  if (envRaw) {
    const envMb = parseInt(envRaw, 10);
    if (!Number.isNaN(envMb) && envMb >= 256 && envMb <= 8192) {
      return envMb;
    }
  }
  let totalBytes = 0;
  try {
    totalBytes = require('os').totalmem();
  } catch (_) { }
  const totalGb = totalBytes > 0 ? totalBytes / (1024 * 1024 * 1024) : 8;
  return Math.max(512, Math.min(3072, Math.round(totalGb * 128)));
}

// Establecer el nombre de la aplicación para que el WM_CLASS en Linux
// coincida con el productName de electron-builder ('NodeTerm')
if (app) {
  app.name = 'NodeTerm';
  if (process.platform === 'linux' && typeof app.setDesktopName === 'function') {
    app.setDesktopName('nodeterm.desktop');
  }
  // MEMORIA: tope de heap V8 segun RAM del equipo (main + renderer heredan js-flags).
  // No reserva esa cantidad; evita que un proceso crezca hasta 4 GB en PCs justos.
  const heapMb = resolveV8MaxOldSpaceMb();
  app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${heapMb}`);
  try {
    require('./src/main/services/StatsWorkerService').reapOrphanStatsWorkers();
  } catch (err) {
    console.warn('[MEM] Barrido de workers huérfanos omitido:', err?.message || err);
  }
  try {
    const totalGb = (require('os').totalmem() / (1024 * 1024 * 1024)).toFixed(1);
    console.log(`[MEM] V8 max-old-space-size=${heapMb} MB (RAM ${totalGb} GB)`);
  } catch (_) { }
}

function getTotalRamGb() {
  try {
    return require('os').totalmem() / (1024 * 1024 * 1024);
  } catch (_) {
    return 8;
  }
}

const isLowRamMachine = getTotalRamGb() <= 8;
process.env.NODETERM_IS_LOW_RAM = isLowRamMachine ? '1' : '0';
if (!process.env.NODETERM_DISPLAY_GPU) {
  process.env.NODETERM_DISPLAY_GPU = process.platform === 'linux' ? 'auto' : process.platform;
}

// Configuracion de GPU por plataforma
if (process.argv.includes('--disable-gpu') || process.env.NODETERM_DISABLE_GPU === 'true') {
  app.disableHardwareAcceleration();
} else if (process.platform === 'linux') {
  // Detectar en /sys/class/drm qué GPU gobierna realmente las pantallas conectadas:
  // - En portátil híbrido (AMD/Intel con eDP-1 conectado + NVIDIA secundaria), usar la GPU integrada
  //   dueña del compositor evita copias DMA-BUF inter-GPU por PCIe y parones de sincronización.
  // - En PC de escritorio con monitor conectado a NVIDIA (o portátil en modo MUX/dGPU-only),
  //   detecta 0x10de como GPU titular de la pantalla.
  const detectLinuxDisplayGpu = () => {
    try {
      const fsSync = require('fs');
      const pathSync = require('path');
      const drmDir = '/sys/class/drm';
      if (!fsSync.existsSync(drmDir)) return 'integrated';
      const entries = fsSync.readdirSync(drmDir);
      const connectedVendors = new Set();
      const allCardVendors = new Set();
      for (const entry of entries) {
        if (/^card\d+$/.test(entry)) {
          try {
            const v = fsSync.readFileSync(pathSync.join(drmDir, entry, 'device/vendor'), 'utf8').trim().toLowerCase();
            if (v) allCardVendors.add(v);
          } catch (_) {}
        } else if (/^card\d+-/.test(entry)) {
          try {
            const status = fsSync.readFileSync(pathSync.join(drmDir, entry, 'status'), 'utf8').trim().toLowerCase();
            if (status === 'connected') {
              const cardName = entry.split('-')[0];
              const v = fsSync.readFileSync(pathSync.join(drmDir, cardName, 'device/vendor'), 'utf8').trim().toLowerCase();
              if (v) connectedVendors.add(v);
            }
          } catch (_) {}
        }
      }
      if (connectedVendors.has('0x1002') || connectedVendors.has('0x8086')) return 'integrated';
      if (connectedVendors.has('0x10de')) return 'nvidia';
      if (!allCardVendors.has('0x1002') && !allCardVendors.has('0x8086') && allCardVendors.has('0x10de')) return 'nvidia';
    } catch (_) {}
    return 'integrated';
  };

  const findNvidiaRenderNode = () => {
    try {
      const fsSync = require('fs');
      const pathSync = require('path');
      const drmDir = '/sys/class/drm';
      if (!fsSync.existsSync(drmDir)) return null;
      for (const entry of fsSync.readdirSync(drmDir)) {
        if (/^renderD\d+$/.test(entry)) {
          try {
            const v = fsSync.readFileSync(pathSync.join(drmDir, entry, 'device/vendor'), 'utf8').trim().toLowerCase();
            if (v === '0x10de') {
              return pathSync.join('/dev/dri', entry);
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
    return null;
  };

  const gpuEnvPref = (process.env.NODETERM_GPU || 'auto').trim().toLowerCase();
  const detectedGpu = (gpuEnvPref === 'nvidia' || gpuEnvPref === 'integrated')
    ? gpuEnvPref
    : detectLinuxDisplayGpu();
  const useNvidiaPrime = detectedGpu === 'nvidia';
  const nvidiaRenderNode = useNvidiaPrime ? findNvidiaRenderNode() : null;

  if (useNvidiaPrime) {
    process.env.__NV_PRIME_RENDER_OFFLOAD = process.env.__NV_PRIME_RENDER_OFFLOAD || '1';
    process.env.__GLX_VENDOR_LIBRARY_NAME = process.env.__GLX_VENDOR_LIBRARY_NAME || 'nvidia';
    process.env.__VK_LAYER_NV_optimus = process.env.__VK_LAYER_NV_optimus || 'NVIDIA_only';
    // GBM nativo NVIDIA bajo Wayland (evita fallback genérico / software).
    if (!process.env.GBM_BACKEND) {
      process.env.GBM_BACKEND = 'nvidia-drm';
    }
    try {
      const fsSync = require('fs');
      if (fsSync.existsSync('/usr/lib/dri/nvidia_drv_video.so') || fsSync.existsSync('/usr/lib64/dri/nvidia_drv_video.so')) {
        process.env.LIBVA_DRIVER_NAME = 'nvidia';
        process.env.NVD_BACKEND = 'direct';
      }
    } catch (_) {}
    if (nvidiaRenderNode) {
      console.log(`[GPU] NVIDIA display GPU; render node ${nvidiaRenderNode}; GBM_BACKEND=${process.env.GBM_BACKEND}`);
    } else {
      console.log(`[GPU] NVIDIA display GPU; GBM_BACKEND=${process.env.GBM_BACKEND}`);
    }
  } else {
    // Evitar que variables NVIDIA heredadas del sistema rompan VA-API o fuercen PRIME Offload
    // cuando la pantalla está conectada a la GPU integrada AMD/Intel.
    if (process.env.LIBVA_DRIVER_NAME === 'nvidia') {
      delete process.env.LIBVA_DRIVER_NAME;
    }
    delete process.env.NVD_BACKEND;
    delete process.env.__NV_PRIME_RENDER_OFFLOAD;
    if (process.env.__GLX_VENDOR_LIBRARY_NAME === 'nvidia') {
      delete process.env.__GLX_VENDOR_LIBRARY_NAME;
    }
    delete process.env.__VK_LAYER_NV_optimus;
    if (process.env.GBM_BACKEND === 'nvidia-drm') {
      delete process.env.GBM_BACKEND;
    }
    console.log(`[GPU] Display GPU integrada (${detectedGpu}); env NVIDIA limpiado`);
  }
  // En Linux con drivers propietarios NVIDIA (Arch/CachyOS), el sandbox de Chromium
  // bloquea el acceso a /dev/nvidia* y nvidia-drm_gbm.so, forzando caída a software (inProcessGpu).
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  // Usar Desktop OpenGL en ANGLE para compatibilidad directa con VA-API / ZeroCopyGL (tanto en NVIDIA como en AMD/Intel)
  app.commandLine.appendSwitch('use-angle', 'gl');
  // Desactivar Vulkan y WebGPU en Linux para evitar conflictos de superficie en Wayland
  app.commandLine.appendSwitch('disable-vulkan');
  app.commandLine.appendSwitch('disable-features', 'Vulkan,VulkanFromANGLE,DefaultANGLEVulkan,VulkanDisplay,VulkanSurface,WaylandDataDrag,WebGPU');
  // Desactivar watchdog del GPU process para evitar kills prematuros
  app.commandLine.appendSwitch('disable-gpu-watchdog');
  if (useNvidiaPrime) {
    app.commandLine.appendSwitch('force_high_performance_gpu');
  }
  // Ignorar blocklist de GPU para permitir aceleración completa en OpenGL/Canvas
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  // Rasterización HW / zero-copy con OpenGL de escritorio
  app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('enable-webgl');
  app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('enable-accelerated-video-decode');

  // Explicit sync para AMD/Mesa e NVIDIA (Wayland). Evita tearing/stutter sin forzar X11.
  const linuxFeatures = [
    'CanvasOopRasterization',
    'AcceleratedVideoDecodeLinuxGL',
    'AcceleratedVideoDecodeLinuxZeroCopyGL',
    'VaapiIgnoreDriverChecks',
    'WaylandDrmClientBuffer',
    'WaylandLinuxDrmSyncobj',
    'WaylandSyncobjReleaseTimeline'
  ];
  if (useNvidiaPrime) {
    linuxFeatures.push('VaapiOnNvidiaGPUs');
  } else {
    linuxFeatures.push('VaapiVideoDecodeLinuxGL');
  }
  app.commandLine.appendSwitch('enable-features', linuxFeatures.join(','));

  // Desactivar integración Wayland IME en Linux: evita que el pipeline de texto
  // intercepte, encole o retrase eventos de teclado físicos en elementos canvas.
  app.commandLine.appendSwitch('disable-wayland-ime');

  app.commandLine.appendSwitch('enable-smooth-scrolling');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  // Plataforma gráfica Ozone en Linux:
  // Usar 'auto' (Wayland nativo si está disponible en la sesión) tanto en Intel/AMD como en NVIDIA.
  // En drivers NVIDIA 555+ / 620+ con explicit sync, Wayland nativo elimina el lag de entrada y
  // el judder de ratón/teclado que causaba forzar Xwayland ('x11').
  const ozoneHint = (process.env.NODETERM_OZONE_HINT || 'auto').trim().toLowerCase();
  if (ozoneHint === 'auto' || ozoneHint === 'wayland' || ozoneHint === 'x11') {
    app.commandLine.appendSwitch('ozone-platform-hint', ozoneHint);
  }

  // Diagnóstico para el renderer (preload → window.electron.linuxPerf)
  process.env.NODETERM_DISPLAY_GPU = detectedGpu;
  process.env.NODETERM_IS_LOW_RAM = isLowRamMachine ? '1' : '0';
  process.env.NODETERM_OZONE_HINT_RESOLVED = ozoneHint;
} else {
  // Aceleración GPU completa por hardware (Windows/macOS)
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('enable-webgl');
  app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('enable-accelerated-video-decode');
  app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
  app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization,DirectComposition');
  app.commandLine.appendSwitch('enable-smooth-scrolling');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
}

// Windows: mismo ID que build.appId en prod (barra tras auto-update NSIS); ID distinto en dev
if (process.platform === 'win32') {
  app.setAppUserModelId(app.isPackaged ? 'com.electron.nodeterm' : 'com.electron.nodeterm.dev');
}
if (process.platform === 'linux') {
  app.setDesktopName('nodeterm.desktop');
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
  console.log('⚠️ [MAIN] Configurando entorno de ejecución aislado con claves maestras compartidas...');

  const tempUserData = path.join(app.getPath('temp'), `NodeTerm-Instance-${process.pid}`);

  try {
    // Intentar limpiar directorio temporal previo si existe
    if (fs.existsSync(tempUserData)) {
      try { fs.rmSync(tempUserData, { recursive: true, force: true }); } catch (e) { }
    }
    fs.mkdirSync(tempUserData, { recursive: true });

    // 🔑 CRÍTICO: Sincronizar Local State desde el directorio principal
    // Permite que safeStorage (DPAPI en Windows, Keychain en macOS, Secret Service en Linux)
    // utilice la misma clave de cifrado maestro para descifrar contraseñas, bóvedas y configs.
    const mainDir = getNodeTermDataDir();
    const mainLocalState = path.join(mainDir, 'Local State');
    const tempLocalState = path.join(tempUserData, 'Local State');
    if (fs.existsSync(mainLocalState)) {
      try {
        fs.copyFileSync(mainLocalState, tempLocalState);
        console.log('✅ [MAIN] Local State sincronizado con éxito en instancia secundaria');
      } catch (copyErr) {
        console.warn('⚠️ [MAIN] No se pudo copiar Local State a instancia secundaria:', copyErr.message);
      }
    }

    app.setPath('userData', tempUserData);
    console.log(`✅ [MAIN] UserData redirigido a: ${tempUserData}`);
  } catch (error) {
    console.error('❌ [MAIN] Error configurando UserData temporal:', error);
  }
} else {
  console.log('🔒 [MAIN] Instancia primaria (Lock obtenido)');
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Permitir instancias multi-ventana completamente independientes
    console.log('ℹ️ [MAIN] Otra instancia iniciada de forma independiente.');
  });
}

// Limpieza silenciosa de directorios temporales de instancias anteriores ya finalizadas
try {
  const tempRoot = app.getPath('temp');
  const tempEntries = fs.readdirSync(tempRoot);
  for (const entry of tempEntries) {
    if (entry.startsWith('NodeTerm-Instance-') && entry !== `NodeTerm-Instance-${process.pid}`) {
      const pidStr = entry.replace('NodeTerm-Instance-', '');
      const pid = parseInt(pidStr, 10);
      let isAlive = false;
      if (!isNaN(pid) && pid > 0) {
        try {
          process.kill(pid, 0);
          isAlive = true;
        } catch (_) {
          isAlive = false;
        }
      }
      if (!isAlive) {
        try {
          fs.rmSync(path.join(tempRoot, entry), { recursive: true, force: true });
        } catch (_) { }
      }
    }
  }
} catch (_) { }
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

function peekGuacdService() {
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

    // Ctrl/Cmd+Shift+M → toggle modo minimalista (evita Ctrl+Alt/AltGr en teclados ES/EU)
    if (
      input.type === 'keyDown'
      && input.code === 'KeyM'
      && !!input.shift
      && !input.alt
      && ((process.platform === 'darwin' && !!input.meta && !input.control)
        || (process.platform !== 'darwin' && !!input.control && !input.meta))
    ) {
      event.preventDefault();
      windowInstance.webContents.send('minimal-mode:toggle');
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
const { createSshStatsSession } = require('./src/main/services/ssh-stats-session');
const sshStatsSession = createSshStatsSession({
  sshConnections,
  getMainWindow: () => mainWindow,
  sshStatsService
});
const findSSHConnection = sshStatsSession.findSSHConnection;
const statsLoop = sshStatsSession.statsLoop;
sshStatsSession.register(ipcMain);
// Estado persistente para stats de bastión (CPU, red, etc.) por tabId
const bastionStatsState = {};

// Pool de conexiones SSH compartidas para evitar múltiples conexiones al mismo servidor
const sshConnectionPool = {};
// Caché de mensajes de bienvenida (MOTD) por cacheKey para conexiones multiplexadas
const motdCache = {};

// 🚀 OPTIMIZACIÓN: RDP Manager movido a src/main/handlers/rdp-handlers.js
// Se maneja completamente con lazy loading en ese módulo

// Ciclo de vida de Guacamole (clave, init, stop, disconnect) en guacamole-lifecycle.js
const { createGuacamoleLifecycle } = require('./src/main/services/guacamole-lifecycle');
const guacamoleLifecycle = createGuacamoleLifecycle({
  getGuacdService,
  peekGuacdService,
  getGuacamoleLite,
  ensureGuacdClientPatched
});
const getOrCreateGuacamoleSecretKey = () => guacamoleLifecycle.getOrCreateSecretKey();
const initializeGuacamoleServices = () => guacamoleLifecycle.initialize();
const stopGuacamoleServices = () => guacamoleLifecycle.stop();
const disconnectAllGuacamoleConnections = () => guacamoleLifecycle.disconnectAll();

// Sistema de throttling para conexiones SSH (ahora en módulo separado)
const connectionThrottle = require('./src/main/utils/connection-throttle');

// 🚀 OPTIMIZACIÓN: Limpieza automática diferida - se inicia después de ready-to-show
const ConnectionPoolCleaner = require('./src/main/services/ConnectionPoolCleaner');

// Helper function to parse 'df -P' command output
// Funciones de parsing movidas a main/utils/parsing-utils.js

// === Preferencias Guacd (persistencia en userData) ===
// Funciones movidas a src/main/utils/file-utils.js
const {
  loadPreferredGuacdMethod,
  savePreferredGuacdMethod,
  loadGuacdInactivityTimeout,
  saveGuacdInactivityTimeout,
  loadGuacamoleEnabled,
  saveGuacamoleEnabled
} = require('./src/main/utils/file-utils');

// Handlers de Guacamole movidos a src/main/handlers/guacamole-handlers.js

// Splash HTML y creación de ventana principal movidos a módulo separado
const { createMainWindow } = require('./src/main/window/create-main-window');
// Process managers WSL/Ubuntu (antes de createWindow para deps estables)
const WSLDistroProcessManager = require('./src/main/services/WSLDistroProcessManager');
const UbuntuProcessManager = require('./src/main/services/UbuntuProcessManager');

function createWindow() {
  createMainWindow({
    getMainWindow: () => mainWindow,
    setMainWindow: (w) => { mainWindow = w; },
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
    appRoot: __dirname,
  });
}

// Funciones de WSL movidas a main/services/WSLService.js

// ✅ OPTIMIZACIÓN: Manejadores MCP movidos a mcp-handlers.js
// Se registran automáticamente desde registerSecondaryHandlers() en handlers/index.js
// NO es necesario registrarlos aquí para evitar duplicados

// detect-wsl / cygwin:* / docker:list viven en
// src/main/handlers/platform-terminal-handlers.js (registerCriticalHandlers)

app.on('child-process-gone', (_event, details) => {
  if (details.type === 'GPU') {
    console.error('❌ [GPU PROCESS CRASHED]', details);
  }
});

app.on('ready', () => {
  logTiming('app ready event');

  // 🛡️ SEGURIDAD: Content Security Policy (CSP) en session.defaultSession
  if (session && session.defaultSession) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      // Aplicar CSP a la ventana principal y marcos internos
      if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
        const isInternal = details.url.startsWith('file:') || details.url.startsWith('http://localhost') || details.url.startsWith('http://127.0.0.1');
        if (isInternal) {
          callback({
            responseHeaders: {
              ...details.responseHeaders,
              'Content-Security-Policy': [
                "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: nodeterm-library:; media-src 'self' blob: data: nodeterm-library:; connect-src 'self' ws: wss: http: https: blob: data: nodeterm-library:; worker-src 'self' blob:; frame-src 'self' nodeterm-library:; object-src 'none'; base-uri 'self';"
              ]
            }
          });
          return;
        }
      }
      callback({ responseHeaders: details.responseHeaders });
    });
  }

  sshKnownHostsService.setUserDataPath(getNodeTermDataDir());

  try {
    require('./src/main/utils/library-protocol').registerLibraryProtocol();
    logTiming('Protocolo nodeterm-library registrado');
  } catch (err) {
    console.error('❌ Error registrando protocolo de biblioteca:', err?.message || err);
  }

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

  try {
    const StatsWorkerService = require('./src/main/services/StatsWorkerService');
    StatsWorkerService.pauseStatsWorker();
  } catch (_) { }

  // Notificar al renderer que el sistema se va a suspender
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('system:suspend');
  }
});

powerMonitor.on('resume', async () => {
  const suspendDuration = systemSuspendedAt ? Math.round((Date.now() - systemSuspendedAt) / 1000) : 0;
  console.log(`☀️ [PowerMonitor] Sistema reanudado después de ${suspendDuration}s de suspensión`);
  systemSuspendedAt = null;

  try {
    const StatsWorkerService = require('./src/main/services/StatsWorkerService');
    StatsWorkerService.resumeStatsWorker();
  } catch (_) { }

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

  try {
    const StatsWorkerService = require('./src/main/services/StatsWorkerService');
    StatsWorkerService.pauseStatsWorker();
  } catch (_) { }

  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('system:lock-screen');
  }
});

powerMonitor.on('unlock-screen', async () => {
  console.log('🔓 [PowerMonitor] Pantalla desbloqueada');

  try {
    const StatsWorkerService = require('./src/main/services/StatsWorkerService');
    StatsWorkerService.resumeStatsWorker();
  } catch (_) { }

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

idleMonitorInterval = setInterval(() => {
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

// Registrar handlers IPC de conexión SSH activa (módulo separado)
const { registerSshConnectSession } = require('./src/main/services/ssh-connect-session');
registerSshConnectSession({
  sshConnections,
  sshConnectionPool,
  motdCache,
  bastionStatsState,
  sendToRenderer,
  connectionThrottle,
  getBastionForwardingWarning,
  appendForwardingFlagsToCacheKey,
  getSessionRecorder,
  getSSH2Promise,
  getSSH2Client,
  statsLoop,
});

// Hibernación de UI SSH: ring de stdout en main mientras xterm está desmontado
const { terminalStdoutRingBuffer } = require('./src/main/services/TerminalStdoutRingBuffer');
const { terminalIpcBatcher } = require('./src/main/services/TerminalIpcBatcher');

ipcMain.on('terminal:set-hibernated', (event, { tabId, hibernated } = {}) => {
  if (!tabId) return;
  if (hibernated) {
    terminalIpcBatcher.divertPendingToRing(`ssh:data:${tabId}`, tabId);
    terminalStdoutRingBuffer.setHibernating(tabId, true);
  } else {
    terminalStdoutRingBuffer.setHibernating(tabId, false);
  }
});

ipcMain.handle('terminal:drain-stdout-ring', async (event, tabId) => {
  if (!tabId) return '';
  // divertPendingToRing por si quedan bytes en el batcher al despertar
  try {
    terminalIpcBatcher.divertPendingToRing(`ssh:data:${tabId}`, tabId);
  } catch (_) { /* noop */ }
  return terminalStdoutRingBuffer.drain(tabId) || '';
});

// Modo contraseña: el renderer avisa para omitir recordInput (la escritura al PTY sigue).
ipcMain.on('terminal:secret-entry', (event, { tabId, active } = {}) => {
  try {
    const { setSecretEntry } = require('./src/main/services/SecretEntryState');
    setSecretEntry(tabId, !!active);
  } catch (_) { /* noop */ }
});

// Backpressure SSH: el renderer pide pause/resume del shellStream (también bastion/Wallix).
// No toca SSHWriteBufferService (batching de teclado).
ipcMain.on('terminal:flow', (event, { tabId, paused } = {}) => {
  if (!tabId) return;
  const conn = sshConnections[tabId];
  const stream = conn && conn.stream;
  if (!stream || stream.destroyed) return;
  try {
    if (paused) {
      if (typeof stream.pause === 'function') stream.pause();
    } else if (typeof stream.resume === 'function') {
      stream.resume();
    }
  } catch (_) { /* noop */ }
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
    stopTasks.push(execAsync(`${dockerPrefix} stop ${name}`, { stdio: 'ignore', timeout: 1500 }).catch(() => null));
  }

  await Promise.all(stopTasks);
}

function requestGracefulQuit(signal) {
  if (isAppQuitting.value || appCleanupInProgress || appCleanupCompleted) return;
  console.log(`[quit] Señal ${signal}, cierre ordenado`);
  try { app.quit(); } catch (_) { }
}

process.on('SIGTERM', () => requestGracefulQuit('SIGTERM'));
process.on('SIGINT', () => requestGracefulQuit('SIGINT'));

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

  // Safeguard: Forzar salida limpia tras 1.5 segundos si alguna tarea asíncrona no responde
  const forceExitTimeout = setTimeout(() => {
    console.warn('[quit] Forzando salida de la aplicación tras timeout de limpieza.');
    try { app.exit(0); } catch (_) { }
    try { process.exit(0); } catch (_) { }
  }, 1500);

  try {
    // ✅ CRÍTICO: Matar el worker de stats primero — es un proceso hijo fork()
    // que se queda huérfano si no se mata explícitamente, impidiendo que concurrently
    // detecte el cierre de electron y devuelva el prompt de la terminal
    const { stopStatsWorker } = require('./src/main/services/StatsWorkerService');
    stopStatsWorker();
  } catch (e) { }

  try {
    if (idleMonitorInterval) {
      clearInterval(idleMonitorInterval);
      idleMonitorInterval = null;
    }
    try {
      const ConnectionPoolCleaner = require('./src/main/services/ConnectionPoolCleaner');
      ConnectionPoolCleaner.stopOrphanCleanup();
    } catch (e) { }
    try {
      clearAllRegisteredTabs();
    } catch (e) { }

    try {
      await Promise.race([
        stopAiClientDockerContainersOnQuit(),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
    } catch (e) {
      console.error('[quit] Error deteniendo contenedores Docker de clientes IA:', e?.message || e);
    }

    // ✅ REFACTORIZADO: Limpiar todas las conexiones SSH con SSHConnectionCleanupService
    try {
      sshCleanupService.cleanupAllConnections(sshConnections);
    } catch (e) { }

    // Limpiar también el pool de conexiones con mejor limpieza
    Object.values(sshConnectionPool).forEach(poolConn => {
      try {
        poolConn.removeAllListeners('error');
        poolConn.removeAllListeners('close');
        poolConn.removeAllListeners('end');
        if (poolConn.ssh) {
          poolConn.ssh.removeAllListeners('error');
          poolConn.ssh.removeAllListeners('close');
          poolConn.ssh.removeAllListeners('end');
        }
        poolConn.close();
      } catch (e) { }
    });

    // Cleanup SSH tunnels
    try {
      await Promise.race([
        cleanupTunnels(),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
    } catch (error) {
      console.error('Error cleaning up SSH tunnels:', error);
    }

    // Cleanup Cygwin processes
    if (Cygwin && Cygwin.CygwinHandlers) {
      try { Cygwin.CygwinHandlers.cleanup(); } catch (error) { }
    }

    // Cleanup Docker processes
    const docker = getDocker();
    if (docker && docker.DockerHandlers) {
      try { docker.DockerHandlers.cleanup(); } catch (error) { }
    }

    // Cleanup Terminal processes
    try { PowerShell.cleanup(); } catch (e) { }
    try { UbuntuProcessManager.cleanup(); } catch (e) { }
    try { Claude.cleanup(); } catch (e) { }
    try { OpenCode.cleanup(); } catch (e) { }
    try { CodexCli.cleanup(); } catch (e) { }
    try { AntigravityCli.cleanup(); } catch (e) { }
    try { HermesCli.cleanup(); } catch (e) { }

    // Cleanup RDP and Guacamole
    try {
      const { getRdpHandlers } = require('./src/main/handlers');
      getRdpHandlers().cleanupRdpConnections();
    } catch (e) { }

    try {
      if (typeof _guacdService !== 'undefined' && _guacdService) {
        await Promise.race([
          getGuacdService().stop(),
          new Promise(resolve => setTimeout(resolve, 500))
        ]);
      }
    } catch (e) { }

    // Cleanup MCP API Server
    try {
      const mcpApiServer = require('./src/main/services/McpApiServer');
      mcpApiServer.stop();
    } catch (e) { }

  } catch (err) {
    console.error('[quit] Error en limpieza before-quit:', err);
  } finally {
    clearTimeout(forceExitTimeout);
    appCleanupCompleted = true;
    appCleanupInProgress = false;

    // Limpieza de directorio temporal si es instancia secundaria
    if (process.env.NODETERM_IS_SECONDARY_INSTANCE === 'true') {
      try {
        const currentTempUserData = path.join(app.getPath('temp'), `NodeTerm-Instance-${process.pid}`);
        if (fs.existsSync(currentTempUserData)) {
          try { fs.rmSync(currentTempUserData, { recursive: true, force: true }); } catch (_) { }
        }
      } catch (_) { }
    }

    console.log('[quit] Ejecutando exit final...');

    try {
      if (process.stdout && typeof process.stdout.destroy === 'function') process.stdout.destroy();
      if (process.stderr && typeof process.stderr.destroy === 'function') process.stderr.destroy();
    } catch (_) { }

    try { app.exit(0); } catch (_) { }
    try { process.exit(0); } catch (_) { }
  }
});

// Handlers del sistema (clipboard, dialog, import) movidos a main/handlers/system-handlers.js

// Function to safely send to mainWindow
// Funciones sendToRenderer y cleanupOrphanedConnections movidas a main/utils/connection-utils.js

// Limpieza SSH: solo ConnectionPoolCleaner (system-services-handlers). No duplicar el intervalo aqui.
// findSSHConnection, statsLoop y el IPC de sondeo viven en src/main/services/ssh-stats-session.js

// window:minimize|maximize|unmaximize|isMaximized|close|set-corners
// y applyWindowCorners* viven en src/main/handlers/window-handlers.js

// updater:* vive en src/main/handlers/updater-handlers.js (registerCriticalHandlers)

// === RDP Support ===
// ✅ OPTIMIZACIÓN: Handlers de RDP movidos a src/main/handlers/rdp-handlers.js
// Se registran automáticamente desde registerSecondaryHandlers() en handlers/index.js

// === Guacamole Support ===
// Handlers de Guacamole movidos a src/main/handlers/guacamole-handlers.js

// Handlers de Guacamole movidos a src/main/handlers/guacamole-handlers.js

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

// Start PowerShell session with specific tab ID - Global listener with auto-registration
ipcMain.on(/^powershell:start:(.+)$/, (event, { cols, rows }) => {
  const channel = event.senderFrame ? event.channel : arguments[1];
  const tabId = channel.split(':')[2];

  // ✅ REFACTORIZADO: Registrar eventos para este tab si no estan registrados
  if (!isTabRegistered(tabId)) {
    registerTabEventsWrapper(tabId);
  }

  PowerShell.PowerShellHandlers.start(tabId, { cols, rows });
});

// === WSL Terminal Support ===
// Canales bare wsl:* / powershell:start (sin tabId) eliminados: la UI usa *:${tabId}

// Función handleWSLResize movida a src/main/services/WSLService.js

// Función handleWSLStop movida a src/main/services/WSLService.js

// === WSL Distributions Terminal Support ===
function startWSLDistroSession(tabId, { cols, rows, distroInfo }) {
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

function startUbuntuSession(tabId, { cols, rows, ubuntuInfo }) {
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

function handleWSLDistroData(tabId, data) {
  WSLDistroProcessManager.writeToWSLDistro(tabId, data);
}

function handleUbuntuData(tabId, data) {
  UbuntuProcessManager.writeToUbuntu(tabId, data);
}

function handleWSLDistroResize(tabId, { cols, rows }) {
  WSLDistroProcessManager.resizeWSLDistro(tabId, { cols, rows });
}

function handleUbuntuResize(tabId, { cols, rows }) {
  UbuntuProcessManager.resizeUbuntu(tabId, { cols, rows });
}

function handleWSLDistroStop(tabId) {
  WSLDistroProcessManager.stopWSLDistro(tabId);
}

function handleUbuntuStop(tabId) {
  UbuntuProcessManager.stopUbuntu(tabId);
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

// Dynamic tab registration handled by tab-events-handler.js

// ✅ OPTIMIZACIÓN: getSystemStats() eliminada - ahora usa StatsWorkerService exclusivamente

// 🚀 OPTIMIZACIÓN: Servicios del sistema diferidos
// Estos servicios y sus handlers se registran en system-services-handlers.js
// Se inicializan después de ready-to-show para no bloquear el arranque

// ✅ OPTIMIZACIÓN: Manejadores de Nextcloud movidos a nextcloud-handlers.js
// Se registran automáticamente desde registerSecondaryHandlers() en handlers/index.js
// NO es necesario registrarlos aquí para evitar ejecución prematura
// Restart attempt

// Domain fix attempt
