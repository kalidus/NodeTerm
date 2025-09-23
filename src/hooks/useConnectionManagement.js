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
  const openFileExplorer = useCallback((sshNode) => {
    // Registrar reciente (Explorer)
    try {
      connectionStore.recordRecent({
        type: 'explorer',
        name: sshNode.label,
        host: sshNode.data?.host,
        username: sshNode.data?.user,
        port: sshNode.data?.port || 22
      }, 10);
    } catch (e) { /* noop */ }

    // Buscar si ya existe un explorador para este host+usuario
    const existingExplorerIndex = sshTabs.findIndex(tab => 
      tab.isExplorerInSSH && 
      tab.sshConfig.host === sshNode.data.host && 
      tab.sshConfig.username === sshNode.data.user
    );
    
    if (existingExplorerIndex !== -1) {
      // Activar la pestaña existente del explorador
      setActiveTabIndex(existingExplorerIndex);
      return;
    }
    
    // Crear el explorador SIN conexión SSH propia - reutilizará conexiones existentes del pool
    const explorerTabId = `explorer_${sshNode.key}_${Date.now()}`;
    const sshConfig = {
      host: sshNode.data.useBastionWallix ? sshNode.data.targetServer : sshNode.data.host,
      username: sshNode.data.user,
      password: sshNode.data.password,
      port: sshNode.data.port || 22,
      originalKey: sshNode.key,
      // Datos del bastión Wallix
      useBastionWallix: sshNode.data.useBastionWallix || false,
      bastionHost: sshNode.data.bastionHost || '',
      bastionUser: sshNode.data.bastionUser || ''
    };
    
    // NO crear conexión SSH nueva - el FileExplorer usará el pool existente
    const nowTs = Date.now();
    const newExplorerTab = {
      key: explorerTabId,
      label: sshNode.label,
      originalKey: sshNode.key,
      sshConfig: sshConfig,
      type: 'explorer',
      createdAt: nowTs,
      needsOwnConnection: false, // Cambio importante: NO necesita su propia conexión
      isExplorerInSSH: true, // Flag para identificarla como explorador en el array SSH
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

    // Registrar como reciente (SSH)
    try {
      connectionStore.recordRecent({
        type: 'ssh',
        name: conn.name,
        host: conn.host,
        username: conn.username,
        port: conn.port
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
        password: isSidebarNode ? nodeOrConn.data.password : (nodeOrConn.password || matchedSidebarNode?.data?.password || ''),
        port: conn.port,
        originalKey: conn.originalKey,
        useBastionWallix: isSidebarNode ? (nodeOrConn.data.useBastionWallix || false) : (nodeOrConn.useBastionWallix || matchedSidebarNode?.data?.useBastionWallix || false),
        bastionHost: isSidebarNode ? (nodeOrConn.data.bastionHost || '') : (nodeOrConn.bastionHost || matchedSidebarNode?.data?.bastionHost || ''),
        bastionUser: isSidebarNode ? (nodeOrConn.data.bastionUser || '') : (nodeOrConn.bastionUser || matchedSidebarNode?.data?.bastionUser || ''),
        targetServer: isSidebarNode ? (nodeOrConn.data.targetServer || '') : (nodeOrConn.targetServer || matchedSidebarNode?.data?.targetServer || ''),
        remoteFolder: isSidebarNode ? (nodeOrConn.data.remoteFolder || '') : (nodeOrConn.remoteFolder || matchedSidebarNode?.data?.remoteFolder || '')
      };
      const newTab = {
        key: tabId,
        label: `${conn.name} (${prevTabs.filter(t => t.originalKey === conn.originalKey).length + 1})`,
        originalKey: conn.originalKey,
        sshConfig: sshConfig,
        type: 'terminal',
        createdAt: nowTs,
        groupId: null
      };
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
        autoResize: node.autoResize || false,
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
    
    // Registrar como reciente (RDP)
    try {
      connectionStore.recordRecent({
        type: 'rdp-guacamole',
        name: node.label || node.name,
        host: baseRdp.server || baseRdp.host || baseRdp.hostname,
        username: baseRdp.username || baseRdp.user,
        port: baseRdp.port || 3389
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
      
      // Debug: verificar qué campos tiene baseRdp
      console.log('🔍 [DEBUG] baseRdp fields:', {
        guacEnableDrive: baseRdp.guacEnableDrive,
        guacDriveHostDir: baseRdp.guacDriveHostDir,
        hasDriveHostDir: !!baseRdp.guacDriveHostDir,
        driveHostDirLength: baseRdp.guacDriveHostDir?.length || 0
      });

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
          label: `${connectionName} (${prevTabs.filter(t => t.originalKey === originalKey).length + 1})`,
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

  // === RETORNO DEL HOOK ===
  return {
    onOpenSSHConnection,
    onOpenRdpConnection,
    openFileExplorer
  };
};
