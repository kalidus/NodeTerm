const fs = require('fs');
const path = require('path');
const { screen } = require('electron');

const FILE_NAME = 'window-bounds.json';
const FALLBACK_W = 1280;
const FALLBACK_H = 800;
const MIN_W = 200;
const MIN_H = 100;

function boundsFile(userDataPath) {
  return path.join(userDataPath, FILE_NAME);
}

function loadSavedBounds(userDataPath) {
  try {
    const raw = fs.readFileSync(boundsFile(userDataPath), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Number.isFinite(parsed.width) || !Number.isFinite(parsed.height)) {
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

function isOnADisplay(bounds) {
  const displays = screen.getAllDisplays();
  return displays.some((d) => {
    const a = d.workArea;
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    return cx >= a.x && cy >= a.y && cx <= a.x + a.width && cy <= a.y + a.height;
  });
}

function workAreaFallback() {
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.max(MIN_W, Math.min(FALLBACK_W, area.width));
  const height = Math.max(MIN_H, Math.min(FALLBACK_H, area.height));
  return {
    width,
    height,
    x: area.x + Math.floor((area.width - width) / 2),
    y: area.y + Math.floor((area.height - height) / 2),
    isMaximized: false
  };
}

function getInitialWindowBounds(userDataPath) {
  const saved = loadSavedBounds(userDataPath);
  if (!saved) return workAreaFallback();

  const next = {
    width: Math.max(MIN_W, Math.round(saved.width)),
    height: Math.max(MIN_H, Math.round(saved.height)),
    x: Number.isFinite(saved.x) ? Math.round(saved.x) : undefined,
    y: Number.isFinite(saved.y) ? Math.round(saved.y) : undefined,
    isMaximized: !!saved.isMaximized
  };

  if (next.x == null || next.y == null || !isOnADisplay(next)) {
    const fallback = workAreaFallback();
    return { ...fallback, isMaximized: next.isMaximized };
  }
  return next;
}

function saveWindowBounds(userDataPath, win) {
  if (!win || win.isDestroyed()) return;
  try {
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? (win.getNormalBounds ? win.getNormalBounds() : win.getBounds()) : win.getBounds();
    fs.writeFileSync(boundsFile(userDataPath), JSON.stringify({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized
    }));
  } catch (err) {
    console.warn('[MEM] No se pudo guardar el tamano de ventana:', err?.message);
  }
}

module.exports = {
  getInitialWindowBounds,
  saveWindowBounds
};
