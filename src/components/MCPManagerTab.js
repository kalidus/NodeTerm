import React, { useState, useEffect, useMemo } from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import MCPCatalog from './MCPCatalog';
import mcpClient from '../services/MCPClientService';

const MCPManagerTab = ({ themeColors }) => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const toastRef = React.useRef(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();

    // Listener para cambios - SOLO escuchar eventos específicos que requieren actualización
    const unsubscribe = mcpClient.addListener((event, data) => {
      console.log('[MCP Manager] Event:', event, data);
      
      // Solo actualizar en eventos de cambio real, NO en eventos de refresh
      if (event === 'server-installed' || 
          event === 'server-uninstalled' || 
          event === 'server-started' || 
          event === 'server-stopped' ||
          event === 'server-toggled') {
        loadData();
      } else if (event === 'servers-updated' || 
                 event === 'tools-updated' || 
                 event === 'resources-updated' || 
                 event === 'prompts-updated') {
        // Para estos eventos, solo actualizar el estado local sin refrescar
        setServers(mcpClient.getServers());
        setStats(mcpClient.getStats());
      }
      // Ignorar evento 'refresh' para evitar bucle
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      // Solo refrescar servidores, el resto se obtiene del cache
      await mcpClient.refreshServers();
      setServers(mcpClient.getServers());
      setStats(mcpClient.getStats());
    } catch (error) {
      console.error('Error cargando datos MCP:', error);
      showToast('error', 'Error', 'No se pudieron cargar los datos de MCP');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (severity, summary, detail) => {
    if (toastRef.current) {
      toastRef.current.show({ severity, summary, detail, life: 3000 });
    }
  };

  // Manejar toggle de servidor
  const handleToggleServer = async (serverId, currentlyEnabled) => {
    try {
      const result = await mcpClient.toggleServer(serverId, !currentlyEnabled);
      if (result.success) {
        showToast('success', 'Éxito', `Servidor ${!currentlyEnabled ? 'activado' : 'desactivado'}`);
        await loadData();
      } else {
        showToast('error', 'Error', result.error || 'No se pudo cambiar el estado del servidor');
      }
    } catch (error) {
      showToast('error', 'Error', error.message);
    }
  };

  // Manejar desinstalación
  const handleUninstall = async (serverId) => {
    if (!confirm(`¿Estás seguro de desinstalar el servidor ${serverId}?`)) {
      return;
    }

    try {
      const result = await mcpClient.uninstallServer(serverId);
      if (result.success) {
        showToast('success', 'Éxito', 'Servidor desinstalado correctamente');
        await loadData();
      } else {
        showToast('error', 'Error', result.error || 'No se pudo desinstalar el servidor');
      }
    } catch (error) {
      showToast('error', 'Error', error.message);
    }
  };

  // Manejar inicio de servidor
  const handleStartServer = async (serverId) => {
    try {
      const result = await mcpClient.startServer(serverId);
      if (result.success) {
        showToast('success', 'Éxito', 'Servidor iniciado correctamente');
        await loadData();
      } else {
        showToast('error', 'Error', result.error || 'No se pudo iniciar el servidor');
      }
    } catch (error) {
      showToast('error', 'Error', error.message);
    }
  };

  // Manejar detención de servidor
  const handleStopServer = async (serverId) => {
    try {
      const result = await mcpClient.stopServer(serverId);
      if (result.success) {
        showToast('success', 'Éxito', 'Servidor detenido correctamente');
        await loadData();
      } else {
        showToast('error', 'Error', result.error || 'No se pudo detener el servidor');
      }
    } catch (error) {
      showToast('error', 'Error', error.message);
    }
  };

  // Manejar instalación desde catálogo
  const handleInstall = async (serverId, config) => {
    console.log('🔧 [MCP Manager] Instalando:', serverId, config);
    
    try {
      showToast('info', 'Instalando', `Instalando MCP ${serverId}...`);
      
      const result = await mcpClient.installServer(serverId, config);
      console.log('🔧 [MCP Manager] Resultado instalación:', result);
      
      if (result.success) {
        showToast('success', 'Éxito', `MCP ${serverId} instalado correctamente`);
        // Esperar un momento y recargar
        setTimeout(() => loadData(), 1000);
      } else {
        showToast('error', 'Error', result.error || 'No se pudo instalar el MCP');
        console.error('❌ [MCP Manager] Error instalación:', result.error);
      }
    } catch (error) {
      showToast('error', 'Error', error.message);
      console.error('❌ [MCP Manager] Error instalación:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <ProgressSpinner
          style={{ width: '50px', height: '50px' }}
          strokeWidth="3"
          fill="transparent"
          animationDuration=".8s"
        />
        <p style={{ color: themeColors.textSecondary, fontSize: '0.9rem' }}>
          Cargando MCPs...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      padding: '1rem',
      height: '600px',
      overflow: 'hidden'
    }}>
      <Toast ref={toastRef} />

      {/* Resumen rápido */}
      <div style={{
        background: `linear-gradient(135deg, ${themeColors.primaryColor}20 0%, ${themeColors.primaryColor}10 100%)`,
        border: `1px solid ${themeColors.primaryColor}40`,
        borderRadius: '12px',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{
              fontSize: '0.75rem',
              color: themeColors.textSecondary,
              marginBottom: '0.25rem'
            }}>
              MCPs Activos
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: themeColors.textPrimary
            }}>
              {stats?.activeServers || 0}
            </div>
          </div>
          
          <div>
            <div style={{
              fontSize: '0.75rem',
              color: themeColors.textSecondary,
              marginBottom: '0.25rem'
            }}>
              Herramientas
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: themeColors.textPrimary
            }}>
              {stats?.totalTools || 0}
            </div>
          </div>
          
          <div>
            <div style={{
              fontSize: '0.75rem',
              color: themeColors.textSecondary,
              marginBottom: '0.25rem'
            }}>
              Resources
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: themeColors.textPrimary
            }}>
              {stats?.totalResources || 0}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '0.75rem',
              color: themeColors.textSecondary,
              marginBottom: '0.25rem'
            }}>
              Prompts
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: themeColors.textPrimary
            }}>
              {stats?.totalPrompts || 0}
            </div>
          </div>
        </div>

        <Button
          label="Refrescar"
          icon={refreshing ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
          onClick={loadData}
          disabled={refreshing}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: themeColors.textPrimary,
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}
        />
      </div>

      {/* Layout de 2 columnas */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '400px 1fr',
        gap: '1.5rem',
        minHeight: 0
      }}>
        {/* Columna izquierda: MCPs Instalados */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          minHeight: 0
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: '600',
            color: themeColors.textPrimary,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="pi pi-server" />
            MCPs Instalados ({servers.length})
          </h3>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '0.25rem'
          }}>
            {servers.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: themeColors.textSecondary,
                fontSize: '0.9rem'
              }}>
                <i className="pi pi-inbox" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }} />
                <p style={{ margin: 0 }}>No hay MCPs instalados</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem' }}>
                  Instala un MCP desde el catálogo →
                </p>
              </div>
            ) : (
              servers.map(server => (
                <div
                  key={server.id}
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
                    border: `1px solid ${server.running ? 'rgba(100, 200, 100, 0.4)' : themeColors.borderColor}`,
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  {/* Header con nombre y toggle */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: themeColors.textPrimary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {server.id}
                      </h4>
                      <p style={{
                        margin: '0.15rem 0 0 0',
                        fontSize: '0.75rem',
                        color: themeColors.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: server.running ? '#66bb6a' : '#757575'
                        }} />
                        {server.state || 'stopped'}
                      </p>
                    </div>

                    <InputSwitch
                      checked={server.config.enabled}
                      onChange={(e) => handleToggleServer(server.id, server.config.enabled)}
                      style={{ transform: 'scale(0.85)' }}
                    />
                  </div>

                  {/* Estadísticas */}
                  {server.running && (
                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      fontSize: '0.75rem',
                      color: themeColors.textSecondary
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <i className="pi pi-wrench" />
                        <span>{server.toolsCount || 0} tools</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <i className="pi pi-box" />
                        <span>{server.resourcesCount || 0} resources</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <i className="pi pi-comment" />
                        <span>{server.promptsCount || 0} prompts</span>
                      </div>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {server.config.enabled && !server.running && (
                      <Button
                        label="Iniciar"
                        icon="pi pi-play"
                        onClick={() => handleStartServer(server.id)}
                        style={{
                          flex: 1,
                          background: 'rgba(100, 200, 100, 0.2)',
                          border: '1px solid rgba(100, 200, 100, 0.4)',
                          color: themeColors.textPrimary,
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          padding: '0.4rem'
                        }}
                      />
                    )}

                    {server.running && (
                      <Button
                        label="Detener"
                        icon="pi pi-stop"
                        onClick={() => handleStopServer(server.id)}
                        style={{
                          flex: 1,
                          background: 'rgba(255, 193, 7, 0.2)',
                          border: '1px solid rgba(255, 193, 7, 0.4)',
                          color: themeColors.textPrimary,
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          padding: '0.4rem'
                        }}
                      />
                    )}

                    <Button
                      icon="pi pi-cog"
                      onClick={() => {
                        // TODO: Abrir diálogo de configuración
                        showToast('info', 'Próximamente', 'Función de configuración en desarrollo');
                      }}
                      tooltip="Configurar"
                      tooltipOptions={{ position: 'top' }}
                      style={{
                        background: 'rgba(33, 150, 243, 0.2)',
                        border: '1px solid rgba(33, 150, 243, 0.4)',
                        color: '#2196f3',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        padding: '0.4rem',
                        minWidth: 'auto',
                        aspectRatio: '1'
                      }}
                    />
                    
                    <Button
                      icon="pi pi-trash"
                      onClick={() => handleUninstall(server.id)}
                      tooltip="Desinstalar"
                      tooltipOptions={{ position: 'top' }}
                      style={{
                        background: 'rgba(244, 67, 54, 0.2)',
                        border: '1px solid rgba(244, 67, 54, 0.4)',
                        color: '#f44336',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        padding: '0.4rem',
                        minWidth: 'auto',
                        aspectRatio: '1'
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna derecha: Catálogo */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          minHeight: 0
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: '600',
            color: themeColors.textPrimary,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="pi pi-th-large" />
            Catálogo de MCPs
          </h3>

          <div style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <MCPCatalog
              installedServers={servers}
              onInstall={handleInstall}
              themeColors={themeColors}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPManagerTab;

