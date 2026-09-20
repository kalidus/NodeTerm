import React from 'react';
import {
  getConnectionTypeColor,
  getProtocolBadge,
  buildHostLabel,
  formatRelativeTimeShort
} from '../utils/connectionHistoryHelpers';

export const HomeFavoriteTiles = ({
  connections = [],
  activeIds,
  onConnect,
  onEdit,
  onPinToDock,
  emptyMessage = '// NO HAY FAVORITOS. PINEA 4 HOSTS PARA LANZAR RAPIDO'
}) => {
  if (!connections.length) {
    return <div className="home-widget-empty">{emptyMessage}</div>;
  }

  return (
    <div className="home-fav-grid">
      {connections.map((conn) => {
        const color = getConnectionTypeColor(conn.type);
        const id = conn.id || conn.key;
        const connected = activeIds && (activeIds.has?.(id) || activeIds.has?.(conn.key));
        return (
          <div
            key={id}
            className="home-fav-tile"
            style={{ '--tile-color': color }}
          >
            <div className="home-fav-tile-top">
              <span className="home-fav-badge">{getProtocolBadge(conn.type)}</span>
              {connected ? <span className="home-widget-dot" style={{ color: '#27c93f' }} /> : null}
            </div>
            <button type="button" className="home-fav-name" onClick={() => onConnect?.(conn)}>
              {conn.name || conn.label || 'Host'}
            </button>
            <div className="home-fav-host">{buildHostLabel ? buildHostLabel(conn) : (conn.host || conn.hostname || '-')}</div>
            <div className="home-jump-meta">{formatRelativeTimeShort(conn.lastUsed || conn.updatedAt)}</div>
            <div className="home-fav-actions">
              <button type="button" onClick={() => onConnect?.(conn)} title="Conectar">
                Conectar
              </button>
              <button type="button" onClick={() => onEdit?.(conn)} title="Editar">
                Editar
              </button>
              <button
                type="button"
                title="Pinear en el dock"
                onClick={() => {
                  onPinToDock?.(conn);
                  window.dispatchEvent(new CustomEvent('home-dock-pin-host', { detail: conn }));
                }}
              >
                Dock
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HomeFavoriteTiles;
