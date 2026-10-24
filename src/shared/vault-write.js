/**
 * Escritura segura de blobs de vault en localStorage (renderer).
 * Evita envenenar LS con encrypt([]) cuando ya hay un vault sustancial.
 */

const { isCatastrophicVaultPayloadShrink } = require('./vault-shrink-guard');
const { VAULT_LOCAL_STORAGE_KEYS } = require('./vault-local-storage-keys');

const VAULT_STAMPS_LS = 'nodeterm_vault_stamps';

/** Payload cifrado por debajo de esto se considera "tiny" (p. ej. encrypt([])). */
const VAULT_TINY_PAYLOAD_CHARS = 2048;

function isTinyVaultPayload(str) {
  return typeof str === 'string' && str.length > 0 && str.length < VAULT_TINY_PAYLOAD_CHARS;
}

function invalidateVaultStamp(key) {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(VAULT_STAMPS_LS);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || !(key in parsed)) return;
    delete parsed[key];
    localStorage.setItem(VAULT_STAMPS_LS, JSON.stringify(parsed));
  } catch (_) {
    /* noop */
  }
}

/**
 * @param {string} key - p. ej. passwords_encrypted
 * @param {string} encStr - JSON.stringify(encrypted blob)
 * @returns {{ ok: boolean, reason?: string }}
 */
function setVaultEncryptedItem(key, encStr) {
  if (!VAULT_LOCAL_STORAGE_KEYS.includes(key)) {
    console.error(`[VaultWrite] Clave no permitida: ${key}`);
    return { ok: false, reason: 'invalid_key' };
  }
  if (typeof encStr !== 'string' || encStr === '') {
    return { ok: false, reason: 'empty' };
  }
  if (typeof localStorage === 'undefined') {
    return { ok: false, reason: 'no_localStorage' };
  }

  const existing = localStorage.getItem(key);
  if (isCatastrophicVaultPayloadShrink(existing, encStr)) {
    console.error(
      `[VaultWrite] setItem rechazado para ${key}: shrink catastrófico ` +
        `(${existing.length} → ${encStr.length})`
    );
    return { ok: false, reason: 'catastrophic_shrink' };
  }

  localStorage.setItem(key, encStr);
  invalidateVaultStamp(key);
  return { ok: true };
}

module.exports = {
  VAULT_TINY_PAYLOAD_CHARS,
  VAULT_STAMPS_LS,
  isTinyVaultPayload,
  invalidateVaultStamp,
  setVaultEncryptedItem
};
