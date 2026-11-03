import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import vaultKeyring from '../../services/VaultKeyring';
import { connectionVaultStorageKey } from '../../shared/vault-connection-trees';

/**
 * Popup para desbloquear (o crear clave de) un vault extra de conexiones.
 */
const ExtraVaultUnlockDialog = ({
  visible,
  vault,
  mode = 'unlock', // 'unlock' | 'create'
  onHide,
  onSuccess,
  showToast
}) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setPassword('');
      setConfirm('');
      setRemember(true);
      setError('');
      setLoading(false);
    }
  }, [visible, vault?.id]);

  const title =
    mode === 'create'
      ? `Clave para «${vault?.name || 'vault'}»`
      : `Desbloquear «${vault?.name || 'vault'}»`;

  const handleSubmit = async () => {
    if (!vault?.id) return;
    if (!password || password.length < 6) {
      setError('La clave debe tener al menos 6 caracteres');
      return;
    }
    if (mode === 'create' && password !== confirm) {
      setError('Las claves no coinciden');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const storageKey = connectionVaultStorageKey(vault.id);
      const encryptedBlob = localStorage.getItem(storageKey);
      const result = await vaultKeyring.unlock(vault.id, password, {
        remember,
        encryptedBlob: encryptedBlob || undefined
      });
      if (!result.success) {
        setError(result.error || 'No se pudo desbloquear');
        showToast?.('error', 'Vault', result.error || 'Clave incorrecta');
        return;
      }
      onSuccess?.(vault.id, password);
      onHide?.();
    } catch (e) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      header={title}
      visible={!!visible}
      onHide={onHide}
      modal
      style={{ width: '420px' }}
      breakpoints={{ '960px': '90vw' }}
      footer={
        <div className="flex justify-content-end gap-2">
          <Button label="Cancelar" className="p-button-text" onClick={onHide} disabled={loading} />
          <Button
            label={mode === 'create' ? 'Crear y desbloquear' : 'Desbloquear'}
            icon="pi pi-unlock"
            onClick={handleSubmit}
            loading={loading}
          />
        </div>
      }
    >
      <div className="flex flex-column gap-3">
        <p className="m-0 text-sm" style={{ opacity: 0.85 }}>
          {mode === 'create'
            ? 'Define una clave maestra propia para este vault. Si la olvidas, no se podrá recuperar.'
            : 'Introduce la clave maestra de este vault para ver y usar sus hosts.'}
        </p>
        <div className="flex flex-column gap-2">
          <label htmlFor="extra-vault-password">Clave maestra</label>
          <Password
            id="extra-vault-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            feedback={mode === 'create'}
            toggleMask
            className="w-full"
            inputClassName="w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </div>
        {mode === 'create' && (
          <div className="flex flex-column gap-2">
            <label htmlFor="extra-vault-confirm">Confirmar clave</label>
            <Password
              id="extra-vault-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              feedback={false}
              toggleMask
              className="w-full"
              inputClassName="w-full"
            />
          </div>
        )}
        <div className="flex align-items-center gap-2">
          <Checkbox
            inputId="extra-vault-remember"
            checked={remember}
            onChange={(e) => setRemember(!!e.checked)}
          />
          <label htmlFor="extra-vault-remember">Recordar clave en este dispositivo</label>
        </div>
        {error ? <small className="p-error">{error}</small> : null}
      </div>
    </Dialog>
  );
};

export default ExtraVaultUnlockDialog;
