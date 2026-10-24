const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const {
  bytesToBase64,
  fieldToBytes,
  toEncryptedV2,
  decodeEncryptedFields
} = require('../../src/shared/vault-blob-encoding');

describe('vault-blob-encoding', () => {
  it('roundtrip base64 field', () => {
    const raw = crypto.randomBytes(64);
    const b64 = bytesToBase64(raw);
    const back = fieldToBytes(b64);
    assert.deepStrictEqual(Buffer.from(back), raw);
  });

  it('legacy number[] field still decodes', () => {
    const arr = [1, 2, 255, 0, 128];
    const back = fieldToBytes(arr);
    assert.deepStrictEqual(Array.from(back), arr);
  });

  it('toEncryptedV2 writes strings and decodeEncryptedFields reads them', () => {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const data = crypto.randomBytes(32);
    const obj = toEncryptedV2({ salt, iv, data, timestamp: 42 });
    assert.strictEqual(obj.v, 2);
    assert.strictEqual(typeof obj.salt, 'string');
    assert.strictEqual(typeof obj.iv, 'string');
    assert.strictEqual(typeof obj.data, 'string');
    const decoded = decodeEncryptedFields(obj);
    assert.deepStrictEqual(Buffer.from(decoded.salt), salt);
    assert.deepStrictEqual(Buffer.from(decoded.iv), iv);
    assert.deepStrictEqual(Buffer.from(decoded.data), data);
  });

  it('decodeEncryptedFields accepts legacy number[] blob', () => {
    const salt = Array.from(crypto.randomBytes(16));
    const iv = Array.from(crypto.randomBytes(12));
    const data = Array.from(crypto.randomBytes(20));
    const decoded = decodeEncryptedFields({ salt, iv, data });
    assert.deepStrictEqual(Array.from(decoded.salt), salt);
    assert.deepStrictEqual(Array.from(decoded.iv), iv);
    assert.deepStrictEqual(Array.from(decoded.data), data);
  });

  it('rejects invalid field', () => {
    assert.throws(() => fieldToBytes(null), /Invalid vault byte field/);
    assert.throws(() => decodeEncryptedFields(null), /Invalid encrypted object/);
  });

  it('AES-GCM roundtrip with v2 encoding (SecureStorage shape)', async () => {
    const password = 'test-master-key';
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 1000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    const payload = { nodes: [{ id: 'a', name: 'x' }], n: 5000 };
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(JSON.stringify(payload))
    );
    const blob = toEncryptedV2({ salt, iv, data: new Uint8Array(encrypted) });
    assert.strictEqual(typeof blob.data, 'string');

    // Legacy-shaped clone still decrypts
    const legacy = {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };

    for (const shape of [blob, legacy]) {
      const fields = decodeEncryptedFields(shape);
      const key2 = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: fields.salt, iterations: 1000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fields.iv },
        key2,
        fields.data
      );
      assert.deepStrictEqual(JSON.parse(dec.decode(plain)), payload);
    }
  });
});
