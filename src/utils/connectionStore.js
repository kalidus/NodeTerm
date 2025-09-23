// Simple connection store backed by localStorage for favorites and recents
// Supports SSH, RDP (rdp-guacamole), Explorer (SSH-based file explorer) and Groups

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
  
  // Si es un grupo, usar estructura especial
  if (type === 'group') {
    return {
      id: connection.id || `group_${Date.now()}`,
      type: 'group',
      name: connection.name || connection.label || 'Grupo sin nombre',
      color: connection.color || '#1976d2',
      sessions: connection.sessions || [],
      createdAt: connection.createdAt || new Date().toISOString(),
      lastConnected: connection.lastConnected ? new Date(connection.lastConnected).toISOString() : new Date().toISOString()
    };
  }
  
  return {
    id,
    type,
    name: connection.name || connection.label || `${username}@${host}`,
    host,
    username,
    port,
    // Guardar credenciales y configuración importante
    password: connection.password || '',
    clientType: connection.clientType || (type === 'rdp-guacamole' ? 'guacamole' : 'native'),
    // Campos adicionales para RDP
    domain: connection.domain || '',
    resolution: connection.resolution || '1024x768',
    colors: connection.colors || '32',
    // Opciones avanzadas de RDP (usar nombres consistentes con el formulario)
    guacEnableWallpaper: connection.guacEnableWallpaper || connection.enableWallpaper || false,
    guacEnableDesktopComposition: connection.guacEnableDesktopComposition || connection.enableDesktopComposition || false,
    guacEnableFontSmoothing: connection.guacEnableFontSmoothing || connection.enableFontSmoothing || false,
    guacEnableTheming: connection.guacEnableTheming || connection.enableTheming || false,
    guacEnableFullWindowDrag: connection.guacEnableFullWindowDrag || connection.enableFullWindowDrag || false,
    guacEnableMenuAnimations: connection.guacEnableMenuAnimations || connection.enableMenuAnimations || false,
    guacEnableGfx: connection.guacEnableGfx || connection.enableGfx || false,
    guacDisableGlyphCaching: connection.guacDisableGlyphCaching || connection.disableGlyphCaching || false,
    guacDisableOffscreenCaching: connection.guacDisableOffscreenCaching || connection.disableOffscreenCaching || false,
    guacDisableBitmapCaching: connection.guacDisableBitmapCaching || connection.disableBitmapCaching || false,
    guacDisableCopyRect: connection.guacDisableCopyRect || connection.disableCopyRect || false,
    autoResize: connection.autoResize || false,
    guacDpi: connection.guacDpi || 96,
    guacSecurity: connection.guacSecurity || 'any',
    redirectFolders: connection.redirectFolders !== false,
    redirectClipboard: connection.redirectClipboard !== false,
    redirectPrinters: connection.redirectPrinters || false,
    redirectAudio: connection.redirectAudio !== false,
    fullscreen: connection.fullscreen || false,
    smartSizing: connection.smartSizing !== false,
    span: connection.span || false,
    admin: connection.admin || false,
    // Campos adicionales para SSH
    useBastionWallix: connection.useBastionWallix || false,
    bastionHost: connection.bastionHost || '',
    bastionUser: connection.bastionUser || '',
    targetServer: connection.targetServer || '',
    remoteFolder: connection.remoteFolder || '',
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
    host: node.data?.host || node.data?.server || node.data?.targetServer || node.data?.hostname,
    hostname: node.data?.hostname || node.data?.server || node.data?.host,
    username: node.data?.user || node.data?.username,
    port: node.data?.port,
    // Incluir credenciales y configuración completa
    password: node.data?.password || '',
    clientType: node.data?.clientType || (isRDP ? 'guacamole' : 'native'),
    // Campos adicionales para RDP
    domain: node.data?.domain || '',
    resolution: node.data?.resolution || '1024x768',
    colors: node.data?.colors || '32',
    // Opciones avanzadas de RDP (usar nombres consistentes con el formulario)
    guacEnableWallpaper: node.data?.guacEnableWallpaper || node.data?.enableWallpaper || false,
    guacEnableDrive: node.data?.guacEnableDrive || false,
    guacDriveHostDir: node.data?.guacDriveHostDir || '',
    guacEnableDesktopComposition: node.data?.guacEnableDesktopComposition || node.data?.enableDesktopComposition || false,
    guacEnableFontSmoothing: node.data?.guacEnableFontSmoothing || node.data?.enableFontSmoothing || false,
    guacEnableTheming: node.data?.guacEnableTheming || node.data?.enableTheming || false,
    guacEnableFullWindowDrag: node.data?.guacEnableFullWindowDrag || node.data?.enableFullWindowDrag || false,
    guacEnableMenuAnimations: node.data?.guacEnableMenuAnimations || node.data?.enableMenuAnimations || false,
    guacEnableGfx: node.data?.guacEnableGfx || node.data?.enableGfx || false,
    guacDisableGlyphCaching: node.data?.guacDisableGlyphCaching || node.data?.disableGlyphCaching || false,
    guacDisableOffscreenCaching: node.data?.guacDisableOffscreenCaching || node.data?.disableOffscreenCaching || false,
    guacDisableBitmapCaching: node.data?.guacDisableBitmapCaching || node.data?.disableBitmapCaching || false,
    guacDisableCopyRect: node.data?.guacDisableCopyRect || node.data?.disableCopyRect || false,
    autoResize: node.data?.autoResize || false,
    guacDpi: node.data?.guacDpi || 96,
    guacSecurity: node.data?.guacSecurity || 'any',
    redirectFolders: node.data?.redirectFolders !== false,
    redirectClipboard: node.data?.redirectClipboard !== false,
    redirectPrinters: node.data?.redirectPrinters || false,
    redirectAudio: node.data?.redirectAudio !== false,
    fullscreen: node.data?.fullscreen || false,
    smartSizing: node.data?.smartSizing !== false,
    span: node.data?.span || false,
    admin: node.data?.admin || false,
    // Campos adicionales para SSH
    useBastionWallix: node.data?.useBastionWallix || false,
    bastionHost: node.data?.bastionHost || '',
    bastionUser: node.data?.bastionUser || '',
    targetServer: node.data?.targetServer || '',
    remoteFolder: node.data?.remoteFolder || '',
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

// Función específica para grupos
export function addGroupToFavorites(group) {
  const groupSerial = toSerializable({
    ...group,
    type: 'group'
  });
  const list = getFavorites();
  
  // Buscar por ID del grupo original o por nombre si no hay ID
  const idx = list.findIndex(f => 
    (f.type === 'group' && f.id === groupSerial.id) || 
    (f.type === 'group' && f.name === groupSerial.name)
  );
  
  if (idx >= 0) {
    // Actualizar el grupo existente
    list[idx] = groupSerial;
  } else {
    // Añadir nuevo grupo
    list.unshift(groupSerial);
  }
  saveList(FAVORITES_KEY, list);
  return list;
}

export function removeGroupFromFavorites(groupId, groupName = null) {
  const list = getFavorites().filter(f => 
    !(f.type === 'group' && (f.id === groupId || (groupName && f.name === groupName)))
  );
  saveList(FAVORITES_KEY, list);
  return list;
}

export function isGroupFavorite(groupId, groupName = null) {
  return getFavorites().some(f => 
    f.type === 'group' && 
    (f.id === groupId || (groupName && f.name === groupName))
  );
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
  addGroupToFavorites,
  removeGroupFromFavorites,
  isGroupFavorite,
  getRecents,
  recordRecent,
  clearRecents,
  onUpdate,
  helpers,
  constants
};


