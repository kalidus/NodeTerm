import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { statusBarIconThemes } from '../themes/statusbar-icon-themes';

const StatusBarIconThemeSelector = ({ currentTheme, onThemeChange }) => {
  const themeOptions = Object.entries(statusBarIconThemes).map(([key, theme]) => ({
    label: theme.name,
    value: key
  }));

  const handleThemeChange = (e) => {
    onThemeChange(e.value);
  };

  const renderThemePreview = (themeName) => {
    const theme = statusBarIconThemes[themeName];
    if (!theme) return null;

    return (
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        alignItems: 'center',
        padding: '8px',
        background: 'var(--surface-100)',
        borderRadius: '4px',
        marginTop: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: theme.colors.cpu }}>{theme.icons.cpu}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>CPU</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: theme.colors.memory }}>{theme.icons.memory}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>MEM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: theme.colors.disk }}>{theme.icons.disk}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>DISK</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: theme.colors.networkDown }}>{theme.icons.networkDown}</span>
          <span style={{ color: theme.colors.networkUp }}>{theme.icons.networkUp}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>NET</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: theme.colors.server }}>{theme.icons.server}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>SRV</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: '1rem 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
        <i className="pi pi-star" style={{ marginRight: '0.5rem' }}></i>
        Tema de Iconos de la Status Bar
      </h3>
      
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <label htmlFor="statusbar-icon-theme" style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: 'bold',
          fontSize: '0.9rem'
        }}>
          Seleccionar tema de iconos
        </label>
        
        <Dropdown
          id="statusbar-icon-theme"
          value={currentTheme}
          options={themeOptions}
          onChange={handleThemeChange}
          placeholder="Selecciona un tema de iconos"
          style={{ width: '100%' }}
          itemTemplate={(option) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{statusBarIconThemes[option.value]?.icons.cpu}</span>
              <span>{statusBarIconThemes[option.value]?.icons.memory}</span>
              <span>{statusBarIconThemes[option.value]?.icons.disk}</span>
              <span>{option.label}</span>
            </div>
          )}
        />

        {currentTheme && statusBarIconThemes[currentTheme] && (
          <div>
            <div style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-color-secondary)', 
              marginTop: '12px',
              marginBottom: '8px'
            }}>
              Vista previa de iconos:
            </div>
            {renderThemePreview(currentTheme)}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusBarIconThemeSelector;
