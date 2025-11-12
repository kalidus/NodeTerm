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

    console.log('🔍 Cygwin embebido:', exists ? '✅ Disponible' : '❌ No encontrado');

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
      console.log(`✅ Cygwin ${tabId}: Reutilizando`);
      
      // No enviar prompt falso - el proceso ya está activo y mostrará su prompt real
      return;
    }

    const paths = initializeCygwinPaths();
    
    if (!paths.exists) {
      throw new Error('Cygwin embebido no encontrado en la aplicación');
    }

    // Iniciando Cygwin silenciosamente

    // Crear directorio home para el usuario si no existe
    const userName = process.env.USERNAME || process.env.USER || 'user';
    const cygwinHome = path.join(paths.root, 'home', userName);
    
    if (!fs.existsSync(cygwinHome)) {
      fs.mkdirSync(cygwinHome, { recursive: true });
      // Home creado silenciosamente
    }

    // Crear un archivo .bashrc moderno estilo MobaXterm (siempre regenerar para aplicar cambios)
    const bashrcPath = path.join(cygwinHome, '.bashrc');
    // Eliminar el archivo existente para forzar la regeneración con los cambios
    if (fs.existsSync(bashrcPath)) {
      fs.unlinkSync(bashrcPath);
      // .bashrc actualizado silenciosamente
    }
    
    // Crear/validar el archivo fstab
    const etcPath = path.join(paths.root, 'etc');
    const fstabPath = path.join(etcPath, 'fstab');
    
    if (!fs.existsSync(etcPath)) {
      fs.mkdirSync(etcPath, { recursive: true });
    }

    // Contenido válido de fstab para Cygwin
    const fstabContent = `# This file is read once by the first Cygwin process in a session.
# To use Win32 mounts in subsequent Cygwin sessions, rebase them or start
# the first session with a user account which has the appropriate
# privileges to set file permissions on Win32 mounts.

# Do not add mount entries to the above parent directories.

# (blank line - end of header)
`;

    // Recrear fstab siempre para evitar corrupción
    try {
      if (fs.existsSync(fstabPath)) {
        fs.unlinkSync(fstabPath);
      }
      fs.writeFileSync(fstabPath, fstabContent, 'utf8');
    } catch (e) {
      // Ignorar errores de fstab
    }

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

# Bienvenida simple
echo -e "\\033[1;32m■\\033[0m \\033[1;36mCygwin Terminal\\033[0m - NodeTerm"
echo ""

cd ~
`;
    fs.writeFileSync(bashrcPath, bashrcContent, 'utf8');
    // Configurado silenciosamente

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
      CYGWIN: 'nodosfilewarning winsymlinks:native',
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

    // Args para bash: cargar bashrc pero sin modo interactivo extra
    const args = ['--rcfile', path.join(cygwinHome, '.bashrc')];

    // Spawn del proceso
    cygwinProcesses[tabId] = pty.spawn(paths.bash, args, spawnOptions);
    console.log(`✅ Cygwin ${tabId}: Listo`);

    // Buffer para almacenar salida inicial hasta que el listener esté listo
    let outputBuffer = [];
    let listenerReady = false;

    // Handle output - bufferea inicialmente
    cygwinProcesses[tabId].onData((data) => {
      if (!listenerReady) {
        // Almacenar en buffer durante los primeros 600ms
        outputBuffer.push(data);
      } else if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`cygwin:data:${tabId}`, data);
      }
    });

    // Después de 600ms, liberar el buffer y permitir output directo
    setTimeout(() => {
      listenerReady = true;
      if (outputBuffer.length > 0 && mainWindow && mainWindow.webContents) {
        outputBuffer.forEach(data => {
          mainWindow.webContents.send(`cygwin:data:${tabId}`, data);
        });
        outputBuffer = [];
      }
    }, 600);

    // No enviar \r automático - bash ya mostrará su prompt cuando esté listo

    // Handle exit
    cygwinProcesses[tabId].onExit(({ exitCode, signal }) => {
      console.log(`🔚 Cygwin ${tabId}: Terminado`);
      delete cygwinProcesses[tabId];
      
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`cygwin:exit:${tabId}`, exitCode?.toString() || '0');
      }
    });

    // Handle errors
    cygwinProcesses[tabId].on('error', (error) => {
        console.error(`❌ Cygwin ${tabId}: Error`);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`cygwin:error:${tabId}`, error.message);
      }
    });

    // Sesión lista silenciosamente

  } catch (error) {
    console.error(`❌ Cygwin ${tabId}: Error de inicio`);
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
      
      // Log simplificado para detección
      
      return {
        available: available === true,
        path: available ? paths.bash : null,
        root: available ? paths.root : null
      };
    } catch (error) {
      console.error('❌ Cygwin: Error de detección');
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
        console.error(`❌ Cygwin ${tabId}: Error de escritura`);
      }
    } else {
      console.warn(`⚠️ Cygwin ${tabId}: Proceso no encontrado`);
    }
  },

  // Redimensionar
  resize: (tabId, { cols, rows }) => {
    if (cygwinProcesses[tabId]) {
      try {
        cygwinProcesses[tabId].resize(cols, rows);
      } catch (error) {
        console.error(`❌ Cygwin ${tabId}: Error de redimensionado`);
      }
    }
  },

  // Detener
  stop: (tabId) => {
    if (cygwinProcesses[tabId]) {
      try {
        console.log(`🛑 Cygwin ${tabId}: Deteniendo`);
        const process = cygwinProcesses[tabId];
        process.removeAllListeners();
        process.kill();
        delete cygwinProcesses[tabId];
      } catch (error) {
        console.error(`❌ Cygwin ${tabId}: Error al detener`);
      }
    }
  },

  // Limpiar todos los procesos (al cerrar la app)
  cleanup: () => {
    console.log(`🧹 Cygwin: Limpiando ${Object.keys(cygwinProcesses).length} procesos`);
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
