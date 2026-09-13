import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { RadioButton } from 'primereact/radiobutton';
import { Dropdown } from 'primereact/dropdown';
import { Card } from 'primereact/card';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { getAllFolders } from '../utils/treeFolders';
import connectionStore, { isFavorite, toggleFavorite, helpers as connectionHelpers, onUpdate as onFavoritesUpdate } from '../utils/connectionStore';
import { writeText as clipboardWriteText } from '../utils/clipboard';

// Importar los formularios existentes
import { EnhancedSSHForm } from './Dialogs';
import { EnhancedRDPForm, createDefaultRdpFormData, mapEditNodeDataToRdpFormData, isRdpFormValid } from './EnhancedRDPForm';
import { EnhancedVNCForm, createDefaultVncFormData, mapEditNodeDataToVncFormData, isVncFormValid } from './EnhancedVNCForm';
import { TunnelDiagram } from './SSHTunnelDialog';

export default function EditConnectionTabContent({
  tab,
  nodes = [],
  handleSaveSshToSidebar,
  handleSaveRdpToSidebar,
  handleSaveVncToSidebar,
  handleSaveFileConnectionToSidebar,
  handleSaveSSHTunnelToSidebar,
  onOpenSSHConnection,
  onOpenRdpConnection,
  onOpenVncConnection,
  onOpenFileConnection,
  onOpenSSHTunnel,
  handleTabClose,
  iconTheme = 'material'
}) {
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');

  const node = tab?.node;
  const connectionType = node?.data?.type || node?.type;
  const isNewConnection = !!(node?.isNew || !node?.key || String(node?.key).startsWith('temp_'));

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

  // Status Pill feedback (non-blocking, replaces alert)
  const [testStatus, setTestStatus] = useState(null); // { type: 'testing' | 'success' | 'error' | 'copied', message: string }
  const statusTimerRef = useRef(null);

  const setTimedStatus = useCallback((statusObj, duration = 4000) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setTestStatus(statusObj);
    if (duration > 0) {
      statusTimerRef.current = setTimeout(() => {
        setTestStatus(null);
      }, duration);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTimedStatus({ type: 'testing', message: 'Probando conectividad...' }, 0);
    try {
      if (connectionType === 'ssh') {
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
          setTimedStatus({ type: 'success', message: '¡Conexión SSH establecida con éxito!' }, 4000);
        } else {
          setTimedStatus({ type: 'error', message: `Fallo SSH: ${result.error || 'No se pudo conectar'}` }, 6000);
        }
      } else {
        const targetHost = connectionType === 'rdp' ? (rdpFormData?.server || rdpFormData?.host)
          : (connectionType === 'vnc' || connectionType === 'vnc-guacamole') ? (vncFormData?.server || vncFormData?.host)
          : ['sftp', 'ftp', 'scp'].includes(connectionType) ? fileHost
          : tunnelSshHost;

        if (!targetHost || !targetHost.trim()) {
          setTimedStatus({ type: 'error', message: 'Indica un host antes de probar la conexión' }, 4000);
          setIsTesting(false);
          return;
        }

        const result = await window.electron.ipcRenderer.invoke('network-tools:ping', { host: targetHost.trim(), count: 2, timeout: 3 });
        if (result && result.success) {
          const avgTime = result.avgTime != null ? ` (${result.avgTime} ms)` : '';
          setTimedStatus({ type: 'success', message: `¡Host accesible!${avgTime}` }, 4000);
        } else {
          setTimedStatus({ type: 'error', message: result?.error || 'Host no responde al ping' }, 6000);
        }
      }
    } catch (error) {
      setTimedStatus({ type: 'error', message: `Error: ${error.message || error}` }, 6000);
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
  const [activeFileFormTab, setActiveFileFormTab] = useState('general');
  const [showFilePassword, setShowFilePassword] = useState(false);

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
  const [activeTunnelFormTab, setActiveTunnelFormTab] = useState('local');

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
    if (!isInitializedRef.current || !isFormValid() || node?.isNew) return;

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

  // --- FAVORITES HANDLING ---
  const [isFav, setIsFav] = useState(false);

  const getCurrentConnectionObject = useCallback(() => {
    try {
      if (connectionType === 'ssh') {
        return connectionHelpers.toSerializable({
          type: 'ssh',
          name: sshName || node?.label || 'SSH',
          host: sshHost,
          username: sshUser,
          port: sshPort || 22,
          password: sshPassword,
          privateKey: sshPrivateKey,
          authMethod: sshAuthMethod,
          customIcon: sshIcon,
          targetFolder: sshTargetFolder,
          useBastionWallix: !!sshProxyJumpEnabled,
          bastionHost: sshJumpHost,
          bastionUser: sshJumpUser
        });
      } else if (connectionType === 'rdp') {
        return connectionHelpers.toSerializable({
          type: 'rdp-guacamole',
          name: rdpFormData?.name || node?.label || 'RDP',
          host: rdpFormData?.server || rdpFormData?.host,
          username: rdpFormData?.username,
          port: rdpFormData?.port || 3389,
          password: rdpFormData?.password,
          domain: rdpFormData?.domain
        });
      } else if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
        return connectionHelpers.toSerializable({
          type: vncFormData?.clientType === 'guacamole' ? 'vnc-guacamole' : 'vnc',
          name: vncFormData?.name || node?.label || 'VNC',
          host: vncFormData?.server || vncFormData?.host,
          username: vncFormData?.username || '',
          port: vncFormData?.port || 5900,
          password: vncFormData?.password || '',
          clientType: vncFormData?.clientType || 'web-vnc',
          explicitGuacamole: vncFormData?.clientType === 'guacamole'
        });
      } else if (['sftp', 'ftp', 'scp'].includes(connectionType)) {
        return connectionHelpers.toSerializable({
          type: fileProtocol || connectionType,
          name: fileName || node?.label || fileProtocol?.toUpperCase(),
          host: fileHost,
          username: fileUser,
          port: filePort || 22,
          password: filePassword
        });
      } else if (connectionType === 'ssh-tunnel') {
        return connectionHelpers.toSerializable({
          type: 'ssh-tunnel',
          name: tunnelName || node?.label || 'SSH Tunnel',
          sshHost: tunnelSshHost,
          sshUser: tunnelSshUser,
          sshPort: tunnelSshPort || 22,
          tunnelType: tunnelType,
          localPort: tunnelLocalPort,
          remotePort: tunnelRemotePort,
          remoteHost: tunnelRemoteHost
        });
      }
      return node ? connectionHelpers.fromSidebarNode(node) : null;
    } catch (_) {
      return null;
    }
  }, [
    connectionType, node, sshName, sshHost, sshUser, sshPort, sshPassword, sshPrivateKey, sshAuthMethod, sshIcon, sshTargetFolder, sshProxyJumpEnabled, sshJumpHost, sshJumpUser,
    rdpFormData, vncFormData, fileProtocol, fileName, fileHost, fileUser, filePort, filePassword,
    tunnelName, tunnelSshHost, tunnelSshUser, tunnelSshPort, tunnelType, tunnelLocalPort, tunnelRemotePort, tunnelRemoteHost
  ]);

  const updateFavoriteState = useCallback(() => {
    const conn = getCurrentConnectionObject();
    if (conn && isFavorite(conn)) {
      setIsFav(true);
      return;
    }
    if (node) {
      if (node.key && isFavorite(node.key)) {
        setIsFav(true);
        return;
      }
      const nodeConn = connectionHelpers.fromSidebarNode(node);
      if (nodeConn && isFavorite(nodeConn)) {
        setIsFav(true);
        return;
      }
    }
    setIsFav(false);
  }, [getCurrentConnectionObject, node]);

  useEffect(() => {
    updateFavoriteState();
    const unsub = onFavoritesUpdate(() => {
      updateFavoriteState();
    });
    return () => {
      if (unsub) unsub();
    };
  }, [updateFavoriteState]);

  const handleToggleFavorite = (e) => {
    if (e) e.stopPropagation();
    const conn = getCurrentConnectionObject() || (node ? connectionHelpers.fromSidebarNode(node) : null);
    if (!conn) return;

    toggleFavorite(conn);
    setIsFav(prev => !prev);
    setTimedStatus({
      type: 'success',
      message: isFav ? 'Quitado de Favoritos' : '★ ¡Añadido a Favoritos!'
    }, 2500);
  };

  // Helper metadata (defined before copy/duplicate handlers)
  const getHostAndUser = useCallback(() => {
    let host = '';
    let user = '';
    let port = '';

    if (connectionType === 'ssh') {
      host = sshHost || '';
      user = sshUser || '';
      port = sshPort && String(sshPort) !== '22' ? String(sshPort) : '';
    } else if (connectionType === 'rdp') {
      host = rdpFormData?.server || rdpFormData?.host || '';
      user = rdpFormData?.username || '';
      port = rdpFormData?.port && String(rdpFormData?.port) !== '3389' ? String(rdpFormData?.port) : '';
    } else if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
      host = vncFormData?.server || vncFormData?.host || '';
      user = vncFormData?.username || '';
      port = vncFormData?.port && String(vncFormData?.port) !== '5900' ? String(vncFormData?.port) : '';
    } else if (['sftp', 'ftp', 'scp'].includes(connectionType)) {
      host = fileHost || '';
      user = fileUser || '';
      port = filePort && String(filePort) !== '22' && String(filePort) !== '21' ? String(filePort) : '';
    } else if (connectionType === 'ssh-tunnel') {
      host = tunnelSshHost || '';
      user = tunnelSshUser || '';
      port = tunnelLocalPort ? `${tunnelLocalPort}` : '';
    }

    const hostDisplay = host ? `${host}${port ? ':' + port : ''}` : '';
    return { host: hostDisplay, user };
  }, [connectionType, sshHost, sshUser, sshPort, rdpFormData, vncFormData, fileHost, fileUser, filePort, tunnelSshHost, tunnelSshUser, tunnelLocalPort]);

  const currentHostValue = useCallback(() => {
    const { host } = getHostAndUser();
    return host;
  }, [getHostAndUser]);

  const currentConnectionName = useCallback(() => {
    if (connectionType === 'ssh') return sshName;
    if (connectionType === 'rdp') return rdpFormData?.name;
    if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') return vncFormData?.name;
    if (['sftp', 'ftp', 'scp'].includes(connectionType)) return fileName;
    if (connectionType === 'ssh-tunnel') return tunnelName;
    return node?.label || '';
  }, [connectionType, sshName, rdpFormData?.name, vncFormData?.name, fileName, tunnelName, node?.label]);

  const getProtocolMeta = useCallback(() => {
    switch (connectionType) {
      case 'ssh':
        return {
          icon: 'pi pi-terminal',
          avatarClass: 'avatar-ssh',
          badgeClass: 'badge-ssh',
          label: 'SSH',
          accentColor: '#10b981'
        };
      case 'rdp':
        return {
          icon: 'pi pi-desktop',
          avatarClass: 'avatar-rdp',
          badgeClass: 'badge-rdp',
          label: 'RDP',
          accentColor: '#3b82f6'
        };
      case 'vnc':
      case 'vnc-guacamole':
        return {
          icon: 'pi pi-eye',
          avatarClass: 'avatar-vnc',
          badgeClass: 'badge-vnc',
          label: 'VNC',
          accentColor: '#f59e0b'
        };
      case 'sftp':
      case 'ftp':
      case 'scp':
        return {
          icon: connectionType === 'scp' ? 'pi pi-send' : connectionType === 'ftp' ? 'pi pi-server' : 'pi pi-folder',
          avatarClass: 'avatar-sftp',
          badgeClass: 'badge-sftp',
          label: (fileProtocol || connectionType).toUpperCase(),
          accentColor: '#8b5cf6'
        };
      case 'ssh-tunnel':
        return {
          icon: 'pi pi-share-alt',
          avatarClass: 'avatar-tunnel',
          badgeClass: 'badge-tunnel',
          label: 'TÚNEL SSH',
          accentColor: '#06b6d4'
        };
      default:
        return {
          icon: 'pi pi-server',
          avatarClass: 'avatar-ssh',
          badgeClass: 'badge-ssh',
          label: connectionType?.toUpperCase() || 'CONEXIÓN',
          accentColor: '#6366f1'
        };
    }
  }, [connectionType, fileProtocol]);

  // --- QUICK COPY COMMAND / URI ---
  const handleCopyCommand = (e) => {
    if (e) e.stopPropagation();
    let cmd = '';
    if (connectionType === 'ssh') {
      const portPart = sshPort && String(sshPort) !== '22' ? ` -p ${sshPort}` : '';
      const userPart = sshUser ? `${sshUser}@` : '';
      cmd = `ssh ${userPart}${sshHost || 'host'}${portPart}`;
    } else if (connectionType === 'rdp') {
      const host = rdpFormData?.server || rdpFormData?.host || '';
      const port = rdpFormData?.port ? `:${rdpFormData.port}` : '';
      const user = rdpFormData?.username ? `${rdpFormData.username}@` : '';
      cmd = `rdp://${user}${host}${port}`;
    } else if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
      const host = vncFormData?.server || vncFormData?.host || '';
      const port = vncFormData?.port ? `:${vncFormData.port}` : '';
      cmd = `vnc://${host}${port}`;
    } else if (['sftp', 'ftp', 'scp'].includes(connectionType)) {
      const proto = fileProtocol || connectionType;
      const port = filePort && String(filePort) !== '22' ? `:${filePort}` : '';
      const user = fileUser ? `${fileUser}@` : '';
      cmd = `${proto}://${user}${fileHost || 'host'}${port}`;
    } else if (connectionType === 'ssh-tunnel') {
      cmd = `ssh -L ${tunnelLocalPort || 8080}:${tunnelRemoteHost || 'localhost'}:${tunnelRemotePort || 80} ${tunnelSshUser ? tunnelSshUser + '@' : ''}${tunnelSshHost || 'bastion'}`;
    }

    if (cmd) {
      navigator.clipboard.writeText(cmd).then(() => {
        setTimedStatus({ type: 'copied', message: `¡Comando copiado!` }, 2500);
      }).catch(() => {
        setTimedStatus({ type: 'copied', message: cmd }, 3000);
      });
    }
  };

  const handleCopyHost = (e) => {
    if (e) e.stopPropagation();
    const host = currentHostValue();
    if (host) {
      navigator.clipboard.writeText(host).then(() => {
        setTimedStatus({ type: 'copied', message: `Host copiado: ${host}` }, 2000);
      });
    }
  };

  // --- QUICK COPY PASSWORD ---
  const getCurrentPassword = useCallback(() => {
    if (connectionType === 'ssh') {
      return sshPassword || (node?.data?.password || '');
    }
    if (connectionType === 'rdp') {
      return rdpFormData?.password || (node?.data?.password || '');
    }
    if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
      return vncFormData?.password || (node?.data?.password || '');
    }
    if (['sftp', 'ftp', 'scp'].includes(connectionType)) {
      return filePassword || (node?.data?.password || '');
    }
    if (connectionType === 'ssh-tunnel') {
      return tunnelSshPassword || tunnelPassphrase || (node?.data?.sshPassword || node?.data?.password || '');
    }
    return node?.data?.password || '';
  }, [connectionType, sshPassword, rdpFormData?.password, vncFormData?.password, filePassword, tunnelSshPassword, tunnelPassphrase, node?.data]);

  const hasPassword = Boolean(getCurrentPassword() && String(getCurrentPassword()).trim());

  const handleCopyPassword = async (e) => {
    if (e) e.stopPropagation();
    const pass = getCurrentPassword();
    if (!pass) {
      setTimedStatus({ type: 'error', message: 'No hay contraseña configurada' }, 3000);
      return;
    }

    try {
      await clipboardWriteText(pass);
      setTimedStatus({ type: 'copied', message: '✓ ¡Contraseña copiada al portapapeles!' }, 2500);
    } catch (_) {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(pass).then(() => {
          setTimedStatus({ type: 'copied', message: '✓ ¡Contraseña copiada al portapapeles!' }, 2500);
        }).catch(() => {
          setTimedStatus({ type: 'error', message: 'No se pudo copiar la contraseña' }, 3000);
        });
      } else {
        setTimedStatus({ type: 'error', message: 'No se pudo copiar la contraseña' }, 3000);
      }
    }
  };

  // --- DUPLICATE CONNECTION ---
  const handleDuplicateConnection = (e) => {
    if (e) e.stopPropagation();
    if (!isFormValid()) {
      setTimedStatus({ type: 'error', message: 'Completa los campos obligatorios antes de duplicar' }, 3500);
      return;
    }

    if (connectionType === 'ssh') {
      const dupData = {
        name: `${sshName || 'SSH'} (Copia)`,
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
      handleSaveSshToSidebar(dupData, false, null);
      setTimedStatus({ type: 'success', message: '✓ Conexión duplicada en la barra lateral' }, 3000);
    } else if (connectionType === 'rdp') {
      const dupData = {
        ...rdpFormData,
        name: `${rdpFormData?.name || 'RDP'} (Copia)`
      };
      handleSaveRdpToSidebar(dupData, false, null);
      setTimedStatus({ type: 'success', message: '✓ Conexión duplicada en la barra lateral' }, 3000);
    } else if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
      const dupData = {
        ...vncFormData,
        name: `${vncFormData?.name || 'VNC'} (Copia)`
      };
      handleSaveVncToSidebar(dupData, false, null);
      setTimedStatus({ type: 'success', message: '✓ Conexión duplicada en la barra lateral' }, 3000);
    } else if (['sftp', 'ftp', 'scp'].includes(connectionType)) {
      const dupData = {
        name: `${fileName || 'Archivo'} (Copia)`,
        host: fileHost,
        username: fileUser,
        password: filePassword,
        port: filePort,
        protocol: fileProtocol,
        remoteFolder: fileRemoteFolder,
        targetFolder: fileTargetFolder
      };
      handleSaveFileConnectionToSidebar(dupData, false, null);
      setTimedStatus({ type: 'success', message: '✓ Conexión duplicada en la barra lateral' }, 3000);
    } else if (connectionType === 'ssh-tunnel') {
      const dupData = {
        name: `${tunnelName || 'Túnel'} (Copia)`,
        tunnelType,
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
      handleSaveSSHTunnelToSidebar(dupData, false, null);
      setTimedStatus({ type: 'success', message: '✓ Túnel duplicado en la barra lateral' }, 3000);
    }
  };

  // --- CLOSE TAB HELPER ---
  const closeCurrentTab = useCallback(() => {
    if (typeof handleTabClose === 'function') {
      handleTabClose(tab || tab?.key);
    }
    if (tab?.key) {
      window.dispatchEvent(new CustomEvent('close-tab', { detail: { tabKey: tab.key } }));
    }
  }, [handleTabClose, tab]);

  // --- CONNECT (Save & Launch) ---
  const handleConnect = (e) => {
    if (e) e.preventDefault();
    if (!isFormValid()) {
      setTimedStatus({ type: 'error', message: 'Por favor, completa los campos requeridos' }, 3500);
      return;
    }

    const isEdit = !isNewConnection;

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
      handleSaveSshToSidebar(sshData, isEdit, node);

      const connNode = {
        key: node?.key || `ssh_${Date.now()}`,
        label: sshName,
        type: 'ssh',
        data: {
          ...sshData,
          type: 'ssh'
        }
      };

      if (onOpenSSHConnection) {
        onOpenSSHConnection(connNode, nodes);
      }
      closeCurrentTab();
    }
    else if (connectionType === 'rdp') {
      if (!isRdpFormValid(rdpFormData)) return;
      handleSaveRdpToSidebar(rdpFormData, isEdit, node);

      const rdpNode = {
        key: node?.key || `rdp_${Date.now()}`,
        label: rdpFormData.name || rdpFormData.server || 'RDP',
        type: 'rdp-guacamole',
        data: {
          ...rdpFormData,
          type: 'rdp-guacamole'
        }
      };

      if (onOpenRdpConnection) {
        onOpenRdpConnection(rdpNode);
      } else {
        window.dispatchEvent(new CustomEvent('create-rdp-tab', {
          detail: { tab: { key: rdpNode.key, title: rdpNode.label, type: 'rdp', data: rdpNode.data, id: rdpNode.key } }
        }));
      }
      closeCurrentTab();
    }
    else if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
      if (!isVncFormValid(vncFormData)) return;
      handleSaveVncToSidebar(vncFormData, isEdit, node);

      const vncNode = {
        key: node?.key || `vnc_${Date.now()}`,
        label: vncFormData.name || vncFormData.server || 'VNC',
        type: 'vnc-guacamole',
        data: {
          ...vncFormData,
          type: 'vnc-guacamole'
        }
      };

      if (onOpenVncConnection) {
        onOpenVncConnection(vncNode, nodes);
      }
      closeCurrentTab();
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
      handleSaveFileConnectionToSidebar(fileData, isEdit, node);

      const fileNode = {
        key: node?.key || `file_${Date.now()}`,
        label: fileName,
        type: fileProtocol,
        data: {
          ...fileData,
          type: fileProtocol
        }
      };

      if (onOpenFileConnection) {
        onOpenFileConnection(fileNode, nodes);
      }
      closeCurrentTab();
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
      handleSaveSSHTunnelToSidebar(tunnelData, isEdit, node);

      const tunnelNode = {
        key: node?.key || `tunnel_${Date.now()}`,
        label: tunnelName,
        type: 'ssh-tunnel',
        data: {
          ...tunnelData,
          type: 'ssh-tunnel'
        }
      };

      if (onOpenSSHTunnel) {
        onOpenSSHTunnel(tunnelNode, nodes);
      }
      closeCurrentTab();
    }
  };

  // Confirmación
  const handleSave = (e) => {
    if (e) e.preventDefault();
    const isEdit = !isNewConnection;

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
      handleSaveSshToSidebar(sshData, isEdit, node);
      closeCurrentTab();
    }
    else if (connectionType === 'rdp') {
      if (!isRdpFormValid(rdpFormData)) return;
      handleSaveRdpToSidebar(rdpFormData, isEdit, node);
      closeCurrentTab();
    }
    else if (connectionType === 'vnc' || connectionType === 'vnc-guacamole') {
      if (!isVncFormValid(vncFormData)) return;
      handleSaveVncToSidebar(vncFormData, isEdit, node);
      closeCurrentTab();
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
      handleSaveFileConnectionToSidebar(fileData, isEdit, node);
      closeCurrentTab();
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
      handleSaveSSHTunnelToSidebar(tunnelData, isEdit, node);
      closeCurrentTab();
    }
  };

  const handleCancel = () => {
    closeCurrentTab();
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
      case 'scp': {
        const renderFileHostPort = () => (
          <div className="terminal-host-port-row mb-3">
            <div className="terminal-host-port-host">
              <label className="terminal-label">{t('fileConnection.fields.host').toUpperCase()} *</label>
              <div className="terminal-input-wrap">
                <i className="pi pi-server terminal-icon-left"></i>
                <InputText 
                  value={fileHost} 
                  onChange={(e) => setFileHost(e.target.value)}
                  placeholder={t('fileConnection.placeholders.host')}
                  className="terminal-input"
                />
              </div>
            </div>
            <div className="terminal-host-port-port">
              <label className="terminal-label">{t('fileConnection.fields.port').toUpperCase()}</label>
              <div className="terminal-input-wrap terminal-port-input-wrap">
                <InputText
                  value={filePort}
                  onChange={(e) => setFilePort(parseInt(e.target.value) || (fileProtocol === 'ftp' ? 21 : 22))}
                  placeholder={fileProtocol === 'ftp' ? '21' : '22'}
                  className="terminal-input terminal-port-input text-center"
                />
              </div>
            </div>
          </div>
        );

        const renderFileNameProtocol = () => (
          <>
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-info-circle" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Información General
              </span>
            </div>
            <div className="terminal-row grid grid-nogutter gap-3 mb-3">
              <div className="col">
                <label className="terminal-label">{t('fileConnection.fields.name').toUpperCase()} *</label>
                <div className="terminal-input-wrap">
                  <i className="pi pi-tag terminal-icon-left"></i>
                  <InputText 
                    value={fileName} 
                    onChange={(e) => setFileName(e.target.value)} 
                    placeholder={t('fileConnection.placeholders.name')} 
                    className="terminal-input" 
                  />
                </div>
              </div>
              <div className="col">
                <label className="terminal-label">{t('fileConnection.fields.protocol').toUpperCase()} *</label>
                <div className="terminal-input-wrap terminal-folder-dropdown-wrap">
                  <i className="pi pi-shield terminal-icon-left"></i>
                  <Dropdown
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
                    className="terminal-folder-dropdown"
                    panelClassName="terminal-folder-dropdown-panel"
                  />
                </div>
              </div>
            </div>
          </>
        );

        const renderFileUserPassword = () => (
          <div className="terminal-row mb-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))' }}>
            <div className="flex align-items-center gap-2 mb-2">
              <i className="pi pi-lock" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Autenticación
              </span>
            </div>
            <div className="grid grid-nogutter gap-3">
              <div className="col">
                <label className="terminal-label">{t('fileConnection.fields.user').toUpperCase()} *</label>
                <div className="terminal-input-wrap">
                  <i className="pi pi-user terminal-icon-left"></i>
                  <InputText 
                    value={fileUser} 
                    onChange={(e) => setFileUser(e.target.value)} 
                    placeholder={t('fileConnection.placeholders.user')} 
                    className="terminal-input" 
                  />
                </div>
              </div>
              <div className="col">
                <label className="terminal-label">{t('fileConnection.fields.password').toUpperCase()}</label>
                <div className="terminal-input-wrap">
                  <i className="pi pi-lock terminal-icon-left"></i>
                  <InputText
                    type={showFilePassword ? 'text' : 'password'}
                    value={filePassword}
                    onChange={(e) => setFilePassword(e.target.value)}
                    placeholder={t('fileConnection.placeholders.password')}
                    className="terminal-input"
                  />
                  <i
                    className={`pi ${showFilePassword ? 'pi-eye-slash' : 'pi-eye'} terminal-icon-right cursor-pointer`}
                    onClick={() => setShowFilePassword(!showFilePassword)}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        );

        const renderFileFolders = () => (
          <div>
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-folder" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Carpetas
              </span>
            </div>
            <div className="terminal-row mb-4">
              <label className="terminal-label">
                {t('fileConnection.fields.targetFolder').toUpperCase()}{' '}
                <span className="opacity-50">({tCommon('labels.optional').toUpperCase()})</span>
              </label>
              <div className="terminal-input-wrap terminal-folder-dropdown-wrap">
                <i className="pi pi-folder terminal-icon-left"></i>
                <Dropdown
                  value={fileTargetFolder}
                  options={folderOptionsList}
                  onChange={(e) => setFileTargetFolder(e.value)}
                  placeholder={tCommon('labels.select')}
                  showClear
                  filter
                  className="terminal-folder-dropdown"
                  panelClassName="terminal-folder-dropdown-panel"
                />
              </div>
            </div>

            <div className="terminal-row mb-4">
              <label className="terminal-label">
                {t('fileConnection.fields.remoteFolder').toUpperCase()}{' '}
                <span className="opacity-50">({tCommon('labels.optional').toUpperCase()})</span>
              </label>
              <div className="terminal-input-wrap">
                <i className="pi pi-folder-open terminal-icon-left"></i>
                <InputText
                  value={fileRemoteFolder}
                  onChange={(e) => setFileRemoteFolder(e.target.value)}
                  placeholder={t('fileConnection.placeholders.remoteFolder')}
                  className="terminal-input"
                />
              </div>
            </div>
          </div>
        );

        if (layoutMode === 'sidebar') {
          const sidebarTabs = [
            { id: 'general', label: 'General', icon: 'pi pi-info-circle' },
            { id: 'folders', label: 'Carpetas', icon: 'pi pi-folder' }
          ];

          return (
            <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="form-layout-sidebar" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', marginBottom: '1rem' }}>
                <div className="form-sidebar-nav">
                  {sidebarTabs.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`form-sidebar-nav-btn ${activeFileFormTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveFileFormTab(tab.id)}
                    >
                      <i className={tab.icon}></i>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
                <div className="form-sidebar-content" style={{ overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
                  {activeFileFormTab === 'general' && (
                    <div>
                      {renderFileNameProtocol()}
                      {renderFileHostPort()}
                      {renderFileUserPassword()}
                    </div>
                  )}
                  {activeFileFormTab === 'folders' && renderFileFolders()}
                </div>
              </div>
            </div>
          );
        }

        if (layoutMode === 'split') {
          return (
            <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="terminal-form-scroll-area" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
                <div className="grid" style={{ gap: '0', margin: 0 }}>
                  <div className="col-12 md:col-6" style={{ padding: '0 1rem 0 0' }}>
                    {renderFileNameProtocol()}
                    {renderFileHostPort()}
                    {renderFileUserPassword()}
                  </div>
                  
                  <div className="col-12 md:col-6" style={{ padding: '0 0 0 1rem', borderLeft: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))' }}>
                    {renderFileFolders()}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="terminal-form-scroll-area" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
              {renderFileNameProtocol()}
              {renderFileHostPort()}
              {renderFileUserPassword()}
              {renderFileFolders()}
            </div>
          </div>
        );
      }

      case 'ssh-tunnel': {
        const diagramConfig = {
          localHost: tunnelLocalHost,
          localPort: tunnelLocalPort || '????',
          remoteHost: tunnelRemoteHost || '<host>',
          remotePort: tunnelRemotePort || '????',
          sshHost: tunnelSshHost || '<SSH host>',
          sshPort: tunnelSshPort || 22
        };

        const renderDiagram = () => (
          <div className="tunnel-diagram-container mb-4" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))', background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem', maxWidth: '900px', margin: '0 auto 1.5rem auto' }}>
            <TunnelDiagram tunnelType={tunnelType} config={diagramConfig} />
          </div>
        );

        const renderTunnelLocalConfig = () => (
          <div>
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-home" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Configuración Local del Túnel
              </span>
            </div>
            <div className="terminal-row mb-3">
              <label className="terminal-label">NOMBRE DE CONEXIÓN *</label>
              <div className="terminal-input-wrap">
                <i className="pi pi-tag terminal-icon-left"></i>
                <InputText
                  value={tunnelName}
                  onChange={(e) => setTunnelName(e.target.value)}
                  placeholder="Mi túnel SSH"
                  className="terminal-input"
                />
              </div>
            </div>

            <div className="terminal-row mb-3">
              <label className="terminal-label">TIPO DE TÚNEL</label>
              <div className="terminal-auth-selector">
                <div
                  className={`terminal-auth-chip ${tunnelType === 'local' ? 'active' : ''}`}
                  onClick={() => setTunnelType('local')}
                >
                  Local (-L)
                </div>
                <div
                  className={`terminal-auth-chip ${tunnelType === 'remote' ? 'active' : ''}`}
                  onClick={() => setTunnelType('remote')}
                >
                  Remoto (-R)
                </div>
                <div
                  className={`terminal-auth-chip ${tunnelType === 'dynamic' ? 'active' : ''}`}
                  onClick={() => setTunnelType('dynamic')}
                >
                  Dinámico (SOCKS)
                </div>
              </div>
            </div>

            {tunnelType === 'remote' && (
              <div className="terminal-row mb-3">
                <label className="terminal-label">SERVIDOR LOCAL</label>
                <div className="terminal-input-wrap">
                  <i className="pi pi-desktop terminal-icon-left"></i>
                  <InputText
                    value={tunnelLocalHost}
                    onChange={(e) => setTunnelLocalHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className="terminal-input"
                  />
                </div>
              </div>
            )}

            <div className="terminal-row mb-3">
              <label className="terminal-label">
                {tunnelType === 'dynamic' ? 'PUERTO SOCKS *' : 'PUERTO LOCAL *'}
              </label>
              <div className="terminal-input-wrap">
                <i className="pi pi-hashtag terminal-icon-left"></i>
                <InputText
                  type="number"
                  value={tunnelLocalPort}
                  onChange={(e) => setTunnelLocalPort(e.target.value)}
                  placeholder={tunnelType === 'dynamic' ? '1080' : '8080'}
                  className="terminal-input"
                />
              </div>
            </div>

            {tunnelType === 'local' && (
              <div className="terminal-row grid grid-nogutter gap-3 mb-3">
                <div className="col">
                  <label className="terminal-label">HOST REMOTO *</label>
                  <div className="terminal-input-wrap">
                    <i className="pi pi-globe terminal-icon-left"></i>
                    <InputText
                      value={tunnelRemoteHost}
                      onChange={(e) => setTunnelRemoteHost(e.target.value)}
                      placeholder="database.internal"
                      className="terminal-input"
                    />
                  </div>
                </div>
                <div className="col">
                  <label className="terminal-label">PUERTO REMOTO *</label>
                  <div className="terminal-input-wrap">
                    <i className="pi pi-hashtag terminal-icon-left"></i>
                    <InputText
                      type="number"
                      value={tunnelRemotePort}
                      onChange={(e) => setTunnelRemotePort(e.target.value)}
                      placeholder="3306"
                      className="terminal-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {tunnelType === 'remote' && (
              <div className="terminal-row mb-3">
                <label className="terminal-label">PUERTO REENVIADO (EN SERVIDOR SSH) *</label>
                <div className="terminal-input-wrap">
                  <i className="pi pi-hashtag terminal-icon-left"></i>
                  <InputText
                    type="number"
                    value={tunnelRemotePort}
                    onChange={(e) => setTunnelRemotePort(e.target.value)}
                    placeholder="8080"
                    className="terminal-input"
                  />
                </div>
              </div>
            )}
          </div>
        );

        const renderTunnelSSHConfig = () => (
          <div>
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-server" style={{ color: 'var(--ui-button-primary, #6366f1)', fontSize: '0.85rem' }}></i>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-button-primary, #6366f1)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Servidor y Autenticación SSH
              </span>
            </div>
            <div className="terminal-host-port-row mb-3">
              <div className="terminal-host-port-host">
                <label className="terminal-label">SERVIDOR SSH *</label>
                <div className="terminal-input-wrap">
                  <i className="pi pi-server terminal-icon-left"></i>
                  <InputText
                    value={tunnelSshHost}
                    onChange={(e) => setTunnelSshHost(e.target.value)}
                    placeholder="ssh.ejemplo.com"
                    className="terminal-input"
                  />
                </div>
              </div>
              <div className="terminal-host-port-port">
                <label className="terminal-label">PUERTO</label>
                <div className="terminal-input-wrap terminal-port-input-wrap">
                  <InputText
                    type="number"
                    value={tunnelSshPort}
                    onChange={(e) => setTunnelSshPort(e.target.value)}
                    placeholder="22"
                    className="terminal-input terminal-port-input text-center"
                  />
                </div>
              </div>
            </div>

            <div className="terminal-row mb-3">
              <label className="terminal-label">USUARIO SSH *</label>
              <div className="terminal-input-wrap">
                <i className="pi pi-user terminal-icon-left"></i>
                <InputText
                  value={tunnelSshUser}
                  onChange={(e) => setTunnelSshUser(e.target.value)}
                  placeholder="root"
                  className="terminal-input"
                />
              </div>
            </div>

            <div className="terminal-row mb-3">
              <label className="terminal-label">AUTENTICACIÓN</label>
              <div className="terminal-auth-selector">
                <div
                  className={`terminal-auth-chip ${tunnelAuthType === 'password' ? 'active' : ''}`}
                  onClick={() => setTunnelAuthType('password')}
                >
                  <i className="pi pi-lock"></i> Contraseña
                </div>
                <div
                  className={`terminal-auth-chip ${tunnelAuthType === 'key' ? 'active' : ''}`}
                  onClick={() => setTunnelAuthType('key')}
                >
                  <i className="pi pi-key"></i> Clave privada
                </div>
              </div>
            </div>

            {tunnelAuthType === 'password' ? (
              <div className="terminal-row mb-3">
                <label className="terminal-label">CONTRASEÑA *</label>
                <div className="terminal-input-wrap">
                  <i className="pi pi-lock terminal-icon-left"></i>
                  <InputText
                    type={showTunnelPassword ? 'text' : 'password'}
                    value={tunnelSshPassword}
                    onChange={(e) => setTunnelSshPassword(e.target.value)}
                    placeholder="••••••••"
                    className="terminal-input"
                  />
                  <i
                    className={`pi ${showTunnelPassword ? 'pi-eye-slash' : 'pi-eye'} terminal-icon-right cursor-pointer`}
                    onClick={() => setShowTunnelPassword(!showTunnelPassword)}
                  ></i>
                </div>
              </div>
            ) : (
              <div>
                <div className="terminal-row mb-3">
                  <label className="terminal-label">RUTA CLAVE PRIVADA *</label>
                  <div className="terminal-input-wrap">
                    <i className="pi pi-file terminal-icon-left"></i>
                    <InputText
                      value={tunnelPrivateKeyPath}
                      onChange={(e) => setTunnelPrivateKeyPath(e.target.value)}
                      placeholder="C:\Users\...\.ssh\id_rsa"
                      className="terminal-input"
                    />
                  </div>
                </div>
                <div className="terminal-row mb-3">
                  <label className="terminal-label">PASSPHRASE (OPCIONAL)</label>
                  <div className="terminal-input-wrap">
                    <i className="pi pi-lock terminal-icon-left"></i>
                    <InputText
                      type="password"
                      value={tunnelPassphrase}
                      onChange={(e) => setTunnelPassphrase(e.target.value)}
                      placeholder="••••••••"
                      className="terminal-input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

        if (layoutMode === 'sidebar') {
          const sidebarTabs = [
            { id: 'local', label: 'Local', icon: 'pi pi-home' },
            { id: 'ssh', label: 'Servidor SSH', icon: 'pi pi-server' }
          ];

          return (
            <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="form-layout-sidebar" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', marginBottom: '1rem' }}>
                <div className="form-sidebar-nav">
                  {sidebarTabs.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`form-sidebar-nav-btn ${activeTunnelFormTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTunnelFormTab(tab.id)}
                    >
                      <i className={tab.icon}></i>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
                <div className="form-sidebar-content" style={{ overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
                  {renderDiagram()}
                  {activeTunnelFormTab === 'local' && renderTunnelLocalConfig()}
                  {activeTunnelFormTab === 'ssh' && renderTunnelSSHConfig()}
                </div>
              </div>
            </div>
          );
        }

        if (layoutMode === 'split') {
          return (
            <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="terminal-form-scroll-area" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
                {renderDiagram()}
                <div className="grid" style={{ gap: '0', margin: 0 }}>
                  <div className="col-12 md:col-6" style={{ padding: '0 1rem 0 0' }}>
                    <h4 style={{ marginBottom: '1.25rem', color: 'var(--ui-button-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                      <i className="pi pi-home"></i> CONFIGURACIÓN LOCAL
                    </h4>
                    {renderTunnelLocalConfig()}
                  </div>
                  
                  <div className="col-12 md:col-6" style={{ padding: '0 0 0 1rem', borderLeft: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.08))' }}>
                    <h4 style={{ marginBottom: '1.25rem', color: 'var(--ui-button-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                      <i className="pi pi-server"></i> SERVIDOR SSH
                    </h4>
                    {renderTunnelSSHConfig()}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="connection-terminal-form" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="terminal-form-scroll-area" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
              {renderDiagram()}
              <h4 style={{ marginBottom: '1.25rem', color: 'var(--ui-button-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                <i className="pi pi-home"></i> CONFIGURACIÓN LOCAL
              </h4>
              {renderTunnelLocalConfig()}
              <h4 style={{ marginBottom: '1.25rem', marginTop: '1.5rem', color: 'var(--ui-button-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                <i className="pi pi-server"></i> SERVIDOR SSH
              </h4>
              {renderTunnelSSHConfig()}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="text-center p-4">
            <p>Tipo de conexión no soportado en pestañas: {connectionType}</p>
            <Button label="Cerrar" onClick={handleCancel} />
          </div>
        );
    }
  };

  const protocolMeta = getProtocolMeta();
  const currentConnName = currentConnectionName();
  const { host: hostDisplay, user: userDisplay } = getHostAndUser();

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
          '--header-accent-color': protocolMeta.accentColor || 'rgba(99, 102, 241, 0.45)'
        }}
      >
        {/* Left: Identity & Metadata */}
        <div className="tab-edit-header-identity">
          {/* Protocol Avatar Badge */}
          <div
            className={`header-protocol-avatar ${protocolMeta.avatarClass}`}
            title={`Protocolo: ${protocolMeta.label}`}
          >
            <i className={protocolMeta.icon}></i>
          </div>

          {/* Title */}
          <span className="tab-edit-header-title" title={currentConnName || (isNewConnection ? 'Nueva Conexión' : 'Editar Conexión')}>
            {currentConnName || (isNewConnection ? 'Nueva Conexión' : 'Editar Conexión')}
          </span>

          {/* Protocol Pill */}
          <span className={`protocol-pill-badge ${protocolMeta.badgeClass}`}>
            {protocolMeta.label}
          </span>

          {/* Favorite Star Button */}
          <button
            type="button"
            className={`btn-header-fav-star ${isFav ? 'is-favorite' : ''}`}
            onClick={handleToggleFavorite}
            title={isFav ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
            aria-label={isFav ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
          >
            <i className={`pi ${isFav ? 'pi-star-fill' : 'pi-star'}`}></i>
          </button>

          {/* Separator and Host/User info */}
          {(hostDisplay || userDisplay) && <span className="header-meta-sep"></span>}

          {hostDisplay && (
            <span
              className="connection-host-chip"
              onClick={handleCopyHost}
              title="Clic para copiar dirección host"
            >
              <i className="pi pi-server"></i>
              <span>{hostDisplay}</span>
            </span>
          )}

          {userDisplay && (
            <span className="connection-user-chip" title={`Usuario: ${userDisplay}`}>
              <i className="pi pi-user"></i>
              <span>{userDisplay}</span>
            </span>
          )}
        </div>

        {/* Center: Inline Status / Notification Pill */}
        {testStatus && (
          <div className={`header-status-pill status-${testStatus.type}`}>
            <i className={`pi ${
              testStatus.type === 'testing' ? 'pi-spin pi-spinner' :
              testStatus.type === 'success' ? 'pi-check-circle' :
              testStatus.type === 'copied' ? 'pi-check' : 'pi-exclamation-triangle'
            }`}></i>
            <span>{testStatus.message}</span>
            {testStatus.type !== 'testing' && (
              <i
                className="pi pi-times status-pill-dismiss"
                onClick={() => setTestStatus(null)}
                title="Descartar"
                style={{ cursor: 'pointer', fontSize: '0.7rem', opacity: 0.7, marginLeft: '0.25rem' }}
              ></i>
            )}
          </div>
        )}

        {/* Right: Quick Tools & Action Buttons */}
        <div className="tab-edit-header-toolbar">
          {/* Quick Tools Segmented Group */}
          <div className="header-tools-group">
            {/* PROBAR CONEXIÓN */}
            <button
              type="button"
              className="btn-header-tool btn-header-tool-test"
              onClick={handleTestConnection}
              disabled={isTesting}
              title={isTesting ? "Probando conectividad..." : "Verificar conectividad de red con el host"}
              aria-label="Probar conexión"
            >
              <i className={`pi ${isTesting ? 'pi-spin pi-spinner' : 'pi-bolt'}`}></i>
            </button>

            {/* COPIAR CONTRASEÑA */}
            <button
              type="button"
              className="btn-header-tool btn-header-tool-key"
              onClick={handleCopyPassword}
              disabled={!hasPassword}
              title={hasPassword ? "Copiar contraseña al portapapeles" : "No hay contraseña configurada"}
              aria-label="Copiar contraseña"
            >
              <i className="pi pi-key"></i>
            </button>

            {/* COPIAR CLI */}
            <button
              type="button"
              className="btn-header-tool btn-header-tool-copy"
              onClick={handleCopyCommand}
              title="Copiar comando CLI o URI de conexión"
              aria-label="Copiar comando"
            >
              <i className="pi pi-code"></i>
            </button>

            {/* DUPLICAR */}
            <button
              type="button"
              className="btn-header-tool btn-header-tool-dup"
              onClick={handleDuplicateConnection}
              title="Duplicar conexión en la barra lateral"
              aria-label="Duplicar conexión"
              disabled={!isFormValid()}
            >
              <i className="pi pi-copy"></i>
            </button>

            {/* SELECTOR DE MODO DE VISTA */}
            <button
              type="button"
              className="btn-header-tool btn-header-tool-view"
              onClick={() => changeLayoutMode(layoutMode === 'sidebar' ? 'split' : 'sidebar')}
              title={layoutMode === 'sidebar' ? 'Cambiar a vista en Columnas' : 'Cambiar a panel Lateral'}
              aria-label={layoutMode === 'sidebar' ? 'Cambiar a vista en Columnas' : 'Cambiar a panel Lateral'}
            >
              <i className={`pi ${layoutMode === 'sidebar' ? 'pi-table' : 'pi-bars'}`}></i>
            </button>
          </div>

          <div className="header-actions-divider"></div>

          {/* Primary Action Buttons Group */}
          <div className="header-primary-group">
            {/* GUARDAR */}
            <button
              type="button"
              className="btn-header-save"
              onClick={handleSave}
              disabled={!isFormValid()}
              title="Guardar cambios de la conexión"
              aria-label="Guardar cambios"
            >
              <i className="pi pi-save"></i>
            </button>

            {/* CONECTAR */}
            <button
              type="button"
              className="btn-header-connect"
              onClick={handleConnect}
              disabled={!isFormValid()}
              title="Guardar e iniciar sesión inmediatamente"
              aria-label="Guardar y Conectar"
            >
              <i className="pi pi-play"></i>
            </button>

            {/* CERRAR */}
            <button
              type="button"
              className="btn-header-close"
              onClick={handleCancel}
              title="Cerrar pestaña"
              aria-label="Cerrar"
            >
              <i className="pi pi-times"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Form Area */}
      <div
        className="tab-edit-body"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem 1.5rem',
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
