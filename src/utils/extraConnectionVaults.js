/**
 * Carga/guardado del vault de conexiones activo (selector Termius-like).
 * Un vault a la vez en el árbol; sin raíces-vault fusionadas.
 */

import vaultKeyring from '../services/VaultKeyring';
import {
  connectionVaultStorageKey,
  isVaultRoot,
  DEFAULT_VAULT_ID
} from '../shared/vault-connection-trees';
import { setVaultEncryptedItem, isTinyVaultPayload } from '../shared/vault-write';
import { isMultiVaultEnabled } from './multiVaultFlag';
import localStorageSyncService from '../services/LocalStorageSyncService';
import { getActiveConnectionVaultId } from './activeConnectionVault';

export async function listRegisteredExtraVaults() {
  if (!window.electron?.vaults?.list) return [];
  try {
    const res = await window.electron.vaults.list();
    return res?.success ? res.vaults || [] : [];
  } catch (_) {
    return [];
  }
}

/** Elimina nodos vault-root residuales de un árbol (migración del modelo anterior). */
export function stripVaultRootNodes(nodes) {
  if (!Array.isArray(nodes)) return [];
  return nodes.filter((n) => !isVaultRoot(n));
}

async function readEncryptedBlob(storageKey) {
  let blob = localStorage.getItem(storageKey);
  if ((!blob || isTinyVaultPayload(blob)) && window.electron?.appdata?.getVault) {
    try {
      const fromDisk = await window.electron.appdata.getVault(storageKey);
      if (fromDisk && !isTinyVaultPayload(fromDisk)) {
        const wrote = setVaultEncryptedItem(storageKey, fromDisk);
        if (wrote.ok) blob = fromDisk;
      }
    } catch (_) {
      /* noop */
    }
  }
  return blob;
}

/**
 * Descarga el árbol del vault indicado.
 * @returns {{ nodes: object[], locked: boolean, vaultId: string, storageKey: string }}
 */
export async function loadVaultConnectionTree(vaultId, masterKey, secureStorage) {
  const id = !vaultId || vaultId === DEFAULT_VAULT_ID ? DEFAULT_VAULT_ID : String(vaultId);
  const storageKey = connectionVaultStorageKey(id);

  if (id === DEFAULT_VAULT_ID) {
    return {
      vaultId: DEFAULT_VAULT_ID,
      storageKey,
      locked: false,
      nodes: null // caller usa loadNodes clásico del principal
    };
  }

  let unlocked = vaultKeyring.isUnlocked(id);
  if (!unlocked) {
    const auto = await vaultKeyring.tryAutoUnlock(id);
    unlocked = !!auto.success;
  }
  if (!unlocked) {
    return { vaultId: id, storageKey, locked: true, nodes: [] };
  }

  const key = vaultKeyring.getKey(id);
  const blob = await readEncryptedBlob(storageKey);
  if (!blob || !key || !secureStorage) {
    return { vaultId: id, storageKey, locked: false, nodes: [] };
  }

  try {
    const decrypted = await secureStorage.decryptData(JSON.parse(blob), key);
    const nodes = Array.isArray(decrypted) ? stripVaultRootNodes(decrypted) : [];
    return { vaultId: id, storageKey, locked: false, nodes };
  } catch (e) {
    console.warn(`[ExtraVaults] decrypt ${id}:`, e?.message || e);
    vaultKeyring.lock(id);
    return { vaultId: id, storageKey, locked: true, nodes: [] };
  }
}

/**
 * Guarda el árbol visible en el vault activo.
 */
export async function saveActiveVaultConnectionTree(nodes, vaultId, masterKey, secureStorage) {
  const id = vaultId || getActiveConnectionVaultId() || DEFAULT_VAULT_ID;
  const clean = stripVaultRootNodes(Array.isArray(nodes) ? nodes : []);
  const storageKey = connectionVaultStorageKey(id);
  const result = { ok: false, vaultId: id, storageKey, encryptedStr: null };

  const password =
    id === DEFAULT_VAULT_ID ? masterKey : vaultKeyring.getKey(id);

  if (!password || !secureStorage) {
    return result;
  }

  try {
    const encrypted = await secureStorage.encryptData(clean, password);
    const encryptedStr = JSON.stringify(encrypted);
    const wrote = setVaultEncryptedItem(storageKey, encryptedStr);
    if (!wrote.ok) {
      console.error(`[ExtraVaults] Guardado ${id} rechazado:`, wrote.reason);
      return { ...result, reason: wrote.reason };
    }
    localStorageSyncService.updateCache(storageKey, encryptedStr);
    localStorageSyncService.debouncedSync({ [storageKey]: encryptedStr });
    return { ok: true, vaultId: id, storageKey, encryptedStr, nodes: clean };
  } catch (e) {
    console.error(`[ExtraVaults] Error guardando ${id}:`, e);
    return { ...result, reason: e?.message };
  }
}

/**
 * @deprecated Usado solo por el modelo de raíces fusionadas; mantener no-op safe.
 */
export async function appendExtraVaultRoots(mainNodes) {
  return { nodes: stripVaultRootNodes(mainNodes), collisions: [] };
}

/**
 * @deprecated
 */
export async function savePartitionedConnectionTrees(nodes, masterKey, secureStorage) {
  const active = getActiveConnectionVaultId();
  const saved = await saveActiveVaultConnectionTree(nodes, active, masterKey, secureStorage);
  return {
    wroteMain: active === DEFAULT_VAULT_ID && saved.ok,
    wroteExtras: active !== DEFAULT_VAULT_ID && saved.ok ? [active] : [],
    skippedLocked: [],
    mainNodes: stripVaultRootNodes(nodes),
    syncPayload: saved.encryptedStr ? { [saved.storageKey]: saved.encryptedStr } : {}
  };
}

export function lockVaultInNodes(nodes) {
  return stripVaultRootNodes(nodes);
}

export { isMultiVaultEnabled, DEFAULT_VAULT_ID };
