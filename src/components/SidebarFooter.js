import React from 'react';
import { Button } from 'primereact/button';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';
import { useTranslation } from '../i18n/hooks/useTranslation';

const SidebarFooter = ({ onConfigClick, allExpanded, toggleExpandAll, collapsed, onShowImportDialog }) => {
  const { t } = useTranslation('common');
  if (collapsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <Button
          icon="pi pi-cog"
          className="p-button-rounded p-button-text sidebar-action-button"
          onClick={onConfigClick}
          tooltip={t('tooltips.settings')}
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
    // Handle app menu click
    // Usar el menú unificado
    const menuStructure = createAppMenu(onShowImportDialog, t);
    createContextMenu(event, menuStructure, 'app-context-menu-unified');
  };
  
  return (
    <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 8px' }}>
      {/* Botón menú, expandir/plegar, config, etc. */}
      <Button
        icon="pi pi-bars"
        className="p-button-rounded p-button-text sidebar-action-button"
        onClick={handleAppMenuClick}
        tooltip={t('tooltips.appMenu')}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
    <Button
      icon={allExpanded ? "pi pi-angle-double-up" : "pi pi-angle-double-down"}
      className="p-button-rounded p-button-text sidebar-action-button"
      onClick={toggleExpandAll}
      tooltip={allExpanded ? t('tooltips.collapseAll') : t('tooltips.expandAll')}
    />
    <Button icon="pi pi-cog" className="p-button-rounded p-button-text sidebar-action-button" onClick={onConfigClick} tooltip={t('tooltips.settings')} />
      </div>
  </div>
);
};

export default SidebarFooter; 