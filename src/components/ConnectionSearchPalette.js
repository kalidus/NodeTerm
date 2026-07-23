import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import ConnectionSearchBar from './ConnectionSearchBar';

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
      aria-label="Buscador de conexiones"
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
}) => {
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

  if (!open) {
    return null;
  }

  return ReactDOM.createPortal(
    <PaletteBackdrop onClose={onClose}>
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
        emptyLabel="Buscar conexiones, hosts o contraseñas"
        autoFocus
        onRequestClose={onClose}
      />
    </PaletteBackdrop>,
    document.body
  );
};

export default ConnectionSearchPalette;
