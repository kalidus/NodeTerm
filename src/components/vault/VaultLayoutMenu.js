import React, { useRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { VAULT_LAYOUTS } from './vaultLayoutModes';
import '../../styles/components/password-vault-layouts.css';

const LayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const VaultLayoutMenu = ({ layout = 'tree', onSelect }) => {
  const panelRef = useRef(null);

  return (
    <>
      <button
        type="button"
        className={`sidebar-panel-toolbar-btn sidebar-panel-toolbar-btn--layout${layout !== 'tree' ? ' is-on' : ''}`}
        title="Estilo de vaults"
        aria-label="Estilo de vaults"
        aria-haspopup="menu"
        onClick={(e) => panelRef.current?.toggle(e)}
      >
        <span className="vault-layout-toolbar-icon">
          <LayoutIcon />
        </span>
      </button>
      <OverlayPanel
        ref={panelRef}
        appendTo={document.body}
        className="app-surface app-surface-lg glass-panel vault-layout-overlay"
        style={{ width: 280, zIndex: 10001, marginTop: 5 }}
      >
        <div className="vault-layout-menu" role="menu" aria-label="Estilo de vaults">
          <div className="vault-layout-menu-title">Estilo de vaults</div>
          {VAULT_LAYOUTS.map((item) => {
            const active = layout === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`vault-layout-menu-item${active ? ' is-active' : ''}`}
                onClick={() => {
                  onSelect?.(item.id);
                  panelRef.current?.hide();
                }}
              >
                <span className="vault-layout-menu-name">{item.name}</span>
                <span className="vault-layout-menu-desc">{item.description}</span>
              </button>
            );
          })}
        </div>
      </OverlayPanel>
    </>
  );
};

export default VaultLayoutMenu;
