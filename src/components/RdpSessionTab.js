import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';

const RdpSessionTab = ({ rdpConfig, tabId, connectionStatus: tabConnectionStatus, connectionInfo: tabConnectionInfo }) => {
  const [connectionStatus, setConnectionStatus] = useState(tabConnectionStatus || 'disconnected');
  const [connectionInfo, setConnectionInfo] = useState(tabConnectionInfo || null);
  const [error, setError] = useState(null);
  const toast = React.useRef(null);

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

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '1rem',
      background: 'var(--surface-ground, #f8f9fa)'
    }}>
      <Toast ref={toast} />
      
      <Card title="Sesión RDP" style={{ flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Estado de conexión */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 'bold' }}>Estado:</span>
            <Tag 
              value={getStatusLabel(connectionStatus)} 
              severity={getStatusSeverity(connectionStatus)}
            />
            {connectionStatus === 'connecting' && (
              <ProgressSpinner style={{ width: '20px', height: '20px' }} />
            )}
          </div>

          {/* Información de conexión */}
          <Card title="Configuración de Conexión" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <strong>Servidor:</strong> {rdpConfig.server}
              </div>
              <div>
                <strong>Puerto:</strong> {rdpConfig.port}
              </div>
              <div>
                <strong>Usuario:</strong> {rdpConfig.username}
              </div>
              <div>
                <strong>Resolución:</strong> {rdpConfig.resolution}
              </div>
              <div>
                <strong>Profundidad de Color:</strong> {rdpConfig.colorDepth} bits
              </div>
              <div>
                <strong>Pantalla Completa:</strong> {rdpConfig.fullscreen ? 'Sí' : 'No'}
              </div>
            </div>
          </Card>

          {/* Opciones de redirección */}
          <Card title="Opciones de Redirección" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <strong>Carpetas:</strong> 
                <Tag 
                  value={rdpConfig.redirectFolders ? 'Habilitado' : 'Deshabilitado'} 
                  severity={rdpConfig.redirectFolders ? 'success' : 'secondary'}
                  style={{ marginLeft: '0.5rem' }}
                />
              </div>
              <div>
                <strong>Portapapeles:</strong> 
                <Tag 
                  value={rdpConfig.redirectClipboard ? 'Habilitado' : 'Deshabilitado'} 
                  severity={rdpConfig.redirectClipboard ? 'success' : 'secondary'}
                  style={{ marginLeft: '0.5rem' }}
                />
              </div>
              <div>
                <strong>Impresoras:</strong> 
                <Tag 
                  value={rdpConfig.redirectPrinters ? 'Habilitado' : 'Deshabilitado'} 
                  severity={rdpConfig.redirectPrinters ? 'success' : 'secondary'}
                  style={{ marginLeft: '0.5rem' }}
                />
              </div>
              <div>
                <strong>Audio:</strong> 
                <Tag 
                  value={rdpConfig.redirectAudio ? 'Habilitado' : 'Deshabilitado'} 
                  severity={rdpConfig.redirectAudio ? 'success' : 'secondary'}
                  style={{ marginLeft: '0.5rem' }}
                />
              </div>
            </div>
          </Card>

          {/* Información de sesión */}
          {connectionInfo && (
            <Card title="Información de Sesión" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <strong>ID de Sesión:</strong> {connectionInfo.sessionId}
                </div>
                <div>
                  <strong>Hora de Inicio:</strong> {new Date(connectionInfo.startTime).toLocaleString()}
                </div>
              </div>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card title="Error de Conexión" style={{ marginTop: '1rem', border: '1px solid var(--red-200)' }}>
              <div style={{ color: 'var(--red-600)', padding: '1rem' }}>
                <strong>Error:</strong> {error}
              </div>
            </Card>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Button
              label="Conectar RDP"
              icon="pi pi-external-link"
              severity="success"
              onClick={() => {
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
              }}
            />
            
            <Button
              label="Mostrar Ventana"
              icon="pi pi-window-maximize"
              severity="info"
              onClick={async () => {
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
              }}
              disabled={connectionStatus !== 'connected'}
            />
            
            <Button
              label="Reconectar"
              icon="pi pi-refresh"
              onClick={() => {
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
              }}
              disabled={connectionStatus === 'connecting'}
            />
            
            <Button
              label="Desconectar"
              icon="pi pi-power-off"
              severity="danger"
              onClick={async () => {
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
              }}
              disabled={connectionStatus === 'disconnected' || connectionStatus === 'connecting'}
            />
          </div>

          {/* Nota informativa */}
          <Card style={{ marginTop: '1rem', background: 'var(--blue-50)' }}>
            <div style={{ color: 'var(--blue-700)', fontSize: '0.9rem' }}>
              <i className="pi pi-info-circle" style={{ marginRight: '0.5rem' }}></i>
              <strong>Gestión de Sesión RDP:</strong><br/>
              • <strong>Conectar RDP:</strong> Inicia la conexión RDP usando el RdpManager con todos los parámetros configurados<br/>
              • <strong>Mostrar Ventana:</strong> Intenta mostrar la ventana RDP si está minimizada<br/>
              • <strong>Reconectar:</strong> Reestablece la conexión RDP si se ha perdido<br/>
              • <strong>Desconectar:</strong> Cierra la sesión RDP activa
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
};

export default RdpSessionTab; 