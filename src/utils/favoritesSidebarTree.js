import { helpers as connHelpers, SIDEBAR_FOLDER_FAVORITE_TYPE } from './connectionStore';
import favoriteGroupsStore from './favoriteGroupsStore';
import { extractDragPlacement, isDescendantTreeKey, isShowMoreTreeNode } from './treeDragDrop';
import { isMultiVaultEnabled } from './multiVaultFlag';
import { getVisibleConnectionVaultIds } from './activeConnectionVault';
import { DEFAULT_VAULT_ID, isVaultRoot } from '../shared/vault-connection-trees';
import vaultKeyring from '../services/VaultKeyring';

export const FAVORITES_ROOT_KEY = '__favorites_root__';
export const FAVORITES_VIEW_FOLDER_COLOR = '#FFC107';
const FAVORITE_GROUP_PREFIX = '__fav_group__';
const FAVORITE_SHORTCUT_PREFIX = '__fav_shortcut__';
const FAVORITE_PROJECTION_PREFIX = '__fav_proj__';
const PROJECTED_LEAF_TYPES = new Set([
  'ssh', 'rdp', 'rdp-guacamole', 'web-rdp',
  'vnc', 'vnc-guacamole', 'web-vnc',
  'sftp', 'ftp', 'scp',
  'password', 'secret', 'crypto_wallet', 'api_key', 'secure_note',
  'document', 'quick-note', 'library-file',
  'ssh-tunnel'
]);
const SOURCE_TREES_UPDATED_EVENT = 'favorite-source-trees-updated';

let cachedDocumentNodes = [];
let cachedPasswordNodes = [];
let lastDocumentTreeSig = '';
let lastPasswordTreeSig = '';

function sourceTreeSignature(nodes) {
  const parts = [];
  const walk = (list) => {
    for (const node of list || []) {
      parts.push(`${node.key}\t${node.label || ''}`);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return parts.join('\n');
}

export function setFavoriteSourceTrees({ documentNodes, passwordNodes } = {}) {
  let changed = false;
  if (documentNodes !== undefined) {
    cachedDocumentNodes = documentNodes || [];
    const sig = sourceTreeSignature(cachedDocumentNodes);
    if (sig !== lastDocumentTreeSig) {
      lastDocumentTreeSig = sig;
      changed = true;
    }
  }
  if (passwordNodes !== undefined) {
    cachedPasswordNodes = passwordNodes || [];
    const sig = sourceTreeSignature(cachedPasswordNodes);
    if (sig !== lastPasswordTreeSig) {
      lastPasswordTreeSig = sig;
      changed = true;
    }
  }
  if (changed && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SOURCE_TREES_UPDATED_EVENT));
  }
}

export function onFavoriteSourceTreesUpdate(handler) {
  if (typeof window === 'undefined') return () => {};
  const listener = () => handler();
  window.addEventListener(SOURCE_TREES_UPDATED_EVENT, listener);
  return () => window.removeEventListener(SOURCE_TREES_UPDATED_EVENT, listener);
}

export function isFavoriteShortcutKey(key) {
  return typeof key === 'string' && key.startsWith(FAVORITE_SHORTCUT_PREFIX);
}

export function getFavoriteIdFromShortcutKey(key) {
  if (!isFavoriteShortcutKey(key)) return null;
  const rest = key.slice(FAVORITE_SHORTCUT_PREFIX.length);
  const lastSep = rest.lastIndexOf('__');
  if (lastSep <= 0) return rest || null;
  return rest.slice(0, lastSep);
}

export function isFavoritesRootKey(key) {
  return key === FAVORITES_ROOT_KEY;
}

export function isFavoriteGroupFolderKey(key) {
  return typeof key === 'string' && key.startsWith(FAVORITE_GROUP_PREFIX);
}

export function isFavoriteShortcutNode(node) {
  return !!(node && node.isFavoriteShortcut);
}

export function isFavoriteFolderShortcutNode(node) {
  return !!(node && node.isFavoriteFolderShortcut);
}

