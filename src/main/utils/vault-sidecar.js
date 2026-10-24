/**
 * Vault sidecars: blobs AES-GCM fuera de app-data.json.
 * Formato: magic "NTV1" (4) + salt(16) + iv(12) + ciphertext
 */

const fs = require('fs');
const path = require('path');
const { getNodeTermDataDir } = require('./file-utils');
const {
  fieldToBytes,
  toEncryptedV2,
  decodeEncryptedFields
} = require('../../shared/vault-blob-encoding');

const MAGIC = Buffer.from('NTV1');
const SALT_LEN = 16;
const IV_LEN = 12;
const HEADER_LEN = MAGIC.length + SALT_LEN + IV_LEN;

/** localStorage key → filename under vault/ */
const VAULT_SIDECAR_FILES = {
  connections_encrypted: 'connections.bin',
  passwords_encrypted: 'passwords.bin',
  documents_encrypted: 'documents.bin',
  nodeterm_secure_sessions: 'secure-sessions.bin'
};

const VAULT_SIDECAR_KEYS = Object.keys(VAULT_SIDECAR_FILES);

function getVaultDir() {
  if (process.env.NODETERM_TEST_DATA_DIR) {
    return path.join(process.env.NODETERM_TEST_DATA_DIR, 'vault');
  }
  return path.join(getNodeTermDataDir(), 'vault');
}

function ensureVaultDir() {
  const dir = getVaultDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sidecarPathForKey(storageKey) {
  const name = VAULT_SIDECAR_FILES[storageKey];
  if (!name) return null;
  return path.join(getVaultDir(), name);
}

function encryptedJsonStringToBinary(jsonStr) {
  const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  const { salt, iv, data } = decodeEncryptedFields(obj);
  if (salt.length !== SALT_LEN || iv.length !== IV_LEN) {
    throw new Error('Invalid vault salt/iv length');
  }
  return Buffer.concat([MAGIC, Buffer.from(salt), Buffer.from(iv), Buffer.from(data)]);
}

function binaryToEncryptedJsonString(buf) {
  if (!Buffer.isBuffer(buf)) {
    buf = Buffer.from(buf);
  }
  if (buf.length < HEADER_LEN) {
    throw new Error('Vault sidecar too short');
  }
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('Invalid vault sidecar magic');
  }
  const salt = buf.subarray(MAGIC.length, MAGIC.length + SALT_LEN);
  const iv = buf.subarray(MAGIC.length + SALT_LEN, HEADER_LEN);
  const data = buf.subarray(HEADER_LEN);
  // timestamp fijo: Date.now() rompía skip idéntico en sync y provocaba 2.º decrypt
  return JSON.stringify(toEncryptedV2({ salt, iv, data, timestamp: 0 }));
}

/**
 * Evita que un blob vacío/casi vacío (p. ej. encrypt([])) pise un vault real.
 * Umbral: existente >= 2KB y nuevo < 25% del tamaño actual.
 */
function isCatastrophicVaultShrink(existingLen, incomingLen) {
  if (!existingLen || existingLen < 2048) return false;
  if (!incomingLen || incomingLen >= existingLen) return false;
  return incomingLen < existingLen * 0.25;
}

/**
 * @param {string} storageKey
 * @param {string} jsonStr
 * @param {{ allowShrink?: boolean }} [options]
 * @returns {boolean} true si escribió
 */
function writeVaultSidecar(storageKey, jsonStr, options = {}) {
  const filePath = sidecarPathForKey(storageKey);
  if (!filePath || jsonStr == null || jsonStr === '') {
    return false;
  }
  ensureVaultDir();
  const binary = encryptedJsonStringToBinary(jsonStr);
  if (fs.existsSync(filePath)) {
    try {
      const existing = fs.readFileSync(filePath);
      if (existing.equals(binary)) {
        return false;
      }
      if (
        !options.allowShrink &&
        isCatastrophicVaultShrink(existing.length, binary.length)
      ) {
        console.error(
          `[VaultSidecar] RECHAZADO shrink catastrófico de ${storageKey}: ` +
            `${existing.length} → ${binary.length} bytes. Se conserva el sidecar actual.`
        );
        return false;
      }
    } catch (_) {
      /* reescribir */
    }
  }
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, binary, { mode: 0o600 });
  fs.renameSync(tmp, filePath);
  return true;
}

function readVaultSidecar(storageKey) {
  const filePath = sidecarPathForKey(storageKey);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  const buf = fs.readFileSync(filePath);
  return binaryToEncryptedJsonString(buf);
}

