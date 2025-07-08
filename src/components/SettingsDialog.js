import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import ThemeSelector from './ThemeSelector';
import StatusBarThemeSelector from './StatusBarThemeSelector';
import { themes } from '../themes';
import { getVersionInfo } from '../version-info';

const SettingsDialog = ({ 
  visible, 
  onHide, 
  fontFamily, 
  setFontFamily, 
  fontSize, 
  setFontSize, 
  terminalTheme, 
  setTerminalTheme,
  statusBarTheme,
  setStatusBarTheme,
  availableFonts 
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [versionInfo, setVersionInfo] = useState({ appVersion: '' });

  useEffect(() => {
    // Obtener la versión real de la app
    const info = getVersionInfo();
    setVersionInfo(info);
  }, []);

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
      className="settings-dialog"
      style={{ 
        width: '800px', 
        height: '80vh'
      }}
      contentStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)'
      }}
      headerStyle={{
        background: 'var(--ui-dialog-bg)',
        color: 'var(--ui-dialog-text)',
        borderBottom: '1px solid var(--ui-dialog-border)'
      }}
      onHide={onHide}
      modal
      maximizable
      footer={
        <div style={{
          background: 'var(--ui-dialog-bg)',
          color: 'var(--ui-dialog-text)',
          borderTop: '1px solid var(--ui-dialog-border)'
        }}>
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
        className="settings-dialog-tabview"
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
            {/* Logo o Icono de la App */}
            <div style={{ marginBottom: '1rem' }}>
              <i 
                className="pi pi-desktop" 
                style={{ 
                  fontSize: '4rem', 
                  color: 'var(--primary-color)',
                  background: 'var(--surface-100)',
                  padding: '1rem',
                  borderRadius: '50%',
                  width: '6rem',
                  height: '6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}
              ></i>
            </div>

            {/* Información Principal */}
            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>
              NodeTerm
            </h2>
            <p style={{ 
              margin: '0 0 1rem 0', 
              color: 'var(--text-color-secondary)',
              fontSize: '0.9rem'
            }}>
              Terminal SSH multiplataforma con gestión avanzada de pestañas
            </p>

            {/* Versión Principal */}
            <div style={{ 
              background: 'var(--primary-color)', 
              color: 'white', 
              padding: '0.5rem 1rem', 
              borderRadius: '20px', 
              display: 'inline-block',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              marginBottom: '1.5rem'
            }}>
              {versionInfo.appVersion ? `v${versionInfo.appVersion}` : 'v1.3.1'}
            </div>

            <Divider />

            {/* Información Técnica */}
            <div style={{ textAlign: 'left', marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                <i className="pi pi-cog" style={{ marginRight: '0.5rem' }}></i>
                Información Técnica
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div>
                  <strong>Electron:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>v25.x</span>
                </div>
                <div>
                  <strong>Node.js:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>v20.x</span>
                </div>
                <div>
                  <strong>Chromium:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>v114.x</span>
                </div>
                <div>
                  <strong>Compilación:</strong>
                  <br />
                  <span style={{ color: 'var(--text-color-secondary)' }}>jun 2024</span>
                </div>
              </div>
            </div>

            <Divider />

            {/* Funcionalidades */}
            <div style={{ textAlign: 'left', marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
                <i className="pi pi-star" style={{ marginRight: '0.5rem' }}></i>
                Características Principales
              </h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
                  Conexiones SSH múltiples con pestañas
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
                  Explorador de archivos remoto integrado
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
                  Drag & drop para organización de pestañas
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
                  Iconos automáticos por distribución Linux
                </div>
                <div>
                  <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
                  Sistema de overflow inteligente para pestañas
                </div>
              </div>
            </div>

            <Divider />

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
              <p style={{ margin: '0' }}>
                © 2025 NodeTerm - Desarrollado con ❤️ usando Electron y React
              </p>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Status Bar" leftIcon="pi pi-minus">
          <div style={{
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            width: '100%'
          }}>
            <StatusBarThemeSelector 
              currentTheme={statusBarTheme}
              onThemeChange={setStatusBarTheme}
            />
          </div>
        </TabPanel>
      </TabView>
    </Dialog>
  );
};

export default SettingsDialog; 