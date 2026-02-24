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
  toast,
  handleToggleBroadcast,
  handleToggleBroadcastTarget,
  getAllTabs
}) => {
  if (!tabContextMenu) return null;

  // Encontrar la pestaña actual en base a tabKey
  const currentTab = getAllTabs ? getAllTabs().find(t => t.key === tabContextMenu.tabKey) : null;
  const isBroadcasting = currentTab ? currentTab.isBroadcastActive : false;

  const extractTerminals = (tab) => {
    const list = [];
    if (!tab) return list;
    if (tab.type === 'terminal' || tab.type === 'local-terminal') {
      list.push({ key: tab.key, label: tab.label || tab.key });
    } else if (tab.type === 'split') {
      if (tab.first || tab.second) {
        if (tab.first) list.push(...extractTerminals(tab.first));
        if (tab.second) list.push(...extractTerminals(tab.second));
      } else if (Array.isArray(tab.terminals)) {
        tab.terminals.forEach(t => list.push(...extractTerminals(t)));
      } else if (tab.leftTerminal && tab.rightTerminal) {
        list.push(...extractTerminals(tab.leftTerminal));
        list.push(...extractTerminals(tab.rightTerminal));
      }
    }
    return list;
  };

  const terminalsInGroup = isBroadcasting && currentTab ? extractTerminals(currentTab) : [];

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
        className="tab-context-menu"
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
            <div className="menu-header" style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid var(--ui-context-border)', fontSize: '12px', color: 'var(--ui-context-text)', opacity: 0.7 }}>
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
                <div className="menu-header" style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid var(--ui-context-border)', fontSize: '12px', color: 'var(--ui-context-text)', opacity: 0.7 }}>
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

            {handleToggleBroadcast && (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleBroadcast(tabContextMenu.tabKey);
                  }}
                >
                  <i className={`pi ${isBroadcasting ? 'pi-eye-slash' : 'pi-wifi'}`} style={{ width: '16px' }}></i>
                  {isBroadcasting ? 'Desactivar Broadcast (Input simultáneo)' : 'Activar Broadcast (Input simultáneo)'}
                </div>

                {isBroadcasting && terminalsInGroup.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <div className="menu-header" style={{ padding: '8px 12px 4px 12px', fontWeight: 'bold', fontSize: '11px', color: 'var(--ui-context-text)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Destinos del Broadcast
                    </div>
                    {terminalsInGroup.map(term => {
                      const isExcluded = currentTab.broadcastExcludedTargets?.includes(term.key);
                      const isChecked = !isExcluded;

                      return (
                        <div
                          key={term.key}
                          className="menu-item"
                          style={{
                            padding: '6px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (handleToggleBroadcastTarget) {
                              handleToggleBroadcastTarget(currentTab.key, term.key);
                            }
                          }}
                        >
                          <i className={`pi ${isChecked ? 'pi-check-square' : 'pi-stop'}`} style={{ width: '16px', color: isChecked ? '#4caf50' : 'inherit', opacity: isChecked ? 1 : 0.5 }}></i>
                          <span style={{ opacity: isChecked ? 1 : 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                            {term.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
