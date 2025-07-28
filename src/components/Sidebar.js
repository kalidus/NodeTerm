import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Tree } from 'primereact/tree';
import { Divider } from 'primereact/divider';
import SidebarFooter from './SidebarFooter';
import { uiThemes } from '../themes/ui-themes';
import { SSHDialog, FolderDialog } from './Dialogs';
import { iconThemes } from '../themes/icon-themes';

// Helper para loggear setNodes
function logSetNodes(source, nodes) {
  // Log de debug removido para limpiar la consola
      // Log de trace removido para limpiar la consola
  return nodes;
}

const Sidebar = ({
  nodes,
  setNodes,
  sidebarCollapsed,
  setSidebarCollapsed,
  allExpanded,
  toggleExpandAll,
  setShowCreateGroupDialog,
  setShowSettingsDialog,
  setShowRdpManager, // Nuevo prop para RDP Manager
  iconTheme,
  explorerFont,
  explorerFontSize = 14,
  uiTheme = 'Light',
  showToast, // callback opcional para mostrar toast global
  onOpenSSHConnection, // nuevo prop para doble click en SSH
  onNodeContextMenu, // handler del menú contextual de nodos
  onTreeAreaContextMenu, // handler del menú contextual del área del árbol
  sidebarCallbacksRef // ref para registrar callbacks del menú contextual
}) => {
  // --- Estado y lógica movidos aquí ---
  const STORAGE_KEY = 'basicapp2_tree_data';
  const EXPANDED_KEYS_STORAGE_KEY = 'basicapp2_sidebar_expanded_keys';
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState(() => {
    const saved = localStorage.getItem(EXPANDED_KEYS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  // Estado para diálogos
  const [showSSHDialog, setShowSSHDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [sshName, setSSHName] = useState('');
  const [sshHost, setSSHHost] = useState('');
  const [sshUser, setSSHUser] = useState('');
  const [sshPassword, setSSHPassword] = useState('');
  const [sshPort, setSSHPort] = useState(22);
  const [sshRemoteFolder, setSSHRemoteFolder] = useState('');
  const [sshTargetFolder, setSSHTargetFolder] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [parentNodeKey, setParentNodeKey] = useState(null);
  const [editingNode, setEditingNode] = useState(null); // Para saber si estamos editando un nodo existente
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
  // Función para obtener todas las carpetas
  const getAllFolders = (nodes, prefix = '') => {
    let folders = [];
    for (const node of nodes) {
      if (node.droppable) {
        folders.push({ label: prefix + node.label, value: node.key });
        if (node.children && node.children.length > 0) {
          folders = folders.concat(getAllFolders(node.children, prefix + node.label + ' / '));
        }
      }
    }
    return folders;
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
  // Crear nueva conexión SSH o editar existente
  const createNewSSH = () => {
    if (!sshName.trim() || !sshHost.trim() || !sshUser.trim() || !sshPassword.trim()) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'Todos los campos son obligatorios', life: 3000 });
      return;
    }
    
    const nodesCopy = deepCopy(nodes);
    
    if (editingNode) {
      // Modo edición: actualizar conexión SSH existente
      const updateSSHInTree = (nodes, targetKey, newData) => {
        return nodes.map(node => {
          if (node.key === targetKey) {
            return { 
              ...node, 
              label: newData.label,
              data: { ...node.data, ...newData.data }
            };
          }
          if (node.children) {
            return { ...node, children: updateSSHInTree(node.children, targetKey, newData) };
          }
          return node;
        });
      };
      
      const updatedData = {
        label: sshName.trim(),
        data: {
          host: sshHost.trim(),
          user: sshUser.trim(),
          password: sshPassword.trim(),
          remoteFolder: sshRemoteFolder.trim(),
          port: sshPort,
          type: 'ssh'
        }
      };
      
      const updatedNodes = updateSSHInTree(nodesCopy, editingNode.key, updatedData);
      setNodes(() => logSetNodes('Sidebar', updatedNodes));
      showToast && showToast({ severity: 'success', summary: 'Éxito', detail: `Conexión SSH "${sshName}" actualizada`, life: 3000 });
    } else {
      // Modo creación: crear nueva conexión SSH
      const newKey = `node_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const newSSHNode = {
        key: newKey,
        label: sshName.trim(),
        data: {
          host: sshHost.trim(),
          user: sshUser.trim(),
          password: sshPassword.trim(),
          remoteFolder: sshRemoteFolder.trim(),
          port: sshPort,
          type: 'ssh'
        },
        draggable: true,
        droppable: false,
        uid: newKey,
        createdAt: new Date().toISOString(),
        isUserCreated: true
      };
      
      if (sshTargetFolder) {
        const parentNode = findNodeByKey(nodesCopy, sshTargetFolder);
        if (parentNode) {
          parentNode.children = parentNode.children || [];
          parentNode.children.unshift(newSSHNode);
        } else {
          nodesCopy.push(newSSHNode);
        }
      } else {
        nodesCopy.unshift(newSSHNode);
      }
      setNodes(() => logSetNodes('Sidebar', nodesCopy));
      showToast && showToast({ severity: 'success', summary: 'SSH añadida', detail: `Conexión SSH "${sshName}" añadida al árbol`, life: 3000 });
    }
    
    // Limpiar formulario
    setShowSSHDialog(false);
    setSSHName(''); setSSHHost(''); setSSHUser(''); setSSHTargetFolder(null); setSSHPassword(''); setSSHRemoteFolder(''); setSSHPort(22);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    }
  }, [nodes]);
  useEffect(() => {
    localStorage.setItem(EXPANDED_KEYS_STORAGE_KEY, JSON.stringify(expandedKeys));
  }, [expandedKeys]);

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
        createSSH: () => {
          setShowSSHDialog(true);
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
          // Cargar datos del nodo SSH en el formulario para editar
          setSSHName(node.label);
          setSSHHost(node.data.host);
          setSSHUser(node.data.user);
          setSSHPassword(node.data.password);
          setSSHPort(node.data.port || 22);
          setSSHRemoteFolder(node.data.remoteFolder || '');
          // Encontrar la carpeta padre para el dropdown
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
          setSSHTargetFolder(parentKey);
          setEditingNode(node); // Estado para saber que estamos editando
          setShowSSHDialog(true);
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
  }, [nodes, setShowFolderDialog, setShowSSHDialog, deepCopy, findNodeByKey, showToast, 
      setSSHName, setSSHHost, setSSHUser, setSSHPassword, setSSHPort, setSSHRemoteFolder, setSSHTargetFolder, setEditingNode,
      setFolderName, setParentNodeKey, setNodes]);



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
            onOpenSSHConnection(node);
          } else if (isRDP && sidebarCallbacksRef?.current?.connectRDP) {
            sidebarCallbacksRef.current.connectRDP(node);
          }
        }}
        style={{ cursor: 'pointer', fontFamily: explorerFont }}
        title={title}
      >
        <span style={{ minWidth: 16 }}>{icon}</span>
        <span className="node-label">{node.label}</span>
      </div>
    );
  };
  return (
    <div 
      className="sidebar-container"
      style={{
        transition: sidebarCollapsed ? 'max-width 0.2s, min-width 0.2s, width 0.2s' : 'width 0.2s',
        width: sidebarCollapsed ? 44 : undefined,
        minWidth: sidebarCollapsed ? 44 : 240,
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
        // Iconos alineados arriba, más juntos y barra más fina
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'flex-start', 
          gap: '0.25rem', 
          width: '100%', 
          paddingTop: 2, 
          position: 'relative' 
        }}>
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
              backgroundColor: colors.sidebarBackground,
              color: colors.sidebarText,
              border: 'none'
            }} 
          />
          <Button 
            icon="pi pi-server" 
            className="p-button-rounded p-button-text sidebar-action-button" 
            onClick={() => setShowSSHDialog(true)} 
            tooltip="Nueva conexión SSH" 
            tooltipOptions={{ position: 'right' }} 
            style={{ 
              margin: 0, 
              width: 40, 
              height: 40, 
              minWidth: 40, 
              minHeight: 40, 
              fontSize: 18,
              backgroundColor: colors.sidebarBackground,
              color: colors.sidebarText,
              border: 'none'
            }} 
          />
          <Button 
            icon="pi pi-desktop" 
            className="p-button-rounded p-button-text sidebar-action-button" 
            onClick={() => setShowRdpManager && setShowRdpManager(true)} 
            tooltip="Gestor de conexiones RDP" 
            tooltipOptions={{ position: 'right' }} 
            style={{ 
              margin: 0, 
              width: 40, 
              height: 40, 
              minWidth: 40, 
              minHeight: 40, 
              fontSize: 18,
              backgroundColor: colors.sidebarBackground,
              color: colors.sidebarText,
              border: 'none'
            }} 
          />
          {/* Ocultar el botón de crear carpeta cuando la sidebar está colapsada */}
          {!sidebarCollapsed && (
            <Button 
              icon="pi pi-plus" 
              className="p-button-rounded p-button-text sidebar-action-button" 
              onClick={() => setShowFolderDialog(true)} 
              tooltip="Crear carpeta" 
              tooltipOptions={{ position: 'right' }} 
              style={{ 
                margin: 0, 
                width: 40, 
                height: 40, 
                minWidth: 40, 
                minHeight: 40, 
                fontSize: 18,
                backgroundColor: colors.sidebarBackground,
                color: colors.sidebarText,
                border: 'none'
              }} 
            />
          )}
          {/* Ocultar el botón de desplegar/plegar todo cuando la sidebar está colapsada */}
          {!sidebarCollapsed && (
            <Button 
              icon={allExpanded ? "pi pi-angle-double-up" : "pi pi-angle-double-down"} 
              className="p-button-rounded p-button-text sidebar-action-button" 
              onClick={toggleExpandAll} 
              tooltip={allExpanded ? "Plegar todo" : "Desplegar todo"} 
              tooltipOptions={{ position: 'right' }} 
              style={{ 
                margin: 0, 
                width: 40, 
                height: 40, 
                minWidth: 40, 
                minHeight: 40, 
                fontSize: 18,
                backgroundColor: colors.sidebarBackground,
                color: colors.sidebarText,
                border: 'none'
              }} 
            />
          )}
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
              backgroundColor: colors.sidebarBackground,
              color: colors.sidebarText,
              border: 'none'
            }} 
          />
          
          {/* Footer unificado abajo */}
          <div style={{ position: 'absolute', bottom: 8, left: 0, width: '100%' }}>
            <SidebarFooter 
              onConfigClick={() => setShowSettingsDialog(true)} 
              allExpanded={allExpanded}
              toggleExpandAll={toggleExpandAll}
              collapsed={sidebarCollapsed}
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
                icon="pi pi-server" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={() => setShowSSHDialog(true)} 
                tooltip="Nueva conexión SSH" 
                tooltipOptions={{ position: 'bottom' }} 
              />
              <Button 
                icon="pi pi-desktop" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={() => setShowRdpManager && setShowRdpManager(true)} 
                tooltip="Gestor de conexiones RDP" 
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
                dragdropScope="files"
                onDragDrop={onDragDrop}
                onDragStart={e => {
                  // if (e.node) setDraggedNodeKey(e.node.key); // This line was removed as per the edit hint
                }}
                onDragEnd={() => {}}
                className="sidebar-tree"
                style={{ fontSize: `${explorerFontSize}px` }}
                nodeTemplate={(node, options) => nodeTemplate(node, { ...options, onNodeContextMenu })}
                expandedKeys={expandedKeys}
                onToggle={e => setExpandedKeys(e.value)}
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
      <SSHDialog
        visible={showSSHDialog}
        onHide={() => {
          setShowSSHDialog(false);
          setEditingNode(null); // Limpiar estado de edición al cerrar
        }}
        mode={editingNode ? "edit" : "new"}
        name={sshName}
        setName={setSSHName}
        host={sshHost}
        setHost={setSSHHost}
        user={sshUser}
        setUser={setSSHUser}
        password={sshPassword}
        setPassword={setSSHPassword}
        port={sshPort}
        setPort={setSSHPort}
        remoteFolder={sshRemoteFolder}
        setRemoteFolder={setSSHRemoteFolder}
        targetFolder={sshTargetFolder}
        setTargetFolder={setSSHTargetFolder}
        foldersOptions={getAllFolders(nodes)}
        onConfirm={createNewSSH}
      />
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
    </div>
  );
};

export default Sidebar; 