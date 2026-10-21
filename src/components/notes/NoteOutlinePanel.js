import React from 'react';

/**
 * Outline / TOC de headings H1–H3 de la nota activa.
 */
const NoteOutlinePanel = ({
  open,
  headings = [],
  onClose,
  onNavigate
}) => {
  if (!open) return null;

  return (
    <aside className="note-outline-panel">
      <div className="note-outline-header">
        <span>
          <i className="pi pi-list" style={{ marginRight: 6 }} />
          Outline
        </span>
        <button type="button" className="note-outline-close" onClick={onClose} title="Cerrar outline">
          <i className="pi pi-times" />
        </button>
      </div>
      <div className="note-outline-list">
        {headings.length === 0 ? (
          <div className="note-outline-empty">Sin títulos H1–H3</div>
        ) : (
          headings.map((h) => (
            <button
              key={`${h.pos}-${h.level}-${h.text}`}
              type="button"
              className={`note-outline-item level-${h.level}`}
              onClick={() => onNavigate?.(h)}
              title={h.text}
            >
              {h.text || '(sin texto)'}
            </button>
          ))
        )}
      </div>
    </aside>
  );
};

export default NoteOutlinePanel;
