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
              className="menu-separator"
            />
          );
        }
        return (
          <div
            key={idx}
            className="tree-menu-item"
            style={{
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              userSelect: 'none'
            }}
            onMouseDown={(e) => {
              // Ejecutar en mousedown (botón primario) para ganar a listeners en capture
              if (e.button !== 0) return;
              runItem(e, item);
            }}
          >
            {item.icon && <i className={item.icon} />}
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="context-kbd">
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
