import React from 'react';

function showTitleBar() {
  try {
    window.dispatchEvent(new CustomEvent('toggle-titlebar'));
  } catch {
    /* noop */
  }
}

export default function TabBarRestoreButton({ visible }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="tab-bar-restore-root">
      <button
        type="button"
        className="tab-bar-restore-btn"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          showTitleBar();
        }}
        title="Mostrar barra de título"
        aria-label="Mostrar barra de título"
      >
        <i className="pi pi-window-maximize" />
      </button>
    </div>
  );
}
