// Configuraciones alternativas para node-pty
const alternativePtyConfig = {
  conservative: {
    name: 'xterm',
    cols: 80,
    rows: 24,
    windowsHide: false,
    useConpty: false,
    conptyLegacy: false,
    experimentalUseConpty: false
  },
  minimal: {
    name: 'xterm',
    cols: 80,
    rows: 24,
    windowsHide: false
  },
  winpty: {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    windowsHide: false,
    backend: 'winpty',
    useConpty: false
  }
};

// Terminal alternativo para casos extremos
class SafeWindowsTerminal {
  constructor(shell, args, options) {
    this.shell = shell;
    this.args = args;
    this.options = options;
    this.process = null;
    this.dataCallbacks = [];
    this.exitCallbacks = [];
    this.isDestroyed = false;
  }

  spawn() {
    if (this.isDestroyed) throw new Error('Terminal already destroyed');
    
    this.process = require('child_process').spawn(this.shell, this.args, {
      cwd: this.options.cwd || require('os').homedir(),
      env: this.options.env || process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: this.options.windowsHide || false
    });

    this.process.stdout.on('data', (data) => {
      this.dataCallbacks.forEach(callback => callback(data));
    });

    this.process.stderr.on('data', (data) => {
      this.dataCallbacks.forEach(callback => callback(data));
    });

    this.process.on('exit', (code, signal) => {
      console.log(`SafeWindowsTerminal exit - code:`, code, 'signal:', signal, 'type:', typeof code);
      // Asegurar que code sea un número válido
      let exitCode = 0;
      if (typeof code === 'number') {
        exitCode = code;
      } else if (typeof code === 'string') {
        exitCode = parseInt(code, 10) || 0;
      } else if (code && typeof code === 'object' && code.exitCode !== undefined) {
        exitCode = code.exitCode;
      } else {
        exitCode = 0;
      }
      console.log(`SafeWindowsTerminal actual exit code:`, exitCode);
      this.exitCallbacks.forEach(callback => callback(exitCode, signal));
    });

    return this;
  }

  onData(callback) { this.dataCallbacks.push(callback); }
  onExit(callback) { this.exitCallbacks.push(callback); }
  write(data) { if (this.process?.stdin && !this.process.stdin.destroyed) this.process.stdin.write(data); }
  kill() { if (this.process && !this.process.killed) this.process.kill(); }
  destroy() { this.isDestroyed = true; this.kill(); this.dataCallbacks = []; this.exitCallbacks = []; }
  resize() { console.log('Resize not supported in fallback mode'); }
}

try {
  require('electron-reloader')(module);
} catch (_) {}

const { app, BrowserWindow, ipcMain, clipboard, dialog, Menu } = require('electron');
const path = require('path');
const url = require('url');

// ============================================
// 🚨 VERIFICACIÓN CRÍTICA DE CAMBIOS APLICADOS
// (logs temporales eliminados)
// ============================================
const os = require('os');
const fs = require('fs');
const SSH2Promise = require('ssh2-promise');
const { NodeSSH } = require('node-ssh');
const packageJson = require('./package.json');
const { createBastionShell } = require('./src/components/bastion-ssh');
const SftpClient = require('ssh2-sftp-client');
const si = require('systeminformation');
const { fork } = require('child_process');

// Parser simple para 'ls -la'
function parseLsOutput(output) {
  const lines = output.split('\n').filter(line => line.trim() !== '' && !line.startsWith('total'));
  return lines.map(line => {
    // Ejemplo: -rw-r--r-- 1 user group 4096 Jan 1 12:00 filename
    const parts = line.split(/\s+/);
    if (parts.length < 9) return null;
    const [permissions, , owner, group, size, month, day, timeOrYear, ...nameParts] = parts;
    const name = nameParts.join(' ');
    return {
      name,
      permissions,
      owner,
      group,
      size: parseInt(size, 10) || 0,
      modified: `${month} ${day} ${timeOrYear}`,
      type: permissions[0] === 'd' ? 'directory' : 'file',
    };
  }).filter(Boolean);
}

ipcMain.handle('ssh:get-home-directory', async (event, { tabId, sshConfig }) => {
  try {
    if (sshConfig.useBastionWallix) {
      // Buscar la conexión existente para bastion
      const existingConn = await findSSHConnection(tabId, sshConfig);
      if (existingConn && existingConn.ssh && existingConn.stream) {
        // Modo antiguo: usar stream interactivo si existe
        const stream = existingConn.stream;
        const command = 'echo $HOME\n';
        let output = '';
        const onData = (data) => {
          output += data.toString('utf-8');
        };
        stream.on('data', onData);
        stream.write(command);
        await new Promise((resolve) => setTimeout(resolve, 300));
        stream.removeListener('data', onData);
        // LOGS DE DEPURACIÓN
        // console.log('[ssh:get-home-directory][BASTION] output bruto:', JSON.stringify(output));
        // Split por líneas ANTES de limpiar
        const lines = output.replace(command.trim(), '').replace(/\r/g, '').split('\n');
        const cleanedLines = lines.map(line => line
          .replace(/\x1b\][^\x07]*(\x07|\x1b\\)/g, '') // OSC
          .replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, '') // CSI/SGR
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Otros controles
          .trim()
        );
        // console.log('[ssh:get-home-directory][BASTION] cleanedLines:', cleanedLines);
        const home = cleanedLines.find(l => l.startsWith('/')) || '/';
        // console.log('[ssh:get-home-directory][BASTION] home final:', home);
        return { success: true, home };
      } else {
        // Nuevo: usar SFTP para obtener el home si no hay stream interactivo
        const SftpClient = require('ssh2-sftp-client');
        const sftp = new SftpClient();
        const connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
        };
        await sftp.connect(connectConfig);
        // Obtener el home real del usuario conectado
        const home = await sftp.realPath('.');
        await sftp.end();
        return { success: true, home };
      }
    } else {
      const ssh = new SSH2Promise(sshConfig);
      await ssh.connect();
      const home = await ssh.exec('echo $HOME');
      await ssh.close();
      return { success: true, home: (home || '/').trim() };
    }
  } catch (err) {
    return { success: false, error: err.message || err };
  }
});

ipcMain.handle('ssh:list-files', async (event, { tabId, path, sshConfig }) => {
  try {
    // console.log('ssh:list-files: tabId:', tabId);
    // console.log('ssh:list-files: path recibido:', path);
    // console.log('ssh:list-files: sshConfig recibido:', sshConfig);
    // Validación robusta de path
    let safePath = '/';
    if (typeof path === 'string') {
      safePath = path;
    } else if (path && typeof path.path === 'string') {
      safePath = path.path;
    } else {
      // console.warn('ssh:list-files: path inválido recibido:', path);
    }

    let ssh;
    let shouldCloseConnection = false;

    if (sshConfig.useBastionWallix) {
      // Buscar la conexión existente para bastion
      const existingConn = await findSSHConnection(tabId, sshConfig);
      if (existingConn && existingConn.ssh && existingConn.stream) {
        // Modo antiguo: usar stream interactivo si existe
        ssh = existingConn.ssh;
        const stream = existingConn.stream;
        shouldCloseConnection = false;
        // Ejecutar el comando en el stream interactivo
        const command = `ls -la --color=never "${safePath}"\n`;
        let output = '';
        let resolved = false;
        // Listener temporal para capturar la salida
        const onData = (data) => {
          output += data.toString('utf-8');
        };
        stream.on('data', onData);
        // Escribir el comando
        stream.write(command);
        // Esperar la respuesta (timeout corto o hasta que llegue el prompt)
        await new Promise((resolve) => setTimeout(resolve, 400));
        stream.removeListener('data', onData);
        // Limpiar la salida: quitar el comando enviado y posibles prompts
        let cleanOutput = output.replace(command.trim(), '').replace(/\r/g, '');
        // Eliminar códigos ANSI
        cleanOutput = cleanOutput.replace(/\x1b\[[0-9;]*m/g, '');
        // Quitar líneas vacías y posibles prompts
        cleanOutput = cleanOutput.split('\n').filter(line => line.trim() !== '' && !line.trim().endsWith('$') && !line.trim().endsWith('#')).join('\n');
        return { success: true, files: parseLsOutput(cleanOutput) };
      } else {
        // Nuevo: usar SFTP para listar archivos si no hay stream interactivo
        const SftpClient = require('ssh2-sftp-client');
        const sftp = new SftpClient();
        const connectConfig = {
          host: sshConfig.bastionHost,
          port: sshConfig.port || 22,
          username: sshConfig.bastionUser,
          password: sshConfig.password,
          readyTimeout: 20000,
        };
        await sftp.connect(connectConfig);
        const sftpList = await sftp.list(safePath);
        await sftp.end();
        // Adaptar el formato a lo que espera el frontend
        const files = sftpList.map(item => ({
          name: item.name,
          permissions: item.longname?.split(' ')[0] || '',
          owner: '',
          group: '',
          size: item.size,
          modified: item.modifyTime ? new Date(item.modifyTime * 1000).toLocaleString() : '',
          type: item.type === 'd' ? 'directory' : (item.type === 'l' ? 'symlink' : 'file'),
        }));
        return { success: true, files };
      }
    } else {
      // SSH directo: crear nueva conexión
      ssh = new SSH2Promise(sshConfig);
      await ssh.connect();
      shouldCloseConnection = true;
      const lsOutput = await ssh.exec(`ls -la --color=never "${safePath}"`);
      // Eliminar códigos ANSI por si acaso
      const cleanOutput = lsOutput.replace(/\x1b\[[0-9;]*m/g, '');
      if (shouldCloseConnection && ssh) {
        await ssh.close();
      }
      return { success: true, files: parseLsOutput(cleanOutput) };
    }
  } catch (err) {
    // console.error('ssh:list-files: ERROR:', err);
    return { success: false, error: err.message || err };
  }
});

ipcMain.handle('ssh:check-directory', async (event, { tabId, path, sshConfig }) => {
  try {
    if (sshConfig.useBastionWallix) {
      // Buscar la conexión existente para bastion
      const existingConn = await findSSHConnection(tabId, sshConfig);
      if (!existingConn || !existingConn.ssh || !existingConn.stream) {
        return { success: false, error: 'No se encontró una conexión bastión activa para este tabId. Abre primero una terminal.' };
      }
      const stream = existingConn.stream;
      const command = `[ -d "${path}" ] && echo exists || echo notfound\n`;
      let output = '';
      const onData = (data) => {
        output += data.toString('utf-8');
      };
      stream.on('data', onData);
      stream.write(command);
      await new Promise((resolve) => setTimeout(resolve, 350));
      stream.removeListener('data', onData);
      // Limpiar la salida: quitar el comando enviado y posibles prompts
      let cleanOutput = output.replace(command.trim(), '').replace(/\r/g, '');
      // Eliminar códigos ANSI
      cleanOutput = cleanOutput.replace(/\x1b\[[0-9;]*m/g, '');
      // Buscar si existe
      if (cleanOutput.includes('exists')) {
        return { success: true, exists: true };
      } else {
        return { success: true, exists: false };
      }
    } else {
      // SSH directo
      const ssh = new SSH2Promise(sshConfig);
      await ssh.connect();
      const result = await ssh.exec(`[ -d "${path}" ] && echo exists || echo notfound`);
      await ssh.close();
      if (result.includes('exists')) {
        return { success: true, exists: true };
      } else {
        return { success: true, exists: false };
      }
    }
  } catch (err) {
    return { success: false, error: err.message || err };
  }
});

let mainWindow;
let isAppQuitting = false; // Flag para evitar operaciones durante el cierre

// Manejador global para errores no capturados relacionados con ConPTY
process.on('uncaughtException', (error) => {
  if (error.message && error.message.includes('AttachConsole failed')) {
    console.warn('Error AttachConsole capturado y suprimido:', error.message);
    return; // Suprimir el error sin crashear la aplicación
  }
  
  // Para otros errores no capturados, mantener el comportamiento por defecto
  console.error('Error no capturado:', error);
  throw error;
});

// Manejador para promesas rechazadas no capturadas
process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.message && reason.message.includes('AttachConsole failed')) {
    console.warn('Promise rechazada con error AttachConsole capturado:', reason.message);
    return; // Suprimir el error
  }
  
  console.error('Promise rechazada no manejada:', reason);
});

// Store active SSH connections and their shells
const sshConnections = {};
// Estado persistente para stats de bastión (CPU, red, etc.) por tabId
const bastionStatsState = {};
// Cache for Welcome Messages (MOTD) to show them on every new tab.
const motdCache = {};
// Pool de conexiones SSH compartidas para evitar múltiples conexiones al mismo servidor
const sshConnectionPool = {};

// Sistema de throttling para conexiones SSH
const connectionThrottle = {
  pending: new Map(), // Conexiones en proceso por cacheKey
  lastAttempt: new Map(), // Último intento por cacheKey
  minInterval: 2000, // Mínimo 2 segundos entre intentos al mismo servidor
  
  async throttle(cacheKey, connectionFn) {
    // Si ya hay una conexión pendiente para este servidor, esperar
    if (this.pending.has(cacheKey)) {
      // console.log(`Esperando conexión pendiente para ${cacheKey}...`);
      return await this.pending.get(cacheKey);
    }
    
    // Verificar intervalo mínimo
    const lastAttempt = this.lastAttempt.get(cacheKey) || 0;
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    
    if (timeSinceLastAttempt < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastAttempt;
      // console.log(`Throttling conexión a ${cacheKey}, esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Crear la conexión
    this.lastAttempt.set(cacheKey, Date.now());
    const connectionPromise = connectionFn();
    this.pending.set(cacheKey, connectionPromise);
    
    try {
      const result = await connectionPromise;
      return result;
    } finally {
      this.pending.delete(cacheKey);
    }
  }
};

// Función para limpiar conexiones SSH huérfanas cada 60 segundos
setInterval(() => {
  const activeKeys = new Set(Object.values(sshConnections).map(conn => conn.cacheKey));
  
  for (const [poolKey, poolConnection] of Object.entries(sshConnectionPool)) {
    if (!activeKeys.has(poolKey)) {
      // Verificar si la conexión es realmente antigua (más de 5 minutos sin uso)
      const connectionAge = Date.now() - (poolConnection._lastUsed || poolConnection._createdAt || 0);
      if (connectionAge > 5 * 60 * 1000) { // 5 minutos
        // console.log(`Limpiando conexión SSH huérfana: ${poolKey} (sin uso por ${Math.round(connectionAge/1000)}s)`);
        try {
          // Limpiar listeners antes de cerrar
          if (poolConnection.ssh) {
            poolConnection.ssh.removeAllListeners();
          }
          poolConnection.close();
        } catch (e) {
          // console.warn(`Error closing orphaned connection: ${e.message}`);
        }
        delete sshConnectionPool[poolKey];
      }
    } else {
      // Marcar como usado recientemente
      poolConnection._lastUsed = Date.now();
    }
  }
}, 60000); // Cambiar a 60 segundos para dar más tiempo

// Helper function to parse 'df -P' command output
function parseDfOutput(dfOutput) {
    const lines = dfOutput.trim().split('\n');
    lines.shift(); // Remove header line
    return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 6) {
            const use = parseInt(parts[parts.length - 2], 10);
            const name = parts[parts.length - 1];
            // Filter out unwanted mount points
            if (name && name.startsWith('/') && !isNaN(use) && 
                !name.startsWith('/sys') && 
                !name.startsWith('/opt') && 
                !name.startsWith('/run') && 
                name !== '/boot/efi' && 
                !name.startsWith('/dev') &&
                !name.startsWith('/var')) {
                return { fs: name, use };
            }
        }
        return null;
    }).filter(Boolean); // Filter out null entries
}

