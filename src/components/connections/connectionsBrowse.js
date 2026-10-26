const SESSION_TYPES = ['ssh', 'rdp', 'rdp-guacamole', 'vnc', 'vnc-guacamole', 'sftp', 'ftp', 'scp', 'ssh-tunnel'];
const FILE_TYPES = ['sftp', 'ftp', 'scp'];
const RDP_TYPES = ['rdp', 'rdp-guacamole'];
const VNC_TYPES = ['vnc', 'vnc-guacamole'];

export const PROTOCOL_SECTIONS = [
  { id: 'folders', title: 'Carpetas' },
  { id: 'ssh', title: 'SSH' },
  { id: 'rdp', title: 'RDP' },
  { id: 'vnc', title: 'VNC' },
  { id: 'files', title: 'Archivos' },
  { id: 'tunnels', title: 'Túneles' },
  { id: 'other', title: 'Otros' }
];

export const STATUS_SECTIONS = [
  { id: 'folders', title: 'Carpetas' },
  { id: 'connected', title: 'Conectadas' },
  { id: 'favorites', title: 'Favoritas' },
  { id: 'rest', title: 'Resto' }
];

export function nodeType(node) {
  return String(node?.data?.type || node?.type || '').toLowerCase();
}

export function isConnectionFolder(node) {
  if (!node || node.data?.isShowMoreBtn) return false;
  if (node.droppable === true) return true;
  if (SESSION_TYPES.includes(nodeType(node))) return false;
  return Array.isArray(node.children) && node.children.length > 0;
}

export function isSessionConnection(node) {
  if (!node || isConnectionFolder(node) || node.data?.isShowMoreBtn) return false;
  return SESSION_TYPES.includes(nodeType(node));
}

export function isBrowsableConnectionItem(node) {
  return Boolean(node && !node.data?.isShowMoreBtn && (isConnectionFolder(node) || node.data || node.label));
}

export function protocolLabel(node) {
  const type = nodeType(node);
  if (isConnectionFolder(node)) return 'Carpeta';
  if (type === 'ssh') return 'SSH';
  if (RDP_TYPES.includes(type)) return 'RDP';
  if (VNC_TYPES.includes(type)) return 'VNC';
  if (FILE_TYPES.includes(type)) return (node.data?.protocol || type).toUpperCase();
  if (type === 'ssh-tunnel') return 'Túnel';
  if (type === 'password' || type === 'crypto_wallet' || type === 'api_key' || type === 'secure_note') return 'Secreto';
  if (type === 'document' || type === 'quick-note') return 'Nota';
  return type ? type.toUpperCase() : 'Conexión';
}

export function connectionHost(node) {
  return node?.data?.host || node?.data?.ip || node?.data?.hostname || '';
}

export function connectionUser(node) {
  return node?.data?.username || node?.data?.user || '';
}

export function connectionSubtitle(node) {
  if (isConnectionFolder(node)) {
    const count = (node.children || []).filter((child) => child && !child.data?.isShowMoreBtn).length;
    return count === 1 ? '1 elemento' : `${count} elementos`;
  }
  return connectionHost(node) || protocolLabel(node);
}

export function protocolSectionId(node) {
  if (isConnectionFolder(node)) return 'folders';
  const type = nodeType(node);
  if (type === 'ssh') return 'ssh';
  if (RDP_TYPES.includes(type)) return 'rdp';
  if (VNC_TYPES.includes(type)) return 'vnc';
  if (FILE_TYPES.includes(type)) return 'files';
  if (type === 'ssh-tunnel') return 'tunnels';
  return 'other';
}

function nodeMatchesQuery(node, search) {
  if ((node.label || '').toLowerCase().includes(search)) return true;
  if (connectionHost(node).toLowerCase().includes(search)) return true;
  if (connectionUser(node).toLowerCase().includes(search)) return true;
  if (nodeType(node).includes(search)) return true;
  if ((node.data?.protocol || '').toLowerCase().includes(search)) return true;
  return false;
}

export function collectSearchHits(nodes, searchTerm) {
  const search = (searchTerm || '').trim().toLowerCase();
  if (!search) return [];
  const hits = [];
  const walk = (list) => {
    (list || []).forEach((node) => {
      if (!node || node.data?.isShowMoreBtn) return;
      if (isConnectionFolder(node)) {
        if ((node.label || '').toLowerCase().includes(search)) hits.push(node);
        walk(node.children);
        return;
      }
      if (nodeMatchesQuery(node, search)) hits.push(node);
    });
  };
  walk(nodes);
  return hits;
}

export function findFolderPath(nodes, key, trail = []) {
  for (const node of nodes || []) {
    if (!node || node.data?.isShowMoreBtn) continue;
    if (node.key === key && isConnectionFolder(node)) return [...trail, node.key];
    if (node.children && node.children.length) {
      const nextTrail = isConnectionFolder(node) ? [...trail, node.key] : trail;
      const found = findFolderPath(node.children, key, nextTrail);
      if (found) return found;
    }
  }
  return null;
}

export function resolveBrowse(nodes, stack, rootLabel = 'Conexiones') {
  const crumbs = [{ key: null, label: rootLabel }];
  let children = nodes || [];
  const nextStack = [];

  for (const key of stack || []) {
    const folder = children.find((node) => node && node.key === key && isConnectionFolder(node));
    if (!folder) break;
    nextStack.push(key);
    crumbs.push({ key: folder.key, label: folder.label || 'Carpeta' });
    children = folder.children || [];
  }

  return {
    crumbs,
    stack: nextStack,
    children: (children || []).filter((node) => node && !node.data?.isShowMoreBtn && isBrowsableConnectionItem(node))
  };
}

export function statusSectionId(node, { openSessionNodeKeys, isFavoriteFn, sessionKey }) {
  if (isConnectionFolder(node)) return 'folders';
  if (openSessionNodeKeys?.has?.(sessionKey)) return 'connected';
  if (isFavoriteFn?.(node)) return 'favorites';
  return 'rest';
}
