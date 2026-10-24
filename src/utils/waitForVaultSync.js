import localStorageSyncService from '../services/LocalStorageSyncService';
import { vaultLocalNeedsSyncWait } from '../shared/vault-write';

/**
 * Espera a localstorage-sync-ready solo si el vault local falta o es tiny.
 * Warm path (blob sustancial en LS): no bloquea.
 * Dispara initialize() para no depender solo del idle de index.js.
 *
 * @param {string} storageKey - p. ej. connections_encrypted
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<boolean>} true si sync listo o no hacía falta esperar
 */
export function waitForVaultSyncIfNeeded(storageKey, timeoutMs = 5000) {
  if (!vaultLocalNeedsSyncWait(storageKey)) {
    return Promise.resolve(true);
  }
  if (typeof window === 'undefined' || !window.electron?.appdata) {
    return Promise.resolve(true);
  }
  if (localStorageSyncService.isSyncReady()) {
    return Promise.resolve(true);
  }

  try {
    localStorageSyncService.initialize();
  } catch (_) {
    /* noop */
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('localstorage-sync-ready', onReady);
      clearTimeout(timer);
      resolve(ok);
    };
    const onReady = () => finish(true);
    window.addEventListener('localstorage-sync-ready', onReady);
    const timer = setTimeout(() => {
      console.warn(
        `[VaultSync] timeout (${timeoutMs}ms) esperando sync para ${storageKey}; continúo`
      );
      finish(false);
    }, timeoutMs);
  });
}
