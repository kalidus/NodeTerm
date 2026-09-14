import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { useTranslation } from '../../../i18n/hooks/useTranslation';
import { getVersionInfo, getFullVersionInfo } from '../../../version-info';

export const InfoSettingsTab = () => {
  const { t } = useTranslation('settings');
  const [versionInfo, setVersionInfo] = useState({ appVersion: '' });

  useEffect(() => {
    const loadVersionInfo = async () => {
      try {
        const info = await getFullVersionInfo();
        setVersionInfo(info);
      } catch (error) {
        console.warn('Error loading version info:', error);
        // Fallback a información básica
        const basicInfo = getVersionInfo();
        setVersionInfo(basicInfo);
      }
    };

    loadVersionInfo();
  }, []);

  return (
    <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)' }}>
      {/* Header */}
      <div className="general-settings-header-wrapper">
        <div className="general-header-content">
          <span className="general-header-icon protocol-dialog-header-icon">
            <i className="pi pi-info-circle"></i>
          </span>
          <div className="general-header-text">
            <h3 className="general-header">{t('info.title')}</h3>
            <p className="general-description">{t('info.description')}</p>
          </div>
        </div>
      </div>

      {/* Grid de 2 columnas para las secciones */}
      <div className="general-settings-content">
        {/* Sección: Versión de la App */}
        <div className="general-settings-section">
          <div className="general-section-header">
            <div className="general-section-icon">
              <i className="pi pi-tag"></i>
            </div>
            <h4 className="general-section-title">{t('info.appVersion')}</h4>
          </div>

          <div className="general-settings-options">
            <div style={{ padding: '0.75rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.9375rem', margin: '0' }}>
                  {t('info.appName')}
                </label>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-color-secondary)', fontSize: '0.8125rem' }}>
                  {t('info.appDescription')}
                </p>
              </div>
              <div style={{
                background: 'var(--primary-color)',
                color: 'white',
                padding: '0.4rem 0.8rem',
                borderRadius: '20px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                {versionInfo.appVersion ? `v${versionInfo.appVersion}` : `v${getVersionInfo().appVersion}`}
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Información Técnica */}
        <div className="general-settings-section">
          <div className="general-section-header">
            <div className="general-section-icon">
              <i className="pi pi-cog"></i>
            </div>
            <h4 className="general-section-title">{t('info.technicalInfo')}</h4>
          </div>

          <div className="general-settings-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                {t('info.electron')}
              </label>
              <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                {versionInfo.electronVersion || 'N/A'}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                {t('info.node')}
              </label>
              <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                {versionInfo.nodeVersion || 'N/A'}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                {t('info.chrome')}
              </label>
              <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                {versionInfo.chromeVersion || 'N/A'}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--ui-dialog-text)', fontWeight: '600', fontSize: '0.8125rem', margin: '0 0 0.25rem 0' }}>
                {t('info.build')}
              </label>
              <p style={{ margin: '0', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                {versionInfo.buildDate || new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Sección: Características */}
        <div className="general-settings-section">
          <div className="general-section-header">
            <div className="general-section-icon">
              <i className="pi pi-star"></i>
            </div>
            <h4 className="general-section-title">Características Principales</h4>
          </div>

          <div className="general-settings-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
              <span style={{ color: 'var(--text-color-secondary)' }}>SSH múltiples</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
              <span style={{ color: 'var(--text-color-secondary)' }}>Explorador remoto</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
              <span style={{ color: 'var(--text-color-secondary)' }}>Drag & drop</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
              <span style={{ color: 'var(--text-color-secondary)' }}>Iconos Linux</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
              <span style={{ color: 'var(--text-color-secondary)' }}>Gestión inteligente</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', flexShrink: 0, marginTop: '0.15rem', fontSize: '0.7rem' }}></i>
              <span style={{ color: 'var(--text-color-secondary)' }}>Sincronización</span>
            </div>
          </div>
        </div>

        {/* Sección: Acerca de */}
        <div className="general-settings-section">
          <div className="general-section-header">
            <div className="general-section-icon">
              <i className="pi pi-info"></i>
            </div>
            <h4 className="general-section-title">Acerca de NodeTerm</h4>
          </div>

          <div className="general-settings-options">
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)', lineHeight: '1.5' }}>
              <p style={{ margin: '0' }}>
                NodeTerm es una terminal SSH multiplataforma moderna desarrollada con Electron y React, diseñada para proporcionar una experiencia de conexión remota fluida y eficiente.
              </p>
              <p style={{ margin: '0.75rem 0 0 0' }}>
                © 2025 NodeTerm - Desarrollado con ❤️
              </p>
            </div>
          </div>
        </div>

        {/* Sección: Patrocinio / Apoyar el proyecto */}
        <div className="general-settings-section">
          <div className="general-section-header">
            <div className="general-section-icon" style={{ color: '#ea4aaa' }}>
              <i className="pi pi-heart-fill"></i>
            </div>
            <h4 className="general-section-title">Apoyar el Proyecto</h4>
          </div>

          <div className="general-settings-options">
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)', lineHeight: '1.5' }}>
              <p style={{ margin: '0' }}>
                NodeTerm es gratuito y de código abierto. Tu apoyo en GitHub Sponsors permite garantizar su mantenimiento activo, mejoras de seguridad y nuevas funcionalidades.
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                <Button
                  label="Patrocinar NodeTerm en GitHub 💖"
                  icon="pi pi-external-link"
                  className="p-button-outlined p-button-sm"
                  style={{ color: '#ea4aaa', borderColor: '#ea4aaa' }}
                  onClick={() => {
                    const sponsorUrl = 'https://github.com/sponsors/kalidus';
                    if (window.electronAPI?.openExternal) {
                      window.electronAPI.openExternal(sponsorUrl);
                    } else if (window.electron?.import?.openExternal) {
                      window.electron.import.openExternal(sponsorUrl);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoSettingsTab;
