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
              label: `${node.label} (${prevTabs.filter(t => t.originalKey === node.key).length + 1})`,
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
              port: node.data?.port || 22
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
              host: node.data?.hostname,
              username: node.data?.username,
              port: node.data?.port || 3389
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
