/**
 * Carga/guardado particionado para passwords y documents (mismo modelo que conexiones).
 */

import vaultKeyring from '../services/VaultKeyring';
import {
  vaultKindStorageKey,
  isVaultRoot,
  mergeVisibleVaultTrees,
  splitConnectionTrees,
  DEFAULT_VAULT_ID
} from '../shared/vault-connection-trees';
import { setVaultEncryptedItem, isTinyVaultPayload } from '../shared/vault-write';
import localStorageSyncService from '../services/LocalStorageSyncService';
import {
  getActiveConnectionVaultId,
  getVisibleConnectionVaultIds
} from './activeConnectionVault';
import { listRegisteredExtraVaults, stripVaultRootNodes } from './extraConnectionVaults';

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
 * @param {'passwords'|'documents'} kind
 */
export async function loadVaultDomainTree(kind, vaultId, masterKey, secureStorage) {
  const id = !vaultId || vaultId === DEFAULT_VAULT_ID ? DEFAULT_VAULT_ID : String(vaultId);
  const storageKey = vaultKindStorageKey(kind, id);

  if (id === DEFAULT_VAULT_ID) {
    return { vaultId: DEFAULT_VAULT_ID, storageKey, locked: false, nodes: null };
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
    console.warn(`[ExtraDomainVaults:${kind}] decrypt ${id}:`, e?.message || e);
    vaultKeyring.lock(id);
    return { vaultId: id, storageKey, locked: true, nodes: [] };
  }
}

/**
 * @param {'passwords'|'documents'} kind
 */
export async function saveActiveVaultDomainTree(kind, nodes, vaultId, masterKey, secureStorage) {
  const id = vaultId || getActiveConnectionVaultId() || DEFAULT_VAULT_ID;
  const clean = stripVaultRootNodes(Array.isArray(nodes) ? nodes : []);
  const storageKey = vaultKindStorageKey(kind, id);
  const result = { ok: false, vaultId: id, storageKey, encryptedStr: null };

  const password = id === DEFAULT_VAULT_ID ? masterKey : vaultKeyring.getKey(id);
  if (!password || !secureStorage) {
    return result;
  }

  try {
    const encrypted = await secureStorage.encryptData(clean, password);
    const encryptedStr = JSON.stringify(encrypted);
    const wrote = setVaultEncryptedItem(storageKey, encryptedStr);
    if (!wrote.ok) {
      console.error(`[ExtraDomainVaults:${kind}] Guardado ${id} rechazado:`, wrote.reason);
      return { ...result, reason: wrote.reason };
    }
    localStorageSyncService.updateCache(storageKey, encryptedStr);
    localStorageSyncService.debouncedSync({ [storageKey]: encryptedStr });
    return { ok: true, vaultId: id, storageKey, encryptedStr, nodes: clean };
  } catch (e) {
    console.error(`[ExtraDomainVaults:${kind}] Error guardando ${id}:`, e);
    return { ...result, reason: e?.message };
  }
}

/**
 * @param {'passwords'|'documents'} kind
 */
export async function loadVisibleDomainTrees(
  kind,
  visibleIds,
  masterKey,
  secureStorage,
  { migrateMainNodes } = {}
) {
  const ids =
    Array.isArray(visibleIds) && visibleIds.length
      ? visibleIds
      : getVisibleConnectionVaultIds();

  const registry = await listRegisteredExtraVaults();
  const metaById = new Map(registry.map((v) => [v.id, v]));
  const vaultPayloads = [];
  const lockedVaultIds = [];

  for (const rawId of ids) {
    const id =
      !rawId || rawId === DEFAULT_VAULT_ID ? DEFAULT_VAULT_ID : String(rawId);
    const meta = metaById.get(id);

    if (id === DEFAULT_VAULT_ID) {
      let mainNodes = [];
      if (typeof migrateMainNodes === 'function') {
        mainNodes = (await migrateMainNodes()) || [];
      }
      vaultPayloads.push({
        vaultId: DEFAULT_VAULT_ID,
        title: 'Principal',
        icon: 'pi pi-home',
        locked: false,
        nodes: stripVaultRootNodes(mainNodes)
      });
      continue;
    }

    const loaded = await loadVaultDomainTree(kind, id, masterKey, secureStorage);
    if (loaded.locked) {
      lockedVaultIds.push(id);
      vaultPayloads.push({
        vaultId: id,
        title: meta?.name || id,
        icon: meta?.icon || 'pi pi-lock',
        locked: true,
        nodes: []
      });
      continue;
    }

    vaultPayloads.push({
      vaultId: id,
      title: meta?.name || id,
      icon: meta?.icon || 'pi pi-box',
      locked: false,
      nodes: loaded.nodes || []
    });
  }

  const merged = mergeVisibleVaultTrees(vaultPayloads);
  return {
    nodes: merged.nodes,
    multiRoot: merged.multiRoot,
    collisions: merged.collisions,
    lockedVaultIds,
    visibleIds: ids
  };
}

/**
 * @param {'passwords'|'documents'} kind
 */
