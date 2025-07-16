import React from 'react';
import { Button } from 'primereact/button';
import { Tree } from 'primereact/tree';
import { Divider } from 'primereact/divider';
import SidebarFooter from './SidebarFooter';
import { uiThemes } from '../themes/ui-themes';

const Sidebar = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  nodes,
  selectedNodeKey,
  setSelectedNodeKey,
  expandedKeys,
  setExpandedKeys,
  allExpanded,
  toggleExpandAll,
  setShowSSHDialog,
  openNewFolderDialog,
  setShowCreateGroupDialog,
  setShowSettingsDialog,
  onTreeAreaContextMenu,
  onDragDrop,
  setDraggedNodeKey,
  nodeTemplate,
  iconTheme,
  explorerFont,
  explorerFontSize = 14,
  uiTheme = 'Light' // Nuevo prop para el tema activo
}) => {
  const colors = uiThemes[uiTheme]?.colors || uiThemes['Light'].colors;
  return (
    <div 
      className="sidebar-container"
      style={{
        transition: sidebarCollapsed ? 'max-width 0.2s, min-width 0.2s, width 0.2s' : 'width 0.2s',
        width: sidebarCollapsed ? 44 : undefined,
        minWidth: sidebarCollapsed ? 44 : 240,
        maxWidth: sidebarCollapsed ? 44 : undefined,
        padding: 0,
        height: '100vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: explorerFont,
        fontSize: `${explorerFontSize}px`
      }}>
      {sidebarCollapsed ? (
        // Iconos alineados arriba, más juntos y barra más fina
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'flex-start', 
          gap: '0.25rem', 
          width: '100%', 
          paddingTop: 2, 
          position: 'relative' 
        }}>
          <Button 
            icon={sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'} 
            className="p-button-rounded p-button-text sidebar-action-button" 
            onClick={() => setSidebarCollapsed(v => !v)} 
            tooltip={sidebarCollapsed ? 'Expandir panel lateral' : 'Colapsar panel lateral'} 
            tooltipOptions={{ position: 'right' }} 
            style={{ 
              margin: 0, 
              width: 40, 
              height: 40, 
              minWidth: 40, 
              minHeight: 40, 
              fontSize: 18,
              backgroundColor: colors.sidebarBackground,
              color: colors.sidebarText,
              border: 'none'
            }} 
          />
          <Button 
            icon="pi pi-server" 
            className="p-button-rounded p-button-text sidebar-action-button" 
            onClick={() => setShowSSHDialog(true)} 
            tooltip="Nueva conexión SSH" 
            tooltipOptions={{ position: 'right' }} 
            style={{ 
              margin: 0, 
              width: 40, 
              height: 40, 
              minWidth: 40, 
              minHeight: 40, 
              fontSize: 18,
              backgroundColor: colors.sidebarBackground,
              color: colors.sidebarText,
              border: 'none'
            }} 
          />
          {/* Ocultar el botón de crear carpeta cuando la sidebar está colapsada */}
          {!sidebarCollapsed && (
            <Button 
              icon="pi pi-plus" 
              className="p-button-rounded p-button-text sidebar-action-button" 
              onClick={() => openNewFolderDialog(null)} 
              tooltip="Crear carpeta" 
              tooltipOptions={{ position: 'right' }} 
              style={{ 
                margin: 0, 
                width: 40, 
                height: 40, 
                minWidth: 40, 
                minHeight: 40, 
                fontSize: 18,
                backgroundColor: colors.sidebarBackground,
                color: colors.sidebarText,
                border: 'none'
              }} 
            />
          )}
          {/* Ocultar el botón de desplegar/plegar todo cuando la sidebar está colapsada */}
          {!sidebarCollapsed && (
            <Button 
              icon={allExpanded ? "pi pi-angle-double-up" : "pi pi-angle-double-down"} 
              className="p-button-rounded p-button-text sidebar-action-button" 
              onClick={toggleExpandAll} 
              tooltip={allExpanded ? "Plegar todo" : "Desplegar todo"} 
              tooltipOptions={{ position: 'right' }} 
              style={{ 
                margin: 0, 
                width: 40, 
                height: 40, 
                minWidth: 40, 
                minHeight: 40, 
                fontSize: 18,
                backgroundColor: colors.sidebarBackground,
                color: colors.sidebarText,
                border: 'none'
              }} 
            />
          )}
          <Button 
            icon="pi pi-th-large" 
            className="p-button-rounded p-button-text sidebar-action-button" 
            onClick={() => setShowCreateGroupDialog(true)} 
            tooltip="Crear grupo de pestañas" 
            tooltipOptions={{ position: 'right' }} 
            style={{ 
              margin: 0, 
              width: 40, 
              height: 40, 
              minWidth: 40, 
              minHeight: 40, 
              fontSize: 18,
              backgroundColor: colors.sidebarBackground,
              color: colors.sidebarText,
              border: 'none'
            }} 
          />
          
          {/* Footer unificado abajo */}
          <div style={{ position: 'absolute', bottom: 8, left: 0, width: '100%' }}>
            <SidebarFooter 
              onConfigClick={() => setShowSettingsDialog(true)} 
              allExpanded={allExpanded}
              toggleExpandAll={toggleExpandAll}
              collapsed={sidebarCollapsed}
            />
          </div>
        </div>
      ) : (
        // Sidebar completa
        <>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.5rem 0.25rem 0.5rem' }}>
            <Button 
              icon={sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'} 
              className="p-button-rounded p-button-text sidebar-action-button" 
              onClick={() => setSidebarCollapsed(v => !v)} 
              tooltip={sidebarCollapsed ? 'Expandir panel lateral' : 'Colapsar panel lateral'} 
              tooltipOptions={{ position: 'bottom' }} 
              style={{ marginRight: 8 }} 
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <Button 
                icon="pi pi-server" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={() => setShowSSHDialog(true)} 
                tooltip="Nueva conexión SSH" 
                tooltipOptions={{ position: 'bottom' }} 
              />
              <Button 
                icon="pi pi-plus" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={() => openNewFolderDialog(null)} 
                tooltip="Crear carpeta" 
                tooltipOptions={{ position: 'bottom' }} 
              />
              <Button 
                icon="pi pi-th-large" 
                className="p-button-rounded p-button-text sidebar-action-button" 
                onClick={() => setShowCreateGroupDialog(true)} 
                tooltip="Crear grupo de pestañas" 
                tooltipOptions={{ position: 'bottom' }} 
              />
            </div>
          </div>
          <Divider className="my-2" />
          
          <div 
            style={{ 
              flex: 1, 
              minHeight: 0, 
              overflowY: 'auto', 
              overflowX: 'hidden',
              position: 'relative',
              fontSize: `${explorerFontSize}px`
            }}
            onContextMenu={onTreeAreaContextMenu}
            className="tree-container"
          >
            <Tree
              value={nodes}
              selectionMode="single"
              selectionKeys={selectedNodeKey}
              onSelectionChange={e => {
                setSelectedNodeKey(e.value);
              }}
              dragdropScope="files"
              onDragDrop={onDragDrop}
              onDragStart={e => {
                if (e.node) {
                  setDraggedNodeKey(e.node.key);
                }
              }}
              onDragEnd={() => {}}
              className="sidebar-tree"
              style={{ fontSize: `${explorerFontSize}px` }}
              nodeTemplate={nodeTemplate}
              filter
              filterMode="strict"
              filterPlaceholder="Buscar..."
              expandedKeys={expandedKeys}
              onToggle={e => setExpandedKeys(e.value)}
            />
          </div>
          
          <SidebarFooter 
            onConfigClick={() => setShowSettingsDialog(true)} 
            allExpanded={allExpanded}
            toggleExpandAll={toggleExpandAll}
            collapsed={sidebarCollapsed}
          />
        </>
      )}
    </div>
  );
};

export default Sidebar; 