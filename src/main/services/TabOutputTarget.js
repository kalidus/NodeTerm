/**
 * Destino de la salida de PTY/SSH por tabId.
 * La vista de la pestaña puede vivir en otra ventana; el proceso sigue en main.
 */

const targets = new Map();

function isAlive(sender) {
  if (!sender) return false;
  try {
    if (typeof sender.isDestroyed === 'function' && sender.isDestroyed()) return false;
    const wc = sender.webContents || sender;
    if (!wc || (typeof wc.isDestroyed === 'function' && wc.isDestroyed())) return false;
    return true;
  } catch (_) {
    return false;
  }
}

function setOutputTarget(tabId, webContents) {
  if (!tabId) return;
  if (!webContents) {
    targets.delete(String(tabId));
    return;
  }
  targets.set(String(tabId), webContents);
}

function clearOutputTarget(tabId) {
  if (!tabId) return;
  targets.delete(String(tabId));
}

/**
 * webContents de la pestaña, o la ventana de respaldo si aún no hay vista.
 * @param {string} tabId
 * @param {Electron.BrowserWindow|Electron.WebContents|null} fallback
 */
function resolveOutputSender(tabId, fallback) {
  const target = tabId ? targets.get(String(tabId)) : null;
  if (isAlive(target)) return target;
  return fallback;
}

module.exports = {
  setOutputTarget,
  clearOutputTarget,
  resolveOutputSender
};
