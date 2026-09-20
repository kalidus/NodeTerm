const listeners = new Set();
let snapshot = {
  tabs: [],
  activeKey: null
};

export function publishHomeSessions(next) {
  snapshot = {
    tabs: Array.isArray(next?.tabs) ? next.tabs : [],
    activeKey: next?.activeKey || null
  };
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (err) {
      console.warn('[homeSessionBus]', err);
    }
  });
}

export function getHomeSessionsSnapshot() {
  return snapshot;
}

export function subscribeHomeSessions(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  fn(snapshot);
  return () => listeners.delete(fn);
}

export function requestActivateHomeTab(key) {
  if (!key) return;
  window.dispatchEvent(new CustomEvent('home-activate-tab', { detail: { key } }));
}

export function requestCloseHomeTab(key) {
  if (!key) return;
  window.dispatchEvent(new CustomEvent('home-close-tab', { detail: { key } }));
}
