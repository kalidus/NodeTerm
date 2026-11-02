import React from 'react';
import '../styles/components/ui-layout-style-option.css';

function LayoutMiniPreview({ layoutId }) {
  const id = layoutId || 'default';

  if (id === 'unified') {
    return (
      <div className="layout-mini layout-mini--unified">
        <div className="layout-mini__bar" />
        <div className="layout-mini__body">
          <div className="layout-mini__side" />
          <div className="layout-mini__main">
            <div className="layout-mini__tabs" />
            <div className="layout-mini__pane" />
          </div>
        </div>
      </div>
    );
  }

  if (id === 'unified-rounded') {
    return (
      <div className="layout-mini layout-mini--unified-rounded">
        <div className="layout-mini__bar" />
        <div className="layout-mini__body">
          <div className="layout-mini__side" />
          <div className="layout-mini__main layout-mini__main--pad">
            <div className="layout-mini__card">
              <div className="layout-mini__tabs" />
              <div className="layout-mini__pane" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id === 'unified-app-rounded') {
    return (
      <div className="layout-mini layout-mini--app-rounded">
        <div className="layout-mini__shell">
          <div className="layout-mini__bar" />
          <div className="layout-mini__body">
            <div className="layout-mini__side" />
            <div className="layout-mini__main">
              <div className="layout-mini__tabs" />
              <div className="layout-mini__pane" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id === 'cyberpunk') {
    return (
      <div className="layout-mini layout-mini--cyberpunk">
        <div className="layout-mini__bar layout-mini__bar--neon" />
        <div className="layout-mini__body layout-mini__body--gap">
          <div className="layout-mini__side layout-mini__side--neon" />
          <div className="layout-mini__main layout-mini__main--neon">
            <div className="layout-mini__tabs layout-mini__tabs--sharp" />
            <div className="layout-mini__pane layout-mini__pane--neon" />
          </div>
        </div>
      </div>
    );
  }

  if (id === 'atelier') {
    return (
      <div className="layout-mini layout-mini--atelier">
        <div className="layout-mini__bar" />
        <div className="layout-mini__body">
          <div className="layout-mini__side">
            <span className="layout-mini__accent" />
          </div>
          <div className="layout-mini__main layout-mini__main--pad">
            <div className="layout-mini__card layout-mini__card--soft" />
            <div className="layout-mini__card layout-mini__card--soft layout-mini__card--grow" />
          </div>
        </div>
        <div className="layout-mini__footer" />
      </div>
    );
  }

  if (id === 'mux') {
    return (
      <div className="layout-mini layout-mini--mux">
        <div className="layout-mini__pane-box layout-mini__pane-box--bar" />
        <div className="layout-mini__body layout-mini__body--gap">
          <div className="layout-mini__pane-box layout-mini__pane-box--side">
            <div className="layout-mini__pane-head" />
          </div>
          <div className="layout-mini__pane-box layout-mini__pane-box--grow">
            <div className="layout-mini__pane-head" />
          </div>
        </div>
        <div className="layout-mini__pane-box layout-mini__pane-box--footer" />
      </div>
    );
  }

  if (id === 'studio') {
    return (
      <div className="layout-mini layout-mini--studio">
        <div className="layout-mini__bar" />
        <div className="layout-mini__body">
          <div className="layout-mini__main">
            <div className="layout-mini__pane" />
          </div>
          <div className="layout-mini__side layout-mini__side--right" />
        </div>
        <div className="layout-mini__footer" />
      </div>
    );
  }

  if (id === 'islas') {
    return (
      <div className="layout-mini layout-mini--islas">
        <div className="layout-mini__island layout-mini__island--bar" />
        <div className="layout-mini__body layout-mini__body--gap">
          <div className="layout-mini__island layout-mini__island--side" />
          <div className="layout-mini__island layout-mini__island--grow" />
        </div>
        <div className="layout-mini__island layout-mini__island--footer" />
      </div>
    );
  }

  if (id === 'dock') {
    return (
      <div className="layout-mini layout-mini--dock">
        <div className="layout-mini__bar layout-mini__bar--thin" />
        <div className="layout-mini__body">
          <div className="layout-mini__side" />
          <div className="layout-mini__main layout-mini__main--pad">
            <span className="layout-mini__pill" />
            <span className="layout-mini__pill layout-mini__pill--dim" />
          </div>
        </div>
        <div className="layout-mini__dock" />
      </div>
    );
  }

  if (id === 'tablero') {
    return (
      <div className="layout-mini layout-mini--tablero">
        <div className="layout-mini__bar layout-mini__bar--brand" />
        <div className="layout-mini__body">
          <div className="layout-mini__side">
            <span className="layout-mini__accent layout-mini__accent--gold" />
          </div>
          <div className="layout-mini__grid">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div className="layout-mini layout-mini--default">
      <div className="layout-mini__bar layout-mini__bar--dots" />
      <div className="layout-mini__body layout-mini__body--gap">
        <div className="layout-mini__card layout-mini__card--side" />
        <div className="layout-mini__card layout-mini__card--grow">
          <div className="layout-mini__tabs" />
          <div className="layout-mini__pane" />
        </div>
      </div>
    </div>
  );
}

export default function UiLayoutStyleOption({ option, selected = false, onSelect }) {
  if (!option) return null;

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      className={`layout-style-option${selected ? ' is-selected' : ''}`}
      onClick={() => {
        if (typeof onSelect === 'function') onSelect(option.id);
      }}
    >
      <div className="layout-style-option-preview" aria-hidden="true">
        <LayoutMiniPreview layoutId={option.id} />
      </div>
      <span className="layout-style-option-label">{option.name}</span>
    </button>
  );
}
