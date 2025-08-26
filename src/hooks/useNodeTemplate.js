import { useCallback } from 'react';

export const useNodeTemplate = ({
  // Estados
  sshConnectionStatus,
  activeGroupId,
  setActiveGroupId,
  activeTabIndex,
  setActiveTabIndex,
  setGroupActiveIndices,
  setSshTabs,
  homeTabs,
  onOpenRdpConnection,
  iconThemes,
  iconThemeSidebar,
  sidebarFont,
  // Estados de diálogos
  setEditFolderNode,
  setEditFolderName,
  setShowEditFolderDialog,
  // Funciones
  onNodeContextMenu,
  onTreeAreaContextMenu
}) => {
  
  // Función recursiva para obtener todas las carpetas del árbol
  const getAllFolders = useCallback((nodes, prefix = '') => {
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
  }, []);

  // Función para abrir el diálogo de edición de carpeta
  const openEditFolderDialog = useCallback((node) => {
    setEditFolderNode(node);
    setEditFolderName(node.label);
    setShowEditFolderDialog(true);
  }, [setEditFolderNode, setEditFolderName, setShowEditFolderDialog]);

  // Node template simplificado - acciones movidas al menú contextual
  const nodeTemplate = useCallback((node, options) => {
    const isFolder = node.droppable;
    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && node.data.type === 'rdp';
    
    // Icono según tema seleccionado para la sidebar
    let icon = null;
    if (isSSH) {
      icon = iconThemes[iconThemeSidebar]?.icons?.ssh || <span className="pi pi-desktop" />;
    } else if (isRDP) {
      icon = iconThemes[iconThemeSidebar]?.icons?.rdp || <span className="pi pi-desktop" style={{ color: '#007ad9' }} />;
    } else if (isFolder) {
      icon = options.expanded
        ? (iconThemes[iconThemeSidebar]?.icons?.folderOpen || <span className="pi pi-folder-open" />)
        : (iconThemes[iconThemeSidebar]?.icons?.folder || <span className="pi pi-folder" />);
    }

    // Obtener estado de conexión para sesiones SSH
    const connectionStatus = isSSH ? sshConnectionStatus[node.key] : null;
    const getConnectionIndicator = () => {
      if (!isSSH) return null;
      switch (connectionStatus) {
        case 'connected':
          return <span className="connection-indicator connected" title="Conectado">●</span>;
        case 'error':
          return <span className="connection-indicator error" title="Error de conexión">●</span>;
        case 'disconnected':
          return <span className="connection-indicator disconnected" title="Desconectado">●</span>;
        default:
          return <span className="connection-indicator disconnected" title="Desconectado">●</span>;
      }
    };

    return (
      <div className="flex align-items-center gap-1"
        onContextMenu={options.onNodeContextMenu ? (e) => options.onNodeContextMenu(e, node) : undefined}
        onDoubleClick={(isSSH || isRDP) ? (e) => {
          e.stopPropagation();
          if (activeGroupId !== null) {
            const currentGroupKey = activeGroupId || 'no-group';
            setGroupActiveIndices(prev => ({
              ...prev,
              [currentGroupKey]: activeTabIndex
            }));
            setActiveGroupId(null);
          }
          
          if (isSSH) {
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
                groupId: null
              };
              const newTabs = [newTab, ...prevTabs];
              setActiveTabIndex(homeTabs.length);
              setGroupActiveIndices(prev => ({
                ...prev,
                'no-group': homeTabs.length
              }));
              return newTabs;
            });
          } else if (isRDP) {
            onOpenRdpConnection(node);
          }
        } : undefined}
        onClick={isSSH ? (e) => {} : undefined}
        style={{ cursor: 'pointer', fontFamily: sidebarFont }}
        title="Click derecho para más opciones"
      >
        <span style={{ minWidth: 16 }}>{icon}</span>
        <span className="node-label">{node.label}</span>
        {getConnectionIndicator()}
      </div>
    );
  }, [
    sshConnectionStatus,
    activeGroupId,
    setActiveGroupId,
    activeTabIndex,
    setActiveTabIndex,
    setGroupActiveIndices,
    setSshTabs,
    homeTabs,
    onOpenRdpConnection,
    iconThemes,
    iconThemeSidebar,
    sidebarFont
  ]);

  return {
    nodeTemplate,
    getAllFolders,
    openEditFolderDialog
  };
};
