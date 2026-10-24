const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  setVaultEncryptedItem,
  isTinyVaultPayload,
  invalidateVaultStamp,
  VAULT_STAMPS_LS
} = require('../../src/shared/vault-write');

describe('vault-write', () => {
  const store = new Map();

  beforeEach(() => {
    store.clear();
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => {
        store.set(k, String(v));
      },
      removeItem: (k) => {
        store.delete(k);
      }
    };
  });

  it('isTinyVaultPayload detects sub-2KB strings', () => {
    assert.strictEqual(isTinyVaultPayload('x'.repeat(100)), true);
    assert.strictEqual(isTinyVaultPayload('x'.repeat(3000)), false);
    assert.strictEqual(isTinyVaultPayload(''), false);
    assert.strictEqual(isTinyVaultPayload(null), false);
  });

  it('setVaultEncryptedItem writes and invalidates stamp', () => {
    store.set(VAULT_STAMPS_LS, JSON.stringify({ passwords_encrypted: 123 }));
    const r = setVaultEncryptedItem('passwords_encrypted', '{"v":2,"data":"abc"}');
    assert.strictEqual(r.ok, true);
    assert.ok(store.get('passwords_encrypted'));
    const stamps = JSON.parse(store.get(VAULT_STAMPS_LS));
    assert.strictEqual(stamps.passwords_encrypted, undefined);
  });

  it('setVaultEncryptedItem refuses catastrophic shrink', () => {
    store.set('passwords_encrypted', 'B'.repeat(5000));
    const r = setVaultEncryptedItem('passwords_encrypted', 'S'.repeat(100));
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'catastrophic_shrink');
    assert.strictEqual(store.get('passwords_encrypted').length, 5000);
  });

  it('setVaultEncryptedItem rejects unknown keys', () => {
    const r = setVaultEncryptedItem('ui_theme', 'dark');
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'invalid_key');
  });

  it('invalidateVaultStamp is a no-op when missing', () => {
    invalidateVaultStamp('passwords_encrypted');
    assert.strictEqual(store.get(VAULT_STAMPS_LS), undefined);
  });
});
