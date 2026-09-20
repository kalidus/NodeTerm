import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DOCK_ACTIONS,
  getDockAction,
  getDockPins,
  groupDockActions,
  pinHostToDock,
  reorderDockPins,
  runDockAction,
  saveDockPins,
  unpinDockItem
} from '../../utils/homeDock';
import { getRecents } from '../../utils/connectionStore';
import { getConnectionTypeColor, getProtocolBadge } from './connection-history/utils/connectionHistoryHelpers';

function readAppStats() {
  let secrets = 0;
  try {
    const stored = parseInt(localStorage.getItem('passwords_count'), 10);
    if (!Number.isNaN(stored) && stored >= 0) secrets = stored;
  } catch {
    secrets = 0;
  }

  let ssh = 0;
  let rdp = 0;
  try {
    const recents = getRecents(200) || [];
    recents.forEach((conn) => {
      const type = String(conn?.type || '');
      if (type.includes('rdp')) rdp += 1;
      else if (type.includes('vnc')) return;
      else ssh += 1;
    });
  } catch {
    ssh = 0;
    rdp = 0;
  }

  return { secrets, ssh, rdp, total: ssh + rdp };
}

const DockTile = ({
  item,
  showLabel = true,
  dragging = false,
  title,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClick,
  onContextMenu
}) => (
  <button
    type="button"
    className={`home-dock-tile${dragging ? ' is-dragging' : ''}`}
    style={{ '--tile-color': item.color || '#4fc3f7' }}
    title={title}
    draggable={draggable}
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onDragEnd={onDragEnd}
    onClick={onClick}
    onContextMenu={onContextMenu}
  >
    <span className="home-dock-tile-well">
      <i className={item.icon} />
    </span>
    {showLabel ? <span className="home-dock-tile-label">{item.label}</span> : null}
    {item.badge ? <span className="home-dock-badge">{item.badge}</span> : null}
  </button>
);

