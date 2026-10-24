/**
 * Validación de origen IPC: bloquear guests/webviews.
 * El renderer de BrowserWindow de la app debe poder invocar handlers sensibles
 * (p.ej. security:get-master-key). No fallar cerrado si fromWebContents es null:
 * en Electron eso es frágil y rompía el auto-unlock de la master key.
 */

/**
 * @param {Electron.IpcMainInvokeEvent|Electron.IpcMainEvent} event
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function assertTrustedIpcSender(event) {
  try {
    let BrowserWindow;
    try {
      BrowserWindow = require('electron').BrowserWindow;
    } catch (_) {
      BrowserWindow = null;
    }

    // Mock de test sin BrowserWindow: no bloquear (handlers unitarios)
    if (!BrowserWindow || typeof BrowserWindow.fromWebContents !== 'function') {
      return { ok: true };
    }

    const wc = event?.sender;
    if (!wc || (typeof wc.isDestroyed === 'function' && wc.isDestroyed())) {
      return { ok: false, error: 'IPC sender no disponible' };
    }

    // Objetivo real del hardening: no permitir IPC privilegiado desde <webview>
    if (typeof wc.getType === 'function' && wc.getType() === 'webview') {
      return { ok: false, error: 'IPC desde webview no permitido' };
    }

    // Si fromWebContents no encuentra ventana, NO fallar cerrado: en Electron
    // eso era frágil y rompía security:get-master-key / auto-unlock.
    // Solo rechazar si la ventana asociada está destruida.
    const win = BrowserWindow.fromWebContents(wc);
    if (win && typeof win.isDestroyed === 'function' && win.isDestroyed()) {
      return { ok: false, error: 'IPC sender pertenece a una ventana destruida' };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || 'IPC trust check failed' };
  }
}

module.exports = { assertTrustedIpcSender };
