import { useCallback } from 'react';
import { iconThemes } from '../themes/icon-themes';
import { updateFavoriteOnEdit, helpers as connectionHelpers } from '../utils/connectionStore';

function getProxyJumpFormState({
  isWallix,
  jumpHost,
  jumpUser,
  jumpPassword,
  jumpPrivateKey
}) {
  if (isWallix) {
    return { active: false, started: false, host: '', user: '' };
  }

  const host = jumpHost?.trim() || '';
  const user = jumpUser?.trim() || '';
  const password = jumpPassword?.trim() || '';
  const privateKey = jumpPrivateKey?.trim() || '';
  const started = !!(host || user || password || privateKey);

  return {
    active: !!(host && user),
    started,
    host,
    user
  };
}

/**
 * Hook para manejar todas las operaciones de formularios de la aplicación
 * Incluye: creación, edición y validación de SSH, RDP, carpetas
 */
export const useFormHandlers = ({
  // Referencias y funciones de utilidad
  toast,
  
  // Estados y setters de diálogos
  setShowRdpDialog,
  setShowEditSSHDialog,
  setShowEditFolderDialog,

  setShowUnifiedConnectionDialog,
  setShowFileConnectionDialog,
  setShowProtocolSelectionDialog,

  // Estados de formularios SSH
  sshName, sshHost, sshUser, sshPassword, sshRemoteFolder, sshPort, sshTargetFolder, setSSHTargetFolder, sshAutoCopyPassword, sshX11Forwarding, sshAgentForwarding, sshAutoRecording, sshProxyJumpEnabled, sshJumpHost, sshJumpPort, sshJumpUser, sshJumpAuthMethod, sshJumpPassword, sshJumpPrivateKey, sshHostKeyPolicy, sshDescription, sshIcon, sshAuthMethod, sshPrivateKey,
  closeSSHDialogWithReset,
  
  // Estados de formularios Edit SSH  
  editSSHNode, setEditSSHNode,
  editSSHName, setEditSSHName,
  editSSHHost, setEditSSHHost, 
  editSSHUser, setEditSSHUser,
  editSSHPassword, setEditSSHPassword,
  editSSHRemoteFolder, setEditSSHRemoteFolder,
  editSSHPort, setEditSSHPort,
  editSSHAutoCopyPassword, editSSHX11Forwarding, editSSHAgentForwarding, editSSHAutoRecording, editSSHProxyJumpEnabled, editSSHJumpHost, editSSHJumpPort, editSSHJumpUser, editSSHJumpAuthMethod, editSSHJumpPassword, editSSHJumpPrivateKey, editSSHHostKeyPolicy, editSSHDescription, setEditSSHDescription,
  editSSHIcon, setEditSSHIcon,
  editSSHAuthMethod, setEditSSHAuthMethod,
  editSSHPrivateKey, setEditSSHPrivateKey,
  closeEditSSHDialogWithReset,
  
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
  
  // Estados de formularios VNC
  vncName, setVncName,
  vncServer, setVncServer,
  vncPassword, setVncPassword,
  vncPort, setVncPort,
  vncTargetFolder, setVncTargetFolder,
  vncNodeData, setVncNodeData,
  editingVncNode, setEditingVncNode,
  setShowVncDialog,
  
  // Estados de formularios Archivos (SFTP/FTP/SCP)
  fileConnectionName, setFileConnectionName,
  fileConnectionHost, setFileConnectionHost,
  fileConnectionUser, setFileConnectionUser,
  fileConnectionPassword, setFileConnectionPassword,
  fileConnectionPort, setFileConnectionPort,
  fileConnectionProtocol, setFileConnectionProtocol,
  fileConnectionRemoteFolder, setFileConnectionRemoteFolder,
  fileConnectionTargetFolder, setFileConnectionTargetFolder,
  editingFileConnectionNode, setEditingFileConnectionNode,
  
  // Estados de formularios Folder
  folderName, parentNodeKey,
  folderColor, setFolderColor,
  folderIcon, setFolderIcon,
  editFolderNode, setEditFolderNode,
  editFolderName, setEditFolderName,
  editFolderColor, setEditFolderColor,
  editFolderIcon, setEditFolderIcon,
  closeFolderDialogWithReset,
  
  // Estados de formularios SSH Tunnel
  setShowSSHTunnelDialog,
  closeSSHTunnelDialogWithReset,
  editingSSHTunnelNode,
  setEditingSSHTunnelNode,
  
  // Funciones de gestión de datos
  nodes, setNodes,
  findNodeByKey, findParentNodeAndIndex, deepCopy, generateUniqueKey, parseWallixUser,
  rdpTabs, setRdpTabs
}) => {

  // === FUNCIONES DE CREACIÓN ===
  
  /**
   * Crear nueva carpeta
   */
  // Función para obtener el color por defecto del tema actual
  const getThemeDefaultColor = (themeName) => {
    const theme = iconThemes[themeName];
    if (!theme || !theme.icons || !theme.icons.folder) return '#5e81ac'; // Nord color por defecto
    
    const folderIcon = theme.icons.folder;
    
    // Si el SVG tiene fill y no es "none", usar ese color
    if (folderIcon.props && folderIcon.props.fill && folderIcon.props.fill !== 'none') {
      return folderIcon.props.fill;
    }
    
    // Si el SVG tiene stroke, usar ese color (para temas como linea que usan stroke)
    if (folderIcon.props && folderIcon.props.stroke) {
      return folderIcon.props.stroke;
    }
    
    // Fallback: buscar en los children del SVG
    if (folderIcon.props && folderIcon.props.children) {
      const children = Array.isArray(folderIcon.props.children) 
        ? folderIcon.props.children 
        : [folderIcon.props.children];
      
      for (const child of children) {
        if (child.props && child.props.fill && child.props.fill !== 'none') {
          return child.props.fill;
        }
        if (child.props && child.props.stroke) {
          return child.props.stroke;
        }
      }
    }
    
    return '#5e81ac'; // Nord color por defecto
  };

  const createNewFolder = useCallback(() => {
    if (!folderName.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre de carpeta no puede estar vacío',
        life: 3000
      });
      return;
    }
    
    try {
      const newKey = generateUniqueKey();
      // Determinar si el color es personalizado (diferente al del tema)
      const themeDefaultColor = getThemeDefaultColor(iconTheme);
      const isCustomColor = folderColor && folderColor !== themeDefaultColor;
      
      
      
      const newFolder = {
        key: newKey,
        label: folderName.trim(),
        droppable: true,
        children: [],
        uid: newKey,
        createdAt: new Date().toISOString(),
        isUserCreated: true,
        color: folderColor || themeDefaultColor,
        hasCustomColor: isCustomColor,
        folderIcon: folderIcon && folderIcon !== 'general' ? folderIcon : null
      };
      
      const nodesCopy = deepCopy(nodes);
      if (parentNodeKey === null) {
        nodesCopy.push(newFolder);
      } else {
        const parentNode = findNodeByKey(nodesCopy, parentNodeKey);
        if (!parentNode) {
          throw new Error(`Parent node with key ${parentNodeKey} not found`);
        }
        parentNode.children = parentNode.children || [];
        parentNode.children.unshift(newFolder);
      }
      
      setNodes(nodesCopy);
      closeFolderDialogWithReset();
      
      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `Carpeta "${folderName}" creada`,
        life: 3000
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo crear la carpeta',
        life: 3000
      });
    }
  }, [folderName, folderColor, folderIcon, parentNodeKey, nodes, setNodes, findNodeByKey, deepCopy, generateUniqueKey, closeFolderDialogWithReset, toast]);

  /**
   * Crear nueva conexión SSH
   */
  const createNewSSH = useCallback(() => {
    const authMethod = sshAuthMethod === 'key' ? 'key' : 'password';
    const missingBaseFields = !sshName?.trim() || !sshHost?.trim() || !sshUser?.trim();
    const missingPassword = authMethod === 'password' && !sshPassword?.trim();
    const missingPrivateKey = authMethod === 'key' && !sshPrivateKey?.trim();

    if (missingBaseFields || missingPassword || missingPrivateKey) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: authMethod === 'key'
          ? 'Nombre, host, usuario y clave privada son obligatorios'
          : 'Nombre, host, usuario y contraseña son obligatorios',
        life: 3000
      });
      return;
    }
    
    // Detectar automáticamente si es formato Wallix
    const userInfo = parseWallixUser(sshUser.trim());
    const proxyJumpState = getProxyJumpFormState({
      isWallix: userInfo.isWallix,
      jumpHost: sshJumpHost,
      jumpUser: sshJumpUser,
      jumpPassword: sshJumpPassword,
      jumpPrivateKey: sshJumpPrivateKey
    });

    if (proxyJumpState.started && !proxyJumpState.active) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'ProxyJump requiere host y usuario de salto',
        life: 3000
      });
      return;
    }

    if (proxyJumpState.active) {
      const jumpAuthMethod = sshJumpAuthMethod === 'key' ? 'key' : 'password';
      if (jumpAuthMethod === 'password' && !sshJumpPassword?.trim()) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'ProxyJump requiere contrasena de salto',
          life: 3000
        });
        return;
      }
      if (jumpAuthMethod === 'key' && !sshJumpPrivateKey?.trim()) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'ProxyJump requiere clave privada de salto',
          life: 3000
        });
        return;
      }
    }
    
    const newKey = generateUniqueKey();
    const newSSHNode = {
      key: newKey,
      label: sshName.trim(),
      data: {
        host: sshHost.trim(),
        user: userInfo.isWallix ? userInfo.targetUser : sshUser.trim(),
        password: authMethod === 'password' ? sshPassword.trim() : '',
        privateKey: authMethod === 'key' ? sshPrivateKey.trim() : '',
        authMethod,
        remoteFolder: sshRemoteFolder ? sshRemoteFolder.trim() : '',
        port: sshPort,
        type: 'ssh',
        // Datos del bastión Wallix (si aplica)
        useBastionWallix: userInfo.isWallix,
        bastionHost: userInfo.isWallix ? sshHost.trim() : '', // En Wallix, el host es el bastión
        bastionUser: userInfo.isWallix ? userInfo.bastionUser : '',
        targetServer: userInfo.isWallix ? userInfo.targetServer : '',
        // Opción de copiar password automáticamente
        autoCopyPassword: sshAutoCopyPassword || false,
        x11Forwarding: sshX11Forwarding || false,
        agentForwarding: sshAgentForwarding || false,
        autoRecording: sshAutoRecording || false,
        proxyJumpEnabled: proxyJumpState.active,
        jumpHost: proxyJumpState.active ? proxyJumpState.host : '',
        jumpPort: proxyJumpState.active ? (sshJumpPort || 22) : 22,
        jumpUser: proxyJumpState.active ? proxyJumpState.user : '',
        jumpAuthMethod: proxyJumpState.active ? (sshJumpAuthMethod === 'key' ? 'key' : 'password') : 'password',
        jumpPassword: proxyJumpState.active && sshJumpAuthMethod !== 'key' ? sshJumpPassword.trim() : '',
        jumpPrivateKey: proxyJumpState.active && sshJumpAuthMethod === 'key' ? sshJumpPrivateKey.trim() : '',
        hostKeyPolicy: userInfo.isWallix ? 'warn_new' : (sshHostKeyPolicy || 'warn_new'),
        // Descripción de la conexión
        description: sshDescription || '',
        customIcon: sshIcon && sshIcon !== 'default' ? sshIcon : null
      },
      draggable: true,
      droppable: false, // Las sesiones SSH NO pueden contener otros elementos
      uid: newKey,
      createdAt: new Date().toISOString(),
      isUserCreated: true
    };
    
    const nodesCopy = deepCopy(nodes);
    if (sshTargetFolder) {
      const parentNode = findNodeByKey(nodesCopy, sshTargetFolder);
      if (parentNode) {
        parentNode.children = parentNode.children || [];
        parentNode.children.unshift(newSSHNode);
      } else {
        nodesCopy.push(newSSHNode);
      }
    } else {
      nodesCopy.unshift(newSSHNode);
    }
    
    setNodes(nodesCopy);
    setShowUnifiedConnectionDialog(false); // Cerrar el diálogo unificado
    
    toast.current.show({
      severity: 'success',
      summary: 'SSH añadida',
      detail: `Conexión SSH "${sshName}" añadida al árbol`,
      life: 3000
    });
  }, [sshName, sshHost, sshUser, sshPassword, sshPrivateKey, sshAuthMethod, sshRemoteFolder, sshPort, sshTargetFolder, sshAutoCopyPassword, sshX11Forwarding, sshAgentForwarding, sshAutoRecording, sshProxyJumpEnabled, sshJumpHost, sshJumpPort, sshJumpUser, sshJumpAuthMethod, sshJumpPassword, sshJumpPrivateKey, sshHostKeyPolicy, sshDescription, sshIcon, nodes, setNodes, findNodeByKey, deepCopy, generateUniqueKey, parseWallixUser, setShowUnifiedConnectionDialog, toast]);

  /**
   * Crear nueva conexión RDP
   */
  const createNewRdp = useCallback(() => {
    if (!rdpName.trim() || !rdpServer.trim() || !rdpUsername.trim() || !rdpPassword.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Todos los campos son obligatorios',
        life: 3000
      });
      return;
    }
    
    const newKey = generateUniqueKey();
    const newRdpNode = {
      key: newKey,
      label: rdpName.trim(),
      data: {
        server: rdpServer.trim(),
        username: rdpUsername.trim(),
        password: rdpPassword.trim(),
        port: rdpPort,
        clientType: rdpClientType,
        resolution: '1920x1080',
        colorDepth: 32,
        redirectFolders: true,
        redirectClipboard: true,
        redirectPrinters: false,
        redirectAudio: false, // Desactivar audio por defecto
        fullscreen: false,
        span: false,
        admin: false,
        public: false,
        type: 'rdp',
        // Activar ajuste automático por defecto para evitar reconexiones
        autoResize: true,
        // Activar mostrar fondo por defecto
        guacEnableWallpaper: true
      },
      draggable: true,
      droppable: false,
      uid: newKey,
      createdAt: new Date().toISOString(),
      isUserCreated: true
    };
    
    const nodesCopy = deepCopy(nodes);
    if (rdpTargetFolder) {
      const parentNode = findNodeByKey(nodesCopy, rdpTargetFolder);
      if (parentNode) {
        parentNode.children = parentNode.children || [];
        parentNode.children.unshift(newRdpNode);
      } else {
        nodesCopy.push(newRdpNode);
      }
    } else {
      nodesCopy.unshift(newRdpNode);
    }
    
    setNodes(nodesCopy);
    closeRdpDialog();
    
    toast.current.show({
      severity: 'success',
      summary: 'RDP añadida',
      detail: `Conexión RDP "${rdpName}" añadida al árbol`,
      life: 3000
    });
  }, [rdpName, rdpServer, rdpUsername, rdpPassword, rdpPort, rdpClientType, rdpTargetFolder, nodes, setNodes, findNodeByKey, deepCopy, generateUniqueKey, toast]);

  /**
   * Crear nueva conexión de túnel SSH
   */
  const createNewSSHTunnel = useCallback((tunnelData) => {
    // Validar campos obligatorios
    if (!tunnelData.name || !tunnelData.sshHost || !tunnelData.sshUser) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Nombre, servidor SSH y usuario son obligatorios',
        life: 3000
      });
      return;
    }
    
    if (tunnelData.authType === 'password' && !tunnelData.sshPassword) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'La contraseña es obligatoria',
        life: 3000
      });
      return;
    }
    
    if (tunnelData.authType === 'key' && !tunnelData.privateKeyPath) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'La ruta de la clave privada es obligatoria',
        life: 3000
      });
      return;
    }
    
    const nodesCopy = deepCopy(nodes);
    const isEditing = editingSSHTunnelNode !== null;
    
    if (isEditing && editingSSHTunnelNode) {
      // Modo edición: actualizar nodo existente
      const nodeToEdit = findNodeByKey(nodesCopy, editingSSHTunnelNode.key);
      if (nodeToEdit) {
        nodeToEdit.label = tunnelData.name.trim();
        nodeToEdit.data = {
          ...nodeToEdit.data,
          type: 'ssh-tunnel',
          tunnelType: tunnelData.tunnelType,
          sshHost: tunnelData.sshHost.trim(),
          sshPort: tunnelData.sshPort || 22,
          sshUser: tunnelData.sshUser.trim(),
          sshPassword: tunnelData.sshPassword || '',
          authType: tunnelData.authType || 'password',
          privateKeyPath: tunnelData.privateKeyPath || '',
          passphrase: tunnelData.passphrase || '',
          localHost: tunnelData.localHost || '127.0.0.1',
          localPort: tunnelData.localPort || 0,
          remoteHost: tunnelData.remoteHost || '',
          remotePort: tunnelData.remotePort || 0,
          bindHost: tunnelData.bindHost || '0.0.0.0'
        };
        
        setNodes(nodesCopy);
        if (setShowSSHTunnelDialog) {
          setShowSSHTunnelDialog(false);
        }
        if (setEditingSSHTunnelNode) {
          setEditingSSHTunnelNode(null);
        }
        
        toast.current.show({
          severity: 'success',
          summary: 'Túnel SSH actualizado',
          detail: `Túnel "${tunnelData.name}" actualizado`,
          life: 3000
        });
        return;
      }
    }
    
    // Modo creación: crear nuevo nodo
    const newKey = generateUniqueKey();
    const newTunnelNode = {
      key: newKey,
      label: tunnelData.name.trim(),
      data: {
        type: 'ssh-tunnel',
        tunnelType: tunnelData.tunnelType,
        sshHost: tunnelData.sshHost.trim(),
        sshPort: tunnelData.sshPort || 22,
        sshUser: tunnelData.sshUser.trim(),
        sshPassword: tunnelData.sshPassword || '',
        authType: tunnelData.authType || 'password',
        privateKeyPath: tunnelData.privateKeyPath || '',
        passphrase: tunnelData.passphrase || '',
        localHost: tunnelData.localHost || '127.0.0.1',
        localPort: tunnelData.localPort || 0,
        remoteHost: tunnelData.remoteHost || '',
        remotePort: tunnelData.remotePort || 0,
        bindHost: tunnelData.bindHost || '0.0.0.0',
        // Estado del túnel (se actualiza cuando se inicia)
        tunnelStatus: 'stopped',
        activeTunnelId: null
      },
      draggable: true,
      droppable: false,
      uid: newKey,
      createdAt: new Date().toISOString(),
      isUserCreated: true
    };
    
    if (tunnelData.targetFolder) {
      const parentNode = findNodeByKey(nodesCopy, tunnelData.targetFolder);
      if (parentNode) {
        parentNode.children = parentNode.children || [];
        parentNode.children.unshift(newTunnelNode);
      } else {
        nodesCopy.push(newTunnelNode);
      }
    } else {
      nodesCopy.unshift(newTunnelNode);
    }
    
    setNodes(nodesCopy);
    if (setShowSSHTunnelDialog) {
      setShowSSHTunnelDialog(false);
    }
    
    toast.current.show({
      severity: 'success',
      summary: 'Túnel SSH creado',
      detail: `Túnel "${tunnelData.name}" añadido al árbol`,
      life: 3000
    });
  }, [nodes, setNodes, deepCopy, findNodeByKey, generateUniqueKey, setShowSSHTunnelDialog, editingSSHTunnelNode, setEditingSSHTunnelNode, toast]);

  /**
   * Abrir diálogo de edición de túnel SSH
   */
  const openEditSSHTunnelDialog = useCallback((node) => {
    if (!node || !node.data) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Nodo inválido para editar',
        life: 3000
      });
      return;
    }
    
    // Establecer el nodo que estamos editando
    if (setEditingSSHTunnelNode) {
      setEditingSSHTunnelNode(node);
    }
    
    // Abrir el diálogo (el DialogsManager pasará initialData basado en editingSSHTunnelNode)
    if (setShowSSHTunnelDialog) {
      setShowSSHTunnelDialog(true);
    }
  }, [setEditingSSHTunnelNode, setShowSSHTunnelDialog, toast]);

  /**
   * Duplicar túnel SSH
   */
  const duplicateSSHTunnel = useCallback((node) => {
    if (!node || !node.data) return;
    
    const newKey = generateUniqueKey();
    const duplicatedNode = {
      key: newKey,
      label: `${node.label} (copia)`,
      data: {
        ...node.data,
        tunnelStatus: 'stopped',
        activeTunnelId: null
      },
      draggable: true,
      droppable: false,
      uid: newKey,
      createdAt: new Date().toISOString(),
      isUserCreated: true
    };
    
    const nodesCopy = deepCopy(nodes);
    
    // Buscar el nodo original y su padre
    let parentFound = null;
    const findParentAndNode = (nodesList, targetKey, parent = null) => {
      for (const n of nodesList) {
        if (n.key === targetKey) {
          return parent;
        }
        if (n.children && n.children.length > 0) {
          const found = findParentAndNode(n.children, targetKey, n);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    };
    
    parentFound = findParentAndNode(nodesCopy, node.key);
    
    if (parentFound && parentFound.droppable) {
      parentFound.children = parentFound.children || [];
      parentFound.children.unshift(duplicatedNode);
    } else {
      nodesCopy.unshift(duplicatedNode);
    }
    
    setNodes(nodesCopy);
    toast.current.show({
      severity: 'success',
      summary: 'Duplicado',
      detail: `Túnel "${duplicatedNode.label}" duplicado`,
      life: 3000
    });
  }, [nodes, setNodes, deepCopy, generateUniqueKey, toast]);

  /**
   * Crear nueva entrada de Password
   */
  const createNewPasswordEntry = useCallback((targetFolderKey = null, entry) => {
    console.log('📝 createNewPasswordEntry called with:', { targetFolderKey, entry });
    const title = (entry?.title || '').trim();
    if (!title) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'El título es obligatorio', life: 2500 });
      return;
    }
    const newKey = generateUniqueKey();
    const newNode = {
      key: newKey,
      label: title,
      data: {
        type: 'password',
        username: entry?.username || '',
        password: entry?.password || '',
        url: entry?.url || '',
        group: entry?.group || '',
        notes: entry?.notes || ''
      },
      draggable: true,
      droppable: false,
      uid: newKey,
      createdAt: new Date().toISOString(),
      isUserCreated: true
    };
    console.log('📝 Created password node:', newNode);
    const nodesCopy = deepCopy(nodes);
    if (targetFolderKey) {
      const parentNode = findNodeByKey(nodesCopy, targetFolderKey);
      if (parentNode && parentNode.droppable) {
        parentNode.children = parentNode.children || [];
        parentNode.children.unshift(newNode);
      } else {
        nodesCopy.push(newNode);
      }
    } else {
      nodesCopy.push(newNode);
    }
    setNodes(nodesCopy);
    console.log('📝 Nodes updated, new password node added');
    toast.current.show({ severity: 'success', summary: 'Creado', detail: `Entrada "${title}" añadida a la sidebar`, life: 2500 });
    return newNode;
  }, [nodes, setNodes, findNodeByKey, deepCopy, generateUniqueKey, toast]);

  // === FUNCIONES DE EDICIÓN ===

  /**
   * Guardar edición SSH
   */
  const saveEditSSH = useCallback(() => {
    const authMethod = editSSHAuthMethod === 'key' ? 'key' : 'password';
    const missingBaseFields = !editSSHName?.trim() || !editSSHHost?.trim() || !editSSHUser?.trim();
    const missingPassword = authMethod === 'password' && !editSSHPassword?.trim();
    const missingPrivateKey = authMethod === 'key' && !editSSHPrivateKey?.trim();

    if (missingBaseFields || missingPassword || missingPrivateKey) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: authMethod === 'key'
          ? 'Nombre, host, usuario y clave privada son obligatorios'
          : 'Nombre, host, usuario y contraseña son obligatorios',
        life: 3000
      });
      return;
    }
    
    // Detectar automáticamente si es formato Wallix
    const userInfo = parseWallixUser(editSSHUser.trim());
    const proxyJumpState = getProxyJumpFormState({
      isWallix: userInfo.isWallix,
      jumpHost: editSSHJumpHost,
      jumpUser: editSSHJumpUser,
      jumpPassword: editSSHJumpPassword,
      jumpPrivateKey: editSSHJumpPrivateKey
    });

    if (proxyJumpState.started && !proxyJumpState.active) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'ProxyJump requiere host y usuario de salto',
        life: 3000
      });
      return;
    }

    if (proxyJumpState.active) {
      const jumpAuthMethod = editSSHJumpAuthMethod === 'key' ? 'key' : 'password';
      if (jumpAuthMethod === 'password' && !editSSHJumpPassword?.trim()) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'ProxyJump requiere contrasena de salto',
          life: 3000
        });
        return;
      }
      if (jumpAuthMethod === 'key' && !editSSHJumpPrivateKey?.trim()) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'ProxyJump requiere clave privada de salto',
          life: 3000
        });
        return;
      }
    }
    
    // Guardar datos antiguos para actualizar favoritos
    const oldConnection = connectionHelpers.fromSidebarNode(editSSHNode);
    
    const nodesCopy = deepCopy(nodes);
    const nodeToEdit = findNodeByKey(nodesCopy, editSSHNode.key);
    if (nodeToEdit) {
      nodeToEdit.label = editSSHName.trim();
      nodeToEdit.data = { 
        ...nodeToEdit.data, 
        host: userInfo.isWallix ? userInfo.targetServer : editSSHHost.trim(), // Si es Wallix, el host real es el targetServer
        user: userInfo.isWallix ? userInfo.targetUser : editSSHUser.trim(),
        password: authMethod === 'password' ? editSSHPassword.trim() : '',
        privateKey: authMethod === 'key' ? editSSHPrivateKey.trim() : '',
        authMethod,
        remoteFolder: editSSHRemoteFolder ? editSSHRemoteFolder.trim() : '',
        port: editSSHPort,
        type: 'ssh',
        // Datos del bastión Wallix (si aplica)
        useBastionWallix: userInfo.isWallix,
        bastionHost: userInfo.isWallix ? editSSHHost.trim() : '', // En Wallix, el host ingresado es el bastión
        bastionUser: userInfo.isWallix ? userInfo.bastionUser : '',
        targetServer: userInfo.isWallix ? userInfo.targetServer : '',
        // Opción de copiar password automáticamente
        autoCopyPassword: editSSHAutoCopyPassword || false,
        x11Forwarding: editSSHX11Forwarding || false,
        agentForwarding: editSSHAgentForwarding || false,
        autoRecording: editSSHAutoRecording || false,
        proxyJumpEnabled: proxyJumpState.active,
        jumpHost: proxyJumpState.active ? proxyJumpState.host : '',
        jumpPort: proxyJumpState.active ? (editSSHJumpPort || 22) : 22,
        jumpUser: proxyJumpState.active ? proxyJumpState.user : '',
        jumpAuthMethod: proxyJumpState.active ? (editSSHJumpAuthMethod === 'key' ? 'key' : 'password') : 'password',
        jumpPassword: proxyJumpState.active && editSSHJumpAuthMethod !== 'key' ? editSSHJumpPassword.trim() : '',
        jumpPrivateKey: proxyJumpState.active && editSSHJumpAuthMethod === 'key' ? editSSHJumpPrivateKey.trim() : '',
        hostKeyPolicy: userInfo.isWallix ? 'warn_new' : (editSSHHostKeyPolicy || 'warn_new'),
        // Descripción de la conexión
        description: editSSHDescription || '',
        // Icono personalizado (tratar 'default' como null para usar el icono del tema)
        customIcon: editSSHIcon && editSSHIcon !== 'default' ? editSSHIcon : null
      };
      nodeToEdit.droppable = false; // Asegurar que las sesiones SSH no sean droppable
      
      // Actualizar favoritos si la conexión estaba en favoritos
      if (oldConnection) {
        const newConnection = connectionHelpers.fromSidebarNode(nodeToEdit);
        updateFavoriteOnEdit(oldConnection, newConnection);
      }

      const { parentNode: currentParent, parentList, index } = findParentNodeAndIndex(nodesCopy, editSSHNode.key);
      const currentParentKey = currentParent?.key ?? null;
      const desiredParentKey = sshTargetFolder || null;

      if (currentParentKey !== desiredParentKey && parentList && index !== -1) {
        const [movedNode] = parentList.splice(index, 1);
        if (desiredParentKey) {
          const newParent = findNodeByKey(nodesCopy, desiredParentKey);
          if (newParent) {
            newParent.children = newParent.children || [];
            newParent.children.unshift(movedNode);
          } else {
            nodesCopy.unshift(movedNode);
          }
        } else {
          nodesCopy.unshift(movedNode);
        }
      }
    }
    
    setNodes(nodesCopy);
    closeEditSSHDialogWithReset();
    setShowUnifiedConnectionDialog(false); // Cerrar diálogo unificado
    setEditSSHNode(null);
    setEditSSHName(''); 
    setEditSSHHost(''); 
    setEditSSHUser('');
    setEditSSHPassword('');
    setEditSSHRemoteFolder('');
    setEditSSHPort(22);
    setEditSSHDescription('');
    if (setEditSSHIcon) setEditSSHIcon(null);
    if (setSSHTargetFolder) setSSHTargetFolder(null);
    
    toast.current.show({
      severity: 'success',
      summary: 'SSH editada',
      detail: `Sesión SSH actualizada`,
      life: 3000
    });
  }, [editSSHName, editSSHHost, editSSHUser, editSSHPassword, editSSHPrivateKey, editSSHAuthMethod, editSSHRemoteFolder, editSSHPort, editSSHAutoCopyPassword, editSSHX11Forwarding, editSSHAgentForwarding, editSSHAutoRecording, editSSHProxyJumpEnabled, editSSHJumpHost, editSSHJumpPort, editSSHJumpUser, editSSHJumpAuthMethod, editSSHJumpPassword, editSSHJumpPrivateKey, editSSHHostKeyPolicy, editSSHDescription, editSSHIcon, editSSHNode, sshTargetFolder, nodes, setNodes, findNodeByKey, findParentNodeAndIndex, deepCopy, parseWallixUser, closeEditSSHDialogWithReset, setShowUnifiedConnectionDialog, setEditSSHNode, setEditSSHName, setEditSSHHost, setEditSSHUser, setEditSSHPassword, setEditSSHRemoteFolder, setEditSSHPort, setEditSSHDescription, setEditSSHIcon, setSSHTargetFolder, toast]);

  /**
   * Guardar edición de carpeta
   */
  const saveEditFolder = useCallback(() => {
    if (!editFolderName.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'El nombre de la carpeta no puede estar vacío',
        life: 3000
      });
      return;
    }
    
    const nodesCopy = deepCopy(nodes);
    const nodeToEdit = findNodeByKey(nodesCopy, editFolderNode.key);
    if (nodeToEdit) {
      nodeToEdit.label = editFolderName.trim();
      
      // Determinar si el color es personalizado (diferente al del tema)
      const themeDefaultColor = getThemeDefaultColor(iconTheme);
      const isCustomColor = editFolderColor && editFolderColor !== themeDefaultColor;
      
      
      
      nodeToEdit.color = editFolderColor || themeDefaultColor;
      nodeToEdit.hasCustomColor = isCustomColor;
      nodeToEdit.folderIcon = editFolderIcon && editFolderIcon !== 'general' ? editFolderIcon : null;
    }
    
    setNodes(nodesCopy);
    closeFolderDialogWithReset();
    setEditFolderNode(null);
    setEditFolderName('');
    
    toast.current.show({
      severity: 'success',
      summary: 'Carpeta editada',
      detail: `Nombre actualizado`,
      life: 3000
    });
  }, [editFolderName, editFolderColor, editFolderIcon, editFolderNode, nodes, setNodes, findNodeByKey, deepCopy, closeFolderDialogWithReset, setEditFolderNode, setEditFolderName, toast]);

  // === FUNCIONES DE DIÁLOGOS ===

  /**
   * Abrir diálogo de edición SSH
   */
  const openEditSSHDialog = useCallback((node) => {
    setEditSSHNode(node);
    setEditSSHName(node.label);
    setEditSSHHost(node.data?.bastionHost || node.data?.host || '');
    // Mostrar el usuario original completo si es Wallix, o el usuario simple si es directo
    setEditSSHUser(node.data?.useBastionWallix ? node.data?.bastionUser || '' : node.data?.user || '');
    setEditSSHPassword(node.data?.password || '');
    setEditSSHPrivateKey(node.data?.privateKey || '');
    setEditSSHAuthMethod(
      node.data?.authMethod === 'key' || node.data?.authMethod === 'password'
        ? node.data.authMethod
        : (node.data?.privateKey?.trim() ? 'key' : 'password')
    );
    setEditSSHRemoteFolder(node.data?.remoteFolder || '');
    setEditSSHPort(node.data?.port || 22);
    setEditSSHDescription(node.data?.description || '');
    // Cargar icono personalizado si existe
    if (setEditSSHIcon) setEditSSHIcon(node.data?.customIcon || null);
    if (setSSHTargetFolder && findParentNodeAndIndex) {
      const { parentNode } = findParentNodeAndIndex(nodes, node.key);
      setSSHTargetFolder(parentNode?.key ?? null);
    }
    // Usar el diálogo unificado en modo edición SSH
    setShowUnifiedConnectionDialog(true);
  }, [nodes, setEditSSHNode, setEditSSHName, setEditSSHHost, setEditSSHUser, setEditSSHPassword, setEditSSHPrivateKey, setEditSSHAuthMethod, setEditSSHRemoteFolder, setEditSSHPort, setEditSSHDescription, setEditSSHIcon, setSSHTargetFolder, findParentNodeAndIndex, setShowUnifiedConnectionDialog]);

  /**
   * Abrir diálogo de selección de protocolo para nueva conexión (limpia todos los estados de edición)
   */
  const openNewUnifiedConnectionDialog = useCallback(() => {
    // Limpiar SOLO los estados de edición esenciales para asegurar modo creación
    setEditSSHNode(null);
    setEditingRdpNode(null);
    setEditingFileConnectionNode(null);

    // Abrir diálogo de selección de protocolo
    if (setShowProtocolSelectionDialog) {
      setShowProtocolSelectionDialog(true);
    } else {
      // Fallback: abrir diálogo unificado directamente si no está disponible el diálogo de selección
    setShowUnifiedConnectionDialog(true);
    }
  }, [setEditSSHNode, setEditingRdpNode, setEditingFileConnectionNode, setShowUnifiedConnectionDialog, setShowProtocolSelectionDialog]);

  /**
   * Abrir diálogo nuevo RDP
   */
  const openNewRdpDialog = useCallback((targetFolder = null) => {
    setRdpTargetFolder(targetFolder);
    setRdpName('');
    setRdpServer('');
    setRdpUsername('');
    setRdpPassword('');
    setRdpPort(3389);
    setShowRdpDialog(true);
  }, [setRdpTargetFolder, setRdpName, setRdpServer, setRdpUsername, setRdpPassword, setRdpPort, setShowRdpDialog]);

  /**
   * Cerrar diálogo RDP
   */
  const closeRdpDialog = useCallback(() => {
    setShowRdpDialog(false);
    setRdpTargetFolder(null);
    setRdpName('');
    setRdpServer('');
    setRdpUsername('');
    setRdpPassword('');
    setRdpPort(3389);
    setRdpClientType('mstsc');
  }, [setShowRdpDialog, setRdpTargetFolder, setRdpName, setRdpServer, setRdpUsername, setRdpPassword, setRdpPort, setRdpClientType]);

  /**
   * Abrir diálogo de edición RDP
   */
  const openEditRdpDialog = useCallback((node) => {
    // Abrir el gestor de conexiones RDP con los datos del nodo para editar
    setRdpNodeData(node.data);
    setEditingRdpNode(node);
    // Usar el diálogo unificado en modo edición RDP
    setShowUnifiedConnectionDialog(true);
  }, [setRdpNodeData, setEditingRdpNode, setShowUnifiedConnectionDialog]);

  /**
   * Guardar RDP en sidebar
   */
  const handleSaveRdpToSidebar = useCallback((rdpData, isEditing = false, originalNode = null) => {
    if (isEditing && originalNode) {
      // Guardar datos antiguos para actualizar favoritos
      const oldConnection = connectionHelpers.fromSidebarNode(originalNode);
      
      // Actualizar nodo existente
      setNodes(prevNodes => {
        const nodesCopy = Array.isArray(prevNodes) ? [...prevNodes] : [];
        const nodeToEdit = findNodeByKey(nodesCopy, originalNode.key);
        
        if (nodeToEdit) {
          nodeToEdit.label = rdpData.name || `${rdpData.server}:${rdpData.port}`;
          nodeToEdit.data = {
            ...nodeToEdit.data,
            type: 'rdp',
            name: rdpData.name,
            server: rdpData.server,
            username: rdpData.username,
            password: rdpData.password,
            port: rdpData.port || 3389,
            clientType: rdpData.clientType || 'guacamole',
            preset: rdpData.preset || 'default',
            resolution: rdpData.resolution || '1920x1080',
            colorDepth: rdpData.colorDepth || 32,
            redirectFolders: rdpData.redirectFolders === true,
            redirectClipboard: rdpData.redirectClipboard === true,
            redirectPrinters: rdpData.redirectPrinters === true,
            redirectAudio: rdpData.redirectAudio === true,
            fullscreen: rdpData.fullscreen === true,
            smartSizing: rdpData.smartSizing === true,
            span: rdpData.span === true,
            admin: rdpData.admin === true,
            public: rdpData.public === true,
            // Campos específicos de Guacamole
            autoResize: rdpData.autoResize !== false, // Por defecto true, solo false si explícitamente se establece
            guacDpi: rdpData.guacDpi || 96,
            guacSecurity: rdpData.guacSecurity || 'any',
            guacEnableWallpaper: rdpData.guacEnableWallpaper === true,
            guacEnableDrive: rdpData.guacEnableDrive === true,
            guacDriveHostDir: (typeof rdpData.guacDriveHostDir === 'string') ? rdpData.guacDriveHostDir : '',
            guacEnableGfx: (rdpData.guacEnableGfx === true) || (rdpData.guacWin11Compat === true),
            // Nuevos flags avanzados
            guacEnableDesktopComposition: rdpData.guacEnableDesktopComposition === true,
            guacEnableFontSmoothing: rdpData.guacEnableFontSmoothing === true,
            guacEnableTheming: rdpData.guacEnableTheming === true,
            guacEnableFullWindowDrag: rdpData.guacEnableFullWindowDrag === true,
            guacEnableMenuAnimations: rdpData.guacEnableMenuAnimations === true,
            guacDisableGlyphCaching: rdpData.guacDisableGlyphCaching === true,
            guacDisableOffscreenCaching: rdpData.guacDisableOffscreenCaching === true,
            guacDisableBitmapCaching: rdpData.guacDisableBitmapCaching === true,
            guacDisableCopyRect: rdpData.guacDisableCopyRect === true
          };
          
          // Actualizar favoritos si la conexión estaba en favoritos
          if (oldConnection) {
            const newConnection = connectionHelpers.fromSidebarNode(nodeToEdit);
            updateFavoriteOnEdit(oldConnection, newConnection);
          }
        }
        
        return nodesCopy;
      });
    } else {
      // Crear un nuevo nodo RDP en la sidebar
      const newNode = {
        key: `rdp_${Date.now()}`,
        label: rdpData.name || `${rdpData.server}:${rdpData.port}`,
        data: {
          type: 'rdp',
          name: rdpData.name,
          server: rdpData.server,
          username: rdpData.username,
          password: rdpData.password,
          port: rdpData.port || 3389,
          clientType: rdpData.clientType || 'guacamole',
          preset: rdpData.preset || 'default',
          resolution: rdpData.resolution || '1920x1080',
          colorDepth: rdpData.colorDepth || 32,
          redirectFolders: rdpData.redirectFolders === true,
          redirectClipboard: rdpData.redirectClipboard === true,
          redirectPrinters: rdpData.redirectPrinters === true,
          redirectAudio: rdpData.redirectAudio === true,
          fullscreen: rdpData.fullscreen === true,
          smartSizing: rdpData.smartSizing === true,
          span: rdpData.span === true,
          admin: rdpData.admin === true,
          public: rdpData.public === true,
          // Campos específicos de Guacamole
          autoResize: rdpData.autoResize !== false, // Por defecto true, solo false si explícitamente se establece
          guacDpi: rdpData.guacDpi || 96,
          guacSecurity: rdpData.guacSecurity || 'any',
          guacEnableWallpaper: rdpData.guacEnableWallpaper === true,
          guacEnableDrive: rdpData.guacEnableDrive === true,
          guacDriveHostDir: (typeof rdpData.guacDriveHostDir === 'string') ? rdpData.guacDriveHostDir : '',
          guacEnableGfx: (rdpData.guacEnableGfx === true) || (rdpData.guacWin11Compat === true),
          // Nuevos flags avanzados
          guacEnableDesktopComposition: rdpData.guacEnableDesktopComposition === true,
          guacEnableFontSmoothing: rdpData.guacEnableFontSmoothing === true,
          guacEnableTheming: rdpData.guacEnableTheming === true,
          guacEnableFullWindowDrag: rdpData.guacEnableFullWindowDrag === true,
          guacEnableMenuAnimations: rdpData.guacEnableMenuAnimations === true,
          guacDisableGlyphCaching: rdpData.guacDisableGlyphCaching === true,
          guacDisableOffscreenCaching: rdpData.guacDisableOffscreenCaching === true,
          guacDisableBitmapCaching: rdpData.guacDisableBitmapCaching === true,
          guacDisableCopyRect: rdpData.guacDisableCopyRect === true
        },
        draggable: true,
        droppable: false,
        uid: `rdp_${Date.now()}`,
        createdAt: new Date().toISOString(),
        isUserCreated: true
      };

      // Agregar el nodo a la raíz del árbol
      setNodes(prevNodes => {
        const newNodes = Array.isArray(prevNodes) ? [...prevNodes] : [];
        newNodes.push(newNode);
        return newNodes;
      });
    }

    // Actualizar pestañas RDP si están abiertas
    if (isEditing && originalNode) {
      setRdpTabs(prevTabs => {
        return prevTabs.map(tab => {
          if (tab.originalKey === originalNode.key) {
            return {
              ...tab,
              label: rdpData.name || `${rdpData.server}:${rdpData.port}`,
              rdpConfig: {
                name: rdpData.name,
                server: rdpData.server,
                username: rdpData.username,
                password: rdpData.password,
                port: rdpData.port || 3389,
                clientType: rdpData.clientType || 'guacamole',
                preset: rdpData.preset || 'default',
                resolution: rdpData.resolution || '1920x1080',
                colorDepth: rdpData.colorDepth || 32,
                redirectFolders: rdpData.redirectFolders === true,
                redirectClipboard: rdpData.redirectClipboard === true,
                redirectPrinters: rdpData.redirectPrinters === true,
                redirectAudio: rdpData.redirectAudio === true,
                fullscreen: rdpData.fullscreen === true,
                smartSizing: rdpData.smartSizing === true,
                span: rdpData.span === true,
                admin: rdpData.admin === true,
                public: rdpData.public === true,
                // Campos específicos de Guacamole
                autoResize: rdpData.autoResize !== false, // Por defecto true, solo false si explícitamente se establece
                guacDpi: rdpData.guacDpi || 96,
                guacSecurity: rdpData.guacSecurity || 'any',
                guacEnableWallpaper: rdpData.guacEnableWallpaper === true,
                guacEnableDrive: rdpData.guacEnableDrive === true,
                guacDriveHostDir: (typeof rdpData.guacDriveHostDir === 'string') ? rdpData.guacDriveHostDir : '',
                guacEnableGfx: (rdpData.guacEnableGfx === true) || (rdpData.guacWin11Compat === true),
                guacDisableGlyphCaching: rdpData.guacDisableGlyphCaching === true,
                guacDisableOffscreenCaching: rdpData.guacDisableOffscreenCaching === true,
                guacDisableBitmapCaching: rdpData.guacDisableBitmapCaching === true,
                guacDisableCopyRect: rdpData.guacDisableCopyRect === true
              }
            };
          }
          return tab;
        });
      });
    }


    setShowUnifiedConnectionDialog(false); // Cerrar diálogo unificado
    setRdpNodeData(null);
    setEditingRdpNode(null);
  }, [setNodes, findNodeByKey, setRdpTabs, setShowUnifiedConnectionDialog, setRdpNodeData, setEditingRdpNode]);

  /**
   * Abrir diálogo de nueva conexión VNC
   */
  const openNewVncDialog = useCallback((targetFolder = null) => {
    setVncTargetFolder(targetFolder);
    setVncName('');
    setVncServer('');
    setVncPassword('');
    setVncPort(5900);
    setShowVncDialog(true);
  }, [setVncTargetFolder, setVncName, setVncServer, setVncPassword, setVncPort, setShowVncDialog]);

  /**
   * Cerrar diálogo VNC
   */
  const closeVncDialog = useCallback(() => {
    setShowVncDialog(false);
    setVncTargetFolder(null);
    setVncName('');
    setVncServer('');
    setVncPassword('');
    setVncPort(5900);
  }, [setShowVncDialog, setVncTargetFolder, setVncName, setVncServer, setVncPassword, setVncPort]);

  /**
   * Abrir diálogo de edición VNC
   */
  const openEditVncDialog = useCallback((node) => {
    setVncNodeData(node.data);
    setEditingVncNode(node);
    setShowUnifiedConnectionDialog(true);
  }, [setVncNodeData, setEditingVncNode, setShowUnifiedConnectionDialog]);

  /**
   * Guardar VNC en sidebar
   */
  const handleSaveVncToSidebar = useCallback((vncData, isEditing = false, originalNode = null) => {
    if (isEditing && originalNode) {
      // Guardar datos antiguos para actualizar favoritos
      const oldConnection = connectionHelpers.fromSidebarNode(originalNode);
      
      // Actualizar nodo existente
      setNodes(prevNodes => {
        const nodesCopy = Array.isArray(prevNodes) ? [...prevNodes] : [];
        const nodeToEdit = findNodeByKey(nodesCopy, originalNode.key);
        
        if (nodeToEdit) {
          nodeToEdit.label = vncData.name || `${vncData.server}:${vncData.port}`;
          nodeToEdit.data = {
            ...nodeToEdit.data,
            type: 'vnc',
            name: vncData.name,
            server: vncData.server,
            password: vncData.password,
            port: vncData.port || 5900,
            clientType: 'guacamole',
            resolution: vncData.resolution || '1024x768',
            colorDepth: vncData.colorDepth || 32,
            // Opciones VNC
            readOnly: vncData.readOnly === true,
            enableCompression: vncData.enableCompression !== false,
            imageQuality: vncData.imageQuality || 'lossless',
            autoReconnect: vncData.autoReconnect !== false,
            autoResize: vncData.autoResize !== false,
            redirectClipboard: vncData.redirectClipboard !== false,
            guacDpi: vncData.guacDpi || 96
          };
          
          // Actualizar favoritos si la conexión estaba en favoritos
          if (oldConnection) {
            const newConnection = connectionHelpers.fromSidebarNode(nodeToEdit);
            updateFavoriteOnEdit(oldConnection, newConnection);
          }
        }
        
        return nodesCopy;
      });
    } else {
      // Crear un nuevo nodo VNC en la sidebar
      const newNode = {
        key: `vnc_${Date.now()}`,
        label: vncData.name || `${vncData.server}:${vncData.port}`,
        data: {
          type: 'vnc',
          name: vncData.name,
          server: vncData.server,
          password: vncData.password,
          port: vncData.port || 5900,
          clientType: 'guacamole',
          resolution: vncData.resolution || '1024x768',
          colorDepth: vncData.colorDepth || 32,
          // Opciones VNC
          readOnly: vncData.readOnly === true,
          enableCompression: vncData.enableCompression !== false,
          imageQuality: vncData.imageQuality || 'lossless',
          autoReconnect: vncData.autoReconnect !== false,
          autoResize: vncData.autoResize !== false,
          redirectClipboard: vncData.redirectClipboard !== false,
          guacDpi: vncData.guacDpi || 96
        },
        draggable: true,
        droppable: false,
        uid: `vnc_${Date.now()}`,
        createdAt: new Date().toISOString(),
        isUserCreated: true
      };

      // Agregar el nodo a la raíz del árbol
      setNodes(prevNodes => {
        const newNodes = Array.isArray(prevNodes) ? [...prevNodes] : [];
        newNodes.push(newNode);
        return newNodes;
      });
    }

    // Actualizar pestañas VNC si están abiertas
    if (isEditing && originalNode) {
      setRdpTabs(prevTabs => {
        return prevTabs.map(tab => {
          if (tab.originalKey === originalNode.key && tab.type === 'vnc-guacamole') {
            return {
              ...tab,
              label: vncData.name || `${vncData.server}:${vncData.port}`,
              rdpConfig: {
                connectionType: 'vnc',
                hostname: vncData.server,
                password: vncData.password,
                port: vncData.port || 5900,
                width: parseInt(vncData.resolution?.split('x')[0]) || 1024,
                height: parseInt(vncData.resolution?.split('x')[1]) || 768,
                dpi: vncData.guacDpi || 96,
                colorDepth: vncData.colorDepth || 32,
                readOnly: vncData.readOnly === true,
                enableCompression: vncData.enableCompression !== false,
                imageQuality: vncData.imageQuality || 'lossless',
                autoReconnect: vncData.autoReconnect !== false,
                autoResize: vncData.autoResize !== false,
                redirectClipboard: vncData.redirectClipboard !== false
              }
            };
          }
          return tab;
        });
      });
    }

    // Solo cerrar diálogo unificado si estamos editando (no creando nueva)
    if (isEditing) {
      setShowUnifiedConnectionDialog(false);
      setVncNodeData(null);
      setEditingVncNode(null);
    }
    // Si es nueva conexión, el diálogo se cierra con onHide() en NewVNCConnectionDialog
  }, [setNodes, findNodeByKey, setRdpTabs, setShowUnifiedConnectionDialog, setVncNodeData, setEditingVncNode]);

  /**
   * Guardar conexión de archivos (SFTP/FTP/SCP) en sidebar
   */
  const handleSaveFileConnectionToSidebar = useCallback((fileData, isEditing = false, originalNode = null) => {
    // Validar que fileData existe y tiene los campos requeridos
    if (!fileData) {
      console.error('❌ handleSaveFileConnectionToSidebar: fileData es undefined');
      return;
    }

    if (!fileData.name || !fileData.host || !fileData.username) {
      console.error('❌ handleSaveFileConnectionToSidebar: Faltan campos requeridos', fileData);
      return;
    }
    
    const fileType = fileData.protocol || 'sftp'; // sftp, ftp, scp
    
    if (isEditing && originalNode) {
      // Guardar datos antiguos para actualizar favoritos
      const oldConnection = connectionHelpers.fromSidebarNode(originalNode);
      
      // Actualizar nodo existente
      setNodes(prevNodes => {
        const nodesCopy = Array.isArray(prevNodes) ? [...prevNodes] : [];
        const nodeToEdit = findNodeByKey(nodesCopy, originalNode.key);
        
        if (nodeToEdit) {
          nodeToEdit.label = fileData.name || `${fileData.host}:${fileData.port}`;
          nodeToEdit.data = {
            ...nodeToEdit.data,
            type: fileType,
            name: fileData.name,
            host: fileData.host,
            user: fileData.username,
            username: fileData.username,
            password: fileData.password || '',
            port: fileData.port || (fileType === 'ftp' ? 21 : 22),
            protocol: fileType,
            remoteFolder: fileData.remoteFolder || '',
            targetFolder: fileData.targetFolder || ''
          };
          
          // Actualizar favoritos si la conexión estaba en favoritos
          if (oldConnection) {
            const newConnection = connectionHelpers.fromSidebarNode(nodeToEdit);
            updateFavoriteOnEdit(oldConnection, newConnection);
          }
        }
        
        return nodesCopy;
      });
    } else {
      // Crear un nuevo nodo de archivos en la sidebar
      const newNode = {
        key: `${fileType}_${Date.now()}`,
        label: fileData.name || `${fileData.host}:${fileData.port}`,
        data: {
          type: fileType,
          name: fileData.name,
          host: fileData.host,
          user: fileData.username,
          username: fileData.username,
          password: fileData.password || '',
          port: fileData.port || (fileType === 'ftp' ? 21 : 22),
          protocol: fileType,
          remoteFolder: fileData.remoteFolder || '',
          targetFolder: fileData.targetFolder || ''
        },
        draggable: true,
        droppable: false,
        uid: `${fileType}_${Date.now()}`,
        createdAt: new Date().toISOString(),
        isUserCreated: true
      };

      // Agregar el nodo a la raíz del árbol
      setNodes(prevNodes => {
        const newNodes = Array.isArray(prevNodes) ? [...prevNodes] : [];
        newNodes.push(newNode);
        console.log('Nodo de archivos agregado a la sidebar:', newNode);
        return newNodes;
      });
    }

    // Mostrar toast de éxito
    toast.current?.show({
      severity: 'success',
      summary: isEditing ? 'Conexión actualizada' : 'Conexión añadida',
      detail: `Conexión "${fileData.name}" ${isEditing ? 'actualizada' : 'añadida'} al árbol`,
      life: 3000
    });

    setShowFileConnectionDialog(false); // Cerrar diálogo de archivos
  }, [setNodes, findNodeByKey, setShowFileConnectionDialog, toast]);

  /**
   * Abrir diálogo de edición de conexión de archivos
   */
  const openEditFileConnectionDialog = useCallback((node) => {
    // Guardar el nodo que se está editando
    setEditingFileConnectionNode(node);

    // Abrir el diálogo independiente de archivos
    setShowFileConnectionDialog(true);
  }, [setEditingFileConnectionNode, setShowFileConnectionDialog]);

  /**
   * Abrir diálogo nuevo de archivos
   */
  const openNewFileConnectionDialog = useCallback(() => {
    setShowFileConnectionDialog(true);
  }, [setShowFileConnectionDialog]);

  return {
    // Funciones de creación
    createNewFolder,
    createNewSSH,
    createNewRdp,
    createNewSSHTunnel,
    openEditSSHTunnelDialog,
    duplicateSSHTunnel,

    // Funciones de edición
    saveEditSSH,
    saveEditFolder,

    // Funciones de diálogos
    openEditSSHDialog,
    openNewRdpDialog,
    closeRdpDialog,
    openEditRdpDialog,
    handleSaveRdpToSidebar,
    
    // Funciones VNC
    openNewVncDialog,
    closeVncDialog,
    openEditVncDialog,
    handleSaveVncToSidebar,
    handleSaveFileConnectionToSidebar,
    openEditFileConnectionDialog,
    openNewFileConnectionDialog,
    openNewUnifiedConnectionDialog,
    createNewPasswordEntry
  };
};

