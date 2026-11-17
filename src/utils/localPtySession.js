/**
 * Canal IPC, payload de arranque y flags de sesión de las terminales locales.
 * Sin React: lo usan la factory y los tests.
 */

const LOCAL_PTY_PROFILES = {
  wsl: {
    delayFirstTab: false,
    skipStopOnReload: false,
    listenReady: true,
    listenVisibility: false,
    refocusOnWindowFocus: true,
    exposeAgentApi: false,
    cleanupBuffer: 'clear',
    fillFlex: false,
    windowsMode: false,
    bracketedPasteMode: true,
    palette: 'gnome',
    defaultBackground: '#0c0c0c',
    themeUpdateBackground: '#002b36',
    defaultFontFamily: 'Consolas, "Courier New", monospace',
    statusBarStorageKey: 'localLinuxStatusBarTheme',
    statusBarFallbackKey: 'basicapp_statusbar_theme',
    statusBarTerminalType: 'linux',
    statusBarCss: 'metrics',
    sessionProp: null
  },
  ubuntu: {
    delayFirstTab: true,
    skipStopOnReload: true,
    listenReady: true,
    listenVisibility: true,
    refocusOnWindowFocus: true,
    exposeAgentApi: false,
    cleanupBuffer: 'clear',
    fillFlex: false,
    windowsMode: false,
    bracketedPasteMode: true,
    palette: 'gnome',
    defaultBackground: '#2c001e',
    themeUpdateBackground: '#2c001e',
    defaultFontFamily: 'Consolas, "Courier New", monospace',
    statusBarStorageKey: 'localLinuxStatusBarTheme',
    statusBarFallbackKey: 'basicapp_statusbar_theme',
    statusBarTerminalType: 'linux',
    statusBarCss: 'metrics',
    sessionProp: 'ubuntuInfo'
  },
  powershell: {
    delayFirstTab: true,
    skipStopOnReload: true,
    listenReady: true,
    listenVisibility: true,
    refocusOnWindowFocus: false,
    exposeAgentApi: true,
    cleanupBuffer: 'flush',
    fillFlex: true,
    windowsMode: true,
    bracketedPasteMode: false,
    palette: 'powershell',
    defaultBackground: '#012456',
    themeUpdateBackground: '#012456',
    defaultFontFamily: 'Consolas, "Courier New", monospace',
    statusBarStorageKey: 'localPowerShellStatusBarTheme',
    statusBarFallbackKey: 'basicapp_statusbar_theme',
    statusBarTerminalType: 'powershell',
    statusBarCss: 'metrics',
    sessionProp: null
  },
  cygwin: {
    delayFirstTab: true,
    skipStopOnReload: true,
    listenReady: false,
    listenVisibility: true,
    refocusOnWindowFocus: false,
    exposeAgentApi: false,
    cleanupBuffer: 'clear',
    fillFlex: true,
    windowsMode: false,
    bracketedPasteMode: true,
    palette: 'cygwin',
    defaultBackground: '#0a0d0a',
    themeUpdateBackground: '#0c0c0c',
    defaultFontFamily: '"FiraCode Nerd Font", Consolas, monospace',
    statusBarStorageKey: 'localCygwinStatusBarTheme',
    statusBarFallbackKey: null,
    statusBarTerminalType: 'cygwin',
    statusBarCss: 'compact',
    sessionProp: null
  },
  docker: {
    delayFirstTab: true,
    skipStopOnReload: false,
    listenReady: false,
    listenVisibility: false,
    refocusOnWindowFocus: false,
    exposeAgentApi: false,
    cleanupBuffer: 'clear',
    fillFlex: true,
    windowsMode: false,
    bracketedPasteMode: true,
    palette: 'gnome',
    defaultBackground: '#0c1a25',
    themeUpdateBackground: '#0c1a25',
    defaultFontFamily: '"FiraCode Nerd Font", Consolas, monospace',
    statusBarStorageKey: 'localDockerStatusBarTheme',
    statusBarFallbackKey: null,
    statusBarTerminalType: 'docker',
    statusBarCss: 'metrics',
    sessionProp: 'dockerInfo'
  }
};

