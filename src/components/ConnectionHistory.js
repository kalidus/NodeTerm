import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { Tooltip } from 'primereact/tooltip';
// import { formatDistanceToNow } from 'date-fns';
// import { es } from 'date-fns/locale';

const ConnectionHistory = ({ onConnectToHistory }) => {
  const [recentConnections, setRecentConnections] = useState([]);
  const [favoriteConnections, setFavoriteConnections] = useState([]);

  const getRelativeTime = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'hace un momento';
    if (diffInMinutes < 60) return `hace ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `hace ${diffInDays} día${diffInDays !== 1 ? 's' : ''}`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `hace ${diffInWeeks} semana${diffInWeeks !== 1 ? 's' : ''}`;
  };

  useEffect(() => {
    // Cargar historial desde localStorage o electron store
    loadConnectionHistory();
  }, []);

  const loadConnectionHistory = () => {
    try {
      // Siempre usar datos de ejemplo para evitar problemas
      setRecentConnections([
        {
          id: '1',
          name: 'Servidor Web Principal',
          type: 'ssh',
          host: '192.168.1.100',
          username: 'admin',
          port: 22,
          lastConnected: new Date(Date.now() - 3600000), // 1 hora atrás
          status: 'success',
          connectionTime: 2.3
        },
        {
          id: '2',
          name: 'Base de Datos MySQL',
          type: 'ssh',
          host: 'db.example.com',
          username: 'dbuser',
          port: 22,
          lastConnected: new Date(Date.now() - 7200000), // 2 horas atrás
          status: 'success',
          connectionTime: 1.8
        },
        {
          id: '3',
          name: 'Servidor Windows RDP',
          type: 'rdp-guacamole',
          host: '192.168.10.52',
          hostname: '192.168.10.52', // Para compatibilidad
          username: 'kalidus@outlook.es',
          password: 'Ronaldi$1024', // Credenciales reales
          port: 3389,
          lastConnected: new Date(Date.now() - 1200000), // 20 minutos atrás
          status: 'success',
          connectionTime: 3.1
        },
        {
          id: '4',
          name: 'Servidor de Desarrollo',
          type: 'ssh',
          host: '10.0.0.50',
          username: 'developer',
          port: 2222,
          lastConnected: new Date(Date.now() - 86400000), // 1 día atrás
          status: 'failed',
          connectionTime: null
        }
      ]);
      
      setFavoriteConnections([
        {
          id: '5',
          name: 'Servidor Producción',
          type: 'ssh',
          host: 'prod.company.com',
          username: 'sysadmin',
          port: 22,
          lastConnected: new Date(Date.now() - 1800000), // 30 minutos atrás
          status: 'success',
          connectionTime: 1.2,
          isFavorite: true
        },
        {
          id: '6',
          name: 'Windows Server Principal',
          type: 'rdp-guacamole',
          host: 'win-server.empresa.com',
          hostname: 'win-server.empresa.com', // Para compatibilidad con RDP
          username: 'administrador',
          port: 3389,
          lastConnected: new Date(Date.now() - 3600000), // 1 hora atrás
          status: 'success',
          connectionTime: 2.8,
          isFavorite: true
        }
      ]);
    } catch (error) {
      console.error('Error cargando historial de conexiones:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return 'pi pi-check-circle';
      case 'failed':
        return 'pi pi-times-circle';
      case 'connecting':
        return 'pi pi-spin pi-spinner';
      default:
        return 'pi pi-circle';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'connecting':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getConnectionTypeIcon = (type) => {
    switch (type) {
      case 'ssh':
        return 'pi pi-server';
      case 'rdp-guacamole':
        return 'pi pi-desktop';
      default:
        return 'pi pi-circle';
    }
  };

  const getConnectionTypeColor = (type) => {
    switch (type) {
      case 'ssh':
        return '#4fc3f7';
      case 'rdp-guacamole':
        return '#ff6b35';
      default:
        return '#9E9E9E';
    }
  };

  const ConnectionCard = ({ connection, showFavoriteAction = false }) => (
    <Card 
      className="connection-history-card"
      style={{ 
        marginBottom: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: '1px solid var(--surface-border)',
        background: 'var(--surface-card)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
      onClick={() => onConnectToHistory?.(connection)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          {/* Iconos de tipo y estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Icono de tipo de conexión */}
            <i 
              className={getConnectionTypeIcon(connection.type)}
              style={{ 
                color: getConnectionTypeColor(connection.type),
                fontSize: '1.1rem'
              }}
            />
            {/* Icono de estado */}
            <i 
              className={getStatusIcon(connection.status)}
              style={{ 
                color: getStatusColor(connection.status),
                fontSize: '1rem'
              }}
            />
            {connection.isFavorite && (
              <i className="pi pi-star-fill" style={{ color: '#FFD700', fontSize: '1rem' }} />
            )}
          </div>

          {/* Información de la conexión */}
          <div style={{ flex: 1 }}>
            <h4 style={{ 
              margin: '0 0 0.25rem 0', 
              color: 'var(--text-color)',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              {connection.name}
            </h4>
            <div style={{ 
              margin: '0 0 0.25rem 0', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem'
            }}>
              <span style={{ 
                color: 'var(--text-color-secondary)',
                fontSize: '0.9rem'
              }}>
                {connection.username}@{connection.host}:{connection.port}
              </span>
              <Badge 
                value={connection.type === 'rdp-guacamole' ? 'RDP' : 'SSH'} 
                style={{ 
                  backgroundColor: getConnectionTypeColor(connection.type),
                  fontSize: '0.7rem',
                  padding: '2px 6px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
              <span>
                {getRelativeTime(connection.lastConnected)}
              </span>
              {connection.connectionTime && (
                <span>
                  Conectado en {connection.connectionTime}s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {showFavoriteAction && (
            <Button
              icon={connection.isFavorite ? "pi pi-star-fill" : "pi pi-star"}
              className="p-button-rounded p-button-text p-button-sm"
              style={{ color: connection.isFavorite ? '#FFD700' : 'var(--text-color-secondary)' }}
              onClick={(e) => {
                e.stopPropagation();
                // Lógica para agregar/quitar de favoritos
              }}
              tooltip={connection.isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            />
          )}
          <Button
            icon="pi pi-external-link"
            className="p-button-rounded p-button-text p-button-sm"
            style={{ color: 'var(--primary-color)' }}
            onClick={(e) => {
              e.stopPropagation();
              onConnectToHistory?.(connection);
            }}
            tooltip="Conectar"
          />
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: '1rem' }}>
      {/* Conexiones favoritas */}
      {favoriteConnections.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1rem' 
          }}>
            <i className="pi pi-star-fill" style={{ color: '#FFD700' }} />
            <h3 style={{ 
              margin: 0, 
              color: 'var(--text-color)',
              fontSize: '1.1rem'
            }}>
              Conexiones Favoritas
            </h3>
            <Badge value={favoriteConnections.length} severity="warning" />
          </div>
          
          {favoriteConnections.map(connection => (
            <ConnectionCard 
              key={connection.id} 
              connection={connection} 
              showFavoriteAction={true}
            />
          ))}
        </div>
      )}

      {/* Conexiones recientes */}
      <div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginBottom: '1rem' 
        }}>
          <i className="pi pi-clock" style={{ color: 'var(--primary-color)' }} />
          <h3 style={{ 
            margin: 0, 
            color: 'var(--text-color)',
            fontSize: '1.1rem'
          }}>
            Conexiones Recientes
          </h3>
          <Badge value={recentConnections.length} />
        </div>

        {recentConnections.length > 0 ? (
          recentConnections.map(connection => (
            <ConnectionCard 
              key={connection.id} 
              connection={connection} 
              showFavoriteAction={true}
            />
          ))
        ) : (
          <Card style={{ textAlign: 'center', padding: '2rem', background: 'var(--surface-card)' }}>
            <i className="pi pi-info-circle" style={{ 
              fontSize: '3rem', 
              color: 'var(--text-color-secondary)',
              marginBottom: '1rem',
              display: 'block'
            }} />
            <h4 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>
              No hay conexiones recientes
            </h4>
            <p style={{ color: 'var(--text-color-secondary)', margin: 0 }}>
              Las conexiones SSH aparecerán aquí después de usarlas
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ConnectionHistory;