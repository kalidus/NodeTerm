import React, { useCallback, useEffect, useState } from 'react';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';

import { SSHDialog, FolderDialog, GroupDialog, EditSSHConnectionDialog, EditRDPConnectionDialog, EditVNCConnectionDialog, FileConnectionDialog, ProtocolSelectionDialog, NewSSHConnectionDialog, NewRDPConnectionDialog, NewVNCConnectionDialog } from './Dialogs';

// 🚀 OPTIMIZACIÓN: Carga diferida de diálogos pesados
const SettingsDialog = React.lazy(() => import('./SettingsDialog'));
const SyncSettingsDialog = React.lazy(() => import('./SyncSettingsDialog'));
const NetworkToolsDialog = React.lazy(() => import('./NetworkToolsDialog'));
const SSHTunnelDialog = React.lazy(() => import('./SSHTunnelDialog').then(m => ({ default: m.SSHTunnelDialog })));

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
  showNetworkToolsDialog,
  setShowNetworkToolsDialog,

  // Estados SSH Tunnel
  showSSHTunnelDialog,
  setShowSSHTunnelDialog,
  createNewSSHTunnel,
  editingSSHTunnelNode,
  setEditingSSHTunnelNode,

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
  sshX11Forwarding,
  setSSHX11Forwarding,
  sshAgentForwarding,
  setSSHAgentForwarding,
  sshAutoRecording,
  setSSHAutoRecording,
  sshProxyJumpEnabled,
  setSSHProxyJumpEnabled,
  sshJumpHost,
  setSSHJumpHost,
  sshJumpPort,
  setSSHJumpPort,
  sshJumpUser,
  setSSHJumpUser,
  sshJumpAuthMethod,
  setSSHJumpAuthMethod,
  sshJumpPassword,
  setSSHJumpPassword,
  sshJumpPrivateKey,
  setSSHJumpPrivateKey,
  sshHostKeyPolicy,
  setSSHHostKeyPolicy,
  sshDescription,
  setSSHDescription,
  sshIcon,
  setSSHIcon,
  sshAuthMethod,
  setSSHAuthMethod,
  sshPrivateKey,
  setSSHPrivateKey,

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
  editSSHX11Forwarding,
  setEditSSHX11Forwarding,
  editSSHAgentForwarding,
  setEditSSHAgentForwarding,
  editSSHAutoRecording,
  setEditSSHAutoRecording,
  editSSHProxyJumpEnabled,
  setEditSSHProxyJumpEnabled,
  editSSHJumpHost,
  setEditSSHJumpHost,
  editSSHJumpPort,
  setEditSSHJumpPort,
  editSSHJumpUser,
  setEditSSHJumpUser,
  editSSHJumpAuthMethod,
  setEditSSHJumpAuthMethod,
  editSSHJumpPassword,
  setEditSSHJumpPassword,
  editSSHJumpPrivateKey,
  setEditSSHJumpPrivateKey,
  editSSHHostKeyPolicy,
  setEditSSHHostKeyPolicy,
  editSSHDescription,
  setEditSSHDescription,
  editSSHIcon,
  setEditSSHIcon,
  editSSHAuthMethod,
  setEditSSHAuthMethod,
  editSSHPrivateKey,
  setEditSSHPrivateKey,

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
  vncNodeData,
  setVncNodeData,
  editingVncNode,
  setEditingVncNode,

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
  folderColor,
  setFolderColor,
  folderIcon,
  setFolderIcon,
  parentNodeKey,
  editFolderNode,
  editFolderName,
  setEditFolderName,
  editFolderColor,
  setEditFolderColor,
  editFolderIcon,
  setEditFolderIcon,

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
  localDockerTerminalTheme,
  setLocalDockerTerminalTheme,
  dockerFontFamily,
  setDockerFontFamily,
  dockerFontSize,
  setDockerFontSize,
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
  sidebarFontColor,
  setSidebarFontColor,
  treeTheme,
  setTreeTheme,
  sessionActionIconTheme,
  setSessionActionIconTheme,
  statusBarIconTheme,
  setStatusBarIconTheme,
  statusBarPollingInterval,
  setStatusBarPollingInterval,
  statusBarLayout,
  setStatusBarLayout,

  // Sync settings props
  updateThemesFromSync,
  updateStatusBarFromSync,

  // Tree sync functions
  exportTreeToJson,
  importTreeFromJson,
  sessionManager,

  // Encriptación
  onMasterPasswordConfigured,

  // Gestión de usuarios
  onUpdateUserPassword,
  onEditConnection,
  secureStorage,
  masterKey,
  handleImportComplete,
  setNodes
}) => {
  // Debug: verificar que el prop se recibe correctamente (deshabilitado)
  // useEffect(() => {
  //   console.log('DialogsManager - Montado - handleSaveFileConnectionToSidebar:', typeof handleSaveFileConnectionToSidebar, !!handleSaveFileConnectionToSidebar);
  // }, [handleSaveFileConnectionToSidebar]);

  // Debug: verificar props de folder (deshabilitado)
  // useEffect(() => {
  //   console.log('🔍 DialogsManager - Folder props:', {
  //     setFolderIcon: typeof setFolderIcon,
  //     setFolderIconValue: setFolderIcon,
  //     setFolderColor: typeof setFolderColor,
  //     folderIcon,
  //     folderColor
  //   });
  // }, [setFolderIcon, setFolderColor, folderIcon, folderColor]);

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

  // Estado para la categoría inicial del diálogo de selección de protocolo
  const [protocolSelectionInitialCategory, setProtocolSelectionInitialCategory] = useState(null);

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
      case 'ssh-tunnel':
        // Abrir diálogo de túnel SSH
        if (setShowSSHTunnelDialog) {
          setShowSSHTunnelDialog(true);
        }
        break;
      default:
        console.warn('Protocolo no reconocido:', protocolId);
    }
  }, [setShowFileConnectionDialog, setFileConnectionProtocol, setShowSSHTunnelDialog]);

  // Escuchar evento para abrir diálogo de selección de protocolo con categoría inicial
  useEffect(() => {
    const handleOpenProtocolSelection = (e) => {
      const initialCategory = e?.detail?.initialCategory;
      if (initialCategory) {
        setProtocolSelectionInitialCategory(initialCategory);
      } else {
        setProtocolSelectionInitialCategory(null);
      }
      setShowProtocolSelectionDialog(true);
    };

    window.addEventListener('open-new-unified-connection-dialog', handleOpenProtocolSelection);
    return () => {
      window.removeEventListener('open-new-unified-connection-dialog', handleOpenProtocolSelection);
    };
  }, []);

  // Escuchar evento para abrir directamente SSH o RDP (desde columna derecha HomeTab)
  useEffect(() => {
    const handleOpenConnectionDialog = (e) => {
      const protocol = e?.detail?.protocol;
      if (protocol === 'ssh') {
        setShowNewSSHDialog(true);
      } else if (protocol === 'rdp') {
        setShowNewRDPDialog(true);
      }
    };
    window.addEventListener('open-connection-dialog', handleOpenConnectionDialog);
    return () => window.removeEventListener('open-connection-dialog', handleOpenConnectionDialog);
  }, []);

  // Escuchar evento para abrir el diálogo de configuración
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettingsDialog(true);
    };
    window.addEventListener('open-settings-dialog', handleOpenSettings);
    return () => window.removeEventListener('open-settings-dialog', handleOpenSettings);
  }, [setShowSettingsDialog]);

  // Limpiar categoría inicial cuando se cierra el diálogo
  useEffect(() => {
    if (!showProtocolSelectionDialog) {
      setProtocolSelectionInitialCategory(null);
    }
  }, [showProtocolSelectionDialog]);

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



      {/* 🚀 OPTIMIZACIÓN: Settings Dialog solo se monta cuando es visible con React.Suspense */}
      {showSettingsDialog && (
        <React.Suspense fallback={null}>
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
            localDockerTerminalTheme={localDockerTerminalTheme}
            setLocalDockerTerminalTheme={setLocalDockerTerminalTheme}
            dockerFontFamily={dockerFontFamily}
            setDockerFontFamily={setDockerFontFamily}
            dockerFontSize={dockerFontSize}
            setDockerFontSize={setDockerFontSize}
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
            sidebarFontColor={sidebarFontColor}
            setSidebarFontColor={setSidebarFontColor}
            treeTheme={treeTheme}
            setTreeTheme={setTreeTheme}
            sessionActionIconTheme={sessionActionIconTheme}
            setSessionActionIconTheme={setSessionActionIconTheme}
            statusBarIconTheme={statusBarIconTheme}
            setStatusBarIconTheme={setStatusBarIconTheme}
            statusBarPollingInterval={statusBarPollingInterval}
            setStatusBarPollingInterval={setStatusBarPollingInterval}
            statusBarLayout={statusBarLayout}
            setStatusBarLayout={setStatusBarLayout}
            exportTreeToJson={exportTreeToJson}
            importTreeFromJson={importTreeFromJson}
            sessionManager={sessionManager}
            onMasterPasswordConfigured={onMasterPasswordConfigured}
            nodes={nodes}
            onUpdateUserPassword={onUpdateUserPassword}
            onEditConnection={onEditConnection}
            secureStorage={secureStorage}
            masterKey={masterKey}
            handleImportComplete={handleImportComplete}
            toast={toast}
            setNodes={setNodes}
          />
        </React.Suspense>
      )}

      {/* Sync Settings Dialog - solo se monta cuando es visible con React.Suspense */}
      {showSyncDialog && (
        <React.Suspense fallback={null}>
          <SyncSettingsDialog
            visible={showSyncDialog}
            onHide={() => setShowSyncDialog(false)}
            updateThemesFromSync={updateThemesFromSync}
            updateStatusBarFromSync={updateStatusBarFromSync}
            exportTreeToJson={exportTreeToJson}
            importTreeFromJson={importTreeFromJson}
            sessionManager={sessionManager}
          />
        </React.Suspense>
      )}

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
        mode="new"
        folderName={folderName}
        setFolderName={setFolderName}
        folderColor={folderColor}
        setFolderColor={setFolderColor}
        folderIcon={folderIcon}
        setFolderIcon={setFolderIcon || (() => console.warn('setFolderIcon no disponible'))}
        onConfirm={createNewFolder}
        iconTheme={iconTheme}
      />

      {/* Diálogo: Editar carpeta */}
      <FolderDialog
        visible={showEditFolderDialog}
        onHide={() => setShowEditFolderDialog(false)}
        mode="edit"
        folderName={editFolderName}
        setFolderName={setEditFolderName}
        folderColor={editFolderColor}
        setFolderColor={setEditFolderColor}
        folderIcon={editFolderIcon}
        setFolderIcon={setEditFolderIcon}
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
        sshAuthMethod={sshAuthMethod}
        setSSHAuthMethod={setSSHAuthMethod}
        sshPrivateKey={sshPrivateKey}
        setSSHPrivateKey={setSSHPrivateKey}
        sshAutoCopyPassword={sshAutoCopyPassword}
        setSSHAutoCopyPassword={setSSHAutoCopyPassword}
        sshX11Forwarding={sshX11Forwarding}
        setSSHX11Forwarding={setSSHX11Forwarding}
        sshAgentForwarding={sshAgentForwarding}
        setSSHAgentForwarding={setSSHAgentForwarding}
        sshAutoRecording={sshAutoRecording}
        setSSHAutoRecording={setSSHAutoRecording}
        sshProxyJumpEnabled={sshProxyJumpEnabled}
        setSSHProxyJumpEnabled={setSSHProxyJumpEnabled}
        sshJumpHost={sshJumpHost}
        setSSHJumpHost={setSSHJumpHost}
        sshJumpPort={sshJumpPort}
        setSSHJumpPort={setSSHJumpPort}
        sshJumpUser={sshJumpUser}
        setSSHJumpUser={setSSHJumpUser}
        sshJumpAuthMethod={sshJumpAuthMethod}
        setSSHJumpAuthMethod={setSSHJumpAuthMethod}
        sshJumpPassword={sshJumpPassword}
        setSSHJumpPassword={setSSHJumpPassword}
        sshJumpPrivateKey={sshJumpPrivateKey}
        setSSHJumpPrivateKey={setSSHJumpPrivateKey}
        sshHostKeyPolicy={sshHostKeyPolicy}
        setSSHHostKeyPolicy={setSSHHostKeyPolicy}
        sshDescription={sshDescription}
        setSSHDescription={setSSHDescription}
        sshIcon={sshIcon}
        setSSHIcon={setSSHIcon}
        foldersOptions={getAllFolders(nodes)}
        onSSHConfirm={handleCreateNewSSH}
        sshLoading={false}
        iconTheme={iconTheme}
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
        sshAuthMethod={editSSHNode ? editSSHAuthMethod : sshAuthMethod}
        setSSHAuthMethod={editSSHNode ? setEditSSHAuthMethod : setSSHAuthMethod}
        sshPrivateKey={editSSHNode ? editSSHPrivateKey : sshPrivateKey}
        setSSHPrivateKey={editSSHNode ? setEditSSHPrivateKey : setSSHPrivateKey}
        sshAutoCopyPassword={editSSHNode ? editSSHAutoCopyPassword : sshAutoCopyPassword}
        setSSHAutoCopyPassword={editSSHNode ? setEditSSHAutoCopyPassword : setSSHAutoCopyPassword}
        sshX11Forwarding={editSSHNode ? editSSHX11Forwarding : sshX11Forwarding}
        setSSHX11Forwarding={editSSHNode ? setEditSSHX11Forwarding : setSSHX11Forwarding}
        sshAgentForwarding={editSSHNode ? editSSHAgentForwarding : sshAgentForwarding}
        setSSHAgentForwarding={editSSHNode ? setEditSSHAgentForwarding : setSSHAgentForwarding}
        sshAutoRecording={editSSHNode ? editSSHAutoRecording : sshAutoRecording}
        setSSHAutoRecording={editSSHNode ? setEditSSHAutoRecording : setSSHAutoRecording}
        sshProxyJumpEnabled={editSSHNode ? editSSHProxyJumpEnabled : sshProxyJumpEnabled}
        setSSHProxyJumpEnabled={editSSHNode ? setEditSSHProxyJumpEnabled : setSSHProxyJumpEnabled}
        sshJumpHost={editSSHNode ? editSSHJumpHost : sshJumpHost}
        setSSHJumpHost={editSSHNode ? setEditSSHJumpHost : setSSHJumpHost}
        sshJumpPort={editSSHNode ? editSSHJumpPort : sshJumpPort}
        setSSHJumpPort={editSSHNode ? setEditSSHJumpPort : setSSHJumpPort}
        sshJumpUser={editSSHNode ? editSSHJumpUser : sshJumpUser}
        setSSHJumpUser={editSSHNode ? setEditSSHJumpUser : setSSHJumpUser}
        sshJumpAuthMethod={editSSHNode ? editSSHJumpAuthMethod : sshJumpAuthMethod}
        setSSHJumpAuthMethod={editSSHNode ? setEditSSHJumpAuthMethod : setSSHJumpAuthMethod}
        sshJumpPassword={editSSHNode ? editSSHJumpPassword : sshJumpPassword}
        setSSHJumpPassword={editSSHNode ? setEditSSHJumpPassword : setSSHJumpPassword}
        sshJumpPrivateKey={editSSHNode ? editSSHJumpPrivateKey : sshJumpPrivateKey}
        setSSHJumpPrivateKey={editSSHNode ? setEditSSHJumpPrivateKey : setSSHJumpPrivateKey}
        sshHostKeyPolicy={editSSHNode ? editSSHHostKeyPolicy : sshHostKeyPolicy}
        setSSHHostKeyPolicy={editSSHNode ? setEditSSHHostKeyPolicy : setSSHHostKeyPolicy}
        sshDescription={editSSHNode ? editSSHDescription : sshDescription}
        setSSHDescription={editSSHNode ? setEditSSHDescription : setSSHDescription}
        sshIcon={editSSHIcon}
        setSSHIcon={setEditSSHIcon}
        foldersOptions={getAllFolders(nodes)}
        onSSHConfirm={editSSHNode ? saveEditSSH : createNewSSH}
        sshLoading={false}
        iconTheme={iconTheme}
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

      {/* Diálogo: Editar Conexión VNC */}
      <EditVNCConnectionDialog
        visible={showUnifiedConnectionDialog && !!editingVncNode}
        onHide={() => {
          setShowUnifiedConnectionDialog(false);
          if (editingVncNode && setEditingVncNode) {
            setEditingVncNode(null);
          }
          if (setVncNodeData) {
            setVncNodeData(null);
          }
        }}
        editNodeData={editingVncNode}
        onSaveToSidebar={handleSaveVncToSidebar}
      />

      {/* Diálogo de selección de protocolo */}
      <ProtocolSelectionDialog
        visible={showProtocolSelectionDialog}
        onHide={() => setShowProtocolSelectionDialog(false)}
        onSelectProtocol={handleProtocolSelect}
        iconTheme={iconThemeSidebar || iconTheme}
        initialCategory={protocolSelectionInitialCategory}
      />

      {/* Diálogo de herramientas de red - solo se monta cuando es visible */}
      {showNetworkToolsDialog && (
        <React.Suspense fallback={null}>
          <NetworkToolsDialog
            visible={showNetworkToolsDialog}
            onHide={() => setShowNetworkToolsDialog(false)}
          />
        </React.Suspense>
      )}

      {/* Diálogo de túnel SSH */}
      {showSSHTunnelDialog && (
        <React.Suspense fallback={null}>
          <SSHTunnelDialog
            visible={showSSHTunnelDialog}
            onHide={() => {
              setShowSSHTunnelDialog(false);
              if (setEditingSSHTunnelNode) {
                setEditingSSHTunnelNode(null);
              }
            }}
            mode={editingSSHTunnelNode ? 'edit' : 'new'}
            initialData={editingSSHTunnelNode ? {
              name: editingSSHTunnelNode.label,
              tunnelType: editingSSHTunnelNode.data?.tunnelType || 'local',
              sshHost: editingSSHTunnelNode.data?.sshHost || '',
              sshPort: editingSSHTunnelNode.data?.sshPort || 22,
              sshUser: editingSSHTunnelNode.data?.sshUser || '',
              sshPassword: editingSSHTunnelNode.data?.sshPassword || '',
              authType: editingSSHTunnelNode.data?.authType || 'password',
              privateKeyPath: editingSSHTunnelNode.data?.privateKeyPath || '',
              passphrase: editingSSHTunnelNode.data?.passphrase || '',
              localHost: editingSSHTunnelNode.data?.localHost || '127.0.0.1',
              localPort: editingSSHTunnelNode.data?.localPort || '',
              remoteHost: editingSSHTunnelNode.data?.remoteHost || '',
              remotePort: editingSSHTunnelNode.data?.remotePort || '',
              bindHost: editingSSHTunnelNode.data?.bindHost || '0.0.0.0',
              targetFolder: null
            } : null}
            onConfirm={(tunnelData) => {
              if (createNewSSHTunnel) {
                createNewSSHTunnel(tunnelData);
              }
              setShowSSHTunnelDialog(false);
            }}
            onGoBack={() => {
              setShowSSHTunnelDialog(false);
              if (!editingSSHTunnelNode) {
                setShowProtocolSelectionDialog(true);
              }
            }}
            foldersOptions={getAllFolders && nodes ? getAllFolders(nodes) : []}
          />
        </React.Suspense>
      )}
    </>
  );
};

DialogsManager.displayName = 'DialogsManager';

export default DialogsManager;