function deleteVaultSidecar(storageKey) {
  const filePath = sidecarPathForKey(storageKey);
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }
  try {
    fs.unlinkSync(filePath);
  } catch (_) {
    /* noop */
  }
}

/**
 * Fusiona sidecars en el objeto app-data (sin mutar keys de settings).
 * Si hay sidecar, tiene prioridad sobre el valor embebido en JSON.
 */
function mergeVaultSidecarsIntoData(data) {
  const out = data && typeof data === 'object' ? { ...data } : {};
  for (const key of VAULT_SIDECAR_KEYS) {
    try {
      const fromFile = readVaultSidecar(key);
      if (fromFile != null) {
        out[key] = fromFile;
      }
    } catch (err) {
      console.warn(`[VaultSidecar] Error leyendo ${key}:`, err.message || err);
    }
  }
  return out;
}

/**
 * Escribe vault keys a sidecars y las elimina del objeto a persistir en app-data.json.
 * Migra valores embebidos si aún venían en el payload.
 * @returns {{ settingsData: object, wroteVault: boolean }}
 */
function extractAndPersistVaultSidecars(data) {
  const settingsData = { ...(data || {}) };
  let wroteVault = false;

  for (const key of VAULT_SIDECAR_KEYS) {
    const value = settingsData[key];
    delete settingsData[key];
    if (value === undefined || value === null || value === '') {
      continue;
    }
    try {
      const wrote = writeVaultSidecar(key, value);
      if (wrote) {
        wroteVault = true;
      }
      // Shrink rechazado: sidecar intacto; no re-embeber el valor (posiblemente vacío) en JSON
    } catch (err) {
      console.error(`[VaultSidecar] Error escribiendo ${key}:`, err.message || err);
      // Conservar en JSON si falla el sidecar para no perder datos
      settingsData[key] = value;
    }
  }

  return { settingsData, wroteVault };
}

/**
 * Si app-data aún tiene vault embebido, escribe/actualiza sidecars.
 * writeVaultSidecar: no-op si bytes iguales; rechaza shrink; permite crecer sobre sidecar tiny.
 */
function migrateEmbeddedVaultToSidecars(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }
  let migrated = false;
  for (const key of VAULT_SIDECAR_KEYS) {
    const embedded = parsed[key];
    if (embedded == null || embedded === '') continue;
    try {
      if (writeVaultSidecar(key, embedded)) {
        migrated = true;
      }
    } catch (err) {
      console.warn(`[VaultSidecar] Migración ${key} fallida:`, err.message || err);
    }
  }
  return migrated;
}

function stripVaultKeysFromObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const key of VAULT_SIDECAR_KEYS) {
    delete out[key];
  }
  return out;
}

function getVaultSidecarStamps() {
  const stamps = {};
  for (const key of VAULT_SIDECAR_KEYS) {
    const filePath = sidecarPathForKey(key);
    let mtime = 0;
    try {
      if (filePath && fs.existsSync(filePath)) {
        mtime = fs.statSync(filePath).mtimeMs;
      }
    } catch (_) {
      mtime = 0;
    }
    stamps[key] = mtime;
  }
  return stamps;
}

function getVaultSidecarsMtimeMax() {
  let max = 0;
  for (const key of VAULT_SIDECAR_KEYS) {
    const filePath = sidecarPathForKey(key);
    if (!filePath) continue;
    try {
      if (fs.existsSync(filePath)) {
        const m = fs.statSync(filePath).mtimeMs;
        if (m > max) max = m;
      }
    } catch (_) {
      /* noop */
    }
  }
  return max;
}

function listVaultSidecarBasenames() {
  return Object.values(VAULT_SIDECAR_FILES);
}

module.exports = {
  VAULT_SIDECAR_KEYS,
  VAULT_SIDECAR_FILES,
  MAGIC,
  getVaultDir,
  ensureVaultDir,
  sidecarPathForKey,
  encryptedJsonStringToBinary,
  binaryToEncryptedJsonString,
  writeVaultSidecar,
  isCatastrophicVaultShrink,
  readVaultSidecar,
  deleteVaultSidecar,
  mergeVaultSidecarsIntoData,
  extractAndPersistVaultSidecars,
  migrateEmbeddedVaultToSidecars,
  stripVaultKeysFromObject,
  getVaultSidecarStamps,
  getVaultSidecarsMtimeMax,
  listVaultSidecarBasenames,
  fieldToBytes
};
