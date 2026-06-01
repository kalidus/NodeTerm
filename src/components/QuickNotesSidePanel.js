import React, { useCallback, useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

/**
 * Formatea una fecha de timestamp a string legible.
 */
function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

/**
 * Extrae texto plano de HTML para la vista previa.
 */
function htmlToPlainText(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

/**
 * Panel lateral vertical estilo Joplin para listar las notas rápidas.
 * Se ancla vía position:fixed a la derecha del sidebar de documentos.
 *
 * Props:
 *  - isOpen: boolean
 *  - anchorRef: ref del elemento sidebar al que anclar el panel
 *  - notes: array de nodos de notas rápidas (hijos del nodo quick_note)
 *  - onClose: () => void
 *  - onOpenNote: (node) => void
 *  - onCreateNote: () => void
 *  - onDeleteNote: (node) => void
 *  - explorerFont: string
 *  - explorerFontSize: number
 */
const QuickNotesSidePanel = ({
  isOpen,
  anchorRef,
  notes = [],
  onClose,
  onOpenNote,
  onCreateNote,
  onDeleteNote,
  explorerFont,
  explorerFontSize = 14,
  title = 'Notas rápidas',
  iconClass = 'pi pi-bolt',
  iconColor = '#ffc107',
}) => {
  const [rect, setRect] = useState(null);

  // Actualizar posición cuando se abre o se redimensiona
  useEffect(() => {
    if (!isOpen || !anchorRef?.current) return;

    const update = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    };

    update();

    const ro = new ResizeObserver(update);
    if (anchorRef.current) ro.observe(anchorRef.current);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [isOpen, anchorRef]);

  const handleNoteClick = useCallback((e, node) => {
    e.stopPropagation();
    onOpenNote?.(node);
  }, [onOpenNote]);

  const handleDeleteClick = useCallback((e, node) => {
    e.stopPropagation();
    onDeleteNote?.(node);
  }, [onDeleteNote]);

  const panelStyle = rect
    ? {
        position: 'fixed',
        left: rect.right,
        top: rect.top,
        height: rect.height,
        width: 220,
        fontFamily: explorerFont || 'inherit',
        fontSize: `${explorerFontSize}px`,
      }
    : {
        position: 'fixed',
        left: -9999,
        top: 0,
        height: '100vh',
        width: 220,
        fontFamily: explorerFont || 'inherit',
        fontSize: `${explorerFontSize}px`,
      };

  const panel = (
    <div
      className={`quick-notes-side-panel${isOpen && rect ? ' open' : ''}`}
      style={panelStyle}
    >
      {/* Header */}
      <div className="qnp-header">
        <div className="qnp-header-title">
          <i className={iconClass} style={{ color: iconColor, fontSize: '0.95rem' }} />
          <span>{title}</span>
        </div>
        <div className="qnp-header-actions">
          <button
            className="qnp-icon-btn"
            onClick={(e) => { e.stopPropagation(); onCreateNote?.(); }}
            title="Nueva nota rápida"
          >
            <i className="pi pi-plus" />
          </button>
          <button
            className="qnp-icon-btn qnp-close-btn"
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            title="Cerrar panel"
          >
            <i className="pi pi-times" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="qnp-list">
        {notes.length === 0 ? (
          <div className="qnp-empty-state">
            <i className="pi pi-bolt" style={{ fontSize: '2rem', opacity: 0.3 }} />
            <p>Sin notas rápidas</p>
            <button
              className="qnp-create-first-btn"
              onClick={(e) => { e.stopPropagation(); onCreateNote?.(); }}
            >
              <i className="pi pi-plus" /> Crear nota
            </button>
          </div>
        ) : (
          notes.map((note) => {
            const preview = htmlToPlainText(note.data?.content);
            const updatedAt = note.data?.updatedAt || note.data?.createdAt;
            return (
              <div
                key={note.key}
                className="qnp-note-item"
                onClick={(e) => handleNoteClick(e, note)}
                title={note.label}
              >
                <div className="qnp-note-header">
                  <span className="qnp-note-title">{note.label}</span>
                  <button
                    className="qnp-delete-btn"
                    onClick={(e) => handleDeleteClick(e, note)}
                    title="Eliminar nota"
                  >
                    <i className="pi pi-trash" />
                  </button>
                </div>
                {updatedAt && (
                  <span className="qnp-note-date">{formatDate(updatedAt)}</span>
                )}
                {preview && (
                  <p className="qnp-note-preview">{preview}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Renderizar vía portal para escapar de cualquier overflow:hidden padre
  return ReactDOM.createPortal(panel, document.body);
};

export default QuickNotesSidePanel;
