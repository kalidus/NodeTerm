import React from 'react';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

export default function GlassHudLayout(props) {
  const { t } = useTranslation();
  const { passwordId, previewMode, ...formProps } = props;

  return (
    <div
      className={`unlock-screen-overlay unlock-screen-overlay--glass-hud${previewMode ? ' unlock-screen-overlay--preview' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${passwordId}-title`}
    >
      <div className="unlock-screen-panel unlock-panel--glass-hud">
        <div className="unlock-hud-chrome" aria-hidden="true">
          <span />
          <div className="unlock-terminal-dots">
            <span /><span /><span />
          </div>
        </div>
        <div className="unlock-hud-chip-block" aria-hidden="true">
          <span className="unlock-hud-chip">SECURE</span>
          <i className="pi pi-lock" />
        </div>
        <h2 id={`${passwordId}-title`} className="unlock-wordmark unlock-wordmark--glass">
          NodeTerm Vault
        </h2>
        <UnlockFormBlock {...formProps} passwordId={passwordId} previewMode={previewMode} variant="glass-hud" />
        {previewMode ? (
          <p className="unlock-screen-preview-hint">
            {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
