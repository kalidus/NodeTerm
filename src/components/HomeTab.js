import React, { useState } from 'react';
import SplitLayout from './SplitLayout';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { Divider } from 'primereact/divider';
import { getVersionInfo } from '../version-info';
import TabbedTerminal from './TabbedTerminal';
import SystemStats from './SystemStats';
import ConnectionHistory from './ConnectionHistory';
import QuickActions from './QuickActions';

const HomeTab = ({ 
  onCreateSSHConnection, 
  onCreateFolder,
  onOpenFileExplorer,
  onOpenSettings,
  sshConnectionsCount = 0,
  foldersCount = 0 
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const versionInfo = getVersionInfo();

  const handleConnectToHistory = (connection) => {
    console.log('Conectando a:', connection);
    if (onCreateSSHConnection) {
      onCreateSSHConnection(connection);
    }
  };

  // Panel superior: Dashboard moderno con pestañas
  const topPanel = (
    <div style={{ 
      height: '100%', 
      overflow: 'hidden',
      background: 'var(--surface-ground, #fafafa)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header del dashboard */}
      <div style={{ 
        padding: '1.5rem 2rem 1rem 2rem',
        background: 'linear-gradient(135deg, var(--primary-color, #1976d2) 0%, #1565C0 100%)',
        color: 'white',
        borderBottom: '1px solid var(--surface-border)'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 0.5rem 0',
              fontSize: '2rem',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              NodeTerm Dashboard
            </h1>
            <p style={{ 
              margin: 0,
              fontSize: '1rem',
              opacity: 0.9
            }}>
              Terminal moderno para conexiones SSH y gestión de sistemas remotos
            </p>
          </div>
          
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            fontSize: '0.9rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {sshConnectionsCount}
              </div>
              <div style={{ opacity: 0.8 }}>Conexiones</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {foldersCount}
              </div>
              <div style={{ opacity: 0.8 }}>Carpetas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                v{versionInfo.version}
              </div>
              <div style={{ opacity: 0.8 }}>NodeTerm</div>
            </div>
          </div>
        </div>
      </div>

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
              height: 'calc(100vh - 240px)',
              overflow: 'auto',
              padding: '1rem'
            }}>
              <h2 style={{ 
                margin: '0 0 1rem 0',
                color: 'var(--text-color)',
                fontSize: '1.5rem',
                textAlign: 'center'
              }}>
                Estadísticas del Sistema
              </h2>
              <SystemStats />
            </div>
          </TabPanel>

          {/* Pestaña de Historial de Conexiones */}
          <TabPanel header="🕒 Historial">
            <div style={{ 
              height: 'calc(100vh - 240px)',
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
              height: 'calc(100vh - 240px)',
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
              height: 'calc(100vh - 240px)',
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
      overflow: 'hidden'
    }}>
      <TabbedTerminal />
    </div>
  );

  return (
    <SplitLayout
      leftTerminal={{ key: 'home_top', content: topPanel }}
      rightTerminal={{ key: 'home_bottom', content: bottomPanel }}
      orientation="horizontal"
      fontFamily={''}
      fontSize={16}
      theme={{}}
      onContextMenu={() => {}}
      sshStatsByTabId={{}}
      terminalRefs={{ current: {} }}
      statusBarIconTheme="classic"
      isHomeTab={true}
    />
  );
};

export default HomeTab;