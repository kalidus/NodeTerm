import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { RadioButton } from 'primereact/radiobutton';
import { Dropdown } from 'primereact/dropdown';
import { Card } from 'primereact/card';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { getAllFolders } from '../utils/treeFolders';

// Importar los formularios existentes
import { EnhancedSSHForm } from './Dialogs';
import { EnhancedRDPForm, createDefaultRdpFormData, mapEditNodeDataToRdpFormData, isRdpFormValid } from './EnhancedRDPForm';
import { EnhancedVNCForm, createDefaultVncFormData, mapEditNodeDataToVncFormData, isVncFormValid } from './EnhancedVNCForm';

export default function EditConnectionTabContent({
  tab,
  nodes = [],
  handleSaveSshToSidebar,
  handleSaveRdpToSidebar,
  handleSaveVncToSidebar,
  handleSaveFileConnectionToSidebar,
  handleSaveSSHTunnelToSidebar,
  handleTabClose,
  iconTheme = 'material'
}) {
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');

  const node = tab?.node;
  const connectionType = node?.data?.type || node?.type;

  const [layoutMode, setLayoutMode] = useState(() => {
    const saved = localStorage.getItem('node-term-edit-layout');
    if (saved === 'sidebar' || saved === 'split') return saved;
    return 'split';
  });

  const changeLayoutMode = (mode) => {
    const nextMode = mode === 'sidebar' || mode === 'split' ? mode : 'split';
    setLayoutMode(nextMode);
    localStorage.setItem('node-term-edit-layout', nextMode);
  };

  const isFormValid = () => {
    if (connectionType === 'ssh') {
      return !!sshName?.trim() && !!sshHost?.trim() && !!sshUser?.trim() && (sshAuthMethod === 'password' ? !!sshPassword?.trim() : !!sshPrivateKey?.trim());
    }
    if (connectionType === 'rdp') {
      return isRdpFormValid(rdpFormData);
    }
    if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
      return isVncFormValid(vncFormData);
    }
    if (['sftp', 'ftp', 'scp'].includes(connectionType)) {
      return !!fileName?.trim() && !!fileHost?.trim() && !!fileUser?.trim();
    }
    if (connectionType === 'ssh-tunnel') {
      return !!(
        tunnelName && tunnelSshHost && tunnelSshUser &&
        (tunnelAuthType === 'password' ? tunnelSshPassword : tunnelPrivateKeyPath) &&
        (tunnelType === 'local' ? (tunnelRemoteHost && tunnelRemotePort) : true) &&
        (tunnelType === 'remote' ? tunnelRemotePort : true) &&
        tunnelLocalPort
      );
    }
    return true;
  };

  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    if (connectionType !== 'ssh') return;
    setIsTesting(true);
    try {
      const sshConfig = {
        host: sshHost,
        port: parseInt(sshPort) || 22,
        user: sshUser,
        password: sshPassword,
        privateKey: sshPrivateKey,
        authMethod: sshAuthMethod
      };
      const result = await window.electron.ipcRenderer.invoke('ssh:test-connection', { sshConfig });
      if (result.success) {
        alert('¡Conexión establecida con éxito!');
      } else {
        alert(`Error de conexión: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message || error}`);
    } finally {
      setIsTesting(false);
    }
  };


  // --- SSH STATES ---
  const [sshName, setSSHName] = useState('');
  const [sshHost, setSSHHost] = useState('');
  const [sshUser, setSSHUser] = useState('');
  const [sshPassword, setSSHPassword] = useState('');
  const [sshPort, setSSHPort] = useState(22);
  const [sshRemoteFolder, setSSHRemoteFolder] = useState('');
  const [sshTargetFolder, setSSHTargetFolder] = useState('');
  const [sshAuthMethod, setSSHAuthMethod] = useState('password');
  const [sshPrivateKey, setSSHPrivateKey] = useState('');
  const [sshAutoCopyPassword, setSSHAutoCopyPassword] = useState(false);
  const [sshX11Forwarding, setSSHX11Forwarding] = useState(false);
  const [sshAgentForwarding, setSSHAgentForwarding] = useState(false);
  const [sshAutoRecording, setSSHAutoRecording] = useState(false);
  const [sshProxyJumpEnabled, setSSHProxyJumpEnabled] = useState(false);
  const [sshJumpHost, setSSHJumpHost] = useState('');
  const [sshJumpPort, setSSHJumpPort] = useState(22);
  const [sshJumpUser, setSSHJumpUser] = useState('');
  const [sshJumpAuthMethod, setSSHJumpAuthMethod] = useState('password');
  const [sshJumpPassword, setSSHJumpPassword] = useState('');
  const [sshJumpPrivateKey, setSSHJumpPrivateKey] = useState('');
  const [sshHostKeyPolicy, setSSHHostKeyPolicy] = useState('warn_new');
  const [sshDescription, setSSHDescription] = useState('');
  const [sshIcon, setSSHIcon] = useState(null);

  // --- RDP / VNC STATES ---
  const [rdpFormData, setRdpFormData] = useState(() => createDefaultRdpFormData());
  const [showRdpPassword, setShowRdpPassword] = useState(false);

  const [vncFormData, setVncFormData] = useState(() => createDefaultVncFormData());
  const [showVncPassword, setShowVncPassword] = useState(false);

  // --- FILE CONNECTION (SFTP/FTP/SCP) STATES ---
  const [fileProtocol, setFileProtocol] = useState('sftp');
  const [fileName, setFileName] = useState('');
  const [fileHost, setFileHost] = useState('');
  const [fileUser, setFileUser] = useState('');
  const [filePassword, setFilePassword] = useState('');
  const [filePort, setFilePort] = useState(22);
  const [fileRemoteFolder, setFileRemoteFolder] = useState('');
  const [fileTargetFolder, setFileTargetFolder] = useState('');

  // --- SSH TUNNEL STATES ---
  const [tunnelType, setTunnelType] = useState('local'); // local, remote, dynamic
  const [tunnelName, setTunnelName] = useState('');
  const [tunnelSshHost, setTunnelSshHost] = useState('');
  const [tunnelSshPort, setTunnelSshPort] = useState(22);
  const [tunnelSshUser, setTunnelSshUser] = useState('');
  const [tunnelAuthType, setTunnelAuthType] = useState('password');
  const [tunnelSshPassword, setTunnelSshPassword] = useState('');
  const [tunnelPrivateKeyPath, setTunnelPrivateKeyPath] = useState('');
  const [tunnelPassphrase, setTunnelPassphrase] = useState('');
  const [tunnelLocalHost, setTunnelLocalHost] = useState('127.0.0.1');
  const [tunnelLocalPort, setTunnelLocalPort] = useState('');
  const [tunnelRemoteHost, setTunnelRemoteHost] = useState('');
  const [tunnelRemotePort, setTunnelRemotePort] = useState('');
  const [tunnelBindHost, setTunnelBindHost] = useState('0.0.0.0');
  const [showTunnelPassword, setShowTunnelPassword] = useState(false);

  const isInitializedRef = useRef(false);

  // Cargar datos del nodo al montar o cambiar de nodo
  useEffect(() => {
    if (!node) return;
    isInitializedRef.current = false;

    if (connectionType === 'ssh') {
      const data = node.data || {};
      setSSHName(node.label || '');
      setSSHHost(data.bastionHost || data.host || '');
      setSSHUser(data.useBastionWallix ? data.bastionUser || '' : data.user || '');
      setSSHPassword(data.password || '');
      setSSHPort(data.port || 22);
      setSSHRemoteFolder(data.remoteFolder || '');
      // Buscar la carpeta padre real en el árbol de la sidebar
      const findParentKey = (list, targetKey, parentKey = null) => {
        for (const n of list) {
          if (n.key === targetKey) {
            return parentKey;
          }
          if (n.children && n.children.length > 0) {
            const found = findParentKey(n.children, targetKey, n.key);
            if (found !== null) return found;
          }
        }
        return null;
      };
      const parentKey = findParentKey(nodes, node.key);
      setSSHTargetFolder(parentKey || '');
      setSSHAuthMethod(data.authMethod || 'password');
      setSSHPrivateKey(data.privateKey || '');
      setSSHAutoCopyPassword(data.autoCopyPassword || false);
      setSSHX11Forwarding(data.x11Forwarding || false);
      setSSHAgentForwarding(data.agentForwarding || false);
      setSSHAutoRecording(data.autoRecording || false);
      setSSHProxyJumpEnabled(data.proxyJumpEnabled || false);
      setSSHJumpHost(data.jumpHost || '');
      setSSHJumpPort(data.jumpPort || 22);
      setSSHJumpUser(data.jumpUser || '');
      setSSHJumpAuthMethod(data.jumpAuthMethod || 'password');
      setSSHJumpPassword(data.jumpPassword || '');
      setSSHJumpPrivateKey(data.jumpPrivateKey || '');
      setSSHHostKeyPolicy(data.hostKeyPolicy || 'warn_new');
      setSSHDescription(data.description || '');
      setSSHIcon(data.customIcon || null);
    } 
    else if (connectionType === 'rdp') {
      setRdpFormData(mapEditNodeDataToRdpFormData(node));
    } 
    else if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
      setVncFormData(mapEditNodeDataToVncFormData(node));
    }
    else if (['sftp', 'ftp', 'scp'].includes(connectionType)) {
      const data = node.data || {};
      setFileName(node.label || '');
      setFileHost(data.host || '');
      setFileUser(data.user || data.username || '');
      setFilePassword(data.password || '');
      setFilePort(data.port || (connectionType === 'ftp' ? 21 : 22));
      setFileProtocol(connectionType);
      setFileRemoteFolder(data.remoteFolder || '');
      setFileTargetFolder(data.targetFolder || '');
    }
    else if (connectionType === 'ssh-tunnel') {
      const data = node.data || {};
      setTunnelType(data.tunnelType || 'local');
      setTunnelName(node.label || '');
      setTunnelSshHost(data.sshHost || '');
      setTunnelSshPort(data.sshPort || 22);
      setTunnelSshUser(data.sshUser || '');
      setTunnelAuthType(data.authType || 'password');
      setTunnelSshPassword(data.sshPassword || '');
      setTunnelPrivateKeyPath(data.privateKeyPath || '');
      setTunnelPassphrase(data.passphrase || '');
      setTunnelLocalHost(data.localHost || '127.0.0.1');
      setTunnelLocalPort(data.localPort || '');
      setTunnelRemoteHost(data.remoteHost || '');
      setTunnelRemotePort(data.remotePort || '');
      setTunnelBindHost(data.bindHost || '0.0.0.0');
    }

    const timer = setTimeout(() => {
      isInitializedRef.current = true;
    }, 150);

    return () => clearTimeout(timer);
  }, [node?.key, connectionType]);

  // Auto-guardado al editar cualquier campo
  useEffect(() => {
    if (!isInitializedRef.current || !isFormValid()) return;

    const saveTimeout = setTimeout(() => {
      if (connectionType === 'ssh') {
        const sshData = {
          name: sshName,
          host: sshHost,
          user: sshUser,
          password: sshPassword,
          port: sshPort,
          remoteFolder: sshRemoteFolder,
          authMethod: sshAuthMethod,
          privateKey: sshPrivateKey,
          autoCopyPassword: sshAutoCopyPassword,
          x11Forwarding: sshX11Forwarding,
          agentForwarding: sshAgentForwarding,
          autoRecording: sshAutoRecording,
          proxyJumpEnabled: sshProxyJumpEnabled,
          jumpHost: sshJumpHost,
          jumpPort: sshJumpPort,
          jumpUser: sshJumpUser,
          jumpAuthMethod: sshJumpAuthMethod,
          jumpPassword: sshJumpPassword,
          jumpPrivateKey: sshJumpPrivateKey,
          hostKeyPolicy: sshHostKeyPolicy,
          description: sshDescription,
          customIcon: sshIcon,
          targetFolder: sshTargetFolder
        };
        handleSaveSshToSidebar(sshData, true, node, true);
      }
      else if (connectionType === 'rdp') {
        handleSaveRdpToSidebar(rdpFormData, true, node, true);
      }
      else if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
        handleSaveVncToSidebar(vncFormData, true, node, true);
      }
      else if (['sftp', 'ftp', 'scp'].includes(connectionType)) {
        const fileData = {
          name: fileName,
          host: fileHost,
          username: fileUser,
          password: filePassword,
          port: filePort,
          protocol: fileProtocol,
          remoteFolder: fileRemoteFolder,
          targetFolder: fileTargetFolder
        };
        handleSaveFileConnectionToSidebar(fileData, true, node, true);
      }
      else if (connectionType === 'ssh-tunnel') {
        const tunnelData = {
          name: tunnelName,
          tunnelType: tunnelType,
          sshHost: tunnelSshHost,
          sshPort: tunnelSshPort,
          sshUser: tunnelSshUser,
          authType: tunnelAuthType,
          sshPassword: tunnelSshPassword,
          privateKeyPath: tunnelPrivateKeyPath,
          passphrase: tunnelPassphrase,
          localHost: tunnelLocalHost,
          localPort: parseInt(tunnelLocalPort) || 0,
          remoteHost: tunnelRemoteHost,
          remotePort: parseInt(tunnelRemotePort) || 0,
          bindHost: tunnelBindHost
        };
        handleSaveSSHTunnelToSidebar(tunnelData, true, node, true);
      }
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [
    sshName, sshHost, sshUser, sshPassword, sshPort, sshRemoteFolder, sshTargetFolder, sshAuthMethod, sshPrivateKey, sshAutoCopyPassword, sshX11Forwarding, sshAgentForwarding, sshAutoRecording, sshProxyJumpEnabled, sshJumpHost, sshJumpPort, sshJumpUser, sshJumpAuthMethod, sshJumpPassword, sshJumpPrivateKey, sshHostKeyPolicy, sshDescription, sshIcon,
    rdpFormData,
    vncFormData,
    fileName, fileHost, fileUser, filePassword, filePort, fileProtocol, fileRemoteFolder, fileTargetFolder,
    tunnelName, tunnelType, tunnelSshHost, tunnelSshPort, tunnelSshUser, tunnelAuthType, tunnelSshPassword, tunnelPrivateKeyPath, tunnelPassphrase, tunnelLocalHost, tunnelLocalPort, tunnelRemoteHost, tunnelRemotePort, tunnelBindHost
  ]);

  // Handlers para RDP/VNC
  const handleRdpTextChange = useCallback((field) => (event) => {
    setRdpFormData((previous) => ({ ...previous, [field]: event.target.value }));
  }, []);

  const handleRdpInputChange = useCallback((field, value) => {
    setRdpFormData((previous) => ({ ...previous, [field]: value }));
  }, []);

  const applyRdpFormPatch = useCallback((patch) => {
    setRdpFormData((previous) => ({ ...previous, ...patch }));
  }, []);

  const handleRdpSelectFolder = useCallback(async () => {
    try {
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: t('rdp.tooltips.selectFolder')
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setRdpFormData((previous) => ({ ...previous, guacDriveHostDir: result.filePaths[0] }));
      }
    } catch (error) {
      console.error('Error al abrir selector de carpeta:', error);
    }
  }, [t]);

  const handleVncTextChange = useCallback((field) => (event) => {
    setVncFormData((previous) => ({ ...previous, [field]: event.target.value }));
  }, []);

  const handleVncInputChange = useCallback((field, value) => {
    setVncFormData((previous) => ({ ...previous, [field]: value }));
  }, []);

  // Confirmación
  const handleSave = (e) => {
    if (e) e.preventDefault();

    if (connectionType === 'ssh') {
      const sshData = {
        name: sshName,
        host: sshHost,
        user: sshUser,
        password: sshPassword,
        port: sshPort,
        remoteFolder: sshRemoteFolder,
        authMethod: sshAuthMethod,
        privateKey: sshPrivateKey,
        autoCopyPassword: sshAutoCopyPassword,
        x11Forwarding: sshX11Forwarding,
        agentForwarding: sshAgentForwarding,
        autoRecording: sshAutoRecording,
        proxyJumpEnabled: sshProxyJumpEnabled,
        jumpHost: sshJumpHost,
        jumpPort: sshJumpPort,
        jumpUser: sshJumpUser,
        jumpAuthMethod: sshJumpAuthMethod,
        jumpPassword: sshJumpPassword,
        jumpPrivateKey: sshJumpPrivateKey,
        hostKeyPolicy: sshHostKeyPolicy,
        description: sshDescription,
        customIcon: sshIcon,
        targetFolder: sshTargetFolder
      };
      handleSaveSshToSidebar(sshData, true, node);
      handleTabClose(tab.key);
    }
    else if (connectionType === 'rdp') {
      if (!isRdpFormValid(rdpFormData)) return;
      handleSaveRdpToSidebar(rdpFormData, true, node);
      handleTabClose(tab.key);
    }
    else if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
      if (!isVncFormValid(vncFormData)) return;
      handleSaveVncToSidebar(vncFormData, true, node);
      handleTabClose(tab.key);
    }
    else if (['sftp', 'ftp', 'scp'].includes(connectionType)) {
      if (!fileName.trim() || !fileHost.trim() || !fileUser.trim()) return;
      const fileData = {
        name: fileName,
        host: fileHost,
        username: fileUser,
        password: filePassword,
        port: filePort,
        protocol: fileProtocol,
        remoteFolder: fileRemoteFolder,
        targetFolder: fileTargetFolder
      };
      handleSaveFileConnectionToSidebar(fileData, true, node);
      handleTabClose(tab.key);
    }
    else if (connectionType === 'ssh-tunnel') {
      if (!tunnelName || !tunnelSshHost || !tunnelSshUser) return;
      const tunnelData = {
        name: tunnelName,
        tunnelType: tunnelType,
        sshHost: tunnelSshHost,
        sshPort: tunnelSshPort,
        sshUser: tunnelSshUser,
        authType: tunnelAuthType,
        sshPassword: tunnelSshPassword,
        privateKeyPath: tunnelPrivateKeyPath,
        passphrase: tunnelPassphrase,
        localHost: tunnelLocalHost,
        localPort: parseInt(tunnelLocalPort) || 0,
        remoteHost: tunnelRemoteHost,
        remotePort: parseInt(tunnelRemotePort) || 0,
        bindHost: tunnelBindHost
      };
      handleSaveSSHTunnelToSidebar(tunnelData, true, node);
      handleTabClose(tab.key);
    }
  };

  const handleCancel = () => {
    handleTabClose(tab.key);
  };

  const folderOptionsList = useMemo(() => getAllFolders(nodes), [nodes]);

  const renderForm = () => {
    switch (connectionType) {
      case 'ssh':
        return (
          <EnhancedSSHForm
            activeTabIndex={0}
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
            foldersOptions={folderOptionsList}
            onSSHConfirm={handleSave}
            onHide={handleCancel}
            isEditMode
            layoutMode={layoutMode}
            hideFooter={true}
          />
        );

      case 'rdp':
        return (
          <EnhancedRDPForm
            formData={rdpFormData}
            handleTextChange={handleRdpTextChange}
            handleInputChange={handleRdpInputChange}
            applyFormPatch={applyRdpFormPatch}
            showPassword={showRdpPassword}
            setShowPassword={setShowRdpPassword}
            onSelectFolder={handleRdpSelectFolder}
            isEditMode
            onHide={handleCancel}
            onSubmit={handleSave}
            idPrefix="tab-edit-rdp"
            layoutMode={layoutMode}
            hideFooter={true}
          />
        );

      case 'vnc':
      case 'vnc-guacamole':
        return (
          <EnhancedVNCForm
            formData={vncFormData}
            handleTextChange={handleVncTextChange}
            handleInputChange={handleVncInputChange}
            showPassword={showVncPassword}
            setShowPassword={setShowVncPassword}
            isEditMode
            onHide={handleCancel}
            onSubmit={handleSave}
            idPrefix="tab-edit-vnc"
            layoutMode={layoutMode}
            hideFooter={true}
          />
        );

      case 'sftp':
      case 'ftp':
      case 'scp':
        return (
          <div className="p-fluid">
            <Card title={`🔗 ${t('fileConnection.sections.connection')}`} className="mb-2" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
              <div className={(layoutMode === 'split' || layoutMode === 'sidebar') ? "grid" : "formgrid grid"}>
                <div className={(layoutMode === 'split' || layoutMode === 'sidebar') ? "col-6" : "col-12"} style={{ padding: '0 0.5rem' }}>
                  <div className="field col-12" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="file-name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>{t('fileConnection.fields.name')} *</label>
                    <InputText
                      id="file-name"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder={t('fileConnection.placeholders.name')}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="grid col-12" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0 0.5rem', marginBottom: '1rem' }}>
                    <div className="field">
                      <label htmlFor="file-protocol" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>{t('fileConnection.fields.protocol')} *</label>
                      <Dropdown
                        id="file-protocol"
                        value={fileProtocol}
                        options={[
                          { label: t('fileConnection.protocols.sftp'), value: 'sftp' },
                          { label: t('fileConnection.protocols.ftp'), value: 'ftp' },
                          { label: t('fileConnection.protocols.scp'), value: 'scp' }
                        ]}
                        onChange={(e) => {
                          setFileProtocol(e.value);
                          setFilePort(e.value === 'ftp' ? 21 : 22);
                        }}
                        placeholder={tCommon('labels.select')}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="file-host" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>{t('fileConnection.fields.host')} *</label>
                      <InputText
                        id="file-host"
                        value={fileHost}
                        onChange={(e) => setFileHost(e.target.value)}
                        placeholder={t('fileConnection.placeholders.host')}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="grid col-12" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0 0.5rem', marginBottom: '1rem' }}>
                    <div className="field">
                      <label htmlFor="file-user" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>{t('fileConnection.fields.user')} *</label>
                      <InputText
                        id="file-user"
                        value={fileUser}
                        onChange={(e) => setFileUser(e.target.value)}
                        placeholder={t('fileConnection.placeholders.user')}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="file-port" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>{t('fileConnection.fields.port')}</label>
                      <InputText
                        id="file-port"
                        type="number"
                        value={filePort}
                        onChange={(e) => setFilePort(parseInt(e.target.value) || (fileProtocol === 'ftp' ? 21 : 22))}
                        placeholder={fileProtocol === 'ftp' ? '21' : '22'}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                <div className={(layoutMode === 'split' || layoutMode === 'sidebar') ? "col-6" : "col-12"} style={{ padding: '0 0.5rem' }}>
                  <div className="field col-12" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="file-password" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>{t('fileConnection.fields.password')}</label>
                    <InputText
                      id="file-password"
                      type="password"
                      value={filePassword}
                      onChange={(e) => setFilePassword(e.target.value)}
                      placeholder={t('fileConnection.placeholders.password')}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="file-remote-folder" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>{t('fileConnection.fields.remoteFolder')} ({tCommon('labels.optional')})</label>
                    <InputText
                      id="file-remote-folder"
                      value={fileRemoteFolder}
                      onChange={(e) => setFileRemoteFolder(e.target.value)}
                      placeholder={t('fileConnection.placeholders.remoteFolder')}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="field col-12" style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="file-target-folder" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>{t('fileConnection.fields.targetFolder')} ({tCommon('labels.optional')})</label>
                    <Dropdown
                      id="file-target-folder"
                      value={fileTargetFolder}
                      options={folderOptionsList}
                      onChange={(e) => setFileTargetFolder(e.value)}
                      placeholder={tCommon('labels.select')}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      case 'ssh-tunnel':
        return (
          <div className="p-fluid">
            <div style={{ display: 'grid', gridTemplateColumns: layoutMode === 'standard' ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
              {/* Configuración Local */}
              <div>
                <h4 style={{ marginBottom: '1rem', color: 'var(--ui-dialog-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="pi pi-home" style={{ color: 'var(--ui-button-primary)' }}></i>
                  {tunnelType === 'remote' ? 'Servidor Local' : 'Configuración Local'}
                </h4>

                <div className="field" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="tunnelName" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Nombre *</label>
                  <InputText
                    id="tunnelName"
                    value={tunnelName}
                    onChange={(e) => setTunnelName(e.target.value)}
                    placeholder="Mi túnel SSH"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="field" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Tipo de túnel</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                      <RadioButton
                        inputId="tunnel-local"
                        value="local"
                        checked={tunnelType === 'local'}
                        onChange={(e) => setTunnelType(e.value)}
                      />
                      <span>Local (-L)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                      <RadioButton
                        inputId="tunnel-remote"
                        value="remote"
                        checked={tunnelType === 'remote'}
                        onChange={(e) => setTunnelType(e.value)}
                      />
                      <span>Remoto (-R)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                      <RadioButton
                        inputId="tunnel-dynamic"
                        value="dynamic"
                        checked={tunnelType === 'dynamic'}
                        onChange={(e) => setTunnelType(e.value)}
                      />
                      <span>Dinámico (SOCKS)</span>
                    </label>
                  </div>
                </div>

                {tunnelType === 'remote' && (
                  <div className="field" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="localHost" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Servidor Local</label>
                    <InputText
                      id="localHost"
                      value={tunnelLocalHost}
                      onChange={(e) => setTunnelLocalHost(e.target.value)}
                      placeholder="127.0.0.1"
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                <div className="field" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="localPort" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
                    {tunnelType === 'dynamic' ? 'Puerto SOCKS *' : 'Puerto Local *'}
                  </label>
                  <InputText
                    id="localPort"
                    type="number"
                    value={tunnelLocalPort}
                    onChange={(e) => setTunnelLocalPort(e.target.value)}
                    placeholder={tunnelType === 'dynamic' ? '1080' : '8080'}
                    style={{ width: '100%' }}
                  />
                </div>

                {tunnelType === 'local' && (
                  <>
                    <div className="field" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="remoteHost" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Host remoto *</label>
                      <InputText
                        id="remoteHost"
                        value={tunnelRemoteHost}
                        onChange={(e) => setTunnelRemoteHost(e.target.value)}
                        placeholder="database.internal"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="remotePort" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Puerto remoto *</label>
                      <InputText
                        id="remotePort"
                        type="number"
                        value={tunnelRemotePort}
                        onChange={(e) => setTunnelRemotePort(e.target.value)}
                        placeholder="3306"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                )}

                {tunnelType === 'remote' && (
                  <div className="field" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="remotePort" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Puerto reenviado (en servidor SSH) *</label>
                    <InputText
                      id="remotePort"
                      type="number"
                      value={tunnelRemotePort}
                      onChange={(e) => setTunnelRemotePort(e.target.value)}
                      placeholder="8080"
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </div>

              {/* Servidor SSH */}
              <div>
                <h4 style={{ marginBottom: '1rem', color: 'var(--ui-dialog-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="pi pi-server" style={{ color: 'var(--ui-button-primary)' }}></i>
                  Servidor SSH
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="field">
                    <label htmlFor="sshHost" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Servidor SSH *</label>
                    <InputText
                      id="sshHost"
                      value={tunnelSshHost}
                      onChange={(e) => setTunnelSshHost(e.target.value)}
                      placeholder="ssh.ejemplo.com"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sshPort" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Puerto</label>
                    <InputText
                      id="sshPort"
                      type="number"
                      value={tunnelSshPort}
                      onChange={(e) => setTunnelSshPort(e.target.value)}
                      placeholder="22"
                      style={{ width: '80px' }}
                    />
                  </div>
                </div>

                <div className="field" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="sshUser" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Usuario SSH *</label>
                  <InputText
                    id="sshUser"
                    value={tunnelSshUser}
                    onChange={(e) => setTunnelSshUser(e.target.value)}
                    placeholder="root"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="field" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Autenticación</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                      <RadioButton
                        inputId="tunnel-auth-password"
                        value="password"
                        checked={tunnelAuthType === 'password'}
                        onChange={(e) => setTunnelAuthType(e.value)}
                      />
                      <span>Contraseña</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                      <RadioButton
                        inputId="tunnel-auth-key"
                        value="key"
                        checked={tunnelAuthType === 'key'}
                        onChange={(e) => setTunnelAuthType(e.value)}
                      />
                      <span>Clave privada</span>
                    </label>
                  </div>
                </div>

                {tunnelAuthType === 'password' ? (
                  <div className="field" style={{ marginBottom: '1rem' }}>
                    <label htmlFor="sshPassword" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Contraseña *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <InputText
                        id="sshPassword"
                        type={showTunnelPassword ? 'text' : 'password'}
                        value={tunnelSshPassword}
                        onChange={(e) => setTunnelSshPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="button"
                        icon={showTunnelPassword ? 'pi pi-eye-slash' : 'pi pi-eye'}
                        className="p-button-outlined"
                        onClick={() => setShowTunnelPassword(!showTunnelPassword)}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="field" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="privateKeyPath" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Ruta clave privada *</label>
                      <InputText
                        id="privateKeyPath"
                        value={tunnelPrivateKeyPath}
                        onChange={(e) => setTunnelPrivateKeyPath(e.target.value)}
                        placeholder="C:\Users\...\.ssh\id_rsa"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: '1rem' }}>
                      <label htmlFor="passphrase" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Passphrase (opcional)</label>
                      <InputText
                        id="passphrase"
                        type="password"
                        value={tunnelPassphrase}
                        onChange={(e) => setTunnelPassphrase(e.target.value)}
                        placeholder="••••••••"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center p-4">
            <p>Tipo de conexión no soportado en pestañas: {connectionType}</p>
            <Button label="Cerrar" onClick={handleCancel} />
          </div>
        );
    }
  };

  return (
    <div
      className="edit-connection-tab-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--ui-content-bg, #1a1b26)'
      }}
    >
      {/* Header bar */}
      <div
        className="tab-edit-header"
        style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          background: 'rgba(0, 0, 0, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #89b4fa 0%, #cba6f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.1rem',
              boxShadow: '0 4px 12px rgba(137, 180, 250, 0.25)'
            }}
          >
            <i className="pi pi-pencil"></i>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--ui-dialog-text, #cdd6f4)' }}>
              Editar Conexión
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--ui-dialog-text, #cdd6f4)', opacity: 0.5 }}>
              {connectionType?.toUpperCase()} : {node?.label}
            </span>
          </div>
        </div>

        {/* Action Buttons and Layout Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* PROBAR CONEXIÓN */}
          {connectionType === 'ssh' && (
            <button
              type="button"
              className="terminal-btn-outline"
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: isTesting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s ease'
              }}
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              <i className={`pi ${isTesting ? 'pi-spin pi-spinner' : 'pi-sync'}`}></i>
              {isTesting ? 'PROBANDO...' : 'PROBAR CONEXIÓN'}
            </button>
          )}

          {/* GUARDAR */}
          <button
            type="button"
            className="terminal-btn-outline terminal-btn-submit"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              background: isFormValid() ? 'var(--ui-button-primary, #6366f1)' : 'rgba(255, 255, 255, 0.08)',
              color: isFormValid() ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
              cursor: isFormValid() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease',
              boxShadow: isFormValid() ? '0 2px 8px rgba(99, 102, 241, 0.25)' : 'none'
            }}
            onClick={handleSave}
            disabled={!isFormValid()}
          >
            <i className="pi pi-save"></i> GUARDAR
          </button>

          {/* Layout switcher: single toggle button */}
          <button
            onClick={() => changeLayoutMode(layoutMode === 'sidebar' ? 'split' : 'sidebar')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease'
            }}
            title={layoutMode === 'sidebar' ? 'Cambiar a Columnas' : 'Cambiar a Lateral'}
          >
            <i className={`pi ${layoutMode === 'sidebar' ? 'pi-th-large' : 'pi-clone'}`} style={{ fontSize: '0.85rem' }}></i>
            <span>{layoutMode === 'sidebar' ? 'Columnas' : 'Lateral'}</span>
          </button>
        </div>
      </div>

      {/* Form Area */}
      <div
        className="tab-edit-body"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}
      >
        <div
          style={{
            maxWidth: layoutMode === 'standard' ? '720px' : (layoutMode === 'sidebar' ? '100%' : '1100px'),
            width: '100%',
            margin: '0 auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            transition: 'max-width 0.25s ease'
          }}
        >
          {renderForm()}
        </div>
      </div>
    </div>
  );
}
