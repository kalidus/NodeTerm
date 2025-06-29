import React from 'react';
import { Button } from 'primereact/button';

const SidebarFooter = ({ onConfigClick, version }) => (
  <div className="sidebar-footer" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 1rem',
    borderTop: '1px solid #e0e0e0',
    background: '#fff',
    minHeight: '48px',
    boxSizing: 'border-box'
  }}>
    <Button icon="pi pi-cog" className="p-button-text p-button-sm" onClick={onConfigClick} tooltip="Configuración" />
    <span style={{ fontSize: '0.9rem', color: '#888' }}>v{version}</span>
  </div>
);

export default SidebarFooter; 