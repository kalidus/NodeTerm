const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { VAULT_LOCAL_STORAGE_KEYS } = require('../../src/shared/vault-local-storage-keys');

describe('Master key upgrade compatibility', () => {
  beforeEach(() => {
    global.window = { crypto: globalThis.crypto };
    global.localStorage = {
      _data: {},
      getItem(k) {
        return this._data[k] ?? null;
      },
      setItem(k, v) {
        this._data[k] = v;
      },
      removeItem(k) {
        delete this._data[k];
      },
      clear() {
        this._data = {};
      }
    };
  });

  async function deriveKey(password, salt, iterations = 100000) {
    const enc = new TextEncoder();
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return globalThis.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptData(data, password) {
    const enc = new TextEncoder();
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encrypted = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(JSON.stringify(data))
    );
    return {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted)),
      timestamp: Date.now()
    };
  }

  async function createVaultVerifier(password) {
    const enc = new TextEncoder();
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const payload = JSON.stringify({ check: 'nodeterm-vault-ok', v: 2, timestamp: Date.now() });
    const encrypted = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(payload)
    );
    return {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted)),
      timestamp: Date.now()
    };
  }

  async function verifyVaultVerifier(verifier, password) {
    try {
      const dec = new TextDecoder();
      const salt = new Uint8Array(verifier.salt);
      const iv = new Uint8Array(verifier.iv);
      const data = new Uint8Array(verifier.data);
      const key = await deriveKey(password, salt);
      const decrypted = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      const parsed = JSON.parse(dec.decode(decrypted));
      return parsed && parsed.check === 'nodeterm-vault-ok';
    } catch (_) {
      return false;
    }
  }

  async function simulateVerifyMasterPassword(password, verifier, vaultPassword) {
    if (verifier && (await verifyVaultVerifier(verifier, password))) {
      return true;
    }
    const blob = await encryptData({ nodes: [] }, vaultPassword);
    localStorage.setItem('connections_encrypted', JSON.stringify(blob));
    const raw = localStorage.getItem('connections_encrypted');
    try {
      const parsed = JSON.parse(raw);
      const dec = new TextDecoder();
      const salt = new Uint8Array(parsed.salt);
      const iv = new Uint8Array(parsed.iv);
      const data = new Uint8Array(parsed.data);
      const key = await deriveKey(password, salt);
      await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
      return true;
    } catch (_) {
      return false;
    }
  }

  it('VAULT_LOCAL_STORAGE_KEYS incluye connections_encrypted', () => {
    assert.ok(VAULT_LOCAL_STORAGE_KEYS.includes('connections_encrypted'));
  });

  it('verifier desincronizado: clave del vault debe aceptarse (simulacion pipeline)', async () => {
    const vaultPassword = 'Clave_Real_Vault_2026!';
    const wrongVerifierPassword = 'Otra_Clave_Verifier_999';
    const verifier = await createVaultVerifier(wrongVerifierPassword);

    assert.strictEqual(await verifyVaultVerifier(verifier, vaultPassword), false);

    const unlockOk = await simulateVerifyMasterPassword(vaultPassword, verifier, vaultPassword);
    assert.strictEqual(unlockOk, true, 'La clave que descifra el vault debe desbloquear tras fallo de verifier');
  });

  it('SecureStorage.verifyMasterPassword no cortocircuita tras fallo de verifier', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../src/services/SecureStorage.js'),
      'utf8'
    );
    assert.ok(
      src.includes('verifyPasswordAgainstLocalVaults(password)'),
      'verifyMasterPassword debe usar verifyPasswordAgainstLocalVaults tras verifier'
    );
    const verifierBlock = src.slice(
      src.indexOf('if (verifier)'),
      src.indexOf('async verifyPasswordAgainstLocalVaults')
    );
    assert.ok(
      !verifierBlock.includes('return false'),
      'No debe haber return false inmediato tras fallo de verifier'
    );
  });
});
