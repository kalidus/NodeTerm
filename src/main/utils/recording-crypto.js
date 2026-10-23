/**
 * Cifrado AES-256-GCM de grabaciones asciicast.
 * Clave por instalación (archivo 0o600); formato: NTC1.<iv>.<tag>.<ciphertext> (base64url).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getNodeTermDataDir } = require('./file-utils');

const MAGIC = 'NTC1';
const KEY_FILE = 'recording-secret.key';

function getKeyPath() {
  return path.join(getNodeTermDataDir(), KEY_FILE);
}

/**
 * @returns {Buffer} 32 bytes
 */
function getOrCreateRecordingKey() {
  const keyPath = getKeyPath();
  try {
    if (fs.existsSync(keyPath)) {
      const raw = fs.readFileSync(keyPath);
      if (Buffer.isBuffer(raw) && raw.length === 32) return raw;
      // Legacy hex string
      const asHex = raw.toString('utf8').trim();
      if (/^[0-9a-fA-F]{64}$/.test(asHex)) {
        return Buffer.from(asHex, 'hex');
      }
    }
  } catch (_) {
    /* regenerar */
  }

  const key = crypto.randomBytes(32);
  try {
    const dir = path.dirname(keyPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(keyPath, key, { mode: 0o600 });
    try { fs.chmodSync(keyPath, 0o600); } catch (_) { /* win */ }
  } catch (e) {
    console.warn('[recording-crypto] No se pudo persistir la clave:', e?.message || e);
  }
  return key;
}

/**
 * @param {string} plaintext
 * @returns {string}
 */
function encryptRecordingContent(plaintext) {
  const key = getOrCreateRecordingKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    MAGIC,
    iv.toString('base64url'),
    tag.toString('base64url'),
    enc.toString('base64url')
  ].join('.');
}

/**
 * @param {string} data
 * @returns {string} plaintext (o el mismo string si no está cifrado)
 */
function decryptRecordingContent(data) {
  if (!data || typeof data !== 'string') return data || '';
  if (!data.startsWith(`${MAGIC}.`)) return data;

  const parts = data.split('.');
  if (parts.length !== 4 || parts[0] !== MAGIC) {
    throw new Error('Formato de grabación cifrada inválido');
  }
  const key = getOrCreateRecordingKey();
  const iv = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  const enc = Buffer.from(parts[3], 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

function isEncryptedRecordingContent(data) {
  return typeof data === 'string' && data.startsWith(`${MAGIC}.`);
}

module.exports = {
  encryptRecordingContent,
  decryptRecordingContent,
  isEncryptedRecordingContent,
  getOrCreateRecordingKey
};
