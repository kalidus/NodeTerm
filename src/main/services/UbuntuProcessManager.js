// ============================================
// GESTOR DE PROCESOS UBUNTU/WSL
// Gestiona el ciclo de vida de procesos Ubuntu/WSL
// ============================================

const os = require('os');

let ubuntuProcesses = {};
let isAppQuitting = false;
let mainWindow = null;
let getPtyFn = null;

/**
 * Inicializa el gestor con dependencias
 */
function initialize(dependencies) {
  mainWindow = dependencies.mainWindow;
  getPtyFn = dependencies.getPty;
  isAppQuitting = dependencies.isAppQuitting || false;
}

/**
 * Actualiza el estado de cierre de la aplicación
 */
function setAppQuitting(quitting) {
  isAppQuitting = quitting;
}

/**
 * Inicia una sesión de Ubuntu/WSL
 */
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
    
    ubuntuProcesses[tabId] = getPtyFn().spawn(shell, args, spawnOptions);

    // Handle Ubuntu output
    ubuntuProcesses[tabId].onData((data) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`ubuntu:data:${tabId}`, data);
      }
    });

    // Handle Ubuntu exit
    ubuntuProcesses[tabId].onExit((exitCode, signal) => {
      
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
        // No enviar mensaje de error al frontend para evitar mostrar errores al usuario
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

/**
 * Envía datos al proceso Ubuntu
 */
function writeToUbuntu(tabId, data) {
  if (ubuntuProcesses[tabId]) {
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

/**
 * Redimensiona el terminal Ubuntu
 */
function resizeUbuntu(tabId, { cols, rows }) {
  if (ubuntuProcesses[tabId]) {
    try {
      ubuntuProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing Ubuntu ${tabId}:`, error);
    }
  }
}

/**
 * Detiene un proceso Ubuntu
 */
function stopUbuntu(tabId) {
  if (ubuntuProcesses[tabId]) {
    try {
      const process = ubuntuProcesses[tabId];
      const pid = process.pid;
      
      // Remover listeners antes de terminar el proceso
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
        // En otros sistemas, usar kill() con señales apropiadas
        try {
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
        } catch (killError) {
          // Ignorar errores de kill
        }
      }
      
      delete ubuntuProcesses[tabId];
    } catch (error) {
      console.error(`Error stopping Ubuntu ${tabId}:`, error);
    }
  }
}

/**
 * Limpia todos los procesos Ubuntu
 */
function cleanup() {
  Object.keys(ubuntuProcesses).forEach(tabId => {
    stopUbuntu(tabId);
  });
  ubuntuProcesses = {};
}

/**
 * Obtiene el estado de los procesos
 */
function getProcesses() {
  return Object.keys(ubuntuProcesses);
}

module.exports = {
  initialize,
  setAppQuitting,
  startUbuntuSession,
  writeToUbuntu,
  resizeUbuntu,
  stopUbuntu,
  cleanup,
  getProcesses
};
