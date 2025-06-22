try {
  require('electron-reloader')(module);
} catch (_) {}

const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const url = require('url');
const SSH2Promise = require('ssh2-promise');

let mainWindow;

// Store active SSH connections and their shells
const sshConnections = {};
// Cache for Welcome Messages (MOTD) to show them on every new tab.
const motdCache = {};

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
  const cacheKey = `${config.username}@${config.host}:${config.port}`;
  const ssh = new SSH2Promise(config);

  const statsLoop = async (hostname, distro) => {
    if (!sshConnections[tabId]) return; // Stop if connection is closed

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
          distro: distro
      };
      if (mainWindow) {
        mainWindow.webContents.send(`ssh-stats:update:${tabId}`, stats);
      }
    } catch (e) {
      // console.error(`Error fetching stats for ${tabId}:`, e.message);
    } finally {
      if (sshConnections[tabId]) {
        sshConnections[tabId].statsTimeout = setTimeout(() => statsLoop(hostname, distro), 2000);
      }
    }
  };

  try {
    // For subsequent connections, send the cached MOTD immediately.
    if (motdCache[cacheKey]) {
      event.sender.send(`ssh:data:${tabId}`, motdCache[cacheKey]);
    }

    await ssh.connect();
    
    // Get the actual hostname and distro from the server
    const [realHostname, osRelease] = await Promise.all([
        ssh.exec('hostname'),
        ssh.exec('cat /etc/os-release || echo "ID=linux"') // fallback for systems without os-release
    ]);

    const distroId = (osRelease.match(/^ID=(.*)$/m) || [])[1] || 'linux';
    const finalDistroId = distroId.replace(/"/g, '').toLowerCase(); // Clean up quotes and make lowercase

    const stream = await ssh.shell({ term: 'xterm-256color' });

    sshConnections[tabId] = { ssh, stream, previousCpu: null, statsTimeout: null, previousNet: null, previousTime: null };

    // Start fetching stats and pass the real hostname and distro
    statsLoop(realHostname.trim(), finalDistroId);

    let isFirstPacket = true;

    stream.on('data', (data) => {
      const dataStr = data.toString('utf-8');

      if (isFirstPacket) {
        isFirstPacket = false;
        // If the MOTD is not cached yet (it's the first-ever connection)
        if (!motdCache[cacheKey]) {
          motdCache[cacheKey] = dataStr; // Cache it
          event.sender.send(`ssh:data:${tabId}`, dataStr); // And send it
        }
        // If it was already cached, we've already sent the cached version.
        // We do nothing here, effectively suppressing the duplicate message.
        return; 
      }
      
      // For all subsequent packets, just send them
      event.sender.send(`ssh:data:${tabId}`, dataStr);
    });

    stream.on('close', () => {
      event.sender.send(`ssh:data:${tabId}`, '\r\nConnection closed.\r\n');
      const conn = sshConnections[tabId];
      if (conn && conn.statsTimeout) {
          clearTimeout(conn.statsTimeout);
      }
      delete sshConnections[tabId];
    });

    event.sender.send(`ssh:ready:${tabId}`);

  } catch (err) {
    event.sender.send(`ssh:error:${tabId}`, err.message);
  }
});

// IPC handler to send data to the SSH shell
ipcMain.on('ssh:data', (event, { tabId, data }) => {
  const conn = sshConnections[tabId];
  if (conn && conn.stream) {
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
    if (conn.statsTimeout) {
      clearTimeout(conn.statsTimeout);
    }
    conn.ssh.close();
    delete sshConnections[tabId];
  }
});

// Permite cerrar la app desde el renderer (React) usando ipcRenderer
ipcMain.on('app-quit', () => {
  // Close all SSH connections before quitting
  Object.values(sshConnections).forEach(conn => {
    conn.ssh.close();
  });
  app.quit();
});

// Clipboard IPC Handlers
ipcMain.handle('clipboard:readText', () => {
  return clipboard.readText();
});

ipcMain.handle('clipboard:writeText', (event, text) => {
  clipboard.writeText(text);
});

// Function to safely send to mainWindow
function sendToMainWindow(channel, ...args) {
  if (mainWindow) {
    mainWindow.webContents.send(channel, ...args);
  }
}

ipcMain.handle('app:get-sessions', async () => {
  // Implementation of getting sessions
}); 