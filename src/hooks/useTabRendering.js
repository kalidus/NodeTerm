import React from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';

export const useTabRendering = ({
  // Estados de pestañas
  tabGroups,
  activeGroupId,
  setActiveGroupId,
  activeTabIndex,
  setActiveTabIndex,
  groupActiveIndices,
  setGroupActiveIndices,
  getTabsInGroup,
  
  // Estados de menús contextuales
  tabContextMenu,
  setTabContextMenu,
  
  // Funciones de gestión
  moveTabToGroup,
  deleteGroup,
  
  // Toast
  toast
}) => {

  // Renderizar TabView de grupos
  const renderGroupTabs = () => {
    if (tabGroups.length === 0) return null;
    
    return (
      <TabView
        scrollable
        activeIndex={(() => {
          if (activeGroupId === null) return 0;
          const idx = tabGroups.findIndex(g => g.id === activeGroupId);
          return idx === -1 ? 0 : idx + 1;
        })()}
        onTabChange={e => {
          // Solo guardar el índice activo si el grupo actual tiene pestañas
          const currentGroupKey = activeGroupId || 'no-group';
          const currentTabs = getTabsInGroup(activeGroupId);
          
          if (currentTabs.length > 0) {
            setGroupActiveIndices(prev => ({
              ...prev,
              [currentGroupKey]: activeTabIndex
            }));
          }
          
          // Cambiar al nuevo grupo
          const newGroupId = e.index === 0 ? null : tabGroups[e.index - 1].id;
          setActiveGroupId(newGroupId);
          
          // Restaurar el índice activo del nuevo grupo (o 0 si es la primera vez)
          const newGroupKey = newGroupId || 'no-group';
          const savedIndex = groupActiveIndices[newGroupKey] || 0;
          const tabsInNewGroup = getTabsInGroup(newGroupId);
          
          if (tabsInNewGroup.length > 0) {
            const validIndex = Math.min(savedIndex, Math.max(0, tabsInNewGroup.length - 1));
            setActiveTabIndex(validIndex);
          } else {
            setActiveTabIndex(0); // Reset to 0 for empty groups
          }
        }}
        style={{ 
          marginBottom: 0, 
          '--group-ink-bar-color': activeGroupId === null ? '#bbb' : (tabGroups.find(g => g.id === activeGroupId)?.color || '#bbb')
        }}
        className="tabview-groups-bar"
      >
        <TabPanel key="no-group" 
          style={{
            '--tab-bg-color': '#f5f5f5',
            '--tab-border-color': '#d0d0d0'
          }}
          header={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 180 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#bbb', marginRight: 4 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Home</span>
            </span>
          }
        >
          <div style={{display:'none'}} />
        </TabPanel>
        {tabGroups.map((group) => (
          <TabPanel
            key={group.id}
            style={{
              '--tab-bg-color': group.color + '33',
              '--tab-border-color': group.color + '66'
            }}
            header={
              <span 
                style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 180 }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTabContextMenu({
                    tabKey: group.id,
                    x: e.clientX,
                    y: e.clientY,
                    isGroup: true,
                    group: group
                  });
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, marginRight: 4 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</span>
                <Button
                  icon="pi pi-times"
                  className="p-button-rounded p-button-text p-button-sm"
                  style={{ marginLeft: 6, width: 16, height: 16, color: group.color, padding: 0 }}
                  onClick={e => {
                    e.stopPropagation();
                    // Mover todas las pestañas del grupo a 'Home' antes de eliminar
                    const tabsInGroup = getTabsInGroup(group.id);
                    tabsInGroup.forEach(tab => moveTabToGroup(tab.key, null));
                    deleteGroup(group.id);
                  }}
                  tooltip={"Eliminar grupo"}
                />
              </span>
            }
          >
            <div style={{display:'none'}} />
          </TabPanel>
        ))}
      </TabView>
    );
  };

  return {
    renderGroupTabs
  };
};
