try {
  require('electron-reloader')(module);
} catch (_) {}

const { app, BrowserWindow, ipcMain, clipboard, dialog } = require('electron');
const path = require('path');
const url = require('url');
const SSH2Promise = require('ssh2-promise');
const { NodeSSH } = require('node-ssh');
const packageJson = require('./package.json');
const { createBastionShell } = require('./src/components/bastion-ssh');

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
    const ssh = new SSH2Promise(sshConfig);
    await ssh.connect();
    const home = await ssh.exec('pwd');
    await ssh.close();
    return { success: true, home: (home || '/').trim() };
  } catch (err) {
    return { success: false, error: err.message || err };
  }
});

ipcMain.handle('ssh:list-files', async (event, { tabId, path, sshConfig }) => {
  try {
    console.log('ssh:list-files: tabId:', tabId);
    console.log('ssh:list-files: path recibido:', path);
    console.log('ssh:list-files: sshConfig recibido:', sshConfig);
    // Validación robusta de path
    let safePath = '/';
    if (typeof path === 'string') {
      safePath = path;
    } else if (path && typeof path.path === 'string') {
      safePath = path.path;
    } else {
      console.warn('ssh:list-files: path inválido recibido:', path);
    }
    const ssh = new SSH2Promise(sshConfig);
    await ssh.connect();
    const lsOutput = await ssh.exec(`ls -la "${safePath}"`);
    await ssh.close();
    return { success: true, files: parseLsOutput(lsOutput) };
  } catch (err) {
    console.error('ssh:list-files: ERROR:', err);
    return { success: false, error: err.message || err };
  }
});

ipcMain.handle('ssh:check-directory', async (event, { tabId, path, sshConfig }) => {
  try {
    const ssh = new SSH2Promise(sshConfig);
    await ssh.connect();
    // Comprobar si el directorio existe y es accesible
    const result = await ssh.exec(`[ -d "${path}" ] && echo "exists" || echo "notfound"`);
    await ssh.close();
    return result.trim() === 'exists';
  } catch (err) {
    return false;
  }
});

