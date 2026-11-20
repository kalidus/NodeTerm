'use strict';

/**
 * Una WebContentsView por pestaña. Se puede mover de ventana sin remontar
 * el árbol React (RDP, webview, terminal siguen vivos).
 */

const path = require('path');
const { BrowserWindow, WebContentsView, screen } = require('electron');
const { clearOutputTarget, setOutputTarget } = require('./TabOutputTarget');

const SHELL_TITLE_HEIGHT = 40;

function contentHostBounds(win) {
  if (!isAliveWindow(win)) return null;
  let width = 0;
  let height = 0;
  try {
    const size = typeof win.getContentSize === 'function' ? win.getContentSize() : null;
    if (Array.isArray(size) && size.length >= 2) {
      width = size[0];
      height = size[1];
    } else {
      const bounds = win.getBounds();
      width = bounds.width;
      height = bounds.height;
    }
  } catch (_) {
    return null;
  }
  const hostHeight = Math.max(0, height - SHELL_TITLE_HEIGHT);
  return {
    x: 0,
    y: SHELL_TITLE_HEIGHT,
    width: Math.max(0, width),
    height: hostHeight
  };
}

function fitView(tabKey) {
  try {
    sendToView(tabKey, 'tab-views:terminal-cmd', { tabKey, cmd: 'fit' });
  } catch (_) { /* noop */ }
}

function focusView(tabKey) {
  const entry = tabs.get(tabKey);
  if (!entry) return;
  try {
    if (!entry.view.webContents.isDestroyed()) {
      entry.view.webContents.focus();
    }
  } catch (_) { /* noop */ }
  try {
    sendToView(tabKey, 'tab-views:terminal-cmd', { tabKey, cmd: 'focus' });
  } catch (_) { /* noop */ }
}

function scheduleFitView(tabKey) {
  fitView(tabKey);
  [0, 50, 120, 250, 400].forEach((ms) => {
    setTimeout(() => fitView(tabKey), ms);
  });
  // Tras el reparent el foco queda en el chrome del shell; recuperar cursor xterm.
  setTimeout(() => focusView(tabKey), 80);
  setTimeout(() => focusView(tabKey), 220);
}

const appRoot = path.join(__dirname, '..', '..', '..');

/** @type {Map<string, { view: import('electron').WebContentsView, owner: import('electron').BrowserWindow, state: object|null }>} */
const tabs = new Map();
/** @type {Set<number>} */
const shellIds = new Set();
/** @type {Map<number, Array<object>>} */
const pendingAdopted = new Map();
/** @type {Map<number, { resolve: Function, timer: NodeJS.Timeout }>} */
const pendingCalls = new Map();
let callSeq = 0;
let mainWindowRef = null;

const indexHtml = path.join(appRoot, 'dist', 'index.html');

function loadRenderer(contents, query) {
  const params = new URLSearchParams();
  Object.keys(query || {}).forEach((key) => {
    if (query[key] != null) params.set(key, String(query[key]));
  });
  return contents.loadFile(indexHtml, {
    query,
    hash: params.toString()
  });
}

function webPreferences() {
  return {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webviewTag: true,
    plugins: true,
    backgroundThrottling: false,
    preload: path.join(appRoot, 'preload.js')
  };
}

function isAliveWindow(win) {
  return !!win && typeof win.isDestroyed === 'function' && !win.isDestroyed();
}

function summaryOf(state) {
  const tab = state && state.tab;
  if (!tab) return null;
  return {
    key: tab.key,
    label: tab.label,
    type: tab.type,
    groupId: tab.groupId || null,
    terminalType: tab.terminalType || null
  };
}

function allowAppNavigation(event, navigationUrl) {
  if (!navigationUrl || typeof navigationUrl !== 'string') {
    event.preventDefault();
    return;
  }
  const local = navigationUrl.startsWith('file:') && navigationUrl.includes('index.html');
  if (!local) event.preventDefault();
}

function attachNavigationGuard(contents) {
  contents.on('will-navigate', (event, navigationUrl) => {
    allowAppNavigation(event, navigationUrl);
  });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-attach-webview', (event, prefs) => {
    delete prefs.preload;
    prefs.nodeIntegration = false;
    prefs.nodeIntegrationInWorker = false;
    prefs.nodeIntegrationInSubFrames = false;
    prefs.contextIsolation = true;
    prefs.sandbox = true;
    prefs.webSecurity = true;
  });
}

