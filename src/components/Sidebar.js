import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Tree } from 'primereact/tree';
import { Divider } from 'primereact/divider';
import SidebarFooter from './SidebarFooter';
import { uiThemes } from '../themes/ui-themes';
import { FolderDialog, UnifiedConnectionDialog } from './Dialogs';
import { iconThemes } from '../themes/icon-themes';
import { toggleFavorite as toggleFavoriteConn, helpers as connHelpers, isFavorite as isFavoriteConn } from '../utils/connectionStore';
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
  // Estado para diálogos
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showUnifiedConnectionDialog, setShowUnifiedConnectionDialog] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [parentNodeKey, setParentNodeKey] = useState(null);
  const [editingNode, setEditingNode] = useState(null); // Para saber si estamos editando un nodo existente
  
  // Ref para el contenedor de la sidebar
  const sidebarRef = useRef(null);
  
  // Función para manejar el menú de aplicación (extraída del SidebarFooter)
  const handleAppMenuClick = (event) => {
    // Estructura del menú con submenús
    const menuStructure = [
      {
        label: 'Ver',
        icon: 'pi pi-eye',
        submenu: [
          {
            label: 'Recargar',
            icon: 'pi pi-refresh',
            shortcut: 'Ctrl+R',
            command: () => window.electronAPI.reload()
          },
          {
            label: 'Forzar recarga',
            icon: 'pi pi-replay',
            shortcut: 'Ctrl+Shift+R',
            command: () => window.electronAPI.forceReload()
          },
          { separator: true },
          {
            label: 'Herramientas de desarrollo',
            icon: 'pi pi-wrench',
            shortcut: 'F12',
            command: () => window.electronAPI.toggleDevTools()
          },
          { separator: true },
          {
            label: 'Acercar',
            icon: 'pi pi-search-plus',
            shortcut: 'Ctrl++',
            command: () => window.electronAPI.zoomIn()
          },
          {
            label: 'Alejar',
            icon: 'pi pi-search-minus',
            shortcut: 'Ctrl+-',
            command: () => window.electronAPI.zoomOut()
          },
          {
            label: 'Tamaño real',
            icon: 'pi pi-expand',
            shortcut: 'Ctrl+0',
            command: () => window.electronAPI.actualSize()
          },
          { separator: true },
          {
            label: 'Pantalla completa',
            icon: 'pi pi-window-maximize',
            shortcut: 'F11',
            command: () => window.electronAPI.toggleFullscreen()
          }
        ]
      },
      { separator: true },
      {
        label: 'Acerca de NodeTerm',
        icon: 'pi pi-info-circle',
        command: () => {
          window.electronAPI.getVersionInfo().then(versionInfo => {
            // Crear overlay de fondo
            const overlay = document.createElement('div');
            overlay.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.5);
              z-index: 10000;
              display: flex;
              align-items: center;
              justify-content: center;
            `;
            
            const aboutDialog = document.createElement('div');
            aboutDialog.style.cssText = `
              background: var(--ui-sidebar-bg);
              border: 1px solid var(--ui-sidebar-border);
              border-radius: 8px;
              padding: 24px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
              min-width: 350px;
              max-width: 500px;
              color: var(--ui-text-primary);
              font-family: var(--font-family);
            `;
            
            aboutDialog.innerHTML = `
              <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; text-align: center;">${versionInfo.appName}</h3>
              <div style="margin: 16px 0;">
                <p style="margin: 8px 0; font-size: 14px;"><strong>Versión:</strong> ${versionInfo.appVersion}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Electron:</strong> ${versionInfo.electronVersion}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Node.js:</strong> ${versionInfo.nodeVersion}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Chrome:</strong> ${versionInfo.chromeVersion}</p>
              </div>
              <div style="margin-top: 20px; text-align: center;">
                <button id="closeAboutDialog" style="
                  background: var(--primary-color, #007ad9);
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 14px;
                  min-width: 80px;
                ">Cerrar</button>
              </div>
            `;
            
            overlay.appendChild(aboutDialog);
            document.body.appendChild(overlay);
            
            // Eventos para cerrar el diálogo
            const closeDialog = () => {
              if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
              }
            };
            
            document.getElementById('closeAboutDialog').addEventListener('click', closeDialog);
            overlay.addEventListener('click', (e) => {
              if (e.target === overlay) {
                closeDialog();
              }
            });
            
            // Cerrar con ESC
            const handleEsc = (e) => {
              if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEsc);
              }
            };
            document.addEventListener('keydown', handleEsc);
          }).catch(error => {
            console.error('Error obteniendo información de versión:', error);
          });
        }
      },
      { separator: true },
      {
        label: 'Salir',
        icon: 'pi pi-sign-out',
        shortcut: 'Ctrl+Q',
        command: () => {
          if (window.confirm('¿Estás seguro de que quieres salir de NodeTerm?')) {
            window.electronAPI.quitApp();
          }
        }
      }
    ];
    
    // Remover menú existente si está abierto
    const existingMenu = document.querySelector('.app-context-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    
    // Variables globales para el menú
    let activeSubmenu = null;
    let submenuTimer = null;
    
    // Función para cerrar submenú con delay
    const scheduleSubmenuClose = () => {
      if (submenuTimer) clearTimeout(submenuTimer);
      submenuTimer = setTimeout(() => {
        if (activeSubmenu && document.body.contains(activeSubmenu)) {
          document.body.removeChild(activeSubmenu);
          activeSubmenu = null;
        }
      }, 500);
    };
    
    // Función para cancelar el cierre
    const cancelSubmenuClose = () => {
      if (submenuTimer) {
        clearTimeout(submenuTimer);
        submenuTimer = null;
      }
    };
    
    // Crear el menú contextual principal
    const contextMenu = document.createElement('div');
    contextMenu.className = 'app-context-menu';
    contextMenu.style.cssText = `
      position: fixed;
      background: var(--ui-sidebar-bg);
      border: 1px solid var(--ui-sidebar-border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      min-width: 220px;
      padding: 4px 0;
      font-family: var(--font-family);
      font-size: 14px;
    `;
    
    const createMenuItem = (item, isSubmenu = false) => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.style.cssText = `
          height: 1px;
          background: var(--ui-sidebar-border);
          margin: 4px 8px;
        `;
        return separator;
      }
      
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.style.cssText = `
        padding: ${isSubmenu ? '8px 20px' : '10px 16px'};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--ui-sidebar-text, #fff);
        transition: background-color 0.15s ease;
        position: relative;
      `;
      
      const leftContent = document.createElement('div');
      leftContent.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
      `;
      
      leftContent.innerHTML = `
        <i class="${item.icon}" style="width: 16px; font-size: 14px;"></i>
        <span>${item.label}</span>
      `;
      
      menuItem.appendChild(leftContent);
      
      // Agregar shortcut si existe
      if (item.shortcut) {
        const shortcut = document.createElement('span');
        shortcut.style.cssText = `
          font-size: 12px;
          color: var(--ui-sidebar-text, #fff);
          margin-left: 20px;
        `;
        shortcut.textContent = item.shortcut;
        menuItem.appendChild(shortcut);
      }
      
      // Agregar flecha para submenús
      if (item.submenu) {
        const arrow = document.createElement('i');
        arrow.className = 'pi pi-angle-right';
        arrow.style.cssText = `
          font-size: 12px;
          margin-left: 10px;
        `;
        menuItem.appendChild(arrow);
      }
      
      // Eventos para elementos con submenú
      if (item.submenu) {
        menuItem.addEventListener('mouseenter', () => {
          cancelSubmenuClose();
          menuItem.style.backgroundColor = 'var(--ui-hover-bg, rgba(255, 255, 255, 0.1))';
          
          // Limpiar submenú anterior
          if (activeSubmenu && document.body.contains(activeSubmenu)) {
            document.body.removeChild(activeSubmenu);
          }
          
          // Crear nuevo submenú
          activeSubmenu = document.createElement('div');
          activeSubmenu.className = 'app-submenu';
          activeSubmenu.style.cssText = `
            position: fixed;
            background: var(--ui-sidebar-bg);
            border: 1px solid var(--ui-sidebar-border);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            min-width: 200px;
            padding: 4px 0;
            font-family: var(--font-family);
            font-size: 14px;
          `;
          
          // Agregar eventos al submenú ANTES de agregar items
          activeSubmenu.addEventListener('mouseenter', cancelSubmenuClose);
          activeSubmenu.addEventListener('mouseleave', scheduleSubmenuClose);
          
          item.submenu.forEach(subItem => {
            const subMenuItem = createMenuItem(subItem, true);
            activeSubmenu.appendChild(subMenuItem);
          });
          
          document.body.appendChild(activeSubmenu);
          
          // Posicionar submenú
          setTimeout(() => {
            const menuRect = menuItem.getBoundingClientRect();
            const submenuRect = activeSubmenu.getBoundingClientRect();
            
            let left = menuRect.right - 1;
            let top = menuRect.top;
            
            // Ajustar si se sale de la pantalla
            if (left + submenuRect.width > window.innerWidth) {
              left = menuRect.left - submenuRect.width + 1;
            }
            if (top + submenuRect.height > window.innerHeight) {
              top = window.innerHeight - submenuRect.height - 8;
            }
            
            activeSubmenu.style.left = `${left}px`;
            activeSubmenu.style.top = `${top}px`;
          }, 5);
        });
        
        menuItem.addEventListener('mouseleave', scheduleSubmenuClose);
      } else {
        // Eventos para elementos normales
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.backgroundColor = 'var(--ui-hover-bg, rgba(255, 255, 255, 0.1))';
        });
        
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.backgroundColor = 'transparent';
        });
      }
      
      if (item.command) {
        menuItem.addEventListener('click', () => {
          item.command();
          // Cerrar todo
          if (submenuTimer) clearTimeout(submenuTimer);
          if (activeSubmenu && document.body.contains(activeSubmenu)) {
            document.body.removeChild(activeSubmenu);
          }
          const allMenus = document.querySelectorAll('.app-context-menu');
          allMenus.forEach(menu => {
            if (document.body.contains(menu)) {
              document.body.removeChild(menu);
            }
          });
        });
      }
      
      return menuItem;
    };
    
    menuStructure.forEach(item => {
      const menuItem = createMenuItem(item);
      contextMenu.appendChild(menuItem);
    });
    
    document.body.appendChild(contextMenu);
    
    // Posicionar el menú principal
    setTimeout(() => {
      const rect = event.target.closest('button').getBoundingClientRect();
      const menuRect = contextMenu.getBoundingClientRect();
      
      let left = rect.left;
      let top = rect.top - menuRect.height - 8;
      
      // Ajustar si se sale de la pantalla
      if (left + menuRect.width > window.innerWidth) {
        left = window.innerWidth - menuRect.width - 8;
      }
      if (top < 8) {
        top = rect.bottom + 8;
      }
      
      contextMenu.style.left = `${left}px`;
      contextMenu.style.top = `${top}px`;
    }, 10);
    
    // Cerrar el menú al hacer clic fuera
    const closeMenu = (e) => {
      const button = event.target.closest('button');
      const menu = document.querySelector('.app-context-menu');
      const submenu = document.querySelector('.app-submenu');
      const isClickOnButton = button && button.contains(e.target);
      const isClickOnMenu = menu && menu.contains(e.target);
      const isClickOnSubmenu = submenu && submenu.contains(e.target);
      
      if (!isClickOnButton && !isClickOnMenu && !isClickOnSubmenu) {
        if (submenuTimer) clearTimeout(submenuTimer);
        if (activeSubmenu && document.body.contains(activeSubmenu)) {
          document.body.removeChild(activeSubmenu);
        }
        const allMenus = document.querySelectorAll('.app-context-menu');
        allMenus.forEach(menu => {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
        });
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
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
          // Confirmar eliminación y proceder
          if (window.confirm(`¿Estás seguro de que quieres eliminar "${nodeLabel}"?`)) {
            const removeNodeFromTree = (nodes, targetKey) => {
              return nodes.filter(node => {
                if (node.key === targetKey) {
                  return false; // Eliminar este nodo
                }
                if (node.children) {
                  node.children = removeNodeFromTree(node.children, targetKey);
                }
                return true;
              });
            };
            const newNodes = removeNodeFromTree(deepCopy(nodes), nodeKey);
            setNodes(() => logSetNodes('Sidebar', newNodes));
            showToast && showToast({ 
              severity: 'success', 
              summary: 'Eliminado', 
              detail: `"${nodeLabel}" ha sido eliminado`, 
              life: 3000 
            });
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
              onClick={handleAppMenuClick}
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
    </div>
  );
});

export default Sidebar; 