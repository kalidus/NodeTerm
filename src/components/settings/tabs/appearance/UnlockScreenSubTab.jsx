import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { useTranslation } from '../../../../i18n/hooks/useTranslation';
import UnlockDialog from '../../../UnlockDialog';
import {
  UNLOCK_STYLE_META,
  loadUnlockStyle,
  saveUnlockStyle
} from '../../../unlock/unlockStyles';

export const UnlockScreenSubTab = ({ toastRef }) => {
  const { t } = useTranslation('settings');
  const [unlockStyle, setUnlockStyle] = useState(() => loadUnlockStyle());
  const [previewOpen, setPreviewOpen] = useState(false);

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
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}
          >
            {UNLOCK_STYLE_META.map((opt) => {
              const isSelected = unlockStyle === opt.id;
              const name = t(opt.nameKey, opt.name);
              const desc = t(opt.descKey, opt.desc);
              return (
                <div
                  key={opt.id}
                  className={`general-setting-card ${isSelected ? 'active' : ''}`}
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
                    padding: '1.25rem',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSelected ? `0 0 16px ${opt.accentColor}30` : 'none',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '140px'
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: isSelected ? opt.accentColor : 'var(--ui-dialog-text)'
                        }}
                      >
                        {name}
                      </span>
                      {isSelected ? (
                        <i
                          className="pi pi-check-circle"
                          style={{ color: opt.accentColor, fontSize: '1.2rem' }}
                        />
                      ) : null}
                    </div>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-color-secondary)',
                        margin: 0,
                        opacity: 0.85,
                        lineHeight: 1.4
                      }}
                    >
                      {desc}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.75rem'
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 28,
                        borderRadius: 6,
                        background: opt.bgColor,
                        border: `1px solid ${opt.borderColor || opt.accentColor}`,
                        boxShadow: `inset 0 0 12px ${opt.accentColor}22`
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-color-secondary)',
                        opacity: 0.7
                      }}
                    >
                      {opt.accentColor}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'block',
                  marginBottom: '0.25rem',
                  color: 'var(--ui-dialog-text)'
                }}
              >
                {t('unlockScreen.previewTitle', 'Probar estilo')}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                {t(
                  'unlockScreen.previewDesc',
                  'Abre una vista previa interactiva del estilo seleccionado (sin desbloquear el vault).'
                )}
              </span>
            </div>
            <Button
              label={t('unlockScreen.previewButton', 'Probar ahora')}
              icon="pi pi-eye"
              className="p-button-outlined"
              onClick={() => setPreviewOpen(true)}
            />
          </div>
        </div>
      </div>

      <UnlockDialog
        visible={previewOpen}
        previewMode
        previewStyle={unlockStyle}
        onHide={() => setPreviewOpen(false)}
        onSuccess={() => setPreviewOpen(false)}
      />
    </div>
  );
};

export default UnlockScreenSubTab;
