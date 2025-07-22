import React, { useState, useEffect, useRef } from 'react';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
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
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [overflowMenuPosition, setOverflowMenuPosition] = useState({ x: 0, y: 0 });
  // Storage key for persistence
  const STORAGE_KEY = 'basicapp2_tree_data';
  const [folderName, setFolderName] = useState('');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [parentNodeKey, setParentNodeKey] = useState(null);
  const [showSSHDialog, setShowSSHDialog] = useState(false);
  const [sshName, setSSHName] = useState('');
  const [sshHost, setSSHHost] = useState('');
  const [sshUser, setSSHUser] = useState('');
  const [sshTargetFolder, setSSHTargetFolder] = useState(null);
  const [showEditSSHDialog, setShowEditSSHDialog] = useState(false);
  const [editSSHNode, setEditSSHNode] = useState(null);
  const [editSSHName, setEditSSHName] = useState('');
  const [editSSHHost, setEditSSHHost] = useState('');
  const [editSSHUser, setEditSSHUser] = useState('');
  const [editSSHPassword, setEditSSHPassword] = useState('');
  const [editSSHRemoteFolder, setEditSSHRemoteFolder] = useState('');
  const [editSSHPort, setEditSSHPort] = useState(22);

  const [showEditFolderDialog, setShowEditFolderDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editFolderNode, setEditFolderNode] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [sshTabs, setSshTabs] = useState([]);
  const [fileExplorerTabs, setFileExplorerTabs] = useState([]);
  const [homeTabs, setHomeTabs] = useState(() => [
    {
      key: 'home_tab_default',
      label: 'Inicio',
      type: 'home'
    }
  ]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [pendingExplorerSession, setPendingExplorerSession] = useState(null);
  const [sshPassword, setSSHPassword] = useState('');
  const [sshRemoteFolder, setSSHRemoteFolder] = useState('');
  const [sshPort, setSSHPort] = useState(22);
  const terminalRefs = useRef({});
  const [nodes, setNodes] = useState([]);

  // Estado para tracking del distro por pestaña
  const [tabDistros, setTabDistros] = useState({});

  // Ref para mantener track de los listeners activos
  const activeListenersRef = useRef(new Set());

  // === ESTADO PARA GRUPOS DE PESTAÑAS ===
  const [tabGroups, setTabGroups] = useState(() => {
    try {
      const stored = localStorage.getItem('tabGroups');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [tabContextMenu, setTabContextMenu] = useState(null);
  
  // Estado para mantener el índice activo de cada grupo
  const [groupActiveIndices, setGroupActiveIndices] = useState({});

  // Paleta de colores para grupos (moderna, 12 colores)
  const GROUP_COLORS = [
    '#1976d2', '#43a047', '#fbc02d', '#d32f2f', '#7b1fa2', '#0097a7', '#ff9800', '#607d8b', '#cfd8dc', '#ff5722', '#8d6e63', '#00bcd4'
  ];

  // Estado para color personalizado
  const [selectedGroupColor, setSelectedGroupColor] = useState('');

  // === FUNCIONES DE GRUPOS ===
  
  // Obtener siguiente color disponible
  const getNextGroupColor = () => {
    return GROUP_COLORS[tabGroups.length % GROUP_COLORS.length];
  };

  // Crear nuevo grupo
  const createNewGroup = () => {
    if (!newGroupName.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre del grupo no puede estar vacío',
        life: 3000
      });
      return;
    }
    const colorToUse = selectedGroupColor || getNextGroupColor();
    const newGroup = {
      id: `group_${Date.now()}`,
      name: newGroupName.trim(),
      color: colorToUse,
      createdAt: new Date().toISOString()
    };
    setTabGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    setSelectedGroupColor('');
    setShowCreateGroupDialog(false);
    toast.current.show({
      severity: 'success',
      summary: 'Grupo creado',
      detail: `Grupo "${newGroup.name}" creado exitosamente`,
      life: 3000
    });
  };

  // Eliminar grupo
  const deleteGroup = (groupId) => {
    // Remover groupId de todas las pestañas
    setSshTabs(prev => prev.map(tab => 
      tab.groupId === groupId ? { ...tab, groupId: null } : tab
    ));
    setFileExplorerTabs(prev => prev.map(tab => 
      tab.groupId === groupId ? { ...tab, groupId: null } : tab
    ));
    
    // Eliminar el grupo
    setTabGroups(prev => prev.filter(group => group.id !== groupId));
    
    // Si era el grupo activo, desactivar
    if (activeGroupId === groupId) {
      setActiveGroupId(null);
    }
  };

  // Mover pestaña a grupo
  const moveTabToGroup = (tabKey, groupId) => {
    setHomeTabs(prev => prev.map(tab => 
      tab.key === tabKey ? { ...tab, groupId } : tab
    ));
    setSshTabs(prev => prev.map(tab => 
      tab.key === tabKey ? { ...tab, groupId } : tab
    ));
    setFileExplorerTabs(prev => prev.map(tab => 
      tab.key === tabKey ? { ...tab, groupId } : tab
    ));
  };

  // Obtener pestañas de un grupo específico
  const getTabsInGroup = (groupId) => {
    const allTabs = [...homeTabs, ...sshTabs, ...fileExplorerTabs];
    return groupId ? allTabs.filter(tab => tab.groupId === groupId) : allTabs.filter(tab => !tab.groupId);
  };

  // Obtener pestañas filtradas según el grupo activo
  const getFilteredTabs = () => {
    return getTabsInGroup(activeGroupId);
  };

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

  // Font configuration
  const FONT_FAMILY_STORAGE_KEY = 'basicapp_terminal_font_family';
  const FONT_SIZE_STORAGE_KEY = 'basicapp_terminal_font_size';
  const availableFonts = [
    { label: 'FiraCode Nerd Font', value: '"FiraCode Nerd Font", monospace' },
    { label: 'Cascadia Code', value: '"Cascadia Code", monospace' },
    { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
    { label: 'Hack', value: 'Hack, monospace' },
    { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
    { label: 'Consolas', value: 'Consolas, monospace' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Lucida Console', value: '"Lucida Console", monospace' },
    { label: 'Menlo', value: 'Menlo, monospace' }
  ];
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem(FONT_FAMILY_STORAGE_KEY) || availableFonts[0].value);
  const [fontSize, setFontSize] = useState(() => {
    const savedSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    return savedSize ? parseInt(savedSize, 10) : 14; // Default font size is 14
  });

  // Theme configuration
  const THEME_STORAGE_KEY = 'basicapp_terminal_theme';
  const STATUSBAR_THEME_STORAGE_KEY = 'basicapp_statusbar_theme';
  const STATUSBAR_ICON_THEME_STORAGE_KEY = 'basicapp_statusbar_icon_theme';
  const availableThemes = themes ? Object.keys(themes) : [];
  const [terminalTheme, setTerminalTheme] = useState(() => {
      const savedThemeName = localStorage.getItem(THEME_STORAGE_KEY) || 'Default Dark';
      return themes && themes[savedThemeName] ? themes[savedThemeName] : {};
  });
  const [statusBarTheme, setStatusBarTheme] = useState(() => {
      return localStorage.getItem(STATUSBAR_THEME_STORAGE_KEY) || 'Default Dark';
  });
  const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
      return localStorage.getItem(STATUSBAR_ICON_THEME_STORAGE_KEY) || 'classic';
  });

  // Estado para drag & drop de pestañas
  const [draggedTabIndex, setDraggedTabIndex] = useState(null);
  const [dragOverTabIndex, setDragOverTabIndex] = useState(null);
  const [dragStartTimer, setDragStartTimer] = useState(null);

  // Estado para menú contextual de terminal
  const [terminalContextMenu, setTerminalContextMenu] = useState(null);
  
  // Referencias y estado para menú contextual del árbol
  const treeContextMenuRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isGeneralTreeMenu, setIsGeneralTreeMenu] = useState(false);
  
  // Referencias a funciones del Sidebar para menú contextual
  const sidebarCallbacksRef = useRef({});
  
  // Estado para trackear conexiones SSH
  const [sshConnectionStatus, setSshConnectionStatus] = useState({});

  // Context menu for nodes
  const onNodeContextMenu = (event, node) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNode(node);
    setIsGeneralTreeMenu(false);
    if (treeContextMenuRef.current) {
      treeContextMenuRef.current.show(event);
    }
  };

  // Context menu for tree area (general)
  const onTreeAreaContextMenu = (event) => {
    const targetElement = event.target;
    const isNodeClick = targetElement.closest('.p-treenode-content') || 
                       targetElement.closest('.p-treenode') ||
                       targetElement.closest('.node-label') ||
                       targetElement.closest('.align-items-center');
    if (!isNodeClick) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedNode(null);
      setIsGeneralTreeMenu(true);
      if (treeContextMenuRef.current) {
        treeContextMenuRef.current.show(event);
      }
    }
  };

  // Función para generar items del menú contextual del árbol
  const getTreeContextMenuItems = (node) => {
    if (!node) return [];
    const isFolder = node.droppable;
    const isSSH = node.data && node.data.type === 'ssh';
    const items = [];
    if (isSSH) {
      items.push({
        label: 'Abrir Terminal',
        icon: 'pi pi-desktop',
        command: () => {
          if (activeGroupId !== null) {
            const currentGroupKey = activeGroupId || 'no-group';
            setGroupActiveIndices(prev => ({
              ...prev,
              [currentGroupKey]: activeTabIndex
            }));
            setActiveGroupId(null);
          }
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
              type: 'terminal'
            };
            const newTabs = [newTab, ...prevTabs];
            setActiveTabIndex(homeTabs.length);
            setGroupActiveIndices(prev => ({
              ...prev,
              'no-group': homeTabs.length
            }));
            return newTabs;
          });
        }
      });
      // <-- AÑADIR AQUÍ LA OPCIÓN DE EXPLORADOR DE ARCHIVOS -->
      items.push({
        label: 'Abrir Explorador de Archivos',
        icon: 'pi pi-folder-open',
        command: () => openFileExplorer(node)
      });
      // Submenu para abrir en split solo si hay pestañas SSH abiertas
      const sshTabsFiltered = getFilteredTabs().filter(tab => tab.type === 'terminal');
      if (sshTabsFiltered.length > 0) {
        items.push({
          label: 'Abrir en Split',
          icon: 'pi pi-window-maximize',
          command: () => openInSplit(node, sshTabsFiltered[0], 'vertical'), // Clic directo: vertical con primera pestaña
          items: sshTabsFiltered.map(tab => ({
            label: tab.label,
            icon: 'pi pi-desktop',
            items: [
              {
                label: 'Split vertical',
                icon: 'pi pi-arrows-v',
                command: () => openInSplit(node, tab, 'vertical')
              },
              {
                label: 'Split horizontal',
                icon: 'pi pi-arrows-h',
                command: () => openInSplit(node, tab, 'horizontal')
              }
            ]
          }))
        });
      }
      items.push({ separator: true });
      items.push({
        label: 'Editar Sesión',
        icon: 'pi pi-pencil',
        command: () => {
          if (sidebarCallbacksRef.current.editSSH) {
            sidebarCallbacksRef.current.editSSH(node);
          }
        }
      });
    }
    if (isFolder) {
      items.push({
        label: 'Nueva Carpeta',
        icon: 'pi pi-plus',
        command: () => {
          if (sidebarCallbacksRef.current.createFolder) {
            sidebarCallbacksRef.current.createFolder(node.key);
          }
        }
      });
      items.push({ separator: true });
      items.push({
        label: 'Editar Carpeta',
        icon: 'pi pi-pencil',
        command: () => {
          if (sidebarCallbacksRef.current.editFolder) {
            sidebarCallbacksRef.current.editFolder(node);
          }
        }
      });
    }
    items.push({ separator: true });
    items.push({
      label: 'Eliminar',
      icon: 'pi pi-trash',
      command: () => {
        if (sidebarCallbacksRef.current.deleteNode) {
          sidebarCallbacksRef.current.deleteNode(node.key, node.label);
        }
      }
    });
    return items;
  };

  // Función para generar items del menú contextual general del árbol
  const getGeneralTreeContextMenuItems = () => {
    return [
      {
        label: 'Nueva Carpeta',
        icon: 'pi pi-folder',
        command: () => {
          if (sidebarCallbacksRef.current.createFolder) {
            sidebarCallbacksRef.current.createFolder(null); // null = crear en raíz
          }
        }
      },
      {
        label: 'Nueva Conexión SSH',
        icon: 'pi pi-desktop',
        command: () => {
          if (sidebarCallbacksRef.current.createSSH) {
            sidebarCallbacksRef.current.createSSH();
          }
        }
      }
    ];
  };

  // Función para detectar y parsear formato Wallix
  const parseWallixUser = (userString) => {
    // Formato Wallix: usuario@dominio@servidor:protocolo:usuario_destino
    // Ejemplo: rt01119@default@ESJC-SGCT-NX02P:SSH:rt01119
    const wallixPattern = /^(.+)@(.+)@(.+):(.+):(.+)$/;
    const match = userString.match(wallixPattern);
    
    if (match) {
      const [, bastionUser, domain, targetServer, protocol, targetUser] = match;
      return {
        isWallix: true,
        bastionUser: userString, // El usuario completo para el bastión
        targetUser: targetUser,
        targetServer: targetServer,
        protocol: protocol,
        domain: domain
      };
    }
    
    return {
      isWallix: false,
      targetUser: userString
    };
  };

  // Funciones auxiliares para el manejo de pestañas
  const getAllTabs = () => {
    return [...homeTabs, ...sshTabs, ...fileExplorerTabs];
  };

  const getTabTypeAndIndex = (globalIndex) => {
    if (globalIndex < homeTabs.length) {
      return { type: 'home', index: globalIndex };
    } else if (globalIndex < homeTabs.length + sshTabs.length) {
      return { type: 'ssh', index: globalIndex - homeTabs.length };
    } else {
      return { type: 'explorer', index: globalIndex - homeTabs.length - sshTabs.length };
    }
  };

  // Funciones para drag & drop de pestañas
  const handleTabDragStart = (e, tabIndex) => {
    const allTabs = getAllTabs();
    const tab = allTabs[tabIndex];
    // No permitir arrastrar la pestaña de Inicio
    if (tab.type === 'home' || tab.label === 'Inicio') return;
    // Pequeño delay para distinguir entre click y drag
    const timer = setTimeout(() => {
      setDraggedTabIndex(tabIndex);
    }, 50);
    setDragStartTimer(timer);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabIndex.toString());
  };

  const handleTabDragOver = (e, tabIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTabIndex(tabIndex);
  };

  const handleTabDragLeave = (e) => {
    // Solo limpiar si realmente salimos del área de pestañas
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTabIndex(null);
    }
  };

  const handleTabDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = draggedTabIndex;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
      return;
    }
    const allTabs = getAllTabs();
    const draggedTab = allTabs[dragIndex];
    const dropTab = allTabs[dropIndex];
    // No permitir soltar sobre Inicio ni mover Inicio
    if (
      draggedTab.type === 'home' || draggedTab.label === 'Inicio' ||
      dropIndex === 0 || (dropTab && (dropTab.type === 'home' || dropTab.label === 'Inicio'))
    ) {
      setDraggedTabIndex(null);
      setDragOverTabIndex(null);
      return;
    }
    // Determinar si es SSH o Explorer
    const isSSHTab = sshTabs.some(tab => tab.key === draggedTab.key);
    if (isSSHTab) {
      // Eliminar de sshTabs y reinsertar en la nueva posición (ajustada por homeTabs)
      const newSshTabs = [...sshTabs];
      const oldIdx = newSshTabs.findIndex(tab => tab.key === draggedTab.key);
      if (oldIdx !== -1) {
        newSshTabs.splice(oldIdx, 1);
        // dropIndex - 1 porque homeTabs siempre es la primera
        const insertIdx = Math.max(0, Math.min(newSshTabs.length, dropIndex - homeTabs.length));
        newSshTabs.splice(insertIdx, 0, draggedTab);
        setSshTabs(newSshTabs);
        setActiveTabIndex(dropIndex);
      }
    } else {
      // Eliminar de fileExplorerTabs y reinsertar en la nueva posición
      const newExplorerTabs = [...fileExplorerTabs];
      const oldIdx = newExplorerTabs.findIndex(tab => tab.key === draggedTab.key);
      if (oldIdx !== -1) {
        newExplorerTabs.splice(oldIdx, 1);
        // dropIndex - homeTabs.length - sshTabs.length
        const insertIdx = Math.max(0, Math.min(newExplorerTabs.length, dropIndex - homeTabs.length - sshTabs.length));
        newExplorerTabs.splice(insertIdx, 0, draggedTab);
        setFileExplorerTabs(newExplorerTabs);
        setActiveTabIndex(dropIndex);
      }
    }
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  };

  const handleTabDragEnd = () => {
    // Limpiar timer si existe
    if (dragStartTimer) {
      clearTimeout(dragStartTimer);
      setDragStartTimer(null);
    }
    setDraggedTabIndex(null);
    setDragOverTabIndex(null);
  };

  // Funciones para menú contextual de terminal
  const handleTerminalContextMenu = (e, tabKey) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Capturar coordenadas exactas del mouse
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Calcular posición ajustada para que no se salga de la pantalla
    const menuWidth = 180;
    const menuHeight = 200;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    let adjustedX = mouseX;
    let adjustedY = mouseY;
    
    // Ajustar X si se sale por la derecha
    if (mouseX + menuWidth > viewport.width) {
      adjustedX = viewport.width - menuWidth - 10;
    }
    
    // Ajustar Y si se sale por abajo
    if (mouseY + menuHeight > viewport.height) {
      adjustedY = viewport.height - menuHeight - 10;
    }
    
    // Asegurar que no se salga por la izquierda o arriba
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);
    
    setTerminalContextMenu({ tabKey, mouseX: adjustedX, mouseY: adjustedY });
  };

  const hideContextMenu = () => {
    setTerminalContextMenu(null);
  };

  // Función para limpiar distro cuando se cierra una pestaña
  const cleanupTabDistro = (tabKey) => {
    setTabDistros(prev => {
      const newDistros = { ...prev };
      delete newDistros[tabKey];
      return newDistros;
    });
  };

  const handleCopyFromTerminal = (tabKey) => {
    if (window.electron && terminalRefs.current[tabKey]) {
      const terminal = terminalRefs.current[tabKey];
      const selection = terminal.getSelection();
      if (selection) {
        window.electron.clipboard.writeText(selection);
        // No mostrar toast aquí para evitar duplicación
      } else {
        toast.current.show({
          severity: 'warn',
          summary: 'Sin selección',
          detail: 'No hay texto seleccionado para copiar',
          life: 3000
        });
      }
    }
    hideContextMenu();
  };

  const handlePasteToTerminal = async (tabKey) => {
    if (window.electron && terminalRefs.current[tabKey]) {
      try {
        const text = await window.electron.clipboard.readText();
        if (text) {
          // Enviar el texto al terminal a través del IPC para que vaya al servidor SSH
          window.electron.ipcRenderer.send('ssh:data', { tabId: tabKey, data: text });
          toast.current.show({
            severity: 'success',
            summary: 'Pegado',
            detail: 'Texto enviado al terminal',
            life: 2000
          });
        } else {
          toast.current.show({
            severity: 'warn',
            summary: 'Portapapeles vacío',
            detail: 'No hay texto en el portapapeles',
            life: 3000
          });
        }
      } catch (error) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo acceder al portapapeles',
          life: 3000
        });
      }
    }
    hideContextMenu();
  };

  const handleSelectAllTerminal = (tabKey) => {
    if (terminalRefs.current[tabKey]) {
      const terminal = terminalRefs.current[tabKey];
      terminal.selectAll();
      toast.current.show({
        severity: 'info',
        summary: 'Seleccionado',
        detail: 'Todo el contenido del terminal seleccionado',
        life: 2000
      });
    }
    hideContextMenu();
  };

  const handleClearTerminal = (tabKey) => {
    if (terminalRefs.current[tabKey]) {
      const terminal = terminalRefs.current[tabKey];
      // Limpiar el buffer visual del terminal
      terminal.clear();
      // También enviar comando clear al servidor SSH para limpiar la sesión
      if (window.electron) {
        window.electron.ipcRenderer.send('ssh:data', { tabId: tabKey, data: 'clear\n' });
      }
      toast.current.show({
        severity: 'info',
        summary: 'Terminal limpiado',
        detail: 'Terminal y sesión SSH limpiados',
        life: 2000
      });
    }
    hideContextMenu();
  };

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
      const loadedNodes = JSON.parse(savedNodes);
      // Migrar nodos existentes para asegurar que las sesiones SSH tengan droppable: false
      const migrateNodes = (nodes) => {
        return nodes.map(node => {
          const migratedNode = { ...node };
          // Si es una sesión SSH y no tiene droppable definido o es true, establecerlo como false
          if (node.data && node.data.type === 'ssh') {
            migratedNode.droppable = false;
          }
          // Migrar recursivamente los hijos
          if (node.children && node.children.length > 0) {
            migratedNode.children = migrateNodes(node.children);
          }
          return migratedNode;
        });
      };
      const migratedNodes = migrateNodes(loadedNodes);
      setNodes(migratedNodes);
    } else {
      setNodes(getDefaultNodes());
    }
    
    // Cargar tema UI guardado
    themeManager.loadSavedTheme();
    
    // Cargar tema de status bar guardado
    statusBarThemeManager.loadSavedTheme();
  }, []);

  // Save nodes to localStorage whenever they change
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    }
  }, [nodes]);

  // Auto-save font family to localStorage
  useEffect(() => {
    localStorage.setItem(FONT_FAMILY_STORAGE_KEY, fontFamily);
  }, [fontFamily]);

  // Auto-save font size to localStorage
  useEffect(() => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  // Auto-save theme to localStorage
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, terminalTheme.name);
  }, [terminalTheme]);

  // Auto-save status bar theme to localStorage and apply it
  useEffect(() => {
    localStorage.setItem(STATUSBAR_THEME_STORAGE_KEY, statusBarTheme);
    statusBarThemeManager.applyTheme(statusBarTheme);
  }, [statusBarTheme]);

  // Efecto para manejar cambios en el explorador de archivos
  useEffect(() => {
    if (pendingExplorerSession) {
      const explorerIndex = sshTabs.length + fileExplorerTabs.findIndex(tab => tab.originalKey === pendingExplorerSession);
      if (explorerIndex >= sshTabs.length) {
        setActiveTabIndex(explorerIndex);
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
      label: 'Proyectos',
      droppable: true,
      children: [
        {
          key: generateUniqueKey(),
          label: 'Proyecto 1',
          droppable: true,
          children: [
            { key: generateUniqueKey(), label: 'Archivo 1.txt', draggable: true },
            { key: generateUniqueKey(), label: 'Archivo 2.txt', draggable: true }
          ]
        },
        {
          key: generateUniqueKey(),
          label: 'Proyecto 2',
          droppable: true,
          children: [
            { key: generateUniqueKey(), label: 'Archivo 3.txt', draggable: true }
          ]
        }
      ]
    },
    {
      key: generateUniqueKey(),
      label: 'Documentos',
      droppable: true,
      children: [
        { key: generateUniqueKey(), label: 'Documento 1.pdf', draggable: true },
        { key: generateUniqueKey(), label: 'Documento 2.docx', draggable: true }
      ]
    }
  ];

  // Selected node in the tree
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);

  // Track the currently dragged node
  const [draggedNodeKey, setDraggedNodeKey] = useState(null);

  // Function to create a deep copy of nodes
  const deepCopy = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };

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

  // Function to find a node by key (recursive search)
  const findNodeByKey = (nodes, key) => {
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

  // Function to find parent and index by UID
  const findParentNodeAndIndexByUID = (nodes, uid) => {
    const searchInLevel = (currentNodes, parentNode = null) => {
      for (let i = 0; i < currentNodes.length; i++) {
        const node = currentNodes[i];
        if (node.uid === uid) {
          return { parent: parentNode, index: i, parentList: currentNodes, node: node };
        }
        if (node.children && node.children.length > 0) {
          const result = searchInLevel(node.children, node);
          if (result) return result;
        }
      }
      return null;
    };
    
    const result = searchInLevel(nodes);
    return result || { parent: null, index: -1, parentList: [], node: null };
  };

  // Function to find a node by unique properties (more robust than key-only search)
  const findNodeByProperties = (nodes, targetNode) => {
    for (let node of nodes) {
      if (node.label === targetNode.label && 
          node.icon === targetNode.icon && 
          node.droppable === targetNode.droppable) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeByProperties(node.children, targetNode);
        if (found) return found;
      }
    }
    return null;
  };

  // Function to find parent node and index (recursive search)
  const findParentNodeAndIndex = (nodes, key) => {
    // Search recursively through all levels
    const searchInLevel = (currentNodes, parentNode = null) => {
      for (let i = 0; i < currentNodes.length; i++) {
        const node = currentNodes[i];
        if (node.key === key) {
          return { parent: parentNode, index: i, parentList: currentNodes };
        }
        if (node.children && node.children.length > 0) {
          const result = searchInLevel(node.children, node);
          if (result) return result;
        }
      }
      return null;
    };
    
    const result = searchInLevel(nodes);
    return result || { parent: null, index: -1, parentList: [] };
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

  // Clona el árbol y actualiza solo el subárbol con la key indicada
  function cloneTreeWithUpdatedNode(tree, targetKey, updateFn) {
    return tree.map(node => {
      if (node.key === targetKey) {
        return updateFn({ ...node });
      }
      if (node.children) {
        return { ...node, children: cloneTreeWithUpdatedNode(node.children, targetKey, updateFn) };
      }
      return node;
    });
  }

  // Handle drag and drop with UID preservation
  const onDragDrop = (event) => {
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
      toast.current.show({
        severity: 'warn',
        summary: 'Operación no permitida',
        detail: 'No se puede arrastrar elementos dentro de una sesión SSH. Solo las carpetas pueden contener otros elementos.',
        life: 4000
      });
    } else {
      setNodes([...value]);
    }
  };
  
  // Generate next key based on parent key (simplified - will be regenerated anyway)
  const generateNextKey = (parentKey) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    
    if (parentKey === null) {
      // Root level - use timestamp for uniqueness
      return `temp_root_${timestamp}_${random}`;
    } else {
      // Child level - use parent key + timestamp for uniqueness
      return `temp_child_${parentKey}_${timestamp}_${random}`;
    }
  };
  
  // Open dialog to create a new folder
  const openNewFolderDialog = (parentKey) => {
    setParentNodeKey(parentKey);
    setFolderName('');
    setShowFolderDialog(true);
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
      setNodes(nodesCopy);
      setShowFolderDialog(false);
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
  
  // Delete node (folder or file) with multiple search strategies
  const deleteNode = (nodeKey) => {
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
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: `No se encontró el elemento para eliminar. Key: ${nodeKey}`,
          life: 5000
        });
        return;
      }
      
      // Get node before deletion
      const nodeToDelete = nodeInfo.parentList[nodeInfo.index];
      const nodeName = nodeToDelete.label;
      
      // Remove the node from its parent
      nodeInfo.parentList.splice(nodeInfo.index, 1);
      
      // Update the state with automatic key regeneration
      setNodes(nodesCopy);
      
      // If the deleted node was selected, clear selection
      if (selectedNodeKey && Object.keys(selectedNodeKey)[0] === nodeKey) {
        setSelectedNodeKey(null);
      }
      
      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `"${nodeName}" eliminado correctamente`,
        life: 3000
      });
    } catch (error) {
      console.error("❌ Error deleting node:", error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: `Error al eliminar: ${error.message}`,
        life: 5000
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
      accept: () => deleteNode(nodeKey),
      reject: () => {}
    });
  };
  
  // Node template simplificado - acciones movidas al menú contextual
  const nodeTemplate = (node, options) => {
    const isFolder = node.droppable;
    const isSSH = node.data && node.data.type === 'ssh';
    // Icono según tema seleccionado para la sidebar
    let icon = null;
    if (isSSH) {
      icon = iconThemes[iconThemeSidebar]?.icons?.ssh || <span className="pi pi-desktop" />;
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
        onDoubleClick={isSSH ? (e) => {
          e.stopPropagation();
          if (activeGroupId !== null) {
            const currentGroupKey = activeGroupId || 'no-group';
            setGroupActiveIndices(prev => ({
              ...prev,
              [currentGroupKey]: activeTabIndex
            }));
            setActiveGroupId(null);
          }
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
              type: 'terminal'
            };
            const newTabs = [newTab, ...prevTabs];
            setActiveTabIndex(homeTabs.length); // Activar la nueva pestaña (después de la de inicio)
            setGroupActiveIndices(prev => ({
              ...prev,
              'no-group': homeTabs.length
            }));
            return newTabs;
          });
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
    setNodes(nodesCopy);
    setShowSSHDialog(false);
    setSSHName(''); setSSHHost(''); setSSHUser(''); setSSHTargetFolder(null); setSSHPassword(''); setSSHRemoteFolder(''); setSSHPort(22);
    toast.current.show({
      severity: 'success',
      summary: 'SSH añadida',
      detail: `Conexión SSH "${sshName}" añadida al árbol`,
      life: 3000
    });
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
    setShowEditSSHDialog(false);
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
    setShowEditFolderDialog(false);
    setEditFolderNode(null);
    setEditFolderName('');
    toast.current.show({
      severity: 'success',
      summary: 'Carpeta editada',
      detail: `Nombre actualizado`,
      life: 3000
    });
  };

  useEffect(() => {
    // Cuando cambiamos de pestaña, la terminal necesita recalcular su tamaño
    // para ajustarse al contenedor que ahora es visible.
    // Llamar inmediatamente para que el servidor SSH reciba las dimensiones correctas
    handleResize();
  }, [activeTabIndex, sshTabs]); // Se ejecuta cuando cambia la pestaña activa o la lista de pestañas

  // useEffect para redimensionar terminal cuando se colapsa/expande el sidebar
  useEffect(() => {
    // Necesitamos un pequeño delay para que el CSS termine la transición
    const timeoutId = setTimeout(() => {
      handleResize();
    }, 250); // Coincide con la duración de la transición CSS (0.2s + buffer)
    
    return () => clearTimeout(timeoutId);
  }, [sidebarCollapsed]); // Se ejecuta cuando cambia el estado del sidebar

  // Optimización para redimensionamiento fluido
  useEffect(() => {
    const splitterElement = document.querySelector('.p-splitter');
    if (!splitterElement) return;

    const handleResizeStart = (e) => {
      // Solo aplicar optimizaciones si el click es en el gutter
      if (e.target.classList.contains('p-splitter-gutter')) {
        splitterElement.classList.add('p-splitter-resizing');
        // Desactivar transiciones en sidebar durante redimensionamiento
        document.documentElement.style.setProperty('--sidebar-transition', 'none');
      }
    };

    const handleResizeEnd = () => {
      splitterElement.classList.remove('p-splitter-resizing');
      // Reactivar transiciones después del redimensionamiento
      document.documentElement.style.removeProperty('--sidebar-transition');
    };

    // Eventos para detectar inicio y fin del redimensionamiento
    splitterElement.addEventListener('mousedown', handleResizeStart);
    document.addEventListener('mouseup', handleResizeEnd);
    
    return () => {
      splitterElement.removeEventListener('mousedown', handleResizeStart);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  // Ref para throttling del resize
  const resizeTimeoutRef = useRef(null);
  
  const handleResize = () => {
    const filteredTabs = getFilteredTabs();
    const activeTab = filteredTabs[activeTabIndex];
    
    if (!activeTab) return;

    // Cancelar resize anterior si existe
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    // Usar requestAnimationFrame para optimizar el redimensionamiento
    requestAnimationFrame(() => {
      if (activeTab.type === 'split') {
        // Para splits, redimensionar ambos terminales
        if (activeTab.leftTerminal && terminalRefs.current[activeTab.leftTerminal.key]) {
          terminalRefs.current[activeTab.leftTerminal.key].fit();
        }
        if (activeTab.rightTerminal && terminalRefs.current[activeTab.rightTerminal.key]) {
          terminalRefs.current[activeTab.rightTerminal.key].fit();
        }
      } else if (activeTab.type === 'terminal' && terminalRefs.current[activeTab.key]) {
        // Para terminales normales
        terminalRefs.current[activeTab.key].fit();
      }
    });
  };
  
  // Versión con throttling para onResize
  const handleResizeThrottled = () => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      handleResize();
    }, 16); // ~60fps
  };

  // Función para abrir explorador de archivos SSH
  // Función para abrir una sesión en split con otra pestaña existente
  const openInSplit = (sshNode, existingTab, orientation = 'vertical') => {
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
  };

  const openFileExplorer = (sshNode) => {
    // Buscar si ya existe un explorador para este host+usuario
    const existingExplorerIndex = sshTabs.findIndex(tab => 
      tab.isExplorerInSSH && 
      tab.sshConfig.host === sshNode.data.host && 
      tab.sshConfig.username === sshNode.data.user
    );
    
    if (existingExplorerIndex !== -1) {
      // Activar la pestaña existente del explorador
      setActiveTabIndex(existingExplorerIndex);
      return;
    }
    
    // Crear el explorador SIN conexión SSH propia - reutilizará conexiones existentes del pool
    const explorerTabId = `explorer_${sshNode.key}_${Date.now()}`;
    const sshConfig = {
      host: sshNode.data.useBastionWallix ? sshNode.data.targetServer : sshNode.data.host,
      username: sshNode.data.user,
      password: sshNode.data.password,
      port: sshNode.data.port || 22,
      originalKey: sshNode.key,
      // Datos del bastión Wallix
      useBastionWallix: sshNode.data.useBastionWallix || false,
      bastionHost: sshNode.data.bastionHost || '',
      bastionUser: sshNode.data.bastionUser || ''
    };
    
    // NO crear conexión SSH nueva - el FileExplorer usará el pool existente
    const newExplorerTab = {
      key: explorerTabId,
      label: sshNode.label,
      originalKey: sshNode.key,
      sshConfig: sshConfig,
      type: 'explorer',
      needsOwnConnection: false, // Cambio importante: NO necesita su propia conexión
      isExplorerInSSH: true // Flag para identificarla como explorador en el array SSH
    };
    
    // Insertar como primera pestaña
    setSshTabs(prevSshTabs => {
      const newSshTabs = [newExplorerTab, ...prevSshTabs];
      setActiveTabIndex(homeTabs.length); // Activar la nueva pestaña (después de la de inicio)
      return newSshTabs;
    });
  };

  // Helper para eliminar un nodo por key en todo el árbol
  function removeNodeByKey(tree, key) {
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
  }

  // Clave para guardar el estado expandido de la sidebar
  const EXPANDED_KEYS_STORAGE_KEY = 'basicapp2_sidebar_expanded_keys';

  // Estado para expandedKeys, inicializado desde localStorage si existe
  const [expandedKeys, setExpandedKeys] = useState(() => {
    const saved = localStorage.getItem(EXPANDED_KEYS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  // Guardar expandedKeys en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem(EXPANDED_KEYS_STORAGE_KEY, JSON.stringify(expandedKeys));
  }, [expandedKeys]);

  const [allExpanded, setAllExpanded] = useState(false);

  // Función para expandir o plegar todas las carpetas
  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedKeys({});
      setAllExpanded(false);
    } else {
      // Recorrer todos los nodos y marcar los folders como expandidos
      const expandAllFolders = (nodes) => {
        let keys = {};
        for (const node of nodes) {
          if (node.droppable || node.children) {
            keys[node.key] = true;
          }
          if (node.children && node.children.length > 0) {
            keys = { ...keys, ...expandAllFolders(node.children) };
          }
        }
        return keys;
      };
      setExpandedKeys(expandAllFolders(nodes));
      setAllExpanded(true);
    }
  };

  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Guardar en localStorage cada vez que cambian los grupos
  useEffect(() => {
    try {
      localStorage.setItem('tabGroups', JSON.stringify(tabGroups));
    } catch {}
  }, [tabGroups]);

  const [iconTheme, setIconTheme] = useState(() => {
    try {
      return localStorage.getItem('iconTheme') || 'material';
    } catch {
      return 'material';
    }
  });
  const [explorerFont, setExplorerFont] = useState(() => {
    try {
      return localStorage.getItem('explorerFont') || explorerFonts[0];
    } catch {
      return explorerFonts[0];
    }
  });
  const [explorerColorTheme, setExplorerColorTheme] = useState(() => {
    try {
      return localStorage.getItem('explorerColorTheme') || 'Light';
    } catch {
      return 'Light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('iconTheme', iconTheme);
    } catch {}
  }, [iconTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('explorerFont', explorerFont);
    } catch {}
  }, [explorerFont]);

  useEffect(() => {
    try {
      localStorage.setItem('explorerColorTheme', explorerColorTheme);
    } catch {}
  }, [explorerColorTheme]);

  const [iconThemeSidebar, setIconThemeSidebar] = useState(() => {
    try {
      return localStorage.getItem('iconThemeSidebar') || 'material';
    } catch {
      return 'material';
    }
  });
  const [sidebarFont, setSidebarFont] = useState(() => {
    try {
      return localStorage.getItem('sidebarFont') || explorerFonts[0];
    } catch {
      return explorerFonts[0];
    }
  });
  const [sidebarFontSize, setSidebarFontSize] = useState(() => {
    try {
      const savedSize = localStorage.getItem('sidebarFontSize');
      return savedSize ? parseInt(savedSize, 10) : 14; // Default sidebar font size is 14
    } catch {
      return 14;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('iconThemeSidebar', iconThemeSidebar);
    } catch {}
  }, [iconThemeSidebar]);
  useEffect(() => {
    try {
      localStorage.setItem('sidebarFont', sidebarFont);
    } catch {}
  }, [sidebarFont]);
  useEffect(() => {
    try {
      localStorage.setItem('sidebarFontSize', sidebarFontSize.toString());
    } catch {}
  }, [sidebarFontSize]);

  const [explorerFontSize, setExplorerFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem('explorerFontSize');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('explorerFontSize', explorerFontSize.toString());
    } catch {}
  }, [explorerFontSize]);

  // 1. Estado global para stats por tabId
  const [sshStatsByTabId, setSshStatsByTabId] = useState({});

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

  // Estado global para el intervalo de pooling de la status bar
  const [statusBarPollingInterval, setStatusBarPollingInterval] = useState(() => {
    const saved = localStorage.getItem('statusBarPollingInterval');
    return saved ? parseInt(saved, 10) : 5;
  });

  // Sincronizar con localStorage y enviar al backend
  useEffect(() => {
    localStorage.setItem('statusBarPollingInterval', statusBarPollingInterval);
    if (window?.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('statusbar:set-polling-interval', statusBarPollingInterval);
    }
  }, [statusBarPollingInterval]);

  // Auto-save status bar icon theme to localStorage
  useEffect(() => {
    localStorage.setItem(STATUSBAR_ICON_THEME_STORAGE_KEY, statusBarIconTheme);
  }, [statusBarIconTheme]);

  const LOCAL_FONT_FAMILY_STORAGE_KEY = 'basicapp_local_terminal_font_family';
  const LOCAL_FONT_SIZE_STORAGE_KEY = 'basicapp_local_terminal_font_size';
  const [localFontFamily, setLocalFontFamily] = useState(() => localStorage.getItem(LOCAL_FONT_FAMILY_STORAGE_KEY) || '"FiraCode Nerd Font", monospace');
  const [localFontSize, setLocalFontSize] = useState(() => {
    const saved = localStorage.getItem(LOCAL_FONT_SIZE_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 14;
  });

  const LOCAL_TERMINAL_THEME_STORAGE_KEY = 'basicapp_local_terminal_theme';
  const [localTerminalTheme, setLocalTerminalTheme] = useState(() => localStorage.getItem(LOCAL_TERMINAL_THEME_STORAGE_KEY) || 'Default Dark');

  const localTerminalBg = themes[localTerminalTheme]?.theme?.background || '#222';
  const isHomeTabActive = activeTabIndex === 0 && homeTabs.length > 0;

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
      <TitleBar />
      <Toast ref={toast} />
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
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
              allExpanded={allExpanded}
              toggleExpandAll={toggleExpandAll}
              setShowCreateGroupDialog={setShowCreateGroupDialog}
              setShowSettingsDialog={setShowSettingsDialog}
              iconTheme={iconThemeSidebar}
              explorerFont={sidebarFont}
              explorerFontSize={sidebarFontSize}
              uiTheme={terminalTheme && terminalTheme.name ? terminalTheme.name : 'Light'}
              showToast={toast.current && toast.current.show ? toast.current.show : undefined}
                              onNodeContextMenu={onNodeContextMenu}
                onTreeAreaContextMenu={onTreeAreaContextMenu}
                sidebarCallbacksRef={sidebarCallbacksRef}
              onOpenSSHConnection={(node) => {
                // Lógica igual que antes en onDoubleClick
                if (activeGroupId !== null) {
                  const currentGroupKey = activeGroupId || 'no-group';
                  setGroupActiveIndices(prev => ({
                    ...prev,
                    [currentGroupKey]: activeTabIndex
                  }));
                  setActiveGroupId(null);
                }
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
                    type: 'terminal'
                  };
                  const newTabs = [newTab, ...prevTabs];
                  setActiveTabIndex(homeTabs.length); // Activar la nueva pestaña (después de la de inicio)
                  setGroupActiveIndices(prev => ({
                    ...prev,
                    'no-group': homeTabs.length
                  }));
                  return newTabs;
                });
              }}
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
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 180 }}>
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
                <div style={{ height: '4px', background: 'transparent' }} />
                
                <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                  {/* Solo mostrar TabView de pestañas si el grupo no está vacío */}
                  {!(activeGroupId !== null && getTabsInGroup(activeGroupId).length === 0) && (
                    <TabView 
                      activeIndex={activeTabIndex} 
                      onTabChange={(e) => {
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
                      const isHomeTab = idx < homeTabs.length;
                      const isSSHTab = !isHomeTab && (idx < homeTabs.length + sshTabs.length || tab.isExplorerInSSH);
                      const originalIdx = isHomeTab ? idx : (isSSHTab ? idx - homeTabs.length : idx - homeTabs.length - sshTabs.length);
                      
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
                      backgroundColor: 'rgba(248, 249, 250, 0.95)',
                      color: '#888', textAlign: 'center', padding: '2rem 0',
                      zIndex: 1000,
                      backdropFilter: 'blur(2px)'
                    }}>
                      <i className="pi pi-folder-open" style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }} />
                      <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Este grupo está vacío</div>
                      <div style={{ fontSize: 15, marginBottom: 18 }}>Crea una nueva pestaña o arrastra aquí una existente.</div>
                      <Button
                        label="Crear nueva pestaña"
                        icon="pi pi-plus"
                        className="p-button-primary"
                        onClick={(e) => {
                          const menuItems = [
                            {
                              label: 'Terminal Local',
                              icon: 'pi pi-desktop',
                              command: () => {
                                const newTab = {
                                  key: `local_terminal_${Date.now()}`,
                                  label: 'PowerShell',
                                  type: 'terminal',
                                  groupId: activeGroupId,
                                  isLocal: true
                                };
                                setSshTabs(prev => [newTab, ...prev]);
                                setActiveTabIndex(0);
                              }
                            },
                            {
                              label: 'Nuevo SSH',
                              icon: 'pi pi-server',
                              command: () => {
                                setShowSSHDialog(true);
                              }
                            }
                          ];
                          
                          // Crear menú contextual temporal
                          const menu = document.createElement('div');
                          menu.style.cssText = `
                            position: fixed;
                            left: ${e.clientX}px;
                            top: ${e.clientY}px;
                            background: white;
                            border: 1px solid #ccc;
                            border-radius: 6px;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                            z-index: 10000;
                            min-width: 160px;
                            overflow: hidden;
                          `;
                          
                          menuItems.forEach((item, index) => {
                            const menuItem = document.createElement('div');
                            menuItem.style.cssText = `
                              padding: 8px 12px;
                              cursor: pointer;
                              display: flex;
                              align-items: center;
                              gap: 8px;
                              border-bottom: ${index < menuItems.length - 1 ? '1px solid #f0f0f0' : 'none'};
                            `;
                            menuItem.innerHTML = `<i class="${item.icon}" style="width: 16px;"></i><span>${item.label}</span>`;
                            menuItem.onmouseenter = () => menuItem.style.backgroundColor = '#f5f5f5';
                            menuItem.onmouseleave = () => menuItem.style.backgroundColor = 'transparent';
                            menuItem.onclick = () => {
                              item.command();
                              document.body.removeChild(menu);
                            };
                            menu.appendChild(menuItem);
                          });
                          
                          // Overlay para cerrar menú al hacer clic fuera
                          const overlay = document.createElement('div');
                          overlay.style.cssText = `
                            position: fixed;
                            top: 0; left: 0; right: 0; bottom: 0;
                            z-index: 9999;
                          `;
                          overlay.onclick = () => {
                            document.body.removeChild(overlay);
                            document.body.removeChild(menu);
                          };
                          
                          document.body.appendChild(overlay);
                          document.body.appendChild(menu);
                        }}
                      />
                    </div>
                  )}
                  
                  {/* SIEMPRE renderizar TODAS las pestañas para preservar conexiones SSH */}
                  {[...homeTabs, ...sshTabs, ...fileExplorerTabs].map((tab) => {
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
                              onCreateSSHConnection={() => setShowSSHDialog(true)}
                              onCreateFolder={() => openNewFolderDialog(null)}
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
                              localTerminalTheme={localTerminalTheme}
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
        setLocalFontFamily={value => { setLocalFontFamily(value); localStorage.setItem(LOCAL_FONT_FAMILY_STORAGE_KEY, value); }}
        localFontSize={localFontSize}
        setLocalFontSize={value => { setLocalFontSize(value); localStorage.setItem(LOCAL_FONT_SIZE_STORAGE_KEY, value); }}
        localTerminalTheme={localTerminalTheme}
        setLocalTerminalTheme={value => { setLocalTerminalTheme(value); localStorage.setItem(LOCAL_TERMINAL_THEME_STORAGE_KEY, value); }}
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
    </div>
  );
};

export default App; 