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
      // Asegurar que code sea un nÃºmero vÃ¡lido
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
      //console.log(`SafeWindowsTerminal actual exit code:`, exitCode);
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
// ðŸš¨ VERIFICACIÃ“N CRÃTICA DE CAMBIOS APLICADOS
// (logs temporales eliminados)
// ============================================
const os = require('os');
const fs = require('fs');
const SSH2Promise = require('ssh2-promise');
const { NodeSSH } = require('node-ssh');
const packageJson = require('./package.json');
const { createBastionShell } = require('./src/components/bastion-ssh');
const RdpManager = require('./src/utils/RdpManager');
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
      // Buscar la conexiÃ³n existente para bastion
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
        // LOGS DE DEPURACIÃ“N
        // console.log('[ssh:get-home-directory][BASTION] output bruto:', JSON.stringify(output));
        // Split por lÃ­neas ANTES de limpiar
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
    // ValidaciÃ³n robusta de path
    let safePath = '/';
    if (typeof path === 'string') {
      safePath = path;
    } else if (path && typeof path.path === 'string') {
      safePath = path.path;
    } else {
      // console.warn('ssh:list-files: path invÃ¡lido recibido:', path);
    }

    let ssh;
    let shouldCloseConnection = false;

    if (sshConfig.useBastionWallix) {
      // Buscar la conexiÃ³n existente para bastion
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
        // Eliminar cÃ³digos ANSI
        cleanOutput = cleanOutput.replace(/\x1b\[[0-9;]*m/g, '');
        // Quitar lÃ­neas vacÃ­as y posibles prompts
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
      // SSH directo: crear nueva conexiÃ³n
      ssh = new SSH2Promise(sshConfig);
      await ssh.connect();
      shouldCloseConnection = true;
      const lsOutput = await ssh.exec(`ls -la --color=never "${safePath}"`);
      // Eliminar cÃ³digos ANSI por si acaso
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
      // Buscar la conexiÃ³n existente para bastion
      const existingConn = await findSSHConnection(tabId, sshConfig);
      if (!existingConn || !existingConn.ssh || !existingConn.stream) {
        return { success: false, error: 'No se encontrÃ³ una conexiÃ³n bastiÃ³n activa para este tabId. Abre primero una terminal.' };
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
      // Eliminar cÃ³digos ANSI
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
    return; // Suprimir el error sin crashear la aplicaciÃ³n
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
// Estado persistente para stats de bastiÃ³n (CPU, red, etc.) por tabId
const bastionStatsState = {};
// Cache for Welcome Messages (MOTD) to show them on every new tab.
const motdCache = {};
// Pool de conexiones SSH compartidas para evitar mÃºltiples conexiones al mismo servidor
const sshConnectionPool = {};

// RDP Manager instance
const rdpManager = new RdpManager();

// Sistema de throttling para conexiones SSH
const connectionThrottle = {
  pending: new Map(), // Conexiones en proceso por cacheKey
  lastAttempt: new Map(), // Ãšltimo intento por cacheKey
  minInterval: 2000, // MÃ­nimo 2 segundos entre intentos al mismo servidor
  
  async throttle(cacheKey, connectionFn) {
    // Si ya hay una conexiÃ³n pendiente para este servidor, esperar
    if (this.pending.has(cacheKey)) {
      // console.log(`Esperando conexiÃ³n pendiente para ${cacheKey}...`);
      return await this.pending.get(cacheKey);
    }
    
    // Verificar intervalo mÃ­nimo
    const lastAttempt = this.lastAttempt.get(cacheKey) || 0;
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    
    if (timeSinceLastAttempt < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastAttempt;
      // console.log(`Throttling conexiÃ³n a ${cacheKey}, esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Crear la conexiÃ³n
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

// FunciÃ³n para limpiar conexiones SSH huÃ©rfanas cada 60 segundos
setInterval(() => {
  const activeKeys = new Set(Object.values(sshConnections).map(conn => conn.cacheKey));
  
  for (const [poolKey, poolConnection] of Object.entries(sshConnectionPool)) {
    if (!activeKeys.has(poolKey)) {
      // Verificar si la conexiÃ³n es realmente antigua (mÃ¡s de 5 minutos sin uso)
      const connectionAge = Date.now() - (poolConnection._lastUsed || poolConnection._createdAt || 0);
      if (connectionAge > 5 * 60 * 1000) { // 5 minutos
        // console.log(`Limpiando conexiÃ³n SSH huÃ©rfana: ${poolKey} (sin uso por ${Math.round(connectionAge/1000)}s)`);
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
}, 60000); // Cambiar a 60 segundos para dar mÃ¡s tiempo

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
    frame: false, // Oculta la barra de tÃ­tulo nativa para usar una personalizada
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

  // MenÃº de desarrollo para abrir DevTools
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

// FunciÃ³n para detectar todas las distribuciones WSL disponibles
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
      // console.log('ðŸ” Detectando distribuciones WSL...'); // Eliminado por limpieza de logs
      
      if (!error && stdout) {
        // Limpiar caracteres null UTF-16 antes de procesar
        const cleanedOutput = stdout.replace(/\u0000/g, '');
        const lines = cleanedOutput.split('\n');
        // console.log('ðŸ” Procesando', lines.length - 1, 'lÃ­neas...'); // Eliminado por limpieza de logs
        
        lines.forEach((line) => {
          const trimmed = line.trim();
          
          // Buscar cualquier distribuciÃ³n Linux (excluir docker-desktop y otras herramientas)
          if (trimmed && !trimmed.toLowerCase().includes('docker') && 
              !trimmed.toLowerCase().includes('name') && 
              !trimmed.toLowerCase().includes('state') &&
              trimmed.length > 5) {
                
            // Extraer nombre de la distribuciÃ³n (primer token)
            const tokens = trimmed.split(/\s+/);
            
            if (tokens.length > 0) {
              let distroName = tokens[0].replace('*', '').trim();
              
              if (distroName && distroName !== 'NAME') {
                // console.log('ðŸ§ DistribuciÃ³n encontrada:', distroName); // Eliminado por limpieza de logs
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
                    // Fallback genÃ©rico para distribuciones no reconocidas
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
                  // console.log('âœ… Agregada:', distroInfo.label); // Eliminado por limpieza de logs
                }
              }
            }
          }
        });
      }
      
      // Si no encontramos distribuciones especÃ­ficas, probar ubuntu.exe como fallback
      if (availableDistributions.length === 0) {
        console.log('ðŸ”„ No se encontraron distribuciones WSL, probando ubuntu.exe...');
        exec('ubuntu.exe --help', { timeout: 2000, windowsHide: true }, (ubuntuError) => {
          if (!ubuntuError || ubuntuError.code !== 'ENOENT') {
            console.log('âœ… Ubuntu genÃ©rico disponible');
            availableDistributions.push({
              name: 'Ubuntu',
              executable: 'ubuntu.exe',
              label: 'Ubuntu',
              icon: 'pi pi-circle',
              category: 'ubuntu',
              version: 'latest'
            });
          }
          // console.log('ðŸŽ¯ Distribuciones WSL detectadas:', availableDistributions.length); // Eliminado por limpieza de logs
          resolve(availableDistributions);
        });
      } else {
        // console.log('ðŸŽ¯ Distribuciones WSL detectadas:', availableDistributions.length); // Eliminado por limpieza de logs
        resolve(availableDistributions);
      }
    });
  });
}

// IPC handler para detectar todas las distribuciones WSL
ipcMain.handle('detect-wsl-distributions', async () => {
  // console.log('ðŸš€ Detectando distribuciones WSL...'); // Eliminado por limpieza de logs
  
  try {
    const distributions = await detectAllWSLDistributions();
    // console.log('âœ… DetecciÃ³n completada:', distributions.length, 'distribuciones encontradas'); // Eliminado por limpieza de logs
    // distributions.forEach(distro => console.log(`  - ${distro.label} (${distro.executable})`)); // Eliminado por limpieza de logs
    return distributions;
  } catch (error) {
    console.error('âŒ Error en detecciÃ³n de distribuciones WSL:', error);
    return [];
  }
});

// Mantener compatibilidad con el handler anterior para Ubuntu
ipcMain.handle('detect-ubuntu-availability', async () => {
  // console.log('ðŸš€ Detectando distribuciones WSL (compatibilidad Ubuntu)...'); // Eliminado por limpieza de logs
  
  try {
    const distributions = await detectAllWSLDistributions();
    // console.log('âœ… DetecciÃ³n completada:', distributions.length, 'distribuciones encontradas'); // Eliminado por limpieza de logs
    return distributions;
  } catch (error) {
    console.error('âŒ Error en detecciÃ³n de distribuciones WSL:', error);
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

// IPC handler para obtener informaciÃ³n de versiÃ³n
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

// IPC handlers para clipboard - Ya estÃ¡n definidos mÃ¡s adelante en el archivo

// IPC handler to establish an SSH connection
ipcMain.on('ssh:connect', async (event, { tabId, config }) => {
  // Para bastiones: usar cacheKey Ãºnico por destino (permite reutilizaciÃ³n)
  // Para SSH directo: usar pooling normal para eficiencia
  const cacheKey = config.useBastionWallix 
    ? `bastion-${config.bastionUser}@${config.bastionHost}->${config.username}@${config.host}:${config.port || 22}`
    : `${config.username}@${config.host}:${config.port || 22}`;
  
  // Aplicar throttling solo para SSH directo (bastiones son Ãºnicos)
  if (!config.useBastionWallix) {
    const lastAttempt = connectionThrottle.lastAttempt.get(cacheKey) || 0;
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    
    if (timeSinceLastAttempt < connectionThrottle.minInterval) {
      const waitTime = connectionThrottle.minInterval - timeSinceLastAttempt;
      // console.log(`Throttling conexiÃ³n SSH directa a ${cacheKey}, esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    connectionThrottle.lastAttempt.set(cacheKey, Date.now());
  } else {
    // console.log(`ConexiÃ³n bastiÃ³n - sin throttling (pooling habilitado)`);
  }
  
  // Para bastiones: cada terminal tiene su propia conexiÃ³n independiente (no pooling)
  // Para SSH directo: usar pooling normal para eficiencia
  let ssh;
  let isReusedConnection = false;

  if (config.useBastionWallix) {
    // BASTIÃ“N: Usar ssh2 puro para crear una conexiÃ³n y shell independientes
    // console.log(`BastiÃ³n ${cacheKey} - creando nueva conexiÃ³n con ssh2 (bastion-ssh.js)`);
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
        // Limpiar estado persistente de bastiÃ³n al cerrar la pestaÃ±a
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
          // Lanzar bucle de stats SOLO cuando el stream estÃ¡ listo
          // Solo iniciar stats si esta pestaÃ±a estÃ¡ activa
          if (activeStatsTabId === tabId) {
            wallixStatsLoop();
          }
        }
      }
    );
    // Guardar la conexiÃ³n para gestiÃ³n posterior (stream se asigna en onShellReady)
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
    
    // FunciÃ³n de bucle de stats para Wallix/bastiÃ³n
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
        // console.log('[WallixStats] ConexiÃ³n no disponible, saltando stats');
        return;
      }
      if (connObj.statsLoopRunning) {
        // console.log(`[STATS] Ejecutando wallixStatsLoop para tabId ${tabId} (activo: ${activeStatsTabId})`);
        return;
      }
      
      connObj.statsLoopRunning = true;
      // console.log(`[STATS] Ejecutando wallixStatsLoop para tabId ${tabId} (activo: ${activeStatsTabId})`);

      try {
        // // console.log('[WallixStats] Lanzando bucle de stats para bastiÃ³n', tabId);
        
        if (connObj.ssh.execCommand) {
          const command = 'grep "cpu " /proc/stat && free -b && df -P && uptime && cat /proc/net/dev && hostname && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo "" && cat /etc/os-release';
          connObj.ssh.execCommand(command, (err, result) => {
            if (err || !result) {
              // console.warn('[WallixStats] Error ejecutando comando:', err);
              // Enviar stats bÃ¡sicas en caso de error
              const fallbackStats = {
                cpu: '0.00',
                mem: { total: 0, used: 0 },
                disk: [],
                uptime: 'Error',
                network: { rx_speed: 0, tx_speed: 0 },
                hostname: 'BastiÃ³n',
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
              
              // CPU - buscar lÃ­nea que empiece con "cpu "
              const cpuLineIndex = parts.findIndex(line => line.trim().startsWith('cpu '));
              let cpuLoad = '0.00';
              if (cpuLineIndex >= 0) {
                const cpuLine = parts[cpuLineIndex];
                const cpuTimes = cpuLine.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
                // Usar estado persistente para bastiÃ³n
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
                  // Guardar estado persistente para bastiÃ³n
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
                // Usar estado persistente para bastiÃ³n
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
              let hostname = 'BastiÃ³n';
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
              // Buscar IP real (lÃ­nea despuÃ©s de hostname)
              let ipLine = '';
              if (hostnameLineIndex >= 0 && hostnameLineIndex < parts.length - 4) {
                ipLine = parts[hostnameLineIndex + 1]?.trim() || '';
              }
              // Tomar la Ãºltima IP vÃ¡lida (no 127.0.0.1, no vacÃ­a)
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
            
            // Programar siguiente ejecuciÃ³n
            if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed && activeStatsTabId === tabId) {
              sshConnections[tabId].statsLoopRunning = false;
              sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 2000);
            } else {
              if (sshConnections[tabId]) sshConnections[tabId].statsLoopRunning = false;
            }
          });
          
        } else {
          // console.warn('[WallixStats] execCommand no disponible en conexiÃ³n bastiÃ³n');
          // Fallback con stats bÃ¡sicas
          const stats = {
            cpu: '0.00',
            mem: { total: 0, used: 0 },
            disk: [],
            uptime: 'N/A',
            network: { rx_speed: 0, tx_speed: 0 },
            hostname: 'BastiÃ³n',
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
    
    // Asignar la funciÃ³n wallixStatsLoop al objeto de conexiÃ³n
    sshConnections[tabId].wallixStatsLoop = wallixStatsLoop;
    
    sendToRenderer(event.sender, `ssh:ready:${tabId}`);
    sendToRenderer(event.sender, 'ssh-connection-ready', {
      originalKey: config.originalKey || tabId,
      tabId: tabId
    });
    return;
  } else {
    // SSH DIRECTO: LÃ³gica de pooling normal
    const existingPoolConnection = sshConnectionPool[cacheKey];
    if (existingPoolConnection) {
      try {
        await existingPoolConnection.exec('echo "test"');
        ssh = existingPoolConnection;
        isReusedConnection = true;
        // console.log(`Reutilizando conexiÃ³n del pool para terminal SSH directo ${cacheKey}`);
      } catch (testError) {
        // console.log(`ConexiÃ³n del pool no vÃ¡lida para terminal ${cacheKey}, creando nueva...`);
        try {
          existingPoolConnection.close();
        } catch (e) {}
        delete sshConnectionPool[cacheKey];
      }
    }
    if (!ssh) {
      // console.log(`Creando nueva conexiÃ³n SSH directa para terminal ${cacheKey}`);
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

  // Eliminar funciÃ³n statsLoop y llamadas relacionadas
  // const statsLoop = async (hostname, distro, ip) => {
  //   // VerificaciÃ³n robusta de la conexiÃ³n
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
  //     // Verificar nuevamente que la conexiÃ³n siga vÃ¡lida antes de programar siguiente loop
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
      // Solo conectar si es una conexiÃ³n nueva (no reutilizada del pool)
      // console.log(`Conectando SSH para terminal ${cacheKey}...`);
      
      // Configurar lÃ­mites de listeners ANTES de conectar (aumentado para evitar warnings)
      ssh.setMaxListeners(300);
      
      // console.log(`Iniciando conexiÃ³n SSH para ${cacheKey}...`);
      // console.log(`ConfiguraciÃ³n: Host=${config.host}, Usuario=${config.username}, Puerto=${config.port || 22}`);
      // if (config.useBastionWallix) {
      //   console.log(`BastiÃ³n Wallix: Host=${config.bastionHost}, Usuario=${config.bastionUser}`);
      // }
      
      await ssh.connect();
      // console.log(`Conectado exitosamente a terminal ${cacheKey}`);
      
      // SSH2Promise estÃ¡ conectado y listo para usar
      // console.log('SSH2Promise conectado correctamente, procediendo a crear shell...');
      
      // Guardar en el pool solo para SSH directo (bastiones son independientes)
      if (!config.useBastionWallix) {
        ssh._createdAt = Date.now();
        ssh._lastUsed = Date.now();
        sshConnectionPool[cacheKey] = ssh;
        // console.log(`ConexiÃ³n SSH directa ${cacheKey} guardada en pool para reutilizaciÃ³n`);
      } else {
        // console.log(`ConexiÃ³n bastiÃ³n ${cacheKey} - NO guardada en pool (independiente)`);
      }
    } else {
      // console.log(`Usando conexiÃ³n SSH directa existente del pool para terminal ${cacheKey}`);
    }
    
    // Crear shell con reintentos
    let stream;
    let shellAttempts = 0;
    const maxShellAttempts = 3;
    
    while (shellAttempts < maxShellAttempts) {
      try {
        // AÃ±adir pequeÃ±o delay entre intentos
        if (shellAttempts > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * shellAttempts));
        }
        
        // Si es una conexiÃ³n Wallix, usar configuraciÃ³n especÃ­fica para bastiones
        if (ssh._isWallixConnection && ssh._wallixTarget) {
          // console.log(`ConexiÃ³n Wallix detectada: ${config.bastionHost} -> ${ssh._wallixTarget.host}:${ssh._wallixTarget.port}`);
          
          // Para bastiones Wallix, esperar un poco antes de crear shell
          // console.log('Esperando estabilizaciÃ³n de conexiÃ³n Wallix...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // console.log('Creando shell usando SSH2Promise con configuraciÃ³n Wallix...');
          
          // Intentar con configuraciÃ³n especÃ­fica para Wallix
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
            // console.warn('Error con configuraciÃ³n Wallix, intentando configuraciÃ³n bÃ¡sica:', shellError.message);
            // Fallback con configuraciÃ³n mÃ­nima
            stream = await ssh.shell('xterm-256color');
          }
          
          // console.log('Shell de bastiÃ³n Wallix creado exitosamente');
          
          // Para Wallix, verificar dÃ³nde estamos conectados
          // console.log('Verificando estado de conexiÃ³n Wallix...');
          
          // Enviar comando para verificar hostname
          stream.write('hostname\n');
          
          // Esperar un poco para procesar
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // console.log('Para conexiones Wallix, el bastiÃ³n maneja automÃ¡ticamente la conexiÃ³n al servidor destino');
          
        } else {
          // ConexiÃ³n SSH directa normal
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
        // console.warn(`Intento ${shellAttempts} de crear shell fallÃ³ para ${cacheKey}:`, shellError?.message || shellError || 'Unknown error');
        
        if (shellAttempts >= maxShellAttempts) {
          throw new Error(`No se pudo crear shell despuÃ©s de ${maxShellAttempts} intentos: ${shellError?.message || shellError || 'Unknown error'}`);
        }
      }
    }
    
    // Configurar lÃ­mites de listeners para el stream
    stream.setMaxListeners(0); // Sin lÃ­mite para streams individuales

    const storedOriginalKey = config.originalKey || tabId;
    // console.log('Guardando conexiÃ³n SSH con originalKey:', storedOriginalKey, 'para tabId:', tabId);
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
    // Log para depuraciÃ³n: mostrar todos los tabId activos
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
          
                    // La configuraciÃ³n original ya funciona correctamente
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
      
      // Enviar evento de desconexiÃ³n
      const disconnectOriginalKey = conn?.originalKey || tabId;
      // console.log('ðŸ”Œ SSH desconectado - enviando evento para originalKey:', disconnectOriginalKey);
      sendToRenderer(event.sender, 'ssh-connection-disconnected', { 
        originalKey: disconnectOriginalKey,
        tabId: tabId 
      });
      
      delete sshConnections[tabId];
    });



    sendToRenderer(event.sender, `ssh:ready:${tabId}`);
    
    // Enviar evento de conexiÃ³n exitosa
    const originalKey = config.originalKey || tabId;
    // console.log('âœ… SSH conectado - enviando evento para originalKey:', originalKey);
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
    // console.error(`Error en conexiÃ³n SSH para ${tabId}:`, err);
    
    // Limpiar conexiÃ³n problemÃ¡tica del pool
    if (ssh && cacheKey && sshConnectionPool[cacheKey] === ssh) {
      try {
        ssh.close();
      } catch (closeError) {
        // Ignorar errores de cierre
      }
      delete sshConnectionPool[cacheKey];
    }
    
    // Crear mensaje de error mÃ¡s descriptivo
    let errorMsg = 'Error desconocido al conectar por SSH';
    if (err) {
      if (typeof err === 'string') {
        errorMsg = err;
      } else if (err.message) {
        errorMsg = err.message;
      } else if (err.code) {
        errorMsg = `Error de conexiÃ³n: ${err.code}`;
      } else {
        try {
          errorMsg = JSON.stringify(err);
        } catch (jsonError) {
          errorMsg = 'Error de conexiÃ³n SSH';
        }
      }
    }
    
    sendToRenderer(event.sender, `ssh:error:${tabId}`, errorMsg);
    
    // Enviar evento de error de conexiÃ³n
    const errorOriginalKey = config.originalKey || tabId;
    // console.log('âŒ SSH error - enviando evento para originalKey:', errorOriginalKey, 'error:', errorMsg);
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
        // Guardar el Ãºltimo tamaÃ±o solicitado
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
        // console.log('Cerrando conexiÃ³n Wallix');
      }
      
      // Limpiar listeners del stream de forma mÃ¡s agresiva
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
      
      // Verificar si otras pestaÃ±as estÃ¡n usando la misma conexiÃ³n SSH
      const otherTabsUsingConnection = Object.values(sshConnections)
        .filter(c => c !== conn && c.cacheKey === conn.cacheKey);
      
      // Solo cerrar la conexiÃ³n SSH si no hay otras pestaÃ±as usÃ¡ndola
      // (Para bastiones, cada terminal es independiente, asÃ­ que siempre cerrar)
      if (otherTabsUsingConnection.length === 0 && conn.ssh && conn.cacheKey) {
        try {
                // console.log(`Cerrando conexiÃ³n SSH compartida para ${conn.cacheKey} (Ãºltima pestaÃ±a)`);
      
      // Enviar evento de desconexiÃ³n
      const disconnectOriginalKey = conn.originalKey || conn.cacheKey;
      // console.log('ðŸ”Œ SSH cerrado - enviando evento para originalKey:', disconnectOriginalKey);
      sendToRenderer(event.sender, 'ssh-connection-disconnected', { 
        originalKey: disconnectOriginalKey
      });
      
      // Limpiar listeners especÃ­ficos de la conexiÃ³n SSH de forma mÃ¡s selectiva
      if (conn.ssh.ssh) {
        // Solo remover listeners especÃ­ficos en lugar de todos
        conn.ssh.ssh.removeAllListeners('error');
        conn.ssh.ssh.removeAllListeners('close');
        conn.ssh.ssh.removeAllListeners('end');
      }
      
      // Limpiar listeners del SSH2Promise tambiÃ©n
      conn.ssh.removeAllListeners('error');
      conn.ssh.removeAllListeners('close');
      conn.ssh.removeAllListeners('end');
      
      conn.ssh.close();
      delete sshConnectionPool[conn.cacheKey];
        } catch (closeError) {
          // console.warn(`Error closing SSH connection: ${closeError?.message || closeError || 'Unknown error'}`);
        }
      } else {
        // console.log(`Manteniendo conexiÃ³n SSH para ${conn.cacheKey} (${otherTabsUsingConnection.length} pestaÃ±as restantes)`);
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
          // Limpiar listeners especÃ­ficos en lugar de todos en app-quit
          conn.ssh.ssh.removeAllListeners('error');
          conn.ssh.ssh.removeAllListeners('close');
          conn.ssh.ssh.removeAllListeners('end');
        }
        // Limpiar listeners del SSH2Promise tambiÃ©n
        conn.ssh.removeAllListeners('error');
        conn.ssh.removeAllListeners('close');
        conn.ssh.removeAllListeners('end');
        conn.ssh.close();
      } catch (e) {
        // Ignorar errores
      }
    }
  });
  
  // Limpiar tambiÃ©n el pool de conexiones con mejor limpieza
  Object.values(sshConnectionPool).forEach(poolConn => {
    try {
      // Limpiar listeners del pool tambiÃ©n
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

// Limpieza robusta tambiÃ©n en before-quit
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
          // Limpiar listeners especÃ­ficos en lugar de todos en before-quit
          conn.ssh.ssh.removeAllListeners('error');
          conn.ssh.ssh.removeAllListeners('close');
          conn.ssh.ssh.removeAllListeners('end');
        }
        // Limpiar listeners del SSH2Promise tambiÃ©n
        conn.ssh.removeAllListeners('error');
        conn.ssh.removeAllListeners('close');
        conn.ssh.removeAllListeners('end');
        conn.ssh.close();
      } catch (e) {
        // Ignorar errores
      }
    }
  });
  
  // Limpiar tambiÃ©n el pool de conexiones con mejor limpieza
  Object.values(sshConnectionPool).forEach(poolConn => {
    try {
      // Limpiar listeners del pool tambiÃ©n
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

// Handler para mostrar el diÃ¡logo de guardado
ipcMain.handle('dialog:show-save-dialog', async (event, options) => {
  const win = BrowserWindow.getFocusedWindow();
  return await dialog.showSaveDialog(win, options);
});

// Handler para descargar archivos por SSH

ipcMain.handle('ssh:download-file', async (event, { tabId, remotePath, localPath, sshConfig }) => {
  try {
    if (sshConfig.useBastionWallix) {
      // Construir string de conexiÃ³n Wallix para SFTP
      // Formato: <USER>@<BASTION>::<TARGET>@<DEVICE>::<SERVICE>
      // En la mayorÃ­a de los casos, bastionUser ya tiene el formato correcto
      const sftp = new SftpClient();
      const connectConfig = {
        host: sshConfig.bastionHost,
        port: sshConfig.port || 22,
        username: sshConfig.bastionUser, // Wallix espera el string especial aquÃ­
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
        // console.log('ðŸ“¡ Enviando evento SSH:', eventName, 'con args:', args);
      }
      sender.send(eventName, ...args);
    } else {
      // console.error('Sender no vÃ¡lido o destruido para evento:', eventName);
    }
  } catch (error) {
    // console.error('Error sending to renderer:', eventName, error);
  }
}

// FunciÃ³n para limpiar conexiones huÃ©rfanas del pool cada 10 minutos
function cleanupOrphanedConnections() {
  Object.keys(sshConnectionPool).forEach(cacheKey => {
    const poolConnection = sshConnectionPool[cacheKey];
    // Verificar si hay alguna conexiÃ³n activa usando esta conexiÃ³n del pool
    const hasActiveConnections = Object.values(sshConnections).some(conn => conn.cacheKey === cacheKey);
    
    if (!hasActiveConnections) {
      // console.log(`Limpiando conexiÃ³n SSH huÃ©rfana: ${cacheKey}`);
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
  
  // Si no existe por tabId y tenemos sshConfig, buscar cualquier conexiÃ³n al mismo servidor
  if (sshConfig && sshConfig.host && sshConfig.username) {
    // Para bastiones: buscar cualquier conexiÃ³n activa al mismo destino via bastiÃ³n
    if (sshConfig.useBastionWallix) {
      // Buscar en conexiones activas cualquier conexiÃ³n que vaya al mismo destino via bastiÃ³n
      for (const conn of Object.values(sshConnections)) {
        if (conn.config && 
            conn.config.useBastionWallix &&
            conn.config.bastionHost === sshConfig.bastionHost &&
            conn.config.bastionUser === sshConfig.bastionUser &&
            conn.config.host === sshConfig.host &&
            conn.config.username === sshConfig.username &&
            (conn.config.port || 22) === (sshConfig.port || 22)) {
          // AquÃ­ antes habÃ­a un console.log(` incompleto que causaba error de sintaxis
          // Si se desea loggear, usar una lÃ­nea vÃ¡lida como:
          // console.log('ConexiÃ³n encontrada para bastion:', conn);
          return conn;
        }
      }
    }
  }
  // Si no se encuentra, retornar null
  return null;
}

// --- INICIO BLOQUE RESTAURACIÃ“N STATS ---
// FunciÃ³n de statsLoop para conexiones directas (SSH2Promise)
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
    // Buscar IP real (Ãºltima lÃ­nea, tomar la Ãºltima IP vÃ¡lida)
    let ip = '';
    if (parts.length > 0) {
      const ipLine = parts[parts.length - 1].trim();
      const ipCandidates = ipLine.split(/\s+/).filter(s => s && s !== '127.0.0.1' && s !== '::1');
      if (ipCandidates.length > 0) {
        ip = ipCandidates[ipCandidates.length - 1];
      }
    }
    if (!ip) ip = host;
    // NormalizaciÃ³n de distro (RedHat) y obtenciÃ³n de versionId
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
    // Actualizar los valores en la conexiÃ³n para que siempre estÃ©n correctos al reactivar la pestaÃ±a
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
// --- FIN BLOQUE RESTAURACIÃ“N STATS ---

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

// === RDP Support ===
// IPC handlers for RDP connections
ipcMain.handle('rdp:connect', async (event, config) => {
  try {
    // Verificar si se estÃ¡ usando ActiveX
    if (config.useActiveX || config.client === 'activex') {
      // Para ActiveX, solo retornar Ã©xito - la conexiÃ³n se maneja en el renderer
      const connectionId = `activex_${Date.now()}`;
      
      return {
        success: true,
        connectionId: connectionId,
        type: 'activex',
        embedded: true
      };
    }
    
    // ConexiÃ³n normal con clientes externos
    const connectionId = await rdpManager.connect(config);
    
    // Setup process handlers for events
    const connection = rdpManager.activeConnections.get(connectionId);
    if (connection) {
      rdpManager.setupProcessHandlers(
        connection.process,
        connectionId,
        (connectionId) => {
          // On connect
          sendToRenderer(event.sender, 'rdp:connected', { connectionId });
        },
        (connectionId, exitInfo) => {
          // On disconnect
          sendToRenderer(event.sender, 'rdp:disconnected', { connectionId, exitInfo });
        },
        (connectionId, error) => {
          // On error
          sendToRenderer(event.sender, 'rdp:error', { connectionId, error: error.message });
        }
      );
    }
    
    return {
      success: true,
      connectionId: connectionId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('rdp:disconnect', async (event, connectionId) => {
  return rdpManager.disconnect(connectionId);
});

ipcMain.handle('rdp:disconnect-all', async (event) => {
  return rdpManager.disconnectAll();
});

ipcMain.handle('rdp:get-active-connections', async (event) => {
  return rdpManager.getActiveConnections();
});

ipcMain.handle('rdp:get-presets', async (event) => {
  return rdpManager.getPresets();
});

ipcMain.handle('rdp:get-available-clients', async (event) => {
  return await rdpManager.getAvailableClients();
});

// Handler para mostrar ventana RDP si estÃ¡ minimizada
ipcMain.handle('rdp:show-window', async (event, { server }) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    // En Windows, buscar ventanas de mstsc.exe
    if (process.platform === 'win32') {
      try {
        // Probar primero con un comando simple para verificar si hay procesos mstsc
        const { stdout: tasklistOutput } = await execAsync('tasklist /FI "IMAGENAME eq mstsc.exe" /FO CSV /NH');
        
        if (!tasklistOutput.includes('mstsc.exe')) {
          return { success: false, message: 'No se encontraron procesos mstsc.exe activos' };
        }
        
        // Crear un script PowerShell temporal
        const fs = require('fs');
        const path = require('path');
        const tempDir = require('os').tmpdir();
        const scriptPath = path.join(tempDir, 'restore_rdp.ps1');
        
        const scriptContent = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Win32 {
  [DllImport("user32.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

try {
  $processes = Get-Process mstsc -ErrorAction SilentlyContinue
  Write-Host "Procesos encontrados: $($processes.Count)"
  
  if ($processes.Count -eq 0) {
    Write-Host "ERROR: No se encontraron procesos mstsc.exe"
    exit 1
  }
  
  foreach ($process in $processes) {
    Write-Host "Proceso ID: $($process.Id), Ventana: $($process.MainWindowHandle)"
    
    if ($process.MainWindowHandle -ne [IntPtr]::Zero) {
      [Win32]::ShowWindow($process.MainWindowHandle, 9)
      [Win32]::SetForegroundWindow($process.MainWindowHandle)
      Write-Host "SUCCESS: Ventana restaurada para proceso $($process.Id)"
      break
    } else {
      Write-Host "ERROR: Proceso $($process.Id) no tiene ventana vÃ¡lida"
    }
  }
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
}
        `;
        
        fs.writeFileSync(scriptPath, scriptContent);
        
        const { stdout: psOutput, stderr: psError } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
        
        // Limpiar el archivo temporal
        try {
          fs.unlinkSync(scriptPath);
        } catch (e) {
          // Ignorar errores de limpieza
        }
        

        
        if (psOutput.includes('SUCCESS:')) {
          return { success: true, message: 'Ventana RDP restaurada' };
        } else {
          return { success: false, message: `No se pudo restaurar la ventana RDP. Output: ${psOutput}` };
        }
      } catch (error) {
        console.log('Error ejecutando PowerShell:', error);
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, message: 'FunciÃ³n solo disponible en Windows' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handler para desconectar sesiÃ³n RDP especÃ­fica
ipcMain.handle('rdp:disconnect-session', async (event, { server }) => {
  try {
    // Buscar y terminar procesos mstsc.exe que coincidan con el servidor
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      try {
        // Terminar todos los procesos mstsc.exe
        await execAsync('taskkill /F /IM mstsc.exe');
        return { success: true, message: 'Sesiones RDP terminadas' };
      } catch (error) {
        // Si no hay procesos para terminar, no es un error
        if (error.message.includes('not found')) {
          return { success: true, message: 'No hay sesiones RDP activas' };
        }
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, message: 'FunciÃ³n solo disponible en Windows' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Cleanup RDP connections on app quit
app.on('before-quit', () => {
  // Disconnect all RDP connections
  rdpManager.disconnectAll();
  rdpManager.cleanupAllTempFiles();
});

// === ActiveX RDP Control Support ===
let rdpActiveXManager = null;

// Inicializar el manager de ActiveX RDP cuando sea necesario
function getRdpActiveXManager() {
  if (!rdpActiveXManager) {
    try {
      const RdpActiveXManager = require('./native/rdp-activex');
      rdpActiveXManager = new RdpActiveXManager();
    } catch (error) {
      console.error('Error loading RDP ActiveX manager:', error);
      return null;
    }
  }
  return rdpActiveXManager;
}

// Handler para obtener el handle de la ventana padre
ipcMain.handle('rdp:get-parent-window-handle', async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      return win.getNativeWindowHandle().readBigUInt64LE(0);
    }
    return null;
  } catch (error) {
    console.error('Error getting parent window handle:', error);
    return null;
  }
});

// Handler para obtener el handle del contenedor
ipcMain.handle('rdp:get-container-window-handle', async (event, element) => {
  try {
    // Por ahora, usar la ventana principal como contenedor
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      return win.getNativeWindowHandle().readBigUInt64LE(0);
    }
    return null;
  } catch (error) {
    console.error('Error getting container window handle:', error);
    return null;
  }
});

// Handler para crear instancia del control ActiveX
ipcMain.handle('rdp:create-activex-instance', async (event, parentWindowHandle) => {
  try {
    const manager = getRdpActiveXManager();
    if (!manager) {
      throw new Error('RDP ActiveX manager not available');
    }
    
    const instanceId = manager.createInstance(parentWindowHandle);
    return instanceId;
  } catch (error) {
    console.error('Error creating ActiveX instance:', error);
    throw error;
  }
});

// Handler para configurar servidor
ipcMain.handle('rdp:set-activex-server', async (event, instanceId, server) => {
  try {
    console.log('Main: Configurando servidor para instancia:', instanceId, 'servidor:', server);
    const manager = getRdpActiveXManager();
    if (!manager) {
      throw new Error('RDP ActiveX manager not available');
    }
    
    manager.setServer(instanceId, server);
    console.log('Main: Servidor configurado correctamente');
    return { success: true };
  } catch (error) {
    console.error('Error setting ActiveX server:', error);
    throw error;
  }
});

// Handler para configurar credenciales
ipcMain.handle('rdp:set-activex-credentials', async (event, instanceId, username, password) => {
  try {
    console.log('Main: Configurando credenciales para instancia:', instanceId);
    const manager = getRdpActiveXManager();
    if (!manager) {
      throw new Error('RDP ActiveX manager not available');
    }
    
    console.log('Main: Manager obtenido, configurando credenciales...');
    manager.setCredentials(instanceId, username, password);
    console.log('Main: Credenciales configuradas correctamente');
    return { success: true };
  } catch (error) {
    console.error('Error setting ActiveX credentials:', error);
    throw error;
  }
});

// Handler para configurar resoluciÃ³n
ipcMain.handle('rdp:set-activex-display-settings', async (event, instanceId, width, height) => {
  try {
    console.log('Main: Configurando resoluciÃ³n para instancia:', instanceId, 'resoluciÃ³n:', width, 'x', height);
    const manager = getRdpActiveXManager();
    if (!manager) {
      throw new Error('RDP ActiveX manager not available');
    }
    
    manager.setDisplaySettings(instanceId, width, height);
    console.log('Main: ResoluciÃ³n configurada correctamente');
    return { success: true };
  } catch (error) {
    console.error('Error setting ActiveX display settings:', error);
    throw error;
  }
});

// Handler para conectar RDP
ipcMain.handle('rdp:connect-activex', async (event, instanceId, server, username, password) => {
  try {
    console.log('Main: Conectando RDP para instancia:', instanceId, 'servidor:', server, 'usuario:', username);
    const manager = getRdpActiveXManager();
    if (!manager) {
      throw new Error('RDP ActiveX manager not available');
    }
    
    const success = manager.connect(instanceId, server, username, password);
    console.log('Main: ConexiÃ³n RDP iniciada:', success);
    return { success: success };
  } catch (error) {
    console.error('Error connecting RDP:', error);
    throw error;
  }
});

// Handler para configurar eventos
ipcMain.handle('rdp:set-activex-event-handlers', async (event, instanceId, handlers) => {
  try {
    console.log('Main: Configurando eventos para instancia:', instanceId);
    console.log('Main: Handlers recibidos:', Object.keys(handlers));
    
    const manager = getRdpActiveXManager();
    if (!manager) {
      console.log('Main: Manager no disponible, continuando sin eventos');
      return { success: true };
    }
    
    // Configurar callbacks para eventos usando strings
    if (handlers.onConnected) {
      console.log('Main: Registrando evento onConnected');
      try {
        manager.onEvent(instanceId, 'connected', () => {
          console.log('Main: Evento connected disparado para instancia:', instanceId);
          // Enviar evento al renderer
          event.sender.send(`rdp:event:${instanceId}:connected`);
        });
      } catch (error) {
        console.error('Main: Error registrando onConnected:', error);
      }
    }
    if (handlers.onDisconnected) {
      console.log('Main: Registrando evento onDisconnected');
      try {
        manager.onEvent(instanceId, 'disconnected', () => {
          console.log('Main: Evento disconnected disparado para instancia:', instanceId);
          // Enviar evento al renderer
          event.sender.send(`rdp:event:${instanceId}:disconnected`);
        });
      } catch (error) {
        console.error('Main: Error registrando onDisconnected:', error);
      }
    }
    if (handlers.onError) {
      console.log('Main: Registrando evento onError');
      try {
        manager.onEvent(instanceId, 'error', (error) => {
          console.log('Main: Evento error disparado para instancia:', instanceId, error);
          // Enviar evento al renderer
          event.sender.send(`rdp:event:${instanceId}:error`, error);
        });
      } catch (error) {
        console.error('Main: Error registrando onError:', error);
      }
    }
    
    console.log('Main: Eventos configurados correctamente');
    return { success: true };
  } catch (error) {
    console.error('Main: Error setting ActiveX event handlers:', error);
    console.error('Main: Error stack:', error.stack);
    // No lanzar error, continuar sin eventos
    return { success: true };
  }
});

// Handler para conectar (DUPLICADO - ELIMINADO)
// Este handler estaba duplicado y causaba el error "Attempted to register a second handler"
// Se mantiene solo el handler de la línea 2512 que acepta server, username, password

// Handler para desconectar
ipcMain.handle('rdp:disconnect-activex', async (event, instanceId) => {
  try {
    const manager = getRdpActiveXManager();
    if (!manager) {
      throw new Error('RDP ActiveX manager not available');
    }
    
    manager.disconnect(instanceId);
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting ActiveX:', error);
    throw error;
  }
});

// Handler para redimensionar
ipcMain.handle('rdp:resize-activex', async (event, instanceId, x, y, width, height) => {
  try {
    const manager = getRdpActiveXManager();
    if (!manager) {
      throw new Error('RDP ActiveX manager not available');
    }
    
    manager.resize(instanceId, x, y, width, height);
    return { success: true };
  } catch (error) {
    console.error('Error resizing ActiveX:', error);
    throw error;
  }
});

    // Handler para obtener el estado del control ActiveX
    ipcMain.handle('rdp:get-activex-status', async (event, instanceId) => {
      try {
        const manager = getRdpActiveXManager();
        if (!manager) {
          throw new Error('RDP ActiveX manager not available');
        }
        
        const status = manager.getStatus(instanceId);
        return { success: true, status };
      } catch (error) {
        console.error('Error getting ActiveX status:', error);
        throw error;
      }
    });

    // Handler para crear una ventana hija para el control ActiveX
    ipcMain.handle('rdp:create-activex-child-window', async (event, { x, y, width, height, instanceId, server, username }) => {
      try {
        console.log('Main: Creando ventana hija para ActiveX:', { x, y, width, height, instanceId, server, username });
        
        // Crear una ventana hija de la ventana principal
        const childWindow = new BrowserWindow({
          parent: mainWindow,
          width: width,
          height: height,
          x: x,
          y: y,
          frame: true, // Cambiar a true para debugging
          transparent: false, // Cambiar a false para debugging
          resizable: true, // Cambiar a true para debugging
          minimizable: true, // Cambiar a true para debugging
          maximizable: true, // Cambiar a true para debugging
          skipTaskbar: false, // Cambiar a false para debugging
          alwaysOnTop: false,
          show: true, // Mostrar inmediatamente para debugging
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false,
            // Agregar rutas para el mÃ³dulo nativo
            additionalArguments: [
              `--native-module-path=${path.join(__dirname, 'native', 'rdp-activex', 'build', 'Release')}`
            ]
          }
        });

        // Abrir DevTools automáticamente para debugging
        childWindow.webContents.openDevTools({ mode: 'detach' });

        // Cargar una pÃ¡gina HTML simple que contendrÃ¡ el control ActiveX
        const params = new URLSearchParams({
            instanceId: instanceId.toString(),
            server: server || 'localhost',
            username: username || 'user',
            width: width.toString(),
            height: height.toString()
        });
        
        console.log('Main: ParÃ¡metros para ventana hija:', params.toString());
        
        
        const htmlPath = path.join(__dirname, 'native', 'rdp-activex', 'activex-window.html');
        
        
                        try {
                    
                    
                    
                    
                    // Usar loadURL en lugar de loadFile para incluir los parÃ¡metros de query
                    const fileURL = `file:///${htmlPath.replace(/\\/g, '/')}?${params.toString()}`;
                    console.log('Main: File URL con parÃ¡metros:', fileURL);
                    
                    await childWindow.loadURL(fileURL);
                    
                    
                    // Verificar la URL despuÃ©s de cargar
                    const currentURL = childWindow.webContents.getURL();
                    
                } catch (error) {
                    console.error('Main: Error cargando archivo HTML:', error);
                    console.error('Main: Error details:', error.message);
                }
        
        // Agregar evento para cuando la ventana se carga completamente
        childWindow.webContents.on('did-finish-load', () => {
            console.log('Main: Ventana hija cargada completamente para instancia:', instanceId);
            console.log('Main: URL de la ventana hija en did-finish-load:', childWindow.webContents.getURL());
            
                            // Ejecutar JavaScript en la ventana hija para inicializar el control ActiveX
                childWindow.webContents.executeJavaScript(`
                    console.log('Main Process: JavaScript iniciado en ventana hija');
                    console.log('Main Process: Verificando parámetros de URL...');
                    
                    
                    // FunciÃ³n para inicializar el control ActiveX
                    async function initializeActiveXControl() {
                        try {
                            console.log('Main Process: FunciÃ³n initializeActiveXControl iniciada');
                            console.log('Main Process: Inicializando control ActiveX...');
                            
                            // Obtener parÃ¡metros de la URL
                            const urlParams = new URLSearchParams(window.location.search);
                            const instanceId = urlParams.get('instanceId');
                            const server = urlParams.get('server');
                            const username = urlParams.get('username');
                            const width = urlParams.get('width');
                            const height = urlParams.get('height');
                            
                            
                            
                            console.log('Main Process: ParÃ¡metros recibidos:', { instanceId, server, username, width, height });
                            
                            // Actualizar el contenido del contenedor
                            const container = document.querySelector('#rdp-container');
                            console.log('Main Process: Container encontrado:', !!container);
                            console.log('Main Process: Container ID:', container ? container.id : 'not found');
                            
                            if (!container || !instanceId || !server) {
                                return 'error: missing data - container: ' + !!container + ', instanceId: ' + !!instanceId + ', server: ' + !!server;
                            }
                            
                            // Mostrar mensaje de inicializaciÃ³n
                            container.innerHTML = \`
                                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                    <div style="text-align: center;">
                                        <h3>RDP ActiveX Control</h3>
                                        <p>Inicializando control ActiveX...</p>
                                        <p>Servidor: \${server}</p>
                                        <p>Usuario: \${username}</p>
                                        <p>Instance ID: \${instanceId}</p>
                                        <p>ResoluciÃ³n: \${width}x\${height}</p>
                                    </div>
                                </div>
                            \`;
                            
                            // Verificar si estamos en un entorno Electron con Node.js
                            if (typeof require !== 'undefined') {
                                console.log('Main Process: Node.js disponible, cargando mÃ³dulo nativo...');
                                
                                try {
                                    // Cargar el mÃ³dulo nativo de ActiveX
                                    const rdpActiveX = require('./native/rdp-activex/build/Release/rdp_activex_basic.node');
                                    console.log('Main Process: MÃ³dulo nativo cargado:', rdpActiveX);
                                    console.log('Main Process: Funciones disponibles:', Object.keys(rdpActiveX));
                                    console.log('Main Process: RdpBasicWrapper disponible:', !!rdpActiveX.RdpBasicWrapper);
                                    console.log('Main Process: RdpBasicWrapper constructor:', typeof rdpActiveX.RdpBasicWrapper);
                                    console.log('Main Process: Funciones disponibles:', Object.keys(rdpActiveX));
                                    console.log('Main Process: RdpBasicWrapper disponible:', !!rdpActiveX.RdpBasicWrapper);
                                    console.log('Main Process: RdpBasicWrapper constructor:', typeof rdpActiveX.RdpBasicWrapper);
                                    console.log('Main Process: Funciones disponibles:', Object.keys(rdpActiveX));
                                    console.log('Main Process: RdpBasicWrapper disponible:', !!rdpActiveX.RdpBasicWrapper);
                                    console.log('Main Process: RdpBasicWrapper constructor:', typeof rdpActiveX.RdpBasicWrapper);
                                    
                                    // Obtener el handle de la ventana actual
                                    const containerHandle = BigInt(0); // Por ahora usamos 0 como handle por defecto
                                    
                                    // Inicializar el control ActiveX
                                    // Verificar si las funciones necesarias estÃ¡n disponibles
                                    if (!rdpActiveX.RdpBasicWrapper) {
                                        throw new Error('Clase RdpBasicWrapper no disponible. Funciones disponibles: ' + Object.keys(rdpActiveX).join(', '));
                                    }
                                    
                                    // Crear una instancia del wrapper
                                    const rdpWrapper = new rdpActiveX.RdpBasicWrapper();
                                    console.log('Main Process: Wrapper creado:', rdpWrapper);
                                    console.log('Main Process: Wrapper methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(rdpWrapper)));
                                    console.log('Main Process: Wrapper methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(rdpWrapper)));
                                    
                                    // Inicializar el control ActiveX
                                    const result = rdpWrapper.initialize(containerHandle);
                                    console.log('Main Process: Control inicializado:', result);
                                    console.log('Main Process: Result type:', typeof result);
                                    console.log('Main Process: Result type:', typeof result);
                                    
                                    if (result) {
                                        // Configurar el servidor
                                        // Conectar directamente con servidor y credenciales
                                        console.log('Main Process: Servidor configurado:', server);
                                        
                                        // Configurar credenciales
                                        
                                        console.log('Main Process: Credenciales configuradas');
                                        
                                        // Configurar resoluciÃ³n
                                        
                                        console.log('Main Process: ResoluciÃ³n configurada:', width + 'x' + height);
                                        
                                        // Conectar
                                        container.innerHTML = \`
                                            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                                <div style="text-align: center;">
                                                    <h3>RDP ActiveX Control</h3>
                                                    <p>Conectando a \${server}...</p>
                                                    <p>Usuario: \${username}</p>
                                                    <p>Instance ID: \${instanceId}</p>
                                                    <p>ResoluciÃ³n: \${width}x\${height}</p>
                                                </div>
                                            </div>
                                        \`;
                                        
                                        const connectResult = rdpWrapper.connect(server, username, '');
                                        console.log('Main Process: Resultado de conexiÃ³n:', connectResult);
                                        
                                        if (connectResult) {
                                            container.innerHTML = \`
                                                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                                    <div style="text-align: center;">
                                                        <h3>RDP ActiveX Control</h3>
                                                        <p style="color: #00ff00;">âœ“ Conectado a \${server}</p>
                                                        <p>Usuario: \${username}</p>
                                                        <p>Instance ID: \${instanceId}</p>
                                                        <p>ResoluciÃ³n: \${width}x\${height}</p>
                                                        <p style="color: #00ff00;">âœ“ Control ActiveX inicializado</p>
                                                    </div>
                                                </div>
                                            \`;
                                            return 'success: connected';
                                        } else {
                                            container.innerHTML = \`
                                                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                                    <div style="text-align: center;">
                                                        <h3>RDP ActiveX Control</h3>
                                                        <p style="color: #ff0000;">âœ— Error al conectar con \${server}</p>
                                                        <p>Usuario: \${username}</p>
                                                        <p>Instance ID: \${instanceId}</p>
                                                        <p>ResoluciÃ³n: \${width}x\${height}</p>
                                                    </div>
                                                </div>
                                            \`;
                                            return 'error: connection failed';
                                        }
                                    } else {
                                        container.innerHTML = \`
                                            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                                <div style="text-align: center;">
                                                    <h3>RDP ActiveX Control</h3>
                                                    <p style="color: #ff0000;">âœ— Error al inicializar el control ActiveX</p>
                                                    <p>Usuario: \${username}</p>
                                                    <p>Instance ID: \${instanceId}</p>
                                                    <p>ResoluciÃ³n: \${width}x\${height}</p>
                                                </div>
                                            </div>
                                        \`;
                                        return 'error: initialization failed';
                                    }
                                } catch (moduleError) {
                                    console.error('Main Process: Error cargando mÃ³dulo nativo:', moduleError);
                                    container.innerHTML = \`
                                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                            <div style="text-align: center;">
                                                <h3>RDP ActiveX Control</h3>
                                                <p style="color: #ff0000;">âœ— Error cargando mÃ³dulo nativo</p>
                                                <p>Error: \${moduleError.message}</p>
                                                <p>Usuario: \${username}</p>
                                                <p>Instance ID: \${instanceId}</p>
                                                <p>ResoluciÃ³n: \${width}x\${height}</p>
                                            </div>
                                        </div>
                                    \`;
                                    return 'error: module load failed - ' + moduleError.message;
                                }
                            } else {
                                console.log('Main Process: Node.js no disponible, usando fallback...');
                                container.innerHTML = \`
                                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                        <div style="text-align: center;">
                                            <h3>RDP ActiveX Control</h3>
                                            <p>Conectando a \${server}...</p>
                                            <p>Usuario: \${username}</p>
                                            <p>Instance ID: \${instanceId}</p>
                                            <p>ResoluciÃ³n: \${width}x\${height}</p>
                                            <p style="color: #ffff00;">âš  Modo fallback - Control ActiveX no disponible</p>
                                        </div>
                                    </div>
                                \`;
                                return 'fallback: node.js not available';
                            }
                        } catch (error) {
                            console.error('Main Process: Error en initializeActiveXControl:', error);
                            return 'error: ' + error.message;
                        }
                    }
                    
                    // Ejecutar la funciÃ³n y devolver el resultado
                    initializeActiveXControl();
                `).then((result) => {
                    console.log('Main: Resultado del JavaScript en ventana hija:', result);
                }).catch((error) => {
                    console.error('Main: Error ejecutando JavaScript en ventana hija:', error);
                });
        });
        
                    // Timeout de respaldo para ejecutar JavaScript si did-finish-load no se dispara
            setTimeout(() => {
                console.log('Main: Timeout de respaldo - ejecutando JavaScript en ventana hija');
                childWindow.webContents.executeJavaScript(`
                    console.log('Main Process: JavaScript iniciado en ventana hija (timeout)');
                    console.log('Main Process: Verificando parámetros de URL (timeout)...');
                    console.log('Main Process: DOM ready (timeout):', document.readyState);
                    
                    // FunciÃ³n para inicializar el control ActiveX
                    async function initializeActiveXControl() {
                        try {
                            console.log('Main Process: FunciÃ³n initializeActiveXControl iniciada');
                            console.log('Main Process: Inicializando control ActiveX...');
                            
                            // Obtener parÃ¡metros de la URL
                            const urlParams = new URLSearchParams(window.location.search);
                            const instanceId = urlParams.get('instanceId');
                            const server = urlParams.get('server');
                            const username = urlParams.get('username');
                            const width = urlParams.get('width');
                            const height = urlParams.get('height');
                            
                            
                            
                            console.log('Main Process: ParÃ¡metros recibidos:', { instanceId, server, username, width, height });
                            
                            // Actualizar el contenido del contenedor
                            const container = document.querySelector('#rdp-container');
                            console.log('Main Process: Container encontrado:', !!container);
                            console.log('Main Process: Container ID:', container ? container.id : 'not found');
                            
                            if (!container || !instanceId || !server) {
                                return 'error: missing data - container: ' + !!container + ', instanceId: ' + !!instanceId + ', server: ' + !!server;
                            }
                            
                            // Mostrar mensaje de inicializaciÃ³n
                            container.innerHTML = \`
                                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                    <div style="text-align: center;">
                                        <h3>RDP ActiveX Control</h3>
                                        <p>Inicializando control ActiveX...</p>
                                        <p>Servidor: \${server}</p>
                                        <p>Usuario: \${username}</p>
                                        <p>Instance ID: \${instanceId}</p>
                                        <p>ResoluciÃ³n: \${width}x\${height}</p>
                                    </div>
                                </div>
                            \`;
                            
                            // Verificar si estamos en un entorno Electron con Node.js
                            if (typeof require !== 'undefined') {
                                console.log('Main Process: Node.js disponible, cargando mÃ³dulo nativo...');
                                
                                try {
                                    // Cargar el mÃ³dulo nativo de ActiveX
                                    const rdpActiveX = require('./native/rdp-activex/build/Release/rdp_activex_basic.node');
                                    console.log('Main Process: MÃ³dulo nativo cargado:', rdpActiveX);
                                    console.log('Main Process: Funciones disponibles:', Object.keys(rdpActiveX));
                                    console.log('Main Process: RdpBasicWrapper disponible:', !!rdpActiveX.RdpBasicWrapper);
                                    console.log('Main Process: RdpBasicWrapper constructor:', typeof rdpActiveX.RdpBasicWrapper);
                                    console.log('Main Process: Funciones disponibles:', Object.keys(rdpActiveX));
                                    console.log('Main Process: RdpBasicWrapper disponible:', !!rdpActiveX.RdpBasicWrapper);
                                    console.log('Main Process: RdpBasicWrapper constructor:', typeof rdpActiveX.RdpBasicWrapper);
                                    console.log('Main Process: Funciones disponibles:', Object.keys(rdpActiveX));
                                    console.log('Main Process: RdpBasicWrapper disponible:', !!rdpActiveX.RdpBasicWrapper);
                                    console.log('Main Process: RdpBasicWrapper constructor:', typeof rdpActiveX.RdpBasicWrapper);
                                    
                                    // Obtener el handle de la ventana actual
                                    const containerHandle = BigInt(0); // Por ahora usamos 0 como handle por defecto
                                    
                                    // Inicializar el control ActiveX
                                    // Verificar si las funciones necesarias estÃ¡n disponibles
                                    if (!rdpActiveX.RdpBasicWrapper) {
                                        throw new Error('Clase RdpBasicWrapper no disponible. Funciones disponibles: ' + Object.keys(rdpActiveX).join(', '));
                                    }
                                    
                                    // Crear una instancia del wrapper
                                    const rdpWrapper = new rdpActiveX.RdpBasicWrapper();
                                    console.log('Main Process: Wrapper creado:', rdpWrapper);
                                    console.log('Main Process: Wrapper methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(rdpWrapper)));
                                    console.log('Main Process: Wrapper methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(rdpWrapper)));
                                    
                                    // Inicializar el control ActiveX
                                    const result = rdpWrapper.initialize(containerHandle);
                                    console.log('Main Process: Control inicializado:', result);
                                    console.log('Main Process: Result type:', typeof result);
                                    console.log('Main Process: Result type:', typeof result);
                                    
                                    if (result) {
                                        // Configurar el servidor
                                        // Conectar directamente con servidor y credenciales
                                        console.log('Main Process: Servidor configurado:', server);
                                        
                                        // Configurar credenciales
                                        
                                        console.log('Main Process: Credenciales configuradas');
                                        
                                        // Configurar resoluciÃ³n
                                        
                                        console.log('Main Process: ResoluciÃ³n configurada:', width + 'x' + height);
                                        
                                        // Conectar
                                        container.innerHTML = \`
                                            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                                <div style="text-align: center;">
                                                    <h3>RDP ActiveX Control</h3>
                                                    <p>Conectando a \${server}...</p>
                                                    <p>Usuario: \${username}</p>
                                                    <p>Instance ID: \${instanceId}</p>
                                                    <p>ResoluciÃ³n: \${width}x\${height}</p>
                                                </div>
                                            </div>
                                        \`;
                                        
                                        const connectResult = rdpWrapper.connect(server, username, '');
                                        console.log('Main Process: Resultado de conexiÃ³n:', connectResult);
                                        
                                        if (connectResult) {
                                            container.innerHTML = \`
                                                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                                    <div style="text-align: center;">
                                                        <h3>RDP ActiveX Control</h3>
                                                        <p style="color: #00ff00;">âœ“ Conectado a \${server}</p>
                                                        <p>Usuario: \${username}</p>
                                                        <p>Instance ID: \${instanceId}</p>
                                                        <p>ResoluciÃ³n: \${width}x\${height}</p>
                                                        <p style="color: #00ff00;">âœ“ Control ActiveX inicializado</p>
                                                    </div>
                                                </div>
                                            \`;
                                            return 'success: connected';
                                        } else {
                                            container.innerHTML = \`
                                                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                                    <div style="text-align: center;">
                                                        <h3>RDP ActiveX Control</h3>
                                                        <p style="color: #ff0000;">âœ— Error al conectar con \${server}</p>
                                                        <p>Usuario: \${username}</p>
                                                        <p>Instance ID: \${instanceId}</p>
                                                        <p>ResoluciÃ³n: \${width}x\${height}</p>
                                                    </div>
                                                </div>
                                            \`;
                                            return 'error: connection failed';
                                        }
                                    } else {
                                        container.innerHTML = \`
                                            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                                <div style="text-align: center;">
                                                    <h3>RDP ActiveX Control</h3>
                                                    <p style="color: #ff0000;">âœ— Error al inicializar el control ActiveX</p>
                                                    <p>Usuario: \${username}</p>
                                                    <p>Instance ID: \${instanceId}</p>
                                                    <p>ResoluciÃ³n: \${width}x\${height}</p>
                                                </div>
                                            </div>
                                        \`;
                                        return 'error: initialization failed';
                                    }
                                } catch (moduleError) {
                                    console.error('Main Process: Error cargando mÃ³dulo nativo:', moduleError);
                                    container.innerHTML = \`
                                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                            <div style="text-align: center;">
                                                <h3>RDP ActiveX Control</h3>
                                                <p style="color: #ff0000;">âœ— Error cargando mÃ³dulo nativo</p>
                                                <p>Error: \${moduleError.message}</p>
                                                <p>Usuario: \${username}</p>
                                                <p>Instance ID: \${instanceId}</p>
                                                <p>ResoluciÃ³n: \${width}x\${height}</p>
                                            </div>
                                        </div>
                                    \`;
                                    return 'error: module load failed - ' + moduleError.message;
                                }
                            } else {
                                console.log('Main Process: Node.js no disponible, usando fallback...');
                                container.innerHTML = \`
                                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                                        <div style="text-align: center;">
                                            <h3>RDP ActiveX Control</h3>
                                            <p>Conectando a \${server}...</p>
                                            <p>Usuario: \${username}</p>
                                            <p>Instance ID: \${instanceId}</p>
                                            <p>ResoluciÃ³n: \${width}x\${height}</p>
                                            <p style="color: #ffff00;">âš  Modo fallback - Control ActiveX no disponible</p>
                                        </div>
                                    </div>
                                \`;
                                return 'fallback: node.js not available';
                            }
                        } catch (error) {
                            console.error('Main Process: Error en initializeActiveXControl:', error);
                            return 'error: ' + error.message;
                        }
                    }
                    
                    // Ejecutar la funciÃ³n y devolver el resultado
                    initializeActiveXControl();
                `).then((result) => {
                    console.log('Main: Resultado del JavaScript en ventana hija:', result);
                }).catch((error) => {
                    console.error('Main: Error ejecutando JavaScript por timeout en ventana hija:', error);
                });
            }, 2000); // 2 segundos de timeout
        
        // Agregar evento para errores de carga
        childWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error('Main: Error cargando ventana hija:', errorCode, errorDescription);
        });
        
        // Agregar evento para cuando la ventana se muestra
        childWindow.on('show', () => {
            console.log('Main: Ventana hija mostrada para instancia:', instanceId);
        });
        
        // Agregar evento para cuando la ventana se cierra
        childWindow.on('closed', () => {
            console.log('Main: Ventana hija cerrada para instancia:', instanceId);
        });
        
        // Agregar evento para errores de la ventana
        childWindow.on('unresponsive', () => {
            console.error('Main: Ventana hija no responde para instancia:', instanceId);
        });
        
        // Guardar la referencia de la ventana hija
        if (!global.activeXChildWindows) {
          global.activeXChildWindows = new Map();
        }
        global.activeXChildWindows.set(instanceId, childWindow);
        
        console.log('Main: Ventana hija creada para instancia:', instanceId);
        return { success: true, windowId: childWindow.id };
      } catch (error) {
        console.error('Error creating ActiveX child window:', error);
        throw error;
      }
    });

// Cleanup ActiveX instances on app quit
app.on('before-quit', () => {
  if (rdpActiveXManager) {
    rdpActiveXManager.cleanup();
  }
});

// === Terminal Support ===
const pty = require('node-pty');

let powershellProcesses = {}; // Cambiar a objeto para mÃºltiples procesos
let wslProcesses = {}; // Cambiar a objeto para mÃºltiples procesos

// Function to detect the best available Linux shell
function getLinuxShell() {
  const shells = [
    '/usr/bin/zsh',      // Zsh - modern shell with great features
    '/bin/zsh',
    '/usr/bin/fish',     // Fish - user-friendly shell
    '/bin/fish',
    '/usr/bin/bash',     // Bash - most common default
    '/bin/bash',
    '/usr/bin/dash',     // Dash - lightweight
    '/bin/dash',
    '/bin/sh'            // POSIX shell - always available fallback
  ];

  // Check user's default shell first
  try {
    const userShell = process.env.SHELL;
    if (userShell && fs.existsSync(userShell)) {
      console.log(`Using user's default shell: ${userShell}`);
      return userShell;
    }
  } catch (e) {
    console.warn('Could not detect user shell:', e.message);
  }

  // Check available shells in order of preference
  for (const shell of shells) {
    try {
      if (fs.existsSync(shell)) {
        console.log(`Detected Linux shell: ${shell}`);
        return shell;
      }
    } catch (e) {
      // Continue to next shell
    }
  }

  // Ultimate fallback
  console.warn('No common shells found, falling back to /bin/sh');
  return '/bin/sh';
}

// Start PowerShell session
ipcMain.on('powershell:start', (event, { cols, rows }) => {
  const tabId = 'default'; // Fallback para compatibilidad
  startPowerShellSession(tabId, { cols, rows });
});

// Start terminal session with tab ID (PowerShell on Windows, native shell on Linux/macOS)
function startPowerShellSession(tabId, { cols, rows }) {
  // No iniciar nuevos procesos si la app estÃ¡ cerrando
  if (isAppQuitting) {
    console.log(`Evitando iniciar PowerShell para ${tabId} - aplicaciÃ³n cerrando`);
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
        const welcomeMsg = `\r\n\x1b[32m=== SesiÃ³n ${shellName} reutilizada ===\x1b[0m\r\n`;
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
    } else if (platform === 'linux' || platform === 'darwin') {
      // For Linux and macOS, detect the best available shell
      shell = getLinuxShell();
      args = []; // Most Linux shells don't need special args for interactive mode
    } else {
      // Fallback to PowerShell Core for other platforms
      shell = 'pwsh';
      args = ['-NoExit'];
    }

    // Spawn PowerShell process con configuraciÃ³n ultra-conservative
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
      // ConfiguraciÃ³n principal
      spawnOptions,
      // ConfiguraciÃ³n conservadora
      { ...alternativePtyConfig.conservative, cwd: os.homedir() },
      // ConfiguraciÃ³n con WinPTY
      { ...alternativePtyConfig.winpty, cwd: os.homedir() },
      // ConfiguraciÃ³n mÃ­nima
      { ...alternativePtyConfig.minimal, cwd: os.homedir() }
    ];
    
    for (let i = 0; i < configsToTry.length && !spawnSuccess; i++) {
      try {
        // lÃ­nea eliminada: console.log(`Intentando configuraciÃ³n ${i + 1}/${configsToTry.length} para PowerShell ${tabId}...`);
        powershellProcesses[tabId] = pty.spawn(shell, args, configsToTry[i]);
        spawnSuccess = true;
        // lÃ­nea eliminada: console.log(`ConfiguraciÃ³n ${i + 1} exitosa para PowerShell ${tabId}`);
      } catch (spawnError) {
        lastError = spawnError;
        console.warn(`ConfiguraciÃ³n ${i + 1} fallÃ³ para PowerShell ${tabId}:`, spawnError.message);
        
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
      // Ãšltimo recurso: usar SafeWindowsTerminal para Windows
      if (os.platform() === 'win32') {
        try {
          console.log(`Intentando SafeWindowsTerminal como Ãºltimo recurso para ${tabId}...`);
          const safeTerminal = new SafeWindowsTerminal(shell, args, {
            cwd: os.homedir(),
            env: process.env,
            windowsHide: false
          });
          
          powershellProcesses[tabId] = safeTerminal.spawn();
          spawnSuccess = true;
          // lÃ­nea eliminada: console.log(`SafeWindowsTerminal exitoso para ${tabId}`);
        } catch (safeError) {
          console.error(`SafeWindowsTerminal tambiÃ©n fallÃ³ para ${tabId}:`, safeError.message);
        }
      }
      
      if (!spawnSuccess) {
        throw new Error(`No se pudo iniciar PowerShell para ${tabId} despuÃ©s de probar todas las configuraciones: ${lastError?.message || 'Error desconocido'}`);
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
      //console.log(`PowerShell process for tab ${tabId} exited with code:`, exitCode, 'signal:', signal, 'type:', typeof exitCode);
      
      // Extraer el cÃ³digo de salida real
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
      
      //console.log(`PowerShell ${tabId} actual exit code:`, actualExitCode);
      
      // Limpiar el proceso actual
      delete powershellProcesses[tabId];
      
      // Determinar si es una terminaciÃ³n que requiere reinicio automÃ¡tico
      // Solo reiniciar para cÃ³digos especÃ­ficos de fallo de ConPTY, no para terminaciones normales
      const needsRestart = actualExitCode === -1073741510; // Solo fallo de ConPTY
      
      if (needsRestart) {
        // Para fallos especÃ­ficos como ConPTY, reiniciar automÃ¡ticamente
        console.log(`PowerShell ${tabId} fallÃ³ con cÃ³digo ${actualExitCode}, reiniciando en 1 segundo...`);
        setTimeout(() => {
          if (!isAppQuitting && mainWindow && mainWindow.webContents) {
            console.log(`Reiniciando PowerShell ${tabId} despuÃ©s de fallo...`);
            // Usar las dimensiones originales o por defecto
            const originalCols = cols || 120;
            const originalRows = rows || 30;
            startPowerShellSession(tabId, { cols: originalCols, rows: originalRows });
          }
        }, 1000);
      } else {
        // Para terminaciones normales (cÃ³digo 0) o errores (cÃ³digo 1), no reiniciar automÃ¡ticamente
        if (actualExitCode === 0) {
          console.log(`PowerShell ${tabId} terminÃ³ normalmente (cÃ³digo ${actualExitCode})`);
        } else {
          console.log(`PowerShell ${tabId} terminÃ³ con error (cÃ³digo ${actualExitCode})`);
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

    // lÃ­nea eliminada: console.log(`PowerShell ${tabId} iniciado exitosamente`);

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
  
  // Registrar eventos para este tab si no estÃ¡n registrados
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
      
      // En Windows, usar destroy() para forzar terminaciÃ³n
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
              // Ignorar errores de terminaciÃ³n forzada
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
  // No iniciar nuevos procesos si la app estÃ¡ cerrando
  if (isAppQuitting) {
    console.log(`Evitando iniciar WSL para ${tabId} - aplicaciÃ³n cerrando`);
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

    // MÃºltiples configuraciones para WSL genÃ©rico
    const wslConfigurations = [
      // ConfiguraciÃ³n 1: ConPTY deshabilitado con WinPTY
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
      // ConfiguraciÃ³n 2: Conservativa bÃ¡sica
      {
        name: 'xterm',
        cols: cols || 80,
        rows: rows || 24,
        cwd: os.homedir(),
        env: process.env,
        windowsHide: false,
        useConpty: false
      },
      // ConfiguraciÃ³n 3: MÃ­nima
      {
        name: 'xterm',
        cols: cols || 80,
        rows: rows || 24,
        windowsHide: false
      }
    ];

    let spawnSuccess = false;
    let lastError = null;

    // Intentar cada configuraciÃ³n hasta que una funcione
    for (let i = 0; i < wslConfigurations.length && !spawnSuccess; i++) {
      try {
        // console.log(`Intentando configuraciÃ³n ${i + 1}/${wslConfigurations.length} para WSL genÃ©rico ${tabId}...`); // Eliminado por limpieza de logs
        wslProcesses[tabId] = pty.spawn(shell, args, wslConfigurations[i]);
        // console.log(`ConfiguraciÃ³n ${i + 1} exitosa para WSL genÃ©rico ${tabId}`); // Eliminado por limpieza de logs
        spawnSuccess = true;
      } catch (spawnError) {
        console.warn(`ConfiguraciÃ³n ${i + 1} fallÃ³ para WSL genÃ©rico ${tabId}:`, spawnError.message);
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
      throw new Error(`No se pudo iniciar WSL genÃ©rico para ${tabId} despuÃ©s de probar todas las configuraciones: ${lastError?.message || 'Error desconocido'}`);
    }

    // Handle WSL output
    wslProcesses[tabId].onData((data) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`wsl:data:${tabId}`, data);
      }
    });

    // Handle WSL exit
    wslProcesses[tabId].onExit((exitCode, signal) => {
      // console.log(`WSL process for tab ${tabId} exited with code:`, exitCode, 'signal:', signal, 'type:', typeof exitCode); // Eliminado por limpieza de logs
      // Extraer el cÃ³digo de salida real
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
      
      //console.log(`WSL ${tabId} actual exit code:`, actualExitCode);
      
      // Limpiar el proceso actual
      delete wslProcesses[tabId];
      
      // Determinar si necesita reinicio automÃ¡tico (solo para errores especÃ­ficos de ConPTY)
      const needsRestart = actualExitCode === -1073741510; // Error especÃ­fico de ConPTY
      const isNormalExit = actualExitCode === 0 || actualExitCode === 1;
      
      if (needsRestart) {
        // console.log(`Reiniciando WSL ${tabId} despuÃ©s de error de ConPTY...`); // Eliminado por limpieza de logs
        setTimeout(() => {
          if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
            // console.log(`Reiniciando WSL ${tabId} despuÃ©s de error de ConPTY...`); // Eliminado por limpieza de logs
            startWSLSession(tabId, { cols: cols || 120, rows: rows || 30 });
          }
        }, 2000);
      } else if (isNormalExit) {
        // Para terminaciones normales, reiniciar automÃ¡ticamente despuÃ©s de un delay corto
        // console.log(`WSL ${tabId} terminÃ³ normalmente, reiniciando en 1 segundo...`); // Eliminado por limpieza de logs
        setTimeout(() => {
          if (!isAppQuitting && mainWindow && mainWindow.webContents) {
            // console.log(`Reiniciando WSL ${tabId}...`); // Eliminado por limpieza de logs
            // Usar las dimensiones originales o por defecto
            const originalCols = cols || 120;
            const originalRows = rows || 30;
            startWSLSession(tabId, { cols: originalCols, rows: originalRows });
          }
        }, 1000);
      } else {
        // Solo reportar como error si no es una terminaciÃ³n normal
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
      // console.log(`Deteniendo proceso WSL para tab ${tabId}`); // Eliminado por limpieza de logs
      const process = wslProcesses[tabId];
      
      // Remover listeners antes de terminar el proceso
      process.removeAllListeners();
      
      // En Windows, usar destroy() para forzar terminaciÃ³n
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
              // Ignorar errores de terminaciÃ³n forzada
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

// FunciÃ³n para detectar si Ubuntu estÃ¡ disponible
function detectUbuntuAvailability() {
  return new Promise((resolve) => {
    const platform = os.platform();
    console.log('ðŸ” Detectando Ubuntu, plataforma:', platform);
    
    if (platform !== 'win32') {
      // En sistemas no Windows, verificar si bash estÃ¡ disponible
      const { spawn } = require('child_process');
      const bashCheck = spawn('bash', ['--version'], { stdio: 'pipe' });
      
      bashCheck.on('close', (code) => {
        console.log('ðŸ§ Bash check completed with code:', code);
        resolve(code === 0);
      });
      
      bashCheck.on('error', (error) => {
        console.log('âŒ Bash check error:', error.message);
        resolve(false);
      });
      
      // Timeout de 2 segundos
      setTimeout(() => {
        console.log('â° Bash check timeout');
        bashCheck.kill();
        resolve(false);
      }, 2000);
    } else {
      // En Windows, verificar si ubuntu estÃ¡ disponible
      const { spawn } = require('child_process');
      console.log('ðŸ” Verificando ubuntu en Windows...');
      
      const ubuntuCheck = spawn('ubuntu', ['--help'], { 
        stdio: 'pipe',
        windowsHide: true 
      });
      
      let resolved = false;
      
      ubuntuCheck.on('close', (code) => {
        if (!resolved) {
          resolved = true;
                  console.log('ðŸŸ¢ Ubuntu check completed with code:', code);
        // Ubuntu devuelve cÃ³digo 0 cuando estÃ¡ disponible
        // TambiÃ©n puede devolver null o undefined en algunos casos vÃ¡lidos
        const isAvailable = (code === 0 || code === null || code === undefined);
        console.log('ðŸ” Ubuntu detectado como disponible:', isAvailable);
          resolve(isAvailable);
        }
      });
      
      ubuntuCheck.on('error', (error) => {
        if (!resolved) {
          resolved = true;
                  console.log('âŒ Ubuntu check error:', error.message);
        // Si ubuntu no existe, devolverÃ¡ ENOENT
          resolve(false);
        }
      });
      
      ubuntuCheck.on('exit', (code, signal) => {
        if (!resolved) {
          resolved = true;
          console.log('ðŸšª Ubuntu exit with code:', code, 'signal:', signal);
          const isAvailable = (code === 0 || code === null || code === undefined);
          console.log('ðŸ” Ubuntu detectado como disponible (exit):', isAvailable);
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
      
      // Timeout de 5 segundos (mÃ¡s tiempo para Windows)
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log('â° Ubuntu check timeout');
          console.log('ðŸ“ Output:', output.substring(0, 200));
          console.log('ðŸ“ Error output:', errorOutput.substring(0, 200));
          ubuntuCheck.kill();
          resolve(false);
        }
      }, 5000);
    }
  });
}

// Funciones de manejo para distribuciones WSL (genÃ©ricas)
function handleWSLDistroStart(tabId, { cols, rows, distroInfo }) {
    startWSLDistroSession(tabId, { cols, rows, distroInfo });
}

// Funciones de manejo para Ubuntu (compatibilidad)
function handleUbuntuStart(tabId, { cols, rows, ubuntuInfo }) {
    // Convertir ubuntuInfo a distroInfo para usar la funciÃ³n genÃ©rica
    const distroInfo = ubuntuInfo ? {
        ...ubuntuInfo,
        category: 'ubuntu'
    } : null;
    
    startWSLDistroSession(tabId, { cols, rows, distroInfo });
}

// FunciÃ³n genÃ©rica para iniciar cualquier distribuciÃ³n WSL
function startWSLDistroSession(tabId, { cols, rows, distroInfo }) {
    if (isAppQuitting) {
        console.log(`Evitando iniciar distribuciÃ³n WSL para ${tabId} - aplicaciÃ³n cerrando`);
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
        
        // Usar el ejecutable especÃ­fico de la distribuciÃ³n
        if (distroInfo && distroInfo.executable) {
            shell = distroInfo.executable;
        } else {
            // Fallback a wsl.exe genÃ©rico
            shell = 'wsl.exe';
            console.log('âš ï¸ Sin info especÃ­fica, usando wsl.exe genÃ©rico');
        }
        
        args = []; // Las distribuciones WSL funcionan mejor sin argumentos especÃ­ficos

        // Environment variables
        const env = {
            ...process.env,
        };

        // MÃºltiples configuraciones para mayor compatibilidad con WSL
        const wslConfigurations = [
            // ConfiguraciÃ³n 1: Por defecto con ConPTY deshabilitado
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
            // ConfiguraciÃ³n 2: Conservativa sin ConPTY 
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
            // ConfiguraciÃ³n 3: MÃ­nima
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

        // Intentar cada configuraciÃ³n hasta que una funcione
        for (let i = 0; i < wslConfigurations.length && !spawnSuccess; i++) {
            try {
                // console.log(`Intentando configuraciÃ³n ${i + 1}/${wslConfigurations.length} para WSL ${shell} ${tabId}...`); // Eliminado por limpieza de logs
                wslDistroProcesses[tabId] = pty.spawn(shell, args, wslConfigurations[i]);
                // console.log(`ConfiguraciÃ³n ${i + 1} exitosa para WSL ${shell} ${tabId}`); // Eliminado por limpieza de logs
                spawnSuccess = true;
            } catch (spawnError) {
                console.warn(`ConfiguraciÃ³n ${i + 1} fallÃ³ para WSL ${shell} ${tabId}:`, spawnError.message);
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
            throw new Error(`No se pudo iniciar WSL ${shell} para ${tabId} despuÃ©s de probar todas las configuraciones: ${lastError?.message || 'Error desconocido'}`);
        }

        // Handle distribution output
        wslDistroProcesses[tabId].onData((data) => {
            // Proteger acceso si el proceso ya no existe
            if (!wslDistroProcesses[tabId]) return;
            // Send ready only on first data reception
            if (!wslDistroProcesses[tabId]._hasReceivedData) {
                wslDistroProcesses[tabId]._hasReceivedData = true;
                // console.log(`WSL terminal ${shell} ready for ${tabId}`); // Eliminado por limpieza de logs
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
            // console.log(`WSL ${shell} (${tabId}) exited with code:`, exitCode, 'signal:', signal); // Eliminado por limpieza de logs
            //console.log(`WSL ${shell} (${tabId}) exited with code:`, exitCode, 'signal:', signal);

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

            // Determinar si necesita reinicio automÃ¡tico (solo para errores especÃ­ficos de ConPTY)
            const needsRestart = exitCode === -1073741510; // Error especÃ­fico de ConPTY
            
            if (needsRestart) {
                console.log(`WSL ${shell} (${tabId}) fallÃ³ con error de ConPTY, reiniciando en 2 segundos...`);
                setTimeout(() => {
                    if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
                        console.log(`Reiniciando WSL ${shell} (${tabId}) despuÃ©s de error de ConPTY...`);
                        startWSLDistroSession(tabId, { cols: cols || 80, rows: rows || 24, distroInfo });
                    }
                }, 2000);
            } else if (exitCode !== 0 && exitCode !== null) {
               // console.warn(`WSL distro process for tab ${tabId} exited unexpectedly`);
                const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
                mainWindow.webContents.send(`${channelName}:error:${tabId}`,
                    `${distroInfo?.label || 'WSL Distribution'} session ended unexpectedly (code: ${actualExitCode})`);
            }

            // Clean up
            delete wslDistroProcesses[tabId];
        });

        // Ready will be sent when first data is received (see onData handler above)
        // console.log(`WSL terminal ${shell} configured for ${tabId}, waiting for data...`); // Eliminado por limpieza de logs

    } catch (error) {
        console.error(`Error starting WSL distro session for tab ${tabId}:`, error);
        if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
            const channelName = distroInfo?.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
            mainWindow.webContents.send(`${channelName}:error:${tabId}`,
                `Failed to start ${distroInfo?.label || 'WSL Distribution'}: ${error.message}`);
        }
    }
}

// FunciÃ³n original para Ubuntu (para compatibilidad)
function startUbuntuSession(tabId, { cols, rows, ubuntuInfo }) {
  // No iniciar nuevos procesos si la app estÃ¡ cerrando
  if (isAppQuitting) {
    console.log(`Evitando iniciar Ubuntu para ${tabId} - aplicaciÃ³n cerrando`);
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
      // Usar el ejecutable especÃ­fico de la versiÃ³n de Ubuntu
      if (ubuntuInfo && ubuntuInfo.executable) {
        shell = ubuntuInfo.executable;
        console.log(`ðŸŽ¯ Usando ejecutable especÃ­fico: ${shell} para ${ubuntuInfo.label || 'Ubuntu'}`);
      } else {
        // Fallback a ubuntu.exe genÃ©rico
        shell = 'ubuntu.exe';
        console.log('âš ï¸ Sin info especÃ­fica, usando ubuntu.exe genÃ©rico');
      }
      args = []; // Ubuntu funciona mejor sin argumentos
    } else {
      // For non-Windows platforms, use bash directly
      shell = '/bin/bash';
      args = ['--login'];
    }

    // Spawn Ubuntu process con configuraciÃ³n simplificada
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
    
    // Para Ubuntu, usar configuraciÃ³n simple sin modificaciones ConPTY
    // Ubuntu funciona mejor con configuraciÃ³n por defecto
    
    ubuntuProcesses[tabId] = pty.spawn(shell, args, spawnOptions);

    // Handle Ubuntu output
    ubuntuProcesses[tabId].onData((data) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(`ubuntu:data:${tabId}`, data);
      }
    });

    // Handle Ubuntu exit
    ubuntuProcesses[tabId].onExit((exitCode, signal) => {
      //console.log(`Ubuntu process for tab ${tabId} exited with code:`, exitCode, 'signal:', signal);
      
      // Extraer el cÃ³digo de salida real
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

// Funciones de manejo para distribuciones WSL genÃ©ricas
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
      // console.log(`Deteniendo proceso WSL distro para tab ${tabId}`); // Eliminado por limpieza de logs
      const process = wslDistroProcesses[tabId];
      
      // Remover listeners antes de terminar el proceso
      process.removeAllListeners();
      
      // En Windows, usar destroy() para forzar terminaciÃ³n
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
              // Ignorar errores de terminaciÃ³n forzada
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
  if (ubuntuProcesses[tabId]) {
    try {
      // console.log(`Deteniendo proceso Ubuntu para tab ${tabId} (nuevo sistema)`); // Eliminado por limpieza de logs
      // console.log(`Deteniendo proceso Ubuntu para tab ${tabId}`); // Eliminado por limpieza de logs
      const process = ubuntuProcesses[tabId];
      
      // Remover listeners antes de terminar el proceso
      process.removeAllListeners();
      
      // En Windows, usar destroy() para forzar terminaciÃ³n
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
              // Ignorar errores de terminaciÃ³n forzada
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

// FunciÃ³n de detecciÃ³n alternativa mÃ¡s simple
function detectUbuntuSimple() {
  return new Promise((resolve) => {
    const platform = os.platform();
    console.log('ðŸ”§ FunciÃ³n de detecciÃ³n simple iniciada, plataforma:', platform);
    
    if (platform !== 'win32') {
      // En sistemas no Windows, asumir que bash estÃ¡ disponible
      resolve(true);
    } else {
          // En Windows, intentar ejecutar ubuntu de forma mÃ¡s directa
    const { exec } = require('child_process');
    
    exec('ubuntu', { 
        timeout: 3000,
        windowsHide: true 
      }, (error, stdout, stderr) => {
        console.log('ðŸ”§ Exec ubuntu result:');
        console.log('   Error:', error?.code || 'none');
        console.log('   Stdout length:', stdout?.length || 0);
        console.log('   Stderr length:', stderr?.length || 0);
        
        // Si no hay error ENOENT, significa que ubuntu existe
        const isAvailable = !error || error.code !== 'ENOENT';
        console.log('ðŸ”§ Ubuntu detectado (simple):', isAvailable);
        resolve(isAvailable);
      });
    }
  });
}

// Set para trackear tabs con eventos registrados
const registeredTabEvents = new Set();

// Sistema de registro dinÃ¡mico para eventos de pestaÃ±as
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



// Evento para registrar nuevas pestaÃ±as
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
        
        // En Windows, usar destroy() para forzar terminaciÃ³n
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
          // TerminaciÃ³n forzada despuÃ©s de 500ms en sistemas POSIX
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
        
        // En Windows, usar destroy() para forzar terminaciÃ³n
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
          // TerminaciÃ³n forzada despuÃ©s de 500ms en sistemas POSIX
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
        
        // En Windows, usar destroy() para forzar terminaciÃ³n
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
          // TerminaciÃ³n forzada despuÃ©s de 500ms en sistemas POSIX
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

// Sistema de estadÃ­sticas del sistema con datos reales
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

  // Red diferencial (solo interfaces activas y fÃ­sicas, Mbps)
  try {
    const netIfaces = await si.networkInterfaces();
    const netStats = await si.networkStats();
    const now = Date.now();
    // Filtrar solo interfaces fÃ­sicas y activas
    const validIfaces = netIfaces.filter(i => i.operstate === 'up' && !i.virtual && !i.internal);
    const validNames = validIfaces.map(i => i.iface);
    const filteredStats = netStats.filter(s => validNames.includes(s.iface));
    let rx = 0, tx = 0;
    if (lastNetStats && lastNetTime) {
      // Sumar la diferencia de bytes para todas las interfaces vÃ¡lidas
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
    // Guardar para la prÃ³xima llamada
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

// Agregar conexiÃ³n al historial
function addToConnectionHistory(connection) {
  const historyItem = {
    id: Date.now().toString(),
    name: connection.name || `${connection.username}@${connection.host}`,
    host: connection.host,
    username: connection.username,
    port: connection.port || 22,
    lastConnected: new Date(),
    status: 'success',
    connectionTime: Math.random() * 3 + 0.5 // Simular tiempo de conexiÃ³n
  };
  
  // Remover entrada existente si ya existe
  connectionHistory.recent = connectionHistory.recent.filter(
    item => !(item.host === connection.host && item.username === connection.username && item.port === (connection.port || 22))
  );
  
  // Agregar al inicio
  connectionHistory.recent.unshift(historyItem);
  
  // Mantener solo las Ãºltimas 10 conexiones
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

// Variables estÃ¡ticas para el cÃ¡lculo diferencial de red
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
    // Reiniciar automÃ¡ticamente si muere
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
      // Si el worker no estÃ¡ listo, devolver fallback
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

// Manejador para peticiones HTTP de Nextcloud con configuraciÃ³n SSL personalizada
ipcMain.handle('nextcloud:http-request', async (event, { url, options, ignoreSSLErrors }) => {
  try {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    
    // Configurar opciones para la peticiÃ³n
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...(ignoreSSLErrors && isHttps && {
        rejectUnauthorized: false,
        requestCert: false,
        agent: false
      })
    };

    return new Promise((resolve, reject) => {
      const client = isHttps ? https : http;
      
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      // Si hay body, enviarlo
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  } catch (error) {
    throw error;
  }
});







