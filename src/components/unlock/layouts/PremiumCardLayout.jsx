import React from 'react';
import AppDialog from '../../ui/AppDialog';
import appIcon from '../../../assets/app-icon.png';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

export default function PremiumCardLayout(props) {
  const { t } = useTranslation();
  const { visible, previewMode, onHide, passwordId } = props;

  return (
    <AppDialog
      header={
        <div className="unlock-premium-header">
          <img src={appIcon} alt="" />
          <div className="unlock-premium-header-text">
            <span className="unlock-premium-title">
              {t('dialogs.unlock.title', 'Desbloquear NodeTerm')}
            </span>
            <span className="unlock-premium-sub">
              {t('dialogs.unlock.subtitleShort', 'Introduce tu contraseña maestra')}
            </span>
          </div>
        </div>
      }
      visible={visible}
      size="md"
      modal
      closable={previewMode}
      onHide={previewMode ? onHide : () => {}}
      footer={null}
      className="unlock-dialog unlock-dialog--premium-card"
      dismissableMask={!!previewMode}
    >
      <UnlockFormBlock {...props} variant="premium-card" passwordId={passwordId} />
      {previewMode ? (
        <p className="unlock-screen-preview-hint">
          {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
        </p>
      ) : null}
    </AppDialog>
  );
}
