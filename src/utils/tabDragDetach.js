import { beginSessionHandoff, endSessionHandoff } from './sessionHandoff';
import { stashTabScreenNow } from './terminalScreenHandoff';

let detachInFlight = false;

function detachPayload(tabKey, hint) {
  const payload = { tabKey };
  if (hint && hint.forceOutside) {
    payload.forceOutside = true;
    payload.edge = hint.edge;
    payload.clientX = hint.clientX;
    payload.clientY = hint.clientY;
  }
  return payload;
}

/**
 * Al soltar, Chromium deja screenX/screenY dentro de la ventana aunque el
 * ratón ya esté fuera. El proceso principal lee el cursor de verdad.
 * En Linux el drag muere al cruzar el borde y ese cursor sigue dentro:
 * hint.forceOutside desprende sin esa comprobación.
 * La vista pesada solo se crea si el cursor está fuera de la ventana.
 * @param {string} tabKey
 * @param {{ forceOutside?: boolean, edge?: string, clientX?: number, clientY?: number }} [hint]
 */
export function requestTabDetach(tabKey, hint) {
  if (!tabKey || !window.electron?.tabViews?.detach) return;
  if (detachInFlight) return;
  detachInFlight = true;
  const run = async () => {
    const payload = detachPayload(tabKey, hint);
    try {
      let probe;
      try {
        probe = await window.electron.tabViews.detach({ ...payload, dryRun: true });
      } catch (_) {
        return;
      }
      if (!probe || probe.reason !== 'outside') return;

      // Ventana larga: prepare + createDetachedShell + boot de TabHost pueden tardar.
      beginSessionHandoff(15000);
      // Stash antes de ensure/TabHost para que el take del destino ya tenga datos.
      stashTabScreenNow(tabKey);
      const prepare = window.__nodetermPrepareDetach;
      try {
        if (typeof prepare === 'function') await prepare(tabKey);
        const result = await window.electron.tabViews.detach(payload);
        if (!result || result.ok === false) {
          endSessionHandoff();
        }
        // Si OK, el timeout de beginSessionHandoff cubre el unmount/remount.
      } catch (err) {
        endSessionHandoff();
        console.warn('[TabViews] Error al soltar la pestaña:', err?.message || err);
      }
    } finally {
      detachInFlight = false;
    }
  };
  run();
}
