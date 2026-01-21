/**
 * tab-events-handler.js
 * 
 * Maneja el registro dinámico de eventos IPC para diferentes tipos de terminales
 * (PowerShell, WSL, Ubuntu, Cygwin, Docker) por cada pestaña.
 */

const { ipcMain } = require('electron');

// Set para trackear tabs con eventos registrados
const registeredTabEvents = new Set();

/**
 * Registra todos los eventos IPC necesarios para una pestaña específica
 * Soporta: PowerShell, WSL, Ubuntu, WSL Distros, Cygwin, Docker
 */
function registerTabEvents(tabId, dependencies) {
  const {
    PowerShell,
    WSL,
    Cygwin,
    startUbuntuSession,
    handleUbuntuData,
    handleUbuntuResize,
    handleUbuntuStop,
    startWSLDistroSession,
    handleWSLDistroData,
    handleWSLDistroResize,
    handleWSLDistroStop,
    getDocker
  } = dependencies;

  // Evitar registrar dos veces
  if (registeredTabEvents.has(tabId)) {
    return;
  }

  registeredTabEvents.add(tabId);

  // ========== PowerShell Events ==========
  ipcMain.removeAllListeners(`powershell:start:${tabId}`);
  ipcMain.removeAllListeners(`powershell:data:${tabId}`);
  ipcMain.removeAllListeners(`powershell:resize:${tabId}`);
  ipcMain.removeAllListeners(`powershell:stop:${tabId}`);

  ipcMain.on(`powershell:start:${tabId}`, (event, data) => {
    PowerShell.PowerShellHandlers.start(tabId, data);
  });

  ipcMain.on(`powershell:data:${tabId}`, (event, data) => {
    PowerShell.PowerShellHandlers.data(tabId, data);
  });

  ipcMain.on(`powershell:resize:${tabId}`, (event, data) => {
    PowerShell.PowerShellHandlers.resize(tabId, data);
  });

  ipcMain.on(`powershell:stop:${tabId}`, (event) => {
    PowerShell.PowerShellHandlers.stop(tabId);
  });

  // ========== WSL Events ==========
  ipcMain.removeAllListeners(`wsl:start:${tabId}`);
  ipcMain.removeAllListeners(`wsl:data:${tabId}`);
  ipcMain.removeAllListeners(`wsl:resize:${tabId}`);
  ipcMain.removeAllListeners(`wsl:stop:${tabId}`);

  ipcMain.on(`wsl:start:${tabId}`, (event, data) => {
    WSL.WSLHandlers.start(tabId, data);
  });

  ipcMain.on(`wsl:data:${tabId}`, (event, data) => {
    WSL.WSLHandlers.data(tabId, data);
  });

  ipcMain.on(`wsl:resize:${tabId}`, (event, data) => {
    WSL.WSLHandlers.resize(tabId, data);
  });

  ipcMain.on(`wsl:stop:${tabId}`, (event) => {
    WSL.WSLHandlers.stop(tabId);
  });

  // ========== Ubuntu Events ==========
  ipcMain.removeAllListeners(`ubuntu:start:${tabId}`);
  ipcMain.removeAllListeners(`ubuntu:data:${tabId}`);
  ipcMain.removeAllListeners(`ubuntu:resize:${tabId}`);
  ipcMain.removeAllListeners(`ubuntu:stop:${tabId}`);

  ipcMain.on(`ubuntu:start:${tabId}`, (event, data) => {
    startUbuntuSession(tabId, data);
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

  // ========== WSL Distribution Events (genérico para todas las distros no-Ubuntu) ==========
  ipcMain.removeAllListeners(`wsl-distro:start:${tabId}`);
  ipcMain.removeAllListeners(`wsl-distro:data:${tabId}`);
  ipcMain.removeAllListeners(`wsl-distro:resize:${tabId}`);
  ipcMain.removeAllListeners(`wsl-distro:stop:${tabId}`);

  ipcMain.on(`wsl-distro:start:${tabId}`, (event, data) => {
    startWSLDistroSession(tabId, data);
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

  // ========== Cygwin Events ==========
  ipcMain.removeAllListeners(`cygwin:start:${tabId}`);
  ipcMain.removeAllListeners(`cygwin:data:${tabId}`);
  ipcMain.removeAllListeners(`cygwin:resize:${tabId}`);
  ipcMain.removeAllListeners(`cygwin:stop:${tabId}`);

  ipcMain.on(`cygwin:start:${tabId}`, (event, data) => {
    Cygwin.CygwinHandlers.start(tabId, data);
  });

  ipcMain.on(`cygwin:data:${tabId}`, (event, data) => {
    Cygwin.CygwinHandlers.data(tabId, data);
  });

  ipcMain.on(`cygwin:resize:${tabId}`, (event, data) => {
    Cygwin.CygwinHandlers.resize(tabId, data);
  });

  ipcMain.on(`cygwin:stop:${tabId}`, (event) => {
    Cygwin.CygwinHandlers.stop(tabId);
  });

  // ========== Docker Events (lazy loading) ==========
  const dockerSvc = getDocker();
  if (dockerSvc && dockerSvc.DockerHandlers) {
    ipcMain.removeAllListeners(`docker:start:${tabId}`);
    ipcMain.removeAllListeners(`docker:data:${tabId}`);
    ipcMain.removeAllListeners(`docker:resize:${tabId}`);
    ipcMain.removeAllListeners(`docker:stop:${tabId}`);

    ipcMain.on(`docker:start:${tabId}`, (event, data) => {
      dockerSvc.DockerHandlers.start(tabId, data.containerName, data);
    });

    ipcMain.on(`docker:data:${tabId}`, (event, data) => {
      dockerSvc.DockerHandlers.data(tabId, data);
    });

    ipcMain.on(`docker:resize:${tabId}`, (event, data) => {
      dockerSvc.DockerHandlers.resize(tabId, data);
    });

    ipcMain.on(`docker:stop:${tabId}`, (event) => {
      dockerSvc.DockerHandlers.stop(tabId);
    });
  }
}

/**
 * Verifica si una pestaña ya tiene eventos registrados
 */
function isTabRegistered(tabId) {
  return registeredTabEvents.has(tabId);
}

/**
 * Elimina el registro de una pestaña (útil para limpieza)
 */
function unregisterTab(tabId) {
  registeredTabEvents.delete(tabId);
}

/**
 * Obtiene todas las pestañas registradas
 */
function getRegisteredTabs() {
  return Array.from(registeredTabEvents);
}

/**
 * Limpia todas las pestañas registradas
 */
function clearAllRegisteredTabs() {
  registeredTabEvents.clear();
}

module.exports = {
  registerTabEvents,
  isTabRegistered,
  unregisterTab,
  getRegisteredTabs,
  clearAllRegisteredTabs
};
