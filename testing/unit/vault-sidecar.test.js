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

  function makePqcJson() {
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const data = crypto.randomBytes(48);
    return JSON.stringify(
      toEncryptedV2({
        salt,
        iv,
        data,
        kdf: 'pbkdf2-sha512',
        iterations: 210000,
        timestamp: 3
      })
    );
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
    assert.ok(bin.subarray(0, 4).equals(Buffer.from('NTV1')));
    const back = vaultSidecar.binaryToEncryptedJsonString(bin);
    const { decodeEncryptedFields } = require('../../src/shared/vault-blob-encoding');
    assert.deepStrictEqual(
      Buffer.from(decodeEncryptedFields(JSON.parse(json)).data),
      Buffer.from(decodeEncryptedFields(JSON.parse(back)).data)
    );
  });

  it('roundtrip NTV2 preserves salt 32, kdf and iterations', () => {
    const json = makePqcJson();
    const bin = vaultSidecar.encryptedJsonStringToBinary(json);
    assert.ok(bin.subarray(0, 4).equals(Buffer.from('NTV2')));
    assert.strictEqual(bin[4], 32);
    const back = vaultSidecar.binaryToEncryptedJsonString(bin);
    const parsed = JSON.parse(back);
    assert.strictEqual(parsed.v, 2);
    assert.strictEqual(parsed.kdf, 'pbkdf2-sha512');
    assert.strictEqual(parsed.iterations, 210000);
    assert.strictEqual(parsed.timestamp, 0);
    const { decodeEncryptedFields } = require('../../src/shared/vault-blob-encoding');
    const a = decodeEncryptedFields(JSON.parse(json));
    const b = decodeEncryptedFields(parsed);
    assert.strictEqual(a.salt.length, 32);
    assert.strictEqual(b.salt.length, 32);
    assert.deepStrictEqual(Buffer.from(a.salt), Buffer.from(b.salt));
    assert.deepStrictEqual(Buffer.from(a.iv), Buffer.from(b.iv));
    assert.deepStrictEqual(Buffer.from(a.data), Buffer.from(b.data));
  });

  it('rejects salt lengths other than 16 or 32', () => {
    const bad = JSON.stringify(
      toEncryptedV2({
        salt: crypto.randomBytes(24),
        iv: crypto.randomBytes(12),
        data: crypto.randomBytes(16),
        timestamp: 0
      })
    );
    assert.throws(
      () => vaultSidecar.encryptedJsonStringToBinary(bad),
      /Invalid vault salt\/iv length/
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
    const first = vaultSidecar.migrateEmbeddedVaultToSidecars(parsed);
    assert.strictEqual(first.migrated, true);
    assert.deepStrictEqual(first.writtenKeys, ['connections_encrypted']);
    const without = vaultSidecar.stripVaultKeysFromObject(parsed, first.writtenKeys);
    const merged = vaultSidecar.mergeVaultSidecarsIntoData(without);
    assert.ok(merged.connections_encrypted);
    // Mismos bytes → no escribe de nuevo
    const second = vaultSidecar.migrateEmbeddedVaultToSidecars(parsed);
    assert.strictEqual(second.migrated, false);
    assert.deepStrictEqual(second.writtenKeys, ['connections_encrypted']);
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
    const result = vaultSidecar.migrateEmbeddedVaultToSidecars({
      passwords_encrypted: bigJson
    });
    assert.strictEqual(result.migrated, true);
    assert.ok(result.writtenKeys.includes('passwords_encrypted'));
    assert.ok(fs.statSync(filePath).size > tinyLen);
  });

  it('write/read PQC salt-32 sidecar via extractAndPersist', () => {
    const json = makePqcJson();
    const { settingsData, wroteVault } = vaultSidecar.extractAndPersistVaultSidecars({
      connections_encrypted: json
    });
    assert.strictEqual(wroteVault, true);
    assert.strictEqual(settingsData.connections_encrypted, undefined);
    const merged = vaultSidecar.mergeVaultSidecarsIntoData(settingsData);
    const parsed = JSON.parse(merged.connections_encrypted);
    assert.strictEqual(parsed.kdf, 'pbkdf2-sha512');
    assert.strictEqual(parsed.iterations, 210000);
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

  it('sidecarPathForKey maps extra vault passwords/documents bins', () => {
    const pw = vaultSidecar.sidecarPathForKey('passwords_encrypted__work');
    const doc = vaultSidecar.sidecarPathForKey('documents_encrypted__work');
    const conn = vaultSidecar.sidecarPathForKey('connections_encrypted__work');
    assert.ok(pw && pw.replace(/\\/g, '/').endsWith('vault/work/passwords.bin'));
    assert.ok(doc && doc.replace(/\\/g, '/').endsWith('vault/work/documents.bin'));
    assert.ok(conn && conn.replace(/\\/g, '/').endsWith('vault/work/connections.bin'));

    const workDir = path.join(tmpRoot, 'vault', 'work');
    fs.mkdirSync(workDir, { recursive: true });
    fs.writeFileSync(path.join(workDir, 'passwords.bin'), Buffer.from('NTV1' + 'x'.repeat(40)));
    fs.writeFileSync(path.join(workDir, 'documents.bin'), Buffer.from('NTV1' + 'y'.repeat(40)));
    const keys = vaultSidecar.listExtraVaultSidecarKeys();
    assert.ok(keys.includes('passwords_encrypted__work'));
    assert.ok(keys.includes('documents_encrypted__work'));
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

