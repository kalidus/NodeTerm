import React from 'react';

const TabContextMenu = ({ 
  tabContextMenu, 
  setTabContextMenu, 
  tabGroups, 
  moveTabToGroup, 
  setShowCreateGroupDialog,
  isGroupFavorite, 
  addGroupToFavorites, 
  removeGroupFromFavorites,
  getTabsInGroup,
  deleteGroup,
  toast 
}) => {
  if (!tabContextMenu) return null;

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
        style={{
          position: 'fixed',
          left: tabContextMenu.x,
          top: tabContextMenu.y,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 10000,
          minWidth: '180px',
          overflow: 'hidden'
        }}
      >
        {tabContextMenu.isGroup ? (
          // Menú contextual para grupos
          <>
            <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0', fontSize: '12px', color: '#666' }}>
              Opciones del grupo "{tabContextMenu.group.name}":
            </div>
            <div
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              onClick={handleAddToFavorites}
            >
              <i className={isGroupFavorite(tabContextMenu.group.id, tabContextMenu.group.name) ? 'pi pi-star-fill' : 'pi pi-star'} style={{ width: '16px' }}></i>
              {isGroupFavorite(tabContextMenu.group.id, tabContextMenu.group.name) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            </div>
            <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }}></div>
            <div
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#d32f2f'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#ffebee'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
                <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0', fontSize: '12px', color: '#666' }}>
                  Mover a grupo:
                </div>
                <div
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  onClick={() => {
                    moveTabToGroup(tabContextMenu.tabKey, null);
                    setTabContextMenu(null);
                  }}
                >
                  <i className="pi pi-circle" style={{ width: '16px', color: '#999' }}></i>
                  Home
                </div>
                {tabGroups.map(group => (
                  <div
                    key={group.id}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
                <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }}></div>
              </>
            )}
            <div
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              onClick={() => {
                setTabContextMenu(null);
                setShowCreateGroupDialog(true);
              }}
            >
              <i className="pi pi-plus" style={{ width: '16px' }}></i>
              Crear nuevo grupo
            </div>
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
