/**
 * Sincronización Nextcloud de vaults extras (multi-vault).
 * Archivos remotos distintos del vault principal para no romper restores antiguos.
 */

const {
  DEFAULT_VAULT_ID,
  connectionVaultStorageKey,
  passwordVaultStorageKey,
  documentVaultStorageKey,
  parseVaultKindStorageKey
} = require('../shared/vault-connection-trees');
const { setVaultEncryptedItem } = require('../shared/vault-write');

const NC_FILE_VAULTS_REGISTRY = 'nodeterm-vaults-registry.json';

function ncExtraConnectionsFile(vaultId) {
  return `nodeterm-connections__${vaultId}.enc`;
}

function ncExtraPasswordsFile(vaultId) {
  return `nodeterm-passwords__${vaultId}.enc`;
}

function ncExtraDocumentsFile(vaultId) {
  return `nodeterm-documents__${vaultId}.json`;
}

/**
 * @param {{ length: number, key: (i: number) => string|null }} storage
 * @returns {string[]}
 */
function collectExtraVaultIdsFromStorage(storage) {
  const ids = new Set();
  if (!storage || typeof storage.key !== 'function') return [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    const parsed = parseVaultKindStorageKey(key);
    if (parsed && parsed.vaultId && parsed.vaultId !== DEFAULT_VAULT_ID) {
      ids.add(parsed.vaultId);
    }
  }
  return [...ids].sort();
}

/**
 * @param {Array<{ id: string, name?: string, icon?: string, order?: number, createdAt?: string|null }>} vaults
 */
function buildVaultsRegistryPayload(vaults) {
  const list = Array.isArray(vaults) ? vaults : [];
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    vaults: list
      .filter((v) => v && v.id && v.id !== DEFAULT_VAULT_ID)
      .map((v, index) => ({
        id: String(v.id),
        name: String(v.name || v.id),
        icon: v.icon || 'pi pi-lock',
        order: typeof v.order === 'number' ? v.order : index,
        createdAt: v.createdAt || null
      }))
  };
}

/**
 * Sube registry + blobs de vaults extras.
 * @param {{ uploadFile: Function }} nextcloudService
 * @param {{ listVaults?: () => Promise<Array>, storage?: Storage }} options
 */
async function uploadExtraVaultsToCloud(nextcloudService, options = {}) {
  const storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  let vaults = [];
  if (typeof options.listVaults === 'function') {
    vaults = (await options.listVaults()) || [];
  } else if (typeof window !== 'undefined' && window.electron?.vaults?.list) {
    const res = await window.electron.vaults.list();
    vaults = res?.vaults || [];
  }

  const registry = buildVaultsRegistryPayload(vaults);
  await nextcloudService.uploadFile(
    NC_FILE_VAULTS_REGISTRY,
    JSON.stringify(registry, null, 2)
  );

  const idsFromRegistry = registry.vaults.map((v) => v.id);
  const idsFromStorage = storage ? collectExtraVaultIdsFromStorage(storage) : [];
  const vaultIds = [...new Set([...idsFromRegistry, ...idsFromStorage])].sort();

  const uploaded = [];
  for (const vaultId of vaultIds) {
    const connKey = connectionVaultStorageKey(vaultId);
    const pwKey = passwordVaultStorageKey(vaultId);
    const docKey = documentVaultStorageKey(vaultId);
    const conn = storage?.getItem?.(connKey);
    const pw = storage?.getItem?.(pwKey);
    const doc = storage?.getItem?.(docKey);

    if (conn) {
      await nextcloudService.uploadFile(ncExtraConnectionsFile(vaultId), conn);
      uploaded.push(ncExtraConnectionsFile(vaultId));
    }
    if (pw) {
      await nextcloudService.uploadFile(ncExtraPasswordsFile(vaultId), pw);
      uploaded.push(ncExtraPasswordsFile(vaultId));
    }
    if (doc) {
      const bundle = JSON.stringify({ [docKey]: doc }, null, 2);
      await nextcloudService.uploadFile(ncExtraDocumentsFile(vaultId), bundle);
      uploaded.push(ncExtraDocumentsFile(vaultId));
    }
  }

  return { success: true, extraVaultIds: vaultIds, uploaded, registry };
}

/**
 * Asegura que el vault exista en el registry local (create con id fijo si falta).
 */
