import React from 'react';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

export default function SynthwaveLayout(props) {
  const { t } = useTranslation();
  const { passwordId, previewMode, ...formProps } = props;

  return (
    <div
      className={`unlock-screen-overlay unlock-screen-overlay--synthwave${previewMode ? ' unlock-screen-overlay--preview' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${passwordId}-title`}
    >
      <div className="unlock-synth-sky" aria-hidden="true">
        <div className="unlock-synth-sun" />
      </div>
      <div className="unlock-screen-panel unlock-panel--synthwave">
        <header className="unlock-brand unlock-brand--synthwave">
          <p className="unlock-synth-kicker">· NIGHT DRIVE ·</p>
          <h2 id={`${passwordId}-title`} className="unlock-wordmark unlock-wordmark--synth">
            NODETERM
          </h2>
        </header>
        <UnlockFormBlock {...formProps} passwordId={passwordId} previewMode={previewMode} variant="synthwave" />
        {previewMode ? (
          <p className="unlock-screen-preview-hint">
            {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
