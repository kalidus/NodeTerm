import React, { useState, useEffect, useCallback, memo } from 'react';
import { themeManager } from '../utils/themeManager';
import { applyUILayoutFromStorage, UI_LAYOUT_STORAGE_KEY } from '../utils/appearanceLayout';
import { persistSyncedSetting } from '../utils/persistSyncedSetting';
import '../styles/components/theme-selector.css';

const LayoutThemeSelector = () => {
  const [currentLayout, setCurrentLayout] = useState('default');

  const syncLayoutFromStorage = useCallback(() => {
    const layoutId = applyUILayoutFromStorage();
    setCurrentLayout(layoutId);
  }, []);

  useEffect(() => {
    syncLayoutFromStorage();
    window.addEventListener('localstorage-sync-ready', syncLayoutFromStorage);
    window.addEventListener('settings-updated', syncLayoutFromStorage);
    return () => {
      window.removeEventListener('localstorage-sync-ready', syncLayoutFromStorage);
      window.removeEventListener('settings-updated', syncLayoutFromStorage);
    };
  }, [syncLayoutFromStorage]);

  const handleLayoutChange = useCallback((layoutId) => {
    setCurrentLayout(layoutId);
    persistSyncedSetting(UI_LAYOUT_STORAGE_KEY, layoutId);
    
    // Auto-sync icon theme for Cyberpunk
    if (layoutId === 'cyberpunk') {
      localStorage.setItem('iconTheme', 'cyberpunk');
      localStorage.setItem('iconThemeSidebar', 'cyberpunk');
      // Dispatch event to notify useThemeManagement and other components
      window.dispatchEvent(new CustomEvent('settings-updated', { 
        detail: { source: 'layout-sync' } 
      }));
    }
    
    applyUILayoutFromStorage();

    themeManager.refreshTitlebarForCurrentLayout();
    window.dispatchEvent(new Event('layout-changed'));
  }, []);

  const layouts = [
    {
      id: 'default',
      name: 'Moderno (Redondeado)',
      description: 'El diseño original de NodeTerm con bordes redondeados y sombras suaves.',
      icon: 'pi-th-large',
      preview: () => (
        <div style={{
          width: '100%',
          height: '120px',
          backgroundColor: 'var(--ui-content-bg)',
          borderRadius: '8px',
          border: '1px solid var(--ui-tab-border)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ width: '60%', height: '16px', backgroundColor: 'var(--ui-button-primary)', borderRadius: '4px' }}></div>
          <div style={{ width: '100%', height: '40px', backgroundColor: 'var(--ui-tab-bg)', borderRadius: '8px', border: '1px solid var(--ui-tab-border)' }}></div>
          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
            <div style={{ padding: '4px 12px', backgroundColor: 'var(--ui-button-primary)', borderRadius: '4px', fontSize: '10px', color: '#fff' }}>Boton</div>
          </div>
        </div>
      )
    },
    {
      id: 'unified',
      name: 'Unificado (Seamless)',
      description: 'Estilo continuo sin bordes ni márgenes. La barra de título, la barra lateral y la pantalla de contenido se integran.',
      icon: 'pi-window-minimize',
      preview: () => (
        <div style={{
          width: '100%',
          height: '120px',
          backgroundColor: 'var(--ui-content-bg)',
          borderRadius: '0px',
          border: '1px solid var(--ui-sidebar-border, rgba(255,255,255,0.08))',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Titlebar mockup */}
          <div style={{ width: '100%', height: '18px', backgroundColor: 'var(--ui-chrome-header-bg, var(--ui-sidebar-bg))', borderBottom: '1px solid var(--ui-sidebar-border, rgba(255,255,255,0.08))', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
            <div style={{ width: '28px', height: '4px', backgroundColor: 'var(--ui-sidebar-text, rgba(255,255,255,0.3))', borderRadius: '2px' }}></div>
          </div>
          {/* Main Area mockup */}
          <div style={{ display: 'flex', flex: 1 }}>
            {/* Sidebar mockup */}
            <div style={{ width: '25%', height: '100%', backgroundColor: 'var(--ui-sidebar-bg)', borderRight: '1px solid var(--ui-sidebar-border, rgba(255,255,255,0.08))' }}></div>
            {/* Content mockup */}
            <div style={{ flex: 1, height: '100%', backgroundColor: 'var(--ui-content-bg)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--ui-tab-bg, rgba(255,255,255,0.05))', border: '1px solid var(--ui-tab-border, rgba(255,255,255,0.1))' }}></div>
              <div style={{ width: '100%', flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--ui-tab-border, rgba(255,255,255,0.05))' }}></div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cyberpunk',
      name: 'Cyberpunk (Angular)',
      description: 'Estética futurista con bordes rectos, fuentes tecnológicas y luces de neón.',
      icon: 'pi-bolt',
      preview: () => (
        <div style={{
          width: '100%',
          height: '120px',
          backgroundColor: 'var(--ui-content-bg)',
          borderRadius: '0px',
          border: '1px solid var(--ui-tab-border)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontFamily: "'Share Tech Mono', 'Orbitron', monospace"
        }}>
          <div style={{ width: '60%', height: '16px', backgroundColor: 'var(--ui-button-primary)', borderRadius: '0px', boxShadow: '0 0 5px var(--ui-button-primary)' }}></div>
          <div style={{ width: '100%', height: '40px', backgroundColor: 'var(--ui-tab-bg)', borderRadius: '0px', border: '1px solid var(--ui-button-primary)' }}></div>
          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
            <div style={{ padding: '4px 12px', backgroundColor: 'transparent', border: '1px solid var(--ui-button-primary)', borderRadius: '0px', fontSize: '10px', color: 'var(--ui-button-primary)', boxShadow: '0 0 5px var(--ui-button-primary)' }}>BOTON</div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="theme-selector-container">
      <div className="theme-explore-section">
        <div className="theme-explore-header">
          <div className="theme-explore-title">
            <i className="pi pi-th-large"></i>
            Estilos
          </div>
        </div>

        <div className="theme-thumbnails-container">
          <div
            className="theme-thumbnails-grid themes-per-row-2"
            style={{
              gridTemplateColumns: `repeat(2, 1fr)`
            }}
          >
            {layouts.map((layout) => (
              <div
                key={layout.id}
                className={`theme-thumbnail ${currentLayout === layout.id ? 'active' : ''}`}
                onClick={() => handleLayoutChange(layout.id)}
              >
                {currentLayout === layout.id && (
                  <div className="theme-thumbnail-check">
                    <i className="pi pi-check"></i>
                  </div>
                )}
                
                {layout.preview()}

                <div className="theme-thumbnail-info" style={{ marginTop: '1rem' }}>
                  <span className="theme-thumbnail-name" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                    <i className={`pi ${layout.icon}`} style={{ marginRight: '8px' }}></i>
                    {layout.name}
                  </span>
                  <div style={{ fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.4 }}>
                    {layout.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutThemeSelector;
