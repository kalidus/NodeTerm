import React, { useState } from 'react';

function exitMinimalMode() {
  try {
    window.dispatchEvent(new CustomEvent('toggle-minimal-mode'));
  } catch {
    /* noop */
  }
}

export default function MinimalModeExitButton({ isMinimalMode }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  if (!isMinimalMode) {
    return null;
  }

  const isVisible = isPinned || isHovered;

  return (
    <div
      className={`minimal-mode-toolbar-wrapper ${isVisible ? 'is-visible' : 'is-hidden'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="minimal-mode-toolbar-bar">
        <span className="minimal-mode-toolbar-badge" title="Modo minimalista activo">
          <i className="pi pi-eye-slash" />
          <span>Modo minimalista</span>
        </span>

        <span className="minimal-mode-toolbar-divider" aria-hidden="true" />

        <button
          type="button"
          className="minimal-mode-toolbar-btn"
          onClick={exitMinimalMode}
          title="Salir del modo minimalista (Ctrl+Alt+M)"
          aria-label="Salir del modo minimalista"
        >
          <i className="pi pi-window-maximize" />
          <span>Salir</span>
        </button>

        <button
          type="button"
          className={`minimal-mode-toolbar-btn minimal-mode-toolbar-btn-pin${isPinned ? ' is-active' : ''}`}
          onClick={() => setIsPinned((prev) => !prev)}
          title={isPinned ? 'Desfijar barra' : 'Fijar barra siempre visible'}
          aria-label={isPinned ? 'Desfijar barra' : 'Fijar barra'}
          aria-pressed={isPinned}
        >
          <i className={isPinned ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'} />
        </button>
      </div>

      {!isVisible && (
        <button
          type="button"
          className="minimal-mode-toolbar-handle"
          onClick={() => setIsPinned(true)}
          title="Mostrar barra del modo minimalista"
          aria-label="Mostrar barra del modo minimalista"
        >
          <i className="pi pi-chevron-down" />
        </button>
      )}
    </div>
  );
}
