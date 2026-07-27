import React, { useState } from 'react';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';
import { Checkbox } from 'primereact/checkbox';
import AppDialog from './ui/AppDialog';
import { useTranslation } from '../i18n/hooks/useTranslation';

const UnlockDialog = ({ visible, onSuccess, secureStorage }) => {
  const { t } = useTranslation();
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
        setError(t('dialogs.unlock.errors.loadKey', 'Error al cargar la clave guardada'));
        setLoading(false);
        return;
      }

      if (password !== savedMasterKey) {
        setError(t('dialogs.unlock.errors.incorrect', 'Contraseña incorrecta'));
        setLoading(false);
        return;
      }

      await secureStorage.setRememberPassword(rememberPassword);
      onSuccess(savedMasterKey);
    } catch (err) {
      console.error('[UnlockDialog] Error:', err);
      setError(t('dialogs.unlock.errors.unlockFailed', 'Error al desbloquear la aplicación'));
      setLoading(false);
    }
  };

  return (
    <AppDialog
      headerIcon="pi pi-lock"
      headerTitle={t('dialogs.unlock.title', 'Desbloquear NodeTerm')}
      visible={visible}
      size="sm"
      modal
      closable={false}
      onHide={() => {}}
      cancelLabel={false}
      confirmLabel={t('dialogs.unlock.confirm', 'Desbloquear')}
      confirmIcon="pi pi-unlock"
      onConfirm={handleUnlock}
      loading={loading}
      confirmDisabled={!password}
    >
      <div className="p-fluid">
        {error ? <Message severity="error" text={error} className="mb-3" /> : null}

        <Message
          severity="info"
          text={t('dialogs.unlock.infoMessage', 'Introduce tu contraseña maestra para desbloquear la aplicación')}
          className="mb-3"
        />

        <div className="app-form-field">
          <label htmlFor="unlock-password" className="app-form-label">{t('dialogs.unlock.masterPassword', 'Contraseña Maestra')}</label>
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
            {t('dialogs.unlock.rememberOnDevice', 'Recordar contraseña en este dispositivo')}
          </label>
        </div>
      </div>
    </AppDialog>
  );
};

export default UnlockDialog;