const HomeDock = ({
  visible = true,
  variant = 'panel',
  themeColors = {},
  onOpenSettings,
  onConnectToHost
}) => {
  const [pins, setPins] = useState(() => getDockPins());
  const [dragIndex, setDragIndex] = useState(-1);
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState(() => readAppStats());

  useEffect(() => {
    const refresh = () => setPins(getDockPins());
    window.addEventListener('home-dock-pins-changed', refresh);
    const pinHost = (event) => {
      const next = pinHostToDock(event.detail);
      setPins(next);
    };
    window.addEventListener('home-dock-pin-host', pinHost);
    const openStats = () => {
      setStats(readAppStats());
      setStatsOpen(true);
    };
    window.addEventListener('open-app-stats', openStats);
    return () => {
      window.removeEventListener('home-dock-pins-changed', refresh);
      window.removeEventListener('home-dock-pin-host', pinHost);
      window.removeEventListener('open-app-stats', openStats);
    };
  }, []);

  const accent = themeColors.primaryColor || '#4fc3f7';
  const isPanel = variant === 'panel';

  const resolvePin = useCallback((pin) => {
    if (!pin) return null;
    if (pin.type === 'host') {
      return {
        id: pin.id,
        label: pin.name || pin.host || 'Host',
        icon: 'pi pi-server',
        color: getConnectionTypeColor(pin.hostType),
        badge: getProtocolBadge(pin.hostType),
        pin
      };
    }
    const action = getDockAction(pin.id) || DOCK_ACTIONS.find((a) => a.id === pin.id);
    if (!action) return null;
    return {
      id: pin.id,
      label: action.label,
      icon: action.icon,
      color: action.color,
      pin
    };
  }, []);

  const visiblePins = useMemo(
    () => pins.map(resolvePin).filter(Boolean),
    [pins, resolvePin]
  );

  const unpinnedActions = useMemo(() => {
    const pinnedIds = new Set(pins.filter((p) => p.type !== 'host').map((p) => p.id));
    return DOCK_ACTIONS.filter((action) => !pinnedIds.has(action.id));
  }, [pins]);

  const catalogGroups = useMemo(
    () => groupDockActions(unpinnedActions),
    [unpinnedActions]
  );

  const handlePinClick = (item, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (item.pin?.type === 'host') {
      const host = {
        id: item.pin.connectionId,
        name: item.pin.name,
        type: item.pin.hostType,
        host: item.pin.host
      };
      if (onConnectToHost) onConnectToHost(host);
      else window.dispatchEvent(new CustomEvent('home-connect-host', { detail: host }));
      return;
    }
    runDockAction(item.id, { onOpenSettings });
  };

  const handleContext = (item, event) => {
    event.preventDefault();
    event.stopPropagation();
    const next = unpinDockItem(item.id);
    setPins(next);
  };

  const handleDragStart = (index) => setDragIndex(index);
  const handleDrop = (index) => {
    if (dragIndex < 0 || dragIndex === index) {
      setDragIndex(-1);
      return;
    }
    const next = reorderDockPins(dragIndex, index);
    setPins(next);
    setDragIndex(-1);
  };

  const pinAction = (actionId) => {
    const next = saveDockPins([...getDockPins(), { type: 'action', id: actionId }]);
    setPins(next);
  };

  if (!visible) return null;

  return (
    <aside className={`home-dock home-dock--${variant}`} style={{ '--home-dock-accent': accent }}>
      {visiblePins.length > 0 && (
        <section className="home-dock-pins">
          <div className="home-dock-group-title">Pines</div>
          <div className="home-dock-grid">
            {visiblePins.map((item, index) => (
              <DockTile
                key={item.id}
                item={item}
                showLabel={isPanel}
                dragging={dragIndex === index}
                title={`${item.label}${item.badge ? ` (${item.badge})` : ''} - clic derecho para quitar`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => setDragIndex(-1)}
                onClick={(e) => handlePinClick(item, e)}
                onContextMenu={(e) => handleContext(item, e)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="home-dock-catalog">
        {catalogGroups.length === 0 && (
          <div className="home-dock-more-empty">Todas las acciones estan en el panel</div>
        )}
        {catalogGroups.map((group) => (
          <section key={group.id} className="home-dock-group">
            <div className="home-dock-group-title">{group.label}</div>
            <div className="home-dock-grid">
              {group.actions.map((action) => (
                <div
                  key={action.id}
                  className="home-dock-catalog-item"
                  style={{ '--tile-color': action.color }}
                >
                  <DockTile
                    item={action}
                    showLabel={isPanel}
                    title={action.label}
                    onClick={() => runDockAction(action.id, { onOpenSettings })}
                  />
                  <button
                    type="button"
                    className="home-dock-tile-pin"
                    title="Pinear en el panel"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pinAction(action.id);
                    }}
                  >
                    <i className="pi pi-plus" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="home-dock-more-hint">
        Arrastra para reordenar. Clic derecho en un icono para quitarlo.
        Pinea un host desde Favoritos.
      </div>

      {statsOpen && typeof document !== 'undefined' && document.body && createPortal(
        <div className="home-dock-stats-overlay" onClick={() => setStatsOpen(false)}>
          <div className="home-dock-stats-card" onClick={(e) => e.stopPropagation()}>
            <div className="home-dock-stats-header">
              <div className="home-dock-stats-title">
                <span className="home-dock-stats-icon"><i className="pi pi-chart-pie" /></span>
                <h3>Estadisticas</h3>
              </div>
              <button type="button" className="home-dock-stats-close" onClick={() => setStatsOpen(false)}>
                <i className="pi pi-times" />
              </button>
            </div>
            <div className="home-dock-stats-body">
              <div className="home-dock-stats-grid">
                <div className="home-dock-stats-box">
                  <span>Conexiones recientes</span>
                  <strong>{stats.total}</strong>
                  <div className="home-dock-stats-tags">
                    <span>SSH: {stats.ssh}</span>
                    <span>RDP: {stats.rdp}</span>
                  </div>
                </div>
                <div className="home-dock-stats-box">
                  <span>Secretos</span>
                  <strong>{stats.secrets}</strong>
                </div>
              </div>
            </div>
            <div className="home-dock-stats-footer">
              <button type="button" onClick={() => setStatsOpen(false)}>Aceptar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
};

export default HomeDock;
