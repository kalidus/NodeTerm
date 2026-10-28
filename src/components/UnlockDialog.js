import React, { useEffect, useState } from 'react';
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
  // Por defecto TRUE si no hay elección previa: desbloquear = recordar en este dispositivo.
  // Un false explícito en security.json deja la casilla desmarcada.
  const [rememberPassword, setRememberPassword] = useState(true);
  const [preferenceReady, setPreferenceReady] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;

    let cancelled = false;
    setPreferenceReady(false);

    (async () => {
      let pref = null;
      try {
        if (window.electron?.security?.getRememberPassword) {
          pref = await window.electron.security.getRememberPassword();
        }
      } catch (e) {
        pref = null;
      }
      if (cancelled) return;
      setRememberPassword(pref !== false);
      setPreferenceReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleUnlock = async () => {
    if (!preferenceReady) return;
    setLoading(true);
    setError('');

    try {
      const isValid = await secureStorage.verifyMasterPassword(password);

      if (!isValid) {
        setError(t('dialogs.unlock.errors.incorrect', 'Contraseña incorrecta'));
        setLoading(false);
        return;
      }

      try {
        if (rememberPassword) {
          await secureStorage.saveMasterKey(password, true);
          await secureStorage.setRememberPassword(true);
        } else {
          await secureStorage.setRememberPassword(false);
        }
      } catch (persistErr) {
        console.error('[UnlockDialog] Error persistiendo clave:', persistErr);
        setError(
          persistErr?.message ||
          t(
            'dialogs.unlock.errors.persistFailed',
            'No se pudo guardar la clave en el dispositivo'
          )
        );
        setLoading(false);
        return;
      }

      onSuccess(password);
    } catch (err) {
      console.error('[UnlockDialog] Error:', err);
      setError(t('dialogs.unlock.errors.unlockFailed', 'Error al desbloquear la aplicación'));
    } finally {
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
      confirmDisabled={!password || !preferenceReady}
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
            onKeyPress={(e) => e.key === 'Enter' && password && preferenceReady && handleUnlock()}
          />
        </div>

        <div className="field-checkbox app-form-field">
          <Checkbox
            inputId="remember-password"
            checked={rememberPassword}
            disabled={!preferenceReady}
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
