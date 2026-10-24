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

function writeVaultSidecar(storageKey, jsonStr) {
  const filePath = sidecarPathForKey(storageKey);
  if (!filePath || jsonStr == null || jsonStr === '') {
    return false;
  }
  ensureVaultDir();
  const binary = encryptedJsonStringToBinary(jsonStr);
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
      writeVaultSidecar(key, value);
      wroteVault = true;
    } catch (err) {
      console.error(`[VaultSidecar] Error escribiendo ${key}:`, err.message || err);
      // Conservar en JSON si falla el sidecar para no perder datos
      settingsData[key] = value;
    }
  }

  return { settingsData, wroteVault };
}

/**
 * Si app-data aún tiene vault embebido y no hay sidecar (o queremos re-migrar),
 * escribe sidecars desde el objeto parseado. No borra del objeto en memoria aquí.
 */
function migrateEmbeddedVaultToSidecars(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }
  let migrated = false;
  for (const key of VAULT_SIDECAR_KEYS) {
    const embedded = parsed[key];
    if (embedded == null || embedded === '') continue;
    const filePath = sidecarPathForKey(key);
    if (filePath && fs.existsSync(filePath)) {
      continue;
    }
    try {
      writeVaultSidecar(key, embedded);
      migrated = true;
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
  readVaultSidecar,
  deleteVaultSidecar,
  mergeVaultSidecarsIntoData,
  extractAndPersistVaultSidecars,
  migrateEmbeddedVaultToSidecars,
  stripVaultKeysFromObject,
  getVaultSidecarsMtimeMax,
  listVaultSidecarBasenames,
  fieldToBytes
};
