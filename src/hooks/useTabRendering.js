import React, { useState, useEffect } from 'react';
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
  toast,

  // Estados de visibilidad
  titleBarCollapsed,
  mainFrameHeaderCollapsed
}) => {

  // Determinar si la barra de pestañas debe actuar como zona de arrastre
  const isDraggable = !!(titleBarCollapsed && mainFrameHeaderCollapsed);

  // Estado para el icono de grupos (refresca cuando cambia el icono)
  const [groupIconVersion, setGroupIconVersion] = useState(0);

  useEffect(() => {
    const handleGroupIconChange = () => setGroupIconVersion(v => v + 1);
    window.addEventListener('group-icon-changed', handleGroupIconChange);
    return () => window.removeEventListener('group-icon-changed', handleGroupIconChange);
  }, []);

  /**
   * RENDERIZA LA BARRA DE GRUPOS — Pills inline integrados en la barra de pestañas.
   *
   * En lugar de un TabView completo que ocupa su propia fila, se usa un <div>
   * horizontal con botones estilizados como "pills". El CSS (.groups-pill-bar)
   * los posiciona como parte del mismo contenedor visual que la barra de tabs.
   */
  const renderGroupTabs = () => {
    if (tabGroups.length === 0) return null;

    const switchGroup = (groupId) => {
      // Guardar índice activo del grupo actual
      const currentGroupKey = activeGroupId || 'no-group';
      const currentTabs = getTabsInGroup(activeGroupId);
      if (currentTabs.length > 0) {
        setGroupActiveIndices(prev => ({
          ...prev,
          [currentGroupKey]: activeTabIndex
        }));
      }

      setActiveGroupId(groupId);

      // Restaurar índice del nuevo grupo
      const newGroupKey = groupId || 'no-group';
      const savedIndex = groupActiveIndices[newGroupKey] || 0;
      const tabsInNewGroup = getTabsInGroup(groupId);
      if (tabsInNewGroup.length > 0) {
        setActiveTabIndex(Math.min(savedIndex, tabsInNewGroup.length - 1));
      } else {
        setActiveTabIndex(0);
      }
    };

    const handleDeleteGroup = (e, group) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const tabsInGroup = getTabsInGroup(group.id);
        tabsInGroup.forEach(tab => moveTabToGroup(tab.key, null));
        deleteGroup(group.id);
        if (toast && toast.current) {
          toast.current.show({
            severity: 'success',
            summary: 'Grupo eliminado',
            detail: `El grupo "${group.name}" ha sido eliminado`,
            life: 3000
          });
        }
      } catch (error) {
        console.error('Error eliminando grupo:', error);
      }
    };

    return (
      <div
        className="groups-pill-bar"
        style={{ WebkitAppRegion: isDraggable ? 'drag' : 'inherit' }}
      >
        {/* Pill de "Sin grupo / Home" */}
        <button
          className={`group-pill group-pill--home${activeGroupId === null ? ' group-pill--active' : ''}`}
          onClick={() => switchGroup(null)}
          title="Todas las pestañas (sin grupo)"
          aria-label="Sin grupo"
          style={{ WebkitAppRegion: isDraggable ? 'no-drag' : 'inherit' }}
        >
          {getGroupTabIcon(13)}
        </button>

        {/* Divisor vertical */}
        <span className="groups-pill-divider" aria-hidden="true" />

        {/* Pills de cada grupo */}
        {tabGroups.map((group) => {
          const isActive = activeGroupId === group.id;
          return (
            <button
              key={group.id}
              className={`group-pill${isActive ? ' group-pill--active' : ''}`}
              onClick={() => switchGroup(group.id)}
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
              title={group.name}
              aria-label={`Grupo: ${group.name}`}
              style={{
                '--gp-color': group.color,
                WebkitAppRegion: isDraggable ? 'no-drag' : 'inherit'
              }}
            >
              <span
                className="group-pill__dot"
                style={{
                  background: group.color,
                  boxShadow: `0 0 0 2px ${group.color}44`
                }}
                aria-hidden="true"
              />
              <span className="group-pill__label">{group.name}</span>
              <span
                className="group-pill__close"
                role="button"
                tabIndex={-1}
                aria-label={`Eliminar grupo ${group.name}`}
                onMouseDown={(e) => handleDeleteGroup(e, group)}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <i className="pi pi-times" aria-hidden="true" />
              </span>
            </button>
          );
        })}

        {/* Divisor final que separa los pills del área de pestañas */}
        <span className="groups-pill-divider groups-pill-divider--end" aria-hidden="true" />
      </div>
    );
  };

  return {
    renderGroupTabs
  };
};
