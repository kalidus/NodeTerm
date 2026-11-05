const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  NC_FILE_VAULTS_REGISTRY,
  ncExtraConnectionsFile,
  ncExtraPasswordsFile,
  ncExtraDocumentsFile,
  collectExtraVaultIdsFromStorage,
  buildVaultsRegistryPayload,
  uploadExtraVaultsToCloud,
  downloadExtraVaultsFromCloud
} = require('../../src/utils/nextcloudExtraVaultSync');

function makeMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(i) {
      return [...map.keys()][i] || null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
    _map: map
  };
}

describe('nextcloudExtraVaultSync', () => {
  it('filename helpers', () => {
    assert.strictEqual(ncExtraConnectionsFile('work'), 'nodeterm-connections__work.enc');
    assert.strictEqual(ncExtraPasswordsFile('work'), 'nodeterm-passwords__work.enc');
    assert.strictEqual(ncExtraDocumentsFile('work'), 'nodeterm-documents__work.json');
    assert.strictEqual(NC_FILE_VAULTS_REGISTRY, 'nodeterm-vaults-registry.json');
  });

  it('collectExtraVaultIdsFromStorage ignores primary keys', () => {
    const storage = makeMemoryStorage({
      connections_encrypted: 'primary',
      connections_encrypted__work: 'w',
      passwords_encrypted__lab: 'p',
      ui_theme: 'dark'
    });
    assert.deepStrictEqual(collectExtraVaultIdsFromStorage(storage), ['lab', 'work']);
  });

  it('buildVaultsRegistryPayload filters default', () => {
    const payload = buildVaultsRegistryPayload([
      { id: 'default', name: 'Principal' },
      { id: 'work', name: 'Trabajo', icon: 'pi pi-briefcase', order: 1 }
    ]);
    assert.strictEqual(payload.vaults.length, 1);
    assert.strictEqual(payload.vaults[0].id, 'work');
    assert.strictEqual(payload.vaults[0].name, 'Trabajo');
  });

  it('uploadExtraVaultsToCloud uploads registry and blobs', async () => {
    const storage = makeMemoryStorage({
      connections_encrypted__work: '{"v":2,"data":"conn"}',
      passwords_encrypted__work: '{"v":2,"data":"pw"}'
    });
    const uploaded = {};
    const nc = {
      async uploadFile(name, content) {
        uploaded[name] = content;
      }
    };
    const result = await uploadExtraVaultsToCloud(nc, {
      storage,
      listVaults: async () => [{ id: 'work', name: 'Trabajo' }]
    });
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.extraVaultIds, ['work']);
    assert.ok(uploaded[NC_FILE_VAULTS_REGISTRY]);
    assert.strictEqual(uploaded[ncExtraConnectionsFile('work')], '{"v":2,"data":"conn"}');
    assert.strictEqual(uploaded[ncExtraPasswordsFile('work')], '{"v":2,"data":"pw"}');
  });

  it('downloadExtraVaultsFromCloud restores blobs and creates missing vault', async () => {
    const created = [];
    const writes = [];
    const files = {
      [NC_FILE_VAULTS_REGISTRY]: JSON.stringify({
        version: 1,
        vaults: [{ id: 'work', name: 'Trabajo' }]
      }),
      [ncExtraConnectionsFile('work')]: '{"v":2,"data":"conn"}',
      [ncExtraPasswordsFile('work')]: '{"v":2,"data":"pw"}'
    };
    const nc = {
      async downloadFile(name) {
        return files[name] || null;
      }
    };
    const result = await downloadExtraVaultsFromCloud(nc, {
      createVault: async (payload) => {
        created.push(payload);
        return { success: true, vault: { id: payload.id, name: payload.name } };
      },
      writeEncrypted: (key, val) => {
        writes.push({ key, val });
        return { ok: true };
      }
    });
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(created.map((c) => c.id), ['work']);
    assert.ok(writes.some((w) => w.key === 'connections_encrypted__work'));
    assert.ok(writes.some((w) => w.key === 'passwords_encrypted__work'));
  });
});
