import React, { useEffect, useState } from 'react';
import UnlockScreen from './unlock/UnlockScreen';
import { loadUnlockStyle } from './unlock/unlockStyles';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { appConfirm } from './ui/AppConfirm';
import appIcon from '../assets/app-icon.png';
import '../styles/components/unlock-screen.css';

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
  onHide,
  embedded = false,
  hint = ''
}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [preferenceReady, setPreferenceReady] = useState(previewMode);
  const [unlockStyle, setUnlockStyle] = useState(() => loadUnlockStyle());

  useEffect(() => {
    if (!visible) return undefined;

    setPassword('');
    setError('');
    setWiping(false);
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
    if (!preferenceReady || wiping) return;

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

  const handleStartFresh = async () => {
    if (previewMode || wiping || loading) return;

    const ok = await appConfirm({
      message: t(
        'dialogs.unlock.startFreshConfirm',
        'Se borrarán permanentemente la clave maestra y todos los datos cifrados locales (conexiones, contraseñas, notas y sesiones). No se pueden recuperar. ¿Continuar?'
      ),
      header: t('dialogs.unlock.startFresh', 'Empezar de cero'),
      severity: 'danger',
      acceptLabel: t('common.buttons.accept', 'Aceptar'),
      rejectLabel: t('common.buttons.cancel', 'Cancelar')
    });
    if (!ok) return;

    setWiping(true);
    setError('');
    try {
      // wipeAllVaultData dispara `vault-data-wiped` → useVaultSession pasa a setup
      await secureStorage.wipeAllVaultData();
    } catch (err) {
      console.error('[UnlockDialog] Wipe fallido:', err);
      setError(
        err?.message ||
        t('dialogs.unlock.errors.wipeFailed', 'No se pudieron borrar los datos del vault')
      );
    } finally {
      setWiping(false);
    }
  };

  if (embedded) {
    if (!visible) return null;
    const busy = loading || wiping;
    return (
      <div className="home-unlock-panel home-panel-drag-handle">
        <div className="mk-setup-card mk-setup-card--panel" role="region" aria-labelledby="mk-unlock-title">
          <div className="mk-setup-chip">
            <i className="pi pi-lock" aria-hidden="true" />
            <span>ENCRYPTED AES-256</span>
          </div>

          <div className="mk-setup-shield" aria-hidden="true">
            <span className="mk-setup-ring mk-setup-ring--1" />
            <span className="mk-setup-ring mk-setup-ring--2" />
            <span className="mk-setup-ring mk-setup-ring--3" />
            <div className="mk-setup-shield-core">
              <svg viewBox="0 0 64 72" className="mk-setup-shield-svg">
                <path
                  d="M32 3 7 12v20c0 17 10.5 30.5 25 37 14.5-6.5 25-20 25-37V12L32 3z"
                  className="mk-setup-shield-path"
                />
              </svg>
              <i className="pi pi-lock mk-setup-shield-icon" />
            </div>
          </div>

          <h2 id="mk-unlock-title" className="mk-setup-title">Desbloquear vault</h2>
          <p className="mk-setup-subtitle">
            {hint || 'Introduce tu clave maestra. Terminal y pestañas siguen disponibles.'}
          </p>

          <div className="mk-setup-form">
            <div className={`mk-setup-field${busy ? ' is-disabled' : ''}`}>
              <i className="pi pi-key mk-setup-field-icon" aria-hidden="true" />
              <input
                id="unlock-password-home"
                type={revealed ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Clave maestra"
                autoComplete="current-password"
                disabled={busy || !preferenceReady}
                aria-label="Clave maestra"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUnlock();
                  }
                }}
              />
              <button
                type="button"
                className="mk-setup-field-toggle"
                aria-label={revealed ? 'Ocultar clave' : 'Mostrar clave'}
                aria-pressed={revealed}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setRevealed((v) => !v)}
                disabled={busy}
              >
                <i className={revealed ? 'pi pi-eye-slash' : 'pi pi-eye'} aria-hidden="true" />
              </button>
            </div>

            {error ? (
              <div className="mk-setup-error" role="alert">
                <i className="pi pi-exclamation-triangle" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            <label className="mk-setup-check">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                disabled={busy || !preferenceReady}
              />
              <span className="mk-setup-check-box" aria-hidden="true" />
              <span>Recordar en este equipo (protegida por el sistema operativo)</span>
            </label>

            <button
              type="button"
              className="mk-setup-cta"
              onClick={handleUnlock}
              disabled={busy || !preferenceReady || !password}
            >
              {loading ? (
                <>
                  <i className="pi pi-spin pi-spinner" aria-hidden="true" />
                  <span>Desbloqueando…</span>
                </>
              ) : (
                <>
                  <span>Desbloquear</span>
                  <i className="pi pi-arrow-right" aria-hidden="true" />
                </>
              )}
            </button>

            <button
              type="button"
              className="unlock-cta-ghost unlock-start-fresh"
              onClick={handleStartFresh}
              disabled={busy}
            >
              {wiping ? '…' : 'Empezar de cero'}
            </button>
          </div>

          <div className="mk-setup-trust">
            <div className="mk-setup-trust-item">
              <i className="pi pi-desktop" aria-hidden="true" />
              <div>
                <strong>Local</strong>
                <span>Solo en tu dispositivo</span>
              </div>
            </div>
            <div className="mk-setup-trust-sep" aria-hidden="true" />
            <div className="mk-setup-trust-item">
              <i className="pi pi-eye-slash" aria-hidden="true" />
              <div>
                <strong>Zero-knowledge</strong>
                <span>Nunca enviamos tu clave</span>
              </div>
            </div>
          </div>

          <img src={appIcon} alt="" className="mk-setup-brand" aria-hidden="true" />
        </div>
      </div>
    );
  }

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
      wiping={wiping}
      onConfirm={handleUnlock}
      onHide={onHide}
      onStartFresh={previewMode ? undefined : handleStartFresh}
      previewMode={previewMode}
      passwordId={previewMode ? 'unlock-password-preview' : 'unlock-password'}
    />
  );
};

export default UnlockDialog;
