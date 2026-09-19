import React, { useMemo } from 'react';
import { findNodeByKey } from '../../utils/favoritesSidebarTree';

/**
 * Obtiene el nodo de conexión asociado a una pestaña para poder editarlo.
 */
const getConnectionNodeForTab = (tab, nodes = []) => {
  if (!tab) return null;
  // Excluir pestañas que no son conexiones editables
  if (['edit-connection', 'settings', 'home', 'network-tool', 'document', 'document-folder', 'password', 'password-folder', 'audit'].includes(tab.type)) {
    return null;
  }

  // 1. Si tiene originalKey, buscar el nodo real en el árbol de la sidebar
  if (tab.originalKey && Array.isArray(nodes) && nodes.length > 0) {
    const found = findNodeByKey(nodes, tab.originalKey);
    if (found && (found.data?.type || !found.children || found.leaf !== false)) {
      return found;
    }
  }

  // 2. Si la pestaña ya tiene un nodo adjunto válido
  if (tab.node && (tab.node.data?.type || tab.node.type)) {
    if (tab.node.key && Array.isArray(nodes) && nodes.length > 0) {
      const found = findNodeByKey(nodes, tab.node.key);
      if (found) return found;
    }
    return tab.node;
  }

  // 3. Pestaña RDP
  if (tab.type === 'rdp' || tab.type === 'rdp-guacamole' || tab.rdpConfig) {
    const rdpConfig = tab.rdpConfig || {};
    return {
      key: tab.originalKey || tab.key,
      label: tab.label || rdpConfig.name || `${rdpConfig.server || rdpConfig.hostname || 'RDP'}:${rdpConfig.port || 3389}`,
      type: 'rdp',
      data: {
        type: 'rdp',
        server: rdpConfig.server || rdpConfig.hostname || '',
        hostname: rdpConfig.server || rdpConfig.hostname || '',
        username: rdpConfig.username || rdpConfig.user || '',
        password: rdpConfig.password || '',
        port: rdpConfig.port || 3389,
        domain: rdpConfig.domain || '',
        clientType: rdpConfig.clientType || 'web-rdp',
        ...rdpConfig
      }
    };
  }

  // 4. Pestaña VNC
  if (tab.type === 'vnc' || tab.type === 'vnc-guacamole' || tab.vncConfig) {
    const vncConfig = tab.vncConfig || tab.rdpConfig || {};
    return {
      key: tab.originalKey || tab.key,
      label: tab.label || vncConfig.name || `${vncConfig.hostname || vncConfig.server || 'VNC'}:${vncConfig.port || 5900}`,
      type: 'vnc',
      data: {
        type: 'vnc',
        server: vncConfig.hostname || vncConfig.server || '',
        hostname: vncConfig.hostname || vncConfig.server || '',
        username: vncConfig.username || '',
        password: vncConfig.password || '',
        port: vncConfig.port || 5900,
        clientType: vncConfig.clientType || 'web-vnc',
        ...vncConfig
      }
    };
  }

  // 5. Pestaña Explorer / SFTP / FTP / SCP
  if (tab.type === 'explorer' || tab.isExplorerInSSH) {
    const config = tab.sshConfig || {};
    const protocol = config.protocol || 'sftp';
    return {
      key: tab.originalKey || tab.key,
      label: tab.label || config.name || `${config.username || config.user || ''}@${config.host || ''}`,
      type: protocol,
      data: {
        type: protocol,
        host: config.host || '',
        hostname: config.host || '',
        user: config.username || config.user || '',
        username: config.username || config.user || '',
        password: config.password || '',
        port: config.port || (protocol === 'ftp' ? 21 : 22),
        remoteFolder: config.remoteFolder || '',
        useBastionWallix: config.useBastionWallix || false,
        bastionHost: config.bastionHost || '',
        bastionUser: config.bastionUser || '',
        targetServer: config.targetServer || '',
        customIcon: tab.customIcon || tab.iconId || null,
        ...config
      }
    };
  }

  // 6. Pestaña Terminal SSH (o cualquier terminal con sshConfig)
  if (tab.sshConfig || (tab.type === 'terminal' && tab.originalKey)) {
    const config = tab.sshConfig || {};
    return {
      key: tab.originalKey || tab.key,
      label: tab.label || config.name || `${config.username || config.user || ''}@${config.host || ''}`,
      type: 'ssh',
      data: {
        type: 'ssh',
        host: config.host || '',
        hostname: config.host || '',
        user: config.username || config.user || '',
        username: config.username || config.user || '',
        password: config.password || '',
        port: config.port || 22,
        remoteFolder: config.remoteFolder || '',
        useBastionWallix: config.useBastionWallix || false,
        bastionHost: config.bastionHost || '',
        bastionUser: config.bastionUser || '',
        targetServer: config.targetServer || '',
        description: config.description || '',
        customIcon: tab.customIcon || tab.iconId || null,
        ...config
      }
    };
  }

  // 7. Pestaña SSH Tunnel
  if (tab.type === 'ssh-tunnel' || tab.type === 'tunnel') {
    if (tab.tunnelConfig) {
      return {
        key: tab.originalKey || tab.key,
        label: tab.label || tab.tunnelConfig.name || 'Túnel SSH',
        type: 'ssh-tunnel',
        data: {
          type: 'ssh-tunnel',
          ...tab.tunnelConfig
        }
      };
    }
  }

  // 8. Nodo embebido con data.type
  if (tab.data && tab.data.type) {
    return tab;
  }

  return null;
};

