'use strict';

/**
 * Ventana hija del tamaño del panel. Pinta una captura del HTML (que queda
 * debajo de la WebContentsView) y reenvía el ratón al documento real.
 * Así el launcher flota y el contenido de la pestaña sigue visible alrededor.
 */

const path = require('path');
const { BrowserWindow, ipcMain } = require('electron');

const preloadPath = path.join(__dirname, '..', '..', '..', 'preload.js');

const mirrors = new Map();

function isAlive(win) {
  return !!win && typeof win.isDestroyed === 'function' && !win.isDestroyed();
}

function parentOf(event) {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!isAlive(win)) return null;
    if (event.sender.getType && event.sender.getType() !== 'window') return null;
    return win;
  } catch (_) {
    return null;
  }
}

function pageScript(id) {
  return `
    document.documentElement.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.background = 'transparent';
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.style.cssText = 'width:100%;height:100%;display:block;user-select:none;pointer-events:none;';
    document.body.appendChild(img);
    const send = (type, event) => {
      if (!window.electron || !window.electron.ipcRenderer) return;
      window.electron.ipcRenderer.send('overlay-mirror:input', {
        id: ${JSON.stringify(id)},
        type,
        x: event.clientX,
        y: event.clientY,
        button: event.button || 0,
        deltaY: event.deltaY || 0
      });
    };
    document.addEventListener('mousemove', (event) => send('mousemove', event));
    document.addEventListener('mousedown', (event) => send('mousedown', event));
    document.addEventListener('mouseup', (event) => send('mouseup', event));
    document.addEventListener('click', (event) => send('click', event));
    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      send('contextmenu', event);
    });
    document.addEventListener('wheel', (event) => {
      event.preventDefault();
      send('wheel', event);
    }, { passive: false });
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on('overlay-mirror:frame', (dataUrl) => {
        if (typeof dataUrl === 'string' && dataUrl) img.src = dataUrl;
      });
    }
    0;
  `;
}

async function ensureMirror(parent, id) {
  let entry = mirrors.get(id);
  if (entry && entry.parent === parent && isAlive(entry.win)) return entry;
  if (entry) closeMirror(id);

  const win = new BrowserWindow({
    parent,
    frame: false,
    transparent: false,
    show: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: true,
    hasShadow: false,
    thickFrame: false,
    backgroundColor: '#0e1116',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath
    }
  });
  entry = { win, parent, ready: false, pending: null };
  mirrors.set(id, entry);
  win.on('closed', () => {
    if (mirrors.get(id)?.win === win) mirrors.delete(id);
  });
  await win.loadURL('about:blank');
  if (!isAlive(win)) return null;
  await win.webContents.executeJavaScript(pageScript(id));
  entry.ready = true;
  return entry;
}

function place(parent, win, bounds) {
  const content = parent.getContentBounds();
  const width = Math.max(1, Math.round(bounds.width || 0));
  const height = Math.max(1, Math.round(bounds.height || 0));
  win.setBounds({
    x: Math.round(content.x + (bounds.x || 0)),
    y: Math.round(content.y + (bounds.y || 0)),
    width,
    height
  });
}

async function paint(entry, parent, bounds) {
  if (!entry || !entry.ready || !isAlive(entry.win) || !isAlive(parent)) return;
  const rect = {
    x: Math.max(0, Math.round(bounds.x || 0)),
    y: Math.max(0, Math.round(bounds.y || 0)),
    width: Math.max(1, Math.round(bounds.width || 0)),
    height: Math.max(1, Math.round(bounds.height || 0))
  };
  place(parent, entry.win, rect);
  if (!entry.shown) {
    entry.win.show();
    entry.shown = true;
  }
  try {
    const image = await parent.webContents.capturePage(rect);
    if (!isAlive(entry.win) || image.isEmpty()) return;
    entry.win.webContents.send('overlay-mirror:frame', image.toDataURL());
  } catch (_) { /* la ventana se cerró a mitad de la captura */ }
}

function closeMirror(id) {
  const entry = mirrors.get(id);
  if (!entry) return;
  mirrors.delete(id);
  if (isAlive(entry.win)) entry.win.close();
}

function registerOverlayMirror() {
  ipcMain.handle('overlay-mirror:sync', async (event, payload) => {
    const parent = parentOf(event);
    const id = payload && payload.id;
    const bounds = payload && payload.bounds;
    if (!parent || !id || !bounds) return { ok: false };
    if (bounds.width < 8 || bounds.height < 8) {
      closeMirror(id);
      return { ok: true };
    }
    let entry = null;
    try {
      entry = await ensureMirror(parent, id);
    } catch (err) {
      console.warn('[OverlayMirror] No se pudo abrir el panel:', err?.message || err);
      closeMirror(id);
      return { ok: false };
    }
    if (!entry) return { ok: false };
    if (entry.painting) {
      entry.pending = bounds;
      return { ok: true };
    }
    entry.painting = true;
    let next = bounds;
    while (next) {
      const current = next;
      next = null;
      await paint(entry, parent, current);
      next = entry.pending;
      entry.pending = null;
    }
    entry.painting = false;
    return { ok: true };
  });

  ipcMain.handle('overlay-mirror:close', (_event, payload) => {
    if (payload && payload.id) closeMirror(payload.id);
    return { ok: true };
  });

  ipcMain.on('overlay-mirror:input', (event, payload) => {
    const entry = payload && mirrors.get(payload.id);
    if (!entry || !isAlive(entry.parent)) return;
    if (event.sender !== entry.win.webContents) return;
    entry.parent.webContents.send('overlay-mirror:input', payload);
  });

  ipcMain.on('overlay-mirror:dismiss', (event) => {
    const { getMain } = require('./TabViewRegistry');
    const main = getMain();
    if (!isAlive(main)) return;
    if (event.sender === main.webContents) return;
    main.webContents.send('overlay-mirror:dismiss');
  });
}

module.exports = { registerOverlayMirror };
