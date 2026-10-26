import React, { useRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { CONNECTIONS_LAYOUTS } from './connectionsLayoutModes';
import '../../styles/components/connections-layouts.css';

const LayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="4" width="7" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="14" y="4" width="7" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="3" y="14" width="7" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="14" y="14" width="7" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const ConnectionsLayoutMenu = ({ layout = 'tree', onSelect }) => {
  const panelRef = useRef(null);

  return (
    <>
      <button
        type="button"
        className={`sidebar-panel-toolbar-btn sidebar-panel-toolbar-btn--layout${layout !== 'tree' ? ' is-on' : ''}`}
        title="Estilo de conexiones"
        aria-label="Estilo de conexiones"
        aria-haspopup="menu"
        onClick={(e) => panelRef.current?.toggle(e)}
      >
        <span className="conn-layout-toolbar-icon">
          <LayoutIcon />
        </span>
      </button>
      <OverlayPanel
        ref={panelRef}
        appendTo={document.body}
        className="app-surface app-surface-lg glass-panel conn-layout-overlay"
        style={{ width: 280, zIndex: 10001, marginTop: 5 }}
      >
        <div className="conn-layout-menu" role="menu" aria-label="Estilo de conexiones">
          <div className="conn-layout-menu-title">Estilo de conexiones</div>
          {CONNECTIONS_LAYOUTS.map((item) => {
            const active = layout === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`conn-layout-menu-item${active ? ' is-active' : ''}`}
                onClick={() => {
                  onSelect?.(item.id);
                  panelRef.current?.hide();
                }}
              >
                <span className="conn-layout-menu-name">{item.name}</span>
                <span className="conn-layout-menu-desc">{item.description}</span>
              </button>
            );
          })}
        </div>
      </OverlayPanel>
    </>
  );
};

export default ConnectionsLayoutMenu;
