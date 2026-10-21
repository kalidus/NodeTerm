let homeActive = false;
const listeners = new Set();

export function getHomeTabActive() {
  return homeActive;
}

export function setHomeTabActive(isActive) {
  const next = Boolean(isActive);
  if (next === homeActive) return;
  homeActive = next;
  listeners.forEach((listener) => {
    try {
      listener(homeActive);
    } catch (err) {
      console.warn('[homeTabActiveBus] listener error:', err?.message || err);
    }
  });
}

export function subscribeHomeTabActive(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
