const { describe, it } = require('node:test');
const assert = require('node:assert');

const SECRET = 'super-secret-xyz';
const SSH_SECRET = 'ssh-secret-value';
const PRIVATE_KEY = 'PRIVATE-KEY-BLOCK';
const SEED = 'seed-phrase-secret';
const API_KEY = 'api-key-secret';
const API_SECRET = 'api-secret-value';

function fixture() {
  return {
    connections: [
      {
        key: 'folder-prod',
        label: 'Produccion',
        children: [
          {
            key: 'ssh_1',
            label: 'alpha api',
            data: {
              type: 'ssh',
              host: '10.1.2.3',
              user: 'admin',
              port: 22,
              password: SSH_SECRET,
              privateKey: PRIVATE_KEY,
              description: 'servicio de pagos'
            }
          }
        ]
      },
      ...Array.from({ length: 15 }, (_, index) => ({
        key: `ssh_srv_${index}`,
        label: `srv-${index}`,
        data: { type: 'ssh', host: `10.9.0.${index}`, user: 'ops', port: 22 }
      }))
    ],
    passwords: [
      {
        key: 'folder-vault',
        label: 'Boveda',
        data: { type: 'password-folder' },
        children: [
          {
            key: 'pw1',
            label: 'alpha banco',
            data: {
              type: 'password',
              username: 'ana',
              url: 'https://bank.example',
              password: SECRET,
              notes: 'caja fuerte norte'
            }
          }
        ]
      },
      {
        key: 'wallet1',
        label: 'Wallet fria',
        data: { type: 'crypto_wallet', seedPhrase: SEED, notes: 'resguardo' }
      },
      {
        key: 'api1',
        label: 'Git remoto',
        data: { type: 'api_key', serviceName: 'github', apiKey: API_KEY, apiSecret: API_SECRET }
      }
    ],
    documents: [
      {
        key: 'docs',
        label: 'Notas',
        data: { type: 'document-folder' },
        children: [
          {
            key: 'doc1',
            label: 'alpha diario',
            data: {
              type: 'document',
              tags: ['viaje'],
              content: '<p>El faro de Alejandria brilla</p>',
              markdownSource: ''
            }
          },
          {
            key: 'lib1',
            label: 'manual.pdf',
            data: { type: 'library-file', content: 'no-indexar-cuerpo-archivo' }
          }
        ]
      }
    ]
  };
}

describe('app search index', () => {
  it('encuentra host, usuario, carpeta y descripcion sin indexar secretos', async () => {
    const { buildSearchCatalog } = await import('../../src/search/appSearchCatalog.js');
    const { createSearchIndex } = await import('../../src/search/appSearchIndex.js');
    const { docs } = buildSearchCatalog(fixture());
    const serialized = JSON.stringify(docs);
    for (const secret of [SECRET, SSH_SECRET, PRIVATE_KEY, SEED, API_KEY, API_SECRET]) {
      assert.equal(serialized.includes(secret), false, secret);
    }

    const index = createSearchIndex(docs);
    const byHost = index.search('10.1.2.3', 'all');
    assert.equal(byHost.flat.some((hit) => hit.key === 'ssh_1'), true);
    assert.equal(byHost.flat[0].folder.includes('Produccion'), true);

    assert.equal(index.search('admin', 'connection').flat.some((hit) => hit.key === 'ssh_1'), true);
    assert.equal(index.search('pagos', 'all').flat.some((hit) => hit.key === 'ssh_1'), true);
    assert.equal(index.search(SSH_SECRET, 'all').flat.length, 0);
    assert.equal(index.search(PRIVATE_KEY, 'all').flat.length, 0);
  });

  it('busca contraseñas por titulo, usuario, url y notas, no por el secreto', async () => {
    const { buildSearchCatalog } = await import('../../src/search/appSearchCatalog.js');
    const { createSearchIndex } = await import('../../src/search/appSearchIndex.js');
    const index = createSearchIndex(buildSearchCatalog(fixture()).docs);

    assert.equal(index.search('ana', 'password').flat.some((hit) => hit.key === 'pw1'), true);
    assert.equal(index.search('bank.example', 'all').flat.some((hit) => hit.key === 'pw1'), true);
    assert.equal(index.search('norte', 'password').flat.some((hit) => hit.key === 'pw1'), true);
    assert.equal(index.search('github', 'password').flat.some((hit) => hit.key === 'api1'), true);
    assert.equal(index.search('resguardo', 'all').flat.some((hit) => hit.key === 'wallet1'), true);
    assert.equal(index.search(SECRET, 'all').flat.length, 0);
    assert.equal(index.search(SEED, 'all').flat.length, 0);
    assert.equal(index.search(API_KEY, 'all').flat.length, 0);
    assert.equal(index.search(API_SECRET, 'all').flat.length, 0);
  });

  it('busca notas por titulo, etiqueta y cuerpo, y archivos solo por nombre', async () => {
    const { buildSearchCatalog } = await import('../../src/search/appSearchCatalog.js');
    const { createSearchIndex } = await import('../../src/search/appSearchIndex.js');
    const index = createSearchIndex(buildSearchCatalog(fixture()).docs);

    const byBody = index.search('faro', 'note');
    assert.equal(byBody.flat.length, 1);
    assert.equal(byBody.flat[0].key, 'doc1');
    assert.equal(byBody.flat[0].snippet.toLowerCase().includes('faro'), true);
    assert.equal(index.search('viaje', 'note').flat.some((hit) => hit.key === 'doc1'), true);
    assert.equal(index.search('manual', 'note').flat.some((hit) => hit.key === 'lib1'), true);
    assert.equal(index.search('no-indexar-cuerpo-archivo', 'all').flat.length, 0);
  });

  it('filtra por categoria y limita los grupos', async () => {
    const { buildSearchCatalog } = await import('../../src/search/appSearchCatalog.js');
    const { createSearchIndex } = await import('../../src/search/appSearchIndex.js');
    const index = createSearchIndex(buildSearchCatalog(fixture()).docs);

    const notes = index.search('alpha', 'note');
    assert.ok(notes.flat.every((hit) => hit.category === 'note'));
    assert.equal(notes.flat.some((hit) => hit.key === 'doc1'), true);
    assert.equal(notes.flat.some((hit) => hit.category === 'connection'), false);

    const connections = index.search('alpha', 'connection');
    assert.ok(connections.flat.every((hit) => hit.category === 'connection'));
    assert.equal(connections.totals.note, 0);

    const passwords = index.search('alpha', 'password');
    assert.equal(passwords.flat.some((hit) => hit.key === 'pw1'), true);
    assert.equal(passwords.totals.connection, 0);

    const all = index.search('alpha', 'all');
    assert.equal(all.totals.connection > 0 && all.totals.password > 0 && all.totals.note > 0, true);

    const capped = index.search('srv', 'all');
    const connectionGroup = capped.groups.find((group) => group.category === 'connection');
    assert.equal(connectionGroup.total, 15);
    assert.equal(connectionGroup.items.length, 12);
    assert.equal(index.search('s', 'all').flat.length, 0);
    assert.equal(index.search('prod', 'connection').flat.some((hit) => hit.label === 'alpha api'), true);
  });
});
