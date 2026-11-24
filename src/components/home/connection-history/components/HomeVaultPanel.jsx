import React, { useMemo } from 'react';
import { flattenVaultNodes, VAULT_SECRET_TYPES } from '../../../../utils/homeWidgets';

export const HomeVaultPanel = ({
  passwordNodes = [],
  onOpenVault,
  needsMasterKeySetup = false
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

  const needsSetup = needsMasterKeySetup || !window.__nodetermHasMasterKey;

  const openVaultOrSetup = () => {
    if (needsSetup) {
      try {
        window.toast?.current?.show?.({
          severity: 'info',
          summary: 'Clave maestra',
          detail: 'Crea la clave maestra en Home para usar el vault.',
          life: 4000
        });
      } catch (_) { /* noop */ }
      window.dispatchEvent(new CustomEvent('focus-master-key-setup'));
      return;
    }
    if (onOpenVault) onOpenVault();
    else window.dispatchEvent(new CustomEvent('open-password-manager'));
  };

  return (
    <div className="home-widget-list">
      <div className="home-widget-list-scroll">
        {secrets.length === 0 && (
          <div className="home-widget-empty">
            {needsSetup
              ? 'Crea la clave maestra para cifrar tus secretos.'
              : 'No hay secretos recientes.'}
            <div>
              <button type="button" onClick={openVaultOrSetup}>
                {needsSetup ? 'Configurar clave' : 'Abrir Vault'}
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
