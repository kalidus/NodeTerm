import React, { useCallback, useRef, useEffect } from 'react';
import { FolderIconRenderer, FolderIconPresets } from '../components/FolderIconSelector';

export const useNodeTemplate = ({
  // Estados
  sshConnectionStatus,
  activeGroupId,
  setActiveGroupId,
  activeTabIndex,
  setActiveTabIndex,
  setGroupActiveIndices,
  setSshTabs,
  setLastOpenedTabKey,
  setOnCreateActivateTabKey,
  homeTabs,
  onOpenRdpConnection,
  onOpenVncConnection,
  iconThemes,
  iconThemeSidebar,
  sidebarFont,
  folderIconSize,
  // Estados de diálogos
  setEditFolderNode,
  setEditFolderName,
  setEditFolderColor,
  setEditFolderIcon,
  setShowEditFolderDialog,
  // Funciones
  onNodeContextMenu,
  onTreeAreaContextMenu,
  onOpenWallixRefresh
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
    setEditFolderColor(node.color || '');
    setEditFolderIcon(node.folderIcon || null);
    setShowEditFolderDialog(true);
  }, [setEditFolderNode, setEditFolderName, setEditFolderColor, setEditFolderIcon, setShowEditFolderDialog]);

  // Node template simplificado - acciones movidas al menú contextual
  const nodeTemplate = useCallback((node, options) => {
    const isFolder = node.droppable;
    // Debug: loguear carpetas para verificar metadatos
    if (isFolder) {
      console.log('📁 Folder node:', node.label, '| importedFrom:', node.importedFrom, '| data:', JSON.stringify(node.data || {}));
    }
    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && node.data.type === 'rdp';
    const isVNC = node.data && (node.data.type === 'vnc' || node.data.type === 'vnc-guacamole');
    const isPassword = node.data && node.data.type === 'password';
    
    // Debug log para verificar tipo de nodo
    if (node.data && node.data.type) {
      console.log('🔍 Node type detected:', node.data.type, 'isPassword:', isPassword, node);
    }
    
    // Icono según tema seleccionado para la sidebar
    let icon = null;
    if (isSSH) {
      icon = iconThemes[iconThemeSidebar]?.icons?.ssh || <span className="pi pi-desktop" />;
    } else if (isRDP) {
      icon = iconThemes[iconThemeSidebar]?.icons?.rdp || <span className="pi pi-desktop" style={{ color: '#007ad9' }} />;
    } else if (isSFTP || isFTP || isSCP) {
      // Determinar el tipo de protocolo
      let protocolType = 'sftp';
      if (isSCP) protocolType = 'scp';
      else if (isFTP) protocolType = 'ftp';

      // Obtener icono del tema actual, con fallback al tema material
      icon = iconThemes[iconThemeSidebar]?.icons?.[protocolType] ||
             iconThemes['material']?.icons?.[protocolType];

      // Si aún no hay icono, usar fallback genérico
      if (!icon) {
        const fallbackColors = {
          sftp: '#ff9800',
          ftp: '#2196f3',
          scp: '#4caf50'
        };
        icon = <span className="pi pi-folder" style={{ color: fallbackColors[protocolType] || '#ff9800', fontSize: `${iconSize}px` }} />;
      } else {
        // Si tenemos un icono SVG del tema, clonarlo con el tamaño correcto
        icon = React.cloneElement(icon, {
          width: iconSize,
          height: iconSize,
          style: {
            ...icon.props.style,
            width: `${iconSize}px`,
            height: `${iconSize}px`
          }
        });
      }
    } else if (isPassword) {
      icon = <span className="pi pi-key" style={{ color: '#ffc107' }} />;
    } else if (isFolder) {
      // Usar el color del tema por defecto si no hay color personalizado
      const getThemeDefaultColor = (themeName) => {
        const theme = iconThemes[themeName];
        if (!theme || !theme.icons || !theme.icons.folder) return '#5e81ac'; // Nord color por defecto
        
        const folderIcon = theme.icons.folder;
        
        // Si el SVG tiene fill y no es "none", usar ese color
        if (folderIcon.props && folderIcon.props.fill && folderIcon.props.fill !== 'none') {
          return folderIcon.props.fill;
        }
        
        // Si el SVG tiene stroke, usar ese color
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
      
      const folderColor = node.color || getThemeDefaultColor(iconThemeSidebar);
      
      // Verificar si tiene icono personalizado (ignorar 'general' como si fuera null)
      if (node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()]) {
        const preset = FolderIconPresets[node.folderIcon.toUpperCase()];
        // Usar el icono personalizado con FolderIconRenderer
        icon = <FolderIconRenderer preset={preset} pixelSize={folderIconSize} />;
      } else {
        // Usar el icono del tema si no hay icono personalizado
        const themeIcon = options.expanded 
          ? iconThemes[iconThemeSidebar]?.icons?.folderOpen 
          : iconThemes[iconThemeSidebar]?.icons?.folder;
        
        if (themeIcon) {
          // Si hay un icono del tema, clonarlo y aplicar el color
          icon = React.cloneElement(themeIcon, {
            style: { 
              ...themeIcon.props.style, 
              color: folderColor,
              '--icon-color': folderColor
            },
            'data-folder-color': folderColor
          });
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
              />
            : <span 
                className="pi pi-folder" 
                style={{ 
                  color: folderColor,
                  '--icon-color': folderColor
                }} 
                data-folder-color={folderColor}
              />;
        }
      }
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

    // Detectar si tiene icono personalizado (para ajustar alineación del texto)
    const hasCustomFolderIcon = isFolder && node.folderIcon && node.folderIcon !== 'general' && FolderIconPresets[node.folderIcon.toUpperCase()];

    return (
      <div className="flex align-items-center gap-1"
        onContextMenu={options.onNodeContextMenu ? (e) => options.onNodeContextMenu(e, node) : undefined}
        onDoubleClick={(isSSH || isRDP || isPassword) ? (e) => {
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
                label: node.label,
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
          } else if (isVNC && onOpenVncConnection) {
            onOpenVncConnection(node);
          } else if (isPassword) {
            // Delegar a App para crear/activar la pestaña
            console.log('🔑 Password double-click detected:', node);
            const payload = {
              key: node.key,
              label: node.label,
              data: {
                username: node.data?.username || '',
                password: node.data?.password || '',
                url: node.data?.url || '',
                group: node.data?.group || '',
                notes: node.data?.notes || ''
              }
            };
            console.log('🔑 Dispatching open-password-tab event:', payload);
            window.dispatchEvent(new CustomEvent('open-password-tab', { detail: payload }));
          }
        } : undefined}
        onClick={isSSH ? (e) => {} : undefined}
        style={{ 
          cursor: 'pointer', 
          fontFamily: sidebarFont,
          display: 'flex',
          alignItems: 'flex-end',
          gap: '6px'
        }}
        title="Click derecho para más opciones"
      >
        <span style={{ 
          minWidth: 16,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          height: '20px'
        }}>{icon}</span>
        <span className="node-label" style={{
          lineHeight: '20px',
          height: '20px',
          display: 'block',
          margin: 0,
          padding: 0,
          ...(hasCustomFolderIcon ? { transform: 'translateY(3px)' } : {})
        }}>{node.label}</span>
        {getConnectionIndicator()}
        {node.importedFrom === 'Wallix' && node.droppable ? (
          <span
            className="pi pi-refresh ml-2 text-color-secondary hover:text-primary"
            style={{ fontSize: '0.85rem', cursor: 'pointer', marginLeft: '6px' }}
            title="Refrescar desde Wallix"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenWallixRefresh) onOpenWallixRefresh(node);
              else console.warn('onOpenWallixRefresh no definido!');
            }}
          />
        ) : null}
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
    onOpenVncConnection,
    iconThemes,
    iconThemeSidebar,
    sidebarFont,
    onNodeContextMenu,
    onTreeAreaContextMenu,
    onOpenWallixRefresh
  ]);

  return {
    nodeTemplate,
    getAllFolders,
    openEditFolderDialog
  };
};
