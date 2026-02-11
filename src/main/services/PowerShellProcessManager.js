// ============================================
// GESTOR DE PROCESOS POWERSHELL
// Gestiona el ciclo de vida de procesos PowerShell/Terminal
// ============================================

const os = require('os');

let powershellProcesses = {};
let isAppQuitting = { value: false };
let mainWindow = null;
let getPtyFn = null;
let alternativePtyConfig = null;
let SafeWindowsTerminal = null;

/**
 * Inicializa el gestor con dependencias
 */
function initialize(dependencies) {
  mainWindow = dependencies.mainWindow;
  getPtyFn = dependencies.getPty;
  alternativePtyConfig = dependencies.alternativePtyConfig;
  SafeWindowsTerminal = dependencies.SafeWindowsTerminal;
  isAppQuitting = dependencies.isAppQuitting || { value: false };
}

/**
 * Actualiza el estado de cierre de la aplicación
 */
function setAppQuitting(quitting) {
  isAppQuitting.value = quitting;
}

/**
 * Detecta el mejor shell disponible en Unix (Linux/macOS)
 */
function getUnixShell() {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const platform = os.platform();

  // 1. Intentar el shell de la variable de entorno
  if (process.env.SHELL && fs.existsSync(process.env.SHELL)) {
    return process.env.SHELL;
  }

  if (platform === 'darwin') {
    try {
      // 2. Intentar obtener el shell por defecto del usuario en macOS
      const dsclOutput = execSync('dscl . -read "/Users/$(whoami)" UserShell', { encoding: 'utf8' }).trim();
      const userShell = dsclOutput.replace('UserShell: ', '').trim();
      if (userShell && userShell.startsWith('/') && fs.existsSync(userShell)) {
        return userShell;
      }
    } catch (e) {
      // Ignorar error y seguir con fallbacks
    }

    // 3. Fallbacks comunes en macOS
    if (fs.existsSync('/bin/zsh')) return '/bin/zsh';
    if (fs.existsSync('/bin/bash')) return '/bin/bash';
    return '/bin/sh';
  }

  // Linux fallbacks
  const shells = ['/bin/bash', '/bin/zsh', '/usr/bin/zsh', '/usr/bin/bash', '/bin/sh'];
  for (const s of shells) {
    if (fs.existsSync(s)) return s;
  }

  return '/bin/sh'; // Fallback universal
}

/**
 * Inicia una sesión de PowerShell/Terminal
 */
