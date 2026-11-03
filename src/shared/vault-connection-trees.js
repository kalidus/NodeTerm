/**
 * Merge/split del árbol de conexiones entre vault principal y vaults extra.
 * Lógica pura (sin I/O): el vault principal son nodos top-level que no son vault-root;
 * cada vault extra es un nodo raíz type/data.type === 'vault-root' con vaultId.
 */

const VAULT_ROOT_TYPE = 'vault-root';
const DEFAULT_VAULT_ID = 'default';

/**
 * @param {object|null|undefined} node
 * @returns {boolean}
 */
function isVaultRoot(node) {
  if (!node || typeof node !== 'object') return false;
  const dataType = node.data && node.data.type;
  return node.type === VAULT_ROOT_TYPE || dataType === VAULT_ROOT_TYPE;
}

/**
 * @param {object|null|undefined} node
 * @returns {string|null}
 */
function getVaultRootId(node) {
  if (!isVaultRoot(node)) return null;
  const id =
    (node.data && node.data.vaultId) ||
    node.vaultId ||
    null;
  return id != null && String(id) !== '' ? String(id) : null;
}

/**
 * @param {string} vaultId
 * @returns {string}
 */
function vaultRootKey(vaultId) {
  return `vault_root_${vaultId}`;
}

/**
 * Construye un nodo raíz de vault (sin hijos si locked).
 * @param {{ vaultId: string, title?: string, icon?: string, locked?: boolean, children?: object[] }} meta
 */
function makeVaultRootNode(meta) {
  const vaultId = String(meta.vaultId);
  const locked = !!meta.locked;
  const children = locked ? [] : Array.isArray(meta.children) ? meta.children : [];
  return {
    key: vaultRootKey(vaultId),
    uid: vaultRootKey(vaultId),
    title: meta.title || vaultId,
    droppable: true,
    leaf: false,
    type: VAULT_ROOT_TYPE,
    vaultId,
    data: {
      type: VAULT_ROOT_TYPE,
      vaultId,
      icon: meta.icon || 'pi pi-lock',
      locked
    },
    children
  };
}

/**
 * Detecta keys duplicadas entre varios árboles (principal + extras desbloqueados).
 * @param {object[]} mainNodes
 * @param {Array<{ vaultId: string, nodes: object[] }>} extras
 * @returns {{ collisions: Array<{ key: string, sources: string[] }>, allKeys: Set<string> }}
 */
function detectKeyCollisions(mainNodes, extras = []) {
  const owners = new Map(); // key -> [source]

  const walk = (list, source) => {
    if (!Array.isArray(list)) return;
    for (const node of list) {
      if (!node || typeof node !== 'object') continue;
      const key = node.key != null ? String(node.key) : null;
      if (key) {
        if (!owners.has(key)) owners.set(key, []);
        owners.get(key).push(source);
      }
      if (Array.isArray(node.children) && node.children.length) {
        walk(node.children, source);
      }
    }
  };

  walk(mainNodes, DEFAULT_VAULT_ID);
  for (const extra of extras) {
    if (!extra) continue;
    walk(extra.nodes || [], String(extra.vaultId));
  }

  const collisions = [];
  for (const [key, sources] of owners.entries()) {
    if (sources.length > 1) {
      collisions.push({ key, sources: [...sources] });
    }
  }
  return { collisions, allKeys: new Set(owners.keys()) };
}

/**
 * Fusiona el árbol principal con vaults extra como raíces.
 * @param {object[]} mainNodes - nodos del vault principal (sin vault-root)
 * @param {Array<{ vaultId: string, title?: string, icon?: string, locked?: boolean, nodes?: object[] }>} extras
 * @returns {{ nodes: object[], collisions: Array<{ key: string, sources: string[] }> }}
 */
function mergeConnectionTrees(mainNodes, extras = []) {
  const main = Array.isArray(mainNodes) ? mainNodes.filter((n) => !isVaultRoot(n)) : [];
  const unlockedForCollision = [];
  const rootNodes = [];

  for (const extra of extras || []) {
    if (!extra || extra.vaultId == null || String(extra.vaultId) === '') continue;
    const vaultId = String(extra.vaultId);
    const locked = !!extra.locked;
    const children = locked ? [] : Array.isArray(extra.nodes) ? extra.nodes : [];
    if (!locked) {
      unlockedForCollision.push({ vaultId, nodes: children });
    }
    rootNodes.push(
      makeVaultRootNode({
        vaultId,
        title: extra.title,
        icon: extra.icon,
        locked,
        children
      })
    );
  }

  const { collisions } = detectKeyCollisions(main, unlockedForCollision);
  return { nodes: [...main, ...rootNodes], collisions };
}

/**
 * Parte el árbol fusionado en principal + por vaultId.
 * Los vault-root bloqueados (sin hijos o data.locked) no se incluyen en byVaultId
 * para que el caller no los reescriba.
 *
 * @param {object[]} nodes
 * @returns {{ main: object[], byVaultId: Record<string, object[]>, lockedVaultIds: string[], vaultMeta: Record<string, { title: string, icon?: string }> }}
 */
