import React from 'react';

/** Reproductor nativo para vídeo y audio; el seek usa Range del protocolo. */
const MediaViewer = ({ url, mime, kind }) => {
  if (kind === 'audio') {
    return (
      <audio className="library-viewer__media library-viewer__media--audio" controls preload="metadata" src={url}>
        <source src={url} type={mime || undefined} />
      </audio>
    );
  }

  return (
    <video className="library-viewer__media" controls preload="metadata" src={url}>
      <source src={url} type={mime || undefined} />
    </video>
  );
};

export default React.memo(MediaViewer);
