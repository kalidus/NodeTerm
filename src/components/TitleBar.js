import React, { useState, useEffect } from 'react';
import appIcon from '../assets/app-icon.png';
import { InputText } from 'primereact/inputtext';
import { FaSearch } from 'react-icons/fa';

const TitleBar = ({ sidebarFilter, setSidebarFilter, allNodes, findAllConnections, onOpenSSHConnection }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredConnections, setFilteredConnections] = useState([]);

  useEffect(() => {
    if (sidebarFilter.trim()) {
      const allConnections = findAllConnections(allNodes);
      const filtered = allConnections.filter(node =>
        node.label.toLowerCase().includes(sidebarFilter.toLowerCase())
      );
      setFilteredConnections(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredConnections([]);
      setShowDropdown(false);
    }
  }, [sidebarFilter, allNodes, findAllConnections]);

  const handleSelectConnection = (node) => {
    setSidebarFilter('');
    setShowDropdown(false);
    if (onOpenSSHConnection) {
      onOpenSSHConnection(node);
    }
  };

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
        height: 32,
        minHeight: 32,
        maxHeight: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--ui-titlebar-accent, #1976d2)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: '0 6px',
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        zIndex: 1000,
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 6 }}>
        <img src={require('../assets/app-icon.png')} alt="icon" style={{ width: 18, height: 18, marginRight: 6, marginLeft: 8, display: 'block' }} />
        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--ui-titlebar-text, #fff)', letterSpacing: 0.1, lineHeight: '18px', display: 'flex', alignItems: 'center', height: 18 }}>NodeTerm</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 10, flex: 1, justifyContent: 'center' }}>
        <div style={{ position: 'relative', minWidth: 250, maxWidth: 520, width: '22vw', WebkitAppRegion: 'no-drag' }}>
          <span style={{ position: 'absolute', left: 10, top: 7, color: '#888', pointerEvents: 'none', fontSize: 13 }}>
            <FaSearch />
          </span>
          <InputText
            value={sidebarFilter}
            onChange={e => setSidebarFilter(e.target.value)}
            placeholder="Buscar..."
            style={{
              minWidth: 250,
              maxWidth: 520,
              width: '100%',
              paddingLeft: 36,
              height: 24,
              borderRadius: 6,
              border: '1px solid #bbb',
              fontSize: 13,
              background: 'rgba(255,255,255,0.85)',
              color: '#222',
              fontWeight: 500,
              outline: 'none',
              boxShadow: '0 1px 4px 0 rgba(0,0,0,0.08)',
              transition: 'border 0.2s',
              zIndex: 1,
            }}
            onFocus={() => setShowDropdown(filteredConnections.length > 0)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            autoComplete="off"
          />
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: 32,
              left: 0,
              width: 320,
              background: '#232629',
              color: '#fff',
              borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              zIndex: 9999,
              maxHeight: 260,
              overflowY: 'auto',
              border: '1px solid #444',
              WebkitAppRegion: 'no-drag',
            }}>
              {filteredConnections.map(node => (
                <div
                  key={node.key}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    borderBottom: '1px solid #333',
                  }}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelectConnection(node)}
                >
                  <i className="pi pi-desktop" style={{ color: '#4fc3f7', fontSize: 15 }} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.label}</span>
                </div>
              ))}
              {filteredConnections.length === 0 && (
                <div style={{ padding: '8px 12px', color: '#aaa', fontSize: 13 }}>Sin resultados</div>
              )}
            </div>
          )}
        </div>
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
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cy="6" cx="2.5" r="1.2" fill="var(--ui-titlebar-text, #fff)"/><circle cy="6" cx="6" r="1.2" fill="var(--ui-titlebar-text, #fff)"/><circle cy="6" cx="9.5" r="1.2" fill="var(--ui-titlebar-text, #fff)"/></svg>
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
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="3" y="6.5" width="8" height="1.7" rx="0.85" fill="var(--ui-titlebar-text, #fff)" /></svg>
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
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="none" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.2" /></svg>
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
          <svg width="12" height="12" viewBox="0 0 14 14"><line x1="4" y1="4" x2="10" y2="10" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.8" strokeLinecap="round" /><line x1="10" y1="4" x2="4" y2="10" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 