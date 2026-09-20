const listeners = new Set();
let guides = [];
let rafId = 0;
let pending = null;

function guidesEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (left.type !== right.type || left.pos !== right.pos || left.start !== right.start || left.end !== right.end) {
      return false;
    }
  }
  return true;
}

function publish(next) {
  if (guidesEqual(guides, next)) return;
  guides = next;
  listeners.forEach((fn) => {
    try {
      fn(guides);
    } catch (err) {
      console.warn('[homePanelSnapBus]', err);
    }
  });
}

export function setHomeSnapGuides(next) {
  pending = Array.isArray(next) ? next : [];
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    const toPublish = pending;
    pending = null;
    publish(Array.isArray(toPublish) ? toPublish : []);
  });
}

export function clearHomeSnapGuides() {
  pending = [];
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  publish([]);
}

export function subscribeHomeSnapGuides(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  fn(guides);
  return () => listeners.delete(fn);
}
