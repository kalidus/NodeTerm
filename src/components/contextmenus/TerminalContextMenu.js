import React from 'react';

const TerminalContextMenu = ({ 
  terminalContextMenu, 
  setTerminalContextMenu,
  onCopy,
  onPaste,
  onSelectAll,
  onClear,
  onStartRecording,
  onStopRecording,
  isRecording = false
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

  const handleToggleRecording = () => {
    if (isRecording) {
      onStopRecording && onStopRecording(terminalContextMenu.tabKey);
    } else {
      onStartRecording && onStartRecording(terminalContextMenu.tabKey);
    }
  };

  return (
    <>
      <div
        className="terminal-context-menu"
        style={{
          position: 'fixed',
          left: terminalContextMenu.mouseX,
          top: terminalContextMenu.mouseY,
          zIndex: 9999,
          minWidth: '180px',
          overflow: 'hidden'
        }}
        onMouseLeave={() => setTerminalContextMenu(null)}
      >
        <div
          className="menu-item"
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={handleCopy}
        >
          <i className="pi pi-copy" style={{ width: '16px' }}></i>
          Copiar selección
        </div>
        <div
          className="menu-item"
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={handlePaste}
        >
          <i className="pi pi-clone" style={{ width: '16px' }}></i>
          Pegar
        </div>
        <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
        <div
          className="menu-item"
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={handleSelectAll}
        >
          <i className="pi pi-list" style={{ width: '16px' }}></i>
          Seleccionar todo
        </div>
        <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
        <div
          className="menu-item"
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={handleClear}
        >
          <i className="pi pi-trash" style={{ width: '16px' }}></i>
          Limpiar terminal
        </div>
        <div className="menu-separator" style={{ height: '1px', margin: '4px 0' }}></div>
        {(onStartRecording || onStopRecording) && (
          <div
            className="menu-item"
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: isRecording ? '#d32f2f' : '#4caf50'
            }}
            onClick={handleToggleRecording}
          >
            <i className={isRecording ? 'pi pi-stop-circle' : 'pi pi-circle'} style={{ width: '16px', color: isRecording ? '#d32f2f' : '#4caf50' }}></i>
            {isRecording ? '⏹ Detener grabación' : '⏺ Iniciar grabación'}
          </div>
        )}
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
