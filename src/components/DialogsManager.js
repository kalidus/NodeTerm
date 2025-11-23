import React, { useCallback, useEffect, useState } from 'react';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';

import SettingsDialog from './SettingsDialog';
import SyncSettingsDialog from './SyncSettingsDialog';
import { SSHDialog, FolderDialog, GroupDialog, EditSSHConnectionDialog, EditRDPConnectionDialog, FileConnectionDialog, ProtocolSelectionDialog, NewSSHConnectionDialog, NewRDPConnectionDialog, NewVNCConnectionDialog } from './Dialogs';

/**
 * DialogsManager - Componente que centraliza la gestión de todos los diálogos
 * de la aplicación para reducir la complejidad de App.js
 */
const DialogsManager = ({
  // Referencias
  toast,
  
  // Estados de diálogos
  showSSHDialog,
  setShowSSHDialog,
  showRdpDialog,
  setShowRdpDialog,
  showFolderDialog,
  setShowFolderDialog,
  showEditSSHDialog,
  setShowEditSSHDialog,
  showEditFolderDialog,
  setShowEditFolderDialog,
  showSettingsDialog,
  setShowSettingsDialog,
  showSyncDialog,
  setShowSyncDialog,

  showCreateGroupDialog,
  setShowCreateGroupDialog,
  showUnifiedConnectionDialog,
  setShowUnifiedConnectionDialog,
  showFileConnectionDialog,
  setShowFileConnectionDialog,
  showProtocolSelectionDialog,
  setShowProtocolSelectionDialog,

  // Estados de formularios SSH
  sshName,
  setSSHName,
  sshHost,
  setSSHHost,
  sshUser,
  setSSHUser,
  sshPassword,
  setSSHPassword,
  sshRemoteFolder,
  setSSHRemoteFolder,
  sshPort,
  setSSHPort,
  sshTargetFolder,
  setSSHTargetFolder,
  sshAutoCopyPassword,
  setSSHAutoCopyPassword,
  
  // Estados de formularios Edit SSH
  editSSHName,
  setEditSSHName,
  editSSHHost,
  setEditSSHHost,
  editSSHUser,
  setEditSSHUser,
  editSSHPassword,
  setEditSSHPassword,
  editSSHRemoteFolder,
  setEditSSHRemoteFolder,
  editSSHPort,
  setEditSSHPort,
  editSSHAutoCopyPassword,
  setEditSSHAutoCopyPassword,
  
  // Estados de formularios RDP
  rdpName,
  setRdpName,
  rdpServer,
  setRdpServer,
  rdpUsername,
  setRdpUsername,
  rdpPassword,
  setRdpPassword,
  rdpPort,
  setRdpPort,
  rdpClientType,
  setRdpClientType,
  rdpGuacSecurity,
  setRdpGuacSecurity,
  rdpTargetFolder,
  rdpNodeData,
  setRdpNodeData,
  editingRdpNode,
  setEditingRdpNode,
  
  // Estados para modo edición
  editSSHNode,
  setEditSSHNode,
  
  // Estados de formularios Archivos (SFTP/FTP/SCP)
  fileConnectionName,
  setFileConnectionName,
  fileConnectionHost,
  setFileConnectionHost,
  fileConnectionUser,
  setFileConnectionUser,
  fileConnectionPassword,
  setFileConnectionPassword,
  fileConnectionPort,
  setFileConnectionPort,
  fileConnectionProtocol,
  setFileConnectionProtocol,
  fileConnectionRemoteFolder,
  setFileConnectionRemoteFolder,
  fileConnectionTargetFolder,
  setFileConnectionTargetFolder,
  editingFileConnectionNode,
  setEditingFileConnectionNode,
  
  // Estados de formularios Folder
  folderName,
  setFolderName,
  parentNodeKey,
  editFolderNode,
  editFolderName,
  setEditFolderName,
  
  // Estados de formularios Group
  newGroupName,
  setNewGroupName,
  selectedGroupColor,
  setSelectedGroupColor,
  GROUP_COLORS,
  
  // Funciones
  createNewSSH,
  createNewFolder,
  createNewRdp,
  saveEditSSH,
  saveEditFolder,
  createNewGroup,
  handleSaveRdpToSidebar,
  handleSaveVncToSidebar,
  handleSaveFileConnectionToSidebar,
  closeRdpDialog,
  openNewVncDialog,
  getAllFolders,
  nodes,
  
  // Theme management props
  availableThemes,
  availableFonts,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  localFontFamily,
  setLocalFontFamily,
  localFontSize,
  setLocalFontSize,
  terminalTheme,
  setTerminalTheme,
  statusBarTheme,
  setStatusBarTheme,
  localPowerShellTheme,
  setLocalPowerShellTheme,
  localLinuxTerminalTheme,
  setLocalLinuxTerminalTheme,
  uiTheme,
  setUiTheme,
  iconTheme,
  setIconTheme,
  iconThemeSidebar,
  setIconThemeSidebar,
  iconSize,
  setIconSize,
  folderIconSize,
  setFolderIconSize,
  connectionIconSize,
  setConnectionIconSize,
  explorerFont,
  setExplorerFont,
  explorerFontSize,
  setExplorerFontSize,
  explorerColorTheme,
  setExplorerColorTheme,
  sidebarFont,
  setSidebarFont,
  sidebarFontSize,
  setSidebarFontSize,
  statusBarIconTheme,
  setStatusBarIconTheme,
  statusBarPollingInterval,
  setStatusBarPollingInterval,
  
  // Sync settings props
  updateThemesFromSync,
  updateStatusBarFromSync,
  
  // Tree sync functions
  exportTreeToJson,
  importTreeFromJson,
  sessionManager,
  
  // Encriptación
  onMasterPasswordConfigured
}) => {
  // Debug: verificar que el prop se recibe correctamente
  useEffect(() => {
    console.log('DialogsManager - Montado - handleSaveFileConnectionToSidebar:', typeof handleSaveFileConnectionToSidebar, !!handleSaveFileConnectionToSidebar);
  }, [handleSaveFileConnectionToSidebar]);
  
  // Crear handler estable con useCallback para que no cambie entre renders
  const stableFileConnectionHandler = useCallback((fileData) => {
    if (!fileData || !fileData.name || !fileData.host || !fileData.username) {
      console.error('❌ DialogsManager - Datos inválidos:', fileData);
      return;
    }

    if (handleSaveFileConnectionToSidebar && typeof handleSaveFileConnectionToSidebar === 'function') {
      const isEditing = !!editingFileConnectionNode;
      try {
        handleSaveFileConnectionToSidebar(fileData, isEditing, editingFileConnectionNode);
        // Limpiar el nodo de edición después de guardar
        if (isEditing && setEditingFileConnectionNode) {
          setEditingFileConnectionNode(null);
        }
      } catch (error) {
        console.error('❌ DialogsManager - Error al guardar conexión:', error);
      }
    } else {
      console.error('❌ DialogsManager - handleSaveFileConnectionToSidebar no está definido o no es una función!');
    }
  }, [handleSaveFileConnectionToSidebar, editingFileConnectionNode, setEditingFileConnectionNode]);
  
  // Estados para los nuevos diálogos de creación
  const [showNewSSHDialog, setShowNewSSHDialog] = useState(false);
  const [showNewRDPDialog, setShowNewRDPDialog] = useState(false);
  const [showNewVNCDialog, setShowNewVNCDialog] = useState(false);

  // Handler para cuando se selecciona un protocolo
  const handleProtocolSelect = useCallback((protocolId) => {
    setShowProtocolSelectionDialog(false);
    
    // Abrir el diálogo correspondiente según el protocolo seleccionado
    switch (protocolId) {
      case 'ssh':
        // Abrir nuevo diálogo SSH
        setShowNewSSHDialog(true);
        break;
      case 'rdp':
        // Abrir nuevo diálogo RDP
        setShowNewRDPDialog(true);
        break;
      case 'vnc':
        // Abrir nuevo diálogo VNC
        setShowNewVNCDialog(true);
        break;
      case 'sftp':
      case 'ftp':
      case 'scp':
        // Abrir FileConnectionDialog con el protocolo seleccionado
        if (setFileConnectionProtocol) {
          setFileConnectionProtocol(protocolId);
        }
        setShowFileConnectionDialog(true);
        break;
      default:
        console.warn('Protocolo no reconocido:', protocolId);
    }
  }, [setShowFileConnectionDialog, setFileConnectionProtocol]);

  // Handler para volver al diálogo de selección de protocolo
  const handleGoBackToProtocolSelection = useCallback(() => {
    // Cerrar el diálogo actual
    setShowNewSSHDialog(false);
    setShowNewRDPDialog(false);
    setShowNewVNCDialog(false);
    setShowFileConnectionDialog(false);
    // Abrir el diálogo de selección de protocolo
    setShowProtocolSelectionDialog(true);
  }, []);

  // Wrapper para createNewSSH que también cierra el diálogo NewSSHConnectionDialog
  const handleCreateNewSSH = useCallback(() => {
    // Llamar a la función original
    if (createNewSSH && typeof createNewSSH === 'function') {
      createNewSSH();
    }
    // Cerrar el diálogo NewSSHConnectionDialog
    setShowNewSSHDialog(false);
  }, [createNewSSH]);
  
  return (
    <>
      {/* Toast para notificaciones */}
      <Toast ref={toast} />
      

      
      {/* Settings Dialog */}
      <SettingsDialog
        visible={showSettingsDialog}
        onHide={() => setShowSettingsDialog(false)}
        availableThemes={availableThemes}
        availableFonts={availableFonts}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSize={fontSize}
        setFontSize={setFontSize}
        localFontFamily={localFontFamily}
        setLocalFontFamily={setLocalFontFamily}
        localFontSize={localFontSize}
        setLocalFontSize={setLocalFontSize}
        terminalTheme={terminalTheme}
        setTerminalTheme={setTerminalTheme}
        statusBarTheme={statusBarTheme}
        setStatusBarTheme={setStatusBarTheme}
        localPowerShellTheme={localPowerShellTheme}
        setLocalPowerShellTheme={setLocalPowerShellTheme}
        localLinuxTerminalTheme={localLinuxTerminalTheme}
        setLocalLinuxTerminalTheme={setLocalLinuxTerminalTheme}
        uiTheme={uiTheme}
        setUiTheme={setUiTheme}
        iconTheme={iconTheme}
        setIconTheme={setIconTheme}
        iconThemeSidebar={iconThemeSidebar}
        setIconThemeSidebar={setIconThemeSidebar}
        iconSize={iconSize}
        setIconSize={setIconSize}
        folderIconSize={folderIconSize}
        setFolderIconSize={setFolderIconSize}
        connectionIconSize={connectionIconSize}
        setConnectionIconSize={setConnectionIconSize}
        explorerFont={explorerFont}
        setExplorerFont={setExplorerFont}
        explorerFontSize={explorerFontSize}
        setExplorerFontSize={setExplorerFontSize}
        explorerColorTheme={explorerColorTheme}
        setExplorerColorTheme={setExplorerColorTheme}
        sidebarFont={sidebarFont}
        setSidebarFont={setSidebarFont}
        sidebarFontSize={sidebarFontSize}
        setSidebarFontSize={setSidebarFontSize}
        statusBarIconTheme={statusBarIconTheme}
        setStatusBarIconTheme={setStatusBarIconTheme}
        statusBarPollingInterval={statusBarPollingInterval}
        setStatusBarPollingInterval={setStatusBarPollingInterval}
        exportTreeToJson={exportTreeToJson}
        importTreeFromJson={importTreeFromJson}
        sessionManager={sessionManager}
        onMasterPasswordConfigured={onMasterPasswordConfigured}
      />
      
      {/* Sync Settings Dialog */}
      <SyncSettingsDialog
        visible={showSyncDialog}
        onHide={() => setShowSyncDialog(false)}
        updateThemesFromSync={updateThemesFromSync}
        updateStatusBarFromSync={updateStatusBarFromSync}
        exportTreeToJson={exportTreeToJson}
        importTreeFromJson={importTreeFromJson}
        sessionManager={sessionManager}
      />

      {/* Diálogo: Nueva conexión SSH */}
      <SSHDialog
        visible={showSSHDialog}
        onHide={() => setShowSSHDialog(false)}
        sshName={sshName}
        setSshName={setSSHName}
        sshHost={sshHost}
        setSshHost={setSSHHost}
        sshUser={sshUser}
        setSshUser={setSSHUser}
        sshPassword={sshPassword}
        setSshPassword={setSSHPassword}
        sshRemoteFolder={sshRemoteFolder}
        setSshRemoteFolder={setSSHRemoteFolder}
        sshPort={sshPort}
        setSshPort={setSSHPort}
        foldersOptions={getAllFolders(nodes)}
        targetFolder={sshTargetFolder}
        onConfirm={createNewSSH}
      />
      
      {/* Diálogo: Nueva carpeta */}
      <FolderDialog
        visible={showFolderDialog}
        onHide={() => setShowFolderDialog(false)}
        folderName={folderName}
        setFolderName={setFolderName}
        onConfirm={createNewFolder}
        iconTheme={iconTheme}
      />
      
      {/* Diálogo: Editar carpeta */}
      <FolderDialog
        visible={showEditFolderDialog}
        onHide={() => setShowEditFolderDialog(false)}
        folderName={editFolderName}
        setFolderName={setEditFolderName}
        onConfirm={saveEditFolder}
        iconTheme={iconTheme}
      />
      
      {/* Diálogo: Editar SSH - Reemplazado por UnifiedConnectionDialog */}
      {/* <SSHDialog
        visible={showEditSSHDialog}
        onHide={() => setShowEditSSHDialog(false)}
        sshName={editSSHName}
        setSshName={setEditSSHName}
        sshHost={editSSHHost}
        setSshHost={setEditSSHHost}
        sshUser={editSSHUser}
        setSshUser={setEditSSHUser}
        sshPassword={editSSHPassword}
        setSshPassword={setEditSSHPassword}
        sshRemoteFolder={editSSHRemoteFolder}
        setSshRemoteFolder={setEditSSHRemoteFolder}
        sshPort={editSSHPort}
        setSshPort={setEditSSHPort}
        foldersOptions={getAllFolders(nodes)}
        onConfirm={saveEditSSH}
      /> */}
      
      {/* Diálogo: Crear grupo */}
      <GroupDialog
        visible={showCreateGroupDialog}
        onHide={() => setShowCreateGroupDialog(false)}
        groupName={newGroupName}
        setGroupName={setNewGroupName}
        groupColor={selectedGroupColor}
        setGroupColor={setSelectedGroupColor}
        colorOptions={GROUP_COLORS}
        onConfirm={createNewGroup}
      />

      {/* Diálogo: Nueva Conexión SSH */}
      <NewSSHConnectionDialog
        visible={showNewSSHDialog}
        onHide={() => setShowNewSSHDialog(false)}
        onGoBack={handleGoBackToProtocolSelection}
        sshName={sshName}
        setSSHName={setSSHName}
        sshHost={sshHost}
        setSSHHost={setSSHHost}
        sshUser={sshUser}
        setSSHUser={setSSHUser}
        sshPassword={sshPassword}
        setSSHPassword={setSSHPassword}
        sshPort={sshPort}
        setSSHPort={setSSHPort}
        sshRemoteFolder={sshRemoteFolder}
        setSSHRemoteFolder={setSSHRemoteFolder}
        sshTargetFolder={sshTargetFolder}
        setSSHTargetFolder={setSSHTargetFolder}
        sshAutoCopyPassword={sshAutoCopyPassword}
        setSSHAutoCopyPassword={setSSHAutoCopyPassword}
        foldersOptions={getAllFolders(nodes)}
        onSSHConfirm={handleCreateNewSSH}
        sshLoading={false}
      />

      {/* Diálogo: Nueva Conexión RDP */}
      <NewRDPConnectionDialog
        visible={showNewRDPDialog}
        onHide={() => setShowNewRDPDialog(false)}
        onGoBack={handleGoBackToProtocolSelection}
        onSaveToSidebar={handleSaveRdpToSidebar}
      />

      {/* Diálogo: Editar Conexión SSH */}
      <EditSSHConnectionDialog
        visible={showUnifiedConnectionDialog && !!editSSHNode}
        onHide={() => {
          setShowUnifiedConnectionDialog(false);
          if (editSSHNode) {
            setEditSSHNode(null);
          }
        }}
        editNodeData={editSSHNode}
        sshName={editSSHNode ? editSSHName : sshName}
        setSSHName={editSSHNode ? setEditSSHName : setSSHName}
        sshHost={editSSHNode ? editSSHHost : sshHost}
        setSSHHost={editSSHNode ? setEditSSHHost : setSSHHost}
        sshUser={editSSHNode ? editSSHUser : sshUser}
        setSSHUser={editSSHNode ? setEditSSHUser : setSSHUser}
        sshPassword={editSSHNode ? editSSHPassword : sshPassword}
        setSSHPassword={editSSHNode ? setEditSSHPassword : setSSHPassword}
        sshPort={editSSHNode ? editSSHPort : sshPort}
        setSSHPort={editSSHNode ? setEditSSHPort : setSSHPort}
        sshRemoteFolder={editSSHNode ? editSSHRemoteFolder : sshRemoteFolder}
        setSSHRemoteFolder={editSSHNode ? setEditSSHRemoteFolder : setSSHRemoteFolder}
        sshTargetFolder={sshTargetFolder}
        setSSHTargetFolder={setSSHTargetFolder}
        sshAutoCopyPassword={editSSHNode ? editSSHAutoCopyPassword : sshAutoCopyPassword}
        setSSHAutoCopyPassword={editSSHNode ? setEditSSHAutoCopyPassword : setSSHAutoCopyPassword}
        foldersOptions={getAllFolders(nodes)}
        onSSHConfirm={editSSHNode ? saveEditSSH : createNewSSH}
        sshLoading={false}
      />

      {/* Diálogo: Editar Conexión RDP */}
      <EditRDPConnectionDialog
        visible={showUnifiedConnectionDialog && !!editingRdpNode}
        onHide={() => {
          setShowUnifiedConnectionDialog(false);
          if (editingRdpNode) {
            setEditingRdpNode(null);
            setRdpNodeData(null);
          }
        }}
        editNodeData={editingRdpNode}
        onSaveToSidebar={handleSaveRdpToSidebar}
      />

      {/* Diálogo independiente para conexiones de archivos */}
      <FileConnectionDialog
        visible={showFileConnectionDialog}
        onHide={() => {
          setShowFileConnectionDialog(false);
          // Limpiar estado de edición de archivos
          if (editingFileConnectionNode && setEditingFileConnectionNode) {
            setEditingFileConnectionNode(null);
          }
        }}
        onGoBack={!editingFileConnectionNode ? handleGoBackToProtocolSelection : undefined}
        isEditMode={!!editingFileConnectionNode}
        editNodeData={editingFileConnectionNode}
        fileConnectionName={fileConnectionName ?? ''}
        setFileConnectionName={setFileConnectionName ?? (() => console.warn('setFileConnectionName not provided'))}
        fileConnectionHost={fileConnectionHost ?? ''}
        setFileConnectionHost={setFileConnectionHost ?? (() => console.warn('setFileConnectionHost not provided'))}
        fileConnectionUser={fileConnectionUser ?? ''}
        setFileConnectionUser={setFileConnectionUser ?? (() => console.warn('setFileConnectionUser not provided'))}
        fileConnectionPassword={fileConnectionPassword ?? ''}
        setFileConnectionPassword={setFileConnectionPassword ?? (() => console.warn('setFileConnectionPassword not provided'))}
        fileConnectionPort={fileConnectionPort ?? 22}
        setFileConnectionPort={setFileConnectionPort ?? (() => console.warn('setFileConnectionPort not provided'))}
        fileConnectionProtocol={fileConnectionProtocol ?? 'sftp'}
        setFileConnectionProtocol={setFileConnectionProtocol ?? (() => console.warn('setFileConnectionProtocol not provided'))}
        fileConnectionRemoteFolder={fileConnectionRemoteFolder ?? ''}
        setFileConnectionRemoteFolder={setFileConnectionRemoteFolder ?? (() => console.warn('setFileConnectionRemoteFolder not provided'))}
        fileConnectionTargetFolder={fileConnectionTargetFolder ?? ''}
        setFileConnectionTargetFolder={setFileConnectionTargetFolder ?? (() => console.warn('setFileConnectionTargetFolder not provided'))}
        onFileConnectionConfirm={stableFileConnectionHandler}
        fileConnectionLoading={false}
      />

      {/* Diálogo: Nueva Conexión VNC */}
      <NewVNCConnectionDialog
        visible={showNewVNCDialog}
        onHide={() => setShowNewVNCDialog(false)}
        onGoBack={handleGoBackToProtocolSelection}
        onSaveToSidebar={handleSaveVncToSidebar}
      />

      {/* Diálogo de selección de protocolo */}
      <ProtocolSelectionDialog
        visible={showProtocolSelectionDialog}
        onHide={() => setShowProtocolSelectionDialog(false)}
        onSelectProtocol={handleProtocolSelect}
      />
    </>
  );
};

DialogsManager.displayName = 'DialogsManager';

export default DialogsManager;
