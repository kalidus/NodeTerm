/**
 * Stash/take del snapshot de pantalla entre renderers (detach de pestaña).
 */

const stashHooks = new Map();

export function registerScreenStashHook(tabId, fn) {
  if (!tabId || typeof fn !== 'function') return;
  stashHooks.set(String(tabId), fn);
}

export function unregisterScreenStashHook(tabId) {
  if (!tabId) return;
  stashHooks.delete(String(tabId));
}

/** Serializa y envía a main mientras el terminal origen aún está montado. */
export function stashTabScreenNow(tabId) {
  if (!tabId) return;
  const fn = stashHooks.get(String(tabId));
  if (typeof fn === 'function') {
    try { fn(); } catch (_) { /* noop */ }
  }
}

export function stashTerminalScreen(tabId, buffer) {
  if (!tabId || !buffer || !window.electron?.ipcRenderer?.send) return;
  try {
    window.electron.ipcRenderer.send('terminal:stash-screen', { tabId, buffer });
  } catch (_) { /* noop */ }
}

export async function takeTerminalScreen(tabId) {
  if (!tabId || !window.electron?.ipcRenderer?.invoke) return null;
  try {
    const buffer = await window.electron.ipcRenderer.invoke('terminal:take-screen', tabId);
    return buffer || null;
  } catch (_) {
    return null;
  }
}

export async function ensureLocalTerminalBuffer(tabId) {
  if (!tabId) return;
  if (window.__terminalBuffers && window.__terminalBuffers[tabId]) return;
  const buffer = await takeTerminalScreen(tabId);
  if (!buffer) return;
  if (!window.__terminalBuffers) window.__terminalBuffers = {};
  window.__terminalBuffers[tabId] = buffer;
}