function parseNetDev(netDevOutput) {
    const lines = netDevOutput.trim().split('\n');
    let totalRx = 0;
    let totalTx = 0;

    lines.slice(2).forEach(line => {
        const parts = line.trim().split(/\s+/);
        const iface = parts[0];
        if (iface && iface !== 'lo:' && parts.length >= 10) {
            const rx = parseInt(parts[1], 10);
            const tx = parseInt(parts[9], 10);
            if (!isNaN(rx)) totalRx += rx;
            if (!isNaN(tx)) totalTx += tx;
        }
    });

    return { totalRx, totalTx };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1400,
    minHeight: 600,
    title: 'NodeTerm',
    frame: false, // Oculta la barra de título nativa para usar una personalizada
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL(
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : url.format({
          pathname: path.join(__dirname, 'dist', 'index.html'),
          protocol: 'file:',
          slashes: true
        })
  );

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.removeMenu();

  // Menú de desarrollo para abrir DevTools
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Función para detectar todas las distribuciones WSL disponibles
async function detectAllWSLDistributions() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const availableDistributions = [];
    
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
    
    // Obtener lista de distribuciones WSL
    exec('wsl --list --verbose', { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
      console.log('🔍 Detectando distribuciones WSL...');
      
      if (!error && stdout) {
        // Limpiar caracteres null UTF-16 antes de procesar
        const cleanedOutput = stdout.replace(/\u0000/g, '');
        const lines = cleanedOutput.split('\n');
        console.log('🔍 Procesando', lines.length - 1, 'líneas...');
        
        lines.forEach((line) => {
          const trimmed = line.trim();
          
          // Buscar cualquier distribución Linux (excluir docker-desktop y otras herramientas)
          if (trimmed && !trimmed.toLowerCase().includes('docker') && 
              !trimmed.toLowerCase().includes('name') && 
              !trimmed.toLowerCase().includes('state') &&
              trimmed.length > 5) {
                
            // Extraer nombre de la distribución (primer token)
            const tokens = trimmed.split(/\s+/);
            
            if (tokens.length > 0) {
              let distroName = tokens[0].replace('*', '').trim();
              
              if (distroName && distroName !== 'NAME') {
                console.log('🐧 Distribución encontrada:', distroName);
                
                // Buscar en el mapeo exacto o hacer matching parcial
                let distroInfo = distroMapping[distroName];
                
                // Si no hay match exacto, intentar matching parcial
                if (!distroInfo) {
                  const lowerDistroName = distroName.toLowerCase();
                  
                  if (lowerDistroName.includes('ubuntu')) {
                    distroInfo = { executable: 'ubuntu.exe', label: distroName, icon: 'pi pi-circle', category: 'ubuntu' };
                  } else if (lowerDistroName.includes('debian')) {
                    distroInfo = { executable: 'debian.exe', label: 'Debian', icon: 'pi pi-server', category: 'debian' };
                  } else if (lowerDistroName.includes('kali')) {
                    distroInfo = { executable: 'kali.exe', label: 'Kali Linux', icon: 'pi pi-shield', category: 'kali' };
                  } else if (lowerDistroName.includes('alpine')) {
                    distroInfo = { executable: 'alpine.exe', label: 'Alpine Linux', icon: 'pi pi-cloud', category: 'alpine' };
                  } else if (lowerDistroName.includes('opensuse')) {
                    distroInfo = { executable: 'opensuse-15.exe', label: distroName, icon: 'pi pi-cog', category: 'opensuse' };
                  } else if (lowerDistroName.includes('fedora')) {
                    distroInfo = { executable: 'fedora.exe', label: 'Fedora', icon: 'pi pi-bookmark', category: 'fedora' };
                  } else {
                    // Fallback genérico para distribuciones no reconocidas
                    distroInfo = { executable: 'wsl.exe', label: distroName, icon: 'pi pi-desktop', category: 'generic' };
                  }
                }
                
                if (distroInfo) {
                  availableDistributions.push({
                    name: distroName,
                    executable: distroInfo.executable,
                    label: distroInfo.label,
                    icon: distroInfo.icon,
                    category: distroInfo.category,
                    version: distroName.includes('.') || distroName.includes('-') ? distroName.split(/[-_]/)[1] || 'latest' : 'latest'
                  });
                  console.log('✅ Agregada:', distroInfo.label);
                }
              }
            }
          }
        });
      }
      
      // Si no encontramos distribuciones específicas, probar ubuntu.exe como fallback
      if (availableDistributions.length === 0) {
        console.log('🔄 No se encontraron distribuciones WSL, probando ubuntu.exe...');
        exec('ubuntu.exe --help', { timeout: 2000, windowsHide: true }, (ubuntuError) => {
          if (!ubuntuError || ubuntuError.code !== 'ENOENT') {
            console.log('✅ Ubuntu genérico disponible');
            availableDistributions.push({
              name: 'Ubuntu',
              executable: 'ubuntu.exe',
              label: 'Ubuntu',
              icon: 'pi pi-circle',
              category: 'ubuntu',
              version: 'latest'
            });
          }
          console.log('🎯 Distribuciones WSL detectadas:', availableDistributions.length);
          resolve(availableDistributions);
        });
      } else {
        console.log('🎯 Distribuciones WSL detectadas:', availableDistributions.length);
        resolve(availableDistributions);
      }
    });
  });
}

// IPC handler para detectar todas las distribuciones WSL
ipcMain.handle('detect-wsl-distributions', async () => {
  console.log('🚀 Detectando distribuciones WSL...');
  
  try {
    const distributions = await detectAllWSLDistributions();
    console.log('✅ Detección completada:', distributions.length, 'distribuciones encontradas');
    distributions.forEach(distro => console.log(`  - ${distro.label} (${distro.executable})`));
    return distributions;
  } catch (error) {
    console.error('❌ Error en detección de distribuciones WSL:', error);
    return [];
  }
});

