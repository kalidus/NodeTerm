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
    // Mismos bytes → no escribe de nuevo
    assert.strictEqual(vaultSidecar.migrateEmbeddedVaultToSidecars(parsed), false);
  });

  it('migrateEmbeddedVaultToSidecars grows over tiny wiped sidecar', () => {
    const tinyJson = JSON.stringify(
      toEncryptedV2({
        salt: crypto.randomBytes(16),
        iv: crypto.randomBytes(12),
        data: crypto.randomBytes(16),
        timestamp: 0
      })
    );
    assert.strictEqual(vaultSidecar.writeVaultSidecar('passwords_encrypted', tinyJson), true);
    const filePath = vaultSidecar.sidecarPathForKey('passwords_encrypted');
    const tinyLen = fs.statSync(filePath).size;

    const bigJson = JSON.stringify(
      toEncryptedV2({
        salt: crypto.randomBytes(16),
        iv: crypto.randomBytes(12),
        data: crypto.randomBytes(4096),
        timestamp: 0
      })
    );
    assert.strictEqual(
      vaultSidecar.migrateEmbeddedVaultToSidecars({ passwords_encrypted: bigJson }),
      true
    );
    assert.ok(fs.statSync(filePath).size > tinyLen);
  });

  it('extractAndPersist does not set wroteVault when shrink is refused', () => {
    const bigJson = JSON.stringify(
      toEncryptedV2({
        salt: crypto.randomBytes(16),
        iv: crypto.randomBytes(12),
        data: crypto.randomBytes(4096),
        timestamp: 0
      })
    );
    assert.strictEqual(vaultSidecar.writeVaultSidecar('passwords_encrypted', bigJson), true);
    const beforeLen = fs.statSync(vaultSidecar.sidecarPathForKey('passwords_encrypted')).size;

    const tinyJson = JSON.stringify(
      toEncryptedV2({
        salt: crypto.randomBytes(16),
        iv: crypto.randomBytes(12),
        data: crypto.randomBytes(16),
        timestamp: 0
      })
    );
    const { wroteVault, settingsData } = vaultSidecar.extractAndPersistVaultSidecars({
      ui_theme: 'dark',
      passwords_encrypted: tinyJson
    });
    assert.strictEqual(wroteVault, false);
    assert.strictEqual(settingsData.passwords_encrypted, undefined);
    assert.strictEqual(
      fs.statSync(vaultSidecar.sidecarPathForKey('passwords_encrypted')).size,
      beforeLen
    );
  });

  it('writeVaultSidecar does not bump mtime when bytes are unchanged', () => {
    const json = makeV2Json();
    assert.strictEqual(vaultSidecar.writeVaultSidecar('connections_encrypted', json), true);
    const filePath = vaultSidecar.sidecarPathForKey('connections_encrypted');
    const before = fs.statSync(filePath).mtimeMs;
    const again = vaultSidecar.writeVaultSidecar('connections_encrypted', json);
    assert.strictEqual(again, false);
    assert.strictEqual(fs.statSync(filePath).mtimeMs, before);
    const stamps = vaultSidecar.getVaultSidecarStamps();
    assert.strictEqual(stamps.connections_encrypted, before);
  });

  it('rejects bad magic', () => {
    assert.throws(
      () => vaultSidecar.binaryToEncryptedJsonString(Buffer.from('XXXX' + 'a'.repeat(40))),
      /Invalid vault sidecar magic/
    );
  });

  it('writeVaultSidecar refuses catastrophic shrink unless allowShrink', () => {
    const bigData = crypto.randomBytes(4096);
    const bigJson = JSON.stringify(
      toEncryptedV2({
        salt: crypto.randomBytes(16),
        iv: crypto.randomBytes(12),
        data: bigData,
        timestamp: 0
      })
    );
    assert.strictEqual(vaultSidecar.writeVaultSidecar('passwords_encrypted', bigJson), true);
    const filePath = vaultSidecar.sidecarPathForKey('passwords_encrypted');
    const beforeLen = fs.statSync(filePath).size;

    const tinyJson = JSON.stringify(
      toEncryptedV2({
        salt: crypto.randomBytes(16),
        iv: crypto.randomBytes(12),
        data: crypto.randomBytes(16),
        timestamp: 0
      })
    );
    assert.strictEqual(vaultSidecar.writeVaultSidecar('passwords_encrypted', tinyJson), false);
    assert.strictEqual(fs.statSync(filePath).size, beforeLen);

    assert.strictEqual(
      vaultSidecar.writeVaultSidecar('passwords_encrypted', tinyJson, { allowShrink: true }),
      true
    );
    assert.ok(fs.statSync(filePath).size < beforeLen);
  });
});

