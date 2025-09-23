const { exec, spawn } = require('child_process');
const os = require('os');
const pty = require('node-pty');

/**
 * Servicio para gestión de WSL (Windows Subsystem for Linux)
 * - Detección de distribuciones WSL
 * - Gestión de sesiones WSL
 * - Handlers para operaciones WSL
 */

// Estado de procesos WSL
let wslProcesses = {};
let wslDistroProcesses = {};
let ubuntuProcesses = {};

// Referencia a la ventana principal (se establecerá desde main.js)
let mainWindow = null;

/**
 * Establece la referencia a la ventana principal
 * @param {BrowserWindow} window - Ventana principal de Electron
 */
function setMainWindow(window) {
  mainWindow = window;
}

/**
 * Detecta todas las distribuciones WSL disponibles en el sistema
 * @returns {Promise<Array>} Array de distribuciones WSL disponibles
 */
async function detectAllWSLDistributions() {
  return new Promise((resolve) => {
    const availableDistributions = [];
    
    // Helper para mapear nombre de distro a metadata
    const mapDistro = (rawName) => {
      const name = rawName.replace('*', '').trim();
      const lower = name.toLowerCase();
      
      // Ubuntu con versión (incluye subversiones como 24.04.1)
      const ubuntuMatch = name.match(/^Ubuntu-([0-9]{2})\.([0-9]{2})(?:\.[0-9]+)?$/i);
      if (ubuntuMatch) {
        const major = ubuntuMatch[1];
        const minor = ubuntuMatch[2];
        const exe = `ubuntu${major}${minor}.exe`;
        return { executable: exe, label: name.replace('-', ' '), icon: 'pi pi-circle', category: 'ubuntu' };
      }
      // Ubuntu genérico
      if (lower === 'ubuntu') {
        return { executable: 'ubuntu.exe', label: 'Ubuntu', icon: 'pi pi-circle', category: 'ubuntu' };
      }
      // Otras familias
      if (lower.includes('debian')) {
        return { executable: 'debian.exe', label: name.includes('-') ? name.replace('-', ' ') : 'Debian', icon: 'pi pi-server', category: 'debian' };
      }
      if (lower.includes('kali')) {
        return { executable: 'kali.exe', label: 'Kali Linux', icon: 'pi pi-shield', category: 'kali' };
      }
      if (lower.includes('alpine')) {
        return { executable: 'alpine.exe', label: 'Alpine Linux', icon: 'pi pi-cloud', category: 'alpine' };
      }
      if (lower.includes('opensuse')) {
        return { executable: 'opensuse-15.exe', label: name.replace('-', ' '), icon: 'pi pi-cog', category: 'opensuse' };
      }
      if (lower.includes('fedora')) {
        return { executable: 'fedora.exe', label: 'Fedora', icon: 'pi pi-bookmark', category: 'fedora' };
      }
      if (lower.includes('oraclelinux') || lower.includes('oracle')) {
        return { executable: 'oraclelinux.exe', label: name.replace('_', ' '), icon: 'pi pi-database', category: 'oracle' };
      }
      if (lower.includes('centos')) {
        return { executable: 'centos7.exe', label: name, icon: 'pi pi-server', category: 'centos' };
      }
      // Genérico
      return { executable: 'wsl.exe', label: name, icon: 'pi pi-desktop', category: 'generic' };
    };
    
    // Mapeo de distribuciones WSL a sus ejecutables y metadata
    const distroMapping = {
      // Ubuntu
      'Ubuntu': { executable: 'ubuntu.exe', label: 'Ubuntu', icon: 'pi pi-circle', category: 'ubuntu' },
      'Ubuntu-20.04': { executable: 'ubuntu2004.exe', label: 'Ubuntu 20.04 LTS', icon: 'pi pi-circle', category: 'ubuntu' },
      'Ubuntu-22.04': { executable: 'ubuntu2204.exe', label: 'Ubuntu 22.04 LTS', icon: 'pi pi-circle', category: 'ubuntu' },
      'Ubuntu-24.04': { executable: 'ubuntu2404.exe', label: 'Ubuntu 24.04 LTS', icon: 'pi pi-circle', category: 'ubuntu' },
      
      // Debian
      'Debian': { executable: 'debian.exe', label: 'Debian', icon: 'pi pi-server', category: 'debian' },
      
      // Kali Linux
      'kali-linux': { executable: 'kali.exe', label: 'Kali Linux', icon: 'pi pi-shield', category: 'kali' },
      'Kali': { executable: 'kali.exe', label: 'Kali Linux', icon: 'pi pi-shield', category: 'kali' },
      
      // Alpine
      'Alpine': { executable: 'alpine.exe', label: 'Alpine Linux', icon: 'pi pi-cloud', category: 'alpine' },
      
      // openSUSE
      'openSUSE-Leap-15.1': { executable: 'opensuse-15.exe', label: 'openSUSE Leap 15.1', icon: 'pi pi-cog', category: 'opensuse' },
      'openSUSE-Leap-15.2': { executable: 'opensuse-15.exe', label: 'openSUSE Leap 15.2', icon: 'pi pi-cog', category: 'opensuse' },
      'openSUSE-Leap-15.3': { executable: 'opensuse-15.exe', label: 'openSUSE Leap 15.3', icon: 'pi pi-cog', category: 'opensuse' },
      'openSUSE-Leap-15.4': { executable: 'opensuse-15.exe', label: 'openSUSE Leap 15.4', icon: 'pi pi-cog', category: 'opensuse' },
      'openSUSE-Tumbleweed': { executable: 'opensuse-tumbleweed.exe', label: 'openSUSE Tumbleweed', icon: 'pi pi-cog', category: 'opensuse' },
      
      // Fedora
      'Fedora': { executable: 'fedora.exe', label: 'Fedora', icon: 'pi pi-bookmark', category: 'fedora' },
      
      // Oracle Linux
      'OracleLinux_7_9': { executable: 'oraclelinux.exe', label: 'Oracle Linux 7.9', icon: 'pi pi-database', category: 'oracle' },
      'OracleLinux_8_7': { executable: 'oraclelinux.exe', label: 'Oracle Linux 8.7', icon: 'pi pi-database', category: 'oracle' },
      
      // CentOS
      'CentOS7': { executable: 'centos7.exe', label: 'CentOS 7', icon: 'pi pi-server', category: 'centos' },
      'CentOS8': { executable: 'centos8.exe', label: 'CentOS 8', icon: 'pi pi-server', category: 'centos' }
    };
    
    // 1) Enumeración primaria: nombres puros sin cabeceras
    exec('wsl.exe -l -q', { timeout: 5000, windowsHide: true }, (listError, listStdout) => {
      if (!listError && listStdout) {
        const cleaned = listStdout.replace(/\u0000/g, '');
        cleaned.split('\n').forEach((line) => {
          const name = line.trim();
          const lower = name.toLowerCase();
          if (!name) return;
          if (lower.includes('docker')) return; // excluir docker-desktop & data
          const info = mapDistro(name);
          availableDistributions.push({
            name,
            executable: info.executable,
            label: info.label,
            icon: info.icon,
            category: info.category,
            version: name.includes('-') ? name.split('-')[1] : 'latest'
          });
        });
      }

      // 2) Fallback: salida verbosa para entornos antiguos/localizados si no se detectó nada
      if (availableDistributions.length === 0) {
        exec('wsl --list --verbose', { timeout: 5000, windowsHide: true }, (error, stdout) => {
          if (!error && stdout) {
            const cleanedOutput = stdout.replace(/\u0000/g, '');
            const lines = cleanedOutput.split('\n');
            lines.forEach((line) => {
              const trimmed = line.trim();
              const lower = trimmed.toLowerCase();
              const isHeader = lower.includes('name') || lower.includes('state') || lower.includes('nombre') || lower.includes('estado');
              if (!trimmed || isHeader || lower.includes('docker')) return;
              const tokens = trimmed.split(/\s+/);
              if (tokens.length === 0) return;
              const distroName = tokens[0].replace('*', '').trim();
              if (!distroName || distroName === 'NAME') return;
              const info = mapDistro(distroName);
              availableDistributions.push({
                name: distroName,
                executable: info.executable,
                label: info.label,
                icon: info.icon,
                category: info.category,
                version: distroName.includes('-') ? distroName.split('-')[1] : 'latest'
              });
            });
          }

          // 3) Último fallback: ubuntu.exe si nada se detectó
          if (availableDistributions.length === 0) {
            exec('ubuntu.exe --help', { timeout: 2000, windowsHide: true }, (ubuntuError) => {
              if (!ubuntuError || ubuntuError.code !== 'ENOENT') {
                availableDistributions.push({
                  name: 'Ubuntu',
                  executable: 'ubuntu.exe',
                  label: 'Ubuntu',
                  icon: 'pi pi-circle',
                  category: 'ubuntu',
                  version: 'latest'
                });
              }
              resolve(availableDistributions);
            });
          } else {
            resolve(availableDistributions);
          }
        });
      } else {
        resolve(availableDistributions);
      }
    });
  });
}

/**
 * Detecta la disponibilidad de Ubuntu en el sistema
 * @returns {Promise<boolean>} true si Ubuntu está disponible
 */
function detectUbuntuAvailability() {
  return new Promise((resolve) => {
    const platform = os.platform();
    // Detectando Ubuntu
    
    if (platform !== 'win32') {
      // En sistemas no Windows, verificar si bash está disponible
      const bashCheck = spawn('bash', ['--version'], { stdio: 'pipe' });
      
      bashCheck.on('close', (code) => {
        console.log('🐧 Bash check completed with code:', code);
        resolve(code === 0);
      });
      
      bashCheck.on('error', (error) => {
        console.log('❌ Bash check error:', error.message);
        resolve(false);
      });
      
      // Timeout de 2 segundos
      setTimeout(() => {
        console.log('⏰ Bash check timeout');
        bashCheck.kill();
        resolve(false);
      }, 2000);
    } else {
      // En Windows, verificar si ubuntu está disponible
      // Verificando ubuntu en Windows
      const ubuntuCheck = spawn('ubuntu.exe', ['--help'], { stdio: 'pipe' });
      
      ubuntuCheck.on('close', (code) => {
        console.log('🐧 Ubuntu check completed with code:', code);
        resolve(code === 0);
      });
      
      ubuntuCheck.on('error', (error) => {
        console.log('❌ Ubuntu check error:', error.message);
        resolve(false);
      });
      
      // Timeout de 2 segundos
      setTimeout(() => {
        console.log('⏰ Ubuntu check timeout');
        ubuntuCheck.kill();
        resolve(false);
      }, 2000);
    }
  });
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
    // En macOS, usar bash
    return 'bash';
  } else {
    // En Linux, usar bash
    return 'bash';
  }
}

