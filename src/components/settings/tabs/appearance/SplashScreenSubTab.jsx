import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { useTranslation } from '../../../../i18n/hooks/useTranslation';
import SplashStyleThumb from '../../../splash/SplashStyleThumb';
import SplashPreviewOverlay from '../../../splash/SplashPreviewOverlay';
import {
  SPLASH_STYLE_META,
  normalizeSplashStyle
} from '../../../splash/splashStyles';

export const SplashScreenSubTab = ({ toastRef }) => {
  const { t } = useTranslation('settings');
  const [splashStyle, setSplashStyle] = useState('classic');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStyleId, setPreviewStyleId] = useState('classic');

  useEffect(() => {
    if (window.electron?.theme?.getSplashStyle) {
      window.electron.theme
        .getSplashStyle()
        .then((style) => {
          if (style) {
            const id = normalizeSplashStyle(style);
            setSplashStyle(id);
            setPreviewStyleId(id);
          }
        })
        .catch((err) => console.warn('Error al cargar splash style:', err));
    }
  }, []);

  const handleSplashStyleChange = async (style) => {
    const id = normalizeSplashStyle(style);
    setSplashStyle(id);
    if (window.electron?.theme?.saveSplashStyle) {
      const res = await window.electron.theme.saveSplashStyle(id);
      if (res?.success && toastRef?.current) {
        toastRef.current.show({
          severity: 'success',
          summary: t('splashScreen.savedTitle', 'Guardado'),
          detail: t(
            'splashScreen.savedDetail',
            'El estilo de la pantalla de inicio se ha actualizado y se aplicará en el próximo arranque.'
          ),
          life: 3000
        });
      }
    }
  };

  const openPreview = (styleId, e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    setPreviewStyleId(normalizeSplashStyle(styleId));
    setPreviewOpen(true);
  };

  return (
    <div className="style-picker-scroll-shell">
      <div className="style-picker-scroll-body general-settings-container">
        <div className="general-settings-header-wrapper" style={{ flexShrink: 0 }}>
          <div className="general-header-content">
            <span
              className="general-header-icon protocol-dialog-header-icon"
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                boxShadow: '0 2px 8px rgba(240, 147, 251, 0.25)'
              }}
            >
              <i className="pi pi-bolt" />
            </span>
            <div className="general-header-text">
              <h3 className="general-header">
                {t('splashScreen.title', 'Pantalla de Inicio (Splash Screen)')}
              </h3>
              <p className="general-description">
                {t(
                  'splashScreen.description',
                  'Personaliza el diseño y estilo visual de la pantalla de arranque de NodeTerm'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="general-settings-section style-picker-section">
          <div className="general-section-header">
            <div
              className="general-section-icon"
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              }}
            >
              <i className="pi pi-eye" />
            </div>
            <h4 className="general-section-title">
              {t('splashScreen.selectionTitle', 'Selección de Estilo')}
            </h4>
          </div>

          <div className="style-picker-grid">
            {SPLASH_STYLE_META.map((opt) => {
              const isSelected = splashStyle === opt.id;
              const name = t(opt.nameKey, opt.name);
              const desc = t(opt.descKey, opt.desc);
              return (
                <div
                  key={opt.id}
                  className={`style-picker-card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => handleSplashStyleChange(opt.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSplashStyleChange(opt.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{
                    '--style-accent': opt.accentColor,
                    borderColor: isSelected ? opt.accentColor : undefined,
                    boxShadow: isSelected ? `0 0 18px ${opt.accentColor}33` : undefined
                  }}
                >
                  <div className="style-picker-thumb-wrap">
                    <SplashStyleThumb styleId={opt.id} alt={name} />
                    <div className="style-picker-thumb-fade">
                      <span
                        className="style-picker-card-title"
                        style={{ color: isSelected ? opt.accentColor : '#fff' }}
                      >
                        {name}
                      </span>
                      {isSelected ? (
                        <i className="pi pi-check-circle" style={{ color: opt.accentColor }} />
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      label={t('splashScreen.cardPreviewButton', 'Preview')}
                      icon="pi pi-eye"
                      className="p-button-sm p-button-outlined unlock-style-preview-btn"
                      onClick={(e) => openPreview(opt.id, e)}
                      aria-label={`${t('splashScreen.cardPreviewButton', 'Preview')}: ${name}`}
                    />
                  </div>
                  <p className="style-picker-card-desc">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SplashPreviewOverlay
        visible={previewOpen}
        styleId={previewStyleId}
        onHide={() => setPreviewOpen(false)}
      />
    </div>
  );
};

export default SplashScreenSubTab;
