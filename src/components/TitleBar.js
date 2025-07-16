import React, { useState, useEffect } from 'react';
import appIcon from '../assets/app-icon.png';

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Consultar el estado inicial
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized);
    }
    // Escuchar cambios de maximizado si quieres (opcional, requiere emitir eventos desde main.js)
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimize && window.electronAPI.minimize();
  };
  const handleMaximizeRestore = () => {
    if (isMaximized) {
      window.electronAPI?.unmaximize && window.electronAPI.unmaximize();
      setIsMaximized(false);
    } else {
      window.electronAPI?.maximize && window.electronAPI.maximize();
      setIsMaximized(true);
    }
  };
  const handleClose = () => {
    window.electronAPI?.close && window.electronAPI.close();
  };

  return (
    <div
      className="custom-titlebar"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 32,
        width: '100%',
        background: 'var(--ui-titlebar-accent, #1976d2)',
        color: 'var(--ui-titlebar-text, #fff)',
        WebkitUserSelect: 'none',
        WebkitAppRegion: 'drag',
        padding: '0 8px',
        boxSizing: 'border-box',
        borderBottom: '1px solid var(--ui-sidebar-border, #222)',
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.07)'
      }}
    >
      <img src={appIcon} alt="NodeTerm" style={{ width: 20, height: 20, marginRight: 8, pointerEvents: 'none' }} draggable={false} />
      <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: 0.5 }}>NodeTerm</span>
      <div style={{ flex: 1 }} />
      {/* Botones de ventana */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, WebkitAppRegion: 'no-drag' }}>
        <button
          className="titlebar-btn"
          style={{
            width: 36,
            height: 28,
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            borderRadius: 4,
            transition: 'background 0.18s',
            outline: 'none',
            marginLeft: 2
          }}
          title="Minimizar"
          onClick={handleMinimize}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
          onMouseOut={e => e.currentTarget.style.background = 'none'}
        >
          <svg width="10" height="2"><rect width="10" height="2" fill="currentColor" /></svg>
        </button>
        <button
          className="titlebar-btn"
          style={{
            width: 36,
            height: 28,
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            borderRadius: 4,
            transition: 'background 0.18s',
            outline: 'none',
            marginLeft: 2
          }}
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
          onClick={handleMaximizeRestore}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
          onMouseOut={e => e.currentTarget.style.background = 'none'}
        >
          {isMaximized ? (
            <svg width="10" height="10"><rect x="2" y="2" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          ) : (
            <svg width="10" height="10"><rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          )}
        </button>
        <button
          className="titlebar-btn"
          style={{
            width: 36,
            height: 28,
            background: 'none',
            border: 'none',
            color: '#e74c3c',
            cursor: 'pointer',
            borderRadius: 4,
            transition: 'background 0.18s',
            outline: 'none',
            marginLeft: 2
          }}
          title="Cerrar"
          onClick={handleClose}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.15)'; e.currentTarget.style.color = '#fff'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#e74c3c'; }}
        >
          <svg width="10" height="10"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" /><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 