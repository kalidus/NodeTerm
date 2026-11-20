const MIRROR_SELECTOR = [
  '#terminal-grid-launcher-panel',
  '#tab-appearance-quick-panel',
  '.p-dialog',
  '.app-dialog',
  '.p-menu',
  '.p-contextmenu',
  '.p-overlaypanel',
  '.app-menu-surface'
].join(',');

let seq = 0;
const tracked = new Map();
const hoverTarget = new Map();
let hoverFrame = 0;

function api() {
  return window.electron && window.electron.ipcRenderer;
}

function mirrorId(el) {
  if (el.dataset.overlayMirrorId) return el.dataset.overlayMirrorId;
  const id = el.id ? `overlay-${el.id}` : `overlay-mirror-${++seq}`;
  el.dataset.overlayMirrorId = id;
  return id;
}

function sync(el) {
  const ipc = api();
  if (!ipc || !el.isConnected) return;
  const rect = el.getBoundingClientRect();
  const id = mirrorId(el);
  if (rect.width < 8 || rect.height < 8) {
    ipc.invoke('overlay-mirror:close', { id }).catch(() => {});
    return;
  }
  ipc.invoke('overlay-mirror:sync', {
    id,
    bounds: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
  }).catch(() => {});
}

function ancestors(node, root) {
  const list = [];
  let current = node;
  while (current && current !== root) {
    list.push(current);
    current = current.parentElement;
  }
  if (root) list.push(root);
  return list;
}

function moveHover(id, root, next) {
  const prev = hoverTarget.get(id) || null;
  if (prev === next) return;
  hoverTarget.set(id, next);
  const left = prev ? ancestors(prev, root) : [];
  const entered = next ? ancestors(next, root) : [];
  if (prev) {
    prev.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: next }));
  }
  if (next) {
    next.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: prev }));
  }
  left.forEach((node) => {
    if (!entered.includes(node)) node.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
  });
  entered.forEach((node) => {
    if (!left.includes(node)) node.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
  });
}

function onInput(payload) {
  if (!payload || !payload.id) return;
  const el = document.querySelector(`[data-overlay-mirror-id="${payload.id}"]`);
  if (!el || !el.isConnected) return;
  const rect = el.getBoundingClientRect();
  const x = rect.left + (payload.x || 0);
  const y = rect.top + (payload.y || 0);
  const target = document.elementFromPoint(x, y);
  if (!target || !el.contains(target)) return;

  if (payload.type === 'mousemove') {
    moveHover(payload.id, el, target);
    if (!hoverFrame) {
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        sync(el);
      });
    }
    return;
  }
  if (payload.type === 'wheel') {
    target.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      deltaY: payload.deltaY || 0
    }));
    sync(el);
    return;
  }
  target.dispatchEvent(new MouseEvent(payload.type, {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
    button: payload.button || 0
  }));
  if (payload.type === 'click') {
    const select = target.closest && target.closest('select');
    if (select && typeof select.showPicker === 'function') {
      try { select.showPicker(); } catch (_) { /* sin gesto de usuario */ }
    }
  }
  sync(el);
}

function dismiss() {
  document.querySelectorAll('[data-overlay-mirror-id]').forEach((el) => {
    if (typeof el._dispose === 'function') el._dispose();
    else if (typeof el._aqpCleanup === 'function') el._aqpCleanup();
  });
}

function track(el) {
  if (!el || tracked.has(el)) return;
  const id = mirrorId(el);
  const observer = new ResizeObserver(() => sync(el));
  observer.observe(el);
  tracked.set(el, { id, observer });
  sync(el);
}

function untrack(el) {
  const entry = tracked.get(el);
  if (!entry) return;
  tracked.delete(el);
  hoverTarget.delete(entry.id);
  try { entry.observer.disconnect(); } catch (_) { /* noop */ }
  const ipc = api();
  if (ipc) ipc.invoke('overlay-mirror:close', { id: entry.id }).catch(() => {});
}

function scan() {
  document.querySelectorAll(MIRROR_SELECTOR).forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width >= 8 && rect.height >= 8) track(el);
  });
  Array.from(tracked.keys()).forEach((el) => {
    if (!el.isConnected) untrack(el);
  });
}

export function startOverlayMirror() {
  const ipc = api();
  if (!ipc) return () => {};
  const offInput = ipc.on('overlay-mirror:input', onInput);
  const offDismiss = ipc.on('overlay-mirror:dismiss', dismiss);
  let pending = 0;
  let positionLoop = 0;
  const watchPositions = () => {
    positionLoop = 0;
    tracked.forEach((_, el) => {
      if (!el.isConnected) return;
      const rect = el.getBoundingClientRect();
      const prev = el._mirrorRect;
      const moved = !prev
        || Math.abs(prev.x - rect.left) > 0.5
        || Math.abs(prev.y - rect.top) > 0.5
        || Math.abs(prev.w - rect.width) > 0.5
        || Math.abs(prev.h - rect.height) > 0.5;
      if (moved) {
        el._mirrorRect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
        sync(el);
      }
    });
    if (tracked.size > 0) positionLoop = requestAnimationFrame(watchPositions);
  };
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      const before = tracked.size;
      scan();
      if (before === 0 && tracked.size > 0 && !positionLoop) positionLoop = requestAnimationFrame(watchPositions);
    });
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  scan();
  if (tracked.size > 0) positionLoop = requestAnimationFrame(watchPositions);
  return () => {
    observer.disconnect();
    if (pending) cancelAnimationFrame(pending);
    if (positionLoop) cancelAnimationFrame(positionLoop);
    if (typeof offInput === 'function') offInput();
    if (typeof offDismiss === 'function') offDismiss();
    Array.from(tracked.keys()).forEach(untrack);
  };
}
