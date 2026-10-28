import React from 'react';
import appIcon from '../../../assets/app-icon.png';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

export default function VaultGateLayout(props) {
  const { t } = useTranslation();
  const { passwordId, previewMode } = props;

  return (
    <div
      className={`unlock-screen-overlay unlock-screen-overlay--vault-gate${previewMode ? ' unlock-screen-overlay--preview' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${passwordId}-title`}
    >
      <div className="unlock-screen-panel unlock-panel--vault-gate">
        <div className="unlock-brand unlock-brand--vault-gate">
          <img src={appIcon} alt="" className="unlock-brand-icon" />
          <div>
            <h2 id={`${passwordId}-title`} className="unlock-wordmark">
              NodeTerm
            </h2>
            <p className="unlock-subtitle">
              {t('dialogs.unlock.subtitleShort', 'Introduce tu contraseña maestra')}
            </p>
          </div>
        </div>
        <UnlockFormBlock {...props} variant="vault-gate" />
        {previewMode ? (
          <p className="unlock-screen-preview-hint">
            {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
