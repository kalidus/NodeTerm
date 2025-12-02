import { useCallback } from 'react';
import connectionStore from '../utils/connectionStore';

export const useConnectionManagement = ({
  // Estados del hook de pestañas
  activeGroupId,
  setActiveGroupId,
  activeTabIndex,
  setActiveTabIndex,
  setGroupActiveIndices,
  setLastOpenedTabKey,
  setOnCreateActivateTabKey,
  setOpenTabOrder,
  
  // Estados de pestañas
  sshTabs,
  setSshTabs,
  rdpTabs,
  setRdpTabs,
  
  // Toast para notificaciones
  toast
}) => {

  // === FUNCIÓN PARA ABRIR EXPLORADOR DE ARCHIVOS ===
  const openFileExplorer = useCallback((fileNode) => {
    // Detectar si es SSH tradicional o conexión de archivos (SFTP/FTP/SCP)
    const nodeType = fileNode.data?.type || 'ssh';
    const isFileConnection = nodeType === 'sftp' || nodeType === 'ftp' || nodeType === 'scp';
    const protocol = fileNode.data?.protocol || nodeType;
    
    // Registrar reciente
    try {
      connectionStore.recordRecent({
        type: isFileConnection ? protocol : 'explorer',
        name: fileNode.label,
        host: fileNode.data?.host,
        username: fileNode.data?.user || fileNode.data?.username,
        port: fileNode.data?.port || (protocol === 'ftp' ? 21 : 22),
        password: fileNode.data?.password || '',
        protocol: isFileConnection ? protocol : undefined,
        useBastionWallix: fileNode.data?.useBastionWallix || false,
        bastionHost: fileNode.data?.bastionHost || '',
        bastionUser: fileNode.data?.bastionUser || '',
        targetServer: fileNode.data?.targetServer || '',
        remoteFolder: fileNode.data?.remoteFolder || ''
      }, 10);
    } catch (e) { /* noop */ }

    // Buscar si ya existe un explorador para este host+usuario+protocolo
    const existingExplorerIndex = sshTabs.findIndex(tab => 
      tab.isExplorerInSSH && 
      tab.sshConfig.host === fileNode.data.host && 
      tab.sshConfig.username === (fileNode.data.user || fileNode.data.username) &&
      tab.sshConfig.protocol === (isFileConnection ? protocol : undefined)
    );
    
    if (existingExplorerIndex !== -1) {
      // Activar la pestaña existente del explorador
      setActiveTabIndex(existingExplorerIndex);
      return;
    }
    
    // Crear el explorador
    const explorerTabId = `explorer_${fileNode.key}_${Date.now()}`;
    const config = {
      host: fileNode.data.useBastionWallix ? fileNode.data.targetServer : fileNode.data.host,
      username: fileNode.data.user || fileNode.data.username,
      password: fileNode.data.password,
      port: fileNode.data.port || (protocol === 'ftp' ? 21 : 22),
      originalKey: fileNode.key,
      // Protocolo para SFTP/FTP/SCP
      protocol: isFileConnection ? protocol : undefined,
      // Datos del bastión Wallix (si aplica)
      useBastionWallix: fileNode.data.useBastionWallix || false,
      bastionHost: fileNode.data.bastionHost || '',
      bastionUser: fileNode.data.bastionUser || ''
    };
    
    const nowTs = Date.now();
    const newExplorerTab = {
      key: explorerTabId,
      label: fileNode.label,
      originalKey: fileNode.key,
      sshConfig: config, // Mantener nombre sshConfig para compatibilidad
      type: 'explorer',
      createdAt: nowTs,
      needsOwnConnection: false,
      isExplorerInSSH: true,
      groupId: null
    };
    
    // Insertar y activar como última abierta
    setSshTabs(prevSshTabs => [newExplorerTab, ...prevSshTabs]);
    setLastOpenedTabKey(explorerTabId);
    setOnCreateActivateTabKey(explorerTabId);
    setActiveTabIndex(1);
    setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
    setOpenTabOrder(prev => [explorerTabId, ...prev.filter(k => k !== explorerTabId)]);
  }, [sshTabs, setSshTabs, setLastOpenedTabKey, setOnCreateActivateTabKey, setActiveTabIndex, setGroupActiveIndices, setOpenTabOrder]);

  // === FUNCIÓN PARA ABRIR CONEXIONES DE ARCHIVOS (SFTP/FTP/SCP) ===
  const onOpenFileConnection = useCallback((node, nodes) => {
    // Si no estamos en el grupo Home, cambiar a Home primero
    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: activeTabIndex
      }));
      setActiveGroupId(null);
    }

    const protocol = node.data?.protocol || node.data?.type || 'sftp';
    const host = node.data?.host || '';
    const username = node.data?.user || node.data?.username || '';
    const password = node.data?.password || '';
    const port = node.data?.port || (protocol === 'ftp' ? 21 : 22);

    // Registrar como reciente
    try {
      connectionStore.recordRecent({
        type: protocol,
        name: node.label || node.name,
        host: host,
        username: username,
        port: port,
        password: password,
        protocol: protocol,
        remoteFolder: node.data?.remoteFolder || '',
        targetFolder: node.data?.targetFolder || ''
      }, 10);
    } catch (e) { /* noop */ }

    // Abrir explorador de archivos
    openFileExplorer(node);
  }, [activeGroupId, activeTabIndex, setGroupActiveIndices, setActiveGroupId, openFileExplorer]);

  // === FUNCIÓN PARA ABRIR CONEXIONES SSH ===
  const onOpenSSHConnection = useCallback((nodeOrConn, nodes) => {
    // Permitir recibir un nodo de sidebar (con .data) o un objeto de conexión directo (desde Home/Favoritos)
    const isSidebarNode = !!(nodeOrConn && nodeOrConn.data);
    const conn = isSidebarNode ? {
      type: nodeOrConn.data?.type || 'ssh',
      name: nodeOrConn.label,
      host: nodeOrConn.data?.useBastionWallix ? nodeOrConn.data?.targetServer : nodeOrConn.data?.host,
      username: nodeOrConn.data?.user,
      port: nodeOrConn.data?.port || 22,
      originalKey: nodeOrConn.key
    } : {
      type: nodeOrConn?.type || 'ssh',
      name: nodeOrConn?.name,
      host: nodeOrConn?.host,
      username: nodeOrConn?.username,
      port: nodeOrConn?.port || 22,
      originalKey: nodeOrConn?.id || `manual_${Date.now()}`
    };

    // Si viene desde Favoritos/Recientes (sin .data), usar la información guardada como primera opción
    let matchedSidebarNode = null;
    if (!isSidebarNode && conn && conn.host && conn.username) {
      // Para conexiones de favoritos, usar la información guardada directamente
      const favoriteData = {
        password: nodeOrConn.password || '',
        useBastionWallix: nodeOrConn.useBastionWallix || false,
        bastionHost: nodeOrConn.bastionHost || '',
        bastionUser: nodeOrConn.bastionUser || '',
        targetServer: nodeOrConn.targetServer || '',
        remoteFolder: nodeOrConn.remoteFolder || ''
      };
      
      // Solo si no hay información completa guardada, buscar en la sidebar como fallback
      if (!favoriteData.password && !favoriteData.useBastionWallix) {
        const matchesConn = (node) => {
          if (!node || !node.data || node.data.type !== 'ssh') return false;
          const hostMatches = (node.data.host === conn.host) || (node.data.targetServer === conn.host) || (node.data.hostname === conn.host);
          const userMatches = (node.data.user === conn.username) || (node.data.username === conn.username);
          const portMatches = (node.data.port || 22) === (conn.port || 22);
          return hostMatches && userMatches && portMatches;
        };
        const dfs = (list) => {
          if (!Array.isArray(list)) return;
          for (const n of list) {
            if (matchesConn(n)) { 
              matchedSidebarNode = n; 
              return; 
            }
            if (n.children && n.children.length > 0) dfs(n.children);
            if (matchedSidebarNode) return;
          }
        };
        dfs(nodes);
      }
    }

    // Si es un favorito de tipo Explorer, abrir explorador en lugar de terminal
    if (conn.type === 'explorer') {
      const pseudoNode = {
        label: conn.name,
        data: { host: conn.host, user: conn.username, port: conn.port, type: 'ssh' },
        key: conn.originalKey
      };
      openFileExplorer(pseudoNode);
      return;
    }

    // Obtener password y verificar si debe copiarse automáticamente
    const password = isSidebarNode ? nodeOrConn.data.password : (nodeOrConn.password || matchedSidebarNode?.data?.password || '');
    const autoCopyPassword = isSidebarNode ? (nodeOrConn.data.autoCopyPassword || false) : (matchedSidebarNode?.data?.autoCopyPassword || false);
    
    // Copiar password automáticamente si está configurado
    if (autoCopyPassword && password) {
      try {
        if (window.electron?.clipboard?.writeText) {
          window.electron.clipboard.writeText(password);
        } else {
          navigator.clipboard.writeText(password);
        }
        
        // Mostrar notificación si está disponible
        if (window.toast?.current?.show) {
          window.toast.current.show({ 
            severity: 'success', 
            summary: 'Password copiado', 
            detail: 'Contraseña copiada al portapapeles automáticamente', 
            life: 2000 
          });
        }
      } catch (err) {
        console.error('Error copiando password automáticamente:', err);
      }
    }
    
    // Registrar como reciente (SSH) - incluir todas las credenciales y configuración
    try {
      connectionStore.recordRecent({
        type: 'ssh',
        name: conn.name,
        host: conn.host,
        username: conn.username,
        port: conn.port,
        password: password,
        useBastionWallix: isSidebarNode ? (nodeOrConn.data.useBastionWallix || false) : (nodeOrConn.useBastionWallix || matchedSidebarNode?.data?.useBastionWallix || false),
        bastionHost: isSidebarNode ? (nodeOrConn.data.bastionHost || '') : (nodeOrConn.bastionHost || matchedSidebarNode?.data?.bastionHost || ''),
        bastionUser: isSidebarNode ? (nodeOrConn.data.bastionUser || '') : (nodeOrConn.bastionUser || matchedSidebarNode?.data?.bastionUser || ''),
        targetServer: isSidebarNode ? (nodeOrConn.data.targetServer || '') : (nodeOrConn.targetServer || matchedSidebarNode?.data?.targetServer || ''),
        remoteFolder: isSidebarNode ? (nodeOrConn.data.remoteFolder || '') : (nodeOrConn.remoteFolder || matchedSidebarNode?.data?.remoteFolder || '')
      }, 10);
    } catch (e) { /* noop */ }

    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: activeTabIndex
      }));
      setActiveGroupId(null);
    }
    setSshTabs(prevTabs => {
      const nowTs = Date.now();
      const tabId = `${conn.originalKey}_${nowTs}`;
      const sshConfig = {
        host: conn.host,
        username: conn.username,
        password: password,
        port: conn.port,
        originalKey: conn.originalKey,
        name: conn.name,
        useBastionWallix: isSidebarNode ? (nodeOrConn.data.useBastionWallix || false) : (nodeOrConn.useBastionWallix || matchedSidebarNode?.data?.useBastionWallix || false),
        bastionHost: isSidebarNode ? (nodeOrConn.data.bastionHost || '') : (nodeOrConn.bastionHost || matchedSidebarNode?.data?.bastionHost || ''),
        bastionUser: isSidebarNode ? (nodeOrConn.data.bastionUser || '') : (nodeOrConn.bastionUser || matchedSidebarNode?.data?.bastionUser || ''),
        targetServer: isSidebarNode ? (nodeOrConn.data.targetServer || '') : (nodeOrConn.targetServer || matchedSidebarNode?.data?.targetServer || ''),
        remoteFolder: isSidebarNode ? (nodeOrConn.data.remoteFolder || '') : (nodeOrConn.remoteFolder || matchedSidebarNode?.data?.remoteFolder || '')
      };
      const newTab = {
        key: tabId,
        label: conn.name,
        originalKey: conn.originalKey,
        sshConfig: sshConfig,
        type: 'terminal',
        createdAt: nowTs,
        groupId: null
      };

      // Iniciar grabación automática si está habilitada
      const autoRecordingEnabled = localStorage.getItem('audit_auto_recording') === 'true';
      if (autoRecordingEnabled && window.electron?.ipcRenderer) {
        const recordingQuality = localStorage.getItem('audit_recording_quality') || 'medium';
        const encryptRecordings = localStorage.getItem('audit_encrypt_recordings') === 'true';
        
        const recordingMetadata = {
          host: sshConfig.useBastionWallix ? sshConfig.bastionHost : sshConfig.host,
          username: sshConfig.useBastionWallix ? sshConfig.bastionUser : sshConfig.username,
          port: sshConfig.port || 22,
          connectionType: 'ssh',
          useBastionWallix: sshConfig.useBastionWallix || false,
          bastionHost: sshConfig.bastionHost || null,
          bastionUser: sshConfig.bastionUser || null,
          sessionName: `${conn.name}_${nowTs}`,
          title: `${sshConfig.username}@${sshConfig.host}`,
          cols: 80,
          rows: 24,
          shell: '/bin/bash'
        };

        // Iniciar grabación de forma asíncrona
        window.electron.ipcRenderer.invoke('recording:start', {
          tabId: tabId,
          metadata: recordingMetadata
        }).then(result => {
          if (result.success) {
            console.log(`📹 Grabación automática iniciada: ${result.recordingId}`);
            // Guardar ID de grabación en la pestaña para referencia
            newTab.recordingId = result.recordingId;
          } else {
            console.warn('⚠️ Error iniciando grabación automática:', result.error);
          }
        }).catch(error => {
          console.error('Error iniciando grabación automática:', error);
        });
      }
      // Activar como última abierta (índice 1) y registrar orden de apertura
      setLastOpenedTabKey(tabId);
      setOnCreateActivateTabKey(tabId);
      setActiveTabIndex(1);
      setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
      setOpenTabOrder(prev => [tabId, ...prev.filter(k => k !== tabId)]);
      return [newTab, ...prevTabs];
    });
  }, [activeGroupId, activeTabIndex, setGroupActiveIndices, setActiveGroupId, setSshTabs, setLastOpenedTabKey, setOnCreateActivateTabKey, setActiveTabIndex, setOpenTabOrder, openFileExplorer]);

  // === FUNCIÓN PARA ABRIR CONEXIONES RDP ===
  const onOpenRdpConnection = useCallback((node, nodes) => {
    // Si no estamos en el grupo Home, cambiar a Home primero
    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: activeTabIndex
      }));
      setActiveGroupId(null);
    }

    // Detectar si es RDP-Guacamole o RDP nativo
    // Manejar tanto conexiones desde sidebar (node.data) como desde ConnectionHistory (node directo)
    const nodeData = node.data || node; // Fallback para ConnectionHistory

    // Si viene desde Favoritos/Recientes (sin .data), usar la información guardada como primera opción
    let baseRdp = nodeData;
    if (!node.data) {
      // Para conexiones de favoritos, usar la información guardada directamente
      const hostValue = node.host || node.hostname || '';
      baseRdp = {
        server: hostValue,
        host: hostValue,
        hostname: hostValue,
        username: node.username,
        user: node.username,
        password: node.password || '',
        port: node.port || 3389,
        clientType: node.clientType || 'guacamole',
        type: node.type || 'rdp-guacamole',
        domain: node.domain || '',
        resolution: node.resolution || '1024x768',
        colors: node.colors || '32',
        // Opciones avanzadas de RDP (usar nombres consistentes con el formulario)
        guacEnableWallpaper: node.guacEnableWallpaper || node.enableWallpaper || false,
        guacEnableDesktopComposition: node.guacEnableDesktopComposition || node.enableDesktopComposition || false,
        guacEnableFontSmoothing: node.guacEnableFontSmoothing || node.enableFontSmoothing || false,
        guacEnableTheming: node.guacEnableTheming || node.enableTheming || false,
        guacEnableFullWindowDrag: node.guacEnableFullWindowDrag || node.enableFullWindowDrag || false,
        guacEnableMenuAnimations: node.guacEnableMenuAnimations || node.enableMenuAnimations || false,
        guacEnableGfx: node.guacEnableGfx || node.enableGfx || false,
        guacDisableGlyphCaching: node.guacDisableGlyphCaching || node.disableGlyphCaching || false,
        guacDisableOffscreenCaching: node.guacDisableOffscreenCaching || node.disableOffscreenCaching || false,
        guacDisableBitmapCaching: node.guacDisableBitmapCaching || node.disableBitmapCaching || false,
        guacDisableCopyRect: node.guacDisableCopyRect || node.disableCopyRect || false,
        autoResize: node.autoResize !== false, // Por defecto true, solo false si explícitamente se establece
        guacDpi: node.guacDpi || 96,
        guacSecurity: node.guacSecurity || 'any',
        redirectFolders: node.redirectFolders !== false,
        redirectClipboard: node.redirectClipboard !== false,
        redirectPrinters: node.redirectPrinters || false,
        redirectAudio: node.redirectAudio !== false,
        fullscreen: node.fullscreen || false,
        smartSizing: node.smartSizing !== false,
        span: node.span || false,
        admin: node.admin || false
      };
      
      // Solo si no hay password guardado, intentar buscar en la sidebar como fallback
      if (!baseRdp.password) {
        const matchesRdp = (n) => {
          if (!n || !n.data) return false;
          const isRdp = n.data.type === 'rdp' || n.data.type === 'rdp-guacamole';
          if (!isRdp) return false;
          const hostA = (n.data.server || n.data.host || n.data.hostname || '').toLowerCase();
          const hostB = (baseRdp.server || baseRdp.host || baseRdp.hostname || '').toLowerCase();
          const userA = (n.data.username || n.data.user || '').toLowerCase();
          const userB = (baseRdp.username || baseRdp.user || '').toLowerCase();
          const portA = n.data.port || 3389;
          const portB = baseRdp.port || 3389;
          return hostA === hostB && userA === userB && portA === portB;
        };
        const dfs = (list) => {
          if (!Array.isArray(list)) return;
          for (const n of list) {
            if (matchesRdp(n)) { 
              // Usar la información de la sidebar para completar los campos faltantes
              baseRdp.password = n.data.password || baseRdp.password;
              baseRdp.clientType = n.data.clientType || baseRdp.clientType;
              baseRdp.domain = n.data.domain || baseRdp.domain;
              baseRdp.resolution = n.data.resolution || baseRdp.resolution;
              baseRdp.colors = n.data.colors || baseRdp.colors;
              // Opciones avanzadas de RDP (usar nombres consistentes con el formulario)
              baseRdp.guacEnableWallpaper = n.data.guacEnableWallpaper !== undefined ? n.data.guacEnableWallpaper : (n.data.enableWallpaper !== undefined ? n.data.enableWallpaper : baseRdp.guacEnableWallpaper);
              baseRdp.guacEnableDesktopComposition = n.data.guacEnableDesktopComposition !== undefined ? n.data.guacEnableDesktopComposition : (n.data.enableDesktopComposition !== undefined ? n.data.enableDesktopComposition : baseRdp.guacEnableDesktopComposition);
              baseRdp.guacEnableFontSmoothing = n.data.guacEnableFontSmoothing !== undefined ? n.data.guacEnableFontSmoothing : (n.data.enableFontSmoothing !== undefined ? n.data.enableFontSmoothing : baseRdp.guacEnableFontSmoothing);
              baseRdp.guacEnableTheming = n.data.guacEnableTheming !== undefined ? n.data.guacEnableTheming : (n.data.enableTheming !== undefined ? n.data.enableTheming : baseRdp.guacEnableTheming);
              baseRdp.guacEnableFullWindowDrag = n.data.guacEnableFullWindowDrag !== undefined ? n.data.guacEnableFullWindowDrag : (n.data.enableFullWindowDrag !== undefined ? n.data.enableFullWindowDrag : baseRdp.guacEnableFullWindowDrag);
              baseRdp.guacEnableMenuAnimations = n.data.guacEnableMenuAnimations !== undefined ? n.data.guacEnableMenuAnimations : (n.data.enableMenuAnimations !== undefined ? n.data.enableMenuAnimations : baseRdp.guacEnableMenuAnimations);
              baseRdp.guacEnableGfx = n.data.guacEnableGfx !== undefined ? n.data.guacEnableGfx : (n.data.enableGfx !== undefined ? n.data.enableGfx : baseRdp.guacEnableGfx);
              baseRdp.guacDisableGlyphCaching = n.data.guacDisableGlyphCaching !== undefined ? n.data.guacDisableGlyphCaching : (n.data.disableGlyphCaching !== undefined ? n.data.disableGlyphCaching : baseRdp.guacDisableGlyphCaching);
              baseRdp.guacDisableOffscreenCaching = n.data.guacDisableOffscreenCaching !== undefined ? n.data.guacDisableOffscreenCaching : (n.data.disableOffscreenCaching !== undefined ? n.data.disableOffscreenCaching : baseRdp.guacDisableOffscreenCaching);
              baseRdp.guacDisableBitmapCaching = n.data.guacDisableBitmapCaching !== undefined ? n.data.guacDisableBitmapCaching : (n.data.disableBitmapCaching !== undefined ? n.data.disableBitmapCaching : baseRdp.guacDisableBitmapCaching);
              baseRdp.guacDisableCopyRect = n.data.guacDisableCopyRect !== undefined ? n.data.guacDisableCopyRect : (n.data.disableCopyRect !== undefined ? n.data.disableCopyRect : baseRdp.guacDisableCopyRect);
              baseRdp.autoResize = n.data.autoResize !== undefined ? n.data.autoResize : baseRdp.autoResize;
              baseRdp.guacDpi = n.data.guacDpi || baseRdp.guacDpi;
              baseRdp.guacSecurity = n.data.guacSecurity || baseRdp.guacSecurity;
              baseRdp.redirectFolders = n.data.redirectFolders !== undefined ? n.data.redirectFolders : baseRdp.redirectFolders;
              baseRdp.redirectClipboard = n.data.redirectClipboard !== undefined ? n.data.redirectClipboard : baseRdp.redirectClipboard;
              baseRdp.redirectPrinters = n.data.redirectPrinters !== undefined ? n.data.redirectPrinters : baseRdp.redirectPrinters;
              baseRdp.redirectAudio = n.data.redirectAudio !== undefined ? n.data.redirectAudio : baseRdp.redirectAudio;
              baseRdp.fullscreen = n.data.fullscreen !== undefined ? n.data.fullscreen : baseRdp.fullscreen;
              baseRdp.smartSizing = n.data.smartSizing !== undefined ? n.data.smartSizing : baseRdp.smartSizing;
              baseRdp.span = n.data.span !== undefined ? n.data.span : baseRdp.span;
              baseRdp.admin = n.data.admin !== undefined ? n.data.admin : baseRdp.admin;
              return; 
            }
            if (n.children && n.children.length > 0) dfs(n.children);
          }
        };
        dfs(nodes);
      }
    }
    const isGuacamoleRDP = baseRdp.clientType === 'guacamole' || baseRdp.type === 'rdp-guacamole';
    
    // Registrar como reciente (RDP) - incluir todas las credenciales y configuración
    try {
      connectionStore.recordRecent({
        type: 'rdp-guacamole',
        name: node.label || node.name,
        host: baseRdp.server || baseRdp.host || baseRdp.hostname,
        username: baseRdp.username || baseRdp.user,
        port: baseRdp.port || 3389,
        password: baseRdp.password || '',
        clientType: baseRdp.clientType || 'guacamole',
        domain: baseRdp.domain || '',
        resolution: baseRdp.resolution || '1024x768',
        colors: baseRdp.colors || '32',
        // Opciones avanzadas de RDP
        guacEnableWallpaper: baseRdp.guacEnableWallpaper || false,
        guacEnableDesktopComposition: baseRdp.guacEnableDesktopComposition || false,
        guacEnableFontSmoothing: baseRdp.guacEnableFontSmoothing || false,
        guacEnableTheming: baseRdp.guacEnableTheming || false,
        guacEnableFullWindowDrag: baseRdp.guacEnableFullWindowDrag || false,
        guacEnableMenuAnimations: baseRdp.guacEnableMenuAnimations || false,
        guacEnableGfx: baseRdp.guacEnableGfx || false,
        guacDisableGlyphCaching: baseRdp.guacDisableGlyphCaching || false,
        guacDisableOffscreenCaching: baseRdp.guacDisableOffscreenCaching || false,
        guacDisableBitmapCaching: baseRdp.guacDisableBitmapCaching || false,
        guacDisableCopyRect: baseRdp.guacDisableCopyRect || false,
        autoResize: baseRdp.autoResize !== false,
        guacDpi: baseRdp.guacDpi || 96,
        guacSecurity: baseRdp.guacSecurity || 'any',
        redirectFolders: baseRdp.redirectFolders !== false,
        redirectClipboard: baseRdp.redirectClipboard !== false,
        redirectPrinters: baseRdp.redirectPrinters || false,
        redirectAudio: baseRdp.redirectAudio !== false,
        fullscreen: baseRdp.fullscreen || false,
        smartSizing: baseRdp.smartSizing !== false,
        span: baseRdp.span || false,
        admin: baseRdp.admin || false
      }, 10);
    } catch (e) { /* noop */ }
    
    if (isGuacamoleRDP) {
      // === NUEVA LÓGICA: RDP-Guacamole como pestañas independientes ===
      // Calcular resolución dinámica si autoResize está activado
      let dynamicWidth = parseInt(baseRdp.resolution?.split('x')[0]) || 1024;
      let dynamicHeight = parseInt(baseRdp.resolution?.split('x')[1]) || 768;
      
      if (baseRdp.autoResize) {
        // Usar dimensiones dinámicas basadas en la ventana
        dynamicWidth = Math.floor(window.innerWidth * 0.8);
        dynamicHeight = Math.floor(window.innerHeight * 0.7);
      }
      

      const rdpConfig = {
        hostname: baseRdp.server || baseRdp.host || baseRdp.hostname,
        username: baseRdp.username || baseRdp.user,
        password: baseRdp.password || 'password', // En producción desde vault
        port: baseRdp.port || 3389,
        width: dynamicWidth,  // ← NÚMEROS, no string
        height: dynamicHeight, // ← NÚMEROS, no string
        dpi: baseRdp.guacDpi || 96,
        colorDepth: baseRdp.colorDepth || 32,
        enableDrive: baseRdp.guacEnableDrive === true,
        driveHostDir: baseRdp.guacDriveHostDir || undefined,
        enableWallpaper: baseRdp.guacEnableWallpaper === true,
        security: baseRdp.guacSecurity || 'any',
        // Campos específicos de Guacamole
        autoResize: baseRdp.autoResize === true,
        // Forzar congelación de resizes iniciales para camuflar RDProxy
        freezeInitialResize: true,
        enableGfx: (baseRdp.guacEnableGfx === true) || (baseRdp.guacWin11Compat === true),
        // Características visuales
        enableDesktopComposition: baseRdp.guacEnableDesktopComposition === true,
        enableFontSmoothing: baseRdp.guacEnableFontSmoothing === true,
        enableTheming: baseRdp.guacEnableTheming === true,
        enableFullWindowDrag: baseRdp.guacEnableFullWindowDrag === true,
        enableMenuAnimations: baseRdp.guacEnableMenuAnimations === true,
        disableGlyphCaching: baseRdp.guacDisableGlyphCaching === true,
        disableOffscreenCaching: baseRdp.guacDisableOffscreenCaching === true,
        disableBitmapCaching: baseRdp.guacDisableBitmapCaching === true,
        disableCopyRect: baseRdp.guacDisableCopyRect === true,
        redirectClipboard: baseRdp.redirectClipboard === true,
        redirectPrinters: baseRdp.redirectPrinters === true,
        redirectAudio: baseRdp.redirectAudio === true,
        fullscreen: baseRdp.fullscreen === true,
        span: baseRdp.span === true
      };

      // Crear pestaña RDP-Guacamole igual que SSH
      setRdpTabs(prevTabs => {
        const tabId = `${node.key || node.id || 'rdp'}_${Date.now()}`;
        const connectionName = node.label || node.name || 'RDP Connection';
        const originalKey = node.key || node.id || tabId;
        
        const newTab = {
          key: tabId,
          label: connectionName,
          originalKey: originalKey,
          rdpConfig: rdpConfig,
          type: 'rdp-guacamole',
          groupId: null
        };
        // Marcar y activar usando la clave REAL creada y registrar orden de apertura
        setLastOpenedTabKey(tabId);
        setOnCreateActivateTabKey(tabId);
        setActiveTabIndex(1);
        setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
        setOpenTabOrder(prev => [tabId, ...prev.filter(k => k !== tabId)]);
        return [newTab, ...prevTabs];
      });
      
      return; // Salir aquí para RDP-Guacamole
    }

    // === LÓGICA EXISTENTE: RDP Nativo (mstsc) ===
    const rdpConfig = {
      name: node.label,
      server: node.data.server,
      username: node.data.username,
      password: node.data.password,
      port: node.data.port || 3389,
      clientType: node.data.clientType || 'guacamole',
      resolution: node.data.resolution || '1920x1080',
      colorDepth: node.data.colorDepth || 32,
      redirectFolders: node.data.redirectFolders === true,
      redirectClipboard: node.data.redirectClipboard === true,
      redirectPrinters: node.data.redirectPrinters === true,
      redirectAudio: node.data.redirectAudio === true,
      fullscreen: node.data.fullscreen === true,
      smartSizing: node.data.smartSizing === true,
      span: node.data.span === true,
      admin: node.data.admin === true,
      public: node.data.public === true
    };

    // Verificar si ya existe una pestaña RDP para la misma conexión
    const existingRdpTab = rdpTabs.find(tab => 
      tab.type === 'rdp' && 
      tab.rdpConfig && 
      tab.rdpConfig.server === rdpConfig.server && 
      tab.rdpConfig.username === rdpConfig.username &&
      tab.rdpConfig.port === rdpConfig.port
    );
    
    if (existingRdpTab) {
      // Si ya existe una pestaña RDP para esta conexión, solo activarla
      const allTabs = [...sshTabs, ...rdpTabs];
      const tabIndex = allTabs.findIndex(tab => tab.key === existingRdpTab.key);
      if (tabIndex !== -1) {
        setActiveTabIndex(tabIndex);
        
        toast.current?.show({
          severity: 'info',
          summary: 'Conexión RDP',
          detail: 'Ya existe una pestaña RDP para esta conexión',
          life: 3000
        });
      }
      return; // No crear nueva conexión
    } else {
      // Crear nueva pestaña RDP solo si no existe para esta conexión
      const tabId = `rdp_${node.key}_${Date.now()}`;
      const newRdpTab = {
        key: tabId,
        label: node.label,
        originalKey: node.key,
        rdpConfig: rdpConfig,
        type: 'rdp',
        node: node,
        groupId: null
      };
      
      // Agregar la pestaña RDP y marcar para activar/mostrar tras Inicio
      setRdpTabs(prevTabs => [{ ...newRdpTab, createdAt: Date.now() }, ...prevTabs]);
      setLastOpenedTabKey(tabId);
      setOnCreateActivateTabKey(tabId);
      // Activar índice 1 (después de Inicio) – el reorden virtual lo moverá visualmente
      setActiveTabIndex(1);
      setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
    }

    // Manejar diferentes tipos de cliente RDP
    if (rdpConfig.clientType === 'guacamole') {
      // Para Guacamole, solo crear la pestaña vacía por ahora
      toast.current?.show({
        severity: 'info',
        summary: 'Guacamole Lite',
        detail: 'Pestaña de Guacamole creada (funcionalidad en desarrollo)',
        life: 3000
      });
    } else {
      // Para mstsc, conectar automáticamente
      window.electron.ipcRenderer.invoke('rdp:connect', rdpConfig)
        .then(result => {
          if (result.success) {
            // Actualizar el estado de la pestaña RDP para que se active el botón "Mostrar Ventana"
            setRdpTabs(prevTabs => {
              return prevTabs.map(tab => {
                if (tab.type === 'rdp') {
                  return {
                    ...tab,
                    connectionStatus: 'connected',
                    connectionInfo: {
                      server: rdpConfig.server,
                      username: rdpConfig.username,
                      port: rdpConfig.port,
                      resolution: rdpConfig.resolution,
                      startTime: new Date().toISOString(),
                      sessionId: result.connectionId || `rdp_${tab.key}_${Date.now()}`
                    }
                  };
                }
                return tab;
              });
            });
          
          toast.current?.show({
            severity: 'success',
            summary: 'Conexión RDP',
            detail: 'Conexión RDP iniciada correctamente',
            life: 3000
          });
        } else {
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: result.error || 'Error al conectar RDP',
            life: 3000
          });
        }
      })
      .catch(error => {
        console.error('Error al conectar RDP:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al conectar RDP',
          life: 3000
        });
      });
    }
  }, [activeGroupId, activeTabIndex, setGroupActiveIndices, setActiveGroupId, setRdpTabs, setLastOpenedTabKey, setOnCreateActivateTabKey, setActiveTabIndex, setOpenTabOrder, rdpTabs, sshTabs, toast]);

  // === FUNCIÓN PARA ABRIR CONEXIONES VNC ===
  const onOpenVncConnection = useCallback((node, nodes) => {
    // Si no estamos en el grupo Home, cambiar a Home primero
    if (activeGroupId !== null) {
      const currentGroupKey = activeGroupId || 'no-group';
      setGroupActiveIndices(prev => ({
        ...prev,
        [currentGroupKey]: activeTabIndex
      }));
      setActiveGroupId(null);
    }

    // Manejar tanto conexiones desde sidebar (node.data) como desde ConnectionHistory (node directo)
    const nodeData = node.data || node; // Fallback para ConnectionHistory

    // Si viene desde Favoritos/Recientes (sin .data), usar la información guardada directamente
    let baseVnc = nodeData;
    if (!node.data) {
      // Para conexiones de favoritos, usar la información guardada directamente
      const hostValue = node.host || node.hostname || '';
      baseVnc = {
        server: hostValue,
        host: hostValue,
        hostname: hostValue,
        password: node.password || '',
        port: node.port || 5900,
        clientType: node.clientType || 'guacamole',
        type: node.type || 'vnc-guacamole',
        resolution: node.resolution || '1024x768',
        colors: node.colors || '32',
        // Opciones avanzadas de VNC
        readOnly: node.readOnly || false,
        enableCompression: node.enableCompression !== false, // Por defecto true
        imageQuality: node.imageQuality || 'lossless', // lossless, lossy-low, lossy-medium, lossy-high
        autoReconnect: node.autoReconnect !== false, // Por defecto true
        autoResize: node.autoResize !== false, // Por defecto true
        redirectClipboard: node.redirectClipboard !== false,
        guacDpi: node.guacDpi || 96
      };
      
      // Solo si no hay password guardado, intentar buscar en la sidebar como fallback
      if (!baseVnc.password) {
        const matchesVnc = (n) => {
          if (!n || !n.data) return false;
          const isVnc = n.data.type === 'vnc' || n.data.type === 'vnc-guacamole';
          if (!isVnc) return false;
          const hostA = (n.data.server || n.data.host || n.data.hostname || '').toLowerCase();
          const hostB = (baseVnc.server || baseVnc.host || baseVnc.hostname || '').toLowerCase();
          const portA = n.data.port || 5900;
          const portB = baseVnc.port || 5900;
          return hostA === hostB && portA === portB;
        };
        const dfs = (list) => {
          if (!Array.isArray(list)) return;
          for (const n of list) {
            if (matchesVnc(n)) { 
              // Usar la información de la sidebar para completar los campos faltantes
              baseVnc.password = n.data.password || baseVnc.password;
              baseVnc.clientType = n.data.clientType || baseVnc.clientType;
              baseVnc.resolution = n.data.resolution || baseVnc.resolution;
              baseVnc.colors = n.data.colors || baseVnc.colors;
              baseVnc.readOnly = n.data.readOnly !== undefined ? n.data.readOnly : baseVnc.readOnly;
              baseVnc.enableCompression = n.data.enableCompression !== undefined ? n.data.enableCompression : baseVnc.enableCompression;
              baseVnc.imageQuality = n.data.imageQuality || baseVnc.imageQuality;
              baseVnc.autoReconnect = n.data.autoReconnect !== undefined ? n.data.autoReconnect : baseVnc.autoReconnect;
              baseVnc.autoResize = n.data.autoResize !== undefined ? n.data.autoResize : baseVnc.autoResize;
              baseVnc.redirectClipboard = n.data.redirectClipboard !== undefined ? n.data.redirectClipboard : baseVnc.redirectClipboard;
              baseVnc.guacDpi = n.data.guacDpi || baseVnc.guacDpi;
              return; 
            }
            if (n.children && n.children.length > 0) dfs(n.children);
          }
        };
        dfs(nodes);
      }
    }
    const isGuacamoleVNC = baseVnc.clientType === 'guacamole' || baseVnc.type === 'vnc-guacamole';
    
    // Registrar como reciente (VNC) - incluir todas las credenciales y configuración
    try {
      connectionStore.recordRecent({
        type: 'vnc-guacamole',
        name: node.label || node.name,
        host: baseVnc.server || baseVnc.host || baseVnc.hostname,
        port: baseVnc.port || 5900,
        password: baseVnc.password || '',
        clientType: baseVnc.clientType || 'guacamole',
        resolution: baseVnc.resolution || '1024x768',
        colors: baseVnc.colors || '32',
        // Opciones avanzadas de VNC
        readOnly: baseVnc.readOnly || false,
        enableCompression: baseVnc.enableCompression !== false,
        imageQuality: baseVnc.imageQuality || 'lossless',
        autoReconnect: baseVnc.autoReconnect !== false,
        autoResize: baseVnc.autoResize !== false,
        redirectClipboard: baseVnc.redirectClipboard !== false,
        guacDpi: baseVnc.guacDpi || 96
      }, 10);
    } catch (e) { /* noop */ }
    
    if (isGuacamoleVNC) {
      // === VNC-Guacamole como pestañas independientes ===
      // Calcular resolución dinámica si autoResize está activado
      let dynamicWidth = parseInt(baseVnc.resolution?.split('x')[0]) || 1024;
      let dynamicHeight = parseInt(baseVnc.resolution?.split('x')[1]) || 768;
      
      if (baseVnc.autoResize) {
        // Usar dimensiones dinámicas basadas en la ventana
        dynamicWidth = Math.floor(window.innerWidth * 0.8);
        dynamicHeight = Math.floor(window.innerHeight * 0.7);
      }
      
      const vncConfig = {
        connectionType: 'vnc', // Indicar que es VNC
        hostname: baseVnc.server || baseVnc.host || baseVnc.hostname,
        password: baseVnc.password || '',
        port: baseVnc.port || 5900,
        width: dynamicWidth,  // ← NÚMEROS, no string
        height: dynamicHeight, // ← NÚMEROS, no string
        dpi: baseVnc.guacDpi || 96,
        colorDepth: baseVnc.colorDepth || parseInt(baseVnc.colors) || 32,
        // Campos específicos de VNC
        autoResize: baseVnc.autoResize === true,
        freezeInitialResize: true,
        readOnly: baseVnc.readOnly === true,
        enableCompression: baseVnc.enableCompression !== false,
        imageQuality: baseVnc.imageQuality || 'lossless',
        autoReconnect: baseVnc.autoReconnect !== false,
        redirectClipboard: baseVnc.redirectClipboard === true
      };

      // Crear pestaña VNC-Guacamole igual que RDP-Guacamole
      setRdpTabs(prevTabs => {
        const tabId = `${node.key || node.id || 'vnc'}_${Date.now()}`;
        const connectionName = node.label || node.name || 'VNC Connection';
        const originalKey = node.key || node.id || tabId;
        
        const newTab = {
          key: tabId,
          label: connectionName,
          originalKey: originalKey,
          rdpConfig: vncConfig, // Reutilizar rdpConfig para mantener compatibilidad con GuacamoleTerminal
          type: 'vnc-guacamole',
          groupId: null
        };
        // Marcar y activar usando la clave REAL creada y registrar orden de apertura
        setLastOpenedTabKey(tabId);
        setOnCreateActivateTabKey(tabId);
        setActiveTabIndex(1);
        setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
        setOpenTabOrder(prev => [tabId, ...prev.filter(k => k !== tabId)]);
        return [newTab, ...prevTabs];
      });
      
      return; // Salir aquí para VNC-Guacamole
    }
  }, [activeGroupId, activeTabIndex, setGroupActiveIndices, setActiveGroupId, setRdpTabs, setLastOpenedTabKey, setOnCreateActivateTabKey, setActiveTabIndex, setOpenTabOrder, toast]);

  // === RETORNO DEL HOOK ===
  return {
    onOpenSSHConnection,
    onOpenRdpConnection,
    onOpenVncConnection,
    onOpenFileConnection,
    openFileExplorer
  };
};
