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
    Claude,
    OpenCode,
    GeminiCli,
    CodexCli,
    AntigravityCli,
    HermesCli,
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

  // ========== Claude Code Events ==========
  ipcMain.removeAllListeners(`claude:start:${tabId}`);
  ipcMain.removeAllListeners(`claude:data:${tabId}`);
  ipcMain.removeAllListeners(`claude:resize:${tabId}`);
  ipcMain.removeAllListeners(`claude:stop:${tabId}`);

  ipcMain.on(`claude:start:${tabId}`, (event, data) => {
    Claude.ClaudeHandlers.start(tabId, data || {});
  });

  ipcMain.on(`claude:data:${tabId}`, (event, data) => {
    Claude.ClaudeHandlers.data(tabId, data);
  });

  ipcMain.on(`claude:resize:${tabId}`, (event, data) => {
    Claude.ClaudeHandlers.resize(tabId, data);
  });

  ipcMain.on(`claude:stop:${tabId}`, (event) => {
    Claude.ClaudeHandlers.stop(tabId);
  });

  // ========== OpenCode Events ==========
  ipcMain.removeAllListeners(`opencode:start:${tabId}`);
  ipcMain.removeAllListeners(`opencode:data:${tabId}`);
  ipcMain.removeAllListeners(`opencode:resize:${tabId}`);
  ipcMain.removeAllListeners(`opencode:stop:${tabId}`);

  ipcMain.on(`opencode:start:${tabId}`, (event, data) => {
    OpenCode.OpenCodeHandlers.start(tabId, data || {});
  });

  ipcMain.on(`opencode:data:${tabId}`, (event, data) => {
    OpenCode.OpenCodeHandlers.data(tabId, data);
  });

  ipcMain.on(`opencode:resize:${tabId}`, (event, data) => {
    OpenCode.OpenCodeHandlers.resize(tabId, data);
  });

  ipcMain.on(`opencode:stop:${tabId}`, (event) => {
    OpenCode.OpenCodeHandlers.stop(tabId);
  });

  // ========== GeminiCli Events ==========
  ipcMain.removeAllListeners(`geminicli:start:${tabId}`);
  ipcMain.removeAllListeners(`geminicli:data:${tabId}`);
  ipcMain.removeAllListeners(`geminicli:resize:${tabId}`);
  ipcMain.removeAllListeners(`geminicli:stop:${tabId}`);

  ipcMain.on(`geminicli:start:${tabId}`, (event, data) => {
    GeminiCli.GeminiCliHandlers.start(tabId, data || {});
  });

  ipcMain.on(`geminicli:data:${tabId}`, (event, data) => {
    GeminiCli.GeminiCliHandlers.data(tabId, data);
  });

  ipcMain.on(`geminicli:resize:${tabId}`, (event, data) => {
    GeminiCli.GeminiCliHandlers.resize(tabId, data);
  });

  ipcMain.on(`geminicli:stop:${tabId}`, (event) => {
    GeminiCli.GeminiCliHandlers.stop(tabId);
  });

  // ========== Codex CLI Events ==========
  ipcMain.removeAllListeners(`codexcli:start:${tabId}`);
  ipcMain.removeAllListeners(`codexcli:data:${tabId}`);
  ipcMain.removeAllListeners(`codexcli:resize:${tabId}`);
  ipcMain.removeAllListeners(`codexcli:stop:${tabId}`);

  ipcMain.on(`codexcli:start:${tabId}`, (event, data) => {
    CodexCli.CodexCliHandlers.start(tabId, data || {});
  });

  ipcMain.on(`codexcli:data:${tabId}`, (event, data) => {
    CodexCli.CodexCliHandlers.data(tabId, data);
  });

  ipcMain.on(`codexcli:resize:${tabId}`, (event, data) => {
    CodexCli.CodexCliHandlers.resize(tabId, data);
  });

  ipcMain.on(`codexcli:stop:${tabId}`, (event) => {
    CodexCli.CodexCliHandlers.stop(tabId);
  });

  // ========== Antigravity CLI Events ==========
  ipcMain.removeAllListeners(`antigravitycli:start:${tabId}`);
  ipcMain.removeAllListeners(`antigravitycli:data:${tabId}`);
  ipcMain.removeAllListeners(`antigravitycli:resize:${tabId}`);
  ipcMain.removeAllListeners(`antigravitycli:stop:${tabId}`);

  ipcMain.on(`antigravitycli:start:${tabId}`, (event, data) => {
    AntigravityCli.AntigravityCliHandlers.start(tabId, data || {});
  });

  ipcMain.on(`antigravitycli:data:${tabId}`, (event, data) => {
    AntigravityCli.AntigravityCliHandlers.data(tabId, data);
  });

  ipcMain.on(`antigravitycli:resize:${tabId}`, (event, data) => {
    AntigravityCli.AntigravityCliHandlers.resize(tabId, data);
  });

  ipcMain.on(`antigravitycli:stop:${tabId}`, (event) => {
    AntigravityCli.AntigravityCliHandlers.stop(tabId);
  });

  // ========== Hermes CLI Events ==========
  ipcMain.removeAllListeners(`hermescli:start:${tabId}`);
  ipcMain.removeAllListeners(`hermescli:data:${tabId}`);
  ipcMain.removeAllListeners(`hermescli:resize:${tabId}`);
  ipcMain.removeAllListeners(`hermescli:stop:${tabId}`);

  ipcMain.on(`hermescli:start:${tabId}`, (event, data) => {
    HermesCli.HermesCliHandlers.start(tabId, data || {});
  });

  ipcMain.on(`hermescli:data:${tabId}`, (event, data) => {
    HermesCli.HermesCliHandlers.data(tabId, data);
  });

  ipcMain.on(`hermescli:resize:${tabId}`, (event, data) => {
    HermesCli.HermesCliHandlers.resize(tabId, data);
  });

  ipcMain.on(`hermescli:stop:${tabId}`, (event) => {
    HermesCli.HermesCliHandlers.stop(tabId);
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
