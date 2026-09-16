import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

const SubMenuItem = ({ item, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [flyoutLeft, setFlyoutLeft] = useState(true); // true = opens to right, false = opens to left
  const itemRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      // If flyout would overflow right edge (approx 220px width), open to the left
      setFlyoutLeft(rect.right + 220 <= window.innerWidth);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <div
      ref={itemRef}
      className="tree-menu-item has-submenu"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }}
      style={{
        position: 'relative',
        padding: '8px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 'var(--ui-font-size, 13px)',
        color: 'var(--ui-context-text, #e2e8f0)',
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {item.icon && <i className={item.icon} style={{ width: '16px', fontSize: '1em' }} />}
        <span>{item.label}</span>
      </div>
      <i className="pi pi-angle-right" style={{ fontSize: 'calc(var(--ui-font-size, 13px) - 2px)', opacity: 0.7 }} />

      {isOpen && item.items && item.items.length > 0 && (
        <div
          className="tree-context-menu tree-submenu-flyout"
          style={{
            position: 'absolute',
            top: -4,
            [flyoutLeft ? 'left' : 'right']: '100%',
            minWidth: '200px',
            background: 'var(--ui-context-bg, #1e222d)',
            border: '1px solid var(--ui-context-border, rgba(255, 255, 255, 0.12))',
            boxShadow: '0 8px 24px var(--ui-context-shadow, rgba(0, 0, 0, 0.45))',
            borderRadius: '8px',
            padding: '4px 0',
            zIndex: 1000002
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {item.items.map((subItem, idx) => {
            if (subItem.separator) {
              return (
                <div
                  key={`sep-${idx}`}
                  style={{
                    height: '1px',
                    margin: '4px 0',
                    background: 'var(--ui-context-border, rgba(255,255,255,0.1))'
                  }}
                />
              );
            }
            if (subItem.items && subItem.items.length > 0) {
              return <SubMenuItem key={idx} item={subItem} onClose={onClose} />;
            }
            return (
              <div
                key={idx}
                className="tree-menu-item"
                style={{
                  padding: '8px 12px',
                  cursor: subItem.disabled ? 'not-allowed' : 'pointer',
                  opacity: subItem.disabled ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: 'var(--ui-font-size, 13px)',
                  color: 'var(--ui-context-text, #e2e8f0)',
                  userSelect: 'none'
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (subItem.disabled) return;
                  if (typeof onClose === 'function') onClose();
                  if (subItem.command) {
                    try {
                      subItem.command({ originalEvent: e, item: subItem });
                    } catch (err) {
                      console.error('[TreeContextMenu] Submenu command error:', err);
                    }
                  }
                }}
              >
                {subItem.icon && <i className={subItem.icon} style={{ width: '16px', fontSize: '1em' }} />}
                <span>{subItem.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TreeContextMenu = ({
  treeContextMenu,
  onClose,
  items = []
}) => {
  const menuRef = useRef(null);
  const [adjustedCoords, setAdjustedCoords] = useState(null);

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

  // Cerrar menú globalmente al hacer clic fuera, perder foco, scroll o pulsar Escape
  useEffect(() => {
    if (!treeContextMenu) return;

    const handlePointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        handleClose();
      }
    };

    const handleContextMenu = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        handleClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    const handleBlur = () => {
      handleClose();
    };

    const handleScroll = (e) => {
      if (menuRef.current && (!e.target || !(e.target instanceof Node) || !menuRef.current.contains(e.target))) {
        handleClose();
      }
    };

    // Usar capture: true para recibir el evento antes de cualquier stopPropagation
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('resize', handleScroll);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [treeContextMenu, handleClose]);

  useLayoutEffect(() => {
    if (treeContextMenu && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let left = treeContextMenu.x;
      let top = treeContextMenu.y;

      if (left + rect.width > windowWidth - 8) {
        left = windowWidth - rect.width - 8;
      }
      if (top + rect.height > windowHeight - 8) {
        top = windowHeight - rect.height - 8;
      }

      left = Math.max(8, left);
      top = Math.max(8, top);

      if (left !== treeContextMenu.x || top !== treeContextMenu.y) {
        setAdjustedCoords({ left, top });
      } else {
        setAdjustedCoords(null);
      }
    } else {
      setAdjustedCoords(null);
    }
  }, [treeContextMenu?.x, treeContextMenu?.y, items]);

  if (!treeContextMenu || !items || items.length === 0) return null;

  const left = adjustedCoords ? adjustedCoords.left : (treeContextMenu.x || 0);
  const top = adjustedCoords ? adjustedCoords.top : (treeContextMenu.y || 0);

  return ReactDOM.createPortal(
    <>
      {/* Backdrop transparente a pantalla completa: intercepta clics fuera inmediatamente */}
      <div
        className="tree-context-menu-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 999998,
          background: 'rgba(0, 0, 0, 0.0001)', // Garantiza hit-testing en Chromium
          cursor: 'default'
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }}
      />

      {/* Contenedor del menú contextual */}
      <div
        ref={menuRef}
        className="tree-context-menu"
        style={{
          position: 'fixed',
          left: left,
          top: top,
          zIndex: 999999,
          minWidth: '210px',
          background: 'var(--ui-context-bg, #1e222d)',
          border: '1px solid var(--ui-context-border, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 8px 24px var(--ui-context-shadow, rgba(0, 0, 0, 0.45))',
          borderRadius: '8px',
          padding: '4px 0',
          userSelect: 'none'
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, idx) => {
          if (item.separator) {
            return (
              <div
                key={`sep-${idx}`}
                style={{
                  height: '1px',
                  margin: '4px 0',
                  background: 'var(--ui-context-border, rgba(255,255,255,0.1))'
                }}
              />
            );
          }

          if (item.items && item.items.length > 0) {
            return <SubMenuItem key={idx} item={item} onClose={handleClose} />;
          }

          const isDanger = item.className && item.className.includes('p-menuitem-danger');

          return (
            <div
              key={idx}
              className={`tree-menu-item ${item.className || ''}`}
              style={{
                padding: '8px 12px',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'var(--ui-font-size, 13px)',
                color: isDanger ? 'var(--red-400, #f87171)' : 'var(--ui-context-text, #e2e8f0)',
                userSelect: 'none'
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (item.disabled) return;
                handleClose();
                if (item.command) {
                  try {
                    item.command({ originalEvent: e, item });
                  } catch (err) {
                    console.error('[TreeContextMenu] Command execution error:', err);
                  }
                }
              }}
            >
              {item.icon && (
                <i
                  className={item.icon}
                  style={{
                    width: '16px',
                    fontSize: '1em',
                    color: isDanger ? 'var(--red-400, #f87171)' : undefined
                  }}
                />
              )}
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </>,
    document.body
  );
};

export default TreeContextMenu;
