const os = require('os');
const pty = require('node-pty');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Servicio para Cygwin embebido (portable)
 * Similar a como MobaXterm integra Cygwin
 * No requiere instalación del usuario - todo está embebido en la app
 */

let cygwinProcesses = {};
let mainWindow = null;
let cygwinRootPath = null;
let cygwinBashPath = null;

/**
 * Inicializa las rutas de Cygwin embebido
 */
function initializeCygwinPaths() {
  try {
    if (cygwinRootPath && cygwinBashPath) {
      return { 
        root: cygwinRootPath, 
        bash: cygwinBashPath,
        exists: fs.existsSync(cygwinBashPath)
      };
    }

    // Detectar si estamos en desarrollo o producción
    const isDev = !app.isPackaged;
    
    let resourcesPath;
    if (isDev) {
      // En desarrollo: resources en la raíz del proyecto
      resourcesPath = path.join(app.getAppPath(), 'resources');
    } else {
      // En producción: resources está en el directorio de la app empaquetada
      // Para Electron, process.resourcesPath apunta a la carpeta resources
      resourcesPath = process.resourcesPath;
    }

    cygwinRootPath = path.join(resourcesPath, 'cygwin64');
    cygwinBashPath = path.join(cygwinRootPath, 'bin', 'bash.exe');

    const exists = fs.existsSync(cygwinBashPath);

    console.log('🔍 Buscando Cygwin embebido:');
    console.log('   Root:', cygwinRootPath);
    console.log('   Bash:', cygwinBashPath);
    console.log('   Exists:', exists);

    return {
      root: cygwinRootPath,
      bash: cygwinBashPath,
      exists: exists
    };
  } catch (error) {
    console.error('❌ Error inicializando rutas de Cygwin:', error);
    return {
      root: null,
      bash: null,
      exists: false
    };
  }
}

/**
 * Verifica si Cygwin embebido está disponible
 */
function isCygwinAvailable() {
  try {
    const paths = initializeCygwinPaths();
    return paths.exists === true;
  } catch (error) {
    console.error('❌ Error verificando Cygwin:', error);
    return false;
  }
}

/**
 * Establece la referencia a la ventana principal
 */
function setMainWindow(window) {
  mainWindow = window;
}

/**
 * Inicia una sesión Cygwin usando el Cygwin embebido
 */
