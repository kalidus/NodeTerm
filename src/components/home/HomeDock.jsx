import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DOCK_ACTIONS,
  getDockAction,
  getDockPins,
  pinHostToDock,
  reorderDockPins,
  runDockAction,
  saveDockPins,
  unpinDockItem
} from '../../utils/homeDock';
import { getConnectionTypeColor, getProtocolBadge } from './connection-history/utils/connectionHistoryHelpers';

const HomeDock = ({
  visible = true,
  variant = 'panel',
  themeColors = {},
  onOpenSettings,
  onConnectToHost
}) => {
  const [pins, setPins] = useState(() => getDockPins());
  const [moreOpen, setMoreOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(-1);

  useEffect(() => {
    const refresh = () => setPins(getDockPins());
    window.addEventListener('home-dock-pins-changed', refresh);
    const pinHost = (event) => {
      const next = pinHostToDock(event.detail);
      setPins(next);
    };
    window.addEventListener('home-dock-pin-host', pinHost);
    return () => {
      window.removeEventListener('home-dock-pins-changed', refresh);
      window.removeEventListener('home-dock-pin-host', pinHost);
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
      <div className="home-dock-list">
        {visiblePins.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`home-dock-btn${dragIndex === index ? ' is-dragging' : ''}`}
            title={`${item.label}${item.badge ? ` (${item.badge})` : ''} — clic derecho para quitar`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            onClick={(e) => handlePinClick(item, e)}
            onContextMenu={(e) => handleContext(item, e)}
          >
            <i className={item.icon} style={{ color: item.color }} />
            {isPanel ? <span className="home-dock-btn-label">{item.label}</span> : null}
            {item.badge ? <span className="home-dock-badge">{item.badge}</span> : null}
          </button>
        ))}
      </div>

      <div className="home-dock-footer">
        <button
          type="button"
          className={`home-dock-btn${moreOpen ? ' is-active' : ''}`}
          title="Mas acciones"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <i className="pi pi-ellipsis-h" />
          {isPanel ? <span className="home-dock-btn-label">Mas</span> : null}
        </button>
      </div>

      {moreOpen && (
        <div className="home-dock-more">
          <div className="home-dock-more-title">Acciones</div>
          {unpinnedActions.length === 0 && (
            <div className="home-dock-more-empty">Todas las acciones estan en el panel</div>
          )}
          {unpinnedActions.map((action) => (
            <div key={action.id} className="home-dock-more-row">
              <button
                type="button"
                className="home-dock-more-run"
                onClick={() => {
                  runDockAction(action.id, { onOpenSettings });
                  setMoreOpen(false);
                }}
              >
                <i className={action.icon} style={{ color: action.color }} />
                <span>{action.label}</span>
              </button>
              <button
                type="button"
                className="home-dock-more-pin"
                title="Pinear en el panel"
                onClick={() => pinAction(action.id)}
              >
                <i className="pi pi-plus" />
              </button>
            </div>
          ))}
          <div className="home-dock-more-hint">
            Arrastra para reordenar. Clic derecho en un icono para quitarlo.
            Pinea un host desde Favoritos.
          </div>
        </div>
      )}
    </aside>
  );
};

export default HomeDock;
