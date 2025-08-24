import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTabManagement } from '../hooks/useTabManagement';
import { useConnectionManagement } from '../hooks/useConnectionManagement';
import { useSidebarManagement } from '../hooks/useSidebarManagement';
import { useThemeManagement } from '../hooks/useThemeManagement';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useLocalStorageString, useLocalStorageNumber } from '../hooks/useLocalStorage';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { useDialogManagement } from '../hooks/useDialogManagement';
import { useContextMenuManagement } from '../hooks/useContextMenuManagement';
import { useWindowManagement } from '../hooks/useWindowManagement';
import { useTreeManagement } from '../hooks/useTreeManagement';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { Menu } from 'primereact/menu';
import { ContextMenu } from 'primereact/contextmenu';
import TerminalComponent from './TerminalComponent';
import FileExplorer from './FileExplorer';
import Sidebar from './Sidebar';
import SplitLayout from './SplitLayout';
import { InputNumber } from 'primereact/inputnumber';
import { themes } from '../themes';
import { iconThemes } from '../themes/icon-themes';
import { explorerFonts } from '../themes';
import { uiThemes } from '../themes/ui-themes';
// Importar iconos para distribuciones
import { FaLinux, FaUbuntu, FaRedhat, FaCentos, FaFedora } from 'react-icons/fa';
import { SiDebian } from 'react-icons/si';
import { getVersionInfo } from '../version-info';
import { themeManager } from '../utils/themeManager';
import { statusBarThemeManager } from '../utils/statusBarThemeManager';
import ThemeSelector from './ThemeSelector';
import SettingsDialog from './SettingsDialog';
import TitleBar from './TitleBar';
import HomeTab from './HomeTab';
import { SSHDialog, FolderDialog, GroupDialog } from './Dialogs';
import SessionManager from '../services/SessionManager';
import SyncSettingsDialog from './SyncSettingsDialog';
import RdpManager from './RdpManager';
import RdpSessionTab from './RdpSessionTab';
import GuacamoleTab from './GuacamoleTab';
import GuacamoleTerminal from './GuacamoleTerminal';
import { unblockAllInputs, detectBlockedInputs } from '../utils/formDebugger';
import '../assets/form-fixes.css';
import connectionStore, { recordRecent, toggleFavorite, addGroupToFavorites, removeGroupFromFavorites, isGroupFavorite, helpers as connectionHelpers } from '../utils/connectionStore';

// Componente para mostrar icono según distribución
const DistroIcon = ({ distro, size = 14 }) => {
  const iconStyle = { fontSize: `${size}px`, marginRight: '6px' };
  
  switch (distro) {
    case 'ubuntu':
      return <FaUbuntu style={iconStyle} />;
    case 'debian':
      return <SiDebian style={iconStyle} />;
    case 'rhel':
    case 'redhat':
      return <FaRedhat style={iconStyle} />;
    case 'centos':
      return <FaCentos style={iconStyle} />;
    case 'fedora':
      return <FaFedora style={iconStyle} />;
    case 'arch':
    default:
      return <FaLinux style={iconStyle} />;
  }
};

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
    handleLoadGroupFromFavorites, createNewGroup, deleteGroup, moveTabToGroup, cleanupTabDistro
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
    handleCopyFromTerminal: copyFromTerminal, handlePasteToTerminal: pasteToTerminal, handleSelectAllTerminal: selectAllTerminal, handleClearTerminal: clearTerminal,
    cleanupTerminalRef, disconnectSSHSession, disconnectSplitSession, disconnectRDPSession,
    resizeTerminals, reloadSessionsFromStorage
  } = useSessionManagement(toast);

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
      label: `${sshNode.label} (${sshTabs.filter(t => t.originalKey === sshNode.key).length + 1})`,
      originalKey: sshNode.key,
          sshConfig: sshConfig,
      type: 'terminal'
    };

    setSshTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab => {
        if (tab.key === existingTab.key) {
          return {
            ...tab,
            type: 'split',
            orientation: orientation, // Guardar la orientación
            leftTerminal: { ...tab, type: 'terminal' }, // Terminal izquierdo (existente)
            rightTerminal: newTerminal, // Terminal derecho (nuevo)
            label: `Split ${orientation === 'horizontal' ? '─' : '│'}: ${tab.label.split(' (')[0]} | ${sshNode.label}`
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

  // Usar el hook de gestión del sidebar
  const {
    nodes, setNodes,
    selectedNode, setSelectedNode,
    isGeneralTreeMenu, setIsGeneralTreeMenu,
    sidebarCallbacksRef,
    parseWallixUser,
    getActiveConnectionIds,
    getTreeContextMenuItems,
    getGeneralTreeContextMenuItems
  } = useSidebarManagement(toast, {
    activeGroupId, setActiveGroupId, activeTabIndex, setActiveTabIndex,
    setGroupActiveIndices, setSshTabs, setLastOpenedTabKey, setOnCreateActivateTabKey,
    getFilteredTabs, openFileExplorer, openInSplit, onOpenRdpConnection,
    homeTabs, fileExplorerTabs, sshTabs
  });

  // Estados que no están en el hook (se mantienen en App.js)
  // Storage key for persistence
  const STORAGE_KEY = 'basicapp2_tree_data';

  // === FUNCIONES DE GRUPOS ===
  // (Movidas al hook useTabManagement)

  // Tras crear una pestaña marcada para activación, fijar activeTabIndex al índice real y limpiar la marca
  useEffect(() => {
    if (!onCreateActivateTabKey) return;
    // Asegurar estar en Home
    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || 'no-group';
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

  // Mantener la preferencia del último abierto hasta que se abra otro

  // Manejar menú contextual de pestañas
  const handleTabContextMenu = (e, tabKey) => {
    e.preventDefault();
    e.stopPropagation();
    
    setTabContextMenu({
      tabKey,
      x: e.clientX,
      y: e.clientY
    });
  };

  // Effect para escuchar actualizaciones de estadísticas y capturar el distro
  useEffect(() => {
    if (!window.electron) return;

    // Obtener todos los tabIds actuales de terminales SSH (incluyendo splits)
    const currentTerminalTabs = [];
    sshTabs.forEach(tab => {
      if (tab.type === 'terminal') {
        currentTerminalTabs.push(tab.key);
      } else if (tab.type === 'split') {
        // Agregar ambos terminales del split
        if (tab.leftTerminal) currentTerminalTabs.push(tab.leftTerminal.key);
        if (tab.rightTerminal) currentTerminalTabs.push(tab.rightTerminal.key);
      }
    });
    
    // Remover listeners de pestañas que ya no existen
    activeListenersRef.current.forEach(tabId => {
      if (!currentTerminalTabs.includes(tabId)) {
        const eventName = `ssh-stats:update:${tabId}`;
        window.electron.ipcRenderer.removeAllListeners(eventName);
        activeListenersRef.current.delete(tabId);
      }
    });

    // Agregar listeners para nuevas pestañas
    currentTerminalTabs.forEach(tabId => {
      if (!activeListenersRef.current.has(tabId)) {
        const eventName = `ssh-stats:update:${tabId}`;
        const listener = (stats) => {
          setSshStatsByTabId(prev => ({ ...prev, [tabId]: stats }));
          // Mantener compatibilidad con distro tracking
          if (stats && stats.distro) {
            setTabDistros(prev => ({ ...prev, [tabId]: stats.distro }));
          }
        };
        
        window.electron.ipcRenderer.on(eventName, listener);
        activeListenersRef.current.add(tabId);
      }
    });

    // Cleanup function al desmontar el componente
    return () => {
      activeListenersRef.current.forEach(tabId => {
        const eventName = `ssh-stats:update:${tabId}`;
        window.electron.ipcRenderer.removeAllListeners(eventName);
      });
      activeListenersRef.current.clear();
      
      // Limpiar timeout de resize si existe
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [sshTabs]);

  // Listeners para estado de conexión SSH
  useEffect(() => {
    if (!window.electron || !window.electron.ipcRenderer) return;

    // Función para manejar estado de conexión
    const handleConnectionStatus = (originalKey, status) => {
      // console.log('🔄 SSH estado:', originalKey, '->', status); // ELIMINADO
      setSshConnectionStatus(prevStatus => {
        const newStatus = { ...prevStatus, [originalKey]: status };
        // console.log('Nuevo estado sshConnectionStatus:', newStatus); // ELIMINADO
        return newStatus;
      });
    };

    // Listeners estables con referencias fijas
    const handleSSHReady = (data) => {
      // console.log('✅ SSH conectado para originalKey:', data?.originalKey); // ELIMINADO
      if (data?.originalKey) {
        handleConnectionStatus(data.originalKey, 'connected');
      }
    };

    const handleSSHError = (data) => {
      // console.log('❌ SSH error para originalKey:', data?.originalKey, 'error:', data?.error); // ELIMINADO
      if (data?.originalKey) {
        handleConnectionStatus(data.originalKey, 'error');
      }
    };

    const handleSSHDisconnected = (data) => {
      // console.log('🔌 SSH desconectado para originalKey:', data?.originalKey); // ELIMINADO
      if (data?.originalKey) {
        handleConnectionStatus(data.originalKey, 'disconnected');
      }
    };

    // Registrar listeners
    // console.log('Registrando listeners SSH IPC'); // ELIMINADO
    window.electron.ipcRenderer.on('ssh-connection-ready', handleSSHReady);
    window.electron.ipcRenderer.on('ssh-connection-error', handleSSHError);
    window.electron.ipcRenderer.on('ssh-connection-disconnected', handleSSHDisconnected);

    // Cleanup usando removeAllListeners para asegurar limpieza completa
    return () => {
      // console.log('🧹 Limpiando listeners SSH IPC'); // ELIMINADO
      window.electron.ipcRenderer.removeAllListeners('ssh-connection-ready');
      window.electron.ipcRenderer.removeAllListeners('ssh-connection-error');
      window.electron.ipcRenderer.removeAllListeners('ssh-connection-disconnected');
    };
  }, []);



  // Status bar icon theme usando useLocalStorage
  const [statusBarIconTheme, setStatusBarIconTheme] = useLocalStorageString('basicapp_statusbar_icon_theme', 'classic');

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

  // Los estados de drag & drop ahora están en useDragAndDrop
  
  // Estado para trackear conexiones SSH
  const [sshConnectionStatus, setSshConnectionStatus] = useState({});

  // Context menu for nodes (usando el hook)
  const onNodeContextMenu = (event, node) => {
    onNodeContextMenuHook(event, node, setSelectedNode, setIsGeneralTreeMenu);
  };

  // Context menu for tree area (general) (usando el hook)
  const onTreeAreaContextMenu = (event) => {
    onTreeAreaContextMenuHook(event, setSelectedNode, setIsGeneralTreeMenu);
  };

  // Funciones para drag & drop de pestañas






  // Funciones auxiliares para el manejo de pestañas
  // getAllTabs, getTreeContextMenuItems, getGeneralTreeContextMenuItems, parseWallixUser, getActiveConnectionIds movidas al hook

  const getTabTypeAndIndex = (globalIndex) => {
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

  // === Active connections set for Home hub ===


  // Las funciones de drag & drop ahora están en useDragAndDrop

  // Funciones para menú contextual de terminal (usando el hook)
  const handleTerminalContextMenu = (e, tabKey) => {
    e.preventDefault();
    e.stopPropagation();
    showTerminalContextMenu(tabKey, e);
  };

  const hideContextMenu = () => {
    hideTerminalContextMenu();
  };

  // Wrapper functions para las acciones de terminal (usan el hook + cierran menú)
  const handleCopyFromTerminal = (tabKey) => {
    copyFromTerminal(tabKey);
    hideContextMenu();
  };

  const handlePasteToTerminal = (tabKey) => {
    pasteToTerminal(tabKey);
    hideContextMenu();
  };

  const handleSelectAllTerminal = (tabKey) => {
    selectAllTerminal(tabKey);
    hideContextMenu();
  };

  const handleClearTerminal = (tabKey) => {
    clearTerminal(tabKey);
    hideContextMenu();
  };

  // Función para limpiar distro cuando se cierra una pestaña
  // cleanupTabDistro movido al hook useTabManagement

  // Las funciones de terminal han sido movidas a useSessionManagement y se usan a través de wrappers arriba

  const moveTabToFirst = (globalIndex) => {
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

  // Load initial nodes from localStorage or use default
  useEffect(() => {
    const savedNodes = localStorage.getItem(STORAGE_KEY);
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
    
    // Los temas ahora se cargan en useThemeManagement
  }, []);

  // Save nodes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    // Log de debug removido para limpiar la consola
          // Log de trace removido para limpiar la consola
  }, [nodes]);

  // Los auto-guardados de temas y fuentes ahora están en useThemeManagement

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

  // Helper para generar un key único e inmutable
  function generateUniqueKey() {
    return `node_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  }

  // Default tree data
  const getDefaultNodes = () => [
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
    // Puedes agregar más nodos raíz de ejemplo si quieres
  ];

  // Selected node in the tree
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);

  // Track the currently dragged node
  const [draggedNodeKey, setDraggedNodeKey] = useState(null);



  // Function to regenerate keys for the entire tree
  const regenerateKeys = (nodes, parentKey = null) => {
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
  };

  // Helper function to update nodes with automatic key regeneration
  const updateNodesWithKeys = (newNodes, message = 'Operación completada') => {
    const nodesWithUpdatedKeys = regenerateKeys(newNodes);
    setNodes(nodesWithUpdatedKeys);
    return nodesWithUpdatedKeys;
  };



  // Function to find a node by UID (most robust)
  const findNodeByUID = (nodes, uid) => {
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
  };







  // Handle drop to root area
  const handleDropToRoot = (e) => {
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
  };



  // Handle drag and drop using the hook
  const onDragDrop = (event) => {
    onDragDropTree(event, setNodes);
  };
  

  
  // --- Limpieza automática de formularios al abrir/cerrar ---
  const openNewFolderDialog = (parentKey = null) => {
    setFolderName('');
    setParentNodeKey(parentKey);
    setShowFolderDialog(true);
  };
  const closeFolderDialog = () => {
    setShowFolderDialog(false);
    setFolderName('');
    setParentNodeKey(null);
  };
  const openNewSSHDialog = (targetFolder = null) => {
    setSSHName('');
    setSSHHost('');
    setSSHUser('');
    setSSHPassword('');
    setSSHRemoteFolder('');
    setSSHPort(22);
    setSSHTargetFolder(targetFolder);
    setShowSSHDialog(true);
  };
  const closeSSHDialog = () => {
    setShowSSHDialog(false);
    setSSHName('');
    setSSHHost('');
    setSSHUser('');
    setSSHPassword('');
    setSSHRemoteFolder('');
    setSSHPort(22);
    setSSHTargetFolder(null);
  };
  
  // Create a new folder
  const createNewFolder = () => {
    if (!folderName.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre de carpeta no puede estar vacío',
        life: 3000
      });
      return;
    }
    try {
      const newKey = generateUniqueKey();
      const newFolder = {
        key: newKey,
        label: folderName.trim(),
        droppable: true,
        children: [],
        uid: newKey,
        createdAt: new Date().toISOString(),
        isUserCreated: true
      };
      const nodesCopy = deepCopy(nodes);
      if (parentNodeKey === null) {
        nodesCopy.push(newFolder);
      } else {
        const parentNode = findNodeByKey(nodesCopy, parentNodeKey);
        if (!parentNode) {
          throw new Error(`Parent node with key ${parentNodeKey} not found`);
        }
        parentNode.children = parentNode.children || [];
        parentNode.children.push(newFolder);
      }
      setNodes(() => logSetNodes('createNewFolder', nodesCopy));
      // Log de debug removido para limpiar la consola
      closeFolderDialog();
      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `Carpeta "${folderName}" creada`,
        life: 3000
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo crear la carpeta',
        life: 3000
      });
    }
  };
  

  
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
  
  // Node template simplificado - acciones movidas al menú contextual
  const nodeTemplate = (node, options) => {
    const isFolder = node.droppable;
    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && node.data.type === 'rdp';
    // Icono según tema seleccionado para la sidebar
    let icon = null;
    if (isSSH) {
      icon = iconThemes[iconThemeSidebar]?.icons?.ssh || <span className="pi pi-desktop" />;
    } else if (isRDP) {
      icon = iconThemes[iconThemeSidebar]?.icons?.rdp || <span className="pi pi-desktop" style={{ color: '#007ad9' }} />;
    } else if (isFolder) {
      icon = options.expanded
        ? (iconThemes[iconThemeSidebar]?.icons?.folderOpen || <span className="pi pi-folder-open" />)
        : (iconThemes[iconThemeSidebar]?.icons?.folder || <span className="pi pi-folder" />);
    }

    // Obtener estado de conexión para sesiones SSH
    const connectionStatus = isSSH ? sshConnectionStatus[node.key] : null;
    const getConnectionIndicator = () => {
      if (!isSSH) return null;
      switch (connectionStatus) {
        case 'connected':
          return <span className="connection-indicator connected" title="Conectado">●</span>;
        case 'error':
          return <span className="connection-indicator error" title="Error de conexión">●</span>;
        case 'disconnected':
          return <span className="connection-indicator disconnected" title="Desconectado">●</span>;
        default:
          return <span className="connection-indicator disconnected" title="Desconectado">●</span>;
      }
    };

    return (
      <div className="flex align-items-center gap-1"
        onContextMenu={options.onNodeContextMenu ? (e) => options.onNodeContextMenu(e, node) : undefined}
        onDoubleClick={(isSSH || isRDP) ? (e) => {
          e.stopPropagation();
          if (activeGroupId !== null) {
            const currentGroupKey = activeGroupId || 'no-group';
            setGroupActiveIndices(prev => ({
              ...prev,
              [currentGroupKey]: activeTabIndex
            }));
            setActiveGroupId(null);
          }
          
          if (isSSH) {
            setSshTabs(prevTabs => {
              const tabId = `${node.key}_${Date.now()}`;
              const sshConfig = {
                host: node.data.useBastionWallix ? node.data.targetServer : node.data.host,
                username: node.data.user,
                password: node.data.password,
                port: node.data.port || 22,
                originalKey: node.key,
                useBastionWallix: node.data.useBastionWallix || false,
                bastionHost: node.data.bastionHost || '',
                bastionUser: node.data.bastionUser || ''
              };
              const newTab = {
                key: tabId,
                label: `${node.label} (${prevTabs.filter(t => t.originalKey === node.key).length + 1})`,
                originalKey: node.key,
                sshConfig: sshConfig,
                type: 'terminal',
                groupId: null
              };
              const newTabs = [newTab, ...prevTabs];
              setActiveTabIndex(homeTabs.length);
              setGroupActiveIndices(prev => ({
                ...prev,
                'no-group': homeTabs.length
              }));
              return newTabs;
            });
          } else if (isRDP) {
            onOpenRdpConnection(node);
          }
        } : undefined}
        onClick={isSSH ? (e) => {} : undefined}
        style={{ cursor: 'pointer', fontFamily: sidebarFont }}
        title="Click derecho para más opciones"
      >
        <span style={{ minWidth: 16 }}>{icon}</span>
        <span className="node-label">{node.label}</span>
        {getConnectionIndicator()}
      </div>
    );
  };





  // Función recursiva para obtener todas las carpetas del árbol
  const getAllFolders = (nodes, prefix = '') => {
    let folders = [];
    for (const node of nodes) {
      if (node.droppable) {
        folders.push({ label: prefix + node.label, value: node.key });
        if (node.children && node.children.length > 0) {
          folders = folders.concat(getAllFolders(node.children, prefix + node.label + ' / '));
        }
      }
    }
    return folders;
  };

  // Función para crear una nueva conexión SSH
  const createNewSSH = () => {
    if (!sshName.trim() || !sshHost.trim() || !sshUser.trim() || !sshPassword.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Todos los campos son obligatorios',
        life: 3000
      });
      return;
    }
    
    // Detectar automáticamente si es formato Wallix
    const userInfo = parseWallixUser(sshUser.trim());
    
    const newKey = generateUniqueKey();
    const newSSHNode = {
      key: newKey,
      label: sshName.trim(),
      data: {
        host: sshHost.trim(),
        user: userInfo.isWallix ? userInfo.targetUser : sshUser.trim(),
        password: sshPassword.trim(),
        remoteFolder: sshRemoteFolder.trim(),
        port: sshPort,
        type: 'ssh',
        // Datos del bastión Wallix (si aplica)
        useBastionWallix: userInfo.isWallix,
        bastionHost: userInfo.isWallix ? sshHost.trim() : '', // En Wallix, el host es el bastión
        bastionUser: userInfo.isWallix ? userInfo.bastionUser : '',
        targetServer: userInfo.isWallix ? userInfo.targetServer : ''
      },
      draggable: true,
      droppable: false, // Las sesiones SSH NO pueden contener otros elementos
      uid: newKey,
      createdAt: new Date().toISOString(),
      isUserCreated: true
    };
    const nodesCopy = deepCopy(nodes);
    if (sshTargetFolder) {
      const parentNode = findNodeByKey(nodesCopy, sshTargetFolder);
      if (parentNode) {
        parentNode.children = parentNode.children || [];
        parentNode.children.unshift(newSSHNode);
      } else {
        nodesCopy.push(newSSHNode);
      }
    } else {
      nodesCopy.unshift(newSSHNode);
    }
    setNodes(() => logSetNodes('createNewSSH', nodesCopy));
    // Log de debug removido para limpiar la consola
    closeSSHDialog();
    toast.current.show({
      severity: 'success',
      summary: 'SSH añadida',
      detail: `Conexión SSH "${sshName}" añadida al árbol`,
      life: 3000
    });
  };

  const createNewRdp = () => {
    if (!rdpName.trim() || !rdpServer.trim() || !rdpUsername.trim() || !rdpPassword.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Todos los campos son obligatorios',
        life: 3000
      });
      return;
    }
    
    const newKey = generateUniqueKey();
    const newRdpNode = {
      key: newKey,
      label: rdpName.trim(),
      data: {
        server: rdpServer.trim(),
        username: rdpUsername.trim(),
        password: rdpPassword.trim(),
        port: rdpPort,
        clientType: rdpClientType,
        resolution: '1920x1080',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: true,
        fullscreen: false,
        span: false,
        admin: false,
        public: false,
        type: 'rdp'
      },
      draggable: true,
      droppable: false,
      uid: newKey,
      createdAt: new Date().toISOString(),
      isUserCreated: true
    };
    
    const nodesCopy = deepCopy(nodes);
    if (rdpTargetFolder) {
      const parentNode = findNodeByKey(nodesCopy, rdpTargetFolder);
      if (parentNode) {
        parentNode.children = parentNode.children || [];
        parentNode.children.unshift(newRdpNode);
      } else {
        nodesCopy.push(newRdpNode);
      }
    } else {
      nodesCopy.unshift(newRdpNode);
    }
    
    setNodes(() => logSetNodes('createNewRdp', nodesCopy));
    // Log de debug removido para limpiar la consola
    closeRdpDialog();
    toast.current.show({
      severity: 'success',
      summary: 'RDP añadida',
      detail: `Conexión RDP "${rdpName}" añadida al árbol`,
      life: 3000
    });
  };

  const openNewRdpDialog = (targetFolder = null) => {
    setRdpTargetFolder(targetFolder);
    setRdpName('');
    setRdpServer('');
    setRdpUsername('');
    setRdpPassword('');
    setRdpPort(3389);
    setShowRdpDialog(true);
  };

  const closeRdpDialog = () => {
    setShowRdpDialog(false);
    setRdpTargetFolder(null);
    setRdpName('');
    setRdpServer('');
    setRdpUsername('');
    setRdpPassword('');
    setRdpPort(3389);
    setRdpClientType('mstsc');
  };

  const openEditRdpDialog = (node) => {
    // Logs de debug removidos para limpiar la consola
    // Abrir el gestor de conexiones RDP con los datos del nodo para editar
    setRdpNodeData(node.data);
    setEditingRdpNode(node);
    setShowRdpManager(true);
    // Log de debug removido para limpiar la consola
  };



  // Función para abrir el diálogo de edición SSH
  const openEditSSHDialog = (node) => {
    setEditSSHNode(node);
    setEditSSHName(node.label);
    setEditSSHHost(node.data?.bastionHost || node.data?.host || '');
    // Mostrar el usuario original completo si es Wallix, o el usuario simple si es directo
    setEditSSHUser(node.data?.useBastionWallix ? node.data?.bastionUser || '' : node.data?.user || '');
    setEditSSHPassword(node.data?.password || '');
    setEditSSHRemoteFolder(node.data?.remoteFolder || '');
    setEditSSHPort(node.data?.port || 22);
    setShowEditSSHDialog(true);
  };

  // Función para guardar la edición SSH
  const saveEditSSH = () => {
    if (!editSSHName.trim() || !editSSHHost.trim() || !editSSHUser.trim() || !editSSHPassword.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Todos los campos son obligatorios excepto la carpeta remota',
        life: 3000
      });
      return;
    }
    
    // Detectar automáticamente si es formato Wallix
    const userInfo = parseWallixUser(editSSHUser.trim());
    
    const nodesCopy = deepCopy(nodes);
    const nodeToEdit = findNodeByKey(nodesCopy, editSSHNode.key);
    if (nodeToEdit) {
      nodeToEdit.label = editSSHName.trim();
      nodeToEdit.data = { 
        ...nodeToEdit.data, 
        host: userInfo.isWallix ? userInfo.targetServer : editSSHHost.trim(), // Si es Wallix, el host real es el targetServer
        user: userInfo.isWallix ? userInfo.targetUser : editSSHUser.trim(),
        password: editSSHPassword.trim(),
        remoteFolder: editSSHRemoteFolder.trim(),
        port: editSSHPort,
        type: 'ssh',
        // Datos del bastión Wallix (si aplica)
        useBastionWallix: userInfo.isWallix,
        bastionHost: userInfo.isWallix ? editSSHHost.trim() : '', // En Wallix, el host ingresado es el bastión
        bastionUser: userInfo.isWallix ? userInfo.bastionUser : '',
        targetServer: userInfo.isWallix ? userInfo.targetServer : ''
      };
      nodeToEdit.droppable = false; // Asegurar que las sesiones SSH no sean droppable
    }
    setNodes(nodesCopy);
    closeSSHDialog();
    setEditSSHNode(null);
    setEditSSHName(''); 
    setEditSSHHost(''); 
    setEditSSHUser('');
    setEditSSHPassword('');
    setEditSSHRemoteFolder('');
    setEditSSHPort(22);
    toast.current.show({
      severity: 'success',
      summary: 'SSH editada',
      detail: `Sesión SSH actualizada`,
      life: 3000
    });
  };

  // Función para abrir el diálogo de edición de carpeta
  const openEditFolderDialog = (node) => {
    setEditFolderNode(node);
    setEditFolderName(node.label);
    setShowEditFolderDialog(true);
  };

  // Función para guardar la edición de la carpeta
  const saveEditFolder = () => {
    if (!editFolderName.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre de la carpeta no puede estar vacío',
        life: 3000
      });
      return;
    }
    const nodesCopy = deepCopy(nodes);
    const nodeToEdit = findNodeByKey(nodesCopy, editFolderNode.key);
    if (nodeToEdit) {
      nodeToEdit.label = editFolderName.trim();
    }
    setNodes(nodesCopy);
    closeFolderDialog();
    setEditFolderNode(null);
    setEditFolderName('');
    toast.current.show({
      severity: 'success',
      summary: 'Carpeta editada',
      detail: `Nombre actualizado`,
      life: 3000
    });
  };

  // useEffect para redimensionar cuando cambia la pestaña activa ahora está en useWindowManagement

  // useEffect para redimensionar cuando se colapsa/expande el sidebar ahora está en useWindowManagement

  // Optimización para redimensionamiento fluido del splitter ahora está en useWindowManagement

  // Las funciones de resize ahora están en useWindowManagement

  // Función para abrir explorador de archivos SSH





  // Los estados de ventana y expansión ahora están en useWindowManagement

  // Los grupos no se guardan al reiniciar la aplicación
  // useEffect(() => {
  //   try {
  //     localStorage.setItem('tabGroups', JSON.stringify(tabGroups));
  //   } catch {}
  // }, [tabGroups]);



  // sshStatsByTabId ahora está en useSessionManagement

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

  // Estado global para el intervalo de pooling de la status bar usando useLocalStorage
  const [statusBarPollingInterval, setStatusBarPollingInterval] = useLocalStorageNumber('statusBarPollingInterval', 5);

  // Enviar al backend cuando cambie (localStorage ya se maneja automáticamente)
  useEffect(() => {
    if (window?.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('statusbar:set-polling-interval', statusBarPollingInterval);
    }
  }, [statusBarPollingInterval]);

  // statusBarIconTheme se guarda automáticamente en localStorage por useLocalStorage

  // Listener para actualizaciones de configuración desde sincronización
  useEffect(() => {
    const handleSettingsUpdate = (event) => {
      if (event.detail?.source === 'sync') {
        console.log('[SYNC] Actualizando estados React tras sincronización...');
        
        // Actualizar temas desde sincronización usando el hook
        updateThemesFromSync();
        
        // Actualizar estados restantes que no están en el hook de temas
        const updatedStatusBarIconTheme = localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic';
        const updatedStatusBarPollingInterval = localStorage.getItem('statusBarPollingInterval');
        
        setStatusBarIconTheme(updatedStatusBarIconTheme);
        if (updatedStatusBarPollingInterval) {
          setStatusBarPollingInterval(parseInt(updatedStatusBarPollingInterval, 10));
        }
        
        // Debug
        const currentUIThemeInLocalStorage = localStorage.getItem('ui_theme');
        console.log('[SYNC] [APP] Tema UI en localStorage después de sync:', currentUIThemeInLocalStorage);
        console.log('[SYNC] ✓ Estados React actualizados');
      }
    };

    window.addEventListener('settings-updated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);

  const localTerminalBg = themes[localLinuxTerminalTheme]?.theme?.background || '#222';
  const isHomeTabActive = activeTabIndex === 0 && homeTabs.length > 0;

  const [sidebarFilter, setSidebarFilter] = useState('');

  // Función para buscar conexiones en el árbol de nodos
  const findAllConnections = (nodes) => {
    let results = [];
    for (const node of nodes) {
      if (node.data && node.data.type === 'ssh') {
        results.push(node);
      }
      if (node.children && node.children.length > 0) {
        results = results.concat(findAllConnections(node.children));
      }
    }
    return results;
  };







  // Función para desbloquear formularios cuando sea necesario
  const handleUnblockForms = () => {
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

  // Exponer la función globalmente para el menú de la aplicación
  useEffect(() => {
    window.handleUnblockForms = handleUnblockForms;
    return () => {
      delete window.handleUnblockForms;
    };
  }, []);

  // Handler para crear pestañas de Guacamole
  useEffect(() => {
    const handleGuacamoleCreateTab = async (event, data) => {
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

    // Escuchar eventos de creación de pestañas de Guacamole
    if (window.electron && window.electron.ipcRenderer) {
      const unsubscribe = window.electron.ipcRenderer.on('guacamole:create-tab', handleGuacamoleCreateTab);
      return () => { try { if (typeof unsubscribe === 'function') unsubscribe(); } catch {} };
    }
  }, []);

  const handleSaveRdpToSidebar = (rdpData, isEditing = false, originalNode = null) => {
    if (isEditing && originalNode) {
      // Actualizar nodo existente
      setNodes(prevNodes => {
        const nodesCopy = Array.isArray(prevNodes) ? [...prevNodes] : [];
        const nodeToEdit = findNodeByKey(nodesCopy, originalNode.key);
        
        if (nodeToEdit) {
          nodeToEdit.label = rdpData.name || `${rdpData.server}:${rdpData.port}`;
          nodeToEdit.data = {
            ...nodeToEdit.data,
            type: 'rdp',
            name: rdpData.name,
            server: rdpData.server,
            username: rdpData.username,
            password: rdpData.password,
            port: rdpData.port || 3389,
            clientType: rdpData.clientType || 'mstsc',
            resolution: rdpData.resolution || '1920x1080',
            colorDepth: rdpData.colorDepth || 32,
            redirectFolders: rdpData.redirectFolders === true,
            redirectClipboard: rdpData.redirectClipboard === true,
            redirectPrinters: rdpData.redirectPrinters === true,
            redirectAudio: rdpData.redirectAudio === true,
            fullscreen: rdpData.fullscreen === true,
            smartSizing: rdpData.smartSizing === true,
            span: rdpData.span === true,
            admin: rdpData.admin === true,
            public: rdpData.public === true,
            // Campos específicos de Guacamole
            autoResize: rdpData.autoResize === true,
            guacDpi: rdpData.guacDpi || 96,
            guacSecurity: rdpData.guacSecurity || 'any',
            guacEnableWallpaper: rdpData.guacEnableWallpaper === true,
            guacEnableDrive: rdpData.guacEnableDrive === true,
            guacDriveHostDir: (typeof rdpData.guacDriveHostDir === 'string') ? rdpData.guacDriveHostDir : '',
            guacEnableGfx: (rdpData.guacEnableGfx === true) || (rdpData.guacWin11Compat === true),
            // Nuevos flags avanzados
            guacEnableDesktopComposition: rdpData.guacEnableDesktopComposition === true,
            guacEnableFontSmoothing: rdpData.guacEnableFontSmoothing === true,
            guacEnableTheming: rdpData.guacEnableTheming === true,
            guacEnableFullWindowDrag: rdpData.guacEnableFullWindowDrag === true,
            guacEnableMenuAnimations: rdpData.guacEnableMenuAnimations === true,
            guacDisableGlyphCaching: rdpData.guacDisableGlyphCaching === true,
            guacDisableOffscreenCaching: rdpData.guacDisableOffscreenCaching === true,
            guacDisableBitmapCaching: rdpData.guacDisableBitmapCaching === true,
            guacDisableCopyRect: rdpData.guacDisableCopyRect === true
          };
          
          // console.log('=== NODE UPDATED ===');
          // console.log('Updated node data:', JSON.stringify(nodeToEdit.data, null, 2));
          // console.log('smartSizing in node:', nodeToEdit.data.smartSizing);
          // console.log('====================');
        }
        
        return nodesCopy;
      });
    } else {
      // Crear un nuevo nodo RDP en la sidebar
      const newNode = {
        key: `rdp_${Date.now()}`,
        label: rdpData.name || `${rdpData.server}:${rdpData.port}`,
        data: {
          type: 'rdp',
          name: rdpData.name,
          server: rdpData.server,
          username: rdpData.username,
          password: rdpData.password,
          port: rdpData.port || 3389,
          clientType: rdpData.clientType || 'mstsc',
          resolution: rdpData.resolution || '1920x1080',
          colorDepth: rdpData.colorDepth || 32,
          redirectFolders: rdpData.redirectFolders === true,
          redirectClipboard: rdpData.redirectClipboard === true,
          redirectPrinters: rdpData.redirectPrinters === true,
          redirectAudio: rdpData.redirectAudio === true,
          fullscreen: rdpData.fullscreen === true,
          smartSizing: rdpData.smartSizing === true,
          span: rdpData.span === true,
          admin: rdpData.admin === true,
          public: rdpData.public === true,
          // Campos específicos de Guacamole
          autoResize: rdpData.autoResize === true,
          guacDpi: rdpData.guacDpi || 96,
          guacSecurity: rdpData.guacSecurity || 'any',
          guacEnableWallpaper: rdpData.guacEnableWallpaper === true,
           guacEnableDrive: rdpData.guacEnableDrive === true,
           guacDriveHostDir: (typeof rdpData.guacDriveHostDir === 'string') ? rdpData.guacDriveHostDir : '',
          guacEnableGfx: (rdpData.guacEnableGfx === true) || (rdpData.guacWin11Compat === true),
          // Nuevos flags avanzados
          guacEnableDesktopComposition: rdpData.guacEnableDesktopComposition === true,
          guacEnableFontSmoothing: rdpData.guacEnableFontSmoothing === true,
          guacEnableTheming: rdpData.guacEnableTheming === true,
          guacEnableFullWindowDrag: rdpData.guacEnableFullWindowDrag === true,
          guacEnableMenuAnimations: rdpData.guacEnableMenuAnimations === true,
          guacDisableGlyphCaching: rdpData.guacDisableGlyphCaching === true,
          guacDisableOffscreenCaching: rdpData.guacDisableOffscreenCaching === true,
          guacDisableBitmapCaching: rdpData.guacDisableBitmapCaching === true,
          guacDisableCopyRect: rdpData.guacDisableCopyRect === true
        },
        draggable: true,
        droppable: false,
        uid: `rdp_${Date.now()}`,
        createdAt: new Date().toISOString(),
        isUserCreated: true
      };

      // Agregar el nodo a la raíz del árbol
      setNodes(prevNodes => {
        const newNodes = Array.isArray(prevNodes) ? [...prevNodes] : [];
        newNodes.push(newNode);
        return newNodes;
      });
    }

    // Actualizar pestañas RDP si están abiertas
    if (isEditing && originalNode) {
      setRdpTabs(prevTabs => {
        return prevTabs.map(tab => {
          if (tab.originalKey === originalNode.key) {
            return {
              ...tab,
              label: rdpData.name || `${rdpData.server}:${rdpData.port}`,
              rdpConfig: {
                name: rdpData.name,
                server: rdpData.server,
                username: rdpData.username,
                password: rdpData.password,
                port: rdpData.port || 3389,
                clientType: rdpData.clientType || 'mstsc',
                resolution: rdpData.resolution || '1920x1080',
                colorDepth: rdpData.colorDepth || 32,
                redirectFolders: rdpData.redirectFolders === true,
                redirectClipboard: rdpData.redirectClipboard === true,
                redirectPrinters: rdpData.redirectPrinters === true,
                redirectAudio: rdpData.redirectAudio === true,
                fullscreen: rdpData.fullscreen === true,
                smartSizing: rdpData.smartSizing === true,
                span: rdpData.span === true,
                admin: rdpData.admin === true,
                public: rdpData.public === true,
                // Campos específicos de Guacamole
                autoResize: rdpData.autoResize === true,
                guacDpi: rdpData.guacDpi || 96,
                guacSecurity: rdpData.guacSecurity || 'any',
                 guacEnableWallpaper: rdpData.guacEnableWallpaper === true,
                 guacEnableDrive: rdpData.guacEnableDrive === true,
                 guacDriveHostDir: (typeof rdpData.guacDriveHostDir === 'string') ? rdpData.guacDriveHostDir : '',
                 guacEnableGfx: (rdpData.guacEnableGfx === true) || (rdpData.guacWin11Compat === true),
                 guacDisableGlyphCaching: rdpData.guacDisableGlyphCaching === true,
                 guacDisableOffscreenCaching: rdpData.guacDisableOffscreenCaching === true,
                 guacDisableBitmapCaching: rdpData.guacDisableBitmapCaching === true,
                 guacDisableCopyRect: rdpData.guacDisableCopyRect === true
              }
            };
          }
          return tab;
        });
      });
    }

    // Cerrar el diálogo del RdpManager
    setShowRdpManager(false);
    setRdpNodeData(null);
  };

  // sessionManager y reloadSessionsFromStorage ahora están en useSessionManagement

  // --- Exportar el árbol completo de nodos (carpetas + sesiones) ---
  const exportTreeToJson = () => {
    // Siempre exportar como array
    let safeNodes = Array.isArray(nodes) ? nodes : (nodes ? [nodes] : []);
    return JSON.stringify(safeNodes, null, 2);
  };
  // --- Importar el árbol completo de nodos (carpetas + sesiones) ---
  const importTreeFromJsonApp = (json) => {
    try {
      let importedNodes = JSON.parse(json);
      if (!Array.isArray(importedNodes)) {
        importedNodes = [importedNodes];
      }
      setNodes(logSetNodes('importTreeFromJsonApp', importedNodes));
      console.log('[DEBUG][importTreeFromJsonApp] nodes después de importar (replace):', importedNodes);
      return true;
    } catch (e) {
      console.error('Error importando árbol:', e);
      return false;
    }
  };

  // Helper para loggear setNodes
  const logSetNodes = (source, nodes) => {
    // Logs de debug removidos para limpiar la consola
    return nodes;
  };

  useEffect(() => {
    // Log de debug removido para limpiar la consola
  }, [nodes]);

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

  // useEffect para activar pestañas RDP cuando se agreguen
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
      <Toast ref={toast} />
      <RdpManager 
        visible={showRdpManager} 
        onHide={() => {
          setShowRdpManager(false);
          setRdpNodeData(null);
          setEditingRdpNode(null);
        }} 
        rdpNodeData={rdpNodeData}
        onSaveToSidebar={handleSaveRdpToSidebar}
        editingNode={editingRdpNode}
      />
      {/* Menú contextual del árbol de la sidebar */}
      <ContextMenu
        model={isGeneralTreeMenu ? getGeneralTreeContextMenuItems() : getTreeContextMenuItems(selectedNode)}
        ref={treeContextMenuRef}
        breakpoint="600px"
        style={{ zIndex: 99999 }}
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
                {tabGroups.length > 0 && (
                  <TabView
                    scrollable
                    activeIndex={(() => {
                      if (activeGroupId === null) return 0;
                      const idx = tabGroups.findIndex(g => g.id === activeGroupId);
                      return idx === -1 ? 0 : idx + 1;
                    })()}
                    onTabChange={e => {
                      // Solo guardar el índice activo si el grupo actual tiene pestañas
                      const currentGroupKey = activeGroupId || 'no-group';
                      const currentTabs = getTabsInGroup(activeGroupId);
                      
                      if (currentTabs.length > 0) {
                        setGroupActiveIndices(prev => ({
                          ...prev,
                          [currentGroupKey]: activeTabIndex
                        }));
                      }
                      
                      // Cambiar al nuevo grupo
                      const newGroupId = e.index === 0 ? null : tabGroups[e.index - 1].id;
                      setActiveGroupId(newGroupId);
                      
                      // Restaurar el índice activo del nuevo grupo (o 0 si es la primera vez)
                      const newGroupKey = newGroupId || 'no-group';
                      const savedIndex = groupActiveIndices[newGroupKey] || 0;
                      const tabsInNewGroup = getTabsInGroup(newGroupId);
                      
                      if (tabsInNewGroup.length > 0) {
                        const validIndex = Math.min(savedIndex, Math.max(0, tabsInNewGroup.length - 1));
                        setActiveTabIndex(validIndex);
                      } else {
                        setActiveTabIndex(0); // Reset to 0 for empty groups
                      }
                    }}
                    style={{ 
                      marginBottom: 0, 
                      '--group-ink-bar-color': activeGroupId === null ? '#bbb' : (tabGroups.find(g => g.id === activeGroupId)?.color || '#bbb')
                    }}
                    className="tabview-groups-bar"
                  >
                    <TabPanel key="no-group" 
                      style={{
                        '--tab-bg-color': '#f5f5f5',
                        '--tab-border-color': '#d0d0d0'
                      }}
                      header={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 180 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#bbb', marginRight: 4 }} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Home</span>
                        </span>
                      }
                    >
                      <div style={{display:'none'}} />
                    </TabPanel>
                    {tabGroups.map((group) => (
                      <TabPanel
                        key={group.id}
                        style={{
                          '--tab-bg-color': group.color + '33',
                          '--tab-border-color': group.color + '66'
                        }}
                        header={
                          <span 
                            style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 180 }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setTabContextMenu({
                                tabKey: group.id,
                                x: e.clientX,
                                y: e.clientY,
                                isGroup: true,
                                group: group
                              });
                            }}
                          >
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, marginRight: 4 }} />
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</span>
                            <Button
                              icon="pi pi-times"
                              className="p-button-rounded p-button-text p-button-sm"
                              style={{ marginLeft: 6, width: 16, height: 16, color: group.color, padding: 0 }}
                              onClick={e => {
                                e.stopPropagation();
                                // Mover todas las pestañas del grupo a 'Home' antes de eliminar
                                const tabsInGroup = getTabsInGroup(group.id);
                                tabsInGroup.forEach(tab => moveTabToGroup(tab.key, null));
                                deleteGroup(group.id);
                              }}
                              tooltip={"Eliminar grupo"}
                            />
                          </span>
                        }
                      >
                        <div style={{display:'none'}} />
                      </TabPanel>
                    ))}
                  </TabView>
                )}
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
                        const currentGroupKey = activeGroupId || 'no-group';
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
                      const isHomeTab = tab.type === 'home';
                      const isSSHTab = tab.type === 'terminal' || tab.type === 'split' || tab.isExplorerInSSH;
                      const originalIdx = idx; // No usamos originalIdx para decisiones críticas
                      
                      return (
                        <TabPanel 
                          key={tab.key} 
                          header={tab.label}
                          headerTemplate={(options) => {
                            const { className, onClick, onKeyDown, leftIcon, rightIcon, style, selected } = options;
                            const isDragging = draggedTabIndex === idx;
                            const isDragOver = dragOverTabIndex === idx;
                            
                            return (
                              <div
                                className={`${className} ${isDragging ? 'tab-dragging' : ''} ${isDragOver ? 'tab-drop-zone' : ''}`}
                                style={{ 
                                  ...style, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  maxWidth: 220,
                                  opacity: isDragging ? 0.5 : 1,
                                  borderLeft: isDragOver ? '3px solid var(--primary-color)' : 'none',
                                  transition: 'opacity 0.2s, border-left 0.2s',
                                  cursor: isDragging ? 'grabbing' : 'grab'
                                }}
                                onClick={(e) => {
                                  // Prevenir click si está en proceso de drag o hay un timer activo
                                  if (draggedTabIndex !== null || dragStartTimer !== null) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                  }
                                  onClick(e);
                                }}
                                onKeyDown={onKeyDown}
                                tabIndex={0}
                                aria-selected={selected}
                                role="tab"
                                draggable="true"
                                onDragStart={(e) => handleTabDragStart(e, idx)}
                                onDragOver={(e) => handleTabDragOver(e, idx)}
                                onDragLeave={handleTabDragLeave}
                                onDrop={(e) => handleTabDrop(e, idx)}
                                onDragEnd={handleTabDragEnd}
                                onContextMenu={(e) => handleTabContextMenu(e, tab.key)}
                                title="Arrastra para reordenar pestañas | Clic derecho para opciones de grupo"
                              >
                                {leftIcon}
                                {/* Mostrar icono de distribución si está disponible para pestañas de terminal */}
                                {tab.type === 'terminal' && tabDistros[tab.key] && (
                                  <DistroIcon distro={tabDistros[tab.key]} size={12} />
                                )}
                                {/* Icono específico para pestaña de inicio */}
                                {tab.type === 'home' && (
                                  <i className="pi pi-home" style={{ fontSize: '12px', marginRight: '6px', color: '#28a745' }}></i>
                                )}
                                {/* Icono específico para splits */}
                                {tab.type === 'split' && (
                                  <i className="pi pi-window-maximize" style={{ fontSize: '12px', marginRight: '6px', color: '#007ad9' }}></i>
                                )}
                                {/* Icono específico para exploradores */}
                                {(tab.type === 'explorer' || tab.isExplorerInSSH) && (
                                  <i className="pi pi-folder-open" style={{ fontSize: '12px', marginRight: '6px' }}></i>
                                )}
                                {/* Icono específico para pestañas RDP */}
                                {tab.type === 'rdp' && (
                                  <i className="pi pi-desktop" style={{ fontSize: '12px', marginRight: '6px', color: '#007ad9' }}></i>
                                )}
                                {/* Icono específico para pestañas RDP-Guacamole */}
                                {tab.type === 'rdp-guacamole' && (
                                  <i className="pi pi-desktop" style={{ fontSize: '12px', marginRight: '6px', color: '#ff6b35' }}></i>
                                )}
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
                                {tab.type !== 'home' && (
                                  <Button
                                    icon="pi pi-times"
                                    className="p-button-rounded p-button-text p-button-sm ml-2"
                                    style={{ marginLeft: 8, minWidth: 12, minHeight: 12 }}
                                    onClick={e => {
                                      e.stopPropagation();
                                      // Cierre robusto de pestaña
                                      const closedTab = tab;
                                      
                                      // Limpiar distro de la pestaña cerrada
                                      cleanupTabDistro(closedTab.key);
                                      
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
                                        const currentGroupKey = activeGroupId || 'no-group';
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
                                        const currentGroupKey = activeGroupId || 'no-group';
                                        const remainingTabs = getTabsInGroup(activeGroupId);
                                        
                                        if (remainingTabs.length > 1) { // > 1 porque la pestaña aún no se ha eliminado completamente
                                          setGroupActiveIndices(prev => ({
                                            ...prev,
                                            [currentGroupKey]: newIndex
                                          }));
                                        }
                                      }
                                    }}
                                    // tooltip="Cerrar pestaña"
                                    // tooltipOptions={{ position: 'top' }}
                                  />
                                )}
                                {rightIcon}
                              </div>
                            );
                          }}
                        />
                      );
                    })}
                    </TabView>
                  )}
                  {/* Menú contextual para grupos de pestañas */}
                  {tabContextMenu && (
                    <div
                      style={{
                        position: 'fixed',
                        left: tabContextMenu.x,
                        top: tabContextMenu.y,
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 10000,
                        minWidth: '180px',
                        overflow: 'hidden'
                      }}
                    >
                      {tabContextMenu.isGroup ? (
                        // Menú contextual para grupos
                        <>
                          <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0', fontSize: '12px', color: '#666' }}>
                            Opciones del grupo "{tabContextMenu.group.name}":
                          </div>
                                                    <div
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            onClick={() => {
                              const isAlreadyFavorite = isGroupFavorite(tabContextMenu.group.id, tabContextMenu.group.name);
                              
                                                             if (isAlreadyFavorite) {
                                 // Quitar de favoritos
                                 removeGroupFromFavorites(tabContextMenu.group.id, tabContextMenu.group.name);
                                setTabContextMenu(null);
                                toast.current.show({
                                  severity: 'info',
                                  summary: 'Grupo quitado de favoritos',
                                  detail: `El grupo "${tabContextMenu.group.name}" ha sido quitado de favoritos`,
                                  life: 3000
                                });
                              } else {
                                                               // Añadir grupo a favoritos
                               const groupWithSessions = {
                                 ...tabContextMenu.group,
                                 sessions: getTabsInGroup(tabContextMenu.group.id).map(tab => ({
                                   key: tab.key,
                                   label: tab.label,
                                   type: tab.type,
                                   groupId: tab.groupId,
                                   // Información adicional según el tipo
                                   ...(tab.sshConfig && {
                                     host: tab.sshConfig.host,
                                     username: tab.sshConfig.username,
                                     port: tab.sshConfig.port,
                                     useBastionWallix: tab.sshConfig.useBastionWallix,
                                     bastionHost: tab.sshConfig.bastionHost,
                                     bastionUser: tab.sshConfig.bastionUser
                                   }),
                                   ...(tab.rdpConfig && {
                                     host: tab.rdpConfig.server,
                                     username: tab.rdpConfig.username,
                                     port: tab.rdpConfig.port,
                                     clientType: tab.rdpConfig.clientType
                                   }),
                                   ...(tab.isExplorerInSSH && {
                                     isExplorerInSSH: true,
                                     needsOwnConnection: tab.needsOwnConnection
                                   })
                                 }))
                               };
                                addGroupToFavorites(groupWithSessions);
                                setTabContextMenu(null);
                                toast.current.show({
                                  severity: 'success',
                                  summary: 'Grupo añadido a favoritos',
                                  detail: `El grupo "${tabContextMenu.group.name}" ha sido añadido a favoritos`,
                                  life: 3000
                                });
                              }
                            }}
                          >
                            <i className={isGroupFavorite(tabContextMenu.group.id, tabContextMenu.group.name) ? 'pi pi-star-fill' : 'pi pi-star'} style={{ width: '16px' }}></i>
                            {isGroupFavorite(tabContextMenu.group.id, tabContextMenu.group.name) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                          </div>
                          <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }}></div>
                          <div
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              color: '#d32f2f'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#ffebee'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            onClick={() => {
                              // Eliminar grupo
                              const tabsInGroup = getTabsInGroup(tabContextMenu.group.id);
                              tabsInGroup.forEach(tab => moveTabToGroup(tab.key, null));
                              deleteGroup(tabContextMenu.group.id);
                              setTabContextMenu(null);
                            }}
                          >
                            <i className="pi pi-trash" style={{ width: '16px' }}></i>
                            Eliminar grupo
                          </div>
                        </>
                      ) : (
                        // Menú contextual para pestañas individuales
                        <>
                          {tabGroups.length > 0 && (
                            <>
                              <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0', fontSize: '12px', color: '#666' }}>
                                Mover a grupo:
                              </div>
                              <div
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                onClick={() => {
                                  moveTabToGroup(tabContextMenu.tabKey, null);
                                  setTabContextMenu(null);
                                }}
                              >
                                <i className="pi pi-circle" style={{ width: '16px', color: '#999' }}></i>
                                Home
                              </div>
                              {tabGroups.map(group => (
                                <div
                                  key={group.id}
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                  onClick={() => {
                                    moveTabToGroup(tabContextMenu.tabKey, group.id);
                                    setTabContextMenu(null);
                                  }}
                                >
                                  <div 
                                    style={{ 
                                      width: '12px', 
                                      height: '12px', 
                                      backgroundColor: group.color, 
                                      borderRadius: '2px' 
                                    }}
                                  ></div>
                                  {group.name}
                                </div>
                              ))}
                              <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }}></div>
                            </>
                          )}
                          <div
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            onClick={() => {
                              setTabContextMenu(null);
                              setShowCreateGroupDialog(true);
                            }}
                          >
                            <i className="pi pi-plus" style={{ width: '16px' }}></i>
                            Crear nuevo grupo
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Overlay para cerrar menú contextual de grupos */}
                  {tabContextMenu && (
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999
                      }}
                      onClick={() => setTabContextMenu(null)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setTabContextMenu(null);
                      }}
                    />
                  )}
                  
                  {/* Menú contextual personalizado */}
                  {terminalContextMenu && (
                    <div
                      style={{
                        position: 'fixed',
                        left: terminalContextMenu.mouseX,
                        top: terminalContextMenu.mouseY,
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 9999,
                        minWidth: '180px',
                        overflow: 'hidden'
                      }}
                      onMouseLeave={() => setTerminalContextMenu(null)}
                    >
                      <div
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        onClick={() => handleCopyFromTerminal(terminalContextMenu.tabKey)}
                      >
                        <i className="pi pi-copy" style={{ width: '16px' }}></i>
                        Copiar selección
                      </div>
                      <div
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        onClick={() => handlePasteToTerminal(terminalContextMenu.tabKey)}
                      >
                        <i className="pi pi-clone" style={{ width: '16px' }}></i>
                        Pegar
                      </div>
                      <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }}></div>
                      <div
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        onClick={() => handleSelectAllTerminal(terminalContextMenu.tabKey)}
                      >
                        <i className="pi pi-list" style={{ width: '16px' }}></i>
                        Seleccionar todo
                      </div>
                      <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }}></div>
                      <div
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        onClick={() => handleClearTerminal(terminalContextMenu.tabKey)}
                      >
                        <i className="pi pi-trash" style={{ width: '16px' }}></i>
                        Limpiar terminal
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay para cerrar menú al hacer clic fuera */}
                  {terminalContextMenu && (
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9998
                      }}
                      onClick={() => setTerminalContextMenu(null)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setTerminalContextMenu(null);
                      }}
                    />
                  )}

                  {/* Menú de overflow personalizado */}
                  {showOverflowMenu && (
                    <div
                      style={{
                        position: 'fixed',
                        left: overflowMenuPosition.x,
                        top: overflowMenuPosition.y,
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 9999,
                        minWidth: '200px',
                        maxHeight: '300px',
                        overflow: 'auto',
                        animation: 'contextMenuFadeIn 0.15s ease-out'
                      }}
                      onMouseLeave={() => setShowOverflowMenu(false)}
                    >
                      {overflowMenuItems.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderBottom: index < overflowMenuItems.length - 1 ? '1px solid #f0f0f0' : 'none'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          onClick={() => {
                            item.command();
                            setShowOverflowMenu(false);
                          }}
                        >
                          <i className={item.icon} style={{ width: '16px', fontSize: '14px' }}></i>
                          <span style={{ flex: 1, fontSize: '14px' }}>{item.label}</span>
                        </div>
                      ))}
                      {overflowMenuItems.length === 0 && (
                        <div style={{ padding: '12px', color: '#666', fontStyle: 'italic', fontSize: '14px' }}>
                          No hay pestañas ocultas
                        </div>
                      )}
                    </div>
                  )}

                  {/* Overlay para cerrar menú de overflow al hacer clic fuera */}
                  {showOverflowMenu && (
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9998
                      }}
                      onClick={() => setShowOverflowMenu(false)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setShowOverflowMenu(false);
                      }}
                    />
                  )}
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
                            background: (tab.type === 'home' && isActiveTab) ? localTerminalBg : undefined
                          }}
                        >
                          {tab.type === 'home' ? (
                            <HomeTab
                              onCreateSSHConnection={onOpenSSHConnection}
                              onCreateFolder={() => openNewFolderDialog(null)}
                              onCreateRdpConnection={onOpenRdpConnection}
                              onLoadGroup={handleLoadGroupFromFavorites}
                              onEditConnection={(connection) => {
                                // Intentar construir un nodo temporal según el tipo para reutilizar los editores existentes
                                if (!connection) return;
                                if (connection.type === 'rdp-guacamole' || connection.type === 'rdp') {
                                  const tempNode = {
                                    key: `temp_rdp_${Date.now()}`,
                                    label: connection.name || `${connection.host}:${connection.port || 3389}`,
                                    data: {
                                      type: 'rdp',
                                      server: connection.host,
                                      hostname: connection.host,
                                      username: connection.username,
                                      password: connection.password,
                                      port: connection.port || 3389,
                                      clientType: 'mstsc'
                                    }
                                  };
                                  openEditRdpDialog(tempNode);
                                  return;
                                }
                                if (connection.type === 'ssh' || connection.type === 'explorer') {
                                  // Reutilizar diálogo de edición SSH
                                  const tempNode = {
                                    key: `temp_ssh_${Date.now()}`,
                                    label: connection.name || `${connection.username}@${connection.host}`,
                                    data: {
                                      type: 'ssh',
                                      host: connection.host,
                                      user: connection.username,
                                      password: connection.password,
                                      port: connection.port || 22,
                                      remoteFolder: ''
                                    }
                                  };
                                  openEditSSHDialog(tempNode);
                                }
                              }}
                              // Pasar ids activos al hub para mostrar estado en los listados
                              // (ConnectionHistory acepta activeIds desde HomeTab; aquí lo calculamos y lo inyectamos a través del DOM global)
                              sshConnectionsCount={(() => {
                                // Contar sesiones SSH únicas (sin incluir exploradores)
                                const uniqueSSHSessions = new Set();
                                nodes.forEach(node => {
                                  if (node.data && node.data.type === 'ssh') {
                                    uniqueSSHSessions.add(node.key);
                                  }
                                  // Función recursiva para contar en hijos
                                  const countInChildren = (children) => {
                                    if (children && children.length > 0) {
                                      children.forEach(child => {
                                        if (child.data && child.data.type === 'ssh') {
                                          uniqueSSHSessions.add(child.key);
                                        }
                                        countInChildren(child.children);
                                      });
                                    }
                                  };
                                  countInChildren(node.children);
                                });
                                return uniqueSSHSessions.size;
                              })()}
                              foldersCount={(() => {
                                // Contar carpetas únicas
                                let folderCount = 0;
                                const countFolders = (nodeList) => {
                                  nodeList.forEach(node => {
                                    if (node.droppable && (!node.data || node.data.type !== 'ssh')) {
                                      folderCount++;
                                    }
                                    if (node.children && node.children.length > 0) {
                                      countFolders(node.children);
                                    }
                                  });
                                };
                                countFolders(nodes);
                                return folderCount;
                              })()}
                              localFontFamily={localFontFamily}
                              localFontSize={localFontSize}
                              localTerminalTheme={localLinuxTerminalTheme}
                              localPowerShellTheme={localPowerShellTheme}
                              localLinuxTerminalTheme={localLinuxTerminalTheme}
                            />
                          ) : (tab.type === 'explorer' || tab.isExplorerInSSH) ? (
                            <FileExplorer
                              sshConfig={tab.sshConfig}
                              tabId={tab.key}
                              iconTheme={iconTheme}
                              explorerFont={explorerFont}
                              explorerColorTheme={explorerColorTheme}
                              explorerFontSize={explorerFontSize}
                            />
                          ) : tab.type === 'split' ? (
                            <SplitLayout
                              leftTerminal={tab.leftTerminal}
                              rightTerminal={tab.rightTerminal}
                              fontFamily={fontFamily}
                              fontSize={fontSize}
                              theme={terminalTheme.theme}
                              onContextMenu={handleTerminalContextMenu}
                              sshStatsByTabId={sshStatsByTabId}
                              terminalRefs={terminalRefs}
                              orientation={tab.orientation || 'vertical'}
                              statusBarIconTheme={statusBarIconTheme}
                              splitterColor={terminalTheme.theme?.background || '#2d2d2d'}
                              onCloseLeft={() => handleCloseSplitPanel(tab.key, 'left')}
                              onCloseRight={() => handleCloseSplitPanel(tab.key, 'right')}
                            />
                          ) : tab.type === 'rdp' ? (
                            <RdpSessionTab
                              rdpConfig={tab.rdpConfig}
                              tabId={tab.key}
                              connectionStatus={tab.connectionStatus}
                              connectionInfo={tab.connectionInfo}
                              onEditConnection={(rdpConfig, tabId) => {
                                // Buscar la pestaña RDP para obtener el originalKey
                                const rdpTab = rdpTabs.find(tab => tab.key === tabId);
                                if (rdpTab && rdpTab.originalKey) {
                                  // Buscar el nodo original en la sidebar
                                  const originalNode = findNodeByKey(nodes, rdpTab.originalKey);
                                  if (originalNode) {
                                    openEditRdpDialog(originalNode);
                                  } else {
                                    // Fallback: crear nodo temporal si no se encuentra el original
                                    const tempNode = {
                                      key: rdpTab.originalKey,
                                      label: rdpConfig.name || `${rdpConfig.server}:${rdpConfig.port}`,
                                      data: {
                                        type: 'rdp',
                                        ...rdpConfig
                                      }
                                    };
                                    openEditRdpDialog(tempNode);
                                  }
                                } else {
                                  // Fallback: crear nodo temporal si no hay originalKey
                                  const tempNode = {
                                    key: tabId,
                                    label: rdpConfig.name || `${rdpConfig.server}:${rdpConfig.port}`,
                                    data: {
                                      type: 'rdp',
                                      ...rdpConfig
                                    }
                                  };
                                  openEditRdpDialog(tempNode);
                                }
                              }}
                            />
                          ) : tab.type === 'rdp-guacamole' ? (
                            <GuacamoleTerminal
                              ref={el => terminalRefs.current[tab.key] = el}
                              tabId={tab.key}
                              rdpConfig={tab.rdpConfig}
                              isActive={isActiveTab}
                            />
                          ) : tab.type === 'guacamole' ? (
                            <GuacamoleTab
                              config={tab.config}
                              tabId={tab.tabId}
                            />
                          ) : (
                            <TerminalComponent
                              key={tab.key}
                              ref={el => terminalRefs.current[tab.key] = el}
                              tabId={tab.key}
                              sshConfig={tab.sshConfig}
                              fontFamily={fontFamily}
                              fontSize={fontSize}
                              theme={terminalTheme.theme}
                              onContextMenu={handleTerminalContextMenu}
                              active={isActiveTab}
                              stats={sshStatsByTabId[tab.key]}
                              statusBarIconTheme={statusBarIconTheme}
                            />
                          )}
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
      <SettingsDialog
        visible={showSettingsDialog}
        onHide={() => setShowSettingsDialog(false)}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSize={fontSize}
        setFontSize={setFontSize}
        terminalTheme={terminalTheme}
        setTerminalTheme={setTerminalTheme}
        statusBarTheme={statusBarTheme}
        setStatusBarTheme={setStatusBarTheme}
        availableFonts={availableFonts}
        iconTheme={iconTheme}
        setIconTheme={setIconTheme}
        explorerFont={explorerFont}
        setExplorerFont={setExplorerFont}
        explorerColorTheme={explorerColorTheme}
        setExplorerColorTheme={setExplorerColorTheme}
        iconThemeSidebar={iconThemeSidebar}
        setIconThemeSidebar={setIconThemeSidebar}
        sidebarFont={sidebarFont}
        setSidebarFont={setSidebarFont}
        sidebarFontSize={sidebarFontSize}
        setSidebarFontSize={setSidebarFontSize}
        explorerFontSize={explorerFontSize}
        setExplorerFontSize={setExplorerFontSize}
        statusBarPollingInterval={statusBarPollingInterval}
        setStatusBarPollingInterval={setStatusBarPollingInterval}
        statusBarIconTheme={statusBarIconTheme}
        setStatusBarIconTheme={setStatusBarIconTheme}
        localFontFamily={localFontFamily}
        setLocalFontFamily={setLocalFontFamily}
        localFontSize={localFontSize}
        setLocalFontSize={setLocalFontSize}
        localTerminalTheme={localLinuxTerminalTheme}
        setLocalTerminalTheme={setLocalLinuxTerminalTheme}
        localPowerShellTheme={localPowerShellTheme}
        setLocalPowerShellTheme={setLocalPowerShellTheme}
        localLinuxTerminalTheme={localLinuxTerminalTheme}
        setLocalLinuxTerminalTheme={setLocalLinuxTerminalTheme}
        exportTreeToJson={exportTreeToJson}
        importTreeFromJson={importTreeFromJsonApp}
        sessionManager={sessionManager}
      />

      {/* Diálogo: Nueva conexión SSH */}
      <SSHDialog
        visible={showSSHDialog}
        onHide={() => setShowSSHDialog(false)}
        mode="new"
        name={sshName}
        setName={setSSHName}
        host={sshHost}
        setHost={setSSHHost}
        user={sshUser}
        setUser={setSSHUser}
        password={sshPassword}
        setPassword={setSSHPassword}
        port={sshPort}
        setPort={setSSHPort}
        remoteFolder={sshRemoteFolder}
        setRemoteFolder={setSSHRemoteFolder}
        targetFolder={sshTargetFolder}
        setTargetFolder={setSSHTargetFolder}
        foldersOptions={getAllFolders(nodes)}
        onConfirm={createNewSSH}
      />
      <FolderDialog
        visible={showFolderDialog}
        onHide={() => setShowFolderDialog(false)}
        mode="new"
        folderName={folderName}
        setFolderName={setFolderName}
        onConfirm={createNewFolder}
      />
      <FolderDialog
        visible={showEditFolderDialog}
        onHide={() => setShowEditFolderDialog(false)}
        mode="edit"
        folderName={editFolderName}
        setFolderName={setEditFolderName}
        onConfirm={saveEditFolder}
      />
      <SSHDialog
        visible={showEditSSHDialog}
        onHide={() => setShowEditSSHDialog(false)}
        mode="edit"
        name={editSSHName}
        setName={setEditSSHName}
        host={editSSHHost}
        setHost={setEditSSHHost}
        user={editSSHUser}
        setUser={setEditSSHUser}
        password={editSSHPassword}
        setPassword={setEditSSHPassword}
        port={editSSHPort}
        setPort={setEditSSHPort}
        remoteFolder={editSSHRemoteFolder}
        setRemoteFolder={setEditSSHRemoteFolder}
        targetFolder={null}
        setTargetFolder={() => {}}
        foldersOptions={[]}
        onConfirm={saveEditSSH}
      />
      <GroupDialog
        visible={showCreateGroupDialog}
        onHide={() => setShowCreateGroupDialog(false)}
        groupName={newGroupName}
        setGroupName={setNewGroupName}
        groupColor={selectedGroupColor}
        setGroupColor={setSelectedGroupColor}
        colorOptions={GROUP_COLORS}
        onConfirm={createNewGroup}
      />
      <SyncSettingsDialog
        visible={showSyncDialog}
        onHide={() => setShowSyncDialog(false)}
        onReloadSessions={reloadSessionsFromStorage}
        sessionManager={sessionManager}
        exportTreeToJson={exportTreeToJson}
        importTreeFromJson={importTreeFromJsonApp}
      />

      {/* Diálogo: Nueva conexión RDP */}
      <Dialog
        visible={showRdpDialog}
        onHide={closeRdpDialog}
        header="Nueva Conexión RDP"
        style={{ width: '500px' }}
        footer={
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={closeRdpDialog} className="p-button-text" />
            <Button label="Crear" icon="pi pi-check" onClick={createNewRdp} autoFocus />
          </div>
        }
      >
        <div className="flex flex-column gap-3">
          <div className="flex flex-column gap-2">
            <label htmlFor="rdpName">Nombre de la conexión</label>
            <InputText
              id="rdpName"
              value={rdpName}
              onChange={(e) => setRdpName(e.target.value)}
              placeholder="Mi Servidor RDP"
            />
          </div>
          <div className="flex flex-column gap-2">
            <label htmlFor="rdpServer">Servidor</label>
            <InputText
              id="rdpServer"
              value={rdpServer}
              onChange={(e) => setRdpServer(e.target.value)}
              placeholder="192.168.1.100"
            />
          </div>
          <div className="flex flex-column gap-2">
            <label htmlFor="rdpUsername">Usuario</label>
            <InputText
              id="rdpUsername"
              value={rdpUsername}
              onChange={(e) => setRdpUsername(e.target.value)}
              placeholder="usuario"
            />
          </div>
          <div className="flex flex-column gap-2">
            <label htmlFor="rdpPassword">Contraseña</label>
            <Password
              id="rdpPassword"
              value={rdpPassword}
              onChange={(e) => setRdpPassword(e.target.value)}
              placeholder="contraseña"
              feedback={false}
            />
          </div>
          <div className="flex flex-column gap-2">
            <label htmlFor="rdpPort">Puerto</label>
            <InputNumber
              id="rdpPort"
              value={rdpPort}
              onValueChange={(e) => setRdpPort(e.value)}
              placeholder="3389"
              min={1}
              max={65535}
            />
          </div>
          <div className="flex flex-column gap-2">
            <label htmlFor="rdpClientType">Tipo de Cliente</label>
            <Dropdown
              id="rdpClientType"
              value={rdpClientType}
              options={[
                { label: 'mstsc (Windows)', value: 'mstsc' },
                { label: 'Guacamole Lite', value: 'guacamole' }
              ]}
              onChange={(e) => setRdpClientType(e.value)}
              placeholder="Seleccionar tipo de cliente"
            />
          </div>
        </div>
      </Dialog>


    </div>
  );
};

export default App; 