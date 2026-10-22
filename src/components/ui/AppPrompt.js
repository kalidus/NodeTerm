/**
 * AppPrompt - diálogo de texto themed (reemplazo de window.prompt en Electron).
 *
 * Uso:
 *   const url = await appPrompt({ header: 'URL', defaultValue: 'https://' });
 *   // null si cancela, string si acepta
 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { InputText } from 'primereact/inputtext';
import AppDialog from './AppDialog';

let hostRoot = null;
let hostEl = null;

function ensureHost() {
  if (hostEl && hostRoot) return hostRoot;
  hostEl = document.createElement('div');
  hostEl.id = 'app-prompt-host';
  document.body.appendChild(hostEl);
  hostRoot = createRoot(hostEl);
  return hostRoot;
}

function PromptDialog({ header, message, defaultValue, placeholder, acceptLabel, rejectLabel, onDone }) {
  const [value, setValue] = useState(defaultValue || '');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const el = inputRef.current;
      if (el && typeof el.focus === 'function') {
        el.focus();
        if (typeof el.select === 'function') el.select();
      }
    }, 80);
    return () => clearTimeout(t);
  }, []);

  const accept = () => onDone(value);
  const reject = () => onDone(null);

  return (
    <AppDialog
      visible
      headerTitle={header}
      headerIcon="pi pi-pencil"
      onHide={reject}
      size="sm"
      className="app-confirm-dialog"
      style={{ width: 'min(420px, 92vw)' }}
      dismissableMask
      cancelLabel={rejectLabel}
      confirmLabel={acceptLabel}
      confirmIcon="pi pi-check"
      onConfirm={accept}
    >
      {message ? <p style={{ margin: '0 0 10px', opacity: 0.85, fontSize: '0.9rem' }}>{message}</p> : null}
      <InputText
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            accept();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            reject();
          }
        }}
        placeholder={placeholder}
        autoFocus
        style={{ width: '100%' }}
      />
    </AppDialog>
  );
}

/**
 * @param {object} options
 * @param {string} [options.header]
 * @param {string} [options.message]
 * @param {string} [options.defaultValue]
 * @param {string} [options.placeholder]
 * @param {string} [options.acceptLabel]
 * @param {string} [options.rejectLabel]
 * @returns {Promise<string|null>}
 */
export function appPrompt(options = {}) {
  const {
    header = 'Introducir valor',
    message = '',
    defaultValue = '',
    placeholder = '',
    acceptLabel = 'Aceptar',
    rejectLabel = 'Cancelar'
  } = options;

  return new Promise((resolve) => {
    const root = ensureHost();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      root.render(null);
      resolve(result);
    };

    root.render(
      <PromptDialog
        header={header}
        message={message}
        defaultValue={defaultValue}
        placeholder={placeholder}
        acceptLabel={acceptLabel}
        rejectLabel={rejectLabel}
        onDone={finish}
      />
    );
  });
}

export default appPrompt;
