import React from 'react';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

export default function TerminalLayout(props) {
  const { t } = useTranslation();
  const { passwordId, previewMode } = props;

  return (
    <div
      className={`unlock-screen-overlay unlock-screen-overlay--terminal${previewMode ? ' unlock-screen-overlay--preview' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${passwordId}-title`}
    >
      <div className="unlock-screen-panel unlock-panel--terminal">
        <div className="unlock-terminal-chrome">
          <span id={`${passwordId}-title`} className="unlock-terminal-title">
            NodeTerm
          </span>
          <div className="unlock-terminal-dots" aria-hidden="true">
            <span /><span /><span />
          </div>
        </div>
        <div className="unlock-terminal-body">
          <pre className="unlock-terminal-log">
            {`nodeterm vault locked\ntype master password to unlock.`}
          </pre>
          <UnlockFormBlock {...props} variant="terminal" />
          {previewMode ? (
            <p className="unlock-screen-preview-hint">
              {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
