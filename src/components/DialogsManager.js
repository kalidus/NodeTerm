import React from 'react';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import RdpManager from './RdpManager';
import SettingsDialog from './SettingsDialog';
import SyncSettingsDialog from './SyncSettingsDialog';
import { SSHDialog, FolderDialog, GroupDialog } from './Dialogs';

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
  showRdpManager,
  setShowRdpManager,
  showCreateGroupDialog,
  setShowCreateGroupDialog,
  
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
  rdpTargetFolder,
  rdpNodeData,
  setRdpNodeData,
  editingRdpNode,
  setEditingRdpNode,
  
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
  closeRdpDialog,
  getAllFolders,
  nodes,
  
  // Theme management props
  availableThemes,
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
  updateStatusBarFromSync
}) => {
  return (
    <>
      {/* Toast para notificaciones */}
      <Toast ref={toast} />
      
      {/* RDP Manager */}
      <RdpManager 
        visible={showRdpManager} 
        onHide={() => {
          setShowRdpManager(false);
          setRdpNodeData(null);
          setEditingRdpNode(null);
        }} 
        rdpNodeData={rdpNodeData}
        onSaveToSidebar={handleSaveRdpToSidebar}
        editingNode={editingRdpNode}
      />
      
      {/* Settings Dialog */}
      <SettingsDialog
        visible={showSettingsDialog}
        onHide={() => setShowSettingsDialog(false)}
        availableThemes={availableThemes}
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
      />
      
      {/* Sync Settings Dialog */}
      <SyncSettingsDialog
        visible={showSyncDialog}
        onHide={() => setShowSyncDialog(false)}
        updateThemesFromSync={updateThemesFromSync}
        updateStatusBarFromSync={updateStatusBarFromSync}
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
      />
      
      {/* Diálogo: Editar carpeta */}
      <FolderDialog
        visible={showEditFolderDialog}
        onHide={() => setShowEditFolderDialog(false)}
        folderName={editFolderName}
        setFolderName={setEditFolderName}
        onConfirm={saveEditFolder}
      />
      
      {/* Diálogo: Editar SSH */}
      <SSHDialog
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
      />
      
      {/* Diálogo: Crear grupo */}
      <GroupDialog
        visible={showCreateGroupDialog}
        onHide={() => setShowCreateGroupDialog(false)}
        groupName={newGroupName}
        setGroupName={setNewGroupName}
        selectedColor={selectedGroupColor}
        setSelectedColor={setSelectedGroupColor}
        availableColors={GROUP_COLORS}
        onConfirm={createNewGroup}
      />

      {/* Diálogo: Nueva conexión RDP */}
      <Dialog
        visible={showRdpDialog}
        onHide={closeRdpDialog}
        header="Nueva Conexión RDP"
        style={{ width: '450px' }}
        footer={
          <div>
            <Button label="Cancelar" icon="pi pi-times" onClick={closeRdpDialog} className="p-button-text" />
            <Button label="Crear" icon="pi pi-check" onClick={createNewRdp} autoFocus />
          </div>
        }
      >
        <div className="p-fluid">
          <div className="field">
            <label htmlFor="rdpName">Nombre de la conexión:</label>
            <InputText
              id="rdpName"
              value={rdpName}
              onChange={(e) => setRdpName(e.target.value)}
              placeholder="Ej: Servidor de Producción"
            />
          </div>
          <div className="field">
            <label htmlFor="rdpServer">Servidor:</label>
            <InputText
              id="rdpServer"
              value={rdpServer}
              onChange={(e) => setRdpServer(e.target.value)}
              placeholder="Ej: 192.168.1.100"
            />
          </div>
          <div className="field">
            <label htmlFor="rdpUsername">Usuario:</label>
            <InputText
              id="rdpUsername"
              value={rdpUsername}
              onChange={(e) => setRdpUsername(e.target.value)}
              placeholder="Ej: administrador"
            />
          </div>
          <div className="field">
            <label htmlFor="rdpPassword">Contraseña:</label>
            <Password
              id="rdpPassword"
              value={rdpPassword}
              onChange={(e) => setRdpPassword(e.target.value)}
              placeholder="Contraseña"
              feedback={false}
              toggleMask
            />
          </div>
          <div className="field">
            <label htmlFor="rdpPort">Puerto:</label>
            <InputNumber
              id="rdpPort"
              value={rdpPort}
              onValueChange={(e) => setRdpPort(e.value)}
              min={1}
              max={65535}
            />
          </div>
          <div className="field">
            <label htmlFor="rdpClientType">Cliente RDP:</label>
            <Dropdown
              id="rdpClientType"
              value={rdpClientType}
              options={[
                { label: 'Windows MSTSC', value: 'mstsc' },
                { label: 'FreeRDP', value: 'freerdp' },
                { label: 'Apache Guacamole', value: 'guacamole' }
              ]}
              onChange={(e) => setRdpClientType(e.value)}
              placeholder="Selecciona el cliente RDP"
            />
          </div>
          <div className="field">
            <label htmlFor="rdpTargetFolder">Carpeta de destino:</label>
            <Dropdown
              id="rdpTargetFolder"
              value={rdpTargetFolder}
              options={getAllFolders(nodes)}
              onChange={(e) => setRdpTargetFolder(e.value)}
              placeholder="Seleccionar carpeta (opcional)"
              showClear
            />
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default DialogsManager;