// Mantener compatibilidad con el handler anterior para Ubuntu
ipcMain.handle('detect-ubuntu-availability', async () => {
  console.log('🚀 Detectando distribuciones WSL (compatibilidad Ubuntu)...');
  
  try {
    const distributions = await detectAllWSLDistributions();
    console.log('✅ Detección completada:', distributions.length, 'distribuciones encontradas');
    return distributions;
  } catch (error) {
    console.error('❌ Error en detección de distribuciones WSL:', error);
    return [];
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handler para obtener información de versión
ipcMain.handle('get-version-info', () => {
  return {
    appVersion: packageJson.version,
    appName: packageJson.name,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    buildDate: new Date().toLocaleDateString()
  };
});

// IPC handlers para funciones de View
ipcMain.handle('app:reload', () => {
  if (mainWindow) {
    mainWindow.reload();
  }
});

ipcMain.handle('app:force-reload', () => {
  if (mainWindow) {
    mainWindow.webContents.reloadIgnoringCache();
  }
});

ipcMain.handle('app:toggle-dev-tools', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
  }
});

ipcMain.handle('app:zoom-in', () => {
  if (mainWindow) {
    const currentZoom = mainWindow.webContents.getZoomLevel();
    mainWindow.webContents.setZoomLevel(Math.min(currentZoom + 0.5, 3));
  }
});

ipcMain.handle('app:zoom-out', () => {
  if (mainWindow) {
    const currentZoom = mainWindow.webContents.getZoomLevel();
    mainWindow.webContents.setZoomLevel(Math.max(currentZoom - 0.5, -3));
  }
});

ipcMain.handle('app:actual-size', () => {
  if (mainWindow) {
    mainWindow.webContents.setZoomLevel(0);
  }
});

ipcMain.handle('app:toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// IPC handlers para clipboard - Ya están definidos más adelante en el archivo

// IPC handler to establish an SSH connection
ipcMain.on('ssh:connect', async (event, { tabId, config }) => {
  // Para bastiones: usar cacheKey único por destino (permite reutilización)
  // Para SSH directo: usar pooling normal para eficiencia
  const cacheKey = config.useBastionWallix 
    ? `bastion-${config.bastionUser}@${config.bastionHost}->${config.username}@${config.host}:${config.port || 22}`
    : `${config.username}@${config.host}:${config.port || 22}`;
  
  // Aplicar throttling solo para SSH directo (bastiones son únicos)
  if (!config.useBastionWallix) {
    const lastAttempt = connectionThrottle.lastAttempt.get(cacheKey) || 0;
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    
    if (timeSinceLastAttempt < connectionThrottle.minInterval) {
      const waitTime = connectionThrottle.minInterval - timeSinceLastAttempt;
      // console.log(`Throttling conexión SSH directa a ${cacheKey}, esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    connectionThrottle.lastAttempt.set(cacheKey, Date.now());
  } else {
    // console.log(`Conexión bastión - sin throttling (pooling habilitado)`);
  }
  
  // Para bastiones: cada terminal tiene su propia conexión independiente (no pooling)
  // Para SSH directo: usar pooling normal para eficiencia
  let ssh;
  let isReusedConnection = false;

  if (config.useBastionWallix) {
    // BASTIÓN: Usar ssh2 puro para crear una conexión y shell independientes
    // console.log(`Bastión ${cacheKey} - creando nueva conexión con ssh2 (bastion-ssh.js)`);
    const bastionConfig = {
      bastionHost: config.bastionHost,
      port: 22,
      bastionUser: config.bastionUser,
      password: config.password
    };
    let shellStream;
    const { conn } = createBastionShell(
      bastionConfig,
      (data) => {
        sendToRenderer(event.sender, `ssh:data:${tabId}`, data.toString('utf-8'));
      },
      () => {
        sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
        if (sshConnections[tabId] && sshConnections[tabId].statsTimeout) {
          clearTimeout(sshConnections[tabId].statsTimeout);
        }
        sendToRenderer(event.sender, 'ssh-connection-disconnected', {
          originalKey: config.originalKey || tabId,
          tabId: tabId
        });
        // Limpiar estado persistente de bastión al cerrar la pestaña
        delete bastionStatsState[tabId];
        delete sshConnections[tabId];
      },
      (err) => {
        sendToRenderer(event.sender, `ssh:data:${tabId}`, `\r\n[SSH ERROR]: ${err.message || err}\r\n`);
      },
      (stream) => {
        if (sshConnections[tabId]) {
          sshConnections[tabId].stream = stream;
          // Si hay un resize pendiente, aplicarlo ahora
          const pending = sshConnections[tabId]._pendingResize;
          if (pending && stream && !stream.destroyed && typeof stream.setWindow === 'function') {
            const safeRows = Math.max(1, Math.min(300, pending.rows || 24));
            const safeCols = Math.max(1, Math.min(500, pending.cols || 80));
            stream.setWindow(safeRows, safeCols);
            sshConnections[tabId]._pendingResize = null;
          }
          // Lanzar bucle de stats SOLO cuando el stream está listo
          // Solo iniciar stats si esta pestaña está activa
          if (activeStatsTabId === tabId) {
            wallixStatsLoop();
          }
        }
      }
    );
    // Guardar la conexión para gestión posterior (stream se asigna en onShellReady)
    sshConnections[tabId] = {
      ssh: conn,
      stream: undefined,
      config,
      cacheKey,
      originalKey: config.originalKey || tabId,
      previousCpu: null,
      statsTimeout: null,
      previousNet: null,
      previousTime: null,
      statsLoopRunning: false
    };
    
    // Función de bucle de stats para Wallix/bastión
    function wallixStatsLoop() {
      const connObj = sshConnections[tabId];
      if (activeStatsTabId !== tabId) {
        if (connObj) {
          connObj.statsTimeout = null;
          connObj.statsLoopRunning = false;
        }
        return;
      }
      if (!connObj || !connObj.ssh || !connObj.stream) {
        // console.log('[WallixStats] Conexión no disponible, saltando stats');
        return;
      }
      if (connObj.statsLoopRunning) {
        // console.log(`[STATS] Ejecutando wallixStatsLoop para tabId ${tabId} (activo: ${activeStatsTabId})`);
        return;
      }
      
      connObj.statsLoopRunning = true;
      // console.log(`[STATS] Ejecutando wallixStatsLoop para tabId ${tabId} (activo: ${activeStatsTabId})`);

      try {
        // // console.log('[WallixStats] Lanzando bucle de stats para bastión', tabId);
        
        if (connObj.ssh.execCommand) {
          const command = 'grep "cpu " /proc/stat && free -b && df -P && uptime && cat /proc/net/dev && hostname && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo "" && cat /etc/os-release';
          connObj.ssh.execCommand(command, (err, result) => {
            if (err || !result) {
              // console.warn('[WallixStats] Error ejecutando comando:', err);
              // Enviar stats básicas en caso de error
              const fallbackStats = {
                cpu: '0.00',
                mem: { total: 0, used: 0 },
                disk: [],
                uptime: 'Error',
                network: { rx_speed: 0, tx_speed: 0 },
                hostname: 'Bastión',
                distro: 'linux',
                ip: config.host
              };
              sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, fallbackStats);
              
              // Reintentar en 5 segundos
              if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed && activeStatsTabId === tabId) {
                sshConnections[tabId].statsLoopRunning = false;
                sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000);
              } else {
                if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
              }
              return;
            }
            
            const output = result.stdout;
            // // console.log('[WallixStats] Output recibido, length:', output.length);
            // // console.log('[WallixStats] Raw output preview:', JSON.stringify(output.substring(0, 300)));
            
            try {
              const parts = output.trim().split('\n');
              // // console.log('[WallixStats] Parts found:', parts.length);
              // // console.log('[WallixStats] First 5 parts:', parts.slice(0, 5));
              
              // CPU - buscar línea que empiece con "cpu "
              const cpuLineIndex = parts.findIndex(line => line.trim().startsWith('cpu '));
              let cpuLoad = '0.00';
              if (cpuLineIndex >= 0) {
                const cpuLine = parts[cpuLineIndex];
                const cpuTimes = cpuLine.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
                // Usar estado persistente para bastión
                const previousCpu = bastionStatsState[tabId]?.previousCpu;
                if (cpuTimes.length >= 8) {
                  const currentCpu = { user: cpuTimes[0], nice: cpuTimes[1], system: cpuTimes[2], idle: cpuTimes[3], iowait: cpuTimes[4], irq: cpuTimes[5], softirq: cpuTimes[6], steal: cpuTimes[7] };
                  if (previousCpu) {
                    const prevIdle = previousCpu.idle + previousCpu.iowait;
                    const currentIdle = currentCpu.idle + currentCpu.iowait;
                    const prevTotal = Object.values(previousCpu).reduce((a, b) => a + b, 0);
                    const currentTotal = Object.values(currentCpu).reduce((a, b) => a + b, 0);
                    const totalDiff = currentTotal - prevTotal;
                    const idleDiff = currentIdle - prevIdle;
                    if (totalDiff > 0) {
                      cpuLoad = ((totalDiff - idleDiff) * 100 / totalDiff).toFixed(2);
                    }
                  }
                  // Guardar estado persistente para bastión
                  if (!bastionStatsState[tabId]) bastionStatsState[tabId] = {};
                  bastionStatsState[tabId].previousCpu = currentCpu;
                }
              }
              
              // Memoria
              const memLine = parts.find(line => line.startsWith('Mem:')) || '';
              const memParts = memLine.split(/\s+/);
              const mem = {
                total: parseInt(memParts[1], 10) || 0,
                used: parseInt(memParts[2], 10) || 0,
              };
              
              // Disco
              const dfIndex = parts.findIndex(line => line.trim().startsWith('Filesystem'));
              const disks = dfIndex >= 0 ? (function() {
                const lines = parts.slice(dfIndex).filter(l => l.trim() !== '');
                lines.shift(); // Remove header
                return lines.map(line => {
                  const p = line.trim().split(/\s+/);
                  if (p.length >= 6) {
                    const use = parseInt(p[p.length - 2], 10);
                    const name = p[p.length - 1];
                    if (name && name.startsWith('/') && !isNaN(use) && !name.startsWith('/sys') && !name.startsWith('/opt') && !name.startsWith('/run') && name !== '/boot/efi' && !name.startsWith('/dev') && !name.startsWith('/var')) {
                      return { fs: name, use };
                    }
                  }
                  return null;
                }).filter(Boolean);
              })() : [];
              
              // Uptime
              const uptimeLine = parts.find(line => line.includes(' up '));
              let uptime = 'N/A';
              if (uptimeLine) {
                const match = uptimeLine.match(/up (.*?),/);
                if (match && match[1]) {
                  uptime = match[1].trim();
                }
              }
              
              // Network
              const netIndex = parts.findIndex(line => line.trim().includes('Inter-|   Receive'));
              let network = { rx_speed: 0, tx_speed: 0 };
              if (netIndex >= 0) {
                const netLines = parts.slice(netIndex + 2, netIndex + 4);
                let totalRx = 0, totalTx = 0;
                netLines.forEach(line => {
                  const p = line.trim().split(/\s+/);
                  if (p.length >= 10) {
                    totalRx += parseInt(p[1], 10) || 0;
                    totalTx += parseInt(p[9], 10) || 0;
                  }
                });
                // Usar estado persistente para bastión
                const previousNet = bastionStatsState[tabId]?.previousNet;
                const previousTime = bastionStatsState[tabId]?.previousTime;
                const currentTime = Date.now();
                if (previousNet && previousTime) {
                  const timeDiff = (currentTime - previousTime) / 1000;
                  const rxDiff = totalRx - previousNet.totalRx;
                  const txDiff = totalTx - previousNet.totalTx;
                  network.rx_speed = Math.max(0, rxDiff / timeDiff);
                  network.tx_speed = Math.max(0, txDiff / timeDiff);
                }
                if (!bastionStatsState[tabId]) bastionStatsState[tabId] = {};
                bastionStatsState[tabId].previousNet = { totalRx, totalTx };
                bastionStatsState[tabId].previousTime = currentTime;
              }
              
              // Hostname, IP y distro
              let hostname = 'Bastión';
              let finalDistroId = 'linux';
              let ip = '';
              // Buscar hostname real
              const hostnameLineIndex = parts.findIndex(line => 
                line && !line.includes('=') && !line.includes(':') && 
                !line.includes('/') && !line.includes('$') && 
                line.trim().length > 0 && line.trim().length < 50 &&
                !line.includes('cpu') && !line.includes('Mem') && 
                !line.includes('total') && !line.includes('Filesystem')
              );
              if (hostnameLineIndex >= 0 && hostnameLineIndex < parts.length - 5) {
                hostname = parts[hostnameLineIndex].trim();
              }
              // Buscar IP real (línea después de hostname)
              let ipLine = '';
              if (hostnameLineIndex >= 0 && hostnameLineIndex < parts.length - 4) {
                ipLine = parts[hostnameLineIndex + 1]?.trim() || '';
              }
              // Tomar la última IP válida (no 127.0.0.1, no vacía)
              if (ipLine) {
                const ipCandidates = ipLine.split(/\s+/).filter(s => s && s !== '127.0.0.1' && s !== '::1');
                if (ipCandidates.length > 0) {
                  ip = ipCandidates[ipCandidates.length - 1];
                }
              }
              if (!ip) ip = config.host;
              // Buscar distro y versionId en os-release (todo el output)
              let versionId = '';
              try {
                const osReleaseLines = parts;
                let idLine = osReleaseLines.find(line => line.trim().startsWith('ID='));
                let idLikeLine = osReleaseLines.find(line => line.trim().startsWith('ID_LIKE='));
                let versionIdLine = osReleaseLines.find(line => line.trim().startsWith('VERSION_ID='));
                let rawDistro = '';
                if (idLine) {
                  const match = idLine.match(/^ID=("?)([^"\n]*)\1$/);
                  if (match) rawDistro = match[2].toLowerCase();
                }
                if (["rhel", "redhat", "redhatenterpriseserver", "red hat enterprise linux"].includes(rawDistro)) {
                  finalDistroId = "rhel";
                } else if (rawDistro === 'linux' && idLikeLine) {
                  const match = idLikeLine.match(/^ID_LIKE=("?)([^"\n]*)\1$/);
                  const idLike = match ? match[2].toLowerCase() : '';
                  if (idLike.includes('rhel') || idLike.includes('redhat')) {
                    finalDistroId = "rhel";
                  } else {
                    finalDistroId = rawDistro;
                  }
                } else if (rawDistro) {
                  finalDistroId = rawDistro;
                }
                if (versionIdLine) {
                  const match = versionIdLine.match(/^VERSION_ID=("?)([^"\n]*)\1$/);
                  if (match) versionId = match[2];
                }
              } catch (e) {}
              const stats = {
                cpu: cpuLoad,
                mem,
                disk: disks,
                uptime,
                network,
                hostname,
                distro: finalDistroId,
                versionId,
                ip
              };
              
              // // console.log('[WallixStats] Enviando stats:', JSON.stringify(stats, null, 2));
              sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
              
            } catch (parseErr) {
              // console.warn('[WallixStats] Error parseando stats:', parseErr);
            }
            
            // Programar siguiente ejecución
            if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed && activeStatsTabId === tabId) {
              sshConnections[tabId].statsLoopRunning = false;
              sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 2000);
            } else {
              if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
            }
          });
          
        } else {
          // console.warn('[WallixStats] execCommand no disponible en conexión bastión');
          // Fallback con stats básicas
          const stats = {
            cpu: '0.00',
            mem: { total: 0, used: 0 },
            disk: [],
            uptime: 'N/A',
            network: { rx_speed: 0, tx_speed: 0 },
            hostname: 'Bastión',
            distro: 'linux',
            ip: config.host
          };
          sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
        }
        
      } catch (e) {
        // console.warn('[WallixStats] Error general:', e);
        // Reintentar en 5 segundos
        if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed && activeStatsTabId === tabId) {
          sshConnections[tabId].statsLoopRunning = false;
          sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000);
        } else {
          if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
        }
      }
    }
    
    // Asignar la función wallixStatsLoop al objeto de conexión
    sshConnections[tabId].wallixStatsLoop = wallixStatsLoop;
    
    sendToRenderer(event.sender, `ssh:ready:${tabId}`);
    sendToRenderer(event.sender, 'ssh-connection-ready', {
      originalKey: config.originalKey || tabId,
      tabId: tabId
    });
    return;
  } else {
    // SSH DIRECTO: Lógica de pooling normal
    const existingPoolConnection = sshConnectionPool[cacheKey];
    if (existingPoolConnection) {
      try {
        await existingPoolConnection.exec('echo "test"');
        ssh = existingPoolConnection;
        isReusedConnection = true;
        // console.log(`Reutilizando conexión del pool para terminal SSH directo ${cacheKey}`);
      } catch (testError) {
        // console.log(`Conexión del pool no válida para terminal ${cacheKey}, creando nueva...`);
        try {
          existingPoolConnection.close();
        } catch (e) {}
        delete sshConnectionPool[cacheKey];
      }
    }
    if (!ssh) {
      // console.log(`Creando nueva conexión SSH directa para terminal ${cacheKey}`);
      const directConfig = {
        host: config.host,
        username: config.username,
        password: config.password,
        port: config.port || 22
      };
      ssh = new SSH2Promise(directConfig);
      sshConnectionPool[cacheKey] = ssh;
    }
  }

  // Eliminar función statsLoop y llamadas relacionadas
  // const statsLoop = async (hostname, distro, ip) => {
  //   // Verificación robusta de la conexión
  //   const conn = sshConnections[tabId];
  //   if (!conn || !conn.ssh || !conn.stream || conn.stream.destroyed) {
  //     return; // Stop if connection is closed or invalid
  //   }

  //   try {
  //     // --- Get CPU stats first
  //     const cpuStatOutput = await ssh.exec("grep 'cpu ' /proc/stat");
  //     const cpuTimes = cpuStatOutput.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
  //     const currentCpu = { user: cpuTimes[0], nice: cpuTimes[1], system: cpuTimes[2], idle: cpuTimes[3], iowait: cpuTimes[4], irq: cpuTimes[5], softirq: cpuTimes[6], steal: cpuTimes[7] };

  //     let cpuLoad = '0.00';
  //     const previousCpu = sshConnections[tabId].previousCpu;

  //     if (previousCpu) {
  //         const prevIdle = previousCpu.idle + previousCpu.iowait;
  //         const currentIdle = currentCpu.idle + currentCpu.iowait;
  //         const prevTotal = Object.values(previousCpu).reduce((a, b) => a + b, 0);
  //         const currentTotal = Object.values(currentCpu).reduce((a, b) => a + b, 0);
  //         const totalDiff = currentTotal - prevTotal;
  //         const idleDiff = currentIdle - prevIdle;
  //         if (totalDiff > 0) {
  //             cpuLoad = ((totalDiff - idleDiff) * 100 / totalDiff).toFixed(2);
  //         }
  //     }
  //     sshConnections[tabId].previousCpu = currentCpu;

  //     // --- Get Memory, Disk, Uptime and Network stats ---
  //     const allStatsRes = await ssh.exec("free -b && df -P && uptime && cat /proc/net/dev");
  //     const parts = allStatsRes.trim().split('\n');

  //     // Parse Memory
  //     const memLine = parts.find(line => line.startsWith('Mem:'));
  //     const memParts = memLine.split(/\s+/);
  //     const mem = {
  //         total: parseInt(memParts[1], 10),
  //         used: parseInt(memParts[2], 10),
  //     };

  //     // Parse Disk
  //     const dfIndex = parts.findIndex(line => line.trim().startsWith('Filesystem'));
  //     const dfOutput = parts.slice(dfIndex).join('\n');
  //     const disks = parseDfOutput(dfOutput);

  //     // Parse Uptime
  //     const uptimeLine = parts.find(line => line.includes(' up '));
  //     let uptime = '';
  //     if (uptimeLine) {
  //       const match = uptimeLine.match(/up (.*?),/);
  //       if (match && match[1]) {
  //         uptime = match[1].trim();
  //       }
  //     }

  //     // Parse Network
  //     const netIndex = parts.findIndex(line => line.trim().includes('Inter-|   Receive'));
  //     const netOutput = parts.slice(netIndex).join('\n');
  //     const currentNet = parseNetDev(netOutput);
  //     const previousNet = sshConnections[tabId].previousNet;
  //     const previousTime = sshConnections[tabId].previousTime;
  //     const currentTime = Date.now();
  //     let network = { rx_speed: 0, tx_speed: 0 };

  //     if (previousNet && previousTime) {
  //         const timeDiff = (currentTime - previousTime) / 1000; // in seconds
  //         const rxDiff = currentNet.totalRx - previousNet.totalRx;
  //         const txDiff = currentNet.totalTx - previousNet.totalTx;

  //         network.rx_speed = Math.max(0, rxDiff / timeDiff);
  //         network.tx_speed = Math.max(0, txDiff / timeDiff);
  //     }
  //     sshConnections[tabId].previousNet = currentNet;
  //     sshConnections[tabId].previousTime = currentTime;

  //     const stats = { 
  //         cpu: cpuLoad, 
  //         mem, 
  //         disk: disks, 
  //         uptime, 
  //         network, 
  //         hostname: hostname,
  //         distro: distro,
  //         ip: ip
  //     };
  //     sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
  //   } catch (e) {
  //     // console.error(`Error fetching stats for ${tabId}:`, e.message);
  //   } finally {
  //     // Verificar nuevamente que la conexión siga válida antes de programar siguiente loop
  //     const finalConn = sshConnections[tabId];
  //     if (finalConn && finalConn.ssh && finalConn.stream && !finalConn.stream.destroyed) {
  //       finalConn.statsTimeout = setTimeout(() => statsLoop(hostname, distro, ip), 2000);
  //     }
  //   }
  // };

  try {
    // For subsequent connections, send the cached MOTD immediately.
    if (motdCache[cacheKey]) {
      sendToRenderer(event.sender, `ssh:data:${tabId}`, motdCache[cacheKey]);
    }

    // Conectar SSH si es necesario
    if (!isReusedConnection) {
      // Solo conectar si es una conexión nueva (no reutilizada del pool)
      // console.log(`Conectando SSH para terminal ${cacheKey}...`);
      
      // Configurar límites de listeners ANTES de conectar (aumentado para evitar warnings)
      ssh.setMaxListeners(300);
      
      // console.log(`Iniciando conexión SSH para ${cacheKey}...`);
      // console.log(`Configuración: Host=${config.host}, Usuario=${config.username}, Puerto=${config.port || 22}`);
      // if (config.useBastionWallix) {
      //   console.log(`Bastión Wallix: Host=${config.bastionHost}, Usuario=${config.bastionUser}`);
      // }
      
      await ssh.connect();
      // console.log(`Conectado exitosamente a terminal ${cacheKey}`);
      
      // SSH2Promise está conectado y listo para usar
      // console.log('SSH2Promise conectado correctamente, procediendo a crear shell...');
      
      // Guardar en el pool solo para SSH directo (bastiones son independientes)
      if (!config.useBastionWallix) {
        ssh._createdAt = Date.now();
        ssh._lastUsed = Date.now();
        sshConnectionPool[cacheKey] = ssh;
        // console.log(`Conexión SSH directa ${cacheKey} guardada en pool para reutilización`);
      } else {
        // console.log(`Conexión bastión ${cacheKey} - NO guardada en pool (independiente)`);
      }
    } else {
      // console.log(`Usando conexión SSH directa existente del pool para terminal ${cacheKey}`);
    }
    
    // Crear shell con reintentos
    let stream;
    let shellAttempts = 0;
    const maxShellAttempts = 3;
    
    while (shellAttempts < maxShellAttempts) {
      try {
        // Añadir pequeño delay entre intentos
        if (shellAttempts > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * shellAttempts));
        }
        
        // Si es una conexión Wallix, usar configuración específica para bastiones
        if (ssh._isWallixConnection && ssh._wallixTarget) {
          // console.log(`Conexión Wallix detectada: ${config.bastionHost} -> ${ssh._wallixTarget.host}:${ssh._wallixTarget.port}`);
          
          // Para bastiones Wallix, esperar un poco antes de crear shell
          // console.log('Esperando estabilización de conexión Wallix...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // console.log('Creando shell usando SSH2Promise con configuración Wallix...');
          
          // Intentar con configuración específica para Wallix
          try {
            stream = await ssh.shell({
              term: 'xterm-256color',
              cols: 80,
              rows: 24,
              modes: {
                ECHO: 1,
                TTY_OP_ISPEED: 14400,
                TTY_OP_OSPEED: 14400
              }
            });
          } catch (shellError) {
            // console.warn('Error con configuración Wallix, intentando configuración básica:', shellError.message);
            // Fallback con configuración mínima
            stream = await ssh.shell('xterm-256color');
          }
          
          // console.log('Shell de bastión Wallix creado exitosamente');
          
          // Para Wallix, verificar dónde estamos conectados
          // console.log('Verificando estado de conexión Wallix...');
          
          // Enviar comando para verificar hostname
          stream.write('hostname\n');
          
          // Esperar un poco para procesar
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // console.log('Para conexiones Wallix, el bastión maneja automáticamente la conexión al servidor destino');
          
        } else {
          // Conexión SSH directa normal
          // console.log('Creando shell SSH directo...');
          stream = await ssh.shell({ 
            term: 'xterm-256color',
            cols: 80,
            rows: 24
          });
        }
        
        break;
      } catch (shellError) {
        shellAttempts++;
        // console.warn(`Intento ${shellAttempts} de crear shell falló para ${cacheKey}:`, shellError?.message || shellError || 'Unknown error');
        
        if (shellAttempts >= maxShellAttempts) {
          throw new Error(`No se pudo crear shell después de ${maxShellAttempts} intentos: ${shellError?.message || shellError || 'Unknown error'}`);
        }
      }
    }
    
    // Configurar límites de listeners para el stream
    stream.setMaxListeners(0); // Sin límite para streams individuales

    const storedOriginalKey = config.originalKey || tabId;
    // console.log('Guardando conexión SSH con originalKey:', storedOriginalKey, 'para tabId:', tabId);
    sshConnections[tabId] = { 
      ssh, 
      stream, 
      config, 
      cacheKey, 
      originalKey: storedOriginalKey,
      previousCpu: null, 
      statsTimeout: null, 
      previousNet: null, 
      previousTime: null 
    };
    // Log para depuración: mostrar todos los tabId activos
    // console.log('[DEBUG] Conexiones SSH activas:', Object.keys(sshConnections));

    // Lanzar statsLoop para conexiones SSH directas (no bastion)
    if (!config.useBastionWallix) {
      let realHostname = 'unknown';
      let osRelease = '';
      try {
        realHostname = (await ssh.exec('hostname')).trim();
      } catch (e) {}
      try {
        osRelease = await ssh.exec('cat /etc/os-release');
      } catch (e) { osRelease = 'ID=linux'; }
      const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
      const finalDistroId = distroId.replace(/"/g, '').toLowerCase();
      // Si ya hay un statsTimeout para este tabId, lo limpio antes de lanzar uno nuevo
      if (sshConnections[tabId].statsTimeout) {
        clearTimeout(sshConnections[tabId].statsTimeout);
      }
      statsLoop(tabId, realHostname, finalDistroId, config.host);
    }

    // Set up the data listener immediately to capture the MOTD
    let isFirstPacket = true;
    stream.on('data', (data) => {
      try {
        const dataStr = data.toString('utf-8');

        if (isFirstPacket) {
          isFirstPacket = false;
          // If the MOTD is not cached yet (it's the first-ever connection)
          if (!motdCache[cacheKey]) {
            motdCache[cacheKey] = dataStr; // Cache it
            sendToRenderer(event.sender, `ssh:data:${tabId}`, dataStr); // And send it
          }
          // If it was already cached, we've already sent the cached version.
          // We do nothing here, effectively suppressing the duplicate message.
          
                    // La configuración original ya funciona correctamente
          return; 
        }
        
        // For all subsequent packets, just send them
        sendToRenderer(event.sender, `ssh:data:${tabId}`, dataStr);
      } catch (e) {
        // log o ignora
      }
    });

    stream.on('close', () => {
      sendToRenderer(event.sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
      const conn = sshConnections[tabId];
      if (conn && conn.statsTimeout) {
          clearTimeout(conn.statsTimeout);
      }
      
      // Enviar evento de desconexión
      const disconnectOriginalKey = conn?.originalKey || tabId;
      // console.log('🔌 SSH desconectado - enviando evento para originalKey:', disconnectOriginalKey);
      sendToRenderer(event.sender, 'ssh-connection-disconnected', { 
        originalKey: disconnectOriginalKey,
        tabId: tabId 
      });
      
      delete sshConnections[tabId];
    });



    sendToRenderer(event.sender, `ssh:ready:${tabId}`);
    
    // Enviar evento de conexión exitosa
    const originalKey = config.originalKey || tabId;
    // console.log('✅ SSH conectado - enviando evento para originalKey:', originalKey);
    sendToRenderer(event.sender, 'ssh-connection-ready', { 
      originalKey: originalKey,
      tabId: tabId 
    });

    // After setting up the shell, get the hostname/distro and start the stats loop
    // let realHostname = 'unknown';
    // let osRelease = '';
    // try {
    //   realHostname = (await ssh.exec('hostname')).trim();
    // } catch (e) {
    //   // Si falla, dejamos 'unknown'
    // }
    // try {
    //   osRelease = await ssh.exec('cat /etc/os-release');
    // } catch (e) {
    //   osRelease = 'ID=linux'; // fallback si no existe el archivo
    // }
    // const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
    // const finalDistroId = distroId.replace(/"/g, '').toLowerCase();
    // statsLoop(tabId, realHostname, finalDistroId, config.host);

  } catch (err) {
    // console.error(`Error en conexión SSH para ${tabId}:`, err);
    
    // Limpiar conexión problemática del pool
    if (ssh && cacheKey && sshConnectionPool[cacheKey] === ssh) {
      try {
        ssh.close();
      } catch (closeError) {
        // Ignorar errores de cierre
      }
      delete sshConnectionPool[cacheKey];
    }
    
    // Crear mensaje de error más descriptivo
    let errorMsg = 'Error desconocido al conectar por SSH';
    if (err) {
      if (typeof err === 'string') {
        errorMsg = err;
      } else if (err.message) {
        errorMsg = err.message;
      } else if (err.code) {
        errorMsg = `Error de conexión: ${err.code}`;
      } else {
        try {
          errorMsg = JSON.stringify(err);
        } catch (jsonError) {
          errorMsg = 'Error de conexión SSH';
        }
      }
    }
    
    sendToRenderer(event.sender, `ssh:error:${tabId}`, errorMsg);
    
    // Enviar evento de error de conexión
    const errorOriginalKey = config.originalKey || tabId;
    // console.log('❌ SSH error - enviando evento para originalKey:', errorOriginalKey, 'error:', errorMsg);
    sendToRenderer(event.sender, 'ssh-connection-error', { 
      originalKey: errorOriginalKey,
      tabId: tabId,
      error: errorMsg 
    });
  }
});

