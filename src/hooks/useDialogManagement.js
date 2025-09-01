import { useState } from 'react';

export const useDialogManagement = () => {
  // ============ ESTADOS DE DIÁLOGOS ============
  
  // Diálogos principales
  const [showSSHDialog, setShowSSHDialog] = useState(false);
  const [showRdpDialog, setShowRdpDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showEditSSHDialog, setShowEditSSHDialog] = useState(false);
  const [showEditFolderDialog, setShowEditFolderDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  const [showUnifiedConnectionDialog, setShowUnifiedConnectionDialog] = useState(false);

  // ============ ESTADOS DE FORMULARIOS SSH ============
  
  // Crear SSH
  const [sshName, setSSHName] = useState('');
  const [sshHost, setSSHHost] = useState('');
  const [sshUser, setSSHUser] = useState('');
  const [sshPassword, setSSHPassword] = useState('');
  const [sshRemoteFolder, setSSHRemoteFolder] = useState('');
  const [sshPort, setSSHPort] = useState(22);
  const [sshTargetFolder, setSSHTargetFolder] = useState(null);

  // Editar SSH
  const [editSSHNode, setEditSSHNode] = useState(null);
  const [editSSHName, setEditSSHName] = useState('');
  const [editSSHHost, setEditSSHHost] = useState('');
  const [editSSHUser, setEditSSHUser] = useState('');
  const [editSSHPassword, setEditSSHPassword] = useState('');
  const [editSSHRemoteFolder, setEditSSHRemoteFolder] = useState('');
  const [editSSHPort, setEditSSHPort] = useState(22);

  // ============ ESTADOS DE FORMULARIOS RDP ============
  
  const [rdpName, setRdpName] = useState('');
  const [rdpServer, setRdpServer] = useState('');
  const [rdpUsername, setRdpUsername] = useState('');
  const [rdpPassword, setRdpPassword] = useState('');
  const [rdpPort, setRdpPort] = useState(3389);
  const [rdpClientType, setRdpClientType] = useState('mstsc');
  const [rdpTargetFolder, setRdpTargetFolder] = useState(null);
  const [rdpNodeData, setRdpNodeData] = useState(null);
  const [editingRdpNode, setEditingRdpNode] = useState(null);

  // ============ ESTADOS DE FORMULARIOS FOLDER ============
  
  const [folderName, setFolderName] = useState('');
  const [parentNodeKey, setParentNodeKey] = useState(null);
  const [editFolderNode, setEditFolderNode] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');

  // ============ FUNCIONES DE UTILIDAD ============
  
  // Resetear todos los campos SSH
  const resetSSHForm = () => {
    setSSHName('');
    setSSHHost('');
    setSSHUser('');
    setSSHPassword('');
    setSSHRemoteFolder('');
    setSSHPort(22);
    setSSHTargetFolder(null);
  };

  // Resetear todos los campos RDP
  const resetRDPForm = () => {
    setRdpName('');
    setRdpServer('');
    setRdpUsername('');
    setRdpPassword('');
    setRdpPort(3389);
    setRdpClientType('mstsc');
    setRdpTargetFolder(null);
  };

  // Resetear todos los campos Folder
  const resetFolderForm = () => {
    setFolderName('');
    setParentNodeKey(null);
  };

  // Resetear todos los campos Edit SSH
  const resetEditSSHForm = () => {
    setEditSSHNode(null);
    setEditSSHName('');
    setEditSSHHost('');
    setEditSSHUser('');
    setEditSSHPassword('');
    setEditSSHRemoteFolder('');
    setEditSSHPort(22);
  };

  // Resetear todos los campos Edit Folder
  const resetEditFolderForm = () => {
    setEditFolderNode(null);
    setEditFolderName('');
  };

  // Abrir diálogo SSH con reset automático
  const openSSHDialog = (targetFolder = null) => {
    resetSSHForm();
    setSSHTargetFolder(targetFolder);
    setShowSSHDialog(true);
  };

  // Abrir diálogo RDP con reset automático
  const openRDPDialog = (targetFolder = null) => {
    resetRDPForm();
    setRdpTargetFolder(targetFolder);
    setShowRdpDialog(true);
  };

  // Abrir diálogo Folder con reset automático
  const openFolderDialog = (parentKey = null) => {
    resetFolderForm();
    setParentNodeKey(parentKey);
    setShowFolderDialog(true);
  };

  // Cerrar diálogo SSH con reset automático
  const closeSSHDialogWithReset = () => {
    setShowSSHDialog(false);
    resetSSHForm();
  };

  // Cerrar diálogo RDP con reset automático
  const closeRDPDialogWithReset = () => {
    setShowRdpDialog(false);
    resetRDPForm();
  };

  // Cerrar diálogo Folder con reset automático
  const closeFolderDialogWithReset = () => {
    setShowFolderDialog(false);
    resetFolderForm();
  };

  // Cerrar diálogo Edit SSH con reset automático
  const closeEditSSHDialogWithReset = () => {
    setShowEditSSHDialog(false);
    resetEditSSHForm();
  };

  // Cerrar diálogo Edit Folder con reset automático
  const closeEditFolderDialogWithReset = () => {
    setShowEditFolderDialog(false);
    resetEditFolderForm();
  };

  return {
    // Estados de diálogos
    showSSHDialog, setShowSSHDialog,
    showRdpDialog, setShowRdpDialog,
    showFolderDialog, setShowFolderDialog,
    showEditSSHDialog, setShowEditSSHDialog,
    showEditFolderDialog, setShowEditFolderDialog,
    showSettingsDialog, setShowSettingsDialog,
    showSyncDialog, setShowSyncDialog,

    showUnifiedConnectionDialog, setShowUnifiedConnectionDialog,

    // Estados de formularios SSH
    sshName, setSSHName,
    sshHost, setSSHHost,
    sshUser, setSSHUser,
    sshPassword, setSSHPassword,
    sshRemoteFolder, setSSHRemoteFolder,
    sshPort, setSSHPort,
    sshTargetFolder, setSSHTargetFolder,

    // Estados de formularios Edit SSH
    editSSHNode, setEditSSHNode,
    editSSHName, setEditSSHName,
    editSSHHost, setEditSSHHost,
    editSSHUser, setEditSSHUser,
    editSSHPassword, setEditSSHPassword,
    editSSHRemoteFolder, setEditSSHRemoteFolder,
    editSSHPort, setEditSSHPort,

    // Estados de formularios RDP
    rdpName, setRdpName,
    rdpServer, setRdpServer,
    rdpUsername, setRdpUsername,
    rdpPassword, setRdpPassword,
    rdpPort, setRdpPort,
    rdpClientType, setRdpClientType,
    rdpTargetFolder, setRdpTargetFolder,
    rdpNodeData, setRdpNodeData,
    editingRdpNode, setEditingRdpNode,

    // Estados de formularios Folder
    folderName, setFolderName,
    parentNodeKey, setParentNodeKey,
    editFolderNode, setEditFolderNode,
    editFolderName, setEditFolderName,

    // Funciones de utilidad
    resetSSHForm, resetRDPForm, resetFolderForm,
    resetEditSSHForm, resetEditFolderForm,
    openSSHDialog, openRDPDialog, openFolderDialog,
    closeSSHDialogWithReset, closeRDPDialogWithReset, closeFolderDialogWithReset,
    closeEditSSHDialogWithReset, closeEditFolderDialogWithReset
  };
};
