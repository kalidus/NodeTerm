'use strict';

const { ipcMain, BrowserWindow, screen } = require('electron');
const registry = require('../services/TabViewRegistry');

function senderWindow(event) {
  try {
    return BrowserWindow.fromWebContents(event.sender);
  } catch (_) {
    return null;
  }
}

function registerTabViewHandlers() {
  ipcMain.handle('tab-views:ensure', (event, payload) => {
    const tabKey = payload && payload.tabKey;
    return { ok: registry.ensure(tabKey, senderWindow(event)) };
  });

  ipcMain.handle('tab-views:destroy', (_event, payload) => {
    if (payload && payload.tabKey) registry.destroy(payload.tabKey);
    return { ok: true };
  });

  ipcMain.handle('tab-views:update-state', (_event, payload) => {
    if (payload && payload.tabKey) registry.updateState(payload.tabKey, payload.state || null);
    return { ok: true };
  });

  ipcMain.handle('tab-views:get-state', (_event, payload) => {
    return registry.getState(payload && payload.tabKey);
  });

  ipcMain.handle('tab-views:layout', (event, payload) => {
    const win = senderWindow(event);
    registry.layout(
      win,
      payload && payload.activeKey,
      payload && payload.bounds,
      payload ? payload.visible !== false : true
    );
    return { ok: true };
  });

  ipcMain.handle('tab-views:detach', async (event, payload) => {
    const tabKey = payload && payload.tabKey;
    if (!tabKey) return { ok: false, error: 'sin pestaña' };

    const win = senderWindow(event);
    const point = screen.getCursorScreenPoint();
    // Otra ventana NodeTerm bajo el cursor (p. ej. main), aunque el origen se solape.
    const other = registry.shellUnderPoint(point.x, point.y, win);
    const main = registry.getMain();
    const fromShell = registry.isDetachedShell(win);

    let outside = true;
    if (win && !win.isDestroyed()) {
      const bounds = win.getBounds();
      outside = point.x < bounds.x || point.y < bounds.y
        || point.x > bounds.x + bounds.width
        || point.y > bounds.y + bounds.height;
    }
    // Si el shell cubre main, el cursor puede seguir "dentro" del origen: permitir reintegrar.
    if (!outside && !other) return { ok: false, reason: 'inside' };

    // Desde flotante: solo reintegrar a main (dryRun y detach real).
    if (fromShell && (!main || other !== main)) {
      return { ok: false, reason: 'no-main' };
    }

    if (payload.dryRun) return { ok: true, reason: 'outside' };

    if (!registry.ownerOf(tabKey) && win) {
      try { registry.ensure(tabKey, win); } catch (err) {
        console.warn('[TabViews] No se pudo crear la vista al soltar:', err?.message || err);
      }
    }

    const result = await registry.detach(tabKey, point.x, point.y);
    if (!result || result.ok === false) {
      if (!(result && result.reason === 'no-main')) {
        console.warn('[TabViews] No se desprendió la pestaña', tabKey, result && result.error);
      }
    }
    return result;
  });

  ipcMain.handle('tab-views:close', async (_event, payload) => {
    const tabKey = payload && payload.tabKey;
    if (!tabKey) return { ok: false };
    registry.sendToView(tabKey, 'tab-views:prepare-close', { tabKey });
    await new Promise((resolve) => setTimeout(resolve, 80));
    const owner = registry.ownerOf(tabKey);
    registry.destroy(tabKey);
    if (owner && !owner.isDestroyed()) {
      try { owner.webContents.send('tab-views:removed', { tabKey }); } catch (_) { /* noop */ }
    }
    return { ok: true };
  });

  ipcMain.handle('tab-views:pull-adopted', (event) => {
    return registry.pullAdopted(senderWindow(event));
  });

  ipcMain.handle('tab-views:call', async (_event, payload) => {
    if (!payload || !payload.tabKey) return null;
    const main = registry.getMain();
    const owner = registry.ownerOf(payload.tabKey);
    const target = (main && !main.isDestroyed()) ? main : owner;
    if (!target || target.isDestroyed()) return null;
    return registry.beginCall(target, {
      tabKey: payload.tabKey,
      method: payload.method,
      args: payload.args || []
    });
  });

  ipcMain.on('tab-views:call-result', (_event, payload) => {
    if (!payload) return;
    registry.finishCall(payload.requestId, payload.result);
  });

  ipcMain.on('tab-views:terminal-cmd', (_event, payload) => {
    if (!payload || !payload.tabKey) return;
    registry.sendToView(payload.tabKey, 'tab-views:terminal-cmd', payload);
  });
}

module.exports = { registerTabViewHandlers };
