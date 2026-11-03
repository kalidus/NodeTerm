const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isVaultRoot,
  getVaultRootId,
  makeVaultRootNode,
  mergeConnectionTrees,
  splitConnectionTrees,
  setVaultRootChildren,
  detectKeyCollisions,
  connectionVaultStorageKey,
  parseConnectionVaultStorageKey,
  isConnectionVaultStorageKey,
  DEFAULT_VAULT_ID
} = require('../../src/shared/vault-connection-trees');

function host(key, title) {
  return {
    key,
    uid: key,
    title: title || key,
    droppable: false,
    data: { type: 'ssh', host: '1.2.3.4', username: 'u', password: 'p' }
  };
}

function folder(key, children) {
  return {
    key,
    uid: key,
    title: key,
    droppable: true,
    leaf: false,
    children: children || []
  };
}

describe('vault-connection-trees', () => {
  it('isVaultRoot / getVaultRootId', () => {
    assert.strictEqual(isVaultRoot(null), false);
    assert.strictEqual(isVaultRoot({ type: 'ssh' }), false);
    assert.strictEqual(isVaultRoot({ type: 'vault-root', data: { vaultId: 'a' } }), true);
    assert.strictEqual(isVaultRoot({ data: { type: 'vault-root', vaultId: 'b' } }), true);
    assert.strictEqual(getVaultRootId({ data: { type: 'vault-root', vaultId: 'work' } }), 'work');
    assert.strictEqual(getVaultRootId(host('x')), null);
  });

  it('merge: principal suelto + extras como raíces', () => {
    const main = [host('h1', 'Home'), folder('f1', [host('h2')])];
    const { nodes, collisions } = mergeConnectionTrees(main, [
      { vaultId: 'work', title: 'Trabajo', locked: false, nodes: [host('w1')] },
      { vaultId: 'locked1', title: 'Bloqueado', locked: true, nodes: [host('secret')] }
    ]);

    assert.strictEqual(collisions.length, 0);
    assert.strictEqual(nodes.length, 4);
    assert.strictEqual(nodes[0].key, 'h1');
    assert.strictEqual(nodes[1].key, 'f1');
    assert.ok(isVaultRoot(nodes[2]));
    assert.strictEqual(getVaultRootId(nodes[2]), 'work');
    assert.strictEqual(nodes[2].children.length, 1);
    assert.strictEqual(nodes[2].children[0].key, 'w1');
    assert.ok(isVaultRoot(nodes[3]));
    assert.strictEqual(nodes[3].data.locked, true);
    assert.strictEqual(nodes[3].children.length, 0);
  });

  it('merge filtra vault-root ya presentes en main', () => {
    const stray = makeVaultRootNode({ vaultId: 'x', title: 'X', locked: true });
    const { nodes } = mergeConnectionTrees([host('a'), stray], [
      { vaultId: 'y', title: 'Y', locked: true }
    ]);
    assert.strictEqual(nodes.filter((n) => !isVaultRoot(n)).length, 1);
    assert.strictEqual(nodes.filter(isVaultRoot).length, 1);
    assert.strictEqual(getVaultRootId(nodes.find(isVaultRoot)), 'y');
  });

  it('split: no incluye vaults bloqueados en byVaultId', () => {
    const { nodes } = mergeConnectionTrees([host('a')], [
      { vaultId: 'work', title: 'Work', locked: false, nodes: [host('w1'), host('w2')] },
      { vaultId: 'home', title: 'Home', locked: true, nodes: [host('secret')] }
    ]);

    // Simular arrastre: mover w1 al principal
    const workRoot = nodes.find((n) => getVaultRootId(n) === 'work');
    const moved = workRoot.children[0];
    workRoot.children = workRoot.children.slice(1);
    nodes.unshift(moved);

    const { main, byVaultId, lockedVaultIds, vaultMeta } = splitConnectionTrees(nodes);
    assert.strictEqual(main.some((n) => n.key === 'a'), true);
    assert.strictEqual(main.some((n) => n.key === 'w1'), true);
    assert.deepStrictEqual(Object.keys(byVaultId).sort(), ['work']);
    assert.strictEqual(byVaultId.work.length, 1);
    assert.strictEqual(byVaultId.work[0].key, 'w2');
    assert.deepStrictEqual(lockedVaultIds, ['home']);
    assert.strictEqual(vaultMeta.work.title, 'Work');
    assert.strictEqual(vaultMeta.home.title, 'Home');
  });

  it('split round-trip preserve principal and unlocked extras', () => {
    const main = [folder('prod', [host('srv1')])];
    const extras = [
      { vaultId: 'client', title: 'Cliente', locked: false, nodes: [host('c1')] }
    ];
    const { nodes } = mergeConnectionTrees(main, extras);
    const split = splitConnectionTrees(nodes);
    assert.strictEqual(split.main.length, 1);
    assert.strictEqual(split.main[0].key, 'prod');
    assert.strictEqual(split.byVaultId.client[0].key, 'c1');
    assert.strictEqual(split.lockedVaultIds.length, 0);
  });

  it('detectKeyCollisions reports shared keys across vaults', () => {
    const { collisions } = detectKeyCollisions(
      [host('same')],
      [{ vaultId: 'work', nodes: [host('same'), host('other')] }]
    );
    assert.strictEqual(collisions.length, 1);
    assert.strictEqual(collisions[0].key, 'same');
    assert.deepStrictEqual(collisions[0].sources.sort(), ['default', 'work']);
  });

  it('setVaultRootChildren unlocks and locks', () => {
    let nodes = mergeConnectionTrees([host('a')], [
      { vaultId: 'work', title: 'Work', locked: true }
    ]).nodes;

    nodes = setVaultRootChildren(nodes, 'work', [host('w1')], { locked: false });
    const unlocked = nodes.find((n) => getVaultRootId(n) === 'work');
    assert.strictEqual(unlocked.data.locked, false);
    assert.strictEqual(unlocked.children[0].key, 'w1');

    nodes = setVaultRootChildren(nodes, 'work', unlocked.children, { locked: true });
    const locked = nodes.find((n) => getVaultRootId(n) === 'work');
    assert.strictEqual(locked.data.locked, true);
    assert.strictEqual(locked.children.length, 0);

    // Bloqueado no debe aparecer en byVaultId
    const split = splitConnectionTrees(nodes);
    assert.strictEqual(split.byVaultId.work, undefined);
    assert.ok(split.lockedVaultIds.includes('work'));
  });

  it('setVaultRootChildren createIfMissing', () => {
    const nodes = setVaultRootChildren([], 'new', [host('n1')], {
      locked: false,
      createIfMissing: true,
      title: 'Nuevo'
    });
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(getVaultRootId(nodes[0]), 'new');
    assert.strictEqual(nodes[0].title, 'Nuevo');
  });

  it('connectionVaultStorageKey helpers', () => {
    assert.strictEqual(connectionVaultStorageKey(DEFAULT_VAULT_ID), 'connections_encrypted');
    assert.strictEqual(connectionVaultStorageKey(null), 'connections_encrypted');
    assert.strictEqual(connectionVaultStorageKey('work'), 'connections_encrypted__work');
    assert.deepStrictEqual(parseConnectionVaultStorageKey('connections_encrypted'), {
      kind: 'connections',
      vaultId: DEFAULT_VAULT_ID
    });
    assert.deepStrictEqual(parseConnectionVaultStorageKey('connections_encrypted__abc'), {
      kind: 'connections',
      vaultId: 'abc'
    });
    assert.strictEqual(parseConnectionVaultStorageKey('passwords_encrypted'), null);
    assert.strictEqual(isConnectionVaultStorageKey('connections_encrypted__x'), true);
    assert.strictEqual(isConnectionVaultStorageKey('ui_theme'), false);
  });
});
