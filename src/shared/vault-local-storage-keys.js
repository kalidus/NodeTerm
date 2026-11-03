/**
 * Claves de localStorage que contienen vaults cifrados con la master key.
 * Fuente de verdad para validar contrasena al desbloquear.
 *
 * Además de las 4 claves del vault principal, se admiten blobs de conexiones
 * de vaults extra: connections_encrypted__<vaultId>
 */

const { isConnectionVaultStorageKey } = require('./vault-connection-trees');

const VAULT_LOCAL_STORAGE_KEYS = [
  'connections_encrypted',
  'passwords_encrypted',
  'nodeterm_secure_sessions',
  'documents_encrypted'
];

/**
 * True si la clave es un blob de vault permitido (principal o conexiones de vault extra).
 * @param {string} key
 * @returns {boolean}
 */
function isAllowedVaultStorageKey(key) {
  if (typeof key !== 'string' || !key) return false;
  if (VAULT_LOCAL_STORAGE_KEYS.includes(key)) return true;
  // connections_encrypted__<vaultId>
  return isConnectionVaultStorageKey(key);
}

/**
 * Lista base + cualquier clave dinámica ya presente en un objeto/mapa/stamps.
 * @param {object|string[]|null} [extraSource]
 * @returns {string[]}
 */
function listVaultStorageKeys(extraSource = null) {
  const out = [...VAULT_LOCAL_STORAGE_KEYS];
  const seen = new Set(out);

  const add = (key) => {
    if (!isAllowedVaultStorageKey(key) || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  if (Array.isArray(extraSource)) {
    for (const k of extraSource) add(k);
  } else if (extraSource && typeof extraSource === 'object') {
    for (const k of Object.keys(extraSource)) add(k);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        add(k);
      }
    } catch (_) {
      /* noop */
    }
  }

  return out;
}

module.exports = {
  VAULT_LOCAL_STORAGE_KEYS,
  isAllowedVaultStorageKey,
  listVaultStorageKeys
};