function tabsForWindow(win) {
  if (!isAliveWindow(win)) return [];
  const list = [];
  for (const [tabKey, entry] of tabs) {
    if (entry.owner === win) list.push(tabKey);
  }
  return list;
}

function hideEntry(entry) {
  try { entry.view.setBounds({ x: 0, y: 0, width: 0, height: 0 }); } catch (_) { /* noop */ }
  try { entry.view.setVisible(false); } catch (_) { /* Electron sin setVisible */ }
}

function placeEntry(entry, bounds) {
  const width = Math.max(0, Math.round(bounds.width || 0));
  const height = Math.max(0, Math.round(bounds.height || 0));
  try {
    if (width < 2 || height < 2) {
      hideEntry(entry);
      return;
    }
    entry.view.setBounds({
      x: Math.round(bounds.x || 0),
      y: Math.round(bounds.y || 0),
      width,
      height
    });
    entry.view.setVisible(true);
  } catch (_) { /* noop */ }
}

function ensure(tabKey, owner) {
  if (!tabKey || !isAliveWindow(owner)) return false;
  if (tabs.has(tabKey)) return true;

  const view = new WebContentsView({ webPreferences: webPreferences() });
  attachNavigationGuard(view.webContents);
  // No redirigir salida aquí: la vista aún no tiene xterm. register-tab-events / *:start
  // desde TabHost llaman setOutputTarget cuando el listener ya existe.
  view.webContents.on('destroyed', () => {
    clearOutputTarget(tabKey);
    const current = tabs.get(tabKey);
    if (current && current.view === view) tabs.delete(tabKey);
  });
  view.webContents.on('did-finish-load', () => {
    const current = tabs.get(tabKey);
    if (!current || !current.state || view.webContents.isDestroyed()) return;
    try { view.webContents.send('tab-views:state', current.state); } catch (_) { /* noop */ }
  });

  owner.contentView.addChildView(view);
  hideEntry({ view });
  tabs.set(tabKey, { view, owner, state: null });

  loadRenderer(view.webContents, { nodetermRole: 'tab', tabKey: String(tabKey) }).catch((err) => {
    console.warn('[TabViews] No se pudo cargar la vista', tabKey, err?.message || err);
  });
  return true;
}

function destroy(tabKey) {
  const entry = tabs.get(tabKey);
  if (!entry) return;
  tabs.delete(tabKey);
  clearOutputTarget(tabKey);
  try {
    if (isAliveWindow(entry.owner)) entry.owner.contentView.removeChildView(entry.view);
  } catch (_) { /* noop */ }
  try {
    if (!entry.view.webContents.isDestroyed()) entry.view.webContents.close();
  } catch (_) { /* noop */ }
}

function updateState(tabKey, state) {
  const entry = tabs.get(tabKey);
  if (!entry) return;
  entry.state = state;
  try {
    if (!entry.view.webContents.isDestroyed()) {
      entry.view.webContents.send('tab-views:state', state);
    }
  } catch (_) { /* renderer aún no listo */ }
}

function getState(tabKey) {
  const entry = tabs.get(tabKey);
  return entry ? entry.state : null;
}

function layout(owner, activeKey, bounds, visible) {
  if (!isAliveWindow(owner)) return;
  for (const tabKey of tabsForWindow(owner)) {
    const entry = tabs.get(tabKey);
    if (!entry) continue;
    if (!visible || tabKey !== activeKey) hideEntry(entry);
    else placeEntry(entry, bounds || {});
  }
}

function queueAdopted(win, payload) {
  const list = pendingAdopted.get(win.id) || [];
  list.push(payload);
  pendingAdopted.set(win.id, list);
  try {
    if (!win.webContents.isDestroyed()) win.webContents.send('tab-views:adopted', payload);
  } catch (_) { /* el shell tira de pull-adopted */ }
}

function pullAdopted(win) {
  if (!isAliveWindow(win)) return [];
  const list = pendingAdopted.get(win.id) || [];
  pendingAdopted.delete(win.id);
  return list;
}

function boundsNear(screenX, screenY) {
  const cursor = (typeof screenX === 'number' && typeof screenY === 'number')
    ? { x: screenX, y: screenY }
    : screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const area = display.workArea;
  const width = Math.min(1100, Math.max(720, area.width - 48));
  const height = Math.min(780, Math.max(480, area.height - 48));
  let x = Math.round(cursor.x - 96);
  let y = Math.round(cursor.y - 40);
  x = Math.max(area.x, Math.min(x, area.x + area.width - width));
  y = Math.max(area.y, Math.min(y, area.y + area.height - height));
  return { x, y, width, height };
}

