import React from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';

const QuickActions = ({ 
  onCreateSSHConnection, 
  onCreateFolder,
  onOpenFileExplorer,
  onOpenSettings,
  sshConnectionsCount = 0,
  foldersCount = 0 
}) => {
  // Handlers for actions that don't come from props
  const handleOpenPasswords = () => {
    try {
      window.dispatchEvent(new CustomEvent('open-password-manager'));
    } catch (e) { /* noop */ }
  };

  const handleOpenAuditGlobal = async () => {
    try {
      if (window?.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('recording:list', {});
        if (result && result.success && Array.isArray(result.recordings) && result.recordings.length > 0) {
          const auditTabId = `audit_global_${Date.now()}`;
          window.dispatchEvent(new CustomEvent('create-audit-tab', {
            detail: {
              tabId: auditTabId,
              title: 'Auditoría Global',
              recordings: result.recordings
            }
          }));
        }
      }
    } catch (e) { /* noop */ }
  };

  // Build quick action items conditionally to avoid dead actions
  const quickActionItems = [
    {
      label: 'Nueva Conexión SSH',
      icon: 'pi pi-plus',
      color: '#2196F3',
      description: 'Crear nueva conexión SSH',
      action: onCreateSSHConnection,
      badge: null
    },
    {
      label: 'Nueva Carpeta',
      icon: 'pi pi-folder-plus',
      color: '#4CAF50',
      description: 'Organizar conexiones',
      action: onCreateFolder,
      badge: foldersCount
    },
    {
      label: 'Configuración',
      icon: 'pi pi-cog',
      color: '#9C27B0',
      description: 'Ajustes y preferencias',
      action: onOpenSettings,
      badge: null
    },
    {
      label: 'Auditoría Global',
      icon: 'pi pi-video',
      color: '#EF5350',
      description: 'Ver grabaciones y auditoría',
      action: handleOpenAuditGlobal,
      badge: null
    },
    {
      label: 'Gestor de Contraseñas',
      icon: 'pi pi-key',
      color: '#FFC107',
      description: 'Ver y gestionar passwords',
      action: handleOpenPasswords,
      badge: null
    },
    // Extras pequeños solicitados
    {
      label: 'Historial',
      icon: 'pi pi-history',
      color: '#795548',
      description: '',
      action: () => {},
      badge: null
    },
    {
      label: 'Favoritos',
      icon: 'pi pi-star',
      color: '#FFD700',
      description: '',
      action: () => {},
      badge: null
    }
  ];

  if (onOpenFileExplorer) {
    quickActionItems.splice(2, 0, {
      label: 'Explorador',
      icon: 'pi pi-folder-open',
      color: '#FF9800',
      description: 'Explorar archivos',
      action: onOpenFileExplorer,
      badge: null
    });
  }

  const systemTools = [
    {
      label: 'Monitor Sistema',
      icon: 'pi pi-chart-line',
      color: '#607D8B',
      description: 'Estadísticas en tiempo real'
    },
    {
      label: 'Historial',
      icon: 'pi pi-history',
      color: '#795548',
      description: 'Conexiones recientes'
    },
    {
      label: 'Favoritos',
      icon: 'pi pi-star',
      color: '#FFD700',
      description: 'Acceso rápido'
    },
    {
      label: 'Temas',
      icon: 'pi pi-palette',
      color: '#E91E63',
      description: 'Personalizar apariencia'
    }
  ];

  return (
    <div style={{ padding: '1rem' }}>
      {/* Acciones principales */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ 
          margin: '0 0 0.5rem 0', 
          color: 'var(--text-color)',
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <i className="pi pi-bolt" style={{ color: 'var(--primary-color)' }} />
          Acciones Rápidas
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))',
          gap: '0.25rem'
        }}>
          {quickActionItems.map((item, index) => (
            <Card 
              key={index}
              className="quick-action-card"
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                position: 'relative',
                minHeight: '48px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
              }}
              onClick={item.action}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.15rem',
                padding: '0.3rem 0.3rem'
              }}>
                {item.badge !== null && (
                  <Badge 
                    value={item.badge} 
                    style={{ 
                      position: 'absolute',
                      top: '0.4rem',
                      right: '0.4rem',
                      fontSize: '0.65rem'
                    }}
                  />
                )}
                
                <div style={{ 
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: `${item.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.35rem'
                }}>
                  <i 
                    className={item.icon}
                    style={{ 
                      fontSize: '0.75rem',
                      color: item.color
                    }}
                  />
                </div>
                
                <h4 style={{ 
                  margin: 0,
                  color: 'var(--text-color)',
                  fontSize: '0.56rem',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {item.label}
                </h4>

              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Herramientas del sistema - Eliminadas a petición */}

      {/* Bloque de estadísticas rápidas eliminado por petición */}
    </div>
  );
};

export default QuickActions;