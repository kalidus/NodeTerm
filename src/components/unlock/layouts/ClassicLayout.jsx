import React from 'react';
import AppDialog from '../../ui/AppDialog';
import { UnlockFormBlock } from '../UnlockFormChrome';
import { useTranslation } from '../../../i18n/hooks/useTranslation';

export default function ClassicLayout(props) {
  const { t } = useTranslation();
  const {
    visible,
    previewMode,
    onHide,
    passwordId
  } = props;

  return (
    <AppDialog
      headerIcon="pi pi-lock"
      headerTitle={t('dialogs.unlock.title', 'Desbloquear NodeTerm')}
      headerSubtitle={t(
        'dialogs.unlock.subtitleShort',
        'Introduce tu contraseña maestra'
      )}
      visible={visible}
      size="sm"
      modal
      closable={previewMode}
      onHide={previewMode ? onHide : () => {}}
      footer={null}
      className="unlock-dialog unlock-dialog--classic"
      dismissableMask={!!previewMode}
    >
      <UnlockFormBlock {...props} variant="classic" passwordId={passwordId} />
      {previewMode ? (
        <p className="unlock-screen-preview-hint">
          {t('settings.unlockScreen.previewHint', 'Vista previa — Escape o Cerrar para salir')}
        </p>
      ) : null}
    </AppDialog>
  );
}
