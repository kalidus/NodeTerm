import React, { useCallback, useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { isMultiVaultEnabled, setMultiVaultEnabled } from '../../../../utils/multiVaultFlag';
import { DEFAULT_VAULT_ID } from '../../../../utils/activeConnectionVault';
import vaultKeyring from '../../../../services/VaultKeyring';
import { appConfirm } from '../../../ui/AppConfirm';
import CreateExtraVaultDialog from '../../../vault/CreateExtraVaultDialog';

const MultiVaultSubTab = ({ showToast }) => {
  const [enabled, setEnabled] = useState(() => isMultiVaultEnabled());
  const [vaults, setVaults] = useState([]);
  const [defaultVaultName, setDefaultVaultName] = useState('Principal');
  const [createVisible, setCreateVisible] = useState(false);
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.electron?.vaults?.list) {
      setVaults([]);
      setDefaultVaultName('Principal');
      return;
    }
    try {
      const res = await window.electron.vaults.list();
      setVaults(res?.vaults || []);
      setDefaultVaultName(
        String(res?.defaultVaultName || '').trim() || 'Principal'
      );
    } catch (_) {
      setVaults([]);
      setDefaultVaultName('Principal');
    }
  }, []);

  useEffect(() => {
    refresh();
    const off = window.electron?.vaults?.onChanged?.(refresh);
    const onFlag = () => setEnabled(isMultiVaultEnabled());
    window.addEventListener('multi-vault-flag-changed', onFlag);
    return () => {
      off?.();
      window.removeEventListener('multi-vault-flag-changed', onFlag);
    };
  }, [refresh]);

  const handleToggle = async (checked) => {
    setMultiVaultEnabled(!!checked);
    setEnabled(!!checked);
    showToast?.(
      'info',
      'Vaults',
      checked
        ? 'Activo: puedes crear vaults adicionales.'
        : 'Desactivado: los vaults adicionales no se montan en el árbol.'
    );
    window.dispatchEvent(new CustomEvent('extra-vaults-reload'));
  };

  const handleRename = async (vault) => {
    if (!renameValue.trim()) return;
    setLoading(true);
    try {
      const res = await window.electron.vaults.rename({
        vaultId: vault.id,
        name: renameValue.trim()
      });
      if (!res?.success) throw new Error(res?.error || 'Error');
      setRenameId(null);
      await refresh();
      window.dispatchEvent(new CustomEvent('extra-vaults-reload'));
      showToast?.('success', 'Vault', 'Nombre actualizado');
    } catch (e) {
      showToast?.('error', 'Vault', e?.message || 'No se pudo renombrar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vault) => {
    const ok = await appConfirm({
      header: 'Eliminar vault',
      message: `¿Eliminar permanentemente «${vault.name}» y todas sus conexiones? Esta acción no se puede deshacer.`,
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger'
    });
    if (!ok) return;
    setLoading(true);
    try {
      vaultKeyring.lock(vault.id);
      const res = await window.electron.vaults.delete({ vaultId: vault.id });
      if (!res?.success) throw new Error(res?.error || 'Error');
      try {
        const { removeExtraVaultLocalStorageKeys } = await import(
          '../../../../utils/extraDomainVaults'
        );
        removeExtraVaultLocalStorageKeys(vault.id);
      } catch (_) {
        try {
          localStorage.removeItem(`connections_encrypted__${vault.id}`);
          localStorage.removeItem(`passwords_encrypted__${vault.id}`);
          localStorage.removeItem(`documents_encrypted__${vault.id}`);
        } catch (__) {
          /* noop */
        }
      }
      await refresh();
      window.dispatchEvent(new CustomEvent('extra-vaults-reload'));
      showToast?.('success', 'Vault', `«${vault.name}» eliminado`);
    } catch (e) {
      showToast?.('error', 'Vault', e?.message || 'No se pudo eliminar');
    } finally {
      setLoading(false);
    }
  };

  const renderRenameControls = (vault) => (
    <div className="multi-vault-row-actions">
      {renameId === vault.id ? (
        <Button
          icon="pi pi-check"
          className="p-button-rounded p-button-text"
          onClick={() => handleRename(vault)}
          disabled={loading}
          tooltip="Guardar"
          tooltipOptions={{ position: 'top' }}
        />
      ) : (
        <Button
          icon="pi pi-pencil"
          className="p-button-rounded p-button-text"
          onClick={() => {
            setRenameId(vault.id);
            setRenameValue(vault.name);
          }}
          tooltip="Renombrar"
          tooltipOptions={{ position: 'top' }}
        />
      )}
      {vault.id !== DEFAULT_VAULT_ID ? (
        <Button
          icon="pi pi-trash"
          className="p-button-rounded p-button-text p-button-danger"
          onClick={() => handleDelete(vault)}
          disabled={loading}
          tooltip="Eliminar"
          tooltipOptions={{ position: 'top' }}
        />
      ) : null}
    </div>
  );

  const renderVaultRow = ({ vault, icon, subtitle, badgeValue, badgeSeverity }) => {
    const isRenaming = renameId === vault.id;
    return (
      <li
        key={vault.id}
        className="multi-vault-row"
        title={vault.id}
      >
        <div className="multi-vault-row-main">
          <div className={`multi-vault-row-icon ${vault.id === DEFAULT_VAULT_ID ? 'is-principal' : ''}`}>
            <i className={icon} />
          </div>
          {isRenaming ? (
            <InputText
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="multi-vault-rename-input w-full"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(vault);
                if (e.key === 'Escape') setRenameId(null);
              }}
            />
          ) : (
            <div className="multi-vault-row-info">
              <div className="multi-vault-row-title-line">
                <span className="multi-vault-row-name">{vault.name}</span>
                {badgeValue ? (
                  <Badge value={badgeValue} severity={badgeSeverity || 'info'} />
                ) : null}
              </div>
              {subtitle ? (
                <small className="multi-vault-row-subtitle">{subtitle}</small>
              ) : null}
            </div>
          )}
        </div>
        {renderRenameControls(vault)}
      </li>
    );
  };

  const principalVault = {
    id: DEFAULT_VAULT_ID,
    name: defaultVaultName,
    icon: 'pi pi-home'
  };

  return (
    <div className="security-settings-container">
      <div className="security-settings-content">
        <div className="security-settings-header-wrapper">
          <div className="security-header-content">
            <span className="security-header-icon protocol-dialog-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="vaultsHeaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#11998e" />
                    <stop offset="100%" stopColor="#38ef7d" />
                  </linearGradient>
                  <linearGradient id="vaultsLockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e8e8f0" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
                  fill="url(#vaultsHeaderGradient)"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="0.6"
                />
                <g transform="translate(12, 11)">
                  <rect
                    x="-3.2"
                    y="-0.2"
                    width="6.4"
                    height="5.2"
                    rx="1.2"
                    fill="url(#vaultsLockGradient)"
                    opacity="0.98"
                  />
                  <path
                    d="M-1.6 -0.2 V-1.6 a1.6 1.6 0 0 1 3.2 0 V-0.2"
                    fill="none"
                    stroke="url(#vaultsLockGradient)"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <circle cx="0" cy="2.2" r="0.85" fill="rgba(17, 153, 142, 0.75)" />
                </g>
              </svg>
            </span>
            <div className="security-header-text">
              <h3 className="security-header">Vaults</h3>
              <p className="security-description">
                Crea vaults adicionales con clave propia para conexiones, passwords y notas.
              </p>
            </div>
          </div>
        </div>

        <div className="general-settings-section multi-vault-enable-section">
          <div className="general-settings-options">
            <div
              className="general-setting-card"
              onClick={() => handleToggle(!enabled)}
            >
              <div className="general-setting-content">
                <div className="general-setting-icon lock">
                  <i className="pi pi-lock" />
                </div>
                <div className="general-setting-info">
                  <label htmlFor="multi-vault-flag" className="general-setting-label">
                    Habilitar vaults adicionales
                  </label>
                  <p className="general-setting-description">
                    Monta vaults independientes en el árbol, cada uno con su propia clave maestra.
                  </p>
                </div>
                <div className="general-setting-control" onClick={(e) => e.stopPropagation()}>
                  <InputSwitch
                    inputId="multi-vault-flag"
                    checked={enabled}
                    onChange={(e) => handleToggle(!!e.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {enabled && (
          <>
            <div className="general-settings-section">
              <div className="general-section-header">
                <div className="general-section-icon">
                  <i className="pi pi-home" />
                </div>
                <h4 className="general-section-title">Vault principal</h4>
              </div>
              <div className="general-settings-options multi-vault-list-wrap">
                <ul className="multi-vault-list">
                  {renderVaultRow({
                    vault: principalVault,
                    icon: 'pi pi-home',
                    subtitle: 'Usa la clave maestra de la app',
                    badgeValue: 'Principal',
                    badgeSeverity: 'success'
                  })}
                </ul>
              </div>
            </div>

            <div className="general-settings-section">
              <div className="general-section-header multi-vault-section-header">
                <div className="multi-vault-section-header-left">
                  <div className="general-section-icon">
                    <i className="pi pi-folder" />
                  </div>
                  <h4 className="general-section-title">Vaults adicionales</h4>
                </div>
                <Button
                  label="Nuevo vault"
                  icon="pi pi-plus"
                  size="small"
                  className="multi-vault-new-btn"
                  onClick={() => setCreateVisible(true)}
                  disabled={loading}
                />
              </div>
              <div className="general-settings-options multi-vault-list-wrap">
                {vaults.length === 0 ? (
                  <div className="multi-vault-empty">
                    <div className="multi-vault-empty-icon">
                      <i className="pi pi-inbox" />
                    </div>
                    <p className="multi-vault-empty-title">Todavía no hay vaults adicionales</p>
                    <p className="multi-vault-empty-text">
                      Crea uno para agrupar hosts, passwords y notas con otra clave.
                    </p>
                  </div>
                ) : (
                  <ul className="multi-vault-list">
                    {vaults.map((vault) => {
                      const unlocked = vaultKeyring.isUnlocked(vault.id);
                      return renderVaultRow({
                        vault,
                        icon: vault.icon || 'pi pi-lock',
                        subtitle: unlocked ? 'Desbloqueado' : 'Bloqueado',
                        badgeValue: unlocked ? 'Abierto' : 'Bloqueado',
                        badgeSeverity: unlocked ? 'success' : 'warning'
                      });
                    })}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <CreateExtraVaultDialog
        visible={createVisible}
        onHide={() => setCreateVisible(false)}
        onCreated={() => {
          refresh();
          window.dispatchEvent(new CustomEvent('extra-vaults-reload'));
        }}
        showToast={showToast}
      />
    </div>
  );
};

export default MultiVaultSubTab;
