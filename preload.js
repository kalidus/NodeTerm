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
  ipcRenderer: {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    invoke: (channel, ...args) => {
      const validChannels = [
        'get-version-info',
        'clipboard:writeText',
        'clipboard:readText',
        /^ssh:.*$/,
        /^dialog:.*$/
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
        /^ssh-connection-error$/
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
        /^ssh-connection-error$/
      ];
      if (validChannels.some(regex => regex.test(channel))) {
        ipcRenderer.off(channel, func);
      }
    },
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  }
}); 