import React from 'react';

function exitMinimalMode() {
  try {
    window.dispatchEvent(new CustomEvent('toggle-minimal-mode'));
  } catch {
    /* noop */
  }
}

export default function MinimalModeExitButton({ isMinimalMode }) {
  if (!isMinimalMode) {
    return null;
  }

  return (
    <button
      type="button"
      className="minimal-mode-exit-btn"
      onClick={exitMinimalMode}
      title="Salir del modo minimalista (Ctrl+Alt+M)"
      aria-label="Salir del modo minimalista"
    >
      <i className="pi pi-window-maximize" />
    </button>
  );
}