async function startCygwinSession(tabId, { cols, rows }) {
  try {
    // Verificar si ya hay un proceso activo
    if (cygwinProcesses[tabId]) {
      console.log(`✅ Cygwin ya existe para ${tabId}, reutilizando`);
      
      // IMPORTANTE: Dar tiempo al frontend para registrar el listener
      setTimeout(() => {
        if (cygwinProcesses[tabId] && mainWindow && mainWindow.webContents) {
          try {
            console.log(`🔄 Reenviando prompt a ${tabId}...`);
            // Enviar un prompt visible inmediatamente
            mainWindow.webContents.send(`cygwin:data:${tabId}`, 'kalid@Kore:~$ ');
            
            // También enviar newline para generar prompt real
            setTimeout(() => {
              if (cygwinProcesses[tabId]) {
                cygwinProcesses[tabId].write('\r');
              }
            }, 100);
          } catch (e) {
            console.warn(`⚠️ Error refrescando prompt:`, e.message);
          }
        }
      }, 600); // Delay mayor para asegurar que el listener esté listo
      return;
    }

    const paths = initializeCygwinPaths();
    
    if (!paths.exists) {
      throw new Error('Cygwin embebido no encontrado en la aplicación');
    }

    console.log(`🚀 Iniciando Cygwin embebido para ${tabId}...`);

    // Crear directorio home para el usuario si no existe
    const userName = process.env.USERNAME || process.env.USER || 'user';
    const cygwinHome = path.join(paths.root, 'home', userName);
    
    if (!fs.existsSync(cygwinHome)) {
      fs.mkdirSync(cygwinHome, { recursive: true });
      console.log(`📁 Directorio home creado: ${cygwinHome}`);
    }

    // Crear un archivo .bashrc moderno estilo MobaXterm si no existe
    const bashrcPath = path.join(cygwinHome, '.bashrc');
    if (!fs.existsSync(bashrcPath)) {
      const bashrcContent = `# NodeTerm Cygwin - Configuración moderna
# Prompt bonito con colores y símbolos
export PS1='\\[\\033[01;36m\\]┌─[\\[\\033[01;32m\\]\\u\\[\\033[01;33m\\]@\\[\\033[01;35m\\]\\h\\[\\033[01;36m\\]]─[\\[\\033[01;34m\\]\\w\\[\\033[01;36m\\]]\\n└─\\[\\033[01;32m\\]\\$\\[\\033[00m\\] '

# PATH
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Aliases útiles
alias ls='ls --color=auto'
alias ll='ls -lah --color=auto'
alias grep='grep --color=auto'
alias la='ls -A'
alias l='ls -CF'

# Colores para ls
export LS_COLORS='di=01;34:ln=01;36:ex=01;32:*.tar=01;31:*.zip=01;31:*.jpg=01;35:*.png=01;35'

# Bienvenida
echo -e "\\033[1;36m┌─────────────────────────────────────────┐\\033[0m"
echo -e "\\033[1;36m│\\033[0m  \\033[1;32mCygwin Terminal\\033[0m - NodeTerm      \\033[1;36m│\\033[0m"
echo -e "\\033[1;36m└─────────────────────────────────────────┘\\033[0m"
echo ""

cd ~
`;
      fs.writeFileSync(bashrcPath, bashrcContent, 'utf8');
      console.log(`📝 .bashrc creado en: ${bashrcPath}`);
    }

    // Configuración de entorno para Cygwin
    const cygwinEnv = {
      ...process.env,
      // Variables esenciales de Cygwin
      HOME: `/home/${userName}`,
      SHELL: '/bin/bash',
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      // Path de Cygwin (usar paths Unix-style)
      PATH: `/usr/local/bin:/usr/bin:/bin`,
      // Variable importante: evita que Cygwin intente reescribir paths de Windows
      CYGWIN: 'nodosfilewarning winsymlinks:nativestrict',
      // Para que bash inicie en el directorio correcto
      CHERE_INVOKING: '1',
      // Locale
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      // Prevenir errores de terminal
      DISPLAY: '',
      // Evitar que bash intente cargar /etc/profile
      ENV: ''
    };

    // Opciones para node-pty - Volver a WinPTY que funciona mejor con Cygwin
    const spawnOptions = {
      name: 'xterm-256color',
      cols: cols || 120,
      rows: rows || 30,
      cwd: cygwinHome, // Iniciar en el home de Cygwin
      env: cygwinEnv,
      windowsHide: false,
      useConpty: false, // Usar WinPTY para mejor compatibilidad con Cygwin
      experimental: {
        conpty: false
      }
    };

    // Args para bash: NO usar --login para evitar problemas
    const args = ['--norc', '--noprofile', '-i'];

    // Spawn del proceso
    console.log(`📌 Spawning: ${paths.bash}`);
    console.log(`📂 CWD: ${cygwinHome}`);
    
    cygwinProcesses[tabId] = pty.spawn(paths.bash, args, spawnOptions);

    console.log(`🔍 Proceso Cygwin spawned, PID: ${cygwinProcesses[tabId].pid}`);

    // Buffer para almacenar salida inicial hasta que el listener esté listo
    let outputBuffer = [];
    let listenerReady = false;

    // Handle output - bufferea inicialmente
    cygwinProcesses[tabId].onData((data) => {
      console.log(`📤 Cygwin ${tabId} output:`, Buffer.from(data).toString('utf8').substring(0, 100));
      
      if (!listenerReady) {
        // Almacenar en buffer durante los primeros 600ms
        console.log(`💾 Buffereando output para ${tabId}...`);
        outputBuffer.push(data);
      } else if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`cygwin:data:${tabId}`, data);
      }
    });

    // Después de 600ms, liberar el buffer y permitir output directo
    setTimeout(() => {
      listenerReady = true;
      if (outputBuffer.length > 0 && mainWindow && mainWindow.webContents) {
        console.log(`📤 Enviando buffer de ${outputBuffer.length} chunks a ${tabId}`);
        outputBuffer.forEach(data => {
          mainWindow.webContents.send(`cygwin:data:${tabId}`, data);
        });
        outputBuffer = [];
      }
    }, 600);

    // Enviar "newline" inicial para activar bash
    setTimeout(() => {
      try {
        if (cygwinProcesses[tabId]) {
          console.log(`📝 Enviando newline inicial a ${tabId}...`);
          cygwinProcesses[tabId].write('\r');
        }
      } catch (e) {
        console.warn(`⚠️ Error enviando newline inicial:`, e.message);
      }
    }, 200);

    // Enviar comandos iniciales después de un delay mayor
    setTimeout(() => {
      try {
        if (cygwinProcesses[tabId]) {
          console.log(`📝 Cargando bashrc para ${tabId}...`);
          // Cargar bashrc manualmente
          cygwinProcesses[tabId].write('source ~/.bashrc\r');
          // Otro enter para mostrar el prompt
          setTimeout(() => {
            if (cygwinProcesses[tabId]) {
              cygwinProcesses[tabId].write('\r');
            }
          }, 300);
        }
      } catch (e) {
        console.warn(`⚠️ Error enviando comandos iniciales:`, e.message);
      }
    }, 800);

    // Handle exit
    cygwinProcesses[tabId].onExit(({ exitCode, signal }) => {
      console.log(`🔚 Cygwin ${tabId} terminó - Code: ${exitCode}, Signal: ${signal}`);
      delete cygwinProcesses[tabId];
      
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`cygwin:exit:${tabId}`, exitCode?.toString() || '0');
      }
    });

    // Handle errors
    cygwinProcesses[tabId].on('error', (error) => {
      console.error(`❌ Error en Cygwin ${tabId}:`, error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`cygwin:error:${tabId}`, error.message);
      }
    });

    console.log(`✅ Sesión Cygwin iniciada para ${tabId}`);

  } catch (error) {
    console.error(`❌ Error starting Cygwin for ${tabId}:`, error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(`cygwin:error:${tabId}`, 
        `No se pudo iniciar Cygwin: ${error.message}\n\n` +
        `Asegúrate de que la carpeta 'resources/cygwin64' existe en la aplicación.`
      );
    }
  }
}