export async function savePartitionedDomainTrees(kind, nodes, masterKey, secureStorage) {
  const list = Array.isArray(nodes) ? nodes : [];
  const hasRoots = list.some(isVaultRoot);

  if (!hasRoots) {
    const active = getActiveConnectionVaultId();
    const saved = await saveActiveVaultDomainTree(
      kind,
      list,
      active,
      masterKey,
      secureStorage
    );
    return {
      wroteMain: active === DEFAULT_VAULT_ID && saved.ok,
      wroteExtras: active !== DEFAULT_VAULT_ID && saved.ok ? [active] : [],
      skippedLocked: [],
      mainNodes: stripVaultRootNodes(list),
      syncPayload: saved.encryptedStr ? { [saved.storageKey]: saved.encryptedStr } : {},
      ok: saved.ok,
      reason: saved.reason
    };
  }

  const { main, byVaultId, lockedVaultIds } = splitConnectionTrees(list);
  const syncPayload = {};
  const wroteExtras = [];
  const skippedLocked = [...lockedVaultIds];
  let wroteMain = false;
  let ok = true;
  let reason;

  const rootIdsPresent = new Set(
    list
      .filter(isVaultRoot)
      .map((n) => (n.data && n.data.vaultId) || n.vaultId)
      .filter(Boolean)
  );
  const principalVisible =
    rootIdsPresent.has(DEFAULT_VAULT_ID) || list.some((n) => !isVaultRoot(n));

  if (principalVisible && masterKey && secureStorage) {
    const savedMain = await saveActiveVaultDomainTree(
      kind,
      main,
      DEFAULT_VAULT_ID,
      masterKey,
      secureStorage
    );
    wroteMain = savedMain.ok;
    if (savedMain.encryptedStr) {
      syncPayload[savedMain.storageKey] = savedMain.encryptedStr;
    }
    if (!savedMain.ok) {
      ok = false;
      reason = savedMain.reason;
    }
  }

  for (const [vaultId, children] of Object.entries(byVaultId)) {
    if (!rootIdsPresent.has(vaultId)) continue;
    if (!vaultKeyring.isUnlocked(vaultId)) {
      skippedLocked.push(vaultId);
      continue;
    }
    const saved = await saveActiveVaultDomainTree(
      kind,
      children,
      vaultId,
      masterKey,
      secureStorage
    );
    if (saved.ok) {
      wroteExtras.push(vaultId);
      if (saved.encryptedStr) syncPayload[saved.storageKey] = saved.encryptedStr;
    } else {
      ok = false;
      reason = saved.reason || reason;
    }
  }

  return {
    wroteMain,
    wroteExtras,
    skippedLocked,
    mainNodes: main,
    syncPayload,
    ok,
    reason
  };
}

/** Siembra blobs vacíos cifrados para un vault extra recién creado. */
export async function seedEmptyDomainVaultBlobs(vaultId, secureStorage) {
  const id = String(vaultId);
  const key = vaultKeyring.getKey(id);
  if (!key || !secureStorage) return { ok: false, reason: 'no-key' };

  const kinds = ['connections', 'passwords', 'documents'];
  const syncPayload = {};
  for (const kind of kinds) {
    try {
      const encrypted = await secureStorage.encryptData([], key);
      const encStr = JSON.stringify(encrypted);
      const storageKey = vaultKindStorageKey(kind, id);
      const wrote = setVaultEncryptedItem(storageKey, encStr);
      if (wrote.ok) {
        syncPayload[storageKey] = encStr;
        localStorageSyncService.updateCache(storageKey, encStr);
      }
    } catch (e) {
      console.warn(`[ExtraDomainVaults] seed ${kind} ${id}:`, e?.message || e);
    }
  }
  if (Object.keys(syncPayload).length) {
    localStorageSyncService.debouncedSync(syncPayload);
  }
  return { ok: true, syncPayload };
}

/** Elimina claves LS de los tres dominios para un vault extra. */
export function removeExtraVaultLocalStorageKeys(vaultId) {
  const id = String(vaultId);
  for (const kind of ['connections', 'passwords', 'documents']) {
    try {
      localStorage.removeItem(vaultKindStorageKey(kind, id));
    } catch (_) {
      /* noop */
    }
  }
}

export function loadVisiblePasswordTrees(visibleIds, masterKey, secureStorage, opts) {
  return loadVisibleDomainTrees('passwords', visibleIds, masterKey, secureStorage, opts);
}

export function savePartitionedPasswordTrees(nodes, masterKey, secureStorage) {
  return savePartitionedDomainTrees('passwords', nodes, masterKey, secureStorage);
}

export function loadVisibleDocumentTrees(visibleIds, masterKey, secureStorage, opts) {
  return loadVisibleDomainTrees('documents', visibleIds, masterKey, secureStorage, opts);
}

export function savePartitionedDocumentTrees(nodes, masterKey, secureStorage) {
  return savePartitionedDomainTrees('documents', nodes, masterKey, secureStorage);
}
