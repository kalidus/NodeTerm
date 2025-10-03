const os = require('os');
const pty = require('node-pty');

/**
 * Servicio para gestión de PowerShell
 * - Inicio de sesiones PowerShell
 * - Gestión de procesos PowerShell
 * - Handlers para operaciones PowerShell
 */

// Estado de procesos PowerShell
let powershellProcesses = {};

// Referencia a la ventana principal (se establecerá desde main.js)
let mainWindow = null;

// Referencia a configuración alternativa de PTY (se establecerá desde main.js)
let alternativePtyConfig = null;

// Referencia a SafeWindowsTerminal (se establecerá desde main.js)
let SafeWindowsTerminal = null;

// Flag para evitar operaciones durante el cierre
let isAppQuitting = false;

/**
 * Establece las dependencias necesarias para el servicio
 * @param {Object} dependencies - Dependencias del servicio
 * @param {BrowserWindow} dependencies.mainWindow - Ventana principal
 * @param {Object} dependencies.alternativePtyConfig - Configuración alternativa de PTY
 * @param {Function} dependencies.SafeWindowsTerminal - Clase SafeWindowsTerminal
 * @param {boolean} dependencies.isAppQuitting - Flag de cierre de aplicación
 */
function setDependencies({ mainWindow: window, alternativePtyConfig: config, SafeWindowsTerminal: SafeTerminal, isAppQuitting: quitting }) {
  mainWindow = window;
  alternativePtyConfig = config;
  SafeWindowsTerminal = SafeTerminal;
  isAppQuitting = quitting;
}

/**
 * Obtiene el shell de Linux apropiado para el sistema
 * @returns {string} Comando del shell de Linux
 */
function getLinuxShell() {
  const platform = os.platform();
  
  if (platform === 'win32') {
    // En Windows, usar WSL
    return 'wsl.exe';
  } else if (platform === 'darwin') {
    // En macOS, detectar la shell por defecto del sistema
    try {
      const { execSync } = require('child_process');
      const defaultShell = execSync('echo $SHELL', { encoding: 'utf8' }).trim();
      // Extraer solo el nombre del shell sin la ruta completa
      const shellName = defaultShell.split('/').pop();
      console.log(`Shell por defecto detectada en macOS: ${shellName}`);
      return shellName;
    } catch (error) {
      console.warn('No se pudo detectar la shell por defecto, usando zsh como fallback:', error.message);
      return 'zsh'; // zsh es la shell por defecto en macOS moderno
    }
  } else {
    // En Linux, usar bash
    return 'bash';
  }
}

/**
 * Inicia una sesión PowerShell
 * @param {string} tabId - ID de la pestaña
 * @param {Object} options - Opciones de la sesión
 * @param {number} options.cols - Número de columnas
 * @param {number} options.rows - Número de filas
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
      
      // Mensaje de bienvenida silenciado - no mostrar mensaje de sesión reutilizada
      // if (mainWindow && mainWindow.webContents) {
      //   const welcomeMsg = `\r\n\x1b[32m=== Sesión ${shellName} reutilizada ===\x1b[0m\r\n`;
      //   mainWindow.webContents.send(`powershell:data:${tabId}`, welcomeMsg);
      // }
      
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
        powershellProcesses[tabId] = pty.spawn(shell, args, configsToTry[i]);
        spawnSuccess = true;
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
        // Para terminaciones normales, notificar al renderer
        if (mainWindow && mainWindow.webContents) {
          const exitCodeStr = actualExitCode ? actualExitCode.toString() : '0';
          mainWindow.webContents.send(`powershell:exit:${tabId}`, exitCodeStr);
        }
      }
    });
    
    // Agregar manejador de errores del proceso
    if (powershellProcesses[tabId]) {
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
 * Handlers para operaciones PowerShell
 */
const PowerShellHandlers = {
  start: (tabId, { cols, rows }) => startPowerShellSession(tabId, { cols, rows }),
  
  data: (tabId, data) => {
    if (powershellProcesses[tabId]) {
      try {
        powershellProcesses[tabId].write(data);
      } catch (error) {
        console.error(`Error writing to PowerShell ${tabId}:`, error);
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send(`powershell:error:${tabId}`, `Write error: ${error.message}`);
        }
      }
    } else {
      console.warn(`No PowerShell process found for ${tabId}`);
    }
  },
  
  resize: (tabId, { cols, rows }) => {
    if (powershellProcesses[tabId]) {
      try {
        powershellProcesses[tabId].resize(cols, rows);
      } catch (error) {
        console.error(`Error resizing PowerShell ${tabId}:`, error);
      }
    }
  },
  
  stop: (tabId) => {
    if (powershellProcesses[tabId]) {
      try {
        console.log(`Stopping PowerShell process for tab ${tabId}`);
        const process = powershellProcesses[tabId];
        
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
              console.warn(`Error con destroy() en PowerShell ${tabId}:`, destroyError.message);
            }
          }
        } else {
          process.kill();
        }
        
        delete powershellProcesses[tabId];
      } catch (error) {
        console.error(`Error stopping PowerShell ${tabId}:`, error);
      }
    }
  }
};

module.exports = {
  setDependencies,
  getLinuxShell,
  startPowerShellSession,
  PowerShellHandlers,
  powershellProcesses
};
