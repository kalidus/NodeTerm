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
      getFilteredTabs, openFileExplorer, openInSplit, onOpenRdpConnection, onOpenVncConnection
    } = tabManagementProps;
    if (!node) return [];
    const isFolder = node.droppable;
    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && node.data.type === 'rdp';
    const isVNC = node.data && (node.data.type === 'vnc' || node.data.type === 'vnc-guacamole');
    const isFileConnection = node.data && (node.data.type === 'sftp' || node.data.type === 'ftp' || node.data.type === 'scp');
    const isPassword = node.data && node.data.type === 'password';
    const isSSHTunnel = node.data && node.data.type === 'ssh-tunnel';
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
              name: node.label,
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
              password: node.data?.password || ''
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

      // Opción para copiar contraseña
      if (node.data?.password) {
        items.push({
          label: 'Copiar contraseña',
          icon: 'pi pi-key',
          command: async () => {
            try {
              if (window.electron?.clipboard?.writeText) {
                await window.electron.clipboard.writeText(node.data.password);
              } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(node.data.password);
              }
              // Mostrar toast de confirmación
              if (window.toast?.current?.show) {
                window.toast.current.show({
                  severity: 'success',
                  summary: 'Copiado',
                  detail: 'Contraseña copiada al portapapeles',
                  life: 1500
                });
              }
            } catch (error) {
              console.error('Error copiando contraseña:', error);
              if (window.toast?.current?.show) {
                window.toast.current.show({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'No se pudo copiar la contraseña',
                  life: 3000
                });
              }
            }
          }
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
              password: node.data?.password || ''
            });
          } catch (e) { /* noop */ }
        }
      });

      // Opción para copiar contraseña en RDP
      if (node.data?.password) {
        items.push({
          label: 'Copiar contraseña',
          icon: 'pi pi-key',
          command: async () => {
            try {
              if (window.electron?.clipboard?.writeText) {
                await window.electron.clipboard.writeText(node.data.password);
              } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(node.data.password);
              }
              // Mostrar toast de confirmación
              if (window.toast?.current?.show) {
                window.toast.current.show({
                  severity: 'success',
                  summary: 'Copiado',
                  detail: 'Contraseña copiada al portapapeles',
                  life: 1500
                });
              }
            } catch (error) {
              console.error('Error copiando contraseña:', error);
              if (window.toast?.current?.show) {
                window.toast.current.show({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'No se pudo copiar la contraseña',
                  life: 3000
                });
              }
            }
          }
        });
      }

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
    } else if (isVNC) {
      items.push({
        label: 'Conectar VNC',
        icon: 'pi pi-desktop',
        command: () => onOpenVncConnection(node, nodes)
      });
      items.push({
        label: 'Agregar/Quitar de Favoritos',
        icon: 'pi pi-star',
        command: () => {
          try {
            connectionStore.toggleFavorite({
              type: 'vnc',
              name: node.label,
              host: node.data?.host || node.data?.server || node.data?.hostname,
              port: node.data?.port || 5900,
              password: node.data?.password || ''
            });
          } catch (e) { /* noop */ }
        }
      });

      // Opción para copiar contraseña en VNC
      if (node.data?.password) {
        items.push({
          label: 'Copiar contraseña',
          icon: 'pi pi-key',
          command: async () => {
            try {
              if (window.electron?.clipboard?.writeText) {
                await window.electron.clipboard.writeText(node.data.password);
              } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(node.data.password);
              }
              // Mostrar toast de confirmación
              if (window.toast?.current?.show) {
                window.toast.current.show({
                  severity: 'success',
                  summary: 'Copiado',
                  detail: 'Contraseña copiada al portapapeles',
                  life: 1500
                });
              }
            } catch (error) {
              console.error('Error copiando contraseña:', error);
              if (window.toast?.current?.show) {
                window.toast.current.show({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'No se pudo copiar la contraseña',
                  life: 3000
                });
              }
            }
          }
        });
      }

      items.push({ separator: true });
      items.push({
        label: 'Duplicar',
        icon: 'pi pi-copy',
        command: () => {
          if (sidebarCallbacksRef.current.duplicateVNC) {
            sidebarCallbacksRef.current.duplicateVNC(node);
          }
        }
      });
      items.push({
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          if (sidebarCallbacksRef.current.editVNC) {
            sidebarCallbacksRef.current.editVNC(node);
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
              password: node.data?.password || ''
            });
          } catch (e) { /* noop */ }
        }
      });
      
      items.push({ separator: true });
      items.push({
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          if (sidebarCallbacksRef.current.editFileConnection) {
            sidebarCallbacksRef.current.editFileConnection(node);
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
      // Opción para copiar contraseña en conexiones de tipo password
      if (node.data?.password) {
        items.push({
          label: 'Copiar contraseña',
          icon: 'pi pi-key',
          command: async () => {
            try {
              if (window.electron?.clipboard?.writeText) {
                await window.electron.clipboard.writeText(node.data.password);
              } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(node.data.password);
              }
              // Mostrar toast de confirmación
              if (window.toast?.current?.show) {
                window.toast.current.show({
                  severity: 'success',
                  summary: 'Copiado',
                  detail: 'Contraseña copiada al portapapeles',
                  life: 1500
                });
              }
            } catch (error) {
              console.error('Error copiando contraseña:', error);
              if (window.toast?.current?.show) {
                window.toast.current.show({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'No se pudo copiar la contraseña',
                  life: 3000
                });
              }
            }
          }
        });
      }

      items.push({
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => {
          if (sidebarCallbacksRef.current.deleteNode) {
            sidebarCallbacksRef.current.deleteNode(node.key, node.label);
          }
        }
      });
    } else if (isSSHTunnel) {
      // Abrir túnel
      items.push({
        label: 'Abrir Túnel',
        icon: 'pi pi-share-alt',
        command: () => {
          if (sidebarCallbacksRef.current.openSSHTunnel) {
            sidebarCallbacksRef.current.openSSHTunnel(node, nodes);
          }
        }
      });
      
      // Opción para copiar contraseña
      if (node.data?.sshPassword) {
        items.push({
          label: 'Copiar contraseña',
          icon: 'pi pi-key',
          command: async () => {
            try {
              if (window.electron?.clipboard?.writeText) {
                await window.electron.clipboard.writeText(node.data.sshPassword);
              } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(node.data.sshPassword);
              }
              // Mostrar toast de confirmación
              if (window.toast?.current?.show) {
                window.toast.current.show({
                  severity: 'success',
                  summary: 'Copiado',
                  detail: 'Contraseña copiada al portapapeles',
                  life: 1500
                });
              }
            } catch (error) {
              console.error('Error copiando contraseña:', error);
              if (window.toast?.current?.show) {
                window.toast.current.show({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'No se pudo copiar la contraseña',
                  life: 3000
                });
              }
            }
          }
        });
      }
      
      items.push({ separator: true });
      items.push({
        label: 'Duplicar',
        icon: 'pi pi-copy',
        command: () => {
          if (sidebarCallbacksRef.current.duplicateSSHTunnel) {
            sidebarCallbacksRef.current.duplicateSSHTunnel(node);
          }
        }
      });
      items.push({
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
          if (sidebarCallbacksRef.current.editSSHTunnel) {
            sidebarCallbacksRef.current.editSSHTunnel(node);
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
        label: 'Nueva Conexión',
        icon: 'pi pi-desktop',
        command: () => {
          if (sidebarCallbacksRef.current.createSSH) {
            sidebarCallbacksRef.current.createSSH(node.key);
          }
        }
      });
      items.push({ separator: true });
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
        label: 'Nueva Conexión',
        icon: 'pi pi-sitemap',
        command: () => {
          // Abrir diálogo de selección de protocolo
          if (sidebarCallbacksRef.current.showProtocolSelection) {
            sidebarCallbacksRef.current.showProtocolSelection();
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
