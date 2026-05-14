import localStorageSyncService from '../services/LocalStorageSyncService';

const STORAGE_KEY_TREE = 'documents_encrypted';
const STORAGE_KEY_TREE_PLAIN = 'documentManagerNodes';

export const generateDocumentId = () => `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const generateFolderId = () => `docfolder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export async function loadDocumentTree(secureStorage, masterKey) {
  try {
    if (masterKey && secureStorage) {
      const encryptedData = localStorage.getItem(STORAGE_KEY_TREE);
      if (encryptedData) {
        const decrypted = await secureStorage.decryptData(
          JSON.parse(encryptedData),
          masterKey
        );
        return decrypted;
      }
      const plainData = localStorage.getItem(STORAGE_KEY_TREE_PLAIN);
      if (plainData) {
        const parsed = JSON.parse(plainData);
        const encrypted = await secureStorage.encryptData(parsed, masterKey);
        localStorage.setItem(STORAGE_KEY_TREE, JSON.stringify(encrypted));
        localStorage.removeItem(STORAGE_KEY_TREE_PLAIN);
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
      localStorage.setItem(STORAGE_KEY_TREE, encStr);
      localStorage.removeItem(STORAGE_KEY_TREE_PLAIN);
      localStorageSyncService.debouncedSync({ documents_encrypted: encStr });
    } else {
      const plainStr = JSON.stringify(tree);
      localStorage.setItem(STORAGE_KEY_TREE_PLAIN, plainStr);
      localStorageSyncService.debouncedSync({ documentManagerNodes: plainStr });
    }
  } catch (error) {
    console.error('Error saving documents:', error);
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
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  };
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
      createdAt: Date.now()
    }
  };
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

export function filterDocumentTree(tree, searchText) {
  if (!searchText || !searchText.trim()) return tree;
  const lower = searchText.toLowerCase();

  return tree.reduce((acc, node) => {
    if (node.label.toLowerCase().includes(lower)) {
      acc.push(node);
    } else if (node.children && node.children.length > 0) {
      const filteredChildren = filterDocumentTree(node.children, searchText);
      if (filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren });
      }
    }
    return acc;
  }, []);
}
