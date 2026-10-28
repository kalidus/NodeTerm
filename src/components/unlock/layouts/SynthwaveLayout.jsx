import React from 'react';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

export default function SynthwaveLayout(props) {
  const { t } = useTranslation();
  const { passwordId, previewMode } = props;

  return (
    <div
      className={`unlock-screen-overlay unlock-screen-overlay--synthwave${previewMode ? ' unlock-screen-overlay--preview' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${passwordId}-title`}
    >
      <div className="unlock-screen-panel unlock-panel--synthwave">
        <div className="unlock-synth-sun" aria-hidden="true" />
        <div className="unlock-brand unlock-brand--synthwave">
          <p className="unlock-synth-kicker">NIGHT DRIVE // VAULT</p>
          <h2 id={`${passwordId}-title`} className="unlock-wordmark unlock-wordmark--synth">
            NODETERM
          </h2>
          <p className="unlock-subtitle">
            {t('dialogs.unlock.subtitleShort', 'Introduce tu contraseña maestra')}
          </p>
        </div>
        <UnlockFormBlock {...props} variant="synthwave" />
        {previewMode ? (
          <p className="unlock-screen-preview-hint">
            {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
