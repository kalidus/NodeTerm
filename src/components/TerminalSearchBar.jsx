import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getLastTerminalSearchTerm,
  getTerminalSearch,
  setLastTerminalSearchTerm,
  subscribeTerminalSearchOpen
} from '../utils/terminalSearch';

/**
 * Barra de búsqueda embebida en un panel de terminal (una instancia por tabId).
 */
export default function TerminalSearchBar({ tabId }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [resultIndex, setResultIndex] = useState(-1);
  const [resultCount, setResultCount] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const runFind = useCallback((direction, nextQuery, incremental = false) => {
    if (!tabId) return;
    const api = getTerminalSearch(tabId);
    if (!api) return;
    const q = typeof nextQuery === 'string' ? nextQuery : query;
    const opts = { incremental, caseSensitive };
    if (direction === 'prev') {
      api.findPrevious(q, opts);
    } else {
      api.findNext(q, opts);
    }
  }, [tabId, query, caseSensitive]);

  const close = useCallback(() => {
    if (tabId) {
      getTerminalSearch(tabId)?.clear();
    }
    setOpen(false);
    setResultIndex(-1);
    setResultCount(0);
  }, [tabId]);

  useEffect(() => {
    if (!tabId) return undefined;
    return subscribeTerminalSearchOpen((id) => {
      if (id !== tabId) return;
      if (!getTerminalSearch(id)) return;
      setQuery(getLastTerminalSearchTerm());
      setOpen(true);
      setResultIndex(-1);
      setResultCount(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    });
  }, [tabId]);

  useEffect(() => {
    if (!open || !tabId) return undefined;
    const api = getTerminalSearch(tabId);
    if (!api) {
      close();
      return undefined;
    }
    return api.onDidChangeResults(({ resultIndex: idx, resultCount: count }) => {
      setResultIndex(typeof idx === 'number' ? idx : -1);
      setResultCount(typeof count === 'number' ? count : 0);
    });
  }, [open, tabId, close]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  useEffect(() => () => {
    if (tabId) {
      try { getTerminalSearch(tabId)?.clear(); } catch (_) { /* noop */ }
    }
  }, [tabId]);

  if (!open || !tabId) return null;

  const resultLabel = !query
    ? ''
    : resultCount === 0
      ? 'Sin resultados'
      : resultIndex < 0
        ? `${resultCount}+`
        : `${resultIndex + 1} / ${resultCount}`;

  return (
    <div
      className="terminal-search-bar"
      role="search"
      aria-label="Buscar en el terminal"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <i className="pi pi-search terminal-search-bar__icon" aria-hidden="true" />
      <input
        ref={inputRef}
        className="terminal-search-bar__input"
        type="text"
        value={query}
        placeholder="Buscar…"
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          setLastTerminalSearchTerm(value);
          runFind('next', value, true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            runFind(e.shiftKey ? 'prev' : 'next', query, false);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        }}
      />
      <span className="terminal-search-bar__count" aria-live="polite">
        {resultLabel}
      </span>
      <button
        type="button"
        className={`terminal-search-bar__btn ${caseSensitive ? 'is-active' : ''}`}
        title="Distinguir mayúsculas"
        aria-pressed={caseSensitive}
        onClick={() => {
          setCaseSensitive((prev) => {
            const next = !prev;
            const api = getTerminalSearch(tabId);
            if (api && query) {
              api.findNext(query, { caseSensitive: next, incremental: true });
            }
            return next;
          });
        }}
      >
        Aa
      </button>
      <button
        type="button"
        className="terminal-search-bar__btn"
        title="Anterior (Shift+Enter)"
        onClick={() => runFind('prev', query, false)}
      >
        <i className="pi pi-chevron-up" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="terminal-search-bar__btn"
        title="Siguiente (Enter)"
        onClick={() => runFind('next', query, false)}
      >
        <i className="pi pi-chevron-down" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="terminal-search-bar__btn"
        title="Cerrar (Esc)"
        onClick={close}
      >
        <i className="pi pi-times" aria-hidden="true" />
      </button>
    </div>
  );
}
