const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

describe('vault-registry', () => {
  let tmpRoot;
  let registry;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nodeterm-vault-reg-'));
    process.env.NODETERM_TEST_DATA_DIR = tmpRoot;
    delete require.cache[require.resolve('../../src/main/utils/vault-registry')];
    delete require.cache[require.resolve('../../src/main/utils/vault-sidecar')];
    registry = require('../../src/main/utils/vault-registry');
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
    const regPath = path.join(tmpRoot, 'vaults.json');
    if (fs.existsSync(regPath)) fs.unlinkSync(regPath);
    const vaultDir = path.join(tmpRoot, 'vault');
    if (fs.existsSync(vaultDir)) fs.rmSync(vaultDir, { recursive: true, force: true });
    const backups = path.join(tmpRoot, 'backups');
    if (fs.existsSync(backups)) fs.rmSync(backups, { recursive: true, force: true });
  });

  it('create / list / rename / delete', () => {
    const backup = registry.backupBeforeFirstExtraVault();
    assert.strictEqual(backup.created, true);
    assert.ok(backup.backupDir);

    const created = registry.createVault({ name: 'Trabajo', icon: 'pi pi-briefcase' });
    assert.ok(created.id);
    assert.strictEqual(created.name, 'Trabajo');
    assert.ok(fs.existsSync(path.join(tmpRoot, 'vault', created.id)));

    const listed = registry.listVaults();
    assert.strictEqual(listed.length, 1);
    assert.strictEqual(listed[0].id, created.id);

    const renamed = registry.renameVault(created.id, 'Cliente A');
    assert.strictEqual(renamed.name, 'Cliente A');

    const noSecondBackup = registry.backupBeforeFirstExtraVault();
    assert.strictEqual(noSecondBackup.created, false);

    registry.deleteVault(created.id);
    assert.strictEqual(registry.listVaults().length, 0);
    assert.ok(!fs.existsSync(path.join(tmpRoot, 'vault', created.id)));
  });

  it('rejects default id', () => {
    assert.throws(() => registry.createVault({ id: 'default', name: 'X' }), /inválido|Ya existe/);
  });

  it('renames default vault display name', () => {
    assert.strictEqual(registry.getDefaultVaultName(), 'Principal');
    const renamed = registry.renameVault('default', 'Casa');
    assert.strictEqual(renamed.id, 'default');
    assert.strictEqual(renamed.name, 'Casa');
    assert.strictEqual(registry.getDefaultVaultName(), 'Casa');

    const regPath = path.join(tmpRoot, 'vaults.json');
    const raw = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    assert.strictEqual(raw.defaultVaultName, 'Casa');
    assert.deepStrictEqual(raw.vaults, []);
  });
});

describe('vault-sidecar extras', () => {
  let tmpRoot;
  let vaultSidecar;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nodeterm-vault-extra-'));
    process.env.NODETERM_TEST_DATA_DIR = tmpRoot;
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
    if (fs.existsSync(vaultDir)) fs.rmSync(vaultDir, { recursive: true, force: true });
  });

  it('writes extra vault connections under vault/<id>/connections.bin', () => {
    const { toEncryptedV2 } = require('../../src/shared/vault-blob-encoding');
    const crypto = require('node:crypto');
    const json = JSON.stringify(
      toEncryptedV2({
        salt: crypto.randomBytes(16),
        iv: crypto.randomBytes(12),
        data: crypto.randomBytes(48),
        timestamp: 1
      })
    );
    const key = 'connections_encrypted__work';
    assert.strictEqual(vaultSidecar.isVaultSidecarKey(key), true);
    assert.ok(vaultSidecar.writeVaultSidecar(key, json));
    const filePath = path.join(tmpRoot, 'vault', 'work', 'connections.bin');
    assert.ok(fs.existsSync(filePath));
    const read = vaultSidecar.readVaultSidecar(key);
    assert.ok(read);
    const stamps = vaultSidecar.getVaultSidecarStamps();
    assert.ok(stamps[key] > 0);
    assert.ok(vaultSidecar.listExtraConnectionVaultKeys().includes(key));
  });

  it('keeps principal connections.bin at vault/connections.bin', () => {
    const { toEncryptedV2 } = require('../../src/shared/vault-blob-encoding');
    const crypto = require('node:crypto');
    const json = JSON.stringify(
      toEncryptedV2({
        salt: crypto.randomBytes(16),
        iv: crypto.randomBytes(12),
        data: crypto.randomBytes(48),
        timestamp: 1
      })
    );
    assert.ok(vaultSidecar.writeVaultSidecar('connections_encrypted', json));
    assert.ok(fs.existsSync(path.join(tmpRoot, 'vault', 'connections.bin')));
  });
});
