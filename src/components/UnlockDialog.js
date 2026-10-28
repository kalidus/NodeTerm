import React, { useEffect, useState } from 'react';
import UnlockScreen from './unlock/UnlockScreen';
import { loadUnlockStyle } from './unlock/unlockStyles';
import { useTranslation } from '../i18n/hooks/useTranslation';

/**
 * Desbloqueo del vault. La presentación la resuelve UnlockScreen según
 * `nodeterm_unlock_style` (Apariencia → Pantalla de desbloqueo).
 *
 * previewMode: muestra la UI sin validar vault (desde settings).
 */
const UnlockDialog = ({
  visible,
  onSuccess,
  secureStorage,
  previewMode = false,
  previewStyle = null,
  onHide
}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(true);
  const [preferenceReady, setPreferenceReady] = useState(previewMode);
  const [unlockStyle, setUnlockStyle] = useState(() => loadUnlockStyle());

  useEffect(() => {
    if (!visible) return undefined;

    setPassword('');
    setError('');
    setUnlockStyle(previewStyle || loadUnlockStyle());

    if (previewMode) {
      setPreferenceReady(true);
      setRememberPassword(true);
      return undefined;
    }

    let cancelled = false;
    setPreferenceReady(false);

    (async () => {
      let pref = null;
      try {
        if (window.electron?.security?.getRememberPassword) {
          pref = await window.electron.security.getRememberPassword();
        }
      } catch (_) {
        pref = null;
      }
      if (cancelled) return;
      setRememberPassword(pref !== false);
      setPreferenceReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, previewMode, previewStyle]);

  const handleUnlock = async () => {
    if (!preferenceReady) return;

    if (previewMode) {
      onSuccess?.(password);
      onHide?.();
      return;
    }

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
    <UnlockScreen
      visible={visible}
      style={unlockStyle}
      password={password}
      onPasswordChange={(e) => setPassword(e.target.value)}
      rememberPassword={rememberPassword}
      onRememberChange={(e) => setRememberPassword(e.checked)}
      preferenceReady={preferenceReady}
      error={error}
      loading={loading}
      onConfirm={handleUnlock}
      onHide={onHide}
      previewMode={previewMode}
      passwordId={previewMode ? 'unlock-password-preview' : 'unlock-password'}
    />
  );
};

export default UnlockDialog;
