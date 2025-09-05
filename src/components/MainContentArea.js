import React from 'react';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import Sidebar from './Sidebar';
import TabHeader from './TabHeader';
import TabContentRenderer from './TabContentRenderer';
import TabContextMenu from './contextmenus/TabContextMenu';
import TerminalContextMenu from './contextmenus/TerminalContextMenu';
import OverflowMenu from './contextmenus/OverflowMenu';
import { TAB_TYPES } from '../utils/constants';

const MainContentArea = ({
  // Sidebar props
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarVisible,
  handleResize,
  handleResizeThrottled,
  memoizedSidebarProps,
  
  // Tab management props
  homeTabs,
  sshTabs,
  fileExplorerTabs,
  rdpTabs,
  guacamoleTabs,
  activeGroupId,
  getTabsInGroup,
  activeTabIndex,
  setActiveTabIndex,
  activatingNowRef,
  setGroupActiveIndices,
  GROUP_KEYS,
  
  // Tab rendering props
  renderGroupTabs,
  filteredTabs,
  
  // Tab header props
  memoizedTabProps,
  tabHandlers,
  dragOverTabIndex,
  
  // Content renderer props
  memoizedContentRendererProps,
  sshStatsByTabId,
  
  // Context menu props
  tabContextMenu,
  setTabContextMenu,
  terminalContextMenu,
  setTerminalContextMenu,
  showOverflowMenu,
  setShowOverflowMenu,
  overflowMenuPosition,
  overflowMenuItems,
  
  // Tab context menu props
  tabGroups,
  moveTabToGroup,
  setShowCreateGroupDialog,
  isGroupFavorite,
  addGroupToFavorites,
  removeGroupFromFavorites,
  deleteGroup,
  toast,
  
  // Selected node props
  selectedNodeKey,
  
  // Terminal handlers
  handleCopyFromTerminalWrapper,
  handlePasteToTerminalWrapper,
  handleSelectAllTerminalWrapper,
  handleClearTerminalWrapper,
  
  // Theme props
  isHomeTabActive,
  localTerminalBg,
  
  // Tree context menu
  isGeneralTreeMenu,
  getGeneralTreeContextMenuItems,
  getTreeContextMenuItems,
  selectedNode,
  treeContextMenuRef
}) => {
  // Función de colapso automático inteligente (tanto durante como al final)
  const handleResizeWithAutoCollapse = (e) => {
    console.log('🔍 onResize ejecutado:', e.sizes);
    
    // Calcular ancho real del panel en píxeles
    const splitterElement = document.querySelector('.main-splitter');
    if (splitterElement) {
      const splitterWidth = splitterElement.offsetWidth;
      const sidebarPercentage = e.sizes[0];
      const sidebarWidthPx = (splitterWidth * sidebarPercentage) / 100;
      
      console.log('📊 Datos resize:', { 
        splitterWidth, 
        sidebarPercentage, 
        sidebarWidthPx, 
        sidebarCollapsed 
      });
      
      // Umbrales en píxeles (basados en datos reales)
      const collapseThresholdPx = 70;  // Mayor que 65px para que se active al llegar al límite
      const expandThresholdPx = 120;   // Si es mayor a 120px, expandir
      
      if (!sidebarCollapsed && sidebarWidthPx <= collapseThresholdPx) {
        // Colapsar automáticamente
        console.log('🔄 AUTO-COLAPSANDO sidebar por tamaño:', sidebarWidthPx);
        setSidebarCollapsed(true);
      } else if (sidebarCollapsed && sidebarWidthPx > expandThresholdPx) {
        // Expandir automáticamente
        console.log('🔄 AUTO-EXPANDIENDO sidebar por tamaño:', sidebarWidthPx);
        setSidebarCollapsed(false);
      }
    }
    
    // Llamar al resize original
    if (handleResize) {
      handleResize(e);
    }
  };

  const handleResizeEndWithAutoCollapse = (e) => {
    console.log('🏁 onResizeEnd ejecutado:', e.sizes);
    handleResizeWithAutoCollapse(e);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', width: '100%' }}>
      <Splitter 
        style={{ height: '100%', width: '100%' }} 
        onResizeEnd={handleResizeEndWithAutoCollapse}
        onResize={handleResizeWithAutoCollapse} // Con colapso automático
        disabled={false}
        className="main-splitter"
        pt={{
          gutter: {
            style: {
              transition: 'none', // Clave: sin transición para fluidez
              background: 'var(--ui-sidebar-gutter-bg, #dee2e6)',
              borderColor: 'var(--ui-sidebar-border, #e0e0e0)',
              width: '4px', // Área ligeramente más amplia para mejor detección
              cursor: 'col-resize', // Asegurar cursor correcto
              margin: '0 -1px' // Centrar el área de detección
            }
          }
        }}
      >
        <SplitterPanel 
          size={sidebarCollapsed ? 4 : 15} 
          minSize={sidebarCollapsed ? 4 : 4} 
          maxSize={sidebarCollapsed ? 4 : 35}
          style={sidebarCollapsed 
            ? { width: 44, minWidth: 44, maxWidth: 44, padding: 0, height: '100%', transition: 'none', display: 'flex', flexDirection: 'column' }
            : { padding: 0, height: '100%', transition: 'none', display: 'flex', flexDirection: 'column' }
          }
          pt={{
            root: {
              style: {
                minWidth: '44px !important',
                width: 'auto'
              }
            }
          }}
        >
          <Sidebar {...memoizedSidebarProps} />
        </SplitterPanel>
        
        <SplitterPanel size={sidebarVisible ? 85 : 100} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minWidth: 0, 
          width: '100%', 
          height: '100%',
          background: isHomeTabActive ? localTerminalBg : undefined
        }}>
          {(homeTabs.length > 0 || sshTabs.length > 0 || fileExplorerTabs.length > 0) ? (
            <div style={{ 
              width: '100%', 
              minWidth: 0, 
              minHeight: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1, 
              height: '100%',
              background: isHomeTabActive ? localTerminalBg : undefined
            }}>
              {/* Barra de grupos como TabView scrollable */}
              {renderGroupTabs()}
              <div style={{ height: '1px', background: 'var(--ui-tabgroup-border, #444)' }} />
              
              <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                {/* Solo mostrar TabView de pestañas si el grupo no está vacío */}
                {!(activeGroupId !== null && getTabsInGroup(activeGroupId).length === 0) && (
                  <TabView 
                    activeIndex={activeTabIndex} 
                    onTabChange={(e) => {
                      if (activatingNowRef.current) return; // bloquear cambios durante activación forzada
                      setActiveTabIndex(e.index);
                      // Solo guardar el nuevo índice si el grupo actual tiene pestañas
                      const currentGroupKey = activeGroupId || GROUP_KEYS.DEFAULT;
                      const currentTabs = getTabsInGroup(activeGroupId);
                      
                      if (currentTabs.length > 0) {
                        setGroupActiveIndices(prev => ({
                          ...prev,
                          [currentGroupKey]: e.index
                        }));
                      }
                    }}
                    renderActiveOnly={false}
                    scrollable={false}
                    className="main-tab-view"
                  >
                    {filteredTabs.map((tab, idx) => {
                      // Con las pestañas híbridas, todas las pestañas visibles están en el contexto home, SSH o explorer
                      // OJO: como reordenamos virtualmente (pin a índice 1), no podemos fiarnos de idx
                      const isHomeTab = tab.type === TAB_TYPES.HOME;
                      const isSSHTab = tab.type === TAB_TYPES.TERMINAL || tab.type === TAB_TYPES.SPLIT || tab.isExplorerInSSH;
                      const originalIdx = idx; // No usamos originalIdx para decisiones críticas
                      
                      return (
                        <TabPanel 
                          key={tab.key} 
                          header={tab.label}
                          headerTemplate={(options) => (
                            <TabHeader
                              // Props de PrimeReact
                              className={options.className}
                              onClick={options.onClick}
                              onKeyDown={options.onKeyDown}
                              leftIcon={options.leftIcon}
                              rightIcon={options.rightIcon}
                              style={options.style}
                              selected={options.selected}
                              
                              // Props específicas
                              tab={tab}
                              idx={idx}
                              
                              // Estados de drag & drop
                              isDragging={memoizedTabProps.draggedTabIndex === idx}
                              isDragOver={dragOverTabIndex === idx}
                              dragStartTimer={memoizedTabProps.dragStartTimer}
                              draggedTabIndex={memoizedTabProps.draggedTabIndex}
                              
                              // Props de iconos
                              tabDistros={memoizedTabProps.tabDistros}
                              
                              // Event handlers (memoizados)
                              onTabDragStart={tabHandlers.onTabDragStart}
                              onTabDragOver={tabHandlers.onTabDragOver}
                              onTabDragLeave={tabHandlers.onTabDragLeave}
                              onTabDrop={tabHandlers.onTabDrop}
                              onTabDragEnd={tabHandlers.onTabDragEnd}
                              onTabContextMenu={tabHandlers.onTabContextMenu}
                              onTabClose={tabHandlers.onTabClose}
                            />
                          )}
                        />
                      );
                    })}
                  </TabView>
                )}
                
                {/* Menús contextuales refactorizados */}
                <TabContextMenu
                  tabContextMenu={tabContextMenu}
                  setTabContextMenu={setTabContextMenu}
                  tabGroups={tabGroups}
                  moveTabToGroup={moveTabToGroup}
                  setShowCreateGroupDialog={setShowCreateGroupDialog}
                  isGroupFavorite={isGroupFavorite}
                  addGroupToFavorites={addGroupToFavorites}
                  removeGroupFromFavorites={removeGroupFromFavorites}
                  getTabsInGroup={getTabsInGroup}
                  deleteGroup={deleteGroup}
                  toast={toast}
                />

                <TerminalContextMenu
                  terminalContextMenu={terminalContextMenu}
                  setTerminalContextMenu={setTerminalContextMenu}
                  onCopy={handleCopyFromTerminalWrapper}
                  onPaste={handlePasteToTerminalWrapper}
                  onSelectAll={handleSelectAllTerminalWrapper}
                  onClear={handleClearTerminalWrapper}
                />

                <OverflowMenu
                  showOverflowMenu={showOverflowMenu}
                  setShowOverflowMenu={setShowOverflowMenu}
                  overflowMenuPosition={overflowMenuPosition}
                  overflowMenuItems={overflowMenuItems}
                />
              </div>
              
              <div style={{ 
                flexGrow: 1, 
                position: 'relative',
                background: isHomeTabActive ? localTerminalBg : undefined
              }}>
                {/* SIEMPRE renderizar todas las pestañas para preservar conexiones SSH */}
                {/* Overlay para grupo vacío se muestra por encima */}
                {activeGroupId !== null && getTabsInGroup(activeGroupId).length === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ui-content-bg, #222)',
                    color: '#888', textAlign: 'center', padding: '2rem 0',
                    zIndex: 1000,
                    backdropFilter: 'blur(2px)'
                  }}>
                    <i className="pi pi-folder-open" style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }} />
                    <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Este grupo está vacío</div>
                    <div style={{ fontSize: 15, marginBottom: 0 }}>Crea una nueva pestaña o arrastra aquí una existente.</div>
                  </div>
                )}
                
                {/* SIEMPRE renderizar TODAS las pestañas para preservar conexiones SSH */}
                {[...homeTabs, ...sshTabs, ...rdpTabs, ...guacamoleTabs, ...fileExplorerTabs].map((tab) => {
                  const isInActiveGroup = filteredTabs.some(filteredTab => filteredTab.key === tab.key);
                  const tabIndexInActiveGroup = filteredTabs.findIndex(filteredTab => filteredTab.key === tab.key);
                  const isActiveTab = isInActiveGroup && tabIndexInActiveGroup === activeTabIndex;
                  
                  return (
                    <div 
                      key={tab.key}
                      style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        width: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        visibility: isActiveTab ? 'visible' : 'hidden',
                        zIndex: isActiveTab ? 1 : 0,
                        pointerEvents: isActiveTab ? 'auto' : 'none',
                        background: (tab.type === TAB_TYPES.HOME && isActiveTab) ? localTerminalBg : undefined
                      }}
                    >
                      <TabContentRenderer
                        tab={tab}
                        isActiveTab={isActiveTab}
                        // Props memoizadas
                        {...memoizedContentRendererProps}
                        // Terminal props (específicas)
                        sshStatsByTabId={sshStatsByTabId}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card title="Contenido Principal" style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%' }}>
              <p className="m-0">
                Bienvenido a la aplicación de escritorio. Seleccione un archivo del panel lateral para ver su contenido.
              </p>
              {selectedNodeKey && (
                <div className="mt-3">
                  <p>Elemento seleccionado: {Object.keys(selectedNodeKey)[0]}</p>
                </div>
              )}
              <div className="mt-3">
                <p>Puedes arrastrar y soltar elementos en el panel lateral para reorganizarlos.</p>
                <p>Haz clic en el botón "+" para crear carpetas nuevas.</p>
                <p>Para eliminar un elemento, haz clic en el botón de la papelera que aparece al pasar el ratón.</p>
              </div>
            </Card>
          )}
        </SplitterPanel>
      </Splitter>
    </div>
  );
};

export default MainContentArea;
