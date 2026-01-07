const { execSync, spawn } = require('child_process');
const pty = require('node-pty');
const os = require('os');

/**
 * Servicio para gestión de contenedores Docker
 * - Detecta automáticamente contenedores corriendo
 * - Abre terminales interactivas dentro de contenedores
 * - Gestiona procesos Docker
 */

// Estado de procesos Docker
let dockerProcesses = {};

// Referencia a la ventana principal
let mainWindow = null;

// Flag para evitar logs repetidos de errores Docker
let dockerErrorLogged = false;

/**
 * Establece la referencia a la ventana principal
 */
function setMainWindow(window) {
  mainWindow = window;
}

/**
 * Detecta si Docker está disponible en el sistema
 */
function isDockerAvailable() {
  try {
    execSync('docker --version', { encoding: 'utf8', stdio: 'pipe', shell: true });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Obtiene lista de contenedores Docker corriendo
 * @returns {Array} Lista de contenedores con nombre e ID
 */
function getRunningContainers() {
  try {
    if (!isDockerAvailable()) {
      return [];
    }

    // Intentar múltiples formatos para máxima compatibilidad
    let output = '';
    let containers = [];
    
    try {
      // Intento 1: Formato JSON (más confiable)
      const jsonOutput = execSync(
        'docker ps --format "table{{json .}}"',
        { encoding: 'utf8', stdio: 'pipe', shell: true, maxBuffer: 1024 * 1024 * 10 }
      );
      
      if (jsonOutput.trim()) {
        const lines = jsonOutput.trim().split('\n');
        containers = lines
          .map(line => {
            try {
              const json = JSON.parse(line);
              return {
                name: json.Names || json.name || 'unknown',
                id: json.ID || json.id || '',
                shortId: (json.ID || json.id || '').substring(0, 12)
              };
            } catch (e) {
              return null;
            }
          })
          .filter(c => c && c.id);
        
        if (containers.length > 0) {
          return containers;
        }
      }
    } catch (jsonError) {
      // Intento 1 falló, continuar
    }
    
    try {
      // Intento 2: Formato simple con separadores
      output = execSync(
        'docker ps --no-trunc --format "{{.Names}} {{.ID}}"',
        { encoding: 'utf8', stdio: 'pipe', shell: true, maxBuffer: 1024 * 1024 * 10 }
      );

      if (output.trim()) {
        containers = output
          .trim()
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              return {
                name: parts[0],
                id: parts[1],
                shortId: parts[1].substring(0, 12)
              };
            }
            return null;
          })
          .filter(c => c && c.id);
        
        if (containers.length > 0) {
          return containers;
        }
      }
    } catch (simpleError) {
      // Intento 2 falló, continuar
    }

    try {
      // Intento 3: Comando básico sin formato
      output = execSync(
        'docker ps',
        { encoding: 'utf8', stdio: 'pipe', shell: true, maxBuffer: 1024 * 1024 * 10 }
      );

      if (output.trim()) {
        const lines = output.trim().split('\n');
        containers = lines
          .slice(1)
          .filter(line => line.trim())
          .map(line => {
            const tokens = line.trim().split(/\s+/);
            if (tokens.length >= 2) {
              const id = tokens[0];
              const name = tokens[tokens.length - 1];
              if (id && name && id !== 'CONTAINER' && name !== 'NAMES') {
                return {
                  name: name,
                  id: id,
                  shortId: id.substring(0, 12)
                };
              }
            }
            return null;
          })
          .filter(c => c && c.id && c.name);
        
        if (containers.length > 0) {
          return containers;
        }
      }
    } catch (basicError) {
      if (!dockerErrorLogged) {
        console.error('❌ Error detectando contenedores Docker:', basicError.message);
        dockerErrorLogged = true;
      }
    }

    return [];
  } catch (error) {
    if (!dockerErrorLogged) {
      console.error('❌ Error obteniendo contenedores Docker:', error.message);
      dockerErrorLogged = true;
    }
    return [];
  }
}

/**
 * Inicia una sesión en un contenedor Docker
 * @param {string} tabId - ID de la pestaña
 * @param {string} containerName - Nombre del contenedor
 * @param {Object} options - Opciones { cols, rows }
 */
