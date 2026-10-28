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
    <div className="general-settings-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div className="general-settings-header-wrapper">
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

      <div className="general-settings-section" style={{ marginBottom: 0, width: '100%' }}>
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

        <div className="general-settings-options" style={{ padding: '1.25rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '1rem',
              marginBottom: '0.5rem'
            }}
          >
            {UNLOCK_STYLE_META.map((opt) => {
              const isSelected = unlockStyle === opt.id;
              const name = t(opt.nameKey, opt.name);
              const desc = t(opt.descKey, opt.desc);
              return (
                <div
                  key={opt.id}
                  className={`general-setting-card unlock-style-option ${isSelected ? 'active' : ''}`}
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
                    border: isSelected
                      ? `2px solid ${opt.accentColor}`
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '0.9rem',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSelected ? `0 0 16px ${opt.accentColor}30` : 'none',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div className="unlock-style-thumb-wrap">
                    <UnlockStyleThumb styleId={opt.id} alt={name} />
                    <Button
                      type="button"
                      label={t('unlockScreen.cardPreviewButton', 'Preview')}
                      icon="pi pi-eye"
                      className="p-button-sm p-button-outlined unlock-style-preview-btn"
                      onClick={(e) => openPreview(opt.id, e)}
                      aria-label={`${t('unlockScreen.cardPreviewButton', 'Preview')}: ${name}`}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.25rem',
                      gap: '0.5rem'
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: isSelected ? opt.accentColor : 'var(--ui-dialog-text)'
                      }}
                    >
                      {name}
                    </span>
                    {isSelected ? (
                      <i
                        className="pi pi-check-circle"
                        style={{ color: opt.accentColor, fontSize: '1rem' }}
                      />
                    ) : null}
                  </div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-color-secondary)',
                      margin: 0,
                      opacity: 0.85,
                      lineHeight: 1.35
                    }}
                  >
                    {desc}
                  </p>
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
