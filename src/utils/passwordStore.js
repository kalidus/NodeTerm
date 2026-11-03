/**
 * Persistencia del árbol de passwords (principal + vaults extra vía extraDomainVaults).
 */

import localStorageSyncService from '../services/LocalStorageSyncService';
import { setVaultEncryptedItem } from '../shared/vault-write';
import {
  passwordVaultStorageKey,
  DEFAULT_VAULT_ID
} from '../shared/vault-connection-trees';
import {
  loadVisiblePasswordTrees,
  savePartitionedPasswordTrees,
  saveActiveVaultDomainTree
} from './extraDomainVaults';
import { stripVaultRootNodes } from './extraConnectionVaults';
import { isMultiVaultEnabled } from './multiVaultFlag';
import { getVisibleConnectionVaultIds } from './activeConnectionVault';
import { waitForVaultSyncIfNeeded } from './waitForVaultSync';

const STORAGE_KEY_TREE = 'passwords_encrypted';
const STORAGE_KEY_TREE_PLAIN = 'passwordManagerNodes';

function notifyPasswordsChanged() {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('password-vault-changed'));
}

/** Carga el árbol del vault principal (plano, sin raíces). */
export async function loadMainPasswordTree(secureStorage, masterKey) {
  try {
    await waitForVaultSyncIfNeeded(STORAGE_KEY_TREE, 5000);
    if (masterKey && secureStorage) {
      const encryptedData = localStorage.getItem(STORAGE_KEY_TREE);
      if (encryptedData) {
        const decrypted = await secureStorage.decryptStorageKeyCached(
          STORAGE_KEY_TREE,
          masterKey
        );
        return stripVaultRootNodes(Array.isArray(decrypted) ? decrypted : []);
      }
      const plainData = localStorage.getItem(STORAGE_KEY_TREE_PLAIN);
      if (plainData) {
        const parsed = JSON.parse(plainData);
        const encrypted = await secureStorage.encryptData(parsed, masterKey);
        const encStr = JSON.stringify(encrypted);
        const wrote = setVaultEncryptedItem(STORAGE_KEY_TREE, encStr);
        if (wrote.ok) {
          localStorage.removeItem(STORAGE_KEY_TREE_PLAIN);
          localStorageSyncService.debouncedSync({ [STORAGE_KEY_TREE]: encStr });
        }
        return stripVaultRootNodes(Array.isArray(parsed) ? parsed : []);
      }
      return [];
    }
    const saved = localStorage.getItem(STORAGE_KEY_TREE_PLAIN);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return stripVaultRootNodes(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    console.error('Error loading passwords:', error);
    return [];
  }
}

/**
 * Carga passwords respetando vaults visibles (plano o multi-root).
 */
export async function loadPasswordTree(secureStorage, masterKey, visibleIds) {
  if (!isMultiVaultEnabled()) {
    return {
      nodes: await loadMainPasswordTree(secureStorage, masterKey),
      multiRoot: false,
      lockedVaultIds: []
    };
  }

  const ids =
    Array.isArray(visibleIds) && visibleIds.length
      ? visibleIds
      : getVisibleConnectionVaultIds();

  for (const id of ids) {
    await waitForVaultSyncIfNeeded(passwordVaultStorageKey(id), 5000);
  }

  const loaded = await loadVisiblePasswordTrees(ids, masterKey, secureStorage, {
    migrateMainNodes: () => loadMainPasswordTree(secureStorage, masterKey)
  });

  return {
    nodes: loaded.nodes || [],
    multiRoot: !!loaded.multiRoot,
    lockedVaultIds: loaded.lockedVaultIds || [],
    visibleIds: loaded.visibleIds
  };
}

/**
 * Guarda el árbol (plano o multi-root) en el/los vault(s) correspondiente(s).
 */
export async function savePasswordTree(tree, secureStorage, masterKey) {
  try {
    if (!masterKey && localStorage.getItem(STORAGE_KEY_TREE)) {
      return false;
    }

    if (isMultiVaultEnabled() && (masterKey || (Array.isArray(tree) && tree.length))) {
      if (!masterKey && !secureStorage) return false;
      const saved = await savePartitionedPasswordTrees(tree, masterKey, secureStorage);
      if (saved.ok) {
        localStorage.removeItem(STORAGE_KEY_TREE_PLAIN);
        notifyPasswordsChanged();
      }
      return !!saved.ok;
    }

    if (masterKey && secureStorage) {
      const saved = await saveActiveVaultDomainTree(
        'passwords',
        tree,
        DEFAULT_VAULT_ID,
        masterKey,
        secureStorage
      );
      if (saved.ok) {
        localStorage.removeItem(STORAGE_KEY_TREE_PLAIN);
        notifyPasswordsChanged();
      }
      return !!saved.ok;
    }

    console.warn('[passwordStore] Guardado requiere master key');
    return false;
  } catch (error) {
    console.error('Error saving passwords:', error);
    return false;
  }
}

export { STORAGE_KEY_TREE, STORAGE_KEY_TREE_PLAIN, passwordVaultStorageKey };
