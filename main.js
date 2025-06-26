try {
  require('electron-reloader')(module);
} catch (_) {}

const { app, BrowserWindow, ipcMain, clipboard, dialog } = require('electron');
const path = require('path');
const url = require('url');
const SSH2Promise = require('ssh2-promise');
const { NodeSSH } = require('node-ssh');

let mainWindow;

// Store active SSH connections and their shells
const sshConnections = {};
// Cache for Welcome Messages (MOTD) to show them on every new tab.
const motdCache = {};
// Pool de conexiones SSH compartidas para evitar múltiples conexiones al mismo servidor
const sshConnectionPool = {};

// Función para limpiar conexiones SSH huérfanas cada 15 segundos
setInterval(() => {
  const activeKeys = new Set(Object.values(sshConnections).map(conn => conn.cacheKey));
  
  for (const [poolKey, poolConnection] of Object.entries(sshConnectionPool)) {
    if (!activeKeys.has(poolKey)) {
      console.log(`Limpiando conexión SSH huérfana: ${poolKey}`);
      try {
        // Limpiar listeners antes de cerrar
        if (poolConnection.ssh) {
          poolConnection.ssh.removeAllListeners();
        }
        poolConnection.close();
      } catch (e) {
        console.warn(`Error closing orphaned connection: ${e.message}`);
      }
      delete sshConnectionPool[poolKey];
    }
  }
}, 15000); // Cada 15 segundos para una limpieza más frecuente

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
                !name.startsWith('/dev')) {
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
        if (iface && iface !== 'lo:') {
            totalRx += parseInt(parts[1], 10);
            totalTx += parseInt(parts[9], 10);
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
}

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

// IPC handler to establish an SSH connection
ipcMain.on('ssh:connect', async (event, { tabId, config }) => {
  const cacheKey = `${config.username}@${config.host}:${config.port || 22}`;
  
  // Para conexiones de terminal, SIEMPRE crear una nueva conexión SSH
  // No reutilizar del pool porque las terminales necesitan shells dedicados
  const ssh = new SSH2Promise(config);
  console.log(`Creando nueva conexión SSH para terminal ${cacheKey}`);

  const statsLoop = async (hostname, distro, ip) => {
    // Verificación robusta de la conexión
    const conn = sshConnections[tabId];
    if (!conn || !conn.ssh || !conn.stream || conn.stream.destroyed) {
      return; // Stop if connection is closed or invalid
    }

    try {
      // --- Get CPU stats first
      const cpuStatOutput = await ssh.exec("grep 'cpu ' /proc/stat");
      const cpuTimes = cpuStatOutput.trim().split(/\s+/).slice(1).map(t => parseInt(t, 10));
      const currentCpu = { user: cpuTimes[0], nice: cpuTimes[1], system: cpuTimes[2], idle: cpuTimes[3], iowait: cpuTimes[4], irq: cpuTimes[5], softirq: cpuTimes[6], steal: cpuTimes[7] };

      let cpuLoad = '0.00';
      const previousCpu = sshConnections[tabId].previousCpu;

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
      sshConnections[tabId].previousCpu = currentCpu;

      // --- Get Memory, Disk, Uptime and Network stats ---
      const allStatsRes = await ssh.exec("free -b && df -P && uptime && cat /proc/net/dev");
      const parts = allStatsRes.trim().split('\n');

      // Parse Memory
      const memLine = parts.find(line => line.startsWith('Mem:'));
      const memParts = memLine.split(/\s+/);
      const mem = {
          total: parseInt(memParts[1], 10),
          used: parseInt(memParts[2], 10),
      };

      // Parse Disk
      const dfIndex = parts.findIndex(line => line.trim().startsWith('Filesystem'));
      const dfOutput = parts.slice(dfIndex).join('\n');
      const disks = parseDfOutput(dfOutput);

      // Parse Uptime
      const uptimeLine = parts.find(line => line.includes(' up '));
      let uptime = '';
      if (uptimeLine) {
        const match = uptimeLine.match(/up (.*?),/);
        if (match && match[1]) {
          uptime = match[1].trim();
        }
      }

      // Parse Network
      const netIndex = parts.findIndex(line => line.trim().includes('Inter-|   Receive'));
      const netOutput = parts.slice(netIndex).join('\n');
      const currentNet = parseNetDev(netOutput);
      const previousNet = sshConnections[tabId].previousNet;
      const previousTime = sshConnections[tabId].previousTime;
      const currentTime = Date.now();
      let network = { rx_speed: 0, tx_speed: 0 };

      if (previousNet && previousTime) {
          const timeDiff = (currentTime - previousTime) / 1000; // in seconds
          const rxDiff = currentNet.totalRx - previousNet.totalRx;
          const txDiff = currentNet.totalTx - previousNet.totalTx;

          network.rx_speed = Math.max(0, rxDiff / timeDiff);
          network.tx_speed = Math.max(0, txDiff / timeDiff);
      }
      sshConnections[tabId].previousNet = currentNet;
      sshConnections[tabId].previousTime = currentTime;

      const stats = { 
          cpu: cpuLoad, 
          mem, 
          disk: disks, 
          uptime, 
          network, 
          hostname: hostname,
          distro: distro,
          ip: ip
      };
      sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
    } catch (e) {
      // console.error(`Error fetching stats for ${tabId}:`, e.message);
    } finally {
      // Verificar nuevamente que la conexión siga válida antes de programar siguiente loop
      const finalConn = sshConnections[tabId];
      if (finalConn && finalConn.ssh && finalConn.stream && !finalConn.stream.destroyed) {
        finalConn.statsTimeout = setTimeout(() => statsLoop(hostname, distro, ip), 2000);
      }
    }
  };

  try {
    // For subsequent connections, send the cached MOTD immediately.
    if (motdCache[cacheKey]) {
      sendToRenderer(event.sender, `ssh:data:${tabId}`, motdCache[cacheKey]);
    }

    // Conectar siempre (nueva conexión)
    console.log(`Conectando SSH para terminal ${cacheKey}...`);
    
    // Configurar límites de listeners ANTES de conectar
    ssh.setMaxListeners(100);
    
    try {
      await ssh.connect();
      console.log(`Conectado exitosamente a terminal ${cacheKey}`);
      
      // Configurar límites adicionales en la conexión SSH interna
      if (ssh.ssh) {
        ssh.ssh.setMaxListeners(100);
      }
      
      // NO guardar conexiones de terminal en el pool - son dedicadas
    } catch (connectError) {
      console.error(`Error conectando terminal a ${cacheKey}:`, connectError);
      throw connectError; // Re-lanzar el error para que sea manejado por el catch principal
    }
    
    const stream = await ssh.shell({ term: 'xterm-256color' });
    
    // Configurar límites de listeners para cada stream individual
    stream.setMaxListeners(0); // Sin límite para streams individuales

    sshConnections[tabId] = { ssh, stream, config, cacheKey, previousCpu: null, statsTimeout: null, previousNet: null, previousTime: null };

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
      delete sshConnections[tabId];
    });

    sendToRenderer(event.sender, `ssh:ready:${tabId}`);

    // After setting up the shell, get the hostname/distro and start the stats loop
    let realHostname = 'unknown';
    let osRelease = '';
    try {
      realHostname = (await ssh.exec('hostname')).trim();
    } catch (e) {
      // Si falla, dejamos 'unknown'
    }
    try {
      osRelease = await ssh.exec('cat /etc/os-release');
    } catch (e) {
      osRelease = 'ID=linux'; // fallback si no existe el archivo
    }
    const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
    const finalDistroId = distroId.replace(/"/g, '').toLowerCase();
    statsLoop(realHostname, finalDistroId, config.host);

  } catch (err) {
    console.error(`Error en conexión SSH para ${tabId}:`, err);
    
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
    if (conn && conn.stream) {
        conn.stream.setWindow(rows, cols);
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
      
      // Limpiar listeners del stream de forma más agresiva
      if (conn.stream) {
        try {
          conn.stream.removeAllListeners();
          if (!conn.stream.destroyed) {
            conn.stream.destroy();
          }
        } catch (streamError) {
          console.warn(`Error destroying stream: ${streamError?.message || streamError || 'Unknown error'}`);
        }
      }
      
      // Verificar si otras pestañas están usando la misma conexión SSH
      const otherTabsUsingConnection = Object.values(sshConnections)
        .filter(c => c !== conn && c.cacheKey === conn.cacheKey);
      
      // Solo cerrar la conexión SSH si no hay otras pestañas usándola
      if (otherTabsUsingConnection.length === 0 && conn.ssh && conn.cacheKey) {
        try {
          console.log(`Cerrando conexión SSH compartida para ${conn.cacheKey} (última pestaña)`);
          
          // Limpiar listeners de la conexión SSH también
          if (conn.ssh.ssh) {
            conn.ssh.ssh.removeAllListeners();
          }
          
          conn.ssh.close();
          delete sshConnectionPool[conn.cacheKey];
        } catch (closeError) {
          console.warn(`Error closing SSH connection: ${closeError?.message || closeError || 'Unknown error'}`);
        }
      } else {
        console.log(`Manteniendo conexión SSH para ${conn.cacheKey} (${otherTabsUsingConnection.length} pestañas restantes)`);
      }
      
    } catch (error) {
      console.error(`Error cleaning up SSH connection ${tabId}:`, error);
    } finally {
      // Always delete the connection
      delete sshConnections[tabId];
    }
  }
});

