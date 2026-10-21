import React, { useEffect, useState } from 'react';
import {
  subscribeHomeSessions,
  requestActivateHomeTab,
  requestCloseHomeTab
} from '../../../../utils/homeSessionBus';
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
          const label = tab.label || tab.title || tab.type;
          return (
            <div
              key={tab.key}
              className={`home-widget-row${active ? ' is-active' : ''}`}
              style={{ '--tile-color': color, borderColor: active ? color : undefined }}
            >
              <span className="home-widget-dot" style={{ color: active ? '#27c93f' : color }} />
              <button
                type="button"
                className="home-widget-row-main"
                onClick={() => requestActivateHomeTab(tab.key)}
                title="Ir a la pestaña"
              >
                <div className="home-fav-name">{label}</div>
                <div className="home-widget-meta">{getProtocolBadge(tab.type)} · {tab.type}</div>
              </button>
              <div className="home-fav-actions home-session-actions">
                <button
                  type="button"
                  onClick={() => requestActivateHomeTab(tab.key)}
                  title="Ir a la pestaña"
                >
                  Ir
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => requestCloseHomeTab(tab.key)}
                  title="Parar y cerrar sesión"
                >
                  Cerrar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HomeSessionsPanel;
