import React from 'react';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

export default function AuroraLayout(props) {
  const { t } = useTranslation();
  const { passwordId, previewMode, ...formProps } = props;

  return (
    <div
      className={`unlock-screen-overlay unlock-screen-overlay--aurora${previewMode ? ' unlock-screen-overlay--preview' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${passwordId}-title`}
    >
      <div className="unlock-screen-panel unlock-panel--aurora">
        <header className="unlock-brand unlock-brand--aurora">
          <div className="unlock-aurora-mark" aria-hidden="true">&gt;_</div>
          <h2 id={`${passwordId}-title`} className="unlock-wordmark unlock-wordmark--aurora">
            NodeTerm Aurora
          </h2>
          <p className="unlock-aurora-tag">
            {t('dialogs.unlock.subtitleShort', 'Introduce tu contraseña maestra')}
          </p>
        </header>
        <UnlockFormBlock {...formProps} passwordId={passwordId} previewMode={previewMode} variant="aurora" />
        {previewMode ? (
          <p className="unlock-screen-preview-hint">
            {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
