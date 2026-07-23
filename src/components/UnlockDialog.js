import React, { useState } from 'react';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';
import { Checkbox } from 'primereact/checkbox';
import AppDialog from './ui/AppDialog';

const UnlockDialog = ({ visible, onSuccess, secureStorage }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);
    setError('');

    try {
      const savedMasterKey = await secureStorage.loadMasterKey();

      if (!savedMasterKey) {
        setError('Error al cargar la clave guardada');
        setLoading(false);
        return;
      }

      if (password !== savedMasterKey) {
        setError('Contrasena incorrecta');
        setLoading(false);
        return;
      }

      await secureStorage.setRememberPassword(rememberPassword);
      onSuccess(savedMasterKey);
    } catch (err) {
      console.error('[UnlockDialog] Error:', err);
      setError('Error al desbloquear la aplicacion');
      setLoading(false);
    }
  };

  return (
    <AppDialog
      headerIcon="pi pi-lock"
      headerTitle="Desbloquear NodeTerm"
      visible={visible}
      size="sm"
      modal
      closable={false}
      onHide={() => {}}
      cancelLabel={false}
      confirmLabel="Desbloquear"
      confirmIcon="pi pi-unlock"
      onConfirm={handleUnlock}
      loading={loading}
      confirmDisabled={!password}
    >
      <div className="p-fluid">
        {error ? <Message severity="error" text={error} className="mb-3" /> : null}

        <Message
          severity="info"
          text="Introduce tu contrasena maestra para desbloquear la aplicacion"
          className="mb-3"
        />

        <div className="app-form-field">
          <label htmlFor="unlock-password" className="app-form-label">Contrasena Maestra</label>
          <Password
            id="unlock-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            toggleMask
            feedback={false}
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && password && handleUnlock()}
          />
        </div>

        <div className="field-checkbox app-form-field">
          <Checkbox
            inputId="remember-password"
            checked={rememberPassword}
            onChange={(e) => setRememberPassword(e.checked)}
          />
          <label htmlFor="remember-password" className="ml-2">
            Recordar contrasena en este dispositivo
          </label>
        </div>
      </div>
    </AppDialog>
  );
};

export default UnlockDialog;
