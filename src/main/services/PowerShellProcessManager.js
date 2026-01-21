// ============================================
// GESTOR DE PROCESOS POWERSHELL
// Gestiona el ciclo de vida de procesos PowerShell/Terminal
// ============================================

const os = require('os');

let powershellProcesses = {};
let isAppQuitting = false;
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
  isAppQuitting = dependencies.isAppQuitting || false;
}

/**
 * Actualiza el estado de cierre de la aplicación
 */
function setAppQuitting(quitting) {
  isAppQuitting = quitting;
}

/**
 * Detecta el mejor shell disponible en Linux
 */
function getLinuxShell() {
  const { execSync } = require('child_process');
  const shells = ['bash', 'zsh', 'fish', 'sh'];
  
  for (const shell of shells) {
    try {
      execSync(`which ${shell}`, { stdio: 'ignore' });
      return shell;
    } catch (e) {
      // Shell no disponible, probar siguiente
    }
  }
  return 'sh'; // Fallback
}

/**
 * Inicia una sesión de PowerShell/Terminal
 */
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
      shell = 'powershell.exe';
      args = ['-NoExit'];
    } else if (platform === 'linux' || platform === 'darwin') {
      shell = getLinuxShell();
      args = [];
    } else {
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
      spawnOptions.useConpty = false;
      spawnOptions.conptyLegacy = false;
      spawnOptions.experimentalUseConpty = false;
      spawnOptions.backend = 'winpty';
    } else if (os.platform() === 'linux' || os.platform() === 'darwin') {
      spawnOptions.windowsHide = undefined;
      spawnOptions.env = {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        LANG: process.env.LANG || 'en_US.UTF-8',
        LC_ALL: process.env.LC_ALL || 'en_US.UTF-8'
      };
    }
    
    // Intentar crear el proceso con manejo de errores robusto
    let spawnSuccess = false;
    let lastError = null;
    
    const configsToTry = [
      spawnOptions,
      { ...alternativePtyConfig.conservative, cwd: os.homedir() },
      { ...alternativePtyConfig.winpty, cwd: os.homedir() },
      { ...alternativePtyConfig.minimal, cwd: os.homedir() }
    ];
    
    for (let i = 0; i < configsToTry.length && !spawnSuccess; i++) {
      try {
        powershellProcesses[tabId] = getPtyFn().spawn(shell, args, configsToTry[i]);
        spawnSuccess = true;
      } catch (spawnError) {
        lastError = spawnError;
        console.warn(`Configuración ${i + 1} falló para PowerShell ${tabId}:`, spawnError.message);
        
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
          if (!isAppQuitting && mainWindow && mainWindow.webContents) {
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
      powershellProcesses[tabId].kill();
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
