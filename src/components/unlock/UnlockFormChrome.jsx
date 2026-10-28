import React from 'react';
import { Password } from 'primereact/password';
import { Checkbox } from 'primereact/checkbox';
import { InputSwitch } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import { useTranslation } from '../../i18n/hooks/useTranslation';

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

  const showLeadingLock = variant !== 'classic';
  const hideLabel = [
    'glass-hud',
    'synthwave',
    'aurora',
    'matrix',
    'ember',
    'nord',
    'midnight'
  ].includes(variant);

  return (
    <div className={`unlock-field unlock-field--${variant}`}>
      {!hideLabel ? (
        <label htmlFor={passwordId} className="unlock-field-label">
          {t('dialogs.unlock.masterPassword', 'Contraseña Maestra')}
        </label>
      ) : null}
      <div className="unlock-field-shell">
        {showLeadingLock ? (
          <span className="unlock-field-leading" aria-hidden="true">
            {variant === 'glass-hud' ? (
              <i className="pi pi-chevron-left" />
            ) : (
              <i className="pi pi-lock" />
            )}
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
  const shortLabel = t('dialogs.unlock.rememberShort', 'Recordar');
  const id = `${passwordId}-remember`;

  if (variant === 'terminal' || variant === 'matrix') {
    return (
      <button
        type="button"
        className={`unlock-remember unlock-remember--terminal unlock-remember--${variant}${rememberPassword ? ' is-checked' : ''}`}
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

  if (variant === 'aurora') {
    return (
      <div className="unlock-remember unlock-remember--aurora">
        <InputSwitch
          inputId={id}
          checked={rememberPassword}
          disabled={!preferenceReady}
          onChange={(e) => onRememberChange?.({ checked: e.value })}
        />
        <label htmlFor={id}>{label}</label>
      </div>
    );
  }

  if (variant === 'glass-hud' || variant === 'synthwave') {
    return (
      <div className={`unlock-remember unlock-remember--${variant}`}>
        <Checkbox
          inputId={id}
          checked={rememberPassword}
          disabled={!preferenceReady}
          onChange={onRememberChange}
        />
        <label htmlFor={id}>{shortLabel}</label>
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
  const confirmLabel = t('dialogs.unlock.confirm', 'Desbloquear');
  const closeLabel = t('common.buttons.close', 'Cerrar');

  if (variant === 'terminal') {
    return (
      <div className="unlock-actions unlock-actions--terminal">
        <Button
          type="button"
          label={loading ? '…' : '↵  Enter to unlock'}
          className="unlock-cta unlock-cta--terminal"
          onClick={onConfirm}
          loading={loading}
          disabled={!canSubmit}
        />
        {previewMode ? (
          <Button
            type="button"
            label={closeLabel}
            className="p-button-text unlock-cta-secondary"
            onClick={onHide}
          />
        ) : null}
      </div>
    );
  }

  if (variant === 'premium-card') {
    return (
      <div className="unlock-actions unlock-actions--premium-card">
        {previewMode ? (
          <Button
            type="button"
            label={closeLabel}
            className="p-button-text"
            onClick={onHide}
          />
        ) : (
          <span />
        )}
        <Button
          type="button"
          label={confirmLabel}
          icon="pi pi-unlock"
          className="unlock-cta unlock-cta--premium-card"
          onClick={onConfirm}
          loading={loading}
          disabled={!canSubmit}
        />
      </div>
    );
  }

  return (
    <div className={`unlock-actions unlock-actions--${variant}`}>
      <Button
        type="button"
        label={confirmLabel}
        icon={variant === 'glass-hud' ? undefined : 'pi pi-unlock'}
        className={`unlock-cta unlock-cta--${variant}`}
        onClick={onConfirm}
        loading={loading}
        disabled={!canSubmit}
      />
      {previewMode ? (
        <Button
          type="button"
          label={closeLabel}
          className="p-button-text unlock-cta-secondary"
          onClick={onHide}
        />
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
