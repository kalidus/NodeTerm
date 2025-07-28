import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';

const RdpSessionTab = ({ rdpConfig, tabId }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [error, setError] = useState(null);
  const toast = React.useRef(null);

  useEffect(() => {
    // El componente ahora usa el RdpManager directamente a través de ipcRenderer.invoke
    // No necesitamos listeners IPC ya que manejamos las respuestas con promises
  }, [rdpConfig, tabId]);

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
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button
              label="Abrir Conexión RDP"
              icon="pi pi-external-link"
              severity="success"
                             onClick={() => {
                 try {
                   // Usar el RdpManager existente para la conexión
                   if (window.electron && window.electron.ipcRenderer) {
                     setConnectionStatus('connecting');
                     // Usar el API del RdpManager
                     window.electron.ipcRenderer.invoke('rdp:connect', rdpConfig).then(result => {
                       if (result.success) {
                         setConnectionStatus('connected');
                         setConnectionInfo({
                           server: rdpConfig.server,
                           username: rdpConfig.username,
                           port: rdpConfig.port,
                           resolution: rdpConfig.resolution,
                           startTime: new Date().toISOString(),
                           sessionId: result.connectionId
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
               label="Conexión Simple"
               icon="pi pi-play"
               severity="info"
               onClick={() => {
                 try {
                   // Conexión RDP simple sin parámetros complejos
                   if (window.electron && window.electron.ipcRenderer) {
                     setConnectionStatus('connecting');
                     // Configuración mínima para conexión simple
                     const simpleConfig = {
                       server: rdpConfig.server,
                       port: rdpConfig.port || 3389,
                       username: rdpConfig.username || '',
                       resolution: '1920x1080',
                       colorDepth: 32,
                       redirectFolders: false,
                       redirectClipboard: true,
                       redirectPrinters: false,
                       redirectAudio: false,
                       fullscreen: false,
                       span: false,
                       admin: false,
                       public: false
                     };
                     // Usar el API del RdpManager
                     window.electron.ipcRenderer.invoke('rdp:connect', simpleConfig).then(result => {
                       if (result.success) {
                         setConnectionStatus('connected');
                         setConnectionInfo({
                           server: rdpConfig.server,
                           username: rdpConfig.username,
                           port: rdpConfig.port,
                           resolution: rdpConfig.resolution,
                           startTime: new Date().toISOString(),
                           sessionId: result.connectionId
                         });
                         toast.current?.show({
                           severity: 'success',
                           summary: 'Conexión RDP iniciada',
                           detail: `Conexión RDP simple establecida con ${rdpConfig.server}`,
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
               label="Sin Contraseña"
               icon="pi pi-user"
               severity="warning"
               onClick={() => {
                 try {
                   // Conexión RDP sin contraseña para debug
                   if (window.electron && window.electron.ipcRenderer) {
                     setConnectionStatus('connecting');
                     const configWithoutPassword = { ...rdpConfig };
                     delete configWithoutPassword.password;
                     // Usar el API del RdpManager
                     window.electron.ipcRenderer.invoke('rdp:connect', configWithoutPassword).then(result => {
                       if (result.success) {
                         setConnectionStatus('connected');
                         setConnectionInfo({
                           server: rdpConfig.server,
                           username: rdpConfig.username,
                           port: rdpConfig.port,
                           resolution: rdpConfig.resolution,
                           startTime: new Date().toISOString(),
                           sessionId: result.connectionId
                         });
                         toast.current?.show({
                           severity: 'success',
                           summary: 'Conexión RDP iniciada',
                           detail: `Conexión RDP establecida con ${rdpConfig.server} (sin contraseña)`,
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
               label="Debug Args"
               icon="pi pi-bug"
               severity="secondary"
               onClick={() => {
                 try {
                   // Debug de configuración RDP
                   console.log('=== DEBUG CONFIGURACIÓN RDP ===');
                   console.log('Configuración completa:', JSON.stringify(rdpConfig, null, 2));
                   console.log('Servidor:', rdpConfig.server);
                   console.log('Puerto:', rdpConfig.port || 3389);
                   console.log('Usuario:', rdpConfig.username);
                   console.log('Contraseña:', rdpConfig.password ? '***' : 'No configurada');
                   console.log('Resolución:', rdpConfig.resolution);
                   console.log('Profundidad de color:', rdpConfig.colorDepth);
                   console.log('Pantalla completa:', rdpConfig.fullscreen);
                   console.log('Redirección carpetas:', rdpConfig.redirectFolders);
                   console.log('Redirección portapapeles:', rdpConfig.redirectClipboard);
                   console.log('Redirección impresoras:', rdpConfig.redirectPrinters);
                   console.log('Redirección audio:', rdpConfig.redirectAudio);
                   console.log('================================');
                   
                   toast.current?.show({
                     severity: 'info',
                     summary: 'Debug completado',
                     detail: 'Revisa la consola para ver la configuración RDP',
                     life: 3000
                   });
                 } catch (err) {
                   setError(err.message);
                   toast.current?.show({
                     severity: 'error',
                     summary: 'Error en debug',
                     detail: err.message,
                     life: 5000
                   });
                 }
               }}
             />
            <Button
              label="Reconectar"
              icon="pi pi-refresh"
              onClick={() => {
                setConnectionStatus('connecting');
                setError(null);
                // Simular reconexión
                setTimeout(() => {
                  setConnectionStatus('connected');
                  setConnectionInfo({
                    server: rdpConfig.server,
                    username: rdpConfig.username,
                    port: rdpConfig.port,
                    resolution: rdpConfig.resolution,
                    startTime: new Date().toISOString(),
                    sessionId: `rdp_${tabId}_${Date.now()}`
                  });
                }, 2000);
              }}
              disabled={connectionStatus === 'connecting'}
            />
            <Button
              label="Desconectar"
              icon="pi pi-power-off"
              severity="danger"
              onClick={handleDisconnect}
              disabled={connectionStatus === 'disconnected' || connectionStatus === 'connecting'}
            />
          </div>

          {/* Nota informativa */}
          <Card style={{ marginTop: '1rem', background: 'var(--blue-50)' }}>
            <div style={{ color: 'var(--blue-700)', fontSize: '0.9rem' }}>
              <i className="pi pi-info-circle" style={{ marginRight: '0.5rem' }}></i>
                             <strong>Opciones de conexión:</strong><br/>
               • <strong>Abrir Conexión RDP:</strong> Usa el RdpManager para crear un archivo .rdp y abrir mstsc.exe con todos los parámetros<br/>
               • <strong>Conexión Simple:</strong> Usa el RdpManager con configuración mínima (sin redirecciones complejas)<br/>
               • <strong>Sin Contraseña:</strong> Usa el RdpManager sin contraseña (para debug)<br/>
               • <strong>Debug Args:</strong> Muestra en consola la configuración RDP que se enviaría al RdpManager<br/>
               • <strong>Reconectar:</strong> Simula una nueva conexión<br/>
               • <strong>Desconectar:</strong> Marca la sesión como desconectada
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
};

export default RdpSessionTab; 