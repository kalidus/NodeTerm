/**
 * Empaquetado de vaults extras para backup .nodeterm (v1.1).
 * CJS puro para reutilizar desde ExportImportService y tests.
 */

const {
  DEFAULT_VAULT_ID,
  connectionVaultStorageKey,
  passwordVaultStorageKey,
  documentVaultStorageKey
} = require('./vault-connection-trees');

const BACKUP_VERSION_SINGLE = '1.0';
const BACKUP_VERSION_ALL_VAULTS = '1.1';
const ALL_VAULTS_ID = 'all';

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeEncryptedBlob(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * Empaqueta un vault extra (solo blobs cifrados; sin favoritos/config globales).
 * @param {{ id: string, name?: string }} vaultMeta
 * @param {(key: string) => unknown} getItem - lee LS (puede devolver objeto ya parseado)
 * @param {{ connections?: boolean, passwords?: boolean, documents?: boolean }} flags
 */
function packExtraVaultEntry(vaultMeta, getItem, flags = {}) {
  const {
    connections = true,
    passwords = true,
    documents = true
  } = flags;
  const vaultId = String(vaultMeta?.id || '');
  if (!vaultId || vaultId === DEFAULT_VAULT_ID || vaultId === ALL_VAULTS_ID) {
    return null;
  }
  const name = String(vaultMeta.name || vaultId);
  const entry = { id: vaultId, name };

  if (connections) {
    const storageKey = connectionVaultStorageKey(vaultId);
    const encrypted = getItem(storageKey);
    if (encrypted != null) {
      entry.connections = {
        encrypted,
        vaultId,
        vaultName: name,
        storageKey
      };
    }
  }

  if (passwords) {
    const storageKey = passwordVaultStorageKey(vaultId);
    const encrypted = getItem(storageKey);
    if (encrypted != null) {
      entry.passwords = {
        encrypted,
        vaultId,
        storageKey
      };
    }
  }

  if (documents) {
    const storageKey = documentVaultStorageKey(vaultId);
    const encrypted = getItem(storageKey);
    if (encrypted != null) {
      entry.documents = {
        encrypted,
        vaultId,
        storageKey
      };
    }
  }

  const hasPayload = !!(entry.connections || entry.passwords || entry.documents);
  return hasPayload ? entry : { ...entry };
}

/**
 * @param {Array<{ id: string, name?: string }>} vaults
 * @param {(key: string) => unknown} getItem
 * @param {{ connections?: boolean, passwords?: boolean, documents?: boolean }} flags
 */
function packAllExtraVaultEntries(vaults, getItem, flags = {}) {
  const list = Array.isArray(vaults) ? vaults : [];
  return list
    .map((v) => packExtraVaultEntry(v, getItem, flags))
    .filter(Boolean);
}

function isAllVaultsExportId(vaultId) {
  return vaultId === ALL_VAULTS_ID;
}

function isSupportedBackupVersion(version) {
  return version === BACKUP_VERSION_SINGLE || version === BACKUP_VERSION_ALL_VAULTS;
}

/**
 * Normaliza la selección de vaults a exportar.
 * @param {string[]|null|undefined} ids - ids explícitos (preferido)
 * @param {string|null|undefined} legacyId - connectionsVaultId ('all' | 'default' | extraId)
 * @param {Array<{ id: string, name?: string }>} available - vaults conocidos (incl. default)
 * @returns {string[]}
 */
function normalizeExportVaultIds(ids, legacyId, available = []) {
  const availableIds = (Array.isArray(available) ? available : [])
    .map((v) => (v && v.id != null ? String(v.id) : ''))
    .filter((id) => id && id !== ALL_VAULTS_ID);
  const allow = new Set(availableIds.length ? availableIds : [DEFAULT_VAULT_ID]);

  if (Array.isArray(ids) && ids.length > 0) {
    const out = [];
    const seen = new Set();
    for (const raw of ids) {
      const id = String(raw || '');
      if (!id || id === ALL_VAULTS_ID || seen.has(id)) continue;
      if (availableIds.length && !allow.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  if (isAllVaultsExportId(legacyId)) {
    return availableIds.length ? [...availableIds] : [DEFAULT_VAULT_ID];
  }

  if (legacyId != null && String(legacyId) !== '') {
    const id = String(legacyId);
    if (id === ALL_VAULTS_ID) {
      return availableIds.length ? [...availableIds] : [DEFAULT_VAULT_ID];
    }
    if (!availableIds.length || allow.has(id)) return [id];
    return [DEFAULT_VAULT_ID];
  }

  return availableIds.includes(DEFAULT_VAULT_ID)
    ? [DEFAULT_VAULT_ID]
    : availableIds.length
      ? [availableIds[0]]
      : [DEFAULT_VAULT_ID];
}

/**
 * Filtra metas de vaults extras a los ids seleccionados (nunca incluye default).
 * @param {Array<{ id: string, name?: string }>} vaults
 * @param {string[]} selectedIds
 */
function filterExtraVaultMetas(vaults, selectedIds) {
  const wanted = new Set(
    (Array.isArray(selectedIds) ? selectedIds : [])
      .map(String)
      .filter((id) => id && id !== DEFAULT_VAULT_ID && id !== ALL_VAULTS_ID)
  );
  return (Array.isArray(vaults) ? vaults : []).filter(
    (v) => v && wanted.has(String(v.id))
  );
}

module.exports = {
  DEFAULT_VAULT_ID,
  ALL_VAULTS_ID,
  BACKUP_VERSION_SINGLE,
  BACKUP_VERSION_ALL_VAULTS,
  normalizeEncryptedBlob,
  packExtraVaultEntry,
  packAllExtraVaultEntries,
  isAllVaultsExportId,
  isSupportedBackupVersion,
  normalizeExportVaultIds,
  filterExtraVaultMetas,
  connectionVaultStorageKey,
  passwordVaultStorageKey,
  documentVaultStorageKey
};
