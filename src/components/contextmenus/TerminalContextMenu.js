import React from 'react';

const TerminalContextMenu = ({ 
  terminalContextMenu, 
  setTerminalContextMenu,
  onCopy,
  onPaste,
  onSelectAll,
  onClear
}) => {
  if (!terminalContextMenu) return null;

  const handleCopy = () => {
    onCopy(terminalContextMenu.tabKey);
  };

  const handlePaste = () => {
    onPaste(terminalContextMenu.tabKey);
  };

  const handleSelectAll = () => {
    onSelectAll(terminalContextMenu.tabKey);
  };

  const handleClear = () => {
    onClear(terminalContextMenu.tabKey);
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: terminalContextMenu.mouseX,
          top: terminalContextMenu.mouseY,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          minWidth: '180px',
          overflow: 'hidden'
        }}
        onMouseLeave={() => setTerminalContextMenu(null)}
      >
        <div
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          onClick={handleCopy}
        >
          <i className="pi pi-copy" style={{ width: '16px' }}></i>
          Copiar selección
        </div>
        <div
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          onClick={handlePaste}
        >
          <i className="pi pi-clone" style={{ width: '16px' }}></i>
          Pegar
        </div>
        <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }}></div>
        <div
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          onClick={handleSelectAll}
        >
          <i className="pi pi-list" style={{ width: '16px' }}></i>
          Seleccionar todo
        </div>
        <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }}></div>
        <div
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          onClick={handleClear}
        >
          <i className="pi pi-trash" style={{ width: '16px' }}></i>
          Limpiar terminal
        </div>
      </div>

      {/* Overlay para cerrar menú al hacer clic fuera */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998
        }}
        onClick={() => setTerminalContextMenu(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          setTerminalContextMenu(null);
        }}
      />
    </>
  );
};

export default TerminalContextMenu;
