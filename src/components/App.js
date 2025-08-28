import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import RdpManager from './RdpManager';
import RdpSessionTab from './RdpSessionTab';
import GuacamoleTab from './GuacamoleTab';
import GuacamoleTerminal from './GuacamoleTerminal';
import { unblockAllInputs, detectBlockedInputs } from '../utils/formDebugger';
import '../assets/form-fixes.css';
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
    handleTabContextMenu
  } = useTabManagement(toast);

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
    showRdpManager, setShowRdpManager,
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
    removeNodeByKey, cloneTreeWithUpdatedNode, deleteNode: deleteNodeFromTree, onDragDrop: onDragDropTree
  } = useTreeManagement({ toast });

  // Form handlers hook
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
    setShowRdpManager,
    sshName, sshHost, sshUser, sshPassword, sshRemoteFolder, sshPort, sshTargetFolder,
    closeSSHDialogWithReset,
    editSSHNode, setEditSSHNode,
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost, 
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,
    closeEditSSHDialogWithReset,
    rdpName, setRdpName,
    rdpServer, setRdpServer,
    rdpUsername, setRdpUsername, 
    rdpPassword, setRdpPassword,
    rdpPort, setRdpPort,
    rdpClientType, setRdpClientType,
    rdpTargetFolder, setRdpTargetFolder,
    rdpNodeData, setRdpNodeData,
    editingRdpNode, setEditingRdpNode,
    folderName, parentNodeKey,
    editFolderNode, setEditFolderNode,
    editFolderName, setEditFolderName,
    closeFolderDialogWithReset,
    nodes, setNodes,
    findNodeByKey, deepCopy, generateNextKey, parseWallixUser,
    rdpTabs, setRdpTabs
  });

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





  // Confirm node deletion
  const confirmDeleteNode = (nodeKey, nodeName, hasChildren) => {
    const message = hasChildren
      ? `¿Estás seguro de que deseas eliminar la carpeta "${nodeName}" y todo su contenido?`
      : `¿Estás seguro de que deseas eliminar "${nodeName}"?`;
    
    confirmDialog({
      message: message,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => deleteNodeFromTree(nodes, setNodes, nodeKey),
      reject: () => {}
    });
  };
  


  useEffect(() => {
    // Cuando cambia la pestaña activa, notificar al backend
    const filteredTabs = getFilteredTabs();
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
    const filteredTabs = getFilteredTabs();
    const activeTab = filteredTabs[activeTabIndex];
    if (activeTab && activeTab.sshConfig && activeTab.sshConfig.useBastionWallix) {
      window.electron.ipcRenderer.send('ssh:set-active-stats-tab', activeTab.key);
    }
  }, [activeTabIndex, sshTabs]);





      const localTerminalBg = themes[localLinuxTerminalTheme]?.theme?.background || THEME_DEFAULTS.BACKGROUND;
      const isHomeTabActive = activeTabIndex === TAB_INDEXES.HOME && homeTabs.length > 0;
  
  // TODO: Implementar lógica para overflow menu items
  const overflowMenuItems = [];

  // Función para manejar el cierre de pestañas
  const handleTabClose = (closedTab, idx, isHomeTab) => {
    // Limpiar distro de la pestaña cerrada
    cleanupTabDistro(closedTab.key);
    
    const isSSHTab = closedTab.type === 'terminal' || closedTab.type === 'split' || closedTab.isExplorerInSSH;
    
    if (isHomeTab) {
      // Manejar cierre de pestañas de inicio según su tipo
      if (closedTab.type === 'powershell' && window.electron && window.electron.ipcRenderer) {
        // PowerShell - usar su handler específico existente
        window.electron.ipcRenderer.send(`powershell:stop:${closedTab.key}`);
      } else if (closedTab.type === 'wsl' && window.electron && window.electron.ipcRenderer) {
        // WSL genérico - usar handler existente
        window.electron.ipcRenderer.send(`wsl:stop:${closedTab.key}`);
      } else if (closedTab.type === 'ubuntu' && window.electron && window.electron.ipcRenderer) {
        // Ubuntu - usar handler específico existente
        window.electron.ipcRenderer.send(`ubuntu:stop:${closedTab.key}`);
      } else if (closedTab.type === 'wsl-distro' && window.electron && window.electron.ipcRenderer) {
        // Otras distribuciones WSL - usar handler específico existente
        window.electron.ipcRenderer.send(`wsl-distro:stop:${closedTab.key}`);
      }
      
      const newHomeTabs = homeTabs.filter(t => t.key !== closedTab.key);
      setHomeTabs(newHomeTabs);
    } else if (isSSHTab) {
      // Manejar cierre de pestañas split
      if (closedTab.type === 'split') {
        // Desconectar ambos terminales del split
        if (closedTab.leftTerminal && window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send('ssh:disconnect', closedTab.leftTerminal.key);
          delete terminalRefs.current[closedTab.leftTerminal.key];
          cleanupTabDistro(closedTab.leftTerminal.key);
        }
        if (closedTab.rightTerminal && window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send('ssh:disconnect', closedTab.rightTerminal.key);
          delete terminalRefs.current[closedTab.rightTerminal.key];
          cleanupTabDistro(closedTab.rightTerminal.key);
        }
    } else {
        // Solo enviar ssh:disconnect para pestañas de terminal o exploradores que tengan su propia conexión
        if (!closedTab.isExplorerInSSH && window.electron && window.electron.ipcRenderer) {
          // Terminal SSH - siempre desconectar
          window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
        } else if (closedTab.isExplorerInSSH && closedTab.needsOwnConnection && window.electron && window.electron.ipcRenderer) {
          // Explorador con conexión propia - desconectar
          window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
        }
        // Los exploradores que usan el pool NO necesitan desconectarse
        if (!closedTab.isExplorerInSSH) {
          delete terminalRefs.current[closedTab.key];
        }
      }
      
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      // --- NUEVO: Si ya no quedan pestañas activas con este originalKey, marcar como disconnected ---
      const remainingTabs = newSshTabs.filter(t => t.originalKey === closedTab.originalKey);
      if (remainingTabs.length === 0) {
          setSshConnectionStatus(prev => {
              const updated = { ...prev, [closedTab.originalKey]: 'disconnected' };
              console.log(' Todas las pestañas cerradas para', closedTab.originalKey, '-> Estado:', updated);
              return updated;
          });
      }
      setSshTabs(newSshTabs);
    } else if (closedTab.type === 'rdp') {
      // Manejar cierre de pestañas RDP
      // Opcional: desconectar la sesión RDP si es necesario
      if (window.electron && window.electron.ipcRenderer) {
        // Intentar desconectar la sesión RDP
        window.electron.ipcRenderer.invoke('rdp:disconnect-session', closedTab.rdpConfig);
      }
      const newRdpTabs = rdpTabs.filter(t => t.key !== closedTab.key);
      setRdpTabs(newRdpTabs);
    } else if (closedTab.type === 'rdp-guacamole') {
      // Cerrar pestañas RDP-Guacamole
      try {
        const ref = terminalRefs.current[closedTab.key];
        if (ref && typeof ref.disconnect === 'function') {
          ref.disconnect();
        }
      } catch {}
      // No usar disconnectAll aquí para evitar cerrar conexiones nuevas en carrera
      // Eliminar pestaña del estado
      const newRdpTabs = rdpTabs.filter(t => t.key !== closedTab.key);
      setRdpTabs(newRdpTabs);
      // Limpiar ref
      delete terminalRefs.current[closedTab.key];
    } else if (closedTab.type === 'guacamole') {
      // Cerrar pestañas Guacamole
      const newGuacamoleTabs = guacamoleTabs.filter(t => t.key !== closedTab.key);
      setGuacamoleTabs(newGuacamoleTabs);
    } else {
      if (closedTab.needsOwnConnection && window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
      }
      const newExplorerTabs = fileExplorerTabs.filter(t => t.key !== closedTab.key);
      setFileExplorerTabs(newExplorerTabs);
    }
    
    // Ajustar índice activo
    if (activeTabIndex === idx) {
      const newIndex = Math.max(0, idx - 1);
      setActiveTabIndex(newIndex);
      // Solo actualizar el índice guardado si el grupo actual tiene pestañas después del cierre
      const currentGroupKey = activeGroupId || GROUP_KEYS.DEFAULT;
      const remainingTabs = getTabsInGroup(activeGroupId);
      
      if (remainingTabs.length > 1) { // > 1 porque la pestaña aún no se ha eliminado completamente
        setGroupActiveIndices(prev => ({
          ...prev,
          [currentGroupKey]: newIndex
        }));
      }
    } else if (activeTabIndex > idx) {
      const newIndex = activeTabIndex - 1;
      setActiveTabIndex(newIndex);
      // Solo actualizar el índice guardado si el grupo actual tiene pestañas después del cierre
      const currentGroupKey = activeGroupId || GROUP_KEYS.DEFAULT;
      const remainingTabs = getTabsInGroup(activeGroupId);
      
      if (remainingTabs.length > 1) { // > 1 porque la pestaña aún no se ha eliminado completamente
        setGroupActiveIndices(prev => ({
          ...prev,
          [currentGroupKey]: newIndex
        }));
      }
    }
  };



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

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
      <TitleBar
        sidebarFilter={sidebarFilter}
        setSidebarFilter={setSidebarFilter}
        allNodes={nodes}
        findAllConnections={findAllConnections}
        onOpenSSHConnection={onOpenSSHConnection}
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
        showRdpManager={showRdpManager}
        setShowRdpManager={setShowRdpManager}
        showCreateGroupDialog={showCreateGroupDialog}
        setShowCreateGroupDialog={setShowCreateGroupDialog}
        
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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', width: '100%' }}>
        <Splitter 
          style={{ height: '100%', width: '100%' }} 
          onResizeEnd={sidebarCollapsed ? undefined : handleResize}
          onResize={sidebarCollapsed ? undefined : handleResizeThrottled}
          disabled={sidebarCollapsed}
          className="main-splitter"
          pt={{
            gutter: {
              style: sidebarCollapsed ? { display: 'none', pointerEvents: 'none' } : {
                transition: 'none',
                background: 'var(--ui-sidebar-gutter-bg, #dee2e6)',
                borderColor: 'var(--ui-sidebar-border, #e0e0e0)',
                width: '2px'
              }
            }
          }}
        >
          <SplitterPanel 
            size={sidebarCollapsed ? 4 : 15} 
            minSize={sidebarCollapsed ? 44 : 10} 
            maxSize={sidebarCollapsed ? 44 : 600}
            style={sidebarCollapsed 
              ? { width: 44, minWidth: 44, maxWidth: 44, padding: 0, height: '100%', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }
              : { minWidth: 240, maxWidth: 400, padding: 0, height: '100%', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }
            }
          >
            <Sidebar
              nodes={nodes}
              setNodes={setNodes}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
              allExpanded={allExpanded}
              toggleExpandAll={toggleExpandAll}
              expandedKeys={expandedKeys}
              setExpandedKeys={setExpandedKeys}
              setShowCreateGroupDialog={setShowCreateGroupDialog}
              setShowSettingsDialog={setShowSettingsDialog}
              setShowRdpManager={setShowRdpManager}
              iconTheme={iconThemeSidebar}
              explorerFont={sidebarFont}
              explorerFontSize={sidebarFontSize}
              uiTheme={terminalTheme && terminalTheme.name ? terminalTheme.name : 'Light'}
              showToast={toast.current && toast.current.show ? toast.current.show : undefined}
              onOpenSSHConnection={onOpenSSHConnection}
              onNodeContextMenu={onNodeContextMenu}
              onTreeAreaContextMenu={onTreeAreaContextMenu}
              sidebarCallbacksRef={sidebarCallbacksRef}
              selectedNodeKey={selectedNodeKey}
              setSelectedNodeKey={setSelectedNodeKey}
            />
          </SplitterPanel>
          <SplitterPanel size={sidebarVisible ? 85 : 100} style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    minWidth: 0, 
    width: '100%', 
    height: '100%',
    background: isHomeTabActive ? localTerminalBg : undefined
}}>
            {(homeTabs.length > 0 || sshTabs.length > 0 || fileExplorerTabs.length > 0) ? (
              <div style={{ 
    width: '100%', 
    minWidth: 0, 
    minHeight: 0, 
    display: 'flex', 
    flexDirection: 'column', 
    flex: 1, 
    height: '100%',
    background: isHomeTabActive ? localTerminalBg : undefined
  }}>
                {/* Barra de grupos como TabView scrollable */}
                {renderGroupTabs()}
                <div style={{ height: '1px', background: 'var(--ui-tabgroup-border, #444)' }} />
                
                <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                  {/* Solo mostrar TabView de pestañas si el grupo no está vacío */}
                  {!(activeGroupId !== null && getTabsInGroup(activeGroupId).length === 0) && (
                    <TabView 
                      activeIndex={activeTabIndex} 
                      onTabChange={(e) => {
                        if (activatingNowRef.current) return; // bloquear cambios durante activación forzada
                        setActiveTabIndex(e.index);
                        // Solo guardar el nuevo índice si el grupo actual tiene pestañas
                        const currentGroupKey = activeGroupId || GROUP_KEYS.DEFAULT;
                        const currentTabs = getTabsInGroup(activeGroupId);
                        
                        if (currentTabs.length > 0) {
                          setGroupActiveIndices(prev => ({
                            ...prev,
                            [currentGroupKey]: e.index
                          }));
                        }
                      }}
                      renderActiveOnly={false}
                      scrollable={false}
                      className=""
                    >
                    {getFilteredTabs().map((tab, idx) => {
                      // Con las pestañas híbridas, todas las pestañas visibles están en el contexto home, SSH o explorer
                      // OJO: como reordenamos virtualmente (pin a índice 1), no podemos fiarnos de idx
                            const isHomeTab = tab.type === TAB_TYPES.HOME;
      const isSSHTab = tab.type === TAB_TYPES.TERMINAL || tab.type === TAB_TYPES.SPLIT || tab.isExplorerInSSH;
                      const originalIdx = idx; // No usamos originalIdx para decisiones críticas
                      
                      return (
                        <TabPanel 
                          key={tab.key} 
                          header={tab.label}
                          headerTemplate={(options) => (
                            <TabHeader
                              // Props de PrimeReact
                              className={options.className}
                              onClick={options.onClick}
                              onKeyDown={options.onKeyDown}
                              leftIcon={options.leftIcon}
                              rightIcon={options.rightIcon}
                              style={options.style}
                              selected={options.selected}
                              
                              // Props específicas
                              tab={tab}
                              idx={idx}
                              
                              // Estados de drag & drop
                              isDragging={draggedTabIndex === idx}
                              isDragOver={dragOverTabIndex === idx}
                              dragStartTimer={dragStartTimer}
                              draggedTabIndex={draggedTabIndex}
                              
                              // Props de iconos
                              tabDistros={tabDistros}
                              
                              // Event handlers
                              onTabDragStart={handleTabDragStart}
                              onTabDragOver={handleTabDragOver}
                              onTabDragLeave={handleTabDragLeave}
                              onTabDrop={handleTabDrop}
                              onTabDragEnd={handleTabDragEnd}
                              onTabContextMenu={handleTabContextMenu}
                              onTabClose={handleTabClose}
                            />
                          )}
                        />
                      );
                    })}
                    </TabView>
                  )}
                  {/* Menús contextuales refactorizados */}
                  <TabContextMenu
                    tabContextMenu={tabContextMenu}
                    setTabContextMenu={setTabContextMenu}
                    tabGroups={tabGroups}
                    moveTabToGroup={moveTabToGroup}
                    setShowCreateGroupDialog={setShowCreateGroupDialog}
                    isGroupFavorite={isGroupFavorite}
                    addGroupToFavorites={addGroupToFavorites}
                    removeGroupFromFavorites={removeGroupFromFavorites}
                    getTabsInGroup={getTabsInGroup}
                    deleteGroup={deleteGroup}
                    toast={toast}
                  />

                  
                  <TerminalContextMenu
                    terminalContextMenu={terminalContextMenu}
                    setTerminalContextMenu={setTerminalContextMenu}
                    onCopy={handleCopyFromTerminalWrapper}
                                          onPaste={handlePasteToTerminalWrapper}
                      onSelectAll={handleSelectAllTerminalWrapper}
                      onClear={handleClearTerminalWrapper}
                  />

                  <OverflowMenu
                    showOverflowMenu={showOverflowMenu}
                    setShowOverflowMenu={setShowOverflowMenu}
                    overflowMenuPosition={overflowMenuPosition}
                    overflowMenuItems={overflowMenuItems}
                  />

                </div>
                                <div style={{ 
                  flexGrow: 1, 
                  position: 'relative',
                  background: isHomeTabActive ? localTerminalBg : undefined
                }}>
                  {/* SIEMPRE renderizar todas las pestañas para preservar conexiones SSH */}
                  {/* Overlay para grupo vacío se muestra por encima */}
                  {activeGroupId !== null && getTabsInGroup(activeGroupId).length === 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'var(--ui-content-bg, #222)',
                      color: '#888', textAlign: 'center', padding: '2rem 0',
                      zIndex: 1000,
                      backdropFilter: 'blur(2px)'
                    }}>
                      <i className="pi pi-folder-open" style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }} />
                      <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Este grupo está vacío</div>
                      <div style={{ fontSize: 15, marginBottom: 0 }}>Crea una nueva pestaña o arrastra aquí una existente.</div>
                    </div>
                  )}
                  
                  {/* SIEMPRE renderizar TODAS las pestañas para preservar conexiones SSH */}
                  {[...homeTabs, ...sshTabs, ...rdpTabs, ...guacamoleTabs, ...fileExplorerTabs].map((tab) => {
                      const filteredTabs = getFilteredTabs();
                      const isInActiveGroup = filteredTabs.some(filteredTab => filteredTab.key === tab.key);
                      const tabIndexInActiveGroup = filteredTabs.findIndex(filteredTab => filteredTab.key === tab.key);
                      const isActiveTab = isInActiveGroup && tabIndexInActiveGroup === activeTabIndex;
                      
                      return (
                        <div 
                          key={tab.key}
                          style={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            width: '100%',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            visibility: isActiveTab ? 'visible' : 'hidden',
                            zIndex: isActiveTab ? 1 : 0,
                            pointerEvents: isActiveTab ? 'auto' : 'none',
                            background: (tab.type === TAB_TYPES.HOME && isActiveTab) ? localTerminalBg : undefined
                          }}
                        >
                          <TabContentRenderer
                            tab={tab}
                            isActiveTab={isActiveTab}
                            // HomeTab props
                              onCreateSSHConnection={onOpenSSHConnection}
                            openFolderDialog={openFolderDialog}
                            onOpenRdpConnection={onOpenRdpConnection}
                            handleLoadGroupFromFavorites={handleLoadGroupFromFavorites}
                            openEditRdpDialog={openEditRdpDialog}
                            openEditSSHDialog={openEditSSHDialog}
                            nodes={nodes}
                              localFontFamily={localFontFamily}
                              localFontSize={localFontSize}
                              localLinuxTerminalTheme={localLinuxTerminalTheme}
                            localPowerShellTheme={localPowerShellTheme}
                            // FileExplorer props
                              iconTheme={iconTheme}
                              explorerFont={explorerFont}
                              explorerColorTheme={explorerColorTheme}
                              explorerFontSize={explorerFontSize}
                            // SplitLayout props
                              fontFamily={fontFamily}
                              fontSize={fontSize}
                            terminalTheme={terminalTheme}
                            handleTerminalContextMenu={handleTerminalContextMenu}
                            showTerminalContextMenu={showTerminalContextMenu}
                              sshStatsByTabId={sshStatsByTabId}
                              terminalRefs={terminalRefs}
                              statusBarIconTheme={statusBarIconTheme}
                            handleCloseSplitPanel={handleCloseSplitPanel}
                            // RDP props
                            rdpTabs={rdpTabs}
                            findNodeByKey={findNodeByKey}
                            // Terminal props
                            terminalSshStatsByTabId={sshStatsByTabId}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <Card title="Contenido Principal" style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%' }}>
                <p className="m-0">
                  Bienvenido a la aplicación de escritorio. Seleccione un archivo del panel lateral para ver su contenido.
                </p>
                {selectedNodeKey && (
                  <div className="mt-3">
                    <p>Elemento seleccionado: {Object.keys(selectedNodeKey)[0]}</p>
                  </div>
                )}
                <div className="mt-3">
                  <p>Puedes arrastrar y soltar elementos en el panel lateral para reorganizarlos.</p>
                  <p>Haz clic en el botón "+" para crear carpetas nuevas.</p>
                  <p>Para eliminar un elemento, haz clic en el botón de la papelera que aparece al pasar el ratón.</p>
                </div>
              </Card>
            )}
          </SplitterPanel>
        </Splitter>
      </div>


    </div>
  );
};

export default App;