// IPC handler to send data to the SSH shell
ipcMain.on('ssh:data', (event, { tabId, data }) => {
  const conn = sshConnections[tabId];
  if (conn && conn.stream && !conn.stream.destroyed) {
    conn.stream.write(data);
  }
});

// IPC handler to handle terminal resize
ipcMain.on('ssh:resize', (event, { tabId, rows, cols }) => {
    const conn = sshConnections[tabId];
    if (conn) {
        // Guardar el último tamaño solicitado
        conn._pendingResize = { rows, cols };
        if (conn.stream && !conn.stream.destroyed) {
            try {
                const safeRows = Math.max(1, Math.min(300, rows || 24));
                const safeCols = Math.max(1, Math.min(500, cols || 80));
                conn.stream.setWindow(safeRows, safeCols);
                conn._pendingResize = null; // Aplicado correctamente
            } catch (resizeError) {
                // console.warn(`Error redimensionando terminal ${tabId}:`, resizeError?.message || resizeError || 'Unknown error');
            }
        }
    }
});

// IPC handler to terminate an SSH connection
ipcMain.on('ssh:disconnect', (event, tabId) => {
  const conn = sshConnections[tabId];
  if (conn) {
    try {
      // Limpiar timeout de stats
      if (conn.statsTimeout) {
        clearTimeout(conn.statsTimeout);
        conn.statsTimeout = null;
      }
      
      // Para conexiones Wallix, solo necesitamos cerrar el stream principal
      if (conn.ssh && conn.ssh._isWallixConnection) {
        // console.log('Cerrando conexión Wallix');
      }
      
      // Limpiar listeners del stream de forma más agresiva
      if (conn.stream) {
        try {
          conn.stream.removeAllListeners();
          if (!conn.stream.destroyed) {
            conn.stream.destroy();
          }
        } catch (streamError) {
          // console.warn(`Error destroying stream: ${streamError?.message || streamError || 'Unknown error'}`);
        }
      }
      
      // Verificar si otras pestañas están usando la misma conexión SSH
      const otherTabsUsingConnection = Object.values(sshConnections)
        .filter(c => c !== conn && c.cacheKey === conn.cacheKey);
      
      // Solo cerrar la conexión SSH si no hay otras pestañas usándola
      // (Para bastiones, cada terminal es independiente, así que siempre cerrar)
      if (otherTabsUsingConnection.length === 0 && conn.ssh && conn.cacheKey) {
        try {
                // console.log(`Cerrando conexión SSH compartida para ${conn.cacheKey} (última pestaña)`);
      
      // Enviar evento de desconexión
      const disconnectOriginalKey = conn.originalKey || conn.cacheKey;
      // console.log('🔌 SSH cerrado - enviando evento para originalKey:', disconnectOriginalKey);
      sendToRenderer(event.sender, 'ssh-connection-disconnected', { 
        originalKey: disconnectOriginalKey
      });
      
      // Limpiar listeners específicos de la conexión SSH de forma más selectiva
      if (conn.ssh.ssh) {
        // Solo remover listeners específicos en lugar de todos
        conn.ssh.ssh.removeAllListeners('error');
        conn.ssh.ssh.removeAllListeners('close');
        conn.ssh.ssh.removeAllListeners('end');
      }
      
      // Limpiar listeners del SSH2Promise también
      conn.ssh.removeAllListeners('error');
      conn.ssh.removeAllListeners('close');
      conn.ssh.removeAllListeners('end');
      
      conn.ssh.close();
      delete sshConnectionPool[conn.cacheKey];
        } catch (closeError) {
          // console.warn(`Error closing SSH connection: ${closeError?.message || closeError || 'Unknown error'}`);
        }
      } else {
        // console.log(`Manteniendo conexión SSH para ${conn.cacheKey} (${otherTabsUsingConnection.length} pestañas restantes)`);
      }
      
    } catch (error) {
      // console.error(`Error cleaning up SSH connection ${tabId}:`, error);
    } finally {
      // Always delete the connection
      delete sshConnections[tabId];
    }
  }
});

// Permite cerrar la app desde el renderer (React) usando ipcRenderer
ipcMain.on('app-quit', () => {
  isAppQuitting = true;
  
  // Close all SSH connections and clear timeouts before quitting
  Object.values(sshConnections).forEach(conn => {
    if (conn.statsTimeout) {
      clearTimeout(conn.statsTimeout);
    }
    if (conn.stream) {
      try {
        conn.stream.removeAllListeners();
        if (!conn.stream.destroyed) {
          conn.stream.destroy();
        }
      } catch (e) {
        // Ignorar errores
      }
    }
    if (conn.ssh) {
      try {
        if (conn.ssh.ssh) {
          // Limpiar listeners específicos en lugar de todos en app-quit
          conn.ssh.ssh.removeAllListeners('error');
          conn.ssh.ssh.removeAllListeners('close');
          conn.ssh.ssh.removeAllListeners('end');
        }
        // Limpiar listeners del SSH2Promise también
        conn.ssh.removeAllListeners('error');
        conn.ssh.removeAllListeners('close');
        conn.ssh.removeAllListeners('end');
        conn.ssh.close();
      } catch (e) {
        // Ignorar errores
      }
    }
  });
  
  // Limpiar también el pool de conexiones con mejor limpieza
  Object.values(sshConnectionPool).forEach(poolConn => {
    try {
      // Limpiar listeners del pool también
      poolConn.removeAllListeners('error');
      poolConn.removeAllListeners('close');
      poolConn.removeAllListeners('end');
      if (poolConn.ssh) {
        poolConn.ssh.removeAllListeners('error');
        poolConn.ssh.removeAllListeners('close');
        poolConn.ssh.removeAllListeners('end');
      }
      poolConn.close();
    } catch (e) {
      // Ignorar errores
    }
  });
  
  app.quit();
});

