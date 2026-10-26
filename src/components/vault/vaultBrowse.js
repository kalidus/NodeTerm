const SECRET_TYPES = ['password', 'crypto_wallet', 'api_key', 'secure_note'];

export const VAULT_SECTIONS = [
  { id: 'folders', title: 'Carpetas' },
  { id: 'passwords', title: 'Contraseñas' },
  { id: 'wallets', title: 'Wallets' },
  { id: 'api', title: 'Claves de API' },
  { id: 'notes', title: 'Notas' }
];

export function isVaultFolder(node) {
  return Boolean(node && (node.droppable || node.data?.type === 'password-folder'));
}

export function isVaultSecret(node) {
  const secretType = node?.data?.type;
  return Boolean(node?.data && SECRET_TYPES.includes(secretType));
}

function secretMatchesQuery(node, search) {
  const secretType = node.data?.type;
  let matches = (node.label || '').toLowerCase().includes(search)
    || (node.data.notes && node.data.notes.toLowerCase().includes(search));

  if (secretType === 'password') {
    matches = matches
      || (node.data.username && node.data.username.toLowerCase().includes(search))
      || (node.data.password && node.data.password.toLowerCase().includes(search))
      || (node.data.url && node.data.url.toLowerCase().includes(search))
      || (node.data.group && node.data.group.toLowerCase().includes(search));
  } else if (secretType === 'crypto_wallet') {
    matches = matches
      || (node.data.address && node.data.address.toLowerCase().includes(search))
      || (node.data.network && node.data.network.toLowerCase().includes(search))
      || (node.data.seedPhrase && node.data.seedPhrase.toLowerCase().includes(search));
  } else if (secretType === 'api_key') {
    matches = matches
      || (node.data.serviceName && node.data.serviceName.toLowerCase().includes(search))
      || (node.data.apiKey && node.data.apiKey.toLowerCase().includes(search))
      || (node.data.endpoint && node.data.endpoint.toLowerCase().includes(search));
  } else if (secretType === 'secure_note') {
    matches = matches || (node.data.noteContent && node.data.noteContent.toLowerCase().includes(search));
  }

  return matches;
}

/** Lista plana de carpetas y secretos que coinciden con la búsqueda. */
export function collectSearchHits(nodes, searchTerm) {
  const search = (searchTerm || '').trim().toLowerCase();
  if (!search) return [];
  const hits = [];

  const walk = (list) => {
    (list || []).forEach((node) => {
      if (!node || node.data?.isShowMoreBtn) return;
      if (isVaultSecret(node)) {
        if (secretMatchesQuery(node, search)) hits.push(node);
        return;
      }
      if (isVaultFolder(node)) {
        if ((node.label || '').toLowerCase().includes(search)) hits.push(node);
        walk(node.children);
      }
    });
  };

  walk(nodes);
  return hits;
}

export function findFolderPath(nodes, key, trail = []) {
  for (const node of nodes || []) {
    if (!node || node.data?.isShowMoreBtn) continue;
    if (node.key === key && isVaultFolder(node)) return [...trail, node.key];
    if (node.children && node.children.length) {
      const nextTrail = isVaultFolder(node) ? [...trail, node.key] : trail;
      const found = findFolderPath(node.children, key, nextTrail);
      if (found) return found;
    }
  }
  return null;
}

export function resolveBrowse(nodes, stack) {
  const crumbs = [{ key: null, label: 'Vault' }];
  let children = nodes || [];
  const nextStack = [];

  for (const key of stack || []) {
    const folder = children.find((node) => node && node.key === key && isVaultFolder(node));
    if (!folder) break;
    nextStack.push(key);
    crumbs.push({ key: folder.key, label: folder.label || 'Carpeta' });
    children = folder.children || [];
  }

  return {
    crumbs,
    stack: nextStack,
    children: children.filter((node) => node && !node.data?.isShowMoreBtn && (isVaultFolder(node) || isVaultSecret(node)))
  };
}

export function vaultTypeLabel(node) {
  if (isVaultFolder(node)) return 'Carpeta';
  switch (node?.data?.type) {
    case 'crypto_wallet':
      return 'Wallet';
    case 'api_key':
      return 'Clave de API';
    case 'secure_note':
      return 'Nota';
    default:
      return 'Contraseña';
  }
}

export function vaultSubtitle(node) {
  if (isVaultFolder(node)) {
    const count = (node.children || []).filter((child) => child && !child.data?.isShowMoreBtn).length;
    return count === 1 ? '1 elemento' : `${count} elementos`;
  }
  const type = node?.data?.type || 'password';
  if (type === 'password') return node.data?.username || 'Contraseña';
  if (type === 'crypto_wallet') return node.data?.network || node.data?.address || 'Wallet';
  if (type === 'api_key') return node.data?.serviceName || 'Clave de API';
  if (type === 'secure_note') return 'Nota segura';
  return 'Secreto';
}

export function vaultSectionId(node) {
  if (isVaultFolder(node)) return 'folders';
  switch (node?.data?.type) {
    case 'crypto_wallet':
      return 'wallets';
    case 'api_key':
      return 'api';
    case 'secure_note':
      return 'notes';
    default:
      return 'passwords';
  }
}