// Permite cerrar la app desde el renderer (React) usando ipcRenderer
ipcMain.on('app-quit', () => {
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
          conn.ssh.ssh.removeAllListeners();
        }
        conn.ssh.close();
      } catch (e) {
        // Ignorar errores
      }
    }
  });
  
  // Limpiar también el pool de conexiones
  Object.values(sshConnectionPool).forEach(poolConn => {
    try {
      poolConn.close();
    } catch (e) {
      // Ignorar errores
    }
  });
  
  app.quit();
});

// Limpieza robusta también en before-quit
app.on('before-quit', () => {
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
          conn.ssh.ssh.removeAllListeners();
        }
        conn.ssh.close();
      } catch (e) {
        // Ignorar errores
      }
    }
  });
  
  // Limpiar también el pool de conexiones
  Object.values(sshConnectionPool).forEach(poolConn => {
    try {
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

// Function to safely send to mainWindow
function sendToRenderer(sender, ...args) {
  try {
    if (sender && typeof sender.isDestroyed === 'function' && !sender.isDestroyed()) {
      sender.send(...args);
    }
  } catch (error) {
    // Silently ignore renderer communication errors
    console.warn('Failed to send to renderer:', error?.message || error || 'Unknown error');
  }
}

// Helper function to find SSH connection by host/username or by tabId
async function findSSHConnection(tabId, sshConfig = null) {
  console.log(`[DEBUG] findSSHConnection called with tabId: ${tabId}, sshConfig:`, sshConfig);
  // Primero intentar por tabId (para conexiones directas de terminal)
  if (sshConnections[tabId]) {
    console.log(`[DEBUG] Found existing connection for tabId: ${tabId}`);
    return sshConnections[tabId];
  }
  
  // Si no existe por tabId y tenemos sshConfig, buscar cualquier conexión al mismo servidor
  if (sshConfig && sshConfig.host && sshConfig.username) {
    const targetCacheKey = `${sshConfig.username}@${sshConfig.host}:${sshConfig.port || 22}`;
    
    // Buscar en conexiones activas
    for (const conn of Object.values(sshConnections)) {
      if (conn.cacheKey === targetCacheKey) {
        return conn;
      }
    }
    
    // Buscar en el pool de conexiones
    const existingPoolConnection = sshConnectionPool[targetCacheKey];
    if (existingPoolConnection) {
      try {
        // Verificar si la conexión del pool sigue siendo válida
        // SSH2Promise maneja la verificación de estado internamente
        try {
          // Intentar una operación simple para verificar si la conexión está activa
          await existingPoolConnection.exec('echo "test"');
          console.log(`Reutilizando conexión del pool para: ${targetCacheKey}`);
          return { ssh: existingPoolConnection, cacheKey: targetCacheKey };
        } catch (testError) {
          console.log(`Conexión del pool no válida para ${targetCacheKey}, limpiando...`);
          // Limpiar conexión no válida
          try {
            existingPoolConnection.close();
          } catch (e) {
            // Ignorar errores de cierre
          }
          delete sshConnectionPool[targetCacheKey];
        }
      } catch (e) {
        console.log(`Error verificando conexión del pool para ${targetCacheKey}, limpiando...`);
        delete sshConnectionPool[targetCacheKey];
      }
    }
    
    // Si no hay ninguna conexión válida, crear una nueva para el pool
    console.log(`Creando conexión SSH bajo demanda para FileExplorer: ${targetCacheKey}`);
    try {
      const ssh = new SSH2Promise(sshConfig);
      ssh.setMaxListeners(100);
      
      await ssh.connect();
      
      if (ssh.ssh) {
        ssh.ssh.setMaxListeners(100);
      }
      
      // Guardar en el pool
      sshConnectionPool[targetCacheKey] = ssh;
      
      console.log(`Conexión SSH creada exitosamente para: ${targetCacheKey}`);
      return { ssh: ssh, cacheKey: targetCacheKey };
      
    } catch (error) {
      console.error(`Error creando conexión SSH para ${targetCacheKey}:`, error);
      throw error;
    }
  }
  
  return null;
}

ipcMain.handle('app:get-sessions', async () => {
  // Implementation of getting sessions
});

// File Explorer IPC Handlers
ipcMain.handle('ssh:list-files', async (event, { tabId, path, sshConfig }) => {
  console.log(`[DEBUG] ssh:list-files called with tabId: ${tabId}, path: ${path}, sshConfig:`, sshConfig);
  const conn = await findSSHConnection(tabId, sshConfig);
  console.log(`[DEBUG] findSSHConnection returned:`, { hasConn: !!conn, hasSSH: !!(conn && conn.ssh) });
  if (!conn || !conn.ssh) {
    throw new Error('SSH connection not found');
  }

  try {
    // Usar ls con formato largo para obtener información detallada
    const lsOutput = await conn.ssh.exec(`ls -la "${path}" 2>/dev/null || echo "ERROR: Cannot access directory"`);
    
    if (lsOutput.includes('ERROR: Cannot access directory')) {
      throw new Error(`Cannot access directory: ${path}`);
    }

    // Parsear la salida de ls -la
    const lines = lsOutput.trim().split('\n');
    const files = [];

    // Saltar la primera línea que muestra el total
    lines.slice(1).forEach(line => {
      if (line.trim() === '') return;

      // Parsear línea de ls -la (maneja archivos con espacios y enlaces simbólicos)
      const match = line.match(/^([drwxlstT-]+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\w+\s+\d+\s+[\d:]+)\s+(.+)$/);
      if (!match) return;

      const [, permissions, , owner, group, size, dateTime, fullName] = match;
      
      // Manejar enlaces simbólicos (formato: "nombre -> destino")
      const name = fullName.includes(' -> ') ? fullName.split(' -> ')[0] : fullName;
      
      // Saltar . y .. para el directorio actual
      if (name === '.' || name === '..') {
        // Solo incluir .. si no estamos en la raíz
        if (name === '..' && path !== '/') {
          files.push({
            name: '..',
            type: 'directory',
            size: 0,
            permissions,
            owner,
            group,
            modified: dateTime
          });
        }
        return;
      }

      let type = 'file';
      if (permissions.startsWith('d')) {
        type = 'directory';
      } else if (permissions.startsWith('l')) {
        type = 'symlink';
      }
      
      files.push({
        name,
        type,
        size: parseInt(size, 10),
        permissions,
        owner,
        group,
        modified: dateTime
      });
    });

    return { success: true, files };
  } catch (error) {
    return { success: false, error: error?.message || error || 'Unknown error' };
  }
});

// Verificar si un directorio existe y es accesible
ipcMain.handle('ssh:check-directory', async (event, { tabId, path, sshConfig }) => {
  const conn = await findSSHConnection(tabId, sshConfig);
  if (!conn || !conn.ssh) {
    throw new Error('SSH connection not found');
  }

  try {
    const result = await conn.ssh.exec(`test -d "${path}" && echo "EXISTS" || echo "NOT_EXISTS"`);
    return result.trim() === 'EXISTS';
  } catch (error) {
    return false;
  }
});

// Obtener el directorio home del usuario
ipcMain.handle('ssh:get-home-directory', async (event, { tabId, sshConfig }) => {
  const conn = await findSSHConnection(tabId, sshConfig);
  if (!conn || !conn.ssh) {
    throw new Error('SSH connection not found');
  }

  try {
    const homeDir = await conn.ssh.exec('echo $HOME');
    return homeDir.trim();
  } catch (error) {
    return '/';
  }
});

// Descargar archivo desde servidor SSH
ipcMain.handle('ssh:download-file', async (event, { tabId, remotePath, localPath, sshConfig }) => {
  const conn = await findSSHConnection(tabId, sshConfig);
  if (!conn || !conn.ssh) {
    throw new Error('SSH connection not found');
  }

  try {
    // Crear una nueva instancia de NodeSSH para operaciones de archivos
    const nodeSSH = new NodeSSH();
    await nodeSSH.connect({
      host: sshConfig.host,
      username: sshConfig.username,
      password: sshConfig.password,
      port: sshConfig.port || 22,
      readyTimeout: 99999
    });
    
    await nodeSSH.getFile(localPath, remotePath);
    nodeSSH.dispose();
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || error || 'Unknown error' };
  }
});

// Subir archivo al servidor SSH
ipcMain.handle('ssh:upload-file', async (event, { tabId, localPath, remotePath, sshConfig }) => {
  const conn = await findSSHConnection(tabId, sshConfig);
  if (!conn || !conn.ssh) {
    throw new Error('SSH connection not found');
  }

  try {
    // Crear una nueva instancia de NodeSSH para operaciones de archivos
    const nodeSSH = new NodeSSH();
    await nodeSSH.connect({
      host: sshConfig.host,
      username: sshConfig.username,
      password: sshConfig.password,
      port: sshConfig.port || 22,
      readyTimeout: 99999
    });
    
    await nodeSSH.putFile(localPath, remotePath);
    nodeSSH.dispose();
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || error || 'Unknown error' };
  }
});

// Eliminar archivo en servidor SSH
ipcMain.handle('ssh:delete-file', async (event, { tabId, remotePath, isDirectory, sshConfig }) => {
  const conn = await findSSHConnection(tabId, sshConfig);
  if (!conn || !conn.ssh) {
    throw new Error('SSH connection not found');
  }

  try {
    const command = isDirectory ? `rm -rf "${remotePath}"` : `rm "${remotePath}"`;
    await conn.ssh.exec(command);
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || error || 'Unknown error' };
  }
});

// Crear directorio en servidor SSH
ipcMain.handle('ssh:create-directory', async (event, { tabId, remotePath, sshConfig }) => {
  const conn = await findSSHConnection(tabId, sshConfig);
  if (!conn || !conn.ssh) {
    throw new Error('SSH connection not found');
  }

  try {
    await conn.ssh.exec(`mkdir -p "${remotePath}"`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || error || 'Unknown error' };
  }
});

// Dialog handlers para seleccionar archivos
ipcMain.handle('dialog:show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('dialog:show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});