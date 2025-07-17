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
      className="titlebar"
      style={{
        height: 28,
        minHeight: 28,
        maxHeight: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--ui-titlebar-accent, #1976d2)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: '0 6px',
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        zIndex: 1000
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <img src={require('../assets/app-icon.png')} alt="icon" style={{ width: 15, height: 15, marginRight: 5, marginLeft: 1 }} />
        <span style={{ fontWeight: 600, fontSize: 11, color: '#fff', letterSpacing: 0.1 }}>NodeTerm</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 10, WebkitAppRegion: 'no-drag' }}>
        {/* Botón de menú (3 puntos) */}
        <button
          title="Menú"
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            margin: 0,
            padding: 0,
            transition: 'background 0.15s',
            cursor: 'pointer',
            verticalAlign: 'middle',
            position: 'relative',
            top: '1px'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e3e6ea')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cy="6" cx="2.5" r="1.2" fill="#fff"/><circle cy="6" cx="6" r="1.2" fill="#fff"/><circle cy="6" cx="9.5" r="1.2" fill="#fff"/></svg>
        </button>
        {/* Minimizar */}
        <button
          onClick={handleMinimize}
          title="Minimizar"
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            margin: 0,
            padding: 0,
            transition: 'background 0.15s',
            cursor: 'pointer',
            verticalAlign: 'middle',
            position: 'relative',
            top: '1px'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e3e6ea')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="3" y="6.5" width="8" height="1.7" rx="0.85" fill="#fff" /></svg>
        </button>
        {/* Maximizar/Restaurar */}
        <button
          onClick={handleMaximizeRestore}
          title="Maximizar/Restaurar"
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            margin: 0,
            padding: 0,
            transition: 'background 0.15s',
            cursor: 'pointer'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e3e6ea')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="none" stroke="#fff" strokeWidth="1.2" /></svg>
        </button>
        {/* Cerrar */}
        <button
          onClick={handleClose}
          title="Cerrar"
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            margin: 0,
            padding: 0,
            transition: 'background 0.15s',
            cursor: 'pointer'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e57373')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="12" height="12" viewBox="0 0 14 14"><line x1="4" y1="4" x2="10" y2="10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /><line x1="10" y1="4" x2="4" y2="10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 