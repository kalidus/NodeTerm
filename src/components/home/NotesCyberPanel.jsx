import React, { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { isFavorite, toggleFavorite } from '../../utils/connectionStore';
import '../../styles/components/vault-cyber-terminal.css';
import '../../styles/components/notes-cyber-panel.css';

const TYPE_LABEL = {
  document: 'note',
  'quick-note': 'quick'
};

function sanitizeContent(content) {
  if (!content || typeof content !== 'string') return '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="80" viewBox="0 0 350 80"><rect width="100%" height="100%" fill="#1e1e2f"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="12">recurso no disponible</text></svg>`;
  const placeholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const replaced = content.replace(/en-cache:\/\/[^\s"'>\)]*/gi, placeholder);
  return DOMPurify.sanitize(replaced, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['style'],
    ADD_ATTR: ['target']
  });
}

function noteConnection(node) {
  if (!node) return null;
  return {
    id: node.key,
    type: node.data?.type || 'document',
    name: node.label,
    ...node.data
  };
}

export default function NotesCyberPanel({
  node,
  onOpen
}) {
  const data = node?.data || {};
  const type = String(data.type || 'document').toLowerCase();
  const [favStatus, setFavStatus] = useState(false);

  const connection = useMemo(() => noteConnection(node), [node]);

  useEffect(() => {
    if (connection) setFavStatus(isFavorite(connection));
  }, [connection]);

  useEffect(() => {
    const onFavs = () => {
      if (connection) setFavStatus(isFavorite(connection));
    };
    window.addEventListener('connections-updated', onFavs);
    return () => window.removeEventListener('connections-updated', onFavs);
  }, [connection]);

  const sanitized = useMemo(() => sanitizeContent(data.content || ''), [data.content]);
  const hasPreview = !!(sanitized && sanitized.trim() !== '<p></p>' && sanitized.trim() !== '');

  const tags = Array.isArray(data.tags) ? data.tags.filter(Boolean) : [];
  const updated = data.updatedAt || data.modifiedAt || node?.updatedAt || '';

  const handleFav = () => {
    if (!connection) return;
    toggleFavorite(connection);
    setFavStatus(isFavorite(connection));
  };

  if (!node) return null;

  return (
    <div className="vault-cyber notes-cyber" role="region" aria-label="Detalle de nota">
      <div className="vault-cyber-vignette" aria-hidden="true" />
      <div className="vault-cyber-scanlines" aria-hidden="true" />
      <div className="vault-cyber-beam" aria-hidden="true" />

      <header className="vault-cyber-header">
        <div className="vault-cyber-title">{node.label || 'nota'}</div>
        <div className="vault-cyber-count">{TYPE_LABEL[type] || type}</div>
      </header>

      <div className="vault-cyber-fields" style={{ flex: '0 0 auto' }}>
        <div className="vault-cyber-field">
          <span className="vault-cyber-field-label">tipo</span>
          <span className="vault-cyber-meta">{TYPE_LABEL[type] || type}</span>
        </div>
        {tags.length > 0 && (
          <div className="vault-cyber-field">
            <span className="vault-cyber-field-label">tags</span>
            <span className="vault-cyber-meta">{tags.map((t) => `#${t}`).join(' ')}</span>
          </div>
        )}
        {updated ? (
          <div className="vault-cyber-field">
            <span className="vault-cyber-field-label">update</span>
            <span className="vault-cyber-meta">
              {typeof updated === 'number' || /^\d+$/.test(String(updated))
                ? new Date(Number(updated)).toLocaleString()
                : String(updated)}
            </span>
          </div>
        ) : null}
      </div>

      {hasPreview ? (
        <div
          className="notes-cyber-preview"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      ) : (
        <div className="notes-cyber-preview is-empty">nota vacía</div>
      )}

      <div className="notes-cyber-actions">
        <button
          type="button"
          className="notes-cyber-btn is-open"
          onClick={() => onOpen?.(node)}
        >
          abrir
        </button>
        <button
          type="button"
          className={`notes-cyber-btn is-fav${favStatus ? ' is-on' : ''}`}
          onClick={handleFav}
        >
          {favStatus ? 'favorito' : 'fav'}
        </button>
      </div>

      <footer className="vault-cyber-footer">
        <span>doble clic en sidebar abre el editor</span>
        <span className="vault-cyber-status" aria-live="polite" />
      </footer>
    </div>
  );
}
