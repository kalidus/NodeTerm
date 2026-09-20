import React, { Suspense, lazy } from 'react';
import UnlockDialog from '../UnlockDialog';
import CloudRestoreMasterKeyDialog from '../CloudRestoreMasterKeyDialog';
import ConnectionSearchPalette from '../ConnectionSearchPalette';
import DialogsManager from '../DialogsManager';
import WallixRefreshDialog from '../WallixRefreshDialog';
import UpdateNotificationToast from '../UpdateNotificationToast';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

// Lazy loaded dialogs
const ImportDialog = lazy(() => import('../ImportDialog'));
const ImportWizardDialog = lazy(() => import('../ImportWizardDialog'));

/**
 * Componente que agrupa y encapsula todos los diálogos y overlays globales de App.js.
 */
export const AppModals = ({
  children,
  // Unlock props
  needsUnlock,
  handleUnlockSuccess,
  secureStorage,
  showCloudRestoreMasterKey,
  cloudRestoreVaults,
  handleCloudRestoreMasterKeySuccess,
  setShowCloudRestoreMasterKey,

  // Connection search palette props
  connectionSearchPaletteOpen,
  closeConnectionSearchPalette,
  sidebarFilter,
  setSidebarFilter,
  nodes,
  findAllConnections,
  onOpenSSHConnection,
  onOpenRdpConnection,
  onOpenVncConnection,
  openEditSSHDialog,
  openEditRdpDialog,
  expandedKeys,
  masterKey,
  iconTheme,

  // DialogsManager props
  dialogsManagerProps,

  // Import / Export dialogs props
  showImportDialog,
  setShowImportDialog,
  handleImportComplete,
  toast,
  importPreset,
  showExportDialog,
  setShowExportDialog,
  showImportExportDialog,
  setShowImportExportDialog,
  setNodes,
  showImportWizard,
  setShowImportWizard,
  documentFolderOptions,

  // Wallix props
  showWallixRefreshDialog,
  setShowWallixRefreshDialog,
  wallixRefreshNode,
  handleRefreshWallixComplete,

  // Settings trigger
  setShowSettingsDialog
}) => {
  return (
    <>
      {/* UnlockDialog - Pide master password al inicio si existe */}
      <UnlockDialog
        visible={needsUnlock}
        onSuccess={handleUnlockSuccess}
        secureStorage={secureStorage}
      />

      <CloudRestoreMasterKeyDialog
        visible={showCloudRestoreMasterKey && !needsUnlock}
        secureStorage={secureStorage}
        vaultsDownloaded={cloudRestoreVaults}
        onSuccess={handleCloudRestoreMasterKeySuccess}
        onHide={() => setShowCloudRestoreMasterKey(false)}
      />

      <ConnectionSearchPalette
        open={connectionSearchPaletteOpen && !needsUnlock}
        onClose={closeConnectionSearchPalette}
        sidebarFilter={sidebarFilter}
        setSidebarFilter={setSidebarFilter}
        allNodes={nodes}
        findAllConnections={findAllConnections}
        onOpenSSHConnection={onOpenSSHConnection}
        onOpenRdpConnection={onOpenRdpConnection}
        onOpenVncConnection={onOpenVncConnection}
        openEditSSHDialog={openEditSSHDialog}
        openEditRdpDialog={openEditRdpDialog}
        expandedKeys={expandedKeys}
        masterKey={masterKey}
        secureStorage={secureStorage}
        iconTheme={iconTheme}
        onOpenSettings={() => setShowSettingsDialog?.(true)}
      />

      {/* Gestor unificado de diálogos de conexión y configuración */}
      {children}
      {dialogsManagerProps && <DialogsManager {...dialogsManagerProps} />}

      {/* Lazy loading con Suspense para asistentes de importación/exportación */}
      <Suspense fallback={null}>
        <ImportDialog
          visible={showImportDialog}
          onHide={() => setShowImportDialog(false)}
          onImportComplete={async (result) => {
            try {
              return await handleImportComplete(result);
            } catch (error) {
              console.error('🔍 DEBUG AppModals - Error en handleImportComplete:', error);
              throw error;
            }
          }}
          showToast={(message) => toast.current?.show(message)}
          presetOptions={importPreset}
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
          defaultTargetFolderKey={null}
        />

        {/* Diálogo Unificado de Exportación (Modal flotante) */}
        {showExportDialog && (
          <ImportWizardDialog
            visible={showExportDialog}
            onHide={() => setShowExportDialog(false)}
            initialSource="export_nodeterm"
            initialStep={1}
            showToast={(message) => toast.current?.show(message)}
          />
        )}

        {/* Diálogo Unificado de Restauración (Modal flotante) */}
        {showImportExportDialog && (
          <ImportWizardDialog
            visible={showImportExportDialog}
            onHide={() => setShowImportExportDialog(false)}
            initialSource="nodeterm"
            initialStep={1}
            showToast={(message) => toast.current?.show(message)}
            onImportComplete={async (result) => {
              console.log('[AppModals] Importación completada:', result);
              const treeData = localStorage.getItem('basicapp2_tree_data');
              if (treeData) {
                try {
                  const parsed = JSON.parse(treeData);
                  setNodes(parsed);
                } catch (error) {
                  console.error('Error al recargar nodos:', error);
                }
              }
            }}
          />
        )}

        {/* Import Wizard Dialog - Nueva interfaz unificada de importación */}
        <ImportWizardDialog
          visible={showImportWizard}
          onHide={() => setShowImportWizard(false)}
          onImportComplete={async (result) => {
            try {
              return await handleImportComplete(result);
            } catch (error) {
              console.error('[ImportWizard] Error en handleImportComplete:', error);
              throw error;
            }
          }}
          onImportPasswordsComplete={(payload) => {
            window.dispatchEvent(new CustomEvent('import-passwords-to-manager', { detail: payload }));
          }}
          showToast={(message) => toast.current?.show(message)}
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
          documentFolderOptions={documentFolderOptions}
          defaultTargetFolderKey={null}
        />

        <WallixRefreshDialog
          visible={showWallixRefreshDialog}
          onHide={() => setShowWallixRefreshDialog(false)}
          node={wallixRefreshNode}
          onRefreshComplete={handleRefreshWallixComplete}
          toast={toast}
        />
      </Suspense>

      {/* Notificación flotante de actualización estilo Cursor */}
      <UpdateNotificationToast
        onOpenUpdateSettings={() => {
          setShowSettingsDialog(true);
        }}
      />

      {/* ConfirmDialog para confirmaciones globales */}
      <ConfirmDialog className="app-confirm-dialog" />

      {/* Toast global para notificaciones y alertas del sistema */}
      <Toast ref={toast} position="top-right" baseZIndex={999999} />
    </>
  );
};

export default AppModals;
