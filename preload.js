const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    readText: () => ipcRenderer.invoke('clipboard:readText'),
  },
  fileExplorer: {
    listFiles: (tabId, path) => ipcRenderer.invoke('ssh:list-files', { tabId, path }),
    checkDirectory: (tabId, path) => ipcRenderer.invoke('ssh:check-directory', { tabId, path }),
    getHomeDirectory: (tabId) => ipcRenderer.invoke('ssh:get-home-directory', { tabId }),
    downloadFile: (tabId, remotePath, localPath) => ipcRenderer.invoke('ssh:download-file', { tabId, remotePath, localPath }),
    uploadFile: (tabId, localPath, remotePath) => ipcRenderer.invoke('ssh:upload-file', { tabId, localPath, remotePath }),
    deleteFile: (tabId, remotePath, isDirectory) => ipcRenderer.invoke('ssh:delete-file', { tabId, remotePath, isDirectory }),
    createDirectory: (tabId, remotePath) => ipcRenderer.invoke('ssh:create-directory', { tabId, remotePath })
  },
  dialog: {
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:show-open-dialog', options)
  },
  ipcRenderer: {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    on: (channel, func) => {
      const validChannels = [
        /^ssh:data:.*$/,
        /^ssh:ready:.*$/,
        /^ssh:error:.*$/,
        /^ssh-stats:update:.*$/
      ];
      if (validChannels.some(regex => regex.test(channel))) {
        // Deliberately strip event as it includes `sender`
        const subscription = (event, ...args) => func(...args);
        ipcRenderer.on(channel, subscription);

        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
    },
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  }
}); 