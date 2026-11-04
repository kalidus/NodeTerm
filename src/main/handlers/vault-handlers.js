/**
 * IPC para el registro de vaults extra (conexiones).
 */

const { ipcMain, BrowserWindow } = require('electron');
const {
  listVaults,
  getVault,
  getDefaultVaultName,
  createVault,
  renameVault,
  deleteVault,
  backupBeforeFirstExtraVault,
  EXPERIMENTAL_FLAG_KEY
} = require('../utils/vault-registry');

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

function notifyVaultsChanged() {
  for (const win of BrowserWindow.getAllWindows()) {
    try {
      if (!win.isDestroyed()) {
        win.webContents.send('vaults:changed');
      }
    } catch (_) {
      /* noop */
    }
  }
}

function registerVaultHandlers() {
  safeHandle('vaults:list', async () => {
    try {
      return {
        success: true,
        vaults: listVaults(),
        defaultVaultName: getDefaultVaultName()
      };
    } catch (e) {
      return {
        success: false,
        error: e.message,
        vaults: [],
        defaultVaultName: 'Principal'
      };
    }
  });

  safeHandle('vaults:get', async (_event, vaultId) => {
    try {
      return { success: true, vault: getVault(vaultId) };
    } catch (e) {
      return { success: false, error: e.message, vault: null };
    }
  });

  safeHandle('vaults:create', async (_event, payload = {}) => {
    try {
      const backup = backupBeforeFirstExtraVault();
      const vault = createVault(payload || {});
      notifyVaultsChanged();
      return { success: true, vault, backup };
    } catch (e) {
      console.error('[Vaults] create falló:', e.message);
      return { success: false, error: e.message };
    }
  });

  safeHandle('vaults:rename', async (_event, payload = {}) => {
    try {
      const vault = renameVault(payload.vaultId || payload.id, payload.name);
      notifyVaultsChanged();
      return { success: true, vault };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  safeHandle('vaults:delete', async (_event, payload = {}) => {
    try {
      const vaultId = payload.vaultId || payload.id || payload;
      const result = deleteVault(vaultId);
      notifyVaultsChanged();
      return { success: true, ...result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  safeHandle('vaults:flag-key', async () => EXPERIMENTAL_FLAG_KEY);
}

module.exports = {
  registerVaultHandlers,
  EXPERIMENTAL_FLAG_KEY
};
