import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Divider } from 'primereact/divider';
import { getVersionInfo } from '../version-info';
import TabbedTerminal from './TabbedTerminal';
import ConnectionHistory from './ConnectionHistory';
import NodeTermStatus from './NodeTermStatus';
import AIChatWithHistory from './AIChatWithHistory';
import StandaloneStatusBar from './StandaloneStatusBar';
import { uiThemes } from '../themes/ui-themes';
import { themeManager } from '../utils/themeManager';
import { themes } from '../themes';
import { getRecents, onUpdate, getRecentPasswords, subscribeRecents } from '../utils/connectionStore';
import { STORAGE_KEYS } from '../utils/constants';

const HomeTab = ({
  isActiveTab = true,
  onCreateSSHConnection,
  onCreateFolder,
  onOpenFileExplorer,
  onOpenSettings,
  sshConnectionsCount = 0,
  foldersCount = 0,
  rdpConnectionsCount = 0,
  localFontFamily,
  localFontSize,
  localPowerShellTheme,
  localLinuxTerminalTheme,
  onCreateRdpConnection,
  onCreateVncConnection,
  onEditConnection,
  onLoadGroup,
  onOpenSSHTunnel,
  sidebarNodes = null,
  setShowCreateGroupDialog,
  activeIds = new Set(),
  masterKey = null,
  secureStorage = null,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [terminalState, setTerminalState] = useState('normal'); // Estado normal para tamaño correcto
  const [terminalHidden, setTerminalHidden] = useState(() => {
    // Leer configuración desde localStorage, por defecto visible (terminalHidden = false)
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE);
      const isVisible = saved !== null ? saved === 'true' : true; // Por defecto true (visible)
      return !isVisible; // terminalHidden es el inverso de isVisible
    } catch {
      return false; // Por defecto visible
    }
  });
  const [rndSize, setRndSize] = useState({ width: '80%', height: 400 });
  const [rndPosition, setRndPosition] = useState({ x: 50, y: 50 });
  const [isRndInitialized, setIsRndInitialized] = useState(false);
  const [favType, setFavType] = useState('all'); // Nuevo estado para filtros
  const [recentConnections, setRecentConnections] = useState([]); // Estado para conexiones recientes
  const [recentPasswords, setRecentPasswords] = useState([]); // Estado para passwords recientes
  const [showAIChat, setShowAIChat] = useState(false); // Estado para mostrar/ocultar chat de IA
  const [iconThemeKey, setIconThemeKey] = useState(0); // Para forzar re-render cuando cambia el tema de iconos
  const [statusBarVisible, setStatusBarVisible] = useState(() => {
    // Cargar preferencia desde localStorage, por defecto visible
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  }); // Estado para mostrar/ocultar status bar
  const [terminalTitle, setTerminalTitle] = useState('Terminal Local');

  const [rightColumnCollapsed, setRightColumnCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  // Configuración de tipografía de HomeTab
  const [homeTabFont, setHomeTabFont] = useState(() => {
    try {
      return localStorage.getItem('homeTabFont') || localStorage.getItem('sidebarFont') || '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
    } catch {
      return '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
    }
  });
  const [homeTabFontSize, setHomeTabFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem('homeTabFontSize');
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  const versionInfo = getVersionInfo();
  const tabbedTerminalRef = useRef();
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(window.innerHeight - 100);

  // Medir el tamaño real del contenedor
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.offsetHeight);
      }
    };

    updateSize(); // Medición inicial

    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      observer.disconnect();
    };
  }, []);

  // Inicializar Rnd position
  useEffect(() => {
    if (!isRndInitialized && containerHeight > 0 && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const initialWidth = Math.min(containerWidth * 0.8, 1200);
      const initialHeight = Math.min(containerHeight * 0.45, 400);

      setRndSize({ width: initialWidth, height: initialHeight });
      setRndPosition({
        x: (containerWidth - initialWidth) / 2,
        y: containerHeight - initialHeight - 20
      });
      setIsRndInitialized(true);
    }
  }, [containerHeight, isRndInitialized]);

  // Estado para forzar re-render al cambiar el tema
  const [themeVersion, setThemeVersion] = useState(0);

  // Escuchar cambios en el tema (evento global 'theme-changed')
  useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1); // Forzar re-render
    };
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  // Escuchar cambios en el tema de iconos de la Sidebar
  useEffect(() => {
    const handleIconThemeChange = () => {
      // Forzar re-render cuando cambia el tema de iconos
      setIconThemeKey(prev => prev + 1);
    };

    window.addEventListener('storage', handleIconThemeChange);
    window.addEventListener('icon-theme-changed', handleIconThemeChange);

    return () => {
      window.removeEventListener('storage', handleIconThemeChange);
      window.removeEventListener('icon-theme-changed', handleIconThemeChange);
    };
  }, []);

  // Escuchar cambios en la fuente de HomeTab
  useEffect(() => {
    const handleHomeTabFontChange = () => {
      try {
        const newFont = localStorage.getItem('homeTabFont') || localStorage.getItem('sidebarFont') || '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
        const newSize = localStorage.getItem('homeTabFontSize');
        const parsedSize = newSize ? parseInt(newSize, 10) : null;
        setHomeTabFont(newFont);
        setHomeTabFontSize(parsedSize);
      } catch { }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'homeTabFont' || e.key === 'homeTabFontSize' || e.key === 'sidebarFont') {
        handleHomeTabFontChange();
      }
    };

    // Escuchar evento personalizado y cambios en localStorage
    window.addEventListener('home-tab-font-changed', handleHomeTabFontChange);
    window.addEventListener('sidebar-font-changed', handleHomeTabFontChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('home-tab-font-changed', handleHomeTabFontChange);
      window.removeEventListener('sidebar-font-changed', handleHomeTabFontChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Escuchar cambios en la visibilidad del terminal local
  useEffect(() => {
    const handleTerminalVisibilityChange = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.HOME_TAB_LOCAL_TERMINAL_VISIBLE);
        const isVisible = saved !== null ? saved === 'true' : true;
        setTerminalHidden(!isVisible);
      } catch {
        setTerminalHidden(false);
      }
    };

    window.addEventListener('home-tab-local-terminal-visibility-changed', handleTerminalVisibilityChange);
    window.addEventListener('storage', handleTerminalVisibilityChange);

    return () => {
      window.removeEventListener('home-tab-local-terminal-visibility-changed', handleTerminalVisibilityChange);
      window.removeEventListener('storage', handleTerminalVisibilityChange);
    };
  }, []);

  // Determinar el título del terminal basado en la terminal por defecto
  useEffect(() => {
    const updateTerminalTitle = () => {
      try {
        const defaultTerminal = localStorage.getItem('nodeterm_default_local_terminal');
        const platform = window.electron?.platform || 'unknown';

        if (defaultTerminal) {
          const terminalTitles = {
            'powershell': 'Windows PowerShell',
            'wsl': 'WSL',
            'cygwin': 'Cygwin',
            'linux-terminal': platform === 'darwin' ? 'Terminal macOS' : 'Terminal Linux'
          };

          if (defaultTerminal.startsWith('docker-')) {
            setTerminalTitle(`🐳 ${defaultTerminal.replace('docker-', '')}`);
          } else if (terminalTitles[defaultTerminal]) {
            setTerminalTitle(terminalTitles[defaultTerminal]);
          } else {
            setTerminalTitle(defaultTerminal);
          }
        } else {
          // Fallback por defecto según plataforma
          if (platform === 'linux') setTerminalTitle('Terminal Linux');
          else if (platform === 'darwin') setTerminalTitle('Terminal macOS');
          else setTerminalTitle('Windows PowerShell');
        }
      } catch (err) {
        setTerminalTitle('Terminal Local');
      }
    };

    updateTerminalTitle();
    window.addEventListener('storage', updateTerminalTitle);
    return () => window.removeEventListener('storage', updateTerminalTitle);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ai-chat-home-visibility', {
      detail: { visible: showAIChat }
    }));
  }, [showAIChat]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('ai-chat-home-visibility', {
        detail: { visible: false }
      }));
    };
  }, []);

  const RECENTS_LIMIT = 50;

  const loadRecentConnections = React.useCallback(() => {
    try {
      const recents = getRecents(RECENTS_LIMIT);
      setRecentConnections(recents);
    } catch (error) {
      console.error('Error cargando conexiones recientes:', error);
    }
  }, []);

  const loadRecentPasswords = React.useCallback(() => {
    try {
      const passwords = getRecentPasswords(5); // Limitar a 5 passwords recientes
      setRecentPasswords(passwords);
    } catch (error) {
      console.error('Error cargando passwords recientes:', error);
    }
  }, []);

  // Cargar conexiones recientes y passwords recientes + escuchar cambios
  useEffect(() => {
    loadRecentConnections();
    loadRecentPasswords();
    const off1 = onUpdate(() => {
      loadRecentConnections();
      loadRecentPasswords();
    });
    // Respaldo: suscripción directa que se ejecuta en el mismo tick que recordRecent (por si el evento falla en Electron)
    const off2 = subscribeRecents(() => {
      loadRecentConnections();
      loadRecentPasswords();
    });
    return () => {
      off1 && off1();
      off2 && off2();
    };
  }, [loadRecentConnections, loadRecentPasswords]);

  // Refrescar recientes al volver a la pestaña Inicio (por si se perdió un evento o se conectó desde otro grupo)
  useEffect(() => {
    if (isActiveTab) {
      loadRecentConnections();
      loadRecentPasswords();
    }
  }, [isActiveTab, loadRecentConnections, loadRecentPasswords]);

  // Funciones auxiliares para tipos de passwords
  const getPasswordTypeIcon = (type) => {
    // Si no hay tipo definido, intentar inferirlo del nombre o usar icono por defecto
    if (!type) return 'pi pi-key';

    switch (type.toLowerCase()) {
      case 'web':
      case 'website':
      case 'site':
        return 'pi pi-globe';
      case 'dev':
      case 'development':
      case 'github':
      case 'gitlab':
      case 'bitbucket':
        return 'pi pi-code';
      case 'cloud':
      case 'aws':
      case 'azure':
      case 'gcp':
        return 'pi pi-cloud';
      case 'db':
      case 'database':
      case 'mysql':
      case 'postgresql':
      case 'mongodb':
        return 'pi pi-database';
      case 'email':
      case 'gmail':
      case 'outlook':
        return 'pi pi-envelope';
      case 'social':
      case 'facebook':
      case 'twitter':
      case 'instagram':
        return 'pi pi-users';
      case 'server':
      case 'ssh':
        return 'pi pi-server';
      case 'admin':
      case 'administrator':
        return 'pi pi-shield';
      default:
        return 'pi pi-key';
    }
  };

  const getPasswordTypeColor = (type) => {
    // Si no hay tipo definido, usar color por defecto
    if (!type) return '#9E9E9E';

    switch (type.toLowerCase()) {
      case 'web':
      case 'website':
      case 'site':
        return '#4fc3f7';
      case 'dev':
      case 'development':
      case 'github':
      case 'gitlab':
      case 'bitbucket':
        return '#66bb6a';
      case 'cloud':
      case 'aws':
      case 'azure':
      case 'gcp':
        return '#ff7043';
      case 'db':
      case 'database':
      case 'mysql':
      case 'postgresql':
      case 'mongodb':
        return '#ab47bc';
      case 'email':
      case 'gmail':
      case 'outlook':
        return '#ff9800';
      case 'social':
      case 'facebook':
      case 'twitter':
      case 'instagram':
        return '#e91e63';
      case 'server':
      case 'ssh':
        return '#607d8b';
      case 'admin':
      case 'administrator':
        return '#795548';
      default:
        return '#9E9E9E';
    }
  };

  const copyToClipboard = async (text, fieldName) => {
    try {
      if (window.electron?.clipboard?.writeText) {
        await window.electron.clipboard.writeText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }

      // Mostrar notificación si está disponible
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Copiado',
          detail: `${fieldName} copiado al portapapeles`,
          life: 1500
        });
      }
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
    }
  };

  const openPasswordTab = (passwordData) => {
    try {
      // Crear el evento para abrir la pestaña de password
      const event = new CustomEvent('open-password-tab', {
        detail: {
          key: passwordData.id,
          label: passwordData.name,
          data: {
            username: passwordData.username,
            password: passwordData.password,
            url: passwordData.url,
            group: passwordData.group,
            notes: passwordData.notes,
            type: passwordData.type,
            icon: passwordData.icon
          }
        }
      });

      // Dispatch del evento
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error abriendo pestaña de password:', err);
    }
  };

  // Obtener el color de fondo del tema actual
  const currentTheme = React.useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);

  const dashboardBg = React.useMemo(() => {
    return currentTheme.colors?.contentBackground || '#fafafa';
  }, [currentTheme]);

  // Colores del tema para elementos de la lista
  const themeColors = React.useMemo(() => {
    // Special handling for Nord theme to ensure visible hover effects
    const isNordTheme = currentTheme.name === 'Nord';

    return {
      textPrimary: currentTheme.colors?.sidebarText || currentTheme.colors?.tabText || '#ffffff',
      textSecondary: currentTheme.colors?.sidebarText || '#9E9E9E',
      borderColor: currentTheme.colors?.sidebarBorder || currentTheme.colors?.contentBorder || 'rgba(255,255,255,0.1)',
      hoverBackground: isNordTheme ? '#4c566a' : (currentTheme.colors?.sidebarHover || 'rgba(255,255,255,0.1)'),
      itemBackground: currentTheme.colors?.tabBackground || 'rgba(255,255,255,0.05)',
      cardBorder: currentTheme.colors?.dialogBorder || currentTheme.colors?.contentBorder || 'rgba(255,255,255,0.1)',
      cardBackground: currentTheme.colors?.dialogBackground || 'rgba(16, 20, 28, 0.6)',
      primaryColor: currentTheme.colors?.buttonPrimary || currentTheme.colors?.primaryColor || '#2196f3'
    };
  }, [currentTheme]);

  const localTerminalBg = React.useMemo(() => {
    return themes[localLinuxTerminalTheme]?.theme?.background || themes[localPowerShellTheme]?.theme?.background || '#222';
  }, [localLinuxTerminalTheme, localPowerShellTheme]);

  const handleConnectToHistory = (connection) => {
    // console.log('Conectando a:', connection);
    if (connection.type === 'group') {
      // Manejar grupos - cargar todas las sesiones del grupo
      handleLoadGroup(connection);
    } else if (connection.type === 'rdp-guacamole' || connection.type === 'rdp') {
      // Manejar conexiones RDP-Guacamole y RDP
      handleCreateRdpConnection(connection);
    } else if (connection.type === 'vnc-guacamole' || connection.type === 'vnc') {
      // Manejar conexiones VNC-Guacamole y VNC
      handleCreateVncConnection(connection);
    } else if (connection.type === 'ssh-tunnel') {
      // Manejar túneles SSH
      if (onOpenSSHTunnel) {
        onOpenSSHTunnel(connection);
      }
    } else if (onCreateSSHConnection) {
      // Manejar conexiones SSH tradicionales
      onCreateSSHConnection(connection);
    }
  };

  const handleLoadGroup = (groupConnection) => {
    if (onLoadGroup) {
      onLoadGroup(groupConnection);
    }
  };

  const handleCreateRdpConnection = (connectionData) => {
    if (onCreateRdpConnection) {
      onCreateRdpConnection(connectionData);
    }
  };

  const handleCreateVncConnection = (connectionData) => {
    if (onCreateVncConnection) {
      onCreateVncConnection(connectionData);
    }
  };

  // Funciones para controlar el estado del terminal
  const handleMinimizeTerminal = React.useCallback(() => {
    setTerminalState(prevState => {
      return prevState === 'minimized' ? 'normal' : 'minimized';
    });
  }, []);

  const handleMaximizeTerminal = React.useCallback(() => {
    setTerminalState(prevState => {
      return prevState === 'maximized' ? 'normal' : 'maximized';
    });
  }, []);


  // Función para toggle de visibilidad del terminal
  const handleToggleTerminalVisibility = () => {
    setTerminalHidden(prev => {
      const newHidden = !prev;
      // Si se está mostrando el terminal, cambiar el estado a 'normal' (1/4 de página)
      if (!newHidden) {
        setTerminalState('normal');
      }
      return newHidden;
    });
  };

  // Función para toggle del chat de IA
  const handleToggleAIChat = () => {
    setShowAIChat(prev => !prev);
  };

  // Función para toggle de la status bar
  const handleToggleStatusBar = () => {
    setStatusBarVisible(prev => {
      const newValue = !prev;
      // Guardar preferencia en localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE, newValue.toString());
      } catch (e) {
        console.error('Error guardando preferencia de status bar:', e);
      }
      return newValue;
    });
  };

  const handleToggleRightColumn = () => {
    setRightColumnCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.HOME_TAB_RIGHT_COLUMN_COLLAPSED, next.toString());
      } catch (e) { }
      return next;
    });
  };

  useEffect(() => {
    const handleExternalToggle = () => {
      if (!showAIChat) return;
      handleToggleTerminalVisibility();
    };
    window.addEventListener('ai-chat-home-toggle-terminal', handleExternalToggle);
    return () => {
      window.removeEventListener('ai-chat-home-toggle-terminal', handleExternalToggle);
    };
  }, [showAIChat, handleToggleTerminalVisibility]);

  // Escuchar cambios de storage para statusBarVisible desde SettingsDialog
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.HOME_TAB_STATUS_BAR_VISIBLE) {
        const newValue = e.newValue === 'true';
        setStatusBarVisible(newValue);
      }
    };
    const handleCustomEvent = (e) => {
      if (e.detail && typeof e.detail.visible === 'boolean') {
        setStatusBarVisible(e.detail.visible);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('statusbar-visibility-changed', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('statusbar-visibility-changed', handleCustomEvent);
    };
  }, []);

  // Escuchar evento para añadir terminal al TabbedTerminal desde la columna derecha
  useEffect(() => {
    const handleAddTerminal = (e) => {
      const { terminalType, distroInfo } = e?.detail || {};
      if (!terminalType) return;
      if (terminalHidden) {
        setTerminalHidden(false);
      }
      setTimeout(() => {
        try {
          tabbedTerminalRef.current?.addTerminalTab?.(terminalType, distroInfo);
        } catch (err) {
          console.warn('[HomeTab] addTerminalTab:', err);
        }
      }, terminalHidden ? 120 : 50);
    };
    window.addEventListener('home-tab-add-terminal', handleAddTerminal);
    return () => window.removeEventListener('home-tab-add-terminal', handleAddTerminal);
  }, [terminalHidden]);





  // Panel superior: Nuevo layout con 3 columnas (basado en redesigned pero con ConnectionHistory)
  const topPanel = (
    <>
      {/* Estilos para la animación del spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{
        height: '100%',
        overflow: 'hidden',
        background: dashboardBg,
        display: 'flex',
        flexDirection: 'column',
        opacity: terminalState === 'maximized' ? 0 : 1,
        visibility: terminalState === 'maximized' ? 'hidden' : 'visible',
        transition: 'opacity 0.1s ease, visibility 0.1s ease'
      }}>
        <div className="home-page-scroll" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Layout principal: área central + columna derecha */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            height: '100%'
          }}>
            {/* Áreas central */}
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Mostrar Chat de IA o contenido normal */}
              {showAIChat ? (
                // Panel de Chat de IA
                <div style={{
                  flex: 1,
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    flex: 1,
                    background: `linear-gradient(135deg,
                  rgba(16, 20, 28, 0.6) 0%,
                  rgba(16, 20, 28, 0.4) 100%)`,
                    backdropFilter: 'blur(8px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                    border: `1px solid ${themeColors.cardBorder}`,
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                    overflow: 'hidden'
                  }}>
                    <AIChatWithHistory />
                  </div>
                </div>
              ) : (
                // Contenido normal de la página de inicio (Favoritos + Recientes)
                <>
                  {/* Columna central: Favoritos y Recientes */}
                  <div style={{
                    flex: 1,
                    padding: '0.5rem 1rem 0.5rem 0.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'hidden',
                    height: '100%'
                  }}>
                    {/* PINNED + RECIENTES en una sola columna (estilo imagen) */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      minHeight: 0,
                      overflow: 'hidden',
                      position: 'relative',
                      padding: '0 0.2rem'
                    }}>
                      <ConnectionHistory
                        onConnectToHistory={handleConnectToHistory}
                        recentConnections={recentConnections}
                        activeIds={activeIds}
                        onEdit={onEditConnection}
                        themeColors={themeColors}
                        sidebarNodes={sidebarNodes}
                        masterKey={masterKey}
                        secureStorage={secureStorage}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div >
      </div >
    </>
  );

  // Panel inferior: Terminal con pestañas flotante
  const bottomPanel = (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: localTerminalBg,
      borderRadius: terminalState === 'maximized' ? '0' : '8px',
      boxShadow: terminalState === 'maximized' ? 'none' : '0 10px 30px rgba(0,0,0,0.5)',
      border: terminalState === 'maximized' ? 'none' : `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.1)'}`
    }}>
      {/* MacOS style header */}
      <div
        className="terminal-drag-handle"
        style={{
          height: '32px',
          background: themeColors.cardBackground || 'rgba(255, 255, 255, 0.03)',
          borderBottom: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.1)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          cursor: terminalState === 'maximized' ? 'default' : 'grab',
          flexShrink: 0,
          position: 'relative',
          borderTopLeftRadius: terminalState === 'maximized' ? '0' : '8px',
          borderTopRightRadius: terminalState === 'maximized' ? '0' : '8px',
        }}
        onMouseDown={(e) => { if (terminalState !== 'maximized') e.currentTarget.style.cursor = 'grabbing'; }}
        onMouseUp={(e) => { if (terminalState !== 'maximized') e.currentTarget.style.cursor = 'grab'; }}
        onMouseLeave={(e) => { if (terminalState !== 'maximized') e.currentTarget.style.cursor = 'grab'; }}
        onDoubleClick={handleMaximizeTerminal}
      >
        <div style={{ display: 'flex', gap: '8px', zIndex: 10 }}>
          <div
            onClick={() => setTerminalHidden(true)}
            style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56', cursor: 'pointer', border: '1px solid #e0443e' }}
            title="Cerrar" />
          <div
            onClick={handleMinimizeTerminal}
            style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', cursor: 'pointer', border: '1px solid #dea123' }}
            title="Minimizar" />
          <div
            onClick={handleMaximizeTerminal}
            style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f', cursor: 'pointer', border: '1px solid #1aab29' }}
            title="Maximizar" />
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', color: themeColors.textSecondary, fontSize: '11px', userSelect: 'none', pointerEvents: 'none', fontWeight: 500 }}>
          {terminalTitle}
        </div>

        <div style={{ width: '60px' }}></div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: terminalState === 'minimized' ? 'none' : 'flex', flexDirection: 'column' }}>
        <TabbedTerminal
          ref={tabbedTerminalRef}
          onMinimize={handleMinimizeTerminal}
          onMaximize={handleMaximizeTerminal}
          terminalState={terminalState}
          localFontFamily={localFontFamily}
          localFontSize={localFontSize}
          localPowerShellTheme={localPowerShellTheme}
          localLinuxTerminalTheme={localLinuxTerminalTheme}
          hideStatusBar={true}
        />
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        background: dashboardBg,
        overflow: 'hidden'
      }}>
      <div
        style={{
          height: statusBarVisible ? 'calc(100% - 40px)' : '100%',
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}
        data-split-container-wrapper="true"
      >
        <div style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden'
        }}>
          {/* Main area with Dashboard and Terminal */}
          <div style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {topPanel}

            {!terminalHidden && isRndInitialized && (
              <Rnd
                size={
                  terminalState === 'maximized'
                    ? { width: '100%', height: '100%' }
                    : (terminalState === 'minimized' ? { height: 32, width: rndSize.width } : rndSize)
                }
                position={
                  terminalState === 'maximized'
                    ? { x: 0, y: 0 }
                    : rndPosition
                }
                onDragStop={(e, d) => {
                  if (terminalState !== 'maximized') {
                    setRndPosition({ x: d.x, y: d.y });
                  }
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  if (terminalState !== 'maximized' && terminalState !== 'minimized') {
                    setRndSize({ width: ref.style.width, height: ref.style.height });
                    setRndPosition(position);
                  }
                }}
                minWidth={300}
                minHeight={terminalState === 'minimized' ? 32 : 200}
                bounds="parent"
                dragHandleClassName="terminal-drag-handle"
                style={{
                  zIndex: 100,
                  display: 'flex',
                  position: 'absolute'
                }}
                disableDragging={terminalState === 'maximized'}
                enableResizing={terminalState !== 'maximized' && terminalState !== 'minimized' ? {
                  bottom: true, bottomLeft: true, bottomRight: true,
                  left: true, right: true,
                  top: true, topLeft: true, topRight: true
                } : false}
              >
                {bottomPanel}
              </Rnd>
            )}
          </div>

          {/* Sidebar Area - Outside the vertical split to remain at full height */}
          <NodeTermStatus
            variant="rightColumn"
            collapsed={rightColumnCollapsed}
            sshConnectionsCount={sshConnectionsCount}
            foldersCount={foldersCount}
            rdpConnectionsCount={rdpConnectionsCount}
            themeColors={themeColors}
            onOpenSettings={onOpenSettings}
            onToggleTerminalVisibility={handleToggleTerminalVisibility}
            onToggleAIChat={handleToggleAIChat}
            onToggleStatusBar={handleToggleStatusBar}
            onCollapse={handleToggleRightColumn}
            showAIChat={showAIChat}
            statusBarVisible={statusBarVisible}
            setShowCreateGroupDialog={setShowCreateGroupDialog}
          />
        </div>
      </div>
      <StandaloneStatusBar visible={statusBarVisible} />
    </div>
  );
};

export default HomeTab;