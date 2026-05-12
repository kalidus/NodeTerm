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
      background: 'rgba(6, 10, 18, 0.62)',
      backdropFilter: 'blur(6px)',
      WebkitAppRegion: 'no-drag',
    }}
  >
    <div
      style={{
        width: 'min(640px, 100%)',
        padding: '18px 18px 14px',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, rgba(24, 30, 42, 0.96) 0%, rgba(14, 18, 28, 0.98) 100%)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
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
      <div
        className="connection-search-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Buscador de conexiones"
      >
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
      </div>
    </PaletteBackdrop>,
    document.body
  );
};

export default ConnectionSearchPalette;
