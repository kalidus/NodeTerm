/**
 * Helpers para importar nodos en un árbol con vaults (plano o multi-root).
 */

import {
  isVaultRoot,
  getVaultRootId,
  findVaultIdForNode,
  DEFAULT_VAULT_ID
} from '../shared/vault-connection-trees';

export function findNodeByKeyInTree(nodes, key) {
  if (!Array.isArray(nodes) || key == null) return null;
  for (const n of nodes) {
    if (!n) continue;
    if (n.key != null && String(n.key) === String(key)) return n;
    if (Array.isArray(n.children) && n.children.length) {
      const found = findNodeByKeyInTree(n.children, key);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Inserta nodos en un árbol vault-aware.
 * @returns {{ tree: object[], mode: 'multi'|'flat', inserted: boolean, reason?: string }}
 */
export function insertNodesIntoVaultTree(
  tree,
  nodesToInsert,
  {
    targetVaultId = DEFAULT_VAULT_ID,
    targetFolderKey = 'ROOT',
    overwrite = false,
    mergeFn = null
  } = {}
) {
  const vaultId =
    !targetVaultId || targetVaultId === DEFAULT_VAULT_ID
      ? DEFAULT_VAULT_ID
      : String(targetVaultId);
  const incoming = Array.isArray(nodesToInsert) ? nodesToInsert : [];
  const copy = JSON.parse(JSON.stringify(Array.isArray(tree) ? tree : []));
  const merge = (existing, next) => {
    const base = Array.isArray(existing) ? existing : [];
    if (overwrite && typeof mergeFn === 'function') return mergeFn(base, next);
    return [...base, ...next];
  };

  const hasRoots = copy.some(isVaultRoot);

  if (hasRoots) {
    const rootIdx = copy.findIndex((n) => getVaultRootId(n) === vaultId);
    if (rootIdx < 0) {
      return { tree: copy, mode: 'multi', inserted: false, reason: 'vault-root-missing' };
    }
    const prevRoot = copy[rootIdx];
    const root = {
      ...prevRoot,
      children: Array.isArray(prevRoot.children) ? [...prevRoot.children] : []
    };
    copy[rootIdx] = root;

    if (targetFolderKey && targetFolderKey !== 'ROOT') {
      const folder = findNodeByKeyInTree(copy, targetFolderKey);
      const folderVault = findVaultIdForNode(copy, targetFolderKey);
      if (folder?.droppable && folderVault === vaultId && !isVaultRoot(folder)) {
        folder.children = merge(folder.children, incoming);
        return { tree: copy, mode: 'multi', inserted: true };
      }
    }

    root.children = merge(root.children, incoming);
    return { tree: copy, mode: 'multi', inserted: true };
  }

  if (targetFolderKey && targetFolderKey !== 'ROOT') {
    const folder = findNodeByKeyInTree(copy, targetFolderKey);
    if (folder?.droppable) {
      folder.children = merge(folder.children, incoming);
      return { tree: copy, mode: 'flat', inserted: true };
    }
  }

  return { tree: merge(copy, incoming), mode: 'flat', inserted: true };
}

/**
 * Construye opciones de carpeta destino etiquetadas con vaultId.
 * Omite nodos vault-root (la raíz del vault se elige con "Raíz" + selector de vault).
 */
export function buildVaultFolderOptions(nodes, { folderPredicate = null } = {}) {
  const list = [];
  const walk = (arr, prefix = '', vaultId = DEFAULT_VAULT_ID) => {
    if (!Array.isArray(arr)) return;
    for (const n of arr) {
      if (!n) continue;
      const nextVault = isVaultRoot(n) ? getVaultRootId(n) || vaultId : vaultId;
      const isFolder = typeof folderPredicate === 'function'
        ? folderPredicate(n)
        : !!n.droppable;
      if (isFolder && !isVaultRoot(n)) {
        list.push({
          label: `${prefix}${n.label}`,
          value: n.key,
          vaultId: nextVault
        });
      }
      if (Array.isArray(n.children) && n.children.length) {
        const nextPrefix = isVaultRoot(n) ? prefix : `${prefix}${n.label} / `;
        walk(n.children, nextPrefix, nextVault);
      }
    }
  };
  walk(nodes || []);
  return list;
}

export { DEFAULT_VAULT_ID, isVaultRoot, getVaultRootId, findVaultIdForNode };
