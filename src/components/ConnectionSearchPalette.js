import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import ConnectionSearchBar from './ConnectionSearchBar';
import { filterPaletteActions, runDockAction } from '../utils/homeDock';

const PaletteBackdrop = ({ children, onClose }) => (
  <div
    className="connection-search-palette-backdrop"
    onMouseDown={() => onClose?.()}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10050,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '12vh 24px 24px',
      WebkitAppRegion: 'no-drag',
    }}
  >
    <div
      className="app-surface app-surface-lg connection-search-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      style={{
        width: 'min(640px, 100%)',
        padding: '18px 18px 14px',
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

const ConnectionSearchPalette = ({
  open,
  onClose,
  sidebarFilter,
  setSidebarFilter,
  allNodes,
  findAllConnections,
  onOpenSSHConnection,
  onOpenRdpConnection,
  onOpenVncConnection,
  openEditSSHDialog,
  openEditRdpDialog,
  expandedKeys,
  masterKey,
  secureStorage,
  iconTheme = 'material',
  onOpenSettings
}) => {
  const [activeAction, setActiveAction] = useState(0);
  const actions = filterPaletteActions(sidebarFilter);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape, true);
    };
  }, [open, onClose]);

  useEffect(() => {
    setActiveAction(0);
  }, [sidebarFilter, open]);

  if (!open) {
    return null;
  }

  const runAction = (action) => {
    if (!action) return;
    runDockAction(action.id, { onOpenSettings });
    onClose?.();
  };

  return ReactDOM.createPortal(
    <PaletteBackdrop onClose={onClose}>
      {actions.length > 0 && (
        <div className="command-palette-actions">
          <div className="command-palette-kicker">Acciones</div>
          {actions.map((action, idx) => (
            <button
              key={action.id}
              type="button"
              className={`command-palette-action${idx === activeAction ? ' is-active' : ''}`}
              onMouseEnter={() => setActiveAction(idx)}
              onClick={() => runAction(action)}
            >
              <i className={action.icon} style={{ color: action.color }} />
              <span className="command-palette-action-label">{action.label}</span>
              <span className="command-palette-action-hint">Enter</span>
            </button>
          ))}
        </div>
      )}
      <ConnectionSearchBar
        variant="palette"
        sidebarFilter={sidebarFilter}
        setSidebarFilter={setSidebarFilter}
        allNodes={allNodes}
        findAllConnections={findAllConnections}
        onOpenSSHConnection={onOpenSSHConnection}
        onOpenRdpConnection={onOpenRdpConnection}
        onOpenVncConnection={onOpenVncConnection}
        openEditSSHDialog={openEditSSHDialog}
        openEditRdpDialog={openEditRdpDialog}
        expandedKeys={expandedKeys}
        masterKey={masterKey}
        secureStorage={secureStorage}
        iconTheme={iconTheme}
        emptyLabel="Buscar acciones, conexiones, hosts o secretos"
        autoFocus
        onRequestClose={onClose}
      />
    </PaletteBackdrop>,
    document.body
  );
};

export default ConnectionSearchPalette;