let mainWindow;

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
      console.log(`Esperando conexión pendiente para ${cacheKey}...`);
      return await this.pending.get(cacheKey);
    }
    
    // Verificar intervalo mínimo
    const lastAttempt = this.lastAttempt.get(cacheKey) || 0;
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    
    if (timeSinceLastAttempt < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastAttempt;
      console.log(`Throttling conexión a ${cacheKey}, esperando ${waitTime}ms...`);
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
        console.log(`Limpiando conexión SSH huérfana: ${poolKey} (sin uso por ${Math.round(connectionAge/1000)}s)`);
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
      console.log(`Throttling conexión SSH directa a ${cacheKey}, esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    connectionThrottle.lastAttempt.set(cacheKey, Date.now());
  } else {
    console.log(`Conexión bastión - sin throttling (pooling habilitado)`);
  }
  
  // Para bastiones: cada terminal tiene su propia conexión independiente (no pooling)
  // Para SSH directo: usar pooling normal para eficiencia
  let ssh;
  let isReusedConnection = false;

  if (config.useBastionWallix) {
    // BASTIÓN: Usar ssh2 puro para crear una conexión y shell independientes
    console.log(`Bastión ${cacheKey} - creando nueva conexión con ssh2 (bastion-ssh.js)`);
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
          wallixStatsLoop();
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
      previousTime: null
    };
    
    // Función de bucle de stats para Wallix/bastión
    function wallixStatsLoop() {
      const connObj = sshConnections[tabId];
      if (!connObj || !connObj.ssh || !connObj.stream) {
        console.log('[WallixStats] Conexión no disponible, saltando stats');
        return;
      }

      try {
        console.log('[WallixStats] Lanzando bucle de stats para bastión', tabId);
        
        if (connObj.ssh.execCommand) {
          const command = 'grep "cpu " /proc/stat && free -b && df -P && uptime && cat /proc/net/dev && hostname && hostname -I 2>/dev/null || hostname -i 2>/dev/null || echo "" && cat /etc/os-release';
          connObj.ssh.execCommand(command, (err, result) => {
            if (err || !result) {
              console.warn('[WallixStats] Error ejecutando comando:', err);
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
              if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed) {
                sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000);
              }
              return;
            }
            
            const output = result.stdout;
            console.log('[WallixStats] Output recibido, length:', output.length);
            console.log('[WallixStats] Raw output preview:', JSON.stringify(output.substring(0, 300)));
            
            try {
              const parts = output.trim().split('\n');
              console.log('[WallixStats] Parts found:', parts.length);
              console.log('[WallixStats] First 5 parts:', parts.slice(0, 5));
              
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
                    if (name && name.startsWith('/') && !isNaN(use) && !name.startsWith('/sys') && !name.startsWith('/opt') && !name.startsWith('/run') && name !== '/boot/efi' && !name.startsWith('/dev')) {
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
              // Buscar distro en os-release
              const osReleaseText = parts.slice(-10).join('\n'); // Últimas 10 líneas
              const distroMatch = osReleaseText.match(/^ID="?([^"\n]*)"?$/m);
              if (distroMatch && distroMatch[1]) {
                finalDistroId = distroMatch[1].toLowerCase();
              }
              const stats = {
                cpu: cpuLoad,
                mem,
                disk: disks,
                uptime,
                network,
                hostname,
                distro: finalDistroId,
                ip
              };
              
              console.log('[WallixStats] Enviando stats:', JSON.stringify(stats, null, 2));
              sendToRenderer(event.sender, `ssh-stats:update:${tabId}`, stats);
              
            } catch (parseErr) {
              console.warn('[WallixStats] Error parseando stats:', parseErr);
            }
            
            // Programar siguiente ejecución
            if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed) {
              sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 2000);
            }
          });
          
        } else {
          console.warn('[WallixStats] execCommand no disponible en conexión bastión');
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
        console.warn('[WallixStats] Error general:', e);
        // Reintentar en 5 segundos
        if (sshConnections[tabId] && sshConnections[tabId].ssh && sshConnections[tabId].stream && !sshConnections[tabId].stream.destroyed) {
          sshConnections[tabId].statsTimeout = setTimeout(wallixStatsLoop, 5000);
        }
      }
    }
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
        console.log(`Reutilizando conexión del pool para terminal SSH directo ${cacheKey}`);
      } catch (testError) {
        console.log(`Conexión del pool no válida para terminal ${cacheKey}, creando nueva...`);
        try {
          existingPoolConnection.close();
        } catch (e) {}
        delete sshConnectionPool[cacheKey];
      }
    }
    if (!ssh) {
      console.log(`Creando nueva conexión SSH directa para terminal ${cacheKey}`);
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
      console.log(`Conectando SSH para terminal ${cacheKey}...`);
      
      // Configurar límites de listeners ANTES de conectar (aumentado para evitar warnings)
      ssh.setMaxListeners(300);
      
      console.log(`Iniciando conexión SSH para ${cacheKey}...`);
      console.log(`Configuración: Host=${config.host}, Usuario=${config.username}, Puerto=${config.port || 22}`);
      if (config.useBastionWallix) {
        console.log(`Bastión Wallix: Host=${config.bastionHost}, Usuario=${config.bastionUser}`);
      }
      
      await ssh.connect();
      console.log(`Conectado exitosamente a terminal ${cacheKey}`);
      
      // SSH2Promise está conectado y listo para usar
      console.log('SSH2Promise conectado correctamente, procediendo a crear shell...');
      
      // Guardar en el pool solo para SSH directo (bastiones son independientes)
      if (!config.useBastionWallix) {
        ssh._createdAt = Date.now();
        ssh._lastUsed = Date.now();
        sshConnectionPool[cacheKey] = ssh;
        console.log(`Conexión SSH directa ${cacheKey} guardada en pool para reutilización`);
      } else {
        console.log(`Conexión bastión ${cacheKey} - NO guardada en pool (independiente)`);
      }
    } else {
      console.log(`Usando conexión SSH directa existente del pool para terminal ${cacheKey}`);
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
          console.log(`Conexión Wallix detectada: ${config.bastionHost} -> ${ssh._wallixTarget.host}:${ssh._wallixTarget.port}`);
          
          // Para bastiones Wallix, esperar un poco antes de crear shell
          console.log('Esperando estabilización de conexión Wallix...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('Creando shell usando SSH2Promise con configuración Wallix...');
          
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
            console.warn('Error con configuración Wallix, intentando configuración básica:', shellError.message);
            // Fallback con configuración mínima
            stream = await ssh.shell('xterm-256color');
          }
          
          console.log('Shell de bastión Wallix creado exitosamente');
          
          // Para Wallix, verificar dónde estamos conectados
          console.log('Verificando estado de conexión Wallix...');
          
          // Enviar comando para verificar hostname
          stream.write('hostname\n');
          
          // Esperar un poco para procesar
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('Para conexiones Wallix, el bastión maneja automáticamente la conexión al servidor destino');
          
        } else {
          // Conexión SSH directa normal
          console.log('Creando shell SSH directo...');
          stream = await ssh.shell({ 
            term: 'xterm-256color',
            cols: 80,
            rows: 24
          });
        }
        
        break;
      } catch (shellError) {
        shellAttempts++;
        console.warn(`Intento ${shellAttempts} de crear shell falló para ${cacheKey}:`, shellError?.message || shellError || 'Unknown error');
        
        if (shellAttempts >= maxShellAttempts) {
          throw new Error(`No se pudo crear shell después de ${maxShellAttempts} intentos: ${shellError?.message || shellError || 'Unknown error'}`);
        }
      }
    }
    
    // Configurar límites de listeners para el stream
    stream.setMaxListeners(0); // Sin límite para streams individuales

    const storedOriginalKey = config.originalKey || tabId;
    console.log('Guardando conexión SSH con originalKey:', storedOriginalKey, 'para tabId:', tabId);
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
      console.log('🔌 SSH desconectado - enviando evento para originalKey:', disconnectOriginalKey);
      sendToRenderer(event.sender, 'ssh-connection-disconnected', { 
        originalKey: disconnectOriginalKey,
        tabId: tabId 
      });
      
      delete sshConnections[tabId];
    });



    sendToRenderer(event.sender, `ssh:ready:${tabId}`);
    
    // Enviar evento de conexión exitosa
    const originalKey = config.originalKey || tabId;
    console.log('✅ SSH conectado - enviando evento para originalKey:', originalKey);
    sendToRenderer(event.sender, 'ssh-connection-ready', { 
      originalKey: originalKey,
      tabId: tabId 
    });

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
    statsLoop(tabId, realHostname, finalDistroId, config.host);

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
    
    // Enviar evento de error de conexión
    const errorOriginalKey = config.originalKey || tabId;
    console.log('❌ SSH error - enviando evento para originalKey:', errorOriginalKey, 'error:', errorMsg);
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
                console.warn(`Error redimensionando terminal ${tabId}:`, resizeError?.message || resizeError || 'Unknown error');
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
        console.log('Cerrando conexión Wallix');
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
      // (Para bastiones, cada terminal es independiente, así que siempre cerrar)
      if (otherTabsUsingConnection.length === 0 && conn.ssh && conn.cacheKey) {
        try {
                console.log(`Cerrando conexión SSH compartida para ${conn.cacheKey} (última pestaña)`);
      
      // Enviar evento de desconexión
      const disconnectOriginalKey = conn.originalKey || conn.cacheKey;
      console.log('🔌 SSH cerrado - enviando evento para originalKey:', disconnectOriginalKey);
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

// Function to safely send to mainWindow
function sendToRenderer(sender, eventName, ...args) {
  try {
    if (sender && typeof sender.isDestroyed === 'function' && !sender.isDestroyed()) {
      // Solo logear eventos SSH para debugging
      if (eventName.startsWith('ssh-connection-')) {
        console.log('📡 Enviando evento SSH:', eventName, 'con args:', args);
      }
      sender.send(eventName, ...args);
    } else {
      console.error('Sender no válido o destruido para evento:', eventName);
    }
  } catch (error) {
    console.error('Error sending to renderer:', eventName, error);
  }
}

// Función para limpiar conexiones huérfanas del pool cada 10 minutos
function cleanupOrphanedConnections() {
  Object.keys(sshConnectionPool).forEach(cacheKey => {
    const poolConnection = sshConnectionPool[cacheKey];
    // Verificar si hay alguna conexión activa usando esta conexión del pool
    const hasActiveConnections = Object.values(sshConnections).some(conn => conn.cacheKey === cacheKey);
    
    if (!hasActiveConnections) {
      console.log(`Limpiando conexión SSH huérfana: ${cacheKey}`);
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
    // Para bastiones: buscar cualquier conexión activa al mismo destino
    // Para SSH directo: usar el formato estándar del pool
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
async function statsLoop(tabId, hostname, distro, fallbackIp) {
  const conn = sshConnections[tabId];
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
    if (!ip) ip = fallbackIp;
    // Enviar stats
    const stats = {
      cpu: cpuLoad,
      mem,
      disk: disks,
      uptime,
      network,
      hostname,
      distro,
      ip
    };
    sendToRenderer(mainWindow.webContents, `ssh-stats:update:${tabId}`, stats);
  } catch (e) {
    // Silenciar errores de stats
  } finally {
    const finalConn = sshConnections[tabId];
    if (finalConn && finalConn.ssh && finalConn.stream && !finalConn.stream.destroyed) {
      finalConn.statsTimeout = setTimeout(() => statsLoop(tabId, hostname, distro, fallbackIp), 2000);
    }
  }
}
// --- FIN BLOQUE RESTAURACIÓN STATS ---