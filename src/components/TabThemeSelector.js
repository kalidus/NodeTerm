import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { uiThemes } from '../themes/ui-themes';
import { themeManager } from '../utils/themeManager';

const TAB_THEME_STORAGE_KEY = 'nodeterm_tab_theme';

// Definición de estilos de pestañas
const tabThemes = {
  default: {
    name: 'Por Defecto',
    description: 'Respeta el tema de la interfaz seleccionado',
    preview: {
      backgroundColor: 'var(--ui-tab-bg)',
      borderRadius: '4px 4px 0 0',
      border: '1px solid var(--ui-tab-border)',
      transition: 'all 0.2s ease'
    },
    styles: {} // Se aplican dinámicamente desde el tema UI
  },
  
  futuristic: {
    name: 'Futurista',
    description: 'Pestañas con efectos cyber y neón',
    preview: {
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      borderRadius: '8px 8px 0 0',
      border: '1px solid #00d4ff',
      boxShadow: '0 0 10px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      '--ui-tab-active-bg': 'linear-gradient(135deg, #0f3460 0%, #16213e 50%, #1a1a2e 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(135deg, #16213e 0%, #1a1a2e 50%, #0f3460 100%)',
      '--ui-tab-text': '#00d4ff',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#00d4ff',
      '--ui-tab-close-hover': '#ff073a',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 0 10px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      '--tab-transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  
  minimalist: {
    name: 'Minimalista',
    description: 'Diseño limpio y simple',
    preview: {
      backgroundColor: '#fafafa',
      borderRadius: '0',
      border: 'none',
      borderBottom: '2px solid transparent',
      transition: 'border-bottom-color 0.2s ease'
    },
    styles: {
      '--ui-tab-bg': 'transparent',
      '--ui-tab-active-bg': '#ffffff',
      '--ui-tab-hover-bg': 'rgba(0,0,0,0.02)',
      '--ui-tab-text': '#666666',
      '--ui-tab-active-text': '#2196f3',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#f44336',
      '--tab-border-radius': '0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease',
      '--tab-border-bottom': '2px solid transparent',
      '--tab-active-border-bottom': '2px solid #2196f3'
    }
  },
  
  macos: {
    name: 'Estilo macOS',
    description: 'Elegante y suave como macOS',
    preview: {
      background: 'linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)',
      borderRadius: '8px 8px 0 0',
      border: '1px solid rgba(0,0,0,0.1)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      transition: 'all 0.25s ease-out'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)',
      '--ui-tab-active-bg': 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(180deg, #f8f8f8 0%, #ebebeb 100%)',
      '--ui-tab-text': '#333333',
      '--ui-tab-active-text': '#007aff',
      '--ui-tab-border': 'rgba(0,0,0,0.1)',
      '--ui-tab-close-hover': '#ff3b30',
      '--tab-border-radius': '8px 8px 0 0',
      '--tab-box-shadow': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      '--tab-transition': 'all 0.25s ease-out'
    }
  },
  
  retro80s: {
    name: 'Retro 80s',
    description: 'Nostálgico con colores neón',
    preview: {
      background: 'linear-gradient(45deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #ff006e',
      boxShadow: '0 0 15px rgba(255, 0, 110, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
      transition: 'all 0.3s ease'
    },
    styles: {
      '--ui-tab-bg': 'linear-gradient(45deg, #2d1b69 0%, #0c0c0c 50%, #2d1b69 100%)',
      '--ui-tab-active-bg': 'linear-gradient(45deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
      '--ui-tab-hover-bg': 'linear-gradient(45deg, #ff006e 0%, #2d1b69 50%, #3a86ff 100%)',
      '--ui-tab-text': '#ff006e',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': '#ff006e',
      '--ui-tab-close-hover': '#ffbe0b',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 0 15px rgba(255, 0, 110, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
      '--tab-transition': 'all 0.3s ease'
    }
  },
  
  material: {
    name: 'Material Design',
    description: 'Diseño moderno con elevación',
    preview: {
      backgroundColor: '#ffffff',
      borderRadius: '4px 4px 0 0',
      border: 'none',
      boxShadow: '0 2px 4px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.24)',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
    },
    styles: {
      '--ui-tab-bg': '#f5f5f5',
      '--ui-tab-active-bg': '#ffffff',
      '--ui-tab-hover-bg': '#eeeeee',
      '--ui-tab-text': '#424242',
      '--ui-tab-active-text': '#1976d2',
      '--ui-tab-border': 'transparent',
      '--ui-tab-close-hover': '#f44336',
      '--tab-border-radius': '4px 4px 0 0',
      '--tab-box-shadow': '0 2px 4px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.24)',
      '--tab-transition': 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      '--tab-active-elevation': '0 4px 8px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.26)'
    }
  },
  
  nord: {
    name: 'Nord',
    description: 'Colores fríos del ártico',
    preview: {
      backgroundColor: '#3b4252',
      borderRadius: '6px 6px 0 0',
      border: '1px solid #434c5e',
      transition: 'all 0.2s ease'
    },
    styles: {
      '--ui-tab-bg': '#3b4252',
      '--ui-tab-active-bg': '#2e3440',
      '--ui-tab-hover-bg': '#434c5e',
      '--ui-tab-text': '#d8dee9',
      '--ui-tab-active-text': '#88c0d0',
      '--ui-tab-border': '#434c5e',
      '--ui-tab-close-hover': '#bf616a',
      '--tab-border-radius': '6px 6px 0 0',
      '--tab-box-shadow': 'none',
      '--tab-transition': 'all 0.2s ease'
    }
  },
  
  glass: {
    name: 'Glass',
    description: 'Efecto de cristal transparente',
    preview: {
      background: 'rgba(255, 255, 255, 0.15)',
      borderRadius: '12px 12px 0 0',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
    },
    styles: {
      '--ui-tab-bg': 'rgba(255, 255, 255, 0.08)',
      '--ui-tab-active-bg': 'rgba(255, 255, 255, 0.15)',
      '--ui-tab-hover-bg': 'rgba(255, 255, 255, 0.12)',
      '--ui-tab-text': 'rgba(255, 255, 255, 0.8)',
      '--ui-tab-active-text': '#ffffff',
      '--ui-tab-border': 'rgba(255, 255, 255, 0.2)',
      '--ui-tab-close-hover': '#ff5555',
      '--tab-border-radius': '12px 12px 0 0',
      '--tab-box-shadow': '0 8px 32px rgba(0, 0, 0, 0.1)',
      '--tab-transition': 'all 0.3s ease',
      '--tab-backdrop-filter': 'blur(10px)'
    }
  }
};

const TabThemeSelector = () => {
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [currentUITheme, setCurrentUITheme] = useState('Light');

  useEffect(() => {
    // Cargar tema guardado
    const savedTheme = localStorage.getItem(TAB_THEME_STORAGE_KEY) || 'default';
    setSelectedTheme(savedTheme);
    
    // Aplicar tema
    applyTabTheme(savedTheme);
    
    // Escuchar cambios en el tema UI
    const handleThemeChange = () => {
      const currentTheme = themeManager.getCurrentTheme();
      if (currentTheme) {
        setCurrentUITheme(currentTheme.name);
        // Re-aplicar tema de pestañas si es default
        if (selectedTheme === 'default') {
          applyTabTheme('default');
        }
      }
    };
    
    window.addEventListener('theme-changed', handleThemeChange);
    
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, [selectedTheme]);

  const applyTabTheme = (themeName) => {
    const theme = tabThemes[themeName];
    if (!theme) return;

    // Obtener el elemento style para temas de pestañas
    let tabStyleElement = document.getElementById('tab-theme-styles');
    if (!tabStyleElement) {
      tabStyleElement = document.createElement('style');
      tabStyleElement.id = 'tab-theme-styles';
      document.head.appendChild(tabStyleElement);
    }

    let css = '';

    if (themeName === 'default') {
      // Para el tema default, no agregar CSS personalizado
      // Las variables CSS del tema UI se aplicarán automáticamente
      css = `
        /* Tema default - usa variables del tema UI */
        .p-tabview .p-tabview-nav li .p-tabview-nav-link {
          border-radius: var(--tab-border-radius, 4px 4px 0 0) !important;
          box-shadow: var(--tab-box-shadow, none) !important;
          transition: var(--tab-transition, all 0.2s ease) !important;
          backdrop-filter: var(--tab-backdrop-filter, none) !important;
        }
      `;
    } else {
      // Para temas personalizados, aplicar estilos específicos
      const styles = theme.styles;
      
      // Crear CSS personalizado
      css = `
        :root {
          ${Object.entries(styles).map(([key, value]) => `${key}: ${value};`).join('\n          ')}
        }
        
        .p-tabview .p-tabview-nav {
          background: var(--ui-tab-bg) !important;
        }
        
        .p-tabview .p-tabview-nav li .p-tabview-nav-link {
          background: var(--ui-tab-bg) !important;
          color: var(--ui-tab-text) !important;
          border: 1px solid var(--ui-tab-border) !important;
          border-radius: var(--tab-border-radius, 4px 4px 0 0) !important;
          box-shadow: var(--tab-box-shadow, none) !important;
          transition: var(--tab-transition, all 0.2s ease) !important;
          backdrop-filter: var(--tab-backdrop-filter, none) !important;
          border-bottom: var(--tab-border-bottom, 1px solid var(--ui-tab-border)) !important;
        }
        
        .p-tabview .p-tabview-nav li .p-tabview-nav-link:hover {
          background: var(--ui-tab-hover-bg) !important;
          ${styles['--tab-active-elevation'] ? 'box-shadow: var(--tab-active-elevation) !important;' : ''}
        }
        
        .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
          background: var(--ui-tab-active-bg) !important;
          color: var(--ui-tab-active-text) !important;
          border-bottom: var(--tab-active-border-bottom, none) !important;
          ${styles['--tab-active-elevation'] ? 'box-shadow: var(--tab-active-elevation) !important;' : ''}
        }
        
        /* Efectos especiales para ciertos temas */
        ${themeName === 'futuristic' ? `
          .p-tabview .p-tabview-nav li .p-tabview-nav-link::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent 30%, rgba(0, 212, 255, 0.1) 50%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
          }
          
          .p-tabview .p-tabview-nav li .p-tabview-nav-link:hover::before {
            opacity: 1;
          }
          
          .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
            animation: futuristic-glow 2s ease-in-out infinite alternate;
          }
          
          @keyframes futuristic-glow {
            from { box-shadow: 0 0 10px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1); }
            to { box-shadow: 0 0 20px rgba(0, 212, 255, 0.6), inset 0 1px 0 rgba(255,255,255,0.2); }
          }
        ` : ''}
        
        ${themeName === 'retro80s' ? `
          .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
            animation: retro-pulse 1.5s ease-in-out infinite alternate;
          }
          
          @keyframes retro-pulse {
            from { box-shadow: 0 0 15px rgba(255, 0, 110, 0.5), inset 0 1px 0 rgba(255,255,255,0.2); }
            to { box-shadow: 0 0 25px rgba(255, 0, 110, 0.8), inset 0 1px 0 rgba(255,255,255,0.4); }
          }
        ` : ''}
      `;
    }

    tabStyleElement.textContent = css;
  };

  const handleThemeSelect = (themeName) => {
    setSelectedTheme(themeName);
    localStorage.setItem(TAB_THEME_STORAGE_KEY, themeName);
    applyTabTheme(themeName);
  };

  const TabPreview = ({ theme, isSelected, onClick }) => {
    const previewStyle = {
      ...theme.preview,
      width: '100%',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      cursor: 'pointer',
      border: isSelected ? '2px solid var(--primary-color)' : theme.preview.border || '1px solid #ddd',
      marginBottom: '8px'
    };

    return (
      <div style={previewStyle} onClick={onClick}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 12px'
        }}>
          <i className="pi pi-desktop" style={{ 
            fontSize: '14px',
            color: theme.styles?.['--ui-tab-text'] || '#666'
          }} />
          <span style={{ 
            fontSize: '12px',
            color: theme.styles?.['--ui-tab-text'] || '#666',
            fontWeight: '500'
          }}>
            Terminal
          </span>
          <i className="pi pi-times" style={{ 
            fontSize: '10px',
            color: theme.styles?.['--ui-tab-text'] || '#666',
            opacity: 0.7
          }} />
        </div>
        
        {isSelected && (
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '16px',
            height: '16px',
            backgroundColor: 'var(--primary-color)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="pi pi-check" style={{ 
              fontSize: '8px',
              color: 'white'
            }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      padding: '1rem 0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      width: '100%'
    }}>
      <h3 style={{ 
        margin: '0 0 1rem 0', 
        color: 'var(--text-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <i className="pi pi-palette" style={{ color: 'var(--primary-color)' }}></i>
        Estilos de Pestañas
      </h3>
      
      <p style={{
        marginBottom: '2rem',
        color: 'var(--text-color-secondary)',
        fontSize: '0.9rem',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        Personaliza el aspecto de las pestañas con diferentes estilos. Los cambios se aplican inmediatamente.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1200px',
        padding: '0 1rem'
      }}>
        {Object.entries(tabThemes).map(([key, theme]) => (
          <Card
            key={key}
            style={{
              background: 'var(--surface-card)',
              border: selectedTheme === key ? '2px solid var(--primary-color)' : '1px solid var(--surface-border)',
              borderRadius: '8px',
              padding: '0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: selectedTheme === key ? 'translateY(-2px)' : 'none',
              boxShadow: selectedTheme === key ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onClick={() => handleThemeSelect(key)}
          >
            <div style={{ padding: '1rem' }}>
              <TabPreview 
                theme={theme} 
                isSelected={selectedTheme === key}
                onClick={() => handleThemeSelect(key)}
              />
              
              <h4 style={{
                margin: '0 0 0.5rem 0',
                color: 'var(--text-color)',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                {theme.name}
              </h4>
              
              <p style={{
                margin: '0',
                color: 'var(--text-color-secondary)',
                fontSize: '0.85rem',
                lineHeight: '1.4'
              }}>
                {theme.description}
              </p>
              
              {selectedTheme === key && (
                <div style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--primary-color)',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  <i className="pi pi-check-circle" style={{ fontSize: '0.8rem' }} />
                  Tema activo
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'var(--surface-100)',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <i className="pi pi-info-circle" style={{ 
            color: 'var(--primary-color)',
            fontSize: '0.9rem'
          }} />
          <strong style={{ 
            color: 'var(--text-color)',
            fontSize: '0.9rem'
          }}>
            Información
          </strong>
        </div>
        <p style={{
          margin: '0',
          color: 'var(--text-color-secondary)',
          fontSize: '0.8rem',
          lineHeight: '1.4'
        }}>
          El tema "Por Defecto" adapta automáticamente el estilo de las pestañas al tema de interfaz seleccionado. 
          Los demás temas son independientes y conservan su apariencia sin importar el tema de la interfaz.
        </p>
      </div>
    </div>
  );
};

export default TabThemeSelector;