/**
 * Inicia una sesión WSL
 * @param {string} tabId - ID de la pestaña
 * @param {Object} options - Opciones de la sesión
 * @param {number} options.cols - Número de columnas
 * @param {number} options.rows - Número de filas
 */
function startWSLSession(tabId, { cols, rows }) {
  try {
    const shell = getLinuxShell();
    const platform = os.platform();
    
    // Determinar argumentos según la plataforma
    let args = [];
    if (platform === 'win32' && shell === 'wsl.exe') {
      args = ['--cd', '~']; // Iniciar en el directorio home de WSL
    }
    
    wslProcesses[tabId] = pty.spawn(shell, args, {
      name: 'xterm-color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: undefined, // Dejar que WSL use su propio directorio home
      env: process.env
    });

    wslProcesses[tabId].on('data', (data) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`wsl:data:${tabId}`, data);
      }
    });

    wslProcesses[tabId].on('exit', (exitCode) => {
      if (mainWindow && mainWindow.webContents) {
        const exitCodeStr = exitCode ? exitCode.toString() : '0';
        mainWindow.webContents.send(`wsl:exit:${tabId}`, exitCodeStr);
      }
      delete wslProcesses[tabId];
    });

    // Agregar manejador de errores del proceso
    if (wslProcesses[tabId]) {
      wslProcesses[tabId].on('error', (error) => {
        if (error.message && error.message.includes('AttachConsole failed')) {
          console.warn(`Error AttachConsole en WSL ${tabId}:`, error.message);
        } else {
          console.error(`Error en proceso WSL ${tabId}:`, error);
        }
      });
    }

  } catch (error) {
    console.error(`Error starting WSL for tab ${tabId}:`, error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(`wsl:error:${tabId}`, `Failed to start WSL: ${error.message}`);
    }
  }
}

/**
 * Handlers para operaciones WSL
 */
const WSLHandlers = {
  start: (tabId, { cols, rows }) => startWSLSession(tabId, { cols, rows }),
  
  data: (tabId, data) => {
    if (wslProcesses[tabId]) {
      try {
        wslProcesses[tabId].write(data);
      } catch (error) {
        console.error(`Error writing to WSL ${tabId}:`, error);
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send(`wsl:error:${tabId}`, `Write error: ${error.message}`);
        }
      }
    } else {
      console.warn(`No WSL process found for ${tabId}`);
    }
  },
  
  resize: (tabId, { cols, rows }) => {
    if (wslProcesses[tabId]) {
      try {
        wslProcesses[tabId].resize(cols, rows);
      } catch (error) {
        console.error(`Error resizing WSL ${tabId}:`, error);
      }
    }
  },
  
  stop: (tabId) => {
    if (wslProcesses[tabId]) {
      try {
        console.log(`Stopping WSL process for tab ${tabId}`);
        const process = wslProcesses[tabId];
        
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
              console.warn(`Error con destroy() en WSL ${tabId}:`, destroyError.message);
            }
          }
        } else {
          process.kill();
        }
        
        delete wslProcesses[tabId];
      } catch (error) {
        console.error(`Error stopping WSL ${tabId}:`, error);
      }
    }
  }
};

module.exports = {
  setMainWindow,
  detectAllWSLDistributions,
  detectUbuntuAvailability,
  getLinuxShell,
  startWSLSession,
  WSLHandlers,
  wslProcesses,
  wslDistroProcesses,
  ubuntuProcesses
};
