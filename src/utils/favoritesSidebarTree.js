import { helpers as connHelpers } from './connectionStore';

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

export function buildFavoritesSidebarTree({ nodes, favorites, groups, getFavoriteGroups }) {
  const nodeByFavoriteId = indexNodesByFavoriteId(nodes);
  const userGroups = (groups || []).filter((group) => !group.isDefault);
  const connectionFavorites = (favorites || []).filter((favorite) => favorite?.type !== 'group');

  const groupFolders = userGroups.map((group) => ({
    key: `${FAVORITE_GROUP_PREFIX}${group.id}`,
    label: group.name,
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

  return [{
    key: FAVORITES_ROOT_KEY,
    label: 'Favoritos',
    droppable: true,
    leaf: false,
    children: [...groupFolders, ...rootShortcuts],
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
