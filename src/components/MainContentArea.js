import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import { ContextMenu } from 'primereact/contextmenu';
import { Button } from 'primereact/button';
import {
  FaWindows,
  FaUbuntu,
  FaLinux,
  FaRedhat,
  FaCentos,
  FaFedora,
  FaBrain,
  FaSearch
} from 'react-icons/fa';
import { SiAnthropic, SiDebian, SiDocker, SiGooglegemini, SiOpenai } from 'react-icons/si';
import AIClientBrandIcon from './AIClientBrandIcon';
import Sidebar from './Sidebar';
import TerminalFrame from './TerminalFrame';
import ConnectionSearchBar from './ConnectionSearchBar';
import TabHeader from './TabHeader';
import TabContentRenderer from './TabContentRenderer';
import TabContextMenu from './contextmenus/TabContextMenu';
import TerminalContextMenu from './contextmenus/TerminalContextMenu';
import OverflowMenu from './contextmenus/OverflowMenu';
import SSHSystemMonitorPanel from './SSHSystemMonitorPanel';
import SSHFileExplorerPanel from './SSHFileExplorerPanel';
import { TAB_TYPES } from '../utils/constants';
import { isHomeButtonLocked as readHomeButtonLocked } from '../utils/homeTabDefaults';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';
import { presetManager } from '../utils/presetManager';
import { applyTabTheme, getTabThemeList, applyTabLayout, getTabLayoutList, loadSavedTabLayout } from '../utils/tabThemeLoader';

const TAB_THEME_STORAGE_KEY = 'nodeterm_tab_theme';
const TAB_LAYOUT_STORAGE_KEY = 'nodeterm_tab_layout';

