const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  resolveRdpClientType,
  VALID_RDP_CLIENT_TYPES
} = require('../../src/utils/rdpClientType');

describe('resolveRdpClientType', () => {
  it('usa web-rdp por defecto', () => {
    assert.strictEqual(resolveRdpClientType(undefined, { isWindows: true }), 'web-rdp');
    assert.strictEqual(resolveRdpClientType(null, { isWindows: true }), 'web-rdp');
    assert.strictEqual(resolveRdpClientType('', { isWindows: true }), 'web-rdp');
    assert.strictEqual(resolveRdpClientType('unknown', { isWindows: true }), 'web-rdp');
  });

  it('acepta los clientes válidos en Windows', () => {
    for (const type of VALID_RDP_CLIENT_TYPES) {
      assert.strictEqual(resolveRdpClientType(type, { isWindows: true }), type);
    }
  });

  it('fuerza web-rdp si mstsc se pide fuera de Windows', () => {
    assert.strictEqual(resolveRdpClientType('mstsc', { isWindows: false }), 'web-rdp');
    assert.strictEqual(resolveRdpClientType('guacamole', { isWindows: false }), 'guacamole');
    assert.strictEqual(resolveRdpClientType('web-rdp', { isWindows: false }), 'web-rdp');
  });
});

describe('createRDPNode respeta clientType (contrato Wallix)', () => {
  // Réplica mínima del contrato de ImportService.createRDPNode para no cargar el módulo ESM.
  function createRDPNode(baseNode, conn, resolveOpts = { isWindows: true }) {
    const { resolveRdpClientType: resolve } = require('../../src/utils/rdpClientType');
    return {
      ...baseNode,
      data: {
        type: 'rdp',
        name: conn.name,
        server: conn.hostname,
        username: conn.username,
        password: conn.password,
        port: parseInt(conn.port, 10) || 3389,
        clientType: resolve(conn.clientType, resolveOpts),
        autoResize: true,
        guacEnableWallpaper: true,
        redirectAudio: false
      },
      droppable: false
    };
  }

  it('default web-rdp cuando Wallix/mRemoteNG no pasan clientType', () => {
    const node = createRDPNode({ key: 'k1', label: 'Host' }, {
      name: 'Host',
      hostname: 'bastion.example.com',
      username: 'a@d@t:RDP:u',
      password: 'x',
      port: 3389
    });
    assert.strictEqual(node.data.clientType, 'web-rdp');
  });

  it('aplica guacamole / mstsc cuando Wallix pasa rdpClientType en conn', () => {
    const guac = createRDPNode({ key: 'k2', label: 'Host' }, {
      name: 'Host',
      hostname: 'bastion.example.com',
      username: 'a@d@t:RDP:u',
      password: 'x',
      port: 3389,
      clientType: 'guacamole'
    });
    assert.strictEqual(guac.data.clientType, 'guacamole');

    // mstsc solo aplica en Windows; el import se resuelve con isWindows:true
    // (en CI Linux/macOS process.platform no es win32).
    const mstsc = createRDPNode({ key: 'k3', label: 'Host' }, {
      name: 'Host',
      hostname: 'bastion.example.com',
      username: 'a@d@t:RDP:u',
      password: 'x',
      port: 3389,
      clientType: 'mstsc'
    }, { isWindows: true });
    assert.strictEqual(mstsc.data.clientType, 'mstsc');
  });
});
