import React, { useState, useEffect, useRef } from 'react';
import SplitLayout from './SplitLayout';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Divider } from 'primereact/divider';
import { getVersionInfo } from '../version-info';
import TabbedTerminal from './TabbedTerminal';
import QuickAccessSidebar from './QuickAccessSidebar';
import NodeTermStatusRedesigned from './NodeTermStatusRedesigned';
import { uiThemes } from '../themes/ui-themes';
import { themeManager } from '../utils/themeManager';
import { themes } from '../themes';

const HomeTabRedesigned = ({
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
  const [terminalState, setTerminalState] = useState('normal');
  const versionInfo = getVersionInfo();
  const tabbedTerminalRef = useRef();

  // Estado para forzar re-render al cambiar el tema
  const [themeVersion, setThemeVersion] = useState(0);

  // Escuchar cambios en el tema
  useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1);
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
    if (connection.type === 'group') {
      handleLoadGroup(connection);
    } else if (connection.type === 'rdp-guacamole') {
      handleCreateRdpConnection(connection);
    } else if (onCreateSSHConnection) {
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
    setTerminalState(newState);
  };

  const handleMaximizeTerminal = () => {
    const newState = terminalState === 'maximized' ? 'normal' : 'maximized';
    setTerminalState(newState);
  };

  const handleManualResize = () => {
    if (terminalState !== 'normal') {
      setTerminalState('normal');
    }
  };

  // Determinar el tamaño del panel superior
  const getTopPanelSize = () => {
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

  // Panel superior: Nuevo layout con 3 columnas
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
            sshConnectionsCount={sshConnectionsCount}
            foldersCount={foldersCount}
          />

          {/* Columna central: Solo Conexiones Favoritas */}
          <div style={{
            flex: 1,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginBottom: '1rem' 
            }}>
              <i className="pi pi-star-fill" style={{ color: '#FFD700' }} />
              <h3 style={{ 
                margin: 0, 
                color: 'var(--text-color)', 
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Conexiones Favoritas
              </h3>
            </div>
            
            {/* Grid de favoritos */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '0.75rem',
              flex: 1
            }}>
              {/* Cards de favoritos - usando datos de ejemplo por ahora */}
              {[
                { id: '1', name: 'BeeSer', type: 'rdp-guacamole', status: 'mixed' },
                { id: '2', name: 'Kepler', type: 'ssh', status: 'mixed' }
              ].map(connection => (
                <div
                  key={connection.id}
                  onClick={() => onConnectToHistory?.(connection)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: `linear-gradient(135deg, 
                      rgba(16, 20, 28, 0.8) 0%, 
                      rgba(16, 20, 28, 0.6) 100%)`,
                    backdropFilter: 'blur(10px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(140%)',
                    border: `1px solid ${connection.type === 'ssh' ? '#4fc3f7' : '#ff6b35'}40`,
                    borderRadius: '12px',
                    padding: '1rem',
                    boxShadow: `0 4px 16px rgba(0,0,0,0.2), 
                                 inset 0 1px 0 rgba(255,255,255,0.05)`,
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${connection.type === 'ssh' ? '#4fc3f7' : '#ff6b35'}25, 
                                                      0 4px 12px rgba(0,0,0,0.3),
                                                      inset 0 1px 0 rgba(255,255,255,0.1)`;
                    e.currentTarget.style.borderColor = `${connection.type === 'ssh' ? '#4fc3f7' : '#ff6b35'}70`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.2), 
                                                       inset 0 1px 0 rgba(255,255,255,0.05)`;
                    e.currentTarget.style.borderColor = `${connection.type === 'ssh' ? '#4fc3f7' : '#ff6b35'}40`;
                  }}
                >
                  {/* Icono y título */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: `linear-gradient(135deg, ${connection.type === 'ssh' ? '#4fc3f7' : '#ff6b35'}88, ${connection.type === 'ssh' ? '#4fc3f7' : '#ff6b35'}44)`,
                      border: '1px solid rgba(255,255,255,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)'
                    }}>
                      <i className={connection.type === 'ssh' ? 'pi pi-server' : 'pi pi-desktop'} style={{ 
                        color: '#fff', 
                        fontSize: '1.2rem' 
                      }} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        color: 'var(--text-color)', 
                        fontWeight: '700', 
                        fontSize: '0.9rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '0.25rem'
                      }}>
                        {connection.name}
                      </div>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: `${connection.type === 'ssh' ? '#4fc3f7' : '#ff6b35'}20`,
                        border: `1px solid ${connection.type === 'ssh' ? '#4fc3f7' : '#ff6b35'}40`,
                        color: connection.type === 'ssh' ? '#4fc3f7' : '#ff6b35',
                        fontSize: '0.6rem',
                        fontWeight: '600'
                      }}>
                        {connection.type === 'rdp-guacamole' ? 'RDP' : 'SSH'}
                      </div>
                    </div>
                  </div>

                  {/* Indicadores de estado */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '0.25rem'
                    }}>
                      {[1, 2, 3].map((_, index) => (
                        <div
                          key={index}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            boxShadow: 'none'
                          }}
                        />
                      ))}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditConnection?.(connection);
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        color: 'var(--text-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.16)';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = 'var(--text-color)';
                      }}
                    >
                      <i className="pi pi-pencil" style={{ fontSize: '0.6rem' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha: Estado y Recientes */}
          <div style={{
            width: '300px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'rgba(16, 20, 28, 0.4)',
            backdropFilter: 'blur(10px) saturate(140%)',
            borderLeft: '1px solid rgba(255,255,255,0.1)'
          }}>
            {/* Estado de NodeTerm */}
            <NodeTermStatusRedesigned
              sshConnectionsCount={sshConnectionsCount}
              foldersCount={foldersCount}
              rdpConnectionsCount={rdpConnectionsCount}
            />

            {/* Conexiones Recientes */}
            <div style={{
              background: 'rgba(16, 20, 28, 0.6)',
              backdropFilter: 'blur(8px) saturate(120%)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '1rem'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '0.75rem' 
              }}>
                <i className="pi pi-clock" style={{ color: '#4fc3f7' }} />
                <h3 style={{ 
                  margin: 0, 
                  color: 'var(--text-color)', 
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  Conexiones Recientes
                </h3>
              </div>
              
              {/* Lista de recientes simplificada */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.4rem' 
              }}>
                {[
                  { id: '1', name: 'Conex/bnd conecatad', type: 'ssh', status: 'mixed' },
                  { id: '2', name: 'Cenexions RDP aetad', type: 'rdp', status: 'mixed' },
                  { id: '3', name: 'Ubunt de activo', type: 'ssh', status: 'mixed' },
                  { id: '4', name: 'Peeqia de Global', type: 'ssh', status: 'mixed' }
                ].map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(79, 195, 247, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                    }}
                  >
                    {/* Icono pequeño */}
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      background: '#4fc3f7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.5rem',
                      fontWeight: 'bold',
                      color: 'white'
                    }}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    
                    {/* Texto */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        color: 'var(--text-color)', 
                        fontSize: '0.6rem',
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.name}
                      </div>
                    </div>
                    
                    {/* Indicadores de estado */}
                    <div style={{
                      display: 'flex',
                      gap: '0.2rem'
                    }}>
                      {[1, 2].map((_, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: idx === 0 ? '#4fc3f7' : '#ef4444'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
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
      display: 'flex',
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

  return (
    <>
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
    </>
  );
};

export default HomeTabRedesigned;
