import React, { useEffect, useState } from 'react';
import { subscribeHomeSessions, requestActivateHomeTab } from '../../../../utils/homeSessionBus';
import { getConnectionTypeColor, getProtocolBadge } from '../utils/connectionHistoryHelpers';

const SKIP_TYPES = new Set(['home']);

export const HomeSessionsPanel = () => {
  const [snapshot, setSnapshot] = useState({ tabs: [], activeKey: null });

  useEffect(() => subscribeHomeSessions(setSnapshot), []);

  const sessions = (snapshot.tabs || []).filter((tab) => tab && !SKIP_TYPES.has(tab.type));

  if (!sessions.length) {
    return (
      <div className="home-widget-empty">
        No hay sesiones abiertas.
      </div>
    );
  }

  return (
    <div className="home-widget-list">
      <div className="home-widget-list-scroll">
        {sessions.map((tab) => {
          const color = getConnectionTypeColor(tab.type);
          const active = snapshot.activeKey === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className="home-widget-row"
              style={{ '--tile-color': color, borderColor: active ? color : undefined }}
              onClick={() => requestActivateHomeTab(tab.key)}
              title="Ir a la pestana"
            >
              <span className="home-widget-dot" style={{ color: active ? '#27c93f' : color }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="home-fav-name">{tab.label || tab.title || tab.type}</div>
                <div className="home-widget-meta">{getProtocolBadge(tab.type)} · {tab.type}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HomeSessionsPanel;
