import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from 'primereact/button';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import { normalizeSplashStyle } from './splashStyles';
import SplashLivePreview from './SplashLivePreview';

/**
 * Vista previa in-app del splash (mismo patrón UX que unlock preview).
 */
export default function SplashPreviewOverlay({ visible, styleId, onHide }) {
  const { t } = useTranslation('settings');
  const id = normalizeSplashStyle(styleId);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onHide?.();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [visible, onHide]);

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="splash-preview-overlay unlock-screen-overlay unlock-screen-overlay--preview"
      role="dialog"
      aria-modal="true"
      aria-label={t('splashScreen.previewTitle', 'Previsualizar en Vivo')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onHide?.();
      }}
    >
      <div className="splash-preview-frame">
        <SplashLivePreview styleId={id} />
        <p className="splash-preview-hint">
          {t(
            'splashScreen.previewHint',
            'Vista previa — Escape o Cerrar para salir'
          )}
        </p>
        <Button
          type="button"
          label={t('splashScreen.closePreview', 'Cerrar')}
          icon="pi pi-times"
          className="p-button-sm p-button-outlined splash-preview-close"
          onClick={onHide}
        />
      </div>
    </div>,
    document.body
  );
}
