import React, { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/** Visor de Markdown renderizado, con alternancia a código fuente. */
const MarkdownViewer = ({ text, onControlsChange }) => {
  const [showSource, setShowSource] = useState(false);

  const html = useMemo(() => {
    if (showSource) return '';
    try {
      return DOMPurify.sanitize(marked.parse(text || '', { breaks: true, gfm: true }), {
        ADD_ATTR: ['target', 'rel']
      });
    } catch (err) {
      return DOMPurify.sanitize(`<p>No se pudo renderizar el Markdown: ${err.message}</p>`);
    }
  }, [text, showSource]);

  useEffect(() => {
    if (typeof onControlsChange !== 'function') return undefined;
    onControlsChange([
      {
        id: 'source',
        icon: 'pi pi-code',
        title: 'Ver código fuente',
        active: showSource,
        onClick: () => setShowSource((s) => !s)
      }
    ]);
    return () => onControlsChange([]);
  }, [onControlsChange, showSource]);

  if (showSource) {
    return <pre className="library-viewer__text is-wrapped">{text}</pre>;
  }

  return (
    <div
      className="library-viewer__markdown"
      // Contenido saneado con DOMPurify justo arriba
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default React.memo(MarkdownViewer);
