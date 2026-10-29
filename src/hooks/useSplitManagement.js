import { useCallback } from 'react';
import { MAX_SPLIT_PANES } from '../utils/splitTreeLayout';
import { resolvePtyChannel } from '../utils/localPtyChannel';

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
  toast,
  disconnectSSHSession = null, // Función opcional para desconectar sesiones SSH
  getFilteredTabs = null // Función para obtener pestañas filtradas del grupo actual
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
      bastionUser: sshNode.data.bastionUser || '',
      x11Forwarding: sshNode.data.x11Forwarding || false,
      agentForwarding: sshNode.data.agentForwarding || false,
      autoRecording: sshNode.data.autoRecording || false,
      proxyJumpEnabled: sshNode.data.proxyJumpEnabled || false,
      jumpHost: sshNode.data.jumpHost || '',
      jumpPort: sshNode.data.jumpPort || 22,
      jumpUser: sshNode.data.jumpUser || '',
      jumpAuthMethod: sshNode.data.jumpAuthMethod || 'password',
      jumpPassword: sshNode.data.jumpPassword || '',
      jumpPrivateKey: sshNode.data.jumpPrivateKey || '',
      hostKeyPolicy: sshNode.data.hostKeyPolicy || 'warn_new'
    };

    const newTerminal = {
      key: newTabId,
      label: sshNode.label,
      originalKey: sshNode.key,
      sshConfig: sshConfig,
      type: 'terminal'
    };

    // Helper para encontrar el path hacia un nodo específico
    const findPathToNode = (node, targetKey, currentPath = []) => {
      if (!node) return null;
      if (node.key === targetKey) return currentPath;

      if (node.type === 'split') {
        const firstPath = findPathToNode(node.first, targetKey, [...currentPath, 'first']);
        if (firstPath) return firstPath;

        const secondPath = findPathToNode(node.second, targetKey, [...currentPath, 'second']);
        if (secondPath) return secondPath;
      }
      return null;
    };

    // Encontrar la pestaña raíz que contiene el terminal objetivo
    let targetRootTab = null;
    let calculatedPath = targetPath;

    // Primero buscar si alguna pestaña coincide directamente
    targetRootTab = sshTabs.find(t => t.key === existingTab.key);

    // Si no, buscar dentro de los árboles de splits
    if (!targetRootTab) {
      for (const tab of sshTabs) {
        if (tab.type === 'split') {
          const path = findPathToNode(tab, existingTab.key);
          if (path) {
            targetRootTab = tab;
            calculatedPath = path; // Guardar el path encontrado
            break;
          }
        }
      }
    }

    if (!targetRootTab) {
      console.warn('No se encontró la pestaña raíz para el split');
      return;
    }

    const treeHasLocal = (node) => {
      if (!node) return false;
      if (node.local || node.ptyChannel || (node.terminalType && !node.sshConfig)) return true;
      if (node.first || node.second) return treeHasLocal(node.first) || treeHasLocal(node.second);
      return false;
    };
    if (treeHasLocal(targetRootTab)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Split no disponible',
        detail: 'No se pueden mezclar terminales locales y SSH en la misma pestaña',
        life: 3000
      });
      return;
    }

    // Verificar el tope de paneles en la pestaña raíz encontrada
    const currentTerminalCount = targetRootTab.type === 'split' ? countTerminals(targetRootTab) : 1;

    if (currentTerminalCount >= MAX_SPLIT_PANES) {
      toast.current.show({
        severity: 'warn',
        summary: 'Límite alcanzado',
        detail: `Ya tienes ${MAX_SPLIT_PANES} terminales en esta pestaña (máximo permitido)`,
        life: 3000
      });
      return;
    }

    // Calcular el índice de la pestaña dentro del grupo actual ANTES de actualizar
    // Esto asegura que el índice sea correcto para el grupo actual
    const splitTabKey = targetRootTab.key;
    let splitTabIndex = -1;
    if (getFilteredTabs) {
      const filteredTabs = getFilteredTabs();
      splitTabIndex = filteredTabs.findIndex(tab => tab.key === splitTabKey);
    } else {
      // Fallback: usar todas las pestañas si getFilteredTabs no está disponible
      const allTabs = [...homeTabs, ...sshTabs, ...fileExplorerTabs];
      splitTabIndex = allTabs.findIndex(tab => tab.key === splitTabKey);
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
        if (tab.key === targetRootTab.key) {
          // Si ya es un split, dividir el nodo especificado
          if (tab.type === 'split') {
            const pathToUse = targetPath || calculatedPath;
            const newSplitTree = splitNode(tab, pathToUse, newTerminal, orientation);
            const termCount = countTerminals(newSplitTree);
            const allTerms = getAllTerminals(newSplitTree);

            return {
              ...tab,
              ...newSplitTree,
              label: `Split (${termCount}/${MAX_SPLIT_PANES}): ${allTerms.map(t => t.label).slice(0, 2).join(' | ')}${termCount > 2 ? '...' : ''}`
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
            label: `Split (2/${MAX_SPLIT_PANES}): ${tab.label} | ${sshNode.label}`
          };
        }
        return tab;
      });

      return updatedTabs;
    });

    // Activar la pestaña split después de actualizar las pestañas
    if (splitTabIndex !== -1) {
      setActiveTabIndex(splitTabIndex);
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: splitTabIndex
      }));
    }

    const newTerminalCount = currentTerminalCount + 1;

    toast.current.show({
      severity: 'success',
      summary: 'Split creado',
      detail: `Terminal ${sshNode.label} agregado (${newTerminalCount}/${MAX_SPLIT_PANES} terminales)`,
      life: 3000
    });
  }, [activeGroupId, activeTabIndex, setGroupActiveIndices, setActiveGroupId, sshTabs, setSshTabs, homeTabs, fileExplorerTabs, setActiveTabIndex, toast, countTerminals, getAllTerminals, getFilteredTabs]);

  const openLocalInSplit = useCallback((source, existingTab, orientation = 'vertical', targetPath = null) => {
    const channel = resolvePtyChannel(source);
    if (!channel || !existingTab?.key) {
      toast.current?.show({
        severity: 'warn',
        summary: 'No se puede dividir',
        detail: 'Este terminal local no admite splits',
        life: 3000
      });
      return;
    }

    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: activeTabIndex
      }));
      setActiveGroupId(null);
    }

    const findPathToNode = (node, targetKey, currentPath = []) => {
      if (!node) return null;
      if (node.key === targetKey) return currentPath;
      if (node.type === 'split') {
        const firstPath = findPathToNode(node.first, targetKey, [...currentPath, 'first']);
        if (firstPath) return firstPath;
        const secondPath = findPathToNode(node.second, targetKey, [...currentPath, 'second']);
        if (secondPath) return secondPath;
      }
      return null;
    };

    const treeHasSsh = (node) => {
      if (!node) return false;
      if (node.sshConfig) return true;
      if (node.first || node.second) return treeHasSsh(node.first) || treeHasSsh(node.second);
      return false;
    };

    let targetRootTab = sshTabs.find(t => t.key === existingTab.key) || null;
    let calculatedPath = targetPath;
    if (!targetRootTab) {
      for (const tab of sshTabs) {
        if (tab.type === 'split') {
          const path = findPathToNode(tab, existingTab.key);
          if (path) {
            targetRootTab = tab;
            calculatedPath = path;
            break;
          }
        }
      }
    }

    if (!targetRootTab) return;
    if (treeHasSsh(targetRootTab) || source.sshConfig) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Split no disponible',
        detail: 'No se pueden mezclar terminales locales y SSH en la misma pestaña',
        life: 3000
      });
      return;
    }

    const currentTerminalCount = targetRootTab.type === 'split' ? countTerminals(targetRootTab) : 1;
    if (currentTerminalCount >= MAX_SPLIT_PANES) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Límite alcanzado',
        detail: `Ya tienes ${MAX_SPLIT_PANES} terminales en esta pestaña (máximo permitido)`,
        life: 3000
      });
      return;
    }

    const newTabId = `local_${Date.now()}`;
    if (window.electron) {
      window.electron.ipcRenderer.send('register-tab-events', newTabId);
    }

    const sourceTerminalType = source.terminalType
      || (source.type === 'local-terminal' ? 'powershell' : null)
      || (['powershell', 'linux-terminal', 'wsl', 'cygwin', 'ubuntu', 'debian', 'wsl-distro'].includes(source.type) ? source.type : null)
      || 'powershell';

    const newTerminal = {
      type: 'terminal',
      key: newTabId,
      label: source.label || 'Terminal',
      terminalType: sourceTerminalType,
      distroInfo: source.distroInfo,
      ptyChannel: channel,
      local: true
    };

    const splitNode = (node, path, newTerm, orient) => {
      if (!path || path.length === 0) {
        return { type: 'split', orientation: orient, first: node, second: newTerm };
      }
      const [next, ...rest] = path;
      if (node.type === 'split') {
        if (next === 'first') return { ...node, first: splitNode(node.first, rest, newTerm, orient) };
        if (next === 'second') return { ...node, second: splitNode(node.second, rest, newTerm, orient) };
      }
      return node;
    };

    const splitTabKey = targetRootTab.key;
    let splitTabIndex = -1;
    if (getFilteredTabs) {
      splitTabIndex = getFilteredTabs().findIndex(tab => tab.key === splitTabKey);
    } else {
      splitTabIndex = [...homeTabs, ...sshTabs, ...fileExplorerTabs].findIndex(tab => tab.key === splitTabKey);
    }

    setSshTabs(prevTabs => prevTabs.map(tab => {
      if (tab.key !== targetRootTab.key) return tab;
      if (tab.type === 'split') {
        const newSplitTree = splitNode(tab, targetPath || calculatedPath, newTerminal, orientation);
        const termCount = countTerminals(newSplitTree);
        const allTerms = getAllTerminals(newSplitTree);
        return {
          ...tab,
          ...newSplitTree,
          label: `Split (${termCount}/${MAX_SPLIT_PANES}): ${allTerms.map(t => t.label).slice(0, 2).join(' | ')}${termCount > 2 ? '...' : ''}`
        };
      }

      const existingTerminal = {
        type: 'terminal',
        key: tab.key,
        label: tab.label,
        terminalType: tab.terminalType || sourceTerminalType,
        distroInfo: tab.distroInfo,
        ptyChannel: resolvePtyChannel(tab) || channel,
        local: true
      };

      return {
        ...tab,
        type: 'split',
        orientation,
        first: existingTerminal,
        second: newTerminal,
        label: `Split (2/${MAX_SPLIT_PANES}): ${tab.label} | ${newTerminal.label}`
      };
    }));

    if (splitTabIndex !== -1) {
      setActiveTabIndex(splitTabIndex);
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({ ...prev, [currentGroupKey]: splitTabIndex }));
    }

    toast.current?.show({
      severity: 'success',
      summary: 'Split creado',
      detail: `Terminal ${newTerminal.label} agregado (${currentTerminalCount + 1}/${MAX_SPLIT_PANES} terminales)`,
      life: 3000
    });
  }, [activeGroupId, activeTabIndex, setGroupActiveIndices, setActiveGroupId, sshTabs, setSshTabs, homeTabs, fileExplorerTabs, setActiveTabIndex, toast, countTerminals, getAllTerminals, getFilteredTabs]);

  // Función helper para encontrar el terminal que se va a cerrar
  const findTerminalToClose = useCallback((node, nodePath) => {
    if (!node || !nodePath || nodePath.length === 0) return null;

    if (nodePath.length === 1) {
      const direction = nodePath[0];
      if (node.type === 'split') {
        // Retornar el terminal que se va a cerrar
        const terminalToClose = direction === 'first' ? node.first : node.second;
        if (terminalToClose && terminalToClose.type === 'terminal') {
          return terminalToClose;
        }
        // Si es un split anidado, buscar recursivamente
        if (terminalToClose && terminalToClose.type === 'split') {
          // En este caso, necesitamos encontrar todos los terminales en ese sub-árbol
          // pero por ahora, retornamos null y manejaremos la desconexión después
          return null;
        }
      }
      return null;
    }

    // Navegar más profundo
    const [next, ...rest] = nodePath;
    if (node.type === 'split') {
      if (next === 'first') {
        return findTerminalToClose(node.first, rest);
      } else if (next === 'second') {
        return findTerminalToClose(node.second, rest);
      }
    }

    return null;
  }, []);

  // Función para cerrar un panel del split (sistema de árbol anidado)
  const handleCloseSplitPanel = useCallback((splitTabKey, path) => {
    // Primero, encontrar el terminal que se va a cerrar para desconectarlo
    const tab = sshTabs.find(t => t.key === splitTabKey && t.type === 'split');
    if (tab && disconnectSSHSession) {
      const terminalToClose = findTerminalToClose(tab, path);

      if (terminalToClose && terminalToClose.key && terminalToClose.sshConfig) {
        disconnectSSHSession(terminalToClose.key);
      }
    }

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
            const localPane = !!(newTree.local || newTree.ptyChannel || newTree.terminalType);
            return {
              ...newTree,
              type: localPane ? 'local-terminal' : 'terminal',
              createdAt: tab.createdAt,
              groupId: tab.groupId,
            };
          }

          // Si queda un split, actualizar
          if (newTree && newTree.type === 'split') {
            const termCount = countTerminals(newTree);
            const allTerms = getAllTerminals(newTree);

            return {
              ...tab,
              ...newTree,
              label: `Split (${termCount}/${MAX_SPLIT_PANES}): ${allTerms.map(t => t.label).slice(0, 3).join(' | ')}${termCount > 3 ? '...' : ''}`
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
  }, [setSshTabs, toast, countTerminals, getAllTerminals, sshTabs, disconnectSSHSession, findTerminalToClose]);

  return {
    openInSplit,
    openLocalInSplit,
    handleCloseSplitPanel
  };
};
