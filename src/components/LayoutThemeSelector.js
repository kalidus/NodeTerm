import React, { useState, useEffect, useCallback, memo } from 'react';
import '../styles/components/theme-selector.css';

const LayoutThemeSelector = () => {
  const [currentLayout, setCurrentLayout] = useState('default');

  useEffect(() => {
    const savedLayout = localStorage.getItem('ui_layout') || 'default';
    setCurrentLayout(savedLayout);
  }, []);

  const handleLayoutChange = useCallback((layoutId) => {
    setCurrentLayout(layoutId);
    localStorage.setItem('ui_layout', layoutId);
    
    // Auto-sync icon theme for Cyberpunk
    if (layoutId === 'cyberpunk') {
      localStorage.setItem('iconTheme', 'cyberpunk');
      localStorage.setItem('iconThemeSidebar', 'cyberpunk');
      // Dispatch event to notify useThemeManagement and other components
      window.dispatchEvent(new CustomEvent('settings-updated', { 
        detail: { source: 'layout-sync' } 
      }));
    }
    
    // Update body classes
    document.body.classList.remove('layout-default', 'layout-cyberpunk');
    document.body.classList.add(`layout-${layoutId}`);
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
