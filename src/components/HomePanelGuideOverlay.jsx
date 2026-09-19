import React from 'react';

/**
 * Lineas guia de alineacion magnetica mientras se arrastra o redimensiona un panel.
 */
const HomePanelGuideOverlay = ({ guides = [] }) => {
  if (!Array.isArray(guides) || guides.length === 0) return null;

  return (
    <div
      className="home-panel-guide-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden'
      }}
    >
      {guides.map((guide, index) => {
        if (!guide || typeof guide.pos !== 'number') return null;
        const start = Number(guide.start) || 0;
        const end = Number(guide.end) || 0;
        const length = Math.max(0, end - start);
        if (guide.type === 'vertical') {
          return (
            <div
              key={`v-${index}-${guide.pos}`}
              style={{
                position: 'absolute',
                left: guide.pos,
                top: start,
                width: 2,
                height: length,
                marginLeft: -1,
                background: 'rgba(0, 229, 255, 0.9)',
                boxShadow: '0 0 8px rgba(0, 229, 255, 0.75)'
              }}
            />
          );
        }
        return (
          <div
            key={`h-${index}-${guide.pos}`}
            style={{
              position: 'absolute',
              top: guide.pos,
              left: start,
              height: 2,
              width: length,
              marginTop: -1,
              background: 'rgba(0, 229, 255, 0.9)',
              boxShadow: '0 0 8px rgba(0, 229, 255, 0.75)'
            }}
          />
        );
      })}
    </div>
  );
};

export default React.memo(HomePanelGuideOverlay);
