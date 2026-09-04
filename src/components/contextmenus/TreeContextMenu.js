import React, { useRef, useState, useLayoutEffect } from 'react';

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
            zIndex: 100001
          }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  if (!subItem.disabled) {
                    onClose();
                    if (subItem.command) subItem.command({ originalEvent: e, item: subItem });
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
  const [coords, setCoords] = useState({ left: -9999, top: -9999 });

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

      setCoords({ left, top });
    }
  }, [treeContextMenu, items]);

  if (!treeContextMenu || !items || items.length === 0) return null;

  return (
    <>
      {/* Backdrop transparente a pantalla completa: intercepta clics fuera sin cerrar inesperadamente por hover/resize */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99998,
          cursor: 'default'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Contenedor del menú contextual */}
      <div
        ref={menuRef}
        className="tree-context-menu"
        style={{
          position: 'fixed',
          left: coords.left,
          top: coords.top,
          zIndex: 99999,
          minWidth: '210px',
          background: 'var(--ui-context-bg, #1e222d)',
          border: '1px solid var(--ui-context-border, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 8px 24px var(--ui-context-shadow, rgba(0, 0, 0, 0.45))',
          borderRadius: '8px',
          padding: '4px 0',
          userSelect: 'none'
        }}
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
            return <SubMenuItem key={idx} item={item} onClose={onClose} />;
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
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled) {
                  onClose();
                  if (item.command) item.command({ originalEvent: e, item });
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
    </>
  );
};

export default TreeContextMenu;
