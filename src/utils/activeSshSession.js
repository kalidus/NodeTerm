import { collectTerminalIds, findTerminalNode } from './broadcastMembership';
import { CONNECTION_STATUS, TAB_TYPES } from './constants';

export function isSshTerminalNode(node) {
  if (!node?.key || !node.sshConfig?.host) return false;
  if (node.local || node.ptyChannel) return false;
  return true;
}

export function firstSshTerminal(tab) {
  if (!tab) return null;
  if (tab.type === TAB_TYPES.TERMINAL || tab.type === 'terminal') {
    return isSshTerminalNode(tab) ? tab : null;
  }
  if (tab.type !== TAB_TYPES.SPLIT && tab.type !== 'split') return null;
  const ids = collectTerminalIds(tab);
  for (const id of ids) {
    const node = findTerminalNode(tab, id);
    if (isSshTerminalNode(node)) return node;
  }
  return null;
}

/**
 * Sesión SSH de la pestaña activa. En un split usa el panel con foco
 * y, si no hay uno, el primer terminal SSH del split.
 */
export function resolveActiveSshSession(activeTab, focusedSshTabId, sshConnectionStatus, readyTabIds) {
  if (!activeTab) return null;

  let node = null;
  const isTerminal = activeTab.type === TAB_TYPES.TERMINAL || activeTab.type === 'terminal';
  const isSplit = activeTab.type === TAB_TYPES.SPLIT || activeTab.type === 'split';

  if (isTerminal) {
    node = isSshTerminalNode(activeTab) ? activeTab : null;
  } else if (isSplit) {
    const focused = focusedSshTabId ? findTerminalNode(activeTab, focusedSshTabId) : null;
    node = isSshTerminalNode(focused) ? focused : firstSshTerminal(activeTab);
  }

  if (!node) return null;

  const originalKey = node.originalKey || node.sshConfig.originalKey || null;
  const status = originalKey ? sshConnectionStatus?.[originalKey] : undefined;
  const tabReady = readyTabIds?.has?.(String(node.key)) === true;
  const failed = status === CONNECTION_STATUS.DISCONNECTED || status === CONNECTION_STATUS.ERROR;
  // tabReady manda: el mapa de estado es por conexión del árbol y lo comparten varias pestañas.
  const connected = tabReady || status === CONNECTION_STATUS.CONNECTED;

  let uiStatus = CONNECTION_STATUS.CONNECTING;
  if (connected) uiStatus = CONNECTION_STATUS.CONNECTED;
  else if (failed) uiStatus = status;

  return {
    tabId: node.key,
    sshConfig: node.sshConfig,
    label: node.label || node.sshConfig.name || node.sshConfig.host,
    originalKey,
    connected,
    status: uiStatus
  };
}
