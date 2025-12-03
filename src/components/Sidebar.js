import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Tree } from 'primereact/tree';
import { Divider } from 'primereact/divider';
import SidebarFooter from './SidebarFooter';
import { uiThemes, FUTURISTIC_UI_KEYS } from '../themes/ui-themes';
import { FolderDialog } from './Dialogs';
import { iconThemes } from '../themes/icon-themes';
import { FolderIconRenderer, FolderIconPresets } from './FolderIconSelector';
import { sessionActionIconThemes, getDefaultSessionActionIconTheme } from '../themes/session-action-icons';
import ImportDialog from './ImportDialog';
import PasswordManagerSidebar from './PasswordManagerSidebar';
import SidebarFilesystemExplorer from './SidebarFilesystemExplorer';
import LocalFileExplorerSidebar from './LocalFileExplorerSidebar';
import { unblockAllInputs, detectBlockedInputs, resolveFormBlocking, emergencyUnblockForms } from '../utils/formDebugger';
import ImportService from '../services/ImportService';
import { toggleFavorite as toggleFavoriteConn, helpers as connHelpers, isFavorite as isFavoriteConn } from '../utils/connectionStore';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';
import { STORAGE_KEYS } from '../utils/constants';
import { getTreeTheme } from '../themes/tree-themes';
import { useTranslation } from '../i18n/hooks/useTranslation';
import '../styles/components/tree-themes.css';

// Helper para loggear setNodes
function logSetNodes(source, nodes) {
  // Log de debug removido para limpiar la consola
      // Log de trace removido para limpiar la consola
  return nodes;
}

// Helper para desbloquear formularios de forma segura
function safeUnblockForms(showToast) {
  try {
    const blockedInputs = detectBlockedInputs();
    unblockAllInputs();
    
    if (blockedInputs.length > 0 && showToast) {
      showToast({
        severity: 'info',
        summary: 'Formularios desbloqueados',
        detail: `Se han desbloqueado ${blockedInputs.length} campos de formulario`,
        life: 2000
      });
    }
  } catch (error) {
    console.warn('Error al desbloquear formularios:', error);
  }
}

