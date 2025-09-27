import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { TabView, TabPanel } from 'primereact/tabview';
import { themeManager } from '../utils/themeManager';
import { uiThemes, CLASSIC_UI_KEYS, FUTURISTIC_UI_KEYS } from '../themes/ui-themes';

const ThemeSelector = ({ showPreview = false }) => {
  const [currentTheme, setCurrentTheme] = useState('Light');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    // Cargar el tema actual
    const savedTheme = localStorage.getItem('ui_theme') || 'Light';
    setCurrentTheme(savedTheme);
  }, []);

  const handleThemeChange = (themeName) => {
    console.log('[THEME SELECTOR] Cambiando tema a:', themeName);
    console.log('[THEME SELECTOR] localStorage antes del cambio:', localStorage.getItem('ui_theme'));
    
    setCurrentTheme(themeName);
    themeManager.applyTheme(themeName);
    
    // Verificar que se guardó correctamente
    setTimeout(() => {
      const savedTheme = localStorage.getItem('ui_theme');
      console.log('[THEME SELECTOR] localStorage después del cambio:', savedTheme);
      if (savedTheme !== themeName) {
        console.error('[THEME SELECTOR] ERROR: No se guardó correctamente en localStorage!');
      } else {
        console.log('[THEME SELECTOR] ✓ Tema guardado correctamente en localStorage');
      }
    }, 100);
  };

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  const ThemeCard = ({ theme, isActive, onClick }) => {
    const colors = theme.colors;
    
    return (
      <Card
        className={`theme-card ${isActive ? 'theme-card-active' : ''}`}
        style={{
          minWidth: '280px',
          maxWidth: '320px',
          margin: '10px',
          cursor: 'pointer',
          border: isActive ? '3px solid var(--primary-color)' : '2px solid #ddd',
          borderRadius: '12px',
          transition: 'all 0.2s ease',
          transform: isActive ? 'scale(1.02)' : 'scale(1)',
          boxShadow: isActive 
            ? '0 8px 25px rgba(0, 0, 0, 0.15)' 
            : '0 4px 15px rgba(0, 0, 0, 0.1)'
        }}
        onClick={onClick}
      >
        <div style={{ padding: '15px' }}>
          {/* Header con nombre del tema */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '15px'
          }}>
            <h4 style={{ 
              margin: 0, 
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'var(--text-color)'
            }}>
              {theme.name}
            </h4>
            {isActive && (
              <Badge 
                value="Activo" 
                severity="success" 
                style={{ fontSize: '10px' }}
              />
            )}
          </div>

          {/* Preview de la interfaz */}
          <div style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            overflow: 'hidden',
            fontSize: '11px',
            fontFamily: 'monospace'
          }}>
            {/* Barra superior (MenuBar) */}
            <div style={{
              background: colors.menuBarBackground,
              color: colors.menuBarText,
              padding: '6px 10px',
              borderBottom: `1px solid ${colors.menuBarBorder}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ fontSize: '9px' }}>🏠 📁 ⚙️</div>
              <span style={{ fontSize: '9px' }}>NodeTerm</span>
            </div>

            {/* Área principal con sidebar y contenido */}
            <div style={{ display: 'flex', height: '120px' }}>
              {/* Sidebar */}
              <div style={{
                background: colors.sidebarBackground,
                color: colors.sidebarText,
                width: '80px',
                borderRight: `1px solid ${colors.sidebarBorder}`,
                padding: '8px 6px',
                fontSize: '9px'
              }}>
                <div style={{
                  background: colors.sidebarSelected,
                  padding: '3px 6px',
                  borderRadius: '3px',
                  marginBottom: '4px'
                }}>
                  📁 Proyectos
                </div>
                <div style={{
                  padding: '3px 6px',
                  borderRadius: '3px',
                  marginBottom: '4px'
                }}>
                  🖥️ SSH-1
                </div>
                <div style={{
                  padding: '3px 6px',
                  borderRadius: '3px'
                }}>
                  🖥️ SSH-2
                </div>
              </div>

              {/* Área de contenido */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Tabs */}
                <div style={{
                  background: colors.tabBackground,
                  borderBottom: `1px solid ${colors.tabBorder}`,
                  display: 'flex',
                  fontSize: '9px'
                }}>
                  <div style={{
                    background: colors.tabActiveBackground,
                    color: colors.tabActiveText,
                    padding: '4px 8px',
                    borderRight: `1px solid ${colors.tabBorder}`,
                    borderBottom: `2px solid ${colors.tabActiveText}`
                  }}>
                    Terminal
                  </div>
                  <div style={{
                    background: colors.tabBackground,
                    color: colors.tabText,
                    padding: '4px 8px',
                    borderRight: `1px solid ${colors.tabBorder}`
                  }}>
                    Explorer
                  </div>
                </div>

                {/* Contenido principal */}
                <div style={{
                  background: colors.contentBackground,
                  color: colors.dialogText,
                  flex: 1,
                  padding: '8px',
                  fontSize: '8px',
                  lineHeight: '1.2'
                }}>
                  <div style={{ color: colors.buttonPrimary, marginBottom: '3px' }}>
                    user@server:~$
                  </div>
                  <div style={{ marginBottom: '2px' }}>
                    Welcome to {theme.name} theme
                  </div>
                  <div style={{ opacity: 0.7 }}>
                    ls -la
                  </div>
                </div>
              </div>
            </div>

            {/* Status bar */}
            <div style={{
              background: colors.statusBarBackground,
              color: colors.statusBarText,
              padding: '4px 8px',
              borderTop: `1px solid ${colors.statusBarBorder}`,
              fontSize: '8px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>✓ Conectado</span>
              <span>{theme.name}</span>
            </div>
          </div>

          {/* Paleta de colores */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ 
              fontSize: '11px', 
              marginBottom: '8px',
              color: 'var(--text-color-secondary)',
              fontWeight: '500'
            }}>
              Paleta principal:
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(6, 1fr)', 
              gap: '4px'
            }}>
              {[
                colors.sidebarBackground,
                colors.contentBackground,
                colors.tabActiveBackground,
                colors.buttonPrimary,
                colors.statusBarBackground,
                colors.dialogText
              ].map((color, index) => (
                <div
                  key={index}
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: color,
                    borderRadius: '4px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Botón para aplicar tema */}
          {!isActive && (
            <Button
              label="Aplicar Tema"
              icon="pi pi-check"
              className="p-button-sm"
              style={{ 
                width: '100%', 
                marginTop: '15px',
                padding: '8px',
                backgroundColor: colors.buttonPrimary,
                color: colors.buttonPrimaryText,
                border: 'none'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleThemeChange(theme.name);
              }}
            />
          )}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header con controles */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <h4 style={{ 
            margin: 0, 
            color: 'var(--text-color)',
            fontSize: '18px'
          }}>
            Seleccionar Tema de Interfaz
          </h4>
          <p style={{ 
            margin: '5px 0 0 0', 
            color: 'var(--text-color-secondary)',
            fontSize: '14px'
          }}>
            Personaliza la apariencia de la aplicación
          </p>
        </div>
        
        {showPreview && (
          <Button
            label={previewMode ? "Vista Normal" : "Vista Previa"}
            icon={previewMode ? "pi pi-times" : "pi pi-eye"}
            className="p-button-outlined p-button-sm"
            onClick={togglePreviewMode}
          />
        )}
      </div>

      {/* Categorías en pestañas */}
      <div style={{ width: '100%', maxWidth: '1200px', padding: '0 1rem' }}>
        <TabView>
          <TabPanel header="Clásicos">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '1.5rem',
              width: '100%'
            }}>
              {CLASSIC_UI_KEYS.filter(key => uiThemes[key]).map((key) => {
                const theme = uiThemes[key];
                return (
                  <ThemeCard
                    key={key}
                    theme={theme}
                    isActive={currentTheme === theme.name}
                    onClick={() => handleThemeChange(theme.name)}
                  />
                );
              })}
            </div>
          </TabPanel>
          <TabPanel header="Futuristas">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '1.5rem',
              width: '100%'
            }}>
              {FUTURISTIC_UI_KEYS.filter(key => uiThemes[key]).map((key) => {
                const theme = uiThemes[key];
                return (
                  <ThemeCard
                    key={key}
                    theme={theme}
                    isActive={currentTheme === theme.name}
                    onClick={() => handleThemeChange(theme.name)}
                  />
                );
              })}
            </div>
          </TabPanel>
        </TabView>
      </div>

      {/* Información adicional */}
      {/* Bloque eliminado: Información sobre temas */}
    </div>
  );
};

export default ThemeSelector;
