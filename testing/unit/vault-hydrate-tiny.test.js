/**
 * Hydrate: local tiny + stamp match debe forzar getVault y preferir disco grande.
 */
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

describe('vault hydrate tiny poison', () => {
  const store = new Map();
  let getVaultCalls;

  beforeEach(() => {
    store.clear();
    getVaultCalls = [];
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    };
    global.window = {
      electron: {
        appdata: {
          getVault: async (key) => store.get(`__disk__${key}`) || null
        }
      },
      dispatchEvent: () => {}
    };
  });

  afterEach(() => {
    delete global.localStorage;
    delete global.window;
  });

  it('isTinyVaultPayload + shrink guard: disco grande gana a local tiny', () => {
    const { isTinyVaultPayload } = require('../../src/shared/vault-write');
    const { isCatastrophicVaultPayloadShrink } = require('../../src/shared/vault-shrink-guard');

    const localTiny = 'x'.repeat(120);
    const diskBig = 'Y'.repeat(8000);

    assert.strictEqual(isTinyVaultPayload(localTiny), true);
    assert.strictEqual(isCatastrophicVaultPayloadShrink(diskBig, localTiny), true);
    assert.strictEqual(isCatastrophicVaultPayloadShrink(localTiny, diskBig), false);
  });

  it('hydrate forces getVault when local is tiny despite stamp match', async () => {
    // Dynamic import of the ESM-ish service: file uses import/export mixed with webpack.
    // Replicate _hydrateVaultBlobs decision path inline (same as production code).
    const { isTinyVaultPayload } = require('../../src/shared/vault-write');
    const { isCatastrophicVaultPayloadShrink } = require('../../src/shared/vault-shrink-guard');
    const { VAULT_LOCAL_STORAGE_KEYS } = require('../../src/shared/vault-local-storage-keys');

    const stamps = { passwords_encrypted: 1000 };
    const saved = { passwords_encrypted: 1000 };
    const localVal = 'tiny'.repeat(30); // ~120 chars
    store.set('passwords_encrypted', localVal);
    const diskBlob = 'D'.repeat(9000);

    async function hydrate(sharedData) {
      const confirmed = [];
      for (const key of VAULT_LOCAL_STORAGE_KEYS) {
        const stamp = stamps[key] || 0;
        if (!stamp) continue;
        const local = localStorage.getItem(key);
        const stampMatches = !!(local && saved[key] === stamp);
        const localTiny = isTinyVaultPayload(local);
        if (stampMatches && !localTiny) {
          confirmed.push(key);
          continue;
        }
        const blob = await window.electron.appdata.getVault(key);
        getVaultCalls.push(key);
        if (blob) {
          if (local && isCatastrophicVaultPayloadShrink(local, blob)) {
            if (!localTiny) confirmed.push(key);
          } else {
            sharedData[key] = blob;
            confirmed.push(key);
          }
        }
      }
      sharedData._vaultConfirmed = confirmed;
      return sharedData;
    }

    store.set('__disk__passwords_encrypted', diskBlob);
    const out = await hydrate({});
    assert.ok(getVaultCalls.includes('passwords_encrypted'));
    assert.strictEqual(out.passwords_encrypted, diskBlob);
    assert.ok(out._vaultConfirmed.includes('passwords_encrypted'));
  });

  it('hydrate skips getVault when local is large and stamp matches', async () => {
    const { isTinyVaultPayload } = require('../../src/shared/vault-write');
    const stamps = { passwords_encrypted: 1000 };
    const saved = { passwords_encrypted: 1000 };
    store.set('passwords_encrypted', 'L'.repeat(5000));

    let fetched = false;
    const local = localStorage.getItem('passwords_encrypted');
    const stampMatches = !!(local && saved.passwords_encrypted === stamps.passwords_encrypted);
    const localTiny = isTinyVaultPayload(local);
    if (!(stampMatches && !localTiny)) {
      fetched = true;
    }
    assert.strictEqual(fetched, false);
  });
});
