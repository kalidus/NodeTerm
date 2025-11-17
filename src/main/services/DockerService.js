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
    const version = execSync('docker --version', { encoding: 'utf8', stdio: 'pipe', shell: true });
    console.log('🐳 Docker disponible:', version.trim());
    return true;
  } catch (error) {
    console.warn('⚠️ Docker no disponible:', error.message);
    return false;
  }
}

/**
 * Obtiene lista de contenedores Docker corriendo
 * @returns {Array} Lista de contenedores con nombre e ID
 */
function getRunningContainers() {
  try {
    console.log('🐳 Iniciando detección de contenedores Docker...');
    
    if (!isDockerAvailable()) {
      console.warn('⚠️ Docker no disponible para listar contenedores');
      return [];
    }

    // Intentar múltiples formatos para máxima compatibilidad
    let output = '';
    let containers = [];
    
    try {
      // Intento 1: Formato JSON (más confiable)
      console.log('  Intento 1: Usando formato JSON...');
      const jsonOutput = execSync(
        'docker ps --format "table{{json .}}"',
        { encoding: 'utf8', stdio: 'pipe', shell: true, maxBuffer: 1024 * 1024 * 10 }
      );
      
      if (jsonOutput.trim()) {
        // Procesar salida JSON
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
          console.log(`✅ JSON parsing exitoso: ${containers.length} contenedor(es)`);
          logContainers(containers);
          return containers;
        }
      }
    } catch (jsonError) {
      console.warn('  ⚠️ Intento JSON falló, probando alternativa...');
    }
    
    try {
      // Intento 2: Formato simple con separadores
      console.log('  Intento 2: Usando formato simple...');
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
          console.log(`✅ Formato simple exitoso: ${containers.length} contenedor(es)`);
          logContainers(containers);
          return containers;
        }
      }
    } catch (simpleError) {
      console.warn('  ⚠️ Intento simple falló, probando alternativa...');
    }

    try {
      // Intento 3: Comando básico sin formato
      console.log('  Intento 3: Usando comando básico...');
      output = execSync(
        'docker ps',
        { encoding: 'utf8', stdio: 'pipe', shell: true, maxBuffer: 1024 * 1024 * 10 }
      );

      if (output.trim()) {
        const lines = output.trim().split('\n');
        // Saltar encabezado
        containers = lines
          .slice(1)
          .filter(line => line.trim())
          .map(line => {
            // Formato: CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
            // Estrategia: El ID es el primer token, el NAMES es el último token
            const tokens = line.trim().split(/\s+/);
            if (tokens.length >= 2) {
              const id = tokens[0];      // CONTAINER ID es el primer token
              const name = tokens[tokens.length - 1];  // NAMES es el último token
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
          console.log(`✅ Comando básico exitoso: ${containers.length} contenedor(es)`);
          logContainers(containers);
          return containers;
        }
      }
    } catch (basicError) {
      console.error('  ❌ Intento básico también falló:', basicError.message);
    }

    console.warn('⚠️ No se pudieron detectar contenedores con ningún método');
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo contenedores Docker:', error.message);
    console.error('   Stack:', error.stack);
    return [];
  }
}

/**
 * Helper para loggear contenedores detectados
 */
function logContainers(containers) {
  console.log(`🐳 Docker: ${containers.length} contenedor(es) detectado(s)`);
  containers.forEach(c => {
    console.log(`  🐳 ${c.name} (${c.shortId})`);
  });
}

/**
 * Inicia una sesión en un contenedor Docker
 * @param {string} tabId - ID de la pestaña
 * @param {string} containerName - Nombre del contenedor
 * @param {Object} options - Opciones { cols, rows }
 */
