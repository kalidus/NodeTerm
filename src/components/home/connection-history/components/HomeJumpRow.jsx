import React, { useMemo } from 'react';
import { getJumpPins } from '../../../../utils/homeDock';
import {
  getConnectionTypeColor,
  getProtocolBadge,
  buildHostLabel
} from '../utils/connectionHistoryHelpers';

export const HomeJumpRow = ({
  favorites = [],
  onConnect,
  maxItems = 8
}) => {
  const tiles = useMemo(() => {
    const pinnedIds = getJumpPins();
    const byId = new Map(
      (favorites || []).map((fav) => [String(fav.id || fav.key), fav])
    );
    const fromPins = pinnedIds.map((id) => byId.get(String(id))).filter(Boolean);
    const rest = (favorites || []).filter((fav) => {
      const id = String(fav.id || fav.key);
      return !pinnedIds.includes(id) && !fromPins.includes(fav);
    });
    return [...fromPins, ...rest].slice(0, maxItems);
  }, [favorites, maxItems]);

  if (!tiles.length) {
    return (
      <div className="home-widget-empty" style={{ padding: '10px 8px' }}>
        Pinea favoritos para lanzarlos desde aqui.
      </div>
    );
  }

  return (
    <div className="home-jump-row">
      {tiles.map((conn) => {
        const color = getConnectionTypeColor(conn.type);
        return (
          <button
            key={conn.id || conn.key}
            type="button"
            className="home-jump-tile"
            style={{ '--tile-color': color }}
            title={`Conectar a ${conn.name || conn.label}`}
            onClick={() => onConnect?.(conn)}
            onContextMenu={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('home-dock-pin-host', { detail: conn }));
            }}
          >
            <span className="home-jump-badge">{getProtocolBadge(conn.type)}</span>
            <span className="home-jump-name">{conn.name || conn.label || 'Host'}</span>
            <span className="home-jump-meta">{buildHostLabel ? buildHostLabel(conn) : (conn.host || '-')}</span>
          </button>
        );
      })}
    </div>
  );
};

export default HomeJumpRow;
