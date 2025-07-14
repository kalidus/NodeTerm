import React, { useState, useEffect, useRef } from 'react';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dropdown } from 'primereact/dropdown';
import { TabView, TabPanel } from 'primereact/tabview';
import { Menu } from 'primereact/menu';
import { ContextMenu } from 'primereact/contextmenu';
import TerminalComponent from './TerminalComponent';
import FileExplorer from './FileExplorer';
import Sidebar from './Sidebar';
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

  // Colores predefinidos para grupos
  const GROUP_COLORS = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
    '#f1c40f', '#e91e63', '#ff5722', '#795548'
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
    setSshTabs(prev => prev.map(tab => 
      tab.key === tabKey ? { ...tab, groupId } : tab
    ));
    setFileExplorerTabs(prev => prev.map(tab => 
      tab.key === tabKey ? { ...tab, groupId } : tab
    ));
  };

  // Obtener pestañas de un grupo específico
  const getTabsInGroup = (groupId) => {
    const allTabs = [...sshTabs, ...fileExplorerTabs];
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

    // Obtener todos los tabIds actuales de terminales SSH
    const currentTerminalTabs = sshTabs.filter(tab => tab.type === 'terminal').map(tab => tab.key);
    
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
      console.log('🔄 SSH estado:', originalKey, '->', status);
      setSshConnectionStatus(prevStatus => {
        const newStatus = { ...prevStatus, [originalKey]: status };
        console.log('Nuevo estado sshConnectionStatus:', newStatus);
        return newStatus;
      });
    };

    // Listeners estables con referencias fijas
    const handleSSHReady = (data) => {
      console.log('✅ SSH conectado para originalKey:', data?.originalKey);
      if (data?.originalKey) {
        handleConnectionStatus(data.originalKey, 'connected');
      }
    };

    const handleSSHError = (data) => {
      console.log('❌ SSH error para originalKey:', data?.originalKey, 'error:', data?.error);
      if (data?.originalKey) {
        handleConnectionStatus(data.originalKey, 'error');
      }
    };

    const handleSSHDisconnected = (data) => {
      console.log('🔌 SSH desconectado para originalKey:', data?.originalKey);
      if (data?.originalKey) {
        handleConnectionStatus(data.originalKey, 'disconnected');
      }
    };

    // Registrar listeners
    console.log('🚀 Registrando listeners SSH IPC');
    window.electron.ipcRenderer.on('ssh-connection-ready', handleSSHReady);
    window.electron.ipcRenderer.on('ssh-connection-error', handleSSHError);
    window.electron.ipcRenderer.on('ssh-connection-disconnected', handleSSHDisconnected);

    // Cleanup usando removeAllListeners para asegurar limpieza completa
    return () => {
      console.log('🧹 Limpiando listeners SSH IPC');
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
  const availableThemes = themes ? Object.keys(themes) : [];
  const [terminalTheme, setTerminalTheme] = useState(() => {
      const savedThemeName = localStorage.getItem(THEME_STORAGE_KEY) || 'Default Dark';
      return themes && themes[savedThemeName] ? themes[savedThemeName] : {};
  });
  const [statusBarTheme, setStatusBarTheme] = useState(() => {
      return localStorage.getItem(STATUSBAR_THEME_STORAGE_KEY) || 'Default Dark';
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
  
  // Estado para trackear conexiones SSH
  const [sshConnectionStatus, setSshConnectionStatus] = useState({});

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
    return [...sshTabs, ...fileExplorerTabs];
  };

  const getTabTypeAndIndex = (globalIndex) => {
    if (globalIndex < sshTabs.length) {
      return { type: 'ssh', index: globalIndex };
    } else {
      return { type: 'explorer', index: globalIndex - sshTabs.length };
    }
  };

  // Funciones para drag & drop de pestañas
  const handleTabDragStart = (e, tabIndex) => {
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

    // Reordenar las pestañas
    const allTabs = getAllTabs();
    const draggedTab = allTabs[dragIndex];
    const newTabs = [...allTabs];
    
    // Remover el tab de su posición original
    newTabs.splice(dragIndex, 1);
    // Insertar en la nueva posición
    newTabs.splice(dropIndex, 0, draggedTab);
    
    // Separar nuevamente en SSH y Explorer tabs manteniendo el orden
    const newSshTabs = [];
    const newExplorerTabs = [];
    
    newTabs.forEach(tab => {
      // Verificar si es una pestaña SSH (incluyendo exploradores en SSH)
      const isSSHTab = sshTabs.some(sshTab => sshTab.key === tab.key);
      if (isSSHTab) {
        newSshTabs.push(tab);
      } else {
        newExplorerTabs.push(tab);
      }
    });
    
    // Actualizar los estados manteniendo el orden correcto
    setSshTabs(newSshTabs);
    setFileExplorerTabs(newExplorerTabs);
    
    // Actualizar el índice activo
    setActiveTabIndex(dropIndex);
    
    // Limpiar estado de drag
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
    
    if (!tabToMove) return;
    
    // Determinar si es una pestaña SSH o explorador
    const isSSHTab = globalIndex < sshTabs.length || tabToMove.isExplorerInSSH;
    
    if (isSSHTab) {
      // Mover pestaña SSH
      const currentSSHIndex = sshTabs.findIndex(tab => tab.key === tabToMove.key);
      if (currentSSHIndex !== -1) {
        const newSSHTabs = [...sshTabs];
        const [movedTab] = newSSHTabs.splice(currentSSHIndex, 1);
        newSSHTabs.unshift(movedTab); // Mover al principio
        setSshTabs(newSSHTabs);
        setActiveTabIndex(0); // Activar la primera pestaña
      }
    } else {
      // Mover pestaña de explorador
      const currentExplorerIndex = fileExplorerTabs.findIndex(tab => tab.key === tabToMove.key);
      if (currentExplorerIndex !== -1) {
        const newExplorerTabs = [...fileExplorerTabs];
        const [movedTab] = newExplorerTabs.splice(currentExplorerIndex, 1);
        
        // Si hay pestañas SSH, mover el explorador al principio de los exploradores
        // Si no hay pestañas SSH, mover al principio absoluto
        if (sshTabs.length > 0) {
          newExplorerTabs.unshift(movedTab);
          setFileExplorerTabs(newExplorerTabs);
          setActiveTabIndex(sshTabs.length); // Primera posición de exploradores
        } else {
          newExplorerTabs.unshift(movedTab);
          setFileExplorerTabs(newExplorerTabs);
          setActiveTabIndex(0); // Primera posición absoluta
        }
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
    
    // Cargar tema UI guardado (forzar recarga)
    setTimeout(() => {
      themeManager.loadSavedTheme();
    }, 100);
    
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
        onContextMenu={(e) => onNodeContextMenu(e, node)}
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
              // Datos del bastión Wallix
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
            setActiveTabIndex(0);
            setGroupActiveIndices(prev => ({
              ...prev,
              'no-group': 0
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

  // Función para generar items del menú contextual del árbol
  const getTreeContextMenuItems = (node) => {
    if (!node) return [];
    
    const isFolder = node.droppable;
    const isSSH = node.data && node.data.type === 'ssh';
    const items = [];
    
    if (isSSH) {
      // Items para sesiones SSH
      items.push({
        label: 'Abrir Terminal',
        icon: 'pi pi-desktop',
        command: () => {
          // Si no estamos en el grupo Home, cambiar a Home primero
          if (activeGroupId !== null) {
            // Guardar el índice activo del grupo actual antes de cambiar
            const currentGroupKey = activeGroupId || 'no-group';
            setGroupActiveIndices(prev => ({
              ...prev,
              [currentGroupKey]: activeTabIndex
            }));
            
            // Cambiar al grupo Home
            setActiveGroupId(null);
          }
          
          // Abrir nueva pestaña de terminal (mismo código que onDoubleClick)
          setSshTabs(prevTabs => {
            const tabId = `${node.key}_${Date.now()}`;
            const sshConfig = {
              host: node.data.useBastionWallix ? node.data.targetServer : node.data.host,
              username: node.data.user,
              password: node.data.password,
              port: node.data.port || 22,
              originalKey: node.key,
              // Datos del bastión Wallix
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
            setActiveTabIndex(0);
            // También actualizar el índice guardado para el grupo Home
            setGroupActiveIndices(prev => ({
              ...prev,
              'no-group': 0
            }));
            return newTabs;
          });
        }
      });
      
      items.push({
        label: 'Explorador de Archivos',
        icon: 'pi pi-folder-open',
        command: () => openFileExplorer(node)
      });
      
      items.push({ separator: true });
      
      items.push({
        label: 'Editar Sesión',
        icon: 'pi pi-pencil',
        command: () => openEditSSHDialog(node)
      });
    }
    
    if (isFolder) {
      // Items para carpetas
      items.push({
        label: 'Nueva Carpeta',
        icon: 'pi pi-plus',
        command: () => openNewFolderDialog(node.key)
      });
      
      items.push({ separator: true });
      
      items.push({
        label: 'Editar Carpeta',
        icon: 'pi pi-pencil',
        command: () => openEditFolderDialog(node)
      });
    }
    
    // Item eliminar para todos los tipos
    if (items.length > 0) {
      items.push({ separator: true });
    }
    
    const hasChildren = isFolder && node.children && node.children.length > 0;
    items.push({
      label: 'Eliminar',
      icon: 'pi pi-trash',
      command: () => confirmDeleteNode(node.key, node.label, hasChildren),
      className: 'p-menuitem-danger'
    });
    
    return items;
  };

  // Función para generar items del menú contextual general del árbol
  const getGeneralTreeContextMenuItems = () => {
    return [
      {
        label: 'Nueva Carpeta',
        icon: 'pi pi-folder',
        command: () => openNewFolderDialog(null) // null = crear en raíz
      },
      {
        label: 'Nueva Conexión SSH',
        icon: 'pi pi-desktop',
        command: () => setShowSSHDialog(true)
      }
    ];
  };

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
    // Solo mostrar el menú si NO se hizo click en un nodo
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
    const activeTabKey = sshTabs[activeTabIndex]?.key;
    if (activeTabKey && terminalRefs.current[activeTabKey]) {
      // Cancelar resize anterior si existe
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Usar requestAnimationFrame para optimizar el redimensionamiento
      requestAnimationFrame(() => {
        if (terminalRefs.current[activeTabKey]) {
          terminalRefs.current[activeTabKey].fit();
        }
      });
    }
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
      setActiveTabIndex(0);
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
    const allTabs = [...sshTabs, ...fileExplorerTabs];
    const activeTab = allTabs[activeTabIndex];
    if (activeTab && window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('ssh:set-active-stats-tab', activeTab.key);
    }
  }, [activeTabIndex, sshTabs, fileExplorerTabs]);

  return (
    <div style={{ width: '100%', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Splitter 
        style={{ height: '100%' }} 
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
            ? { width: 44, minWidth: 44, maxWidth: 44, padding: 0, height: '100%', transition: 'all 0.2s' }
            : { minWidth: 240, maxWidth: 400, padding: 0, height: '100%', transition: 'all 0.2s' }
          }
        >
          <Sidebar
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            nodes={nodes}
            selectedNodeKey={selectedNodeKey}
            setSelectedNodeKey={setSelectedNodeKey}
            expandedKeys={expandedKeys}
            setExpandedKeys={setExpandedKeys}
            allExpanded={allExpanded}
            toggleExpandAll={toggleExpandAll}
            setShowSSHDialog={setShowSSHDialog}
            openNewFolderDialog={openNewFolderDialog}
            setShowCreateGroupDialog={setShowCreateGroupDialog}
            setShowSettingsDialog={setShowSettingsDialog}
            onTreeAreaContextMenu={onTreeAreaContextMenu}
            onDragDrop={onDragDrop}
            setDraggedNodeKey={setDraggedNodeKey}
            nodeTemplate={nodeTemplate}
            iconTheme={iconThemeSidebar}
            explorerFont={sidebarFont}
            explorerFontSize={sidebarFontSize}
          />
        </SplitterPanel>
        <SplitterPanel size={sidebarVisible ? 85 : 100} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%', height: '100%' }}>
          {(sshTabs.length > 0 || fileExplorerTabs.length > 0) ? (
            <div style={{ width: '100%', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
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
                    // Guardar el índice activo del grupo actual antes de cambiar
                    const currentGroupKey = activeGroupId || 'no-group';
                    setGroupActiveIndices(prev => ({
                      ...prev,
                      [currentGroupKey]: activeTabIndex
                    }));
                    
                    // Cambiar al nuevo grupo
                    const newGroupId = e.index === 0 ? null : tabGroups[e.index - 1].id;
                    setActiveGroupId(newGroupId);
                    
                    // Restaurar el índice activo del nuevo grupo (o 0 si es la primera vez)
                    const newGroupKey = newGroupId || 'no-group';
                    const savedIndex = groupActiveIndices[newGroupKey] || 0;
                    const tabsInNewGroup = getTabsInGroup(newGroupId);
                    const validIndex = Math.min(savedIndex, Math.max(0, tabsInNewGroup.length - 1));
                    setActiveTabIndex(validIndex);
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
                <TabView 
                  activeIndex={activeTabIndex} 
                  onTabChange={(e) => {
                    setActiveTabIndex(e.index);
                    // También guardar el nuevo índice para el grupo actual
                    const currentGroupKey = activeGroupId || 'no-group';
                    setGroupActiveIndices(prev => ({
                      ...prev,
                      [currentGroupKey]: e.index
                    }));
                  }}
                  renderActiveOnly={false}
                  scrollable={false}
                  className=""
                >
                {getFilteredTabs().map((tab, idx) => {
                  // Con las pestañas híbridas, todas las pestañas visibles están en el contexto SSH o explorer
                  const isSSHTab = idx < sshTabs.length || tab.isExplorerInSSH;
                  const originalIdx = isSSHTab ? idx : idx - sshTabs.length;
                  
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
                            {/* Icono específico para exploradores */}
                            {(tab.type === 'explorer' || tab.isExplorerInSSH) && (
                              <i className="pi pi-folder-open" style={{ fontSize: '12px', marginRight: '6px' }}></i>
                            )}
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
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
                                
                                if (isSSHTab) {
                                  // Solo enviar ssh:disconnect para pestañas de terminal o exploradores que tengan su propia conexión
                                  if (!closedTab.isExplorerInSSH && window.electron && window.electron.ipcRenderer) {
                                    // Terminal SSH - siempre desconectar
                                    window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
                                  } else if (closedTab.isExplorerInSSH && closedTab.needsOwnConnection && window.electron && window.electron.ipcRenderer) {
                                    // Explorador con conexión propia - desconectar
                                    window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
                                  }
                                  // Los exploradores que usan el pool NO necesitan desconectarse
                                  const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
                                  if (!closedTab.isExplorerInSSH) {
                                    delete terminalRefs.current[closedTab.key];
                                  }
                                  // --- NUEVO: Si ya no quedan pestañas activas con este originalKey, marcar como disconnected ---
                                  const remainingTabs = newSshTabs.filter(t => t.originalKey === closedTab.originalKey);
                                  if (remainingTabs.length === 0) {
                                      setSshConnectionStatus(prev => {
                                          const updated = { ...prev, [closedTab.originalKey]: 'disconnected' };
                                          console.log('🔌 Todas las pestañas cerradas para', closedTab.originalKey, '-> Estado:', updated);
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
                                  // También actualizar el índice guardado para el grupo actual
                                  const currentGroupKey = activeGroupId || 'no-group';
                                  setGroupActiveIndices(prev => ({
                                    ...prev,
                                    [currentGroupKey]: newIndex
                                  }));
                                } else if (activeTabIndex > idx) {
                                  const newIndex = activeTabIndex - 1;
                                  setActiveTabIndex(newIndex);
                                  // También actualizar el índice guardado para el grupo actual
                                  const currentGroupKey = activeGroupId || 'no-group';
                                  setGroupActiveIndices(prev => ({
                                    ...prev,
                                    [currentGroupKey]: newIndex
                                  }));
                                }
                              }}
                              // tooltip="Cerrar pestaña"
                              // tooltipOptions={{ position: 'top' }}
                            />
                            {rightIcon}
                          </div>
                        );
                      }}
                    />
                  );
                })}
                </TabView>
                
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
                              <div style={{ flexGrow: 1, position: 'relative' }}>
                {/* Renderizar TODAS las pestañas pero sólo mostrar la activa del grupo actual */}
                {[...sshTabs, ...fileExplorerTabs].map((tab) => {
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
                        pointerEvents: isActiveTab ? 'auto' : 'none'
                      }}
                    >
                      {(tab.type === 'explorer' || tab.isExplorerInSSH) ? (
                        <FileExplorer
                          sshConfig={tab.sshConfig}
                          tabId={tab.key}
                          iconTheme={iconTheme}
                          explorerFont={explorerFont}
                          explorerColorTheme={explorerColorTheme}
                          explorerFontSize={explorerFontSize}
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
      
      <Dialog 
        header="Crear Nueva Carpeta" 
        visible={showFolderDialog} 
        style={{ width: '30rem' }}
        onHide={() => setShowFolderDialog(false)}
        footer={(
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowFolderDialog(false)} className="p-button-text" />
            <Button label="Crear" icon="pi pi-check" onClick={createNewFolder} autoFocus />
          </div>
        )}
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="folderName">Nombre de la carpeta</label>
            <InputText
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') createNewFolder();
              }}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Nueva sesión SSH"
        visible={showSSHDialog}
        style={{ width: '25rem' }}
        onHide={() => setShowSSHDialog(false)}
        footer={
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowSSHDialog(false)} className="p-button-text" />
            <Button label="Crear" icon="pi pi-check" onClick={createNewSSH} autoFocus />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="sshName">Nombre</label>
            <InputText id="sshName" value={sshName} onChange={e => setSSHName(e.target.value)} autoFocus />
          </div>
          <div className="p-field">
            <label htmlFor="sshHost">Host</label>
            <InputText id="sshHost" value={sshHost} onChange={e => setSSHHost(e.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="sshUser">Usuario</label>
            <InputText 
              id="sshUser" 
              value={sshUser} 
              onChange={e => setSSHUser(e.target.value)} 
              placeholder="usuario o rt01119@default@ESJC-SGCT-NX02P:SSH:rt01119"
            />
            <small className="p-d-block" style={{ color: '#666', marginTop: '0.25rem' }}>
              Para Wallix usar formato: usuario@dominio@servidor:protocolo:usuario_destino
            </small>
          </div>
          <div className="p-field">
            <label htmlFor="sshPassword">Contraseña</label>
            <InputText id="sshPassword" type="password" value={sshPassword} onChange={e => setSSHPassword(e.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="sshPort">Puerto</label>
            <InputNumber 
              id="sshPort" 
              value={sshPort} 
              onValueChange={e => setSSHPort(e.value || 22)} 
              min={1} 
              max={65535} 
              placeholder="22"
              useGrouping={false}
            />
          </div>
          <div className="p-field">
            <label htmlFor="sshRemoteFolder">Carpeta remota</label>
            <InputText id="sshRemoteFolder" value={sshRemoteFolder} onChange={e => setSSHRemoteFolder(e.target.value)} placeholder="/home/usuario" />
          </div>
          <div className="p-field">
            <label htmlFor="sshTargetFolder">Carpeta destino</label>
            <Dropdown id="sshTargetFolder" value={sshTargetFolder} options={getAllFolders(nodes)} onChange={e => setSSHTargetFolder(e.value)} placeholder="Selecciona una carpeta (opcional)" showClear filter />
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Editar sesión SSH"
        visible={showEditSSHDialog}
        style={{ width: '25rem' }}
        onHide={() => setShowEditSSHDialog(false)}
        footer={
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowEditSSHDialog(false)} className="p-button-text" />
            <Button label="Guardar" icon="pi pi-check" onClick={saveEditSSH} autoFocus />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="editSSHName">Nombre</label>
            <InputText id="editSSHName" value={editSSHName} onChange={e => setEditSSHName(e.target.value)} autoFocus />
          </div>
          <div className="p-field">
            <label htmlFor="editSSHHost">Host</label>
            <InputText id="editSSHHost" value={editSSHHost} onChange={e => setEditSSHHost(e.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="editSSHUser">Usuario</label>
            <InputText 
              id="editSSHUser" 
              value={editSSHUser} 
              onChange={e => setEditSSHUser(e.target.value)} 
              placeholder="usuario o rt01119@default@ESJC-SGCT-NX02P:SSH:rt01119"
            />
            <small className="p-d-block" style={{ color: '#666', marginTop: '0.25rem' }}>
              Para Wallix usar formato: usuario@dominio@servidor:protocolo:usuario_destino
            </small>
          </div>
          <div className="p-field">
            <label htmlFor="editSSHPassword">Contraseña</label>
            <InputText id="editSSHPassword" type="password" value={editSSHPassword} onChange={e => setEditSSHPassword(e.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="editSSHPort">Puerto</label>
            <InputNumber 
              id="editSSHPort" 
              value={editSSHPort} 
              onValueChange={e => setEditSSHPort(e.value || 22)} 
              min={1} 
              max={65535} 
              placeholder="22"
              useGrouping={false}
            />
          </div>
          <div className="p-field">
            <label htmlFor="editSSHRemoteFolder">Carpeta remota</label>
            <InputText id="editSSHRemoteFolder" value={editSSHRemoteFolder} onChange={e => setEditSSHRemoteFolder(e.target.value)} placeholder="/home/usuario" />
          </div>
        </div>
      </Dialog>



      <Dialog
        header="Editar carpeta"
        visible={showEditFolderDialog}
        style={{ width: '25rem' }}
        onHide={() => setShowEditFolderDialog(false)}
        footer={
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowEditFolderDialog(false)} className="p-button-text" />
            <Button label="Guardar" icon="pi pi-check" onClick={saveEditFolder} autoFocus />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="editFolderName">Nombre de la carpeta</label>
            <InputText id="editFolderName" value={editFolderName} onChange={e => setEditFolderName(e.target.value)} autoFocus />
          </div>
        </div>
      </Dialog>

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
      />

      {/* Diálogo para crear nuevo grupo */}
      <Dialog
        header="Crear Nuevo Grupo de Pestañas"
        visible={showCreateGroupDialog}
        style={{ width: '25rem' }}
        onHide={() => {
          setShowCreateGroupDialog(false);
          setNewGroupName('');
        }}
        footer={
          <div>
            <Button 
              label="Cancelar" 
              icon="pi pi-times" 
              onClick={() => {
                setShowCreateGroupDialog(false);
                setNewGroupName('');
              }} 
              className="p-button-text" 
            />
            <Button 
              label="Crear" 
              icon="pi pi-check" 
              onClick={createNewGroup} 
              autoFocus 
              disabled={!newGroupName.trim()}
            />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="p-field">
            <label htmlFor="groupName">Nombre del grupo</label>
            <InputText
              id="groupName"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Ej: Producción, Desarrollo, Testing..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newGroupName.trim()) {
                  createNewGroup();
                }
              }}
            />
          </div>
          {/* {tabGroups.length > 0 && (
            <div className="mt-3">
              <small className="text-muted">
                Grupos existentes: {tabGroups.map(g => g.name).join(', ')}
              </small>
            </div>
          )} */}
          <div className="p-field">
            <label>Color del grupo</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', margin: '10px 0 0 0' }}>
              {GROUP_COLORS.map(color => (
                <div
                  key={color}
                  onClick={() => setSelectedGroupColor(color)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: color,
                    border: selectedGroupColor === color ? '3px solid #333' : '2px solid #fff',
                    boxShadow: '0 0 2px #888',
                    cursor: 'pointer',
                    transition: 'border 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                  title={color}
                >
                  {selectedGroupColor === color && (
                    <i className="pi pi-check" style={{ color: '#fff', fontSize: 18, textShadow: '0 0 2px #333' }}></i>
                  )}
                </div>
              ))}
              {/* Paleta de color personalizada */}
              <label style={{ margin: 0, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Elegir color personalizado">
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: selectedGroupColor && !GROUP_COLORS.includes(selectedGroupColor) ? selectedGroupColor : '#eee',
                  border: selectedGroupColor && !GROUP_COLORS.includes(selectedGroupColor) ? '3px solid #333' : '2px dashed #bbb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 2px #888',
                }}>
                  <i className="pi pi-palette" style={{ color: '#888', fontSize: 18 }}></i>
                </div>
                <input
                  type="color"
                  style={{ display: 'none' }}
                  value={selectedGroupColor && !GROUP_COLORS.includes(selectedGroupColor) ? selectedGroupColor : '#888888'}
                  onChange={e => setSelectedGroupColor(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      </Dialog>
      
      {/* Menú contextual del árbol de sesiones */}
      <ContextMenu
        ref={treeContextMenuRef}
        model={
          isGeneralTreeMenu 
            ? getGeneralTreeContextMenuItems() 
            : (selectedNode ? getTreeContextMenuItems(selectedNode) : [])
        }
      />
    </div>
  );
};

export default App; 