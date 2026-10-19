const { describe, it } = require('node:test');
const assert = require('node:assert');
const { findConnectionInTree, resolveWantedTreeId } = require('../../src/utils/findConnectionInTree');

const tree = [
  {
    key: 'folder1',
    label: 'Folder',
    children: [
      {
        key: 'ssh_1',
        label: 'Prod SSH',
        data: {
          type: 'ssh',
          host: '10.0.0.1',
          user: 'admin',
          port: 22,
          password: 'ssh-secret'
        }
      },
      {
        key: 'sftp_1',
        label: 'Files',
        data: {
          type: 'sftp',
          host: '10.0.0.2',
          username: 'ftpuser',
          port: 22,
          password: 'sftp-secret'
        }
      },
      {
        key: 'wallix_1',
        label: 'Wallix SSH',
        data: {
          type: 'ssh',
          useBastionWallix: true,
          bastionHost: 'bastion.example',
          bastionUser: 'wallix',
          targetServer: 'app01',
          host: 'bastion.example',
          user: 'wallix',
          port: 22,
          password: 'wallix-secret'
        }
      },
      {
        key: 'rdp_1',
        label: 'Desktop',
        data: {
          type: 'rdp-guacamole',
          server: '192.168.1.50',
          username: 'rdpuser',
          port: 3389,
          password: 'rdp-secret'
        }
      },
      {
        key: 'tunnel_1',
        label: 'Tunnel',
        data: {
          type: 'ssh-tunnel',
          sshHost: 'jump.local',
          sshUser: 'jumper',
          sshPort: 22,
          sshPassword: 'tunnel-secret',
          localPort: 8080,
          remotePort: 80
        }
      },
      {
        key: 'tunnel_2222',
        label: 'Tunnel non-default SSH port',
        data: {
          type: 'ssh-tunnel',
          sshHost: 'jump.local',
          sshUser: 'jumper',
          sshPort: 2222,
          sshPassword: 'tunnel-2222-secret',
          localPort: 9090,
          remotePort: 443
        }
      }
    ]
  }
];

describe('findConnectionInTree', () => {
  it('encuentra por wantedId (key del árbol)', () => {
    const node = findConnectionInTree(tree, {
      wantedId: 'sftp_1',
      types: ['sftp', 'ssh', 'ftp', 'scp']
    });
    assert.ok(node);
    assert.strictEqual(node.key, 'sftp_1');
    assert.strictEqual(node.data.password, 'sftp-secret');
  });

  it('encuentra SSH por host/user/port', () => {
    const node = findConnectionInTree(tree, {
      types: ['ssh'],
      host: '10.0.0.1',
      username: 'admin',
      port: 22
    });
    assert.ok(node);
    assert.strictEqual(node.key, 'ssh_1');
  });

  it('encuentra SFTP aunque types incluya ssh y sftp', () => {
    const node = findConnectionInTree(tree, {
      types: ['ssh', 'sftp', 'ftp', 'scp'],
      host: '10.0.0.2',
      username: 'ftpuser',
      port: 22
    });
    assert.ok(node);
    assert.strictEqual(node.key, 'sftp_1');
  });

  it('encuentra Wallix por bastion + target', () => {
    const node = findConnectionInTree(tree, {
      types: ['ssh'],
      bastionHost: 'bastion.example',
      bastionUser: 'wallix',
      targetServer: 'app01',
      host: 'app01',
      username: 'wallix',
      port: 22
    });
    assert.ok(node);
    assert.strictEqual(node.key, 'wallix_1');
    assert.strictEqual(node.data.password, 'wallix-secret');
  });

  it('normaliza rdp / rdp-guacamole', () => {
    const node = findConnectionInTree(tree, {
      types: ['rdp'],
      host: '192.168.1.50',
      username: 'rdpuser',
      port: 3389
    });
    assert.ok(node);
    assert.strictEqual(node.key, 'rdp_1');
  });

  it('RDP ignora sshPort residual al matchear puerto 3389', () => {
    tree[0].children.push({
      key: 'rdp_sshport',
      label: 'RDP polluted',
      data: {
        type: 'rdp-guacamole',
        server: '10.9.9.9',
        username: 'rdpuser',
        port: 3389,
        sshPort: 22,
        password: 'rdp-ok'
      }
    });
    const node = findConnectionInTree(tree, {
      types: ['rdp', 'rdp-guacamole'],
      host: '10.9.9.9',
      username: 'rdpuser',
      port: 3389
    });
    assert.ok(node);
    assert.strictEqual(node.key, 'rdp_sshport');
    assert.strictEqual(node.data.password, 'rdp-ok');
  });

  it('resolveWantedTreeId ignora ids serializados y atajos de favoritos', () => {
    assert.strictEqual(
      resolveWantedTreeId('rdp-guacamole:10.0.0.1:admin:3389', 'real_tree_key'),
      'real_tree_key'
    );
    assert.strictEqual(
      resolveWantedTreeId('__fav_shortcut__abc__root', 'rdp_1'),
      'rdp_1'
    );
  });

  it('encuentra túnel ssh por sshHost/sshUser', () => {
    const node = findConnectionInTree(tree, {
      types: ['ssh-tunnel'],
      host: 'jump.local',
      username: 'jumper',
      port: 22
    });
    assert.ok(node);
    assert.strictEqual(node.key, 'tunnel_1');
    assert.strictEqual(node.data.sshPassword, 'tunnel-secret');
  });

  it('encuentra túnel con sshPort distinto de 22 (sin usar data.port)', () => {
    const node = findConnectionInTree(tree, {
      types: ['ssh-tunnel'],
      host: 'jump.local',
      username: 'jumper',
      port: 2222
    });
    assert.ok(node);
    assert.strictEqual(node.key, 'tunnel_2222');
    assert.strictEqual(node.data.sshPassword, 'tunnel-2222-secret');
  });

  it('desambigua túneles al mismo bastión con localPort/remotePort', () => {
    const node = findConnectionInTree(tree, {
      types: ['ssh-tunnel'],
      host: 'jump.local',
      username: 'jumper',
      port: 22,
      localPort: 8080,
      remotePort: 80
    });
    assert.ok(node);
    assert.strictEqual(node.key, 'tunnel_1');
  });

  it('prioriza wantedId sobre host', () => {
    const node = findConnectionInTree(tree, {
      wantedId: 'ssh_1',
      types: ['ssh', 'sftp'],
      host: '10.0.0.2',
      username: 'ftpuser',
      port: 22
    });
    assert.strictEqual(node.key, 'ssh_1');
  });

  it('devuelve null si no hay match', () => {
    const node = findConnectionInTree(tree, {
      types: ['vnc'],
      host: 'nope',
      username: 'x',
      port: 5900
    });
    assert.strictEqual(node, null);
  });

  it('encuentra por host+puerto sin username (VNC)', () => {
    tree[0].children.push({
      key: 'vnc_1',
      label: 'Screen',
      data: {
        type: 'vnc-guacamole',
        host: '10.0.0.9',
        port: 5900,
        password: 'vnc-secret'
      }
    });
    const node = findConnectionInTree(tree, {
      types: ['vnc', 'vnc-guacamole'],
      host: '10.0.0.9',
      username: '',
      port: 5900
    });
    assert.ok(node);
    assert.strictEqual(node.key, 'vnc_1');
    assert.strictEqual(node.data.password, 'vnc-secret');
  });
});
