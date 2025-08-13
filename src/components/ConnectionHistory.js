import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { Tooltip } from 'primereact/tooltip';
// import { formatDistanceToNow } from 'date-fns';
// import { es } from 'date-fns/locale';
import { getFavorites, getRecents, toggleFavorite, isFavorite, onUpdate } from '../utils/connectionStore';

const ConnectionHistory = ({ onConnectToHistory, layout = 'two-columns', recentsLimit = 10, activeIds = new Set(), onEdit, templateColumns, favoritesColumns = 2, recentsColumns = 1 }) => {
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
    // Cargar historial desde localStorage
    loadConnectionHistory();
    const off = onUpdate(() => loadConnectionHistory());
    return () => off && off();
  }, [recentsLimit]);

  const loadConnectionHistory = () => {
    try {
      const favs = getFavorites();
      const recents = getRecents(recentsLimit);
      setFavoriteConnections(favs.map(c => ({ ...c, isFavorite: true, status: 'success' })));
      setRecentConnections(recents.map(c => ({ ...c, isFavorite: isFavorite(c.id), status: 'success' })));
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
      case 'explorer':
        return 'pi pi-folder-open';
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
      case 'explorer':
        return '#FFB300';
      default:
        return '#9E9E9E';
    }
  };

  const ConnectionCard = ({ connection, showFavoriteAction = false }) => {
    const isActive = activeIds.has(`${connection.type}:${connection.host}:${connection.username}:${connection.port}`);
    return (
      <div
        className="connection-mini-row"
        onClick={() => onConnectToHistory?.(connection)}
        style={{
          display: 'grid',
          gridTemplateColumns: '24px 1fr auto',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          border: '1px solid var(--surface-border)',
          borderRadius: 6,
          background: 'var(--surface-card)',
          boxShadow: 'inset 0 0 0 9999px rgba(255,255,255,0.03)',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className={getConnectionTypeIcon(connection.type)} style={{ color: getConnectionTypeColor(connection.type), fontSize: 14 }} />
          <span title={isActive ? 'Activa' : 'Inactiva'} style={{ color: isActive ? '#4CAF50' : '#9E9E9E', fontSize: 10 }}>●</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ color: 'var(--text-color)', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{connection.name}</span>
            <Badge value={connection.type === 'rdp-guacamole' ? 'RDP' : (connection.type === 'explorer' ? 'Explorer' : 'SSH')} style={{ backgroundColor: getConnectionTypeColor(connection.type), fontSize: '0.65rem' }} />
            {connection.isFavorite && <i className="pi pi-star-fill" style={{ color: '#FFD700', fontSize: 12 }} />}
          </div>
          <span style={{ color: 'var(--text-color-secondary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {connection.username}@{connection.host}:{connection.port}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
          {showFavoriteAction && (
            <Button icon={connection.isFavorite ? 'pi pi-star-fill' : 'pi pi-star'} className="p-button-text p-button-rounded p-button-sm" onClick={() => { toggleFavorite(connection); loadConnectionHistory(); }} />
          )}
          {onEdit && <Button icon="pi pi-pencil" className="p-button-text p-button-rounded p-button-sm" onClick={() => onEdit(connection)} />}
          <Button icon="pi pi-external-link" className="p-button-text p-button-rounded p-button-sm" onClick={() => onConnectToHistory?.(connection)} />
        </div>
      </div>
    );
  };

  const twoColumns = layout === 'two-columns';

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: templateColumns ? templateColumns : (twoColumns ? '1fr 1fr' : '1fr'), gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <i className="pi pi-star-fill" style={{ color: '#FFD700' }} />
            <h3 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.1rem' }}>
              Conexiones Favoritas
            </h3>
            <Badge value={favoriteConnections.length} severity="warning" />
          </div>
          {favoriteConnections.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${favoritesColumns}, 1fr)`, gap: 8 }}>
              {favoriteConnections.map(connection => (
                <ConnectionCard key={connection.id} connection={connection} showFavoriteAction={true} />
              ))}
            </div>
          ) : (
            <Card style={{ textAlign: 'center', padding: '2rem', background: 'var(--surface-card)' }}>
              <i className="pi pi-info-circle" style={{ fontSize: '3rem', color: 'var(--text-color-secondary)', marginBottom: '1rem', display: 'block' }} />
              <h4 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>No hay favoritos aún</h4>
              <p style={{ color: 'var(--text-color-secondary)', margin: 0 }}>Marca conexiones desde la sidebar o desde estas tarjetas</p>
            </Card>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <i className="pi pi-clock" style={{ color: 'var(--primary-color)' }} />
            <h3 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.1rem' }}>
              Conexiones Recientes
            </h3>
            <Badge value={recentConnections.length} />
          </div>
          {recentConnections.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${recentsColumns}, 1fr)`, gap: 8 }}>
              {recentConnections.map(connection => (
                <ConnectionCard key={connection.id} connection={connection} showFavoriteAction={true} />
              ))}
            </div>
          ) : (
            <Card style={{ textAlign: 'center', padding: '2rem', background: 'var(--surface-card)' }}>
              <i className="pi pi-info-circle" style={{ fontSize: '3rem', color: 'var(--text-color-secondary)', marginBottom: '1rem', display: 'block' }} />
              <h4 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>No hay conexiones recientes</h4>
              <p style={{ color: 'var(--text-color-secondary)', margin: 0 }}>Las conexiones aparecerán aquí después de usarlas</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionHistory;