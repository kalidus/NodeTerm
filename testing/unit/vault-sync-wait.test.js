const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  vaultLocalNeedsSyncWait,
  isTinyVaultPayload,
  VAULT_TINY_PAYLOAD_CHARS
} = require('../../src/shared/vault-write');

describe('vaultLocalNeedsSyncWait', () => {
  const store = new Map();

  beforeEach(() => {
    store.clear();
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    };
  });

  it('needs wait when key missing', () => {
    assert.strictEqual(vaultLocalNeedsSyncWait('connections_encrypted'), true);
  });

  it('needs wait when payload is tiny', () => {
    store.set('passwords_encrypted', 'x'.repeat(200));
    assert.strictEqual(isTinyVaultPayload(store.get('passwords_encrypted')), true);
    assert.strictEqual(vaultLocalNeedsSyncWait('passwords_encrypted'), true);
  });

  it('does not wait when payload is substantial', () => {
    store.set('connections_encrypted', 'Y'.repeat(VAULT_TINY_PAYLOAD_CHARS + 100));
    assert.strictEqual(vaultLocalNeedsSyncWait('connections_encrypted'), false);
  });
});

describe('hydrate getVault parallel selection', () => {
  it('skips fetch for stamp-matched non-tiny; queues tiny', () => {
    const stamps = {
      connections_encrypted: 1,
      passwords_encrypted: 2,
      documents_encrypted: 3
    };
    const saved = { ...stamps };
    const locals = {
      connections_encrypted: 'C'.repeat(5000),
      passwords_encrypted: 'p'.repeat(100),
      documents_encrypted: 'D'.repeat(5000)
    };

    const toFetch = [];
    const confirmed = [];
    for (const key of Object.keys(stamps)) {
      const stamp = stamps[key];
      const localVal = locals[key];
      const stampMatches = !!(localVal && saved[key] === stamp);
      const localTiny = isTinyVaultPayload(localVal);
      if (stampMatches && !localTiny) {
        confirmed.push(key);
        continue;
      }
      toFetch.push(key);
    }

    assert.deepStrictEqual(confirmed.sort(), [
      'connections_encrypted',
      'documents_encrypted'
    ].sort());
    assert.deepStrictEqual(toFetch, ['passwords_encrypted']);
  });
});
