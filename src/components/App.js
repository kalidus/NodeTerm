import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTabManagement } from '../hooks/useTabManagement';
import { useConnectionManagement } from '../hooks/useConnectionManagement';
import { useSidebarManagement } from '../hooks/useSidebarManagement';
import { useThemeManagement } from '../hooks/useThemeManagement';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

import { useStatusBarSettings } from '../hooks/useStatusBarSettings';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { useDialogManagement } from '../hooks/useDialogManagement';
import { useContextMenuManagement } from '../hooks/useContextMenuManagement';
import { useWindowManagement } from '../hooks/useWindowManagement';
import { useTreeManagement } from '../hooks/useTreeManagement';
import { useFormHandlers } from '../hooks/useFormHandlers';
import { useSplitManagement } from '../hooks/useSplitManagement';
import { useTreeOperations } from '../hooks/useTreeOperations';
import { useNodeTemplate } from '../hooks/useNodeTemplate';
import { useTabRendering } from '../hooks/useTabRendering';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { TabView, TabPanel } from 'primereact/tabview';

import { ContextMenu } from 'primereact/contextmenu';
import TerminalComponent from './TerminalComponent';
import FileExplorer from './FileExplorer';
import Sidebar from './Sidebar';
import SplitLayout from './SplitLayout';
import { themes } from '../themes';
import { iconThemes } from '../themes/icon-themes';


import SettingsDialog from './SettingsDialog';
import TitleBar from './TitleBar';
import HomeTab from './HomeTab';
import { SSHDialog, FolderDialog, GroupDialog } from './Dialogs';

import SyncSettingsDialog from './SyncSettingsDialog';
import ImportDialog from './ImportDialog';

import RdpSessionTab from './RdpSessionTab';
import GuacamoleTab from './GuacamoleTab';
import GuacamoleTerminal from './GuacamoleTerminal';
import { unblockAllInputs, detectBlockedInputs } from '../utils/formDebugger';
// import '../assets/form-fixes.css';
import '../styles/layout/sidebar.css';
import connectionStore, { recordRecent, toggleFavorite, addGroupToFavorites, removeGroupFromFavorites, isGroupFavorite, helpers as connectionHelpers } from '../utils/connectionStore';
import { 
  getTabTypeAndIndex, 
  moveTabToFirst, 
  handleTerminalContextMenu, 
  hideContextMenu,
  createTerminalActionWrapper,
  handleUnblockForms,
  handleGuacamoleCreateTab 
} from '../utils/tabEventHandlers';
import DistroIcon from './DistroIcon';
import DialogsManager from './DialogsManager';
import TabContextMenu from './contextmenus/TabContextMenu';
import TerminalContextMenu from './contextmenus/TerminalContextMenu';
import OverflowMenu from './contextmenus/OverflowMenu';
import TabHeader from './TabHeader';
import TabContentRenderer from './TabContentRenderer';
import MainContentArea from './MainContentArea';
import { 
  STORAGE_KEYS, 
  GROUP_KEYS, 
  THEME_DEFAULTS, 
  TAB_INDEXES, 
  EVENT_NAMES,
  TAB_TYPES,
  CONNECTION_STATUS 
} from '../utils/constants';

