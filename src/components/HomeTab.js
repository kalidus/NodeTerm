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
  const [terminalHidden, setTerminalHidden] = useState(false);
  const [favType, setFavType] = useState('all'); // Nuevo estado para filtros
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

          {/* Columna central: ConnectionHistory con diseño mejorado */}
          <div style={{
            flex: 1,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Card de ConnectionHistory con estilo glassmorphism */}
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
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
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

            {/* Cards adicionales debajo de ConnectionHistory */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginTop: '1rem'
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
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  <i className="pi pi-history" style={{ color: 'var(--text-color-secondary)' }} />
                  <h3 style={{
                    margin: 0,
                    color: 'var(--text-color)',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}>
                    Conexiones Recientes
                  </h3>
                </div>
                {/* Lista de conexiones recientes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { id: 'r1', name: 'A Conex/bnd...', type: 'ssh' },
                    { id: 'r2', name: 'G Cenexions RDP...', type: 'rdp-guacamole' },
                    { id: 'r3', name: 'O Ubunt de activo', type: 'ssh' },
                    { id: 'r4', name: 'P Peeqia de Global', type: 'rdp-guacamole' },
                    { id: 'r5', name: 'Server Prod SSH', type: 'ssh' },
                    { id: 'r6', name: 'Admin Panel RDP', type: 'rdp-guacamole' },
                  ].map(recentConn => (
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
                    onClick={() => handleConnectToHistory(recentConn)}
                    >
                      <i className={recentConn.type === 'ssh' ? 'pi pi-server' : 'pi pi-desktop'} style={{
                        color: recentConn.type === 'ssh' ? '#4fc3f7' : '#ff6b35',
                        fontSize: '0.9rem'
                      }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {recentConn.name}
                      </span>
                    </div>
                  ))}
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
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  <i className="pi pi-key" style={{ color: 'var(--text-color-secondary)' }} />
                  <h3 style={{
                    margin: 0,
                    color: 'var(--text-color)',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}>
                    Passwords Recientes
                  </h3>
                </div>
                {/* Lista de passwords recientes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { id: 'p1', name: 'Gmail Account', type: 'web' },
                    { id: 'p2', name: 'GitHub Token', type: 'dev' },
                    { id: 'p3', name: 'AWS Access Key', type: 'cloud' },
                    { id: 'p4', name: 'Database Root', type: 'db' },
                    { id: 'p5', name: 'Office 365 Admin', type: 'web' },
                    { id: 'p6', name: 'Docker Registry', type: 'dev' },
                  ].map(recentPass => (
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
                      <i className={recentPass.type === 'web' ? 'pi pi-globe' : 
                                   recentPass.type === 'dev' ? 'pi pi-code' :
                                   recentPass.type === 'cloud' ? 'pi pi-cloud' : 'pi pi-database'} style={{
                        color: recentPass.type === 'web' ? '#4fc3f7' : 
                               recentPass.type === 'dev' ? '#66bb6a' :
                               recentPass.type === 'cloud' ? '#ff7043' : '#ab47bc',
                        fontSize: '0.9rem'
                      }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {recentPass.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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