import React from 'react';
import { Password } from 'primereact/password';
import { Checkbox } from 'primereact/checkbox';
import { InputSwitch } from 'primereact/inputswitch';
import { useTranslation } from '../../i18n/hooks/useTranslation';

const CTA_COPY = {
  classic: { key: 'dialogs.unlock.confirm', fallback: 'Desbloquear' },
  'vault-gate': { key: 'dialogs.unlock.confirm', fallback: 'Desbloquear' },
  terminal: { fallback: 'Enter to unlock' },
  'premium-card': { key: 'dialogs.unlock.confirm', fallback: 'Desbloquear' },
  'glass-hud': { key: 'dialogs.unlock.confirm', fallback: 'Desbloquear' },
  synthwave: { fallback: 'DESBLOQUEAR' },
  aurora: { key: 'dialogs.unlock.confirm', fallback: 'Desbloquear' },
  matrix: { fallback: 'UNLOCK' },
  ember: { fallback: 'Desbloquear  ›' },
  nord: { key: 'dialogs.unlock.confirm', fallback: 'Desbloquear' },
  midnight: { fallback: 'DESBLOQUEAR' }
};

/**
 * Chrome de formulario temático para pantallas de unlock.
 * variant = styleId (classic | vault-gate | terminal | …)
 */
export function UnlockError({ variant, error }) {
  if (!error) return null;
  return (
    <div className={`unlock-error unlock-error--${variant}`} role="alert">
      {error}
    </div>
  );
}

export function UnlockPasswordField({
  variant,
  passwordId,
  password,
  onPasswordChange,
  preferenceReady,
  onSubmit,
  placeholder
}) {
  const { t } = useTranslation();
  const canSubmit = !!password && preferenceReady;
  const ph =
    placeholder ||
    t('dialogs.unlock.masterPassword', 'Contraseña Maestra');

  if (variant === 'terminal') {
    return (
      <div className="unlock-field unlock-field--terminal">
        <div className="unlock-terminal-prompt-row">
          <span className="unlock-terminal-prompt" aria-hidden="true">
            unlock&gt;_
          </span>
          <div className="unlock-terminal-input-wrap">
            <Password
              id={passwordId}
              value={password}
              onChange={onPasswordChange}
              feedback={false}
              toggleMask
              autoFocus
              placeholder=""
              inputClassName="unlock-terminal-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) onSubmit?.();
              }}
            />
            {!password ? <span className="unlock-terminal-caret" aria-hidden="true" /> : null}
          </div>
        </div>
      </div>
    );
  }

  const showLeadingLock = !['classic', 'matrix', 'glass-hud'].includes(variant);
  const hideLabel = [
    'glass-hud',
    'synthwave',
    'aurora',
    'ember',
    'nord',
    'midnight'
  ].includes(variant);
  const fieldLabel = variant === 'matrix'
    ? 'PASSWORD:'
    : t('dialogs.unlock.masterPassword', 'Contraseña Maestra');

  return (
    <div className={`unlock-field unlock-field--${variant}`}>
      {!hideLabel ? (
        <label htmlFor={passwordId} className="unlock-field-label">
          {fieldLabel}
        </label>
      ) : null}
      <div className="unlock-field-shell">
        {showLeadingLock ? (
          <span className="unlock-field-leading" aria-hidden="true">
            <i className="pi pi-lock" />
          </span>
        ) : null}
        <Password
          id={passwordId}
          value={password}
          onChange={onPasswordChange}
          feedback={false}
          toggleMask
          autoFocus
          placeholder={
            ['glass-hud', 'aurora', 'matrix', 'ember', 'nord', 'midnight'].includes(variant)
              ? ph
              : undefined
          }
          inputClassName="unlock-field-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) onSubmit?.();
          }}
        />
      </div>
    </div>
  );
}

