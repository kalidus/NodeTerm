import React, { useState, useEffect } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { getGroupTabIcon } from '../themes/group-tab-icons';

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
  
  // Estado para el icono de grupos
  const [groupIconVersion, setGroupIconVersion] = useState(0);
  
  // Escuchar cambios en el icono de grupos
  useEffect(() => {
    const handleGroupIconChange = () => {
      setGroupIconVersion(v => v + 1);
    };
    
    window.addEventListener('group-icon-changed', handleGroupIconChange);
    return () => window.removeEventListener('group-icon-changed', handleGroupIconChange);
  }, []);

  /**
   * RENDERIZA LA BARRA DE PESTAÑAS DE GRUPOS
   * 
   * Estructura del header de cada grupo:
   * - Contenedor principal: flexbox space-between para separar contenido y botón X
   * - Lado izquierdo: círculo de color + texto del grupo (con ellipsis)
   * - Lado derecho: botón X para cerrar grupo (16x16px, centrado)
   * 
   * IMPORTANTE: No usar position absolute en el botón X - causa desalineación
   */
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
        className={`tabview-groups-bar ${activeGroupId === null ? 'home-active' : ''}`}
      >
        <TabPanel key="no-group" 
          style={{
            '--tab-bg-color': '#f5f5f5',
            '--tab-border-color': '#d0d0d0'
          }}
          header={
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {getGroupTabIcon(20)}
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
                className="group-hover"
                style={{ display: 'flex', alignItems: 'center', maxWidth: 180 }}
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
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{group.name}</span>
                <Button
                  icon="pi pi-times"
                  className="p-button-rounded p-button-text p-button-sm group-delete-x"
                  style={{ marginLeft: 0, width: 16, height: 16, color: group.color, padding: 0 }}
                  onMouseDown={e => {
                    console.log('🖱️ MouseDown - Botón eliminar grupo:', group.id, group.name);
                    e.preventDefault();
                    e.stopPropagation();
                    
                    try {
                      const tabsInGroup = getTabsInGroup(group.id);
                      console.log('📑 Pestañas encontradas en grupo:', tabsInGroup.length);
                      
                      tabsInGroup.forEach(tab => {
                        console.log('🔄 Moviendo pestaña a Home:', tab.key);
                        moveTabToGroup(tab.key, null);
                      });
                      
                      console.log('🗑️ Eliminando grupo:', group.id);
                      deleteGroup(group.id);
                      
                      console.log('✅ Grupo eliminado exitosamente');
                      
                      if (toast && toast.current) {
                        toast.current.show({
                          severity: 'success',
                          summary: 'Grupo eliminado',
                          detail: `El grupo "${group.name}" ha sido eliminado`,
                          life: 3000
                        });
                      }
                    } catch (error) {
                      console.error('❌ Error eliminando grupo:', error);
                    }
                  }}
                  onClick={e => {
                    console.log('🖱️ Click backup - Botón eliminar grupo:', group.id, group.name);
                    e.preventDefault();
                    e.stopPropagation();
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
