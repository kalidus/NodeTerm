import React, { useState } from 'react';

function formatShortDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

/**
 * Franja de propiedades: etiquetas, fechas y favorito.
 */
const NoteTagsBar = ({
  tags = [],
  createdAt,
  updatedAt,
  isFavorite = false,
  onAddTag,
  onRemoveTag,
  onToggleFavorite
}) => {
  const [draft, setDraft] = useState('');

  const commitTag = () => {
    const value = draft.trim().toLowerCase();
    if (!value) return;
    onAddTag?.(value);
    setDraft('');
  };

  return (
    <div className="note-tags-bar">
      <div className="note-tags-chips">
        {tags.map((tag) => (
          <span key={tag} className="note-tag-chip">
            <i className="pi pi-tag" />
            {tag}
            <button
              type="button"
              className="note-tag-remove"
              onClick={() => onRemoveTag?.(tag)}
              title={`Quitar #${tag}`}
            >
              <i className="pi pi-times" />
            </button>
          </span>
        ))}
        <input
          type="text"
          className="note-tag-input"
          placeholder="+ etiqueta"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commitTag();
            }
          }}
          onBlur={commitTag}
        />
      </div>
      <div className="note-props-meta">
        <button
          type="button"
          className={`note-fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={onToggleFavorite}
          title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          <i className={isFavorite ? 'pi pi-star-fill' : 'pi pi-star'} />
        </button>
        <span className="note-prop-date" title="Creada">
          <i className="pi pi-calendar" /> {formatShortDate(createdAt)}
        </span>
        <span className="note-prop-date" title="Modificada">
          <i className="pi pi-clock" /> {formatShortDate(updatedAt)}
        </span>
      </div>
    </div>
  );
};

export default NoteTagsBar;
