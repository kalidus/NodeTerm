import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { useTranslation } from '../../../../i18n/hooks/useTranslation';
import UnlockDialog from '../../../UnlockDialog';
import UnlockStyleThumb from '../../../unlock/UnlockStyleThumb';
import {
  UNLOCK_STYLE_META,
  loadUnlockStyle,
  saveUnlockStyle
} from '../../../unlock/unlockStyles';

export const UnlockScreenSubTab = ({ toastRef }) => {
  const { t } = useTranslation('settings');
  const [unlockStyle, setUnlockStyle] = useState(() => loadUnlockStyle());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStyleId, setPreviewStyleId] = useState(() => loadUnlockStyle());

  useEffect(() => {
    setUnlockStyle(loadUnlockStyle());
  }, []);

  const handleStyleChange = (style) => {
    const saved = saveUnlockStyle(style);
    setUnlockStyle(saved);
    if (toastRef?.current) {
      toastRef.current.show({
        severity: 'success',
        summary: t('unlockScreen.savedTitle', 'Guardado'),
        detail: t(
          'unlockScreen.savedDetail',
          'El estilo de desbloqueo se aplicará la próxima vez que se pida la contraseña.'
        ),
        life: 3000
      });
    }
  };

  const openPreview = (styleId, e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    setPreviewStyleId(styleId);
    setPreviewOpen(true);
  };

  const closePreview = () => setPreviewOpen(false);

  return (
    <div className="style-picker-scroll-shell">
      <div className="style-picker-scroll-body general-settings-container">
        <div className="general-settings-header-wrapper" style={{ flexShrink: 0 }}>
          <div className="general-header-content">
            <span
              className="general-header-icon protocol-dialog-header-icon"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
              }}
            >
              <i className="pi pi-lock" />
            </span>
            <div className="general-header-text">
              <h3 className="general-header">
                {t('unlockScreen.title', 'Pantalla de Desbloqueo')}
              </h3>
              <p className="general-description">
                {t(
                  'unlockScreen.description',
                  'Elige el diseño visual que verás al desbloquear NodeTerm con la contraseña maestra'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="general-settings-section style-picker-section">
          <div className="general-section-header">
            <div
              className="general-section-icon"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
            >
              <i className="pi pi-eye" />
            </div>
            <h4 className="general-section-title">
              {t('unlockScreen.selectionTitle', 'Selección de Estilo')}
            </h4>
          </div>

          <div className="style-picker-grid">
            {UNLOCK_STYLE_META.map((opt) => {
              const isSelected = unlockStyle === opt.id;
              const name = t(opt.nameKey, opt.name);
              const desc = t(opt.descKey, opt.desc);
              return (
                <div
                  key={opt.id}
                  className={`style-picker-card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => handleStyleChange(opt.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStyleChange(opt.id);
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
                    <UnlockStyleThumb styleId={opt.id} alt={name} />
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
                      label={t('unlockScreen.cardPreviewButton', 'Preview')}
                      icon="pi pi-eye"
                      className="p-button-sm p-button-outlined unlock-style-preview-btn"
                      onClick={(e) => openPreview(opt.id, e)}
                      aria-label={`${t('unlockScreen.cardPreviewButton', 'Preview')}: ${name}`}
                    />
                  </div>
                  <p className="style-picker-card-desc">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <UnlockDialog
        visible={previewOpen}
        previewMode
        previewStyle={previewStyleId}
        onHide={closePreview}
        onSuccess={closePreview}
      />
    </div>
  );
};

export default UnlockScreenSubTab;
