import React from 'react';
import { Button } from 'primereact/button';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { sessionActionIconThemes } from '../themes/session-action-icons';

const SidebarFooter = ({ onConfigClick, allExpanded, toggleExpandAll, collapsed, onShowImportDialog, sessionActionIconTheme = 'modern' }) => {
  const { t } = useTranslation('common');
  if (collapsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <Button
          className="p-button-rounded p-button-text sidebar-action-button glass-button"
          onClick={onConfigClick}
          tooltip={t('tooltips.settings')}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--ui-sidebar-footer-bg, #223)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            margin: 4,
            padding: 0
          }}
        >
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            color: 'var(--ui-sidebar-footer-fg, #fff)'
          }}>
            {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.settings}
          </span>
        </Button>
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
        className="p-button-rounded p-button-text sidebar-action-button glass-button"
        onClick={handleAppMenuClick}
        tooltip={t('tooltips.appMenu')}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          padding: 0
        }}
      >
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          color: 'var(--ui-sidebar-text)'
        }}>
          {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.menu}
        </span>
      </Button>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          className="p-button-rounded p-button-text sidebar-action-button glass-button"
          onClick={toggleExpandAll}
          tooltip={allExpanded ? t('tooltips.collapseAll') : t('tooltips.expandAll')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            padding: 0
          }}
        >
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            color: 'var(--ui-sidebar-text)'
          }}>
            {allExpanded 
              ? sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.collapseAll
              : sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.expandAll
            }
          </span>
        </Button>
        <Button 
          className="p-button-rounded p-button-text sidebar-action-button glass-button" 
          onClick={onConfigClick} 
          tooltip={t('tooltips.settings')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            padding: 0
          }}
        >
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            color: 'var(--ui-sidebar-text)'
          }}>
            {sessionActionIconThemes[sessionActionIconTheme || 'modern']?.icons.settings}
          </span>
        </Button>
      </div>
  </div>
);
};

export default SidebarFooter; 