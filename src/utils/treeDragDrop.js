/** Nodo virtual del árbol de visualización (paginación "Mostrar más"). */
export const isShowMoreTreeNode = (node) => !!node?.data?.isShowMoreBtn;

/** Carpeta: droppable explícito, tipo carpeta conocido, o tiene hijos (legacy). */
export function isTreeFolderNode(node) {
  if (!node) return false;
  if (node.droppable === true) return true;
  const folderType = node.data?.type;
  if (folderType === 'document-folder' || folderType === 'password-folder') return true;
  return Array.isArray(node.children) && node.children.length > 0;
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
 * Lee del `value` que calcula PrimeReact tras el drop la posición real del nodo arrastrado.
 * PrimeReact no envía dropPoint; el value ya refleja padre e índice correctos.
 */
export function extractDragPlacement(displayTree, dragKey) {
  const walk = (nodes, parentKey = null) => {
    const list = (nodes || []).filter((n) => !isShowMoreTreeNode(n));
    for (let i = 0; i < list.length; i++) {
      if (list[i].key === dragKey) {
        return { parentKey, index: i };
      }
      if (Array.isArray(list[i].children) && list[i].children.length > 0) {
        const found = walk(list[i].children, list[i].key);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(displayTree);
}

/**
 * Inserta el nodo completo en parentKey/index del árbol real (null = raíz).
 */
export function moveNodeToPlacement(fullTree, dragKey, parentKey, index) {
  const clone = JSON.parse(JSON.stringify(fullTree || []));

  if (parentKey && isDescendantInFullTree(clone, dragKey, parentKey)) {
    return { error: 'descendant' };
  }

  const { nodes: withoutDragged, removed } = removeNodeByKeyFromTree(clone, dragKey);
  if (!removed) return null;

  if (parentKey == null) {
    const roots = [...withoutDragged];
    const safeIndex = Math.max(0, Math.min(index, roots.length));
    roots.splice(safeIndex, 0, removed);
    return { nodes: roots };
  }

  const inserted = insertNodeAsChildAt(withoutDragged, parentKey, index, removed);
  return inserted.inserted ? { nodes: inserted.nodes } : null;
}

/**
 * Aplica un drop del Tree de PrimeReact al árbol completo en memoria.
 * Usa event.value (estructura tras el drop) para la posición exacta.
 */
export function moveNodeFromTreeEvent(fullTree, event) {
  const { value, dragNode, dropNode, dropIndex } = event || {};
  const dragKey = dragNode?.key;
  if (!dragKey) return null;

  if (dropNode?.key && dragKey === dropNode.key) {
    return { error: 'same_node' };
  }

  if (dropNode?.key && isDescendantInFullTree(fullTree || [], dragKey, dropNode.key)) {
    return { error: 'descendant' };
  }

  if (Array.isArray(value) && value.length > 0) {
    const placement = extractDragPlacement(value, dragKey);
    if (placement) {
      return moveNodeToPlacement(fullTree, dragKey, placement.parentKey, placement.index);
    }
  }

  // Respaldo: drop en línea (dropNode = padre en PrimeReact onDropPoint)
  if (dropNode?.key != null && typeof dropIndex === 'number' && dropIndex >= 0) {
    return moveNodeToPlacement(fullTree, dragKey, dropNode.key, dropIndex);
  }

  if (!dropNode?.key) {
    const roots = [...(fullTree || [])];
    const without = removeNodeByKeyFromTree(roots, dragKey);
    if (without.removed) {
      return { nodes: [...without.nodes, without.removed] };
    }
  }

  return null;
}

/** @deprecated Usar moveNodeFromTreeEvent */
export function moveNodeInFullTree(fullTree, options) {
  return moveNodeFromTreeEvent(fullTree, {
    value: null,
    dragNode: { key: options.dragKey },
    dropNode: options.dropKey ? { key: options.dropKey } : null,
    dropPoint: options.dropPoint,
    dropIndex: options.dropIndex
  });
}
