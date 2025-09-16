import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Tree } from 'primereact/tree';
import { Divider } from 'primereact/divider';
import SidebarFooter from './SidebarFooter';
import { uiThemes } from '../themes/ui-themes';
import { FolderDialog, UnifiedConnectionDialog } from './Dialogs';
import { iconThemes } from '../themes/icon-themes';
import ImportDialog from './ImportDialog';
import { unblockAllInputs, detectBlockedInputs } from '../utils/formDebugger';
import ImportService from '../services/ImportService';
import { toggleFavorite as toggleFavoriteConn, helpers as connHelpers, isFavorite as isFavoriteConn } from '../utils/connectionStore';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';
import { STORAGE_KEYS } from '../utils/constants';

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
    if (blockedInputs.length > 0) {
      console.log(`🔓 Desbloqueando ${blockedInputs.length} formularios bloqueados:`, blockedInputs);
    }
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

  iconTheme,
  iconSize = 16,
  explorerFont,
  explorerFontSize = 14,
  uiTheme = 'Light',
  showToast, // callback opcional para mostrar toast global
  onOpenSSHConnection, // nuevo prop para doble click en SSH
  onNodeContextMenu, // handler del menú contextual de nodos
  onTreeAreaContextMenu, // handler del menú contextual del área del árbol
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
  
  // Estados de formularios Edit SSH
  editSSHName, setEditSSHName,
  editSSHHost, setEditSSHHost,
  editSSHUser, setEditSSHUser,
  editSSHPassword, setEditSSHPassword,
  editSSHRemoteFolder, setEditSSHRemoteFolder,
  editSSHPort, setEditSSHPort,
  
  // Estados para modo edición
  editSSHNode, setEditSSHNode,
  
  // Estados de formularios RDP
  rdpNodeData, setRdpNodeData,
  editingRdpNode, setEditingRdpNode
}) => {
  
  // Estado para diálogos
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showUnifiedConnectionDialog, setShowUnifiedConnectionDialog] = useState(false);
  
  // Función para obtener el color por defecto del tema actual
  const getThemeDefaultColor = (themeName) => {
    const theme = iconThemes[themeName];
    if (!theme || !theme.icons || !theme.icons.folder) return '#007ad9';
    
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
    
    return '#007ad9'; // Fallback por defecto
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
    
    console.log(`🎨 Tema cambiado a "${iconTheme}". Carpetas sin color personalizado actualizadas al color: ${newDefaultColor}`);
  }, [iconTheme, setNodes]);
  
  // Ref para el contenedor de la sidebar
  const sidebarRef = useRef(null);
  
  // Función para manejar el menú de aplicación (unificada)
  const handleAppMenuClick = (event) => {
    console.log('handleAppMenuClick ejecutado - menú unificado');
    const menuStructure = createAppMenu(setShowImportDialog);
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
        console.log('📁 Sidebar: Importando estructura con carpetas:', importResult.structure.folderCount, 'folders');
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
      
      console.log('✅ Sidebar handleImportComplete COMPLETADO EXITOSAMENTE');

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
      const updateNodeInTree = (nodes, targetKey, newLabel, newColor) => {
        return nodes.map(node => {
          if (node.key === targetKey) {
            return { ...node, label: newLabel, color: newColor };
          }
          if (node.children) {
            return { ...node, children: updateNodeInTree(node.children, targetKey, newLabel, newColor) };
          }
          return node;
        });
      };
      const updatedNodes = updateNodeInTree(nodesCopy, editingNode.key, folderName.trim(), folderColor);
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
        color: folderColor
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

        createRDP: () => {
          // Esta función debe ser pasada desde App.js
          if (window.createRDP) {
            window.createRDP();
          }
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
          setFolderColor(node.color || '#007ad9');
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
          setShowFolderDialog(true);
        },
        deleteNode: (nodeKey, nodeLabel) => {
          console.log('🗑️ deleteNode llamado con:', { nodeKey, nodeLabel });
          
          // Confirmar eliminación y proceder
          if (window.confirm(`¿Estás seguro de que quieres eliminar "${nodeLabel}"?`)) {
            console.log('✅ Usuario confirmó eliminación');
            
            const removeNodeFromTree = (nodes, targetKey) => {
              // Verificar que nodes sea un array válido
              if (!Array.isArray(nodes)) {
                console.error('❌ removeNodeFromTree: nodes no es un array:', typeof nodes, nodes);
                return [];
              }
              
              return nodes.filter(node => {
                if (node.key === targetKey) {
                  return false; // Eliminar este nodo
                }
                // Solo procesar children si existe y es un array
                if (node.children && Array.isArray(node.children)) {
                  node.children = removeNodeFromTree(node.children, targetKey);
                }
                return true;
              });
            };
            
            try {
              // Crear copia profunda de los nodos usando JSON
              const nodesCopy = JSON.parse(JSON.stringify(nodes));
              console.log('📋 Nodos antes de eliminar:', nodesCopy.length);
              console.log('📋 Tipo de nodesCopy:', typeof nodesCopy, Array.isArray(nodesCopy));
              const newNodes = removeNodeFromTree(nodesCopy, nodeKey);
              console.log('📋 Nodos después de eliminar:', newNodes.length);
              
              setNodes(() => logSetNodes('Sidebar-Delete', newNodes));
              console.log('✅ setNodes ejecutado');
              
            showToast && showToast({ 
              severity: 'success', 
              summary: 'Eliminado', 
              detail: `"${nodeLabel}" ha sido eliminado`, 
              life: 3000 
            });
              console.log('✅ Toast mostrado');
              
              // Desbloquear formularios por si alguna máscara quedó activa
              setTimeout(() => {
                try { unblockAllInputs(); } catch {}
              }, 0);
              
              // Cerrar menú contextual manualmente
              setTimeout(() => {
                const contextMenus = document.querySelectorAll('.p-contextmenu');
                contextMenus.forEach(menu => {
                  if (menu.style.display !== 'none') {
                    menu.style.display = 'none';
                  }
                });
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
          } else {
            console.log('❌ Usuario canceló eliminación');
          }
        }
      };
    }
  }, [nodes, setShowFolderDialog, deepCopy, findNodeByKey, showToast, 
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
    // Icono según tema seleccionado para la sidebar
    let icon = null;
    const themeIcons = iconThemes[iconTheme]?.icons || iconThemes['material'].icons;
    if (isSSH) {
      const sshIcon = themeIcons.ssh;
      icon = sshIcon ? React.cloneElement(sshIcon, {
        width: iconSize,
        height: iconSize,
        style: { 
          ...sshIcon.props.style,
          width: `${iconSize}px`,
          height: `${iconSize}px`
        }
      }) : sshIcon;
    } else if (isRDP) {
      const rdpIcon = themeIcons.rdp;
      icon = rdpIcon ? React.cloneElement(rdpIcon, {
        width: iconSize,
        height: iconSize,
        style: { 
          ...rdpIcon.props.style,
          width: `${iconSize}px`,
          height: `${iconSize}px`
        }
      }) : '🖥️'; // Icono RDP o fallback
    } else if (isFolder) {
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
          width: iconSize,
          height: iconSize,
          style: { 
            ...themeIcon.props.style, 
            color: folderColor,
            '--icon-color': folderColor,
            width: `${iconSize}px`,
            height: `${iconSize}px`
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
    } else {
      icon = themeIcons.file;
    }
    
    // Determinar el título según el tipo de nodo
    let title = "Click derecho para más opciones";
    if (isSSH) {
      title += " | Doble click para abrir terminal SSH";
    } else if (isRDP) {
      title += " | Doble click para conectar RDP";
    }
    
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
          }
        }}
        style={{ cursor: 'pointer', fontFamily: explorerFont, alignItems: 'flex-start' }}
        title={title}
      >
        <span style={{ minWidth: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '20px' }}>{icon}</span>
        <span className="node-label" style={{ flex: 1 }}>{node.label}</span>
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
        fontSize: `${explorerFontSize}px`
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
            padding: '8px 2px',
            width: '100%',
            visibility: 'visible',
            opacity: 1,
            zIndex: 1000,
            gap: '8px'
          }}>
            {/* Botón de colapsar */}
            <Button 
              icon={sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'} 
              className="p-button-rounded p-button-text sidebar-action-button" 
              onClick={() => setSidebarCollapsed(v => !v)} 
              tooltip={sidebarCollapsed ? 'Expandir panel lateral' : 'Colapsar panel lateral'} 
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
            
            {/* Botón de nueva conexión */}
            <Button 
              icon="pi pi-desktop" 
              className="p-button-rounded p-button-text sidebar-action-button" 
              onClick={() => setShowUnifiedConnectionDialog && setShowUnifiedConnectionDialog(true)} 
              tooltip="Nueva conexión" 
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
            
            {/* Botón de nuevo grupo */}
            <Button 
              icon="pi pi-th-large" 
              className="p-button-rounded p-button-text sidebar-action-button" 
              onClick={() => setShowCreateGroupDialog(true)} 
              tooltip="Crear grupo de pestañas" 
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
              icon="pi pi-bars"
              className="p-button-rounded p-button-text sidebar-action-button"
              onClick={(e) => {
                console.log('Click en botón del menú detectado');
                handleAppMenuClick(e);
              }}
              tooltip="Menú de la aplicación"
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
            <Button
              icon="pi pi-cog"
              className="p-button-rounded p-button-text sidebar-action-button"
              onClick={() => setShowSettingsDialog(true)}
              tooltip="Configuración"
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
          </div>
        </div>
      ) : (
        // Sidebar completa
        <>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.5rem 0.25rem 0.5rem' }}>
            <Button 
              icon={sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'} 
              className="p-button-rounded p-button-text sidebar-action-button" 
              onClick={() => setSidebarCollapsed(v => !v)} 
              tooltip={sidebarCollapsed ? 'Expandir panel lateral' : 'Colapsar panel lateral'} 
              tooltipOptions={{ position: 'bottom' }} 
              style={{ marginRight: 8 }} 
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <Button 
                icon="pi pi-desktop" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={() => setShowUnifiedConnectionDialog && setShowUnifiedConnectionDialog(true)} 
                tooltip="Nueva conexión" 
                tooltipOptions={{ position: 'bottom' }} 
              />
              <Button 
                icon="pi pi-plus" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={() => setShowFolderDialog(true)} 
                tooltip="Crear carpeta" 
                tooltipOptions={{ position: 'bottom' }} 
              />
              <Button 
                icon="pi pi-th-large" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={() => setShowCreateGroupDialog(true)} 
                tooltip="Crear grupo de pestañas" 
                tooltipOptions={{ position: 'bottom' }} 
              />
            </div>
          </div>
          <Divider className="my-2" />
          
          <div 
            style={{ 
              flex: 1, 
              minHeight: 0, 
              overflowY: 'auto', 
              overflowX: 'hidden',
              position: 'relative',
              fontSize: `${explorerFontSize}px`
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
                key={`tree-${iconTheme}-${explorerFontSize}`} // Forzar re-render cuando cambie el tema
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
                className="sidebar-tree"
                style={{ 
                  fontSize: `${explorerFontSize}px`,
                  '--icon-size': `${iconSize}px`
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
          />
        </>
      )}

      <FolderDialog
        visible={showFolderDialog}
        onHide={() => {
          setShowFolderDialog(false);
          setFolderName('');
          setFolderColor(getThemeDefaultColor(iconTheme));
          setEditingNode(null); // Limpiar estado de edición al cerrar
        }}
        mode={editingNode ? "edit" : "new"}
        folderName={folderName}
        setFolderName={setFolderName}
        folderColor={folderColor}
        setFolderColor={setFolderColor}
        onConfirm={createNewFolder}
        themeDefaultColor={getThemeDefaultColor(iconTheme)}
        themeName={iconThemes[iconTheme]?.name || 'Material'}
      />
      <UnifiedConnectionDialog
        visible={showUnifiedConnectionDialog}
        onHide={() => {
          setShowUnifiedConnectionDialog(false);
        }}

        foldersOptions={getAllFoldersToUse(nodes)}

        sshLoading={false}
        // Props RDP
        rdpNodeData={rdpNodeData}
        onSaveToSidebar={handleSaveRdpToSidebar}
        editingNode={editingRdpNode}
        // Props para modo edición
        isEditMode={!!(editSSHNode || editingRdpNode)}
        editConnectionType={editSSHNode ? 'ssh' : (editingRdpNode ? 'rdp' : null)}
        editNodeData={editSSHNode || editingRdpNode}
        // Props SSH
        sshName={editSSHNode ? editSSHName : sshName}
        setSSHName={editSSHNode ? setEditSSHName : setSSHName}
        sshHost={editSSHNode ? editSSHHost : sshHost}
        setSSHHost={editSSHNode ? setEditSSHHost : setSSHHost}
        sshUser={editSSHNode ? editSSHUser : sshUser}
        setSSHUser={editSSHNode ? setEditSSHUser : setSSHUser}
        sshPassword={editSSHNode ? editSSHPassword : sshPassword}
        setSSHPassword={editSSHNode ? setEditSSHPassword : setSSHPassword}
        sshPort={editSSHNode ? editSSHPort : sshPort}
        setSSHPort={editSSHNode ? setEditSSHPort : setSSHPort}
        sshRemoteFolder={editSSHNode ? editSSHRemoteFolder : sshRemoteFolder}
        setSSHRemoteFolder={editSSHNode ? setEditSSHRemoteFolder : setSSHRemoteFolder}
        sshTargetFolder={sshTargetFolder}
        setSSHTargetFolder={setSSHTargetFolder}
        onSSHConfirm={editSSHNode ? saveEditSSH : createNewSSH}
      />
      
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