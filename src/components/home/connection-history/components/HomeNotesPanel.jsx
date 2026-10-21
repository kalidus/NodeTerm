import React, { useMemo } from 'react';
import { flattenVaultNodes, NOTE_TYPES } from '../../../../utils/homeWidgets';

export const HomeNotesPanel = ({
  documentNodes = []
}) => {
  const notes = useMemo(() => {
    const flat = flattenVaultNodes(documentNodes, NOTE_TYPES);
    return flat
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 12);
  }, [documentNodes]);

  const openNote = (item) => {
    window.dispatchEvent(new CustomEvent('open-document-tab', {
      detail: {
        key: item.key || item.id,
        label: item.label || item.name,
        data: item
      }
    }));
  };

  if (!notes.length) {
    return (
      <div className="home-widget-empty">
        No hay notas rápidas.
        <div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-documents-sidebar'))}
          >
            Abrir notas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-widget-list">
      <div className="home-widget-list-scroll">
        {notes.map((item) => (
          <button
            key={item.key || item.id}
            type="button"
            className="home-widget-row"
            style={{ '--tile-color': '#64b5f6' }}
            onClick={() => openNote(item)}
          >
            <i className="pi pi-file" style={{ color: '#64b5f6' }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="home-fav-name">{item.name || item.label || 'Nota'}</div>
              <div className="home-widget-meta">
                {Array.isArray(item.tags) && item.tags.length
                  ? item.tags.slice(0, 2).map((t) => `#${t}`).join(' ')
                  : (item.type || 'document')}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeNotesPanel;
