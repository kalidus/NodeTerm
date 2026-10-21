import React from 'react';

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
  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      className="tab-bar-restore-btn"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openAppearancePanel(event.currentTarget);
      }}
      title="Tema y diseño de pestañas"
      aria-label="Tema y diseño de pestañas"
    >
      <i className="pi pi-cog" />
    </button>
  );
}
