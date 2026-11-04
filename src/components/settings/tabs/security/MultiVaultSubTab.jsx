import React, { useCallback, useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
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
      'Vaults experimentales',
      checked
        ? 'Activo: puedes crear vaults extra de conexiones.'
        : 'Desactivado: los vaults extra no se montan en el árbol.'
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
    <div className="flex gap-1">
      {renameId === vault.id ? (
        <Button
          icon="pi pi-check"
          className="p-button-rounded p-button-text"
          onClick={() => handleRename(vault)}
          disabled={loading}
        />
      ) : (
        <Button
          icon="pi pi-pencil"
          className="p-button-rounded p-button-text"
          onClick={() => {
            setRenameId(vault.id);
            setRenameValue(vault.name);
          }}
        />
      )}
      {vault.id !== DEFAULT_VAULT_ID ? (
        <Button
          icon="pi pi-trash"
          className="p-button-rounded p-button-text p-button-danger"
          onClick={() => handleDelete(vault)}
          disabled={loading}
        />
      ) : null}
    </div>
  );

  const principalVault = {
    id: DEFAULT_VAULT_ID,
    name: defaultVaultName,
    icon: 'pi pi-home'
  };

  return (
    <div className="flex flex-column gap-3">
      <div className="flex align-items-start gap-2">
        <Checkbox
          inputId="multi-vault-flag"
          checked={enabled}
          onChange={(e) => handleToggle(!!e.checked)}
        />
        <div>
          <label htmlFor="multi-vault-flag" className="font-medium">
            Vaults experimentales (conexiones, passwords y notas)
          </label>
          <p className="m-0 mt-1 text-sm" style={{ opacity: 0.8 }}>
            Permite crear vaults adicionales con clave maestra propia para conexiones, passwords y notas.
            Función experimental: haz copia de seguridad antes de usarla.
          </p>
        </div>
      </div>

      {enabled && (
        <>
          <div>
            <h4 className="m-0 mb-2">Vault principal</h4>
            <ul className="list-none p-0 m-0 flex flex-column gap-2">
              <li
                className="flex align-items-center justify-content-between gap-2 p-2 border-round"
                style={{ border: '1px solid var(--surface-border)' }}
              >
                <div className="flex align-items-center gap-2 flex-1">
                  <i className="pi pi-home" />
                  {renameId === DEFAULT_VAULT_ID ? (
                    <InputText
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(principalVault);
                        if (e.key === 'Escape') setRenameId(null);
                      }}
                    />
                  ) : (
                    <div>
                      <div className="font-medium">{defaultVaultName}</div>
                      <small style={{ opacity: 0.7 }}>
                        Usa la clave maestra de la app · {DEFAULT_VAULT_ID}
                      </small>
                    </div>
                  )}
                </div>
                {renderRenameControls(principalVault)}
              </li>
            </ul>
          </div>

          <div className="flex justify-content-between align-items-center">
            <h4 className="m-0">Vaults extra</h4>
            <Button
              label="Nuevo vault"
              icon="pi pi-plus"
              size="small"
              onClick={() => setCreateVisible(true)}
              disabled={loading}
            />
          </div>

          {vaults.length === 0 ? (
            <p className="text-sm m-0" style={{ opacity: 0.75 }}>
              Todavía no hay vaults extra. Crea uno para agrupar hosts con otra clave.
            </p>
          ) : (
            <ul className="list-none p-0 m-0 flex flex-column gap-2">
              {vaults.map((vault) => (
                <li
                  key={vault.id}
                  className="flex align-items-center justify-content-between gap-2 p-2 border-round"
                  style={{ border: '1px solid var(--surface-border)' }}
                >
                  <div className="flex align-items-center gap-2 flex-1">
                    <i className={vault.icon || 'pi pi-lock'} />
                    {renameId === vault.id ? (
                      <InputText
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(vault);
                          if (e.key === 'Escape') setRenameId(null);
                        }}
                      />
                    ) : (
                      <div>
                        <div className="font-medium">{vault.name}</div>
                        <small style={{ opacity: 0.7 }}>
                          {vaultKeyring.isUnlocked(vault.id) ? 'Desbloqueado' : 'Bloqueado'} · {vault.id}
                        </small>
                      </div>
                    )}
                  </div>
                  {renderRenameControls(vault)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

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
