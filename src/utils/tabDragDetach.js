import { beginSessionHandoff, endSessionHandoff } from './sessionHandoff';

/**
 * Al soltar, Chromium deja screenX/screenY dentro de la ventana aunque el
 * ratón ya esté fuera. El proceso principal lee el cursor de verdad.
 * La vista pesada solo se crea si el cursor está fuera de la ventana.
 */
export function requestTabDetach(tabKey) {
  if (!tabKey || !window.electron?.tabViews?.detach) return;
  const run = async () => {
    let probe;
    try {
      probe = await window.electron.tabViews.detach({ tabKey, dryRun: true });
    } catch (_) {
      return;
    }
    if (!probe || probe.reason !== 'outside') return;

    beginSessionHandoff(800);
    const prepare = window.__nodetermPrepareDetach;
    try {
      if (typeof prepare === 'function') await prepare(tabKey);
      const result = await window.electron.tabViews.detach({ tabKey });
      if (!result || result.ok === false) {
        endSessionHandoff();
        return;
      }
      setTimeout(() => endSessionHandoff(), 400);
    } catch (err) {
      endSessionHandoff();
      console.warn('[TabViews] Error al soltar la pestaña:', err?.message || err);
    }
  };
  run();
}
