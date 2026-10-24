const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { toEncryptedV2 } = require('../../src/shared/vault-blob-encoding');

describe('vault-sidecar', () => {
  let tmpRoot;
  let vaultSidecar;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nodeterm-vault-'));
    process.env.NODETERM_TEST_DATA_DIR = tmpRoot;
    // Cargar tras fijar env para que getVaultDir lo vea
    delete require.cache[require.resolve('../../src/main/utils/vault-sidecar')];
    vaultSidecar = require('../../src/main/utils/vault-sidecar');
  });

  after(() => {
    delete process.env.NODETERM_TEST_DATA_DIR;
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch (_) {
      /* noop */
    }
  });

  beforeEach(() => {
    const vaultDir = path.join(tmpRoot, 'vault');
    if (fs.existsSync(vaultDir)) {
      fs.rmSync(vaultDir, { recursive: true, force: true });
    }
  });

  function makeLegacyJson() {
    const salt = Array.from(crypto.randomBytes(16));
    const iv = Array.from(crypto.randomBytes(12));
    const data = Array.from(crypto.randomBytes(48));
    return JSON.stringify({ salt, iv, data, timestamp: 1 });
  }

  function makeV2Json() {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const data = crypto.randomBytes(48);
    return JSON.stringify(toEncryptedV2({ salt, iv, data, timestamp: 2 }));
  }

  it('roundtrip binary from legacy number[] JSON', () => {
    const json = makeLegacyJson();
    const bin = vaultSidecar.encryptedJsonStringToBinary(json);
    assert.ok(bin.subarray(0, 4).equals(Buffer.from('NTV1')));
    const back = vaultSidecar.binaryToEncryptedJsonString(bin);
    const parsed = JSON.parse(back);
    assert.strictEqual(parsed.v, 2);
    assert.strictEqual(typeof parsed.data, 'string');
    // Ciphertext bytes preserved
    const orig = JSON.parse(json);
    const { decodeEncryptedFields } = require('../../src/shared/vault-blob-encoding');
    const a = decodeEncryptedFields(orig);
    const b = decodeEncryptedFields(parsed);
    assert.deepStrictEqual(Buffer.from(a.data), Buffer.from(b.data));
  });

  it('roundtrip binary from v2 base64 JSON', () => {
    const json = makeV2Json();
    const bin = vaultSidecar.encryptedJsonStringToBinary(json);
    const back = vaultSidecar.binaryToEncryptedJsonString(bin);
    const { decodeEncryptedFields } = require('../../src/shared/vault-blob-encoding');
    assert.deepStrictEqual(
      Buffer.from(decodeEncryptedFields(JSON.parse(json)).data),
      Buffer.from(decodeEncryptedFields(JSON.parse(back)).data)
    );
  });

  it('binaryToEncryptedJsonString is stable across reads of the same buffer', () => {
    const bin = vaultSidecar.encryptedJsonStringToBinary(makeV2Json());
    const a = vaultSidecar.binaryToEncryptedJsonString(bin);
    const b = vaultSidecar.binaryToEncryptedJsonString(bin);
    assert.strictEqual(a, b);
    assert.strictEqual(JSON.parse(a).timestamp, 0);
  });

  it('write/read sidecar and extract strips keys from settings', () => {
    const json = makeV2Json();
    const payload = {
      ui_theme: 'dark',
      connections_encrypted: json,
      passwords_encrypted: makeLegacyJson()
    };
    const { settingsData, wroteVault } = vaultSidecar.extractAndPersistVaultSidecars(payload);
    assert.strictEqual(wroteVault, true);
    assert.strictEqual(settingsData.ui_theme, 'dark');
    assert.strictEqual(settingsData.connections_encrypted, undefined);
    assert.strictEqual(settingsData.passwords_encrypted, undefined);

    const merged = vaultSidecar.mergeVaultSidecarsIntoData(settingsData);
    assert.ok(merged.connections_encrypted);
    assert.ok(merged.passwords_encrypted);
    assert.strictEqual(merged.ui_theme, 'dark');
  });

  it('migrateEmbeddedVaultToSidecars then merge prefers files', () => {
    const json = makeV2Json();
    const parsed = { connections_encrypted: json, ui_theme: 'x' };
    assert.strictEqual(vaultSidecar.migrateEmbeddedVaultToSidecars(parsed), true);
    const without = vaultSidecar.stripVaultKeysFromObject(parsed);
    const merged = vaultSidecar.mergeVaultSidecarsIntoData(without);
    assert.ok(merged.connections_encrypted);
    const again = vaultSidecar.migrateEmbeddedVaultToSidecars({
      connections_encrypted: makeV2Json()
    });
    // Sidecar already exists → no re-migrate
    assert.strictEqual(again, false);
  });

  it('rejects bad magic', () => {
    assert.throws(
      () => vaultSidecar.binaryToEncryptedJsonString(Buffer.from('XXXX' + 'a'.repeat(40))),
      /Invalid vault sidecar magic/
    );
  });
});
