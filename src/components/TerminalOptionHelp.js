import React, { useRef } from 'react';
import { Tooltip } from 'primereact/tooltip';

export function TerminalOptionHelp({ text }) {
  const targetRef = useRef(null);

  if (!text) {
    return null;
  }

  return (
    <>
      <button
        ref={targetRef}
        type="button"
        className="terminal-option-help"
        aria-label={text}
      >
        <i className="pi pi-info-circle" aria-hidden="true"></i>
      </button>
      <Tooltip
        target={targetRef}
        content={text}
        position="top"
        showDelay={280}
        hideDelay={120}
        appendTo={typeof document !== 'undefined' ? document.body : null}
      />
    </>
  );
}
