import { useState, useEffect, useCallback, useRef } from 'react';
import localStorageSyncService from '../services/LocalStorageSyncService';
import SecureStorage from '../services/SecureStorage';
import { getVisibleConnectionVaultIds } from '../utils/activeConnectionVault';
import {
  isVaultWipePendingSetup,
  setVaultWipePendingSetup
} from '../shared/vault-write';

let lastDecryptedDataStr = null;
let lastDecryptedKey = null;
let lastDecryptedResult = null;
let lastMigratedResult = null;

export function readConnectionDecryptCache() {
  return {
    dataStr: lastDecryptedDataStr,
    key: lastDecryptedKey,
    result: lastDecryptedResult,
    migrated: lastMigratedResult
  };
}

export function writeConnectionDecryptCache(patch = {}) {
  if ('dataStr' in patch) lastDecryptedDataStr = patch.dataStr;
  if ('key' in patch) lastDecryptedKey = patch.key;
  if ('result' in patch) lastDecryptedResult = patch.result;
  if ('migrated' in patch) lastMigratedResult = patch.migrated;
}

/**
 * Sesión de bóveda: clave maestra, desbloqueo y vaults visibles.
 * isAppReady sigue en App; este hook lo marca cuando el unlock inicial termina.
 */
export function useVaultSession({ setIsAppReady, toast }) {
  const [secureStorage] = useState(() => new SecureStorage());
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [needsMasterKeySetup, setNeedsMasterKeySetup] = useState(false);
  const [masterKey, setMasterKey] = useState(null);
  const [showCloudRestoreMasterKey, setShowCloudRestoreMasterKey] = useState(false);
  const [cloudRestoreVaults, setCloudRestoreVaults] = useState(null);
  const [extraVaultUnlock, setExtraVaultUnlock] = useState(null);
  const [showCreateExtraVault, setShowCreateExtraVault] = useState(false);
  const [visibleVaultIds, setVisibleVaultIds] = useState(() => getVisibleConnectionVaultIds());
  const visibleVaultIdsRef = useRef(visibleVaultIds);
  visibleVaultIdsRef.current = visibleVaultIds;

  useEffect(() => {
    const waitForSyncReady = (timeoutMs = 12000) => new Promise((resolve) => {
      if (localStorageSyncService.isSyncReady()) {
        resolve(true);
        return;
      }
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
        console.warn(`[App] localstorage-sync-ready timeout (${timeoutMs}ms); continúo sin sync completo`);
        finish(false);
      }, timeoutMs);
    });

    const initializeApp = async () => {
      try {
        let savedMasterKey = null;
        try {
          savedMasterKey = await secureStorage.loadMasterKey();
        } catch (err) {
          console.error('[App] Error en auto-unlock:', err);
        }

        if (savedMasterKey) {
          setMasterKey(savedMasterKey);
          setNeedsUnlock(false);
          setNeedsMasterKeySetup(false);
          setIsAppReady(true);
          waitForSyncReady().then(async () => {
            try {
              await secureStorage.migrateVaultSecurityIfNeeded();
            } catch (e) {
              console.warn('[App] migrateVaultSecurityIfNeeded:', e);
            }
          });
          return;
        }

        const hasKey = await secureStorage.checkHasSavedMasterKey();
        if (hasKey) {
          setNeedsUnlock(true);
          setNeedsMasterKeySetup(false);
        } else {
          setNeedsMasterKeySetup(true);
          setNeedsUnlock(false);
        }
      } catch (err) {
        console.error('[App] Error inicializando unlock:', err);
        setNeedsUnlock(true);
        setNeedsMasterKeySetup(false);
      }

      setIsAppReady(true);
      waitForSyncReady().then(async () => {
        try {
          await secureStorage.migrateVaultSecurityIfNeeded();
        } catch (e) {
          console.warn('[App] migrateVaultSecurityIfNeeded:', e);
        }
      });
    };

    initializeApp();
  }, [secureStorage, setIsAppReady]);

  const handleUnlockSuccess = useCallback(async (key) => {
    if (!localStorage.getItem('connections_encrypted')) {
      await localStorageSyncService.reloadFromSharedFile();
    }
    setMasterKey(key);
    setNeedsUnlock(false);
    setNeedsMasterKeySetup(false);
    window.dispatchEvent(new CustomEvent('encryption-data-synced'));
  }, []);

  const handleMasterKeySetupSuccess = useCallback((key) => {
    setVaultWipePendingSetup(false);
    setMasterKey(key);
    setNeedsMasterKeySetup(false);
    setNeedsUnlock(false);
    window.dispatchEvent(new CustomEvent('encryption-data-synced'));
    toast.current?.show({
      severity: 'success',
      summary: 'Vault configurado',
      detail: 'Clave maestra creada. Tus credenciales quedarán cifradas.',
      life: 4000
    });
  }, [toast]);

  const handleVaultWipeSuccess = useCallback(() => {
    setMasterKey(null);
    setNeedsUnlock(false);
    setNeedsMasterKeySetup(true);
    setShowCloudRestoreMasterKey(false);
    window.dispatchEvent(new CustomEvent('encryption-data-synced'));
    toast.current?.show({
      severity: 'info',
      summary: 'Vault borrado',
      detail: 'Datos cifrados eliminados. Crea una nueva clave maestra.',
      life: 4500
    });
  }, [toast]);

  useEffect(() => {
    const onWiped = () => handleVaultWipeSuccess();
    window.addEventListener('vault-data-wiped', onWiped);
    return () => window.removeEventListener('vault-data-wiped', onWiped);
  }, [handleVaultWipeSuccess]);

  useEffect(() => {
    const onCloudRestoreNeedsKey = (e) => {
      if (isVaultWipePendingSetup()) return;
      if (needsMasterKeySetup) return;
      const { vaultsDownloaded } = e.detail || {};
      const hasVault =
        localStorage.getItem('connections_encrypted') ||
        localStorage.getItem('passwords_encrypted');
      if (!hasVault) return;
      setCloudRestoreVaults(vaultsDownloaded || {
        connections: !!localStorage.getItem('connections_encrypted'),
        passwords: !!localStorage.getItem('passwords_encrypted')
      });
      setShowCloudRestoreMasterKey(true);
    };
    window.addEventListener('cloud-restore-requires-master-key', onCloudRestoreNeedsKey);
    return () => window.removeEventListener('cloud-restore-requires-master-key', onCloudRestoreNeedsKey);
  }, [needsMasterKeySetup]);

  const handleCloudRestoreMasterKeySuccess = useCallback((key) => {
    setMasterKey(key);
    setNeedsUnlock(false);
    setNeedsMasterKeySetup(false);
    setShowCloudRestoreMasterKey(false);
    window.dispatchEvent(new CustomEvent('connections-synced-from-cloud', { detail: { unlocked: true } }));
    window.dispatchEvent(new CustomEvent('passwords-synced-from-cloud', { detail: { silent: false } }));
    toast.current?.show({
      severity: 'success',
      summary: 'Backup desbloqueado',
      detail: 'Conexiones y contraseñas restauradas con tu clave maestra.',
      life: 4000
    });
  }, [toast]);

  const handleMasterPasswordConfigured = useCallback((key) => {
    setMasterKey(key);
    setNeedsMasterKeySetup(false);
  }, []);

  const handleMasterPasswordChanged = useCallback((key) => {
    setMasterKey(key);
  }, []);

  useEffect(() => {
    const onMasterKeyUpdated = (event) => {
      const key = event.detail?.key;
      if (typeof key === 'string' && key) setMasterKey(key);
    };
    window.addEventListener('master-key-updated', onMasterKeyUpdated);
    return () => window.removeEventListener('master-key-updated', onMasterKeyUpdated);
  }, []);

  useEffect(() => {
    const syncVisibleFromStorage = (event) => {
      const fromEvent = event?.detail?.vaultIds;
      const next = Array.isArray(fromEvent) && fromEvent.length
        ? fromEvent.map(String)
        : getVisibleConnectionVaultIds();
      setVisibleVaultIds(next);
      visibleVaultIdsRef.current = next;
    };
    window.addEventListener('visible-connection-vaults-changed', syncVisibleFromStorage);
    window.addEventListener('extra-vaults-reload', syncVisibleFromStorage);
    return () => {
      window.removeEventListener('visible-connection-vaults-changed', syncVisibleFromStorage);
      window.removeEventListener('extra-vaults-reload', syncVisibleFromStorage);
    };
  }, []);

  useEffect(() => {
    try {
      window.__nodetermHasMasterKey = Boolean(masterKey);
    } catch (_) {
      /* noop */
    }
    const library = window.electron?.library;
    if (!library) return undefined;
    const announce = (unlocked) => {
      window.dispatchEvent(new CustomEvent('library-vault-state', { detail: { unlocked } }));
    };
    if (masterKey) {
      library.unlock(masterKey)
        .then((result) => announce(Boolean(result?.success)))
        .catch((err) => {
          console.warn('[Library] No se pudo desbloquear el almacén:', err?.message || err);
          announce(false);
        });
    } else {
      library.lock().catch(() => {});
      announce(false);
    }
    return undefined;
  }, [masterKey]);

  return {
    secureStorage,
    needsUnlock,
    needsMasterKeySetup,
    masterKey,
    setMasterKey,
    showCloudRestoreMasterKey,
    setShowCloudRestoreMasterKey,
    cloudRestoreVaults,
    extraVaultUnlock,
    setExtraVaultUnlock,
    showCreateExtraVault,
    setShowCreateExtraVault,
    visibleVaultIds,
    setVisibleVaultIds,
    visibleVaultIdsRef,
    handleUnlockSuccess,
    handleMasterKeySetupSuccess,
    handleVaultWipeSuccess,
    handleCloudRestoreMasterKeySuccess,
    handleMasterPasswordConfigured,
    handleMasterPasswordChanged
  };
}