// Limpieza robusta también en before-quit
app.on('before-quit', () => {
  isAppQuitting = true;
  
  Object.values(sshConnections).forEach(conn => {
    if (conn.statsTimeout) {
      clearTimeout(conn.statsTimeout);
    }
    if (conn.stream) {
      try {
        conn.stream.removeAllListeners();
        if (!conn.stream.destroyed) {
          conn.stream.destroy();
        }
      } catch (e) {
        // Ignorar errores
      }
    }
    if (conn.ssh) {
      try {
        if (conn.ssh.ssh) {
          // Limpiar listeners específicos en lugar de todos en before-quit
          conn.ssh.ssh.removeAllListeners('error');
          conn.ssh.ssh.removeAllListeners('close');
          conn.ssh.ssh.removeAllListeners('end');
        }
        // Limpiar listeners del SSH2Promise también
        conn.ssh.removeAllListeners('error');
        conn.ssh.removeAllListeners('close');
        conn.ssh.removeAllListeners('end');
        conn.ssh.close();
      } catch (e) {
        // Ignorar errores
      }
    }
  });
  
  // Limpiar también el pool de conexiones con mejor limpieza
  Object.values(sshConnectionPool).forEach(poolConn => {
    try {
      // Limpiar listeners del pool también
      poolConn.removeAllListeners('error');
      poolConn.removeAllListeners('close');
      poolConn.removeAllListeners('end');
      if (poolConn.ssh) {
        poolConn.ssh.removeAllListeners('error');
        poolConn.ssh.removeAllListeners('close');
        poolConn.ssh.removeAllListeners('end');
      }
      poolConn.close();
    } catch (e) {
      // Ignorar errores
    }
  });
});

// Clipboard IPC Handlers
ipcMain.handle('clipboard:readText', () => {
  return clipboard.readText();
});

ipcMain.handle('clipboard:writeText', (event, text) => {
  clipboard.writeText(text);
});

// Handler para mostrar el diálogo de guardado
ipcMain.handle('dialog:show-save-dialog', async (event, options) => {
  const win = BrowserWindow.getFocusedWindow();
  return await dialog.showSaveDialog(win, options);
});

// Handler para descargar archivos por SSH

ipcMain.handle('ssh:download-file', async (event, { tabId, remotePath, localPath, sshConfig }) => {
  try {
    if (sshConfig.useBastionWallix) {
      // Construir string de conexión Wallix para SFTP
      // Formato: <USER>@<BASTION>::<TARGET>@<DEVICE>::<SERVICE>
      // En la mayoría de los casos, bastionUser ya tiene el formato correcto
      const sftp = new SftpClient();
      const connectConfig = {
        host: sshConfig.bastionHost,
        port: sshConfig.port || 22,
        username: sshConfig.bastionUser, // Wallix espera el string especial aquí
        password: sshConfig.password,
        readyTimeout: 20000,
      };
      await sftp.connect(connectConfig);
      await sftp.fastGet(remotePath, localPath);
      await sftp.end();
      return { success: true };
    } else {
      // SSH directo
      const ssh = new SSH2Promise(sshConfig);
      await ssh.connect();
      const sftp = await ssh.sftp();
      await new Promise((resolve, reject) => {
        const writeStream = require('fs').createWriteStream(localPath);
        const readStream = sftp.createReadStream(remotePath);
        readStream.pipe(writeStream);
        readStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
      });
      await ssh.close();
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: err.message || err };
  }
});

ipcMain.handle('ssh:upload-file', async (event, { tabId, localPath, remotePath, sshConfig }) => {
  try {
    const SftpClient = require('ssh2-sftp-client');
    const sftp = new SftpClient();
    let connectConfig;
    if (sshConfig.useBastionWallix) {
      // Bastion: usar string Wallix
      connectConfig = {
        host: sshConfig.bastionHost,
        port: sshConfig.port || 22,
        username: sshConfig.bastionUser,
        password: sshConfig.password,
        readyTimeout: 20000,
      };
    } else {
      // SSH directo
      connectConfig = {
        host: sshConfig.host,
        port: sshConfig.port || 22,
        username: sshConfig.username,
        password: sshConfig.password,
        readyTimeout: 20000,
      };
    }
    await sftp.connect(connectConfig);
    await sftp.fastPut(localPath, remotePath);
    await sftp.end();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || err };
  }
});

ipcMain.handle('ssh:delete-file', async (event, { tabId, remotePath, isDirectory, sshConfig }) => {
  try {
    const SftpClient = require('ssh2-sftp-client');
    const sftp = new SftpClient();
    let connectConfig;
    if (sshConfig.useBastionWallix) {
      connectConfig = {
        host: sshConfig.bastionHost,
        port: sshConfig.port || 22,
        username: sshConfig.bastionUser,
        password: sshConfig.password,
        readyTimeout: 20000,
      };
    } else {
      connectConfig = {
        host: sshConfig.host,
        port: sshConfig.port || 22,
        username: sshConfig.username,
        password: sshConfig.password,
        readyTimeout: 20000,
      };
    }
    await sftp.connect(connectConfig);
    if (isDirectory) {
      // Eliminar directorio recursivamente
      await sftp.rmdir(remotePath, true);
    } else {
      // Eliminar archivo
      await sftp.delete(remotePath);
    }
    await sftp.end();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || err };
  }
});

ipcMain.handle('ssh:create-directory', async (event, { tabId, remotePath, sshConfig }) => {
  try {
    const SftpClient = require('ssh2-sftp-client');
    const sftp = new SftpClient();
    let connectConfig;
    if (sshConfig.useBastionWallix) {
      connectConfig = {
        host: sshConfig.bastionHost,
        port: sshConfig.port || 22,
        username: sshConfig.bastionUser,
        password: sshConfig.password,
        readyTimeout: 20000,
      };
    } else {
      connectConfig = {
        host: sshConfig.host,
        port: sshConfig.port || 22,
        username: sshConfig.username,
        password: sshConfig.password,
        readyTimeout: 20000,
      };
    }
    await sftp.connect(connectConfig);
    await sftp.mkdir(remotePath, true); // true = recursive
    await sftp.end();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || err };
  }
});

// Function to safely send to mainWindow
function sendToRenderer(sender, eventName, ...args) {
  try {
    if (sender && typeof sender.isDestroyed === 'function' && !sender.isDestroyed()) {
      // Solo logear eventos SSH para debugging
      if (eventName.startsWith('ssh-connection-')) {
        // console.log('📡 Enviando evento SSH:', eventName, 'con args:', args);
      }
      sender.send(eventName, ...args);
    } else {
      // console.error('Sender no válido o destruido para evento:', eventName);
    }
  } catch (error) {
    // console.error('Error sending to renderer:', eventName, error);
  }
}

// Función para limpiar conexiones huérfanas del pool cada 10 minutos
function cleanupOrphanedConnections() {
  Object.keys(sshConnectionPool).forEach(cacheKey => {
    const poolConnection = sshConnectionPool[cacheKey];
    // Verificar si hay alguna conexión activa usando esta conexión del pool
    const hasActiveConnections = Object.values(sshConnections).some(conn => conn.cacheKey === cacheKey);
    
    if (!hasActiveConnections) {
      // console.log(`Limpiando conexión SSH huérfana: ${cacheKey}`);
      try {
        // Limpiar listeners antes de cerrar
        poolConnection.removeAllListeners('error');
        poolConnection.removeAllListeners('close');
        poolConnection.removeAllListeners('end');
        if (poolConnection.ssh) {
          poolConnection.ssh.removeAllListeners('error');
          poolConnection.ssh.removeAllListeners('close');
          poolConnection.ssh.removeAllListeners('end');
        }
        poolConnection.close();
      } catch (e) {
        // Ignorar errores de cierre
      }
      delete sshConnectionPool[cacheKey];
    }
  });
}

// Ejecutar limpieza cada 10 minutos
setInterval(cleanupOrphanedConnections, 10 * 60 * 1000);

// Helper function to find SSH connection by host/username or by tabId
async function findSSHConnection(tabId, sshConfig = null) {
  // Primero intentar por tabId (para conexiones directas de terminal)
  if (sshConnections[tabId]) {
    return sshConnections[tabId];
  }
  
  // Si no existe por tabId y tenemos sshConfig, buscar cualquier conexión al mismo servidor
  if (sshConfig && sshConfig.host && sshConfig.username) {
    // Para bastiones: buscar cualquier conexión activa al mismo destino via bastión
    if (sshConfig.useBastionWallix) {
      // Buscar en conexiones activas cualquier conexión que vaya al mismo destino via bastión
      for (const conn of Object.values(sshConnections)) {
        if (conn.config && 
            conn.config.useBastionWallix &&
            conn.config.bastionHost === sshConfig.bastionHost &&
            conn.config.bastionUser === sshConfig.bastionUser &&
            conn.config.host === sshConfig.host &&
            conn.config.username === sshConfig.username &&
            (conn.config.port || 22) === (sshConfig.port || 22)) {
          // Aquí antes había un console.log(` incompleto que causaba error de sintaxis
          // Si se desea loggear, usar una línea válida como:
          // console.log('Conexión encontrada para bastion:', conn);
          return conn;
        }
      }
    }
  }
  // Si no se encuentra, retornar null
  return null;
}

// --- INICIO BLOQUE RESTAURACIÓN STATS ---
// Función de statsLoop para conexiones directas (SSH2Promise)
async function statsLoop(tabId, realHostname, finalDistroId, host) {
  const conn = sshConnections[tabId];
  if (activeStatsTabId !== tabId) {
    if (conn) {
      conn.statsTimeout = null;
    }
    return;
  }
  // Eliminar o comentar console.log(`[STATS] Ejecutando statsLoop para tabId ${tabId} (activo: ${activeStatsTabId})`);
  if (!conn || !conn.ssh || !conn.stream || conn.stream.destroyed) {
    return;
  }
  try {
    // CPU
    const cpuStatOutput = await conn.ssh.exec("grep 'cpu ' /proc/stat");
    const cpuTimes = cpuStatOutput.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
    let cpuLoad = '0.00';
    const currentCpu = { user: cpuTimes[0], nice: cpuTimes[1], system: cpuTimes[2], idle: cpuTimes[3], iowait: cpuTimes[4], irq: cpuTimes[5], softirq: cpuTimes[6], steal: cpuTimes[7] };
    const previousCpu = conn.previousCpu;
    if (previousCpu) {
      const prevIdle = previousCpu.idle + previousCpu.iowait;
      const currentIdle = currentCpu.idle + currentCpu.iowait;
      const prevTotal = Object.values(previousCpu).reduce((a, b) => a + b, 0);
      const currentTotal = Object.values(currentCpu).reduce((a, b) => a + b, 0);
      const totalDiff = currentTotal - prevTotal;
      const idleDiff = currentIdle - prevIdle;
      if (totalDiff > 0) {
        cpuLoad = ((totalDiff - idleDiff) * 100 / totalDiff).toFixed(2);
      }
    }
    conn.previousCpu = currentCpu;
    // Memoria, disco, uptime, red
    const allStatsRes = await conn.ssh.exec("free -b && df -P && uptime && cat /proc/net/dev && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo ''");
    const parts = allStatsRes.trim().split('\n');
    // Memoria
    const memLine = parts.find(line => line.startsWith('Mem:')) || '';
    const memParts = memLine.split(/\s+/);
    const mem = {
      total: parseInt(memParts[1], 10) || 0,
      used: parseInt(memParts[2], 10) || 0,
    };
    // Disco
    const dfIndex = parts.findIndex(line => line.trim().startsWith('Filesystem'));
    const dfOutput = parts.slice(dfIndex).join('\n');
    const disks = parseDfOutput(dfOutput);
    // Uptime
    const uptimeLine = parts.find(line => line.includes(' up '));
    let uptime = '';
    if (uptimeLine) {
      const match = uptimeLine.match(/up (.*?),/);
      if (match && match[1]) {
        uptime = match[1].trim();
      }
    }
    // Red
    const netIndex = parts.findIndex(line => line.trim().includes('Inter-|   Receive'));
    const netOutput = parts.slice(netIndex).join('\n');
    const currentNet = parseNetDev(netOutput);
    const previousNet = conn.previousNet;
    const previousTime = conn.previousTime;
    const currentTime = Date.now();
    let network = { rx_speed: 0, tx_speed: 0 };
    if (previousNet && previousTime) {
      const timeDiff = (currentTime - previousTime) / 1000;
      const rxDiff = currentNet.totalRx - previousNet.totalRx;
      const txDiff = currentNet.totalTx - previousNet.totalTx;
      network.rx_speed = Math.max(0, rxDiff / timeDiff);
      network.tx_speed = Math.max(0, txDiff / timeDiff);
    }
    conn.previousNet = currentNet;
    conn.previousTime = currentTime;
    // Buscar IP real (última línea, tomar la última IP válida)
    let ip = '';
    if (parts.length > 0) {
      const ipLine = parts[parts.length - 1].trim();
      const ipCandidates = ipLine.split(/\s+/).filter(s => s && s !== '127.0.0.1' && s !== '::1');
      if (ipCandidates.length > 0) {
        ip = ipCandidates[ipCandidates.length - 1];
      }
    }
    if (!ip) ip = host;
    // Normalización de distro (RedHat) y obtención de versionId
    let versionId = '';
    try {
      // Buscar ID, ID_LIKE y VERSION_ID en todo el output
      const osReleaseLines = parts;
      let idLine = osReleaseLines.find(line => line.trim().startsWith('ID='));
      let idLikeLine = osReleaseLines.find(line => line.trim().startsWith('ID_LIKE='));
      let versionIdLine = osReleaseLines.find(line => line.trim().startsWith('VERSION_ID='));
      let rawDistro = '';
      if (idLine) {
        const match = idLine.match(/^ID=("?)([^"\n]*)\1$/);
        if (match) rawDistro = match[2].toLowerCase();
      }
      if (["rhel", "redhat", "redhatenterpriseserver", "red hat enterprise linux"].includes(rawDistro)) {
        finalDistroId = "rhel";
      } else if (rawDistro === 'linux' && idLikeLine) {
        const match = idLikeLine.match(/^ID_LIKE=("?)([^"\n]*)\1$/);
        const idLike = match ? match[2].toLowerCase() : '';
        if (idLike.includes('rhel') || idLike.includes('redhat')) {
          finalDistroId = "rhel";
        } else {
          finalDistroId = rawDistro;
        }
      } else if (rawDistro) {
        finalDistroId = rawDistro;
      }
      if (versionIdLine) {
        const match = versionIdLine.match(/^VERSION_ID=("?)([^"\n]*)\1$/);
        if (match) versionId = match[2];
      }
    } catch (e) {}
    const stats = {
      cpu: cpuLoad,
      mem,
      disk: disks,
      uptime,
      network,
      hostname: realHostname,
      distro: finalDistroId,
      versionId,
      ip
    };
    // Actualizar los valores en la conexión para que siempre estén correctos al reactivar la pestaña
    conn.realHostname = realHostname;
    conn.finalDistroId = finalDistroId;
    // LOG DEBUG: Enviar stats a cada tabId
    // console.log('[DEBUG][BACKEND] Enviando stats a', `ssh-stats:update:${tabId}`, JSON.stringify(stats));
    sendToRenderer(mainWindow.webContents, `ssh-stats:update:${tabId}`, stats);
  } catch (e) {
    // Silenciar errores de stats
  } finally {
    const finalConn = sshConnections[tabId];
    if (finalConn && finalConn.ssh && finalConn.stream && !finalConn.stream.destroyed) {
      finalConn.statsTimeout = setTimeout(() => statsLoop(tabId, realHostname, finalDistroId, host), statusBarPollingIntervalMs);
    }
  }
}
// --- FIN BLOQUE RESTAURACIÓN STATS ---

