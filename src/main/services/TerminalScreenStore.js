/**
 * Snapshot de pantalla xterm por tabId (SerializeAddon / líneas).
 * Sirve para restaurar el scrollback al remount en otra ventana (detach).
 */

const screens = new Map();

function stash(tabId, payload) {
  if (!tabId || !payload || typeof payload !== 'object') return;
  screens.set(String(tabId), payload);
}

function take(tabId) {
  if (!tabId) return null;
  const key = String(tabId);
  const payload = screens.get(key) || null;
  screens.delete(key);
  return payload;
}

function clear(tabId) {
  if (!tabId) return;
  screens.delete(String(tabId));
}

module.exports = {
  stash,
  take,
  clear
};
