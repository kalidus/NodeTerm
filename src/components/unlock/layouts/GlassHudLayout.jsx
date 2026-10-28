import React from 'react';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

export default function GlassHudLayout(props) {
  const { t } = useTranslation();
  const { passwordId, previewMode } = props;

  return (
    <div
      className={`unlock-screen-overlay unlock-screen-overlay--glass-hud${previewMode ? ' unlock-screen-overlay--preview' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${passwordId}-title`}
    >
      <div className="unlock-screen-panel unlock-panel--glass-hud">
        <div className="unlock-hud-chrome" aria-hidden="true">
          <span className="unlock-hud-chip">SECURE</span>
          <div className="unlock-terminal-dots">
            <span /><span /><span />
          </div>
        </div>
        <div className="unlock-brand unlock-brand--glass-hud">
          <div className="unlock-brand-lock" aria-hidden="true">
            <i className="pi pi-lock" />
          </div>
          <h2 id={`${passwordId}-title`} className="unlock-wordmark">
            NodeTerm Vault
          </h2>
          <p className="unlock-subtitle">
            {t('dialogs.unlock.subtitleShort', 'Introduce tu contraseña maestra')}
          </p>
        </div>
        <UnlockFormBlock {...props} variant="glass-hud" />
        {previewMode ? (
          <p className="unlock-screen-preview-hint">
            {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