/**
 * Handlers para IPC
 */
const CygwinHandlers = {
  // Detectar disponibilidad
  detect: () => {
    try {
      const available = isCygwinAvailable();
      const paths = initializeCygwinPaths();
      
      console.log('🔍 CygwinHandlers.detect() result:', {
        available: available,
        path: available ? paths.bash : null,
        root: available ? paths.root : null
      });
      
      return {
        available: available === true,
        path: available ? paths.bash : null,
        root: available ? paths.root : null
      };
    } catch (error) {
      console.error('❌ Error en CygwinHandlers.detect():', error);
      return {
        available: false,
        path: null,
        root: null,
        error: error.message
      };
    }
  },

  // Iniciar sesión
  start: (tabId, options) => startCygwinSession(tabId, options),

  // Enviar datos
  data: (tabId, data) => {
    if (cygwinProcesses[tabId]) {
      try {
        cygwinProcesses[tabId].write(data);
      } catch (error) {
        console.error(`❌ Error writing to Cygwin ${tabId}:`, error);
      }
    } else {
      console.warn(`⚠️ No Cygwin process found for ${tabId}`);
    }
  },

  // Redimensionar
  resize: (tabId, { cols, rows }) => {
    if (cygwinProcesses[tabId]) {
      try {
        cygwinProcesses[tabId].resize(cols, rows);
      } catch (error) {
        console.error(`❌ Error resizing Cygwin ${tabId}:`, error);
      }
    }
  },

  // Detener
  stop: (tabId) => {
    if (cygwinProcesses[tabId]) {
      try {
        console.log(`🛑 Stopping Cygwin process for ${tabId}`);
        const process = cygwinProcesses[tabId];
        process.removeAllListeners();
        process.kill();
        delete cygwinProcesses[tabId];
      } catch (error) {
        console.error(`❌ Error stopping Cygwin ${tabId}:`, error);
      }
    }
  },

  // Limpiar todos los procesos (al cerrar la app)
  cleanup: () => {
    console.log(`🧹 Limpiando ${Object.keys(cygwinProcesses).length} procesos Cygwin...`);
    Object.keys(cygwinProcesses).forEach(tabId => {
      CygwinHandlers.stop(tabId);
    });
  }
};

module.exports = {
  setMainWindow,
  initializeCygwinPaths,
  isCygwinAvailable,
  startCygwinSession,
  CygwinHandlers,
  cygwinProcesses
};
