import { unblockAllInputs, detectBlockedInputs } from './formDebugger';

/**
 * Utility functions para el manejo de eventos de pestañas
 */

/**
 * Determina el tipo y índice de una pestaña basado en su índice global
 */
export const getTabTypeAndIndex = (globalIndex, homeTabs, sshTabs, rdpTabs) => {
  if (globalIndex < homeTabs.length) {
    return { type: 'home', index: globalIndex };
  } else if (globalIndex < homeTabs.length + sshTabs.length) {
    return { type: 'ssh', index: globalIndex - homeTabs.length };
  } else if (globalIndex < homeTabs.length + sshTabs.length + rdpTabs.length) {
    return { type: 'rdp', index: globalIndex - homeTabs.length - sshTabs.length };
  } else {
    return { type: 'explorer', index: globalIndex - homeTabs.length - sshTabs.length - rdpTabs.length };
  }
};

/**
 * Mueve una pestaña a la primera posición (después de Inicio)
 */
export const moveTabToFirst = (
  globalIndex,
  getAllTabs,
  sshTabs,
  setSshTabs,
  fileExplorerTabs,
  setFileExplorerTabs,
  homeTabs,
  setActiveTabIndex
) => {
  const allTabs = getAllTabs();
  const tabToMove = allTabs[globalIndex];

  // No permitir mover la pestaña de Inicio ni crear otra
  if (!tabToMove || tabToMove.type === 'home' || tabToMove.label === 'Inicio') return;

  // Determinar si es una pestaña SSH o explorador
  const isSSHTab = globalIndex < sshTabs.length || tabToMove.isExplorerInSSH;

  if (isSSHTab) {
    // Mover pestaña SSH detrás de Inicio
    const currentSSHIndex = sshTabs.findIndex(tab => tab.key === tabToMove.key);
    if (currentSSHIndex !== -1) {
      const newSSHTabs = [...sshTabs];
      const [movedTab] = newSSHTabs.splice(currentSSHIndex, 1);
      // Insertar después de la pestaña de Inicio (posición 0)
      newSSHTabs.splice(0, 0, movedTab);
      setSshTabs(newSSHTabs);
      setActiveTabIndex(1); // Activar la pestaña movida (después de Inicio)
    }
  } else {
    // Mover pestaña de explorador detrás de Inicio y SSHs
    const currentExplorerIndex = fileExplorerTabs.findIndex(tab => tab.key === tabToMove.key);
    if (currentExplorerIndex !== -1) {
      const newExplorerTabs = [...fileExplorerTabs];
      const [movedTab] = newExplorerTabs.splice(currentExplorerIndex, 1);
      // Insertar después de Inicio y SSHs
      newExplorerTabs.splice(0, 0, movedTab);
      setFileExplorerTabs(newExplorerTabs);
      setActiveTabIndex(homeTabs.length + sshTabs.length); // Activar la pestaña movida
    }
  }
};

/**
 * Maneja el menú contextual de terminal
 */
export const handleTerminalContextMenu = (e, tabKey, showTerminalContextMenu) => {
  e.preventDefault();
  e.stopPropagation();
  showTerminalContextMenu(tabKey, e);
};

/**
 * Oculta el menú contextual
 */
export const hideContextMenu = (hideTerminalContextMenu) => {
  hideTerminalContextMenu();
};

/**
 * Wrapper functions para las acciones de terminal que cierran el menú
 */
export const createTerminalActionWrapper = (action, hideContextMenuFn) => {
  return (tabKey) => {
    action(tabKey);
    if (typeof hideContextMenuFn === 'function') {
      hideContextMenuFn();
    }
  };
};

/**
 * Función para desbloquear formularios cuando sea necesario
 */
export const handleUnblockForms = (toast) => {
  const blockedInputs = detectBlockedInputs();
  if (blockedInputs.length > 0) {
    console.log(`Detectados ${blockedInputs.length} inputs bloqueados:`, blockedInputs);
    unblockAllInputs();
    toast.current?.show({
      severity: 'info',
      summary: 'Formularios desbloqueados',
      detail: `Se han desbloqueado ${blockedInputs.length} campos de formulario`,
      life: 3000
    });
  } else {
    toast.current?.show({
      severity: 'info',
      summary: 'Sin problemas',
      detail: 'No se detectaron formularios bloqueados',
      life: 2000
    });
  }
};

/**
 * Handler para crear pestañas de Guacamole
 */
export const handleGuacamoleCreateTab = async (
  event,
  data,
  activeGroupId,
  setGroupActiveIndices,
  activeTabIndex,
  setActiveGroupId,
  setGuacamoleTabs,
  setLastOpenedTabKey,
  setOnCreateActivateTabKey,
  setActiveTabIndex,
  setOpenTabOrder
) => {
  const { tabId, config } = data;
  
  const newGuacamoleTab = {
    key: tabId,
    label: config.name || `Guacamole - ${config.server}`,
    type: 'guacamole',
    config: config,
    tabId: tabId,
    groupId: null
  };
  
  // Forzar grupo Home antes de activar
  if (activeGroupId !== null) {
    const currentGroupKey = activeGroupId || 'no-group';
    setGroupActiveIndices(prev => ({
      ...prev,
      [currentGroupKey]: activeTabIndex
    }));
    setActiveGroupId(null);
  }

  // Insertar pestaña Guacamole, activar y registrar orden
  setGuacamoleTabs(prevTabs => [{ ...newGuacamoleTab, createdAt: Date.now() }, ...prevTabs]);
  setLastOpenedTabKey(tabId);
  setOnCreateActivateTabKey(tabId);
  setActiveTabIndex(1);
  setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
  setOpenTabOrder(prev => [tabId, ...prev.filter(k => k !== tabId)]);
};
