const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    readText: () => ipcRenderer.invoke('clipboard:readText'),
  },
  fileExplorer: {
    listFiles: (tabId, path, sshConfig) => ipcRenderer.invoke('ssh:list-files', { tabId, path, sshConfig }),
    checkDirectory: (tabId, path, sshConfig) => ipcRenderer.invoke('ssh:check-directory', { tabId, path, sshConfig }),
    getHomeDirectory: (tabId, sshConfig) => ipcRenderer.invoke('ssh:get-home-directory', { tabId, sshConfig }),
    downloadFile: (tabId, remotePath, localPath, sshConfig) => ipcRenderer.invoke('ssh:download-file', { tabId, remotePath, localPath, sshConfig }),
    uploadFile: (tabId, localPath, remotePath, sshConfig) => ipcRenderer.invoke('ssh:upload-file', { tabId, localPath, remotePath, sshConfig }),
    deleteFile: (tabId, remotePath, isDirectory, sshConfig) => ipcRenderer.invoke('ssh:delete-file', { tabId, remotePath, isDirectory, sshConfig }),
    createDirectory: (tabId, remotePath, sshConfig) => ipcRenderer.invoke('ssh:create-directory', { tabId, remotePath, sshConfig })
  },
  dialog: {
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:show-open-dialog', options)
  },
  app: {
    getVersionInfo: () => ipcRenderer.invoke('get-version-info'),
    quit: () => ipcRenderer.send('app-quit')
  },
  pdfProcessor: {
    processPDF: (filePath) => ipcRenderer.invoke('process-pdf', filePath),
    processPDFBuffer: (base64Data) => ipcRenderer.invoke('process-pdf-buffer', base64Data),
    createTempFile: (fileName, arrayBuffer) => ipcRenderer.invoke('create-temp-file', fileName, arrayBuffer),
    cleanupTempFile: (filePath) => ipcRenderer.invoke('cleanup-temp-file', filePath)
  },
  mcp: {
    initialize: () => ipcRenderer.invoke('mcp:initialize'),
    listInstalled: () => ipcRenderer.invoke('mcp:list-installed'),
    install: (serverId, config) => ipcRenderer.invoke('mcp:install', { serverId, config }),
    uninstall: (serverId) => ipcRenderer.invoke('mcp:uninstall', serverId),
    toggle: (serverId, enabled) => ipcRenderer.invoke('mcp:toggle', { serverId, enabled }),
    start: (serverId) => ipcRenderer.invoke('mcp:start', serverId),
    stop: (serverId) => ipcRenderer.invoke('mcp:stop', serverId),
    updateConfig: (serverId, config) => ipcRenderer.invoke('mcp:update-config', { serverId, config }),
    listTools: () => ipcRenderer.invoke('mcp:list-tools'),
    listResources: () => ipcRenderer.invoke('mcp:list-resources'),
    listPrompts: () => ipcRenderer.invoke('mcp:list-prompts'),
    callTool: (serverId, toolName, args) => ipcRenderer.invoke('mcp:call-tool', { serverId, toolName, args }),
    getResource: (serverId, resourceUri) => ipcRenderer.invoke('mcp:get-resource', { serverId, resourceUri }),
    getPrompt: (serverId, promptName, args) => ipcRenderer.invoke('mcp:get-prompt', { serverId, promptName, args }),
    refreshCapabilities: (serverId) => ipcRenderer.invoke('mcp:refresh-capabilities', serverId)
  },
  ipcRenderer: {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    invoke: (channel, ...args) => {
      const validChannels = [
        'get-version-info',
        'get-system-stats',
        'get-connection-history',
        'add-connection-to-history',
        'toggle-favorite-connection',
        'clipboard:writeText',
        'clipboard:readText',
        'register-tab-events',
        'detect-ubuntu-availability',
        'detect-wsl-distributions',
        'nextcloud:http-request',
        /^ssh:.*$/,
        /^dialog:.*$/,
        /^ubuntu:.*$/,
        /^wsl-distro:.*$/,
        /^rdp:.*$/,
        /^guacamole:.*$/,
        /^import:.*$/,
        /^updater:.*$/,
        /^system:.*$/,
        'process-pdf',
        'process-pdf-buffer',
        'create-temp-file',
        'cleanup-temp-file',
        /^recording:.*$/,
        /^mcp:.*$/
      ];
      if (validChannels.some(regex => {
        if (typeof regex === 'string') {
          return regex === channel;
        }
        return regex.test(channel);
      })) {
        return ipcRenderer.invoke(channel, ...args);
      }
    },
    on: (channel, func) => {
      const validChannels = [
        /^ssh:data:.*$/,
        /^ssh:ready:.*$/,
        /^ssh:error:.*$/,
        /^ssh-stats:update:.*$/,
        /^ssh-connection-ready$/,
        /^ssh-connection-disconnected$/,
        /^ssh-connection-error$/,
        /^powershell:.*$/,
        /^wsl:.*$/,
        /^ubuntu:.*$/,
        /^wsl-distro:.*$/,
        /^cygwin:.*$/,
        /^rdp:.*$/,
        /^guacamole:.*$/,
        /^updater-event$/
      ];
      if (validChannels.some(regex => regex.test(channel))) {
        // Deliberately strip event as it includes `sender`
        const subscription = (event, ...args) => func(...args);
        ipcRenderer.on(channel, subscription);

        return () => {
          ipcRenderer.off(channel, subscription);
        };
      }
    },
    off: (channel, func) => {
      const validChannels = [
        /^ssh:data:.*$/,
        /^ssh:ready:.*$/,
        /^ssh:error:.*$/,
        /^ssh-stats:update:.*$/,
        /^ssh-connection-ready$/,
        /^ssh-connection-disconnected$/,
        /^ssh-connection-error$/,
        /^powershell:.*$/,
        /^wsl:.*$/,
        /^ubuntu:.*$/,
        /^wsl-distro:.*$/,
        /^cygwin:.*$/,
        /^rdp:.*$/,
        /^updater-event$/
      ];
      if (validChannels.some(regex => regex.test(channel))) {
        ipcRenderer.off(channel, func);
      }
    },
    removeListener: (channel, func) => {
      const validChannels = [
        /^updater-event$/
      ];
      if (validChannels.some(regex => regex.test(channel))) {
        ipcRenderer.removeListener(channel, func);
      }
    },
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  // Guacamole helpers
  guacamole: {
    disconnectAll: () => ipcRenderer.invoke('guacamole:disconnect-all'),
    setGuacdTimeoutMs: (ms) => ipcRenderer.invoke('guacamole:set-guacd-timeout-ms', ms),
    getGuacdTimeoutMs: () => ipcRenderer.invoke('guacamole:get-guacd-timeout-ms')
  },
  import: {
    getFileInfo: (path) => ipcRenderer.invoke('import:get-file-info', path),
    getFileHash: (path) => ipcRenderer.invoke('import:get-file-hash', path),
    readFile: (path) => ipcRenderer.invoke('import:read-file', path),
    openExternal: (url) => ipcRenderer.invoke('import:open-external', url),
    getDownloadsPath: () => ipcRenderer.invoke('import:get-downloads-path'),
    findLatestXmlDownload: (params) => ipcRenderer.invoke('import:find-latest-xml-download', params)
  },
  // Update system APIs
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    getConfig: () => ipcRenderer.invoke('updater:get-config'),
    updateConfig: (config) => ipcRenderer.invoke('updater:update-config', config),
    getUpdateInfo: () => ipcRenderer.invoke('updater:get-info'),
    clearCache: () => ipcRenderer.invoke('updater:clear-cache')
  }
});

