import React from 'react';
import appIcon from '../../../assets/app-icon.png';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

/**
 * Layout fullscreen reutilizable para temas con card + brand.
 * theme: matrix | ember | nord | midnight | …
 */
export default function ThemedFullscreenLayout({
  theme,
  title = 'NodeTerm',
  kicker = null,
  showIcon = true,
  showLock = false,
  props
}) {
  const { t } = useTranslation();
  const {
    passwordId,
    previewMode,
    ...formProps
  } = props;

  return (
    <div
      className={`unlock-screen-overlay unlock-screen-overlay--${theme}${previewMode ? ' unlock-screen-overlay--preview' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${passwordId}-title`}
    >
      <div className={`unlock-screen-panel unlock-panel--${theme}`}>
        <div className={`unlock-brand unlock-brand--${theme}`}>
          {showLock ? (
            <div className="unlock-brand-lock" aria-hidden="true">
              <i className="pi pi-lock" />
            </div>
          ) : null}
          {showIcon && !showLock ? (
            <img src={appIcon} alt="" className="unlock-brand-icon" />
          ) : null}
          {kicker ? <p className="unlock-synth-kicker">{kicker}</p> : null}
          <h2 id={`${passwordId}-title`} className={`unlock-wordmark unlock-wordmark--${theme}`}>
            {title}
          </h2>
          <p className="unlock-subtitle">
            {t('dialogs.unlock.subtitleShort', 'Introduce tu contraseña maestra')}
          </p>
        </div>
        <UnlockFormBlock {...formProps} passwordId={passwordId} previewMode={previewMode} variant={theme} />
        {previewMode ? (
          <p className="unlock-screen-preview-hint">
            {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function MatrixLayout(props) {
  return (
    <ThemedFullscreenLayout
      theme="matrix"
      title="NODETERM"
      kicker="ACCESS // VAULT"
      showIcon={false}
      showLock={false}
      props={props}
    />
  );
}

export function EmberLayout(props) {
  return (
    <ThemedFullscreenLayout
      theme="ember"
      title="NodeTerm"
      showIcon={false}
      showLock
      props={props}
    />
  );
}

export function NordLayout(props) {
  return (
    <ThemedFullscreenLayout
      theme="nord"
      title="NodeTerm"
      showIcon
      props={props}
    />
  );
}

export function MidnightLayout(props) {
  return (
    <ThemedFullscreenLayout
      theme="midnight"
      title="NodeTerm"
      showIcon={false}
      showLock
      props={props}
    />
  );
}
