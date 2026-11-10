import React, { useEffect, useRef, useState } from 'react';

function dispatchChromeEvent(name) {
  try {
    window.dispatchEvent(new CustomEvent(name));
  } catch {
    /* noop */
  }
}

function openAppearancePanel(anchor) {
  try {
    window.dispatchEvent(new CustomEvent('open-appearance-quick-panel', {
      detail: { anchor }
    }));
  } catch {
    /* noop */
  }
}

export default function TabBarRestoreButton({ visible }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setMenuOpen(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const closeOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  if (!visible) {
    return null;
  }

  return (
    <div className="tab-bar-restore-root" ref={rootRef}>
      <button
        type="button"
        className="tab-bar-restore-btn"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenuOpen((prev) => !prev);
        }}
        title="Mostrar barras de la interfaz"
        aria-label="Mostrar barras de la interfaz"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <i className="pi pi-window-maximize" />
      </button>

      {menuOpen ? (
        <div className="tab-bar-restore-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="tab-bar-restore-menu-item"
            onClick={() => {
              dispatchChromeEvent('toggle-titlebar');
              setMenuOpen(false);
            }}
          >
            Mostrar barra de título
          </button>
          <button
            type="button"
            role="menuitem"
            className="tab-bar-restore-menu-item"
            onClick={() => {
              dispatchChromeEvent('toggle-tabbar');
              setMenuOpen(false);
            }}
          >
            Mostrar barra de pestañas
          </button>
          <div className="tab-bar-restore-menu-separator" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            className="tab-bar-restore-menu-item"
            onClick={(event) => {
              openAppearancePanel(event.currentTarget);
              setMenuOpen(false);
            }}
          >
            Tema y diseño
          </button>
        </div>
      ) : null}
    </div>
  );
}
