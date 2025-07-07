import React from 'react';
import { Button } from 'primereact/button';

const SidebarFooter = ({ onConfigClick, allExpanded, toggleExpandAll }) => (
  <div className="sidebar-footer" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0.5rem 1rem',
    borderTop: '1px solid var(--ui-sidebar-border)',
    background: 'var(--ui-sidebar-bg)',
    minHeight: '48px',
    boxSizing: 'border-box',
    gap: '0.5rem'
  }}>
    <Button
      icon={allExpanded ? "pi pi-angle-double-up" : "pi pi-angle-double-down"}
      className="p-button-rounded p-button-text sidebar-action-button"
      onClick={toggleExpandAll}
      tooltip={allExpanded ? "Plegar todo" : "Desplegar todo"}
    />
    <Button icon="pi pi-cog" className="p-button-rounded p-button-text sidebar-action-button" onClick={onConfigClick} tooltip="Configuración" />
  </div>
);

export default SidebarFooter; 