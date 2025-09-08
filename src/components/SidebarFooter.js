import React from 'react';
import { Button } from 'primereact/button';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';

const SidebarFooter = ({ onConfigClick, allExpanded, toggleExpandAll, collapsed, onShowImportDialog }) => {
  if (collapsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <Button
          icon="pi pi-cog"
          className="p-button-rounded p-button-text sidebar-action-button"
          onClick={onConfigClick}
          tooltip="Configuración"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--ui-sidebar-footer-bg, #223)',
            color: 'var(--ui-sidebar-footer-fg, #fff)',
            border: 'none',
    display: 'flex',
    alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            cursor: 'pointer',
            margin: 4
          }}
        />
      </div>
    );
  }
  const handleAppMenuClick = (event) => {
    console.log('handleAppMenuClick SidebarFooter ejecutado - menú unificado');
    // Usar el menú unificado
    const menuStructure = createAppMenu(onShowImportDialog);
    createContextMenu(event, menuStructure, 'app-context-menu-unified');
  };
  
  return (
    <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 8px' }}>
      {/* Botón menú, expandir/plegar, config, etc. */}
      <Button
        icon="pi pi-bars"
        className="p-button-rounded p-button-text sidebar-action-button"
        onClick={handleAppMenuClick}
        tooltip="Menú de la aplicación"
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
    <Button
      icon={allExpanded ? "pi pi-angle-double-up" : "pi pi-angle-double-down"}
      className="p-button-rounded p-button-text sidebar-action-button"
      onClick={toggleExpandAll}
      tooltip={allExpanded ? "Plegar todo" : "Desplegar todo"}
    />
    <Button icon="pi pi-cog" className="p-button-rounded p-button-text sidebar-action-button" onClick={onConfigClick} tooltip="Configuración" />
      </div>
  </div>
);
};

export default SidebarFooter; 