const WSL_OS_RELEASE_PROBE = 'echo "KERNEL=$(uname -r)"; echo "ARCH=$(uname -m)"; cat /etc/os-release\n';
const UBUNTU_OS_RELEASE_PROBE = 'cat /etc/os-release\n';

function getLocalPtyProfile(kind) {
  const profile = LOCAL_PTY_PROFILES[kind];
  if (!profile) {
    throw new Error(`Terminal local desconocida: ${kind}`);
  }
  return profile;
}

/**
 * Prefijo IPC (`wsl`, `ubuntu`, `wsl-distro`, `powershell`, `cygwin`).
 * Ubuntu usa `wsl-distro` cuando la categoría no es ubuntu.
 */
function resolveLocalPtyChannel(kind, sessionInfo) {
  if (kind === 'ubuntu') {
    if (sessionInfo?.category === 'ubuntu') return 'ubuntu';
    if (sessionInfo?.category) return 'wsl-distro';
    return 'ubuntu';
  }
  getLocalPtyProfile(kind);
  return kind;
}

/**
 * Payload de `*:start`. Solo ubuntu / wsl-distro añaden metadatos de la distro.
 */
function buildLocalPtyStartPayload(channel, cols, rows, sessionInfo) {
  const payload = { cols, rows };
  if (channel === 'ubuntu') payload.ubuntuInfo = sessionInfo ?? null;
  else if (channel === 'wsl-distro') payload.distroInfo = sessionInfo ?? null;
  else if (channel === 'docker') {
    payload.containerName = sessionInfo?.containerName || 'unknown';
  }
  return payload;
}

function localPtyStartDelayMs(kind, tabId) {
  const profile = getLocalPtyProfile(kind);
  if (!profile.delayFirstTab) return 0;
  return tabId === 'tab-1' ? 300 : 0;
}

function shouldSendLocalPtyStop(kind, { navigationType, readyState } = {}) {
  const profile = getLocalPtyProfile(kind);
  if (!profile.skipStopOnReload) return true;
  const reloading = navigationType === 1 || readyState === 'loading';
  return !reloading;
}

function localPtyProbeCommand(kind, sessionInfo) {
  if (kind === 'wsl') return WSL_OS_RELEASE_PROBE;
  if (kind === 'ubuntu' && !sessionInfo?.category) return UBUNTU_OS_RELEASE_PROBE;
  return null;
}

function localPtyErrorLabel(kind, { platform, sessionInfo } = {}) {
  if (kind === 'powershell') return platform === 'win32' ? 'PowerShell' : 'Terminal';
  if (kind === 'ubuntu') return sessionInfo?.label || 'WSL Distribution';
  if (kind === 'cygwin') return 'Cygwin';
  if (kind === 'docker') return sessionInfo?.containerName || 'Docker';
  return 'WSL';
}

function localPtyUnavailableMessage(kind, label) {
  if (kind === 'powershell') {
    return `Error: Electron API not available. ${label} integration will not work.`;
  }
  if (kind === 'ubuntu') return 'Error: Electron API not available. Ubuntu integration will not work.';
  if (kind === 'cygwin') return 'Error: Electron API not available. Cygwin integration will not work.';
  if (kind === 'docker') return 'Error: Electron API not available. Docker integration will not work.';
  return 'Error: Electron API not available. WSL integration will not work.';
}

module.exports = {
  LOCAL_PTY_PROFILES,
  WSL_OS_RELEASE_PROBE,
  UBUNTU_OS_RELEASE_PROBE,
  getLocalPtyProfile,
  resolveLocalPtyChannel,
  buildLocalPtyStartPayload,
  localPtyStartDelayMs,
  shouldSendLocalPtyStop,
  localPtyProbeCommand,
  localPtyErrorLabel,
  localPtyUnavailableMessage
};
