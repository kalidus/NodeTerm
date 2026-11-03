/**
 * Vault sidecars: blobs AES-GCM fuera de app-data.json.
 * NTV1: magic "NTV1" (4) + salt(16) + iv(12) + ciphertext
 * NTV2: magic "NTV2" (4) + saltLen(u8) + salt + iv(12) + flags(u8) + iterations(u32 BE) + ciphertext
 *   flags: 0 = PBKDF2-SHA256, 1 = pbkdf2-sha512
 *   saltLen: 16 o 32
 */

const fs = require('fs');
const path = require('path');
const { getNodeTermDataDir } = require('./file-utils');
const {
  fieldToBytes,
  toEncryptedV2,
  decodeEncryptedFields
} = require('../../shared/vault-blob-encoding');
const {
  parseConnectionVaultStorageKey,
  DEFAULT_VAULT_ID
} = require('../../shared/vault-connection-trees');

const MAGIC_V1 = Buffer.from('NTV1');
const MAGIC_V2 = Buffer.from('NTV2');
/** @deprecated use MAGIC_V1 — exported as MAGIC for compat */
const MAGIC = MAGIC_V1;
const SALT_LEN_V1 = 16;
const SALT_LEN_ALLOWED = new Set([16, 32]);
const IV_LEN = 12;
const FLAG_SHA256 = 0;
const FLAG_SHA512 = 1;
const HEADER_LEN_V1 = MAGIC_V1.length + SALT_LEN_V1 + IV_LEN;
const NTV2_FIXED_OVERHEAD = MAGIC_V2.length + 1 + IV_LEN + 1 + 4; // magic+saltLen+iv+flags+iters

/** localStorage key → filename under vault/ (vault principal) */
const VAULT_SIDECAR_FILES = {
  connections_encrypted: 'connections.bin',
  passwords_encrypted: 'passwords.bin',
  documents_encrypted: 'documents.bin',
  nodeterm_secure_sessions: 'secure-sessions.bin'
};

const VAULT_SIDECAR_KEYS = Object.keys(VAULT_SIDECAR_FILES);

function getVaultRootDir() {
  if (process.env.NODETERM_TEST_DATA_DIR) {
    return path.join(process.env.NODETERM_TEST_DATA_DIR, 'vault');
  }
  return path.join(getNodeTermDataDir(), 'vault');
}

/**
 * Directorio de sidecars: vault/ (principal) o vault/<vaultId>/ (extra).
 * @param {string} [vaultId]
 */
function getVaultDir(vaultId) {
  const root = getVaultRootDir();
  if (!vaultId || vaultId === DEFAULT_VAULT_ID) {
    return root;
  }
  // Evitar path traversal
  const safe = String(vaultId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe || safe !== String(vaultId)) {
    return root;
  }
  return path.join(root, safe);
}

function ensureVaultDir(vaultId) {
  const dir = getVaultDir(vaultId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * @param {string} storageKey
 * @returns {string|null}
 */
function sidecarPathForKey(storageKey) {
  if (VAULT_SIDECAR_FILES[storageKey]) {
    return path.join(getVaultDir(DEFAULT_VAULT_ID), VAULT_SIDECAR_FILES[storageKey]);
  }
  const parsed = parseConnectionVaultStorageKey(storageKey);
  if (parsed && parsed.vaultId !== DEFAULT_VAULT_ID) {
    return path.join(getVaultDir(parsed.vaultId), 'connections.bin');
  }
  return null;
}

/**
 * True si la clave tiene sidecar conocido (principal o connections de vault extra).
 */
function isVaultSidecarKey(storageKey) {
  return sidecarPathForKey(storageKey) != null;
}

/**
 * Descubre claves de vaults extra presentes en disco (vault/<id>/connections.bin).
 * @returns {string[]}
 */
function listExtraConnectionVaultKeys() {
  const root = getVaultRootDir();
  if (!fs.existsSync(root)) return [];
  const keys = [];
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const id = ent.name;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) continue;
    const bin = path.join(root, id, 'connections.bin');
    if (fs.existsSync(bin)) {
      keys.push(`connections_encrypted__${id}`);
    }
  }
  return keys;
}

/**
 * Claves de sidecar a considerar (base + extras en disco + keys del payload).
 * @param {object|null} [data]
 * @returns {string[]}
 */
function listAllVaultSidecarKeys(data = null) {
  const seen = new Set(VAULT_SIDECAR_KEYS);
  const out = [...VAULT_SIDECAR_KEYS];
  const add = (k) => {
    if (!k || seen.has(k) || !isVaultSidecarKey(k)) return;
    seen.add(k);
    out.push(k);
  };
  for (const k of listExtraConnectionVaultKeys()) add(k);
  if (data && typeof data === 'object') {
    for (const k of Object.keys(data)) add(k);
  }
  return out;
}

function isSha512Kdf(obj) {
  return obj && obj.kdf === 'pbkdf2-sha512';
}

function encryptedJsonStringToBinary(jsonStr) {
  const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  const { salt, iv, data } = decodeEncryptedFields(obj);
  if (!SALT_LEN_ALLOWED.has(salt.length) || iv.length !== IV_LEN) {
    throw new Error('Invalid vault salt/iv length');
  }

  const useV2 = salt.length === 32 || isSha512Kdf(obj);
  if (!useV2) {
    return Buffer.concat([MAGIC_V1, Buffer.from(salt), Buffer.from(iv), Buffer.from(data)]);
  }

  const flags = isSha512Kdf(obj) ? FLAG_SHA512 : FLAG_SHA256;
  const iterations =
    typeof obj.iterations === 'number' && obj.iterations > 0 ? obj.iterations >>> 0 : 0;
  const iterBuf = Buffer.alloc(4);
  iterBuf.writeUInt32BE(iterations, 0);

  return Buffer.concat([
    MAGIC_V2,
    Buffer.from([salt.length]),
    Buffer.from(salt),
    Buffer.from(iv),
    Buffer.from([flags]),
    iterBuf,
    Buffer.from(data)
  ]);
}

