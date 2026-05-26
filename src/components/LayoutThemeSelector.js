import React, { useState, useEffect, useCallback, memo } from 'react';
import { themeManager } from '../utils/themeManager';
import { applyUILayoutFromStorage, UI_LAYOUT_STORAGE_KEY } from '../utils/appearanceLayout';
import { persistSyncedSetting } from '../utils/persistSyncedSetting';
import '../styles/components/layout-theme-selector.css';

const LayoutThemeSelector = () => {
  const [currentLayout, setCurrentLayout] = useState('unified');

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
      localStorage.setItem('iconTheme', 'cyber_blue');
      localStorage.setItem('iconThemeSidebar', 'cyber_blue');
      // Dispatch event to notify useThemeManagement and other components
      window.dispatchEvent(new CustomEvent('settings-updated', { 
        detail: { source: 'layout-sync' } 
      }));
    } else if (layoutId === 'unified') {
      localStorage.setItem('iconTheme', 'cupertino');
      localStorage.setItem('iconThemeSidebar', 'cupertino');
      // Dispatch event to notify useThemeManagement and other components
      window.dispatchEvent(new CustomEvent('settings-updated', { 
        detail: { source: 'layout-sync' } 
      }));
    } else if (layoutId === 'default') {
      localStorage.setItem('iconTheme', 'ghost_ui');
      localStorage.setItem('iconThemeSidebar', 'ghost_ui');
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
      description: 'El diseño original de NodeTerm con bordes redondeados, márgenes sutiles y sombras suaves.',
      icon: 'pi-th-large',
      preview: () => (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0f1d',
          padding: '6px',
          boxSizing: 'border-box',
          gap: '5px'
        }}>
          {/* Header/Titlebar Mockup */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 4px',
            backgroundColor: '#111827',
            borderRadius: '4px',
            height: '14px'
          }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
            <div style={{ flex: 1, height: '3px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginLeft: '6px' }}></div>
          </div>
          {/* Workspace Area Mockup with cards and rounded corners */}
          <div style={{ display: 'flex', flex: 1, gap: '6px', minHeight: 0 }}>
            {/* Sidebar Card */}
            <div style={{
              width: '28%',
              backgroundColor: '#111827',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              padding: '4px',
              gap: '3px',
              boxSizing: 'border-box'
            }}>
              <div style={{ width: '80%', height: '4px', backgroundColor: 'var(--ui-button-primary, #6366f1)', borderRadius: '2px' }}></div>
              <div style={{ width: '60%', height: '3px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '1.5px' }}></div>
              <div style={{ width: '70%', height: '3px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '1.5px' }}></div>
            </div>
            {/* Content Card */}
            <div style={{
              flex: 1,
              backgroundColor: '#1f2937',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxSizing: 'border-box',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              {/* Tab mockup */}
              <div style={{ width: '45%', height: '8px', backgroundColor: '#111827', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.06)' }}></div>
              {/* Terminal Area */}
              <div style={{ flex: 1, backgroundColor: '#0a0f1d', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}></div>
            </div>
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
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0f1d',
          boxSizing: 'border-box'
        }}>
          {/* Seamless Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            backgroundColor: '#111827',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            height: '16px'
          }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
            <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginLeft: '6px', maxWidth: '80px' }}></div>
          </div>
          {/* Integrated Workspace (No margins between sections) */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* Seamless Sidebar */}
            <div style={{
              width: '25%',
              backgroundColor: '#111827',
              borderRight: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              padding: '4px',
              gap: '3px',
              boxSizing: 'border-box'
            }}>
              <div style={{ width: '80%', height: '4px', backgroundColor: 'var(--ui-button-primary, #6366f1)', borderRadius: '1px' }}></div>
              <div style={{ width: '70%', height: '3px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
              <div style={{ width: '60%', height: '3px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
            </div>
            {/* Seamless Content (No outer border, integrated directly) */}
            <div style={{
              flex: 1,
              backgroundColor: '#0a0f1d',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}>
              {/* Integrated tabs */}
              <div style={{ display: 'flex', backgroundColor: '#111827', height: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ width: '30%', backgroundColor: '#0a0f1d', borderRight: '1px solid rgba(255, 255, 255, 0.05)' }}></div>
                <div style={{ width: '25%', backgroundColor: '#111827' }}></div>
              </div>
              {/* Terminal Workspace */}
              <div style={{ flex: 1, padding: '4px' }}>
                <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255, 255, 255, 0.03)' }}></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cyberpunk',
      name: 'Cyberpunk (Angular)',
      description: 'Estética futurista con bordes rectos, fuentes tecnológicas y luces de neón vibrantes.',
      icon: 'pi-bolt',
      preview: () => (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#05070f',
          padding: '6px',
          boxSizing: 'border-box',
          gap: '6px',
          border: '1px solid #ff0055'
        }}>
          {/* Cyberpunk Titlebar (sharp, high-contrast) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 4px',
            backgroundColor: '#0d1117',
            border: '1px solid #00f0ff',
            height: '12px'
          }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              <div style={{ width: '3px', height: '3px', backgroundColor: '#ff0055' }}></div>
              <div style={{ width: '3px', height: '3px', backgroundColor: '#00f0ff' }}></div>
            </div>
            <div style={{ fontSize: '5px', color: '#00f0ff', fontFamily: 'monospace', transform: 'scale(0.8)' }}>SYSTEM_TERM</div>
          </div>
          {/* Workspace Area with straight edges */}
          <div style={{ display: 'flex', flex: 1, gap: '6px', minHeight: 0 }}>
            {/* Cyberpunk Sidebar (flat, neon borders) */}
            <div style={{
              width: '28%',
              backgroundColor: '#0d1117',
              border: '1px solid #ff0055',
              display: 'flex',
              flexDirection: 'column',
              padding: '4px',
              gap: '3px',
              boxSizing: 'border-box'
            }}>
              <div style={{ width: '90%', height: '4px', backgroundColor: '#ff0055' }}></div>
              <div style={{ width: '70%', height: '2px', backgroundColor: '#00f0ff' }}></div>
              <div style={{ width: '60%', height: '2px', backgroundColor: '#00f0ff' }}></div>
            </div>
            {/* Cyberpunk Content */}
            <div style={{
              flex: 1,
              backgroundColor: '#0d1117',
              border: '1px solid #00f0ff',
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxSizing: 'border-box',
              boxShadow: '0 0 8px rgba(0,240,255,0.15)'
            }}>
              <div style={{ width: '50%', height: '8px', border: '1px solid #ff0055', backgroundColor: '#05070f' }}></div>
              <div style={{ flex: 1, backgroundColor: '#05070f', border: '1px solid #00f0ff' }}></div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="layout-selector-container">
      <div className="layout-selector-explore">
        <div className="layout-selector-header">
          <i className="pi pi-th-large"></i>
          <span className="layout-selector-title">Estilos</span>
        </div>

        <div className="layout-selector-content">
          <div className="layout-selector-grid">
            {layouts.map((layout) => (
              <div
                key={layout.id}
                className={`layout-card ${currentLayout === layout.id ? 'active' : ''}`}
                onClick={() => handleLayoutChange(layout.id)}
              >
                {currentLayout === layout.id && (
                  <div className="layout-check-badge">
                    <i className="pi pi-check"></i>
                  </div>
                )}
                
                <div className="layout-preview-wrapper">
                  {layout.preview()}
                </div>

                <div className="layout-info">
                  <span className="layout-name">
                    <i className={`pi ${layout.icon}`}></i>
                    {layout.name}
                  </span>
                  <p className="layout-description">
                    {layout.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(LayoutThemeSelector);
