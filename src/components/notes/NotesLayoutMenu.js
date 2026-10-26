import React, { useRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { NOTES_LAYOUTS } from './notesLayoutModes';
import '../../styles/components/notes-layouts.css';

const LayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="3" width="5" height="18" rx="1" stroke="currentColor" strokeWidth="1.6" />
    <rect x="10.5" y="5" width="4" height="16" rx="1" stroke="currentColor" strokeWidth="1.6" />
    <rect x="16" y="4" width="4.5" height="17" rx="1" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const NotesLayoutMenu = ({ layout = 'tree', onSelect }) => {
  const panelRef = useRef(null);

  return (
    <>
      <button
        type="button"
        className={`sidebar-panel-toolbar-btn sidebar-panel-toolbar-btn--layout${layout !== 'tree' ? ' is-on' : ''}`}
        title="Estilo de notas"
        aria-label="Estilo de notas"
        aria-haspopup="menu"
        onClick={(e) => panelRef.current?.toggle(e)}
      >
        <span className="notes-layout-toolbar-icon">
          <LayoutIcon />
        </span>
      </button>
      <OverlayPanel
        ref={panelRef}
        appendTo={document.body}
        className="app-surface app-surface-lg glass-panel notes-layout-overlay"
        style={{ width: 280, zIndex: 10001, marginTop: 5 }}
      >
        <div className="notes-layout-menu" role="menu" aria-label="Estilo de notas">
          <div className="notes-layout-menu-title">Estilo de notas</div>
          {NOTES_LAYOUTS.map((item) => {
            const active = layout === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`notes-layout-menu-item${active ? ' is-active' : ''}`}
                onClick={() => {
                  onSelect?.(item.id);
                  panelRef.current?.hide();
                }}
              >
                <span className="notes-layout-menu-name">{item.name}</span>
                <span className="notes-layout-menu-desc">{item.description}</span>
              </button>
            );
          })}
        </div>
      </OverlayPanel>
    </>
  );
};

export default NotesLayoutMenu;
