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
  const lastItemsRef = useRef(items);

  if (items && items.length > 0) {
    lastItemsRef.current = items;
  }
  const effectiveItems = (items && items.length > 0) ? items : lastItemsRef.current;

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

  // Escuchadores globales seguros: activados tras 150ms para que el propio clic/evento que abre jamas cierre el menu
  useEffect(() => {
    if (!treeContextMenu) return;

    const openTimestamp = Date.now();
    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;

    const isInsideMenu = (target) => {
      if (!target) return false;
      if (menuRef.current && menuRef.current.contains(target)) return true;
      if (typeof target.closest === 'function') {
        if (target.closest('.tree-context-menu') || target.closest('.tree-submenu-flyout')) {
          return true;
        }
      }
      return false;
    };

    const handleOutsideEvent = (e) => {
      // Ignorar eventos durante los primeros 150ms tras la apertura para no atrapar la liberacion del boton
      if (Date.now() - openTimestamp < 150) return;
      if (isInsideMenu(e.target)) return;
      handleClose();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    const handleResize = () => {
      // Filtrar falsos positivos de reflow en Electron: solo cerrar si la ventana cambio realmente de tamano
      if (Math.abs(window.innerWidth - initialWidth) > 10 || Math.abs(window.innerHeight - initialHeight) > 10) {
        handleClose();
      }
    };

    // Escuchar Escape inmediatamente
    document.addEventListener('keydown', handleKeyDown, true);

    // Con retraso de 150ms, activar escuchadores para clics fuera, contextmenu fuera y scroll fuera
    let active = false;
    const timer = setTimeout(() => {
      active = true;
      document.addEventListener('pointerdown', handleOutsideEvent, true);
      document.addEventListener('contextmenu', handleOutsideEvent, true);
      document.addEventListener('wheel', handleOutsideEvent, { capture: true, passive: true });
      window.addEventListener('resize', handleResize);
    }, 150);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown, true);
      if (active) {
        document.removeEventListener('pointerdown', handleOutsideEvent, true);
        document.removeEventListener('contextmenu', handleOutsideEvent, true);
        document.removeEventListener('wheel', handleOutsideEvent, true);
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [treeContextMenu, handleClose]);

  // Posicionamiento inteligente dentro del viewport sin causar re-render adicional
  useLayoutEffect(() => {
    if (treeContextMenu && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const margin = 8;

      let left = treeContextMenu.x || 0;
      let top = treeContextMenu.y || 0;

      if (left + rect.width > windowWidth - margin) {
        left = windowWidth - rect.width - margin;
      }
      if (top + rect.height > windowHeight - margin) {
        top = windowHeight - rect.height - margin;
      }

      left = Math.max(margin, left);
      top = Math.max(margin, top);

      menuRef.current.style.left = `${Math.round(left)}px`;
      menuRef.current.style.top = `${Math.round(top)}px`;
    }
  }, [treeContextMenu?.x, treeContextMenu?.y, effectiveItems]);

  if (!treeContextMenu || !effectiveItems || effectiveItems.length === 0) return null;

  const initialLeft = Math.round(treeContextMenu.x || 0);
  const initialTop = Math.round(treeContextMenu.y || 0);

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="tree-context-menu"
      style={{
        position: 'fixed',
        left: initialLeft,
        top: initialTop,
        zIndex: 1000000,
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
      {effectiveItems.map((item, idx) => {
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
    </div>,
    document.body
  );
};

export default TreeContextMenu;
