import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { useTranslation } from '../../../i18n/hooks/useTranslation';
import SyncSettingsDialog from '../../SyncSettingsDialog';

export const SyncSettingsTab = ({
  exportTreeToJson,
  importTreeFromJson,
  sessionManager
}) => {
  const { t } = useTranslation('settings');
  const [syncDialogVisible, setSyncDialogVisible] = useState(false);

  return (
    <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)' }}>
      {/* Header */}
      <div className="general-settings-header-wrapper">
        <div className="general-header-content">
          <span className="general-header-icon protocol-dialog-header-icon">
            <i className="pi pi-cloud"></i>
          </span>
          <div className="general-header-text">
            <h3 className="general-header">{t('sync.title')}</h3>
            <p className="general-description">Sincroniza tu configuración personal entre todos tus dispositivos usando Nextcloud</p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="general-settings-content sync-settings-content">
        <div className="sync-main-content">
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <i className="pi pi-cloud" style={{
              fontSize: '4rem',
              color: 'var(--primary-color)',
              marginBottom: '1rem',
              display: 'block'
            }}></i>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)', textAlign: 'center' }}>
              {t('sync.cloudTitle')}
            </h3>
            <p style={{
              margin: '0 0 2rem 0',
              color: 'var(--text-color-secondary)',
              fontSize: '1rem',
              textAlign: 'center'
            }}>
              {t('sync.description')}
            </p>
          </div>

          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
            <Button
              label={t('sync.configure')}
              icon="pi pi-cog"
              onClick={() => setSyncDialogVisible(true)}
              className="p-button-lg"
              style={{
                padding: '1rem 2rem',
                fontSize: '1.1rem'
              }}
            />
          </div>

          <div style={{ marginTop: '2rem', width: '100%' }}>
            <div className="sync-features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', textAlign: 'center' }}>
              <div>
                <i className="pi pi-shield" style={{ fontSize: '2rem', color: 'var(--green-500)', marginBottom: '1rem', display: 'block' }}></i>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>Seguro</h4>
                <p style={{ margin: 0, color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>
                  Tus datos se cifran y almacenan de forma segura en tu instancia de Nextcloud
                </p>
              </div>
              <div>
                <i className="pi pi-sync" style={{ fontSize: '2rem', color: 'var(--blue-500)', marginBottom: '1rem', display: 'block' }}></i>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>Automático</h4>
                <p style={{ margin: 0, color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>
                  Sincronización automática cada 5 minutos o manual cuando lo necesites
                </p>
              </div>
              <div>
                <i className="pi pi-mobile" style={{ fontSize: '2rem', color: 'var(--orange-500)', marginBottom: '1rem', display: 'block' }}></i>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>Multiplataforma</h4>
                <p style={{ margin: 0, color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>
                  Funciona en Windows, macOS y Linux con la misma configuración
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo de Sincronización */}
      <SyncSettingsDialog
        visible={syncDialogVisible}
        onHide={() => setSyncDialogVisible(false)}
        exportTreeToJson={exportTreeToJson}
        importTreeFromJson={importTreeFromJson}
        sessionManager={sessionManager}
      />
    </div>
  );
};

export default SyncSettingsTab;
