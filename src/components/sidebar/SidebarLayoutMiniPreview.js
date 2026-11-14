import React from 'react';

/** Siluetas abstractas para la rejilla de vistas del menú de apariencia. */
const SidebarLayoutMiniPreview = ({ variant = 'tree' }) => {
  const kind = variant || 'tree';
  return (
    <div className={`sap-mini sap-mini--${kind}`} aria-hidden="true">
      {kind === 'tree' && (
        <>
          <span className="sap-mini-line sap-mini-line--root" />
          <span className="sap-mini-line sap-mini-line--indent" />
          <span className="sap-mini-line sap-mini-line--indent sap-mini-line--short" />
          <span className="sap-mini-line sap-mini-line--indent" />
        </>
      )}
      {kind === 'grid' && (
        <div className="sap-mini-grid">
          <span /><span /><span /><span />
        </div>
      )}
      {kind === 'list' && (
        <>
          <span className="sap-mini-row" />
          <span className="sap-mini-row" />
          <span className="sap-mini-row sap-mini-row--short" />
        </>
      )}
      {kind === 'cards' && (
        <div className="sap-mini-cards">
          <span /><span />
        </div>
      )}
      {kind === 'sections' && (
        <>
          <span className="sap-mini-section" />
          <span className="sap-mini-row sap-mini-row--indent" />
          <span className="sap-mini-section" />
          <span className="sap-mini-row sap-mini-row--indent" />
        </>
      )}
      {kind === 'shelf' && (
        <div className="sap-mini-shelf">
          <span /><span /><span /><span /><span />
        </div>
      )}
      {kind === 'index' && (
        <>
          <span className="sap-mini-index" />
          <span className="sap-mini-index" />
          <span className="sap-mini-index sap-mini-index--short" />
        </>
      )}
      {kind === 'timeline' && (
        <div className="sap-mini-timeline">
          <span className="sap-mini-dot" />
          <span className="sap-mini-rail" />
          <span className="sap-mini-dot" />
          <span className="sap-mini-rail" />
          <span className="sap-mini-dot" />
        </div>
      )}
      {kind === 'tags' && (
        <div className="sap-mini-tags">
          <span /><span /><span />
        </div>
      )}
      {kind === 'detail' && (
        <>
          <span className="sap-mini-row" />
          <span className="sap-mini-row sap-mini-row--sub" />
          <span className="sap-mini-row" />
          <span className="sap-mini-row sap-mini-row--sub" />
        </>
      )}
    </div>
  );
};

export default SidebarLayoutMiniPreview;