// Crear alias para compatibilidad con el código existente
contextBridge.exposeInMainWorld('electronAPI', {
  getVersionInfo: () => ipcRenderer.invoke('get-version-info'),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  getConnectionHistory: () => ipcRenderer.invoke('get-connection-history'),
  addConnectionToHistory: (connection) => ipcRenderer.invoke('add-connection-to-history', connection),
  toggleFavoriteConnection: (connectionId) => ipcRenderer.invoke('toggle-favorite-connection', connectionId),
  quitApp: () => ipcRenderer.send('app-quit'),
  reload: () => ipcRenderer.invoke('app:reload'),
  forceReload: () => ipcRenderer.invoke('app:force-reload'),
  toggleDevTools: () => ipcRenderer.invoke('app:toggle-dev-tools'),
  zoomIn: () => ipcRenderer.invoke('app:zoom-in'),
  zoomOut: () => ipcRenderer.invoke('app:zoom-out'),
  actualSize: () => ipcRenderer.invoke('app:actual-size'),
  toggleFullscreen: () => ipcRenderer.invoke('app:toggle-fullscreen'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  unmaximize: () => ipcRenderer.invoke('window:unmaximize'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  close: () => ipcRenderer.invoke('window:close'),
  // RDP API
  rdp: {
    connect: (config) => ipcRenderer.invoke('rdp:connect', config),
    disconnect: (connectionId) => ipcRenderer.invoke('rdp:disconnect', connectionId),
    disconnectAll: () => ipcRenderer.invoke('rdp:disconnect-all'),
    getActiveConnections: () => ipcRenderer.invoke('rdp:get-active-connections'),
    getPresets: () => ipcRenderer.invoke('rdp:get-presets'),
    showWindow: (server) => ipcRenderer.invoke('rdp:show-window', { server }),
    disconnectSession: (server) => ipcRenderer.invoke('rdp:disconnect-session', { server })
  },
  // Generic invoke method for IPC
  invoke: (channel, data) => {
    const validChannels = [
      'cygwin:detect',
      'cygwin:install',
      // Add more channels as needed
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  }
}); 
