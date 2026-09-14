import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';

export const SplashScreenSubTab = ({ toastRef }) => {
  const [splashStyle, setSplashStyle] = useState('classic');

  useEffect(() => {
    if (window.electron && window.electron.theme && window.electron.theme.getSplashStyle) {
      window.electron.theme.getSplashStyle().then(style => {
        if (style) setSplashStyle(style);
      }).catch(err => console.warn('Error al cargar splash style:', err));
    }
  }, []);

  const handleSplashStyleChange = async (style) => {
    setSplashStyle(style);
    if (window.electron && window.electron.theme && window.electron.theme.saveSplashStyle) {
      const res = await window.electron.theme.saveSplashStyle(style);
      if (res && res.success && toastRef?.current) {
        toastRef.current.show({
          severity: 'success',
          summary: 'Guardado',
          detail: 'El estilo de la pantalla de inicio se ha actualizado y se aplicará en el próximo arranque.',
          life: 3000
        });
      }
    }
  };

  const splashOptions = [
    {
      id: 'classic',
      name: 'Classic (Original)',
      desc: 'El tema clásico y minimalista original de NodeTerm con tonos azulados oscuros.',
      bgColor: 'linear-gradient(180deg, #1a2332 0%, #0f1722 50%, #0a0f18 100%)',
      accentColor: '#3b82f6',
      borderColor: 'rgba(59, 130, 246, 0.2)'
    },
    {
      id: 'hologram-hud',
      name: 'Hologram HUD',
      desc: 'Estilo cyberpunk futurista en color cian brillante y violeta neón con rejilla táctica.',
      bgColor: '#06040d',
      accentColor: '#00f2fe',
      borderColor: '#00f2fe'
    },
    {
      id: 'synthwave-outrun',
      name: 'Synthwave Outrun',
      desc: 'Aesthetic retro de los 80s con gradientes fucsia y amarillo neón y líneas de horizonte.',
      bgColor: '#0f021a',
      accentColor: '#ff007f',
      borderColor: '#ff007f'
    },
    {
      id: 'terminal-minimalist',
      name: 'Terminal Minimalist',
      desc: 'Modo purista de línea de comandos en verde Matrix con ticker de log del sistema.',
      bgColor: '#000000',
      accentColor: '#00ff66',
      borderColor: '#00ff66'
    }
  ];

  return (
    <div className="general-settings-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
      {/* Header */}
      <div className="general-settings-header-wrapper">
        <div className="general-header-content">
          <span className="general-header-icon protocol-dialog-header-icon" style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            boxShadow: '0 2px 8px rgba(240, 147, 251, 0.25)'
          }}>
            <i className="pi pi-bolt"></i>
          </span>
          <div className="general-header-text">
            <h3 className="general-header">Pantalla de Inicio (Splash Screen)</h3>
            <p className="general-description">Personaliza el diseño y estilo visual de la pantalla de arranque de NodeTerm</p>
          </div>
        </div>
      </div>

      <div className="general-settings-section" style={{ marginBottom: 0, width: '100%' }}>
        <div className="general-section-header">
          <div className="general-section-icon" style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          }}>
            <i className="pi pi-eye"></i>
          </div>
          <h4 className="general-section-title">Selección de Estilo</h4>
        </div>

        <div className="general-settings-options" style={{ padding: '1.25rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            {splashOptions.map(opt => {
              const isSelected = splashStyle === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`general-setting-card ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSplashStyleChange(opt.id)}
                  style={{
                    border: isSelected ? `2px solid ${opt.accentColor}` : '1px solid rgba(255, 255, 255, 0.08)',
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
                    height: '140px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: isSelected ? opt.accentColor : 'var(--ui-dialog-text)' }}>
                        {opt.name}
                      </span>
                      {isSelected && (
                        <i className="pi pi-check-circle" style={{ color: opt.accentColor, fontSize: '1.2rem' }}></i>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', margin: 0, opacity: 0.85, lineHeight: '1.4' }}>
                      {opt.desc}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: opt.bgColor, border: `1px solid ${opt.accentColor}` }}></div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', opacity: 0.7 }}>Acento: {opt.accentColor}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Preview Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px'
          }}>
            <div>
              <span style={{ fontWeight: '600', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem', color: 'var(--ui-dialog-text)' }}>
                Previsualizar en Vivo
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                Abre una ventana externa interactiva para ver cómo luce el tema seleccionado.
              </span>
            </div>
            <Button
              label="Ver Previsualización"
              icon="pi pi-external-link"
              className="p-button-outlined"
              onClick={() => {
                if (window.electron?.app?.openSplashPreview) {
                  window.electron.app.openSplashPreview(splashStyle);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreenSubTab;
