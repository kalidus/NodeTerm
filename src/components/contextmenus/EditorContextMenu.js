import React, { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

/**
 * Menú contextual del editor de notas.
 * Ejecuta la acción en pointerdown (antes de que otros listeners cierren el menú).
 */
const EditorContextMenu = ({ treeContextMenu, onClose, items = [] }) => {
  const menuRef = useRef(null);

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  const runItem = useCallback((e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (item?.disabled) return;
    const cmd = item?.command;
    handleClose();
    if (typeof cmd === 'function') {
      // Diferir un frame para que el foco vuelva al editor tras cerrar el menú
      window.setTimeout(() => {
        try {
          cmd({ originalEvent: e, item });
        } catch (err) {
          console.error('[EditorContextMenu] command error:', err);
        }
      }, 0);
    }
  }, [handleClose]);

  useEffect(() => {
    if (!treeContextMenu) return undefined;

    const openAt = Date.now();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    const onOutside = (e) => {
      if (Date.now() - openAt < 180) return;
      if (menuRef.current?.contains(e.target)) return;
      handleClose();
    };

    document.addEventListener('keydown', onKey, true);
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', onOutside, true);
      document.addEventListener('contextmenu', onOutside, true);
    }, 180);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onOutside, true);
      document.removeEventListener('contextmenu', onOutside, true);
    };
  }, [treeContextMenu, handleClose]);

  useLayoutEffect(() => {
    if (!treeContextMenu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const margin = 8;
    let left = treeContextMenu.x || 0;
    let top = treeContextMenu.y || 0;
    if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - rect.width - margin;
    }
    if (top + rect.height > window.innerHeight - margin) {
      top = window.innerHeight - rect.height - margin;
    }
    menuRef.current.style.left = `${Math.max(margin, Math.round(left))}px`;
    menuRef.current.style.top = `${Math.max(margin, Math.round(top))}px`;
  }, [treeContextMenu, items]);

  if (!treeContextMenu || !items.length) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="tree-context-menu editor-context-menu"
      style={{
        position: 'fixed',
        left: Math.round(treeContextMenu.x || 0),
        top: Math.round(treeContextMenu.y || 0),
        zIndex: 1000000,
        minWidth: '210px',
        background: 'var(--ui-context-bg, #1e222d)',
        border: '1px solid var(--ui-context-border, rgba(255, 255, 255, 0.12))',
        boxShadow: '0 8px 24px var(--ui-context-shadow, rgba(0, 0, 0, 0.45))',
        borderRadius: '8px',
        padding: '4px 0',
        userSelect: 'none'
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
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
        return (
          <div
            key={idx}
            className="tree-menu-item"
            style={{
              padding: '8px 12px',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: 'var(--ui-font-size, 13px)',
              color: 'var(--ui-context-text, #e2e8f0)',
              userSelect: 'none'
            }}
            onMouseDown={(e) => {
              // Ejecutar en mousedown (botón primario) para ganar a listeners en capture
              if (e.button !== 0) return;
              runItem(e, item);
            }}
          >
            {item.icon && <i className={item.icon} style={{ width: '16px', fontSize: '1em' }} />}
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{ marginLeft: 'auto', opacity: 0.45, fontSize: '0.75em' }}>
                {item.shortcut}
              </span>
            )}
          </div>
        );
      })}
    </div>,
    document.body
  );
};

export default EditorContextMenu;
