import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

/**
 * Tras descargar un backup de Nextcloud con vaults cifrados, pide la clave maestra
 * del equipo de origen (no viaja en la nube). Valida descifrando los vaults locales.
 */
const CloudRestoreMasterKeyDialog = ({ visible, onSuccess, onHide, secureStorage, vaultsDownloaded }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasConnectionsVault = vaultsDownloaded?.connections;
  const hasPasswordsVault = vaultsDownloaded?.passwords;

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onHide?.();
  };

  const verifyAgainstVaults = async (masterKey) => {
    const verified = [];
    const connectionsRaw = localStorage.getItem('connections_encrypted');
    const passwordsRaw = localStorage.getItem('passwords_encrypted');

    if (connectionsRaw) {
      try {
        await secureStorage.decryptData(JSON.parse(connectionsRaw), masterKey);
        verified.push('conexiones');
      } catch {
        throw new Error('La clave no descifra el vault de conexiones del backup.');
      }
    }

    if (passwordsRaw) {
      try {
        await secureStorage.decryptData(JSON.parse(passwordsRaw), masterKey);
        verified.push('contraseñas');
      } catch {
        throw new Error('La clave no descifra el vault de contraseñas del backup.');
      }
    }

    if (!connectionsRaw && !passwordsRaw) {
      throw new Error('No se encontraron vaults locales para validar la clave.');
    }

    return verified;
  };

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      setError('La clave maestra debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyAgainstVaults(password);
      await secureStorage.saveMasterKey(password, null, true);
      await secureStorage.setRememberPassword(true);
      resetForm();
      onSuccess(password);
    } catch (err) {
      console.error('[CloudRestoreMasterKeyDialog]', err);
      setError(err.message || 'Clave incorrecta o backup incompatible.');
    } finally {
      setLoading(false);
    }
  };

  const vaultList = [
    hasConnectionsVault && 'conexiones',
    hasPasswordsVault && 'contraseñas del gestor'
  ].filter(Boolean);

  return (
    <Dialog
      header="Clave maestra del backup en la nube"
      visible={visible}
      style={{ width: '460px' }}
      modal
      closable
      onHide={handleClose}
    >
      <div className="p-fluid">
        <Message
          severity="warn"
          className="mb-3"
          content={
            <div style={{ lineHeight: 1.5 }}>
              <strong>La clave maestra no se guarda en Nextcloud</strong> (por seguridad).
              Introduce la <strong>misma clave</strong> que usaste en el equipo donde subiste el backup
              para descifrar: {vaultList.join(' y ') || 'tus datos cifrados'}.
            </div>
          }
        />

        {error && <Message severity="error" text={error} className="mb-3" />}

        <div className="field mb-3">
          <label htmlFor="cloud-restore-master-password">Clave maestra</label>
          <Password
            id="cloud-restore-master-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            toggleMask
            feedback={false}
            autoFocus
            style={{ width: '100%' }}
            inputStyle={{ width: '100%' }}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div className="field mb-3">
          <label htmlFor="cloud-restore-master-confirm">Confirmar clave maestra</label>
          <Password
            id="cloud-restore-master-confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            toggleMask
            feedback={false}
            style={{ width: '100%' }}
            inputStyle={{ width: '100%' }}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div className="flex gap-2" style={{ marginTop: '0.5rem' }}>
          <Button
            label="Más tarde"
            icon="pi pi-times"
            className="p-button-text flex-1"
            onClick={handleClose}
            disabled={loading}
          />
          <Button
            label="Desbloquear backup"
            icon="pi pi-key"
            className="flex-1"
            onClick={handleSubmit}
            loading={loading}
            disabled={!password || !confirmPassword}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default CloudRestoreMasterKeyDialog;
