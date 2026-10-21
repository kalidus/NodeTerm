import React, { useEffect, useRef } from 'react';

/**
 * Barra buscar / reemplazar estilo Joplin para el editor de notas.
 */
const NoteFindBar = ({
  visible,
  replaceMode = false,
  query,
  replaceText,
  matchCount = 0,
  currentIndex = 0,
  onQueryChange,
  onReplaceTextChange,
  onClose,
  onNext,
  onPrev,
  onReplace,
  onReplaceAll,
  onToggleReplace
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [visible]);

  if (!visible) return null;

  const label =
    matchCount > 0
      ? `${currentIndex + 1} / ${matchCount}`
      : query
        ? '0 / 0'
        : '';

  return (
    <div className="note-find-bar" role="search">
      <div className="note-find-row">
        <i className="pi pi-search note-find-icon" />
        <input
          ref={inputRef}
          type="text"
          className="note-find-input"
          placeholder="Buscar en la nota..."
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (e.shiftKey) onPrev?.();
              else onNext?.();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose?.();
            }
          }}
        />
        <span className="note-find-count">{label}</span>
        <button type="button" className="note-find-btn" title="Anterior (Shift+F3)" onClick={onPrev}>
          <i className="pi pi-chevron-up" />
        </button>
        <button type="button" className="note-find-btn" title="Siguiente (F3)" onClick={onNext}>
          <i className="pi pi-chevron-down" />
        </button>
        <button
          type="button"
          className={`note-find-btn ${replaceMode ? 'active' : ''}`}
          title="Reemplazar (Ctrl+H)"
          onClick={onToggleReplace}
        >
          <i className="pi pi-sync" />
        </button>
        <button type="button" className="note-find-btn" title="Cerrar (Esc)" onClick={onClose}>
          <i className="pi pi-times" />
        </button>
      </div>
      {replaceMode && (
        <div className="note-find-row note-find-replace-row">
          <i className="pi pi-pencil note-find-icon" />
          <input
            type="text"
            className="note-find-input"
            placeholder="Reemplazar con..."
            value={replaceText}
            onChange={(e) => onReplaceTextChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onReplace?.();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
              }
            }}
          />
          <button type="button" className="note-find-action" onClick={onReplace}>
            Reemplazar
          </button>
          <button type="button" className="note-find-action" onClick={onReplaceAll}>
            Todos
          </button>
        </div>
      )}
    </div>
  );
};

export default NoteFindBar;
