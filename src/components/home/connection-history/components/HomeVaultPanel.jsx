import React, { useMemo } from 'react';
import { flattenVaultNodes, VAULT_SECRET_TYPES } from '../../../../utils/homeWidgets';

export const HomeVaultPanel = ({
  passwordNodes = [],
  onOpenVault
}) => {
  const secrets = useMemo(
    () => flattenVaultNodes(passwordNodes, VAULT_SECRET_TYPES).slice(0, 12),
    [passwordNodes]
  );

  const openSecret = (item) => {
    window.dispatchEvent(new CustomEvent('open-password-tab', {
      detail: { key: item.key || item.id, label: item.name || item.label, data: item }
    }));
  };

  return (
    <div className="home-widget-list">
      <div className="home-widget-list-scroll">
        {secrets.length === 0 && (
          <div className="home-widget-empty">
            No hay secretos recientes.
            <div>
              <button type="button" onClick={() => {
                if (onOpenVault) onOpenVault();
                else window.dispatchEvent(new CustomEvent('open-password-manager'));
              }}>
                Abrir Vault
              </button>
            </div>
          </div>
        )}
        {secrets.map((item) => (
          <button
            key={item.key || item.id}
            type="button"
            className="home-widget-row"
            style={{ '--tile-color': '#E91E63' }}
            onClick={() => openSecret(item)}
          >
            <i className="pi pi-key" style={{ color: '#E91E63' }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="home-fav-name">{item.name || item.label || 'Secreto'}</div>
              <div className="home-widget-meta">{item.username || item.url || item.type}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeVaultPanel;