export function UnlockRemember({
  variant,
  passwordId,
  rememberPassword,
  onRememberChange,
  preferenceReady
}) {
  const { t } = useTranslation();
  const label = t(
    'dialogs.unlock.rememberOnDevice',
    'Recordar contraseña en este dispositivo'
  );
  const id = `${passwordId}-remember`;

  if (variant === 'terminal') {
    return (
      <button
        type="button"
        className={`unlock-remember unlock-remember--terminal${rememberPassword ? ' is-checked' : ''}`}
        onClick={() => preferenceReady && onRememberChange?.({ checked: !rememberPassword })}
        disabled={!preferenceReady}
        aria-pressed={rememberPassword}
      >
        <span className="unlock-remember-bracket" aria-hidden="true">
          [{rememberPassword ? 'x' : ' '}]
        </span>
        <span>remember on this device</span>
      </button>
    );
  }

  if (variant === 'matrix') {
    return (
      <button
        type="button"
        className={`unlock-remember unlock-remember--matrix${rememberPassword ? ' is-checked' : ''}`}
        onClick={() => preferenceReady && onRememberChange?.({ checked: !rememberPassword })}
        disabled={!preferenceReady}
        aria-pressed={rememberPassword}
      >
        <span>REMEMBER AS:</span>
        <span className="unlock-matrix-box" aria-hidden="true">{rememberPassword ? '×' : ''}</span>
      </button>
    );
  }

  if (variant === 'aurora') {
    return (
      <div className="unlock-remember unlock-remember--aurora">
        <label htmlFor={id}>Recordar</label>
        <InputSwitch
          inputId={id}
          checked={rememberPassword}
          disabled={!preferenceReady}
          onChange={(e) => onRememberChange?.({ checked: e.value })}
        />
      </div>
    );
  }

  if (variant === 'glass-hud') {
    return (
      <div className="unlock-remember unlock-remember--glass-hud">
        <Checkbox
          inputId={id}
          checked={rememberPassword}
          disabled={!preferenceReady}
          onChange={onRememberChange}
        />
        <label htmlFor={id}>Remember</label>
      </div>
    );
  }

  if (variant === 'synthwave') {
    return (
      <div className="unlock-remember unlock-remember--synthwave">
        <Checkbox
          inputId={id}
          checked={rememberPassword}
          disabled={!preferenceReady}
          onChange={onRememberChange}
        />
        <label htmlFor={id}>REMEMBER</label>
      </div>
    );
  }

  if (variant === 'nord') {
    return (
      <div className="unlock-remember unlock-remember--nord">
        <Checkbox
          inputId={id}
          checked={rememberPassword}
          disabled={!preferenceReady}
          onChange={onRememberChange}
        />
        <label htmlFor={id}>Remember me</label>
      </div>
    );
  }

  if (variant === 'midnight') {
    return (
      <div className="unlock-remember unlock-remember--midnight">
        <Checkbox
          inputId={id}
          checked={rememberPassword}
          disabled={!preferenceReady}
          onChange={onRememberChange}
        />
        <label htmlFor={id}>Remember this device</label>
      </div>
    );
  }

  return (
    <div className={`unlock-remember unlock-remember--${variant}`}>
      <Checkbox
        inputId={id}
        checked={rememberPassword}
        disabled={!preferenceReady}
        onChange={onRememberChange}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function UnlockActions({
  variant,
  loading,
  canSubmit,
  onConfirm,
  previewMode,
  onHide
}) {
  const { t } = useTranslation();
  const spec = CTA_COPY[variant] || CTA_COPY.classic;
  const confirmLabel = spec.key ? t(spec.key, spec.fallback) : spec.fallback;
  const closeLabel = t('common.buttons.close', 'Cerrar');

  return (
    <div className={`unlock-actions unlock-actions--${variant}`}>
      {variant === 'premium-card' && previewMode ? (
        <button type="button" className="unlock-cta-ghost" onClick={onHide}>
          {closeLabel}
        </button>
      ) : null}
      {variant === 'premium-card' && !previewMode ? <span /> : null}
      <button
        type="button"
        className={`unlock-cta unlock-cta--${variant}`}
        onClick={onConfirm}
        disabled={!canSubmit || loading}
      >
        {loading ? '…' : confirmLabel}
      </button>
      {previewMode && variant !== 'premium-card' ? (
        <button type="button" className="unlock-cta-ghost" onClick={onHide}>
          {closeLabel}
        </button>
      ) : null}
    </div>
  );
}

export function UnlockFormBlock(props) {
  const {
    variant,
    passwordId,
    password,
    onPasswordChange,
    rememberPassword,
    onRememberChange,
    preferenceReady,
    onConfirm,
    error,
    loading,
    previewMode,
    onHide
  } = props;

  const canSubmit = !!password && preferenceReady && !loading;

  return (
    <div className={`unlock-form unlock-form--${variant}`}>
      <UnlockError variant={variant} error={error} />
      <UnlockPasswordField
        variant={variant}
        passwordId={passwordId}
        password={password}
        onPasswordChange={onPasswordChange}
        preferenceReady={preferenceReady}
        onSubmit={onConfirm}
      />
      <UnlockRemember
        variant={variant}
        passwordId={passwordId}
        rememberPassword={rememberPassword}
        onRememberChange={onRememberChange}
        preferenceReady={preferenceReady}
      />
      <UnlockActions
        variant={variant}
        loading={loading}
        canSubmit={canSubmit}
        onConfirm={onConfirm}
        previewMode={previewMode}
        onHide={onHide}
      />
    </div>
  );
}

export default UnlockFormBlock;
