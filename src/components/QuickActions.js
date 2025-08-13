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
      label: 'Explorador',
      icon: 'pi pi-folder-open',
      color: '#FF9800',
      description: 'Explorar archivos',
      action: onOpenFileExplorer,
      badge: null
    },
    {
      label: 'Configuración',
      icon: 'pi pi-cog',
      color: '#9C27B0',
      description: 'Ajustes y preferencias',
      action: onOpenSettings,
      badge: null
    }
  ];

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
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          margin: '0 0 1rem 0', 
          color: 'var(--text-color)',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="pi pi-bolt" style={{ color: 'var(--primary-color)' }} />
          Acciones Rápidas
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {quickActionItems.map((item, index) => (
            <Card 
              key={index}
              className="quick-action-card"
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
              onClick={item.action}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem'
              }}>
                {item.badge !== null && (
                  <Badge 
                    value={item.badge} 
                    style={{ 
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem'
                    }}
                  />
                )}
                
                <div style={{ 
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: `${item.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <i 
                    className={item.icon}
                    style={{ 
                      fontSize: '1.5rem',
                      color: item.color
                    }}
                  />
                </div>
                
                <h4 style={{ 
                  margin: 0,
                  color: 'var(--text-color)',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {item.label}
                </h4>
                
                <p style={{ 
                  margin: 0,
                  color: 'var(--text-color-secondary)',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  lineHeight: '1.3'
                }}>
                  {item.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Herramientas del sistema */}
      <div>
        <h3 style={{ 
          margin: '0 0 1rem 0', 
          color: 'var(--text-color)',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="pi pi-wrench" style={{ color: 'var(--primary-color)' }} />
          Herramientas
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem'
        }}>
          {systemTools.map((tool, index) => (
            <Button
              key={index}
              className="p-button-outlined"
              style={{ 
                height: '80px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                background: 'var(--surface-card)',
                border: `1px solid ${tool.color}40`,
                color: 'var(--text-color)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${tool.color}10`;
                e.currentTarget.style.borderColor = tool.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-card)';
                e.currentTarget.style.borderColor = `${tool.color}40`;
              }}
            >
              <i 
                className={tool.icon}
                style={{ 
                  fontSize: '1.2rem',
                  color: tool.color
                }}
              />
              <span style={{ 
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                {tool.label}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div style={{ 
        marginTop: '2rem',
        padding: '1rem',
        background: 'var(--surface-section)',
        borderRadius: '8px',
        border: '1px solid var(--surface-border)'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'var(--primary-color)'
            }}>
              {sshConnectionsCount}
            </div>
            <div style={{ 
              fontSize: '0.8rem',
              color: 'var(--text-color-secondary)'
            }}>
              Conexiones SSH
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'var(--primary-color)'
            }}>
              {foldersCount}
            </div>
            <div style={{ 
              fontSize: '0.8rem',
              color: 'var(--text-color-secondary)'
            }}>
              Carpetas
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'var(--primary-color)'
            }}>
              v1.5.0
            </div>
            <div style={{ 
              fontSize: '0.8rem',
              color: 'var(--text-color-secondary)'
            }}>
              NodeTerm
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;