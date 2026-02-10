import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import { ContextMenu } from 'primereact/contextmenu';
import { Button } from 'primereact/button';
import { FaWindows, FaUbuntu, FaLinux, FaRedhat, FaCentos, FaFedora } from 'react-icons/fa';
import { SiDebian, SiDocker } from 'react-icons/si';
import Sidebar from './Sidebar';
import TabHeader from './TabHeader';
import TabContentRenderer from './TabContentRenderer';
import TabContextMenu from './contextmenus/TabContextMenu';
import TerminalContextMenu from './contextmenus/TerminalContextMenu';
import OverflowMenu from './contextmenus/OverflowMenu';
import { TAB_TYPES } from '../utils/constants';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

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
  sshStatsByTabId,

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
  treeContextMenuRef
}) => {
  // Estados para las flechas de navegación de pestañas
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsContainerRef = useRef(null);

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
    console.log('Todas las pestañas (estado actual):', allTabs.map(tab => ({ key: tab.key, type: tab.type, terminalType: tab.terminalType, label: tab.label })));

    // Buscar la última pestaña de terminal local (tipo 'local-terminal')
    const localTerminalTabs = allTabs.filter(tab => tab.type === 'local-terminal');
    console.log('Pestañas de terminal local encontradas:', localTerminalTabs.length);

    if (localTerminalTabs.length > 0) {
      // Ordenar por fecha de creación y tomar la más reciente
      const lastLocalTab = localTerminalTabs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      console.log('Última pestaña local:', lastLocalTab);

      if (lastLocalTab.terminalType === 'ubuntu' || lastLocalTab.terminalType === 'wsl-distro') {
        // Si tiene información de distribución específica, usar esa distribución
        if (lastLocalTab.distroInfo && lastLocalTab.distroInfo.name) {
          console.log('Usando distribución específica:', `wsl-${lastLocalTab.distroInfo.name}`);
          return `wsl-${lastLocalTab.distroInfo.name}`;
        }
        console.log('Usando WSL genérico');
        return 'wsl'; // Fallback a WSL genérico
      }
      console.log('Usando tipo de terminal:', lastLocalTab.terminalType || 'powershell');
      return lastLocalTab.terminalType || 'powershell';
    }

    // Si no hay terminales locales, usar el último tipo guardado
    console.log('No hay terminales locales, usando último tipo guardado:', lastLocalTerminalType);
    return lastLocalTerminalType;
  };

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
  const [homeButtonLocked, setHomeButtonLocked] = useState(() => {
    return localStorage.getItem('lock_home_button') === 'true';
  });

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
        setHomeButtonLocked(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(() => {
      const currentValue = localStorage.getItem('lock_home_button') === 'true';
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
      console.log('Recibido evento create-local-terminal:', { terminalType, distroInfo });
      createLocalTerminalTab(terminalType, distroInfo);
    };

    window.addEventListener('create-local-terminal', handleCreateLocalTerminal);

    return () => {
      window.removeEventListener('create-local-terminal', handleCreateLocalTerminal);
    };
  }, []);

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


  // Estado para controlar la visibilidad de las opciones de clientes de IA
  const [aiClientsEnabled, setAiClientsEnabled] = React.useState({
    nodeterm: true,
    anythingllm: false,
    openwebui: false
  });

  // Cargar configuración de clientes de IA desde localStorage
  React.useEffect(() => {
    const loadAIClientsConfig = () => {
      try {
        const config = localStorage.getItem('ai_clients_enabled');
        if (config) {
          const parsed = JSON.parse(config);
          setAiClientsEnabled({
            nodeterm: parsed.nodeterm === true, // Solo activo si está explícitamente configurado
            anythingllm: parsed.anythingllm === true,
            openwebui: parsed.openwebui === true
          });
        } else {
          // Si no hay configuración, todos desactivados por defecto
          setAiClientsEnabled({
            nodeterm: false,
            anythingllm: false,
            openwebui: false
          });
        }
      } catch (error) {
        console.error('[MainContentArea] Error al cargar configuración de clientes IA:', error);
      }
    };

    // Cargar al montar
    loadAIClientsConfig();

    // Escuchar cambios
    const handleConfigChange = () => {
      loadAIClientsConfig();
    };
    window.addEventListener('ai-clients-config-changed', handleConfigChange);

    return () => {
      window.removeEventListener('ai-clients-config-changed', handleConfigChange);
    };
  }, []);

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

    if (platform === 'win32') {
      const menuItems = [
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
          label: 'WSL',
          icon: getTerminalMenuIcon('wsl'),
          command: () => {
            setLastLocalTerminalType('wsl');
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current('wsl');
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

      // Agregar distribuciones WSL detectadas dinámicamente
      if (wslDistributions && wslDistributions.length > 0) {
        wslDistributions.forEach(distro => {
          const terminalType = distro.category === 'ubuntu' ? 'ubuntu' : (distro.category ? `wsl-${distro.category}` : 'wsl');
          menuItems.push({
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

      // Agregar contenedores Docker si están disponibles como submenu
      if (dockerContainers && dockerContainers.length > 0) {
        const dockerSubItems = dockerContainers.map(container => ({
          label: container.name,
          icon: getTerminalMenuIcon('docker', null, container.name),
          command: () => {
            setLastLocalTerminalType(`docker-${container.name}`);
            if (createLocalTerminalTabRef.current) {
              createLocalTerminalTabRef.current(`docker-${container.name}`, { dockerContainer: container });
            }
          }
        }));

        menuItems.push({
          label: '🐳 Docker',
          icon: getTerminalMenuIcon('docker'),
          items: dockerSubItems
        });
      }

      // Agregar AI Chat al final - Solo si está activado
      if (aiClientsEnabled.nodeterm) {
        menuItems.push({
          label: 'AI Chat',
          icon: 'pi pi-comments',
          command: () => {
            // Crear nueva pestaña de IA
            const tabId = `ai-chat-${Date.now()}`;
            const newAITab = {
              key: tabId,
              label: 'Chat IA',
              type: 'ai-chat',
              createdAt: Date.now(),
              groupId: null
            };

            // Disparar evento para crear la pestaña
            window.dispatchEvent(new CustomEvent('create-ai-tab', {
              detail: { tab: newAITab }
            }));
          }
        });
      }
      // AnythingLLM - Solo si está activado
      if (aiClientsEnabled.anythingllm) {
        menuItems.push({
          label: 'AnythingLLM',
          icon: 'pi pi-box',
          command: () => {
            dispatchAnythingLLMTab();
          }
        });
      }
      // OpenWebUI - Solo si está activado
      if (aiClientsEnabled.openwebui) {
        menuItems.push({
          label: 'Open WebUI',
          icon: 'pi pi-globe',
          command: () => {
            dispatchOpenWebUITab();
          }
        });
      }

      setTerminalMenuItems(menuItems);
    } else {
      const linuxMenuItems = [
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

      // Agregar AI Chat al final - Solo si está activado
      if (aiClientsEnabled.nodeterm) {
        linuxMenuItems.push({
          label: 'AI Chat',
          icon: 'pi pi-comments',
          command: () => {
            // Crear nueva pestaña de IA
            const tabId = `ai-chat-${Date.now()}`;
            const newAITab = {
              key: tabId,
              label: 'Chat IA',
              type: 'ai-chat',
              createdAt: Date.now(),
              groupId: null
            };

            // Disparar evento para crear la pestaña
            window.dispatchEvent(new CustomEvent('create-ai-tab', {
              detail: { tab: newAITab }
            }));
          }
        });
      }
      // AnythingLLM - Solo si está activado
      if (aiClientsEnabled.anythingllm) {
        linuxMenuItems.push({
          label: 'AnythingLLM',
          icon: 'pi pi-box',
          command: () => {
            dispatchAnythingLLMTab();
          }
        });
      }
      // OpenWebUI - Solo si está activado
      if (aiClientsEnabled.openwebui) {
        linuxMenuItems.push({
          label: 'Open WebUI',
          icon: 'pi pi-globe',
          command: () => {
            dispatchOpenWebUITab();
          }
        });
      }

      setTerminalMenuItems(linuxMenuItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wslDistributions, dockerContainers, dispatchAnythingLLMTab, dispatchOpenWebUITab, aiClientsEnabled]);

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

  // Efecto para añadir botones después de las pestañas usando DOM
  useEffect(() => {
    const navContainer = tabsContainerRef.current;
    if (!navContainer) return;

    const navList = navContainer.querySelector('.p-tabview-nav');
    if (!navList) return;

    // Eliminar botones existentes si los hay para recrearlos
    const existingButtons = navList.querySelector('.local-terminal-buttons');
    if (existingButtons) {
      existingButtons.remove();
    }

    // Crear contenedor de botones
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'local-terminal-buttons';
    buttonsContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 3px;
      margin-left: 4px;
      margin-right: 2px;
      flex-shrink: 0;
      height: 26px;
      padding-bottom: 0;
      box-sizing: border-box;
    `;

    // Botón +
    const plusButton = document.createElement('button');
    plusButton.innerHTML = '<i class="pi pi-plus"></i>';
    plusButton.className = 'p-button p-button-text p-button-sm tab-action-button';
    plusButton.style.cssText = `
      padding: 0 !important;
      width: 18px !important;
      min-width: 18px !important;
      max-width: 18px !important;
      height: 18px !important;
      min-height: 18px !important;
      max-height: 18px !important;
      font-size: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-sizing: border-box !important;
    `;

    plusButton.title = 'Nueva terminal local';
    plusButton.addEventListener('click', () => {
      // Usar la configuración guardada; si no existe, último tipo local; luego fallback por plataforma
      const storedDefault = localStorage.getItem('nodeterm_default_local_terminal');
      const lastType = lastLocalTerminalTypeRef.current;
      const fallbackDefault = getDefaultTerminalFromConfig();
      let terminalTypeToUse = storedDefault || lastType || fallbackDefault;
      console.log('Botón + presionado (barra superior). Tipo base:', terminalTypeToUse);

      // Helper para localizar distro WSL por nombre/label (con o sin prefijo wsl-)
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

      // Resolver docker o distro antes de crear
      if (terminalTypeToUse.startsWith('docker-')) {
        const containerName = terminalTypeToUse.replace('docker-', '');
        const container = dockerContainers.find(c => c.name === containerName);
        if (container) {
          createLocalTerminalTab(terminalTypeToUse, { dockerContainer: container });
          return;
        }
      }

      const distro = findDistro(terminalTypeToUse);
      if (distro) {
        // Forzar uso de info completa de la distro
        createLocalTerminalTab(distro.name, distro);
      } else {
        createLocalTerminalTab(terminalTypeToUse, null);
      }
    });

    // Botón dropdown
    const dropdownButton = document.createElement('button');
    dropdownButton.innerHTML = '<i class="pi pi-chevron-down"></i>';
    dropdownButton.className = 'p-button p-button-text p-button-sm tab-action-button';
    dropdownButton.style.cssText = `
      padding: 0 !important;
      width: 18px !important;
      min-width: 18px !important;
      max-width: 18px !important;
      height: 18px !important;
      min-height: 18px !important;
      max-height: 18px !important;
      font-size: 9px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-sizing: border-box !important;
    `;

    dropdownButton.title = 'Seleccionar tipo de terminal';
    dropdownButton.addEventListener('click', (e) => {
      terminalSelectorMenuRef.current?.show(e);
    });

    buttonsContainer.appendChild(plusButton);
    buttonsContainer.appendChild(dropdownButton);
    navList.appendChild(buttonsContainer);
  }, [filteredTabs, activeTabIndex, wslDistributions]); // Recrear botones cuando cambien las pestañas o distribuciones

  // Función para crear una nueva pestaña de terminal local independiente
  const createLocalTerminalTab = (terminalType, distroInfo = null) => {
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
      if (!finalDistroInfo && !terminalType.startsWith('docker-')) {
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
        finalTerminalType = finalDistroInfo.category === 'ubuntu' ? 'ubuntu' : 'wsl-distro';
      } else {
        // Si no hay distroInfo, usar lógica anterior
        switch (terminalType) {
          case 'powershell':
            label = 'PowerShell';
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
      if (tabNav) {
        tabsContainerRef.current = tabNav;
        tabNav.addEventListener('scroll', checkScrollButtons);
        checkScrollButtons(); // Verificar estado inicial
        return true;
      }
      return false;
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

  // Función de resize sin colapso automático (para arrastre libre)
  const handleResizeOnly = (e) => {
    // No llamar handleResize durante el arrastre para evitar interferencias
  };

  // Función de colapso automático solo al terminar el arrastre
  const handleResizeEndWithAutoCollapse = (e) => {

    // Calcular ancho real del panel en píxeles
    const splitterElement = document.querySelector('.main-splitter');
    if (splitterElement) {
      const splitterWidth = splitterElement.offsetWidth;
      const sidebarPercentage = e.sizes[0];
      const sidebarWidthPx = (splitterWidth * sidebarPercentage) / 100;

      // Umbrales optimizados para expansión muy fácil
      const collapseThresholdPx = 80;   // Colapsar antes del límite físico
      const expandThresholdPx = 60;     // Expandir muy fácilmente desde colapsado


      // Guardar el tamaño resultante del arrastre
      setSidebarSizePercent(sidebarPercentage);

      // Solo evaluar colapso/expansión al soltar el mouse
      if (!sidebarCollapsed && sidebarWidthPx <= collapseThresholdPx) {
        requestAnimationFrame(() => {
          setSidebarCollapsed(true);
        });
      } else if (sidebarCollapsed && sidebarWidthPx > expandThresholdPx) {
        requestAnimationFrame(() => {
          // Respetar el tamaño arrastrado al expandir
          setSidebarSizePercent(sidebarPercentage);
          setSidebarCollapsed(false);
        });
      }
    }

    // Llamar al resize original solo al final (para redimensionar terminales)
    if (handleResize) {
      handleResize(e);
    }
  };

  // Aplicar ancho actual del sidebar sin remount
  React.useEffect(() => {
    const splitterElement = document.querySelector('.main-splitter');
    if (!splitterElement) return;
    const panels = splitterElement.querySelectorAll('.p-splitter-panel');
    if (!panels || panels.length === 0) return;

    const leftPanel = panels[0];

    if (!sidebarCollapsed) {
      // Expandido: aplicar tamaño actual deseado
      try {
        leftPanel.style.flexBasis = `${sidebarSizePercent}%`;
        leftPanel.style.width = '';
        leftPanel.style.minWidth = '';
        leftPanel.style.maxWidth = '';
      } catch { }
    } else {
      // Colapsado: asegurar anchura mínima visual (alineado con estilos del panel)
      try {
        leftPanel.style.flexBasis = '44px';
      } catch { }
    }
  }, [sidebarCollapsed, sidebarSizePercent]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', width: '100%' }}>
      <Splitter
        style={{ height: '100%', width: '100%' }}
        onResizeEnd={handleResizeEndWithAutoCollapse}
        onResize={handleResizeOnly} // Sin colapso durante arrastre
        disabled={false}
        className="main-splitter"
        pt={{
          gutter: {
            style: {
              transition: 'none', // Clave: sin transición para fluidez
              background: 'transparent', // Línea invisible pero área de detección amplia
              borderColor: 'transparent',
              width: '8px', // Área mucho más amplia para mejor detección
              cursor: 'col-resize', // Asegurar cursor correcto
              margin: '0 -4px' // Centrar el área de detección más amplia
            }
          }
        }}
      >
        <SplitterPanel
          size={sidebarCollapsed ? 4 : sidebarSizePercent}
          minSize={sidebarCollapsed ? 4 : 4}
          maxSize={sidebarCollapsed ? 4 : 35}
          style={sidebarCollapsed
            ? { width: 44, minWidth: 44, maxWidth: 44, padding: 0, height: '100%', transition: 'none', display: 'flex', flexDirection: 'column' }
            : { padding: 0, height: '100%', transition: 'none', display: 'flex', flexDirection: 'column' }
          }
          pt={{
            root: {
              style: {
                minWidth: '44px !important',
                width: 'auto'
              }
            }
          }}
        >
          <Sidebar
            {...memoizedSidebarProps}
            setSidebarCollapsed={handleSidebarToggle}
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
                            borderBottom: '0.5px solid var(--ui-tabgroup-border, #444)',
                            opacity: 1.0
                          }
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
                              border: 'none !important'
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
                              border: 'none !important'
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
                        // Props memoizadas
                        {...memoizedContentRendererProps}
                        // Terminal props (específicas)
                        sshStatsByTabId={sshStatsByTabId}
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
