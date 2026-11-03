import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { getGroupTabIcon } from '../themes/group-tab-icons';

const GROUPS_INLINE_STORAGE_KEY = 'nodeterm_groups_inline';

const readGroupsInlinePreference = () => {
  try {
    return localStorage.getItem(GROUPS_INLINE_STORAGE_KEY) === '1';
  } catch (_) {
    return false;
  }
};

const applyGroupsInlineAttribute = (enabled) => {
  document.documentElement.setAttribute('data-groups-inline', enabled ? '1' : '0');
};

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
  const [currentTabLayout, setCurrentTabLayout] = useState(() =>
    document.documentElement.getAttribute('data-tab-layout') || localStorage.getItem('nodeterm_tab_layout') || 'default'
  );
  const [dragOverGroupId, setDragOverGroupId] = useState(undefined);
  const [groupsInline, setGroupsInline] = useState(readGroupsInlinePreference);

  const groupBarRef = useRef(null);
  const groupHeightSyncRef = useRef({ resizeObserver: null, mutationObserver: null, observed: null });
  const applyGroupBarHeightRef = useRef(() => {});

  useLayoutEffect(() => {
    applyGroupsInlineAttribute(groupsInline);
  }, [groupsInline]);

  useEffect(() => {
    const syncFromStorage = () => setGroupsInline(readGroupsInlinePreference());
    const onStorage = (event) => {
      if (event.key === GROUPS_INLINE_STORAGE_KEY) syncFromStorage();
    };
    const onSettingsUpdated = (event) => {
      const keys = event?.detail?.keys;
      if (!keys || keys.includes(GROUPS_INLINE_STORAGE_KEY)) syncFromStorage();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('settings-updated', onSettingsUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('settings-updated', onSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    const handleGroupIconChange = () => setGroupIconVersion(v => v + 1);
    const handleTabLayoutChange = (e) => {
      const nextLayout = e?.detail || document.documentElement.getAttribute('data-tab-layout') || 'default';
      setCurrentTabLayout(nextLayout);
    };
    window.addEventListener('group-icon-changed', handleGroupIconChange);
    window.addEventListener('tab-layout-changed', handleTabLayoutChange);
    return () => {
      window.removeEventListener('group-icon-changed', handleGroupIconChange);
      window.removeEventListener('tab-layout-changed', handleTabLayoutChange);
    };
  }, []);

  const syncGroupBarHeight = useCallback((groupBar) => {
    if (!groupBar) return false;
    const layout = document.documentElement.getAttribute('data-tab-layout') || currentTabLayout;
    const isTermius = layout === 'termius';

    const clearForcedHeight = () => {
      groupBar.style.removeProperty('--tab-bar-height');
      groupBar.style.removeProperty('height');
      groupBar.style.removeProperty('min-height');
      groupBar.style.removeProperty('max-height');
    };

    if (isTermius) {
      clearForcedHeight();
      groupBar.style.removeProperty('--group-chip-height');
      return true;
    }

    const root = groupBar.parentElement;
    const tabLink = root?.querySelector('.main-tab-view .p-tabview-nav li:not(.home-tab) .p-tabview-nav-link')
      || document.querySelector('.terminal-frame.main-content-frame .main-tab-view .p-tabview-nav li:not(.home-tab) .p-tabview-nav-link');
    if (!tabLink) return false;

    applyGroupBarHeightRef.current = () => {
      const liveLayout = document.documentElement.getAttribute('data-tab-layout') || 'default';
      if (liveLayout === 'termius') {
        clearForcedHeight();
        groupBar.style.removeProperty('--group-chip-height');
        return;
      }
      const liveInline = document.documentElement.getAttribute('data-groups-inline') === '1';
      const height = Math.round(tabLink.getBoundingClientRect().height);
      if (height <= 0) return;
      if (liveInline && liveLayout !== 'vscode') {
        clearForcedHeight();
        groupBar.style.setProperty('--group-chip-height', `${height}px`);
        return;
      }
      groupBar.style.removeProperty('--group-chip-height');
      groupBar.style.setProperty('--tab-bar-height', `${height}px`);
      groupBar.style.setProperty('height', `${height}px`, 'important');
      groupBar.style.setProperty('min-height', `${height}px`, 'important');
      groupBar.style.setProperty('max-height', `${height}px`, 'important');
    };

    const syncState = groupHeightSyncRef.current;
    if (syncState.observed !== tabLink) {
      if (syncState.resizeObserver) syncState.resizeObserver.disconnect();
      syncState.observed = tabLink;
      syncState.resizeObserver = new ResizeObserver(() => applyGroupBarHeightRef.current());
      syncState.resizeObserver.observe(tabLink);
    }
    applyGroupBarHeightRef.current();
    return true;
  }, [currentTabLayout]);

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
  }, [tabGroups.length, activeGroupId, groupsInline, syncGroupBarHeight]);

  const toggleGroupsInline = () => {
    setGroupsInline((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(GROUPS_INLINE_STORAGE_KEY, next ? '1' : '0');
      } catch (_) {
        // ignore
      }
      return next;
    });
  };

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

    const isTermiusLayout = currentTabLayout === 'termius';

    const resolveDraggedTabKey = (e) => {
      try {
        const fromTransfer = e.dataTransfer?.getData?.('application/x-nodeterm-tab-key');
        if (fromTransfer) return fromTransfer;
      } catch (_) {
        // ignore
      }
      return window._nodetermDraggedTabKey || null;
    };

    const handleGroupDragOver = (e, targetGroupId) => {
      const draggedKey = window._nodetermDraggedTabKey;
      const hasTypes = e.dataTransfer?.types && (
        Array.from(e.dataTransfer.types).includes('application/x-nodeterm-tab-key') ||
        Array.from(e.dataTransfer.types).includes('text/plain')
      );
      if (!draggedKey && !hasTypes) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      if (dragOverGroupId !== targetGroupId) {
        setDragOverGroupId(targetGroupId);
      }
    };

    const handleGroupDragLeave = (e) => {
      e.stopPropagation();
      setDragOverGroupId(undefined);
    };

    const handleGroupDrop = (e, targetGroupId, targetLabel) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverGroupId(undefined);
      const tabKey = resolveDraggedTabKey(e);
      window._nodetermDraggedTabKey = null;
      if (!tabKey || tabKey.startsWith('home_tab')) return;
      moveTabToGroup(tabKey, targetGroupId);
      if (toast && toast.current) {
        toast.current.show({
          severity: 'info',
          summary: targetGroupId ? 'Pestaña movida al grupo' : 'Pestaña desagrupada',
          detail: targetGroupId
            ? `Movida a "${targetLabel}"`
            : 'Movida a Workspace (sin grupo)',
          life: 2200
        });
      }
    };

    const renderHomeGroupButton = () => (
      <button
        className={`group-tab-item group-pill group-tab-item--home group-pill--home${activeGroupId === null ? ' group-tab-item--active group-pill--active' : ''}${dragOverGroupId === null ? ' group-tab-item--drop-target' : ''}`}
        onClick={() => switchGroup(null)}
        onDragOver={(e) => handleGroupDragOver(e, null)}
        onDragLeave={handleGroupDragLeave}
        onDrop={(e) => handleGroupDrop(e, null, 'Workspace')}
        title="Todas las pestañas (Workspace)"
        aria-label="Workspace (sin grupo)"
        style={{ WebkitAppRegion: isDraggable ? 'no-drag' : 'inherit' }}
      >
        {isTermiusLayout ? (
          <>
            <svg
              className="termius-workspace-icon"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="5" height="5" rx="1.2" fill="currentColor" />
              <rect x="9" y="2" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.85" />
              <rect x="2" y="9" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.85" />
              <rect x="9" y="9" width="5" height="5" rx="2.5" fill="currentColor" />
            </svg>
            <span className="group-tab-item__label group-pill__label">Workspace</span>
          </>
        ) : (
          getGroupTabIcon(13)
        )}
      </button>
    );

    return (
      <div
        ref={setGroupBarRef}
        className="groups-tab-bar groups-pill-bar"
        style={{ WebkitAppRegion: isDraggable ? 'drag' : 'inherit' }}
      >
        <div className="groups-tab-bar__track">
        {!isTermiusLayout && activeGroupId !== null && renderHomeGroupButton()}

        {tabGroups.map((group) => {
          const isActive = activeGroupId === group.id;
          const tabCount = getTabsInGroup(group.id).length;
          const isDropTarget = dragOverGroupId === group.id;
          return (
            <button
              key={group.id}
              className={`group-tab-item group-pill${isActive ? ' group-tab-item--active group-pill--active' : ''}${isDropTarget ? ' group-tab-item--drop-target' : ''}`}
              onClick={() => switchGroup(isActive ? null : group.id)}
              onDragOver={(e) => handleGroupDragOver(e, group.id)}
              onDragLeave={handleGroupDragLeave}
              onDrop={(e) => handleGroupDrop(e, group.id, group.name)}
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
              title={`${group.name} (${tabCount} pestañas) · Clic para alternar · Arrastra pestañas aquí`}
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

        {isTermiusLayout && (
          <span className="termius-segment-divider termius-segment-divider--groups" aria-hidden="true" />
        )}

        {isTermiusLayout && activeGroupId !== null && (
          <>
            {renderHomeGroupButton()}
            {getTabsInGroup(activeGroupId).length > 0 && (
              <span className="termius-segment-divider termius-segment-divider--workspace" aria-hidden="true" />
            )}
          </>
        )}
        </div>

        {!isTermiusLayout && (
          <button
            type="button"
            className={`groups-inline-toggle${groupsInline ? ' groups-inline-toggle--active' : ''}`}
            onClick={toggleGroupsInline}
            aria-pressed={groupsInline}
            aria-label={groupsInline ? 'Separar barra de grupos' : 'Integrar grupos en la barra de pestañas'}
            title={groupsInline ? 'Separar barra de grupos' : 'Integrar grupos en la barra de pestañas'}
            style={{ WebkitAppRegion: isDraggable ? 'no-drag' : 'inherit' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="6.15" width="5.2" height="3.7" rx="1" fill="currentColor" />
              <rect x="7.35" y="6.7" width="1.3" height="2.6" rx="0.4" fill="currentColor" opacity="0.7" />
              <rect x="9.8" y="6.15" width="5.2" height="3.7" rx="1" fill="currentColor" opacity="0.55" />
            </svg>
          </button>
        )}

        {groupsInline && !isTermiusLayout && (
          <span className="groups-inline-divider" aria-hidden="true" />
        )}
      </div>
    );
  };

  return {
    renderGroupTabs
  };
};
