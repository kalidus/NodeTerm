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
  // Función para abrir una sesión en split con otra pestaña existente
  const openInSplit = useCallback((sshNode, existingTab, orientation = 'vertical') => {
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

    setSshTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab => {
        if (tab.key === existingTab.key) {
          // Crear el terminal izquierdo limpiamente
          const leftTerminal = {
            key: tab.key,
            label: tab.label,
            originalKey: tab.originalKey,
            sshConfig: tab.sshConfig,
            type: 'terminal'
          };
          
          return {
            ...tab,
            type: 'split',
            orientation: orientation, // Guardar la orientación
            leftTerminal: leftTerminal, // Terminal izquierdo (existente)
            rightTerminal: newTerminal, // Terminal derecho (nuevo)
            label: `Split ${orientation === 'horizontal' ? '─' : '│'}: ${tab.label} | ${sshNode.label}`
          };
        }
        return tab;
      });
      // Buscar el índice real de la pestaña split (por si la posición cambia)
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

    toast.current.show({
      severity: 'success',
      summary: 'Split creado',
      detail: `Nueva sesión de ${sshNode.label} abierta en split ${orientation}`,
      life: 3000
    });
  }, [activeGroupId, activeTabIndex, setGroupActiveIndices, setActiveGroupId, sshTabs, setSshTabs, homeTabs, fileExplorerTabs, setActiveTabIndex, toast]);

  // Función para cerrar un panel del split
  const handleCloseSplitPanel = useCallback((splitTabKey, panelToClose) => {
    setSshTabs(prevTabs => {
      return prevTabs.map(tab => {
        if (tab.key === splitTabKey && tab.type === 'split') {
          // Si cerramos el panel izquierdo, el derecho se convierte en una pestaña normal
          if (panelToClose === 'left') {
            return {
              ...tab.rightTerminal,
              type: 'terminal'
            };
          }
          // Si cerramos el panel derecho, el izquierdo se convierte en una pestaña normal
          else if (panelToClose === 'right') {
            return {
              ...tab.leftTerminal,
              type: 'terminal'
            };
          }
        }
        return tab;
      });
    });

    toast.current.show({
      severity: 'info',
      summary: 'Panel cerrado',
      detail: `Panel ${panelToClose === 'left' ? 'izquierdo' : 'derecho'} cerrado`,
      life: 2000
    });
  }, [setSshTabs, toast]);

  return {
    openInSplit,
    handleCloseSplitPanel
  };
};
