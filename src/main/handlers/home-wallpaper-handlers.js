const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getNodeTermDataDir } = require('../utils/file-utils');

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

function getWallpaperDir() {
  const dir = path.join(getNodeTermDataDir(), 'home-wallpapers');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function resolveWallpaperFile(fileName) {
  if (!fileName || typeof fileName !== 'string') return null;
  const base = path.basename(fileName);
  if (!base || base !== fileName.replace(/\\/g, '/').split('/').pop()) return null;
  if (base.includes('..') || base.includes('/') || base.includes('\\')) return null;
  const ext = path.extname(base).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return null;
  const dir = path.resolve(getWallpaperDir());
  const full = path.resolve(dir, base);
  if (full !== dir && !full.startsWith(dir + path.sep)) return null;
  return full;
}

function senderWindow(event) {
  try {
    return BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
  } catch (_) {
    return BrowserWindow.getFocusedWindow();
  }
}

function registerHomeWallpaperHandlers() {
  safeHandle('home-wallpaper:import', async (event) => {
    try {
      const win = senderWindow(event);
      const result = await dialog.showOpenDialog(win || undefined, {
        title: 'Home wallpaper',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
      });
      if (result.canceled || !Array.isArray(result.filePaths) || result.filePaths.length === 0) {
        return { ok: true, items: [], skipped: [] };
      }

      const dir = getWallpaperDir();
      const items = [];
      const skipped = [];

      for (const src of result.filePaths) {
        const ext = path.extname(src).toLowerCase();
        const originalName = path.basename(src);
        if (!ALLOWED_EXT.has(ext)) {
          skipped.push({ name: originalName, reason: 'invalidType' });
          continue;
        }
        let stat;
        try {
          stat = await fs.promises.stat(src);
        } catch (err) {
          skipped.push({ name: originalName, reason: 'unreadable' });
          continue;
        }
        if (!stat.isFile() || stat.size > MAX_BYTES) {
          skipped.push({ name: originalName, reason: stat.size > MAX_BYTES ? 'tooLarge' : 'invalidType' });
          continue;
        }

        const id = `wp_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
        const file = `${id}${ext}`;
        const dest = path.join(dir, file);
        await fs.promises.copyFile(src, dest);
        items.push({
          id,
          name: originalName.replace(/\.[^.]+$/, '').slice(0, 80) || id,
          file
        });
      }

      return { ok: true, items, skipped };
    } catch (error) {
      return { ok: false, error: error.message || String(error), items: [], skipped: [] };
    }
  });

  safeHandle('home-wallpaper:get-data-url', async (event, fileName) => {
    try {
      const full = resolveWallpaperFile(fileName);
      if (!full) return { ok: false, error: 'invalidFile' };
      const stat = await fs.promises.stat(full);
      if (!stat.isFile() || stat.size > MAX_BYTES) {
        return { ok: false, error: 'tooLarge' };
      }
      const ext = path.extname(full).toLowerCase();
      const mime = MIME_BY_EXT[ext];
      if (!mime) return { ok: false, error: 'invalidType' };
      const buf = await fs.promises.readFile(full);
      return { ok: true, dataUrl: `data:${mime};base64,${buf.toString('base64')}` };
    } catch (error) {
      return { ok: false, error: error.message || String(error) };
    }
  });

  safeHandle('home-wallpaper:delete', async (event, fileName) => {
    try {
      const full = resolveWallpaperFile(fileName);
      if (!full) return { ok: false, error: 'invalidFile' };
      if (fs.existsSync(full)) {
        await fs.promises.unlink(full);
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || String(error) };
    }
  });
}

module.exports = {
  registerHomeWallpaperHandlers
};