function isShellWindow(win) {
  if (!isAliveWindow(win)) return false;
  if (shellIds.has(win.id)) return true;
  return win === mainWindowRef;
}

function shellUnderPoint(screenX, screenY, except) {
  if (typeof screenX !== 'number' || typeof screenY !== 'number') return null;
  const main = getMain();
  let found = null;
  for (const win of BrowserWindow.getAllWindows()) {
    if (!isShellWindow(win) || win === except) continue;
    const bounds = win.getBounds();
    const inside = screenX >= bounds.x && screenX <= bounds.x + bounds.width
      && screenY >= bounds.y && screenY <= bounds.y + bounds.height;
    if (!inside) continue;
    // Preferir main al reintegrar (ventanas solapadas).
    if (main && win === main) return win;
    if (!found) found = win;
  }
  return found;
}

async function createDetachedShell(screenX, screenY) {
  const bounds = boundsNear(screenX, screenY);
  const win = new BrowserWindow({
    ...bounds,
    minWidth: 420,
    minHeight: 280,
    title: 'NodeTerm',
    frame: false,
    show: true,
    backgroundColor: '#0a0f1f',
    icon: path.join(appRoot, 'src', 'assets', 'app-icon.png'),
    webPreferences: webPreferences()
  });
  shellIds.add(win.id);
  attachNavigationGuard(win.webContents);
  win.on('closed', () => {
    shellIds.delete(win.id);
    pendingAdopted.delete(win.id);
  });
  win.on('close', (event) => {
    if (win.__nodetermClosing) return;
    const owned = tabsForWindow(win);
    if (owned.length === 0) return;
    event.preventDefault();
    win.__nodetermClosing = true;
    for (const tabKey of owned) {
      const entry = tabs.get(tabKey);
      try {
        if (entry && !entry.view.webContents.isDestroyed()) {
          entry.view.webContents.send('tab-views:prepare-close');
        }
      } catch (_) { /* noop */ }
    }
    setTimeout(() => {
      for (const tabKey of owned) destroy(tabKey);
      if (isAliveWindow(win)) win.close();
    }, 120);
  });

  await loadRenderer(win.webContents, { nodetermRole: 'shell' });
  return win;
}

function closeShellIfEmpty(win) {
  if (!isAliveWindow(win) || !shellIds.has(win.id)) return;
  if (tabsForWindow(win).length > 0) return;
  setTimeout(() => {
    if (isAliveWindow(win) && tabsForWindow(win).length === 0) win.close();
  }, 40);
}

function isDetachedShell(win) {
  return isAliveWindow(win) && shellIds.has(win.id);
}