async function startDockerSession(tabId, containerName, { cols, rows }) {
  try {
    console.log(`🐳 [START] Iniciando sesión Docker: tabId=${tabId}, container=${containerName}`);
    
    // Verificar si ya hay un proceso activo
    if (dockerProcesses[tabId]) {
      console.log(`✅ Docker ${containerName} ${tabId}: Reutilizando`);
      return;
    }

    // Validar que el contenedor existe
    try {
      console.log(`🐳 [VALIDATE] Validando contenedor ${containerName}...`);
      execSync(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true
      });
      console.log(`🐳 [VALIDATE] Validación exitosa, contenedor encontrado`);
    } catch (e) {
      console.error(`🐳 [VALIDATE] Error en validación:`, e.message);
      throw new Error(`Contenedor '${containerName}' no encontrado o no está corriendo: ${e.message}`);
    }

    console.log(`🐳 [SPAWN] Creando proceso PTY para Docker ${containerName}...`);

    // Comando para entrar al contenedor
    // En Windows, node-pty necesita usar powershell.exe como shell, luego ejecutar docker desde allí
    let cmd, args;
    
    if (os.platform() === 'win32') {
      // En Windows: usar PowerShell como shell que ejecutará docker
      cmd = 'powershell.exe';
      args = ['-Command', `docker exec -it ${containerName} /bin/bash`];
    } else {
      // En Linux/macOS, docker exec directo
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

    // Configuración específica para Windows
    if (os.platform() === 'win32') {
      spawnOptions.useConpty = false;
      spawnOptions.backend = 'winpty';
    }

    console.log(`🐳 [SPAWN] Opciones:`, { cmd, args, cols, rows, platform: os.platform() });

    // Spawn del proceso Docker
    try {
      dockerProcesses[tabId] = pty.spawn(cmd, args, spawnOptions);
      console.log(`✅ [SPAWN] Docker ${containerName} ${tabId}: Proceso creado exitosamente`);
    } catch (spawnError) {
      console.error(`❌ [SPAWN] Error spawning Docker proceso:`, spawnError.message);
      throw new Error(`Error spawning docker process: ${spawnError.message}`);
    }

    // Buffer para almacenar salida inicial
    let outputBuffer = [];
    let listenerReady = false;

    // Handle output - mostrar de inmediato
    dockerProcesses[tabId].onData((data) => {
      const dataStr = data.toString('utf8');
      console.log(`🐳 [DATA] Recibido en onData: ${data.length} bytes, convertido a ${dataStr.length} chars:`, dataStr.substring(0, 100));
      if (mainWindow && mainWindow.webContents) {
        console.log(`🐳 [SEND] Enviando datos a frontend para ${tabId}:`, dataStr.length, 'chars');
        mainWindow.webContents.send(`docker:data:${tabId}`, dataStr);
      } else {
        console.error(`❌ [SEND] mainWindow no disponible para ${tabId}`);
      }
    });

    // El prompt ya se envía automáticamente, no es necesario enviar Enter

    // Handle exit
    dockerProcesses[tabId].onExit(({ exitCode, signal }) => {
      console.log(`🔚 Docker ${containerName} ${tabId}: Terminado`);
      delete dockerProcesses[tabId];

      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`docker:exit:${tabId}`, exitCode?.toString() || '0');
      }
    });

    // Handle errors
    dockerProcesses[tabId].on('error', (error) => {
      console.error(`❌ Docker ${containerName} ${tabId}: Error`);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`docker:error:${tabId}`, error.message);
      }
    });
  } catch (error) {
    console.error(`❌ Docker ${containerName} ${tabId}: Error de inicio`, error.message);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(`docker:error:${tabId}`, 
        `No se pudo iniciar sesión en '${containerName}':\n${error.message}`
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
        console.error(`❌ Docker ${tabId}: Error de escritura`);
      }
    } else {
      console.warn(`⚠️ Docker ${tabId}: Proceso no encontrado`);
    }
  },

  // Redimensionar
  resize: (tabId, { cols, rows }) => {
    if (dockerProcesses[tabId]) {
      try {
        dockerProcesses[tabId].resize(cols, rows);
      } catch (error) {
        console.error(`❌ Docker ${tabId}: Error de redimensionado`);
      }
    }
  },

  // Detener
  stop: (tabId) => {
    if (dockerProcesses[tabId]) {
      try {
        console.log(`🛑 Docker ${tabId}: Deteniendo`);
        const process = dockerProcesses[tabId];
        process.removeAllListeners();
        process.kill();
        delete dockerProcesses[tabId];
      } catch (error) {
        console.error(`❌ Docker ${tabId}: Error al detener`);
      }
    }
  },

  // Limpiar todos los procesos
  cleanup: () => {
    console.log(`🧹 Docker: Limpiando ${Object.keys(dockerProcesses).length} procesos`);
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

