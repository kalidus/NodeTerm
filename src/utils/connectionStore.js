// Simple connection store backed by localStorage for favorites and recents
// Supports SSH, RDP (rdp-guacamole), Explorer (SSH-based file explorer) and Groups

const FAVORITES_KEY = 'nodeterm_favorite_connections';
const RECENTS_KEY = 'nodeterm_connection_history';
const RECENT_PASSWORDS_KEY = 'nodeterm_recent_passwords';

// Default max recents if caller does not specify
// Aumentado a 200 para permitir mostrar muchas más conexiones recientes
const DEFAULT_RECENTS_LIMIT = 200;

// Single event name for updates (favorites or recents)
const UPDATED_EVENT = 'connections-updated';

// Suscriptores directos para recents (respaldo al evento, por si falla en algún entorno)
const recentsListeners = new Set();

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
  // Notificación directa para recents (respaldo, misma ejecución síncrona)
  if (key === RECENTS_KEY) {
    recentsListeners.forEach((fn) => {
      try { fn(); } catch (e) { /* noop */ }
    });
  }
}

function normalizePort(type, port) {
  if (port) return parseInt(port, 10);
  if (type === 'ssh' || type === 'explorer' || type === 'sftp' || type === 'scp') return 22;
  if (type === 'ftp') return 21;
  if (type === 'rdp-guacamole' || type === 'rdp') return 3389;
  if (type === 'vnc-guacamole' || type === 'vnc') return 5900;
  return 0;
}

function buildId({ type, host, hostname, username, port }) {
  let t = type === 'rdp' ? 'rdp-guacamole' : type; // normalize
  t = t === 'vnc' ? 'vnc-guacamole' : t; // normalize VNC también
  const h = hostname || host || '';
  const p = normalizePort(t, port);
  const u = username || '';
  return `${t}:${h}:${u}:${p}`;
}