const App = () => {
  const toast = useRef(null);
  const [showImportDialog, setShowImportDialog] = React.useState(false);
  
  // Función para manejar la importación completa
  const handleImportComplete = async (importedConnections) => {
    try {
      if (!importedConnections || importedConnections.length === 0) {
        toast.current?.show({
          severity: 'warn',
          summary: 'Sin datos',
          detail: 'No se encontraron conexiones para importar',
          life: 3000
        });
        return;
      }

      // Crear una carpeta para las conexiones importadas
      const timestamp = Date.now();
      const importFolderKey = `imported_folder_${timestamp}`;
      const importFolder = {
        key: importFolderKey,
        label: `Importadas de mRemoteNG (${new Date().toLocaleDateString()})`,
        droppable: true,
        children: importedConnections,
        uid: importFolderKey,
        createdAt: new Date().toISOString(),
        isUserCreated: true,
        imported: true,
        importedFrom: 'mRemoteNG'
      };

      // Clonar nodos actuales y agregar la carpeta de importación
      const nodesCopy = JSON.parse(JSON.stringify(nodes));
      nodesCopy.push(importFolder);
      
      // Actualizar el estado de nodos
      setNodes(nodesCopy);

      toast.current?.show({
        severity: 'success',
        summary: 'Importación exitosa',
        detail: `Se importaron ${importedConnections.length} conexiones en la carpeta "${importFolder.label}"`,
        life: 5000
      });

    } catch (error) {
      console.error('Error al procesar importación:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error de importación',
        detail: 'Error al agregar las conexiones importadas a la sidebar',
        life: 5000
      });
    }
  };
  
  // Usar el hook de gestión de pestañas
  const {
    sshTabs, setSshTabs, rdpTabs, setRdpTabs, guacamoleTabs, setGuacamoleTabs,
    fileExplorerTabs, setFileExplorerTabs, homeTabs, setHomeTabs,
    lastOpenedTabKey, setLastOpenedTabKey, onCreateActivateTabKey, setOnCreateActivateTabKey,
    activatingNowRef, openTabOrder, setOpenTabOrder, activeTabIndex, setActiveTabIndex,
    pendingExplorerSession, setPendingExplorerSession, tabGroups, setTabGroups,
    activeGroupId, setActiveGroupId, groupActiveIndices, setGroupActiveIndices,
    showCreateGroupDialog, setShowCreateGroupDialog, newGroupName, setNewGroupName,
    selectedGroupColor, setSelectedGroupColor, tabContextMenu, setTabContextMenu,
    tabDistros, setTabDistros,
    GROUP_COLORS, getNextGroupColor, getAllTabs, getTabsInGroup, getFilteredTabs,
    handleLoadGroupFromFavorites, createNewGroup, deleteGroup, moveTabToGroup, cleanupTabDistro,
    handleTabContextMenu, handleTabClose
  } = useTabManagement(toast, {
    cleanupTabDistro,
    setSshConnectionStatus,
    terminalRefs,
    GROUP_KEYS
  });

  // Usar el hook de gestión de conexiones
  const {
    onOpenSSHConnection,
    onOpenRdpConnection,
    openFileExplorer
  } = useConnectionManagement({
    activeGroupId, setActiveGroupId, activeTabIndex, setActiveTabIndex,
    setGroupActiveIndices, setLastOpenedTabKey, setOnCreateActivateTabKey,
    setOpenTabOrder, sshTabs, setSshTabs, rdpTabs, setRdpTabs, toast
  });

  // Usar el hook de gestión de temas
  const {
    fontFamily, setFontFamily, fontSize, setFontSize,
    localFontFamily, setLocalFontFamily, localFontSize, setLocalFontSize,
    availableFonts, terminalTheme, setTerminalTheme, statusBarTheme, setStatusBarTheme,
    localPowerShellTheme, setLocalPowerShellTheme, localLinuxTerminalTheme, setLocalLinuxTerminalTheme,
    uiTheme, setUiTheme, availableThemes, iconTheme, setIconTheme,
    iconThemeSidebar, setIconThemeSidebar, explorerFont, setExplorerFont,
    explorerFontSize, setExplorerFontSize, explorerColorTheme, setExplorerColorTheme,
    sidebarFont, setSidebarFont, sidebarFontSize, setSidebarFontSize,
    updateThemesFromSync
  } = useThemeManagement();

  // Usar el hook de drag & drop
  const {
    draggedTabIndex, dragOverTabIndex, dragStartTimer,
    handleTabDragStart, handleTabDragOver, handleTabDragLeave,
    handleTabDrop, handleTabDragEnd
  } = useDragAndDrop({
    getFilteredTabs,
    openTabOrder,
    setOpenTabOrder,
    setActiveTabIndex
  });

  // Usar el hook de gestión de sesiones
  const {
    terminalRefs, activeListenersRef, sessionManager,
    sshStatsByTabId, setSshStatsByTabId,
    sshConnectionStatus, setSshConnectionStatus,
    handleCopyFromTerminal: copyFromTerminal, handlePasteToTerminal: pasteToTerminal, handleSelectAllTerminal: selectAllTerminal, handleClearTerminal: clearTerminal,
    handleCopyFromTerminalWrapper, handlePasteToTerminalWrapper, handleSelectAllTerminalWrapper, handleClearTerminalWrapper,
    handleUnblockFormsWrapper,
    cleanupTerminalRef, disconnectSSHSession, disconnectSplitSession, disconnectRDPSession,
    resizeTerminals, reloadSessionsFromStorage
  } = useSessionManagement(toast, {
    sshTabs,
    setTabDistros,
    resizeTimeoutRef
  });

  // Split management hook
  const {
    openInSplit,
    handleCloseSplitPanel
  } = useSplitManagement({
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
  });

  // Usar el hook de gestión del sidebar
  const {
    nodes, setNodes,
    selectedNode, setSelectedNode,
    isGeneralTreeMenu, setIsGeneralTreeMenu,
    selectedNodeKey, setSelectedNodeKey,
    sidebarFilter, setSidebarFilter,
    sidebarCallbacksRef,
    parseWallixUser,
    getActiveConnectionIds,
    findAllConnections,
    getTreeContextMenuItems,
    getGeneralTreeContextMenuItems
  } = useSidebarManagement(toast, {
    activeGroupId, setActiveGroupId, activeTabIndex, setActiveTabIndex,
    setGroupActiveIndices, setSshTabs, setLastOpenedTabKey, setOnCreateActivateTabKey,
    getFilteredTabs, openFileExplorer, openInSplit, onOpenRdpConnection,
    homeTabs, fileExplorerTabs, sshTabs
  });



  // Storage key moved to constants

  // Tras crear una pestaña marcada para activación, fijar activeTabIndex al índice real y limpiar la marca
  useEffect(() => {
    if (!onCreateActivateTabKey) return;
    // Asegurar estar en Home
    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || GROUP_KEYS.DEFAULT;
      setGroupActiveIndices(prev => ({ ...prev, [currentGroupKey]: activeTabIndex }));
      setActiveGroupId(null);
    }
    const timer = setTimeout(() => {
      try {
        const filtered = getTabsInGroup(null);
        const idx = filtered.findIndex(t => t.key === onCreateActivateTabKey);
        if (idx !== -1) {
          activatingNowRef.current = true;
          setActiveTabIndex(idx);
          setTimeout(() => { activatingNowRef.current = false; }, 400);
        }
      } finally {
        setOnCreateActivateTabKey(null);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [onCreateActivateTabKey, homeTabs, sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs, activeGroupId, activeTabIndex]);







  // StatusBar settings hook
  const {
    statusBarIconTheme,
    setStatusBarIconTheme,
    statusBarPollingInterval,
    setStatusBarPollingInterval,
    updateStatusBarFromSync
  } = useStatusBarSettings();

  // Dialog management hook
  const {
    // Estados de diálogos
    showSSHDialog, setShowSSHDialog,
    showRdpDialog, setShowRdpDialog,
    showFolderDialog, setShowFolderDialog,
    showEditSSHDialog, setShowEditSSHDialog,
    showEditFolderDialog, setShowEditFolderDialog,
    showSettingsDialog, setShowSettingsDialog,
    showSyncDialog, setShowSyncDialog,
  
    showUnifiedConnectionDialog, setShowUnifiedConnectionDialog,
    // Estados de formularios SSH
    sshName, setSSHName,
    sshHost, setSSHHost,
    sshUser, setSSHUser,
    sshPassword, setSSHPassword,
    sshRemoteFolder, setSSHRemoteFolder,
    sshPort, setSSHPort,
    sshTargetFolder, setSSHTargetFolder,
    // Estados de formularios Edit SSH
    editSSHNode, setEditSSHNode,
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost,
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,
    // Estados de formularios RDP
    rdpName, setRdpName,
    rdpServer, setRdpServer,
    rdpUsername, setRdpUsername,
    rdpPassword, setRdpPassword,
    rdpPort, setRdpPort,
    rdpClientType, setRdpClientType,
    rdpGuacSecurity, setRdpGuacSecurity,
    rdpTargetFolder, setRdpTargetFolder,
    rdpNodeData, setRdpNodeData,
    editingRdpNode, setEditingRdpNode,
    // Estados de formularios Folder
    folderName, setFolderName,
    parentNodeKey, setParentNodeKey,
    editFolderNode, setEditFolderNode,
    editFolderName, setEditFolderName,
    // Funciones de utilidad
    resetSSHForm, resetRDPForm, resetFolderForm,
    resetEditSSHForm, resetEditFolderForm,
    openSSHDialog, openRDPDialog, openFolderDialog,
    closeSSHDialogWithReset, closeRDPDialogWithReset, closeFolderDialogWithReset,
    closeEditSSHDialogWithReset, closeEditFolderDialogWithReset
  } = useDialogManagement();



  // Context menu management hook
  const {
    // Estados de menús contextuales
    terminalContextMenu, setTerminalContextMenu,
    showOverflowMenu, setShowOverflowMenu,
    overflowMenuPosition, setOverflowMenuPosition,
    // Referencias
    treeContextMenuRef,
    // Funciones de terminal context menu
    showTerminalContextMenu, hideTerminalContextMenu,
    // Funciones de overflow menu
    showOverflowMenuAt, hideOverflowMenu,
    // Funciones de tree context menu
    onNodeContextMenu: onNodeContextMenuHook,
    onTreeAreaContextMenu: onTreeAreaContextMenuHook
  } = useContextMenuManagement();

  // Window management hook
  const {
    // Estados de ventana y sidebar
    sidebarVisible, setSidebarVisible,
    sidebarCollapsed, setSidebarCollapsed,
    allExpanded, setAllExpanded,
    expandedKeys, setExpandedKeys,
    // Referencias
    resizeTimeoutRef,
    // Funciones de resize
    handleResize, handleResizeThrottled,
    // Funciones de expansión
    toggleExpandAll
  } = useWindowManagement({ 
    getFilteredTabs, 
    activeTabIndex, 
    resizeTerminals,
    nodes
  });

  // Tree management hook
  const {
    // Utilidades básicas
    deepCopy, generateNextKey,
    // Funciones de búsqueda
    findNodeByKey, findParentNodeAndIndex, findParentNodeAndIndexByUID, findNodeByProperties,
    // Funciones de manipulación
    removeNodeByKey, cloneTreeWithUpdatedNode, deleteNode: deleteNodeFromTree, onDragDrop: onDragDropTree,
    // Funciones de confirmación
    confirmDeleteNode
  } = useTreeManagement({ toast, confirmDialog });



  // Tree operations hook
  const {
    draggedNodeKey,
    setDraggedNodeKey,
    generateUniqueKey,
    getDefaultNodes,
    regenerateKeys,
    updateNodesWithKeys,
    findNodeByUID,
    handleDropToRoot,
    onDragDrop
  } = useTreeOperations({
    nodes,
    setNodes,
    toast,
    deepCopy,
    findParentNodeAndIndex,
    onDragDropTree
  });

  // Form handlers hook (movido aquí para tener acceso a generateUniqueKey y parseWallixUser)
  const {
    createNewFolder,
    createNewSSH,
    createNewRdp,
    saveEditSSH,
    saveEditFolder,
    openEditSSHDialog,
    openNewRdpDialog,
    closeRdpDialog,
    openEditRdpDialog,
    handleSaveRdpToSidebar
  } = useFormHandlers({
    toast,
    setShowRdpDialog,
    setShowEditSSHDialog,
    setShowEditFolderDialog,

    setShowUnifiedConnectionDialog,
    // Estados SSH para creación
    sshName, setSSHName, sshHost, setSSHHost, sshUser, setSSHUser, 
    sshPassword, setSSHPassword, sshRemoteFolder, setSSHRemoteFolder, 
    sshPort, setSSHPort, sshTargetFolder, setSSHTargetFolder,
    closeSSHDialogWithReset,
    // Estados SSH para edición
    editSSHNode, setEditSSHNode,
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost, 
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,
    closeEditSSHDialogWithReset,
    // Estados RDP
    rdpName, setRdpName,
    rdpServer, setRdpServer,
    rdpUsername, setRdpUsername, 
    rdpPassword, setRdpPassword,
    rdpPort, setRdpPort,
    rdpClientType, setRdpClientType,
    rdpTargetFolder, setRdpTargetFolder,
    rdpNodeData, setRdpNodeData,
    editingRdpNode, setEditingRdpNode,
    // Estados Folder
    folderName, parentNodeKey,
    editFolderNode, setEditFolderNode,
    editFolderName, setEditFolderName,
    closeFolderDialogWithReset,
    // Utilidades
    nodes, setNodes,
    findNodeByKey, deepCopy, generateUniqueKey, parseWallixUser,
    rdpTabs, setRdpTabs
  });

  // Node template hook
  const {
    nodeTemplate,
    getAllFolders,
    openEditFolderDialog
  } = useNodeTemplate({
    sshConnectionStatus,
    activeGroupId,
    setActiveGroupId,
    activeTabIndex,
    setActiveTabIndex,
    setGroupActiveIndices,
    setSshTabs,
    homeTabs,
    onOpenRdpConnection,
    iconThemes,
    iconThemeSidebar,
    sidebarFont,
    setEditFolderNode,
    setEditFolderName,
    setShowEditFolderDialog,
    onNodeContextMenu,
    onTreeAreaContextMenu
  });

  // Tab rendering hook
  const {
    renderGroupTabs
  } = useTabRendering({
    tabGroups,
    activeGroupId,
    setActiveGroupId,
    activeTabIndex,
    setActiveTabIndex,
    groupActiveIndices,
    setGroupActiveIndices,
    getTabsInGroup,
    tabContextMenu,
    setTabContextMenu,
    moveTabToGroup,
    deleteGroup,
    toast
  });



  // Context menu for nodes (usando el hook)
  const onNodeContextMenu = (event, node) => {
    onNodeContextMenuHook(event, node, setSelectedNode, setIsGeneralTreeMenu);
  };

  // Context menu for tree area (general) (usando el hook)
  const onTreeAreaContextMenu = (event) => {
    onTreeAreaContextMenuHook(event, setSelectedNode, setIsGeneralTreeMenu);
  };



  // Load initial nodes from localStorage or use default
  useEffect(() => {
    const savedNodes = localStorage.getItem(STORAGE_KEYS.TREE_DATA);
    if (savedNodes) {
      let loadedNodes = JSON.parse(savedNodes);
      if (!Array.isArray(loadedNodes)) {
        loadedNodes = [loadedNodes];
      }
      const migrateNodes = (nodes) => {
        return nodes.map(node => {
          const migratedNode = { ...node };
          if (node.data && node.data.type === 'ssh') {
            migratedNode.droppable = false;
          }
          if (node.children && node.children.length > 0) {
            migratedNode.children = migrateNodes(node.children);
          }
          return migratedNode;
        });
      };
      const migratedNodes = migrateNodes(loadedNodes);
      setNodes(migratedNodes); // <-- Si está vacío, se respeta
    } else {
      setNodes(getDefaultNodes());
    }
    
    }, []);

  // Save nodes to localStorage whenever they change
  useEffect(() => {
            localStorage.setItem(STORAGE_KEYS.TREE_DATA, JSON.stringify(nodes));
  }, [nodes]);

  // Efecto para manejar cambios en el explorador de archivos
  useEffect(() => {
    if (pendingExplorerSession) {
      const explorerIndex = getTabsInGroup(activeGroupId).findIndex(tab => tab.originalKey === pendingExplorerSession);
      if (explorerIndex >= sshTabs.length) {
        if (!activatingNowRef.current) setActiveTabIndex(explorerIndex);
        setPendingExplorerSession(null);
      }
    }
  }, [fileExplorerTabs, pendingExplorerSession, sshTabs.length]);






  


  useEffect(() => {
    // Cuando cambia la pestaña activa, notificar al backend
    const activeTab = filteredTabs[activeTabIndex];
    
    // Solo proceder si hay pestañas en el grupo actual
    if (filteredTabs.length > 0 && activeTab && window.electron && window.electron.ipcRenderer) {
      if (activeTab.type === 'split') {
        // Para splits, activar stats en ambos terminales
        if (activeTab.leftTerminal) {
          window.electron.ipcRenderer.send('ssh:set-active-stats-tab', activeTab.leftTerminal.key);
        }
        if (activeTab.rightTerminal) {
          window.electron.ipcRenderer.send('ssh:set-active-stats-tab', activeTab.rightTerminal.key);
        }
      } else if (activeTab.type === 'terminal') {
        window.electron.ipcRenderer.send('ssh:set-active-stats-tab', activeTab.key);
      }
    }
    // Si filteredTabs.length === 0 (grupo vacío), no hacer nada para preservar stats loops existentes
  }, [activeTabIndex, sshTabs, fileExplorerTabs]);

  // Reactivar stats para bastión al volver a la pestaña
  useEffect(() => {
    if (!window.electron || !window.electron.ipcRenderer) return;
    const activeTab = filteredTabs[activeTabIndex];
    if (activeTab && activeTab.sshConfig && activeTab.sshConfig.useBastionWallix) {
      window.electron.ipcRenderer.send('ssh:set-active-stats-tab', activeTab.key);
    }
  }, [activeTabIndex, sshTabs]);
  
  // TODO: Implementar lógica para overflow menu items
  const overflowMenuItems = [];

  // Exponer la función globalmente para el menú de la aplicación
  useEffect(() => {
    window.handleUnblockForms = handleUnblockFormsWrapper;
    return () => {
      delete window.handleUnblockForms;
    };
  }, []);

  // Handler para crear pestañas de Guacamole
  useEffect(() => {
    const handleGuacamoleCreateTabWrapper = async (event, data) => {
      await handleGuacamoleCreateTab(
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
      );
    };

    // Escuchar eventos de creación de pestañas de Guacamole
    if (window.electron && window.electron.ipcRenderer) {
      const unsubscribe = window.electron.ipcRenderer.on('guacamole:create-tab', handleGuacamoleCreateTabWrapper);
      return () => { try { if (typeof unsubscribe === 'function') unsubscribe(); } catch {} };
    }
  }, []);



  useEffect(() => {
    window.__DEBUG_NODES__ = () => nodes;
  }, [nodes]);

  // Configurar callbacks RDP para el sidebar
  useEffect(() => {
    // Asegurar que el ref esté inicializado
    if (!sidebarCallbacksRef.current) {
      sidebarCallbacksRef.current = {};
    }
    
    sidebarCallbacksRef.current.createRDP = (targetFolder = null) => {
      openNewRdpDialog(targetFolder);
    };
    sidebarCallbacksRef.current.editRDP = (node) => {
      openEditRdpDialog(node);
    };
    sidebarCallbacksRef.current.connectRDP = (node) => {
      onOpenRdpConnection(node);
    };
  }, [sidebarCallbacksRef.current]);

  // Desactivar reactivación automática al cambiar rdpTabs si hay activación forzada u orden explícito
  useEffect(() => {
    if (activatingNowRef.current || onCreateActivateTabKey || lastOpenedTabKey) return;
    if (rdpTabs.length > 0) {
      const allTabs = getAllTabs();
      const lastRdpTab = rdpTabs[rdpTabs.length - 1];
      const rdpTabIndex = allTabs.findIndex(tab => tab.key === lastRdpTab.key);
      if (rdpTabIndex !== -1) {
        setActiveTabIndex(rdpTabIndex);
      }
    }
  }, [rdpTabs, onCreateActivateTabKey, lastOpenedTabKey, openTabOrder]);

  // === FUNCIONES MEMOIZADAS PARA OPTIMIZAR RENDERS ===
  // Estas funciones se crean una sola vez y no cambian entre renders
  const memoizedTabHandlers = useCallback(() => ({
    onTabDragStart: handleTabDragStart,
    onTabDragOver: handleTabDragOver,
    onTabDragLeave: handleTabDragLeave,
    onTabDrop: handleTabDrop,
    onTabDragEnd: handleTabDragEnd,
    onTabContextMenu: handleTabContextMenu,
    onTabClose: handleTabClose
  }), [handleTabDragStart, handleTabDragOver, handleTabDragLeave, handleTabDrop, handleTabDragEnd, handleTabContextMenu, handleTabClose]);

  const tabHandlers = memoizedTabHandlers();

  // === CÁLCULOS MEMOIZADOS ===
  // Memoizar cálculos costosos que se hacen en cada render
  const isHomeTabActive = useMemo(() => {
    return activeTabIndex === TAB_INDEXES.HOME && homeTabs.length > 0;
  }, [activeTabIndex, homeTabs.length]);

  const localTerminalBg = useMemo(() => {
    return themes[localLinuxTerminalTheme]?.theme?.background || THEME_DEFAULTS.BACKGROUND;
  }, [localLinuxTerminalTheme]);

  const filteredTabs = useMemo(() => {
    return getFilteredTabs();
  }, [getFilteredTabs]);

  // === PROPS MEMOIZADAS PARA SIDEBAR ===
  // Memoizar props que no cambian frecuentemente
  const memoizedSidebarProps = useMemo(() => ({
    nodes,
    setNodes,
    sidebarCollapsed,
    setSidebarCollapsed,
    allExpanded,
    toggleExpandAll,
    expandedKeys,
    setExpandedKeys,
    setShowCreateGroupDialog,
    setShowSettingsDialog,
    iconTheme: iconThemeSidebar,
    explorerFont: sidebarFont,
    explorerFontSize: sidebarFontSize,
    uiTheme: terminalTheme && terminalTheme.name ? terminalTheme.name : 'Light',
    showToast: toast.current && toast.current.show ? toast.current.show : undefined,
    onOpenSSHConnection,
    onNodeContextMenu,
    onTreeAreaContextMenu,
    sidebarCallbacksRef,
    selectedNodeKey,
    setSelectedNodeKey,
    
    // Props para conexiones
    getAllFolders,
    createNewSSH,
    saveEditSSH,
    openEditSSHDialog,
    handleSaveRdpToSidebar,
    
    // Estados de formularios SSH
    sshName, setSSHName,
    sshHost, setSSHHost,
    sshUser, setSSHUser,
    sshPassword, setSSHPassword,
    sshPort, setSSHPort,
    sshRemoteFolder, setSSHRemoteFolder,
    sshTargetFolder, setSSHTargetFolder,
    
    // Estados de formularios Edit SSH
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost,
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,
    
    // Estados para modo edición
    editSSHNode, setEditSSHNode,
    
    // Estados de formularios RDP
    rdpNodeData, setRdpNodeData,
    editingRdpNode, setEditingRdpNode
  }), [
    nodes, setNodes, sidebarCollapsed, setSidebarCollapsed, allExpanded, toggleExpandAll,
    expandedKeys, setExpandedKeys, setShowCreateGroupDialog, setShowSettingsDialog,
    iconThemeSidebar, sidebarFont, sidebarFontSize, terminalTheme,
    toast, onOpenSSHConnection, onNodeContextMenu, onTreeAreaContextMenu,
    sidebarCallbacksRef, selectedNodeKey, setSelectedNodeKey,
    
    // Dependencias para conexiones
    getAllFolders, createNewSSH, saveEditSSH, openEditSSHDialog, handleSaveRdpToSidebar,
    sshName, setSSHName, sshHost, setSSHHost, sshUser, setSSHUser, sshPassword, setSSHPassword,
    sshPort, setSSHPort, sshRemoteFolder, setSSHRemoteFolder, sshTargetFolder, setSSHTargetFolder,
    editSSHName, setEditSSHName, editSSHHost, setEditSSHHost, editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword, editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort, editSSHNode, setEditSSHNode,
    rdpNodeData, setRdpNodeData, editingRdpNode, setEditingRdpNode
  ]);

  // === PROPS MEMOIZADAS PARA TABHEADER ===
  // Memoizar props que no cambian frecuentemente
  const memoizedTabProps = useMemo(() => ({
    tabDistros,
    dragStartTimer,
    draggedTabIndex
  }), [tabDistros, dragStartTimer, draggedTabIndex]);

  // === PROPS MEMOIZADAS PARA TABCONTENTRENDERER ===
  // Memoizar props que no cambian frecuentemente
  const memoizedContentRendererProps = useMemo(() => ({
    // HomeTab props
    onCreateSSHConnection: onOpenSSHConnection,
    openFolderDialog,
    onOpenRdpConnection,
    handleLoadGroupFromFavorites,
    openEditRdpDialog,
    openEditSSHDialog,
    nodes,
    localFontFamily,
    localFontSize,
    localLinuxTerminalTheme,
    localPowerShellTheme,
    // FileExplorer props
    iconTheme,
    explorerFont,
    explorerColorTheme,
    explorerFontSize,
    // SplitLayout props
    fontFamily,
    fontSize,
    terminalTheme,
    handleTerminalContextMenu,
    showTerminalContextMenu,
    sshStatsByTabId,
    terminalRefs,
    statusBarIconTheme,
    handleCloseSplitPanel,
    // RDP props
    rdpTabs,
    findNodeByKey
  }), [
    onOpenSSHConnection, openFolderDialog, onOpenRdpConnection, handleLoadGroupFromFavorites,
    openEditRdpDialog, openEditSSHDialog, nodes, localFontFamily, localFontSize,
    localLinuxTerminalTheme, localPowerShellTheme, iconTheme, explorerFont,
    explorerColorTheme, explorerFontSize, fontFamily, fontSize, terminalTheme,
    handleTerminalContextMenu, showTerminalContextMenu, sshStatsByTabId,
    terminalRefs, statusBarIconTheme, handleCloseSplitPanel, rdpTabs, findNodeByKey
  ]);

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
      <TitleBar
        sidebarFilter={sidebarFilter}
        setSidebarFilter={setSidebarFilter}
        allNodes={nodes}
        findAllConnections={findAllConnections}
        onOpenSSHConnection={onOpenSSHConnection}
        onShowImportDialog={setShowImportDialog}
      />
      <DialogsManager
        // Referencias
        toast={toast}
        
        // Estados de diálogos
        showSSHDialog={showSSHDialog}
        setShowSSHDialog={setShowSSHDialog}
        showRdpDialog={showRdpDialog}
        setShowRdpDialog={setShowRdpDialog}
        showFolderDialog={showFolderDialog}
        setShowFolderDialog={setShowFolderDialog}
        showEditSSHDialog={showEditSSHDialog}
        setShowEditSSHDialog={setShowEditSSHDialog}
        showEditFolderDialog={showEditFolderDialog}
        setShowEditFolderDialog={setShowEditFolderDialog}
        showSettingsDialog={showSettingsDialog}
        setShowSettingsDialog={setShowSettingsDialog}
        showSyncDialog={showSyncDialog}
        setShowSyncDialog={setShowSyncDialog}

        showCreateGroupDialog={showCreateGroupDialog}
        setShowCreateGroupDialog={setShowCreateGroupDialog}
        showUnifiedConnectionDialog={showUnifiedConnectionDialog}
        setShowUnifiedConnectionDialog={setShowUnifiedConnectionDialog}
        
        // Estados de formularios SSH
        sshName={sshName}
        setSSHName={setSSHName}
        sshHost={sshHost}
        setSSHHost={setSSHHost}
        sshUser={sshUser}
        setSSHUser={setSSHUser}
        sshPassword={sshPassword}
        setSSHPassword={setSSHPassword}
        sshRemoteFolder={sshRemoteFolder}
        setSSHRemoteFolder={setSSHRemoteFolder}
        sshPort={sshPort}
        setSSHPort={setSSHPort}
        sshTargetFolder={sshTargetFolder}
        setSSHTargetFolder={setSSHTargetFolder}
        
        // Estados de formularios Edit SSH
        editSSHName={editSSHName}
        setEditSSHName={setEditSSHName}
        editSSHHost={editSSHHost}
        setEditSSHHost={setEditSSHHost}
        editSSHUser={editSSHUser}
        setEditSSHUser={setEditSSHUser}
        editSSHPassword={editSSHPassword}
        setEditSSHPassword={setEditSSHPassword}
        editSSHRemoteFolder={editSSHRemoteFolder}
        setEditSSHRemoteFolder={setEditSSHRemoteFolder}
        editSSHPort={editSSHPort}
        setEditSSHPort={setEditSSHPort}
        
        // Estados para modo edición
        editSSHNode={editSSHNode}
        setEditSSHNode={setEditSSHNode}
        
        // Estados de formularios RDP
        rdpName={rdpName}
        setRdpName={setRdpName}
        rdpServer={rdpServer}
        setRdpServer={setRdpServer}
        rdpUsername={rdpUsername}
        setRdpUsername={setRdpUsername}
        rdpPassword={rdpPassword}
        setRdpPassword={setRdpPassword}
        rdpPort={rdpPort}
        setRdpPort={setRdpPort}
        rdpClientType={rdpClientType}
        setRdpClientType={setRdpClientType}
        rdpGuacSecurity={rdpGuacSecurity}
        setRdpGuacSecurity={setRdpGuacSecurity}
        rdpTargetFolder={rdpTargetFolder}
        rdpNodeData={rdpNodeData}
        setRdpNodeData={setRdpNodeData}
        editingRdpNode={editingRdpNode}
        setEditingRdpNode={setEditingRdpNode}
        
        // Estados de formularios Folder
        folderName={folderName}
        setFolderName={setFolderName}
        parentNodeKey={parentNodeKey}
        editFolderNode={editFolderNode}
        editFolderName={editFolderName}
        setEditFolderName={setEditFolderName}
        
        // Estados de formularios Group
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        selectedGroupColor={selectedGroupColor}
        setSelectedGroupColor={setSelectedGroupColor}
        GROUP_COLORS={GROUP_COLORS}
        
        // Funciones
        createNewSSH={createNewSSH}
        createNewFolder={createNewFolder}
        createNewRdp={createNewRdp}
        saveEditSSH={saveEditSSH}
        saveEditFolder={saveEditFolder}
        createNewGroup={createNewGroup}
        handleSaveRdpToSidebar={handleSaveRdpToSidebar}
        closeRdpDialog={closeRdpDialog}
        getAllFolders={getAllFolders}
        nodes={nodes}
        
        // Theme management props
        availableThemes={availableThemes}
        availableFonts={availableFonts}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSize={fontSize}
        setFontSize={setFontSize}
        localFontFamily={localFontFamily}
        setLocalFontFamily={setLocalFontFamily}
        localFontSize={localFontSize}
        setLocalFontSize={setLocalFontSize}
        terminalTheme={terminalTheme}
        setTerminalTheme={setTerminalTheme}
        statusBarTheme={statusBarTheme}
        setStatusBarTheme={setStatusBarTheme}
        localPowerShellTheme={localPowerShellTheme}
        setLocalPowerShellTheme={setLocalPowerShellTheme}
        localLinuxTerminalTheme={localLinuxTerminalTheme}
        setLocalLinuxTerminalTheme={setLocalLinuxTerminalTheme}
        uiTheme={uiTheme}
        setUiTheme={setUiTheme}
        iconTheme={iconTheme}
        setIconTheme={setIconTheme}
        iconThemeSidebar={iconThemeSidebar}
        setIconThemeSidebar={setIconThemeSidebar}
        explorerFont={explorerFont}
        setExplorerFont={setExplorerFont}
        explorerFontSize={explorerFontSize}
        setExplorerFontSize={setExplorerFontSize}
        explorerColorTheme={explorerColorTheme}
        setExplorerColorTheme={setExplorerColorTheme}
        sidebarFont={sidebarFont}
        setSidebarFont={setSidebarFont}
        sidebarFontSize={sidebarFontSize}
        setSidebarFontSize={setSidebarFontSize}
        statusBarIconTheme={statusBarIconTheme}
        setStatusBarIconTheme={setStatusBarIconTheme}
        statusBarPollingInterval={statusBarPollingInterval}
        setStatusBarPollingInterval={setStatusBarPollingInterval}
        
        // Sync settings props
        updateThemesFromSync={updateThemesFromSync}
        updateStatusBarFromSync={updateStatusBarFromSync}
      />

      {/* Menú contextual del árbol de la sidebar */}
      <ContextMenu
        model={isGeneralTreeMenu ? getGeneralTreeContextMenuItems() : getTreeContextMenuItems(selectedNode)}
        ref={treeContextMenuRef}
        breakpoint="600px"
        style={{ zIndex: 99999 }}
      />
      <MainContentArea
        // Sidebar props
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        sidebarVisible={sidebarVisible}
        handleResize={handleResize}
        handleResizeThrottled={handleResizeThrottled}
        memoizedSidebarProps={memoizedSidebarProps}
        
        // Tab management props
        homeTabs={homeTabs}
        sshTabs={sshTabs}
        fileExplorerTabs={fileExplorerTabs}
        rdpTabs={rdpTabs}
        guacamoleTabs={guacamoleTabs}
        activeGroupId={activeGroupId}
        getTabsInGroup={getTabsInGroup}
        activeTabIndex={activeTabIndex}
        setActiveTabIndex={setActiveTabIndex}
        activatingNowRef={activatingNowRef}
        setGroupActiveIndices={setGroupActiveIndices}
        GROUP_KEYS={GROUP_KEYS}
        
        // Tab rendering props
        renderGroupTabs={renderGroupTabs}
        filteredTabs={filteredTabs}
        
        // Tab header props
        memoizedTabProps={memoizedTabProps}
        tabHandlers={tabHandlers}
        dragOverTabIndex={dragOverTabIndex}
        
        // Content renderer props
        memoizedContentRendererProps={memoizedContentRendererProps}
        sshStatsByTabId={sshStatsByTabId}
        
        // Context menu props
        tabContextMenu={tabContextMenu}
        setTabContextMenu={setTabContextMenu}
        terminalContextMenu={terminalContextMenu}
        setTerminalContextMenu={setTerminalContextMenu}
        showOverflowMenu={showOverflowMenu}
        setShowOverflowMenu={setShowOverflowMenu}
        overflowMenuPosition={overflowMenuPosition}
        overflowMenuItems={overflowMenuItems}
        
        // Tab context menu props
        tabGroups={tabGroups}
        moveTabToGroup={moveTabToGroup}
        setShowCreateGroupDialog={setShowCreateGroupDialog}
        isGroupFavorite={isGroupFavorite}
        addGroupToFavorites={addGroupToFavorites}
        removeGroupFromFavorites={removeGroupFromFavorites}
        deleteGroup={deleteGroup}
        toast={toast}
        
        // Selected node props
        selectedNodeKey={selectedNodeKey}
        
        // Terminal handlers
        handleCopyFromTerminalWrapper={handleCopyFromTerminalWrapper}
        handlePasteToTerminalWrapper={handlePasteToTerminalWrapper}
        handleSelectAllTerminalWrapper={handleSelectAllTerminalWrapper}
        handleClearTerminalWrapper={handleClearTerminalWrapper}
        
        // Theme props
        isHomeTabActive={isHomeTabActive}
        localTerminalBg={localTerminalBg}
        
        // Tree context menu
        isGeneralTreeMenu={isGeneralTreeMenu}
        getGeneralTreeContextMenuItems={getGeneralTreeContextMenuItems}
        getTreeContextMenuItems={getTreeContextMenuItems}
        selectedNode={selectedNode}
                treeContextMenuRef={treeContextMenuRef}
      />
      
      <ImportDialog
        visible={showImportDialog}
        onHide={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
        showToast={(message) => toast.current?.show(message)}
      />
    </div>
  );
};

export default App;