async function startDockerSession(tabId, containerName, { cols, rows }) {
  try {
    // Verificar si ya hay un proceso activo
    if (dockerProcesses[tabId]) {
      return;
    }

    // Validar que el contenedor existe
    try {
      execSync(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true
      });
    } catch (e) {
      throw new Error(`Contenedor '${containerName}' no encontrado o no está corriendo`);
    }

    // Comando para entrar al contenedor
    let cmd, args;
    
    if (os.platform() === 'win32') {
      cmd = 'powershell.exe';
      args = ['-Command', `docker exec -it ${containerName} /bin/bash`];
    } else {
      cmd = 'docker';
      args = ['exec', '-it', containerName, '/bin/bash'];
    }

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

    if (os.platform() === 'win32') {
      spawnOptions.useConpty = false;
      spawnOptions.backend = 'winpty';
    }

    // Spawn del proceso Docker
    try {
      dockerProcesses[tabId] = pty.spawn(cmd, args, spawnOptions);
    } catch (spawnError) {
      throw new Error(`Error spawning docker process: ${spawnError.message}`);
    }

    // Buffer para almacenar salida inicial
    let outputBuffer = [];
    let listenerReady = false;

    // Handle output
    dockerProcesses[tabId].onData((data) => {
      const dataStr = data.toString('utf8');
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`docker:data:${tabId}`, dataStr);
      }
    });

    // El prompt ya se envía automáticamente, no es necesario enviar Enter

    // Handle exit
    dockerProcesses[tabId].onExit(({ exitCode, signal }) => {
      delete dockerProcesses[tabId];

      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`docker:exit:${tabId}`, exitCode?.toString() || '0');
      }
    });

    // Handle errors
    dockerProcesses[tabId].on('error', (error) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`docker:error:${tabId}`, error.message);
      }
    });
  } catch (error) {
    console.error(`❌ Error iniciando Docker en '${containerName}': ${error.message}`);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(`docker:error:${tabId}`, 
        `No se pudo iniciar sesión en '${containerName}': ${error.message}`
      );
    }
  }
}

/**
 * Handlers para IPC
 */
const DockerHandlers = {
  // Listar contenedores disponibles
  list: () => {
    try {
      const containers = getRunningContainers();
      return {
        success: true,
        available: containers.length > 0,
        containers: containers
      };
    } catch (error) {
      console.error('❌ Docker: Error listando contenedores');
      return {
        success: false,
        available: false,
        containers: [],
        error: error.message
      };
    }
  },

  // Verificar disponibilidad
  check: () => {
    try {
      const available = isDockerAvailable();
      const containers = available ? getRunningContainers() : [];
      
      return {
        available: available,
        containerCount: containers.length,
        containers: containers
      };
    } catch (error) {
      console.error('❌ Docker: Error de verificación');
      return {
        available: false,
        containerCount: 0,
        containers: [],
        error: error.message
      };
    }
  },

  // Iniciar sesión en contenedor
  start: (tabId, containerName, options) => {
    return startDockerSession(tabId, containerName, options);
  },

  // Enviar datos
  data: (tabId, data) => {
    if (dockerProcesses[tabId]) {
      try {
        dockerProcesses[tabId].write(data);
      } catch (error) {
        console.error(`❌ Docker ${tabId}: Error escribiendo datos`);
      }
    }
  },

  // Redimensionar
  resize: (tabId, { cols, rows }) => {
    if (dockerProcesses[tabId]) {
      try {
        dockerProcesses[tabId].resize(cols, rows);
      } catch (error) {
        console.error(`❌ Docker ${tabId}: Error redimensionando`);
      }
    }
  },

  // Detener
  stop: (tabId) => {
    if (dockerProcesses[tabId]) {
      try {
        const process = dockerProcesses[tabId];
        process.removeAllListeners();
        process.kill();
        delete dockerProcesses[tabId];
      } catch (error) {
        console.error(`❌ Docker ${tabId}: Error deteniendo`);
      }
    }
  },

  // Limpiar todos los procesos
  cleanup: () => {
    Object.keys(dockerProcesses).forEach(tabId => {
      DockerHandlers.stop(tabId);
    });
  }
};

module.exports = {
  setMainWindow,
  isDockerAvailable,
  getRunningContainers,
  startDockerSession,
  DockerHandlers,
  dockerProcesses
};

