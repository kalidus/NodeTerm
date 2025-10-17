import React from 'react';

/**
 * Componente para mostrar preview de fuentes con diferentes estilos y tamaños
 */
const FontPreview = ({ 
  fontFamily, 
  fontSize = 14, 
  label = "Vista previa", 
  sampleText = "Sample Text",
  showInfo = true,
  className = "",
  style = {}
}) => {
  const previewStyle = {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'var(--surface-100)',
    border: '1px solid var(--surface-300)',
    textAlign: 'center',
    ...style
  };

  const headerStyle = {
    fontSize: '11px', 
    color: 'var(--text-color-secondary)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600'
  };

  const textStyle = {
    fontFamily: fontFamily, 
    fontSize: `${fontSize}px`, 
    fontWeight: '500',
    color: 'var(--text-color)',
    marginBottom: showInfo ? '4px' : '0',
    lineHeight: '1.4'
  };

  const infoStyle = {
    fontFamily: fontFamily, 
    fontSize: `${Math.max(fontSize - 2, 10)}px`, 
    color: 'var(--text-color-secondary)',
    opacity: 0.8,
    fontWeight: '400'
  };

  return (
    <div className={className} style={previewStyle}>
      <div style={headerStyle}>
        {label}
      </div>
      <div style={textStyle}>
        {sampleText}
      </div>
      {showInfo && (
        <div style={infoStyle}>
          {fontFamily} • {fontSize}px
        </div>
      )}
    </div>
  );
};

/**
 * Componente para mostrar preview de fuentes monoespaciadas (terminales)
 */
export const MonospaceFontPreview = ({ 
  fontFamily, 
  fontSize = 14, 
  label = "Vista previa del terminal",
  className = "",
  style = {}
}) => {
  const previewStyle = {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'var(--surface-100)',
    border: '1px solid var(--surface-300)',
    textAlign: 'left',
    fontFamily: fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: '1.4',
    ...style
  };

  const headerStyle = {
    fontSize: '11px', 
    color: 'var(--text-color-secondary)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600',
    textAlign: 'center'
  };

  const terminalStyle = {
    background: '#1e1e1e',
    color: '#d4d4d4',
    padding: '8px 12px',
    borderRadius: '4px',
    fontFamily: fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: '1.3',
    overflow: 'hidden'
  };

  const promptStyle = {
    color: '#4ec9b0',
    marginRight: '4px'
  };

  const commandStyle = {
    color: '#9cdcfe'
  };

  const pathStyle = {
    color: '#ce9178'
  };

  return (
    <div className={className} style={previewStyle}>
      <div style={headerStyle}>
        {label}
      </div>
      <div style={terminalStyle}>
        <div>
          <span style={promptStyle}>$</span>
          <span style={commandStyle}>ls -la</span>
        </div>
        <div>
          <span style={promptStyle}>$</span>
          <span style={pathStyle}>/home/user</span>
          <span style={{ color: '#d4d4d4' }}> → node my-app.js</span>
        </div>
        <div>
          <span style={{ color: '#6a9955' }}>// {fontFamily} • {fontSize}px</span>
        </div>
      </div>
    </div>
  );
};

export default FontPreview;
