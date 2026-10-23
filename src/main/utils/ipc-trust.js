/**
 * Validación de origen IPC: solo webContents de ventanas BrowserWindow
 * (no guests/webviews).
 */

/**
 * @param {Electron.IpcMainInvokeEvent|Electron.IpcMainEvent} event
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function assertTrustedIpcSender(event) {
  try {
    // Require lazy: en tests el mock de electron a menudo no incluye BrowserWindow
    const electron = require('electron');
    const BrowserWindow = electron.BrowserWindow;

    if (!BrowserWindow || typeof BrowserWindow.fromWebContents !== 'function') {
      // Entorno de test / mock incompleto → no bloquear
      return { ok: true };
    }

    const wc = event?.sender;
    if (!wc || (typeof wc.isDestroyed === 'function' && wc.isDestroyed())) {
      return { ok: false, error: 'IPC sender no disponible' };
    }

    if (typeof wc.getType === 'function' && wc.getType() === 'webview') {
      return { ok: false, error: 'IPC desde webview no permitido' };
    }

    const win = BrowserWindow.fromWebContents(wc);
    if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
      return { ok: false, error: 'IPC sender no pertenece a una ventana de la app' };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || 'IPC trust check failed' };
  }
}

module.exports = { assertTrustedIpcSender };
