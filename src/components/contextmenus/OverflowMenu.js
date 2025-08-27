import React from 'react';

const OverflowMenu = ({ 
  showOverflowMenu, 
  setShowOverflowMenu,
  overflowMenuPosition,
  overflowMenuItems = []
}) => {
  if (!showOverflowMenu) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: overflowMenuPosition.x,
          top: overflowMenuPosition.y,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          minWidth: '200px',
          maxHeight: '300px',
          overflow: 'auto',
          animation: 'contextMenuFadeIn 0.15s ease-out'
        }}
        onMouseLeave={() => setShowOverflowMenu(false)}
      >
        {overflowMenuItems.map((item, index) => (
          <div
            key={index}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: index < overflowMenuItems.length - 1 ? '1px solid #f0f0f0' : 'none'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            onClick={() => {
              item.command();
              setShowOverflowMenu(false);
            }}
          >
            <i className={item.icon} style={{ width: '16px', fontSize: '14px' }}></i>
            <span style={{ flex: 1, fontSize: '14px' }}>{item.label}</span>
          </div>
        ))}
        {overflowMenuItems.length === 0 && (
          <div style={{ padding: '12px', color: '#666', fontStyle: 'italic', fontSize: '14px' }}>
            No hay pestañas ocultas
          </div>
        )}
      </div>

      {/* Overlay para cerrar menú de overflow al hacer clic fuera */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998
        }}
        onClick={() => setShowOverflowMenu(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowOverflowMenu(false);
        }}
      />
    </>
  );
};

export default OverflowMenu;
