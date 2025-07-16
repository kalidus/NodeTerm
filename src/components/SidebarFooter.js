import React from 'react';
import { Button } from 'primereact/button';

const SidebarFooter = ({ onConfigClick, allExpanded, toggleExpandAll }) => {
  const openInBrowser = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('open-in-browser');
    } else {
      // Fallback para desarrollo
      window.open('http://localhost:8080', '_blank');
    }
  };

  return (
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
      <Button
        icon="pi pi-globe"
        className="p-button-rounded p-button-text sidebar-action-button"
        onClick={openInBrowser}
        tooltip="Abrir como app web (PWA)"
      />
      <Button icon="pi pi-cog" className="p-button-rounded p-button-text sidebar-action-button" onClick={onConfigClick} tooltip="Configuración" />
    </div>
  );
};

export default SidebarFooter; 