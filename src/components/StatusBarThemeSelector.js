import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { Dropdown } from 'primereact/dropdown';
import { statusBarThemes } from '../themes/status-bar-themes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip, faMemory, faHdd, faClock, faArrowDown, faArrowUp, faServer } from '@fortawesome/free-solid-svg-icons';

const StatusBarThemeSelector = ({ currentTheme, onThemeChange }) => {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme || 'Default Dark');

  useEffect(() => {
    setSelectedTheme(currentTheme || 'Default Dark');
  }, [currentTheme]);

  const handleThemeChange = (themeName) => {
    setSelectedTheme(themeName);
    if (onThemeChange) {
      onThemeChange(themeName);
    }
  };

  const themeOptions = Object.keys(statusBarThemes).map(themeName => ({
    label: themeName,
    value: themeName
  }));

  const StatusBarPreview = ({ theme }) => {
    if (!theme || !theme.colors) return null;

    const colors = theme.colors;
    
    return (
      <div style={{
        background: colors.background,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '8px 12px',
        fontFamily: 'monospace',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginTop: '10px',
        minHeight: '32px'
      }}>
        {/* Hostname */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: colors.iconColor }}>🐧</span>
          <span>server-01</span>
        </div>

        {/* CPU */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FontAwesomeIcon 
            icon={faMicrochip} 
            style={{ color: colors.cpuBarColor, fontSize: '10px' }} 
          />
          <span>45%</span>
          <div style={{
            width: '20px',
            height: '12px',
            background: `linear-gradient(to right, ${colors.cpuBarColor} 45%, ${colors.border} 45%)`,
            borderRadius: '2px',
            border: `1px solid ${colors.border}`
          }} />
        </div>

        {/* Memory */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FontAwesomeIcon 
            icon={faMemory} 
            style={{ color: colors.memoryBarColor, fontSize: '10px' }} 
          />
          <span>2.1GB / 8GB</span>
        </div>

        {/* Network */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FontAwesomeIcon 
            icon={faArrowDown} 
            style={{ color: colors.networkDownColor, fontSize: '9px' }} 
          />
          <span>1.2MB/s</span>
          <FontAwesomeIcon 
            icon={faArrowUp} 
            style={{ color: colors.networkUpColor, fontSize: '9px' }} 
          />
          <span>256KB/s</span>
        </div>

        {/* Disk */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FontAwesomeIcon 
            icon={faHdd} 
            style={{ color: colors.diskBarColor, fontSize: '10px' }} 
          />
          <span>/: 67%</span>
        </div>

        {/* Uptime */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FontAwesomeIcon 
            icon={faClock} 
            style={{ color: colors.iconColor, fontSize: '10px' }} 
          />
          <span>3d 12h</span>
        </div>

        {/* IP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FontAwesomeIcon 
            icon={faServer} 
            style={{ color: colors.iconColor, fontSize: '10px' }} 
          />
          <span>192.168.1.100</span>
        </div>
      </div>
    );
  };

  const ColorPalette = ({ theme }) => {
    if (!theme || !theme.colors) return null;

    const colors = theme.colors;
    const colorEntries = [
      { name: 'Fondo', color: colors.background },
      { name: 'Texto', color: colors.text },
      { name: 'CPU', color: colors.cpuBarColor },
      { name: 'Memoria', color: colors.memoryBarColor },
      { name: 'Disco', color: colors.diskBarColor },
      { name: 'Red ↑', color: colors.networkUpColor },
      { name: 'Red ↓', color: colors.networkDownColor },
      { name: 'Iconos', color: colors.iconColor }
    ];

    return (
      <div style={{ marginTop: '15px' }}>
        <div style={{ 
          fontSize: '11px', 
          marginBottom: '8px',
          color: 'var(--text-color-secondary)',
          fontWeight: '500'
        }}>
          Paleta de colores:
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '8px'
        }}>
          {colorEntries.map((entry, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: entry.color,
                  borderRadius: '4px',
                  border: '1px solid rgba(0,0,0,0.2)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
                title={`${entry.name}: ${entry.color}`}
              />
              <span style={{ 
                fontSize: '8px', 
                color: 'var(--text-color-secondary)',
                textAlign: 'center'
              }}>
                {entry.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ 
          margin: 0, 
          color: 'var(--text-color)',
          fontSize: '18px'
        }}>
          <FontAwesomeIcon icon={faServer} style={{ marginRight: '8px' }} />
          Tema de la Barra de Estado
        </h4>
        <p style={{ 
          margin: '5px 0 0 0', 
          color: 'var(--text-color-secondary)',
          fontSize: '14px'
        }}>
          Personaliza la apariencia de la barra de estado con información del sistema
        </p>
      </div>

      {/* Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="statusbar-theme" style={{ 
          display: 'block', 
          marginBottom: '8px',
          fontWeight: 'bold',
          fontSize: '14px',
          color: 'var(--text-color)'
        }}>
          Seleccionar tema:
        </label>
        <Dropdown
          id="statusbar-theme"
          value={selectedTheme}
          options={themeOptions}
          onChange={(e) => handleThemeChange(e.value)}
          placeholder="Selecciona un tema para la status bar"
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      {/* Preview */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          fontSize: '14px', 
          color: 'var(--text-color)',
          marginBottom: '10px',
          fontWeight: '500'
        }}>
          Vista previa:
        </div>
        <StatusBarPreview theme={statusBarThemes[selectedTheme]} />
      </div>

      {/* Color Palette */}
      <ColorPalette theme={statusBarThemes[selectedTheme]} />

      {/* Theme Cards Grid */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ 
          fontSize: '16px', 
          color: 'var(--text-color)',
          marginBottom: '15px',
          fontWeight: '500'
        }}>
          Todos los temas disponibles:
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '15px'
        }}>
          {Object.values(statusBarThemes).map((theme) => (
            <Card
              key={theme.name}
              className={`theme-card ${selectedTheme === theme.name ? 'theme-card-active' : ''}`}
              style={{
                cursor: 'pointer',
                border: selectedTheme === theme.name ? '2px solid var(--primary-color)' : '1px solid #ddd',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                transform: selectedTheme === theme.name ? 'scale(1.02)' : 'scale(1)'
              }}
              onClick={() => handleThemeChange(theme.name)}
            >
              <div style={{ padding: '12px' }}>
                {/* Header */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <h5 style={{ 
                    margin: 0, 
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: 'var(--text-color)'
                  }}>
                    {theme.name}
                  </h5>
                  {selectedTheme === theme.name && (
                    <Badge 
                      value="Activo" 
                      severity="success" 
                      style={{ fontSize: '9px' }}
                    />
                  )}
                </div>

                {/* Mini Preview */}
                <StatusBarPreview theme={theme} />

                {/* Apply Button */}
                {selectedTheme !== theme.name && (
                  <Button
                    label="Aplicar"
                    icon="pi pi-check"
                    className="p-button-sm p-button-outlined"
                    style={{ 
                      width: '100%', 
                      marginTop: '10px',
                      padding: '6px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThemeChange(theme.name);
                    }}
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusBarThemeSelector;
