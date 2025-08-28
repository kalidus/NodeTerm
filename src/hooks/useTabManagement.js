import { useState, useRef, useCallback } from 'react';

export const useTabManagement = (toast) => {
  // === ESTADO DE PESTAÑAS ===
  const [sshTabs, setSshTabs] = useState([]);
  const [rdpTabs, setRdpTabs] = useState([]);
  const [guacamoleTabs, setGuacamoleTabs] = useState([]);
  const [fileExplorerTabs, setFileExplorerTabs] = useState([]);
  const [homeTabs, setHomeTabs] = useState(() => [
    {
      key: 'home_tab_default',
      label: 'Inicio',
      type: 'home'
    }
  ]);

  // === ESTADO DE ACTIVACIÓN Y ORDEN ===
  const [lastOpenedTabKey, setLastOpenedTabKey] = useState(null);
  const [onCreateActivateTabKey, setOnCreateActivateTabKey] = useState(null);
  const activatingNowRef = useRef(false);
  const [openTabOrder, setOpenTabOrder] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [pendingExplorerSession, setPendingExplorerSession] = useState(null);

  // === ESTADO DE GRUPOS ===
  const [tabGroups, setTabGroups] = useState(() => []);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [groupActiveIndices, setGroupActiveIndices] = useState({});
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupColor, setSelectedGroupColor] = useState('#1976d2'); // Color por defecto
  const [tabContextMenu, setTabContextMenu] = useState(null);

  // === ESTADO DE TRACKING ===
  const [tabDistros, setTabDistros] = useState({});
  const activeListenersRef = useRef(new Set());
  const terminalRefs = useRef({});

  // === CONSTANTES ===
  const GROUP_COLORS = [
    '#1976d2', '#43a047', '#fbc02d', '#d32f2f', '#7b1fa2', '#0097a7', '#ff9800', '#607d8b', '#cfd8dc', '#ff5722', '#8d6e63', '#00bcd4'
  ];

  // === FUNCIONES AUXILIARES ===
  const getNextGroupColor = useCallback(() => {
    return GROUP_COLORS[tabGroups.length % GROUP_COLORS.length];
  }, [tabGroups.length]);

  const getAllTabs = useCallback(() => {
    return [...homeTabs, ...sshTabs, ...rdpTabs, ...guacamoleTabs, ...fileExplorerTabs];
  }, [homeTabs, sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs]);

  const getTabsInGroup = useCallback((groupId) => {
    const allTabs = [...homeTabs, ...sshTabs, ...rdpTabs, ...guacamoleTabs, ...fileExplorerTabs];
    const pool = groupId ? allTabs.filter(tab => tab.groupId === groupId) : allTabs.filter(tab => !tab.groupId);
    const home = pool.filter(t => t.type === 'home');
    const nonHome = pool.filter(t => t.type !== 'home');
    const byKey = new Map(nonHome.map(t => [t.key, t]));
    const ordered = [];
    
    // Respeta el orden de apertura más reciente a más antiguo
    for (const key of openTabOrder) {
      const t = byKey.get(key);
      if (t) {
        ordered.push(t);
        byKey.delete(key);
      }
    }
    
    // Si quedan pestañas sin entrada en openTabOrder, apéndalas por createdAt desc
    const rest = Array.from(byKey.values()).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    return [...home, ...ordered, ...rest];
  }, [homeTabs, sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs, openTabOrder]);

  const getFilteredTabs = useCallback(() => {
    return getTabsInGroup(activeGroupId);
  }, [getTabsInGroup, activeGroupId]);

  // === FUNCIONES DE GRUPOS ===
  const handleLoadGroupFromFavorites = useCallback((groupConnection, nodes) => {
    if (!groupConnection || !groupConnection.sessions) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cargar el grupo: datos inválidos',
        life: 3000
      });
      return;
    }

    // Verificar si ya existe un grupo con el mismo nombre
    const existingGroup = tabGroups.find(group => group.name === groupConnection.name);
    
    if (existingGroup) {
      setActiveGroupId(existingGroup.id);
      setActiveTabIndex(0);
      
      toast.current.show({
        severity: 'info',
        summary: 'Grupo ya existe',
        detail: `El grupo "${groupConnection.name}" ya está abierto`,
        life: 3000
      });
      return;
    }

    // Crear un nuevo grupo con las sesiones guardadas
    const newGroup = {
      id: `group_${Date.now()}`,
      name: groupConnection.name,
      color: groupConnection.color || getNextGroupColor(),
      createdAt: new Date().toISOString()
    };

    setTabGroups(prev => [...prev, newGroup]);

    // Cargar cada sesión del grupo
    groupConnection.sessions.forEach(session => {
      if (session.type === 'terminal' || session.type === 'ssh') {
        // Buscar el nodo original en el sidebar para obtener la configuración completa
        let matchedSidebarNode = null;
        if (session.host && session.username) {
          const matchesConn = (node) => {
            if (!node || !node.data || node.data.type !== 'ssh') return false;
            const hostMatches = (node.data.host === session.host) || (node.data.targetServer === session.host) || (node.data.hostname === session.host);
            const userMatches = (node.data.user === session.username) || (node.data.username === session.username);
            const portMatches = (node.data.port || 22) === (session.port || 22);
            return hostMatches && userMatches && portMatches;
          };
          const dfs = (list) => {
            if (!Array.isArray(list)) return;
            for (const n of list) {
              if (matchesConn(n)) { matchedSidebarNode = n; return; }
              if (n.children && n.children.length > 0) dfs(n.children);
              if (matchedSidebarNode) return;
            }
          };
          dfs(nodes);
        }

        // Crear pestaña SSH con configuración completa
        const nowTs = Date.now();
        const tabId = `${session.key}_${nowTs}`;
        const sshConfig = {
          host: session.host,
          username: session.username,
          password: matchedSidebarNode?.data?.password || '',
          port: session.port,
          originalKey: session.key,
          useBastionWallix: session.useBastionWallix || matchedSidebarNode?.data?.useBastionWallix || false,
          bastionHost: session.bastionHost || matchedSidebarNode?.data?.bastionHost || '',
          bastionUser: session.bastionUser || matchedSidebarNode?.data?.bastionUser || ''
        };
        
        const sshTab = {
          key: tabId,
          label: session.label,
          originalKey: session.key,
          sshConfig: sshConfig,
          type: 'terminal',
          createdAt: nowTs,
          groupId: newGroup.id
        };
        setSshTabs(prev => [...prev, sshTab]);
      } else if (session.type === 'rdp' || session.type === 'rdp-guacamole') {
        // Buscar el nodo original en el sidebar para obtener la configuración completa
        let matchedSidebarNode = null;
        if (session.host && session.username) {
          const matchesConn = (node) => {
            if (!node || !node.data || node.data.type !== 'rdp') return false;
            const hostMatches = (node.data.host === session.host) || (node.data.targetServer === session.host) || (node.data.hostname === session.host);
            const userMatches = (node.data.user === session.username) || (node.data.username === session.username);
            const portMatches = (node.data.port || 3389) === (session.port || 3389);
            return hostMatches && userMatches && portMatches;
          };
          const dfs = (list) => {
            if (!Array.isArray(list)) return;
            for (const n of list) {
              if (matchesConn(n)) { matchedSidebarNode = n; return; }
              if (n.children && n.children.length > 0) dfs(n.children);
              if (matchedSidebarNode) return;
            }
          };
          dfs(nodes);
        }

        // Crear pestaña RDP con configuración completa
        const rdpTab = {
          key: session.key,
          label: session.label,
          type: 'rdp',
          groupId: newGroup.id,
          rdpConfig: {
            server: session.host,
            username: session.username,
            password: matchedSidebarNode?.data?.password || '',
            port: session.port,
            clientType: session.clientType || matchedSidebarNode?.data?.clientType || 'mstsc'
          }
        };
        setRdpTabs(prev => [...prev, rdpTab]);
      } else if (session.type === 'explorer') {
        // Buscar el nodo original en el sidebar para obtener la configuración completa
        let matchedSidebarNode = null;
        if (session.host && session.username) {
          const matchesConn = (node) => {
            if (!node || !node.data || node.data.type !== 'ssh') return false;
            const hostMatches = (node.data.host === session.host) || (node.data.targetServer === session.host) || (node.data.hostname === session.host);
            const userMatches = (node.data.user === session.username) || (node.data.username === session.username);
            const portMatches = (node.data.port || 22) === (session.port || 22);
            return hostMatches && userMatches && portMatches;
          };
          const dfs = (list) => {
            if (!Array.isArray(list)) return;
            for (const n of list) {
              if (matchesConn(n)) { matchedSidebarNode = n; return; }
              if (n.children && n.children.length > 0) dfs(n.children);
              if (matchedSidebarNode) return;
            }
          };
          dfs(nodes);
        }

        // Crear pestaña explorador con configuración completa
        const explorerTab = {
          key: session.key,
          label: session.label,
          type: 'explorer',
          groupId: newGroup.id,
          sshConfig: {
            host: session.host,
            username: session.username,
            password: matchedSidebarNode?.data?.password || '',
            port: session.port,
            originalKey: session.key,
            useBastionWallix: session.useBastionWallix || matchedSidebarNode?.data?.useBastionWallix || false,
            bastionHost: session.bastionHost || matchedSidebarNode?.data?.bastionHost || '',
            bastionUser: session.bastionUser || matchedSidebarNode?.data?.bastionUser || ''
          },
          isExplorerInSSH: session.isExplorerInSSH || false,
          needsOwnConnection: session.needsOwnConnection || false
        };
        setFileExplorerTabs(prev => [...prev, explorerTab]);
      }
    });

    // Activar el grupo
    setActiveGroupId(newGroup.id);
    setActiveTabIndex(0);

    toast.current.show({
      severity: 'success',
      summary: 'Grupo cargado',
      detail: `Grupo "${groupConnection.name}" cargado con ${groupConnection.sessions.length} sesiones`,
      life: 3000
    });
  }, [tabGroups, getNextGroupColor, toast]);

  const createNewGroup = useCallback(() => {
    if (!newGroupName.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre del grupo no puede estar vacío',
        life: 3000
      });
      return;
    }
    
    const trimmedName = newGroupName.trim();
    const existingGroup = tabGroups.find(group => group.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingGroup) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: `Ya existe un grupo con el nombre "${trimmedName}"`,
        life: 3000
      });
      return;
    }
    
    const colorToUse = selectedGroupColor || getNextGroupColor();
    const newGroup = {
      id: `group_${Date.now()}`,
      name: trimmedName,
      color: colorToUse,
      createdAt: new Date().toISOString()
    };
    setTabGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    setSelectedGroupColor('#1976d2'); // Reset al color por defecto
    setShowCreateGroupDialog(false);
    toast.current.show({
      severity: 'success',
      summary: 'Grupo creado',
      detail: `Grupo "${newGroup.name}" creado exitosamente`,
      life: 3000
    });
  }, [newGroupName, tabGroups, selectedGroupColor, getNextGroupColor, toast]);

  const deleteGroup = useCallback((groupId) => {
    // Remover groupId de todas las pestañas
    setSshTabs(prev => prev.map(tab => 
      tab.groupId === groupId ? { ...tab, groupId: null } : tab
    ));
    setRdpTabs(prev => prev.map(tab => 
      tab.groupId === groupId ? { ...tab, groupId: null } : tab
    ));
    setGuacamoleTabs(prev => prev.map(tab => 
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
  }, [activeGroupId]);

  const moveTabToGroup = useCallback((tabKey, groupId) => {
    setHomeTabs(prev => prev.map(tab => 
      tab.key === tabKey ? { ...tab, groupId } : tab
    ));
    setSshTabs(prev => prev.map(tab => 
      tab.key === tabKey ? { ...tab, groupId } : tab
    ));
    setRdpTabs(prev => prev.map(tab => 
      tab.key === tabKey ? { ...tab, groupId } : tab
    ));
    setGuacamoleTabs(prev => prev.map(tab => 
      tab.key === tabKey ? { ...tab, groupId } : tab
    ));
    setFileExplorerTabs(prev => prev.map(tab => 
      tab.key === tabKey ? { ...tab, groupId } : tab
    ));
  }, []);

  // === FUNCIONES DE LIMPIEZA ===
  const cleanupTabDistro = useCallback((tabKey) => {
    setTabDistros(prev => {
      const newDistros = { ...prev };
      delete newDistros[tabKey];
      return newDistros;
    });
  }, []);

  // === FUNCIONES DE MENÚ CONTEXTUAL ===
  const handleTabContextMenu = useCallback((e, tabKey) => {
    e.preventDefault();
    e.stopPropagation();
    
    setTabContextMenu({
      tabKey,
      x: e.clientX,
      y: e.clientY
    });
  }, []);

  // === RETORNO DEL HOOK ===
  return {
    // Estado
    sshTabs, setSshTabs,
    rdpTabs, setRdpTabs,
    guacamoleTabs, setGuacamoleTabs,
    fileExplorerTabs, setFileExplorerTabs,
    homeTabs, setHomeTabs,
    lastOpenedTabKey, setLastOpenedTabKey,
    onCreateActivateTabKey, setOnCreateActivateTabKey,
    activatingNowRef,
    openTabOrder, setOpenTabOrder,
    activeTabIndex, setActiveTabIndex,
    pendingExplorerSession, setPendingExplorerSession,
    tabGroups, setTabGroups,
    activeGroupId, setActiveGroupId,
    groupActiveIndices, setGroupActiveIndices,
    showCreateGroupDialog, setShowCreateGroupDialog,
    newGroupName, setNewGroupName,
    selectedGroupColor, setSelectedGroupColor,
    tabContextMenu, setTabContextMenu,
    tabDistros, setTabDistros,
    activeListenersRef,
    terminalRefs,
    
    // Constantes
    GROUP_COLORS,
    
    // Funciones
    getNextGroupColor,
    getAllTabs,
    getTabsInGroup,
    getFilteredTabs,
    handleLoadGroupFromFavorites,
    createNewGroup,
    deleteGroup,
    moveTabToGroup,
    cleanupTabDistro,
    handleTabContextMenu
  };
};
