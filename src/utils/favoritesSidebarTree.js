import { helpers as connHelpers } from './connectionStore';
import favoriteGroupsStore from './favoriteGroupsStore';
import { extractDragPlacement, isShowMoreTreeNode } from './treeDragDrop';

export const FAVORITES_ROOT_KEY = '__favorites_root__';
export const FAVORITES_VIEW_FOLDER_COLOR = '#FFC107';
const FAVORITE_GROUP_PREFIX = '__fav_group__';
const FAVORITE_SHORTCUT_PREFIX = '__fav_shortcut__';

export function isFavoritesRootKey(key) {
  return key === FAVORITES_ROOT_KEY;
}

export function isFavoriteGroupFolderKey(key) {
  return typeof key === 'string' && key.startsWith(FAVORITE_GROUP_PREFIX);
}

export function isFavoriteShortcutNode(node) {
  return !!(node && node.isFavoriteShortcut);
}

export function isFavoriteGroupFolderNode(node) {
  return !!(node && node.isFavoriteGroupFolder);
}

export function getFavoriteGroupIdFromKey(key) {
  if (!isFavoriteGroupFolderKey(key)) return null;
  return key.slice(FAVORITE_GROUP_PREFIX.length);
}

export function findNodeByKey(nodes, key) {
  if (key === null || key === undefined) return null;
  for (const node of nodes || []) {
    if (node.key === key) return node;
    if (node.children?.length) {
      const found = findNodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

function indexNodesByFavoriteId(nodes, map = new Map()) {
  for (const node of nodes || []) {
    if (node?.data?.type) {
      try {
        const conn = connHelpers.fromSidebarNode(node);
        if (conn?.id) {
          map.set(conn.id, node);
        }
      } catch (_) {
        // noop
      }
    }
    if (node.children?.length) {
      indexNodesByFavoriteId(node.children, map);
    }
  }
  return map;
}

function mapFavoriteTypeToNodeType(type) {
  if (type === 'rdp-guacamole') return 'rdp';
  if (type === 'vnc-guacamole') return 'vnc';
  return type;
}

function favoriteToOrphanNode(favorite, groupId = null) {
  const nodeType = mapFavoriteTypeToNodeType(favorite.type);
  const shortcutKey = `${FAVORITE_SHORTCUT_PREFIX}${favorite.id}__${groupId || 'root'}`;

  return {
    key: shortcutKey,
    label: favorite.name || favorite.label || favorite.id,
    draggable: true,
    droppable: false,
    leaf: true,
    isFavoriteShortcut: true,
    isOrphanFavoriteShortcut: true,
    favoriteId: favorite.id,
    favoriteGroupId: groupId,
    sourceKey: null,
    data: {
      ...favorite,
      type: nodeType,
      host: favorite.host || favorite.hostname,
      user: favorite.username,
      username: favorite.username,
      port: favorite.port,
      protocol: favorite.protocol || (['sftp', 'ftp', 'scp'].includes(nodeType) ? nodeType : undefined),
      customIcon: favorite.customIcon || null
    }
  };
}

function createShortcutFromFavorite(favorite, sourceNode, groupId = null) {
  const shortcutKey = `${FAVORITE_SHORTCUT_PREFIX}${favorite.id}__${groupId || 'root'}`;

  if (sourceNode) {
    return {
      ...sourceNode,
      key: shortcutKey,
      draggable: true,
      droppable: false,
      leaf: true,
      children: undefined,
      isFavoriteShortcut: true,
      isOrphanFavoriteShortcut: false,
      favoriteId: favorite.id,
      favoriteGroupId: groupId,
      sourceKey: sourceNode.key
    };
  }

  return favoriteToOrphanNode(favorite, groupId);
}

export function resolveFavoriteShortcutNode(node, nodes) {
  if (!isFavoriteShortcutNode(node)) return node;
  if (node.sourceKey) {
    const sourceNode = findNodeByKey(nodes, node.sourceKey);
    if (sourceNode) return sourceNode;
  }
  return node;
}

function sortNodesByFavoriteOrder(nodes, favoriteOrder) {
  if (!Array.isArray(favoriteOrder) || favoriteOrder.length === 0) {
    return nodes;
  }

  const orderIndex = new Map(favoriteOrder.map((favoriteId, index) => [favoriteId, index]));
  return [...nodes].sort((left, right) => {
    const leftIndex = orderIndex.has(left.favoriteId)
      ? orderIndex.get(left.favoriteId)
      : Number.MAX_SAFE_INTEGER;
    const rightIndex = orderIndex.has(right.favoriteId)
      ? orderIndex.get(right.favoriteId)
      : Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

function collectFavoriteShortcutPlacements(nodes, parentGroupId = null, placements = []) {
  for (const node of nodes || []) {
    if (isFavoriteGroupFolderNode(node)) {
      collectFavoriteShortcutPlacements(node.children, node.favoriteGroupId, placements);
      continue;
    }

    if (isFavoriteShortcutNode(node) && node.favoriteId) {
      placements.push({ favoriteId: node.favoriteId, groupId: parentGroupId });
    }
  }

  return placements;
}

export function buildFavoritesSidebarTree({ nodes, favorites, groups, getFavoriteGroups }) {
  const nodeByFavoriteId = indexNodesByFavoriteId(nodes);
  const userGroups = (groups || []).filter((group) => !group.isDefault);
  const connectionFavorites = (favorites || []).filter((favorite) => favorite?.type !== 'group');

  const memberOrder = favoriteGroupsStore.getFavoriteMemberOrder();

  const groupFolders = userGroups.map((group) => ({
    key: `${FAVORITE_GROUP_PREFIX}${group.id}`,
    label: group.name,
    draggable: true,
    droppable: true,
    leaf: false,
    children: [],
    uid: `${FAVORITE_GROUP_PREFIX}${group.id}`,
    color: FAVORITES_VIEW_FOLDER_COLOR,
    folderIcon: 'favorites',
    isFavoriteGroupFolder: true,
    favoriteGroupId: group.id
  }));

  const groupFolderById = new Map(groupFolders.map((folder) => [folder.favoriteGroupId, folder]));
  const rootShortcuts = [];

  for (const favorite of connectionFavorites) {
    const sourceNode = nodeByFavoriteId.get(favorite.id) || null;
    const assignedGroupIds = (getFavoriteGroups ? getFavoriteGroups(favorite.id) : [])
      .filter((groupId) => groupFolderById.has(groupId));

    if (assignedGroupIds.length === 0) {
      rootShortcuts.push(createShortcutFromFavorite(favorite, sourceNode, null));
      continue;
    }

    for (const groupId of assignedGroupIds) {
      const folder = groupFolderById.get(groupId);
      if (folder) {
        folder.children.push(createShortcutFromFavorite(favorite, sourceNode, groupId));
      }
    }
  }

  for (const folder of groupFolders) {
    folder.children = sortNodesByFavoriteOrder(
      folder.children,
      memberOrder.groups?.[folder.favoriteGroupId]
    );
  }

  const orderedRootShortcuts = sortNodesByFavoriteOrder(rootShortcuts, memberOrder.root);

  const groupByKey = new Map(groupFolders.map((folder) => [folder.key, folder]));
  const rootShortcutByKey = new Map(orderedRootShortcuts.map((node) => [node.key, node]));
  const savedRootKeys = Array.isArray(memberOrder.rootKeys) ? memberOrder.rootKeys : [];
  let rootChildren;

  if (savedRootKeys.length > 0) {
    rootChildren = [];
    const usedKeys = new Set();

    for (const key of savedRootKeys) {
      const node = groupByKey.get(key) || rootShortcutByKey.get(key);
      if (node) {
        rootChildren.push(node);
        usedKeys.add(key);
      }
    }

    for (const folder of groupFolders) {
      if (!usedKeys.has(folder.key)) {
        rootChildren.push(folder);
      }
    }
    for (const shortcut of orderedRootShortcuts) {
      if (!usedKeys.has(shortcut.key)) {
        rootChildren.push(shortcut);
      }
    }
  } else {
    rootChildren = [...groupFolders, ...orderedRootShortcuts];
  }

  return [{
    key: FAVORITES_ROOT_KEY,
    label: 'Favoritos',
    droppable: true,
    leaf: false,
    children: rootChildren,
    uid: FAVORITES_ROOT_KEY,
    color: FAVORITES_VIEW_FOLDER_COLOR,
    folderIcon: 'favorites',
    isFavoritesRoot: true
  }];
}

function nodeMatchesFilter(node, normalizedQuery) {
  const label = String(node.label || '').toLowerCase();
  if (label.includes(normalizedQuery)) return true;

  if (isFavoriteShortcutNode(node)) {
    const host = String(node.data?.host || node.data?.hostname || '').toLowerCase();
    const user = String(node.data?.user || node.data?.username || '').toLowerCase();
    return host.includes(normalizedQuery) || user.includes(normalizedQuery);
  }

  return false;
}

function filterTreeNodes(nodes, normalizedQuery) {
  const filtered = [];

  for (const node of nodes || []) {
    if (node.droppable) {
      const children = filterTreeNodes(node.children || [], normalizedQuery);
      if (children.length > 0 || nodeMatchesFilter(node, normalizedQuery)) {
        filtered.push({ ...node, children });
      }
      continue;
    }

    if (nodeMatchesFilter(node, normalizedQuery)) {
      filtered.push({ ...node });
    }
  }

  return filtered;
}

export function filterFavoritesTree(tree, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return tree;

  const root = tree?.[0];
  if (!root) return tree;

  const filteredChildren = filterTreeNodes(root.children || [], normalizedQuery);
  return [{ ...root, children: filteredChildren }];
}

/** Hijos del contenedor Favoritos para mostrar en el Tree (sin el nodo raíz virtual). */
export function getFavoritesTreeDisplayNodes(tree) {
  const root = tree?.[0];
  if (!root || !isFavoritesRootKey(root.key)) return [];
  return root.children || [];
}

/** Reconstruye el value con raíz para persistir tras un drop en vista plana. */
export function wrapFavoritesDisplayValue(displayValue) {
  return [{
    key: FAVORITES_ROOT_KEY,
    label: 'Favoritos',
    droppable: true,
    leaf: false,
    children: displayValue || [],
    uid: FAVORITES_ROOT_KEY,
    color: FAVORITES_VIEW_FOLDER_COLOR,
    folderIcon: 'favorites',
    isFavoritesRoot: true
  }];
}

export function getDefaultFavoritesExpandedKeys(tree) {
  const root = tree?.[0];
  if (!root) return {};

  const expanded = { [root.key]: true };
  for (const child of root.children || []) {
    if (child.droppable && child.children?.length) {
      expanded[child.key] = true;
    }
  }
  return expanded;
}

function filterDisplayChildren(nodes) {
  return (nodes || []).filter((node) => !isShowMoreTreeNode(node));
}

/**
 * Persiste el layout tras un drop usando el `value` que calcula PrimeReact (misma idea que conexiones).
 */
export function applyFavoritesTreeLayoutFromDrop(treeValue) {
  const root = treeValue?.[0];
  if (!root || !isFavoritesRootKey(root.key)) {
    return false;
  }

  const children = filterDisplayChildren(root.children);
  const rootKeys = [];
  const rootShortcutIds = [];
  const groupMemberOrder = {};
  const orderedGroupIds = [];

  for (const child of children) {
    rootKeys.push(child.key);

    if (isFavoriteGroupFolderNode(child)) {
      if (child.favoriteGroupId) {
        orderedGroupIds.push(child.favoriteGroupId);
        groupMemberOrder[child.favoriteGroupId] = filterDisplayChildren(child.children)
          .filter(isFavoriteShortcutNode)
          .map((node) => node.favoriteId)
          .filter(Boolean);
      }
      continue;
    }

    if (isFavoriteShortcutNode(child) && child.favoriteId) {
      rootShortcutIds.push(child.favoriteId);
    }
  }

  const groups = favoriteGroupsStore.getGroups();
  const defaultGroups = groups.filter((group) => group.isDefault);
  const userGroups = groups.filter((group) => !group.isDefault);
  const userGroupsById = new Map(userGroups.map((group) => [group.id, group]));
  const reorderedUserGroups = orderedGroupIds
    .map((groupId) => userGroupsById.get(groupId))
    .filter(Boolean);
  const missingUserGroups = userGroups.filter((group) => !orderedGroupIds.includes(group.id));

  if (reorderedUserGroups.length > 0) {
    favoriteGroupsStore.reorderGroups([...defaultGroups, ...reorderedUserGroups, ...missingUserGroups]);
  }

  const placements = collectFavoriteShortcutPlacements(children);
  for (const { favoriteId, groupId } of placements) {
    if (!groupId) {
      favoriteGroupsStore.assignFavoriteToGroups(favoriteId, []);
      continue;
    }

    favoriteGroupsStore.assignFavoriteToGroups(favoriteId, [groupId]);
  }

  favoriteGroupsStore.setFavoriteMemberOrder({
    root: rootShortcutIds,
    groups: groupMemberOrder,
    rootKeys
  });

  return true;
}

/**
 * Valida y aplica un drop del Tree en la vista de favoritos (mismo contrato que el resto de secciones).
 */
export function applyFavoritesDragDropFromEvent(event) {
  const { dragNode, dropNode, value } = event || {};
  if (!dragNode?.key || !Array.isArray(value) || value.length === 0) {
    return false;
  }

  const treeValue = isFavoritesRootKey(value[0]?.key)
    ? value
    : wrapFavoritesDisplayValue(value);

  if (isFavoritesRootKey(dragNode.key)) {
    return false;
  }

  if (!isFavoriteShortcutNode(dragNode) && !isFavoriteGroupFolderNode(dragNode)) {
    return false;
  }

  const placement = extractDragPlacement(treeValue, dragNode.key);
  if (isFavoriteGroupFolderNode(dragNode)) {
    if (placement?.parentKey && placement.parentKey !== FAVORITES_ROOT_KEY) {
      return false;
    }
    if (dropNode?.key && dragNode.key === dropNode.key) {
      return false;
    }
  }

  if (
    isFavoriteShortcutNode(dragNode) &&
    dropNode?.key &&
    dragNode.favoriteId &&
    dropNode.favoriteId === dragNode.favoriteId
  ) {
    return false;
  }

  return applyFavoritesTreeLayoutFromDrop(treeValue);
}

export function countFavoriteShortcuts(tree) {
  const root = tree?.[0];
  if (!root) return 0;

  const walk = (nodes) => {
    let count = 0;
    for (const node of nodes || []) {
      if (isFavoriteShortcutNode(node)) {
        count += 1;
      } else if (node.children?.length) {
        count += walk(node.children);
      }
    }
    return count;
  };

  return walk(root.children);
}