function binaryToEncryptedJsonString(buf) {
  if (!Buffer.isBuffer(buf)) {
    buf = Buffer.from(buf);
  }
  if (buf.length < 4) {
    throw new Error('Vault sidecar too short');
  }

  const magic = buf.subarray(0, 4);
  if (magic.equals(MAGIC_V1)) {
    if (buf.length < HEADER_LEN_V1) {
      throw new Error('Vault sidecar too short');
    }
    const salt = buf.subarray(MAGIC_V1.length, MAGIC_V1.length + SALT_LEN_V1);
    const iv = buf.subarray(MAGIC_V1.length + SALT_LEN_V1, HEADER_LEN_V1);
    const data = buf.subarray(HEADER_LEN_V1);
    // timestamp fijo: Date.now() rompía skip idéntico en sync y provocaba 2.º decrypt
    return JSON.stringify(toEncryptedV2({ salt, iv, data, timestamp: 0 }));
  }

  if (magic.equals(MAGIC_V2)) {
    if (buf.length < NTV2_FIXED_OVERHEAD + 16) {
      throw new Error('Vault sidecar too short');
    }
    let offset = MAGIC_V2.length;
    const saltLen = buf[offset];
    offset += 1;
    if (!SALT_LEN_ALLOWED.has(saltLen)) {
      throw new Error('Invalid vault salt/iv length');
    }
    if (buf.length < NTV2_FIXED_OVERHEAD + saltLen) {
      throw new Error('Vault sidecar too short');
    }
    const salt = buf.subarray(offset, offset + saltLen);
    offset += saltLen;
    const iv = buf.subarray(offset, offset + IV_LEN);
    offset += IV_LEN;
    const flags = buf[offset];
    offset += 1;
    const iterations = buf.readUInt32BE(offset);
    offset += 4;
    const data = buf.subarray(offset);

    const parts = { salt, iv, data, timestamp: 0 };
    if (flags === FLAG_SHA512) {
      parts.kdf = 'pbkdf2-sha512';
    }
    if (iterations > 0) {
      parts.iterations = iterations;
    }
    return JSON.stringify(toEncryptedV2(parts));
  }

  throw new Error('Invalid vault sidecar magic');
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
  const parsed = parseConnectionVaultStorageKey(storageKey);
  const vaultId =
    parsed && parsed.vaultId !== DEFAULT_VAULT_ID ? parsed.vaultId : DEFAULT_VAULT_ID;
  ensureVaultDir(vaultId === DEFAULT_VAULT_ID ? undefined : vaultId);
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
  for (const key of listAllVaultSidecarKeys(out)) {
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

  for (const key of listAllVaultSidecarKeys(settingsData)) {
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
 * @returns {{ migrated: boolean, writtenKeys: string[] }}
 */
function migrateEmbeddedVaultToSidecars(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { migrated: false, writtenKeys: [] };
  }
  let migrated = false;
  const writtenKeys = [];
  for (const key of listAllVaultSidecarKeys(parsed)) {
    const embedded = parsed[key];
    if (embedded == null || embedded === '') continue;
    try {
      const wrote = writeVaultSidecar(key, embedded);
      if (wrote) {
        migrated = true;
      }
      const filePath = sidecarPathForKey(key);
      if (filePath && fs.existsSync(filePath)) {
        writtenKeys.push(key);
      }
    } catch (err) {
      console.warn(`[VaultSidecar] Migración ${key} fallida:`, err.message || err);
    }
  }
  return { migrated, writtenKeys };
}

/**
 * @param {object} obj
 * @param {string[]|null} [onlyKeys] si se pasa, solo elimina esas keys; si no, todas las de vault
 */
function stripVaultKeysFromObject(obj, onlyKeys = null) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  const keys = onlyKeys == null ? listAllVaultSidecarKeys(obj) : onlyKeys;
  for (const key of keys) {
    delete out[key];
  }
  return out;
}

function getVaultSidecarStamps() {
  const stamps = {};
  for (const key of listAllVaultSidecarKeys()) {
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
  for (const key of listAllVaultSidecarKeys()) {
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

/**
 * Borra el directorio completo de un vault extra (vault/<id>/).
 * No toca el vault principal.
 */
function deleteExtraVaultDir(vaultId) {
  if (!vaultId || vaultId === DEFAULT_VAULT_ID) return false;
  const safe = String(vaultId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe || safe !== String(vaultId)) return false;
  const dir = getVaultDir(safe);
  const root = getVaultRootDir();
  if (dir === root) return false;
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

module.exports = {
  VAULT_SIDECAR_KEYS,
  VAULT_SIDECAR_FILES,
  MAGIC,
  MAGIC_V1,
  MAGIC_V2,
  getVaultRootDir,
  getVaultDir,
  ensureVaultDir,
  sidecarPathForKey,
  isVaultSidecarKey,
  listExtraConnectionVaultKeys,
  listAllVaultSidecarKeys,
  encryptedJsonStringToBinary,
  binaryToEncryptedJsonString,
  writeVaultSidecar,
  isCatastrophicVaultShrink,
  readVaultSidecar,
  deleteVaultSidecar,
  deleteExtraVaultDir,
  mergeVaultSidecarsIntoData,
  extractAndPersistVaultSidecars,
  migrateEmbeddedVaultToSidecars,
  stripVaultKeysFromObject,
  getVaultSidecarStamps,
  getVaultSidecarsMtimeMax,
  listVaultSidecarBasenames,
  fieldToBytes
};
