const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    readText: () => ipcRenderer.invoke('clipboard:readText'),
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