export function isFavoriteProjectionNode(node) {
  return !!(node && (node.isFavoriteProjection || node.isFavoriteFolderProjection));
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

/** Resuelve un secreto del vault en memoria por key/id (sin leer historial en claro). */
export function findPasswordNodeByKey(key) {
  if (key === null || key === undefined) return null;
  const wanted = String(key);
  const fromCache = findNodeByKey(cachedPasswordNodes, wanted);
  if (fromCache) return fromCache;

  const localNodes = loadLocalSourceTree('passwordManagerNodes');
  const fromLocal = findNodeByKey(localNodes, wanted);
  if (fromLocal) return fromLocal;

  // También aceptar ids serializados de favoritos/recientes
  const byFavoriteId = indexNodesByFavoriteId(cachedPasswordNodes.length ? cachedPasswordNodes : localNodes);
  return byFavoriteId.get(wanted) || null;
}

function indexNodesByFavoriteId(nodes, map = new Map()) {
  for (const node of nodes || []) {
    if (node?.key) {
      map.set(node.key, node);
    }
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
  if (!node) return node;
  // La carpeta marcada conserva su identidad: quitarla de favoritos no es borrar el original.
  if (isFavoriteFolderShortcutNode(node)) return node;
  if (!isFavoriteShortcutNode(node) && !isFavoriteProjectionNode(node)) return node;
  if (node.sourceKey) {
    const sourceNode = findNodeByKey(nodes, node.sourceKey)
      || findNodeByKey(cachedDocumentNodes, node.sourceKey)
      || findNodeByKey(cachedPasswordNodes, node.sourceKey);
    if (sourceNode) return sourceNode;
  }
  return node;
}

function projectionDisplayData(sourceNode) {
  const data = sourceNode?.data || {};
  return {
    type: data.type || sourceNode?.type,
    host: data.host || data.hostname || data.server,
    hostname: data.hostname,
    user: data.user,
    username: data.username,
    port: data.port,
    protocol: data.protocol,
    customIcon: data.customIcon || null,
    icon: data.icon,
    url: data.url || '',
    tunnelStatus: data.tunnelStatus,
    name: sourceNode?.label
  };
}

function isProjectedFolderNode(node) {
  if (!node || isShowMoreTreeNode(node)) return false;
  if (isVaultRoot(node)) return true;
  const type = String(node.data?.type || node.type || '').toLowerCase();
  if (PROJECTED_LEAF_TYPES.has(type)) return false;
  return node.droppable === true
    || type === 'password-folder'
    || type === 'document-folder'
    || type === 'folder'
    || type === SIDEBAR_FOLDER_FAVORITE_TYPE
    || (!type && Array.isArray(node.children));
}

function projectionKey(favorite, sourceNode, groupId) {
  return `${FAVORITE_PROJECTION_PREFIX}${groupId || 'root'}__${favorite.id}__${encodeURIComponent(String(sourceNode.key))}`;
}

function getFolderFavoriteExcludedKeySet(favorite) {
  const keys = Array.isArray(favorite?.excludedKeys) ? favorite.excludedKeys : [];
  return new Set(keys.map((k) => String(k)).filter(Boolean));
}

function projectFavoriteFolderChildren(sourceNode, favorite, groupId) {
  const excluded = getFolderFavoriteExcludedKeySet(favorite);
  const children = [];
  for (const child of sourceNode?.children || []) {
    if (!child || isShowMoreTreeNode(child)) continue;
    const childKey = child.key != null ? String(child.key) : '';
    if (childKey && excluded.has(childKey)) continue;
    if (isProjectedFolderNode(child)) {
      children.push(projectNestedFavoriteFolder(child, favorite, groupId));
      continue;
    }
    children.push({
      key: projectionKey(favorite, child, groupId),
      label: child.label || child.name || 'Elemento',
      draggable: false,
      droppable: false,
      leaf: true,
      isFavoriteProjection: true,
      parentFavoriteId: favorite.id,
      sourceKey: child.key,
      source: favorite.source,
      color: child.color,
      folderIcon: child.folderIcon,
      data: projectionDisplayData(child)
    });
  }
  return children;
}

function projectNestedFavoriteFolder(sourceNode, favorite, groupId) {
  const children = projectFavoriteFolderChildren(sourceNode, favorite, groupId);
  return {
    key: projectionKey(favorite, sourceNode, groupId),
    label: sourceNode.label || 'Carpeta',
    draggable: false,
    droppable: true,
    leaf: false,
    children,
    color: sourceNode.color,
    folderIcon: sourceNode.folderIcon && sourceNode.folderIcon !== 'general' ? sourceNode.folderIcon : null,
    isFavoriteProjection: true,
    isFavoriteFolderProjection: true,
    parentFavoriteId: favorite.id,
    sourceKey: sourceNode.key,
    source: favorite.source,
    data: { type: sourceNode.data?.type || 'folder' }
  };
}

function createFavoriteFolderNode(favorite, sourceNode, groupId = null) {
  const shortcutKey = `${FAVORITE_SHORTCUT_PREFIX}${favorite.id}__${groupId || 'root'}`;
  if (!sourceNode) {
    const orphan = favoriteToOrphanNode(favorite, groupId);
    return {
      ...orphan,
      key: shortcutKey,
      droppable: true,
      leaf: false,
      children: [],
      isFavoriteFolderShortcut: true,
      source: favorite.source || null,
      color: favorite.color,
      folderIcon: favorite.folderIcon || null,
      data: {
        ...(orphan.data || {}),
        type: SIDEBAR_FOLDER_FAVORITE_TYPE,
        source: favorite.source,
        nodeKey: favorite.nodeKey,
        id: favorite.id
      }
    };
  }

  return {
    key: shortcutKey,
    label: sourceNode.label || favorite.name || 'Carpeta',
    draggable: true,
    droppable: true,
    leaf: false,
    children: projectFavoriteFolderChildren(sourceNode, favorite, groupId),
    color: sourceNode.color || favorite.color,
    folderIcon: (sourceNode.folderIcon && sourceNode.folderIcon !== 'general')
      ? sourceNode.folderIcon
      : (favorite.folderIcon || null),
    isFavoriteShortcut: true,
    isFavoriteFolderShortcut: true,
    isOrphanFavoriteShortcut: false,
    favoriteId: favorite.id,
    favoriteGroupId: groupId,
    sourceKey: sourceNode.key,
    source: favorite.source,
    data: {
      type: SIDEBAR_FOLDER_FAVORITE_TYPE,
      source: favorite.source,
      nodeKey: favorite.nodeKey || sourceNode.key,
      id: favorite.id
    }
  };
}

function findSidebarFolderSource(favorite, connectionNodes, docNodes, pwNodes) {
  const nodeKey = favorite?.nodeKey;
  if (!nodeKey) return null;
  if (favorite.source === 'passwords') return findNodeByKey(pwNodes, nodeKey);
  if (favorite.source === 'documents') return findNodeByKey(docNodes, nodeKey);
  if (favorite.source === 'connections') return findNodeByKey(connectionNodes, nodeKey);
  return findNodeByKey(connectionNodes, nodeKey)
    || findNodeByKey(pwNodes, nodeKey)
    || findNodeByKey(docNodes, nodeKey);
}

/** Keys/ids de nodos que ya se ven dentro de alguna carpeta favorita (proyección). */
function collectKeysCoveredByFolderFavorites(folderFavorites, connectionNodes, docNodes, pwNodes) {
  const covered = new Set();

  const walk = (node, excluded) => {
    if (!node || isShowMoreTreeNode(node)) return;
    const nodeKey = node.key != null ? String(node.key) : '';
    // Excluidos: no están en la proyección, así que pueden seguir como atajo suelto.
    if (nodeKey && excluded.has(nodeKey)) return;
    if (nodeKey) covered.add(nodeKey);
    if (node.data?.id != null && node.data.id !== '') covered.add(String(node.data.id));
    try {
      const conn = connHelpers.fromSidebarNode(node);
      if (conn?.id) covered.add(String(conn.id));
    } catch (_) {
      // noop
    }
    for (const child of node.children || []) walk(child, excluded);
  };

  for (const favorite of folderFavorites || []) {
    const source = findSidebarFolderSource(favorite, connectionNodes, docNodes, pwNodes);
    if (!source) continue;
    const excluded = getFolderFavoriteExcludedKeySet(favorite);
    for (const child of source.children || []) walk(child, excluded);
  }

  return covered;
}

function isFavoriteCoveredByFolderProjection(favorite, sourceNode, coveredKeys) {
  if (!coveredKeys || coveredKeys.size === 0) return false;
  if (favorite?.id != null && coveredKeys.has(String(favorite.id))) return true;
  if (sourceNode?.key != null && coveredKeys.has(String(sourceNode.key))) return true;
  if (favorite?.nodeKey != null && coveredKeys.has(String(favorite.nodeKey))) return true;
  return false;
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

function sortNodesBySavedKeys(nodes, savedKeys) {
  if (!Array.isArray(savedKeys) || savedKeys.length === 0) {
    return nodes;
  }

  const orderIndex = new Map(savedKeys.map((key, index) => [key, index]));
  return [...nodes].sort((left, right) => {
    const leftIndex = orderIndex.has(left.key) ? orderIndex.get(left.key) : Number.MAX_SAFE_INTEGER;
    const rightIndex = orderIndex.has(right.key) ? orderIndex.get(right.key) : Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

function wouldCreateGroupCycle(userGroups, groupId, parentId) {
  if (!parentId) return false;
  if (parentId === groupId) return true;
  const byId = new Map((userGroups || []).map((group) => [group.id, group]));
  const visited = new Set();
  let cursor = parentId;
  while (cursor) {
    if (cursor === groupId) return true;
    if (visited.has(cursor)) return true;
    visited.add(cursor);
    cursor = byId.get(cursor)?.parentId || null;
  }
  return false;
}

function collectFavoriteShortcutPlacements(nodes, parentGroupId = null, placements = []) {
  for (const node of nodes || []) {
    if (isFavoriteGroupFolderNode(node)) {
      collectFavoriteShortcutPlacements(node.children, node.favoriteGroupId, placements);
      continue;
    }

    if (isFavoriteShortcutNode(node) && node.favoriteId) {
      placements.push({ favoriteId: node.favoriteId, groupId: parentGroupId });
      // El interior de una carpeta favorita es una proyección: no se reasigna.
      continue;
    }
  }

  return placements;
}

function loadLocalSourceTree(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

/**
 * Con multi-vault, solo mostrar favoritos cuyo origen está en un árbol visible
 * (árboles ya limitados a vaults visibles/desbloqueados). Huérfanos solo si
 * guardan vaultId y ese vault sigue visible y desbloqueado.
 */
function isFavoriteVisibleInCurrentVaults(favorite, sourceNode) {
  if (!isMultiVaultEnabled()) return true;
  if (sourceNode) return true;

  if (favorite?.vaultId) {
    const id =
      favorite.vaultId === DEFAULT_VAULT_ID || !favorite.vaultId
        ? DEFAULT_VAULT_ID
        : String(favorite.vaultId);
    const visible = getVisibleConnectionVaultIds();
    if (!visible.includes(id)) return false;
    if (id !== DEFAULT_VAULT_ID && !vaultKeyring.isUnlocked(id)) return false;
    return true;
  }

  return false;
}

export function buildFavoritesSidebarTree({ nodes, favorites, groups, getFavoriteGroups, documentNodes, passwordNodes }) {
  const connectionNodes = nodes || [];
  const docNodes =
    documentNodes || cachedDocumentNodes || loadLocalSourceTree('documentManagerNodes');
  const pwNodes =
    passwordNodes || cachedPasswordNodes || loadLocalSourceTree('passwordManagerNodes');

  const nodeByFavoriteId = indexNodesByFavoriteId(connectionNodes);
  indexNodesByFavoriteId(docNodes, nodeByFavoriteId);
  indexNodesByFavoriteId(pwNodes, nodeByFavoriteId);
  const userGroups = (groups || []).filter((group) => !group.isDefault);
  const connectionFavorites = (favorites || []).filter((favorite) => favorite?.type !== 'group');
  const folderFavorites = connectionFavorites.filter(
    (favorite) => favorite?.type === SIDEBAR_FOLDER_FAVORITE_TYPE
  );
  const coveredByFolderFavorites = collectKeysCoveredByFolderFavorites(
    folderFavorites,
    connectionNodes,
    docNodes,
    pwNodes
  );

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
    const isFolderFavorite = favorite.type === SIDEBAR_FOLDER_FAVORITE_TYPE;
    const sourceNode = isFolderFavorite
      ? findSidebarFolderSource(favorite, connectionNodes, docNodes, pwNodes)
      : (nodeByFavoriteId.get(favorite.id) || null);
    if (!isFavoriteVisibleInCurrentVaults(favorite, sourceNode)) {
      continue;
    }
    // Si el ítem ya aparece bajo una carpeta favorita, no duplicarlo como atajo suelto.
    if (!isFolderFavorite && isFavoriteCoveredByFolderProjection(favorite, sourceNode, coveredByFolderFavorites)) {
      continue;
    }
    // Carpeta favorita anidada bajo otra carpeta favorita: solo se ve en la proyección.
    if (isFolderFavorite && isFavoriteCoveredByFolderProjection(favorite, sourceNode, coveredByFolderFavorites)) {
      continue;
    }
    const assignedGroupIds = (getFavoriteGroups ? getFavoriteGroups(favorite.id) : [])
      .filter((groupId) => groupFolderById.has(groupId));

    const createNode = isFolderFavorite
      ? createFavoriteFolderNode
      : createShortcutFromFavorite;

    if (assignedGroupIds.length === 0) {
      rootShortcuts.push(createNode(favorite, sourceNode, null));
      continue;
    }

    for (const groupId of assignedGroupIds) {
      const folder = groupFolderById.get(groupId);
      if (folder) {
        folder.children.push(createNode(favorite, sourceNode, groupId));
      }
    }
  }

  const rootFolders = [];
  for (const group of userGroups) {
    const folder = groupFolderById.get(group.id);
    if (!folder) continue;
    const parentId = group.parentId || null;
    if (parentId && groupFolderById.has(parentId) && !wouldCreateGroupCycle(userGroups, group.id, parentId)) {
      groupFolderById.get(parentId).children.push(folder);
      continue;
    }
    rootFolders.push(folder);
  }

  for (const folder of groupFolders) {
    const savedChildKeys = memberOrder.groupKeys?.[folder.favoriteGroupId];
    if (Array.isArray(savedChildKeys) && savedChildKeys.length > 0) {
      folder.children = sortNodesBySavedKeys(folder.children, savedChildKeys);
    } else {
      folder.children = sortNodesByFavoriteOrder(
        folder.children,
        memberOrder.groups?.[folder.favoriteGroupId]
      );
    }
  }

  const orderedRootShortcuts = sortNodesByFavoriteOrder(rootShortcuts, memberOrder.root);

  const rootFolderByKey = new Map(rootFolders.map((folder) => [folder.key, folder]));
  const rootShortcutByKey = new Map(orderedRootShortcuts.map((node) => [node.key, node]));
  const savedRootKeys = Array.isArray(memberOrder.rootKeys) ? memberOrder.rootKeys : [];
  let rootChildren;

  if (savedRootKeys.length > 0) {
    rootChildren = [];
    const usedKeys = new Set();

    for (const key of savedRootKeys) {
      const node = rootFolderByKey.get(key) || rootShortcutByKey.get(key);
      if (node) {
        rootChildren.push(node);
        usedKeys.add(key);
      }
    }

    for (const folder of rootFolders) {
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
    rootChildren = [...rootFolders, ...orderedRootShortcuts];
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

  if (isFavoriteShortcutNode(node) || isFavoriteProjectionNode(node)) {
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
  const walk = (nodes) => {
    for (const child of nodes || []) {
      if (child.droppable && !isFavoriteProjectionNode(child)) {
        expanded[child.key] = true;
      }
      if (child.droppable || child.children?.length) {
        walk(child.children);
      }
    }
  };
  walk(root.children);
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
  const groupKeys = {};
  const parentMap = {};
  const orderedGroupIds = [];

  const walkFolder = (folder) => {
    if (!folder?.favoriteGroupId) return;
    orderedGroupIds.push(folder.favoriteGroupId);
    const kids = filterDisplayChildren(folder.children);
    groupKeys[folder.favoriteGroupId] = kids.map((node) => node.key);
    groupMemberOrder[folder.favoriteGroupId] = kids
      .filter(isFavoriteShortcutNode)
      .map((node) => node.favoriteId)
      .filter(Boolean);

    for (const child of kids) {
      if (isFavoriteGroupFolderNode(child) && child.favoriteGroupId) {
        parentMap[child.favoriteGroupId] = folder.favoriteGroupId;
        walkFolder(child);
      }
    }
  };

  for (const child of children) {
    rootKeys.push(child.key);

    if (isFavoriteGroupFolderNode(child) && child.favoriteGroupId) {
      parentMap[child.favoriteGroupId] = null;
      walkFolder(child);
      continue;
    }

    if (isFavoriteShortcutNode(child) && child.favoriteId) {
      rootShortcutIds.push(child.favoriteId);
    }
  }

  const groups = favoriteGroupsStore.getGroups();
  const defaultGroups = groups.filter((group) => group.isDefault);
  const userGroups = groups.filter((group) => !group.isDefault);
  for (const group of userGroups) {
    if (!(group.id in parentMap)) {
      parentMap[group.id] = group.parentId || null;
    }
  }

  const userGroupsById = new Map(userGroups.map((group) => [group.id, group]));
  const reorderedUserGroups = orderedGroupIds
    .map((groupId) => userGroupsById.get(groupId))
    .filter(Boolean);
  const missingUserGroups = userGroups.filter((group) => !orderedGroupIds.includes(group.id));

  if (reorderedUserGroups.length > 0) {
    favoriteGroupsStore.reorderGroups([...defaultGroups, ...reorderedUserGroups, ...missingUserGroups]);
  }

  favoriteGroupsStore.setGroupParents(parentMap);

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
    rootKeys,
    groupKeys
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

  if (isFavoriteProjectionNode(dragNode)) {
    return false;
  }

  if (!isFavoriteShortcutNode(dragNode) && !isFavoriteGroupFolderNode(dragNode)) {
    return false;
  }

  const placement = extractDragPlacement(treeValue, dragNode.key);
  const parentKey = placement?.parentKey || null;
  if (parentKey && parentKey !== FAVORITES_ROOT_KEY) {
    const parent = findNodeByKey(treeValue, parentKey);
    if (isFavoriteFolderShortcutNode(parent) || isFavoriteProjectionNode(parent)) {
      return false;
    }
  }
  if (isFavoriteGroupFolderNode(dragNode)) {
    if (dropNode?.key && (dropNode.key === dragNode.key || isDescendantTreeKey(dragNode, dropNode.key))) {
      return false;
    }
    const parentKey = placement?.parentKey || null;
    if (parentKey && parentKey !== FAVORITES_ROOT_KEY) {
      if (parentKey === dragNode.key || isDescendantTreeKey(dragNode, parentKey)) {
        return false;
      }
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
      } else if (!isFavoriteProjectionNode(node) && node.children?.length) {
        count += walk(node.children);
      }
    }
    return count;
  };

  return walk(root.children);
}
