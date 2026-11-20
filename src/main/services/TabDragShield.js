'use strict';

/**
 * Escudo transparente a pantalla completa durante el arrastre de pestañas
 * desde main. Acepta HTML5 dragover con dropEffect=move para evitar el
 * cursor prohibido fuera de NodeTerm. El detach real sigue en dragend.
 */

const { BrowserWindow, screen } = require('electron');

/** @type {BrowserWindow|null} */
let shieldWin = null;
/** @type {NodeJS.Timeout|null} */
let pollTimer = null;
/** @type {import('electron').BrowserWindow|null} */
let mainRef = null;

const SHIELD_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  html, body {
    margin: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    overflow: hidden;
    cursor: default;
  }
</style>
</head>
<body>
<script>
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
  }, true);
  document.addEventListener('drop', (e) => {
    e.preventDefault();
  }, true);
</script>
</body>
</html>`;

function unionDisplayBounds() {
  const displays = screen.getAllDisplays();
  if (!displays.length) {
    return { x: 0, y: 0, width: 1920, height: 1080 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const display of displays) {
    const b = display.bounds;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function isAlive(win) {
  return !!win && typeof win.isDestroyed === 'function' && !win.isDestroyed();
}

function pointInWindow(point, win) {
  if (!isAlive(win) || !point) return false;
  try {
    const bounds = win.getBounds();
    return point.x >= bounds.x && point.x <= bounds.x + bounds.width
      && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
  } catch (_) {
    return false;
  }
}

function ensureShield() {
  if (isAlive(shieldWin)) return shieldWin;
  const bounds = unionDisplayBounds();
  shieldWin = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    show: false,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    hasShadow: false,
    alwaysOnTop: true,
    fullscreenable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  shieldWin.setIgnoreMouseEvents(false);
  shieldWin.setAlwaysOnTop(true, 'screen-saver');
  shieldWin.on('closed', () => {
    shieldWin = null;
  });
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(SHIELD_HTML)}`;
  shieldWin.loadURL(dataUrl).catch(() => {});
  return shieldWin;
}

function showShield() {
  const win = ensureShield();
  if (!isAlive(win)) return;
  try {
    win.setBounds(unionDisplayBounds());
    if (!win.isVisible()) win.showInactive();
  } catch (_) { /* noop */ }
}

function hideShield() {
  if (!isAlive(shieldWin)) return;
  try {
    if (shieldWin.isVisible()) shieldWin.hide();
  } catch (_) { /* noop */ }
}

function destroyShield() {
  stopPoll();
  if (isAlive(shieldWin)) {
    try {
      shieldWin.destroy();
    } catch (_) { /* noop */ }
  }
  shieldWin = null;
  mainRef = null;
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function syncShieldVisibility() {
  if (!isAlive(mainRef)) {
    hideShield();
    return;
  }
  const point = screen.getCursorScreenPoint();
  // Sobre main: ocultar para no interferir con reorder de pestañas.
  if (pointInWindow(point, mainRef)) hideShield();
  else showShield();
}

/**
 * @param {import('electron').BrowserWindow|null} mainWindow
 */
function begin(mainWindow) {
  if (!isAlive(mainWindow)) return { ok: false };
  mainRef = mainWindow;
  ensureShield();
  syncShieldVisibility();
  stopPoll();
  pollTimer = setInterval(syncShieldVisibility, 32);
  return { ok: true };
}

function end() {
  destroyShield();
  return { ok: true };
}

module.exports = {
  begin,
  end,
  destroyShield
};
