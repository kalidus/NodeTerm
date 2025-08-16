// Simple connection store backed by localStorage for favorites and recents
// Supports SSH, RDP (rdp-guacamole) and Explorer (SSH-based file explorer)

const FAVORITES_KEY = 'nodeterm_favorite_connections';
const RECENTS_KEY = 'nodeterm_connection_history';

// Default max recents if caller does not specify
const DEFAULT_RECENTS_LIMIT = 10;

// Single event name for updates (favorites or recents)
const UPDATED_EVENT = 'connections-updated';

function safeParse(json, fallback) {
  try {
    if (!json) return fallback;
    return JSON.parse(json);
  } catch (_) {
    return fallback;
  }
}

function loadList(key) {
  return safeParse(localStorage.getItem(key), []);
}

function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
  // Notify listeners in UI
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: { key } }));
}

function normalizePort(type, port) {
  if (port) return parseInt(port, 10);
  if (type === 'ssh' || type === 'explorer') return 22;
  if (type === 'rdp-guacamole' || type === 'rdp') return 3389;
  return 0;
}

function buildId({ type, host, hostname, username, port }) {
  const t = type === 'rdp' ? 'rdp-guacamole' : type; // normalize
  const h = hostname || host || '';
  const p = normalizePort(t, port);
  const u = username || '';
  return `${t}:${h}:${u}:${p}`;
}

function toSerializable(connection) {
  const type = connection.type === 'rdp' ? 'rdp-guacamole' : connection.type;
  const host = connection.hostname || connection.host || '';
  const username = connection.username || connection.user || '';
  const port = normalizePort(type, connection.port);
  const id = connection.id || buildId({ type, host, username, port });
  return {
    id,
    type,
    name: connection.name || connection.label || `${username}@${host}`,
    host,
    username,
    port,
    lastConnected: connection.lastConnected ? new Date(connection.lastConnected).toISOString() : new Date().toISOString()
  };
}

// Helpers to build connections from common app structures
function fromSidebarNode(node, typeOverride = null) {
  if (!node) return null;
  const isSSH = node.data && node.data.type === 'ssh';
  const isRDP = node.data && (node.data.type === 'rdp' || node.data.type === 'rdp-guacamole');
  const type = typeOverride || (isSSH ? 'ssh' : (isRDP ? 'rdp-guacamole' : (node.data?.type || 'ssh')));
  const base = {
    type,
    name: node.label,
    host: node.data?.host || node.data?.targetServer || node.data?.hostname,
    hostname: node.data?.hostname,
    username: node.data?.user || node.data?.username,
    port: node.data?.port,
  };
  return toSerializable(base);
}

// For Explorer favorites/recents from an SSH node
function explorerFromSSHNode(node) {
  if (!node || !node.data) return null;
  return toSerializable({
    type: 'explorer',
    name: node.label,
    host: node.data.host,
    username: node.data.user,
    port: node.data.port
  });
}

function fromExplorerConfig(sshConfig, label) {
  return toSerializable({
    type: 'explorer',
    name: label,
    host: sshConfig.host,
    username: sshConfig.username,
    port: sshConfig.port
  });
}

// FAVORITES
export function getFavorites() {
  return loadList(FAVORITES_KEY);
}

export function isFavorite(idOrConn) {
  const id = typeof idOrConn === 'string' ? idOrConn : toSerializable(idOrConn).id;
  return getFavorites().some(f => f.id === id);
}

export function toggleFavorite(connOrId) {
  const serial = typeof connOrId === 'string' ? null : toSerializable(connOrId);
  const id = serial ? serial.id : connOrId;
  const list = getFavorites();
  const idx = list.findIndex(f => f.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift(serial);
  }
  saveList(FAVORITES_KEY, list);
  return list;
}

// RECENTS
export function getRecents(limit = DEFAULT_RECENTS_LIMIT) {
  const list = loadList(RECENTS_KEY);
  if (typeof limit === 'number' && limit > 0) {
    return list.slice(0, limit);
  }
  return list;
}

export function recordRecent(conn, limit = DEFAULT_RECENTS_LIMIT) {
  const serial = toSerializable(conn);
  const list = loadList(RECENTS_KEY);
  const filtered = list.filter(item => item.id !== serial.id);
  const updated = [serial, ...filtered];
  const trimmed = updated.slice(0, Math.max(1, limit));
  saveList(RECENTS_KEY, trimmed);
  return trimmed;
}

export function clearRecents() {
  saveList(RECENTS_KEY, []);
}





export function addFavorite(conn) {
  return toggleFavorite(conn);
}

export function removeFavorite(idOrConn) {
  const id = typeof idOrConn === 'string' ? idOrConn : toSerializable(idOrConn).id;
  const list = getFavorites().filter(f => f.id !== id);
  saveList(FAVORITES_KEY, list);
  return list;
}

export function onUpdate(handler) {
  const listener = (e) => handler(e?.detail);
  window.addEventListener(UPDATED_EVENT, listener);
  return () => window.removeEventListener(UPDATED_EVENT, listener);
}

export const helpers = {
  toSerializable,
  fromSidebarNode,
  explorerFromSSHNode,
  fromExplorerConfig,
  buildId
};

export const constants = {
  FAVORITES_KEY,
  RECENTS_KEY,
  DEFAULT_RECENTS_LIMIT,
  UPDATED_EVENT
};

export default {
  getFavorites,
  isFavorite,
  toggleFavorite,
  addFavorite,
  removeFavorite,
  getRecents,
  recordRecent,
  clearRecents,
  onUpdate,
  helpers,
  constants
};


