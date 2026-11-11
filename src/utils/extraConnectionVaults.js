/**
 * Carga/guardado de vaults de conexiones visibles (checks tipo Termius).
 * 1 visible → árbol plano; N visibles → raíces vault-root (drag entre vaults).
 */

import vaultKeyring from '../services/VaultKeyring';
import {
  connectionVaultStorageKey,
  isVaultRoot,
  mergeVisibleVaultTrees,
  splitConnectionTrees,
  DEFAULT_VAULT_ID
} from '../shared/vault-connection-trees';
import { setVaultEncryptedItem, isTinyVaultPayload } from '../shared/vault-write';
import { VAULT_ALLOW_SHRINK_KEYS_META } from '../shared/vault-shrink-guard';
import { isMultiVaultEnabled } from './multiVaultFlag';
import localStorageSyncService from '../services/LocalStorageSyncService';
import {
  getActiveConnectionVaultId,
  getVisibleConnectionVaultIds
} from './activeConnectionVault';

export async function listRegisteredExtraVaults() {
  if (!window.electron?.vaults?.list) return [];
  try {
    const res = await window.electron.vaults.list();
    return res?.success ? res.vaults || [] : [];
  } catch (_) {
    return [];
  }
}

/** Nombre visible del vault principal (persistido en vaults.json). */
export async function getDefaultVaultDisplayName() {
  if (!window.electron?.vaults?.list) return 'Principal';
  try {
    const res = await window.electron.vaults.list();
    const name = String(res?.defaultVaultName || '').trim();
    return name || 'Principal';
  } catch (_) {
    return 'Principal';
  }
}

/** Elimina nodos vault-root residuales de un árbol (vista plana / migración). */
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
 * Descarga el árbol del vault indicado (sin envoltorio raíz).
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
 * Guarda un árbol plano en un vault concreto.
 * @param {{ allowShrink?: boolean }} [options] - allowShrink para borrados UI (p. ej. carpetas Wallix grandes)
 */
export async function saveActiveVaultConnectionTree(
  nodes,
  vaultId,
  masterKey,
  secureStorage,
  options = {}
) {
  const id = vaultId || getActiveConnectionVaultId() || DEFAULT_VAULT_ID;
  const clean = stripVaultRootNodes(Array.isArray(nodes) ? nodes : []);
  const storageKey = connectionVaultStorageKey(id);
  const result = { ok: false, vaultId: id, storageKey, encryptedStr: null };
  const allowShrink = !!options.allowShrink;

  const password =
    id === DEFAULT_VAULT_ID ? masterKey : vaultKeyring.getKey(id);

  if (!password || !secureStorage) {
    return result;
  }

  try {
    const encrypted = await secureStorage.encryptData(clean, password);
    const encryptedStr = JSON.stringify(encrypted);
    const wrote = setVaultEncryptedItem(storageKey, encryptedStr, { allowShrink });
    if (!wrote.ok) {
      console.error(`[ExtraVaults] Guardado ${id} rechazado:`, wrote.reason);
      return { ...result, reason: wrote.reason };
    }
    localStorageSyncService.updateCache(storageKey, encryptedStr);
    const syncPayload = { [storageKey]: encryptedStr };
    if (allowShrink) {
      syncPayload[VAULT_ALLOW_SHRINK_KEYS_META] = [storageKey];
    }
    localStorageSyncService.debouncedSync(syncPayload);
    return { ok: true, vaultId: id, storageKey, encryptedStr, nodes: clean };
  } catch (e) {
    console.error(`[ExtraVaults] Error guardando ${id}:`, e);
    return { ...result, reason: e?.message };
  }
}

/**
 * Carga y fusiona todos los vaults visibles.
 * @returns {{ nodes, multiRoot, lockedVaultIds, collisions, visibleIds }}
 */
export async function loadVisibleConnectionTrees(
  visibleIds,
  masterKey,
  secureStorage,
  { migrateMainNodes } = {}
) {
  const ids = Array.isArray(visibleIds) && visibleIds.length
    ? visibleIds
    : getVisibleConnectionVaultIds();

  const [registry, defaultVaultName] = await Promise.all([
    listRegisteredExtraVaults(),
    getDefaultVaultDisplayName()
  ]);
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
        title: defaultVaultName,
        icon: 'pi pi-home',
        locked: false,
        nodes: stripVaultRootNodes(mainNodes)
      });
      continue;
    }

    const loaded = await loadVaultConnectionTree(id, masterKey, secureStorage);
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
 * Parte el árbol (plano o multi-root) y cifra cada vault desbloqueado afectado.
 * Vaults bloqueados o no presentes no se reescriben.
 */
export async function savePartitionedConnectionTrees(
  nodes,
  masterKey,
  secureStorage,
  options = {}
) {
  const list = Array.isArray(nodes) ? nodes : [];
  const hasRoots = list.some(isVaultRoot);
  const saveOpts = options.allowShrink ? { allowShrink: true } : {};

  if (!hasRoots) {
    const active = getActiveConnectionVaultId();
    const saved = await saveActiveVaultConnectionTree(
      list,
      active,
      masterKey,
      secureStorage,
      saveOpts
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

  // Solo reescribir vaults presentes como raíces en el árbol (no tocar los no visibles)
  const rootIdsPresent = new Set(
    list.filter(isVaultRoot).map((n) => (n.data && n.data.vaultId) || n.vaultId).filter(Boolean)
  );
  const principalVisible =
    rootIdsPresent.has(DEFAULT_VAULT_ID) ||
    // Nodos sueltos top-level = principal en modo legacy merge
    list.some((n) => !isVaultRoot(n));

  if (principalVisible && masterKey && secureStorage) {
    const savedMain = await saveActiveVaultConnectionTree(
      main,
      DEFAULT_VAULT_ID,
      masterKey,
      secureStorage,
      saveOpts
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
    const saved = await saveActiveVaultConnectionTree(
      children,
      vaultId,
      masterKey,
      secureStorage,
      saveOpts
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

export async function appendExtraVaultRoots(mainNodes) {
  return { nodes: stripVaultRootNodes(mainNodes), collisions: [] };
}

export function lockVaultInNodes(nodes, vaultId) {
  if (!Array.isArray(nodes) || !vaultId) return stripVaultRootNodes(nodes);
  // En vista multi-root: vaciar hijos y marcar locked; en plana no aplica
  return nodes.map((n) => {
    if (!isVaultRoot(n)) return n;
    const id = (n.data && n.data.vaultId) || n.vaultId;
    if (String(id) !== String(vaultId)) return n;
    return {
      ...n,
      children: [],
      data: { ...(n.data || {}), locked: true }
    };
  });
}

export { isMultiVaultEnabled, DEFAULT_VAULT_ID, mergeVisibleVaultTrees, splitConnectionTrees };
