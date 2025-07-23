import React, { useState, useEffect } from 'react';
import SplitLayout from './SplitLayout';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Divider } from 'primereact/divider';
import { getVersionInfo } from '../version-info';
import TabbedTerminal from './TabbedTerminal';
import SystemStats from './SystemStats';
import ConnectionHistory from './ConnectionHistory';
import QuickActions from './QuickActions';
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
  localFontFamily,
  localFontSize,
  localPowerShellTheme,
  localLinuxTerminalTheme,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [terminalState, setTerminalState] = useState('normal'); // 'normal', 'minimized', 'maximized'
  const versionInfo = getVersionInfo();

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
  const currentTheme = themeManager.getCurrentTheme() || uiThemes['Light'];
  const dashboardBg = currentTheme.colors?.contentBackground || '#fafafa';
  const localTerminalBg = themes[localLinuxTerminalTheme]?.theme?.background || '#222';

  const handleConnectToHistory = (connection) => {
    // console.log('Conectando a:', connection);
    if (onCreateSSHConnection) {
      onCreateSSHConnection(connection);
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

  // Determinar el tamaño del panel superior (Dashboard) basado en el estado del terminal
  const getTopPanelSize = () => {
    const containerHeight = window.innerHeight;
    let size;

    switch (terminalState) {
      case 'minimized':
        // Terminal minimizado: Dashboard ocupa casi todo, terminal solo 40px (pestañas)
        size = Math.max(containerHeight - 40, 100); // Mínimo 100px para el dashboard
        break;
      case 'maximized':
        // Terminal maximizado: Dashboard desaparece, terminal ocupa todo
        size = 0;
        break;
      default:
        // Estado normal: permitir redimensionamiento manual
        return null; // No controlar externamente, usar redimensionamiento manual
    }

    // console.log('📏 getTopPanelSize:', {
    //   terminalState,
    //   containerHeight,
    //   topPanelSize: size,
    //   terminalSize: containerHeight - size
    // });

    return size;
  };

  // Panel superior: Dashboard moderno con pestañas
  const topPanel = (
    <div style={{
      height: '100%',
      overflow: 'hidden',
      background: dashboardBg,
      display: 'flex',
      flexDirection: 'column',
      opacity: terminalState === 'maximized' ? 0 : 1, // Ocultar completamente cuando maximizado
      visibility: terminalState === 'maximized' ? 'hidden' : 'visible', // Evitar interacciones
      transition: 'opacity 0.1s ease, visibility 0.1s ease' // Transición más rápida como minimizar
    }}>
      {/* Contenido principal con pestañas */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TabView
          activeIndex={activeIndex}
          onTabChange={(e) => setActiveIndex(e.index)}
          style={{ height: '100%' }}
          className="dashboard-tabs"
        >
          {/* Pestaña de Estadísticas del Sistema */}
          <TabPanel header="📊 Sistema">
            <div style={{
              height: 'calc(100vh - 80px)',
              overflow: 'auto',
              padding: '1rem'
            }}>
              <SystemStats />
            </div>
          </TabPanel>

          {/* Pestaña de Historial de Conexiones */}
          <TabPanel header="🕒 Historial">
            <div style={{
              height: 'calc(100vh - 80px)',
              overflow: 'auto',
              padding: '1rem'
            }}>
              <h2 style={{
                margin: '0 0 1rem 0',
                color: 'var(--text-color)',
                fontSize: '1.5rem',
                textAlign: 'center'
              }}>
                Historial de Conexiones
              </h2>
              <ConnectionHistory onConnectToHistory={handleConnectToHistory} />
            </div>
          </TabPanel>

          {/* Pestaña de Acciones Rápidas */}
          <TabPanel header="⚡ Acciones">
            <div style={{
              height: 'calc(100vh - 80px)',
              overflow: 'auto',
              padding: '1rem'
            }}>
              <h2 style={{
                margin: '0 0 1rem 0',
                color: 'var(--text-color)',
                fontSize: '1.5rem',
                textAlign: 'center'
              }}>
                Acciones Rápidas
              </h2>
              <QuickActions
                onCreateSSHConnection={onCreateSSHConnection}
                onCreateFolder={onCreateFolder}
                onOpenFileExplorer={onOpenFileExplorer}
                onOpenSettings={onOpenSettings}
                sshConnectionsCount={sshConnectionsCount}
                foldersCount={foldersCount}
              />
            </div>
          </TabPanel>

          {/* Pestaña de Información */}
          <TabPanel header="ℹ️ Info">
            <div style={{
              height: 'calc(100vh - 80px)',
              overflow: 'auto',
              padding: '2rem'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{
                  margin: '0 0 0.5rem 0',
                  color: 'var(--text-color)',
                  fontSize: '1.5rem'
                }}>
                  Acerca de NodeTerm
                </h2>
                <p style={{
                  margin: 0,
                  color: 'var(--text-color-secondary)',
                  fontSize: '1rem'
                }}>
                  Terminal moderno y potente para profesionales
                </p>
              </div>

              {/* Características principales */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {[
                  {
                    icon: 'pi pi-desktop',
                    title: 'Terminal SSH Avanzado',
                    description: 'Conexiones SSH completas con soporte para múltiples sesiones simultáneas y splits de pantalla.'
                  },
                  {
                    icon: 'pi pi-folder-open',
                    title: 'Explorador de Archivos',
                    description: 'Navega y gestiona archivos remotos de forma intuitiva con interfaz gráfica moderna.'
                  },
                  {
                    icon: 'pi pi-chart-line',
                    title: 'Monitoreo del Sistema',
                    description: 'Estadísticas en tiempo real de CPU, memoria, discos y red para optimizar el rendimiento.'
                  },
                  {
                    icon: 'pi pi-palette',
                    title: 'Personalización Total',
                    description: 'Múltiples temas, configuraciones avanzadas y opciones de personalización visual.'
                  }
                ].map((feature, index) => (
                  <Card
                    key={index}
                    style={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ padding: '1.5rem' }}>
                      <i
                        className={feature.icon}
                        style={{
                          fontSize: '2.5rem',
                          color: 'var(--primary-color)',
                          marginBottom: '1rem',
                          display: 'block'
                        }}
                      />
                      <h3 style={{
                        marginBottom: '0.75rem',
                        color: 'var(--text-color)',
                        fontSize: '1.1rem'
                      }}>
                        {feature.title}
                      </h3>
                      <p style={{
                        color: 'var(--text-color-secondary)',
                        lineHeight: '1.5',
                        margin: 0,
                        fontSize: '0.9rem'
                      }}>
                        {feature.description}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Información técnica */}
              <Card style={{
                background: 'var(--surface-section)',
                border: '1px solid var(--surface-border)'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.5rem',
                  textAlign: 'center'
                }}>
                  <div>
                    <h4 style={{
                      margin: '0 0 0.5rem 0',
                      color: 'var(--text-color)'
                    }}>
                      Versión
                    </h4>
                    <p style={{
                      margin: 0,
                      color: 'var(--text-color-secondary)',
                      fontSize: '1.1rem',
                      fontWeight: 'bold'
                    }}>
                      {versionInfo.version}
                    </p>
                  </div>

                  <div>
                    <h4 style={{
                      margin: '0 0 0.5rem 0',
                      color: 'var(--text-color)'
                    }}>
                      Electron
                    </h4>
                    <p style={{
                      margin: 0,
                      color: 'var(--text-color-secondary)',
                      fontSize: '1.1rem',
                      fontWeight: 'bold'
                    }}>
                      {versionInfo.electron}
                    </p>
                  </div>

                  <div>
                    <h4 style={{
                      margin: '0 0 0.5rem 0',
                      color: 'var(--text-color)'
                    }}>
                      Node.js
                    </h4>
                    <p style={{
                      margin: 0,
                      color: 'var(--text-color-secondary)',
                      fontSize: '1.1rem',
                      fontWeight: 'bold'
                    }}>
                      {versionInfo.node}
                    </p>
                  </div>

                  <div>
                    <h4 style={{
                      margin: '0 0 0.5rem 0',
                      color: 'var(--text-color)'
                    }}>
                      Chrome
                    </h4>
                    <p style={{
                      margin: 0,
                      color: 'var(--text-color-secondary)',
                      fontSize: '1.1rem',
                      fontWeight: 'bold'
                    }}>
                      {versionInfo.chrome}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabPanel>
        </TabView>
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

  const splitterColor = currentTheme.colors?.splitter || dashboardBg;

  return (
    <SplitLayout
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