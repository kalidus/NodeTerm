import { useCallback, useState } from 'react';

export const useTreeOperations = ({
  nodes,
  setNodes,
  toast,
  deepCopy,
  findParentNodeAndIndex,
  onDragDropTree
}) => {
  // Estado para trackear el nodo que se está arrastrando
  const [draggedNodeKey, setDraggedNodeKey] = useState(null);
  // Helper para generar un key único e inmutable
  const generateUniqueKey = useCallback(() => {
    return `node_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  }, []);

  // Default tree data
  const getDefaultNodes = useCallback(() => [
    {
      key: generateUniqueKey(),
      label: 'Carpeta 1',
      droppable: true,
      children: [],
      uid: generateUniqueKey(),
      createdAt: new Date().toISOString(),
      isUserCreated: true
    },
    {
      key: generateUniqueKey(),
      label: 'Carpeta 2',
      droppable: true,
      children: [],
      uid: generateUniqueKey(),
      createdAt: new Date().toISOString(),
      isUserCreated: true
    }
  ], [generateUniqueKey]);

  // Function to regenerate keys for the entire tree
  const regenerateKeys = useCallback((nodes, parentKey = null) => {
    return nodes.map((node, index) => {
      const newKey = parentKey ? `${parentKey}-${index}` : index.toString();
      const newNode = {
        ...node,
        key: newKey
      };
      
      if (node.children && node.children.length > 0) {
        newNode.children = regenerateKeys(node.children, newKey);
      }
      
      return newNode;
    });
  }, []);

  // Helper function to update nodes with automatic key regeneration
  const updateNodesWithKeys = useCallback((newNodes, message = 'Operación completada') => {
    const nodesWithUpdatedKeys = regenerateKeys(newNodes);
    setNodes(nodesWithUpdatedKeys);
    return nodesWithUpdatedKeys;
  }, [regenerateKeys, setNodes]);

  // Function to find a node by UID (most robust)
  const findNodeByUID = useCallback((nodes, uid) => {
    for (let node of nodes) {
      if (node.uid === uid) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeByUID(node.children, uid);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Handle drop to root area
  const handleDropToRoot = useCallback((e) => {
    if (!draggedNodeKey) {
      return;
    }

    try {
      const nodesCopy = deepCopy(nodes);
      
      // Find and remove the dragged node from its current position
      const dragNodeInfo = findParentNodeAndIndex(nodesCopy, draggedNodeKey);
      if (dragNodeInfo.index === -1) {
        console.error("❌ Drag node not found for root drop:", draggedNodeKey);
        return;
      }
      
      const dragNode = dragNodeInfo.parentList[dragNodeInfo.index];
      
      // Remove from current position
      dragNodeInfo.parentList.splice(dragNodeInfo.index, 1);
      
      // Add to root level
      nodesCopy.push(dragNode);
      
      // Update nodes with key regeneration
      setNodes(nodesCopy);
      setDraggedNodeKey(null);
      
      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `"${dragNode.label}" movido a la raíz`,
        life: 3000
      });
    } catch (error) {
      console.error("❌ Error in drop to root:", error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: `Error al mover a la raíz: ${error.message}`,
        life: 5000
      });
    }
  }, [draggedNodeKey, nodes, deepCopy, findParentNodeAndIndex, setNodes, setDraggedNodeKey, toast]);

  // Handle drag and drop using the hook
  const onDragDrop = useCallback((event) => {
    // Usar la función del hook de tree management
    if (typeof onDragDropTree === 'function') {
      onDragDropTree(event, setNodes);
    }
  }, [setNodes]);

  return {
    // Estados
    draggedNodeKey,
    setDraggedNodeKey,
    
    // Funciones
    generateUniqueKey,
    getDefaultNodes,
    regenerateKeys,
    updateNodesWithKeys,
    findNodeByUID,
    handleDropToRoot,
    onDragDrop
  };
};
