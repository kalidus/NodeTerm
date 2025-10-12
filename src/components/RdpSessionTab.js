import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { Divider } from 'primereact/divider';

const RdpSessionTab = ({ rdpConfig, tabId, connectionStatus: tabConnectionStatus, connectionInfo: tabConnectionInfo, isActive, onEditConnection }) => {
  const [connectionStatus, setConnectionStatus] = useState(tabConnectionStatus || 'disconnected');
  const [connectionInfo, setConnectionInfo] = useState(tabConnectionInfo || null);
  const [error, setError] = useState(null);
  const toast = React.useRef(null);

  // Nota: isActive indica si esta pestaña está visible actualmente
  // Para sesiones RDP (mstsc.exe), la conexión es un proceso independiente que no se ve afectado por cambios de pestaña
  // Sin embargo, mantenemos esta prop para posibles mejoras futuras y consistencia con otros componentes

  // Sincronizar con el estado de la pestaña
  useEffect(() => {
    if (tabConnectionStatus) {
      setConnectionStatus(tabConnectionStatus);
    }
    if (tabConnectionInfo) {
      setConnectionInfo(tabConnectionInfo);
    }
  }, [tabConnectionStatus, tabConnectionInfo]);

  const handleDisconnect = () => {
    setConnectionStatus('disconnected');
    setConnectionInfo(null);
    
    toast.current?.show({
      severity: 'info',
      summary: 'Desconectado',
      detail: 'Conexión RDP terminada',
      life: 3000
    });
  };

  const getStatusSeverity = (status) => {
    switch (status) {
      case 'connecting': return 'warning';
      case 'connected': return 'success';
      case 'error': return 'danger';
      case 'disconnected': return 'secondary';
      default: return 'info';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'connecting': return 'Conectando...';
      case 'connected': return 'Conectado';
      case 'error': return 'Error';
      case 'disconnected': return 'Desconectado';
      default: return 'Desconocido';
    }
  };

  const handleConnect = () => {
    try {
      if (window.electron && window.electron.ipcRenderer) {
        setConnectionStatus('connecting');
        window.electron.ipcRenderer.invoke('rdp:connect', rdpConfig).then(result => {
          if (result.success) {
            setConnectionStatus('connected');
            setConnectionInfo({
              server: rdpConfig.server,
              username: rdpConfig.username,
              port: rdpConfig.port,
              resolution: rdpConfig.resolution,
              startTime: new Date().toISOString(),
              sessionId: result.connectionId || `rdp_${tabId}_${Date.now()}`
            });
            toast.current?.show({
              severity: 'success',
              summary: 'Conexión RDP iniciada',
              detail: `Conexión RDP establecida con ${rdpConfig.server}`,
              life: 3000
            });
          } else {
            setConnectionStatus('error');
            setError(result.error);
            toast.current?.show({
              severity: 'error',
              summary: 'Error de conexión RDP',
              detail: result.error,
              life: 5000
            });
          }
        }).catch(err => {
          setConnectionStatus('error');
          setError(err.message);
          toast.current?.show({
            severity: 'error',
            summary: 'Error de conexión RDP',
            detail: err.message,
            life: 5000
          });
        });
      } else {
        // Fallback para navegador
        window.open(`rdp://${rdpConfig.server}:${rdpConfig.port || 3389}`, '_blank');
        setConnectionStatus('connected');
        setConnectionInfo({
          server: rdpConfig.server,
          username: rdpConfig.username,
          port: rdpConfig.port,
          resolution: rdpConfig.resolution,
          startTime: new Date().toISOString(),
          sessionId: `rdp_${tabId}_${Date.now()}`
        });
        
        toast.current?.show({
          severity: 'success',
          summary: 'Conexión RDP iniciada',
          detail: `Abriendo conexión RDP a ${rdpConfig.server}`,
          life: 3000
        });
      }
    } catch (err) {
      setError(err.message);
      toast.current?.show({
        severity: 'error',
        summary: 'Error al abrir RDP',
        detail: err.message,
        life: 5000
      });
    }
  };

  const handleShowWindow = async () => {
    try {
      if (window.electron && window.electron.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('rdp:show-window', { server: rdpConfig.server });
        if (result.success) {
          toast.current?.show({
            severity: 'success',
            summary: 'Ventana RDP',
            detail: result.message,
            life: 2000
          });
        } else {
          toast.current?.show({
            severity: 'warn',
            summary: 'Ventana RDP',
            detail: result.message || result.error,
            life: 3000
          });
        }
      } else {
        toast.current?.show({
          severity: 'warn',
          summary: 'No disponible',
          detail: 'Función no disponible en este entorno',
          life: 2000
        });
      }
    } catch (err) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Error',
        detail: 'Error al mostrar la ventana RDP',
        life: 2000
      });
    }
  };

  const handleReconnect = () => {
    setConnectionStatus('connecting');
    setError(null);
    // Reconectar usando el RdpManager
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.invoke('rdp:connect', rdpConfig).then(result => {
        if (result.success) {
          setConnectionStatus('connected');
          setConnectionInfo({
            server: rdpConfig.server,
            username: rdpConfig.username,
            port: rdpConfig.port,
            resolution: rdpConfig.resolution,
            startTime: new Date().toISOString(),
            sessionId: result.connectionId || `rdp_${tabId}_${Date.now()}`
          });
          toast.current?.show({
            severity: 'success',
            summary: 'Reconectado',
            detail: 'Conexión RDP restablecida',
            life: 3000
          });
        } else {
          setConnectionStatus('error');
          setError(result.error);
        }
      }).catch(err => {
        setConnectionStatus('error');
        setError(err.message);
      });
    }
  };

  const handleDisconnectAction = async () => {
    try {
      // Intentar desconectar la sesión RDP
      if (window.electron && window.electron.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('rdp:disconnect-session', { server: rdpConfig.server });
        if (result.success) {
          toast.current?.show({
            severity: 'success',
            summary: 'Sesión RDP',
            detail: result.message,
            life: 2000
          });
        } else {
          toast.current?.show({
            severity: 'warn',
            summary: 'Sesión RDP',
            detail: result.message || result.error,
            life: 3000
          });
        }
      }
      handleDisconnect();
    } catch (err) {
      handleDisconnect();
    }
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '1.5rem',
      background: 'var(--ui-content-bg)',
      gap: '1.5rem'
    }}>
      <Toast ref={toast} />
      
      {/* Header con estado de conexión */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'var(--ui-content-bg)',
        border: '1px solid var(--ui-content-border)',
        borderRadius: '12px',
        padding: '1rem 1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <i className="pi pi-desktop" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}></i>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.2rem', 
              fontWeight: '600',
              color: 'var(--ui-content-text)'
            }}>
              Sesión RDP
            </h2>
            <p style={{ 
              margin: 0, 
              fontSize: '0.9rem', 
              color: 'var(--text-color-secondary)',
              marginTop: '0.25rem'
            }}>
              {rdpConfig.server}:{rdpConfig.port}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Tag 
            value={getStatusLabel(connectionStatus)} 
            severity={getStatusSeverity(connectionStatus)}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          />
          {connectionStatus === 'connecting' && (
            <ProgressSpinner style={{ width: '24px', height: '24px' }} />
          )}
        </div>
      </div>

      {/* Botones de acción principales */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <Button
          label="Conectar RDP"
          icon="pi pi-external-link"
          severity="success"
          size="large"
          onClick={handleConnect}
          style={{ 
            flex: '1', 
            minWidth: '140px',
            height: '3rem',
            fontWeight: '600'
          }}
        />
        
        <Button
          label="Editar Conexión"
          icon="pi pi-pencil"
          severity="warning"
          size="large"
          onClick={() => {
            if (onEditConnection) {
              onEditConnection(rdpConfig, tabId);
            } else {
              toast.current?.show({
                severity: 'info',
                summary: 'Editar Conexión',
                detail: 'Abriendo editor de conexión RDP...',
                life: 3000
              });
            }
          }}
          style={{ 
            flex: '1', 
            minWidth: '140px',
            height: '3rem',
            fontWeight: '600'
          }}
        />
        
        <Button
          label="Mostrar Ventana"
          icon="pi pi-window-maximize"
          severity="info"
          size="large"
          onClick={handleShowWindow}
          disabled={connectionStatus !== 'connected'}
          style={{ 
            flex: '1', 
            minWidth: '140px',
            height: '3rem',
            fontWeight: '600'
          }}
        />
        
        <Button
          label="Reconectar"
          icon="pi pi-refresh"
          size="large"
          onClick={handleReconnect}
          disabled={connectionStatus === 'connecting'}
          style={{ 
            flex: '1', 
            minWidth: '140px',
            height: '3rem',
            fontWeight: '600'
          }}
        />
        
        <Button
          label="Desconectar"
          icon="pi pi-power-off"
          severity="danger"
          size="large"
          onClick={handleDisconnectAction}
          disabled={connectionStatus === 'disconnected' || connectionStatus === 'connecting'}
          style={{ 
            flex: '1', 
            minWidth: '140px',
            height: '3rem',
            fontWeight: '600'
          }}
        />
      </div>

      {/* Grid de información */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem'
      }}>
        
        {/* Configuración de Conexión */}
        <Card 
          title="Configuración de Conexión" 
          style={{ 
            height: 'fit-content',
            background: 'var(--ui-content-bg)',
            border: '1px solid var(--ui-content-border)',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Servidor:</span>
              <span style={{ fontWeight: '600', color: 'var(--ui-content-text)' }}>{rdpConfig.server}</span>
            </div>
            <Divider style={{ margin: '0.5rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Puerto:</span>
              <span style={{ fontWeight: '600', color: 'var(--ui-content-text)' }}>{rdpConfig.port}</span>
            </div>
            <Divider style={{ margin: '0.5rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Usuario:</span>
              <span style={{ fontWeight: '600', color: 'var(--ui-content-text)' }}>{rdpConfig.username}</span>
            </div>
            <Divider style={{ margin: '0.5rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Resolución:</span>
              <span style={{ fontWeight: '600', color: 'var(--ui-content-text)' }}>{rdpConfig.resolution}</span>
            </div>
            <Divider style={{ margin: '0.5rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Profundidad de Color:</span>
              <span style={{ fontWeight: '600', color: 'var(--ui-content-text)' }}>{rdpConfig.colorDepth} bits</span>
            </div>
            <Divider style={{ margin: '0.5rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Pantalla Completa:</span>
              <span style={{ fontWeight: '600', color: 'var(--ui-content-text)' }}>{rdpConfig.fullscreen ? 'Sí' : 'No'}</span>
            </div>
            <Divider style={{ margin: '0.5rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Ajuste Automático:</span>
              <span style={{ fontWeight: '600', color: 'var(--ui-content-text)' }}>{rdpConfig.smartSizing !== false ? 'Sí' : 'No'}</span>
            </div>
            {rdpConfig.win11Compat !== undefined && (
              <>
                <Divider style={{ margin: '0.5rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Compatibilidad Windows 11:</span>
                  <span style={{ fontWeight: '600', color: 'var(--ui-content-text)' }}>{rdpConfig.win11Compat ? 'Activada' : 'Desactivada'}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Opciones de Redirección */}
        <Card 
          title="Opciones de Redirección" 
          style={{ 
            height: 'fit-content',
            background: 'var(--ui-content-bg)',
            border: '1px solid var(--ui-content-border)',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="pi pi-folder" style={{ color: 'var(--primary-color)' }}></i>
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Carpetas:</span>
              </div>
              <Tag 
                value={rdpConfig.redirectFolders ? 'Habilitado' : 'Deshabilitado'} 
                severity={rdpConfig.redirectFolders ? 'success' : 'secondary'}
              />
            </div>
            <Divider style={{ margin: '0.5rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="pi pi-clipboard" style={{ color: 'var(--primary-color)' }}></i>
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Portapapeles:</span>
              </div>
              <Tag 
                value={rdpConfig.redirectClipboard ? 'Habilitado' : 'Deshabilitado'} 
                severity={rdpConfig.redirectClipboard ? 'success' : 'secondary'}
              />
            </div>
            <Divider style={{ margin: '0.5rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="pi pi-print" style={{ color: 'var(--primary-color)' }}></i>
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Impresoras:</span>
              </div>
              <Tag 
                value={rdpConfig.redirectPrinters ? 'Habilitado' : 'Deshabilitado'} 
                severity={rdpConfig.redirectPrinters ? 'success' : 'secondary'}
              />
            </div>
            <Divider style={{ margin: '0.5rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="pi pi-volume-up" style={{ color: 'var(--primary-color)' }}></i>
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Audio:</span>
              </div>
              <Tag 
                value={rdpConfig.redirectAudio ? 'Habilitado' : 'Deshabilitado'} 
                severity={rdpConfig.redirectAudio ? 'success' : 'secondary'}
              />
            </div>
          </div>
        </Card>

        {/* Información de sesión (solo si está conectado) */}
        {connectionInfo && (
          <Card 
            title="Información de Sesión" 
            style={{ 
              height: 'fit-content',
              background: 'var(--ui-content-bg)',
              border: '1px solid var(--ui-content-border)',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>ID de Sesión:</span>
                <span style={{ fontWeight: '600', color: 'var(--ui-content-text)', fontSize: '0.85rem' }}>
                  {connectionInfo.sessionId}
                </span>
              </div>
              <Divider style={{ margin: '0.5rem 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Hora de Inicio:</span>
                <span style={{ fontWeight: '600', color: 'var(--ui-content-text)' }}>
                  {new Date(connectionInfo.startTime).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Error (solo si hay error) */}
        {error && (
          <Card 
            title="Error de Conexión" 
            style={{ 
              height: 'fit-content',
              background: 'var(--ui-content-bg)',
              border: '1px solid var(--red-200)',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(220, 53, 69, 0.1)'
            }}
          >
            <div style={{ 
              color: 'var(--red-600)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem' 
            }}>
              <i className="pi pi-exclamation-triangle"></i>
              <span style={{ fontWeight: '500' }}>{error}</span>
            </div>
          </Card>
        )}
      </div>


    </div>
  );
};

export default RdpSessionTab;