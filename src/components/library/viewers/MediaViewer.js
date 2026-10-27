import React from 'react';

/** Reproductor nativo para vídeo y audio; el seek usa Range del protocolo. */
const MediaViewer = ({ url, kind, onLoadError }) => {
  const fail = () => onLoadError?.();
  if (kind === 'audio') {
    return (
      <audio
        className="library-viewer__media library-viewer__media--audio"
        controls
        preload="metadata"
        src={url}
        onError={fail}
      />
    );
  }

  return (
    <video className="library-viewer__media" controls preload="metadata" src={url} onError={fail} />
  );
};

export default React.memo(MediaViewer);
