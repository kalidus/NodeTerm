import React, { useState } from 'react';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';
import AppDialog from './ui/AppDialog';

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
        verified.push('contrasenas');
      } catch {
        throw new Error('La clave no descifra el vault de contrasenas del backup.');
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
      setError('Las contrasenas no coinciden.');
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
    hasPasswordsVault && 'contrasenas del gestor'
  ].filter(Boolean);

  return (
    <AppDialog
      headerIcon="pi pi-key"
      headerTitle="Clave maestra del backup en la nube"
      visible={visible}
      size="md"
      modal
      closable
      onHide={handleClose}
      cancelLabel="Mas tarde"
      confirmLabel="Desbloquear backup"
      confirmIcon="pi pi-key"
      onConfirm={handleSubmit}
      loading={loading}
      confirmDisabled={!password || !confirmPassword}
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

        {error ? <Message severity="error" text={error} className="mb-3" /> : null}

        <div className="app-form-field">
          <label htmlFor="cloud-restore-master-password" className="app-form-label">Clave maestra</label>
          <Password
            id="cloud-restore-master-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            toggleMask
            feedback={false}
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div className="app-form-field">
          <label htmlFor="cloud-restore-master-confirm" className="app-form-label">Confirmar clave maestra</label>
          <Password
            id="cloud-restore-master-confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            toggleMask
            feedback={false}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
      </div>
    </AppDialog>
  );
};

export default CloudRestoreMasterKeyDialog;
