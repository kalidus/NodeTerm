import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import ThemeSelector from './ThemeSelector';
import { themes } from '../themes';

const SettingsDialog = ({ 
  visible, 
  onHide, 
  fontFamily, 
  setFontFamily, 
  fontSize, 
  setFontSize, 
  terminalTheme, 
  setTerminalTheme,
  availableFonts 
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Configuración de temas de terminal
  const availableTerminalThemes = themes ? Object.keys(themes) : [];
  const terminalThemeOptions = availableTerminalThemes.map(themeName => ({
    label: themeName,
    value: themeName
  }));

  const handleTerminalThemeChange = (e) => {
    const newThemeName = e.value;
    const newTheme = themes[newThemeName];
    if (newTheme) {
      setTerminalTheme(newTheme);
    }
  };

  const handleFontFamilyChange = (e) => {
    setFontFamily(e.value);
  };

  const handleFontSizeChange = (value) => {
    if (value && value >= 8 && value <= 32) {
      setFontSize(value);
    }
  };

  const TerminalPreview = () => {
    if (!terminalTheme || !terminalTheme.theme) return null;

    const colors = terminalTheme.theme;
    
    return (
      <div style={{ 
        padding: '12px', 
        border: '1px solid #ccc',
        borderRadius: '6px',
        marginTop: '10px',
        fontFamily: fontFamily,
        fontSize: `${fontSize}px`
      }}>
        <div style={{ 
          background: colors.background || '#000000',
          color: colors.foreground || '#ffffff',
          padding: '12px',
          borderRadius: '4px',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: '1.4'
        }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: colors.green || '#00ff00' }}>user@hostname</span>
            <span style={{ color: colors.white || '#ffffff' }}>:</span>
            <span style={{ color: colors.blue || '#0000ff' }}>~/project</span>
            <span style={{ color: colors.white || '#ffffff' }}>$ </span>
            <span style={{ color: colors.yellow || '#ffff00' }}>ls -la</span>
          </div>
          <div style={{ color: colors.cyan || '#00ffff', marginBottom: '2px' }}>
            total 24
          </div>
          <div style={{ color: colors.blue || '#0000ff', marginBottom: '2px' }}>
            drwxr-xr-x 3 user user 4096 Dec 25 10:30 .
          </div>
          <div style={{ color: colors.blue || '#0000ff', marginBottom: '2px' }}>
            drwxr-xr-x 5 user user 4096 Dec 25 10:25 ..
          </div>
          <div style={{ color: colors.green || '#00ff00', marginBottom: '2px' }}>
            -rw-r--r-- 1 user user  256 Dec 25 10:30 README.md
          </div>
          <div style={{ color: colors.red || '#ff0000', marginBottom: '4px' }}>
            -rwxr-xr-x 1 user user 1024 Dec 25 10:28 script.sh
          </div>
          <div>
            <span style={{ color: colors.green || '#00ff00' }}>user@hostname</span>
            <span style={{ color: colors.white || '#ffffff' }}>:</span>
            <span style={{ color: colors.blue || '#0000ff' }}>~/project</span>
            <span style={{ color: colors.white || '#ffffff' }}>$ </span>
            <span 
              style={{ 
                background: colors.cursor || colors.foreground || '#ffffff',
                color: colors.background || '#000000',
                animation: 'blink 1s infinite'
              }}
            >
              ▋
            </span>
          </div>
        </div>
        <style>
          {`
            @keyframes blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0; }
            }
          `}
        </style>
      </div>
    );
  };

  return (
    <Dialog
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="pi pi-cog" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}></i>
          <span>Configuración</span>
        </div>
      }
      visible={visible}
      style={{ width: '600px', height: '70vh' }}
      onHide={onHide}
      modal
      maximizable
      footer={
        <div>
          <Button 
            label="Cerrar" 
            icon="pi pi-times" 
            onClick={onHide} 
            className="p-button-text" 
          />
        </div>
      }
    >
      <TabView 
        activeIndex={activeIndex} 
        onTabChange={(e) => setActiveIndex(e.index)}
      >
        <TabPanel header="Apariencia" leftIcon="pi pi-palette">
          <div style={{
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            width: '100%'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
              <i className="pi pi-eye" style={{ marginRight: '0.5rem' }}></i>
              Tema de la Interfaz
            </h3>
            <p style={{ 
              marginBottom: '1rem', 
              color: 'var(--text-color-secondary)',
              fontSize: '0.9rem'
            }}>
              Personaliza los colores de la interfaz de usuario (sidebar, menús, pestañas, etc.)
            </p>
            
            <ThemeSelector showPreview={true} />
          </div>
        </TabPanel>

        <TabPanel header="Terminal" leftIcon="pi pi-desktop">
          <div style={{
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            width: '100%'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
              <i className="pi pi-desktop" style={{ marginRight: '0.5rem' }}></i>
              Configuración del Terminal
            </h3>
            
            {/* Fuente */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                Fuente
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label htmlFor="font-family" style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    Familia de fuente
                  </label>
                  <Dropdown
                    id="font-family"
                    value={fontFamily}
                    options={availableFonts}
                    onChange={handleFontFamilyChange}
                    placeholder="Selecciona una fuente"
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div>
                  <label htmlFor="font-size" style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    Tamaño (px)
                  </label>
                  <InputNumber
                    id="font-size"
                    value={fontSize}
                    onValueChange={(e) => handleFontSizeChange(e.value)}
                    min={8}
                    max={32}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <Divider />

            {/* Tema del Terminal */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                Tema del Terminal
              </h4>
              
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="terminal-theme" style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  Esquema de colores
                </label>
                <Dropdown
                  id="terminal-theme"
                  value={terminalTheme?.name || 'Default Dark'}
                  options={terminalThemeOptions}
                  onChange={handleTerminalThemeChange}
                  placeholder="Selecciona un tema"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginBottom: '10px',
                fontStyle: 'italic'
              }}>
                Vista previa del terminal:
              </div>
              
              <TerminalPreview />
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Información" leftIcon="pi pi-info-circle">
          <div style={{
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            width: '100%'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <i 
                className="pi pi-cog" 
                style={{ 
                  fontSize: '3rem', 
                  color: 'var(--primary-color)',
                  background: 'var(--surface-100)',
                  padding: '1rem',
                  borderRadius: '50%',
                  width: '5rem',
                  height: '5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}
              ></i>
            </div>

            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
              Sistema de Configuración
            </h3>

            <div style={{ textAlign: 'left', marginTop: '2rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                <i className="pi pi-check-circle" style={{ marginRight: '0.5rem' }}></i>
                Características de Personalización
              </h4>
              
              <div style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-palette" style={{ color: 'var(--primary-color)', marginRight: '0.5rem' }}></i>
                  <strong>Temas de Interfaz:</strong> 6 temas predefinidos (Light, Dark, Dracula, Nord, Solarized)
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-desktop" style={{ color: 'var(--primary-color)', marginRight: '0.5rem' }}></i>
                  <strong>Temas de Terminal:</strong> 12 esquemas de color profesionales
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-font" style={{ color: 'var(--primary-color)', marginRight: '0.5rem' }}></i>
                  <strong>Fuentes:</strong> 9 fuentes monoespaciadas optimizadas para terminal
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-save" style={{ color: 'var(--primary-color)', marginRight: '0.5rem' }}></i>
                  <strong>Persistencia:</strong> Configuración guardada automáticamente en localStorage
                </div>
                <div>
                  <i className="pi pi-eye" style={{ color: 'var(--primary-color)', marginRight: '0.5rem' }}></i>
                  <strong>Vista Previa:</strong> Cambios aplicados en tiempo real
                </div>
              </div>
            </div>

            <Divider />

            <div style={{ 
              fontSize: '0.8rem', 
              color: 'var(--text-color-secondary)',
              marginTop: '1rem'
            }}>
              <p style={{ margin: '0' }}>
                Los ajustes se aplican inmediatamente y se guardan automáticamente.
                <br />
                Los temas de interfaz no afectan el contenido del terminal.
              </p>
            </div>
          </div>
        </TabPanel>
      </TabView>
    </Dialog>
  );
};

export default SettingsDialog; 