function toSerializable(connection) {
  let type = connection.type === 'rdp' ? 'rdp-guacamole' : connection.type;
  type = type === 'vnc' ? 'vnc-guacamole' : type; // normalize VNC también
  // Mantener tipos de archivos como están (sftp, ftp, scp)
  if (type === 'sftp' || type === 'ftp' || type === 'scp') {
    type = connection.type;
  }
  
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
  
  // Si es un secreto (password, wallet, api_key, etc.), usar estructura especial
  if (['password', 'secret', 'crypto_wallet', 'api_key', 'secure_note'].includes(type)) {
    return {
      id: connection.id || `secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type,
      name: connection.name || connection.label || 'Secreto',
      username: connection.username || '',
      password: connection.password || '',
      url: connection.url || '',
      group: connection.group || '',
      notes: connection.notes || '',
      icon: connection.icon || 'pi-key',
      lastConnected: new Date().toISOString(),
      lastAccessed: connection.lastAccessed || new Date().toISOString()
    };
  }
  
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
    // Timestamp de última conexión (se actualiza cada vez que se registra como reciente)
    lastConnected: new Date().toISOString(),
    // Guardar credenciales y configuración importante
    password: connection.password || '',
    clientType: connection.clientType || (type === 'rdp-guacamole' || type === 'vnc-guacamole' ? 'guacamole' : 'native'),
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
    autoResize: connection.autoResize !== false, // Por defecto true, solo false si explícitamente se establece
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
    // Campos adicionales para conexiones de archivos (SFTP/FTP/SCP)
    protocol: connection.protocol || (type === 'sftp' || type === 'ftp' || type === 'scp' ? type : undefined),
    targetFolder: connection.targetFolder || '',
    lastConnected: connection.lastConnected ? new Date(connection.lastConnected).toISOString() : new Date().toISOString()
  };
}

// Helpers to build connections from common app structures
function fromSidebarNode(node, typeOverride = null) {
  if (!node) return null;
  const isSSH = node.data && node.data.type === 'ssh';
  const isRDP = node.data && (node.data.type === 'rdp' || node.data.type === 'rdp-guacamole');
  const isVNC = node.data && (node.data.type === 'vnc' || node.data.type === 'vnc-guacamole');
  const isFileConnection = node.data && (node.data.type === 'sftp' || node.data.type === 'ftp' || node.data.type === 'scp');
  const type = typeOverride || (isSSH ? 'ssh' : (isRDP ? 'rdp-guacamole' : (isVNC ? 'vnc-guacamole' : (isFileConnection ? node.data.type : (node.data?.type || 'ssh')))));
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
    autoResize: node.data?.autoResize !== false, // Por defecto true, solo false si explícitamente se establece
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
    // Campos adicionales para conexiones de archivos (SFTP/FTP/SCP)
    protocol: node.data?.protocol || (isFileConnection ? node.data.type : undefined),
    targetFolder: node.data?.targetFolder || '',
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

/**
 * Actualiza un favorito cuando se edita una conexión
 * Si el tipo cambió, remueve el favorito viejo y agrega uno nuevo
 * @param {Object} oldConnection - La conexión antigua (nodo original)
 * @param {Object} newConnection - La conexión nueva (nodo actualizado)
 */
export function updateFavoriteOnEdit(oldConnection, newConnection) {
  if (!oldConnection || !newConnection) return;
  
  const oldSerial = toSerializable(oldConnection);
  const newSerial = toSerializable(newConnection);
  const oldId = oldSerial.id;
  const newId = newSerial.id;
  
  const list = getFavorites();
  const oldIdx = list.findIndex(f => f.id === oldId);
  
  // Si el ID cambió (por ejemplo, cambió el tipo), remover el viejo
  if (oldId !== newId && oldIdx >= 0) {
    list.splice(oldIdx, 1);
  }
  
  // Si el favorito existía (con ID viejo o nuevo), actualizarlo
  const newIdx = list.findIndex(f => f.id === newId);
  if (newIdx >= 0) {
    // Actualizar el favorito existente con los nuevos datos
    list[newIdx] = newSerial;
  } else if (oldIdx >= 0) {
    // Si tenía ID viejo pero no nuevo, agregar con nuevo ID
    list.unshift(newSerial);
  }
  // Si no estaba en favoritos, no hacer nada
  
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

// RECENT PASSWORDS
export function getRecentPasswords(limit = 5) {
  const list = loadList(RECENT_PASSWORDS_KEY);
  if (typeof limit === 'number' && limit > 0) {
    return list.slice(0, limit);
  }
  return list;
}

export function recordRecentPassword(passwordData, limit = 5) {
  const passwordRecord = {
    id: passwordData.id || `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: passwordData.name || passwordData.label || 'Password',
    username: passwordData.username || '',
    password: passwordData.password || '',
    url: passwordData.url || '',
    group: passwordData.group || '',
    notes: passwordData.notes || '',
    type: passwordData.type || 'password', // password, crypto_wallet, api_key, secure_note, etc.
    lastAccessed: new Date().toISOString(),
    lastConnected: new Date().toISOString(), // Para sincronizar con recientes generales
    icon: passwordData.icon || 'pi-key'
  };
  
  console.log('🔐 [recordRecentPassword] Registrando secreto:', passwordRecord.type, passwordRecord.name);
  
  // Guardar en RECENT_PASSWORDS_KEY (para compatibilidad con código existente)
  const list = loadList(RECENT_PASSWORDS_KEY);
  const filtered = list.filter(item => item.id !== passwordRecord.id);
  const updated = [passwordRecord, ...filtered];
  const trimmed = updated.slice(0, Math.max(1, limit));
  saveList(RECENT_PASSWORDS_KEY, trimmed);
  
  // TAMBIÉN guardar en RECENTS_KEY para que aparezca en la lista unificada de recientes
  console.log('🔐 [recordRecentPassword] Registrando en lista unificada de recientes');
  recordRecent(passwordRecord, DEFAULT_RECENTS_LIMIT);
  
  return trimmed;
}

export function clearRecentPasswords() {
  saveList(RECENT_PASSWORDS_KEY, []);
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

/** Suscripción directa a cambios en recents (se invoca en el mismo tick que saveList). Respaldo al evento por si falla. */
export function subscribeRecents(fn) {
  recentsListeners.add(fn);
  return () => recentsListeners.delete(fn);
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
  RECENT_PASSWORDS_KEY,
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
  updateFavoriteOnEdit,
  getRecents,
  recordRecent,
  clearRecents,
  getRecentPasswords,
  recordRecentPassword,
  clearRecentPasswords,
  onUpdate,
  helpers,
  constants
};


