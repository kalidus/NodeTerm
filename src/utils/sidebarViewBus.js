let currentView = 'connections';
const listeners = new Set();

export function getSidebarView() {
  return currentView;
}

export function setSidebarView(viewMode) {
  const next = viewMode || 'connections';
  if (next === currentView) return;
  currentView = next;
  listeners.forEach((listener) => {
    try {
      listener(currentView);
    } catch (err) {
      console.warn('[sidebarViewBus] listener error:', err?.message || err);
    }
  });
}

export function subscribeSidebarView(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