let activeStatsTabId = null;

ipcMain.on('ssh:set-active-stats-tab', (event, tabId) => {
  activeStatsTabId = tabId;
  Object.entries(sshConnections).forEach(([id, conn]) => {
    if (id !== String(tabId)) {
      if (conn.statsTimeout) {
        clearTimeout(conn.statsTimeout);
        conn.statsTimeout = null;
      }
      conn.statsLoopRunning = false;
    }
  });
  const conn = sshConnections[tabId];
  if (conn && !conn.statsTimeout && !conn.statsLoopRunning) {
    if (conn.config.useBastionWallix) {
      if (typeof conn.wallixStatsLoop === 'function') {
        conn.wallixStatsLoop();
      }
    } else {
      if (typeof statsLoop === 'function') {
        statsLoop(tabId, conn.realHostname || 'unknown', conn.finalDistroId || 'linux', conn.config.host);
      }
    }
  }
});

let statusBarPollingIntervalMs = 5000;
ipcMain.on('statusbar:set-polling-interval', (event, intervalSec) => {
  const sec = Math.max(1, Math.min(20, parseInt(intervalSec, 10) || 5));
  statusBarPollingIntervalMs = sec * 1000;
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.handle('window:maximize', () => {
  if (mainWindow) mainWindow.maximize();
});
ipcMain.handle('window:unmaximize', () => {
  if (mainWindow) mainWindow.unmaximize();
});
ipcMain.handle('window:isMaximized', () => {
  if (mainWindow) return mainWindow.isMaximized();
  return false;
});
ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

// === PowerShell Terminal Support ===
const pty = require('node-pty');

let powershellProcesses = {}; // Cambiar a objeto para múltiples procesos
let wslProcesses = {}; // Cambiar a objeto para múltiples procesos

// Start PowerShell session
ipcMain.on('powershell:start', (event, { cols, rows }) => {
  const tabId = 'default'; // Fallback para compatibilidad
  startPowerShellSession(tabId, { cols, rows });
});

// Start PowerShell session with tab ID
function startPowerShellSession(tabId, { cols, rows }) {
  // No iniciar nuevos procesos si la app está cerrando
  if (isAppQuitting) {
    console.log(`Evitando iniciar PowerShell para ${tabId} - aplicación cerrando`);
    return;
  }
  
  try {
    // Verificar si ya hay un proceso activo
    if (powershellProcesses[tabId]) {
      console.log(`PowerShell ya existe para ${tabId}, reutilizando proceso existente`);
      
      // Simular mensaje de bienvenida y refrescar prompt para procesos reutilizados
      if (mainWindow && mainWindow.webContents) {
        const welcomeMsg = '\r\n\x1b[32m=== Sesión PowerShell reutilizada ===\x1b[0m\r\n';
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
      // Usar Windows PowerShell directamente para mayor estabilidad
      shell = 'powershell.exe';
      args = ['-NoExit'];
    } else {
      // For non-Windows platforms, try pwsh (PowerShell Core)
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
    
    // En Windows, usar configuración específica para evitar ConPTY
    if (os.platform() === 'win32') {
      spawnOptions.useConpty = false;              // Deshabilitar ConPTY completamente
      spawnOptions.conptyLegacy = false;           // No usar ConPTY legacy
      spawnOptions.experimentalUseConpty = false;  // Deshabilitar experimental
      spawnOptions.backend = 'winpty';             // Forzar uso de WinPTY
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
        // línea eliminada: console.log(`Intentando configuración ${i + 1}/${configsToTry.length} para PowerShell ${tabId}...`);
        powershellProcesses[tabId] = pty.spawn(shell, args, configsToTry[i]);
        spawnSuccess = true;
        // línea eliminada: console.log(`Configuración ${i + 1} exitosa para PowerShell ${tabId}`);
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
          // línea eliminada: console.log(`SafeWindowsTerminal exitoso para ${tabId}`);
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
      console.log(`PowerShell process for tab ${tabId} exited with code:`, exitCode, 'signal:', signal, 'type:', typeof exitCode);
      
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
      
      console.log(`PowerShell ${tabId} actual exit code:`, actualExitCode);
      
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
        // Para terminaciones normales (código 0) o errores (código 1), no reiniciar automáticamente
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
      powershellProcesses[tabId].pty.on('error', (error) => {
        if (error.message && error.message.includes('AttachConsole failed')) {
          console.warn(`Error AttachConsole en PowerShell ${tabId}:`, error.message);
        } else {
          console.error(`Error en proceso PowerShell ${tabId}:`, error);
        }
      });
    }

    // Send ready signal
    // setTimeout(() => {
    //   if (mainWindow && mainWindow.webContents) {
    //     mainWindow.webContents.send(`powershell:ready:${tabId}`);
    //   }
    // }, 500);

    // línea eliminada: console.log(`PowerShell ${tabId} iniciado exitosamente`);

  } catch (error) {
    console.error(`Error starting PowerShell for tab ${tabId}:`, error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(`powershell:error:${tabId}`, `Failed to start PowerShell: ${error.message}`);
    }
  }
}

// Start PowerShell session with specific tab ID - Global listener with auto-registration
ipcMain.on(/^powershell:start:(.+)$/, (event, { cols, rows }) => {
  const channel = event.senderFrame ? event.channel : arguments[1];
  const tabId = channel.split(':')[2];
  
  // Registrar eventos para este tab si no están registrados
  if (!registeredTabEvents.has(tabId)) {
    registerTabEvents(tabId);
  }
  
  startPowerShellSession(tabId, { cols, rows });
});

// Using only tab-specific PowerShell handlers for better control

// Funciones de manejo para PowerShell
function handlePowerShellStart(tabId, { cols, rows }) {
  startPowerShellSession(tabId, { cols, rows });
}

function handlePowerShellData(tabId, data) {
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
}

function handlePowerShellResize(tabId, { cols, rows }) {
  if (powershellProcesses[tabId]) {
    try {
      powershellProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing PowerShell ${tabId}:`, error);
    }
  }
}

function handlePowerShellStop(tabId) {
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
        // En sistemas POSIX, usar SIGTERM
        process.kill('SIGTERM');
        
        // Dar tiempo para que termine graciosamente
        setTimeout(() => {
          if (powershellProcesses[tabId]) {
            try {
              powershellProcesses[tabId].kill('SIGKILL');
            } catch (e) {
              // Ignorar errores de terminación forzada
            }
          }
        }, 1000);
      }
      
      delete powershellProcesses[tabId];
    } catch (error) {
      console.error(`Error stopping PowerShell ${tabId}:`, error);
    }
  }
}

// === WSL Terminal Support ===

// Start WSL session
ipcMain.on('wsl:start', (event, { cols, rows }) => {
  const tabId = 'default';
  handleWSLStart(tabId, { cols, rows });
});

// Send data to WSL
ipcMain.on('wsl:data', (event, data) => {
  const tabId = 'default';
  handleWSLData(tabId, data);
});

// Resize WSL terminal
ipcMain.on('wsl:resize', (event, { cols, rows }) => {
  const tabId = 'default';
  handleWSLResize(tabId, { cols, rows });
});

// Stop WSL session
ipcMain.on('wsl:stop', () => {
  const tabId = 'default';
  handleWSLStop(tabId);
});

// Funciones de manejo para WSL
function handleWSLStart(tabId, { cols, rows }) {
  startWSLSession(tabId, { cols, rows });
}

function startWSLSession(tabId, { cols, rows }) {
  // No iniciar nuevos procesos si la app está cerrando
  if (isAppQuitting) {
    console.log(`Evitando iniciar WSL para ${tabId} - aplicación cerrando`);
    return;
  }
  
  try {
    // Kill existing process if any
    if (wslProcesses[tabId]) {
      try {
        wslProcesses[tabId].kill();
      } catch (e) {
        console.error(`Error killing existing WSL process for tab ${tabId}:`, e);
      }
    }

    // Determine shell and arguments for WSL
    let shell, args;
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Use WSL on Windows
      shell = 'wsl.exe';
      args = ['--cd', '~']; // Start in home directory
    } else {
      // For non-Windows platforms, use bash directly
      shell = '/bin/bash';
      args = ['--login'];
    }

    // Múltiples configuraciones para WSL genérico
    const wslConfigurations = [
      // Configuración 1: ConPTY deshabilitado con WinPTY
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
        windowsHide: false,
        useConpty: false,
        conptyLegacy: false,
        experimentalUseConpty: false,
        backend: 'winpty'
      },
      // Configuración 2: Conservativa básica
      {
        name: 'xterm',
        cols: cols || 80,
        rows: rows || 24,
        cwd: os.homedir(),
        env: process.env,
        windowsHide: false,
        useConpty: false
      },
      // Configuración 3: Mínima
      {
        name: 'xterm',
        cols: cols || 80,
        rows: rows || 24,
        windowsHide: false
      }
    ];

    let spawnSuccess = false;
    let lastError = null;

    // Intentar cada configuración hasta que una funcione
    for (let i = 0; i < wslConfigurations.length && !spawnSuccess; i++) {
      try {
        // console.log(`Intentando configuración ${i + 1}/${wslConfigurations.length} para WSL genérico ${tabId}...`); // Eliminado por limpieza de logs
        wslProcesses[tabId] = pty.spawn(shell, args, wslConfigurations[i]);
        // console.log(`Configuración ${i + 1} exitosa para WSL genérico ${tabId}`); // Eliminado por limpieza de logs
        spawnSuccess = true;
      } catch (spawnError) {
        console.warn(`Configuración ${i + 1} falló para WSL genérico ${tabId}:`, spawnError.message);
        lastError = spawnError;
        
        // Limpiar proceso fallido si existe
        if (wslProcesses[tabId]) {
          try {
            wslProcesses[tabId].kill();
          } catch (e) {
            // Ignorar errores de limpieza
          }
          delete wslProcesses[tabId];
        }
      }
    }

    if (!spawnSuccess) {
      throw new Error(`No se pudo iniciar WSL genérico para ${tabId} después de probar todas las configuraciones: ${lastError?.message || 'Error desconocido'}`);
    }

    // Handle WSL output
    wslProcesses[tabId].onData((data) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`wsl:data:${tabId}`, data);
      }
    });

    // Handle WSL exit
    wslProcesses[tabId].onExit((exitCode, signal) => {
      console.log(`WSL process for tab ${tabId} exited with code:`, exitCode, 'signal:', signal, 'type:', typeof exitCode);
      
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
      
      console.log(`WSL ${tabId} actual exit code:`, actualExitCode);
      
      // Limpiar el proceso actual
      delete wslProcesses[tabId];
      
      // Determinar si necesita reinicio automático (solo para errores específicos de ConPTY)
      const needsRestart = actualExitCode === -1073741510; // Error específico de ConPTY
      const isNormalExit = actualExitCode === 0 || actualExitCode === 1;
      
      if (needsRestart) {
        console.log(`WSL ${tabId} falló con error de ConPTY, reiniciando en 2 segundos...`);
        setTimeout(() => {
          if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
            console.log(`Reiniciando WSL ${tabId} después de error de ConPTY...`);
            startWSLSession(tabId, { cols: cols || 120, rows: rows || 30 });
          }
        }, 2000);
      } else if (isNormalExit) {
        // Para terminaciones normales, reiniciar automáticamente después de un delay corto
        console.log(`WSL ${tabId} terminó normalmente, reiniciando en 1 segundo...`);
        setTimeout(() => {
          if (!isAppQuitting && mainWindow && mainWindow.webContents) {
            console.log(`Reiniciando WSL ${tabId}...`);
            // Usar las dimensiones originales o por defecto
            const originalCols = cols || 120;
            const originalRows = rows || 30;
            startWSLSession(tabId, { cols: originalCols, rows: originalRows });
          }
        }, 1000);
      } else {
        // Solo reportar como error si no es una terminación normal
        if (mainWindow && mainWindow.webContents) {
          const exitCodeStr = typeof exitCode === 'object' ? JSON.stringify(exitCode) : String(exitCode);
          mainWindow.webContents.send(`wsl:error:${tabId}`, `WSL process exited with code ${exitCodeStr}`);
        }
      }
    });

    // Send ready signal
    // setTimeout(() => {
    //   if (mainWindow && mainWindow.webContents) {
    //     mainWindow.webContents.send(`wsl:ready:${tabId}`);
    //   }
    // }, 500);

  } catch (error) {
    console.error(`Error starting WSL for tab ${tabId}:`, error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(`wsl:error:${tabId}`, `Failed to start WSL: ${error.message}`);
    }
  }
}

function handleWSLData(tabId, data) {
  if (wslProcesses[tabId]) {
    try {
      wslProcesses[tabId].write(data);
    } catch (error) {
      console.error(`Error writing to WSL ${tabId}:`, error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`wsl:error:${tabId}`, `Write error: ${error.message}`);
      }
    }
  }
}

function handleWSLResize(tabId, { cols, rows }) {
  if (wslProcesses[tabId]) {
    try {
      wslProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing WSL ${tabId}:`, error);
    }
  }
}

function handleWSLStop(tabId) {
  if (wslProcesses[tabId]) {
    try {
      console.log(`Deteniendo proceso WSL para tab ${tabId}`);
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
        // En sistemas POSIX, usar SIGTERM
        process.kill('SIGTERM');
        
        // Dar tiempo para que termine graciosamente
        setTimeout(() => {
          if (wslProcesses[tabId]) {
            try {
              wslProcesses[tabId].kill('SIGKILL');
            } catch (e) {
              // Ignorar errores de terminación forzada
            }
          }
        }, 1000);
      }
      
      delete wslProcesses[tabId];
    } catch (error) {
      console.error(`Error stopping WSL ${tabId}:`, error);
    }
  }
}

// === WSL Distributions Terminal Support ===

// Store active WSL distribution processes
const wslDistroProcesses = {};

// Store active Ubuntu processes (for backward compatibility)
const ubuntuProcesses = {};

// Función para detectar si Ubuntu está disponible
function detectUbuntuAvailability() {
  return new Promise((resolve) => {
    const platform = os.platform();
    console.log('🔍 Detectando Ubuntu, plataforma:', platform);
    
    if (platform !== 'win32') {
      // En sistemas no Windows, verificar si bash está disponible
      const { spawn } = require('child_process');
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
      const { spawn } = require('child_process');
      console.log('🔍 Verificando ubuntu en Windows...');
      
      const ubuntuCheck = spawn('ubuntu', ['--help'], { 
        stdio: 'pipe',
        windowsHide: true 
      });
      
      let resolved = false;
      
      ubuntuCheck.on('close', (code) => {
        if (!resolved) {
          resolved = true;
                  console.log('🟢 Ubuntu check completed with code:', code);
        // Ubuntu devuelve código 0 cuando está disponible
        // También puede devolver null o undefined en algunos casos válidos
        const isAvailable = (code === 0 || code === null || code === undefined);
        console.log('🔍 Ubuntu detectado como disponible:', isAvailable);
          resolve(isAvailable);
        }
      });
      
      ubuntuCheck.on('error', (error) => {
        if (!resolved) {
          resolved = true;
                  console.log('❌ Ubuntu check error:', error.message);
        // Si ubuntu no existe, devolverá ENOENT
          resolve(false);
        }
      });
      
      ubuntuCheck.on('exit', (code, signal) => {
        if (!resolved) {
          resolved = true;
          console.log('🚪 Ubuntu exit with code:', code, 'signal:', signal);
          const isAvailable = (code === 0 || code === null || code === undefined);
          console.log('🔍 Ubuntu detectado como disponible (exit):', isAvailable);
          resolve(isAvailable);
        }
      });
      
      // Capturar stdout/stderr para debug
      let output = '';
      let errorOutput = '';
      
      ubuntuCheck.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      ubuntuCheck.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      // Timeout de 5 segundos (más tiempo para Windows)
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log('⏰ Ubuntu check timeout');
          console.log('📝 Output:', output.substring(0, 200));
          console.log('📝 Error output:', errorOutput.substring(0, 200));
          ubuntuCheck.kill();
          resolve(false);
        }
      }, 5000);
    }
  });
}

