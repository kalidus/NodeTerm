import React, { useState, useEffect, useRef } from 'react';
import SplitLayout from './SplitLayout';
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
  sidebarNodes = null,
  setShowCreateGroupDialog,
  activeIds = new Set(),
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
  const [manualPaneSize, setManualPaneSize] = useState(null); // Tamaño manual del panel superior
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
    } else if (connection.type === 'rdp-guacamole') {
      // Manejar conexiones RDP-Guacamole
      handleCreateRdpConnection(connection);
    } else if (connection.type === 'vnc-guacamole') {
      // Manejar conexiones VNC-Guacamole
      handleCreateVncConnection(connection);
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
      const newState = prevState === 'minimized' ? 'normal' : 'minimized';
      // Limpiar tamaño manual cuando se cambia el estado programáticamente
      if (newState !== 'normal') {
        setManualPaneSize(null);
      }
      return newState;
    });
  }, []);

  const handleMaximizeTerminal = React.useCallback(() => {
    setTerminalState(prevState => {
      const newState = prevState === 'maximized' ? 'normal' : 'maximized';
      // Limpiar tamaño manual cuando se cambia el estado programáticamente
      if (newState !== 'normal') {
        setManualPaneSize(null);
      }
      return newState;
    });
  }, []);

  // Función para resetear a modo manual cuando el usuario redimensiona
  const handleManualResize = () => {
    if (terminalState !== 'normal') {
      setTerminalState('normal');
    }
    // Cuando el usuario redimensiona, necesitamos obtener el nuevo tamaño del SplitLayout
    // Esto se manejará a través del callback de redimensionamiento
  };

  // Callback para cuando el usuario redimensiona manualmente
  const handlePaneSizeChange = (newSize) => {
    // Permitir guardar cualquier tamaño, incluso si es el 100% de la altura
    const statusBarHeight = statusBarVisible ? 40 : 0;
    const availableHeight = window.innerHeight - statusBarHeight;
    // NO limitar - permitir hasta el 100% del espacio disponible
    const clampedSize = Math.min(newSize, availableHeight);
    setManualPaneSize(clampedSize);
    setTerminalState('normal');
    console.log('📐 HomeTab: handlePaneSizeChange:', {
      newSize,
      clampedSize,
      availableHeight,
      percentage: ((clampedSize / availableHeight) * 100).toFixed(2) + '%'
    });
  };

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



  // Determinar el tamaño del panel superior
  const getTopPanelSize = () => {
    // Si el terminal está oculto, el dashboard ocupa toda la pantalla
    if (terminalHidden) {
      return window.innerHeight - 20; // Ocupar casi toda la pantalla, dejando un pequeño margen
    }

    const containerHeight = window.innerHeight;
    const statusBarHeight = statusBarVisible ? 40 : 0;
    const availableHeight = containerHeight - statusBarHeight;

    // Si hay un tamaño manual guardado y estamos en modo normal, usarlo
    // No limitar el tamaño manual - permitir hasta el 100%
    if (manualPaneSize !== null && terminalState === 'normal') {
      return Math.min(manualPaneSize, availableHeight);
    }

    let size;

    switch (terminalState) {
      case 'minimized':
        // Cuando está minimizado, el panel superior ocupa casi todo, dejando solo 40px para el terminal
        size = Math.max(availableHeight - 40, availableHeight * 0.95);
        break;
      case 'maximized':
        size = 0;
        break;
      default:
        // Para 'normal', la terminal ocupa un poco menos de la mitad (45%)
        // Esto significa que el panel superior ocupa 55% de la altura disponible
        // Usar 55% de la altura disponible para el panel superior (terminal ocupa 45%)
        size = Math.max(availableHeight * 0.55, 400);
        break;
    }

    return size;
  };

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
            {/* Área central (Chat IA o Favoritos+Recientes) */}
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
                    padding: '1rem',
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
                      padding: '0.5rem 1rem'
                    }}>
                      <ConnectionHistory
                        onConnectToHistory={handleConnectToHistory}
                        recentConnections={recentConnections}
                        activeIds={activeIds}
                        onEdit={onEditConnection}
                        themeColors={themeColors}
                        sidebarNodes={sidebarNodes}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            {rightColumnCollapsed ? (
              <div
                style={{
                  width: '40px',
                  minWidth: '40px',
                  flexShrink: 0,
                  background: themeColors.cardBackground || 'rgba(16, 20, 28, 0.95)',
                  borderLeft: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.08)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  paddingTop: '1rem'
                }}
              >
                <button
                  onClick={handleToggleRightColumn}
                  title="Expandir columna"
                  style={{
                    background: themeColors.itemBackground || 'rgba(255,255,255,0.05)',
                    border: `1px solid ${themeColors.borderColor || 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '6px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: themeColors.textSecondary || 'rgba(255,255,255,0.7)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = themeColors.hoverBackground || 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = themeColors.textPrimary || 'rgba(255,255,255,0.9)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = themeColors.itemBackground || 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = themeColors.textSecondary || 'rgba(255,255,255,0.7)';
                  }}
                >
                  <i className="pi pi-chevron-left" style={{ fontSize: '0.9rem' }} />
                </button>
              </div>
            ) : (
              <NodeTermStatus
                variant="rightColumn"
                sshConnectionsCount={sshConnectionsCount}
                foldersCount={foldersCount}
                rdpConnectionsCount={rdpConnectionsCount}
                themeColors={themeColors}
                onOpenFileExplorer={onOpenFileExplorer}
                onOpenSettings={onOpenSettings}
                onToggleTerminalVisibility={handleToggleTerminalVisibility}
                onToggleAIChat={handleToggleAIChat}
                onToggleStatusBar={handleToggleStatusBar}
                onCollapse={handleToggleRightColumn}
                showAIChat={showAIChat}
                statusBarVisible={statusBarVisible}
                setShowCreateGroupDialog={setShowCreateGroupDialog}
              />
            )}
          </div>
        </div >
      </div >
    </>
  );

  // Panel inferior: Terminal con pestañas
  const bottomPanel = (
    <div style={{
      height: '100%',
      width: '100%',
      display: terminalHidden ? 'none' : 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: localTerminalBg
    }}>
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
  );

  const splitterColor = React.useMemo(() => {
    return currentTheme.colors?.splitter || localTerminalBg || dashboardBg || '#2d2d2d';
  }, [currentTheme, localTerminalBg, dashboardBg]);

  // Si el terminal está oculto, renderizar solo el panel superior
  if (terminalHidden) {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        background: dashboardBg,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          height: statusBarVisible ? 'calc(100% - 40px)' : '100%',
          width: '100%',
          overflow: 'auto'
        }}>
          {topPanel}
        </div>
        <StandaloneStatusBar visible={statusBarVisible} />
      </div>
    );
  }

  // Cuando el terminal está maximizado, renderizar SOLO el terminal ocupando todo el espacio
  if (terminalState === 'maximized') {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        background: localTerminalBg,
        overflow: 'hidden'
      }}>
        <div style={{
          height: statusBarVisible ? 'calc(100% - 40px)' : '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {bottomPanel}
        </div>
        <StandaloneStatusBar visible={statusBarVisible} />
      </div>
    );
  }

  // Cuando el terminal está minimizado, renderizar SOLO el panel superior ocupando casi todo el espacio
  if (terminalState === 'minimized') {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        background: dashboardBg,
        overflow: 'hidden'
      }}>
        <div style={{
          height: statusBarVisible ? 'calc(100% - 40px)' : '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {topPanel}
          </div>
          <div style={{
            height: '40px',
            minHeight: '40px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: localTerminalBg
          }}>
            {bottomPanel}
          </div>
        </div>
        <StandaloneStatusBar visible={statusBarVisible} />
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      width: '100%',
      position: 'relative'
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
        <SplitLayout
          key={`home-split-${themeVersion}`}
          leftTerminal={{ key: 'home_top', content: topPanel }}
          rightTerminal={{ key: 'home_bottom', content: bottomPanel }}
          orientation="horizontal"
          fontFamily={''}
          fontSize={16}
          theme={{ background: localTerminalBg }}
          onContextMenu={() => { }}
          sshStatsByTabId={{}}
          terminalRefs={{ current: {} }}
          statusBarIconTheme="classic"
          isHomeTab={true}
          externalPaneSize={getTopPanelSize()}
          onManualResize={handleManualResize}
          onPaneSizeChange={handlePaneSizeChange}
          splitterColor={splitterColor}
        />
      </div>
      <StandaloneStatusBar visible={statusBarVisible} />
    </div>
  );
};

export default HomeTab;