const MainContentArea = ({
  // Sidebar props
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarVisible,
  handleResize,
  handleResizeThrottled,
  memoizedSidebarProps,

  // Tab management props
  homeTabs,
  sshTabs,
  setSshTabs,
  fileExplorerTabs,
  rdpTabs,
  guacamoleTabs,
  activeGroupId,
  setActiveGroupId,
  getTabsInGroup,
  activeTabIndex,
  setActiveTabIndex,
  activatingNowRef,
  setGroupActiveIndices,
  setLastOpenedTabKey,
  setOnCreateActivateTabKey,
  setOpenTabOrder,
  GROUP_KEYS,

  // Tab rendering props
  renderGroupTabs,
  filteredTabs,

  // Tab header props
  memoizedTabProps,
  tabHandlers,
  dragOverTabIndex,

  // Content renderer props
  memoizedContentRendererProps,
  settingsTabProps,
  sshStatsByTabId,
  openInSplit,

  // Context menu props
  tabContextMenu,
  setTabContextMenu,
  terminalContextMenu,
  setTerminalContextMenu,
  showOverflowMenu,
  setShowOverflowMenu,
  overflowMenuPosition,
  overflowMenuItems,

  // Tab context menu props
  tabGroups,
  moveTabToGroup,
  setShowCreateGroupDialog,
  isGroupFavorite,
  addGroupToFavorites,
  removeGroupFromFavorites,
  deleteGroup,
  toast,
  handleToggleBroadcast,
  handleToggleBroadcastTarget,
  getAllTabs,

  // Selected node props
  selectedNodeKey,

  // Terminal handlers
  handleCopyFromTerminalWrapper,
  handlePasteToTerminalWrapper,
  handleSelectAllTerminalWrapper,
  handleClearTerminalWrapper,

  // Recording handlers
  handleStartRecording,
  handleStopRecording,
  isRecordingTab,
  recordingTabs,

  // Theme props
  isHomeTabActive,
  localTerminalBg,

  // Tree context menu
  isGeneralTreeMenu,
  getGeneralTreeContextMenuItems,
  getTreeContextMenuItems,
  selectedNode,
  treeContextMenuRef,

  // Active sessions info
  activeIds,

  // Global connection search
  sidebarFilter,
  setSidebarFilter,
  allNodes,
  findAllConnections,
  onOpenSSHConnection,
  onOpenRdpConnection,
  onOpenVncConnection,
  openEditSSHDialog,
  openEditRdpDialog,
  expandedKeys,
  masterKey,
  secureStorage,
  iconTheme,

  // TitleBar state
  titleBarCollapsed,

  // Frame header state
  mainFrameHeaderCollapsed,
  setMainFrameHeaderCollapsed,

  // Minimal mode
  isMinimalMode
}) => {
  // Estados para las flechas de navegación de pestañas
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsContainerRef = useRef(null);
  const titleBarCollapsedRef = useRef(titleBarCollapsed);
  const mainFrameHeaderCollapsedRef = useRef(mainFrameHeaderCollapsed);
  const isMinimalModeRef = useRef(isMinimalMode);
  const [frameSearchOpen, setFrameSearchOpen] = useState(false);

  titleBarCollapsedRef.current = titleBarCollapsed;
  mainFrameHeaderCollapsedRef.current = mainFrameHeaderCollapsed;
  isMinimalModeRef.current = isMinimalMode;

  const handleFrameSearchClose = useCallback(() => {
    setFrameSearchOpen(false);
    setSidebarFilter('');
  }, [setSidebarFilter]);

  // Estado para el panel SSH System Monitor
  const [sshSystemMonitorTabId, setSshSystemMonitorTabId] = useState(null);

  // Estado para el panel SSH File Explorer
  const [sshFileExplorerTabId, setSshFileExplorerTabId] = useState(null);

  // Función para obtener el terminal por defecto desde configuración
  const getDefaultTerminalFromConfig = () => {
    const saved = localStorage.getItem('nodeterm_default_local_terminal');
    if (saved) return saved;

    // Fallback según plataforma
    const platform = window.electron?.platform || 'unknown';
    if (platform === 'linux' || platform === 'darwin') {
      return 'linux-terminal';
    }
    return 'powershell';
  };

  // Estado para recordar último tipo de terminal local
  const [lastLocalTerminalType, setLastLocalTerminalType] = useState(() => getDefaultTerminalFromConfig());
  // Referencia para mantener el último tipo usado de forma síncrona
  const lastLocalTerminalTypeRef = useRef(getDefaultTerminalFromConfig());

  // Función para detectar el último tipo de terminal local usado
  const getLastLocalTerminalType = () => {
    // Usar el estado actual de sshTabs en lugar de getTabsInGroup para evitar problemas de sincronización
    const allTabs = [...homeTabs, ...sshTabs, ...fileExplorerTabs];

    // Buscar la última pestaña de terminal local (tipo 'local-terminal')
    const localTerminalTabs = allTabs.filter(tab => tab.type === 'local-terminal');

    if (localTerminalTabs.length > 0) {
      // Ordenar por fecha de creación y tomar la más reciente
      const lastLocalTab = localTerminalTabs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

      if (lastLocalTab.terminalType === 'ubuntu' || lastLocalTab.terminalType === 'wsl-distro') {
        // Si tiene información de distribución específica, usar esa distribución
        if (lastLocalTab.distroInfo && lastLocalTab.distroInfo.name) {
          return `wsl-${lastLocalTab.distroInfo.name}`;
        }
        return 'wsl'; // Fallback a WSL genérico
      }
      return lastLocalTab.terminalType || 'powershell';
    }

    // Si no hay terminales locales, usar el último tipo guardado
    return lastLocalTerminalType;
  };

  const handleOpenUiThemePickerFromHeader = useCallback((event) => {
    try {
      const customEvent = new CustomEvent('open-ui-theme-picker', {
        detail: { originEvent: event }
      });
      window.dispatchEvent(customEvent);
    } catch (err) {
      console.warn('[MainContentArea] Error dispatching open-ui-theme-picker:', err);
    }
  }, []);

  // Ref y estado para el menú contextual de selección de terminal
  const terminalSelectorMenuRef = useRef(null);

  // Estado para las opciones del menú de terminales
  const [terminalMenuItems, setTerminalMenuItems] = useState([]);
  const dispatchAnythingLLMTab = useCallback(() => {
    const tabId = `anythingllm-${Date.now()}`;
    const newTab = {
      key: tabId,
      label: 'AnythingLLM',
      type: 'anything-llm',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-anythingllm-tab', {
      detail: { tab: newTab }
    }));
  }, []);

  const dispatchOpenWebUITab = useCallback(() => {
    const tabId = `openwebui-${Date.now()}`;
    const newTab = {
      key: tabId,
      label: 'Open WebUI',
      type: 'openwebui',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-openwebui-tab', {
      detail: { tab: newTab }
    }));
  }, []);

  const dispatchLibreChatTab = useCallback(() => {
    const tabId = `librechat-${Date.now()}`;
    const newTab = {
      key: tabId,
      label: 'LibreChat',
      type: 'librechat',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-librechat-tab', {
      detail: { tab: newTab }
    }));
  }, []);

  const dispatchAgentZeroTab = useCallback(() => {
    const tabId = `agentzero-${Date.now()}`;
    const newTab = {
      key: tabId,
      label: 'Agent Zero',
      type: 'agentzero',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-agentzero-tab', {
      detail: { tab: newTab }
    }));
  }, []);

  const dispatchOpenClawTab = useCallback(() => {
    const tabId = `openclaw-${Date.now()}`;
    const newTab = {
      key: tabId,
      label: 'OpenClaw',
      type: 'openclaw',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-openclaw-tab', {
      detail: { tab: newTab }
    }));
  }, []);

  const dispatchOpenNotebookTab = useCallback(() => {
    const tabId = `opennotebook-${Date.now()}`;
    const newTab = {
      key: tabId,
      label: 'Open Notebook',
      type: 'open-notebook',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-opennotebook-tab', {
      detail: { tab: newTab }
    }));
  }, []);

  // Manejador para abrir el explorador desde el botón de la sidebar
  const handleSidebarOpenFileExplorer = useCallback(() => {
    // 1. Intentar con la pestaña activa si es SSH
    const activeTab = filteredTabs[activeTabIndex];
    if (activeTab && (activeTab.type === 'terminal' || activeTab.type === 'split' || activeTab.type === TAB_TYPES.TERMINAL || activeTab.type === TAB_TYPES.SPLIT)) {
      setSshFileExplorerTabId(activeTab.key);
      return;
    }

    // 2. Si no, buscar la primera pestaña SSH disponible
    const firstSshTab = sshTabs.find(t => t.type === 'terminal' || t.type === 'split' || t.type === TAB_TYPES.TERMINAL || t.type === TAB_TYPES.SPLIT);
    if (firstSshTab) {
      // Encontrar su índice en las pestañas filtradas (considerando grupos)
      const idx = filteredTabs.findIndex(t => t.key === firstSshTab.key);
      if (idx !== -1) {
        setActiveTabIndex(idx);
        setSshFileExplorerTabId(firstSshTab.key);
      }
    }
  }, [filteredTabs, activeTabIndex, sshTabs, setActiveTabIndex, setSshFileExplorerTabId]);

  // Contador para IDs de terminales locales - iniciar desde 1000 para evitar colisiones con Home
  const localTerminalCounterRef = useRef(1000);

  // Referencia para createLocalTerminalTab (se actualizará después de su definición)
  const createLocalTerminalTabRef = useRef(null);

  // Estado para distribuciones WSL disponibles
  const [wslDistributions, setWslDistributions] = useState([]);
  const wslDistributionsRef = useRef([]);

  // Estado para contenedores Docker disponibles
  const [dockerContainers, setDockerContainers] = useState([]);

  // Estado para forzar re-render cuando cambie lock_home_button
  const [homeButtonLocked, setHomeButtonLocked] = useState(readHomeButtonLocked);

  // 🚀 OPTIMIZACIÓN: Detectar contenedores Docker DIFERIDO
  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(() => {
      const detectDocker = async () => {
        try {
          if (window.electron && window.electronAPI && mounted) {
            const result = await window.electronAPI.invoke('docker:list');
            if (mounted && result && result.success && Array.isArray(result.containers)) {
              setDockerContainers(result.containers);
            } else {
              setDockerContainers([]);
            }
          }
        } catch (error) {
          // Docker no disponible - silencioso
          setDockerContainers([]);
        }
      };
      detectDocker();
    }, 800); // Diferir 800ms

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Mantener ref de distros WSL actualizada para usar en callbacks
  useEffect(() => {
    wslDistributionsRef.current = wslDistributions;
  }, [wslDistributions]);

  // Escuchar cambios en el localStorage para lock_home_button
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'lock_home_button') {
        setHomeButtonLocked(readHomeButtonLocked());
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(() => {
      const currentValue = readHomeButtonLocked();
      if (currentValue !== homeButtonLocked) {
        setHomeButtonLocked(currentValue);
      }
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [homeButtonLocked]);

  // Escuchar eventos para crear terminales desde QuickAccessSidebar
  useEffect(() => {
    const handleCreateLocalTerminal = (event) => {
      const { terminalType, distroInfo } = event.detail;

      // Los CLIs de IA se abren siempre en pestañas globales, no en el HomeTab
      const isAIClient = ['opencode', 'geminicli', 'codexcli', 'antigravitycli', 'claude'].includes(terminalType);
      if (isAIClient) {
        createLocalTerminalTab(terminalType, distroInfo);
        return;
      }

      // El resto de terminales locales (PowerShell, WSL, Docker) fuerzan apertura en el terminal integrado del HomeTab
      try {
        if (activeGroupId !== null) {
          const currentGroupKey = activeGroupId || 'no-group';
          setGroupActiveIndices(prev => ({
            ...prev,
            [currentGroupKey]: activeTabIndex
          }));
          setActiveGroupId(null);
        }

        const baseTabs = getTabsInGroup ? getTabsInGroup(null) : [];
        const homeIndex = baseTabs.findIndex(tab => tab?.type === TAB_TYPES.HOME || tab?.key === 'home_tab_default');
        setActiveTabIndex(homeIndex >= 0 ? homeIndex : 0);

        // Esperar al render del HomeTab para que su listener esté activo
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('home-tab-add-terminal', {
            detail: { terminalType, distroInfo }
          }));
        }, 120);
      } catch (error) {
        console.warn('No se pudo abrir terminal en HomeTab integrado, fallback a pestaña global:', error);
        createLocalTerminalTab(terminalType, distroInfo);
      }
    };

    window.addEventListener('create-local-terminal', handleCreateLocalTerminal);

    return () => {
      window.removeEventListener('create-local-terminal', handleCreateLocalTerminal);
    };
  }, [activeGroupId, activeTabIndex, getTabsInGroup, setActiveGroupId, setGroupActiveIndices, setActiveTabIndex, createLocalTerminalTab]);

  // Escuchar cambios en la configuración de terminal por defecto
  useEffect(() => {
    const handleDefaultTerminalChange = (e) => {
      const newDefaultTerminal = e.detail?.terminalType;
      if (newDefaultTerminal) {
        // Si no hay un último tipo usado, actualizar con el nuevo por defecto
        if (!lastLocalTerminalTypeRef.current || lastLocalTerminalTypeRef.current === getDefaultTerminalFromConfig()) {
          lastLocalTerminalTypeRef.current = newDefaultTerminal;
          setLastLocalTerminalType(newDefaultTerminal);
        }
      }
    };

    window.addEventListener('default-terminal-changed', handleDefaultTerminalChange);
    return () => {
      window.removeEventListener('default-terminal-changed', handleDefaultTerminalChange);
    };
  }, []);

  useEffect(() => {
    loadSavedTabLayout();
  }, []);


  // Estado para controlar la visibilidad de las opciones de clientes de IA
  const [aiClientsEnabled, setAiClientsEnabled] = React.useState({
    claude: false,
    opencode: false,
    geminicli: false,
    codexcli: false,
    antigravitycli: false,
    anythingllm: false,
    openwebui: false,
    librechat: false,
    agentzero: false,
    openclaw: false,
    opennotebook: false
  });
  const aiPrewarmInFlightRef = useRef({
    anythingllm: false,
    openwebui: false,
    librechat: false,
    agentzero: false,
    openclaw: false
  });

  const defaultAiClientsEnabled = React.useMemo(() => ({
    claude: false,
    opencode: false,
    geminicli: false,
    codexcli: false,
    antigravitycli: false,
    anythingllm: false,
    openwebui: false,
    librechat: false,
    agentzero: false,
    openclaw: false,
    opennotebook: false
  }), []);

  // Cargar configuración de clientes de IA desde localStorage - Moved to useCallback for stability
  const loadAIClientsConfig = React.useCallback(() => {
    try {
      const config = localStorage.getItem('ai_clients_enabled');
      if (!config) {
        setAiClientsEnabled(defaultAiClientsEnabled);
        return;
      }
      const parsed = JSON.parse(config);
      const normalized = Object.keys(defaultAiClientsEnabled).reduce((acc, key) => {
        acc[key] = parsed?.[key] === true;
        return acc;
      }, {});
      setAiClientsEnabled(normalized);
    } catch (error) {
      console.error('[MainContentArea] Error al cargar configuración de clientes IA:', error);
      setAiClientsEnabled(defaultAiClientsEnabled);
    }
  }, [defaultAiClientsEnabled]);

  // Mantener ref sincronizada para el launcher grid
  const terminalMenuItemsRef = React.useRef([]);
  React.useEffect(() => {
    terminalMenuItemsRef.current = terminalMenuItems;
  }, [terminalMenuItems]);

  React.useEffect(() => {
    // Cargar al montar
    loadAIClientsConfig();

    // Escuchar cambios
    const handleConfigChange = () => {
      loadAIClientsConfig();
    };
    window.addEventListener('ai-clients-config-changed', handleConfigChange);
    
    const handleSettingsUpdated = () => {
      loadAIClientsConfig();
    };
    window.addEventListener('settings-updated', handleSettingsUpdated);
    
    // Escuchar cambios de storage (otro window/proceso si comparten DB)
    const handleStorageChange = (e) => {
      if (e.key === 'ai_clients_enabled') {
        loadAIClientsConfig();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('ai-clients-config-changed', handleConfigChange);
      window.removeEventListener('settings-updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadAIClientsConfig]);

  // Precalentamiento en segundo plano: reduce el "cold start" al abrir las pestañas.
  React.useEffect(() => {
    const prewarmServiceIfNeeded = async (serviceKey, options = {}) => {
      if (!window.electron?.ipcRenderer) return;
      if (aiPrewarmInFlightRef.current[serviceKey]) return;

      const {
        enabled = aiClientsEnabled[serviceKey] === true,
        getStatusChannel = `${serviceKey}:get-status`,
        startChannel = `${serviceKey}:start`,
        isRunning = (statusRes) => Boolean(statusRes?.success && statusRes?.status?.isRunning)
      } = options;

      if (!enabled) return;

      aiPrewarmInFlightRef.current[serviceKey] = true;
      try {
        const statusRes = await window.electron.ipcRenderer.invoke(getStatusChannel);
        const alreadyRunning = isRunning(statusRes);
        if (!alreadyRunning && startChannel) {
          await window.electron.ipcRenderer.invoke(startChannel);
        }
      } catch (error) {
        console.warn(`[AI Prewarm] No se pudo precalentar ${serviceKey}:`, error?.message || error);
      } finally {
        aiPrewarmInFlightRef.current[serviceKey] = false;
      }
    };

    prewarmServiceIfNeeded('anythingllm');
    prewarmServiceIfNeeded('openwebui');
    prewarmServiceIfNeeded('librechat');
    prewarmServiceIfNeeded('agentzero');
    prewarmServiceIfNeeded('openclaw');
  }, [
    aiClientsEnabled.anythingllm,
    aiClientsEnabled.openwebui,
    aiClientsEnabled.librechat,
    aiClientsEnabled.agentzero,
    aiClientsEnabled.openclaw
  ]);

  // Generar opciones del menú de terminales
  useEffect(() => {
    // Obtener el color primario del tema actual
    const currentTheme = themeManager.getCurrentTheme() || uiThemes['Light'];
    const primaryColor = currentTheme.colors?.buttonPrimary || currentTheme.colors?.primaryColor || '#2196f3';

    // Función para obtener colores según la categoría
    const getColorForCategory = (category) => {
      const colorMap = {
        'ubuntu': '#E95420',
        'debian': '#A81D33',
        'kali': '#557C94',
        'alpine': '#0D597F',
        'opensuse': '#73BA25',
        'fedora': '#294172',
        'centos': '#262577',
        'redhat': '#EE0000',
        'default': '#8ae234'
      };
      return colorMap[category] || colorMap.default;
    };

    // Función para obtener el icono correcto según el tipo de terminal (igual que en TabHeader)
    const getTerminalMenuIcon = (terminalType, distroInfo = null, label = '') => {
      const baseIconSize = 14; // Tamaño para el menú
      const iconMarginRight = '10px'; // Espacio entre icono y texto
      const category = distroInfo?.category || '';
      const lowerLabel = label.toLowerCase();

      // PowerShell
      if (terminalType === 'powershell') {
        return <FaWindows style={{ fontSize: `${baseIconSize}px`, color: '#0078D4', marginRight: iconMarginRight }} />;
      }

      // Claude Code
      if (terminalType === 'claude') {
        return <SiAnthropic style={{ fontSize: `${baseIconSize}px`, color: '#D97706', marginRight: iconMarginRight }} />;
      }

      // OpenCode
      if (terminalType === 'opencode') {
        return <AIClientBrandIcon tabType="opencode" size={baseIconSize + 4} style={{ marginRight: iconMarginRight }} />;
      }

      // Gemini CLI
      if (terminalType === 'geminicli') {
        return <SiGooglegemini style={{ fontSize: `${baseIconSize}px`, color: '#8E75B2', marginRight: iconMarginRight }} />;
      }

      // Codex CLI
      if (terminalType === 'codexcli') {
        return <SiOpenai style={{ fontSize: `${baseIconSize}px`, color: '#10A37F', marginRight: iconMarginRight }} />;
      }

      // Antigravity CLI
      if (terminalType === 'antigravitycli') {
        return <AIClientBrandIcon tabType="antigravitycli" size={baseIconSize + 4} style={{ marginRight: iconMarginRight }} />;
      }

      // WSL genérico (sin distribución específica)
      if (terminalType === 'wsl' && !distroInfo) {
        return <FaLinux style={{ fontSize: `${baseIconSize}px`, color: primaryColor, marginRight: iconMarginRight }} />;
      }

      // Ubuntu (por categoría, terminalType o nombre)
      if (category === 'ubuntu' || terminalType === 'ubuntu' || lowerLabel.includes('ubuntu') || (terminalType.includes('ubuntu') && !terminalType.includes('kubuntu'))) {
        const isBasicUbuntu = !lowerLabel.includes('24.04') && !lowerLabel.includes('22.04') && !lowerLabel.includes('20.04');
        const ubuntuColor = isBasicUbuntu ? '#FFFFFF' : (distroInfo?.color || getColorForCategory('ubuntu'));
        return <FaUbuntu style={{ fontSize: `${baseIconSize}px`, color: ubuntuColor, marginRight: iconMarginRight }} />;
      }

      // Debian
      if (category === 'debian' || lowerLabel.includes('debian') || terminalType.includes('debian')) {
        return <SiDebian style={{ fontSize: `${baseIconSize}px`, color: distroInfo?.color || getColorForCategory('debian'), marginRight: iconMarginRight }} />;
      }

      // Kali Linux
      if (category === 'kali' || lowerLabel.includes('kali') || terminalType.includes('kali')) {
        const kaliColor = distroInfo?.color || getColorForCategory('kali');
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={baseIconSize}
            height={baseIconSize}
            viewBox="0 0 48 48"
            style={{
              display: 'inline-block',
              verticalAlign: 'middle',
              flexShrink: 0,
              marginRight: iconMarginRight
            }}
          >
            <path fill={kaliColor} d="M46.125,38.868c-0.192-0.815-0.481-1.618-0.919-2.346c-0.871-1.466-2.199-2.585-3.594-3.489 c-1.409-0.901-2.916-1.624-4.458-2.219c-2.953-1.141-2.81-1.103-4.803-1.814c-4.416-1.574-6.868-3.914-7.022-6.452 c-0.074-1.229,1.126-5.234,6.074-4.282c1.175,0.226,2.287,0.543,3.382,1.037c1.009,0.456,3.954,1.884,4.986,3.917v0 c0.078,0.897,0.394,1.244,1.656,1.84c0.949,0.448,1.907,0.935,1.993,2.039c0.005,0.06,0.051,0.109,0.131,0.121 c0.052,0,0.1-0.031,0.121-0.081c0.182-0.439,0.915-0.989,1.461-0.839c0.063,0.016,0.119-0.009,0.148-0.061 c0.03-0.052,0.02-0.116-0.021-0.158l-0.863-0.854c-0.311-0.31-0.651-0.721-0.939-1.249c-0.078-0.142-0.145-0.282-0.204-0.417 c-0.038-0.094-0.076-0.187-0.114-0.281c-0.724-1.895-2.073-3.925-3.465-5.24c-0.756-0.727-1.588-1.367-2.475-1.913 c-0.891-0.538-1.819-1.016-2.833-1.302l-0.074,0.256c0.947,0.327,1.833,0.849,2.662,1.419c0.828,0.579,1.593,1.243,2.273,1.979 c0.971,1.032,1.736,2.23,2.282,3.512l-1.993-2.477l0.055,0.858l-1.633-1.841l0.101,0.862l-1.586-1.279l0.136,0.584 c-0.357-0.236-3.525-1.496-5.106-2.09s-4.705-3.524-3.804-7.232c0,0-1.477-0.574-2.535-0.965c-1.043-0.376-2.09-0.717-3.14-1.046 c-2.1-0.658-4.212-1.258-6.335-1.818c-2.123-0.557-4.26-1.062-6.409-1.508c-2.15-0.441-4.312-0.834-6.5-1.053L2.722,3.319 C4.875,3.65,7,4.152,9.109,4.701c2.108,0.555,4.202,1.166,6.279,1.829c2.076,0.665,4.139,1.37,6.177,2.128 c1.018,0.379,2.033,0.769,3.027,1.188c0.211,0.088,0.426,0.18,0.641,0.272c-1.224-0.241-2.448-0.432-3.673-0.591 c-2.211-0.281-4.424-0.458-6.639-0.558c-2.214-0.1-4.43-0.116-6.642-0.034C6.068,9.021,3.856,9.194,1.674,9.568l0.043,0.304 c2.18-0.224,4.375-0.246,6.563-0.183c2.189,0.067,4.374,0.231,6.547,0.477c2.172,0.246,4.335,0.567,6.469,0.986 c1.316,0.261,2.624,0.564,3.903,0.921c-1.011-0.101-2.017-0.127-3.014-0.115c-1.977,0.03-3.926,0.247-5.848,0.574 c-1.922,0.33-3.818,0.773-5.675,1.346c-1.851,0.579-3.681,1.267-5.361,2.249l0.116,0.208c1.72-0.828,3.568-1.358,5.426-1.779 c1.862-0.414,3.751-0.698,5.644-0.868c1.891-0.168,3.792-0.224,5.663-0.101c1.664,0.11,3.317,0.363,4.83,0.849c0,0,0,0,0,0 c0.065,0.445,0.366,1.346,0.511,1.796c0,0,0,0,0,0c-4.255,1.957-4.794,5.477-4.446,7.365c0.409,2.214,2.011,3.902,3.904,4.995 c1.567,0.891,3.168,1.459,4.726,2.047c1.555,0.583,3.095,1.143,4.467,1.918c1.352,0.747,2.476,1.901,3.391,3.21 c1.837,2.638,2.572,5.964,2.792,9.245l0.365-0.01c0.008-3.323-0.47-6.802-2.252-9.812c-0.588-0.986-1.314-1.921-2.171-2.733 c0.992,0.384,1.961,0.818,2.887,1.333c1.373,0.779,2.667,1.749,3.548,3.051c0.444,0.647,0.755,1.375,0.983,2.133 c0.202,0.767,0.295,1.565,0.329,2.371h0.312C46.337,40.522,46.291,39.69,46.125,38.868z"></path>
          </svg>
        );
      }

      // Alpine, openSUSE - usar FaLinux
      if (category === 'alpine' || category === 'opensuse' || lowerLabel.includes('alpine') || lowerLabel.includes('opensuse') || lowerLabel.includes('suse')) {
        return <FaLinux style={{ fontSize: `${baseIconSize}px`, color: distroInfo?.color || getColorForCategory(category), marginRight: iconMarginRight }} />;
      }

      // Fedora
      if (category === 'fedora' || lowerLabel.includes('fedora')) {
        return <FaFedora style={{ fontSize: `${baseIconSize}px`, color: distroInfo?.color || getColorForCategory('fedora'), marginRight: iconMarginRight }} />;
      }

      // CentOS
      if (category === 'centos' || lowerLabel.includes('centos')) {
        return <FaCentos style={{ fontSize: `${baseIconSize}px`, color: distroInfo?.color || getColorForCategory('centos'), marginRight: iconMarginRight }} />;
      }

      // RedHat
      if (category === 'redhat' || category === 'rhel' || lowerLabel.includes('redhat') || lowerLabel.includes('rhel')) {
        return <FaRedhat style={{ fontSize: `${baseIconSize}px`, color: distroInfo?.color || getColorForCategory('redhat'), marginRight: iconMarginRight }} />;
      }

      // Cygwin
      if (terminalType === 'cygwin' || lowerLabel.includes('cygwin')) {
        return <i className="pi pi-code" style={{ fontSize: `${baseIconSize}px`, color: '#00FF00', fontWeight: 'bold', marginRight: iconMarginRight }}></i>;
      }

      // Docker
      if (terminalType === 'docker' || lowerLabel.includes('docker')) {
        return <SiDocker style={{ fontSize: `${baseIconSize}px`, color: '#0db7ed', marginRight: iconMarginRight }} />;
      }

      // Linux terminal genérico
      if (terminalType === 'linux-terminal') {
        return <FaLinux style={{ fontSize: `${baseIconSize}px`, color: '#4fc3f7', marginRight: iconMarginRight }} />;
      }

      // WSL con distribución específica (wsl-*)
      if (terminalType?.startsWith('wsl-')) {
        return <FaLinux style={{ fontSize: `${baseIconSize}px`, color: primaryColor, marginRight: iconMarginRight }} />;
      }

      // Fallback: icono genérico
      return <i className="pi pi-desktop" style={{ fontSize: `${baseIconSize}px`, color: '#4fc3f7', marginRight: iconMarginRight }}></i>;
    };

    const platform = window.electron?.platform || 'unknown';

    const pushProfileGroup = (out, label, iconClass, items) => {
      if (!items || items.length === 0) return;
      out.push({
        label,
        icon: iconClass,
        className: 'terminal-profile-menu-group',
        items
      });
    };

    if (platform === 'win32') {
      const shells = [
        {
          label: 'PowerShell',
          icon: getTerminalMenuIcon('powershell'),
          command: () => {
            setLastLocalTerminalType('powershell');
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current('powershell');
            }
          }
        },
        {
          label: 'Cygwin',
          icon: getTerminalMenuIcon('cygwin'),
          command: () => {
            setLastLocalTerminalType('cygwin');
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current('cygwin');
            }
          }
        }
      ];

      const aiClis = [];
      if (aiClientsEnabled.geminicli) {
        aiClis.push({
          label: 'Gemini CLI',
          icon: getTerminalMenuIcon('geminicli'),
          command: () => {
            setLastLocalTerminalType('geminicli');
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current('geminicli');
            }
          }
        });
      }
      if (aiClientsEnabled.codexcli) {
        aiClis.push({
          label: 'Codex CLI',
          icon: getTerminalMenuIcon('codexcli'),
          command: () => {
            setLastLocalTerminalType('codexcli');
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current('codexcli');
            }
          }
        });
      }
      if (aiClientsEnabled.antigravitycli) {
        aiClis.push({
          label: 'Antigravity CLI',
          icon: getTerminalMenuIcon('antigravitycli'),
          command: () => {
            setLastLocalTerminalType('antigravitycli');
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current('antigravitycli');
            }
          }
        });
      }
      if (aiClientsEnabled.opencode) {
        aiClis.push({
          label: 'OpenCode',
          icon: getTerminalMenuIcon('opencode'),
          command: () => {
            setLastLocalTerminalType('opencode');
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current('opencode');
            }
          }
        });
      }
      if (aiClientsEnabled.claude) {
        aiClis.push({
          label: 'Claude Code',
          icon: getTerminalMenuIcon('claude'),
          command: () => {
            setLastLocalTerminalType('claude');
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current('claude');
            }
          }
        });
      }

      const distros = [];
      if (wslDistributions && wslDistributions.length > 0) {
        wslDistributions.forEach((distro) => {
          const terminalType = distro.category === 'ubuntu' ? 'ubuntu' : (distro.category ? `wsl-${distro.category}` : 'wsl');
          distros.push({
            label: distro.label,
            icon: getTerminalMenuIcon(terminalType, distro, distro.label),
            command: () => {
              setLastLocalTerminalType(distro.name);
              if (createLocalTerminalTabRef.current) {
                createLocalTerminalTabRef.current(distro.name, distro);
              }
            }
          });
        });
      }

      // Fallback para mostrar distros locales frecuentes aunque la detección no haya terminado.
      const fallbackDistros = [
        { label: 'Ubuntu 24.04', terminalType: 'wsl-ubuntu', iconType: 'ubuntu' },
        { label: 'Ubuntu', terminalType: 'wsl-ubuntu-old', iconType: 'ubuntu' },
        { label: 'Debian', terminalType: 'wsl-debian', iconType: 'debian' },
        { label: 'Kali Linux', terminalType: 'wsl-kali', iconType: 'wsl-kali' }
      ];
      fallbackDistros.forEach((fallback) => {
        const exists = distros.some((d) => d.label?.toLowerCase?.() === fallback.label.toLowerCase());
        if (exists) return;
        distros.push({
          label: fallback.label,
          icon: getTerminalMenuIcon(fallback.iconType, null, fallback.label),
          command: () => {
            setLastLocalTerminalType(fallback.terminalType);
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current(fallback.terminalType);
            }
          }
        });
      });

      const containers = [];
      if (dockerContainers && dockerContainers.length > 0) {
        dockerContainers.forEach((container) => {
          containers.push({
            label: container.name,
            icon: getTerminalMenuIcon('docker', null, container.name),
            command: () => {
              setLastLocalTerminalType(`docker-${container.name}`);
              if (createLocalTerminalTabRef.current) {
                createLocalTerminalTabRef.current(`docker-${container.name}`, { dockerContainer: container });
              }
            }
          });
        });
      }

      const apps = [];
      if (aiClientsEnabled.anythingllm) {
        apps.push({
          label: 'AnythingLLM',
          icon: 'pi pi-box',
          command: () => {
            dispatchAnythingLLMTab();
          }
        });
      }
      if (aiClientsEnabled.openwebui) {
        apps.push({
          label: 'Open WebUI',
          icon: 'pi pi-globe',
          command: () => {
            dispatchOpenWebUITab();
          }
        });
      }
      if (aiClientsEnabled.librechat) {
        apps.push({
          label: 'LibreChat',
          icon: 'pi pi-comment',
          command: () => {
            dispatchLibreChatTab();
          }
        });
      }
      if (aiClientsEnabled.agentzero) {
        apps.push({
          label: 'Agent Zero',
          icon: 'pi pi-android',
          command: () => {
            dispatchAgentZeroTab();
          }
        });
      }
      if (aiClientsEnabled.openclaw) {
        apps.push({
          label: 'OpenClaw',
          icon: 'pi pi-bolt',
          command: () => {
            dispatchOpenClawTab();
          }
        });
      }
      if (aiClientsEnabled.opennotebook) {
        apps.push({
          label: 'Open Notebook',
          icon: 'pi pi-book',
          command: () => {
             // Assuming there's a dispatch function for this, checking common patterns
             if (typeof dispatchOpenNotebookTab === 'function') {
               dispatchOpenNotebookTab();
             } else {
               window.dispatchEvent(new CustomEvent('open-opennotebook-tab'));
             }
          }
        });
      }

      const menuItems = [];
      if (distros.length > 0) {
        shells.push(...distros);
      }
      pushProfileGroup(menuItems, 'Shells', 'pi pi-fw pi-desktop', shells);
      pushProfileGroup(menuItems, 'AI CLIs', 'pi pi-fw pi-bolt', aiClis);
      pushProfileGroup(menuItems, 'Containers', 'pi pi-fw pi-box', containers);
      pushProfileGroup(menuItems, 'Apps', 'pi pi-fw pi-th-large', apps);

      setTerminalMenuItems(menuItems);
    } else {
      const shells = [
        {
          label: 'Terminal',
          icon: getTerminalMenuIcon('linux-terminal'),
          command: () => {
            setLastLocalTerminalType('linux-terminal');
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current('linux-terminal');
            }
          }
        }
      ];

      const containers = [];
      if (dockerContainers && dockerContainers.length > 0) {
        dockerContainers.forEach((container) => {
          containers.push({
            label: container.name,
            icon: getTerminalMenuIcon('docker', null, container.name),
            command: () => {
              setLastLocalTerminalType(`docker-${container.name}`);
              if (createLocalTerminalTabRef.current) {
                createLocalTerminalTabRef.current(`docker-${container.name}`, { dockerContainer: container });
              }
            }
          });
        });
      }

      const apps = [];
      if (aiClientsEnabled.anythingllm) {
        apps.push({
          label: 'AnythingLLM',
          icon: 'pi pi-box',
          command: () => {
            dispatchAnythingLLMTab();
          }
        });
      }
      if (aiClientsEnabled.openwebui) {
        apps.push({
          label: 'Open WebUI',
          icon: 'pi pi-globe',
          command: () => {
            dispatchOpenWebUITab();
          }
        });
      }
      if (aiClientsEnabled.librechat) {
        apps.push({
          label: 'LibreChat',
          icon: 'pi pi-comment',
          command: () => {
            dispatchLibreChatTab();
          }
        });
      }
      if (aiClientsEnabled.agentzero) {
        apps.push({
          label: 'Agent Zero',
          icon: 'pi pi-android',
          command: () => {
            dispatchAgentZeroTab();
          }
        });
      }
      if (aiClientsEnabled.openclaw) {
        apps.push({
          label: 'OpenClaw',
          icon: 'pi pi-bolt',
          command: () => {
            dispatchOpenClawTab();
          }
        });
      }

      const linuxMenuItems = [];
      pushProfileGroup(linuxMenuItems, 'Shells', 'pi pi-fw pi-desktop', shells);
      pushProfileGroup(linuxMenuItems, 'Containers', 'pi pi-fw pi-box', containers);
      pushProfileGroup(linuxMenuItems, 'Apps', 'pi pi-fw pi-th-large', apps);

      setTerminalMenuItems(linuxMenuItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wslDistributions, dockerContainers, dispatchAnythingLLMTab, dispatchOpenWebUITab, dispatchLibreChatTab, dispatchAgentZeroTab, dispatchOpenClawTab, dispatchOpenNotebookTab, aiClientsEnabled]);

  // 🚀 OPTIMIZACIÓN: Detectar distribuciones WSL DIFERIDO
  useEffect(() => {
    const timer = setTimeout(() => {
      const detectWSLDistributions = async () => {
        try {
          if (window.electron && window.electron.ipcRenderer) {
            const distributions = await window.electron.ipcRenderer.invoke('detect-wsl-distributions');
            if (Array.isArray(distributions)) {
              setWslDistributions(distributions);
            } else {
              setWslDistributions([]);
            }
          } else {
            setWslDistributions([]);
          }
        } catch (error) {
          setWslDistributions([]);
        }
      };
      detectWSLDistributions();
    }, 600); // Diferir 600ms

    return () => clearTimeout(timer);
  }, []);

  // Efecto para añadir botones fijos a la derecha del nav container (fuera del área scrollable)
  useEffect(() => {
    const navContainer = tabsContainerRef.current;
    if (!navContainer) return;

    const navList = navContainer.querySelector('.p-tabview-nav');
    if (!navList) return;

    // Asegurar que todos los elementos dentro de la barra de pestañas
    // (pestañas e iconos de acción) se alineen verticalmente al centro
    try {
      navList.style.display = 'flex';
      navList.style.alignItems = 'center';
    } catch {
      // ignorar si el estilo no se puede aplicar
    }

    // Eliminar botones existentes del nav
    navContainer.querySelectorAll('.local-terminal-buttons, .tab-appearance-button-wrapper').forEach((el) => el.remove());
    navContainer.querySelector('.main-nav-traffic-lights')?.remove();

    // Crear contenedor de botones (inline después de la última pestaña)
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'local-terminal-buttons';
    buttonsContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 1px;
      flex-shrink: 0;
      margin-left: 4px;
      -webkit-app-region: no-drag;
    `;

    // Botón +
    const plusButton = document.createElement('button');
    plusButton.innerHTML = '<i class="pi pi-plus"></i>';
    plusButton.className = 'p-button p-button-text p-button-sm tab-action-button';
    plusButton.style.cssText = `
      padding: 0 !important;
      width: 20px !important;
      min-width: 20px !important;
      max-width: 20px !important;
      height: 20px !important;
      min-height: 20px !important;
      max-height: 20px !important;
      font-size: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-sizing: border-box !important;
      -webkit-app-region: no-drag !important;
      pointer-events: auto !important;
    `;

    plusButton.title = 'Nueva terminal local';
    plusButton.addEventListener('click', () => {
      const storedDefault = localStorage.getItem('nodeterm_default_local_terminal');
      const lastType = lastLocalTerminalTypeRef.current;
      const fallbackDefault = getDefaultTerminalFromConfig();
      let terminalTypeToUse = storedDefault || lastType || fallbackDefault;

      const findDistro = (value) => {
        if (!value) return null;
        const normalized = value.startsWith('wsl-') ? value.replace('wsl-', '') : value;
        const distros = wslDistributionsRef.current || [];
        return distros.find(d =>
          d.name === normalized ||
          d.label === normalized ||
          d.name?.toLowerCase?.() === normalized.toLowerCase() ||
          d.label?.toLowerCase?.() === normalized.toLowerCase()
        );
      };

      if (terminalTypeToUse.startsWith('docker-')) {
        const containerName = terminalTypeToUse.replace('docker-', '');
        const container = dockerContainers.find(c => c.name === containerName);
        if (container) {
          createLocalTerminalTabRef.current?.(terminalTypeToUse, { dockerContainer: container });
          return;
        }
      }

      const distro = findDistro(terminalTypeToUse);
      if (distro) {
        createLocalTerminalTabRef.current?.(distro.name, distro);
      } else {
        createLocalTerminalTabRef.current?.(terminalTypeToUse, null);
      }
    });

    // Botón dropdown
    const dropdownButton = document.createElement('button');
    dropdownButton.innerHTML = '<i class="pi pi-chevron-down"></i>';
    dropdownButton.className = 'p-button p-button-text p-button-sm tab-action-button';
    dropdownButton.style.cssText = `
      padding: 0 !important;
      width: 20px !important;
      min-width: 20px !important;
      max-width: 20px !important;
      height: 20px !important;
      min-height: 20px !important;
      max-height: 20px !important;
      font-size: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-sizing: border-box !important;
      -webkit-app-region: no-drag !important;
      pointer-events: auto !important;
    `;

    dropdownButton.title = 'Seleccionar tipo de terminal';
    dropdownButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const existingPanel = document.getElementById('terminal-grid-launcher-panel');
      if (existingPanel) {
        const roots = existingPanel._launcherIconRoots;
        if (Array.isArray(roots)) {
          roots.forEach((r) => {
            try {
              r.unmount();
            } catch {
              /* noop */
            }
          });
        }
        if (existingPanel._launcherStyleEl?.parentNode) {
          existingPanel._launcherStyleEl.parentNode.removeChild(existingPanel._launcherStyleEl);
        }
        existingPanel.remove();
        return;
      }

      const panel = document.createElement('div');
      panel.id = 'terminal-grid-launcher-panel';
      /** Tokens del tema activo (mismo criterio que menús / themeManager) */
      const theme = {
        ctxBg: 'var(--ui-context-bg)',
        ctxBorder: 'var(--ui-context-border)',
        ctxText: 'var(--ui-context-text)',
        ctxHover: 'var(--ui-context-hover)',
        ctxShadow: 'var(--ui-context-shadow, rgba(0, 0, 0, 0.35))',
        contentBg: 'var(--ui-content-bg)',
        primary: 'var(--ui-button-primary)',
        tabActiveText: 'var(--ui-tab-active-text, var(--ui-context-text))'
      };
      panel._launcherIconRoots = [];
      const unmountLauncherIconRoots = () => {
        if (!Array.isArray(panel._launcherIconRoots)) return;
        panel._launcherIconRoots.forEach((r) => {
          try {
            r.unmount();
          } catch {
            /* noop */
          }
        });
        panel._launcherIconRoots = [];
      };
      const disposePanel = () => {
        unmountLauncherIconRoots();
        document.removeEventListener('click', handleOutsideClick);
        if (panel._launcherStyleEl?.parentNode) {
          panel._launcherStyleEl.parentNode.removeChild(panel._launcherStyleEl);
        }
        if (panel.parentNode) panel.parentNode.removeChild(panel);
      };

      const launcherStyleEl = document.createElement('style');
      launcherStyleEl.textContent = `
        #terminal-grid-launcher-panel input.terminal-launcher-search::placeholder {
          color: rgba(122, 248, 255, 0.42);
        }
      `;
      document.head.appendChild(launcherStyleEl);
      panel._launcherStyleEl = launcherStyleEl;

      panel.style.cssText = `
        position: fixed;
        z-index: 10020;
        width: min(820px, calc(100vw - 20px));
        max-height: min(78vh, 860px);
        overflow: auto;
        font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
        color: ${theme.ctxText || '#e2f8ff'};
        background: ${theme.ctxBg || 'rgba(6, 8, 18, 0.97)'};
        backdrop-filter: blur(14px) saturate(160%);
        -webkit-backdrop-filter: blur(14px) saturate(160%);
        border: 1px solid ${theme.ctxBorder || 'rgba(0, 243, 255, 0.45)'};
        border-radius: 8px;
        box-shadow: ${theme.ctxShadow || '0 0 40px rgba(0, 243, 255, 0.12)'};
        padding: 12px 12px 10px 12px;
      `;

      // Añadir scanlines sutiles solo si el fondo es oscuro
      const isDark = !theme.contentBg || theme.contentBg.includes('#1') || theme.contentBg.includes('#2') || theme.contentBg.includes('rgb(0') || theme.contentBg.includes('black');
      if (isDark) {
        panel.style.backgroundImage = 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 200, 0.03) 2px, rgba(0, 255, 200, 0.03) 3px)';
      }

      const rect = dropdownButton.getBoundingClientRect();
      const width = Math.min(760, window.innerWidth - 24);
      let left = rect.left;
      let top = rect.bottom + 8;
      if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
      if (top + 420 > window.innerHeight - 12) top = Math.max(12, rect.top - 420);
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;

      const title = document.createElement('div');
      title.textContent = '// LAUNCHER';
      title.style.cssText = `
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        margin-bottom: 10px;
        color: ${theme.primary || '#00f3ff'};
        text-shadow: 0 0 12px rgba(0, 243, 255, 0.45);
      `;
      panel.appendChild(title);

      // searchInput removed

      const contentHost = document.createElement('div');
      panel.appendChild(contentHost);

      const getCardMeta = (groupLabel, itemLabel) => {
        const g = (groupLabel || '').toLowerCase();
        const i = (itemLabel || '').toLowerCase();
        if (i.includes('powershell')) return { subtitle: 'SHELL · WIN' };
        if (i.includes('cygwin')) return { subtitle: 'SHELL · POSIX' };
        if (i.includes('ubuntu') || i.includes('debian') || i.includes('kali')) return { subtitle: 'WSL · DISTRO' };
        if (g.includes('shell')) return { subtitle: 'LOCAL' };
        if (g.includes('ai') || i.includes('codex') || i.includes('gemini') || i.includes('claude') || i.includes('opencode')) return { subtitle: 'AI · CLI' };
        if (g.includes('container') || i.includes('docker')) return { subtitle: 'DOCKER' };
        if (i.includes('anythingllm')) return { subtitle: 'NET · APP' };
        if (i.includes('open webui')) return { subtitle: 'NET · APP' };
        if (i.includes('librechat')) return { subtitle: 'NET · APP' };
        if (i.includes('agent zero')) return { subtitle: 'NET · APP' };
        if (i.includes('openclaw')) return { subtitle: 'NET · APP' };
        if (i.includes('open notebook')) return { subtitle: 'NET · APP' };
        if (i.includes('ai chat')) return { subtitle: 'NET · APP' };
        if (g.includes('apps')) return { subtitle: 'NET · APP' };
        return { subtitle: 'PROFILE' };
      };

      const resolveLauncherIconElement = (item, groupLabel, accent) => {
        const gl = (groupLabel || '').toLowerCase();
        const lb = (item.label || '').toLowerCase();

        if (React.isValidElement(item.icon)) {
          const prev = item.icon.props?.style || {};
          return React.cloneElement(item.icon, {
            style: {
              ...prev,
              color: prev.color || accent,
              marginRight: 0,
              display: 'block'
            }
          });
        }

        if (lb.includes('anythingllm')) return <AIClientBrandIcon tabType="anything-llm" size={20} />;
        if (lb.includes('open webui')) return <AIClientBrandIcon tabType="openwebui" size={20} />;
        if (lb.includes('librechat')) return <AIClientBrandIcon tabType="librechat" size={20} />;
        if (lb.includes('agent zero')) return <AIClientBrandIcon tabType="agentzero" size={20} />;
        if (lb.includes('openclaw')) return <AIClientBrandIcon tabType="openclaw" size={20} />;
        if (lb.includes('open notebook')) return <AIClientBrandIcon tabType="open-notebook" size={20} />;
        if (lb.includes('codex')) return <SiOpenai style={{ fontSize: 18, color: '#10A37F' }} />;
        if (lb.includes('gemini')) return <SiGooglegemini style={{ fontSize: 18, color: '#8E75B2' }} />;
        if (lb.includes('claude')) return <SiAnthropic style={{ fontSize: 18, color: '#D97706' }} />;
        if (lb.includes('opencode')) return <AIClientBrandIcon tabType="opencode" size={20} />;
        if (lb.includes('ai chat')) return <FaBrain style={{ fontSize: 18, color: accent }} />;

        if (gl.includes('container') || lb.includes('docker')) {
          return <SiDocker style={{ fontSize: 20, color: accent }} />;
        }
        if (lb.includes('powershell')) return <FaWindows style={{ fontSize: 18, color: '#0078D4' }} />;
        if (lb.includes('cygwin')) return <FaLinux style={{ fontSize: 17, color: '#FCC624' }} />;
        if (lb.includes('ubuntu')) return <FaUbuntu style={{ fontSize: 19, color: '#E95420' }} />;
        if (lb.includes('debian')) return <SiDebian style={{ fontSize: 18, color: '#D70A53' }} />;
        if (lb.includes('kali')) return <FaLinux style={{ fontSize: 18, color: '#2196F3' }} />;

        if (typeof item.icon === 'string' && item.icon.trim()) {
          return <i className={item.icon} style={{ fontSize: '1rem', color: accent }} />;
        }

        return <i className="pi pi-desktop" style={{ fontSize: '1rem', color: accent }} />;
      };

      const renderCard = (item, groupLabel) => {
        const meta = getCardMeta(groupLabel, item.label);
        const accent = isDark ? 'var(--primary-color, #00f3ff)' : (theme.primary || '#007acc');
        const accentMuted = isDark ? 'rgba(0, 243, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)';
        const cardBgIdle = theme.contentBg;
        const cardBorderIdle = theme.ctxBorder || 'rgba(0, 243, 255, 0.25)';

        const button = document.createElement('button');
        button.type = 'button';
        button.style.cssText = `
          border: 1px solid ${cardBorderIdle};
          background: ${cardBgIdle};
          color: ${theme.ctxText || (isDark ? '#e2f8ff' : '#333')};
          min-height: 38px;
          padding: 4px 10px 4px 12px;
          text-align: left;
          cursor: pointer;
          font-family: ui-monospace, "Cascadia Code", "Consolas", monospace, sans-serif;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          position: relative;
          overflow: hidden;
          border-radius: 0;
        `;

        const glow = document.createElement('div');
        glow.style.cssText = `
          pointer-events: none;
          position: absolute;
          inset: -50% -30% auto -30%;
          height: 85%;
          background: radial-gradient(ellipse at 50% 0%, rgba(0, 243, 255, 0.15) 0%, transparent 60%);
          opacity: 0.65;
        `;
        button.appendChild(glow);

        const iconBadge = document.createElement('div');
        iconBadge.style.cssText = `
          position: relative;
          z-index: 1;
          width: 26px;
          height: 26px;
          min-width: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 243, 255, 0.08);
          border: 1px solid rgba(0, 243, 255, 0.25);
          border-radius: 0;
          transition: all 0.2s;
        `;
        const iconRoot = createRoot(iconBadge);
        iconRoot.render(resolveLauncherIconElement(item, groupLabel, accent));
        panel._launcherIconRoots.push(iconRoot);

        const left = document.createElement('div');
        left.style.cssText = 'position:relative;z-index:1;display:flex;align-items:center;gap:12px;min-width:0;flex:1;';

        const labelWrap = document.createElement('div');
        labelWrap.style.cssText = 'display:flex;align-items:center;min-width:0;flex:1;';
        const name = document.createElement('div');
        name.textContent = item.label || 'Terminal';
        name.style.cssText = `
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: ${theme.ctxText || (isDark ? '#00f3ff' : '#333')};
          text-shadow: ${isDark ? '0 0 5px rgba(0, 243, 255, 0.2)' : 'none'};
        `;
        labelWrap.appendChild(name);

        const arrow = document.createElement('i');
        arrow.className = 'pi pi-angle-right';
        arrow.style.cssText = `position:relative;z-index:1;font-size:12px;opacity:0.7;flex-shrink:0;color:${isDark ? '#00f3ff' : 'var(--primary-color, #007acc)'};transition:all 0.2s;text-shadow:${isDark ? '0 0 5px currentColor' : 'none'};`;

        left.appendChild(iconBadge);
        left.appendChild(labelWrap);
        button.appendChild(left);
        button.appendChild(arrow);
        
        button.addEventListener('mouseenter', () => {
          button.style.background = isDark ? 'rgba(0, 243, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)';
          button.style.borderColor = isDark ? 'rgba(0, 243, 255, 0.8)' : 'var(--primary-color)';
          button.style.transform = 'scale(1.02)';
          button.style.boxShadow = isDark ? '0 0 15px rgba(0, 243, 255, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.1)';
          iconBadge.style.background = isDark ? 'rgba(255, 0, 170, 0.15)' : 'rgba(0, 0, 0, 0.08)';
          iconBadge.style.borderColor = isDark ? 'rgba(255, 0, 170, 0.4)' : 'var(--primary-color)';
          arrow.style.color = isDark ? '#ff00aa' : 'var(--primary-color)';
          arrow.style.transform = 'translateX(2px)';
        });
        button.addEventListener('mouseleave', () => {
          button.style.background = cardBgIdle;
          button.style.borderColor = cardBorderIdle;
          button.style.transform = 'scale(1)';
          button.style.boxShadow = 'none';
          iconBadge.style.background = isDark ? 'rgba(0, 243, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)';
          iconBadge.style.borderColor = isDark ? 'rgba(0, 243, 255, 0.25)' : 'rgba(0, 0, 0, 0.1)';
          arrow.style.color = isDark ? '#00f3ff' : 'var(--primary-color, #007acc)';
          arrow.style.transform = 'translateX(0)';
        });
        button.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (typeof item.command === 'function') item.command();
          disposePanel();
        });
        return button;
      };

      const groups = Array.isArray(terminalMenuItemsRef.current) ? terminalMenuItemsRef.current : [];

      const renderGroups = (query = '') => {
        const normalized = (query || '').trim().toLowerCase();
        unmountLauncherIconRoots();
        contentHost.innerHTML = '';

        const hasItems = groups.some((group) => Array.isArray(group.items) && group.items.length > 0);
        if (!hasItems) {
          const empty = document.createElement('div');
          empty.textContent = 'Cargando perfiles... vuelve a abrir en un instante.';
          empty.style.cssText = 'font-size:13px;opacity:0.8;padding:10px 4px;color:rgba(200, 235, 255, 0.82);';
          contentHost.appendChild(empty);
          return;
        }

        // Reordenar grupos: Contenedores siempre al final
        const sortedGroups = [...groups].sort((a, b) => {
          const aLabel = (a.label || '').toLowerCase();
          const bLabel = (b.label || '').toLowerCase();
          if (aLabel.includes('container') || aLabel.includes('docker')) return 1;
          if (bLabel.includes('container') || bLabel.includes('docker')) return -1;
          return 0;
        });

        let renderedCount = 0;
        sortedGroups.forEach((group) => {
          const allItems = Array.isArray(group.items) ? group.items : [];
          const filteredItems = normalized
            ? allItems.filter((item) => (item.label || '').toLowerCase().includes(normalized))
            : allItems;
          if (!filteredItems.length) return;

          const sectionId = `launcher-section-${(group.label || 'group').replace(/\s+/g, '-').toLowerCase()}`;
          const isContainers = (group.label || '').toLowerCase().includes('container') || (group.label || '').toLowerCase().includes('docker');
          
          // Recuperar estado de persistencia si existe, o usar default (Containers colapsados por defecto)
          const isCollapsed = isContainers;

          const section = document.createElement('div');
          section.style.cssText = 'margin-bottom: 8px; padding-bottom: 4px;';

          const sectionTitle = document.createElement('div');
          sectionTitle.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            padding: 4px 6px;
            border-radius: 4px;
            margin-bottom: 4px;
            transition: all 0.2s;
            user-select: none;
          `;
          
          const titleLeft = document.createElement('div');
          titleLeft.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.14em;
            color: ${isContainers ? 'rgba(0, 243, 255, 0.65)' : '#00f3ff'};
            text-shadow: 0 0 10px rgba(0, 243, 255, 0.25);
            text-transform: uppercase;
          `;

          const sectionIcon = document.createElement('i');
          sectionIcon.className = group.icon || 'pi pi-folder';
          sectionIcon.style.cssText = 'font-size: 10px;';
          
          const sectionText = document.createElement('span');
          sectionText.textContent = `${group.label || 'Grupo'} (${filteredItems.length})`;
          
          titleLeft.appendChild(sectionIcon);
          titleLeft.appendChild(sectionText);

          const chevron = document.createElement('i');
          chevron.className = isCollapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up';
          chevron.style.cssText = 'font-size: 8px; opacity: 0.6; transition: transform 0.3s;';

          sectionTitle.appendChild(titleLeft);
          sectionTitle.appendChild(chevron);
          section.appendChild(sectionTitle);

          const grid = document.createElement('div');
          grid.style.cssText = `
            display: ${isCollapsed ? 'none' : 'grid'};
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 6px;
            padding: 4px 2px 10px 2px;
            transition: all 0.3s;
          `;
          
          filteredItems.forEach((item) => {
            renderedCount += 1;
            grid.appendChild(renderCard(item, group.label));
          });
          section.appendChild(grid);

          sectionTitle.addEventListener('click', () => {
            const currentlyCollapsed = grid.style.display === 'none';
            grid.style.display = currentlyCollapsed ? 'grid' : 'none';
            chevron.className = currentlyCollapsed ? 'pi pi-chevron-up' : 'pi pi-chevron-down';
            sectionTitle.style.background = currentlyCollapsed ? 'rgba(0, 243, 255, 0.03)' : 'transparent';
          });

          sectionTitle.addEventListener('mouseenter', () => {
            sectionTitle.style.background = 'rgba(0, 243, 255, 0.05)';
          });
          sectionTitle.addEventListener('mouseleave', () => {
            sectionTitle.style.background = grid.style.display === 'none' ? 'transparent' : 'rgba(0, 243, 255, 0.02)';
          });

          contentHost.appendChild(section);
        });

        if (renderedCount === 0) {
          const noResults = document.createElement('div');
          noResults.textContent = 'Sin resultados para tu busqueda.';
          noResults.style.cssText = 'font-size:13px;opacity:0.8;padding:10px 4px;color:rgba(200, 235, 255, 0.82);';
          contentHost.appendChild(noResults);
        }
      };

      renderGroups('');

      const handleOutsideClick = (ev) => {
        if (!panel.contains(ev.target) && !dropdownButton.contains(ev.target)) {
          disposePanel();
        }
      };

      document.body.appendChild(panel);
      setTimeout(() => document.addEventListener('click', handleOutsideClick), 0);
    });

    // Botón unificado: Tema + Layout de pestañas (un solo botón, panel con dos secciones)
    const appearanceButton = document.createElement('div');
    appearanceButton.setAttribute('role', 'button');
    appearanceButton.setAttribute('tabIndex', '0');
    appearanceButton.title = 'Tema y diseño de pestañas';
    appearanceButton.className = 'tab-appearance-quick-button';
    const appearanceIcon = document.createElement('i');
    appearanceIcon.className = 'pi pi-cog';
    appearanceIcon.style.cssText = `
      font-size: 0.9rem;
      color: var(--ui-tab-text, rgba(255,255,255,0.85));
      opacity: 0.6;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    appearanceButton.appendChild(appearanceIcon);
    appearanceButton.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      -webkit-app-region: no-drag !important;
    `;
    appearanceButton.addEventListener('mouseenter', () => { appearanceIcon.style.opacity = '1'; });
    appearanceButton.addEventListener('mouseleave', () => { appearanceIcon.style.opacity = '0.6'; });
    appearanceButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        appearanceButton.click();
      }
    });
    appearanceButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const existingPanel = document.getElementById('tab-appearance-quick-panel');
      if (existingPanel) {
        existingPanel.remove();
        return;
      }
      const rect = appearanceButton.getBoundingClientRect();
      const currentTheme = localStorage.getItem(TAB_THEME_STORAGE_KEY) || 'default';
      const currentLayout = localStorage.getItem(TAB_LAYOUT_STORAGE_KEY) || 'default';
      const themeList = getTabThemeList();
      const layoutList = getTabLayoutList();

      const panel = document.createElement('div');
      panel.id = 'tab-appearance-quick-panel';
      panel.style.cssText = `
        position: fixed;
        right: 8px;
        top: ${rect.bottom + 4}px;
        width: 280px;
        max-height: 420px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background: var(--ui-dialog-bg, var(--ui-card-bg, #2d2d30));
        border: 1px solid var(--ui-tab-border, rgba(255,255,255,0.12));
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        z-index: 10000;
        font-size: 12px;
      `;

      const closeOutside = (ev) => {
        if (!panel.contains(ev.target) && !appearanceButton.contains(ev.target)) {
          if (panel.parentNode) panel.remove();
          document.removeEventListener('click', closeOutside);
        }
      };

      const contentArea = document.createElement('div');
      contentArea.style.cssText = 'flex: 1; overflow: auto; padding: 8px;';

      const choiceBtnStyle = (active) => `
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 10px;
        margin-bottom: 6px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        color: var(--ui-tab-text, rgba(255,255,255,0.9));
        background: ${active ? 'var(--ui-tab-active-bg, rgba(255,255,255,0.12))' : 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'};
        transition: background 0.15s;
      `;

      function showChoice() {
        contentArea.innerHTML = '';
        contentArea.style.padding = '8px';

        const optThemes = document.createElement('button');
        optThemes.type = 'button';
        optThemes.style.cssText = choiceBtnStyle(false);
        optThemes.innerHTML = '<i class="pi pi-palette" style="font-size: 1.1rem; opacity: 0.9;"></i><span>Tema de pestañas</span>';
        optThemes.addEventListener('mouseenter', () => { optThemes.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.08))'; });
        optThemes.addEventListener('mouseleave', () => { optThemes.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'; });
        optThemes.addEventListener('click', (ev) => { ev.stopPropagation(); showThemeList(); });

        const optLayout = document.createElement('button');
        optLayout.type = 'button';
        optLayout.style.cssText = choiceBtnStyle(false);
        optLayout.innerHTML = '<i class="pi pi-th-large" style="font-size: 1.1rem; opacity: 0.9;"></i><span>Diseño / layout</span>';
        optLayout.addEventListener('mouseenter', () => { optLayout.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.08))'; });
        optLayout.addEventListener('mouseleave', () => { optLayout.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'; });
        optLayout.addEventListener('click', (ev) => { ev.stopPropagation(); showLayoutList(); });

        const optUiTheme = document.createElement('button');
        optUiTheme.type = 'button';
        optUiTheme.style.cssText = choiceBtnStyle(false);
        optUiTheme.innerHTML = '<i class="pi pi-desktop" style="font-size: 1.1rem; opacity: 0.9;"></i><span>Tema de apariencia</span>';
        optUiTheme.addEventListener('mouseenter', () => { optUiTheme.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.08))'; });
        optUiTheme.addEventListener('mouseleave', () => { optUiTheme.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'; });
        optUiTheme.addEventListener('click', (ev) => { ev.stopPropagation(); showUiThemeList(); });

        const optPresets = document.createElement('button');
        optPresets.type = 'button';
        optPresets.style.cssText = choiceBtnStyle(false);
        optPresets.innerHTML = '<i class="pi pi-star" style="font-size: 1.1rem; opacity: 0.9;"></i><span>Presets de temas</span>';
        optPresets.addEventListener('mouseenter', () => { optPresets.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.08))'; });
        optPresets.addEventListener('mouseleave', () => { optPresets.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'; });
        optPresets.addEventListener('click', (ev) => { ev.stopPropagation(); showPresetList(); });

        contentArea.appendChild(optThemes);
        contentArea.appendChild(optLayout);
        contentArea.appendChild(optUiTheme);
        contentArea.appendChild(optPresets);

        const separator = document.createElement('div');
        separator.style.cssText = 'height: 1px; background: var(--ui-tab-border, rgba(255,255,255,0.1)); margin: 8px 4px;';
        contentArea.appendChild(separator);

        const titleVentana = document.createElement('div');
        titleVentana.textContent = 'Ventana';
        titleVentana.style.cssText = 'font-size: 10px; font-weight: 700; text-transform: uppercase; opacity: 0.5; margin: 4px 10px 8px; letter-spacing: 0.05em; color: var(--ui-tab-text);';
        contentArea.appendChild(titleVentana);

        const createToggleOption = (label, iconClass, isActive, onToggle) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.style.cssText = choiceBtnStyle(false);
          btn.style.justifyContent = 'space-between';
          btn.style.padding = '10px 12px';
          
          const leftSide = document.createElement('div');
          leftSide.style.cssText = 'display: flex; align-items: center; gap: 12px;';
          // Si no hay icono, el texto se alinea a la izquierda
          if (iconClass) {
            leftSide.innerHTML = `<i class="pi ${iconClass}" style="font-size: 1.1rem; opacity: 0.9;"></i><span style="font-weight: 500;">${label}</span>`;
          } else {
            leftSide.innerHTML = `<span style="font-weight: 500;">${label}</span>`;
          }
          
          // Switch Track (Estilo de la imagen)
          const track = document.createElement('div');
          track.style.cssText = `
            width: 38px;
            height: 20px;
            border-radius: 12px;
            background: ${isActive ? '#4d79c7' : '#323d4d'};
            position: relative;
            transition: background 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            flex-shrink: 0;
          `;
          
          // Switch Thumb (Círculo blanco)
          const thumb = document.createElement('div');
          thumb.style.cssText = `
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: white;
            position: absolute;
            top: 2px;
            left: ${isActive ? '20px' : '2px'};
            transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          `;
          
          track.appendChild(thumb);
          btn.appendChild(leftSide);
          btn.appendChild(track);
          
          btn.addEventListener('mouseenter', () => { 
            btn.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.08))';
          });
          btn.addEventListener('mouseleave', () => { 
            btn.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))';
          });
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            onToggle();
            // Feedback visual inmediato
            const willBeActive = !isActive;
            track.style.background = willBeActive ? '#4d79c7' : '#323d4d';
            thumb.style.left = willBeActive ? '20px' : '2px';
            setTimeout(() => showChoice(), 150);
          });
          return btn;
        };

        const isTitleBarVisible = !titleBarCollapsedRef.current;
        const isMarcoVisible = !mainFrameHeaderCollapsedRef.current;
        const isMinimal = isMinimalModeRef.current;

        // Reordenados según petición del usuario: Barra de título, Marco superior, Modo minimalista
        contentArea.appendChild(createToggleOption('Barra de título', null, isTitleBarVisible, () => window.dispatchEvent(new CustomEvent('toggle-titlebar'))));
        contentArea.appendChild(createToggleOption('Marco superior', null, isMarcoVisible, () => setMainFrameHeaderCollapsed(prev => !prev)));
        contentArea.appendChild(createToggleOption('Modo Minimalista Absoluto', null, isMinimal, () => window.dispatchEvent(new CustomEvent('toggle-minimal-mode'))));
      }

      function addBackBar(title, onBack) {
        const bar = document.createElement('div');
        bar.style.cssText = `
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--ui-tab-border, rgba(255,255,255,0.12));
        `;
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.innerHTML = '<i class="pi pi-arrow-left" style="font-size: 0.85rem;"></i>';
        backBtn.style.cssText = `
          padding: 4px 6px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--ui-tab-text, rgba(255,255,255,0.8));
          cursor: pointer;
        `;
        backBtn.addEventListener('click', onBack);
        const titleEl = document.createElement('span');
        titleEl.textContent = title;
        titleEl.style.cssText = 'font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ui-tab-text, rgba(255,255,255,0.7));';
        bar.appendChild(backBtn);
        bar.appendChild(titleEl);
        contentArea.insertBefore(bar, contentArea.firstChild);
      }

      function showThemeList() {
        contentArea.innerHTML = '';
        contentArea.style.padding = '8px';
        addBackBar('Tema de pestañas', showChoice);

        themeList.forEach(({ id, name, preview }) => {
          const item = document.createElement('div');
          item.dataset.themeId = id;
          item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 8px;
            cursor: pointer;
            border-radius: 6px;
            color: var(--ui-tab-text, rgba(255,255,255,0.9));
            background: ${id === currentTheme ? 'var(--ui-tab-active-bg, rgba(255,255,255,0.12))' : 'transparent'};
          `;
          const swatch = document.createElement('div');
          swatch.style.cssText = `
            width: 28px;
            height: 18px;
            flex-shrink: 0;
            border-radius: ${preview.borderRadius || '4px 4px 0 0'};
            background: ${preview.background};
            border: ${preview.border || '1px solid rgba(255,255,255,0.2)'};
            box-shadow: ${preview.boxShadow || 'none'};
          `;
          const label = document.createElement('span');
          label.textContent = name;
          label.style.flex = '1';
          label.style.overflow = 'hidden';
          label.style.textOverflow = 'ellipsis';
          label.style.whiteSpace = 'nowrap';
          item.appendChild(swatch);
          item.appendChild(label);
          if (id === currentTheme) {
            const check = document.createElement('i');
            check.className = 'pi pi-check';
            check.style.cssText = 'font-size: 0.7rem; opacity: 0.9; flex-shrink: 0;';
            item.appendChild(check);
          }
          item.addEventListener('mouseenter', () => {
            if (id !== currentTheme) item.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))';
          });
          item.addEventListener('mouseleave', () => {
            if (id !== currentTheme) item.style.background = 'transparent';
          });
          item.addEventListener('click', (ev) => {
            ev.stopPropagation();
            applyTabTheme(id);
            localStorage.setItem(TAB_THEME_STORAGE_KEY, id);
            panel.remove();
            document.removeEventListener('click', closeOutside);
          });
          contentArea.appendChild(item);
        });
      }

      function showLayoutList() {
        contentArea.innerHTML = '';
        contentArea.style.padding = '8px';
        addBackBar('Diseño / layout', showChoice);

        layoutList.forEach(({ id, name, description, preview }) => {
          const item = document.createElement('div');
          item.dataset.layoutId = id;
          item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 8px;
            cursor: pointer;
            border-radius: 6px;
            color: var(--ui-tab-text, rgba(255,255,255,0.9));
            background: ${id === currentLayout ? 'var(--ui-tab-active-bg, rgba(255,255,255,0.12))' : 'transparent'};
          `;
          const swatch = document.createElement('div');
          const previewBorderStyle = preview?.borderStyle;
          const isMinimalPreview = previewBorderStyle === 'minimal';
          const isUnderlinePreview = previewBorderStyle === 'underline';
          const isBoxedPreview = previewBorderStyle === 'boxed';
          const isVscodePreview = previewBorderStyle === 'vscode';
          const isBrowserPreview = previewBorderStyle === 'browser';
          const isRetroPreview = previewBorderStyle === 'retro';
          const isPillsPreview = previewBorderStyle === 'pills';
          const isClassicBrowserPreview = previewBorderStyle === 'classicBrowser';
          swatch.style.cssText = `
            width: 28px;
            height: ${preview?.tabHeight || '30px'};
            flex-shrink: 0;
            border-radius: ${preview?.borderRadius || '4px 4px 0 0'};
            border: ${isVscodePreview ? 'none' : '1px solid var(--ui-tab-border, rgba(255,255,255,0.25))'};
            border-right: ${isVscodePreview ? '1px solid var(--ui-tab-border, rgba(255,255,255,0.25))' : 'none'};
            border-top: ${isVscodePreview ? '2px solid var(--primary-color, #2196f3)' : '1px solid var(--ui-tab-border, rgba(255,255,255,0.25))'};
            background: ${isMinimalPreview ? 'transparent' : 'var(--ui-tab-bg, rgba(255,255,255,0.05))'};
            box-shadow: ${isBoxedPreview ? 'inset 0 0 0 1px var(--ui-tab-border, rgba(255,255,255,0.35))' : 'none'};
            border-bottom: ${isUnderlinePreview ? '2px solid var(--primary-color, #2196f3)' : (isClassicBrowserPreview ? 'none' : '1px solid var(--ui-tab-border, rgba(255,255,255,0.25))')};
            margin-top: ${isBrowserPreview ? '2px' : '0'};
            font-family: ${isRetroPreview ? '"Consolas","Courier New",monospace' : 'inherit'};
            border-radius: ${isPillsPreview ? '999px' : (preview?.borderRadius || '4px 4px 0 0')};
          `;
          const textWrap = document.createElement('div');
          textWrap.style.cssText = 'display: flex; flex-direction: column; min-width: 0; flex: 1;';
          const label = document.createElement('span');
          label.textContent = name;
          label.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
          const subLabel = document.createElement('span');
          subLabel.textContent = description || '';
          subLabel.style.cssText = 'font-size: 10px; opacity: 0.72; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
          textWrap.appendChild(label);
          textWrap.appendChild(subLabel);
          item.appendChild(swatch);
          item.appendChild(textWrap);
          if (id === currentLayout) {
            const check = document.createElement('i');
            check.className = 'pi pi-check';
            check.style.cssText = 'font-size: 0.7rem; opacity: 0.9; flex-shrink: 0;';
            item.appendChild(check);
          }
          item.addEventListener('mouseenter', () => {
            if (id !== currentLayout) item.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))';
          });
          item.addEventListener('mouseleave', () => {
            if (id !== currentLayout) item.style.background = 'transparent';
          });
          item.addEventListener('click', (ev) => {
            ev.stopPropagation();
            applyTabLayout(id);
            localStorage.setItem(TAB_LAYOUT_STORAGE_KEY, id);
            panel.remove();
            document.removeEventListener('click', closeOutside);
          });
          contentArea.appendChild(item);
        });
      }

      function showUiThemeList() {
        contentArea.innerHTML = '';
        contentArea.style.padding = '8px';
        addBackBar('Tema de apariencia', showChoice);

        const currentUiTheme = localStorage.getItem('ui_theme') || 'Light';
        const uiThemeList = Array.from(
          new Map(
            Object.values(uiThemes || {})
              .filter(theme => theme?.name)
              .map(theme => [theme.name, theme])
          ).values()
        );

        uiThemeList.forEach((theme) => {
          const isActive = theme.name === currentUiTheme;
          const item = document.createElement('div');
          item.dataset.uiThemeName = theme.name;
          item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 8px;
            cursor: pointer;
            border-radius: 6px;
            color: var(--ui-tab-text, rgba(255,255,255,0.9));
            background: ${isActive ? 'var(--ui-tab-active-bg, rgba(255,255,255,0.12))' : 'transparent'};
          `;

          const swatch = document.createElement('div');
          swatch.style.cssText = `
            width: 28px;
            height: 18px;
            flex-shrink: 0;
            border-radius: 4px;
            border: 1px solid rgba(255,255,255,0.2);
            background: linear-gradient(135deg, ${theme.colors?.sidebarBackground || '#2b2f33'} 0%, ${theme.colors?.contentBackground || '#1e1e1e'} 100%);
          `;

          const label = document.createElement('span');
          label.textContent = theme.name;
          label.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

          item.appendChild(swatch);
          item.appendChild(label);
          if (isActive) {
            const check = document.createElement('i');
            check.className = 'pi pi-check';
            check.style.cssText = 'font-size: 0.7rem; opacity: 0.9; flex-shrink: 0;';
            item.appendChild(check);
          }

          item.addEventListener('mouseenter', () => {
            if (!isActive) item.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))';
          });
          item.addEventListener('mouseleave', () => {
            if (!isActive) item.style.background = 'transparent';
          });
          item.addEventListener('click', (ev) => {
            ev.stopPropagation();
            themeManager.applyTheme(theme.name);
            panel.remove();
            document.removeEventListener('click', closeOutside);
          });

          contentArea.appendChild(item);
        });
      }

      function showPresetList() {
        contentArea.innerHTML = '';
        contentArea.style.padding = '8px';
        addBackBar('Presets de temas', showChoice);

        const allPresets = presetManager.getAllPresets();
        const activePresetId = presetManager.getActivePresetId();

        allPresets.forEach((preset) => {
          const isActive = preset.id === activePresetId;
          const item = document.createElement('div');
          item.dataset.presetId = preset.id;
          item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 8px;
            cursor: pointer;
            border-radius: 6px;
            color: var(--ui-tab-text, rgba(255,255,255,0.9));
            background: ${isActive ? 'var(--ui-tab-active-bg, rgba(255,255,255,0.12))' : 'transparent'};
          `;

          const icon = document.createElement('span');
          icon.textContent = preset.icon || '🎨';
          icon.style.cssText = 'font-size: 0.95rem; line-height: 1; width: 16px; text-align: center; flex-shrink: 0;';

          const textWrap = document.createElement('div');
          textWrap.style.cssText = 'display: flex; flex-direction: column; min-width: 0; flex: 1;';
          const label = document.createElement('span');
          label.textContent = preset.name;
          label.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
          const subLabel = document.createElement('span');
          subLabel.textContent = preset.description || '';
          subLabel.style.cssText = 'font-size: 10px; opacity: 0.72; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
          textWrap.appendChild(label);
          textWrap.appendChild(subLabel);

          item.appendChild(icon);
          item.appendChild(textWrap);

          if (isActive) {
            const check = document.createElement('i');
            check.className = 'pi pi-check';
            check.style.cssText = 'font-size: 0.7rem; opacity: 0.9; flex-shrink: 0;';
            item.appendChild(check);
          }

          item.addEventListener('mouseenter', () => {
            if (!isActive) item.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))';
          });
          item.addEventListener('mouseleave', () => {
            if (!isActive) item.style.background = 'transparent';
          });
          item.addEventListener('click', (ev) => {
            ev.stopPropagation();
            presetManager.applyPreset(preset);
            panel.remove();
            document.removeEventListener('click', closeOutside);
          });

          contentArea.appendChild(item);
        });
      }

      panel.appendChild(contentArea);
      showChoice();
      document.body.appendChild(panel);
      setTimeout(() => document.addEventListener('click', closeOutside), 0);
    });

    // Botón de apariencia: abre menú con opciones de marco superior y title bar
    const frameToggleButton = document.createElement('div');
    frameToggleButton.setAttribute('role', 'button');
    frameToggleButton.setAttribute('tabIndex', '0');
    frameToggleButton.title = 'Opciones de barra superior';
    frameToggleButton.className = 'tab-frame-toggle-button';
    const frameIcon = document.createElement('i');
    frameIcon.className = 'pi pi-window-maximize';
    frameIcon.style.cssText = `
      font-size: 0.9rem;
      color: var(--ui-tab-text, rgba(255,255,255,0.85));
      opacity: 0.6;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    frameToggleButton.appendChild(frameIcon);
    frameToggleButton.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 2px;
      -webkit-app-region: no-drag;
    `;
    frameToggleButton.addEventListener('mouseenter', () => { frameIcon.style.opacity = '1'; });
    frameToggleButton.addEventListener('mouseleave', () => { frameIcon.style.opacity = '0.6'; });
    frameToggleButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        frameToggleButton.click();
      }
    });
    frameToggleButton.addEventListener('click', (e) => {
      e.stopPropagation();

      const existingMenu = document.querySelector('.tab-appearance-toggle-menu');
      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      const menu = document.createElement('div');
      menu.className = 'tab-appearance-toggle-menu';
      menu.style.cssText = `
        position: fixed;
        background: var(--ui-context-bg, #2b2f33);
        border: 1px solid var(--ui-context-border, #444);
        border-radius: 6px;
        box-shadow: 0 4px 12px var(--ui-context-shadow, rgba(0,0,0,0.3));
        z-index: 9999;
        min-width: 200px;
        padding: 4px 0;
        font-size: 12px;
        color: var(--ui-context-text, #fff);
      `;

      const createMenuAction = (label, onClick) => {
        const item = document.createElement('div');
        item.setAttribute('role', 'button');
        item.setAttribute('tabIndex', '0');
        item.textContent = label;
        item.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: background-color 0.15s ease;
        `;
        item.addEventListener('mouseenter', () => { item.style.background = 'var(--ui-context-hover, rgba(255,255,255,0.08))'; });
        item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
        item.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            item.click();
          }
        });
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onClick();
          menu.remove();
          document.removeEventListener('click', closeOutsideMenu);
        });
        return item;
      };

      const frameLabel = mainFrameHeaderCollapsedRef.current
        ? 'Mostrar marco superior'
        : 'Ocultar marco superior';
      const titleBarLabel = titleBarCollapsedRef.current
        ? 'Mostrar barra de titulo'
        : 'Ocultar barra de titulo';
      const minimalModeLabel = document.body.classList.contains('minimalist-terminal-mode')
        ? 'Desactivar modo minimalista'
        : 'Activar modo minimalista';
      menu.appendChild(createMenuAction(frameLabel, () => setMainFrameHeaderCollapsed(prev => !prev)));
      menu.appendChild(createMenuAction(titleBarLabel, () => window.dispatchEvent(new CustomEvent('toggle-titlebar'))));
      menu.appendChild(createMenuAction(minimalModeLabel, () => window.dispatchEvent(new CustomEvent('toggle-minimal-mode'))));

      document.body.appendChild(menu);
      const rect = frameToggleButton.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      let left = rect.right - menuRect.width;
      if (left < 8) left = 8;
      let top = rect.bottom + 6;
      if (top + menuRect.height > window.innerHeight - 8) {
        top = rect.top - menuRect.height - 6;
      }
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;

      const closeOutsideMenu = (ev) => {
        if (!menu.contains(ev.target) && !frameToggleButton.contains(ev.target)) {
          menu.remove();
          document.removeEventListener('click', closeOutsideMenu);
        }
      };
      setTimeout(() => document.addEventListener('click', closeOutsideMenu), 0);
    });

    const appearanceButtonWrapper = document.createElement('div');
    appearanceButtonWrapper.className = 'tab-appearance-button-wrapper';
    appearanceButtonWrapper.style.cssText = `
      display: flex;
      align-items: center;
      flex-shrink: 0;
      margin-left: auto;
      height: 20px;
    `;
    
    appearanceButtonWrapper.appendChild(appearanceButton);

    buttonsContainer.appendChild(plusButton);
    buttonsContainer.appendChild(dropdownButton);
    navList.appendChild(buttonsContainer);
    navList.appendChild(appearanceButtonWrapper);
  }, [
    filteredTabs, 
    activeTabIndex, 
    wslDistributions, 
    mainFrameHeaderCollapsed, 
    titleBarCollapsed, 
    terminalMenuItems,
    aiClientsEnabled
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Función para crear una nueva pestaña de terminal local independiente
  const createLocalTerminalTab = (terminalType, distroInfo = null) => {
    if (terminalType === 'claude') {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        if (cfg.claude !== true) {
          window.alert('Claude Code está desactivado. Actívalo en Configuración -> Clientes de IA.');
          return;
        }
      } catch {
        window.alert('Claude Code está desactivado. Actívalo en Configuración -> Clientes de IA.');
        return;
      }
    }

    if (terminalType === 'opencode') {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        if (cfg.opencode !== true) {
          window.alert('OpenCode está desactivado. Actívalo en Configuración -> Clientes de IA.');
          return;
        }
      } catch {
        window.alert('OpenCode está desactivado. Actívalo en Configuración -> Clientes de IA.');
        return;
      }
    }

    if (terminalType === 'geminicli') {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        if (cfg.geminicli !== true) {
          window.alert('Gemini CLI está desactivado. Actívalo en Configuración -> Clientes de IA.');
          return;
        }
      } catch {
        window.alert('Gemini CLI está desactivado. Actívalo en Configuración -> Clientes de IA.');
        return;
      }
    }

    if (terminalType === 'codexcli') {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        if (cfg.codexcli !== true) {
          window.alert('Codex CLI está desactivado. Actívalo en Configuración -> Clientes de IA.');
          return;
        }
      } catch {
        window.alert('Codex CLI está desactivado. Actívalo en Configuración -> Clientes de IA.');
        return;
      }
    }

    if (terminalType === 'antigravitycli') {
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        if (cfg.antigravitycli !== true) {
          window.alert('Antigravity CLI está desactivado. Actívalo en Configuración -> Clientes de IA.');
          return;
        }
      } catch {
        window.alert('Antigravity CLI está desactivado. Actívalo en Configuración -> Clientes de IA.');
        return;
      }
    }

    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: activeTabIndex
      }));
      setActiveGroupId(null);
    }

    setSshTabs(prevTabs => {
      const nowTs = Date.now();
      // Usar formato simple con contador alto para evitar colisiones: tab-1000, tab-1001, etc.
      const tabId = `tab-${localTerminalCounterRef.current}`;
      localTerminalCounterRef.current += 1;

      // Registrar eventos para el nuevo tab en el backend de Electron
      if (window.electron) {
        window.electron.ipcRenderer.send('register-tab-events', tabId);
      }

      // Determinar el label según el tipo de terminal
      let label = 'Terminal';
      let finalTerminalType = terminalType;
      let tabType = 'local-terminal';
      let finalDistroInfo = distroInfo;

      // Si no vino distroInfo, intentar resolver distribución WSL por nombre/label directo usando ref (estado más fresco)
      if (!finalDistroInfo && terminalType !== 'claude' && terminalType !== 'opencode' && terminalType !== 'geminicli' && terminalType !== 'codexcli' && terminalType !== 'antigravitycli' && !terminalType.startsWith('docker-')) {
        const distros = wslDistributionsRef.current || [];
        const distro = distros.find(d =>
          d.name === terminalType ||
          d.label === terminalType ||
          d.name?.toLowerCase?.() === terminalType.toLowerCase() ||
          d.label?.toLowerCase?.() === terminalType.toLowerCase()
        );
        if (distro) {
          finalDistroInfo = distro;
        }
      }

      // PRIMERO: Comprobar si es Docker (ANTES de distroInfo)
      if (terminalType.startsWith('docker-')) {
        // Es un contenedor Docker
        const containerName = terminalType.substring(7); // Quitar 'docker-' del inicio
        label = `🐳 ${containerName}`;
        tabType = 'docker';
        finalTerminalType = 'docker';
        finalDistroInfo = {
          containerName: containerName,
          containerId: distroInfo?.dockerContainer?.id,
          shortId: distroInfo?.dockerContainer?.shortId
        };
      } else if (finalDistroInfo) {
        // Si hay distroInfo, usamos sus datos (resuelto arriba o pasado explícitamente)
        label = finalDistroInfo.label;
        finalTerminalType = finalDistroInfo.category === 'ubuntu' ? 'ubuntu' : (finalDistroInfo.category === 'debian' ? 'debian' : 'wsl-distro');
      } else {
        // Si no hay distroInfo, usar lógica anterior
        switch (terminalType) {
          case 'powershell':
            label = 'PowerShell';
            break;
          case 'claude':
            label = 'Claude Code';
            finalTerminalType = 'claude';
            break;
          case 'opencode':
            label = 'OpenCode';
            finalTerminalType = 'opencode';
            break;
          case 'geminicli':
            label = 'Gemini CLI';
            finalTerminalType = 'geminicli';
            break;
          case 'codexcli':
            label = 'Codex CLI';
            finalTerminalType = 'codexcli';
            break;
          case 'antigravitycli':
            label = 'Antigravity CLI';
            finalTerminalType = 'antigravitycli';
            break;
          case 'wsl':
            label = 'WSL';
            break;
          case 'wsl-ubuntu':
            label = 'Ubuntu 24.04';
            finalTerminalType = 'ubuntu';
            break;
          case 'wsl-ubuntu-old':
            label = 'Ubuntu';
            finalTerminalType = 'ubuntu';
            break;
          case 'wsl-kali':
            label = 'Kali Linux';
            finalTerminalType = 'wsl-distro';
            break;
          case 'wsl-debian':
            label = 'Debian';
            finalTerminalType = 'wsl-distro';
            break;
          case 'linux-terminal':
            label = 'Terminal';
            break;
          case 'cygwin':
            label = 'Cygwin';
            break;
          default:
            label = 'Terminal';
        }
      }

      const newTab = {
        key: tabId,
        label: label,
        type: tabType,
        terminalType: finalTerminalType,
        distroInfo: finalDistroInfo, // Información completa de la distribución o Docker
        createdAt: nowTs,
        groupId: null
      };

      // Activar como última abierta (índice 1) y registrar orden de apertura
      setLastOpenedTabKey(tabId);
      setOnCreateActivateTabKey(tabId);
      // Actualizar el orden de pestañas explícito para asegurar que aparezca en el índice 1
      if (setOpenTabOrder) {
        setOpenTabOrder(prev => [tabId, ...prev.filter(k => k !== tabId)]);
      }
      setActiveTabIndex(1);
      setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));

      // Actualizar el último tipo de terminal local usado
      let typeToStore;
      if (finalTerminalType === 'ubuntu' || finalTerminalType === 'wsl-distro') {
        // Para distribuciones específicas, reconstruir el tipo correcto
        if (distroInfo && distroInfo.name) {
          typeToStore = `wsl-${distroInfo.name}`; // ej: 'wsl-ubuntu'
        } else {
          typeToStore = 'wsl'; // fallback
        }
      } else {
        typeToStore = finalTerminalType; // ej: 'powershell', 'wsl'
      }

      setLastLocalTerminalType(typeToStore);
      lastLocalTerminalTypeRef.current = typeToStore; // Actualizar la referencia también

      return [newTab, ...prevTabs];
    });
  };

  // Actualizar la referencia
  createLocalTerminalTabRef.current = createLocalTerminalTab;

  // Funciones para controlar el scroll de pestañas
  const checkScrollButtons = () => {
    if (!tabsContainerRef.current) return;

    const container = tabsContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scrollTabs = (direction) => {
    if (!tabsContainerRef.current) return;

    const container = tabsContainerRef.current;
    const scrollAmount = 200; // Píxeles a desplazar
    const newScrollLeft = direction === 'left'
      ? Math.max(0, container.scrollLeft - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount);

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  // Efectos para verificar botones de scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollButtons();
    }, 100);

    return () => clearTimeout(timer);
  }, [filteredTabs]);

  useEffect(() => {
    const handleResize = () => {
      setTimeout(checkScrollButtons, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Efecto para agregar event listener al contenedor de pestañas
  useEffect(() => {
    // Buscar el elemento de navegación de PrimeReact
    const findTabNav = () => {
      const tabNav = document.querySelector('.main-tab-view .p-tabview-nav');
      if (!tabNav) return false;

      tabsContainerRef.current = tabNav;
      tabNav.addEventListener('scroll', checkScrollButtons);
      checkScrollButtons(); // Verificar estado inicial

      return true;
    };

    // Intentar encontrar el elemento con un pequeño delay
    const timer = setTimeout(() => {
      if (!findTabNav()) {
        // Si no se encuentra, intentar de nuevo
        const retryTimer = setTimeout(findTabNav, 500);
        return () => clearTimeout(retryTimer);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (tabsContainerRef.current) {
        tabsContainerRef.current.removeEventListener('scroll', checkScrollButtons);
      }
    };
  }, [filteredTabs]);

  // Ancho fijo para restauración del botón (ancho inicial de la app)
  const FIXED_EXPANDED_SIZE = 18; // 18% - ancho inicial cuando se abre la app
  // Estado de tamaño actual del sidebar (en %), usado cuando está expandido
  const [sidebarSizePercent, setSidebarSizePercent] = React.useState(FIXED_EXPANDED_SIZE);
  const [isTransitioningSidebar, setIsTransitioningSidebar] = React.useState(false);
  const prevCollapsedRef = React.useRef(sidebarCollapsed);
  const hasEverExpandedSplitterRef = React.useRef(!sidebarCollapsed);

  React.useEffect(() => {
    if (prevCollapsedRef.current !== sidebarCollapsed) {
      const wasFirstExpand = !hasEverExpandedSplitterRef.current && !sidebarCollapsed;
      prevCollapsedRef.current = sidebarCollapsed;
      if (!sidebarCollapsed) hasEverExpandedSplitterRef.current = true;

      if (wasFirstExpand) {
        // Primera expansión: sin transición, el panel aparece instantáneamente
        setIsTransitioningSidebar(false);
      } else {
        setIsTransitioningSidebar(true);
        const timer = setTimeout(() => {
          setIsTransitioningSidebar(false);
        }, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [sidebarCollapsed]);

  const splitterDragStateRef = useRef({ isPointerDown: false, hasMoved: false, startX: 0, startY: 0 });
  const SPLITTER_DRAG_THRESHOLD_PX = 3;

  const markSplitterPointerDown = useCallback((event) => {
    splitterDragStateRef.current = {
      isPointerDown: true,
      hasMoved: false,
      startX: event.clientX,
      startY: event.clientY
    };
  }, []);

  useEffect(() => {
    const handleWindowMouseMove = (event) => {
      const dragState = splitterDragStateRef.current;
      if (!dragState.isPointerDown || dragState.hasMoved) return;

      const movedX = Math.abs(event.clientX - dragState.startX);
      const movedY = Math.abs(event.clientY - dragState.startY);
      if (movedX >= SPLITTER_DRAG_THRESHOLD_PX || movedY >= SPLITTER_DRAG_THRESHOLD_PX) {
        dragState.hasMoved = true;
      }
    };

    const handleWindowMouseUp = () => {
      splitterDragStateRef.current.isPointerDown = false;
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);

  // Listener global para capturar drops de nodos SSH desde la sidebar sobre el área de contenido
  React.useEffect(() => {
    // Asegurar que el ref global exista para que Sidebar pueda escribir en él
    if (!window.draggedConnectionNodeRef) {
      window.draggedConnectionNodeRef = { current: null };
    }

    const handleGlobalDrop = (e) => {
      // Verificar tanto el ref SSH antiguo como el nuevo genérico
      const draggedNode = (window.draggedSSHNodeRef && window.draggedSSHNodeRef.current) ||
        (window.draggedConnectionNodeRef && window.draggedConnectionNodeRef.current);

      // Solo procesar si hay un nodo arrastrado y no se procesó ya
      if (draggedNode && !e.defaultPrevented) {
        // Si el drop fue sobre el área de contenido (no sobre el header de la pestaña)
        // usar la pestaña activa actual
        const target = e.target;
        const isOverTabHeader = target.closest('.p-tabview-nav-link') || target.closest('[role="tab"]');

        if (!isOverTabHeader && activeTabIndex !== null && tabHandlers.onTabDrop) {
          // Dropear sobre la pestaña activa
          e.preventDefault();
          e.stopPropagation();
          tabHandlers.onTabDrop(e, activeTabIndex);
        }
      }
    };

    const handleGlobalDragOver = (e) => {
      // Permitir drop si hay un nodo arrastrado y no está sobre el header
      const draggedNode = (window.draggedSSHNodeRef && window.draggedSSHNodeRef.current) ||
        (window.draggedConnectionNodeRef && window.draggedConnectionNodeRef.current);

      if (draggedNode) {
        const target = e.target;
        const isOverTabHeader = target.closest('.p-tabview-nav-link') || target.closest('[role="tab"]');

        if (!isOverTabHeader) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }
    };

    document.addEventListener('drop', handleGlobalDrop, false); // Usar bubble phase para permitir que componentes internos manejen el drop primero
    document.addEventListener('dragover', handleGlobalDragOver, false);

    return () => {
      document.removeEventListener('drop', handleGlobalDrop, false);
      document.removeEventListener('dragover', handleGlobalDragOver, false);
    };
  }, [tabHandlers, activeTabIndex]);


  // Función personalizada para manejar toggle del sidebar
  const handleSidebarToggle = React.useCallback((toggleFunctionOrValue) => {
    // Determinar el nuevo estado
    let newCollapsedState;
    if (typeof toggleFunctionOrValue === 'function') {
      newCollapsedState = toggleFunctionOrValue(sidebarCollapsed);
    } else {
      newCollapsedState = toggleFunctionOrValue;
    }

    // Si se expande por botón, restaurar tamaño fijo
    if (newCollapsedState === false) {
      setSidebarSizePercent(FIXED_EXPANDED_SIZE);
    }
    // Proceder con el cambio de estado
    setSidebarCollapsed(newCollapsedState);
  }, [sidebarCollapsed, setSidebarCollapsed, FIXED_EXPANDED_SIZE]);

  // Umbral en píxeles: por debajo de esto la sidebar se replegará sola al soltar
  const SIDEBAR_COLLAPSE_THRESHOLD_PX = 100;
  const SIDEBAR_EXPAND_THRESHOLD_PX = 60;
  // Ancho fijo cuando está colapsada (IconRail 48px + 8px margen izquierdo)
  const SIDEBAR_COLLAPSED_WIDTH_PX = 56;

  const handleResizeOnly = () => {
    // Sin lógica durante el arrastre; el colapso se aplica al soltar en handleResizeEndWithAutoCollapse
  };

  // Al soltar el mouse: guardar tamaño y replegar/expandir según umbrales
  const handleResizeEndWithAutoCollapse = (e) => {
    const hasRealDrag = splitterDragStateRef.current.hasMoved;
    splitterDragStateRef.current.isPointerDown = false;
    splitterDragStateRef.current.hasMoved = false;

    const splitterElement = document.querySelector('.main-splitter');
    if (splitterElement) {
      const splitterWidth = splitterElement.offsetWidth;
      const sidebarPercentage = e.sizes[0];
      const sidebarWidthPx = (splitterWidth * sidebarPercentage) / 100;

      setSidebarSizePercent(sidebarPercentage);

      if (!sidebarCollapsed && hasRealDrag && sidebarWidthPx <= SIDEBAR_COLLAPSE_THRESHOLD_PX) {
        requestAnimationFrame(() => setSidebarCollapsed(true));
      } else if (sidebarCollapsed && hasRealDrag && sidebarWidthPx > SIDEBAR_EXPAND_THRESHOLD_PX) {
        requestAnimationFrame(() => {
          setSidebarSizePercent(sidebarPercentage);
          setSidebarCollapsed(false);
        });
      }
    }

    if (handleResize) handleResize(e);
  };

  // Aplicar ancho actual del sidebar; cuando está colapsada forzar siempre el mismo ancho (como el botón)
  React.useEffect(() => {
    const splitterElement = document.querySelector('.main-splitter');
    if (!splitterElement) return;
    const panels = splitterElement.querySelectorAll('.p-splitter-panel');
    if (!panels || panels.length === 0) return;

    const leftPanel = panels[0];

    if (!sidebarCollapsed) {
      try {
        leftPanel.style.flex = '';
        leftPanel.style.flexBasis = `${sidebarSizePercent}%`;
        leftPanel.style.width = '';
        leftPanel.style.minWidth = '';
        leftPanel.style.maxWidth = '';
      } catch { }
    } else {
      // Colapsado: mismo ancho que al colapsar con el botón (evita que quede más estrecha por arrastre)
      const applyCollapsedWidth = () => {
        const panel = document.querySelector('.main-splitter .p-splitter-panel:first-child');
        if (!panel) return;
        const w = `${SIDEBAR_COLLAPSED_WIDTH_PX}px`;
        panel.style.flex = `0 0 ${w}`;
        panel.style.flexBasis = w;
        panel.style.width = w;
        panel.style.minWidth = w;
        panel.style.maxWidth = w;
      };
      try {
        applyCollapsedWidth();
        // Reaplicar en el siguiente frame por si el splitter sobrescribe (p. ej. al colapsar por arrastre)
        const raf = requestAnimationFrame(() => {
          applyCollapsedWidth();
        });
        return () => cancelAnimationFrame(raf);
      } catch { }
    }
  }, [sidebarCollapsed, sidebarSizePercent]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', width: '100%', background: 'var(--ui-sidebar-bg, #0a0f1f)' }}>
      <Splitter
        style={{ height: '100%', width: '100%', background: 'var(--ui-sidebar-bg, #0a0f1f)' }}
        onResizeEnd={handleResizeEndWithAutoCollapse}
        onResize={handleResizeOnly} // Sin colapso durante arrastre
        disabled={false}
        className={`main-splitter ${isTransitioningSidebar ? 'main-splitter-transitioning' : ''}`}
        pt={{
          gutter: {
            onMouseDown: markSplitterPointerDown,
            style: {
              width: '4px',
              background: 'transparent',
              zIndex: 100
            }
          }
        }}
      >
        <SplitterPanel
          size={isMinimalMode ? 0 : (sidebarCollapsed ? 5 : 15)}
          minSize={isMinimalMode ? 0 : (sidebarCollapsed ? 5 : 5)}
          maxSize={isMinimalMode ? 0 : (sidebarCollapsed ? 5 : 35)}
          className="terminal-frame-container"
          style={isMinimalMode
            ? { display: 'none', width: 0, minWidth: 0, maxWidth: 0, padding: 0, overflow: 'hidden' }
            : sidebarCollapsed
              ? { width: SIDEBAR_COLLAPSED_WIDTH_PX, minWidth: SIDEBAR_COLLAPSED_WIDTH_PX, maxWidth: SIDEBAR_COLLAPSED_WIDTH_PX, padding: '8px 0 8px 8px', height: '100%', transition: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--ui-sidebar-bg, #0a0f1f)' }
              : { padding: '8px 2px 8px 8px', height: '100%', transition: 'none', display: 'flex', flexDirection: 'column' }
          }
        >
          <TerminalFrame
            className={sidebarCollapsed ? 'sidebar-collapsed' : ''}
            showControls={false}
            hideHeader={mainFrameHeaderCollapsed}
          >
            <Sidebar
              {...memoizedSidebarProps}
              onOpenFileExplorer={handleSidebarOpenFileExplorer}
              setSidebarCollapsed={handleSidebarToggle}
              sidebarCollapsed={sidebarCollapsed}
              isTransitioningSidebar={isTransitioningSidebar}
            />
          </TerminalFrame>
        </SplitterPanel>

        <SplitterPanel
          size={(isMinimalMode || !sidebarVisible) ? 100 : 85}
          className="terminal-frame-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            width: '100%',
            height: '100%',
            padding: isMinimalMode ? '0' : '8px 8px 8px 2px',
            background: 'transparent'
          }}
        >
          <TerminalFrame
            className={`main-content-frame ${mainFrameHeaderCollapsed ? 'main-content-frame--header-collapsed' : ''}`}
            contentClassName="main-content-frame-content"
            isDraggable={titleBarCollapsed || isMinimalMode}
            hideHeader={mainFrameHeaderCollapsed || isMinimalMode}
            showFloatingHeaderExtra={false}
            title={
              <div
                className="main-content-frame-title"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  pointerEvents: 'auto',
                  WebkitAppRegion: 'no-drag',
                }}
              >
                {frameSearchOpen ? (
                  <ConnectionSearchBar
                    variant="main-frame"
                    sidebarFilter={sidebarFilter}
                    setSidebarFilter={setSidebarFilter}
                    allNodes={allNodes}
                    findAllConnections={findAllConnections}
                    onOpenSSHConnection={onOpenSSHConnection}
                    onOpenRdpConnection={onOpenRdpConnection}
                    onOpenVncConnection={onOpenVncConnection}
                    openEditSSHDialog={openEditSSHDialog}
                    openEditRdpDialog={openEditRdpDialog}
                    expandedKeys={expandedKeys}
                    masterKey={masterKey}
                    secureStorage={secureStorage}
                    iconTheme={iconTheme}
                    autoFocus
                    onRequestClose={handleFrameSearchClose}
                  />
                ) : (
                  <>
                    <span style={{ fontWeight: 'bold', color: 'var(--ui-titlebar-text, #fff)' }}>NodeTerm</span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span style={{ opacity: 0.9 }}>~/sessions</span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <button
                      type="button"
                      title="Buscar conexiones"
                      aria-label="Buscar conexiones"
                      onClick={() => setFrameSearchOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        padding: 0,
                        border: 'none',
                        borderRadius: 6,
                        background: 'transparent',
                        color: 'var(--ui-sidebar-text, #a9b1d6)',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease, color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = 'var(--ui-titlebar-text, #fff)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--ui-sidebar-text, #a9b1d6)';
                      }}
                    >
                      <FaSearch size={12} />
                    </button>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span style={{ color: '#81c784', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      {(activeIds && typeof activeIds.size === 'number') ? activeIds.size : 0} sessions
                    </span>
                  </>
                )}
              </div>
            }
            headerExtra={null}
          >
            {(homeTabs.length > 0 || sshTabs.length > 0 || fileExplorerTabs.length > 0) ? (
              <div style={{
                width: '100%',
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                height: '100%',
                background: isHomeTabActive ? 'var(--ui-content-bg, #1a1b26)' : undefined
              }}>
                {/* Barra de grupos como TabView scrollable */}
                {renderGroupTabs()}

                <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                  {/* Solo mostrar TabView de pestañas si el grupo no está vacío */}
                  {!(activeGroupId !== null && getTabsInGroup(activeGroupId).length === 0) && (
                    <div style={{ position: 'relative' }}>
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
                        scrollable={true}
                        className={`main-tab-view ${homeButtonLocked ? 'home-locked' : 'home-unlocked'}`}
                        pt={{
                          navContainer: {
                            ref: tabsContainerRef,
                            style: {
                              '--home-tab-theme-bg': 'var(--ui-content-bg, #1a1b26)',
                              borderBottom: 'none',
                              opacity: 1.0,
                              WebkitAppRegion: (titleBarCollapsed && mainFrameHeaderCollapsed) ? 'drag' : 'inherit'
                            }
                          },
                          nav: {
                            style: (titleBarCollapsed && mainFrameHeaderCollapsed) ? { WebkitAppRegion: 'drag' } : {}
                          },
                          navcontent: {
                            style: (titleBarCollapsed && mainFrameHeaderCollapsed) ? { WebkitAppRegion: 'drag' } : {}
                          }
                        }}
                      >
                        {filteredTabs.map((tab, idx) => {
                          // Con las pestañas híbridas, todas las pestañas visibles están en el contexto home, SSH o explorer
                          // OJO: como reordenamos virtualmente (pin a índice 1), no podemos fiarnos de idx
                          const isHomeTab = tab.type === TAB_TYPES.HOME;
                          const isSSHTab = tab.type === TAB_TYPES.TERMINAL || tab.type === TAB_TYPES.SPLIT || tab.isExplorerInSSH;
                          const originalIdx = idx; // No usamos originalIdx para decisiones críticas

                          return (
                            <TabPanel
                              key={tab.key}
                              header={tab.label}
                              headerClassName={isHomeTab ? 'home-tab' : ''}
                              headerTemplate={(options) => (
                                <TabHeader
                                  // Props de PrimeReact
                                  className={`${options.className} ${isHomeTab ? 'home-tab' : ''}`}
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
                                  isDragging={memoizedTabProps.draggedTabIndex === idx}
                                  isDragOver={dragOverTabIndex === idx}
                                  dragStartTimer={memoizedTabProps.dragStartTimer}
                                  draggedTabIndex={memoizedTabProps.draggedTabIndex}

                                  // Props de iconos
                                  tabDistros={memoizedTabProps.tabDistros}

                                  // Event handlers (memoizados)
                                  onTabDragStart={tabHandlers.onTabDragStart}
                                  onTabDragOver={tabHandlers.onTabDragOver}
                                  onTabDragLeave={tabHandlers.onTabDragLeave}
                                  onTabDrop={tabHandlers.onTabDrop}
                                  onTabDragEnd={tabHandlers.onTabDragEnd}
                                  onTabContextMenu={tabHandlers.onTabContextMenu}
                                  onTabClose={tabHandlers.onTabClose}
                                  isDraggable={titleBarCollapsed && mainFrameHeaderCollapsed}
                                />
                              )}
                            />
                          );
                        })}
                      </TabView>

                      {/* Flecha izquierda */}
                      {canScrollLeft && (
                        <Button
                          icon="pi pi-chevron-left"
                          className="p-button-text p-button-sm tab-nav-arrow"
                          style={{
                            position: 'absolute',
                            left: '4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 1000,
                            color: 'var(--ui-tab-text) !important',
                            padding: '2px',
                            minWidth: '16px',
                            width: '16px',
                            height: '16px',
                            fontSize: '8px',
                            background: 'rgba(0, 0, 0, 0.3) !important',
                            border: 'none !important',
                            borderRadius: '2px',
                            opacity: 0.9,
                            transition: 'opacity 0.2s ease'
                          }}
                          pt={{
                            root: {
                              style: {
                                color: 'var(--ui-tab-text) !important',
                                background: 'rgba(0, 0, 0, 0.3) !important',
                                border: 'none !important',
                                WebkitAppRegion: (titleBarCollapsed && mainFrameHeaderCollapsed) ? 'no-drag' : 'inherit'
                              }
                            },
                            icon: {
                              style: {
                                color: 'var(--ui-tab-text) !important'
                              }
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.opacity = '0.9';
                          }}
                          onClick={() => scrollTabs('left')}
                          aria-label="Desplazar pestañas a la izquierda"
                          title="Desplazar pestañas a la izquierda"
                        />
                      )}

                      {/* Flecha derecha */}
                      {canScrollRight && (
                        <Button
                          icon="pi pi-chevron-right"
                          className="p-button-text p-button-sm tab-nav-arrow"
                          style={{
                            position: 'absolute',
                            right: '4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 1000,
                            color: 'var(--ui-tab-text) !important',
                            padding: '2px',
                            minWidth: '16px',
                            width: '16px',
                            height: '16px',
                            fontSize: '8px',
                            background: 'rgba(0, 0, 0, 0.3) !important',
                            border: 'none !important',
                            borderRadius: '2px',
                            opacity: 0.9,
                            transition: 'opacity 0.2s ease'
                          }}
                          pt={{
                            root: {
                              style: {
                                color: 'var(--ui-tab-text) !important',
                                background: 'rgba(0, 0, 0, 0.3) !important',
                                border: 'none !important',
                                WebkitAppRegion: (titleBarCollapsed && mainFrameHeaderCollapsed) ? 'no-drag' : 'inherit'
                              }
                            },
                            icon: {
                              style: {
                                color: 'var(--ui-tab-text) !important'
                              }
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.opacity = '0.9';
                          }}
                          onClick={() => scrollTabs('right')}
                          aria-label="Desplazar pestañas a la derecha"
                          title="Desplazar pestañas a la derecha"
                        />
                      )}

                      {/* ContextMenu para seleccionar tipo de terminal */}
                      <ContextMenu
                        ref={terminalSelectorMenuRef}
                        className="context-menu-themed"
                        model={terminalMenuItems}
                      />
                    </div>
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
                    handleToggleBroadcast={handleToggleBroadcast}
                    handleToggleBroadcastTarget={handleToggleBroadcastTarget}
                    getAllTabs={getAllTabs}
                  />

                  <TerminalContextMenu
                    terminalContextMenu={terminalContextMenu}
                    setTerminalContextMenu={setTerminalContextMenu}
                    onCopy={handleCopyFromTerminalWrapper}
                    onPaste={handlePasteToTerminalWrapper}
                    onSelectAll={handleSelectAllTerminalWrapper}
                    onClear={handleClearTerminalWrapper}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                    isRecording={terminalContextMenu ? isRecordingTab(terminalContextMenu.tabKey) : false}
                    handleToggleBroadcast={handleToggleBroadcast}
                    handleToggleBroadcastTarget={handleToggleBroadcastTarget}
                    getAllTabs={getAllTabs}
                    onShowSystemMonitor={(tabKey) => setSshSystemMonitorTabId(tabKey)}
                    onShowFileExplorer={(tabKey) => setSshFileExplorerTabId(tabKey)}
                    openInSplit={openInSplit}
                    isSSHSession={terminalContextMenu ? (() => {
                      const allT = getAllTabs ? getAllTabs() : [];
                      const tab = allT.find(t => t.key === terminalContextMenu.tabKey);
                      return tab ? (tab.type === 'terminal' || tab.type === TAB_TYPES.TERMINAL || tab.type === 'local-terminal') : false;
                    })() : false}
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
                  background: isHomeTabActive ? 'var(--ui-content-bg, #1a1b26)' : undefined
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
                  {(() => {
                    const terminalTheme = memoizedContentRendererProps?.terminalTheme;
                    return [...homeTabs, ...sshTabs, ...rdpTabs, ...guacamoleTabs, ...fileExplorerTabs].map((tab) => {
                      const isInActiveGroup = filteredTabs.some(filteredTab => filteredTab.key === tab.key);
                      const tabIndexInActiveGroup = filteredTabs.findIndex(filteredTab => filteredTab.key === tab.key);
                      const isActiveTab = isInActiveGroup && tabIndexInActiveGroup === activeTabIndex;

                      return (
                        <div
                          key={tab.key}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            visibility: isActiveTab ? 'visible' : 'hidden',
                            zIndex: isActiveTab ? 1 : 0,
                            pointerEvents: isActiveTab ? 'auto' : 'none',
                            background: (tab.type === TAB_TYPES.HOME && isActiveTab) ? 'var(--ui-content-bg, #1a1b26)' : 'transparent'
                          }}
                        >
                          <TabContentRenderer
                            tab={tab}
                            isActiveTab={isActiveTab}
                            // Props memoizadas
                            {...memoizedContentRendererProps}
                            settingsTabProps={settingsTabProps}
                            isMinimalMode={isMinimalMode}
                            // Terminal props (específicas)
                            sshStatsByTabId={sshStatsByTabId}
                            getAllTabs={getAllTabs}
                            // Nuevos manejadores para Quick Actions
                            onStartRecording={handleStartRecording}
                            onStopRecording={handleStopRecording}
                            isRecordingTab={isRecordingTab}
                            onShowSystemMonitor={(tabKey) => setSshSystemMonitorTabId(tabKey)}
                            onShowFileExplorer={(tabKey) => setSshFileExplorerTabId(tabKey)}
                            onToggleBroadcast={handleToggleBroadcast}
                          />
                          {/* SSH System Monitor: right-side panel inside per-tab absolute div */}
                          {(tab.type === 'terminal' || tab.type === 'local-terminal') && sshSystemMonitorTabId === tab.key && (
                            <SSHSystemMonitorPanel
                              tabId={tab.key}
                              tab={tab}
                              stats={sshStatsByTabId?.[tab.key] || {}
                              }
                              onClose={() => setSshSystemMonitorTabId(null)}
                            />
                          )}

                          {/* SSH File Explorer: right-side panel inside per-tab absolute div */}
                          {tab.type === 'terminal' && sshFileExplorerTabId === tab.key && (
                            <SSHFileExplorerPanel
                              tabId={tab.key}
                              tab={tab}
                              sshConfig={tab.sshConfig}
                              onClose={() => setSshFileExplorerTabId(null)}
                            />
                          )}
                        </div>
                      );
                    });
                  })()}
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
          </TerminalFrame>
        </SplitterPanel>
      </Splitter>


      {/* Context Menu para el árbol de la sidebar */}
      <ContextMenu
        ref={treeContextMenuRef}
        model={isGeneralTreeMenu ? getGeneralTreeContextMenuItems() : getTreeContextMenuItems(selectedNode)}
        breakpoint="767px"
      />
    </div>
  );
};

export default MainContentArea;
