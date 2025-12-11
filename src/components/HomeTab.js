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
import { getRecents, toggleFavorite, onUpdate, getRecentPasswords } from '../utils/connectionStore';

const HomeTab = ({
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
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [terminalState, setTerminalState] = useState('normal'); // Estado normal para tamaño correcto
  const [terminalHidden, setTerminalHidden] = useState(false); // Terminal visible por defecto
  const [manualPaneSize, setManualPaneSize] = useState(null); // Tamaño manual del panel superior
  const [isTerminalTransitioning, setIsTerminalTransitioning] = useState(false);
  const [favType, setFavType] = useState('all'); // Nuevo estado para filtros
  const [recentConnections, setRecentConnections] = useState([]); // Estado para conexiones recientes
  const [recentPasswords, setRecentPasswords] = useState([]); // Estado para passwords recientes
  const [showAIChat, setShowAIChat] = useState(false); // Estado para mostrar/ocultar chat de IA
  const [statusBarVisible, setStatusBarVisible] = useState(() => {
    // Cargar preferencia desde localStorage, por defecto visible
    try {
      const saved = localStorage.getItem('homeTab_statusBarVisible');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  }); // Estado para mostrar/ocultar status bar
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

  // Cargar conexiones recientes y passwords recientes
  useEffect(() => {
    loadRecentConnections();
    loadRecentPasswords();
    const off = onUpdate(() => {
      loadRecentConnections();
      loadRecentPasswords();
    });
    return () => off && off();
  }, []);

  const loadRecentConnections = () => {
    try {
      const recents = getRecents(8); // Limitar a 8 conexiones recientes
      setRecentConnections(recents);
    } catch (error) {
      console.error('Error cargando conexiones recientes:', error);
    }
  };

  const loadRecentPasswords = () => {
    try {
      const passwords = getRecentPasswords(5); // Limitar a 5 passwords recientes
      setRecentPasswords(passwords);
    } catch (error) {
      console.error('Error cargando passwords recientes:', error);
    }
  };

  // Funciones auxiliares para tipos de conexión
  const getConnectionTypeIcon = (type) => {
    switch (type) {
      case 'ssh':
        return 'pi pi-server';
      case 'rdp-guacamole':
      case 'rdp':
        return 'pi pi-desktop';
      case 'vnc-guacamole':
      case 'vnc':
        return 'pi pi-desktop';
      case 'explorer':
        return 'pi pi-folder-open';
      case 'group':
        return 'pi pi-th-large';
      default:
        return 'pi pi-circle';
    }
  };

  const getConnectionTypeColor = (type) => {
    switch (type) {
      case 'ssh':
        return '#4fc3f7';
      case 'rdp-guacamole':
      case 'rdp':
        return '#ff6b35';
      case 'vnc-guacamole':
      case 'vnc':
        return '#00ff00';
      case 'explorer':
        return '#FFB300';
      case 'group':
        return '#9c27b0';
      default:
        return '#9E9E9E';
    }
  };

  const handleToggleFavorite = (connection) => {
    toggleFavorite(connection);
    loadRecentConnections(); // Recargar para actualizar el estado
  };

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
      cardBackground: currentTheme.colors?.dialogBackground || 'rgba(16, 20, 28, 0.6)'
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
  const handleMinimizeTerminal = () => {
    const newState = terminalState === 'minimized' ? 'normal' : 'minimized';
    // console.log('🔽 Cambiando estado del terminal:', terminalState, '->', newState);
    setTerminalState(newState);
  };

  const handleMaximizeTerminal = () => {
    const newState = terminalState === 'maximized' ? 'normal' : 'maximized';
    // console.log('🔼 Cambiando estado del terminal:', terminalState, '->', newState);
    setTerminalState(newState);
  };

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
    setManualPaneSize(newSize);
    setTerminalState('normal');
  };

  // Función para toggle de visibilidad del terminal
  const handleToggleTerminalVisibility = async () => {
    if (isTerminalTransitioning) return; // Evitar múltiples clicks
    
    setIsTerminalTransitioning(true);
    
    // Pequeña transición antes del cambio
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setTerminalHidden(prev => {
      const newHidden = !prev;
      // Si se está mostrando el terminal, cambiar el estado a 'normal' (1/4 de página)
      if (!newHidden) {
        setTerminalState('normal');
      }
      return newHidden;
    });
    
    // Transición más larga para estabilizar
    await new Promise(resolve => setTimeout(resolve, 600));
    setIsTerminalTransitioning(false);
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
        localStorage.setItem('homeTab_statusBarVisible', newValue.toString());
      } catch (e) {
        console.error('Error guardando preferencia de status bar:', e);
      }
      return newValue;
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
      if (e.key === 'homeTab_statusBarVisible') {
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



  // Determinar el tamaño del panel superior
  const getTopPanelSize = () => {
    // Si el terminal está oculto, el dashboard ocupa toda la pantalla
    if (terminalHidden) {
      return window.innerHeight - 20; // Ocupar casi toda la pantalla, dejando un pequeño margen
    }

    // Si hay un tamaño manual guardado, usarlo
    if (manualPaneSize !== null) {
      return manualPaneSize;
    }

    const containerHeight = window.innerHeight;
    let size;

    switch (terminalState) {
      case 'minimized':
        size = Math.max(containerHeight - 40, 100);
        break;
      case 'maximized':
        size = 0;
        break;
      default:
        // Para 'normal', calcular tamaño basado en el contenido (cards + margen)
        // Las cards tienen ~280px de altura, más padding y márgenes
        const statusBarHeight = statusBarVisible ? 40 : 0;
        const availableHeight = containerHeight - statusBarHeight;
        // Usar aproximadamente 50% de la altura disponible para el panel superior
        // Esto deja suficiente espacio para las cards y la terminal
        size = Math.max(availableHeight * 0.5, 400);
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
      <div className="home-page-scroll" style={{ flex: 1, overflow: 'auto' }}>
        {/* Layout principal sin QuickAccessSidebar */}
        <div style={{
          display: 'flex',
          height: '100%',
          minHeight: '600px'
        }}>
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
            // Contenido normal de la página de inicio
            <>
          {/* Columna central: Layout reorganizado con tarjetas arriba y favoritos abajo */}
          <div style={{
            flex: 1,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Cards de Estado de NodeTerm - Acciones/Terminales y Servicios/KPIs */}
            <div style={{
              position: 'relative',
              marginBottom: '1rem'
            }}>
              <NodeTermStatus
                sshConnectionsCount={sshConnectionsCount}
                foldersCount={foldersCount}
                rdpConnectionsCount={rdpConnectionsCount}
                themeColors={themeColors}
                horizontal={true}
                compact={true}
                onCreateSSHConnection={onCreateSSHConnection}
                onCreateFolder={onCreateFolder}
                onOpenFileExplorer={onOpenFileExplorer}
                onOpenSettings={onOpenSettings}
                onToggleTerminalVisibility={handleToggleTerminalVisibility}
                onToggleAIChat={handleToggleAIChat}
                onToggleStatusBar={handleToggleStatusBar}
                showAIChat={showAIChat}
                statusBarVisible={statusBarVisible}
              />
              
              {/* Overlay de transición para Estado de NodeTerm */}
              {isTerminalTransitioning && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  zIndex: 10,
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    color: 'white'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTop: '3px solid #00BCD4',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      textAlign: 'center'
                    }}>
                      Actualizando terminal...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cards de Conexiones Favoritas y Conexiones Recientes en la parte superior */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {/* Card de ConnectionHistory (Conexiones Favoritas) */}
              <div style={{
                background: `linear-gradient(135deg,
                  rgba(16, 20, 28, 0.6) 0%,
                  rgba(16, 20, 28, 0.4) 100%)`,
                backdropFilter: 'blur(8px) saturate(140%)',
                WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                border: `1px solid ${themeColors.cardBorder}`,
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                padding: '0.75rem',
                maxHeight: '320px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <ConnectionHistory 
                  onConnectToHistory={handleConnectToHistory}
                  layout="two-columns"
                  recentsLimit={10}
                  activeIds={new Set()}
                  templateColumns="3fr 2fr"
                  favoritesColumns={2}
                  recentsColumns={1}
                  onEdit={onEditConnection}
                  sshConnectionsCount={sshConnectionsCount}
                  foldersCount={foldersCount}
                  rdpConnectionsCount={rdpConnectionsCount}
                  themeColors={themeColors}
                />
                
                {/* Overlay de transición para favoritos */}
                {isTerminalTransitioning && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    zIndex: 10
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                      color: 'white'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid rgba(255,255,255,0.3)',
                        borderTop: '3px solid #00BCD4',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <div style={{
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        textAlign: 'center'
                      }}>
                        Actualizando terminal...
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card de Conexiones Recientes */}
              <div style={{
                background: `linear-gradient(135deg,
                  rgba(16, 20, 28, 0.6) 0%,
                  rgba(16, 20, 28, 0.4) 100%)`,
                backdropFilter: 'blur(8px) saturate(140%)',
                WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                border: `1px solid ${themeColors.cardBorder}`,
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                padding: '0.75rem',
                maxHeight: '320px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  {/* Icono con efecto visual mejorado */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, rgba(79, 195, 247, 0.2) 0%, rgba(79, 195, 247, 0.1) 100%)',
                    border: '1px solid rgba(79, 195, 247, 0.3)',
                    boxShadow: '0 1px 4px rgba(79, 195, 247, 0.15)',
                    position: 'relative'
                  }}>
                    <i className="pi pi-history" style={{ 
                      color: '#4fc3f7', 
                      fontSize: '0.9rem',
                      filter: 'drop-shadow(0 0 2px rgba(79, 195, 247, 0.4))'
                    }} />
                    {/* Efecto de brillo sutil */}
                    <div style={{
                      position: 'absolute',
                      top: '12%',
                      left: '35%',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.6)',
                      filter: 'blur(1px)',
                      animation: 'twinkle 4s infinite'
                    }} />
                  </div>
                  
                  {/* Título con mejor tipografía */}
                  <h3 style={{ 
                    margin: 0, 
                    color: themeColors.textPrimary, 
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    letterSpacing: '0.1px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    Conexiones Recientes
                  </h3>
                </div>
                {/* Línea decorativa con gradiente azul */}
                <div style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(79, 195, 247, 0.3), transparent)',
                  borderRadius: '1px',
                  marginBottom: '0.5rem'
                }} />
                {/* Lista de conexiones recientes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', flex: 1 }}>
                  {recentConnections.length > 0 ? (
                    recentConnections.map(recentConn => (
                      <div key={recentConn.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: themeColors.textSecondary,
                        fontSize: '0.65rem',
                        background: themeColors.itemBackground,
                        padding: '0.2rem 0.35rem',
                        borderRadius: '5px',
                        border: '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = themeColors.hoverBackground;
                        e.currentTarget.style.border = `1px solid ${themeColors.borderColor}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = themeColors.itemBackground;
                        e.currentTarget.style.border = '1px solid transparent';
                      }}
                      >
                        {/* Icono del tipo de conexión */}
                        <i className={getConnectionTypeIcon(recentConn.type)} style={{
                          color: getConnectionTypeColor(recentConn.type),
                          fontSize: '0.6rem'
                        }} />
                        
                        {/* Nombre de la conexión */}
                        <span 
                          style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onClick={() => handleConnectToHistory(recentConn)}
                        >
                          {recentConn.name}
                        </span>

                        {/* Botones interactivos */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={(e) => e.stopPropagation()}>
                          {/* Botón de favorito */}
                          <span
                            title={recentConn.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: themeColors.textPrimary,
                              background: 'rgba(255,255,255,0.08)',
                              border: `1px solid ${themeColors.borderColor}`,
                              transition: 'all .15s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = themeColors.hoverBackground; e.style.color = themeColors.textPrimary; }}
                            onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.08)'; e.style.color = themeColors.textPrimary; }}
                            onClick={() => handleToggleFavorite(recentConn)}
                          >
                            <i className={recentConn.isFavorite ? 'pi pi-star-fill' : 'pi pi-star'} style={{ fontSize: '8px' }} />
                          </span>

                          {/* Botón de editar */}
                          {onEditConnection && (
                            <span
                              title="Editar"
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: themeColors.textPrimary,
                                background: 'rgba(255,255,255,0.08)',
                                border: `1px solid ${themeColors.borderColor}`,
                                transition: 'all .15s ease',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = themeColors.hoverBackground; e.style.color = themeColors.textPrimary; }}
                              onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.08)'; e.style.color = themeColors.textPrimary; }}
                              onClick={() => onEditConnection(recentConn)}
                            >
                              <i className="pi pi-pencil" style={{ fontSize: '8px' }} />
                            </span>
                          )}

                          {/* Botón de conectar */}
                          <span
                            title="Conectar"
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: themeColors.textPrimary,
                              background: 'rgba(255,255,255,0.08)',
                              border: `1px solid ${themeColors.borderColor}`,
                              transition: 'all .15s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = themeColors.hoverBackground; e.style.color = themeColors.textPrimary; }}
                            onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.08)'; e.style.color = themeColors.textPrimary; }}
                            onClick={() => handleConnectToHistory(recentConn)}
                          >
                            <i className="pi pi-external-link" style={{ fontSize: '8px' }} />
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.75rem',
                      color: themeColors.textSecondary,
                      fontSize: '0.75rem',
                      fontStyle: 'italic'
                    }}>
                      No hay conexiones recientes
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
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

  return (
    <div style={{
      height: '100%',
      width: '100%',
      position: 'relative'
    }}>
      <div style={{
        height: statusBarVisible ? 'calc(100% - 40px)' : '100%',
        width: '100%'
      }}>
        <SplitLayout
          key={`home-split-${themeVersion}`}
          leftTerminal={{ key: 'home_top', content: topPanel }}
          rightTerminal={{ key: 'home_bottom', content: bottomPanel }}
          orientation="horizontal"
          fontFamily={''}
          fontSize={16}
          theme={{ background: localTerminalBg }}
          onContextMenu={() => {}}
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