async function detach(tabKey, screenX, screenY) {
  const entry = tabs.get(tabKey);
  if (!entry) return { ok: false, error: 'La pestaña no tiene vista' };
  const source = entry.owner;
  const main = getMain();
  const under = shellUnderPoint(screenX, screenY, source);

  // Desde una ventana flotante solo se reintegra a main; nunca crear otra.
  if (isDetachedShell(source)) {
    if (!main || under !== main) return { ok: false, reason: 'no-main' };
  }

  const target = under || await createDetachedShell(screenX, screenY);
  const returningToMain = !!(main && target === main);

  const adoptedPayload = {
    tabKey,
    listName: entry.state && entry.state.listName,
    tab: (entry.state && entry.state.tab) || summaryOf(entry.state) || { key: tabKey, label: 'Pestaña', type: 'terminal' }
  };

  if (returningToMain) {
    const tabType = adoptedPayload.tab && adoptedPayload.tab.type;
    const keepView = tabType === 'iron-rdp' || tabType === 'rdp-iron'
      || tabType === 'rdp-guacamole' || tabType === 'vnc-guacamole'
      || tabType === 'vnc' || tabType === 'rdp';

    if (keepView) {
      // RDP/VNC viven en la WebContentsView: reparentar a main sin destruir (sin reconectar).
      try {
        if (isAliveWindow(source)) source.contentView.removeChildView(entry.view);
      } catch (_) { /* noop */ }
      if (isAliveWindow(source)) {
        try { source.webContents.send('tab-views:released', { tabKey }); } catch (_) { /* noop */ }
      }
      target.contentView.addChildView(entry.view);
      entry.owner = target;
      try {
        if (!entry.view.webContents.isDestroyed()) {
          setOutputTarget(tabKey, entry.view.webContents);
        }
      } catch (_) { /* noop */ }
      const initial = contentHostBounds(target);
      if (initial) placeEntry(entry, initial);
      queueAdopted(target, adoptedPayload);
      scheduleFitView(tabKey);
      closeShellIfEmpty(source);
      return { ok: true, windowId: target.id, keepView: true };
    }

    // Stash + handoff EN TabHost (otro webContents) ANTES de quitar/destruir la vista.
    try {
      if (!entry.view.webContents.isDestroyed()) {
        entry.view.webContents.send('tab-views:begin-handoff', { tabKey });
        entry.view.webContents.send('tab-views:stash-now', { tabKey });
      }
    } catch (_) { /* noop */ }
    try {
      const { terminalStdoutRingBuffer } = require('./TerminalStdoutRingBuffer');
      terminalStdoutRingBuffer.setHibernating(tabKey, true);
    } catch (_) { /* noop */ }
    await new Promise((resolve) => setTimeout(resolve, 120));

    try {
      if (isAliveWindow(source)) source.contentView.removeChildView(entry.view);
    } catch (_) { /* noop */ }
    if (isAliveWindow(source)) {
      try { source.webContents.send('tab-views:released', { tabKey }); } catch (_) { /* noop */ }
    }
    // SSH/local: adoptar en React inline y destruir la WebContentsView.
    queueAdopted(target, adoptedPayload);
    destroy(tabKey);
    closeShellIfEmpty(source);
    return { ok: true, windowId: target.id, inline: true };
  }

  try {
    if (isAliveWindow(source)) source.contentView.removeChildView(entry.view);
  } catch (_) { /* noop */ }

  if (isAliveWindow(source)) {
    try { source.webContents.send('tab-views:released', { tabKey }); } catch (_) { /* noop */ }
  }

  target.contentView.addChildView(entry.view);
  entry.owner = target;
  try {
    if (!entry.view.webContents.isDestroyed()) {
      setOutputTarget(tabKey, entry.view.webContents);
    }
  } catch (_) { /* noop */ }
  const initial = contentHostBounds(target);
  if (initial) placeEntry(entry, initial);
  queueAdopted(target, adoptedPayload);
  scheduleFitView(tabKey);
  closeShellIfEmpty(source);
  return { ok: true, windowId: target.id };
}

function markMain(win) {
  mainWindowRef = win || null;
}

function getMain() {
  return isAliveWindow(mainWindowRef) ? mainWindowRef : null;
}

function hasDetachedShells() {
  for (const id of shellIds) {
    const win = BrowserWindow.getAllWindows().find((item) => item.id === id);
    if (isAliveWindow(win)) return true;
  }
  return false;
}

function destroyOwnedBy(win) {
  if (!win) return;
  for (const tabKey of [...tabsForWindow(win)]) destroy(tabKey);
}

function beginCall(owner, payload) {
  const requestId = ++callSeq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingCalls.delete(requestId);
      resolve(null);
    }, 8000);
    pendingCalls.set(requestId, { resolve, timer });
    try {
      owner.webContents.send('tab-views:call', { ...payload, requestId });
    } catch (_) {
      clearTimeout(timer);
      pendingCalls.delete(requestId);
      resolve(null);
    }
  });
}

function finishCall(requestId, result) {
  const pending = pendingCalls.get(requestId);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingCalls.delete(requestId);
  pending.resolve(result);
}

function ownerOf(tabKey) {
  const entry = tabs.get(tabKey);
  return entry ? entry.owner : null;
}

function sendToView(tabKey, channel, payload) {
  const entry = tabs.get(tabKey);
  if (!entry || entry.view.webContents.isDestroyed()) return;
  entry.view.webContents.send(channel, payload);
}

module.exports = {
  ensure,
  destroy,
  updateState,
  getState,
  layout,
  detach,
  pullAdopted,
  hasDetachedShells,
  destroyOwnedBy,
  markMain,
  getMain,
  beginCall,
  finishCall,
  ownerOf,
  sendToView,
  tabsForWindow,
  shellUnderPoint,
  isDetachedShell
};
