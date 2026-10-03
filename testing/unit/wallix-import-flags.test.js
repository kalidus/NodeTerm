const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  applyWallixBastionImportFields,
  normalizeWallixConnectionData,
  mergeWallixBastionFromIncoming,
  migrateWallixBastionInTree,
  isWallixProxyString
} = require('../../src/utils/wallixBastion');

const PROXY = 'svc@default@HOST01:SSH:wallixadmin';

describe('Wallix bastion flags en importacion', () => {
  it('applyWallixBastionImportFields deja el contrato completo', () => {
    const data = { type: 'ssh', host: 'bastion.example.com', user: PROXY, port: 22 };
    applyWallixBastionImportFields(data, {
      bastionHostname: 'bastion.example.com',
      proxyUsername: PROXY,
      targetName: 'HOST01',
      serviceLabel: 'SSH'
    });

    assert.strictEqual(data.useBastionWallix, true);
    assert.strictEqual(data.isBastion, true);
    assert.strictEqual(data.bastionHost, 'bastion.example.com');
    assert.strictEqual(data.bastionUser, PROXY);
    assert.strictEqual(data.targetServer, 'HOST01');
    assert.strictEqual(data.wallixService, 'SSH');
  });

  it('UI checkbox: useBastionWallix || isBastion activo tras import simulado', () => {
    const data = { type: 'rdp', server: 'bastion.example.com', username: PROXY, port: 3389 };
    applyWallixBastionImportFields(data, {
      bastionHostname: 'bastion.example.com',
      proxyUsername: PROXY,
      targetName: 'HOST01',
      serviceLabel: 'RDP'
    });
    const checkboxOn = !!(data.useBastionWallix || data.isBastion);
    assert.strictEqual(checkboxOn, true);
  });

  it('normalizeWallixConnectionData rellena legacy sin flag', () => {
    const legacy = {
      type: 'ssh',
      host: 'bastion.corp',
      user: PROXY,
      port: 22,
      importedFrom: 'Wallix',
      useBastionWallix: false
    };
    const next = normalizeWallixConnectionData(legacy, {
      wallixUrl: 'https://bastion.corp/'
    });
    assert.strictEqual(next.useBastionWallix, true);
    assert.strictEqual(next.isBastion, true);
    assert.strictEqual(next.bastionUser, PROXY);
    assert.strictEqual(next.targetServer, 'HOST01');
    assert.strictEqual(next.wallixService, 'SSH');
    assert.strictEqual(next.bastionHost, 'bastion.corp');
  });

  it('migrateWallixBastionInTree hereda wallixUrl del contenedor', () => {
    const tree = [{
      droppable: true,
      data: { wallixUrl: 'https://pam.example.net', wallixUsername: 'admin' },
      children: [{
        droppable: false,
        importedFrom: 'Wallix',
        data: {
          type: 'ssh',
          user: PROXY,
          host: 'old-host-only',
          useBastionWallix: false
        }
      }]
    }];
    const out = migrateWallixBastionInTree(tree);
    const leaf = out[0].children[0].data;
    assert.strictEqual(leaf.useBastionWallix, true);
    assert.strictEqual(leaf.bastionHost, 'old-host-only');
    assert.strictEqual(isWallixProxyString(leaf.bastionUser), true);
  });

  it('mergeWallixBastionFromIncoming actualiza flags en refresco', () => {
    const existing = {
      type: 'rdp',
      server: 'bastion.example.com',
      username: PROXY,
      useBastionWallix: false,
      targetServer: 'OLD'
    };
    const incoming = {
      type: 'rdp',
      server: 'bastion.example.com',
      username: PROXY,
      useBastionWallix: true,
      isBastion: true,
      bastionHost: 'bastion.example.com',
      bastionUser: PROXY,
      targetServer: 'HOST01',
      wallixService: 'RDP'
    };
    const merged = mergeWallixBastionFromIncoming(existing, incoming);
    assert.strictEqual(merged.useBastionWallix, true);
    assert.strictEqual(merged.targetServer, 'HOST01');
    assert.strictEqual(merged.wallixService, 'RDP');
  });
});
