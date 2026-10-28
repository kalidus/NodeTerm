import React from 'react';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

function Shell({ theme, passwordId, previewMode, titleId, children, formProps }) {
  const { t } = useTranslation();
  return (
    <div
      className={`unlock-screen-overlay unlock-screen-overlay--${theme}${previewMode ? ' unlock-screen-overlay--preview' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className={`unlock-screen-panel unlock-panel--${theme}`}>
        {children}
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
  const { passwordId, previewMode, ...formProps } = props;
  return (
    <Shell theme="matrix" passwordId={passwordId} previewMode={previewMode} titleId={`${passwordId}-title`} formProps={formProps}>
      <div className="unlock-matrix-rain" aria-hidden="true" />
      <header className="unlock-matrix-head">
        <h2 id={`${passwordId}-title`} className="unlock-wordmark unlock-wordmark--matrix">NODETERM</h2>
        <div className="unlock-matrix-rule" aria-hidden="true" />
        <p className="unlock-matrix-denied">///// ACCESS DENIED /////</p>
      </header>
    </Shell>
  );
}

export function EmberLayout(props) {
  const { passwordId, previewMode, ...formProps } = props;
  return (
    <Shell theme="ember" passwordId={passwordId} previewMode={previewMode} titleId={`${passwordId}-title`} formProps={formProps}>
      <div className="unlock-ember-lock" aria-hidden="true"><i className="pi pi-lock" /></div>
      <header className="unlock-brand unlock-brand--ember">
        <h2 id={`${passwordId}-title`} className="unlock-wordmark unlock-wordmark--ember">NodeTerm</h2>
        <p className="unlock-ember-tag">Ember</p>
        <p className="unlock-subtitle">Ingresa tu contraseña para desbloquear</p>
      </header>
    </Shell>
  );
}

export function NordLayout(props) {
  const { t } = useTranslation();
  const { passwordId, previewMode, ...formProps } = props;
  return (
    <Shell theme="nord" passwordId={passwordId} previewMode={previewMode} titleId={`${passwordId}-title`} formProps={formProps}>
      <div className="unlock-nord-peaks" aria-hidden="true" />
      <header className="unlock-brand unlock-brand--nord">
        <div className="unlock-nord-mark" aria-hidden="true">❄</div>
        <div>
          <h2 id={`${passwordId}-title`} className="unlock-wordmark unlock-wordmark--nord">NodeTerm Nord</h2>
          <p className="unlock-nord-tag">Secure Nordic Connectivity</p>
        </div>
      </header>
      <p className="unlock-screen-sr-only">{t('dialogs.unlock.subtitleShort', 'Introduce tu contraseña maestra')}</p>
    </Shell>
  );
}

export function MidnightLayout(props) {
  const { passwordId, previewMode, ...formProps } = props;
  return (
    <Shell theme="midnight" passwordId={passwordId} previewMode={previewMode} titleId={`${passwordId}-title`} formProps={formProps}>
      <header className="unlock-brand unlock-brand--midnight">
        <div className="unlock-midnight-lock" aria-hidden="true"><i className="pi pi-lock" /></div>
        <h2 id={`${passwordId}-title`} className="unlock-wordmark unlock-wordmark--midnight">NodeTerm</h2>
        <p className="unlock-midnight-tag"><span />Midnight<span /></p>
      </header>
    </Shell>
  );
}
