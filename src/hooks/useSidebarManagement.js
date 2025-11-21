import { useState, useRef, useCallback } from 'react';
import connectionStore, { helpers as connectionHelpers } from '../utils/connectionStore';
import { STORAGE_KEYS } from '../utils/constants';

export const useSidebarManagement = (toast, tabManagementProps = {}) => {
  // === ESTADO DEL SIDEBAR ===
  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TREE_DATA);
    
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error parsing tree data:', error);
      return [];
    }
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [isGeneralTreeMenu, setIsGeneralTreeMenu] = useState(false);
  
  // === ESTADO DE SELECCIÓN Y FILTRO ===
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [sidebarFilter, setSidebarFilter] = useState('');
  
  // === REFERENCIAS ===
  const sidebarCallbacksRef = useRef({});

  // === FUNCIONES AUXILIARES ===
  
  // Función para detectar y parsear formato Wallix
  const parseWallixUser = useCallback((userString) => {
    // Formato Wallix: usuario@dominio@servidor:protocolo:usuario_destino
    // Ejemplo: rt01119@default@ESJC-SGCT-NX02P:SSH:rt01119
    const wallixPattern = /^(.+)@(.+)@(.+):(.+):(.+)$/;
    const match = userString.match(wallixPattern);
    
    if (match) {
      const [, bastionUser, domain, targetServer, protocol, targetUser] = match;
      return {
        isWallix: true,
        bastionUser: userString, // El usuario completo para el bastión
        targetUser: targetUser,
        targetServer: targetServer,
        protocol: protocol,
        domain: domain
      };
    }
    
    return {
      isWallix: false,
      targetUser: userString
    };
  }, []);

  // === Active connections set for Home hub ===
  const getActiveConnectionIds = useCallback((sshTabs, rdpTabs, guacamoleTabs, fileExplorerTabs) => {
    const result = new Set();
    try {
      sshTabs.forEach(tab => {
        const id = connectionHelpers.buildId({ 
          type: 'ssh', 
          host: tab.sshConfig?.host, 
          username: tab.sshConfig?.username, 
          port: tab.sshConfig?.port 
        });
        result.add(id);
      });
      rdpTabs.forEach(tab => {
        const id = connectionHelpers.buildId({ 
          type: 'rdp-guacamole', 
          host: tab.rdpConfig?.hostname, 
          username: tab.rdpConfig?.username, 
          port: tab.rdpConfig?.port 
        });
        result.add(id);
      });
      guacamoleTabs.forEach(tab => {
        const id = connectionHelpers.buildId({ 
          type: 'rdp-guacamole', 
          host: tab.rdpConfig?.hostname, 
          username: tab.rdpConfig?.username, 
          port: tab.rdpConfig?.port 
        });
        result.add(id);
      });
      fileExplorerTabs.forEach(tab => {
        const id = connectionHelpers.buildId({ 
          type: 'explorer', 
          host: tab.sshConfig?.host, 
          username: tab.sshConfig?.username, 
          port: tab.sshConfig?.port 
        });
        result.add(id);
      });
    } catch (_) {}
    return result;
  }, []);

  // === Función para buscar conexiones en el árbol de nodos ===
  const findAllConnections = useCallback((nodes) => {
    let results = [];
    for (const node of nodes) {
      if (node.data && (node.data.type === 'ssh' || node.data.type === 'rdp' || node.data.type === 'rdp-guacamole')) {
        results.push(node);
      }
      if (node.children && node.children.length > 0) {
        results = results.concat(findAllConnections(node.children));
      }
    }
    return results;
  }, []);

  // === FUNCIONES DE MENÚ CONTEXTUAL ===
  
  // Función para generar items del menú contextual del árbol
  const getTreeContextMenuItems = useCallback((node) => {
    const {
      activeGroupId, setActiveGroupId, activeTabIndex, setActiveTabIndex,
      setGroupActiveIndices, setSshTabs, setLastOpenedTabKey, setOnCreateActivateTabKey,
      getFilteredTabs, openFileExplorer, openInSplit, onOpenRdpConnection
    } = tabManagementProps;
    if (!node) return [];
    const isFolder = node.droppable;
    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && node.data.type === 'rdp';
    const isFileConnection = node.data && (node.data.type === 'sftp' || node.data.type === 'ftp' || node.data.type === 'scp');
    const isPassword = node.data && node.data.type === 'password';
    const items = [];
    
    if (isSSH) {
      items.push({
        label: 'Abrir Terminal',
        icon: 'pi pi-desktop',
        command: () => {
          if (activeGroupId !== null) {
            const currentGroupKey = activeGroupId || 'no-group';
            setGroupActiveIndices(prev => ({
              ...prev,
              [currentGroupKey]: activeTabIndex
            }));
            setActiveGroupId(null);
          }
          setSshTabs(prevTabs => {
            const tabId = `${node.key}_${Date.now()}`;
            const sshConfig = {
              host: node.data.useBastionWallix ? node.data.targetServer : node.data.host,
              username: node.data.user,
              password: node.data.password,
              port: node.data.port || 22,
              originalKey: node.key,
              useBastionWallix: node.data.useBastionWallix || false,
              bastionHost: node.data.bastionHost || '',
              bastionUser: node.data.bastionUser || ''
            };
            const newTab = {
              key: tabId,
              label: node.label,
              originalKey: node.key,
              sshConfig: sshConfig,
              type: 'terminal',
              createdAt: Date.now(),
              groupId: null
            };
            // Activación inmediata y orden por createdAt
            setLastOpenedTabKey(tabId);
            setOnCreateActivateTabKey(tabId);
            setActiveTabIndex(1);
            setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
            return [newTab, ...prevTabs];
          });
        }
      });
      
      // Opción de explorador de archivos
      items.push({
        label: 'Abrir Explorador de Archivos',
        icon: 'pi pi-folder-open',
        command: () => openFileExplorer(node)
      });
      
      // Opción de auditoría de sesiones
      items.push({
        label: '📼 Auditoría',
        icon: 'pi pi-video',
        command: () => {
          // Crear tab de auditoría
          if (activeGroupId !== null) {
            const currentGroupKey = activeGroupId || 'no-group';
            setGroupActiveIndices(prev => ({
              ...prev,
              [currentGroupKey]: activeTabIndex
            }));
            setActiveGroupId(null);
          }
          
          setSshTabs(prevTabs => {
            const tabId = `audit_${node.key}_${Date.now()}`;
            const connectionInfo = {
              host: node.data.useBastionWallix ? node.data.targetServer : node.data.host,
              username: node.data.user,
              port: node.data.port || 22,
              name: node.label
            };
            
            const newTab = {
              key: tabId,
              label: `📼 ${node.label}`,
              originalKey: node.key,
              type: 'audit',
              connectionInfo: connectionInfo,
              createdAt: Date.now(),
              groupId: null
            };
            
            // Activación inmediata
            setLastOpenedTabKey(tabId);
            setOnCreateActivateTabKey(tabId);
            setActiveTabIndex(1);
            setGroupActiveIndices(prev => ({ ...prev, 'no-group': 1 }));
            return [newTab, ...prevTabs];
          });
        }
      });
      
      items.push({
        label: 'Agregar/Quitar de Favoritos',
        icon: 'pi pi-star',
        command: () => {
          try {
            connectionStore.toggleFavorite({
              type: 'ssh',
              name: node.label,
              host: node.data?.useBastionWallix ? node.data?.targetServer : node.data?.host,
              username: node.data?.user,
              port: node.data?.port || 22,
              password: node.data?.password || '',
              useBastionWallix: node.data?.useBastionWallix || false,
              bastionHost: node.data?.bastionHost || '',
              bastionUser: node.data?.bastionUser || '',
              targetServer: node.data?.targetServer || '',
              remoteFolder: node.data?.remoteFolder || ''
            });
          } catch (e) { /* noop */ }
        }
      });
      
      // Submenu para abrir en split solo si hay pestañas SSH abiertas
      const sshTabsFiltered = getFilteredTabs().filter(tab => tab.type === 'terminal');
      if (sshTabsFiltered.length > 0) {
        items.push({
          label: 'Abrir en Split',
          icon: 'pi pi-window-maximize',
          command: () => openInSplit(node, sshTabsFiltered[0], 'vertical'), // Clic directo: vertical con primera pestaña
          items: sshTabsFiltered.map(tab => ({
            label: tab.label,
            icon: 'pi pi-desktop',
            items: [
              {
                label: 'Split vertical',
                icon: 'pi pi-arrows-v',
                command: () => openInSplit(node, tab, 'vertical')
              },
              {
                label: 'Split horizontal',
                icon: 'pi pi-arrows-h',
                command: () => openInSplit(node, tab, 'horizontal')
              }
            ]
          }))
        });
      }
      
      items.push({ separator: true });
      items.push({
        label: 'Duplicar',
        icon: 'pi pi-copy',
        command: () => {
          if (sidebarCallbacksRef.current.duplicateSSH) {
            sidebarCallbacksRef.current.duplicateSSH(node);
          }
        }
      });
      items.push({
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          if (sidebarCallbacksRef.current.editSSH) {
            sidebarCallbacksRef.current.editSSH(node);
          }
        }
      });
      items.push({
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => {
          if (sidebarCallbacksRef.current.deleteNode) {
            sidebarCallbacksRef.current.deleteNode(node.key, node.label);
          }
        }
      });
    } else if (isRDP) {
      items.push({
        label: 'Conectar RDP',
        icon: 'pi pi-desktop',
        command: () => onOpenRdpConnection(node, nodes)
      });
      items.push({
        label: 'Agregar/Quitar de Favoritos',
        icon: 'pi pi-star',
        command: () => {
          try {
            connectionStore.toggleFavorite({
              type: 'rdp',
              name: node.label,
              host: node.data?.host || node.data?.server || node.data?.hostname,
              username: node.data?.username,
              port: node.data?.port || 3389,
              password: node.data?.password || '',
              clientType: node.data?.clientType || 'guacamole',
              domain: node.data?.domain || '',
              resolution: node.data?.resolution || '1024x768',
              colors: node.data?.colors || '32',
              // Opciones avanzadas de RDP (usar nombres consistentes con el formulario)
              guacEnableWallpaper: node.data?.guacEnableWallpaper || node.data?.enableWallpaper || false,
              guacEnableDesktopComposition: node.data?.guacEnableDesktopComposition || node.data?.enableDesktopComposition || false,
              guacEnableFontSmoothing: node.data?.guacEnableFontSmoothing || node.data?.enableFontSmoothing || false,
              guacEnableTheming: node.data?.guacEnableTheming || node.data?.enableTheming || false,
              guacEnableFullWindowDrag: node.data?.guacEnableFullWindowDrag || node.data?.enableFullWindowDrag || false,
              guacEnableMenuAnimations: node.data?.guacEnableMenuAnimations || node.data?.enableMenuAnimations || false,
              guacEnableGfx: node.data?.guacEnableGfx || node.data?.enableGfx || false,
              guacDisableGlyphCaching: node.data?.guacDisableGlyphCaching || node.data?.disableGlyphCaching || false,
              guacDisableOffscreenCaching: node.data?.guacDisableOffscreenCaching || node.data?.disableOffscreenCaching || false,
              guacDisableBitmapCaching: node.data?.guacDisableBitmapCaching || node.data?.disableBitmapCaching || false,
              guacDisableCopyRect: node.data?.guacDisableCopyRect || node.data?.disableCopyRect || false,
              autoResize: node.data?.autoResize !== false, // Por defecto true, solo false si explícitamente se establece
              guacDpi: node.data?.guacDpi || 96,
              guacSecurity: node.data?.guacSecurity || 'any',
              redirectFolders: node.data?.redirectFolders !== false,
              redirectClipboard: node.data?.redirectClipboard !== false,
              redirectPrinters: node.data?.redirectPrinters || false,
              redirectAudio: node.data?.redirectAudio !== false,
              fullscreen: node.data?.fullscreen || false,
              smartSizing: node.data?.smartSizing !== false,
              span: node.data?.span || false,
              admin: node.data?.admin || false
            });
          } catch (e) { /* noop */ }
        }
      });
      items.push({ separator: true });
      items.push({
        label: 'Duplicar',
        icon: 'pi pi-copy',
        command: () => {
          if (sidebarCallbacksRef.current.duplicateRDP) {
            sidebarCallbacksRef.current.duplicateRDP(node);
          }
        }
      });
      items.push({
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          if (sidebarCallbacksRef.current.editRDP) {
            sidebarCallbacksRef.current.editRDP(node);
          }
        }
      });
      items.push({
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => {
          if (sidebarCallbacksRef.current.deleteNode) {
            sidebarCallbacksRef.current.deleteNode(node.key, node.label);
          }
        }
      });
    } else if (isFileConnection) {
      const protocol = node.data?.protocol || node.data?.type || 'sftp';
      const protocolLabel = protocol.toUpperCase();
      
      items.push({
        label: `Abrir Explorador ${protocolLabel}`,
        icon: 'pi pi-folder-open',
        command: () => {
          if (activeGroupId !== null) {
            const currentGroupKey = activeGroupId || 'no-group';
            setGroupActiveIndices(prev => ({
              ...prev,
              [currentGroupKey]: activeTabIndex
            }));
            setActiveGroupId(null);
          }
          openFileExplorer(node);
        }
      });
      
      items.push({
        label: 'Agregar/Quitar de Favoritos',
        icon: 'pi pi-star',
        command: () => {
          try {
            connectionStore.toggleFavorite({
              type: protocol,
              name: node.label,
              host: node.data?.host,
              username: node.data?.username || node.data?.user,
              port: node.data?.port || (protocol === 'ftp' ? 21 : 22),
              password: node.data?.password || '',
              protocol: protocol,
              remoteFolder: node.data?.remoteFolder || '',
              targetFolder: node.data?.targetFolder || ''
            });
          } catch (e) { /* noop */ }
        }
      });
      
      items.push({ separator: true });
      items.push({
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          console.log('🟣 [useSidebarManagement] Editando conexión de archivos:', node);
          console.log('🟣 [useSidebarManagement] node.data.type:', node.data?.type);
          console.log('🟣 [useSidebarManagement] node.data.protocol:', node.data?.protocol);
          console.log('🟣 [useSidebarManagement] editFileConnection existe:', !!sidebarCallbacksRef.current.editFileConnection);
          if (sidebarCallbacksRef.current.editFileConnection) {
            sidebarCallbacksRef.current.editFileConnection(node);
          } else {
            console.error('❌ [useSidebarManagement] editFileConnection NO está definido!');
          }
        }
      });
      items.push({
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => {
          if (sidebarCallbacksRef.current.deleteNode) {
            sidebarCallbacksRef.current.deleteNode(node.key, node.label);
          }
        }
      });
    } else if (isPassword) {
      // Solo opción de eliminar para passwords antiguos en la sidebar de conexiones
      items.push({
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => {
          if (sidebarCallbacksRef.current.deleteNode) {
            sidebarCallbacksRef.current.deleteNode(node.key, node.label);
          }
        }
      });
    } else if (isFolder) {
      items.push({
        label: 'Nueva Carpeta',
        icon: 'pi pi-folder',
        command: () => {
          if (sidebarCallbacksRef.current.createFolder) {
            sidebarCallbacksRef.current.createFolder(node.key);
          }
        }
      });
      items.push({
        label: 'Nueva Conexión SSH',
        icon: 'pi pi-desktop',
        command: () => {
          if (sidebarCallbacksRef.current.createSSH) {
            sidebarCallbacksRef.current.createSSH(node.key);
          }
        }
      });
      items.push({
        label: 'Nueva Conexión RDP',
        icon: 'pi pi-desktop',
        command: () => {
          if (sidebarCallbacksRef.current.createRDP) {
            sidebarCallbacksRef.current.createRDP(node.key);
          }
        }
      });
      items.push({ separator: true });
      items.push({
        label: 'Duplicar Carpeta',
        icon: 'pi pi-copy',
        command: () => {
          if (sidebarCallbacksRef.current.duplicateFolder) {
            sidebarCallbacksRef.current.duplicateFolder(node);
          }
        }
      });
      items.push({
        label: 'Editar Carpeta',
        icon: 'pi pi-pencil',
        command: () => {
          if (sidebarCallbacksRef.current.editFolder) {
            sidebarCallbacksRef.current.editFolder(node);
          }
        }
      });
      items.push({
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => {
          if (sidebarCallbacksRef.current.deleteNode) {
            sidebarCallbacksRef.current.deleteNode(node.key, node.label);
          }
        }
      });
    }
    return items;
  }, [tabManagementProps]);

  // Función para generar items del menú contextual general del árbol
  const getGeneralTreeContextMenuItems = useCallback(() => {
    return [
      {
        label: 'Nueva Carpeta',
        icon: 'pi pi-folder',
        command: () => {
          if (sidebarCallbacksRef.current.createFolder) {
            sidebarCallbacksRef.current.createFolder(null); // null = crear en raíz
          }
        }
      },
      {
        label: 'Nueva Conexión SSH',
        icon: 'pi pi-desktop',
        command: () => {
          if (sidebarCallbacksRef.current.createSSH) {
            sidebarCallbacksRef.current.createSSH();
          }
        }
      }
    ];
  }, []);

  return {
    // Estado
    nodes, setNodes,
    selectedNode, setSelectedNode,
    isGeneralTreeMenu, setIsGeneralTreeMenu,
    
    // Estado de selección y filtro
    selectedNodeKey, setSelectedNodeKey,
    sidebarFilter, setSidebarFilter,
    
    // Referencias
    sidebarCallbacksRef,
    
    // Funciones auxiliares
    parseWallixUser,
    getActiveConnectionIds,
    findAllConnections,
    
    // Funciones de menú contextual
    getTreeContextMenuItems,
    getGeneralTreeContextMenuItems
  };
};
