const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  ALL_VAULTS_ID,
  DEFAULT_VAULT_ID,
  BACKUP_VERSION_ALL_VAULTS,
  BACKUP_VERSION_SINGLE,
  isAllVaultsExportId,
  isSupportedBackupVersion,
  packExtraVaultEntry,
  packAllExtraVaultEntries,
  normalizeEncryptedBlob,
  normalizeExportVaultIds,
  filterExtraVaultMetas
} = require('../../src/shared/extra-vaults-backup');

const AVAILABLE = [
  { id: 'default', name: 'Vault principal' },
  { id: 'work', name: 'Trabajo' },
  { id: 'lab', name: 'Lab' }
];

describe('extra-vaults-backup', () => {
  it('version helpers', () => {
    assert.strictEqual(isAllVaultsExportId(ALL_VAULTS_ID), true);
    assert.strictEqual(isAllVaultsExportId('default'), false);
    assert.strictEqual(isSupportedBackupVersion(BACKUP_VERSION_SINGLE), true);
    assert.strictEqual(isSupportedBackupVersion(BACKUP_VERSION_ALL_VAULTS), true);
    assert.strictEqual(isSupportedBackupVersion('2.0'), false);
  });

  it('normalizeEncryptedBlob stringifies objects', () => {
    assert.strictEqual(normalizeEncryptedBlob(null), null);
    assert.strictEqual(normalizeEncryptedBlob('raw'), 'raw');
    assert.strictEqual(normalizeEncryptedBlob({ v: 1 }), '{"v":1}');
  });

  it('packExtraVaultEntry reads per-vault storage keys', () => {
    const store = {
      connections_encrypted__work: '{"enc":"conn"}',
      passwords_encrypted__work: '{"enc":"pw"}',
      documents_encrypted__work: '{"enc":"doc"}'
    };
    const getItem = (k) => store[k] || null;
    const entry = packExtraVaultEntry({ id: 'work', name: 'Trabajo' }, getItem, {
      connections: true,
      passwords: true,
      documents: true
    });
    assert.strictEqual(entry.id, 'work');
    assert.strictEqual(entry.name, 'Trabajo');
    assert.ok(entry.connections.encrypted);
    assert.ok(entry.passwords.encrypted);
    assert.ok(entry.documents.encrypted);
    assert.strictEqual(entry.connections.storageKey, 'connections_encrypted__work');
  });

  it('packAllExtraVaultEntries skips default and packs listed vaults', () => {
    const store = {
      connections_encrypted__a: 'A',
      connections_encrypted__b: 'B'
    };
    const entries = packAllExtraVaultEntries(
      [
        { id: 'default', name: 'Principal' },
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' }
      ],
      (k) => store[k] || null,
      { connections: true, passwords: false, documents: false }
    );
    assert.strictEqual(entries.length, 2);
    assert.deepStrictEqual(
      entries.map((e) => e.id),
      ['a', 'b']
    );
  });

  it('normalizeExportVaultIds prefers explicit array and filters unknowns', () => {
    assert.deepStrictEqual(
      normalizeExportVaultIds(['default', 'work', 'ghost', 'work'], null, AVAILABLE),
      ['default', 'work']
    );
    assert.deepStrictEqual(
      normalizeExportVaultIds(['lab'], null, AVAILABLE),
      ['lab']
    );
  });

  it('normalizeExportVaultIds expands legacy all and single ids', () => {
    assert.deepStrictEqual(
      normalizeExportVaultIds(null, 'all', AVAILABLE),
      ['default', 'work', 'lab']
    );
    assert.deepStrictEqual(
      normalizeExportVaultIds(null, 'work', AVAILABLE),
      ['work']
    );
    assert.deepStrictEqual(
      normalizeExportVaultIds(null, null, AVAILABLE),
      [DEFAULT_VAULT_ID]
    );
  });

  it('filterExtraVaultMetas returns only selected extras', () => {
    const filtered = filterExtraVaultMetas(AVAILABLE, ['default', 'lab']);
    assert.deepStrictEqual(
      filtered.map((v) => v.id),
      ['lab']
    );
    assert.deepStrictEqual(filterExtraVaultMetas(AVAILABLE, ['default']), []);
  });

  it('packAllExtraVaultEntries respects filtered subset', () => {
    const store = {
      connections_encrypted__work: 'W',
      connections_encrypted__lab: 'L'
    };
    const subset = filterExtraVaultMetas(AVAILABLE, ['work']);
    const entries = packAllExtraVaultEntries(
      subset,
      (k) => store[k] || null,
      { connections: true, passwords: false, documents: false }
    );
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].id, 'work');
  });
});
