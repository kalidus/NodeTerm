import React from 'react';
import { Card } from 'primereact/card';
import { useTranslation } from '../../../i18n/hooks/useTranslation';
import ImportWizardDialog from '../../ImportWizardDialog';

export const ImportExportSettingsTab = ({
  wizardInitialSource,
  setWizardInitialSource,
  wizardInitialStep,
  setWizardInitialStep,
  handleImportComplete,
  toast,
  nodes = []
}) => {
  const { t } = useTranslation('settings');

  return (
    <div className="general-settings-container" style={{ height: '100%', maxHeight: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'absolute', top: 0, left: 0, right: '8px', bottom: 0, width: 'calc(100% - 8px)' }}>
      {/* Header */}
      <div className="general-settings-header-wrapper" style={{ flexShrink: 0, marginBottom: '20px' }}>
        <div className="general-header-content">
          <span className="general-header-icon protocol-dialog-header-icon">
            <i className="pi pi-arrow-right-arrow-left"></i>
          </span>
          <div className="general-header-text">
            <h3 className="general-header">{t('sidebar.importExport') || 'Importar / Exportar'}</h3>
            <p className="general-description">Crea copias de seguridad de tus datos o restaura sesiones y contraseñas desde múltiples formatos de manera segura.</p>
          </div>
        </div>
      </div>

      <Card style={{ background: 'var(--ui-dialog-bg, rgba(30,30,30,0.5))', border: '1px solid var(--ui-dialog-border, rgba(255,255,255,0.08))', borderRadius: '12px' }}>
        <div style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '15px' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-color)' }}>Asistente Unificado de Importación y Exportación</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
            Crea copias de seguridad de tus datos, restaura archivos locales o importa sesiones y contraseñas de otras aplicaciones con un único flujo guiado.
          </p>
        </div>
        <ImportWizardDialog
          isEmbedded={true}
          visible={true}
          initialSource={wizardInitialSource}
          initialStep={wizardInitialStep}
          onHide={() => {
            if (setWizardInitialSource) setWizardInitialSource(null);
            if (setWizardInitialStep) setWizardInitialStep(0);
          }}
          onImportComplete={async (result) => {
            if (handleImportComplete) {
              return await handleImportComplete(result);
            }
          }}
          onImportPasswordsComplete={(payload) => {
            window.dispatchEvent(new CustomEvent('import-passwords-to-manager', { detail: payload }));
          }}
          showToast={(msg) => {
            if (toast?.current?.show) {
              toast.current.show(msg);
            }
          }}
          targetFolderOptions={(() => {
            const list = [];
            const walk = (arr, prefix = '') => {
              if (!Array.isArray(arr)) return;
              for (const n of arr) {
                if (n && n.droppable) {
                  list.push({ label: `${prefix}${n.label}`, value: n.key });
                  if (n.children && n.children.length) walk(n.children, `${prefix}${n.label} / `);
                }
              }
            };
            walk(nodes || []);
            return list;
          })()}
          defaultTargetFolderKey="ROOT"
        />
      </Card>
    </div>
  );
};

export default ImportExportSettingsTab;
