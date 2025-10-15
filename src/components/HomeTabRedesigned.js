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
  const [favType, setFavType] = useState('all');
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
            {/* Card de Favoritos con estilo glassmorphism */}
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
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

                {/* Filtros por tipo */}
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'ssh', label: 'SSH' },
                    { key: 'rdp-guacamole', label: 'RDP' }
                  ].map(option => (
                    <button
                      key={option.key}
                      onClick={() => setFavType(option.key)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.14)',
                        background: favType === option.key ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                        color: 'var(--text-color)',
                        fontSize: '0.6rem',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px) saturate(130%)',
                        transition: 'all 0.2s ease',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        if (favType !== option.key) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (favType !== option.key) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
                        }
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid compacto 5x2 para favoritos - LISTA COMPACTA */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '0.6rem',
                width: '100%',
                flex: 1,
                overflow: 'auto'
              }}>
              {/* Cards de favoritos ULTRA ELEGANTES */}
              {(() => {
                // Datos de ejemplo con más conexiones
                const allConnections = [
                  { id: '1', name: 'BeeSer', type: 'rdp-guacamole', status: 'mixed', host: '192.168.1.100' },
                  { id: '2', name: 'Kepler', type: 'ssh', status: 'mixed', host: 'kepler.company.com' },
                  { id: '3', name: 'Adienta', type: 'ssh', status: 'mixed', host: 'adienta.dev' },
                  { id: '4', name: 'Aetins', type: 'ssh', status: 'mixed', host: 'aetins.local' },
                  { id: '5', name: 'Server RDP', type: 'rdp-guacamole', status: 'mixed', host: 'server.company.com' },
                  { id: '6', name: 'Dev Server', type: 'ssh', status: 'mixed', host: 'dev.internal' }
                ];
                
                // Aplicar filtro
                const filteredConnections = favType === 'all' 
                  ? allConnections 
                  : allConnections.filter(conn => conn.type === favType);
                
                return filteredConnections.map((connection, index) => (
                <div
                  key={connection.id}
                  onClick={() => onConnectToHistory?.(connection)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    background: `linear-gradient(145deg, 
                      rgba(0, 0, 0, 0.8) 0%, 
                      rgba(20, 25, 35, 0.9) 50%,
                      rgba(0, 0, 0, 0.9) 100%)`,
                    backdropFilter: 'blur(20px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(200%)',
                    border: `1px solid ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}80`,
                    borderRadius: '16px',
                    padding: '1rem',
                    boxShadow: `0 8px 32px rgba(0,0,0,0.6), 
                                0 4px 16px ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}30,
                                inset 0 1px 0 rgba(255,255,255,0.1),
                                inset 0 -1px 0 rgba(0,0,0,0.2)`,
                    overflow: 'hidden',
                    position: 'relative',
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transform: `translateY(${index * 1}px)`,
                    animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.03)';
                    e.currentTarget.style.boxShadow = `0 20px 60px rgba(0,0,0,0.8), 
                                                      0 8px 24px ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}50,
                                                      inset 0 1px 0 rgba(255,255,255,0.2),
                                                      inset 0 -1px 0 rgba(0,0,0,0.3)`;
                    e.currentTarget.style.borderColor = `${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}ff`;
                    e.currentTarget.style.background = `linear-gradient(145deg, 
                      rgba(0, 0, 0, 0.9) 0%, 
                      rgba(20, 25, 35, 0.95) 50%,
                      rgba(0, 0, 0, 0.95) 100%)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = `translateY(${index * 1}px) scale(1)`;
                    e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.6), 
                                                      0 4px 16px ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}30,
                                                      inset 0 1px 0 rgba(255,255,255,0.1),
                                                      inset 0 -1px 0 rgba(0,0,0,0.2)`;
                    e.currentTarget.style.borderColor = `${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}80`;
                    e.currentTarget.style.background = `linear-gradient(145deg, 
                      rgba(0, 0, 0, 0.8) 0%, 
                      rgba(20, 25, 35, 0.9) 50%,
                      rgba(0, 0, 0, 0.9) 100%)`;
                  }}
                >
                  {/* Efecto de resplandor tecnológico */}
                  <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}40, transparent)`,
                    filter: 'blur(30px)',
                    opacity: 0.6
                  }} />
                  
                  {/* Líneas de energía */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: `linear-gradient(90deg, 
                      transparent, 
                      ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}, 
                      transparent)`,
                    filter: 'blur(1px)',
                    animation: 'pulse 2s infinite'
                  }} />
                  
                  {/* Header tecnológico */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    {/* Icono holográfico */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: `linear-gradient(145deg, ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}dd, ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}aa)`,
                      border: `2px solid ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}60`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 6px 20px ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}60, 
                                  0 2px 8px rgba(0,0,0,0.4),
                                  inset 0 1px 0 rgba(255,255,255,0.3),
                                  inset 0 -1px 0 rgba(0,0,0,0.2)`,
                      flexShrink: 0,
                      position: 'relative'
                    }}>
                      {/* Efecto de escaneo */}
                      <div style={{
                        position: 'absolute',
                        top: '3px',
                        left: '3px',
                        right: '3px',
                        height: '2px',
                        background: 'rgba(255,255,255,0.8)',
                        borderRadius: '6px',
                        filter: 'blur(1px)',
                        animation: 'scan 3s infinite'
                      }} />
                      <i className={connection.type === 'ssh' ? 'pi pi-server' : 'pi pi-desktop'} style={{ 
                        color: '#fff', 
                        fontSize: '1.1rem',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                      }} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        color: '#ffffff', 
                        fontWeight: '900', 
                        fontSize: '0.9rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.2',
                        marginBottom: '0.3rem',
                        textShadow: '0 2px 4px rgba(0,0,0,0.7)',
                        letterSpacing: '0.5px'
                      }}>
                        {connection.name}
                      </div>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '8px',
                        background: `${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}25`,
                        border: `1px solid ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}60`,
                        color: '#ffffff',
                        fontSize: '0.6rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: `0 3px 12px ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}40,
                                    inset 0 1px 0 rgba(255,255,255,0.3)`
                      }}>
                        {connection.type === 'rdp-guacamole' ? 'RDP' : 'SSH'}
                      </div>
                    </div>
                  </div>

                  {/* Información del host con estilo tecnológico */}
                  <div style={{
                    color: '#b0b0b0',
                    fontSize: '0.6rem',
                    fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '0.3rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '0.5rem',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '1px',
                      background: `linear-gradient(90deg, transparent, ${connection.type === 'ssh' ? '#00d4ff' : '#ff6b00'}, transparent)`,
                      opacity: 0.6
                    }} />
                    {connection.host}
                  </div>

                  {/* Footer con controles futuristas */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    {/* Indicadores de estado holográficos */}
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {[1, 2, 3].map((_, dotIndex) => (
                        <div
                          key={dotIndex}
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: dotIndex === 0 ? '#00ff88' : '#ff4444',
                            boxShadow: dotIndex === 0 ? '0 0 12px rgba(0, 255, 136, 0.8)' : '0 0 8px rgba(255, 68, 68, 0.6)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            animation: dotIndex === 0 ? 'pulse 2s infinite' : 'none'
                          }}
                        />
                      ))}
                    </div>
                    
                    {/* Controles futuristas */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditConnection?.(connection);
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: 'rgba(0, 212, 255, 0.15)',
                          border: '1px solid rgba(0, 212, 255, 0.4)',
                          color: '#00d4ff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 3px 12px rgba(0, 212, 255, 0.3)',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 212, 255, 0.25)';
                          e.currentTarget.style.borderColor = '#00d4ff';
                          e.currentTarget.style.transform = 'scale(1.15)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 212, 255, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 212, 255, 0.15)';
                          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.4)';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 3px 12px rgba(0, 212, 255, 0.3)';
                        }}
                      >
                        <i className="pi pi-pencil" style={{ fontSize: '0.5rem' }} />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Acción de favorito
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: 'rgba(255, 215, 0, 0.15)',
                          border: '1px solid rgba(255, 215, 0, 0.4)',
                          color: '#FFD700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 3px 12px rgba(255, 215, 0, 0.3)',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 215, 0, 0.25)';
                          e.currentTarget.style.borderColor = '#FFD700';
                          e.currentTarget.style.transform = 'scale(1.15)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 215, 0, 0.15)';
                          e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 3px 12px rgba(255, 215, 0, 0.3)';
                        }}
                      >
                        <i className="pi pi-star-fill" style={{ fontSize: '0.5rem' }} />
                      </button>
                    </div>
                  </div>
                </div>
                ));
              })()}
              </div>
            </div>

            {/* Cards adicionales debajo de favoritos */}
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
              <NodeTermStatusRedesigned
                sshConnectionsCount={sshConnectionsCount}
                foldersCount={foldersCount}
                rdpConnectionsCount={rdpConnectionsCount}
              />
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
