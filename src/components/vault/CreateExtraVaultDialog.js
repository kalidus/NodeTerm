import React, { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import vaultKeyring from '../../services/VaultKeyring';

const CreateExtraVaultDialog = ({ visible, onHide, onCreated, showToast }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setPassword('');
      setConfirm('');
      setRemember(true);
      setError('');
      setLoading(false);
    }
  }, [visible]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Indica un nombre');
      return;
    }
    if (!password || password.length < 6) {
      setError('La clave debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Las claves no coinciden');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await window.electron?.vaults?.create?.({ name: trimmed });
      if (!result?.success || !result.vault) {
        throw new Error(result?.error || 'No se pudo crear el vault');
      }
      const unlock = await vaultKeyring.unlock(result.vault.id, password, {
        remember,
        encryptedBlob: undefined
      });
      if (!unlock.success) {
        throw new Error(unlock.error || 'No se pudo guardar la clave');
      }
      showToast?.(
        'success',
        'Vault creado',
        result.backup?.created
          ? `«${trimmed}» listo. Se hizo una copia de seguridad previa.`
          : `«${trimmed}» listo.`
      );
      onCreated?.(result.vault);
      onHide?.();
    } catch (e) {
      setError(e?.message || 'Error al crear');
      showToast?.('error', 'Vault', e?.message || 'Error al crear');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      header="Nuevo vault de conexiones"
      visible={!!visible}
      onHide={onHide}
      modal
      style={{ width: '440px' }}
      breakpoints={{ '960px': '90vw' }}
      footer={
        <div className="flex justify-content-end gap-2">
          <Button label="Cancelar" className="p-button-text" onClick={onHide} disabled={loading} />
          <Button label="Crear" icon="pi pi-plus" onClick={handleCreate} loading={loading} />
        </div>
      }
    >
      <div className="flex flex-column gap-3">
        <p className="m-0 text-sm" style={{ opacity: 0.85 }}>
          Crea un vault independiente con su propia clave maestra. Incluye conexiones, passwords y
          notas (documentos) separados del vault principal.
        </p>
        <div className="flex flex-column gap-2">
          <label htmlFor="new-vault-name">Nombre</label>
          <InputText
            id="new-vault-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
            autoFocus
          />
        </div>
        <div className="flex flex-column gap-2">
          <label htmlFor="new-vault-password">Clave maestra</label>
          <Password
            id="new-vault-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            feedback
            toggleMask
            className="w-full"
            inputClassName="w-full"
          />
        </div>
        <div className="flex flex-column gap-2">
          <label htmlFor="new-vault-confirm">Confirmar clave</label>
          <Password
            id="new-vault-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            feedback={false}
            toggleMask
            className="w-full"
            inputClassName="w-full"
          />
        </div>
        <div className="flex align-items-center gap-2">
          <Checkbox
            inputId="new-vault-remember"
            checked={remember}
            onChange={(e) => setRemember(!!e.checked)}
          />
          <label htmlFor="new-vault-remember">Recordar clave en este dispositivo</label>
        </div>
        {error ? <small className="p-error">{error}</small> : null}
      </div>
    </Dialog>
  );
};

export default CreateExtraVaultDialog;
