// ============================================
// GESTOR DE PROCESOS WSL DISTRO
// Gestiona el ciclo de vida de procesos de distribuciones WSL
// ============================================
const os = require('os');

let wslDistroProcesses = {};
let isAppQuitting = { value: false };
let mainWindow = null;
let getPtyFn = null;

/**
 * Inicializa el gestor con dependencias
 */
function initialize(dependencies) {
  mainWindow = dependencies.mainWindow;
  getPtyFn = dependencies.getPty;
  isAppQuitting = dependencies.isAppQuitting || { value: false };
}

/**
 * Actualiza el estado de cierre de la aplicación
 */
function setAppQuitting(quitting) {
  isAppQuitting.value = quitting;
}

/**
 * Inicia una sesión de distribución WSL
 */
function startWSLDistroSession(tabId, { cols, rows, distroInfo }) {
  if (isAppQuitting.value) {
    console.log(`Evitando iniciar distribución WSL para ${tabId} - aplicación cerrando`);
    return;
  }

  // Verificar que el PTY está inicializado
  if (!getPtyFn) {
    console.warn(`[WSLDistroProcessManager] getPtyFn no inicializado para ${tabId}, omitiendo`);
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
    const platform = os.platform();

    if (platform === 'win32') {
      // Prefer wsl -d <name> --cd ~ which works much more reliably than the specific executable
      if (distroInfo && distroInfo.name) {
        shell = 'wsl.exe';
        args = ['-d', distroInfo.name, '--cd', '~'];
        console.log(`🎯 Usando wsl.exe -d ${distroInfo.name} para ${distroInfo.label || distroInfo.name}`);
      } else if (distroInfo && distroInfo.executable) {
        // Fallback to specific executable if name is somehow missing
        shell = distroInfo.executable;
        args = [];
        console.log(`🎯 Usando ejecutable específico: ${shell}`);
      } else {
        // Fallback to generic wsl.exe
        shell = 'wsl.exe';
        args = ['--cd', '~'];
        console.log('⚠️ Sin info específica, usando wsl.exe genérico');
      }
    } else {
      // Non-Windows platform (rare for this specific manager)
      shell = '/bin/bash';
      args = ['--login'];
    }

    // Environment variables
    const env = {
      ...process.env,
    };

    // Múltiples configuraciones para mayor compatibilidad con WSL
    const wslConfigurations = [
      // Configuración 1: Por defecto con ConPTY deshabilitado y WinPTY forzado (Misma que Ubuntu)
      {
        name: 'xterm-256color',
        cols: cols || 120,
        rows: rows || 30,
        cwd: os.homedir(),
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        },
        useConpty: false,
        conptyLegacy: false,
        experimentalUseConpty: false,
        backend: 'winpty',
        windowsHide: false
      },
      // Configuración 2: Conservativa
      {
        env,
        cwd: os.homedir(),
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
        wslDistroProcesses[tabId] = getPtyFn().spawn(shell, args, wslConfigurations[i]);
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

      if (!isAppQuitting.value && mainWindow && !mainWindow.isDestroyed()) {
        const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
        mainWindow.webContents.send(`${channelName}:data:${tabId}`, data);
      }
    });

    // Send ready signal AFTER registering onData (consistent with Ubuntu manager)
    if (!isAppQuitting.value && mainWindow && !mainWindow.isDestroyed()) {
      const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
      mainWindow.webContents.send(`${channelName}:ready:${tabId}`);

      // Enviar mensaje de bienvenida para confirmar que el backend está respondiendo
      const welcomeMsg = `\r\n\x1b[36m🚀 Starting ${distroInfo?.label || distroInfo?.name || 'WSL Distribution'}...\x1b[0m\r\n`;
      mainWindow.webContents.send(`${channelName}:data:${tabId}`, welcomeMsg);
    }

    // Handle distribution exit  
    wslDistroProcesses[tabId].onExit((exitCode, signal) => {

      if (isAppQuitting.value) {
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
          if (!isAppQuitting.value && mainWindow && !mainWindow.isDestroyed()) {
            console.log(`Reiniciando WSL ${shell} (${tabId}) después de error de ConPTY...`);
            startWSLDistroSession(tabId, { cols: cols || 80, rows: rows || 24, distroInfo });
          }
        }, 2000);
      } else if (exitCode !== 0 && exitCode !== null) {
        // Silenciar el mensaje de error de proceso cerrado inesperadamente
      }

      // Clean up
      delete wslDistroProcesses[tabId];
    });

  } catch (error) {
    console.error(`Error starting WSL distro session for tab ${tabId}:`, error);
    if (!isAppQuitting.value && mainWindow && !mainWindow.isDestroyed()) {
      const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
      mainWindow.webContents.send(`${channelName}:error:${tabId}`,
        `Failed to start ${distroInfo?.label || 'WSL Distribution'}: ${error.message}`);
    }
  }
}

/**
 * Envía datos al proceso WSL Distro
 */
function writeToWSLDistro(tabId, data) {
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].write(data);
    } catch (error) {
      console.error(`Error writing to WSL distro ${tabId}:`, error);
    }
  }
}

/**
 * Redimensiona el terminal WSL Distro
 */
function resizeWSLDistro(tabId, { cols, rows }) {
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing WSL distro ${tabId}:`, error);
    }
  }
}

/**
 * Detiene un proceso WSL Distro
 */
function stopWSLDistro(tabId) {
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].kill();
      delete wslDistroProcesses[tabId];
    } catch (error) {
      console.error(`Error stopping WSL distro ${tabId}:`, error);
    }
  }
}

/**
 * Limpia todos los procesos WSL Distro
 */
function cleanup() {
  Object.keys(wslDistroProcesses).forEach(tabId => {
    stopWSLDistro(tabId);
  });
  wslDistroProcesses = {};
}

/**
 * Obtiene el estado de los procesos
 */
function getProcesses() {
  return Object.keys(wslDistroProcesses);
}

module.exports = {
  initialize,
  setDependencies: initialize,
  setAppQuitting,
  startWSLDistroSession,
  writeToWSLDistro,
  resizeWSLDistro,
  stopWSLDistro,
  cleanup,
  getProcesses
};
