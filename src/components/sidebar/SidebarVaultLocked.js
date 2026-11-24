import React from 'react';

/**
 * Estado de sidebar mientras el vault está cifrado y sin clave en sesión.
 */
export default function SidebarVaultLocked({
  title = 'Cifrado',
  detail = 'Desbloquea en Home para ver este contenido.'
}) {
  return (
    <div className="sidebar-vault-locked" role="status">
      <i className="pi pi-lock sidebar-vault-locked-icon" aria-hidden="true" />
      <strong>{title}</strong>
      <p>{detail}</p>
      <button
        type="button"
        className="sidebar-vault-locked-cta"
        onClick={() => window.dispatchEvent(new CustomEvent('focus-vault-unlock'))}
      >
        Ir al desbloqueo
      </button>
    </div>
  );
}
