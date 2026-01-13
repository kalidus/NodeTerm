import { useCallback } from 'react';

export const useSplitManagement = ({
  activeGroupId,
  setActiveGroupId,
  activeTabIndex,
  setActiveTabIndex,
  setGroupActiveIndices,
  sshTabs,
  setSshTabs,
  homeTabs,
  fileExplorerTabs,
  toast
}) => {
  // Función helper para contar terminales en un árbol de splits
  const countTerminals = useCallback((node) => {
    if (!node) return 0;
    if (node.type === 'terminal') return 1;
    if (node.type === 'split') {
      return countTerminals(node.first) + countTerminals(node.second);
    }
    return 0;
  }, []);

  // Función helper para encontrar todos los terminales en el árbol
  const getAllTerminals = useCallback((node, result = []) => {
    if (!node) return result;
    if (node.type === 'terminal') {
      result.push(node);
      return result;
    }
    if (node.type === 'split') {
      getAllTerminals(node.first, result);
      getAllTerminals(node.second, result);
    }
    return result;
  }, []);

  // Función para abrir una sesión en split con otra pestaña existente
  // Sistema de splits anidados - cada panel se puede dividir horizontal o verticalmente
  const openInSplit = useCallback((sshNode, existingTab, orientation = 'vertical', targetPath = null) => {
    // Si no estamos en el grupo Home, cambiar a Home primero
    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: activeTabIndex
      }));
      setActiveGroupId(null);
    }

    // Crear nueva sesión SSH para el split
    const newTabId = `${sshNode.key}_${Date.now()}`;
    const sshConfig = {
      host: sshNode.data.useBastionWallix ? sshNode.data.targetServer : sshNode.data.host,
      username: sshNode.data.user,
      password: sshNode.data.password,
      port: sshNode.data.port || 22,
      originalKey: sshNode.key,
      name: sshNode.label,
      useBastionWallix: sshNode.data.useBastionWallix || false,
      bastionHost: sshNode.data.bastionHost || '',
      bastionUser: sshNode.data.bastionUser || ''
    };

    const newTerminal = {
      key: newTabId,
      label: sshNode.label,
      originalKey: sshNode.key,
      sshConfig: sshConfig,
      type: 'terminal'
    };

    // Verificar límite de 4 terminales
    const tab = sshTabs.find(t => t.key === existingTab.key);
    const currentTerminalCount = tab?.type === 'split' ? countTerminals(tab) : 1;
    
    if (currentTerminalCount >= 4) {
      toast.current.show({
        severity: 'warn',
        summary: 'Límite alcanzado',
        detail: 'Ya tienes 4 terminales en esta pestaña (máximo permitido)',
        life: 3000
      });
      return;
    }

    // Función helper para dividir un nodo en el árbol de splits
    const splitNode = (node, path, newTerm, orient) => {
      if (!path || path.length === 0) {
        // Este es el nodo a dividir
        return {
          type: 'split',
          orientation: orient,
          first: node,
          second: newTerm
        };
      }
      
      // Navegar más profundo en el árbol
      const [next, ...rest] = path;
      if (node.type === 'split') {
        if (next === 'first') {
          return {
            ...node,
            first: splitNode(node.first, rest, newTerm, orient)
          };
        } else if (next === 'second') {
          return {
            ...node,
            second: splitNode(node.second, rest, newTerm, orient)
          };
        }
      }
      return node;
    };

    setSshTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab => {
        if (tab.key === existingTab.key) {
          // Si ya es un split, dividir el nodo especificado
          if (tab.type === 'split') {
            const newSplitTree = splitNode(tab, targetPath, newTerminal, orientation);
            const termCount = countTerminals(newSplitTree);
            const allTerms = getAllTerminals(newSplitTree);
            
            return {
              ...tab,
              ...newSplitTree,
              label: `Split (${termCount}/4): ${allTerms.map(t => t.label).slice(0, 2).join(' | ')}${termCount > 2 ? '...' : ''}`
            };
          }
          
          // Si es una pestaña normal, convertirla en split simple
          const existingTerminal = {
            key: tab.key,
            label: tab.label,
            originalKey: tab.originalKey,
            sshConfig: tab.sshConfig,
            type: 'terminal'
          };
          
          return {
            ...tab,
            type: 'split',
            orientation: orientation,
            first: existingTerminal,
            second: newTerminal,
            label: `Split (2/4): ${tab.label} | ${sshNode.label}`
          };
        }
        return tab;
      });
      
      // Buscar el índice real de la pestaña split
      const splitTabKey = existingTab.key;
      const allTabs = [...homeTabs, ...updatedTabs, ...fileExplorerTabs];
      const splitTabIndex = allTabs.findIndex(tab => tab.key === splitTabKey);
      if (splitTabIndex !== -1) {
        setActiveTabIndex(splitTabIndex);
        setGroupActiveIndices(prev => ({
          ...prev,
          'no-group': splitTabIndex
        }));
      }
      return updatedTabs;
    });

    const newTerminalCount = currentTerminalCount + 1;
    
    toast.current.show({
      severity: 'success',
      summary: 'Split creado',
      detail: `Terminal ${sshNode.label} agregado (${newTerminalCount}/4 terminales)`,
      life: 3000
    });
  }, [activeGroupId, activeTabIndex, setGroupActiveIndices, setActiveGroupId, sshTabs, setSshTabs, homeTabs, fileExplorerTabs, setActiveTabIndex, toast, countTerminals, getAllTerminals]);

  // Función para cerrar un panel del split (sistema de árbol anidado)
  const handleCloseSplitPanel = useCallback((splitTabKey, path) => {
    // Función helper para remover un nodo del árbol
    const removeNode = (node, nodePath) => {
      if (!node) return null;
      
      if (!nodePath || nodePath.length === 0) {
        // Este nodo debe ser removido, retornar null
        return null;
      }
      
      if (nodePath.length === 1) {
        // El próximo nivel es el que se debe remover
        const direction = nodePath[0];
        if (node.type === 'split') {
          // Retornar el otro lado del split
          const result = direction === 'first' ? node.second : node.first;
          return result;
        }
        // Si no es split, no debería pasar, pero retornar null
        return null;
      }
      
      // Navegar más profundo
      const [next, ...rest] = nodePath;
      if (node.type === 'split') {
        if (next === 'first') {
          const newFirst = removeNode(node.first, rest);
          if (!newFirst) {
            // Si el first fue removido completamente, retornar solo el second
            return node.second;
          }
          return { ...node, first: newFirst };
        } else if (next === 'second') {
          const newSecond = removeNode(node.second, rest);
          if (!newSecond) {
            // Si el second fue removido completamente, retornar solo el first
            return node.first;
          }
          return { ...node, second: newSecond };
        }
      }
      
      return node;
    };

    setSshTabs(prevTabs => {
      return prevTabs.map(tab => {
        if (tab.key === splitTabKey && tab.type === 'split') {
          const newTree = removeNode(tab, path);
          
          // Si newTree es null, retornar el tab sin cambios
          if (!newTree) {
            return tab;
          }
          
          // Si el resultado es un solo terminal, convertir a pestaña normal
          if (newTree && newTree.type === 'terminal') {
            // Cuando queda un solo terminal, el tab debe convertirse en ese terminal
            // El key del tab debe ser el key del terminal que queda
            return {
              ...newTree,
              type: 'terminal',
              // Preservar propiedades importantes del tab original
              createdAt: tab.createdAt,
              groupId: tab.groupId,
              // El key del terminal se mantiene (newTree.key)
            };
          }
          
          // Si queda un split, actualizar
          if (newTree && newTree.type === 'split') {
            const termCount = countTerminals(newTree);
            const allTerms = getAllTerminals(newTree);
            return {
              ...tab,
              ...newTree,
              label: `Split (${termCount}): ${allTerms.map(t => t.label).slice(0, 3).join(' | ')}${termCount > 3 ? '...' : ''}`
            };
          }
          
          // Si llegamos aquí, newTree tiene un tipo inesperado, retornar el tab sin cambios
          return tab;
        }
        
        // Compatibilidad legacy: manejar leftTerminal/rightTerminal
        if (tab.key === splitTabKey && tab.type === 'split' && tab.leftTerminal && tab.rightTerminal) {
          if (path === 'left' || (Array.isArray(path) && path[0] === 'first')) {
            return { ...tab.rightTerminal, type: 'terminal', key: tab.key };
          }
          if (path === 'right' || (Array.isArray(path) && path[0] === 'second')) {
            return { ...tab.leftTerminal, type: 'terminal', key: tab.key };
          }
        }
        
        return tab;
      });
    });

    toast.current.show({
      severity: 'info',
      summary: 'Terminal cerrado',
      detail: 'Terminal cerrado exitosamente',
      life: 2000
    });
  }, [setSshTabs, toast, countTerminals, getAllTerminals]);

  return {
    openInSplit,
    handleCloseSplitPanel
  };
};