function splitConnectionTrees(nodes) {
  const main = [];
  const byVaultId = {};
  const lockedVaultIds = [];
  const vaultMeta = {};

  if (!Array.isArray(nodes)) {
    return { main, byVaultId, lockedVaultIds, vaultMeta };
  }

  for (const node of nodes) {
    if (!isVaultRoot(node)) {
      main.push(node);
      continue;
    }
    const vaultId = getVaultRootId(node);
    if (!vaultId) continue;

    const locked = !!(node.data && node.data.locked);
    vaultMeta[vaultId] = {
      title: node.title || vaultId,
      icon: (node.data && node.data.icon) || undefined
    };

    if (locked) {
      lockedVaultIds.push(vaultId);
      continue;
    }

    byVaultId[vaultId] = Array.isArray(node.children) ? node.children : [];
  }

  return { main, byVaultId, lockedVaultIds, vaultMeta };
}

/**
 * Sustituye (o inserta) los children de un vault-root en el árbol fusionado.
 * Si locked=true, children se vacían y data.locked=true.
 */
function setVaultRootChildren(nodes, vaultId, children, options = {}) {
  const id = String(vaultId);
  const locked = !!options.locked;
  const list = Array.isArray(nodes) ? nodes.map((n) => ({ ...n })) : [];
  let found = false;

  for (let i = 0; i < list.length; i++) {
    if (getVaultRootId(list[i]) !== id) continue;
    found = true;
    const prev = list[i];
    list[i] = {
      ...prev,
      data: {
        ...(prev.data || {}),
        type: VAULT_ROOT_TYPE,
        vaultId: id,
        locked
      },
      vaultId: id,
      type: VAULT_ROOT_TYPE,
      droppable: true,
      leaf: false,
      children: locked ? [] : Array.isArray(children) ? children : []
    };
    break;
  }

  if (!found && options.createIfMissing) {
    list.push(
      makeVaultRootNode({
        vaultId: id,
        title: options.title,
        icon: options.icon,
        locked,
        children: locked ? [] : children
      })
    );
  }

  return list;
}

/**
 * Resuelve el vaultId al que pertenece un nodo (DEFAULT_VAULT_ID si está en el principal).
 * @param {object[]} nodes
 * @param {string} nodeKey
 * @returns {string}
 */
function findVaultIdForNode(nodes, nodeKey) {
  const target = nodeKey != null ? String(nodeKey) : null;
  if (!target || !Array.isArray(nodes)) return DEFAULT_VAULT_ID;

  const walk = (list, currentVaultId) => {
    if (!Array.isArray(list)) return null;
    for (const node of list) {
      if (!node) continue;
      const nodeVault = isVaultRoot(node) ? getVaultRootId(node) || currentVaultId : currentVaultId;
      if (node.key != null && String(node.key) === target) {
        return nodeVault || DEFAULT_VAULT_ID;
      }
      if (Array.isArray(node.children) && node.children.length) {
        const found = walk(node.children, nodeVault);
        if (found != null) return found;
      }
    }
    return null;
  };

  return walk(nodes, DEFAULT_VAULT_ID) || DEFAULT_VAULT_ID;
}

/**
 * Prefijo de storage key para blobs de conexiones de un vault extra.
 * @param {string} vaultId
 * @returns {string|null} null si es el principal / default
 */
function connectionVaultStorageKey(vaultId) {
  if (vaultId == null || vaultId === '' || vaultId === DEFAULT_VAULT_ID) {
    return 'connections_encrypted';
  }
  return `connections_encrypted__${vaultId}`;
}

/**
 * @param {string} storageKey
 * @returns {{ kind: 'connections', vaultId: string }|null}
 */
function parseConnectionVaultStorageKey(storageKey) {
  if (storageKey === 'connections_encrypted') {
    return { kind: 'connections', vaultId: DEFAULT_VAULT_ID };
  }
  if (typeof storageKey === 'string' && storageKey.startsWith('connections_encrypted__')) {
    const vaultId = storageKey.slice('connections_encrypted__'.length);
    if (vaultId) return { kind: 'connections', vaultId };
  }
  return null;
}

/**
 * True si la clave es un blob de conexiones (principal o extra).
 */
function isConnectionVaultStorageKey(storageKey) {
  return parseConnectionVaultStorageKey(storageKey) != null;
}

module.exports = {
  VAULT_ROOT_TYPE,
  DEFAULT_VAULT_ID,
  isVaultRoot,
  getVaultRootId,
  vaultRootKey,
  makeVaultRootNode,
  detectKeyCollisions,
  mergeConnectionTrees,
  splitConnectionTrees,
  setVaultRootChildren,
  findVaultIdForNode,
  connectionVaultStorageKey,
  parseConnectionVaultStorageKey,
  isConnectionVaultStorageKey
};