// Funciones de manejo para distribuciones WSL (genéricas)
function handleWSLDistroStart(tabId, { cols, rows, distroInfo }) {
    startWSLDistroSession(tabId, { cols, rows, distroInfo });
}

// Funciones de manejo para Ubuntu (compatibilidad)
function handleUbuntuStart(tabId, { cols, rows, ubuntuInfo }) {
    // Convertir ubuntuInfo a distroInfo para usar la función genérica
    const distroInfo = ubuntuInfo ? {
        ...ubuntuInfo,
        category: 'ubuntu'
    } : null;
    
    startWSLDistroSession(tabId, { cols, rows, distroInfo });
}

// Función genérica para iniciar cualquier distribución WSL
function startWSLDistroSession(tabId, { cols, rows, distroInfo }) {
    if (isAppQuitting) {
        console.log(`Evitando iniciar distribución WSL para ${tabId} - aplicación cerrando`);
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
        
        // Usar el ejecutable específico de la distribución
        if (distroInfo && distroInfo.executable) {
            shell = distroInfo.executable;
            console.log(`🎯 Usando ejecutable específico: ${shell} para ${distroInfo.label || distroInfo.name}`);
        } else {
            // Fallback a wsl.exe genérico
            shell = 'wsl.exe';
            console.log('⚠️ Sin info específica, usando wsl.exe genérico');
        }
        
        args = []; // Las distribuciones WSL funcionan mejor sin argumentos específicos

        // Environment variables
        const env = {
            ...process.env,
        };

        // Múltiples configuraciones para mayor compatibilidad con WSL
        const wslConfigurations = [
            // Configuración 1: Por defecto con ConPTY deshabilitado
            {
                env,
                cwd: undefined,
                name: 'xterm-color',
                cols: cols,
                rows: rows,
                encoding: null,
                useConpty: false,
                windowsHide: false
            },
            // Configuración 2: Conservativa sin ConPTY 
            {
                env,
                cwd: undefined,
                name: 'xterm',
                cols: cols || 80,
                rows: rows || 24,
                encoding: null,
                useConpty: false,
                conptyLegacy: false,
                experimentalUseConpty: false,
                windowsHide: false
            },
            // Configuración 3: Mínima
            {
                env,
                cwd: undefined,
                name: 'xterm',
                cols: cols || 80,
                rows: rows || 24,
                windowsHide: false
            }
        ];

        let spawnSuccess = false;
        let lastError = null;

        // Intentar cada configuración hasta que una funcione
        for (let i = 0; i < wslConfigurations.length && !spawnSuccess; i++) {
            try {
                // console.log(`Intentando configuración ${i + 1}/${wslConfigurations.length} para WSL ${shell} ${tabId}...`); // Eliminado por limpieza de logs
                wslDistroProcesses[tabId] = pty.spawn(shell, args, wslConfigurations[i]);
                console.log(`Configuración ${i + 1} exitosa para WSL ${shell} ${tabId}`);
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
            // Send ready only on first data reception
            if (!wslDistroProcesses[tabId]._hasReceivedData) {
                wslDistroProcesses[tabId]._hasReceivedData = true;
                console.log(`WSL terminal ${shell} ready for ${tabId}`);
                if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
                    const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                    mainWindow.webContents.send(`${channelName}:ready:${tabId}`);
                }
            }
            
            if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
                const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                mainWindow.webContents.send(`${channelName}:data:${tabId}`, data);
            }
        });

        // Handle distribution exit  
        wslDistroProcesses[tabId].onExit((exitCode, signal) => {
            console.log(`WSL ${shell} (${tabId}) exited with code:`, exitCode, 'signal:', signal);

            if (isAppQuitting) {
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
                    if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
                        console.log(`Reiniciando WSL ${shell} (${tabId}) después de error de ConPTY...`);
                        startWSLDistroSession(tabId, { cols: cols || 80, rows: rows || 24, distroInfo });
                    }
                }, 2000);
            } else if (exitCode !== 0 && exitCode !== null) {
                console.warn(`WSL distro process for tab ${tabId} exited unexpectedly`);
                const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                mainWindow.webContents.send(`${channelName}:error:${tabId}`,
                    `${distroInfo?.label || 'WSL Distribution'} session ended unexpectedly (code: ${actualExitCode})`);
            }

            // Clean up
            delete wslDistroProcesses[tabId];
        });

        // Ready will be sent when first data is received (see onData handler above)
        console.log(`WSL terminal ${shell} configured for ${tabId}, waiting for data...`);

    } catch (error) {
        console.error(`Error starting WSL distro session for tab ${tabId}:`, error);
        if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
            const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
            mainWindow.webContents.send(`${channelName}:error:${tabId}`,
                `Failed to start ${distroInfo?.label || 'WSL Distribution'}: ${error.message}`);
        }
    }
}

// Función original para Ubuntu (para compatibilidad)
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
    
    // Para Ubuntu, usar configuración simple sin modificaciones ConPTY
    // Ubuntu funciona mejor con configuración por defecto
    
    ubuntuProcesses[tabId] = pty.spawn(shell, args, spawnOptions);

    // Handle Ubuntu output
    ubuntuProcesses[tabId].onData((data) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`ubuntu:data:${tabId}`, data);
      }
    });

    // Handle Ubuntu exit
    ubuntuProcesses[tabId].onExit((exitCode, signal) => {
      console.log(`Ubuntu process for tab ${tabId} exited with code:`, exitCode, 'signal:', signal);
      
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
        console.warn(`Ubuntu process for tab ${tabId} exited unexpectedly`);
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send(`ubuntu:error:${tabId}`, 
            `Ubuntu session ended unexpectedly (code: ${actualExitCode})`);
        }
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

// Funciones de manejo para distribuciones WSL genéricas
function handleWSLDistroData(tabId, data) {
  // Intentar primero con WSL distro processes
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].write(data);
    } catch (error) {
      console.error(`Error writing to WSL distro ${tabId}:`, error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`wsl-distro:error:${tabId}`, `Write error: ${error.message}`);
      }
    }
  } else {
    console.warn(`No WSL distro process found for ${tabId}`);
  }
}

function handleUbuntuData(tabId, data) {
  // Si hay un proceso en wslDistroProcesses, usarlo (nuevo sistema)
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].write(data);
    } catch (error) {
      console.error(`Error writing to Ubuntu ${tabId}:`, error);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`ubuntu:error:${tabId}`, `Write error: ${error.message}`);
      }
    }
  } else if (ubuntuProcesses[tabId]) {
    // Fallback al sistema legacy de Ubuntu
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

function handleWSLDistroResize(tabId, { cols, rows }) {
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing WSL distro ${tabId}:`, error);
    }
  }
}

function handleUbuntuResize(tabId, { cols, rows }) {
  // Si hay un proceso en wslDistroProcesses, usarlo (nuevo sistema)
  if (wslDistroProcesses[tabId]) {
    try {
      wslDistroProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing Ubuntu ${tabId}:`, error);
    }
  } else if (ubuntuProcesses[tabId]) {
    // Fallback al sistema legacy de Ubuntu
    try {
      ubuntuProcesses[tabId].resize(cols, rows);
    } catch (error) {
      console.error(`Error resizing Ubuntu ${tabId}:`, error);
    }
  }
}

function handleWSLDistroStop(tabId) {
  if (wslDistroProcesses[tabId]) {
    try {
      console.log(`Deteniendo proceso WSL distro para tab ${tabId}`);
      const process = wslDistroProcesses[tabId];
      
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
            console.warn(`Error con destroy() en WSL distro ${tabId}:`, destroyError.message);
          }
        }
      } else {
        // En sistemas POSIX, usar SIGTERM
        process.kill('SIGTERM');
        
        // Dar tiempo para que termine graciosamente
        setTimeout(() => {
          if (wslDistroProcesses[tabId]) {
            try {
              wslDistroProcesses[tabId].kill('SIGKILL');
            } catch (e) {
              // Ignorar errores de terminación forzada
            }
          }
        }, 1000);
      }
      
      delete wslDistroProcesses[tabId];
    } catch (error) {
      console.error(`Error stopping WSL distro ${tabId}:`, error);
    }
  }
}

function handleUbuntuStop(tabId) {
  // Si hay un proceso en wslDistroProcesses, usarlo (nuevo sistema)
  if (wslDistroProcesses[tabId]) {
    try {
      console.log(`Deteniendo proceso Ubuntu para tab ${tabId} (nuevo sistema)`);
      const process = wslDistroProcesses[tabId];
      
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
            console.warn(`Error con destroy() en Ubuntu ${tabId}:`, destroyError.message);
          }
        }
      } else {
        // En sistemas POSIX, usar SIGTERM
        process.kill('SIGTERM');
        
        // Dar tiempo para que termine graciosamente
        setTimeout(() => {
          if (wslDistroProcesses[tabId]) {
            try {
              wslDistroProcesses[tabId].kill('SIGKILL');
            } catch (e) {
              // Ignorar errores de terminación forzada
            }
          }
        }, 1000);
      }
      
      delete wslDistroProcesses[tabId];
    } catch (error) {
      console.error(`Error stopping Ubuntu ${tabId}:`, error);
    }
  } else if (ubuntuProcesses[tabId]) {
    try {
      console.log(`Deteniendo proceso Ubuntu para tab ${tabId}`);
      const process = ubuntuProcesses[tabId];
      
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
            console.warn(`Error con destroy() en Ubuntu ${tabId}:`, destroyError.message);
          }
        }
      } else {
        // En sistemas POSIX, usar SIGTERM
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
      }
      
      delete ubuntuProcesses[tabId];
    } catch (error) {
      console.error(`Error stopping Ubuntu ${tabId}:`, error);
    }
  }
}

// Función de detección alternativa más simple
function detectUbuntuSimple() {
  return new Promise((resolve) => {
    const platform = os.platform();
    console.log('🔧 Función de detección simple iniciada, plataforma:', platform);
    
    if (platform !== 'win32') {
      // En sistemas no Windows, asumir que bash está disponible
      resolve(true);
    } else {
          // En Windows, intentar ejecutar ubuntu de forma más directa
    const { exec } = require('child_process');
    
    exec('ubuntu', { 
        timeout: 3000,
        windowsHide: true 
      }, (error, stdout, stderr) => {
        console.log('🔧 Exec ubuntu result:');
        console.log('   Error:', error?.code || 'none');
        console.log('   Stdout length:', stdout?.length || 0);
        console.log('   Stderr length:', stderr?.length || 0);
        
        // Si no hay error ENOENT, significa que ubuntu existe
        const isAvailable = !error || error.code !== 'ENOENT';
        console.log('🔧 Ubuntu detectado (simple):', isAvailable);
        resolve(isAvailable);
      });
    }
  });
}

// Set para trackear tabs con eventos registrados
const registeredTabEvents = new Set();

