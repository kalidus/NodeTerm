/**
 * GlobalAuditTab - Muestra todas las grabaciones organizadas por conexión
 */
import React, { useState, useEffect, useCallback } from 'react';

const GlobalAuditTab = ({ recordings: initialRecordings = [], onPlayRecording }) => {
  const [recordings, setRecordings] = useState(initialRecordings);
  const [groupedRecordings, setGroupedRecordings] = useState({});
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);

  // Función para cargar todas las grabaciones
  const loadRecordings = useCallback(async () => {
    try {
      setLoading(true);
      // Cargar todas las grabaciones sin filtros
      const result = await window.electron.ipcRenderer.invoke('recording:list', {});
      
      if (result.success) {
        setRecordings(result.recordings || []);
      } else {
        console.error('Error cargando grabaciones:', result.error);
      }
    } catch (error) {
      console.error('Error al cargar grabaciones:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar grabaciones al montar el componente
  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Escuchar evento de actualización
  useEffect(() => {
    const handleRefresh = () => {
      loadRecordings();
    };

    window.addEventListener('refresh-audit-tab', handleRefresh);
    return () => {
      window.removeEventListener('refresh-audit-tab', handleRefresh);
    };
  }, [loadRecordings]);

  // Agrupar grabaciones cuando cambian
  useEffect(() => {
    // Agrupar grabaciones por conexión (host + usuario)
    const grouped = recordings.reduce((acc, recording) => {
      const key = `${recording.username}@${recording.host}`;
      if (!acc[key]) {
        acc[key] = {
          connection: key,
          host: recording.host,
          username: recording.username,
          recordings: [],
          totalDuration: 0,
          totalSize: 0,
          lastRecording: null
        };
      }
      
      acc[key].recordings.push(recording);
      acc[key].totalDuration += recording.duration || 0;
      acc[key].totalSize += recording.bytesRecorded || 0;
      
      if (!acc[key].lastRecording || recording.createdAt > acc[key].lastRecording.createdAt) {
        acc[key].lastRecording = recording;
      }
      
      return acc;
    }, {});
    
    // Ordenar grabaciones dentro de cada grupo por fecha (más reciente primero)
    Object.values(grouped).forEach(group => {
      group.recordings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    });
    
    setGroupedRecordings(grouped);
    
    // Seleccionar el primer grupo automáticamente
    const firstGroup = Object.keys(grouped)[0];
    if (firstGroup) {
      setSelectedGroup(firstGroup);
    }
  }, [recordings]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePlayRecording = (recording) => {
    // Usar la función de callback pasada como prop
    if (onPlayRecording) {
      onPlayRecording(recording);
    }
  };

  const handleDeleteRecording = async (recordingId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta grabación?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await window.electron.ipcRenderer.invoke('recording:delete', { recordingId });
      
      if (result.success) {
        // Recargar la lista directamente
        await loadRecordings();
        showToast('success', 'Grabación eliminada', 'La grabación se eliminó correctamente');
      } else {
        showToast('error', 'Error', 'Error al eliminar la grabación');
      }
    } catch (error) {
      console.error('Error eliminando grabación:', error);
      showToast('error', 'Error', 'Error al eliminar la grabación');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity, summary, detail) => {
    // Buscar el toast en el DOM
    const toast = document.querySelector('.p-toast');
    if (toast && toast.__vue__) {
      toast.__vue__.show({ severity, summary, detail, life: 3000 });
    }
  };

  const groups = Object.values(groupedRecordings);
  const selectedGroupData = selectedGroup ? groupedRecordings[selectedGroup] : null;

  return (
    <div style={{
      padding: '24px',
      background: 'var(--ui-content-bg)',
      height: '100%',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span className="pi pi-video" style={{ fontSize: '32px', color: 'var(--ui-button-primary)' }}></span>
          <div>
            <h2 style={{ margin: 0, color: 'var(--ui-dialog-text)', fontSize: '24px' }}>
              Auditoría Global
            </h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--ui-dialog-text)', opacity: 0.7, fontSize: '14px' }}>
              {recordings.length} grabaciones de {groups.length} conexiones
            </p>
          </div>
          <button
            onClick={loadRecordings}
            disabled={loading}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--ui-content-border)',
              background: 'var(--ui-button-secondary)',
              color: 'var(--ui-button-secondary-text)',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loading ? 0.6 : 1
            }}
          >
            <span className={`pi ${loading ? 'pi-spin pi-spinner' : 'pi-refresh'}`}></span>
            Actualizar
          </button>
        </div>

        {/* Stats generales */}
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '16px',
          background: 'var(--ui-dialog-bg)',
          borderRadius: '8px',
          border: '1px solid var(--ui-content-border)'
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--ui-button-primary)' }}>
              {recordings.length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ui-dialog-text)', opacity: 0.7 }}>
              Total Grabaciones
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--ui-button-primary)' }}>
              {formatDuration(recordings.reduce((sum, r) => sum + (r.duration || 0), 0))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ui-dialog-text)', opacity: 0.7 }}>
              Duración Total
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--ui-button-primary)' }}>
              {formatBytes(recordings.reduce((sum, r) => sum + (r.bytesRecorded || 0), 0))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ui-dialog-text)', opacity: 0.7 }}>
              Tamaño Total
            </div>
          </div>
        </div>
      </div>

      {loading && recordings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ui-dialog-text)' }}>
          <span className="pi pi-spin pi-spinner" style={{ fontSize: '32px' }}></span>
          <p>Cargando grabaciones...</p>
        </div>
      ) : groups.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--ui-dialog-text)',
          opacity: 0.6
        }}>
          <span className="pi pi-inbox" style={{ fontSize: '64px', display: 'block', marginBottom: '16px', opacity: 0.3 }}></span>
          <h3 style={{ margin: '0 0 8px 0' }}>No hay grabaciones</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Las grabaciones de sesiones SSH aparecerán aquí cuando se activen.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
          {/* Lista de conexiones */}
          <div style={{ 
            width: '300px', 
            background: 'var(--ui-dialog-bg)', 
            borderRadius: '8px', 
            border: '1px solid var(--ui-content-border)',
            overflow: 'auto'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--ui-content-border)' }}>
              <h3 style={{ margin: 0, color: 'var(--ui-dialog-text)', fontSize: '16px' }}>
                Conexiones ({groups.length})
              </h3>
            </div>
            <div>
              {groups.map((group) => (
                <div
                  key={group.connection}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--ui-content-border)',
                    background: selectedGroup === group.connection ? 'var(--ui-sidebar-selected)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => setSelectedGroup(group.connection)}
                  onMouseEnter={(e) => {
                    if (selectedGroup !== group.connection) {
                      e.currentTarget.style.background = 'var(--ui-sidebar-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedGroup !== group.connection) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ fontWeight: '500', color: 'var(--ui-dialog-text)', marginBottom: '4px' }}>
                    {group.connection}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ui-dialog-text)', opacity: 0.7 }}>
                    {group.recordings.length} grabaciones • {formatDuration(group.totalDuration)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ui-dialog-text)', opacity: 0.5 }}>
                    Última: {formatDate(group.lastRecording.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detalles de la conexión seleccionada */}
          <div style={{ flex: 1 }}>
            {selectedGroupData && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--ui-dialog-text)' }}>
                    {selectedGroupData.connection}
                  </h3>
                  <div style={{ fontSize: '14px', color: 'var(--ui-dialog-text)', opacity: 0.7 }}>
                    {selectedGroupData.recordings.length} grabaciones • {formatDuration(selectedGroupData.totalDuration)} • {formatBytes(selectedGroupData.totalSize)}
                  </div>
                </div>

                <div style={{ background: 'var(--ui-dialog-bg)', borderRadius: '8px', border: '1px solid var(--ui-content-border)' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--ui-content-border)' }}>
                    <h4 style={{ margin: 0, color: 'var(--ui-dialog-text)' }}>Grabaciones</h4>
                  </div>
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    {selectedGroupData.recordings.map((recording, index) => (
                      <div
                        key={recording.id}
                        style={{
                          padding: '16px',
                          borderBottom: index < selectedGroupData.recordings.length - 1 ? '1px solid var(--ui-content-border)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <span className="pi pi-video" style={{ fontSize: '24px', color: 'var(--ui-button-primary)', opacity: 0.7 }}></span>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              fontSize: '16px',
                              fontWeight: '500',
                              color: 'var(--ui-dialog-text)'
                            }}>
                              {recording.title || `Sesión ${index + 1}`}
                            </span>
                            {recording.useBastionWallix && (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(255, 152, 0, 0.2)',
                                color: '#ff9800',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                BASTION
                              </span>
                            )}
                          </div>
                          
                          <div style={{ fontSize: '12px', color: 'var(--ui-dialog-text)', opacity: 0.7 }}>
                            {formatDate(recording.createdAt)} • {formatDuration(recording.duration)} • {formatBytes(recording.bytesRecorded || 0)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handlePlayRecording(recording)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'var(--ui-button-primary)',
                              color: 'var(--ui-button-primary-text)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: '500'
                            }}
                            title="Reproducir"
                          >
                            <span className="pi pi-play"></span>
                            Reproducir
                          </button>
                          
                          <button
                            onClick={() => handleDeleteRecording(recording.id)}
                            disabled={loading}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--ui-content-border)',
                              background: 'var(--ui-button-secondary)',
                              color: '#d32f2f',
                              cursor: 'pointer'
                            }}
                            title="Eliminar"
                          >
                            <span className="pi pi-trash"></span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalAuditTab;
