import localStorageSyncService from '../services/LocalStorageSyncService';
import { setVaultEncryptedItem } from '../shared/vault-write';
import { mimeForName, extensionOf } from '../shared/library-mime';

const STORAGE_KEY_TREE = 'documents_encrypted';
const STORAGE_KEY_TREE_PLAIN = 'documentManagerNodes';

export const generateDocumentId = () => `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const generateFolderId = () => `docfolder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const generateLibraryFileId = () => `libfile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const generateLinkedFolderId = () => `libmount_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const generateCloudFolderId = () => `libcloud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export async function loadDocumentTree(secureStorage, masterKey) {
  try {
    if (masterKey && secureStorage) {
      const encryptedData = localStorage.getItem(STORAGE_KEY_TREE);
      if (encryptedData) {
        const decrypted = await secureStorage.decryptStorageKeyCached(
          STORAGE_KEY_TREE,
          masterKey
        );
        return Array.isArray(decrypted) ? decrypted : [];
      }
      const plainData = localStorage.getItem(STORAGE_KEY_TREE_PLAIN);
      if (plainData) {
        const parsed = JSON.parse(plainData);
        const encrypted = await secureStorage.encryptData(parsed, masterKey);
        const encStr = JSON.stringify(encrypted);
        const wrote = setVaultEncryptedItem(STORAGE_KEY_TREE, encStr);
        if (wrote.ok) {
          localStorage.removeItem(STORAGE_KEY_TREE_PLAIN);
          localStorageSyncService.debouncedSync({ [STORAGE_KEY_TREE]: encStr });
        }
        return parsed;
      }
      return [];
    }
    const saved = localStorage.getItem(STORAGE_KEY_TREE_PLAIN);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading documents:', error);
    return [];
  }
}

export async function saveDocumentTree(tree, secureStorage, masterKey) {
  try {
    if (masterKey && secureStorage) {
      const encrypted = await secureStorage.encryptData(tree, masterKey);
      const encStr = JSON.stringify(encrypted);
      const wrote = setVaultEncryptedItem(STORAGE_KEY_TREE, encStr);
      if (!wrote.ok) {
        console.error(
          '[DocumentsVault] Guardado rechazado:',
          wrote.reason || 'unknown'
        );
        return false;
      }
      localStorage.removeItem(STORAGE_KEY_TREE_PLAIN);
      localStorageSyncService.debouncedSync({ documents_encrypted: encStr });
      return true;
    }
    const plainStr = JSON.stringify(tree);
    localStorage.setItem(STORAGE_KEY_TREE_PLAIN, plainStr);
    localStorageSyncService.debouncedSync({ documentManagerNodes: plainStr });
    return true;
  } catch (error) {
    console.error('Error saving documents:', error);
    return false;
  }
}

export function createDocumentNode(label) {
  return {
    key: generateDocumentId(),
    label,
    type: 'document',
    data: {
      type: 'document',
      content: '',
      markdownSource: '',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  };
}

/** Extrae texto plano de HTML para búsqueda. */
function htmlToSearchText(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Recolecta etiquetas únicas del árbol de documentos. */
export function collectAllTags(tree, acc = new Set()) {
  if (!Array.isArray(tree)) return [...acc].sort();
  for (const node of tree) {
    const tags = node?.data?.tags;
    if (Array.isArray(tags)) {
      tags.forEach((t) => {
        if (t && typeof t === 'string') acc.add(t.toLowerCase());
      });
    }
    if (node.children?.length) collectAllTags(node.children, acc);
  }
  return [...acc].sort();
}

export function createFolderNode(label) {
  return {
    key: generateFolderId(),
    label,
    type: 'document-folder',
    droppable: true,
    children: [],
    data: {
      type: 'document-folder',
      createdAt: Date.now(),
      vaultMode: 'plain',
      syncMode: 'none'
    }
  };
}

/**
 * Nodo de archivo de la biblioteca (PDF, imagen, vídeo, texto...).
 * `managed` apunta a un blob copiado bajo library/ (relPath);
 * `linked` apunta a un archivo que sigue viviendo donde estaba (absPath).
 *
 * @param {{ label: string, storage?: 'managed'|'linked', relPath?: string,
 *           absPath?: string, mime?: string, size?: number, hash?: string,
 *           origin?: object, tags?: string[] }} options
 */
export function createLibraryFileNode(options = {}) {
  const label = options.label || 'archivo';
  const storage = options.storage === 'linked' ? 'linked' : 'managed';
  const now = Date.now();
  return {
    key: generateLibraryFileId(),
    label,
    type: 'library-file',
    droppable: false,
    data: {
      type: 'library-file',
      storage,
      relPath: storage === 'managed' ? options.relPath || '' : null,
      absPath: storage === 'linked' ? options.absPath || '' : null,
      mime: options.mime || mimeForName(label),
      ext: extensionOf(label),
      size: Number(options.size) || 0,
      hash: options.hash || '',
      origin: options.origin || { kind: 'local', ref: '', fetchedAt: now },
      tags: Array.isArray(options.tags) ? options.tags : [],
      createdAt: now,
      updatedAt: now
    }
  };
}

/**
 * Carpeta local montada en la biblioteca. Sus hijos se listan bajo demanda
 * y nunca se persisten en el árbol.
 */
export function createLinkedFolderNode(label, absPath) {
  return {
    key: generateLinkedFolderId(),
    label: label || absPath || 'Carpeta enlazada',
    type: 'linked-folder',
    droppable: false,
    leaf: false,
    children: [],
    data: {
      type: 'linked-folder',
      absPath: absPath || '',
      lazy: true,
      createdAt: Date.now()
    }
  };
}

/**
 * Carpeta de Nextcloud montada. Guarda solo la ruta remota: las credenciales
 * no entran en el árbol y los archivos se leen al abrirlos.
 */
export function createCloudFolderNode(label, remotePath) {
  const clean = String(remotePath || '').replace(/^\/+|\/+$/g, '');
  return {
    key: generateCloudFolderId(),
    label: label || clean.split('/').pop() || 'Nextcloud',
    type: 'cloud-folder',
    droppable: false,
    leaf: false,
    children: [],
    data: {
      type: 'cloud-folder',
      remotePath: clean,
      lazy: true,
      createdAt: Date.now()
    }
  };
}

const DEFAULT_FOLDER_POLICY = { vaultMode: 'plain', syncMode: 'none' };

/**
 * Política de cifrado/sync efectiva de una carpeta: la propia si la declara,
 * si no la del ancestro más cercano que la declare.
 *
 * @returns {{ vaultMode: 'plain'|'encrypted', syncMode: 'none'|'nextcloud',
 *             inheritedFrom: string|null }}
 */
export function resolveFolderPolicy(tree, folderKey) {
  if (!folderKey) return { ...DEFAULT_FOLDER_POLICY, inheritedFrom: null };

  const trail = [];
  const walk = (nodes, path) => {
    for (const node of nodes || []) {
      if (!node) continue;
      const nextPath = [...path, node];
      if (node.key === folderKey) {
        trail.push(...nextPath);
        return true;
      }
      if (node.children?.length && walk(node.children, nextPath)) return true;
    }
    return false;
  };
  walk(tree || [], []);
  if (!trail.length) return { ...DEFAULT_FOLDER_POLICY, inheritedFrom: null };

  const policy = { ...DEFAULT_FOLDER_POLICY, inheritedFrom: null };
  let vaultSource = null;
  let syncSource = null;
  for (const node of trail) {
    const data = node?.data || {};
    if (data.vaultMode === 'plain' || data.vaultMode === 'encrypted') {
      policy.vaultMode = data.vaultMode;
      vaultSource = node.key;
    }
    if (data.syncMode === 'none' || data.syncMode === 'nextcloud') {
      policy.syncMode = data.syncMode;
      syncSource = node.key;
    }
  }
  const ownKey = trail[trail.length - 1]?.key;
  const source = vaultSource && vaultSource !== ownKey ? vaultSource : (syncSource !== ownKey ? syncSource : null);
  policy.inheritedFrom = source || null;
  return policy;
}

/** Recorre el árbol y devuelve todos los nodos de archivo managed con su carpeta. */
export function collectManagedFiles(tree, parentKey = null, acc = []) {
  for (const node of tree || []) {
    if (!node) continue;
    if (node.data?.type === 'library-file' && node.data?.storage === 'managed') {
      acc.push({ node, folderKey: parentKey });
    }
    if (node.children?.length) collectManagedFiles(node.children, node.key, acc);
  }
  return acc;
}

export function addNodeToTree(tree, parentKey, newNode) {
  if (!parentKey) {
    return [...tree, newNode];
  }

  return tree.map(node => {
    if (node.key === parentKey) {
      return {
        ...node,
        children: [...(node.children || []), newNode]
      };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: addNodeToTree(node.children, parentKey, newNode)
      };
    }
    return node;
  });
}

export function removeNodeFromTree(tree, nodeKey) {
  return tree
    .filter(node => node.key !== nodeKey)
    .map(node => {
      if (node.children && node.children.length > 0) {
        return { ...node, children: removeNodeFromTree(node.children, nodeKey) };
      }
      return node;
    });
}

export function updateNodeInTree(tree, nodeKey, updates) {
  return tree.map(node => {
    if (node.key === nodeKey) {
      return {
        ...node,
        ...updates,
        data: { ...node.data, ...updates.data, updatedAt: Date.now() }
      };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeInTree(node.children, nodeKey, updates)
      };
    }
    return node;
  });
}

export function findNodeInTree(tree, nodeKey) {
  for (const node of tree) {
    if (node.key === nodeKey) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, nodeKey);
      if (found) return found;
    }
  }
  return null;
}

function nodeMatchesSearch(node, lower) {
  if (!lower) return true;
  if ((node.label || '').toLowerCase().includes(lower)) return true;
  const tags = node.data?.tags;
  if (Array.isArray(tags) && tags.some((t) => String(t).toLowerCase().includes(lower))) {
    return true;
  }
  const md = (node.data?.markdownSource || '').toLowerCase();
  if (md.includes(lower)) return true;
  const content = htmlToSearchText(node.data?.content || '');
  if (content.includes(lower)) return true;
  return false;
}

function nodeHasTag(node, tagFilter) {
  if (!tagFilter) return true;
  const tags = node.data?.tags;
  if (!Array.isArray(tags)) return false;
  return tags.some((t) => String(t).toLowerCase() === tagFilter.toLowerCase());
}

/**
 * Filtra el árbol por texto (título, tags, contenido) y/o etiqueta exacta.
 * @param {Array} tree
 * @param {string} searchText
 * @param {string} [tagFilter]
 */
export function filterDocumentTree(tree, searchText, tagFilter = '') {
  const lower = (searchText || '').trim().toLowerCase();
  const tag = (tagFilter || '').trim().toLowerCase();
  if (!lower && !tag) return tree;

  return tree.reduce((acc, node) => {
    const isFolder =
      node.droppable ||
      node.data?.type === 'document-folder' ||
      node.data?.type === 'linked-folder';
    const filteredChildren =
      node.children && node.children.length > 0
        ? filterDocumentTree(node.children, searchText, tagFilter)
        : [];

    if (isFolder) {
      if (filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren });
      } else if (!tag && lower && (node.label || '').toLowerCase().includes(lower)) {
        acc.push(node);
      }
      return acc;
    }

    const matchesText = nodeMatchesSearch(node, lower);
    const matchesTag = nodeHasTag(node, tag);
    if (matchesText && matchesTag) {
      acc.push(node);
    }
    return acc;
  }, []);
}
