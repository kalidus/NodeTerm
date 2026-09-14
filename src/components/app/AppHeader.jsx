import React from 'react';
import TitleBar from '../TitleBar';
import ImportService from '../../services/ImportService';

/**
 * Componente que orquesta la barra superior (TitleBar) y su lógica de importación rápida.
 */
export const AppHeader = ({
  titleBarCollapsed,
  isMinimalMode,
  sidebarFilter,
  setSidebarFilter,
  nodes,
  findAllConnections,
  onOpenSSHConnection,
  onOpenRdpConnection,
  onOpenVncConnection,
  setShowImportDialog,
  setShowExportDialog,
  setShowImportExportDialog,
  setShowImportWizard,
  masterKey,
  secureStorage,
  setImportPreset,
  openEditSSHDialog,
  openEditRdpDialog,
  openNewVncDialog,
  handleImportComplete,
  handleToggleTitleBar,
  iconTheme,
  expandedKeys
}) => {
  if (titleBarCollapsed || isMinimalMode) {
    return null;
  }

  const handleOpenImportWithSource = (source) => {
    try {
      setImportPreset({
        linkFile: true,
        linkedPath: source?.filePath || null,
        pollInterval: Number(source?.intervalMs) || 30000,
        overwrite: !!source?.options?.overwrite,
        placeInFolder: !!source?.options?.createContainerFolder,
        containerFolderName: source?.options?.containerFolderName || null
      });
    } catch { }
    setShowImportDialog(true);
  };

  const handleQuickImportFromSource = async (source) => {
    try {
      if (!source?.filePath) {
        setShowImportDialog(true);
        return;
      }
      const readRes = await window.electron?.import?.readFile?.(source.filePath);
      if (!readRes?.ok) {
        setShowImportDialog(true);
        return;
      }
      let fileBlob;
      try {
        const fileName = source.fileName || source.filePath.split('\\').pop() || 'import.xml';
        fileBlob = new File([readRes.content], fileName, { type: 'text/xml' });
      } catch {
        fileBlob = new Blob([readRes.content], { type: 'text/xml' });
      }

      const result = await ImportService.importFromMRemoteNG(fileBlob);

      const allSources = JSON.parse(localStorage.getItem('IMPORT_SOURCES') || '[]');
      const fresh = (() => {
        const byId = allSources.find(s => (source?.id && s.id === source.id));
        if (byId) return byId;
        const byPath = allSources.find(s => (source?.filePath && s.filePath === source.filePath));
        if (byPath) return byPath;
        const byName = allSources.find(s => (source?.fileName && s.fileName === source.fileName));
        return byName || source;
      })();

      const opts = fresh?.options || source?.options || {};
      const linkedOverwrite = !!(opts.linkedOverwrite ?? opts.overwrite);
      const linkedCreateContainerFolder = !!(opts.linkedCreateContainerFolder ?? opts.createContainerFolder);
      const effectiveContainerName = (opts.linkedContainerFolderName ?? opts.containerFolderName ?? '').toString();

      let effectiveHash = result?.metadata?.contentHash || null;
      try {
        const hashRes = await window.electron?.import?.getFileHash?.(source.filePath);
        if (hashRes?.ok && hashRes?.hash) effectiveHash = hashRes.hash;
      } catch { }

      await handleImportComplete({
        ...result,
        linkFile: true,
        pollInterval: Number(source?.intervalMs) || 30000,
        linkedFileName: source?.fileName || null,
        linkedFilePath: source?.filePath || null,
        linkedFileHash: effectiveHash,
        linkedOverwrite,
        linkedCreateContainerFolder,
        linkedContainerFolderName: effectiveContainerName,
        overwrite: linkedOverwrite,
        createContainerFolder: linkedCreateContainerFolder,
        containerFolderName: effectiveContainerName
      });
    } catch (e) {
      console.error('Quick import failed:', e);
      setShowImportDialog(true);
    }
  };

  return (
    <TitleBar
      sidebarFilter={sidebarFilter}
      setSidebarFilter={setSidebarFilter}
      allNodes={nodes}
      findAllConnections={findAllConnections}
      onOpenSSHConnection={onOpenSSHConnection}
      onOpenRdpConnection={onOpenRdpConnection}
      onOpenVncConnection={onOpenVncConnection}
      onShowImportDialog={setShowImportDialog}
      onShowExportDialog={setShowExportDialog}
      onShowImportExportDialog={setShowImportExportDialog}
      onShowImportWizard={setShowImportWizard}
      masterKey={masterKey}
      secureStorage={secureStorage}
      onOpenImportWithSource={handleOpenImportWithSource}
      openEditSSHDialog={openEditSSHDialog}
      openEditRdpDialog={openEditRdpDialog}
      openNewVncDialog={openNewVncDialog}
      onQuickImportFromSource={handleQuickImportFromSource}
      onToggleTitleBar={handleToggleTitleBar}
      iconTheme={iconTheme}
      expandedKeys={expandedKeys}
    />
  );
};

export default React.memo(AppHeader);
