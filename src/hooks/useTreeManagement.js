import { useCallback } from 'react';
import connectionStore from '../utils/connectionStore';

export const useTreeManagement = ({ toast, confirmDialog }) => {

  // ============ UTILIDADES BÁSICAS ============

  // Function to create a deep copy of nodes
  const deepCopy = useCallback((obj) => {
    return JSON.parse(JSON.stringify(obj));
  }, []);

  // Generate next key based on parent key (simplified - will be regenerated anyway)
  const generateNextKey = useCallback((parentKey) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);

    if (parentKey === null) {
      // Root level - use timestamp for uniqueness
      return `temp_root_${timestamp}_${random}`;
    } else {
      // Child level - include parent reference
      return `temp_${parentKey}_${timestamp}_${random}`;
    }
  }, []);

  // ============ FUNCIONES DE BÚSQUEDA ============

  // Function to find a node by key (recursive search)
  const findNodeByKey = useCallback((nodes, key) => {
    if (key === null) return null;

    for (let node of nodes) {
      if (node.key === key) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Function to find parent node and index (recursive search)
  const findParentNodeAndIndex = useCallback((nodes, key) => {
    // Search recursively through all levels
    const searchInLevel = (currentNodes, parentNode = null) => {
      for (let i = 0; i < currentNodes.length; i++) {
        if (currentNodes[i].key === key) {
          return {
            parentNode,
            parentList: currentNodes,
            index: i,
            node: currentNodes[i]
          };
        }

        if (currentNodes[i].children) {
          const result = searchInLevel(currentNodes[i].children, currentNodes[i]);
          if (result.index !== -1) return result;
        }
      }
      return { parentNode: null, parentList: null, index: -1, node: null };
    };

    return searchInLevel(nodes);
  }, []);

  // Function to find parent and index by UID
  const findParentNodeAndIndexByUID = useCallback((nodes, uid) => {
    const searchInLevel = (currentNodes, parentNode = null) => {
      for (let i = 0; i < currentNodes.length; i++) {
        if (currentNodes[i].uid === uid) {
          return {
            parentNode,
            parentList: currentNodes,
            index: i,
            node: currentNodes[i]
          };
        }

        if (currentNodes[i].children) {
          const result = searchInLevel(currentNodes[i].children, currentNodes[i]);
          if (result.index !== -1) return result;
        }
      }
      return { parentNode: null, parentList: null, index: -1, node: null };
    };

    return searchInLevel(nodes);
  }, []);

  // Function to find a node by unique properties (more robust than key-only search)
  const findNodeByProperties = useCallback((nodes, targetNode) => {
    for (let node of nodes) {
      if (node.label === targetNode.label &&
        node.data?.type === targetNode.data?.type &&
        node.data?.host === targetNode.data?.host) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeByProperties(node.children, targetNode);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // ============ FUNCIONES DE MANIPULACIÓN DEL ÁRBOL ============

  // Helper para eliminar un nodo por key en todo el árbol
  const removeNodeByKey = useCallback((tree, key) => {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i].key === key) {
        tree.splice(i, 1);
        return true;
      }
      if (tree[i].children) {
        if (removeNodeByKey(tree[i].children, key)) return true;
      }
    }
    return false;
  }, []);

  // Clona el árbol y actualiza solo el subárbol con la key indicada
  const cloneTreeWithUpdatedNode = useCallback((tree, targetKey, updateFn) => {
    return tree.map(node => {
      if (node.key === targetKey) {
        return updateFn({ ...node });
      }
      if (node.children) {
        return { ...node, children: cloneTreeWithUpdatedNode(node.children, targetKey, updateFn) };
      }
      return node;
    });
  }, []);

  // Recursive helper to remove favorites
  const removeFavoritesRecursively = useCallback((node) => {
    if (!node) return;

    // 1. Remove if it's an individual connection
    if (node.data && node.data.type) {
      try {
        const conn = connectionStore.helpers.fromSidebarNode(node);
        if (conn && conn.id) {
          // Attempt to remove by exact ID
          console.log(`[useTreeManagement] Finding favorites to remove for: ${conn.id}`);
          connectionStore.removeFavorite(conn.id);

          // Fallback: also try to find by host/user/type properties in case ID format differed
          const allFavorites = connectionStore.getFavorites();
          const propsMatch = allFavorites.find(f =>
            f.type === conn.type &&
            f.host === conn.host &&
            f.username === conn.username &&
            (String(f.port) === String(conn.port))
          );

          if (propsMatch && propsMatch.id !== conn.id) {
            console.log(`[useTreeManagement] Removing matching favorite by properties: ${propsMatch.id}`);
            connectionStore.removeFavorite(propsMatch.id);
          }
        }
      } catch (e) {
        console.error('[useTreeManagement] Error removing favorite connection:', e);
      }
    }

    // 2. Remove if it's a folder (group) in favorites
    if (node.droppable) {
      try {
        console.log(`[useTreeManagement] Removing folder/group from favorites: ${node.uid || node.key}`);
        connectionStore.removeGroupFromFavorites(node.uid || node.key, node.label);
      } catch (e) {
        console.error('[useTreeManagement] Error removing favorite folder:', e);
      }
    }

    // 3. Process children recursively
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => removeFavoritesRecursively(child));
    }
  }, []);

  // Delete node (folder or file) with multiple search strategies
  const deleteNode = useCallback((nodes, setNodes, nodeKey) => {
    try {
      const nodesCopy = deepCopy(nodes);

      // Strategy 1: Try finding by key first
      let nodeInfo = findParentNodeAndIndex(nodesCopy, nodeKey);

      // Strategy 2: If key search fails, try finding by UID or properties
      if (nodeInfo.index === -1) {
        // First get the original node from current state to extract UID
        const originalNodeInfo = findParentNodeAndIndex(nodes, nodeKey);
        if (originalNodeInfo.index !== -1) {
          const originalNode = originalNodeInfo.parentList[originalNodeInfo.index];

          if (originalNode.uid) {
            nodeInfo = findParentNodeAndIndexByUID(nodesCopy, originalNode.uid);
          }

          // Strategy 3: If UID also fails, try by properties
          if (nodeInfo.index === -1) {
            const foundNode = findNodeByProperties(nodesCopy, originalNode);
            if (foundNode) {
              nodeInfo = findParentNodeAndIndex(nodesCopy, foundNode.key);
            }
          }
        }
      }

      if (nodeInfo.index === -1) {
        console.error("❌ Node not found with any strategy:", nodeKey);
        if (toast) {
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo encontrar el elemento a eliminar',
            life: 3000
          });
        }
        return false;
      }

      // Save node to remove from favorites before splicing
      const nodeToRemove = nodeInfo.node;

      // Remove the node from tree
      nodeInfo.parentList.splice(nodeInfo.index, 1);
      setNodes(nodesCopy);

      // Also remove from favorites (recursively if folder)
      removeFavoritesRecursively(nodeToRemove);

      if (toast) {
        toast.current?.show({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Elemento eliminado correctamente',
          life: 3000
        });
      }

      return true;
    } catch (error) {
      console.error("❌ Error deleting node:", error);
      if (toast) {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al eliminar el elemento',
          life: 3000
        });
      }
      return false;
    }
  }, [deepCopy, findParentNodeAndIndex, findParentNodeAndIndexByUID, findNodeByProperties, toast, removeFavoritesRecursively]);

  // Handle drag and drop with UID preservation
  const onDragDrop = useCallback((event, setNodes) => {
    const { dragNode, dropNode, dropPoint, value } = event;

    // Solo permitir drag and drop si el nodo de destino es una carpeta (droppable = true)
    // Esto evita que se pueda arrastrar cualquier cosa a una sesión SSH
    const isDropNodeFolder = dropNode && dropNode.droppable === true;
    const isDropNodeSession = dropNode && dropNode.data && dropNode.data.type === 'ssh';

    if (dropPoint === 0 && isDropNodeFolder) {
      // Permitir arrastrar cualquier cosa (carpetas o sesiones) a una carpeta
      const newValue = cloneTreeWithUpdatedNode(value, dropNode.key, (parent) => {
        // Eliminar cualquier instancia del nodo movido
        parent.children = parent.children.filter(n => n.key !== dragNode.key);
        // Insertar al principio
        parent.children = [dragNode, ...parent.children];
        return parent;
      });
      setNodes(newValue);
    } else if (dropPoint === 0 && isDropNodeSession) {
      // Si se intenta arrastrar algo a una sesión SSH, mostrar mensaje de error
      if (toast) {
        toast.current?.show({
          severity: 'warn',
          summary: 'Operación no permitida',
          detail: 'No se puede arrastrar elementos dentro de una sesión SSH. Solo las carpetas pueden contener otros elementos.',
          life: 4000
        });
      }
    } else {
      setNodes([...value]);
    }
  }, [cloneTreeWithUpdatedNode, toast]);

  // Confirm node deletion
  const confirmDeleteNode = useCallback((nodeKey, nodeName, hasChildren, nodes, setNodes) => {
    const message = hasChildren
      ? `¿Estás seguro de que deseas eliminar la carpeta "${nodeName}" y todo su contenido?`
      : `¿Estás seguro de que deseas eliminar "${nodeName}"?`;

    confirmDialog({
      message: message,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => deleteNode(nodes, setNodes, nodeKey),
      reject: () => { }
    });
  }, [confirmDialog, deleteNode]);

  return {
    // Utilidades básicas
    deepCopy,
    generateNextKey,

    // Funciones de búsqueda
    findNodeByKey,
    findParentNodeAndIndex,
    findParentNodeAndIndexByUID,
    findNodeByProperties,

    // Funciones de manipulación
    removeNodeByKey,
    cloneTreeWithUpdatedNode,
    deleteNode,
    onDragDrop,

    // Funciones de confirmación
    confirmDeleteNode
  };
};
