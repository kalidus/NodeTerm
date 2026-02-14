import { useState, useRef, useCallback, useEffect } from 'react';
import connectionStore, { helpers as connectionHelpers } from '../utils/connectionStore';
import { unblockAllInputs } from '../utils/formDebugger';
import localStorageSyncService from '../services/LocalStorageSyncService';
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

  // Ref para el flag de reload externo (evita que Sidebar re-persista datos importados)
  const isExternalReloadRef = useRef(false);

  // Ref para controlar el último mtime conocido del archivo
  const lastKnownMtimeRef = useRef(0);

  // Ref para comparar contenido y evitar re-renders innecesarios
  const lastContentHashRef = useRef(localStorage.getItem(STORAGE_KEYS.TREE_DATA) || '');

  // Función para recargar nodos desde localStorage (para multi-instancia tras sync)
  const reloadNodes = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TREE_DATA);
      if (saved) {
        console.log('[useSidebarManagement] Recargando nodos desde localStorage...');
        isExternalReloadRef.current = true;
        setNodes(JSON.parse(saved));
      }
    } catch (e) {
      console.error('[useSidebarManagement] Error recargando nodos:', e);
    }
  }, []);

  // 🔄 ROBUST POLLING: Check mtime every 2s
  useEffect(() => {
    if (!window.electron?.appdata?.getLastModified) return;

    // Inicializar lastKnownMtime
    window.electron.appdata.getLastModified().then(mtime => {
      lastKnownMtimeRef.current = mtime;
    });

    const interval = setInterval(async () => {
      try {
        const mtime = await window.electron.appdata.getLastModified();

        // Si el archivo no ha cambiado, no hacer nada
        if (mtime <= lastKnownMtimeRef.current) return;

        console.log(`[Polling] 🔔 Cambio detectado: mtime ${mtime} > last ${lastKnownMtimeRef.current}`);
        lastKnownMtimeRef.current = mtime;

        const allData = await window.electron.appdata.getAll();
        if (!allData || !allData[STORAGE_KEYS.TREE_DATA]) return;

        const remoteJson = allData[STORAGE_KEYS.TREE_DATA];

        // Evitar loop: si el contenido es idéntico al último conocido, ignorar
        if (remoteJson === lastContentHashRef.current) {
          return;
        }

        console.log('[Polling] 📥 Datos nuevos recibidos. Actualizando sidebar...');
        lastContentHashRef.current = remoteJson;

        // Actualizar localStorage
        localStorage.setItem(STORAGE_KEYS.TREE_DATA, remoteJson);

        // Actualizar caché de memoria para proteger contra lecturas fallidas
        localStorageSyncService.updateCache(STORAGE_KEYS.TREE_DATA, remoteJson);

        // Marcar como externo y actualizar estado
        isExternalReloadRef.current = true;
        setNodes(JSON.parse(remoteJson));

      } catch (err) {
        console.error('[Polling] ❌ Error en intervalo:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Función para actualizar hash localmente (llamada por Sidebar cuando guarda)
  const updateTreeHash = useCallback((jsonStr) => {
    lastContentHashRef.current = jsonStr;
  }, []);
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

    // Función recursiva para procesar cualquier nodo de pestaña (terminal, explorer, split, etc.)
    const processTabNode = (node) => {
      if (!node) return;

      // 1. Manejar splits (recursivo)
      if (node.type === 'split') {
        processTabNode(node.first);
        processTabNode(node.second);
        // Compatibilidad con formato antiguo si existe
        if (node.leftTerminal) processTabNode(node.leftTerminal);
        if (node.rightTerminal) processTabNode(node.rightTerminal);
        return;
      }

      // 2. Manejar terminales y exploradores (SSH, SFTP, FTP, SCP)
      if (node.type === 'terminal' || node.type === 'ssh' || node.type === 'explorer') {
        const config = node.sshConfig || node.data || node;
        if (!config || (!config.host && !config.hostname && !config.server)) return;

        // Determinar protocolo para buildId
        // Prioridad: protocolo explícito > tipo explorer > ssh por defecto
        let type = config.protocol;
        if (!type) {
          type = node.type === 'explorer' ? 'explorer' : 'ssh';
        }

        const id = connectionHelpers.buildId({
          type,
          host: config.host || config.hostname || config.server,
          username: config.username || config.user,
          port: config.port
        });
        result.add(id);
      }
      // 3. Manejar RDP, VNC y Guacamole genérico
      else if (node.type === 'rdp-guacamole' || node.type === 'rdp' || node.type === 'vnc-guacamole' || node.type === 'vnc' || node.type === 'guacamole') {
        const config = node.rdpConfig || node.config || node.data || node;
        if (!config || (!config.hostname && !config.host && !config.server)) return;

        let type = node.type;
        // Normalizar tipos a los que usa connectionStore/buildId
        if (type === 'rdp' || type === 'guacamole') type = 'rdp-guacamole';
        if (type === 'vnc') type = 'vnc-guacamole';

        const id = connectionHelpers.buildId({
          type: type,
          host: config.hostname || config.host || config.server,
          username: config.username || config.user,
          port: config.port
        });
        result.add(id);
      }
    };

    try {
      if (Array.isArray(sshTabs)) sshTabs.forEach(processTabNode);
      if (Array.isArray(rdpTabs)) rdpTabs.forEach(processTabNode);
      if (Array.isArray(guacamoleTabs)) guacamoleTabs.forEach(processTabNode);
      if (Array.isArray(fileExplorerTabs)) fileExplorerTabs.forEach(processTabNode);
    } catch (e) {
      console.error('[getActiveConnectionIds] Error:', e);
    }

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
            const connection = {
              type: 'ssh',
              name: node.label,
              host: node.data?.useBastionWallix ? node.data?.targetServer : node.data?.host,
              username: node.data?.user,
              port: node.data?.port || 22,
              password: node.data?.password || ''
            };
            // Emitir evento para que el ConnectionHistory muestre el selector de grupos
            window.dispatchEvent(new CustomEvent('request-add-favorite-with-groups', {
              detail: { connection }
            }));
          } catch (e) { /* noop */ }
        }
      });


      // Función helper para contar terminales en árbol
      const countTerminalsInTab = (tab) => {
        if (tab.type === 'terminal') return 1;
        if (tab.type === 'split') {
          const countInNode = (node) => {
            if (!node) return 0;
            if (node.type === 'terminal') return 1;
            if (node.type === 'split') {
              return countInNode(node.first) + countInNode(node.second);
            }
            return 0;
          };
          return countInNode(tab);
        }
        return 0;
      };

      // Submenu simplificado para abrir en split - filtrar pestañas con menos de 4 terminales
      const sshTabsFiltered = getFilteredTabs().filter(tab => {
        if (tab.type === 'terminal') return true;
        if (tab.type === 'split') {
          const count = countTerminalsInTab(tab);
          return count < 4;
        }
        return false;
      });

      if (sshTabsFiltered.length > 0) {
        items.push({
          label: 'Abrir en Split',
          icon: 'pi pi-window-maximize',
          items: sshTabsFiltered.map(tab => {
            const termCount = countTerminalsInTab(tab);
            const isFirstSplit = tab.type === 'terminal';
            const isThirdSplit = tab.type === 'split' && termCount === 2;
            const isFourthSplit = tab.type === 'split' && termCount === 3;

            // Si es el 3er split (ya hay 2 terminales) o 4to split (ya hay 3 terminales), abrir automáticamente sin preguntar
            if (isThirdSplit || isFourthSplit) {
              return {
                label: `${tab.label} (${termCount}/4)`,
                icon: 'pi pi-window-maximize',
                command: () => openInSplit(node, tab, 'vertical')
              };
            }

            // Si es el primer split (pestaña tipo 'terminal'), mostrar opciones vertical/horizontal
            if (isFirstSplit) {
              return {
                label: `${tab.label}`,
                icon: 'pi pi-desktop',
                items: [
                  {
                    label: 'Dividir vertical',
                    icon: 'pi pi-arrows-v',
                    command: () => openInSplit(node, tab, 'vertical')
                  },
                  {
                    label: 'Dividir horizontal',
                    icon: 'pi pi-arrows-h',
                    command: () => openInSplit(node, tab, 'horizontal')
                  }
                ]
              };
            }

            // Para otros casos (split existente con 1 terminal), mostrar opciones
            return {
              label: `${tab.label} (${termCount}/4)`,
              icon: 'pi pi-window-maximize',
              items: [
                {
                  label: 'Dividir vertical',
                  icon: 'pi pi-arrows-v',
                  command: () => openInSplit(node, tab, 'vertical')
                },
                {
                  label: 'Dividir horizontal',
                  icon: 'pi pi-arrows-h',
                  command: () => openInSplit(node, tab, 'horizontal')
                }
              ]
            };
          })
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
            const connection = {
              type: 'rdp',
              name: node.label,
              host: node.data?.host || node.data?.server || node.data?.hostname,
              username: node.data?.username,
              port: node.data?.port || 3389,
              password: node.data?.password || ''
            };
            window.dispatchEvent(new CustomEvent('request-add-favorite-with-groups', {
              detail: { connection }
            }));
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
            const connection = {
              type: 'vnc',
              name: node.label,
              host: node.data?.host || node.data?.server || node.data?.hostname,
              port: node.data?.port || 5900,
              password: node.data?.password || ''
            };
            window.dispatchEvent(new CustomEvent('request-add-favorite-with-groups', {
              detail: { connection }
            }));
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
            const connection = {
              type: protocol,
              name: node.label,
              host: node.data?.host,
              username: node.data?.username || node.data?.user,
              port: node.data?.port || (protocol === 'ftp' ? 21 : 22),
              password: node.data?.password || ''
            };
            window.dispatchEvent(new CustomEvent('request-add-favorite-with-groups', {
              detail: { connection }
            }));
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


      items.push({
        label: 'Agregar/Quitar de Favoritos',
        icon: 'pi pi-star',
        command: () => {
          try {
            const connection = {
              type: 'ssh-tunnel',
              name: node.label,
              tunnelType: node.data?.tunnelType,
              sshHost: node.data?.sshHost,
              sshPort: node.data?.sshPort || 22,
              sshUser: node.data?.sshUser,
              sshPassword: node.data?.sshPassword || '',
              authType: node.data?.authType || 'password',
              privateKeyPath: node.data?.privateKeyPath || '',
              passphrase: node.data?.passphrase || '',
              localHost: node.data?.localHost || '127.0.0.1',
              localPort: node.data?.localPort || 0,
              remoteHost: node.data?.remoteHost || '',
              remotePort: node.data?.remotePort || 0,
              bindHost: node.data?.bindHost || '0.0.0.0'
            };
            window.dispatchEvent(new CustomEvent('request-add-favorite-with-groups', {
              detail: { connection }
            }));
          } catch (e) { /* noop */ }
        }
      });

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
    getGeneralTreeContextMenuItems,
    reloadNodes,
    isExternalReloadRef,
    updateTreeHash
  };
};
