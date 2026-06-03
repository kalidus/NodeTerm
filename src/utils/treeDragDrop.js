/** Nodo virtual del árbol de visualización (paginación "Mostrar más"). */
export const isShowMoreTreeNode = (node) => !!node?.data?.isShowMoreBtn;

/** Carpeta: droppable explícito o tiene hijos (datos legacy/importados). */
export function isTreeFolderNode(node) {
  if (!node) return false;
  if (node.droppable === true) return true;
  return Array.isArray(node.children) && node.children.length > 0;
}

/**
 * Índice key → nodo del árbol completo (referencia al nodo en el árbol fuente).
 */
export function buildTreeNodeMap(tree, map = new Map()) {
  for (const node of tree || []) {
    if (!node?.key) continue;
    map.set(node.key, node);
    if (Array.isArray(node.children) && node.children.length > 0) {
      buildTreeNodeMap(node.children, map);
    }
  }
  return map;
}

export function findNodeInTree(tree, key) {
  for (const node of tree || []) {
    if (node.key === key) return node;
    if (Array.isArray(node.children) && node.children.length > 0) {
      const found = findNodeInTree(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

/** Devuelve { list, index, parentKey } del array que contiene directamente al nodo. */
export function findNodeContext(tree, key) {
  const walk = (nodes, parentKey) => {
    for (let i = 0; i < (nodes || []).length; i++) {
      if (nodes[i].key === key) {
        return { list: nodes, index: i, parentKey };
      }
      if (Array.isArray(nodes[i].children) && nodes[i].children.length > 0) {
        const found = walk(nodes[i].children, nodes[i].key);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(tree, null);
}

export function isDescendantTreeKey(node, targetKey) {
  if (!node || !Array.isArray(node.children)) return false;
  for (const child of node.children) {
    if (child.key === targetKey) return true;
    if (isDescendantTreeKey(child, targetKey)) return true;
  }
  return false;
}

export function isDescendantInFullTree(tree, ancestorKey, targetKey) {
  const ancestor = findNodeInTree(tree, ancestorKey);
  return ancestor ? isDescendantTreeKey(ancestor, targetKey) : false;
}

/** Elimina un nodo por key de forma inmutable; devuelve el nodo completo removido. */
export function removeNodeByKeyFromTree(list, key) {
  let removed = null;
  const next = [];

  for (const currentNode of list || []) {
    if (currentNode.key === key) {
      removed = currentNode;
      continue;
    }

    if (Array.isArray(currentNode.children) && currentNode.children.length > 0) {
      const childResult = removeNodeByKeyFromTree(currentNode.children, key);
      if (childResult.removed) removed = childResult.removed;
      next.push({ ...currentNode, children: childResult.nodes });
    } else {
      next.push(currentNode);
    }
  }

  return { nodes: next, removed };
}

/** Inserta un nodo como primer hijo de la carpeta con targetKey. */
export function insertNodeIntoFolder(list, targetKey, nodeToInsert) {
  let inserted = false;
  const next = (list || []).map((currentNode) => {
    if (currentNode.key === targetKey) {
      inserted = true;
      const currentChildren = Array.isArray(currentNode.children) ? currentNode.children : [];
      return { ...currentNode, children: [nodeToInsert, ...currentChildren] };
    }

    if (Array.isArray(currentNode.children) && currentNode.children.length > 0) {
      const updatedChildren = insertNodeIntoFolder(currentNode.children, targetKey, nodeToInsert);
      if (updatedChildren.inserted) inserted = true;
      return { ...currentNode, children: updatedChildren.nodes };
    }
    return currentNode;
  });

  return { nodes: next, inserted };
}

/** Inserta un nodo en la lista de hijos de parentKey en el índice indicado. */
export function insertNodeAsChildAt(list, parentKey, index, nodeToInsert) {
  let inserted = false;
  const next = (list || []).map((currentNode) => {
    if (currentNode.key === parentKey) {
      inserted = true;
      const children = [...(currentNode.children || [])];
      const safeIndex = Math.max(0, Math.min(index, children.length));
      children.splice(safeIndex, 0, nodeToInsert);
      return { ...currentNode, children };
    }

    if (Array.isArray(currentNode.children) && currentNode.children.length > 0) {
      const updated = insertNodeAsChildAt(currentNode.children, parentKey, index, nodeToInsert);
      if (updated.inserted) inserted = true;
      return { ...currentNode, children: updated.nodes };
    }
    return currentNode;
  });

  return { nodes: next, inserted };
}

/**
 * Mueve un nodo en el árbol completo usando solo keys y dropPoint/dropIndex.
 * No usa el `value` del Tree (vista truncada/colapsada).
 *
 * @returns {{ nodes: object[] } | { error: string } | null}
 */
export function moveNodeInFullTree(fullTree, { dragKey, dropKey, dropPoint, dropIndex }) {
  if (!dragKey) return null;

  const clone = JSON.parse(JSON.stringify(fullTree || []));

  if (dropKey && dragKey === dropKey) {
    return { error: 'same_node' };
  }

  if (dropKey && isDescendantInFullTree(clone, dragKey, dropKey)) {
    return { error: 'descendant' };
  }

  const { nodes: withoutDragged, removed } = removeNodeByKeyFromTree(clone, dragKey);
  if (!removed) return null;

  if (!dropKey) {
    return { nodes: [...withoutDragged, removed] };
  }

  const dropNode = findNodeInTree(withoutDragged, dropKey);
  if (!dropNode) return null;

  const point = dropPoint == null ? 0 : dropPoint;
  const dropIntoFolder = point === 0 && isTreeFolderNode(dropNode);

  if (dropIntoFolder) {
    const inserted = insertNodeIntoFolder(withoutDragged, dropKey, removed);
    return inserted.inserted ? { nodes: inserted.nodes } : null;
  }

  const ctx = findNodeContext(withoutDragged, dropKey);
  if (!ctx) return null;

  let insertIndex = ctx.index;
  if (point === 1) {
    insertIndex += 1;
  } else if (typeof dropIndex === 'number' && dropIndex >= 0) {
    insertIndex = dropIndex;
  }

  if (ctx.parentKey == null) {
    const roots = [...withoutDragged];
    const safeIndex = Math.max(0, Math.min(insertIndex, roots.length));
    roots.splice(safeIndex, 0, removed);
    return { nodes: roots };
  }

  const inserted = insertNodeAsChildAt(withoutDragged, ctx.parentKey, insertIndex, removed);
  return inserted.inserted ? { nodes: inserted.nodes } : null;
}

/**
 * @deprecated Usar moveNodeInFullTree. Se mantiene por compatibilidad interna.
 */
export function mergeDisplayTreeWithFullTree(displayTree, fullTree) {
  const fullMap = buildTreeNodeMap(fullTree);

  const cloneFullSubtree = (nodes) =>
    (nodes || []).map((node) => {
      const full = fullMap.get(node.key) || node;
      const children = Array.isArray(full.children) && full.children.length > 0
        ? cloneFullSubtree(full.children)
        : full.children;
      return { ...full, children };
    });

  const mergeLevel = (displayNodes, fullSiblingsAtLevel) => {
    const displayList = (displayNodes || []).filter((n) => !isShowMoreTreeNode(n));
    const displayKeyOrder = displayList.map((n) => n.key);

    const merged = displayList
      .map((displayNode) => {
        const full = fullMap.get(displayNode.key);
        if (!full) return null;

        const displayChildren = (displayNode.children || []).filter((c) => !isShowMoreTreeNode(c));
        let children;

        if (displayChildren.length > 0) {
          children = mergeLevel(displayChildren, full.children || []);
        } else if (Array.isArray(full.children) && full.children.length > 0) {
          children = cloneFullSubtree(full.children);
        } else {
          children = full.children;
        }

        return { ...full, children };
      })
      .filter(Boolean);

    for (const fullNode of fullSiblingsAtLevel || []) {
      if (!displayKeyOrder.includes(fullNode.key)) {
        merged.push({
          ...fullNode,
          children: Array.isArray(fullNode.children) && fullNode.children.length > 0
            ? cloneFullSubtree(fullNode.children)
            : fullNode.children
        });
      }
    }

    return merged;
  };

  return mergeLevel(displayTree, fullTree);
}
