/**
 * Estado efímero que MainContentArea conoce y el host de la pestaña necesita
 * (explorador lateral, monitor, grupo vacío).
 */
const runtime = {
  fileExplorerTabId: null,
  systemMonitorTabId: null,
  contentBlocked: false
};

const listeners = new Set();
const handlers = {};

export function setTabSurfaceHandlers(partial) {
  if (!partial) return;
  Object.assign(handlers, partial);
}

export function getTabSurfaceHandler(name) {
  const fn = handlers[name];
  return typeof fn === 'function' ? fn : null;
}

export function setTabSurfaceRuntime(partial) {
  if (!partial) return;
  Object.assign(runtime, partial);
  listeners.forEach((fn) => {
    try { fn(runtime); } catch (_) { /* noop */ }
  });
}

export function getTabSurfaceRuntime() {
  return runtime;
}

export function subscribeTabSurfaceRuntime(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