function startPowerShellSession(tabId, { cols, rows }) {
  // No iniciar nuevos procesos si la app está cerrando
  if (isAppQuitting.value) {
    console.log(`Evitando iniciar PowerShell para ${tabId} - aplicación cerrando`);
    return;
  }

  // Verificar que el PTY está inicializado
  if (!getPtyFn) {
    console.warn(`[PowerShellProcessManager] getPtyFn no inicializado para ${tabId}, omitiendo`);
    return;
  }

  try {
    // Verificar si ya hay un proceso activo
    if (powershellProcesses[tabId]) {
      const platform = os.platform();
      const shellName = platform === 'win32' ? 'PowerShell' : 'Terminal';
      console.log(`${shellName} ya existe para ${tabId}, reutilizando proceso existente`);

      return;
    }

    // Determine shell and arguments based on OS
    let shell, args;
    const platform = os.platform();

    if (platform === 'win32') {
      shell = 'powershell.exe';
      args = ['-NoExit'];
    } else if (platform === 'linux' || platform === 'darwin') {
      shell = getUnixShell();
      args = [];
    } else {
      shell = '/bin/sh';
      args = [];
    }

    // Spawn process con configuración limpia
    const spawnOptions = {
      name: 'xterm-256color',
      cols: cols || 120,
      rows: rows || 30,
      cwd: os.homedir(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      }
    };

    // Ajustes por plataforma
    if (platform === 'win32') {
      spawnOptions.windowsHide = false;
      spawnOptions.useConpty = false;
      spawnOptions.conptyLegacy = false;
      spawnOptions.experimentalUseConpty = false;
      spawnOptions.backend = 'winpty';
    } else {
      // En macOS/Linux no queremos windowsHide ni opciones de Conpty
      spawnOptions.env.LANG = process.env.LANG || 'en_US.UTF-8';
      spawnOptions.env.LC_ALL = process.env.LC_ALL || 'en_US.UTF-8';
    }

    // Intentar crear el proceso con manejo de errores robusto
    let spawnSuccess = false;
    let lastError = null;

    const configsToTry = [
      spawnOptions
    ];

    // Solo añadir configuraciones alternativas si están disponibles (principalmente para Windows)
    if (alternativePtyConfig && platform === 'win32') {
      if (alternativePtyConfig.conservative) {
        configsToTry.push({ ...alternativePtyConfig.conservative, cwd: os.homedir() });
      }
      if (alternativePtyConfig.winpty) {
        configsToTry.push({ ...alternativePtyConfig.winpty, cwd: os.homedir() });
      }
      if (alternativePtyConfig.minimal) {
        configsToTry.push({ ...alternativePtyConfig.minimal, cwd: os.homedir() });
      }
    }

    for (let i = 0; i < configsToTry.length && !spawnSuccess; i++) {
      try {
        powershellProcesses[tabId] = getPtyFn().spawn(shell, args, configsToTry[i]);
        spawnSuccess = true;
      } catch (spawnError) {
        lastError = spawnError;
        console.warn(`Configuración ${i + 1} falló para ${tabId}:`, spawnError.message);

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
        } catch (safeError) {
          console.error(`SafeWindowsTerminal también falló para ${tabId}:`, safeError.message);
        }
      }

      if (!spawnSuccess) {
        const platformName = os.platform() === 'win32' ? 'PowerShell' : 'Terminal';
        throw new Error(`No se pudo iniciar ${platformName} para ${tabId} después de probar todas las configuraciones: ${lastError?.message || 'Error desconocido'}`);
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
      } else if (typeof exitCode === 'number') {
        actualExitCode = exitCode;
      } else {
        actualExitCode = 0;
      }

      delete powershellProcesses[tabId];

      const needsRestart = actualExitCode === -1073741510;

      if (needsRestart) {
        console.log(`PowerShell ${tabId} falló con código ${actualExitCode}, reiniciando en 1 segundo...`);
        setTimeout(() => {
          if (!isAppQuitting.value && mainWindow && mainWindow.webContents) {
            console.log(`Reiniciando PowerShell ${tabId} después de fallo...`);
            const originalCols = cols || 120;
            const originalRows = rows || 30;
            startPowerShellSession(tabId, { cols: originalCols, rows: originalRows });
          }
        }, 1000);
      } else {
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
      powershellProcesses[tabId].on('error', (error) => {
        if (error.message && error.message.includes('AttachConsole failed')) {
          console.warn(`Error AttachConsole en PowerShell ${tabId}:`, error.message);
        } else {
          console.error(`Error en proceso PowerShell ${tabId}:`, error);
        }
      });
    }

  } catch (error) {
    console.error(`Error starting PowerShell for tab ${tabId}:`, error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(`powershell:error:${tabId}`, `Failed to start PowerShell: ${error.message}`);
    }
  }
}

/**
 * Envía datos al proceso PowerShell
 */
function writeToPowerShell(tabId, data) {
  if (powershellProcesses[tabId]) {
    try {
      powershellProcesses[tabId].write(data);
    } catch (error) {
      console.error(`Error writing to PowerShell ${tabId}:`, error);
    }
  }
}

/**
 * Redimensiona el terminal PowerShell
 */
function resizePowerShell(tabId, { cols, rows }) {
  if (powershellProcesses[tabId]) {
    try {
      powershellProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing PowerShell ${tabId}:`, error);
    }
  }
}

/**
 * Detiene un proceso PowerShell
 */
function stopPowerShell(tabId) {
  if (powershellProcesses[tabId]) {
    try {
      const process = powershellProcesses[tabId];
      const pid = process.pid;

      process.removeAllListeners();

      // En Windows, usar taskkill directamente para evitar errores de AttachConsole
      if (os.platform() === 'win32') {
        try {
          const { execSync } = require('child_process');
          // Usar taskkill directamente sin llamar a destroy() para evitar
          // el error "AttachConsole failed" de node-pty
          execSync(`taskkill /F /PID ${pid} /T`, {
            stdio: 'ignore',
            windowsHide: true
          });
        } catch (killError) {
          // El proceso probablemente ya terminó
        }
      } else {
        try {
          process.kill();
        } catch (killError) {
          // Ignorar errores de kill
        }
      }

      delete powershellProcesses[tabId];
    } catch (error) {
      console.error(`Error stopping PowerShell ${tabId}:`, error);
    }
  }
}

/**
 * Limpia todos los procesos PowerShell
 */
function cleanup() {
  Object.keys(powershellProcesses).forEach(tabId => {
    stopPowerShell(tabId);
  });
  powershellProcesses = {};
}

/**
 * Obtiene el estado de los procesos
 */
function getProcesses() {
  return Object.keys(powershellProcesses);
}

module.exports = {
  initialize,
  setAppQuitting,
  startPowerShellSession,
  writeToPowerShell,
  resizePowerShell,
  stopPowerShell,
  cleanup,
  getProcesses
};
