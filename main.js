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
            if (name && name.startsWith('/') && !isNaN(use) && !name.startsWith('/sys') && !name.startsWith('/opt')) {
                return { name, use };
            }
        }
        return null;
    }).filter(Boolean); // Filter out null entries
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

  const statsLoop = async () => {
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

      // --- Get Memory and Disk stats
      const memAndDiskRes = await ssh.exec("free -b && df -P");
      const parts = memAndDiskRes.trim().split('\n');
      const memLine = parts.find(line => line.startsWith('Mem:'));
      const memParts = memLine.split(/\s+/);
      const mem = {
          total: (parseInt(memParts[1], 10) / 1024 / 1024 / 1024).toFixed(2),
          used: (parseInt(memParts[2], 10) / 1024 / 1024 / 1024).toFixed(2),
      };
      const dfIndex = parts.findIndex(line => line.trim().startsWith('Filesystem'));
      const dfOutput = parts.slice(dfIndex).join('\n');
      const disks = parseDfOutput(dfOutput);

      const stats = { cpu: cpuLoad, mem, disks };
      if (mainWindow) {
        mainWindow.webContents.send(`ssh-stats:update:${tabId}`, stats);
      }
    } catch (e) {
      // console.error(`Error fetching stats for ${tabId}:`, e.message);
    } finally {
      if (sshConnections[tabId]) {
        sshConnections[tabId].statsTimeout = setTimeout(statsLoop, 2000); // Loop every 2 seconds
      }
    }
  };

  try {
    // For subsequent connections, send the cached MOTD immediately.
    if (motdCache[cacheKey]) {
      event.sender.send(`ssh:data:${tabId}`, motdCache[cacheKey]);
    }

    await ssh.connect();
    const stream = await ssh.shell({ term: 'xterm-256color' });

    sshConnections[tabId] = { ssh, stream, previousCpu: null, statsTimeout: null };

    // Start fetching stats
    statsLoop();

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