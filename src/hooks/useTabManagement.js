import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import connectionStore from '../utils/connectionStore';
import { findConnectionInTree } from '../utils/findConnectionInTree';
import { isHomeButtonLocked as readHomeButtonLocked } from '../utils/homeTabDefaults';
import { toggleBroadcastGroup, toggleBroadcastTarget } from '../utils/broadcastMembership';
import {
  themeManager,
  getThemeGroupColorPalette,
  getDefaultGroupColor
} from '../utils/themeManager';

export const useTabManagement = (toast, {
  cleanupTabDistro: externalCleanupTabDistro,
  setSshConnectionStatus,
  terminalRefs: externalTerminalRefs,
  GROUP_KEYS
} = {}) => {
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
  const [selectedGroupColor, setSelectedGroupColor] = useState(() =>
    getDefaultGroupColor(themeManager.getCurrentTheme()?.colors)
  );
  const [tabContextMenu, setTabContextMenu] = useState(null);

  // === ESTADO DE TRACKING ===
  const [tabDistros, setTabDistros] = useState({});
  const activeListenersRef = useRef(new Set());
  const terminalRefs = useRef({});

  const [groupColorPalette, setGroupColorPalette] = useState(() =>
    getThemeGroupColorPalette(themeManager.getCurrentTheme()?.colors)
  );

  useEffect(() => {
    const syncGroupColorsFromTheme = () => {
      const colors = themeManager.getCurrentTheme()?.colors;
      const palette = getThemeGroupColorPalette(colors);
      setGroupColorPalette(palette);
      setSelectedGroupColor((prev) => {
        if (prev === '#1976d2') {
          return palette[0] || getDefaultGroupColor(colors);
        }
        return prev;
      });
    };
    syncGroupColorsFromTheme();
    window.addEventListener('theme-changed', syncGroupColorsFromTheme);
    return () => window.removeEventListener('theme-changed', syncGroupColorsFromTheme);
  }, []);

  const GROUP_COLORS = useMemo(() => groupColorPalette, [groupColorPalette]);

  // === FUNCIONES AUXILIARES ===
  const getNextGroupColor = useCallback(() => {
    if (GROUP_COLORS.length === 0) {
      return getDefaultGroupColor(themeManager.getCurrentTheme()?.colors);
    }
    return GROUP_COLORS[tabGroups.length % GROUP_COLORS.length];
  }, [tabGroups.length, GROUP_COLORS]);

  const getAllTabs = useCallback(() => {
    return [...homeTabs, ...sshTabs, ...rdpTabs, ...guacamoleTabs, ...fileExplorerTabs];
  }, [homeTabs, sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs]);

  const getTabsInGroup = useCallback((groupId) => {
    const allTabs = [...homeTabs, ...sshTabs, ...rdpTabs, ...guacamoleTabs, ...fileExplorerTabs]
      .filter(tab => !tab.embedInHome);
    const pool = groupId ? allTabs.filter(tab => tab.groupId === groupId) : allTabs.filter(tab => !tab.groupId);
    const home = pool.filter(t => t.type === 'home');
    const nonHome = pool.filter(t => t.type !== 'home');

    // Verificar si el botón de inicio está bloqueado
    const isHomeButtonLocked = readHomeButtonLocked();

    if (isHomeButtonLocked) {
      // Si está bloqueado, mantener las pestañas de inicio al principio
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
    } else {
      // Si no está bloqueado, tratar las pestañas de inicio como pestañas normales
      const allTabsWithHome = [...home, ...nonHome];
      const byKey = new Map(allTabsWithHome.map(t => [t.key, t]));
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

      // Retornar en el orden respetando openTabOrder (las pestañas de inicio pueden estar en cualquier posición)
      return [...ordered, ...rest];
    }
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

    // Registrar grupo como reciente para que aparezca en la sección Recientes del HomeTab
    try {
      connectionStore.recordRecent({
        type: 'group',
        id: groupConnection.id,
        name: groupConnection.name,
        color: groupConnection.color,
        sessions: groupConnection.sessions,
        createdAt: groupConnection.createdAt
      }, 200);
    } catch (e) { /* noop */ }

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

    // Cargar cada sesión del grupo (credenciales siempre desde el vault/árbol)
    groupConnection.sessions.forEach(session => {
      if (session.type === 'terminal' || session.type === 'ssh') {
        const matchedSidebarNode = findConnectionInTree(nodes, {
          wantedId: session.key || session.originalKey || session.id,
          types: ['ssh'],
          host: session.host,
          username: session.username,
          port: session.port || 22,
          bastionHost: session.bastionHost,
          bastionUser: session.bastionUser,
          targetServer: session.targetServer
        });
        const vault = matchedSidebarNode?.data || {};

        const nowTs = Date.now();
        const tabId = `${session.key}_${nowTs}`;
        const sshConfig = {
          host: session.host,
          username: session.username,
          password: vault.password || '',
          privateKey: vault.privateKey || '',
          authMethod: vault.authMethod || (vault.privateKey?.trim() ? 'key' : 'password'),
          port: session.port,
          originalKey: matchedSidebarNode?.key || session.key,
          name: session.label,
          useBastionWallix: session.useBastionWallix || vault.useBastionWallix || false,
          bastionHost: session.bastionHost || vault.bastionHost || '',
          bastionUser: session.bastionUser || vault.bastionUser || '',
          targetServer: session.targetServer || vault.targetServer || '',
          x11Forwarding: vault.x11Forwarding || false,
          agentForwarding: vault.agentForwarding || false,
          autoRecording: vault.autoRecording || false,
          proxyJumpEnabled: vault.proxyJumpEnabled || false,
          jumpHost: vault.jumpHost || '',
          jumpPort: vault.jumpPort || 22,
          jumpUser: vault.jumpUser || '',
          jumpAuthMethod: vault.jumpAuthMethod || 'password',
          jumpPassword: vault.jumpPassword || '',
          jumpPrivateKey: vault.jumpPrivateKey || '',
          hostKeyPolicy: vault.hostKeyPolicy || 'warn_new'
        };

        const sshTab = {
          key: tabId,
          label: session.label,
          originalKey: matchedSidebarNode?.key || session.key,
          sshConfig: sshConfig,
          type: 'terminal',
          createdAt: nowTs,
          groupId: newGroup.id
        };
        setSshTabs(prev => [...prev, sshTab]);
      } else if (session.type === 'rdp' || session.type === 'rdp-guacamole') {
        const matchedSidebarNode = findConnectionInTree(nodes, {
          wantedId: session.key || session.originalKey || session.id,
          types: ['rdp', 'rdp-guacamole'],
          host: session.host,
          username: session.username,
          port: session.port || 3389,
          bastionHost: session.bastionHost,
          bastionUser: session.bastionUser,
          targetServer: session.targetServer
        });
        const vault = matchedSidebarNode?.data || {};

        const rdpTab = {
          key: session.key,
          label: session.label,
          type: 'rdp',
          groupId: newGroup.id,
          rdpConfig: {
            ...vault,
            server: vault.server || vault.host || session.host,
            hostname: vault.server || vault.host || session.host,
            username: vault.username || vault.user || session.username,
            password: vault.password || '',
            port: vault.port || session.port,
            clientType: session.clientType || vault.clientType || 'web-rdp'
          }
        };
        setRdpTabs(prev => [...prev, rdpTab]);
      } else if (session.type === 'vnc' || session.type === 'vnc-guacamole') {
        const matchedSidebarNode = findConnectionInTree(nodes, {
          wantedId: session.key || session.originalKey || session.id,
          types: ['vnc', 'vnc-guacamole'],
          host: session.host,
          username: session.username || '',
          port: session.port || 5900
        });
        const vault = matchedSidebarNode?.data || {};
        const rdpTab = {
          key: session.key,
          label: session.label,
          type: 'rdp',
          groupId: newGroup.id,
          rdpConfig: {
            connectionType: 'vnc',
            server: session.host,
            username: session.username || vault.username || '',
            password: vault.password || '',
            port: session.port || 5900,
            clientType: session.clientType || vault.clientType || 'web-vnc'
          }
        };
        setRdpTabs(prev => [...prev, rdpTab]);
      } else if (session.type === 'explorer' || session.type === 'sftp' || session.type === 'ftp' || session.type === 'scp') {
        const protocol = session.protocol || (session.type === 'explorer' ? 'sftp' : session.type);
        const matchedSidebarNode = findConnectionInTree(nodes, {
          wantedId: session.key || session.originalKey || session.id,
          types: ['sftp', 'ftp', 'scp', 'ssh', 'explorer'],
          host: session.host,
          username: session.username,
          port: session.port || (protocol === 'ftp' ? 21 : 22),
          bastionHost: session.bastionHost,
          bastionUser: session.bastionUser,
          targetServer: session.targetServer
        });
        const vault = matchedSidebarNode?.data || {};

        const nowTs = Date.now();
        const tabId = `explorer_${session.key}_${nowTs}`;
        const config = {
          host: session.host,
          username: session.username,
          password: vault.password || '',
          privateKey: vault.privateKey || '',
          port: session.port || (protocol === 'ftp' ? 21 : 22),
          originalKey: matchedSidebarNode?.key || session.key,
          protocol: protocol
        };

        const explorerTab = {
          key: tabId,
          label: session.label,
          originalKey: matchedSidebarNode?.key || session.key,
          sshConfig: config,
          type: 'explorer',
          createdAt: nowTs,
          needsOwnConnection: false,
          isExplorerInSSH: true,
          groupId: newGroup.id
        };
        setSshTabs(prev => [...prev, explorerTab]);
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
    setSelectedGroupColor(getDefaultGroupColor(themeManager.getCurrentTheme()?.colors));
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

  const groupTabsBySection = useCallback((tabKey) => {
    const allTabs = [...homeTabs, ...sshTabs, ...rdpTabs, ...guacamoleTabs, ...fileExplorerTabs];
    const targetTab = allTabs.find(t => t.key === tabKey);
    if (!targetTab) return;

    const getTabSection = (t) => {
      if (!t) return null;
      const type = t.type;
      if (type === 'password' || type === 'password-folder') {
        return 'password';
      }
      if (type === 'document' || type === 'document-folder' || type === 'library-file') {
        return 'biblioteca';
      }
      const sessionTypes = [
        'terminal', 'split', 'rdp', 'rdp-guacamole', 'vnc', 'vnc-guacamole',
        'guacamole', 'explorer', 'local-terminal', 'powershell', 'cygwin',
        'ubuntu', 'wsl-distro', 'docker', 'ssh', 'sftp'
      ];
      if (sessionTypes.includes(type) || t.isExplorerInSSH) {
        return 'sesiones';
      }
      return null;
    };

    const section = getTabSection(targetTab);
    if (!section) return;

    const matchingTabs = allTabs.filter(t => getTabSection(t) === section);
    if (matchingTabs.length <= 1) return;

    const baseName = section === 'password' ? 'Contraseñas' : (section === 'biblioteca' ? 'Biblioteca' : 'Sesiones');
    let groupName = baseName;
    let counter = 1;
    while (tabGroups.some(g => g.name.toLowerCase() === groupName.toLowerCase())) {
      counter++;
      groupName = `${baseName} ${counter}`;
    }

    const colorToUse = getNextGroupColor();
    const newGroup = {
      id: `group_${Date.now()}`,
      name: groupName,
      color: colorToUse,
      createdAt: new Date().toISOString()
    };

    setTabGroups(prev => [...prev, newGroup]);

    const moveTabs = (prev) => prev.map(t =>
      getTabSection(t) === section ? { ...t, groupId: newGroup.id } : t
    );

    setHomeTabs(moveTabs);
    setSshTabs(moveTabs);
    setRdpTabs(moveTabs);
    setGuacamoleTabs(moveTabs);
    setFileExplorerTabs(moveTabs);

    if (toast && toast.current) {
      toast.current.show({
        severity: 'success',
        summary: 'Pestañas agrupadas',
        detail: `Se ha creado el grupo "${newGroup.name}" con ${matchingTabs.length} pestañas`,
        life: 3000
      });
    }
  }, [homeTabs, sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs, tabGroups, getNextGroupColor, toast]);

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

  // === FUNCIÓN DE CIERRE DE PESTAÑAS ===
  const handleTabClose = useCallback((closedTabOrKey, idx, isHomeTab) => {
    if (!closedTabOrKey) return;

    // Normalizar si se pasa solo la key (string)
    let closedTab = closedTabOrKey;
    if (typeof closedTabOrKey === 'string') {
      const allTabsList = [...sshTabs, ...homeTabs, ...rdpTabs, ...guacamoleTabs, ...fileExplorerTabs];
      closedTab = allTabsList.find(t => t.key === closedTabOrKey) || { key: closedTabOrKey, type: 'edit-connection' };
    }

    if (!closedTab || !closedTab.key) return;

    // Calcular idx si no se proporcionó
    let targetIdx = idx;
    if (targetIdx === undefined) {
      const currentTabs = getTabsInGroup ? getTabsInGroup(activeGroupId) : [];
      targetIdx = currentTabs.findIndex(t => t.key === closedTab.key);
      if (targetIdx === -1) targetIdx = activeTabIndex;
    }

    // Limpiar distro de la pestaña cerrada
    if (externalCleanupTabDistro) {
      externalCleanupTabDistro(closedTab.key);
    }

    const isSSHTab = closedTab.type === 'terminal' || closedTab.type === 'split' || closedTab.isExplorerInSSH;
    const isLocalTerminal = closedTab.type === 'local-terminal';
    const isAuditTab = closedTab.type === 'audit' || closedTab.type === 'recording-player' || closedTab.type === 'audit-global';
    const isAIChatTab = closedTab.type === 'anything-llm' || closedTab.type === 'librechat' || closedTab.type === 'openwebui' || closedTab.type === 'agentzero' || closedTab.type === 'openclaw' || closedTab.type === 'open-notebook';

    if (isHomeTab) {
      // Las pestañas de inicio NUNCA se pueden cerrar, independientemente del estado de bloqueo
      if (closedTab.label === 'Inicio') {
        // No permitir cerrar la pestaña de inicio nunca
        return;
      }

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
    } else if (isLocalTerminal) {
      // Manejar cierre de terminales locales
      if (window.electron && window.electron.ipcRenderer) {
        // Determinar qué comando de stop enviar según el tipo de terminal
        const terminalType = closedTab.terminalType || 'powershell';

        if (terminalType === 'powershell' || terminalType === 'linux-terminal') {
          window.electron.ipcRenderer.send(`powershell:stop:${closedTab.key}`);
        } else if (terminalType === 'wsl') {
          window.electron.ipcRenderer.send(`wsl:stop:${closedTab.key}`);
        } else if (terminalType.startsWith('wsl-')) {
          const distroName = terminalType.replace('wsl-', '');
          // Determinar el canal según la distribución
          if (distroName === 'ubuntu' || distroName === 'ubuntu-old') {
            window.electron.ipcRenderer.send(`ubuntu:stop:${closedTab.key}`);
          } else {
            window.electron.ipcRenderer.send(`wsl-distro:stop:${closedTab.key}`);
          }
        }
      }

      // Limpiar referencia del terminal si existe
      if (externalTerminalRefs?.current) {
        delete externalTerminalRefs.current[closedTab.key];
      }

      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else if (closedTab.type === 'ssh-tunnel') {
      // Manejar cierre de pestañas de túnel SSH
      // Nota: El componente SSHTunnelTab tiene un cleanup que detiene el túnel al desmontarse
      // Simplemente eliminamos la pestaña y el componente se encargará de detener el túnel
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else if (isSSHTab) {
      // Manejar cierre de pestañas split
      if (closedTab.type === 'split') {
        // Desconectar ambos terminales del split
        if (closedTab.leftTerminal && window.electron && window.electron.ipcRenderer) {
          // Detener grabación si está activa
          window.electron.ipcRenderer.invoke('recording:stop', { tabId: closedTab.leftTerminal.key })
            .then(result => {
              if (result?.success && result.recordingId) {
                console.log(`📹 Grabación detenida al cerrar split izquierdo: ${result.recordingId}`);
              }
            })
            .catch(error => {
              console.error('Error deteniendo grabación del split izquierdo:', error);
            });
          window.electron.ipcRenderer.send('ssh:disconnect', closedTab.leftTerminal.key);
          if (externalTerminalRefs?.current) {
            delete externalTerminalRefs.current[closedTab.leftTerminal.key];
          }
          if (externalCleanupTabDistro) {
            externalCleanupTabDistro(closedTab.leftTerminal.key);
          }
        }
        if (closedTab.rightTerminal && window.electron && window.electron.ipcRenderer) {
          // Detener grabación si está activa
          window.electron.ipcRenderer.invoke('recording:stop', { tabId: closedTab.rightTerminal.key })
            .then(result => {
              if (result?.success && result.recordingId) {
                console.log(`📹 Grabación detenida al cerrar split derecho: ${result.recordingId}`);
              }
            })
            .catch(error => {
              console.error('Error deteniendo grabación del split derecho:', error);
            });
          window.electron.ipcRenderer.send('ssh:disconnect', closedTab.rightTerminal.key);
          if (externalTerminalRefs?.current) {
            delete externalTerminalRefs.current[closedTab.rightTerminal.key];
          }
          if (externalCleanupTabDistro) {
            externalCleanupTabDistro(closedTab.rightTerminal.key);
          }
        }
      } else {
        // Solo enviar ssh:disconnect para pestañas de terminal o exploradores que tengan su propia conexión
        if (!closedTab.isExplorerInSSH && window.electron && window.electron.ipcRenderer) {
          // Terminal SSH - siempre desconectar
          // Detener grabación si está activa
          window.electron.ipcRenderer.invoke('recording:stop', { tabId: closedTab.key })
            .then(result => {
              if (result?.success && result.recordingId) {
                console.log(`📹 Grabación detenida al cerrar pestaña: ${result.recordingId}`);
              }
            })
            .catch(error => {
              console.error('Error deteniendo grabación al cerrar pestaña:', error);
            });
          window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
        } else if (closedTab.isExplorerInSSH && closedTab.needsOwnConnection && window.electron && window.electron.ipcRenderer) {
          // Explorador con conexión propia - desconectar
          window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
        }
        // Los exploradores que usan el pool NO necesitan desconectarse
        if (!closedTab.isExplorerInSSH && externalTerminalRefs?.current) {
          delete externalTerminalRefs.current[closedTab.key];
        }
      }

      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      // --- NUEVO: Si ya no quedan pestañas activas con este originalKey, marcar como disconnected ---
      const remainingTabs = newSshTabs.filter(t => t.originalKey === closedTab.originalKey);
      if (remainingTabs.length === 0 && setSshConnectionStatus) {
        setSshConnectionStatus(prev => {
          if (!closedTab.originalKey || !Object.prototype.hasOwnProperty.call(prev, closedTab.originalKey)) {
            return prev;
          }
          const updated = { ...prev };
          delete updated[closedTab.originalKey];
          return updated;
        });
      }
      setSshTabs(newSshTabs);
    } else if (closedTab.type === 'rdp') {
      // Manejar cierre de pestañas RDP
      // Opcional: desconectar la sesión RDP si es necesario
      if (window.electron && window.electron.ipcRenderer) {
        // Intentar desconectar la sesión RDP (evitar promesa rechazada no manejada)
        void window.electron.ipcRenderer
          .invoke('rdp:disconnect-session', closedTab.rdpConfig)
          .catch(() => {});
      }
      const newRdpTabs = rdpTabs.filter(t => t.key !== closedTab.key);
      setRdpTabs(newRdpTabs);
    } else if (closedTab.type === 'rdp-guacamole' || closedTab.type === 'vnc-guacamole') {
      // Cerrar pestañas RDP-Guacamole o VNC-Guacamole
      try {
        if (externalTerminalRefs?.current) {
          const ref = externalTerminalRefs.current[closedTab.key];
          if (ref && typeof ref.disconnect === 'function') {
            ref.disconnect();
          }
        }
      } catch { }
      // No usar disconnectAll aquí para evitar cerrar conexiones nuevas en carrera
      // Eliminar pestaña del estado
      const newRdpTabs = rdpTabs.filter(t => t.key !== closedTab.key);
      setRdpTabs(newRdpTabs);
      // Limpiar ref
      if (externalTerminalRefs?.current) {
        delete externalTerminalRefs.current[closedTab.key];
      }
    } else if (closedTab.type === 'guacamole') {
      // Cerrar pestañas Guacamole
      const newGuacamoleTabs = guacamoleTabs.filter(t => t.key !== closedTab.key);
      setGuacamoleTabs(newGuacamoleTabs);
    } else if (closedTab.type === 'password') {
      // Cerrar pestañas de información de contraseñas (almacenadas en sshTabs)
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else if (closedTab.type === 'password-folder') {
      // Cerrar pestañas de carpetas de contraseñas (almacenadas en sshTabs)
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else if (closedTab.type === 'document' || closedTab.type === 'library-file') {
      // Cerrar pestañas de la biblioteca: notas y archivos (almacenadas en sshTabs)
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else if (closedTab.type === 'network-tool') {
      // Cerrar pestañas de herramientas de red (almacenadas en sshTabs)
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else if (closedTab.type === 'settings') {
      // Cerrar pestaña de configuración (almacenada en sshTabs)
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else if (closedTab.type === 'edit-connection') {
      // Cerrar pestaña de edición de conexión (almacenada en sshTabs)
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else if (isAuditTab) {
      // Cerrar pestañas de auditoría y reproductor de grabaciones (almacenadas en sshTabs)
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else if (isAIChatTab) {
      // Cerrar pestañas de chat de IA (almacenadas en sshTabs)
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else if (closedTab.type === 'docker') {
      // Cerrar pestañas de Docker
      if (window.electron && window.electron.ipcRenderer) {
        // Detener el proceso Docker
        window.electron.ipcRenderer.send(`docker:stop:${closedTab.key}`);
      }
      // Limpiar referencia del terminal si existe
      if (externalTerminalRefs?.current) {
        delete externalTerminalRefs.current[closedTab.key];
      }
      // Eliminar la pestaña de sshTabs
      const newSshTabs = sshTabs.filter(t => t.key !== closedTab.key);
      setSshTabs(newSshTabs);
    } else {
      if (closedTab.needsOwnConnection && window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send('ssh:disconnect', closedTab.key);
      }
      const newExplorerTabs = fileExplorerTabs.filter(t => t.key !== closedTab.key);
      setFileExplorerTabs(newExplorerTabs);
    }

    // Una sesión embebida en Home no está en la barra: cerrarla no debe mover la pestaña activa
    if (closedTab.embedInHome) {
      return;
    }

    // Ajustar índice activo
    if (activeTabIndex === targetIdx) {
      const newIndex = Math.max(0, targetIdx - 1);
      setActiveTabIndex(newIndex);
      // Solo actualizar el índice guardado si el grupo actual tiene pestañas después del cierre
      const currentGroupKey = activeGroupId || GROUP_KEYS?.DEFAULT;
      const remainingTabs = getTabsInGroup(activeGroupId);

      if (remainingTabs.length > 1) { // > 1 porque la pestaña aún no se ha eliminado completamente
        setGroupActiveIndices(prev => ({
          ...prev,
          [currentGroupKey]: newIndex
        }));
      }
    } else if (activeTabIndex > targetIdx) {
      const newIndex = activeTabIndex - 1;
      setActiveTabIndex(newIndex);
      // Solo actualizar el índice guardado si el grupo actual tiene pestañas después del cierre
      const currentGroupKey = activeGroupId || GROUP_KEYS?.DEFAULT;
      const remainingTabs = getTabsInGroup(activeGroupId);

      if (remainingTabs.length > 1) { // > 1 porque la pestaña aún no se ha eliminado completamente
        setGroupActiveIndices(prev => ({
          ...prev,
          [currentGroupKey]: newIndex
        }));
      }
    }
  }, [homeTabs, sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs, activeTabIndex, activeGroupId, getTabsInGroup, externalCleanupTabDistro, setSshConnectionStatus, externalTerminalRefs, GROUP_KEYS]);

  // Función para actualizar openTabOrder basado en la configuración de bloqueo
  const updateOpenTabOrderForHomeButton = useCallback(() => {
    const isHomeButtonLocked = readHomeButtonLocked();

    if (!isHomeButtonLocked) {
      // Si no está bloqueado, incluir las pestañas de inicio en openTabOrder para permitir reordenamiento
      const homeKeys = homeTabs.map(t => t.key);
      setOpenTabOrder(prev => {
        const withoutHome = prev.filter(k => !homeKeys.includes(k));
        return [...homeKeys, ...withoutHome];
      });
    } else {
      // Si está bloqueado, remover las pestañas de inicio de openTabOrder
      const homeKeys = homeTabs.map(t => t.key);
      setOpenTabOrder(prev => prev.filter(k => !homeKeys.includes(k)));
    }
  }, [homeTabs, setOpenTabOrder]);

  const handleToggleBroadcast = useCallback((tabKey) => {
    const toggleInArray = (arr, setArr) => {
      let found = false;
      const newArr = arr.map(tab => {
        if (tab.key === tabKey) {
          found = true;
          return toggleBroadcastGroup(tab);
        }
        return tab;
      });
      if (found) setArr(newArr);
      return found;
    };

    if (toggleInArray(sshTabs, setSshTabs)) return;
    if (toggleInArray(rdpTabs, setRdpTabs)) return;
    if (toggleInArray(guacamoleTabs, setGuacamoleTabs)) return;
    if (toggleInArray(fileExplorerTabs, setFileExplorerTabs)) return;
    toggleInArray(homeTabs, setHomeTabs);
  }, [sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs, homeTabs]);

  const handleToggleBroadcastTarget = useCallback((tabKey, targetId) => {
    const toggleInArray = (arr, setArr) => {
      let found = false;
      const newArr = arr.map(tab => {
        if (tab.key === tabKey) {
          found = true;
          return toggleBroadcastTarget(tab, targetId);
        }
        return tab;
      });
      if (found) setArr(newArr);
      return found;
    };

    if (toggleInArray(sshTabs, setSshTabs)) return;
    if (toggleInArray(rdpTabs, setRdpTabs)) return;
    if (toggleInArray(guacamoleTabs, setGuacamoleTabs)) return;
    if (toggleInArray(fileExplorerTabs, setFileExplorerTabs)) return;
    toggleInArray(homeTabs, setHomeTabs);
  }, [sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs, homeTabs]);

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
    groupTabsBySection,
    cleanupTabDistro,
    handleTabContextMenu,
    handleTabClose,
    updateOpenTabOrderForHomeButton,
    handleToggleBroadcast,
    handleToggleBroadcastTarget
  };
};
