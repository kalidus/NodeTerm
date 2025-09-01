import { useCallback } from 'react';

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
  setShowRdpManager,
  setShowUnifiedConnectionDialog,
  
  // Estados de formularios SSH
  sshName, sshHost, sshUser, sshPassword, sshRemoteFolder, sshPort, sshTargetFolder,
  closeSSHDialogWithReset,
  
  // Estados de formularios Edit SSH  
  editSSHNode, setEditSSHNode,
  editSSHName, setEditSSHName,
  editSSHHost, setEditSSHHost, 
  editSSHUser, setEditSSHUser,
  editSSHPassword, setEditSSHPassword,
  editSSHRemoteFolder, setEditSSHRemoteFolder,
  editSSHPort, setEditSSHPort,
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
  
  // Estados de formularios Folder
  folderName, parentNodeKey,
  editFolderNode, setEditFolderNode,
  editFolderName, setEditFolderName,
  closeFolderDialogWithReset,
  
  // Funciones de gestión de datos
  nodes, setNodes,
  findNodeByKey, deepCopy, generateUniqueKey, parseWallixUser,
  rdpTabs, setRdpTabs
}) => {

  // === FUNCIONES DE CREACIÓN ===
  
  /**
   * Crear nueva carpeta
   */
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
      const newFolder = {
        key: newKey,
        label: folderName.trim(),
        droppable: true,
        children: [],
        uid: newKey,
        createdAt: new Date().toISOString(),
        isUserCreated: true
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
        parentNode.children.push(newFolder);
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
  }, [folderName, parentNodeKey, nodes, setNodes, findNodeByKey, deepCopy, generateUniqueKey, closeFolderDialogWithReset, toast]);

  /**
   * Crear nueva conexión SSH
   */
  const createNewSSH = useCallback(() => {
    if (!sshName.trim() || !sshHost.trim() || !sshUser.trim() || !sshPassword.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Todos los campos son obligatorios',
        life: 3000
      });
      return;
    }
    
    // Detectar automáticamente si es formato Wallix
    const userInfo = parseWallixUser(sshUser.trim());
    
    const newKey = generateUniqueKey();
    const newSSHNode = {
      key: newKey,
      label: sshName.trim(),
      data: {
        host: sshHost.trim(),
        user: userInfo.isWallix ? userInfo.targetUser : sshUser.trim(),
        password: sshPassword.trim(),
        remoteFolder: sshRemoteFolder.trim(),
        port: sshPort,
        type: 'ssh',
        // Datos del bastión Wallix (si aplica)
        useBastionWallix: userInfo.isWallix,
        bastionHost: userInfo.isWallix ? sshHost.trim() : '', // En Wallix, el host es el bastión
        bastionUser: userInfo.isWallix ? userInfo.bastionUser : '',
        targetServer: userInfo.isWallix ? userInfo.targetServer : ''
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
    closeSSHDialogWithReset();
    
    toast.current.show({
      severity: 'success',
      summary: 'SSH añadida',
      detail: `Conexión SSH "${sshName}" añadida al árbol`,
      life: 3000
    });
  }, [sshName, sshHost, sshUser, sshPassword, sshRemoteFolder, sshPort, sshTargetFolder, nodes, setNodes, findNodeByKey, deepCopy, generateUniqueKey, parseWallixUser, closeSSHDialogWithReset, toast]);

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
        redirectAudio: true,
        fullscreen: false,
        span: false,
        admin: false,
        public: false,
        type: 'rdp'
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

  // === FUNCIONES DE EDICIÓN ===

  /**
   * Guardar edición SSH
   */
  const saveEditSSH = useCallback(() => {
    if (!editSSHName.trim() || !editSSHHost.trim() || !editSSHUser.trim() || !editSSHPassword.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Todos los campos son obligatorios excepto la carpeta remota',
        life: 3000
      });
      return;
    }
    
    // Detectar automáticamente si es formato Wallix
    const userInfo = parseWallixUser(editSSHUser.trim());
    
    const nodesCopy = deepCopy(nodes);
    const nodeToEdit = findNodeByKey(nodesCopy, editSSHNode.key);
    if (nodeToEdit) {
      nodeToEdit.label = editSSHName.trim();
      nodeToEdit.data = { 
        ...nodeToEdit.data, 
        host: userInfo.isWallix ? userInfo.targetServer : editSSHHost.trim(), // Si es Wallix, el host real es el targetServer
        user: userInfo.isWallix ? userInfo.targetUser : editSSHUser.trim(),
        password: editSSHPassword.trim(),
        remoteFolder: editSSHRemoteFolder.trim(),
        port: editSSHPort,
        type: 'ssh',
        // Datos del bastión Wallix (si aplica)
        useBastionWallix: userInfo.isWallix,
        bastionHost: userInfo.isWallix ? editSSHHost.trim() : '', // En Wallix, el host ingresado es el bastión
        bastionUser: userInfo.isWallix ? userInfo.bastionUser : '',
        targetServer: userInfo.isWallix ? userInfo.targetServer : ''
      };
      nodeToEdit.droppable = false; // Asegurar que las sesiones SSH no sean droppable
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
    
    toast.current.show({
      severity: 'success',
      summary: 'SSH editada',
      detail: `Sesión SSH actualizada`,
      life: 3000
    });
  }, [editSSHName, editSSHHost, editSSHUser, editSSHPassword, editSSHRemoteFolder, editSSHPort, editSSHNode, nodes, setNodes, findNodeByKey, deepCopy, parseWallixUser, closeEditSSHDialogWithReset, setEditSSHNode, setEditSSHName, setEditSSHHost, setEditSSHUser, setEditSSHPassword, setEditSSHRemoteFolder, setEditSSHPort, toast]);

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
  }, [editFolderName, editFolderNode, nodes, setNodes, findNodeByKey, deepCopy, closeFolderDialogWithReset, setEditFolderNode, setEditFolderName, toast]);

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
    setEditSSHRemoteFolder(node.data?.remoteFolder || '');
    setEditSSHPort(node.data?.port || 22);
    // Usar el diálogo unificado en modo edición SSH
    setShowUnifiedConnectionDialog(true);
  }, [setEditSSHNode, setEditSSHName, setEditSSHHost, setEditSSHUser, setEditSSHPassword, setEditSSHRemoteFolder, setEditSSHPort, setShowUnifiedConnectionDialog]);

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
            clientType: rdpData.clientType || 'mstsc',
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
            autoResize: rdpData.autoResize === true,
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
          clientType: rdpData.clientType || 'mstsc',
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
          autoResize: rdpData.autoResize === true,
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
                clientType: rdpData.clientType || 'mstsc',
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
                autoResize: rdpData.autoResize === true,
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

    // Cerrar el diálogo del RdpManager
    setShowRdpManager(false);
    setShowUnifiedConnectionDialog(false); // Cerrar diálogo unificado
    setRdpNodeData(null);
    setEditingRdpNode(null);
  }, [setNodes, findNodeByKey, setRdpTabs, setShowRdpManager, setShowUnifiedConnectionDialog, setRdpNodeData, setEditingRdpNode]);

  return {
    // Funciones de creación
    createNewFolder,
    createNewSSH,
    createNewRdp,
    
    // Funciones de edición
    saveEditSSH,
    saveEditFolder,
    
    // Funciones de diálogos
    openEditSSHDialog,
    openNewRdpDialog,
    closeRdpDialog,
    openEditRdpDialog,
    handleSaveRdpToSidebar
  };
};