const TabContextMenu = ({
  tabContextMenu,
  setTabContextMenu,
  tabGroups,
  moveTabToGroup,
  groupTabsBySection,
  setShowCreateGroupDialog,
  isGroupFavorite,
  addGroupToFavorites,
  removeGroupFromFavorites,
  getTabsInGroup,
  deleteGroup,
  toast,
  handleToggleBroadcast,
  handleToggleBroadcastTarget,
  getAllTabs,
  onEditConnection,
  nodes = []
}) => {
  if (!tabContextMenu) return null;

  const allTabs = getAllTabs ? getAllTabs() : [];
  const currentTab = allTabs.find(t => t.key === tabContextMenu.tabKey);
  const connectionNode = useMemo(() => {
    return getConnectionNodeForTab(currentTab, nodes);
  }, [currentTab, nodes]);

  const getTabSection = (t) => {
    if (!t) return null;
    const type = t.type;
    if (type === 'password' || type === 'password-folder') {
      return 'password';
    }
    if (type === 'document' || type === 'document-folder') {
      return 'notas';
    }
    const sessionTypes = [
      'terminal', 'split', 'rdp', 'rdp-guacamole', 'vnc', 'vnc-guacamole',
      'guacamole', 'explorer', 'local-terminal', 'powershell', 'cygwin',
      'ubuntu', 'wsl-distro', 'docker', 'ssh', 'sftp'
    ];
    if (sessionTypes.includes(type) || t.isExplorerInSSH) {
      return 'sesiones';
    }
    return null;
  };

  const section = getTabSection(currentTab);
  const matchingTabs = section ? allTabs.filter(t => getTabSection(t) === section) : [];
  const hasMoreTabsOfSameSection = matchingTabs.length > 1;
  const sectionLabel = section === 'password' ? 'contraseñas' : (section === 'notas' ? 'notas' : 'sesiones');



  const handleAddToFavorites = () => {
    const isAlreadyFavorite = isGroupFavorite(tabContextMenu.group.id, tabContextMenu.group.name);

    if (isAlreadyFavorite) {
      // Quitar de favoritos
      removeGroupFromFavorites(tabContextMenu.group.id, tabContextMenu.group.name);
      setTabContextMenu(null);
      toast.current.show({
        severity: 'info',
        summary: 'Grupo quitado de favoritos',
        detail: `El grupo "${tabContextMenu.group.name}" ha sido quitado de favoritos`,
        life: 3000
      });
    } else {
      // Añadir grupo a favoritos
      const groupWithSessions = {
        ...tabContextMenu.group,
        sessions: getTabsInGroup(tabContextMenu.group.id).map(tab => ({
          key: tab.key,
          label: tab.label,
          type: tab.type,
          groupId: tab.groupId,
          // Información adicional según el tipo
          ...(tab.sshConfig && {
            host: tab.sshConfig.host,
            username: tab.sshConfig.username,
            port: tab.sshConfig.port,
            useBastionWallix: tab.sshConfig.useBastionWallix,
            bastionHost: tab.sshConfig.bastionHost,
            bastionUser: tab.sshConfig.bastionUser
          }),
          ...(tab.rdpConfig && {
            host: tab.rdpConfig.server,
            username: tab.rdpConfig.username,
            port: tab.rdpConfig.port,
            clientType: tab.rdpConfig.clientType
          }),
          ...(tab.isExplorerInSSH && {
            isExplorerInSSH: true,
            needsOwnConnection: tab.needsOwnConnection
          })
        }))
      };
      addGroupToFavorites(groupWithSessions);
      setTabContextMenu(null);
      toast.current.show({
        severity: 'success',
        summary: 'Grupo añadido a favoritos',
        detail: `El grupo "${tabContextMenu.group.name}" ha sido añadido a favoritos`,
        life: 3000
      });
    }
  };

  const handleDeleteGroup = () => {
    // Eliminar grupo
    const tabsInGroup = getTabsInGroup(tabContextMenu.group.id);
    tabsInGroup.forEach(tab => moveTabToGroup(tab.key, null));
    deleteGroup(tabContextMenu.group.id);
    setTabContextMenu(null);
  };

  return (
    <>
      <div
        className="app-menu-surface tab-context-menu"
        style={{
          position: 'fixed',
          left: tabContextMenu.x,
          top: tabContextMenu.y,
          zIndex: 10000,
          minWidth: '180px',
          overflow: 'hidden'
        }}
      >
        {tabContextMenu.isGroup ? (
          // Menú contextual para grupos
          <>
            <div className="menu-header" style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid var(--ui-context-border)', fontSize: 'calc(var(--ui-font-size, 14px) - 2px)', color: 'var(--ui-context-text)', opacity: 0.7 }}>
              Opciones del grupo "{tabContextMenu.group.name}":
            </div>
            <div
              className="menu-item"
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={handleAddToFavorites}
            >
              <i className={isGroupFavorite(tabContextMenu.group.id, tabContextMenu.group.name) ? 'pi pi-star-fill' : 'pi pi-star'} style={{ width: '16px' }}></i>
              {isGroupFavorite(tabContextMenu.group.id, tabContextMenu.group.name) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            </div>
            <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
            <div
              className="menu-item"
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#d32f2f'
              }}
              onClick={handleDeleteGroup}
            >
              <i className="pi pi-trash" style={{ width: '16px' }}></i>
              Eliminar grupo
            </div>
          </>
        ) : (
          // Menú contextual para pestañas individuales
          <>
            {tabGroups.length > 0 && (
              <>
                <div className="menu-header" style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid var(--ui-context-border)', fontSize: 'calc(var(--ui-font-size, 14px) - 2px)', color: 'var(--ui-context-text)', opacity: 0.7 }}>
                  Mover a grupo:
                </div>
                <div
                  className="menu-item"
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={() => {
                    moveTabToGroup(tabContextMenu.tabKey, null);
                    setTabContextMenu(null);
                  }}
                >
                  <i className="pi pi-circle" style={{ width: '16px', color: 'var(--ui-context-text)', opacity: 0.6 }}></i>
                  Home
                </div>
                {tabGroups.map(group => (
                  <div
                    key={group.id}
                    className="menu-item"
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onClick={() => {
                      moveTabToGroup(tabContextMenu.tabKey, group.id);
                      setTabContextMenu(null);
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: group.color,
                        borderRadius: '2px'
                      }}
                    ></div>
                    {group.name}
                  </div>
                ))}
                <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
              </>
            )}
            {hasMoreTabsOfSameSection && (
              <>
                <div
                  className="menu-item"
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={() => {
                    groupTabsBySection(tabContextMenu.tabKey);
                    setTabContextMenu(null);
                  }}
                >
                  <i className="pi pi-tags" style={{ width: '16px' }}></i>
                  Agrupar {sectionLabel}
                </div>
                <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
              </>
            )}
            <div
              className="menu-item"
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => {
                setTabContextMenu(null);
                setShowCreateGroupDialog(true);
              }}
            >
              <i className="pi pi-plus" style={{ width: '16px' }}></i>
              Crear nuevo grupo
            </div>

            {connectionNode && (
              <>
                <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
                <div
                  className="menu-item"
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={() => {
                    setTabContextMenu(null);
                    if (onEditConnection) {
                      onEditConnection(connectionNode);
                    }
                  }}
                >
                  <i className="pi pi-pencil" style={{ width: '16px' }}></i>
                  Editar conexión
                </div>
              </>
            )}

          </>
        )}
      </div>

      {/* Overlay para cerrar menú contextual de grupos */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999
        }}
        onClick={() => setTabContextMenu(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          setTabContextMenu(null);
        }}
      />
    </>
  );
};

export default TabContextMenu;
