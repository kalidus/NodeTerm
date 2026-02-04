import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { sessionActionIconThemes } from '../themes/session-action-icons';

const SidebarFooter = ({ onConfigClick, allExpanded, toggleExpandAll, collapsed, onShowImportDialog, onShowExportDialog, onShowImportExportDialog, sessionActionIconTheme = 'modern', onUpdateStatusClick }) => {
  const { t } = useTranslation('common');
  const { t: tSettings } = useTranslation('settings');
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle | available | downloaded

  useEffect(() => {
    if (!window.electron?.updater) return;
    const handleUpdaterEvent = (ev) => {
      const { event } = ev;
      if (event === 'update-available') setUpdateStatus('available');
      else if (event === 'update-downloaded') setUpdateStatus('downloaded');
      else if (event === 'update-not-available' || event === 'error') setUpdateStatus('idle');
    };
    window.electron.updater.getUpdateInfo?.().then((result) => {
      if (result?.isUpdateDownloaded) setUpdateStatus('downloaded');
      else if (result?.updateAvailable) setUpdateStatus('available');
    }).catch(() => {});
    const unsubscribe = window.electron.ipcRenderer?.on?.('updater-event', handleUpdaterEvent);
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);
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
    const menuStructure = createAppMenu(onShowImportDialog, onShowExportDialog, onShowImportExportDialog, t);
    createContextMenu(event, menuStructure, 'app-context-menu-unified');
  };
  
  const handleUpdateStatusClick = () => {
    if (onUpdateStatusClick) onUpdateStatusClick();
    else if (onConfigClick) onConfigClick();
  };

  return (
    <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 8px' }}>
      {/* Botón menú */}
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
          padding: 0,
          flexShrink: 0
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
      {/* Centro: icono de estado de actualización (solo si hay actualización disponible o descargada) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
        {updateStatus !== 'idle' && (
          <Button
            className="p-button-rounded p-button-text sidebar-action-button glass-button"
            onClick={handleUpdateStatusClick}
            tooltip={updateStatus === 'downloaded' ? tSettings('updateChannels.downloadCompleteDetail') : tSettings('updateChannels.available')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              padding: 0,
              color: updateStatus === 'downloaded' ? 'var(--green-500)' : 'var(--primary-color)'
            }}
          >
            <i className={updateStatus === 'downloaded' ? 'pi pi-check-circle' : 'pi pi-cloud-download'} style={{ fontSize: '1.1rem' }} />
          </Button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
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