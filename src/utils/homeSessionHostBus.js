let hostEl = null;
let hostOptions = {
  terminalFrameStyle: 'default',
  snapToGrid: true,
  smartSnap: true,
  frameBackground: null
};
const listeners = new Set();

function emit() {
  const snapshot = { element: hostEl, options: hostOptions };
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.warn('[homeSessionHostBus] listener error:', err?.message || err);
    }
  });
}

export function getHomeSessionHost() {
  return hostEl;
}

export function getHomeSessionHostOptions() {
  return hostOptions;
}

export function setHomeSessionHostElement(element) {
  const next = element || null;
  if (next === hostEl) return;
  hostEl = next;
  emit();
}

export function setHomeSessionHostOptions(options) {
  if (!options) return;
  hostOptions = { ...hostOptions, ...options };
  emit();
}

export function subscribeHomeSessionHost(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