const Sidebar = React.memo(({
  nodes,
  setNodes,
  sidebarCollapsed,
  setSidebarCollapsed,
  allExpanded,
  toggleExpandAll,
  expandedKeys,
  setExpandedKeys,
  setShowCreateGroupDialog,
  setShowSettingsDialog,
  showUnifiedConnectionDialog,
  setShowUnifiedConnectionDialog,

  iconTheme,
  iconSize = 20,
  folderIconSize = 20,
  connectionIconSize = 20,
  explorerFont,
  explorerFontSize = 14,
  explorerFontColor,
  uiTheme = 'Light',
  showToast, // callback opcional para mostrar toast global
  confirmDialog, // callback para mostrar diálogo de confirmación
  onOpenSSHConnection, // nuevo prop para doble click en SSH
  onOpenVncConnection, // nuevo prop para doble click en VNC
  onNodeContextMenu, // handler del menú contextual de nodos
  onTreeAreaContextMenu, // handler del menú contextual del área del árbol
  hideContextMenu, // función para cerrar el menú contextual
  sidebarCallbacksRef, // ref para registrar callbacks del menú contextual
  selectedNodeKey, // estado de selección del hook
  setSelectedNodeKey, // setter de selección del hook
  
  // Props para conexiones
  getAllFolders,
  createNewSSH,
  saveEditSSH,
  openEditSSHDialog,
  handleSaveRdpToSidebar,
  
  // Estados de formularios SSH
  sshName, setSSHName,
  sshHost, setSSHHost,
  sshUser, setSSHUser,
  sshPassword, setSSHPassword,
  sshPort, setSSHPort,
  sshRemoteFolder, setSSHRemoteFolder,
  sshTargetFolder, setSSHTargetFolder,
  sshAutoCopyPassword, setSSHAutoCopyPassword,
  
  // Estados de formularios Edit SSH
  editSSHName, setEditSSHName,
  editSSHHost, setEditSSHHost,
  editSSHUser, setEditSSHUser,
  editSSHPassword, setEditSSHPassword,
  editSSHRemoteFolder, setEditSSHRemoteFolder,
  editSSHPort, setEditSSHPort,
  editSSHAutoCopyPassword, setEditSSHAutoCopyPassword,
  
  // Estados para modo edición
  editSSHNode, setEditSSHNode,
  
  // Estados de formularios RDP
  rdpNodeData, setRdpNodeData,
  editingRdpNode, setEditingRdpNode,
  
  // Encriptación
  masterKey,
  secureStorage,

  isAIChatActive = false,
  onToggleLocalTerminalForAIChat,
  
  // Filtro de búsqueda desde TitleBar
  sidebarFilter = '',
  
  // Tema del árbol
  treeTheme = 'default',
  
  // Tema de iconos de acción
  sessionActionIconTheme = 'modern'
}) => {
  // Hook de internacionalización
  const { t } = useTranslation('common');
  
  // Estado para diálogos
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  
  // Estado para modo de visualización (conexiones, passwords, filesystem, localExplorer)
  const [viewMode, setViewMode] = useState('connections'); // 'connections' | 'passwords' | 'filesystem' | 'localExplorer'
  const [filesystemStatus, setFilesystemStatus] = useState({
    active: false,
    allowedPaths: [],
    defaultPath: null,
    server: null,
    conversationId: null
  });
  const [initialFilesystemPath, setInitialFilesystemPath] = useState(null);
  const [localExplorerPath, setLocalExplorerPath] = useState(null);
  
  // 🔗 Sincronizar conexiones SSH a window para que AIChatPanel las acceda
  useEffect(() => {
    const extractSSHNodes = (treeNodes) => {
      let sshNodes = [];
      for (const node of treeNodes) {
        if (node.data && node.data.type === 'ssh') {
          // 🔗 PASAR TODO EL node.data COMPLETO (igual que usa la app para conectar)
          sshNodes.push({
            id: node.key || `ssh_${node.data.host}_${node.data.username}`,
            label: node.label,
            ...node.data  // ✅ SPREAD: Incluir TODOS los campos de node.data
          });
        }
        if (node.children && node.children.length > 0) {
          sshNodes = sshNodes.concat(extractSSHNodes(node.children));
        }
      }
      return sshNodes;
    };
    
    const sshConnections = extractSSHNodes(nodes);
    window.sshConnectionsFromSidebar = sshConnections;
    console.log(`🔗 [Sidebar] Sincronizadas ${sshConnections.length} conexiones SSH a window`);
    
    // Disparar evento para que AIChatPanel se resincronice
    window.dispatchEvent(new CustomEvent('sidebar-ssh-connections-updated', {
      detail: { count: sshConnections.length }
    }));
  }, [nodes]);

  // Escuchar evento para cambiar a vista de conexiones
  useEffect(() => {
    const handleSwitchToConnections = () => {
      setViewMode('connections');
    };
    
    window.addEventListener('switch-to-connections', handleSwitchToConnections);
    
    return () => {
      window.removeEventListener('switch-to-connections', handleSwitchToConnections);
    };
  }, []);

  useEffect(() => {
    const handleFilesystemStatus = (event) => {
      const detail = event?.detail || {};
      if (detail.type !== 'filesystem') return;
      setFilesystemStatus(detail);
      if (!detail.active) {
        setViewMode(prev => (prev === 'filesystem' ? 'connections' : prev));
      }
    };
    window.addEventListener('filesystem-mcp-status', handleFilesystemStatus);
    return () => {
      window.removeEventListener('filesystem-mcp-status', handleFilesystemStatus);
    };
  }, []);

  // Listener simple para mostrar explorador local en sidebar
  useEffect(() => {
    const handleShowLocalExplorer = (event) => {
      const { path } = event?.detail || {};
      if (!path) return;
      
      setLocalExplorerPath(path);
      setViewMode('localExplorer');
      setSidebarCollapsed(false);
    };
    
    window.addEventListener('show-local-file-explorer', handleShowLocalExplorer);
    return () => {
      window.removeEventListener('show-local-file-explorer', handleShowLocalExplorer);
    };
  }, []);

  const filesystemAvailable = !!filesystemStatus?.active;
  
  // Permitir modo filesystem si se solicita explícitamente desde FileExplorer
  // incluso sin AI Chat activo, pero solo si hay un path inicial establecido
  useEffect(() => {
    if (!isAIChatActive && viewMode === 'filesystem' && !initialFilesystemPath) {
      setViewMode('connections');
    }
  }, [isAIChatActive, viewMode, setViewMode, initialFilesystemPath]);

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

  // Función para verificar si un color es el color por defecto de algún tema
  const isDefaultThemeColor = (color) => {
    if (!color) return false;
    
    // Lista de colores por defecto de todos los temas
    const defaultThemeColors = [
      '#007ad9', // Material
      '#0078d4', // Fluent
      '#ff007c', // Synthwave
      '#5e81ac', // Nord
      '#bd93f9', // Dracula
      '#b58900', // Solarized
      '#dcb67a'  // VS Code
    ];
    
    return defaultThemeColors.includes(color.toLowerCase());
  };

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(() => getThemeDefaultColor(iconTheme));
  const [folderIcon, setFolderIcon] = useState(null);
  const [parentNodeKey, setParentNodeKey] = useState(null);
  const [editingNode, setEditingNode] = useState(null); // Para saber si estamos editando un nodo existente
  
  // Actualizar color por defecto cuando cambie el tema
  useEffect(() => {
    const newDefaultColor = getThemeDefaultColor(iconTheme);
    setFolderColor(newDefaultColor);
    
    // Actualizar colores de carpetas existentes SOLO si no tienen color personalizado
    const updateExistingFoldersColor = (nodes, newColor) => {
      return nodes.map(node => {
        if (node.droppable) {
          // Es una carpeta
          const updatedNode = { ...node };
          
          // Si la carpeta no tiene la propiedad hasCustomColor, determinar si tiene color personalizado
          // basándose en si su color es diferente al color del tema actual
          if (node.hasCustomColor === undefined) {
            const currentThemeColor = getThemeDefaultColor(iconTheme);
            updatedNode.hasCustomColor = node.color && node.color !== currentThemeColor;
          }
          
          // Solo actualizar el color si la carpeta NO tiene color personalizado
          // Las carpetas con color personalizado mantienen su color
          if (!updatedNode.hasCustomColor) {
            updatedNode.color = newColor;
          }
          
          // Si tiene children, actualizarlos recursivamente
          if (node.children && node.children.length > 0) {
            updatedNode.children = updateExistingFoldersColor(node.children, newColor);
          }
          
          return updatedNode;
        }
        return node;
      });
    };
    
    // Actualizar solo las carpetas sin color personalizado
    const updatedNodes = updateExistingFoldersColor(nodes, newDefaultColor);
    setNodes(updatedNodes);
    
    // Forzar re-render del árbol para aplicar los nuevos colores
    setTimeout(() => {
      const treeElement = document.querySelector('.sidebar-tree');
      if (treeElement) {
        treeElement.style.display = 'none';
        setTimeout(() => {
          treeElement.style.display = '';
        }, 10);
      }
    }, 100);
    
  }, [iconTheme, setNodes]);
  
  // Actualizar variable CSS cuando cambie el color de fuente
  // Usar useRef para evitar loops infinitos
  const prevColorRef = React.useRef(explorerFontColor);
  
  React.useEffect(() => {
    // Solo actualizar si el color realmente cambió
    if (prevColorRef.current === explorerFontColor) {
      return;
    }
    
    prevColorRef.current = explorerFontColor;
    
    // Aplicar la variable CSS al contenedor del sidebar usando el elemento raíz
    if (explorerFontColor) {
      const root = document.documentElement;
      root.style.setProperty('--ui-sidebar-text', explorerFontColor);
    } else {
      const root = document.documentElement;
      root.style.removeProperty('--ui-sidebar-text');
    }
  }, [explorerFontColor]);
  
  // Estado para controlar la visibilidad de los botones de clientes de IA
  const [aiClientsEnabled, setAiClientsEnabled] = React.useState({
    nodeterm: true,
    anythingllm: false,
    openwebui: false
  });

  // Cargar configuración de clientes de IA desde localStorage
  React.useEffect(() => {
    const loadAIClientsConfig = () => {
      try {
        const config = localStorage.getItem('ai_clients_enabled');
        if (config) {
          const parsed = JSON.parse(config);
          setAiClientsEnabled({
            nodeterm: parsed.nodeterm === true, // Solo activo si está explícitamente configurado
            anythingllm: parsed.anythingllm === true,
            openwebui: parsed.openwebui === true
          });
        } else {
          // Si no hay configuración, todos desactivados por defecto
          setAiClientsEnabled({
            nodeterm: false,
            anythingllm: false,
            openwebui: false
          });
        }
      } catch (error) {
        console.error('[Sidebar] Error al cargar configuración de clientes IA:', error);
      }
    };

    // Cargar al montar
    loadAIClientsConfig();

    // Escuchar cambios en localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'ai_clients_enabled') {
        loadAIClientsConfig();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar evento personalizado para cambios en la misma pestaña
    const handleConfigChange = () => {
      loadAIClientsConfig();
    };
    window.addEventListener('ai-clients-config-changed', handleConfigChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ai-clients-config-changed', handleConfigChange);
    };
  }, []);
  
  // Ref para el contenedor de la sidebar
  const sidebarRef = useRef(null);
  const openAnythingLLMTab = () => {
    const newTab = {
      key: `anythingllm-${Date.now()}`,
      label: 'AnythingLLM',
      type: 'anything-llm',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-anythingllm-tab', {
      detail: { tab: newTab }
    }));
  };

  const openOpenWebUITab = () => {
    const newTab = {
      key: `openwebui-${Date.now()}`,
      label: 'Open WebUI',
      type: 'openwebui',
      createdAt: Date.now(),
      groupId: null
    };
    window.dispatchEvent(new CustomEvent('create-openwebui-tab', {
      detail: { tab: newTab }
    }));
  };
  
  // Función para manejar el menú de aplicación (unificada)
  const handleAppMenuClick = (event) => {
    const menuStructure = createAppMenu(setShowImportDialog, t);
    createContextMenu(event, menuStructure, 'app-context-menu-sidebar');
  };
  
  // Efecto para manejar la visibilidad de botones durante el redimensionamiento
  useEffect(() => {
    if (!sidebarRef.current || sidebarCollapsed) return;
    
    const handleSidebarResize = () => {
      const sidebarElement = sidebarRef.current;
      if (!sidebarElement) return;
      
      const sidebarWidth = sidebarElement.offsetWidth;
      const headerElement = sidebarElement.querySelector('div:first-child');
      const buttonsContainer = headerElement?.querySelector('div:last-child');
      
      if (buttonsContainer) {
        // Ocultar botones adicionales cuando el ancho es muy pequeño
        if (sidebarWidth <= 120) {
          buttonsContainer.style.opacity = '0.3';
          buttonsContainer.style.transform = 'scale(0.8)';
          buttonsContainer.style.pointerEvents = 'none';
        } else {
          buttonsContainer.style.opacity = '1';
          buttonsContainer.style.transform = 'scale(1)';
          buttonsContainer.style.pointerEvents = 'auto';
        }
        
        // Ocultar completamente cuando es muy estrecho
        if (sidebarWidth <= 80) {
          buttonsContainer.style.display = 'none';
        } else {
          buttonsContainer.style.display = 'flex';
        }
      }
    };
    
    // Observar cambios en el tamaño de la sidebar
    const resizeObserver = new ResizeObserver(handleSidebarResize);
    resizeObserver.observe(sidebarRef.current);
    
    // Llamar una vez al inicio
    handleSidebarResize();
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [sidebarCollapsed]);
  
  // Helpers
  const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));
  const findNodeByKey = (nodes, key) => {
    if (key === null) return null;
    for (let node of nodes) {
      if (node.key === key) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  };
  // Función para obtener todas las carpetas (fallback si no viene como prop)
  const getAllFoldersFallback = (nodes, prefix = '') => {
    let folders = [];
    for (const node of nodes) {
      if (node.droppable) {
        folders.push({ label: prefix + node.label, value: node.key });
        if (node.children && node.children.length > 0) {
          folders = folders.concat(getAllFoldersFallback(node.children, prefix + node.label + ' / '));
        }
      }
    }
    return folders;
  };
  
  // Usar la función del prop o el fallback
  const getAllFoldersToUse = getAllFolders || getAllFoldersFallback;

  // Función para manejar la importación completa (estructura + conexiones) con deduplicación local
  const handleImportComplete = async (importResult) => {
    try {
      if (!importResult) {
        showToast && showToast({
          severity: 'warn',
          summary: 'Sin datos',
          detail: 'No se encontraron conexiones para importar',
          life: 3000
        });
        return;
      }

      // Helper para eliminar duplicados cuando overwrite=true
      const normalizeLabel = (v) => {
        const s = (v || '').toString();
        return s
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const removeConflictsAndAdd = (existingNodes, incomingNodes) => {
        if (!Array.isArray(existingNodes) || !Array.isArray(incomingNodes)) {
          return [...(existingNodes || []), ...(incomingNodes || [])];
        }
        
        // Crear un Set con los nombres normalizados de los nodos entrantes
        const incomingLabels = new Set();
        incomingNodes.forEach(node => {
          if (node && node.label) {
            incomingLabels.add(normalizeLabel(node.label));
          }
        });
        
        // Filtrar los nodos existentes, eliminando los que tienen conflicto
        const filteredExisting = existingNodes.filter(node => {
          if (!node || !node.label) return true;
          return !incomingLabels.has(normalizeLabel(node.label));
        });
        
        // Retornar existentes filtrados + nuevos (los nuevos tienen prioridad)
        return [...filteredExisting, ...incomingNodes];
      };

      // Carpeta destino: raíz por defecto o una seleccionada en el diálogo
      const ROOT_VALUE = 'ROOT';
      const baseTargetKey = importResult?.linkFile
        ? (importResult?.linkedTargetFolderKey || ROOT_VALUE)
        : (importResult?.targetBaseFolderKey || ROOT_VALUE);

      // Opciones específicas según el modo (manual vs vinculado)
      const isLinkedMode = !!importResult?.linkFile;
      const finalCreateContainerFolder = isLinkedMode 
        ? (importResult?.linkedCreateContainerFolder || false)
        : (importResult?.createContainerFolder || false);
      const finalContainerLabel = isLinkedMode
        ? (importResult?.linkedContainerFolderName || `mRemoteNG linked - ${new Date().toLocaleDateString()}`)
        : (importResult?.containerFolderName || `mRemoteNG imported - ${new Date().toLocaleDateString()}`);
      const finalOverwrite = isLinkedMode
        ? (importResult?.linkedOverwrite || false)
        : (importResult?.overwrite || false);


      const insertIntoTarget = (nodesToInsert) => {

        // Inserta un array de nodos en la carpeta destino, con soporte para overwrite y contenedor opcional
        const containerize = (children) => ({
          key: `import_container_${Date.now()}`,
          uid: `import_container_${Date.now()}_${Math.floor(Math.random()*1e6)}`,
          label: finalContainerLabel,
          droppable: true,
          children: children,
          createdAt: new Date().toISOString(),
          isUserCreated: true,
          imported: true,
          importedFrom: 'mRemoteNG'
        });

        if (baseTargetKey === ROOT_VALUE) {
          setNodes(prev => {
            const nodesCopy = JSON.parse(JSON.stringify(prev || []));
            if (finalCreateContainerFolder) {
              if (finalOverwrite) {
                return removeConflictsAndAdd(nodesCopy, [containerize(nodesToInsert)]);
              } else {
                nodesCopy.push(containerize(nodesToInsert));
                return nodesCopy;
              }
            }
            if (finalOverwrite) {
              return removeConflictsAndAdd(nodesCopy, nodesToInsert);
            } else {
              nodesCopy.push(...nodesToInsert);
              return nodesCopy;
            }
          });
          return;
        }

        setNodes(prev => {
          const nodesCopy = JSON.parse(JSON.stringify(prev || []));
          const targetNode = findNodeByKey(nodesCopy, baseTargetKey);
          if (!targetNode || !targetNode.droppable) {
            // Fallback a raíz si la carpeta no existe o no es droppable
            if (finalCreateContainerFolder) {
              if (finalOverwrite) {
                return removeConflictsAndAdd(nodesCopy, [containerize(nodesToInsert)]);
              }
              nodesCopy.push(containerize(nodesToInsert));
              return nodesCopy;
            }
            if (finalOverwrite) return removeConflictsAndAdd(nodesCopy, nodesToInsert);
            nodesCopy.push(...nodesToInsert);
            return nodesCopy;
          }
          // Inserción dentro de la carpeta seleccionada
          const currentChildren = Array.isArray(targetNode.children) ? targetNode.children : [];
          if (finalCreateContainerFolder) {
            const newChild = containerize(nodesToInsert);
            if (finalOverwrite) {
              targetNode.children = removeConflictsAndAdd(currentChildren, [newChild]);
            } else {
              targetNode.children = [...currentChildren, newChild];
            }
          } else {
            if (finalOverwrite) {
              targetNode.children = removeConflictsAndAdd(currentChildren, nodesToInsert);
            } else {
              targetNode.children = [...currentChildren, ...nodesToInsert];
            }
          }
          return nodesCopy;
        });
      };

      let addedFolders = 0;
      let addedConnections = 0;

      // Si tenemos estructura con carpetas
      if (importResult.structure && Array.isArray(importResult.structure.nodes) && importResult.structure.nodes.length > 0) {
        let toAdd = (importResult.structure.nodes || []).map((n, idx) => ({
          ...n,
          key: n.key || `folder_${Date.now()}_${idx}_${Math.floor(Math.random()*1e6)}`,
          uid: n.uid || `folder_${Date.now()}_${idx}_${Math.floor(Math.random()*1e6)}`
        }));
        insertIntoTarget(toAdd);

        addedFolders = importResult.structure.folderCount || 0;
        addedConnections = importResult.structure.connectionCount || 0;

        // Persistir fuente vinculada y opciones para el banner
        if (isLinkedMode && (importResult.linkedFilePath || importResult.linkedFileName)) {
          try {
            const KEY = 'IMPORT_SOURCES';
            const sources = JSON.parse(localStorage.getItem(KEY) || '[]');
            const stableId = importResult.linkedFilePath || importResult.linkedFileName;
            // Alinear hash con el poller
            let osHash = importResult.linkedFileHash || null;
            try {
              const h = await window.electron?.import?.getFileHash?.(importResult.linkedFilePath);
              if (h?.ok && h?.hash) osHash = h.hash;
            } catch {}
            const newSource = {
              id: stableId,
              fileName: importResult.linkedFileName || null,
              filePath: importResult.linkedFilePath || null,
              fileHash: osHash,
              lastNotifiedHash: osHash,
              lastCheckedAt: Date.now(),
              intervalMs: Number(importResult.pollInterval) || 30000,
              options: {
                // Básicas para compatibilidad con el diálogo
                overwrite: !!(importResult.overwrite ?? finalOverwrite),
                createContainerFolder: !!(importResult.createContainerFolder ?? finalCreateContainerFolder),
                containerFolderName: (importResult.containerFolderName || importResult.linkedContainerFolderName || finalContainerLabel) || null,
                // Específicas de modo vinculado (las que usa el banner)
                linkedOverwrite: !!importResult.linkedOverwrite,
                linkedCreateContainerFolder: !!importResult.linkedCreateContainerFolder,
                linkedContainerFolderName: importResult.linkedContainerFolderName || importResult.containerFolderName || null
              }
            };
            const filtered = sources.filter(s => !(
              (stableId && s.id === stableId) ||
              (newSource.filePath && s.filePath === newSource.filePath) ||
              (newSource.fileName && s.fileName === newSource.fileName)
            ));
            filtered.push(newSource);
            localStorage.setItem(KEY, JSON.stringify(filtered));
          } catch {}
        }
        showToast && showToast({
          severity: 'success',
          summary: 'Importación exitosa',
          detail: `Se importaron ${addedConnections} conexiones y ${addedFolders} carpetas`,
          life: 5000
        });
        return;
      }

      // Lista plana
      const importedConnections = importResult.connections || importResult;
      if (!Array.isArray(importedConnections) || importedConnections.length === 0) {
        showToast && showToast({
          severity: 'warn',
          summary: 'Sin datos',
          detail: 'No se encontraron conexiones para importar',
          life: 3000
        });
        return;
      }

      // Para lista plana, insertar directamente en target según configuración
      insertIntoTarget(importedConnections);

      // Persistir fuente vinculada y opciones para el banner
      if (isLinkedMode && (importResult.linkedFilePath || importResult.linkedFileName)) {
        try {
          const KEY = 'IMPORT_SOURCES';
          const sources = JSON.parse(localStorage.getItem(KEY) || '[]');
          const stableId = importResult.linkedFilePath || importResult.linkedFileName;
          let osHash = importResult.linkedFileHash || null;
          try {
            const h = await window.electron?.import?.getFileHash?.(importResult.linkedFilePath);
            if (h?.ok && h?.hash) osHash = h.hash;
          } catch {}
          const newSource = {
            id: stableId,
            fileName: importResult.linkedFileName || null,
            filePath: importResult.linkedFilePath || null,
            fileHash: osHash,
            lastNotifiedHash: osHash,
            lastCheckedAt: Date.now(),
            intervalMs: Number(importResult.pollInterval) || 30000,
            options: {
              overwrite: !!(importResult.overwrite ?? finalOverwrite),
              createContainerFolder: !!(importResult.createContainerFolder ?? finalCreateContainerFolder),
              containerFolderName: (importResult.containerFolderName || importResult.linkedContainerFolderName || finalContainerLabel) || null,
              linkedOverwrite: !!importResult.linkedOverwrite,
              linkedCreateContainerFolder: !!importResult.linkedCreateContainerFolder,
              linkedContainerFolderName: importResult.linkedContainerFolderName || importResult.containerFolderName || null
            }
          };
          const filtered = sources.filter(s => !(
            (stableId && s.id === stableId) ||
            (newSource.filePath && s.filePath === newSource.filePath) ||
            (newSource.fileName && s.fileName === newSource.fileName)
          ));
          filtered.push(newSource);
          localStorage.setItem(KEY, JSON.stringify(filtered));
        } catch {}
      }
      showToast && showToast({
        severity: 'success',
        summary: 'Importación exitosa',
        detail: `Se importaron ${importedConnections.length} conexiones`,
        life: 5000
      });
      // Desbloquear formularios por si alguna máscara quedó activa
      setTimeout(() => {
        safeUnblockForms(showToast);
      }, 0);

    } catch (error) {
      console.error('Error al procesar importación:', error);
      showToast && showToast({
        severity: 'error',
        summary: 'Error de importación',
        detail: 'Error al agregar las conexiones importadas a la sidebar',
        life: 5000
      });
    }
  };

  // Sondeo de cambios en fuentes vinculadas (renderer-only, eficiente con timestamp)
  useEffect(() => {
    const KEY = 'IMPORT_SOURCES';
    // Anti-rebote en memoria (no escribe en localStorage en cada tick)
    const notifiedByKey = new Map();
    let timers = [];
    const schedule = async () => {
      // Limpiar timers previos
      timers.forEach(t => clearInterval(t));
      timers = [];

      // 1) Reconciliar al inicio: alinear fileHash/lastNotifiedHash con hash del OS para evitar banner falso en arranque
      let sources = JSON.parse(localStorage.getItem(KEY) || '[]');
      try {
        const updated = await Promise.all((sources || []).map(async (s) => {
          if (s && s.filePath) {
            try {
              const h = await window.electron?.import?.getFileHash?.(s.filePath);
              if (h?.ok && h?.hash) {
                const osHash = h.hash;
                if (s.fileHash !== osHash || s.lastNotifiedHash !== osHash || !s.lastCheckedAt) {
                  return { ...s, fileHash: osHash, lastNotifiedHash: osHash, lastCheckedAt: Date.now() };
                }
              }
            } catch {}
          }
          return s;
        }));
        // Solo escribir si hay cambios efectivos
        const before = JSON.stringify(sources);
        const after = JSON.stringify(updated);
        if (before !== after) {
          try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
          sources = updated;
        }
      } catch {}

      // 2) Programar timers usando snapshot actualizado
      (sources || []).forEach(snapshotSource => {
        const interval = Math.max(5000, Number(snapshotSource.intervalMs) || 30000);
        const timer = setInterval(async () => {
          try {
            let hasChange = false;
            // Cargar SIEMPRE la versión fresca de la fuente para usar el hash actualizado
            const freshSources = JSON.parse(localStorage.getItem(KEY) || '[]');
            const source = freshSources.find(s =>
              (snapshotSource.id && s.id === snapshotSource.id) ||
              (snapshotSource.filePath && s.filePath === snapshotSource.filePath) ||
              (snapshotSource.fileName && s.fileName === snapshotSource.fileName)
            );
            if (source?.filePath) {
              const currentStoredHash = source?.fileHash || null;
              const h = await window.electron?.import?.getFileHash?.(source.filePath);
              if (h?.ok && currentStoredHash && h.hash !== currentStoredHash) {
                // Anti-rebote: notificar solo si es un hash nuevo respecto al último notificado
                const stableKey = source?.id || source?.filePath || source?.fileName;
                const lastNotified = notifiedByKey.get(stableKey);
                if (h.hash !== lastNotified) {
                  hasChange = true;
                  notifiedByKey.set(stableKey, h.hash);
                }
              }
            }
            if (hasChange) {
              const event = new CustomEvent('import-source:poll', { detail: { source, hasChange: true } });
              window.dispatchEvent(event);
            }
          } catch {
            // Silencio en error para evitar banners falsos
          }
        }, interval);
        timers.push(timer);
      });
    };
    schedule();
    const onStorage = (e) => { if (e.key === KEY) schedule(); };
    window.addEventListener('storage', onStorage);
    return () => {
      timers.forEach(t => clearInterval(t));
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  // Crear nueva carpeta o editar existente
  const createNewFolder = () => {
    if (!folderName.trim()) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'El nombre de carpeta no puede estar vacío', life: 3000 });
      return;
    }
    
    const nodesCopy = deepCopy(nodes);
    
    if (editingNode) {
      // Modo edición: actualizar carpeta existente
      const updateNodeInTree = (nodes, targetKey, newLabel, newColor, newIcon) => {
        return nodes.map(node => {
          if (node.key === targetKey) {
            return { ...node, label: newLabel, color: newColor, folderIcon: newIcon || 'general' };
          }
          if (node.children) {
            return { ...node, children: updateNodeInTree(node.children, targetKey, newLabel, newColor, newIcon) };
          }
          return node;
        });
      };
      const updatedNodes = updateNodeInTree(nodesCopy, editingNode.key, folderName.trim(), folderColor, folderIcon);
      setNodes(() => logSetNodes('Sidebar', updatedNodes));
      showToast && showToast({ severity: 'success', summary: 'Éxito', detail: `Carpeta "${folderName}" actualizada`, life: 3000 });
    } else {
      // Modo creación: crear nueva carpeta
      const newKey = `node_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const newFolder = {
        key: newKey,
        label: folderName.trim(),
        droppable: true,
        children: [],
        uid: newKey,
        createdAt: new Date().toISOString(),
        isUserCreated: true,
        color: folderColor,
        folderIcon: folderIcon || 'general'
      };
      
      if (parentNodeKey === null) {
        nodesCopy.push(newFolder);
      } else {
        const parentNode = findNodeByKey(nodesCopy, parentNodeKey);
        if (!parentNode) {
          showToast && showToast({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la carpeta', life: 3000 });
          return;
        }
        parentNode.children = parentNode.children || [];
        parentNode.children.push(newFolder);
      }
      setNodes(() => logSetNodes('Sidebar', nodesCopy));
      showToast && showToast({ severity: 'success', summary: 'Éxito', detail: `Carpeta "${folderName}" creada`, life: 3000 });
    }
    
    // Limpiar formulario
    setShowFolderDialog(false);
    setFolderName('');
    setFolderColor(getThemeDefaultColor(iconTheme));
    setParentNodeKey(null);
    setEditingNode(null);
    
    // Desbloquear formularios por si alguna máscara quedó activa
    setTimeout(() => {
      try { unblockAllInputs(); } catch {}
    }, 0);
  };


  // Drag and drop helpers y lógica igual que antes
  // Clona el árbol y actualiza solo el subárbol con la key indicada
  function cloneTreeWithUpdatedNode(tree, targetKey, updateFn) {
    return tree.map(node => {
      if (node.key === targetKey) {
        return updateFn({ ...node });
      }
      if (node.children) {
        return { ...node, children: cloneTreeWithUpdatedNode(node.children, targetKey, updateFn) };
      }
      return node;
    });
  }
  // Drag and drop con validación de carpetas
  const onDragDrop = (event) => {
    const { dragNode, dropNode, dropPoint, value } = event;
    // Solo permitir drag and drop si el nodo de destino es una carpeta (droppable = true)
    // Esto evita que se pueda arrastrar cualquier cosa a una sesión SSH
    const isDropNodeFolder = dropNode && dropNode.droppable === true;
    const isDropNodeSession = dropNode && dropNode.data && dropNode.data.type === 'ssh';
    if (dropPoint === 0 && isDropNodeFolder) {
      // Permitir arrastrar cualquier cosa (carpetas o sesiones) a una carpeta
      const newValue = cloneTreeWithUpdatedNode(value, dropNode.key, (parent) => {
        // Eliminar cualquier instancia del nodo movido
        parent.children = parent.children.filter(n => n.key !== dragNode.key);
        // Insertar al principio
        parent.children = [dragNode, ...parent.children];
        return parent;
      });
      setNodes(() => logSetNodes('Sidebar', newValue));
    } else if (dropPoint === 0 && isDropNodeSession) {
      // Si se intenta arrastrar algo a una sesión SSH, mostrar mensaje de error
      showToast && showToast({
        severity: 'warn',
        summary: 'Operación no permitida',
        detail: 'No se puede arrastrar elementos dentro de una sesión SSH. Solo las carpetas pueden contener otros elementos.',
        life: 4000
      });
    } else {
      setNodes(() => logSetNodes('Sidebar', [...value]));
    }
  };
  // Guardar en localStorage cuando cambian
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TREE_DATA, JSON.stringify(nodes));
    }
  }, [nodes]);

  // Eventos globales para acciones de acceso rápido desde Home
  useEffect(() => {
    const handleOpenPasswords = () => setViewMode('passwords');
    const handleOpenSettings = () => setShowSettingsDialog(true);
    const handleOpenExplorerDialog = () => {
      setShowUnifiedConnectionDialog && setShowUnifiedConnectionDialog(true);
    };
    window.addEventListener('open-password-manager', handleOpenPasswords);
    window.addEventListener('open-settings-dialog', handleOpenSettings);
    window.addEventListener('open-explorer-dialog', handleOpenExplorerDialog);
    return () => {
      window.removeEventListener('open-password-manager', handleOpenPasswords);
      window.removeEventListener('open-settings-dialog', handleOpenSettings);
      window.removeEventListener('open-explorer-dialog', handleOpenExplorerDialog);
    };
  }, [setShowSettingsDialog, setShowUnifiedConnectionDialog]);


  // Escuchar evento para abrir el diálogo de crear grupo desde la vista de passwords
  useEffect(() => {
    const handleOpenCreateGroupDialog = () => {
      setShowCreateGroupDialog(true);
    };
    window.addEventListener('open-create-group-dialog', handleOpenCreateGroupDialog);
    return () => {
      window.removeEventListener('open-create-group-dialog', handleOpenCreateGroupDialog);
    };
  }, [setShowCreateGroupDialog]);

  // Registrar callbacks para el menú contextual
  useEffect(() => {
    if (sidebarCallbacksRef) {
      // Preservar callbacks existentes y agregar/actualizar los del sidebar
      sidebarCallbacksRef.current = {
        ...sidebarCallbacksRef.current,
        createFolder: (parentKey) => {
          setParentNodeKey(parentKey);
          setShowFolderDialog(true);
        },
        editRDP: (node) => {
          // Esta función debe ser pasada desde App.js
          if (window.editRDP) {
            window.editRDP(node);
          }
        },

        editSSH: (node) => {
          // Llamar a la función de edición SSH que viene como prop
          openEditSSHDialog(node);
        },

        duplicateSSH: (node) => {
          // Duplicar conexión SSH
          const nodesCopy = deepCopy(nodes);
          const newKey = `ssh_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
          const duplicatedNode = {
            ...node,
            key: newKey,
            uid: newKey,
            label: `${node.label} (Copia)`,
            data: {
              ...node.data,
              // Mantener todos los datos originales
            }
          };
          
          // Encontrar el nodo padre y añadir la copia
          const findParentAndAdd = (nodes, targetKey, newNode) => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].key === targetKey) {
                // Si es un nodo raíz, añadir al final
                nodes.push(newNode);
                return true;
              }
              if (nodes[i].children) {
                for (let j = 0; j < nodes[i].children.length; j++) {
                  if (nodes[i].children[j].key === targetKey) {
                    // Añadir después del nodo original
                    nodes[i].children.splice(j + 1, 0, newNode);
                    return true;
                  }
                }
                if (findParentAndAdd(nodes[i].children, targetKey, newNode)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          // Buscar el nodo original para encontrar su posición
          const findNodePosition = (nodes, targetKey) => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].key === targetKey) {
                return { parentNodes: nodes, index: i, isRoot: true };
              }
              if (nodes[i].children) {
                for (let j = 0; j < nodes[i].children.length; j++) {
                  if (nodes[i].children[j].key === targetKey) {
                    return { parentNodes: nodes[i].children, index: j, isRoot: false };
                  }
                }
                const found = findNodePosition(nodes[i].children, targetKey);
                if (found) return found;
              }
            }
            return null;
          };
          
          const position = findNodePosition(nodesCopy, node.key);
          if (position) {
            position.parentNodes.splice(position.index + 1, 0, duplicatedNode);
            setNodes(() => logSetNodes('Sidebar-DuplicateSSH', nodesCopy));
            showToast && showToast({
              severity: 'success',
              summary: 'Duplicado',
              detail: `Conexión SSH "${node.label}" duplicada`,
              life: 3000
            });
            // Desbloquear formularios por si alguna máscara quedó activa
            setTimeout(() => {
              safeUnblockForms(showToast);
            }, 0);
          }
        },

        duplicateRDP: (node) => {
          // Duplicar conexión RDP
          const nodesCopy = deepCopy(nodes);
          const newKey = `rdp_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
          const duplicatedNode = {
            ...node,
            key: newKey,
            uid: newKey,
            label: `${node.label} (Copia)`,
            data: {
              ...node.data,
              // Mantener todos los datos originales
            }
          };
          
          // Buscar el nodo original para encontrar su posición
          const findNodePosition = (nodes, targetKey) => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].key === targetKey) {
                return { parentNodes: nodes, index: i, isRoot: true };
              }
              if (nodes[i].children) {
                for (let j = 0; j < nodes[i].children.length; j++) {
                  if (nodes[i].children[j].key === targetKey) {
                    return { parentNodes: nodes[i].children, index: j, isRoot: false };
                  }
                }
                const found = findNodePosition(nodes[i].children, targetKey);
                if (found) return found;
              }
            }
            return null;
          };
          
          const position = findNodePosition(nodesCopy, node.key);
          if (position) {
            position.parentNodes.splice(position.index + 1, 0, duplicatedNode);
            setNodes(() => logSetNodes('Sidebar-DuplicateRDP', nodesCopy));
            showToast && showToast({
              severity: 'success',
              summary: 'Duplicado',
              detail: `Conexión RDP "${node.label}" duplicada`,
              life: 3000
            });
            // Desbloquear formularios por si alguna máscara quedó activa
            setTimeout(() => {
              safeUnblockForms(showToast);
            }, 0);
          }
        },

        duplicateVNC: (node) => {
          // Duplicar conexión VNC
          const nodesCopy = deepCopy(nodes);
          const newKey = `vnc_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
          const duplicatedNode = {
            ...node,
            key: newKey,
            uid: newKey,
            label: `${node.label} (Copia)`,
            data: {
              ...node.data,
              // Mantener todos los datos originales
            }
          };
          
          // Buscar el nodo original para encontrar su posición
          const findNodePosition = (nodes, targetKey) => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].key === targetKey) {
                return { parentNodes: nodes, index: i, isRoot: true };
              }
              if (nodes[i].children) {
                for (let j = 0; j < nodes[i].children.length; j++) {
                  if (nodes[i].children[j].key === targetKey) {
                    return { parentNodes: nodes[i].children, index: j, isRoot: false };
                  }
                }
                const found = findNodePosition(nodes[i].children, targetKey);
                if (found) return found;
              }
            }
            return null;
          };
          
          const position = findNodePosition(nodesCopy, node.key);
          if (position) {
            position.parentNodes.splice(position.index + 1, 0, duplicatedNode);
            setNodes(() => logSetNodes('Sidebar-DuplicateVNC', nodesCopy));
            showToast && showToast({
              severity: 'success',
              summary: 'Duplicado',
              detail: `Conexión VNC "${node.label}" duplicada`,
              life: 3000
            });
            // Desbloquear formularios por si alguna máscara quedó activa
            setTimeout(() => {
              safeUnblockForms(showToast);
            }, 0);
          }
        },

        duplicateFolder: (node) => {
          // Duplicar carpeta con todo su contenido
          const nodesCopy = deepCopy(nodes);
          const newKey = `folder_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
          
          // Función recursiva para duplicar un nodo y todos sus hijos
          const duplicateNodeRecursive = (originalNode) => {
            const newNode = {
              ...originalNode,
              key: `${originalNode.key}_copy_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
              uid: `${originalNode.uid}_copy_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
              label: originalNode.droppable ? `${originalNode.label} (Copia)` : originalNode.label
            };
            
            if (originalNode.children && originalNode.children.length > 0) {
              newNode.children = originalNode.children.map(child => duplicateNodeRecursive(child));
            }
            
            return newNode;
          };
          
          const duplicatedFolder = duplicateNodeRecursive(node);
          
          // Buscar el nodo original para encontrar su posición
          const findNodePosition = (nodes, targetKey) => {
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].key === targetKey) {
                return { parentNodes: nodes, index: i, isRoot: true };
              }
              if (nodes[i].children) {
                for (let j = 0; j < nodes[i].children.length; j++) {
                  if (nodes[i].children[j].key === targetKey) {
                    return { parentNodes: nodes[i].children, index: j, isRoot: false };
                  }
                }
                const found = findNodePosition(nodes[i].children, targetKey);
                if (found) return found;
              }
            }
            return null;
          };
          
          const position = findNodePosition(nodesCopy, node.key);
          if (position) {
            position.parentNodes.splice(position.index + 1, 0, duplicatedFolder);
            setNodes(() => logSetNodes('Sidebar-DuplicateFolder', nodesCopy));
            showToast && showToast({
              severity: 'success',
              summary: 'Duplicado',
              detail: `Carpeta "${node.label}" y su contenido duplicados`,
              life: 3000
            });
            // Desbloquear formularios por si alguna máscara quedó activa
            setTimeout(() => {
              safeUnblockForms(showToast);
            }, 0);
          }
        },

        editFolder: (node) => {
          // Cargar datos de la carpeta para editar
          setFolderName(node.label);
          setFolderColor(node.color || '#5e81ac');
          // Encontrar la carpeta padre
          const findParent = (nodes, targetKey, currentParent = null) => {
            for (let n of nodes) {
              if (n.children && n.children.some(child => child.key === targetKey)) {
                return n.key;
              }
              if (n.children) {
                const found = findParent(n.children, targetKey, n.key);
                if (found) return found;
              }
            }
            return currentParent;
          };
          const parentKey = findParent(nodes, node.key);
          setParentNodeKey(parentKey);
          setEditingNode(node); // Estado para saber que estamos editando
          setFolderName(node.label);
          setFolderColor(node.color || getThemeDefaultColor(iconTheme));
          setFolderIcon(node.folderIcon || null);
          setShowFolderDialog(true);
        },
        deleteNode: (nodeKey, nodeLabel) => {
          
          // Buscar el nodo para determinar si tiene hijos
          const findNodeByKey = (nodes, targetKey) => {
            for (const node of nodes) {
              if (node.key === targetKey) {
                return node;
              }
              if (node.children && Array.isArray(node.children)) {
                const found = findNodeByKey(node.children, targetKey);
                if (found) return found;
              }
            }
            return null;
          };
          
          const targetNode = findNodeByKey(nodes, nodeKey);
          const hasChildren = targetNode && targetNode.children && targetNode.children.length > 0;
          
          // Función para ejecutar la eliminación
          const executeDeletion = () => {
            
            const removeNodeFromTree = (nodes, targetKey) => {
              if (!Array.isArray(nodes)) {
                console.error('❌ removeNodeFromTree: nodes no es un array:', typeof nodes, nodes);
                return [];
              }
              
              return nodes.filter(node => {
                if (node.key === targetKey) {
                  return false;
                }
                if (node.children && Array.isArray(node.children)) {
                  node.children = removeNodeFromTree(node.children, targetKey);
                }
                return true;
              });
            };
            
            try {
              const nodesCopy = JSON.parse(JSON.stringify(nodes));
              const newNodes = removeNodeFromTree(nodesCopy, nodeKey);
              setNodes(() => logSetNodes('Sidebar-Delete', newNodes));
              
              showToast && showToast({ 
                severity: 'success', 
                summary: 'Eliminado', 
                detail: `"${nodeLabel}" ha sido eliminado`, 
                life: 3000 
              });
              
              // Cerrar menú contextual inmediatamente
              if (hideContextMenu) {
                hideContextMenu();
              }
              
              // Desbloquear formularios después de un breve delay
              setTimeout(() => {
                try { 
                  unblockAllInputs();
                } catch (error) {
                  console.error('Error al desbloquear formularios:', error);
                }
              }, 100);
              
            } catch (error) {
              console.error('❌ Error en deleteNode:', error);
              showToast && showToast({ 
                severity: 'error', 
                summary: 'Error', 
                detail: `Error al eliminar "${nodeLabel}": ${error.message}`, 
                life: 5000 
              });
            }
          };
          
          // Mostrar diálogo de confirmación antes de eliminar
          const dialogToUse = confirmDialog || window.confirmDialog;
          
          if (dialogToUse) {
            const message = hasChildren
              ? `¿Estás seguro de que deseas eliminar la carpeta "${nodeLabel}" y todo su contenido? Esta acción no se puede deshacer.`
              : `¿Estás seguro de que deseas eliminar "${nodeLabel}"? Esta acción no se puede deshacer.`;
            
            dialogToUse({
              message: message,
              header: 'Confirmar eliminación',
              icon: 'pi pi-exclamation-triangle',
              acceptClassName: 'p-button-danger',
              accept: executeDeletion,
              reject: () => {
                // Usuario canceló la eliminación
              }
            });
          } else {
            // Fallback si no hay confirmDialog disponible
            executeDeletion();
          }
        }
      };
    }
  }, [nodes, setShowFolderDialog, deepCopy, findNodeByKey, showToast, confirmDialog,
      setEditingNode, setFolderName, setParentNodeKey, setNodes, openEditSSHDialog]);



  const colors = uiThemes[uiTheme]?.colors || uiThemes['Light'].colors;
  // Función interna para el menú contextual del área del árbol
  // const onTreeAreaContextMenu = (event) => {
  //   event.preventDefault();
  //   event.stopPropagation();
  //   // Aquí se podría mostrar un menú contextual propio si se desea
  // };
  // nodeTemplate adaptado de App.js
  const nodeTemplate = (node, options) => {
    const isFolder = node.droppable;
    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && node.data.type === 'rdp';
    const isVNC = node.data && (node.data.type === 'vnc' || node.data.type === 'vnc-guacamole');
    const isFileConnection = node.data && (node.data.type === 'sftp' || node.data.type === 'ftp' || node.data.type === 'scp');
    const isPassword = node.data && node.data.type === 'password';
    // Icono según tema seleccionado para la sidebar
    let icon = null;
    const themeIcons = iconThemes[iconTheme]?.icons || iconThemes['nord'].icons;
    if (isSSH) {
      const sshIcon = themeIcons.ssh;
      icon = sshIcon ? React.cloneElement(sshIcon, {
        width: connectionIconSize,
        height: connectionIconSize,
        style: { 
          ...sshIcon.props.style,
          width: `${connectionIconSize}px`,
          height: `${connectionIconSize}px`
        }
      }) : sshIcon;
    } else if (isRDP) {
      const rdpIcon = themeIcons.rdp;
      icon = rdpIcon ? React.cloneElement(rdpIcon, {
        width: connectionIconSize,
        height: connectionIconSize,
        style: { 
          ...rdpIcon.props.style,
          width: `${connectionIconSize}px`,
          height: `${connectionIconSize}px`
        }
      }) : '🖥️'; // Icono RDP o fallback
    } else if (isVNC) {
      // Usar icono VNC si existe, sino usar RDP como fallback
      const vncIcon = themeIcons.vnc || themeIcons.rdp;
      icon = vncIcon ? React.cloneElement(vncIcon, {
        width: connectionIconSize,
        height: connectionIconSize,
        style: { 
          ...vncIcon.props.style,
          width: `${connectionIconSize}px`,
          height: `${connectionIconSize}px`
        }
      }) : '🖥️'; // Icono VNC o fallback
    } else if (isPassword) {
      icon = <span className="pi pi-key" style={{ color: '#ffc107', fontSize: `${connectionIconSize}px` }} />;
    } else if (isFileConnection) {
      // Icono para conexiones de archivos (SFTP/FTP/SCP) usando el tema
      const protocol = node.data?.protocol || node.data?.type || 'sftp';

      // Buscar icono en tema actual, con fallback a material
      const themeIcon = themeIcons[protocol] || iconThemes['material']?.icons?.[protocol];

      if (themeIcon) {
        icon = React.cloneElement(themeIcon, {
          width: connectionIconSize,
          height: connectionIconSize,
          style: {
            ...themeIcon.props.style,
            width: `${connectionIconSize}px`,
            height: `${connectionIconSize}px`
          }
        });
      } else {
        // Último fallback si no hay icono en ningún tema
        const fallbackColors = {
          sftp: '#ff9800',
          ftp: '#2196f3',
          scp: '#4caf50'
        };
        icon = <span className="pi pi-folder" style={{ color: fallbackColors[protocol] || '#ff9800', fontSize: `${connectionIconSize}px` }} />;
      }
    } else if (isFolder) {
      // Verificar si tiene icono personalizado (ignorar 'general' como si fuera null)
      if (node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()]) {
        const preset = FolderIconPresets[node.folderIcon.toUpperCase()];
        icon = <FolderIconRenderer preset={preset} pixelSize={folderIconSize} />;
      } else {
        // Lógica inteligente para determinar el color de la carpeta:
        // 1. Si no tiene color asignado → usar color por defecto del tema actual
        // 2. Si tiene color pero es un color por defecto de algún tema → usar color por defecto del tema actual
        // 3. Si tiene color personalizado → mantener ese color
        const hasCustomColor = node.color && !isDefaultThemeColor(node.color);
        const folderColor = hasCustomColor ? node.color : getThemeDefaultColor(iconTheme);
        
        // Usar el icono del tema si existe, pero forzar el color
        const themeIcon = options.expanded ? themeIcons.folderOpen : themeIcons.folder;
      
      if (themeIcon) {
        // Si hay un icono del tema, clonarlo y aplicar el color y tamaño
        // Para SVG, necesitamos modificar los atributos fill, stroke y tamaño directamente
        const modifiedIcon = React.cloneElement(themeIcon, {
          width: folderIconSize,
          height: folderIconSize,
          style: { 
            ...themeIcon.props.style, 
            color: folderColor,
            '--icon-color': folderColor,
            width: `${folderIconSize}px`,
            height: `${folderIconSize}px`
          },
          'data-folder-color': folderColor,
          'data-debug': 'sidebar-theme-icon'
        });
        
        // Modificar los colores del SVG preservando la identidad del tema
        const modifySVGColors = (element, newColor, index = 0) => {
          if (!element || !element.props) return element;
          
          const newProps = { ...element.props };
          
          // Añadir key única si no existe
          if (!newProps.key) {
            newProps.key = `svg-child-${index}-${Date.now()}`;
          }
          
          // Función para convertir hex a HSL
          const hexToHsl = (hex) => {
            const r = parseInt(hex.substr(1, 2), 16) / 255;
            const g = parseInt(hex.substr(3, 2), 16) / 255;
            const b = parseInt(hex.substr(5, 2), 16) / 255;
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            
            if (max === min) {
              h = s = 0;
            } else {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
              }
              h /= 6;
            }
            
            return [h * 360, s * 100, l * 100];
          };
          
          // Función para convertir HSL a hex
          const hslToHex = (h, s, l) => {
            h /= 360;
            s /= 100;
            l /= 100;
            
            const hue2rgb = (p, q, t) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1/6) return p + (q - p) * 6 * t;
              if (t < 1/2) return q;
              if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
              return p;
            };
            
            let r, g, b;
            if (s === 0) {
              r = g = b = l;
            } else {
              const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
              const p = 2 * l - q;
              r = hue2rgb(p, q, h + 1/3);
              g = hue2rgb(p, q, h);
              b = hue2rgb(p, q, h - 1/3);
            }
            
            const toHex = (c) => {
              const hex = Math.round(c * 255).toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            };
            
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
          };
          
          // Función para crear un color complementario
          const getComplementaryColor = (color) => {
            const [h, s, l] = hexToHsl(color);
            return hslToHex((h + 180) % 360, s, l);
          };
          
          // Función para crear un color análogo (desplazado en el círculo cromático)
          const getAnalogousColor = (color, offset = 30) => {
            const [h, s, l] = hexToHsl(color);
            return hslToHex((h + offset) % 360, s, l);
          };
          
          // Función para ajustar la saturación
          const adjustSaturation = (color, factor) => {
            const [h, s, l] = hexToHsl(color);
            return hslToHex(h, Math.min(100, s * factor), l);
          };
          
          // Función para ajustar la luminosidad
          const adjustLightness = (color, factor) => {
            const [h, s, l] = hexToHsl(color);
            return hslToHex(h, s, Math.min(100, Math.max(0, l * factor)));
          };
          
          // Lista de temas que deben preservar sus colores originales
          // NOTA: Fluent se excluye intencionalmente para mantener su funcionalidad de colores personalizados
          const preserveOriginalColorsThemes = [
            // Temas originales que deben mantener sus colores
            'monokai', 'onedark', 'gruvbox', 'tokyonight', 'palenight', 'minimal',
            // Nuevos temas añadidos
            'cyberpunk', 'retroGaming', 'corporate', 'nature', 'space', 'ocean', 
            'fire', 'ice', 'forest', 'sunset', 'matrix', 'neon', 'gradient', 
            'rainbow', 'metallic', 'holographic', 'glitch', 
            'vaporwave', 'minimalist', 'geometric', 'organic', 'tech', 'gaming', 'professional'
          ];
          
          // Si es un tema que debe preservar colores originales, no modificar nada
          if (preserveOriginalColorsThemes.includes(iconTheme)) {
            return element;
          }
          
          // Mapeo de colores específicos del tema a colores adaptados
          // REGLA: La parte superior (flap) mantiene el color secundario del tema, solo el cuerpo cambia
          const colorMapping = {
            // Synthwave: #ff007c (rosa) -> color personalizado, #00d4ff (cian) -> MANTENER (parte superior)
            '#ff007c': newColor,   // Aplicar color personalizado al cuerpo
            '#00d4ff': '#00d4ff', // Mantener cian original en parte superior
            
            // Nord: #5e81ac (azul) -> color personalizado, #88c0d0 (azul claro) -> MANTENER (parte superior)
            '#5e81ac': newColor,   // Aplicar color personalizado al cuerpo
            '#88c0d0': '#88c0d0', // Mantener azul claro original en parte superior
            
            // Dracula: #bd93f9 (púrpura) -> color personalizado, #ff79c6 (rosa) -> MANTENER (parte superior)
            '#bd93f9': newColor,   // Aplicar color personalizado al cuerpo
            '#ff79c6': '#ff79c6', // Mantener rosa original en parte superior
            
            // Fluent: #0078d4 (azul) -> color personalizado, #50e6ff (cian) -> MANTENER (parte superior)
            '#0078d4': newColor,   // Aplicar color personalizado al cuerpo
            '#50e6ff': '#50e6ff', // Mantener cian original en parte superior
            
            // Solarized: #b58900 (amarillo) -> color personalizado, #268bd2 (azul) -> MANTENER (parte superior)
            '#b58900': newColor,   // Aplicar color personalizado al cuerpo
            '#268bd2': '#268bd2', // Mantener azul original en parte superior
            
            // VS Code: #dcb67a (dorado) -> color personalizado, #f5d18a (dorado claro) -> MANTENER (parte superior)
            '#dcb67a': newColor,   // Aplicar color personalizado al cuerpo
            '#f5d18a': '#f5d18a', // Mantener dorado claro original en parte superior
          };
          
          // Cambiar colores de manera inteligente
          if (newProps.fill && newProps.fill !== 'none') {
            if (colorMapping[newProps.fill]) {
              newProps.fill = colorMapping[newProps.fill];
            } else {
              // Para colores no mapeados, usar el color personalizado
              newProps.fill = newColor;
            }
          }
          
          if (newProps.stroke && newProps.stroke !== 'none') {
            if (colorMapping[newProps.stroke]) {
              newProps.stroke = colorMapping[newProps.stroke];
            } else {
              newProps.stroke = newColor;
            }
          }
          
          // Procesar children recursivamente
          if (newProps.children) {
            if (Array.isArray(newProps.children)) {
              newProps.children = newProps.children.map((child, index) => 
                typeof child === 'object' ? modifySVGColors(child, newColor, index) : child
              );
            } else if (typeof newProps.children === 'object') {
              newProps.children = modifySVGColors(newProps.children, newColor, 0);
            }
          }
          
          return React.cloneElement(element, newProps);
        };
        
        icon = modifySVGColors(modifiedIcon, folderColor, 0);
      } else {
        // Fallback a iconos PrimeReact con color forzado
        icon = options.expanded
          ? <span 
              className="pi pi-folder-open" 
              style={{ 
                color: folderColor,
                '--icon-color': folderColor
              }} 
              data-folder-color={folderColor}
              data-debug="sidebar-fallback-open"
            />
          : <span 
              className="pi pi-folder" 
              style={{ 
                color: folderColor,
                '--icon-color': folderColor
              }} 
              data-folder-color={folderColor}
              data-debug="sidebar-fallback-closed"
            />;
        }
      }
    } else {
      icon = themeIcons.file;
    }
    
    // Determinar el título según el tipo de nodo
    let title = "Click derecho para más opciones";
    if (isSSH) {
      title += " | Doble click para abrir terminal SSH";
    } else if (isRDP) {
      title += " | Doble click para conectar RDP";
    } else if (isVNC) {
      title += " | Doble click para conectar VNC";
    } else if (isFileConnection) {
      const protocolLabel = (node.data?.protocol || node.data?.type || 'SFTP').toUpperCase();
      title += ` | Doble click para abrir explorador ${protocolLabel}`;
    }
    
    // Detectar si tiene icono personalizado (para ajustar alineación del texto)
    const hasCustomFolderIcon = isFolder && node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()];
    
    // Render básico, puedes añadir acciones/contextual aquí
    return (
      <div className="flex align-items-center gap-1"
        onContextMenu={options.onNodeContextMenu ? (e) => options.onNodeContextMenu(e, node) : undefined}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isSSH && onOpenSSHConnection) {
            onOpenSSHConnection(node, nodes);
          } else if (isRDP && sidebarCallbacksRef?.current?.connectRDP) {
            sidebarCallbacksRef.current.connectRDP(node);
          } else if (isVNC && onOpenVncConnection) {
            onOpenVncConnection(node, nodes);
          } else if (isFileConnection && sidebarCallbacksRef?.current?.openFileConnection) {
            sidebarCallbacksRef.current.openFileConnection(node, nodes);
          }
        }}
        style={{ 
          cursor: 'pointer', 
          fontFamily: explorerFont,
          display: 'flex',
          alignItems: 'flex-end',
          gap: '6px'
        }}
        title={title}
        data-connection-type={isSSH ? 'ssh' : (isRDP ? 'rdp' : (isVNC ? 'vnc' : null))}
        data-node-type={isFolder ? 'folder' : 'connection'}
      >
        <span style={{ 
          minWidth: 20,
          display: 'flex', 
          alignItems: 'flex-end', 
          justifyContent: 'center', 
          height: '20px',
          position: 'relative' // Para posicionar el tag SSH
        }}>
          {icon}
             {/* Tag SSH superpuesto en la parte derecha inferior - Solo para tema Nodeterm Basic */}
             {isSSH && iconTheme === 'nodetermBasic' && (
               <span
                 className="ssh-connection-tag"
                 style={{
                   position: 'absolute',
                   bottom: '1px', // Mover a la parte inferior
                   right: '-7px', // Mover un poquito más a la derecha
                   backgroundColor: '#1a1a1a',
                   color: '#42a5f5',
                   fontSize: '5px', // Un poquito más grande
                   fontWeight: 'bold',
                   padding: '0.7px 2.5px', // Un poquito más grande
                   borderRadius: '2px',
                   border: '0.5px solid #42a5f5', // Borde más fino
                   lineHeight: 1,
                   zIndex: 10,
                   fontFamily: 'monospace',
                   letterSpacing: '0.3px',
                   boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                 }}
               >
                 SSH
               </span>
             )}

             {/* Tag RDP superpuesto en la parte derecha inferior - Solo para tema Nodeterm Basic */}
             {isRDP && iconTheme === 'nodetermBasic' && (
               <span
                 className="rdp-connection-tag"
                 style={{
                   position: 'absolute',
                   bottom: '1px', // Mover a la parte inferior
                   right: '-7px', // Mover un poquito más a la derecha
                   backgroundColor: '#1a1a1a',
                   color: '#00ffff', // Color azul turquesa muy chillón
                   fontSize: '5px', // Un poquito más grande
                   fontWeight: 'bold',
                   padding: '0.7px 2.5px', // Un poquito más grande
                   borderRadius: '2px',
                   border: '0.5px solid #00ffff', // Borde azul turquesa muy chillón
                   lineHeight: 1,
                   zIndex: 10,
                   fontFamily: 'monospace',
                   letterSpacing: '0.3px',
                   boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                 }}
               >
                 RDP
               </span>
             )}
        </span>
        <span className="node-label" style={{ 
          flex: 1,
          marginLeft: (isSSH || isRDP || isVNC) && iconTheme === 'nodetermBasic' ? '6px' : '0px',
          lineHeight: '20px',
          height: '20px',
          display: 'block',
          margin: 0,
          padding: 0,
          ...(hasCustomFolderIcon ? { transform: 'translateY(3px)' } : {})
        }}>{node.label}</span>
        {/* Estrella de favoritos oculta en la lista lateral por solicitud */}
      </div>
    );
  };
  return (
    <div 
      ref={sidebarRef}
      className="sidebar-container"
      style={{
        transition: 'all 0.15s ease-out',
        width: sidebarCollapsed ? 44 : undefined,
        minWidth: sidebarCollapsed ? 44 : undefined,
        maxWidth: sidebarCollapsed ? 44 : undefined,
        padding: 0,
        height: '100vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: explorerFont,
        fontSize: `${explorerFontSize}px`,
        color: explorerFontColor || undefined,
        ...(explorerFontColor ? { '--ui-sidebar-text': explorerFontColor } : {})
      }}>
      {sidebarCollapsed ? (
        // Layout de sidebar colapsada: botón de colapsar arriba a la izquierda, menú y config abajo
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          width: '100%', 
          height: '100%',
          position: 'relative'
        }}>
          {/* Botones superiores: colapsar, nueva conexión, nuevo grupo */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'flex-start', // Alinear a la izquierda
            padding: '8px 2px 100px 2px',
            width: '100%',
            visibility: 'visible',
            opacity: 1,
            zIndex: 1000,
            gap: '8px',
            boxSizing: 'border-box'
          }}>
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '8px',
              width: '100%'
            }}>
              {/* Botón de colapsar */}
              <Button 
                className="p-button-rounded p-button-text sidebar-action-button glass-button" 
                onClick={() => setSidebarCollapsed(v => !v)} 
                tooltip={sidebarCollapsed ? t('tooltips.expandSidebar') : t('tooltips.collapseSidebar')} 
                tooltipOptions={{ position: 'right' }} 
                style={{ 
                  margin: 0, 
                  width: 40, 
                  height: 40, 
                  minWidth: 40, 
                  minHeight: 40, 
                  border: 'none',
                  display: 'flex !important',
                  alignItems: 'center',
                  justifyContent: 'center',
                  visibility: 'visible !important',
                  opacity: '1 !important',
                  padding: 0
                }} 
              >
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  color: 'var(--ui-sidebar-text)'
                }}>
                  {sidebarCollapsed 
                    ? sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.expandRight
                    : sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.collapseLeft
                  }
                </span>
              </Button>
              
              {/* Botón de conexiones */}
              <Button 
                className="p-button-rounded p-button-text sidebar-action-button glass-button" 
                onClick={() => {
                  setViewMode('connections');
                  setSidebarCollapsed(false);
                }} 
                tooltip={t('tooltips.connections')} 
                tooltipOptions={{ position: 'right' }} 
                style={{ 
                  margin: 0, 
                  width: 40, 
                  height: 40, 
                  minWidth: 40, 
                  minHeight: 40, 
                  border: 'none',
                  display: 'flex !important',
                  alignItems: 'center',
                  justifyContent: 'center',
                  visibility: 'visible !important',
                  opacity: '1 !important',
                  padding: 0
                }} 
              >
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  color: '#2196f3'
                }}>
                  {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.newConnection}
                </span>
              </Button>
              
              {/* Botón de passwords */}
              <Button 
                className="p-button-rounded p-button-text sidebar-action-button glass-button" 
                onClick={() => {
                  setViewMode('passwords');
                  setSidebarCollapsed(false);
                }} 
                tooltip={t('tooltips.passwords')} 
                tooltipOptions={{ position: 'right' }} 
                style={{ 
                  margin: 0, 
                  width: 40, 
                  height: 40, 
                  minWidth: 40, 
                  minHeight: 40, 
                  border: 'none',
                  display: 'flex !important',
                  alignItems: 'center',
                  justifyContent: 'center',
                  visibility: 'visible !important',
                  opacity: '1 !important',
                  padding: 0
                }} 
              >
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  color: '#ffc107'
                }}>
                  {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.passwordManager}
                </span>
              </Button>
              
              {/* Botón de nuevo grupo */}
              <Button 
                className="p-button-rounded p-button-text sidebar-action-button glass-button" 
                onClick={() => setShowCreateGroupDialog(true)} 
                tooltip={t('tooltips.createGroup')} 
                tooltipOptions={{ position: 'right' }} 
                style={{ 
                  margin: 0, 
                  width: 40, 
                  height: 40, 
                  minWidth: 40, 
                  minHeight: 40, 
                  border: 'none',
                  display: 'flex !important',
                  alignItems: 'center',
                  justifyContent: 'center',
                  visibility: 'visible !important',
                  opacity: '1 !important',
                  padding: 0
                }} 
              >
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  color: 'var(--ui-sidebar-text)'
                }}>
                  {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.newGroup}
                </span>
              </Button>
              
            {/* Separador para clientes de IA */}
            {(aiClientsEnabled.nodeterm || aiClientsEnabled.anythingllm || aiClientsEnabled.openwebui) && (
              <div style={{
                width: '28px',
                height: '1px',
                backgroundColor: 'var(--ui-sidebar-border, rgba(255, 255, 255, 0.1))',
                margin: '10px auto',
                borderRadius: '0.5px',
                opacity: 0.6,
                flexShrink: 0
              }} />
            )}

            {/* Botones de clientes de IA */}
            {/* Botón de Chat de IA - Solo visible si está activado */}
            {aiClientsEnabled.nodeterm && (
              <Button 
                icon="pi pi-comments" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={() => {
                  // Crear pestaña de IA
                  const newAITab = {
                    key: `ai-chat-${Date.now()}`,
                    label: 'Chat IA',
                    type: 'ai-chat',
                    createdAt: Date.now(),
                    groupId: null
                  };

                  // Disparar evento para crear la pestaña
                  window.dispatchEvent(new CustomEvent('create-ai-tab', {
                    detail: { tab: newAITab }
                  }));
                }} 
                tooltip={t('tooltips.aiChat')} 
                tooltipOptions={{ position: 'right' }} 
                style={{ 
                  margin: 0, 
                  width: 40, 
                  height: 40, 
                  minWidth: 40, 
                  minHeight: 40, 
                  fontSize: 18,
                  border: 'none',
                  display: 'flex !important',
                  alignItems: 'center',
                  justifyContent: 'center',
                  visibility: 'visible !important',
                  opacity: '1 !important'
                }} 
              />
            )}

            {/* Botón de AnythingLLM - Solo visible si está activado */}
            {aiClientsEnabled.anythingllm && (
              <Button 
                icon="pi pi-box" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={openAnythingLLMTab} 
                tooltip={t('tooltips.anythingLLM')} 
                tooltipOptions={{ position: 'right' }} 
                style={{ 
                  margin: 0, 
                  width: 40, 
                  height: 40, 
                  minWidth: 40, 
                  minHeight: 40, 
                  fontSize: 18,
                  border: 'none',
                  display: 'flex !important',
                  alignItems: 'center',
                  justifyContent: 'center',
                  visibility: 'visible !important',
                  opacity: '1 !important',
                  color: '#9c27b0'
                }} 
              />
            )}

            {/* Botón de Open WebUI - Solo visible si está activado */}
            {aiClientsEnabled.openwebui && (
              <Button 
                icon="pi pi-globe" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={openOpenWebUITab} 
                tooltip={t('tooltips.openWebUI')} 
                tooltipOptions={{ position: 'right' }} 
                style={{ 
                  margin: 0, 
                  width: 40, 
                  height: 40, 
                  minWidth: 40, 
                  minHeight: 40, 
                  fontSize: 18,
                  border: 'none',
                  display: 'flex !important',
                  alignItems: 'center',
                  justifyContent: 'center',
                  visibility: 'visible !important',
                  opacity: '1 !important',
                  color: '#2196F3'
                }} 
              />
            )}
            </div>

            <div style={{ flexGrow: 1 }} />

            {filesystemAvailable && isAIChatActive && (
              <>
                <div
                  style={{
                    width: '60%',
                    height: 1,
                    backgroundColor: 'var(--ui-sidebar-border, rgba(255,255,255,0.18))',
                    opacity: 0.6,
                    margin: '4px 0 6px 0',
                    alignSelf: 'center'
                  }}
                />
                <Button
                  className="p-button-rounded p-button-text sidebar-action-button glass-button"
                  onClick={() => {
                    setViewMode('filesystem');
                    setSidebarCollapsed(false);
                  }}
                  tooltip={t('tooltips.filesystemMCP')}
                  tooltipOptions={{ position: 'right' }}
                  style={{
                    margin: 0,
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    minHeight: 40,
                    border: 'none',
                    display: 'flex !important',
                    alignItems: 'center',
                    justifyContent: 'center',
                    visibility: 'visible !important',
                    opacity: '1 !important',
                    padding: 0
                  }}
                >
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    color: viewMode === 'filesystem' ? '#8bc34a' : '#cfd8dc'
                  }}>
                    {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.newFolder}
                  </span>
                </Button>
              </>
            )}

            {isAIChatActive && onToggleLocalTerminalForAIChat && (
              <Button
                icon="pi pi-desktop"
                className="p-button-rounded p-button-text sidebar-action-button"
                onClick={() => {
                  onToggleLocalTerminalForAIChat();
                }}
                tooltip={t('tooltips.localTerminal')}
                tooltipOptions={{ position: 'right' }}
                style={{
                  margin: 0,
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  minHeight: 40,
                  fontSize: 18,
                  border: 'none',
                  display: 'flex !important',
                  alignItems: 'center',
                  justifyContent: 'center',
                  visibility: 'visible !important',
                  opacity: '1 !important',
                  color: '#90caf9'
                }}
              />
            )}
          </div>

          {/* Botones de menú de aplicación y configuración en la parte inferior */}
          <div style={{ 
            position: 'absolute', 
            bottom: 8, 
            left: 0, 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            visibility: 'visible',
            opacity: 1,
            zIndex: 1000
          }}>
            <Button
              className="p-button-rounded p-button-text sidebar-action-button glass-button"
              onClick={() => setShowSettingsDialog(true)}
              tooltip={t('tooltips.settings')}
              tooltipOptions={{ position: 'right' }}
              style={{ 
                margin: 0, 
                width: 40, 
                height: 40, 
                minWidth: 40, 
                minHeight: 40, 
                border: 'none',
                display: 'flex !important',
                alignItems: 'center',
                justifyContent: 'center',
                visibility: 'visible !important',
                opacity: '1 !important',
                padding: 0
              }} 
            >
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                color: 'var(--ui-sidebar-text)'
              }}>
                {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.settings}
              </span>
            </Button>
            <Button
              className="p-button-rounded p-button-text sidebar-action-button glass-button"
              onClick={(e) => {
                handleAppMenuClick(e);
              }}
              tooltip={t('tooltips.appMenu')}
              tooltipOptions={{ position: 'right' }}
              style={{ 
                margin: 0, 
                width: 40, 
                height: 40, 
                minWidth: 40, 
                minHeight: 40, 
                border: 'none',
                display: 'flex !important',
                alignItems: 'center',
                justifyContent: 'center',
                visibility: 'visible !important',
                opacity: '1 !important',
                padding: 0
              }} 
            >
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                color: 'var(--ui-sidebar-text)'
              }}>
                {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.menu}
              </span>
            </Button>
          </div>
        </div>
      ) : (
        // Sidebar completa
        <>
          {viewMode === 'connections' ? (
            // Vista de conexiones (árbol normal)
            <>
              {FUTURISTIC_UI_KEYS.includes(uiTheme) && (
                <div style={{ 
                  width: '100%', 
                  height: '0.5px', 
                  backgroundColor: 'var(--ui-sidebar-border)', 
                  opacity: 0.6,
                  margin: 0,
                  padding: 0,
                  boxSizing: 'border-box',
                  border: 'none',
                  outline: 'none'
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.5rem 0.25rem 0.5rem' }}>
                <Button 
                  className="p-button-rounded p-button-text sidebar-action-button glass-button" 
                  onClick={() => setSidebarCollapsed(v => !v)} 
                  tooltip={sidebarCollapsed ? t('tooltips.expandSidebar') : t('tooltips.collapseSidebar')} 
                  tooltipOptions={{ position: 'bottom' }} 
                  style={{ 
                    marginRight: 8,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    padding: 0
                  }} 
                >
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    color: 'var(--ui-sidebar-text)'
                  }}>
                    {sidebarCollapsed 
                      ? sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.expandRight
                      : sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.collapseLeft
                    }
                  </span>
                </Button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                  <Button 
                    className="p-button-rounded p-button-text sidebar-action-button glass-button" 
                    onClick={() => {
                      // Abrir diálogo de selección de protocolo
                      if (sidebarCallbacksRef?.current?.showProtocolSelection) {
                        sidebarCallbacksRef.current.showProtocolSelection();
                      } else {
                        // Fallback: usar evento personalizado
                        window.dispatchEvent(new CustomEvent('open-new-unified-connection-dialog'));
                      }
                    }} 
                    tooltip={t('tooltips.newConnection')} 
                    tooltipOptions={{ position: 'bottom' }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      padding: 0
                    }}
                  >
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      color: 'var(--ui-sidebar-text)'
                    }}>
                      {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.newConnection}
                    </span>
                  </Button>
                  <Button 
                    className="p-button-rounded p-button-text sidebar-action-button glass-button" 
                    onClick={() => setShowFolderDialog(true)} 
                    tooltip={t('tooltips.createFolder')} 
                    tooltipOptions={{ position: 'bottom' }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      padding: 0
                    }}
                  >
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      color: 'var(--ui-sidebar-text)'
                    }}>
                      {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.newFolder}
                    </span>
                  </Button>
                  <Button 
                    className="p-button-rounded p-button-text sidebar-action-button glass-button" 
                    onClick={() => setShowCreateGroupDialog(true)} 
                    tooltip={t('tooltips.createGroup')} 
                    tooltipOptions={{ position: 'bottom' }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      padding: 0
                    }}
                  >
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      color: 'var(--ui-sidebar-text)'
                    }}>
                      {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.newGroup}
                    </span>
                  </Button>
                  <Button 
                    className="p-button-rounded p-button-text sidebar-action-button glass-button key-button" 
                    onClick={() => setViewMode('passwords')} 
                    tooltip={t('tooltips.passwordManager')} 
                    tooltipOptions={{ position: 'bottom' }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      padding: 0
                    }}
                  >
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      color: '#ffc107'
                    }}>
                      {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.passwordManager}
                    </span>
                  </Button>
                  {filesystemAvailable && isAIChatActive && (
                    <Button
                      icon="pi pi-folder-open"
                      className={`p-button-rounded p-button-text sidebar-action-button glass-button ${viewMode === 'filesystem' ? 'active' : ''}`}
                      onClick={() => setViewMode('filesystem')}
                      tooltip={t('tooltips.mcpExplorer')}
                      tooltipOptions={{ position: 'bottom' }}
                      style={{
                        borderColor: viewMode === 'filesystem' ? 'var(--ui-primary-color, #8bc34a)' : undefined,
                        color: viewMode === 'filesystem' ? 'var(--ui-primary-color, #8bc34a)' : undefined
                      }}
                    />
                  )}
                  {isAIChatActive && onToggleLocalTerminalForAIChat && (
                    <Button
                      icon="pi pi-desktop"
                      className="p-button-rounded p-button-text sidebar-action-button glass-button"
                      onClick={() => onToggleLocalTerminalForAIChat()}
                      tooltip={t('tooltips.localTerminal')}
                      tooltipOptions={{ position: 'bottom' }}
                      style={{
                        borderColor: '#90caf9',
                        color: '#90caf9'
                      }}
                    />
                  )}
                </div>
              </div>
              <Divider className="my-2" />
              
              <div 
                style={{ 
                  flex: 1, 
                  minHeight: 0, 
                  overflowY: 'auto', 
                  overflowX: 'auto',
                  position: 'relative',
                  fontSize: `${explorerFontSize}px`,
                  color: explorerFontColor || undefined,
                  ...(explorerFontColor ? { '--ui-sidebar-text': explorerFontColor } : {})
                }}
                onContextMenu={onTreeAreaContextMenu}
                className="tree-container"
              >
                {nodes.length === 0 ? (
                  <div className="empty-tree-message" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                    No hay elementos en el árbol.<br/>Usa el botón "+" para crear una carpeta o conexión.
                  </div>
                ) : (
                  <Tree
                    key={`tree-${iconTheme}-${explorerFontSize}-${treeTheme}-${explorerFontColor || 'default'}`} // Forzar re-render cuando cambie el tema
                    value={nodes}
                    selectionMode="single"
                    selectionKeys={selectedNodeKey}
                    onSelectionChange={e => setSelectedNodeKey(e.value)}
                    expandedKeys={expandedKeys}
                    onToggle={e => setExpandedKeys(e.value)}
                    dragdropScope="files"
                    onDragDrop={onDragDrop}
                    onDragStart={e => {
                      // if (e.node) setDraggedNodeKey(e.node.key); // This line was removed as per the edit hint
                    }}
                    onDragEnd={() => {}}
                    className={`sidebar-tree tree-theme-${treeTheme}`}
                    data-icon-theme={iconTheme}
                    data-tree-theme={treeTheme}
                    data-font-color={explorerFontColor || ''}
                    style={{ 
                      fontSize: `${explorerFontSize}px`,
                      color: explorerFontColor || undefined,
                      '--icon-size': `${iconSize}px`,
                      ...(explorerFontColor ? { 
                        '--ui-sidebar-text': explorerFontColor,
                        '--tree-text-color': explorerFontColor
                      } : {})
                    }}
                    nodeTemplate={(node, options) => nodeTemplate(node, { ...options, onNodeContextMenu })}
                  />
                )}
              </div>
              
              <SidebarFooter 
                onConfigClick={() => setShowSettingsDialog(true)} 
                allExpanded={allExpanded}
                toggleExpandAll={toggleExpandAll}
                collapsed={sidebarCollapsed}
                onShowImportDialog={setShowImportDialog}
                sessionActionIconTheme={sessionActionIconTheme}
              />
            </>
          ) : viewMode === 'filesystem' ? (
            <SidebarFilesystemExplorer
              status={filesystemStatus}
              onBackToConnections={() => setViewMode('connections')}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
              explorerFont={explorerFont}
              explorerFontSize={explorerFontSize}
              uiTheme={uiTheme}
              showToast={showToast}
              sessionActionIconTheme={sessionActionIconTheme}
              initialPath={initialFilesystemPath}
              onPathNavigated={() => setInitialFilesystemPath(null)}
            />
          ) : viewMode === 'localExplorer' ? (
            <LocalFileExplorerSidebar
              initialPath={localExplorerPath}
              onBackToConnections={() => {
                setViewMode('connections');
                setLocalExplorerPath(null);
              }}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
              explorerFont={explorerFont}
              explorerFontSize={explorerFontSize}
              uiTheme={uiTheme}
              showToast={showToast}
            />
          ) : (
            // Vista de passwords
            <PasswordManagerSidebar
              nodes={nodes}
              setNodes={setNodes}
              showToast={showToast}
              confirmDialog={confirmDialog}
              uiTheme={uiTheme}
              onBackToConnections={() => setViewMode('connections')}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
              iconTheme={iconTheme}
              iconSize={iconSize}
              folderIconSize={folderIconSize}
              connectionIconSize={connectionIconSize}
              explorerFont={explorerFont}
              explorerFontSize={explorerFontSize}
              masterKey={masterKey}
              secureStorage={secureStorage}
              setShowSettingsDialog={setShowSettingsDialog}
              onShowImportDialog={setShowImportDialog}
              sessionActionIconTheme={sessionActionIconTheme}
              sidebarFilter={sidebarFilter}
              treeTheme={treeTheme}
            />
          )}
        </>
      )}

      <FolderDialog
        visible={showFolderDialog}
        onHide={() => {
          setShowFolderDialog(false);
          setFolderName('');
          setFolderColor(getThemeDefaultColor(iconTheme));
          setFolderIcon(null);
          setEditingNode(null); // Limpiar estado de edición al cerrar
        }}
        mode={editingNode ? "edit" : "new"}
        folderName={folderName}
        setFolderName={setFolderName}
        folderColor={folderColor}
        setFolderColor={setFolderColor}
        folderIcon={folderIcon}
        setFolderIcon={setFolderIcon}
        onConfirm={createNewFolder}
        themeDefaultColor={getThemeDefaultColor(iconTheme)}
        themeName={iconThemes[iconTheme]?.name || 'Material'}
      />
      {/* Los diálogos de edición SSH y RDP ahora se manejan en DialogsManager */}
      
      <ImportDialog
        visible={showImportDialog}
        onHide={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
        showToast={showToast}
      />

    </div>
  );
});

export default Sidebar; 