import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../../styles/components/library-sidebar.css';

/**
 * Menú de «Añadir a la biblioteca». No usa el Menu de PrimeReact: ese overlay
 * lee un contexto que esta pantalla no monta y revienta al hacer scroll.
 */
const LibraryAddMenu = ({ open, anchorEl, items, onClose }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (anchorEl?.contains(event.target)) return;
      onClose();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, anchorEl, onClose]);

  if (!open || !anchorEl || typeof document === 'undefined') return null;

  const rect = anchorEl.getBoundingClientRect();
  const width = 268;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));

  return createPortal(
    <div
      ref={panelRef}
      className="library-add-menu"
      style={{ top: rect.bottom + 6, left, width }}
      role="menu"
    >
      {(items || []).map((item, index) => {
        if (item.separator) return <hr key={`sep-${index}`} />;
        return (
          <button
            key={item.label || index}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              item.command?.();
            }}
          >
            {item.icon ? <i className={item.icon} /> : null}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>,
    document.body
  );
};

export default LibraryAddMenu;