async function ensureLocalExtraVault(vaultMeta, createVault) {
  const id = String(vaultMeta.id);
  const name = String(vaultMeta.name || id);
  if (typeof createVault !== 'function') {
    return { id, name, created: false };
  }
  try {
    const created = await createVault({ id, name, icon: vaultMeta.icon });
    if (created?.success === false) {
      // Ya existe u otro error no fatal si el id está ocupado
      const err = String(created.error || '');
      if (/ya existe/i.test(err)) {
        return { id, name, created: false };
      }
      throw new Error(created.error || 'No se pudo crear el vault');
    }
    return { id, name, created: true, vault: created?.vault || created };
  } catch (e) {
    if (/ya existe/i.test(String(e?.message || e))) {
      return { id, name, created: false };
    }
    throw e;
  }
}

/**
 * @param {{ downloadFile: Function }} nextcloudService
 * @param {{
 *   extraVaultIds?: string[],
 *   createVault?: Function,
 *   listVaults?: () => Promise<Array>,
 *   writeEncrypted?: Function
 * }} options
 */
async function downloadExtraVaultsFromCloud(nextcloudService, options = {}) {
  const writeEncrypted = options.writeEncrypted || setVaultEncryptedItem;
  let registry = null;
  try {
    const raw = await nextcloudService.downloadFile(NC_FILE_VAULTS_REGISTRY);
    if (raw) registry = JSON.parse(raw);
  } catch (e) {
    console.warn('[SYNC] nodeterm-vaults-registry.json:', e.message);
  }

  const fromRegistry = Array.isArray(registry?.vaults) ? registry.vaults : [];
  const ids = new Set([
    ...(options.extraVaultIds || []),
    ...fromRegistry.map((v) => v.id)
  ]);
  // Quitar default / all
  ids.delete(DEFAULT_VAULT_ID);
  ids.delete('all');

  let createVault = options.createVault;
  if (!createVault && typeof window !== 'undefined' && window.electron?.vaults?.create) {
    createVault = (payload) => window.electron.vaults.create(payload);
  }

  const restored = [];
  for (const vaultId of [...ids].sort()) {
    const meta = fromRegistry.find((v) => v.id === vaultId) || { id: vaultId, name: vaultId };
    try {
      await ensureLocalExtraVault(meta, createVault);
    } catch (e) {
      console.warn(`[SYNC] No se pudo asegurar vault ${vaultId}:`, e.message);
    }

    try {
      const conn = await nextcloudService.downloadFile(ncExtraConnectionsFile(vaultId));
      if (conn) {
        const wrote = writeEncrypted(connectionVaultStorageKey(vaultId), conn);
        if (wrote?.ok !== false) restored.push(connectionVaultStorageKey(vaultId));
      }
    } catch (e) {
      console.warn(`[SYNC] Extra connections ${vaultId}:`, e.message);
    }

    try {
      const pw = await nextcloudService.downloadFile(ncExtraPasswordsFile(vaultId));
      if (pw) {
        const wrote = writeEncrypted(passwordVaultStorageKey(vaultId), pw);
        if (wrote?.ok !== false) restored.push(passwordVaultStorageKey(vaultId));
      }
    } catch (e) {
      console.warn(`[SYNC] Extra passwords ${vaultId}:`, e.message);
    }

    try {
      const docRaw = await nextcloudService.downloadFile(ncExtraDocumentsFile(vaultId));
      if (docRaw) {
        const parsed = JSON.parse(docRaw);
        const docKey = documentVaultStorageKey(vaultId);
        const payload = parsed?.[docKey] ?? parsed?.encrypted ?? (typeof parsed === 'string' ? parsed : null);
        if (payload) {
          const val = typeof payload === 'string' ? payload : JSON.stringify(payload);
          const wrote = writeEncrypted(docKey, val);
          if (wrote?.ok !== false) restored.push(docKey);
        }
      }
    } catch (e) {
      console.warn(`[SYNC] Extra documents ${vaultId}:`, e.message);
    }
  }

  if (typeof window !== 'undefined' && restored.length > 0) {
    try {
      window.dispatchEvent(new CustomEvent('extra-vaults-reload'));
    } catch (_) {
      /* noop */
    }
  }

  return {
    success: true,
    extraVaultIds: [...ids].sort(),
    restored,
    registry
  };
}

module.exports = {
  NC_FILE_VAULTS_REGISTRY,
  DEFAULT_VAULT_ID,
  ncExtraConnectionsFile,
  ncExtraPasswordsFile,
  ncExtraDocumentsFile,
  collectExtraVaultIdsFromStorage,
  buildVaultsRegistryPayload,
  uploadExtraVaultsToCloud,
  downloadExtraVaultsFromCloud,
  ensureLocalExtraVault
};
