/**
 * Cierra la sesión de una pestaña sin depender del shell que la creó.
 * La vista puede estar en otra ventana; los canales IPC son los mismos.
 */
export function stopTabSession(tab) {
  if (!tab || typeof window === 'undefined' || !window.electron?.ipcRenderer) return;

  const send = (channel, ...args) => {
    try { window.electron.ipcRenderer.send(channel, ...args); } catch (_) { /* noop */ }
  };
  const invoke = (channel, payload) => {
    try {
      const pending = window.electron.ipcRenderer.invoke(channel, payload);
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    } catch (_) { /* noop */ }
  };

  const stopLocal = (key, terminalType) => {
    const kind = terminalType || 'powershell';
    if (kind === 'powershell' || kind === 'linux-terminal') send(`powershell:stop:${key}`);
    else if (kind === 'wsl') send(`wsl:stop:${key}`);
    else if (kind === 'ubuntu') send(`ubuntu:stop:${key}`);
    else if (kind === 'cygwin') send(`cygwin:stop:${key}`);
    else if (kind === 'docker') send(`docker:stop:${key}`);
    else if (typeof kind === 'string' && kind.startsWith('wsl-')) {
      const distro = kind.replace(/^wsl-/, '');
      if (distro === 'ubuntu' || distro === 'ubuntu-old') send(`ubuntu:stop:${key}`);
      else send(`wsl-distro:stop:${key}`);
    } else send(`powershell:stop:${key}`);
  };

  if (tab.type === 'split') {
    const ids = [];
    if (tab.leftTerminal?.key) ids.push(tab.leftTerminal.key);
    if (tab.rightTerminal?.key) ids.push(tab.rightTerminal.key);
    ids.forEach((id) => {
      invoke('recording:stop', { tabId: id });
      send('ssh:disconnect', id);
    });
    return;
  }

  if ((tab.type === 'terminal' && tab.sshConfig) || tab.type === 'ssh') {
    invoke('recording:stop', { tabId: tab.key });
    if (!tab.isExplorerInSSH || tab.needsOwnConnection) send('ssh:disconnect', tab.key);
    return;
  }

  if (
    tab.type === 'local-terminal'
    || tab.type === 'powershell'
    || tab.type === 'wsl'
    || tab.type === 'ubuntu'
    || tab.type === 'docker'
  ) {
    stopLocal(tab.key, tab.terminalType || tab.type);
    return;
  }

  if (tab.type === 'rdp' && tab.rdpConfig) {
    invoke('rdp:disconnect-session', tab.rdpConfig);
  }
}
