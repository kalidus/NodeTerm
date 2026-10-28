import React from 'react';
import appIcon from '../../../assets/app-icon.png';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

export default function AuroraLayout(props) {
  const { t } = useTranslation();
  const { passwordId, previewMode } = props;

  return (
    <div
      className={`unlock-screen-overlay unlock-screen-overlay--aurora${previewMode ? ' unlock-screen-overlay--preview' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${passwordId}-title`}
    >
      <div className="unlock-screen-panel unlock-panel--aurora">
        <div className="unlock-brand unlock-brand--aurora">
          <img src={appIcon} alt="" className="unlock-brand-icon unlock-brand-icon--soft" />
          <h2 id={`${passwordId}-title`} className="unlock-wordmark unlock-wordmark--aurora">
            NodeTerm
          </h2>
          <p className="unlock-subtitle">
            {t('dialogs.unlock.subtitleShort', 'Introduce tu contraseña maestra')}
          </p>
        </div>
        <UnlockFormBlock {...props} variant="aurora" />
        {previewMode ? (
          <p className="unlock-screen-preview-hint">
            {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