// Sistema de registro dinámico para eventos de pestañas
function registerTabEvents(tabId) {
  registeredTabEvents.add(tabId);
  // PowerShell events
  ipcMain.removeAllListeners(`powershell:start:${tabId}`);
  ipcMain.removeAllListeners(`powershell:data:${tabId}`);
  ipcMain.removeAllListeners(`powershell:resize:${tabId}`);
  ipcMain.removeAllListeners(`powershell:stop:${tabId}`);
  
  ipcMain.on(`powershell:start:${tabId}`, (event, data) => {
    handlePowerShellStart(tabId, data);
  });
  
  ipcMain.on(`powershell:data:${tabId}`, (event, data) => {
    handlePowerShellData(tabId, data);
  });
  
  ipcMain.on(`powershell:resize:${tabId}`, (event, data) => {
    handlePowerShellResize(tabId, data);
  });
  
  ipcMain.on(`powershell:stop:${tabId}`, (event) => {
    handlePowerShellStop(tabId);
  });
  
  // WSL events
  ipcMain.removeAllListeners(`wsl:start:${tabId}`);
  ipcMain.removeAllListeners(`wsl:data:${tabId}`);
  ipcMain.removeAllListeners(`wsl:resize:${tabId}`);
  ipcMain.removeAllListeners(`wsl:stop:${tabId}`);
  
  ipcMain.on(`wsl:start:${tabId}`, (event, data) => {
    handleWSLStart(tabId, data);
  });
  
  ipcMain.on(`wsl:data:${tabId}`, (event, data) => {
    handleWSLData(tabId, data);
  });
  
  ipcMain.on(`wsl:resize:${tabId}`, (event, data) => {
    handleWSLResize(tabId, data);
  });
  
  ipcMain.on(`wsl:stop:${tabId}`, (event) => {
    handleWSLStop(tabId);
  });
  
  // Ubuntu events
  ipcMain.removeAllListeners(`ubuntu:start:${tabId}`);
  ipcMain.removeAllListeners(`ubuntu:data:${tabId}`);
  ipcMain.removeAllListeners(`ubuntu:resize:${tabId}`);
  ipcMain.removeAllListeners(`ubuntu:stop:${tabId}`);
  
  ipcMain.on(`ubuntu:start:${tabId}`, (event, data) => {
    handleUbuntuStart(tabId, data);
  });
  
  ipcMain.on(`ubuntu:data:${tabId}`, (event, data) => {
    handleUbuntuData(tabId, data);
  });
  
  ipcMain.on(`ubuntu:resize:${tabId}`, (event, data) => {
    handleUbuntuResize(tabId, data);
  });
  
  ipcMain.on(`ubuntu:stop:${tabId}`, (event) => {
    handleUbuntuStop(tabId);
  });
  
  // WSL Distribution events (generic for all non-Ubuntu distributions)
  ipcMain.removeAllListeners(`wsl-distro:start:${tabId}`);
  ipcMain.removeAllListeners(`wsl-distro:data:${tabId}`);
  ipcMain.removeAllListeners(`wsl-distro:resize:${tabId}`);
  ipcMain.removeAllListeners(`wsl-distro:stop:${tabId}`);
  
  ipcMain.on(`wsl-distro:start:${tabId}`, (event, data) => {
    handleWSLDistroStart(tabId, data);
  });
  
  ipcMain.on(`wsl-distro:data:${tabId}`, (event, data) => {
    handleWSLDistroData(tabId, data);
  });
  
  ipcMain.on(`wsl-distro:resize:${tabId}`, (event, data) => {
    handleWSLDistroResize(tabId, data);
  });
  
  ipcMain.on(`wsl-distro:stop:${tabId}`, (event) => {
    handleWSLDistroStop(tabId);
  });
}



// Evento para registrar nuevas pestañas
ipcMain.on('register-tab-events', (event, tabId) => {
  // console.log(`Registering events for tab: ${tabId}`); // Eliminado por limpieza de logs
  registerTabEvents(tabId);
});

// Using dynamic tab registration instead of predefined tabs

// Cleanup terminals on app quit
app.on('before-quit', (event) => {
  isAppQuitting = true;
  
  // Cleanup all PowerShell processes
  Object.keys(powershellProcesses).forEach(tabId => {
    try {
      const process = powershellProcesses[tabId];
      if (process) {
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
              console.warn(`Error con destroy() en PowerShell ${tabId} on quit:`, destroyError.message);
            }
          }
        } else {
          process.kill('SIGTERM');
          // Terminación forzada después de 500ms en sistemas POSIX
          setTimeout(() => {
            if (powershellProcesses[tabId]) {
              try {
                powershellProcesses[tabId].kill('SIGKILL');
              } catch (e) {
                // Ignorar errores
              }
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error(`Error cleaning up PowerShell ${tabId} on quit:`, error);
    }
  });
  
  // Cleanup all WSL processes
  Object.keys(wslProcesses).forEach(tabId => {
    try {
      const process = wslProcesses[tabId];
      if (process) {
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
              console.warn(`Error con destroy() en WSL ${tabId} on quit:`, destroyError.message);
            }
          }
        } else {
          process.kill('SIGTERM');
          // Terminación forzada después de 500ms en sistemas POSIX
          setTimeout(() => {
            if (wslProcesses[tabId]) {
              try {
                wslProcesses[tabId].kill('SIGKILL');
              } catch (e) {
                // Ignorar errores
              }
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error(`Error cleaning up WSL ${tabId} on quit:`, error);
    }
  });
  
  // Cleanup all Ubuntu processes
  Object.keys(ubuntuProcesses).forEach(tabId => {
    try {
      const process = ubuntuProcesses[tabId];
      if (process) {
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
              console.warn(`Error con destroy() en Ubuntu ${tabId} on quit:`, destroyError.message);
            }
          }
        } else {
          process.kill('SIGTERM');
          // Terminación forzada después de 500ms en sistemas POSIX
          setTimeout(() => {
            if (ubuntuProcesses[tabId]) {
              try {
                ubuntuProcesses[tabId].kill('SIGKILL');
              } catch (e) {
                // Ignorar errores
              }
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error(`Error cleaning up Ubuntu ${tabId} on quit:`, error);
    }
  });
});

// Sistema de estadísticas del sistema con datos reales
async function getSystemStats() {
  const platform = os.platform();
  const stats = {
    cpu: {
      usage: 0,
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Desconocido'
    },
    memory: {
      used: 0,
      total: 0,
      percentage: 0
    },
    disks: [],
    network: {
      download: 0,
      upload: 0
    },
    temperature: {
      cpu: 0,
      gpu: 0
    }
  };

  // Memoria (siempre funciona con os nativo)
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  stats.memory.total = Math.round(totalMem / (1024 * 1024 * 1024) * 10) / 10;
  stats.memory.used = Math.round(usedMem / (1024 * 1024 * 1024) * 10) / 10;
  stats.memory.percentage = Math.round((usedMem / totalMem) * 100 * 10) / 10;

  // CPU con timeout individual
  try {
    const cpuData = await Promise.race([
      si.currentLoad(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('CPU timeout')), 3000))
    ]);
    stats.cpu.usage = Math.round(cpuData.currentLoad * 10) / 10;
    stats.cpu.cores = cpuData.cpus.length;
  } catch (error) {}

  // Discos con timeout individual
  try {
    const diskData = await Promise.race([
      si.fsSize(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Disk timeout')), 5000))
    ]);
    if (diskData && diskData.length > 0) {
      stats.disks = diskData.map(disk => ({
        name: disk.fs,
        used: Math.round(disk.used / (1024 * 1024 * 1024) * 10) / 10,
        total: Math.round(disk.size / (1024 * 1024 * 1024) * 10) / 10,
        percentage: Math.round((disk.used / disk.size) * 100)
      }));
    }
  } catch (error) {}

  // Red diferencial (solo interfaces activas y físicas, Mbps)
  try {
    const netIfaces = await si.networkInterfaces();
    const netStats = await si.networkStats();
    const now = Date.now();
    // Filtrar solo interfaces físicas y activas
    const validIfaces = netIfaces.filter(i => i.operstate === 'up' && !i.virtual && !i.internal);
    const validNames = validIfaces.map(i => i.iface);
    const filteredStats = netStats.filter(s => validNames.includes(s.iface));
    let rx = 0, tx = 0;
    if (lastNetStats && lastNetTime) {
      // Sumar la diferencia de bytes para todas las interfaces válidas
      for (const stat of filteredStats) {
        const prev = lastNetStats.find(s => s.iface === stat.iface);
        if (prev) {
          rx += Math.max(0, stat.rx_bytes - prev.rx_bytes);
          tx += Math.max(0, stat.tx_bytes - prev.tx_bytes);
        }
      }
      const dt = (now - lastNetTime) / 1000; // segundos
      if (dt > 0) {
        // Convertir a Mbps (1 byte = 8 bits, 1e6 bits = 1 Mbit)
        stats.network.download = Math.round((rx * 8 / 1e6) / dt * 10) / 10;
        stats.network.upload = Math.round((tx * 8 / 1e6) / dt * 10) / 10;
      }
    }
    // Guardar para la próxima llamada
    lastNetStats = filteredStats.map(s => ({ iface: s.iface, rx_bytes: s.rx_bytes, tx_bytes: s.tx_bytes }));
    lastNetTime = now;
  } catch (error) {}

  // Temperatura con timeout individual
  try {
    const tempData = await Promise.race([
      si.cpuTemperature(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Temperature timeout')), 2000))
    ]);
    stats.temperature.cpu = tempData.main || 0;
  } catch (error) {}

  return stats;
}

// Historial de conexiones
let connectionHistory = {
  recent: [],
  favorites: []
};

// Cargar historial de conexiones
function loadConnectionHistory() {
  try {
    const historyPath = path.join(os.homedir(), '.nodeterm', 'connection_history.json');
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      connectionHistory = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error cargando historial de conexiones:', error);
  }
}

// Guardar historial de conexiones
function saveConnectionHistory() {
  try {
    const historyDir = path.join(os.homedir(), '.nodeterm');
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    
    const historyPath = path.join(historyDir, 'connection_history.json');
    fs.writeFileSync(historyPath, JSON.stringify(connectionHistory, null, 2));
  } catch (error) {
    console.error('Error guardando historial de conexiones:', error);
  }
}

// Agregar conexión al historial
function addToConnectionHistory(connection) {
  const historyItem = {
    id: Date.now().toString(),
    name: connection.name || `${connection.username}@${connection.host}`,
    host: connection.host,
    username: connection.username,
    port: connection.port || 22,
    lastConnected: new Date(),
    status: 'success',
    connectionTime: Math.random() * 3 + 0.5 // Simular tiempo de conexión
  };
  
  // Remover entrada existente si ya existe
  connectionHistory.recent = connectionHistory.recent.filter(
    item => !(item.host === connection.host && item.username === connection.username && item.port === (connection.port || 22))
  );
  
  // Agregar al inicio
  connectionHistory.recent.unshift(historyItem);
  
  // Mantener solo las últimas 10 conexiones
  connectionHistory.recent = connectionHistory.recent.slice(0, 10);
  
  saveConnectionHistory();
}

// Manejadores IPC para historial de conexiones
ipcMain.handle('get-connection-history', async () => {
  loadConnectionHistory();
  return connectionHistory;
});

ipcMain.handle('add-connection-to-history', async (event, connection) => {
  addToConnectionHistory(connection);
  return true;
});

ipcMain.handle('toggle-favorite-connection', async (event, connectionId) => {
  try {
    loadConnectionHistory();
    
    // Buscar en recientes
    const recentIndex = connectionHistory.recent.findIndex(conn => conn.id === connectionId);
    if (recentIndex !== -1) {
      const connection = connectionHistory.recent[recentIndex];
      if (connection.isFavorite) {
        // Quitar de favoritos
        connection.isFavorite = false;
        connectionHistory.favorites = connectionHistory.favorites.filter(fav => fav.id !== connectionId);
      } else {
        // Agregar a favoritos
        connection.isFavorite = true;
        connectionHistory.favorites.push({ ...connection });
      }
    }
    
    saveConnectionHistory();
    return connectionHistory;
  } catch (error) {
    console.error('Error toggle favorite connection:', error);
    return connectionHistory;
  }
});

// Inicializar historial al inicio
loadConnectionHistory();

// Variables estáticas para el cálculo diferencial de red
let lastNetStats = null;
let lastNetTime = null;

// --- Worker persistente para stats ---
let statsWorker = null;
let statsWorkerReady = false;
let statsWorkerQueue = [];

function startStatsWorker() {
  if (statsWorker) {
    try { statsWorker.kill(); } catch {}
    statsWorker = null;
    statsWorkerReady = false;
  }
  statsWorker = fork(path.join(__dirname, 'system-stats-worker.js'));
  statsWorkerReady = true;
  statsWorker.on('exit', () => {
    statsWorkerReady = false;
    // Reiniciar automáticamente si muere
    setTimeout(startStatsWorker, 1000);
  });
  statsWorker.on('message', (msg) => {
    if (statsWorkerQueue.length > 0) {
      const { resolve, timeout } = statsWorkerQueue.shift();
      clearTimeout(timeout);
      if (msg.type === 'stats') {
        resolve(msg.data);
      } else {
        resolve({
          cpu: { usage: 0, cores: 0, model: 'Error' },
          memory: { used: 0, total: 0, percentage: 0 },
          disks: [],
          network: { download: 0, upload: 0 },
          temperature: { cpu: 0, gpu: 0 }
        });
      }
    }
  });
}

startStatsWorker();

ipcMain.handle('get-system-stats', async () => {
  return new Promise((resolve) => {
    if (!statsWorkerReady) {
      // Si el worker no está listo, devolver fallback
      resolve({
        cpu: { usage: 0, cores: 0, model: 'NoWorker' },
        memory: { used: 0, total: 0, percentage: 0 },
        disks: [],
        network: { download: 0, upload: 0 },
        temperature: { cpu: 0, gpu: 0 }
      });
      return;
    }
    const timeout = setTimeout(() => {
      resolve({
        cpu: { usage: 0, cores: 0, model: 'Timeout' },
        memory: { used: 0, total: 0, percentage: 0 },
        disks: [],
        network: { download: 0, upload: 0 },
        temperature: { cpu: 0, gpu: 0 }
      });
    }, 7000);
    statsWorkerQueue.push({ resolve, timeout });
    try {
      statsWorker.send('get-stats');
    } catch (e) {
      clearTimeout(timeout);
      resolve({
        cpu: { usage: 0, cores: 0, model: 'ErrorSend' },
        memory: { used: 0, total: 0, percentage: 0 },
        disks: [],
        network: { download: 0, upload: 0 },
        temperature: { cpu: 0, gpu: 0 }
      });
    }
  });
});