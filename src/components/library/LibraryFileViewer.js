import React, { useCallback, useMemo, useState } from 'react';
import { viewerKindFor, formatFileSize } from '../../shared/library-mime';
import { useLibraryFile } from './useLibraryFile';
import ImageViewer from './viewers/ImageViewer';
import TextViewer from './viewers/TextViewer';
import MarkdownViewer from './viewers/MarkdownViewer';
import MediaViewer from './viewers/MediaViewer';
import '../../styles/components/library-viewer.css';

const KIND_ICONS = {
  pdf: 'pi pi-file-pdf',
  image: 'pi pi-image',
  text: 'pi pi-file',
  markdown: 'pi pi-file-edit',
  video: 'pi pi-video',
  audio: 'pi pi-volume-up',
  unsupported: 'pi pi-box'
};

function ViewerState({ icon, title, text, children }) {
  return (
    <div className="library-viewer__state">
      <i className={`library-viewer__state-icon ${icon}`} />
      <div className="library-viewer__state-title">{title}</div>
      {text ? <div className="library-viewer__state-text">{text}</div> : null}
      {children}
    </div>
  );
}

/**
 * Pestaña de visualización de un archivo de la Biblioteca.
 * Elige el sub-visor según el MIME y delega el streaming del contenido en el
 * protocolo nodeterm-library:// (ver src/main/utils/library-protocol.js).
 */
const LibraryFileViewer = ({ fileData }) => {
  const [extraControls, setExtraControls] = useState([]);

  const kind = useMemo(
    () => viewerKindFor(fileData?.mime, fileData?.label || fileData?.relPath || fileData?.absPath),
    [fileData?.mime, fileData?.label, fileData?.relPath, fileData?.absPath]
  );

  const { status, url, text, error, code, reload } = useLibraryFile(fileData, kind);

  const descriptor = useMemo(() => ({
    storage: fileData?.storage === 'linked' ? 'linked' : 'managed',
    relPath: fileData?.relPath || null,
    absPath: fileData?.absPath || null
  }), [fileData?.storage, fileData?.relPath, fileData?.absPath]);

  const handleOpenExternal = useCallback(async () => {
    const result = await window.electron?.library?.openExternal(descriptor);
    if (result && !result.success) {
      console.warn('[LibraryViewer] No se pudo abrir externamente:', result.error);
    }
  }, [descriptor]);

  const handleReveal = useCallback(() => {
    window.electron?.library?.reveal(descriptor);
  }, [descriptor]);

  const handleExport = useCallback(() => {
    window.electron?.library?.exportFile({ ...descriptor, fileName: fileData?.label });
  }, [descriptor, fileData?.label]);

  const metaLabel = useMemo(() => {
    const parts = [];
    if (fileData?.ext) parts.push(fileData.ext.toUpperCase());
    const size = formatFileSize(fileData?.size);
    if (size) parts.push(size);
    if (descriptor.storage === 'linked') parts.push('enlazado');
    return parts.join(' · ');
  }, [fileData?.ext, fileData?.size, descriptor.storage]);

  const renderBody = () => {
    if (status === 'loading') {
      return <ViewerState icon="pi pi-spin pi-spinner" title="Abriendo archivo…" />;
    }
    if (status === 'error') {
      return (
        <ViewerState icon={code === 'LIBRARY_LOCKED' ? 'pi pi-lock' : 'pi pi-exclamation-triangle'} title="No se puede mostrar" text={error}>
          <button type="button" className="library-viewer__btn" onClick={reload}>
            <i className="pi pi-refresh" />
            Reintentar
          </button>
        </ViewerState>
      );
    }

    switch (kind) {
      case 'pdf':
        return (
          // Sin sandbox: el visor PDF de Chromium lo necesita. El protocolo sirve
          // el blob con Content-Type: application/pdf y nosniff, así que un
          // archivo con HTML dentro no puede ejecutarse como documento.
          <iframe className="library-viewer__frame" title={fileData?.label || 'PDF'} src={url} />
        );
      case 'image':
        return <ImageViewer url={url} label={fileData?.label} onControlsChange={setExtraControls} />;
      case 'markdown':
        return <MarkdownViewer text={text} onControlsChange={setExtraControls} />;
      case 'text':
        return <TextViewer text={text} onControlsChange={setExtraControls} />;
      case 'video':
      case 'audio':
        return <MediaViewer url={url} mime={fileData?.mime} kind={kind} />;
      default:
        return (
          <ViewerState
            icon="pi pi-box"
            title="Vista previa no disponible"
            text={`NodeTerm todavía no sabe mostrar archivos ${fileData?.ext ? `.${fileData.ext}` : 'de este tipo'} dentro de la aplicación.`}
          >
            <button type="button" className="library-viewer__btn" onClick={handleOpenExternal}>
              <i className="pi pi-external-link" />
              Abrir con aplicación externa
            </button>
          </ViewerState>
        );
    }
  };

  return (
    <div className="library-viewer">
      <div className="library-viewer__toolbar">
        <div className="library-viewer__title">
          <i className={KIND_ICONS[kind] || KIND_ICONS.unsupported} />
          <span className="library-viewer__name" title={fileData?.label}>{fileData?.label}</span>
          {metaLabel ? <span className="library-viewer__meta">{metaLabel}</span> : null}
        </div>
        <div className="library-viewer__actions">
          {extraControls.map((control) => (
            <button
              key={control.id}
              type="button"
              className={`library-viewer__btn${control.active ? ' is-active' : ''}`}
              title={control.title}
              onClick={control.onClick}
            >
              {control.icon ? <i className={control.icon} /> : null}
              {control.label ? <span>{control.label}</span> : null}
            </button>
          ))}
          <button type="button" className="library-viewer__btn" title="Guardar una copia" onClick={handleExport}>
            <i className="pi pi-download" />
          </button>
          <button type="button" className="library-viewer__btn" title="Mostrar en el explorador" onClick={handleReveal}>
            <i className="pi pi-folder-open" />
          </button>
          <button
            type="button"
            className="library-viewer__btn"
            title="Abrir con aplicación externa"
            onClick={handleOpenExternal}
          >
            <i className="pi pi-external-link" />
          </button>
        </div>
      </div>
      <div className="library-viewer__body">{renderBody()}</div>
    </div>
  );
};

export default React.memo(LibraryFileViewer);
