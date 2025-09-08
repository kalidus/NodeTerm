import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Tree } from 'primereact/tree';
import { Divider } from 'primereact/divider';
import SidebarFooter from './SidebarFooter';
import { uiThemes } from '../themes/ui-themes';
import { FolderDialog, UnifiedConnectionDialog } from './Dialogs';
import { iconThemes } from '../themes/icon-themes';
import ImportDialog from './ImportDialog';
import { toggleFavorite as toggleFavoriteConn, helpers as connHelpers, isFavorite as isFavoriteConn } from '../utils/connectionStore';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';
import { STORAGE_KEYS } from '../utils/constants';

// Helper para loggear setNodes
function logSetNodes(source, nodes) {
  // Log de debug removido para limpiar la consola
      // Log de trace removido para limpiar la consola
  return nodes;
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
  console.log('Sidebar renderizado - Versión con menú Archivo actualizada');
  
  // Estado para diálogos
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showUnifiedConnectionDialog, setShowUnifiedConnectionDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [parentNodeKey, setParentNodeKey] = useState(null);
  const [editingNode, setEditingNode] = useState(null); // Para saber si estamos editando un nodo existente
  
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

      // Helpers de deduplicación
      // Normalización para campos exactos (hosts/puertos/usuarios)
      const normalizeExact = (v) => (v || '').toString().trim().toLowerCase();
      // Normalización robusta para etiquetas de carpetas (ignora acentos, múltiples espacios y signos)
      const normalizeLabel = (v) => {
        const s = (v || '').toString();
        return s
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ') // cualquier separador lo tratamos como espacio
          .replace(/\s+/g, ' ') // colapsar espacios
          .trim();
      };
      const makeConnKey = (node) => {
        if (!node || !node.data) return null;
        if (node.data.type === 'ssh') {
          return `ssh|${normalizeExact(node.data.host)}|${normalizeExact(node.data.port)}|${normalizeExact(node.data.user)}`;
        }
        if (node.data.type === 'rdp') {
          return `rdp|${normalizeExact(node.data.server)}|${normalizeExact(node.data.port)}|${normalizeExact(node.data.username)}`;
        }
        return null;
      };
      // Considerar carpeta si es droppable o tiene hijos (mayor tolerancia)
      const isFolder = (n) => !!(n && (n.droppable === true || Array.isArray(n.children)) && !(n.data && (n.data.type === 'ssh' || n.data.type === 'rdp')));
      const isConnection = (n) => n && n.data && (n.data.type === 'ssh' || n.data.type === 'rdp');

      // Fusionar arrays de hijos en destinoFolder: añade solo no duplicados y fusiona carpetas por nombre
      const mergeChildren = (destChildren, incomingChildren) => {
        const result = Array.isArray(destChildren) ? [...destChildren] : [];

        // Índices para búsqueda rápida
        const folderByName = new Map();
        const connKeys = new Set();

        for (const child of result) {
          if (isFolder(child)) {
            folderByName.set(normalizeLabel(child.label), child);
          } else if (isConnection(child)) {
            const key = makeConnKey(child);
            if (key) connKeys.add(key);
          }
        }

        let addedConnections = 0;
        let addedFolders = 0;

        const appendUnique = (node) => {
          if (isFolder(node)) {
            const existing = folderByName.get(normalizeLabel(node.label));
            if (existing) {
              // fusionar recursivamente hijos
              const mergeResult = mergeChildren(existing.children || [], node.children || []);
              existing.children = mergeResult.children;
              addedConnections += mergeResult.addedConnections;
              addedFolders += mergeResult.addedFolders;
            } else {
              // carpeta nueva completa
              result.push(node);
              folderByName.set(normalizeLabel(node.label), node);
              addedFolders += 1;
              // además, contar elementos añadidos recursivamente dentro para métricas
              const countInside = (arr) => {
                let c = 0;
                for (const it of arr || []) {
                  if (isConnection(it)) c += 1;
                  if (isFolder(it)) c += countInside(it.children);
                }
                return c;
              };
              addedConnections += countInside(node.children || []);
            }
          } else if (isConnection(node)) {
            const key = makeConnKey(node);
            if (key && !connKeys.has(key)) {
              result.push(node);
              connKeys.add(key);
              addedConnections += 1;
            }
          } else {
            // otro tipo de nodo: añadir sin dedupe
            result.push(node);
          }
        };

        for (const inc of incomingChildren || []) {
          appendUnique(inc);
        }

        return { children: result, addedConnections, addedFolders };
      };

      // Estructura con carpetas
      if (importResult.structure && Array.isArray(importResult.structure.nodes) && importResult.structure.nodes.length > 0) {
        // Regenerar keys por seguridad
        const toAdd = (importResult.structure.nodes || []).map((n, idx) => ({
          ...n,
          key: n.key || `folder_${Date.now()}_${idx}_${Math.floor(Math.random()*1e6)}`,
          uid: n.uid || `folder_${Date.now()}_${idx}_${Math.floor(Math.random()*1e6)}`
        }));

        const createContainerFolder = !!importResult.createContainerFolder;
        const containerLabel = importResult.containerFolderName || `mRemoteNG imported - ${new Date().toLocaleDateString()}`;
        const overwrite = !!importResult.overwrite;
        const nodesCopy = deepCopy(nodes || []);
        let addedConnections = 0;
        let addedFolders = 0;
        if (createContainerFolder) {
          if (overwrite) {
            // buscar contenedor existente por nombre para fusionar, si no, crear y fusionar
            const idx = nodesCopy.findIndex(n => isFolder(n) && normalizeLabel(n.label) === normalizeLabel(containerLabel));
            if (idx !== -1) {
              const container = nodesCopy[idx];
              const mergeResult = mergeChildren(container.children || [], toAdd);
              container.children = mergeResult.children;
              addedConnections += mergeResult.addedConnections;
              addedFolders += mergeResult.addedFolders;
            } else {
              const containerKey = `import_container_${Date.now()}`;
              const mergeResult = mergeChildren([], toAdd);
              nodesCopy.push({
                key: containerKey,
                uid: containerKey,
                label: containerLabel,
                droppable: true,
                children: mergeResult.children,
                createdAt: new Date().toISOString(),
                isUserCreated: true,
                imported: true,
                importedFrom: 'mRemoteNG'
              });
              addedConnections += mergeResult.addedConnections;
              addedFolders += mergeResult.addedFolders;
            }
          } else {
            // no overwrite: crear SIEMPRE una nueva carpeta contenedora y añadir tal cual
            const containerKey = `import_container_${Date.now()}`;
            nodesCopy.push({
              key: containerKey,
              uid: containerKey,
              label: containerLabel,
              droppable: true,
              children: toAdd,
              createdAt: new Date().toISOString(),
              isUserCreated: true,
              imported: true,
              importedFrom: 'mRemoteNG'
            });
            // métricas simples
            const countInside = (arr) => {
              let folders = 0, conns = 0;
              for (const it of arr || []) {
                if (isFolder(it)) { folders += 1; const r = countInside(it.children); folders += r.folders; conns += r.conns; }
                else if (isConnection(it)) conns += 1;
              }
              return { folders, conns };
            };
            const r = countInside(toAdd);
            addedConnections += r.conns;
            addedFolders += r.folders;
          }
        } else {
          if (overwrite) {
            // raíz: fusionar por nombre de carpeta al nivel root
            const mergeResult = mergeChildren(nodesCopy, toAdd);
            nodesCopy.length = 0;
            nodesCopy.push(...mergeResult.children);
            addedConnections += mergeResult.addedConnections;
            addedFolders += mergeResult.addedFolders;
          } else {
            // raíz sin overwrite: añadir tal cual
            nodesCopy.push(...toAdd);
            const countInside = (arr) => {
              let folders = 0, conns = 0;
              for (const it of arr || []) {
                if (isFolder(it)) { folders += 1; const r = countInside(it.children); folders += r.folders; conns += r.conns; }
                else if (isConnection(it)) conns += 1;
              }
              return { folders, conns };
            };
            const r = countInside(toAdd);
            addedConnections += r.conns;
            addedFolders += r.folders;
          }
        }

        setNodes(() => logSetNodes('Sidebar-Import-Structured', nodesCopy));

        showToast && showToast({
          severity: 'success',
          summary: 'Importación exitosa',
          detail: `Añadidas ${addedConnections} conexiones y ${addedFolders} carpetas (sin duplicados)`,
          life: 5000
        });
        return;
      }

      // Compatibilidad: lista plana
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

      const createContainerFolder = !!importResult.createContainerFolder;
      const containerLabel = importResult.containerFolderName || `mRemoteNG imported - ${new Date().toLocaleDateString()}`;
      const overwrite = !!importResult.overwrite;
      const nodesCopy = deepCopy(nodes || []);
      let addedConnections = 0;

      if (createContainerFolder) {
        // Fusionar dentro del contenedor (crear si no existe por nombre)
        const idx = nodesCopy.findIndex(n => isFolder(n) && normalizeLabel(n.label) === normalizeLabel(containerLabel));
        if (overwrite) {
          const existingChildren = idx !== -1 ? (nodesCopy[idx].children || []) : [];
          const mergeResult = mergeChildren(existingChildren, importedConnections);
          if (idx !== -1) nodesCopy[idx].children = mergeResult.children; else {
            const containerKey = `import_container_${Date.now()}`;
            nodesCopy.push({ key: containerKey, uid: containerKey, label: containerLabel, droppable: true, children: mergeResult.children, createdAt: new Date().toISOString(), isUserCreated: true, imported: true, importedFrom: 'mRemoteNG' });
          }
          addedConnections += mergeResult.addedConnections;
        } else {
          const childrenToAdd = importedConnections;
          if (idx !== -1) nodesCopy[idx].children = (nodesCopy[idx].children || []).concat(childrenToAdd); else {
            const containerKey = `import_container_${Date.now()}`;
            nodesCopy.push({ key: containerKey, uid: containerKey, label: containerLabel, droppable: true, children: childrenToAdd, createdAt: new Date().toISOString(), isUserCreated: true, imported: true, importedFrom: 'mRemoteNG' });
          }
          addedConnections += childrenToAdd.length;
        }
      } else {
        // raíz: colocar dentro de carpeta nueva etiquetada, pero fusionando si ya existe carpeta con ese nombre
        const rootFolderLabel = `Importadas de mRemoteNG (${new Date().toLocaleDateString()})`;
        const idx = nodesCopy.findIndex(n => isFolder(n) && normalizeLabel(n.label) === normalizeLabel(rootFolderLabel));
        if (overwrite) {
          if (idx !== -1) {
            const mergeResult = mergeChildren(nodesCopy[idx].children || [], importedConnections);
            nodesCopy[idx].children = mergeResult.children;
            addedConnections += mergeResult.addedConnections;
          } else {
            const importFolderKey = `imported_folder_${Date.now()}`;
            const mergeResult = mergeChildren([], importedConnections);
            nodesCopy.push({ key: importFolderKey, label: rootFolderLabel, droppable: true, children: mergeResult.children, uid: importFolderKey, createdAt: new Date().toISOString(), isUserCreated: true, imported: true, importedFrom: 'mRemoteNG' });
            addedConnections += mergeResult.addedConnections;
          }
        } else {
          // siempre crear nueva carpeta raíz para esta importación
          const importFolderKey = `imported_folder_${Date.now()}`;
          nodesCopy.push({ key: importFolderKey, label: rootFolderLabel, droppable: true, children: importedConnections, uid: importFolderKey, createdAt: new Date().toISOString(), isUserCreated: true, imported: true, importedFrom: 'mRemoteNG' });
          addedConnections += importedConnections.length;
        }
      }

      setNodes(() => logSetNodes('Sidebar-Import', nodesCopy));

      showToast && showToast({
        severity: 'success',
        summary: 'Importación exitosa',
        detail: `Añadidas ${addedConnections} conexiones (sin duplicados)`,
        life: 5000
      });

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
  // Crear nueva carpeta o editar existente
  const createNewFolder = () => {
    if (!folderName.trim()) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'El nombre de carpeta no puede estar vacío', life: 3000 });
      return;
    }
    
    const nodesCopy = deepCopy(nodes);
    
    if (editingNode) {
      // Modo edición: actualizar carpeta existente
      const updateNodeInTree = (nodes, targetKey, newLabel) => {
        return nodes.map(node => {
          if (node.key === targetKey) {
            return { ...node, label: newLabel };
          }
          if (node.children) {
            return { ...node, children: updateNodeInTree(node.children, targetKey, newLabel) };
          }
          return node;
        });
      };
      const updatedNodes = updateNodeInTree(nodesCopy, editingNode.key, folderName.trim());
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
        isUserCreated: true
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
    setParentNodeKey(null);
    setEditingNode(null);
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

        editFolder: (node) => {
          // Cargar datos de la carpeta para editar
          setFolderName(node.label);
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
                  console.log('🎯 Nodo encontrado y eliminado:', node.label);
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
      icon = themeIcons.ssh;
    } else if (isRDP) {
      icon = themeIcons.rdp || '🖥️'; // Icono RDP o fallback
    } else if (isFolder) {
      icon = options.expanded ? themeIcons.folderOpen : themeIcons.folder;
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
        style={{ cursor: 'pointer', fontFamily: explorerFont }}
        title={title}
      >
        <span style={{ minWidth: 16 }}>{icon}</span>
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
                backgroundColor: colors?.sidebarBackground || '#333',
                color: colors?.sidebarText || '#fff',
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
                backgroundColor: colors?.sidebarBackground || '#333',
                color: colors?.sidebarText || '#fff',
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
                backgroundColor: colors?.sidebarBackground || '#333',
                color: colors?.sidebarText || '#fff',
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
                backgroundColor: colors?.sidebarBackground || '#333',
                color: colors?.sidebarText || '#fff',
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
                backgroundColor: colors?.sidebarBackground || '#333',
                color: colors?.sidebarText || '#fff',
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
                style={{ fontSize: `${explorerFontSize}px` }}
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
          setEditingNode(null); // Limpiar estado de edición al cerrar
        }}
        mode={editingNode ? "edit" : "new"}
        folderName={folderName}
        setFolderName={setFolderName}
        onConfirm={createNewFolder}
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