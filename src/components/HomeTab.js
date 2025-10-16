import React, { useState, useEffect, useRef } from 'react';
import SplitLayout from './SplitLayout';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Divider } from 'primereact/divider';
import { getVersionInfo } from '../version-info';
import TabbedTerminal from './TabbedTerminal';
import ConnectionHistory from './ConnectionHistory';
import QuickAccessSidebar from './QuickAccessSidebar';
import NodeTermStatus from './NodeTermStatus';
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
  onEditConnection,
  onLoadGroup,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [terminalState, setTerminalState] = useState('minimized'); // Cambiado a 'minimized' como en redesigned
  const [terminalHidden, setTerminalHidden] = useState(true);
  const [favType, setFavType] = useState('all'); // Nuevo estado para filtros
  const [recentConnections, setRecentConnections] = useState([]); // Estado para conexiones recientes
  const [recentPasswords, setRecentPasswords] = useState([]); // Estado para passwords recientes
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
      const recents = getRecents(5); // Limitar a 5 conexiones recientes
      setRecentConnections(recents);
    } catch (error) {
      console.error('Error cargando conexiones recientes:', error);
    }
  };

  const loadRecentPasswords = () => {
    try {
      const passwords = getRecentPasswords(5); // Limitar a 5 passwords recientes
      console.log('🔑 Passwords recientes cargados:', passwords);
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
        return '#ff6b35';
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

  // Obtener el color de fondo del tema actual
  const currentTheme = React.useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);
  
  const dashboardBg = React.useMemo(() => {
    return currentTheme.colors?.contentBackground || '#fafafa';
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
      // console.log('🖱️ Redimensionamiento manual detectado, volviendo a modo normal');
      setTerminalState('normal');
    }
  };

  // Función para toggle de visibilidad del terminal
  const handleToggleTerminalVisibility = () => {
    setTerminalHidden(prev => !prev);
  };

  // Determinar el tamaño del panel superior
  const getTopPanelSize = () => {
    // Si el terminal está oculto, el dashboard ocupa toda la pantalla
    if (terminalHidden) {
      return window.innerHeight - 20; // Ocupar casi toda la pantalla, dejando un pequeño margen
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
        return null;
    }

    return size;
  };

  // Panel superior: Nuevo layout con 3 columnas (basado en redesigned pero con ConnectionHistory)
  const topPanel = (
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
        {/* Layout principal con 3 columnas */}
        <div style={{
          display: 'flex',
          height: '100%',
          minHeight: '600px'
        }}>
          {/* Columna izquierda: Accesos Rápidos */}
          <QuickAccessSidebar
            onCreateSSHConnection={onCreateSSHConnection}
            onCreateFolder={onCreateFolder}
            onOpenFileExplorer={onOpenFileExplorer}
            onOpenSettings={onOpenSettings}
            onToggleTerminalVisibility={handleToggleTerminalVisibility}
            sshConnectionsCount={sshConnectionsCount}
            foldersCount={foldersCount}
          />

          {/* Columna central: Layout reorganizado con tarjetas arriba y favoritos abajo */}
          <div style={{
            flex: 1,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Cards de Conexiones Recientes y Passwords Recientes en la parte superior */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {/* Card de Conexiones Recientes */}
              <div style={{
                background: `linear-gradient(135deg,
                  rgba(16, 20, 28, 0.6) 0%,
                  rgba(16, 20, 28, 0.4) 100%)`,
                backdropFilter: 'blur(8px) saturate(140%)',
                WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                padding: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  marginBottom: '0.75rem'
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
                    color: 'var(--text-color)', 
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
                  marginBottom: '0.75rem'
                }} />
                {/* Lista de conexiones recientes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recentConnections.length > 0 ? (
                    recentConnections.map(recentConn => (
                      <div key={recentConn.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-color-secondary)',
                        fontSize: '0.8rem',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      >
                        {/* Icono del tipo de conexión */}
                        <i className={getConnectionTypeIcon(recentConn.type)} style={{
                          color: getConnectionTypeColor(recentConn.type),
                          fontSize: '0.9rem'
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
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-color)',
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.16)',
                              transition: 'all .15s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.16)'; e.style.color = '#fff'; }}
                            onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.08)'; e.style.color = 'var(--text-color)'; }}
                            onClick={() => handleToggleFavorite(recentConn)}
                          >
                            <i className={recentConn.isFavorite ? 'pi pi-star-fill' : 'pi pi-star'} style={{ fontSize: '10px' }} />
                          </span>

                          {/* Botón de editar */}
                          {onEditConnection && (
                            <span
                              title="Editar"
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-color)',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.16)',
                                transition: 'all .15s ease',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.16)'; e.style.color = '#fff'; }}
                              onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.08)'; e.style.color = 'var(--text-color)'; }}
                              onClick={() => onEditConnection(recentConn)}
                            >
                              <i className="pi pi-pencil" style={{ fontSize: '10px' }} />
                            </span>
                          )}

                          {/* Botón de conectar */}
                          <span
                            title="Conectar"
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-color)',
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.16)',
                              transition: 'all .15s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.16)'; e.style.color = '#fff'; }}
                            onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.08)'; e.style.color = 'var(--text-color)'; }}
                            onClick={() => handleConnectToHistory(recentConn)}
                          >
                            <i className="pi pi-external-link" style={{ fontSize: '10px' }} />
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      color: 'var(--text-color-secondary)',
                      fontSize: '0.8rem',
                      fontStyle: 'italic'
                    }}>
                      No hay conexiones recientes
                    </div>
                  )}
                </div>
              </div>

              {/* Card de Passwords Recientes */}
              <div style={{
                background: `linear-gradient(135deg,
                  rgba(16, 20, 28, 0.6) 0%,
                  rgba(16, 20, 28, 0.4) 100%)`,
                backdropFilter: 'blur(8px) saturate(140%)',
                WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                padding: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  marginBottom: '0.75rem'
                }}>
                  {/* Icono con efecto visual mejorado */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, rgba(102, 187, 106, 0.2) 0%, rgba(102, 187, 106, 0.1) 100%)',
                    border: '1px solid rgba(102, 187, 106, 0.3)',
                    boxShadow: '0 1px 4px rgba(102, 187, 106, 0.15)',
                    position: 'relative'
                  }}>
                    <i className="pi pi-key" style={{ 
                      color: '#66bb6a', 
                      fontSize: '0.9rem',
                      filter: 'drop-shadow(0 0 2px rgba(102, 187, 106, 0.4))'
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
                    color: 'var(--text-color)', 
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    letterSpacing: '0.1px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    Passwords Recientes
                  </h3>
                </div>
                {/* Línea decorativa con gradiente verde */}
                <div style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(102, 187, 106, 0.3), transparent)',
                  borderRadius: '1px',
                  marginBottom: '0.75rem'
                }} />
                {/* Lista de passwords recientes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recentPasswords.length > 0 ? (
                    recentPasswords.map(recentPass => (
                      <div key={recentPass.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-color-secondary)',
                        fontSize: '0.8rem',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      >
                        {/* Icono del tipo de password */}
                        <i className={getPasswordTypeIcon(recentPass.type)} style={{
                          color: getPasswordTypeColor(recentPass.type),
                          fontSize: '0.9rem'
                        }} />
                        
                        {/* Nombre del password */}
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {recentPass.name}
                        </span>

                        {/* Botones interactivos */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={(e) => e.stopPropagation()}>
                          {/* Botón de copiar usuario */}
                          {recentPass.username && (
                            <span
                              title="Copiar usuario"
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-color)',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.16)',
                                transition: 'all .15s ease',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.16)'; e.style.color = '#fff'; }}
                              onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.08)'; e.style.color = 'var(--text-color)'; }}
                              onClick={() => copyToClipboard(recentPass.username, 'Usuario')}
                            >
                              <i className="pi pi-user" style={{ fontSize: '10px' }} />
                            </span>
                          )}

                          {/* Botón de copiar contraseña */}
                          {recentPass.password && (
                            <span
                              title="Copiar contraseña"
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-color)',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.16)',
                                transition: 'all .15s ease',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.16)'; e.style.color = '#fff'; }}
                              onMouseLeave={(el) => { const e = el.currentTarget; e.style.background = 'rgba(255,255,255,0.08)'; e.style.color = 'var(--text-color)'; }}
                              onClick={() => copyToClipboard(recentPass.password, 'Contraseña')}
                            >
                              <i className="pi pi-key" style={{ fontSize: '10px' }} />
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      color: 'var(--text-color-secondary)',
                      fontSize: '0.8rem',
                      fontStyle: 'italic'
                    }}>
                      No hay passwords recientes
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card de ConnectionHistory (Conexiones Favoritas) en la parte inferior */}
            <div style={{
              background: `linear-gradient(135deg,
                rgba(16, 20, 28, 0.6) 0%,
                rgba(16, 20, 28, 0.4) 100%)`,
              backdropFilter: 'blur(8px) saturate(140%)',
              WebkitBackdropFilter: 'blur(8px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
              padding: '0.5rem',
              maxHeight: '440px',
              minHeight: '440px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
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
              />
            </div>
          </div>

          {/* Columna derecha: Estado y Recientes */}
          <div style={{
            width: '300px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Estado de NodeTerm */}
            <div style={{
              background: `linear-gradient(135deg,
                rgba(16, 20, 28, 0.6) 0%,
                rgba(16, 20, 28, 0.4) 100%)`,
              backdropFilter: 'blur(8px) saturate(140%)',
              WebkitBackdropFilter: 'blur(8px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}>
              <NodeTermStatus
                sshConnectionsCount={sshConnectionsCount}
                foldersCount={foldersCount}
                rdpConnectionsCount={rdpConnectionsCount}
              />
            </div>

            {/* Card adicional para futuras funcionalidades */}
            <div style={{
              background: `linear-gradient(135deg,
                rgba(16, 20, 28, 0.6) 0%,
                rgba(16, 20, 28, 0.4) 100%)`,
              backdropFilter: 'blur(8px) saturate(140%)',
              WebkitBackdropFilter: 'blur(8px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
              padding: '1rem',
              minHeight: '120px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem'
              }}>
                <i className="pi pi-plus-circle" style={{ color: 'var(--text-color-secondary)' }} />
                <h3 style={{
                  margin: 0,
                  color: 'var(--text-color)',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>
                  Nueva Funcionalidad
                </h3>
              </div>
              <div style={{
                color: 'var(--text-color-secondary)',
                fontSize: '0.8rem',
                textAlign: 'center',
                padding: '1rem 0'
              }}>
                Espacio reservado para futuras funcionalidades
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
        overflow: 'hidden'
      }}>
        {topPanel}
      </div>
    );
  }

  return (
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
      splitterColor={splitterColor}
    />
  );
};

export default HomeTab;