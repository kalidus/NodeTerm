/**
 * AuditTab - Muestra lista de grabaciones para una conexión SSH específica
 */
import React, { useState, useEffect } from 'react';

const AuditTab = ({ connectionInfo, onPlayRecording }) => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadRecordings();
    loadStats();
  }, [connectionInfo]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      
      // Filtrar por host y usuario de la conexión
      const filters = {
        host: connectionInfo.host,
        username: connectionInfo.username
      };
      
      const result = await window.electron.ipcRenderer.invoke('recording:list', filters);
      
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
  };

  const loadStats = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('recording:stats');
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handlePlayRecording = (recording) => {
    if (onPlayRecording) {
      onPlayRecording(recording);
    }
  };

  const handleDeleteRecording = async (recordingId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta grabación?')) {
      return;
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('recording:delete', { recordingId });
      
      if (result.success) {
        // Recargar lista
        loadRecordings();
        loadStats();
      } else {
        alert('Error eliminando grabación: ' + result.error);
      }
    } catch (error) {
      console.error('Error eliminando grabación:', error);
      alert('Error eliminando grabación');
    }
  };

  const handleExportRecording = async (recording) => {
    try {
      const result = await window.electron.dialog.showSaveDialog({
        title: 'Exportar grabación',
        defaultPath: `${recording.title || 'recording'}_${new Date(recording.createdAt).toISOString().split('T')[0]}.cast`,
        filters: [
          { name: 'Asciicast', extensions: ['cast'] },
          { name: 'Todos los archivos', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        const exportResult = await window.electron.ipcRenderer.invoke('recording:export', {
          recordingId: recording.id,
          exportPath: result.filePath
        });

        if (exportResult.success) {
          alert('Grabación exportada correctamente');
        } else {
          alert('Error exportando: ' + exportResult.error);
        }
      }
    } catch (error) {
      console.error('Error exportando grabación:', error);
      alert('Error al exportar grabación');
    }
  };

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

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

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
              Auditoría de Sesiones
            </h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--ui-dialog-text)', opacity: 0.7, fontSize: '14px' }}>
              {connectionInfo.username}@{connectionInfo.host}:{connectionInfo.port || 22}
            </p>
          </div>
          <button
            onClick={loadRecordings}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--ui-content-border)',
              background: 'var(--ui-button-secondary)',
              color: 'var(--ui-button-secondary-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span className="pi pi-refresh"></span>
            Actualizar
          </button>
        </div>

        {/* Stats */}
        {stats && (
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
                Grabaciones
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
        )}
      </div>

      {/* Lista de grabaciones */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ui-dialog-text)' }}>
          <span className="pi pi-spin pi-spinner" style={{ fontSize: '32px' }}></span>
          <p>Cargando grabaciones...</p>
        </div>
      ) : recordings.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--ui-dialog-text)',
          opacity: 0.6
        }}>
          <span className="pi pi-inbox" style={{ fontSize: '64px', display: 'block', marginBottom: '16px', opacity: 0.3 }}></span>
          <h3 style={{ margin: '0 0 8px 0' }}>No hay grabaciones</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Las grabaciones de esta conexión aparecerán aquí.<br/>
            Usa el menú contextual del terminal para iniciar una grabación.
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {recordings.map((recording, index) => (
            <div
              key={recording.id}
              style={{
                padding: '16px',
                marginBottom: '12px',
                background: selectedRecording?.id === recording.id ? 'var(--ui-sidebar-selected)' : 'var(--ui-dialog-bg)',
                borderRadius: '8px',
                border: '1px solid var(--ui-content-border)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => setSelectedRecording(recording)}
              onMouseEnter={(e) => {
                if (selectedRecording?.id !== recording.id) {
                  e.currentTarget.style.background = 'var(--ui-sidebar-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRecording?.id !== recording.id) {
                  e.currentTarget.style.background = 'var(--ui-dialog-bg)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  
                  {recording.sessionName && (
                    <div style={{ fontSize: '11px', color: 'var(--ui-dialog-text)', opacity: 0.5, marginTop: '4px' }}>
                      Sesión: {recording.sessionName}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayRecording(recording);
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportRecording(recording);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--ui-content-border)',
                      background: 'var(--ui-button-secondary)',
                      color: 'var(--ui-button-secondary-text)',
                      cursor: 'pointer'
                    }}
                    title="Exportar"
                  >
                    <span className="pi pi-download"></span>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRecording(recording.id);
                    }}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditTab;

