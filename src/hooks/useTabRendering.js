import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  const groupBarRef = useRef(null);
  const groupHeightSyncRef = useRef({ resizeObserver: null, mutationObserver: null, observed: null });

  useEffect(() => {
    const handleGroupIconChange = () => setGroupIconVersion(v => v + 1);
    window.addEventListener('group-icon-changed', handleGroupIconChange);
    return () => window.removeEventListener('group-icon-changed', handleGroupIconChange);
  }, []);

  const syncGroupBarHeight = useCallback((groupBar) => {
    if (!groupBar) return false;
    const root = groupBar.parentElement;
    const tabLink = root?.querySelector('.main-tab-view .p-tabview-nav li:not(.home-tab) .p-tabview-nav-link')
      || document.querySelector('.terminal-frame.main-content-frame .main-tab-view .p-tabview-nav li:not(.home-tab) .p-tabview-nav-link');
    if (!tabLink) return false;

    const applyHeight = () => {
      const height = Math.round(tabLink.getBoundingClientRect().height);
      if (height <= 0) return;
      groupBar.style.setProperty('--tab-bar-height', `${height}px`);
      groupBar.style.setProperty('height', `${height}px`, 'important');
      groupBar.style.setProperty('min-height', `${height}px`, 'important');
      groupBar.style.setProperty('max-height', `${height}px`, 'important');
    };

    const syncState = groupHeightSyncRef.current;
    if (syncState.observed !== tabLink) {
      if (syncState.resizeObserver) syncState.resizeObserver.disconnect();
      syncState.observed = tabLink;
      syncState.resizeObserver = new ResizeObserver(applyHeight);
      syncState.resizeObserver.observe(tabLink);
    }
    applyHeight();
    return true;
  }, []);

  const setGroupBarRef = useCallback((node) => {
    groupBarRef.current = node;
    const syncState = groupHeightSyncRef.current;
    if (!node) {
      if (syncState.resizeObserver) syncState.resizeObserver.disconnect();
      if (syncState.mutationObserver) syncState.mutationObserver.disconnect();
      syncState.observed = null;
      return;
    }
    if (syncGroupBarHeight(node)) return;
    if (syncState.mutationObserver) syncState.mutationObserver.disconnect();
    syncState.mutationObserver = new MutationObserver(() => {
      if (syncGroupBarHeight(node) && syncState.mutationObserver) {
        syncState.mutationObserver.disconnect();
        syncState.mutationObserver = null;
      }
    });
    if (node.parentElement) {
      syncState.mutationObserver.observe(node.parentElement, { childList: true, subtree: true });
    }
  }, [syncGroupBarHeight]);

  useEffect(() => {
    if (groupBarRef.current) syncGroupBarHeight(groupBarRef.current);
  }, [tabGroups.length, activeGroupId, syncGroupBarHeight]);

  /**
   * RENDERIZA LA BARRA DE GRUPOS — Segunda fila de tabs (estilo TabView).
   * Clases nuevas: .groups-tab-bar / .group-tab-item
   * Alias: .groups-pill-bar / .group-pill para no romper temas.
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
        ref={setGroupBarRef}
        className="groups-tab-bar groups-pill-bar"
        style={{ WebkitAppRegion: isDraggable ? 'drag' : 'inherit' }}
      >
        {activeGroupId !== null && (
          <button
            className={`group-tab-item group-pill group-tab-item--home group-pill--home${activeGroupId === null ? ' group-tab-item--active group-pill--active' : ''}`}
            onClick={() => switchGroup(null)}
            title="Todas las pestañas (sin grupo)"
            aria-label="Sin grupo"
            style={{ WebkitAppRegion: isDraggable ? 'no-drag' : 'inherit' }}
          >
            {getGroupTabIcon(13)}
          </button>
        )}

        {tabGroups.map((group) => {
          const isActive = activeGroupId === group.id;
          const tabCount = getTabsInGroup(group.id).length;
          return (
            <button
              key={group.id}
              className={`group-tab-item group-pill${isActive ? ' group-tab-item--active group-pill--active' : ''}`}
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
                className="group-tab-item__dot group-pill__dot"
                style={{
                  background: group.color,
                  boxShadow: `0 0 0 2px ${group.color}44`
                }}
                aria-hidden="true"
              />
              <span className="group-tab-item__label group-pill__label">{group.name}</span>
              {tabCount > 0 && (
                <span className="group-tab-item__badge" aria-label={`${tabCount} pestanas`}>
                  {tabCount}
                </span>
              )}
              <span
                className="group-tab-item__close group-pill__close"
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
      </div>
    );
  };

  return {
    renderGroupTabs
  };
};
