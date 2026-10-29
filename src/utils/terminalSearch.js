/**
 * Búsqueda en scrollback de xterm (@xterm/addon-search).
 * Un registro por tabId; cada TerminalSearchBar embebido escucha su propio tabId.
 */

const OPEN_EVENT = 'nodeterm-terminal-search-open';
const DEFAULT_DECORATIONS = {
  matchBackground: '#515c7a',
  matchBorder: '#515c7a',
  matchOverviewRuler: '#515c7a',
  activeMatchBackground: '#ea5c0055',
  activeMatchBorder: '#f6ae54',
  activeMatchColorOverviewRuler: '#f6ae54'
};

const registry = new Map();
let lastSearchTerm = '';

export function getLastTerminalSearchTerm() {
  return lastSearchTerm;
}

export function setLastTerminalSearchTerm(term) {
  lastSearchTerm = typeof term === 'string' ? term : '';
}

export function getTerminalSearch(tabId) {
  if (!tabId) return null;
  return registry.get(tabId) || null;
}

export function openTerminalSearch(tabId) {
  if (!tabId || !registry.has(tabId)) return false;
  try {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { tabId } }));
    return true;
  } catch (_) {
    return false;
  }
}

export function subscribeTerminalSearchOpen(handler) {
  if (typeof handler !== 'function') return () => {};
  const listener = (event) => {
    const id = event?.detail?.tabId;
    if (id) handler(id);
  };
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}

/**
 * Instala SearchAddon y lo registra por tabId.
 * @returns {() => void} cleanup (unregister + dispose addon)
 */
export function attachTerminalSearch(termInstance, tabId, SearchAddon) {
  if (!termInstance || !tabId || typeof SearchAddon !== 'function') {
    return () => {};
  }

  const existing = registry.get(tabId);
  if (existing) {
    try { existing.dispose(); } catch (_) {}
    registry.delete(tabId);
  }

  let addon = null;
  try {
    addon = new SearchAddon({ highlightLimit: 1000 });
    termInstance.loadAddon(addon);
  } catch (err) {
    console.warn('[terminalSearch] No se pudo cargar SearchAddon:', err?.message || err);
    return () => {};
  }

  const buildOptions = (incremental = false) => ({
    caseSensitive: false,
    incremental: !!incremental,
    decorations: DEFAULT_DECORATIONS
  });

  const resolveOptions = (opts = {}, incremental = false) => {
    const options = buildOptions(incremental);
    if (typeof opts.caseSensitive === 'boolean') {
      options.caseSensitive = opts.caseSensitive;
    }
    return options;
  };

  const entry = {
    tabId,
    findNext(term, opts = {}) {
      const q = typeof term === 'string' ? term : '';
      setLastTerminalSearchTerm(q);
      if (!q) {
        try { addon.clearDecorations(); } catch (_) {}
        return false;
      }
      try {
        return !!addon.findNext(q, resolveOptions(opts, !!opts.incremental));
      } catch (_) {
        return false;
      }
    },
    findPrevious(term, opts = {}) {
      const q = typeof term === 'string' ? term : '';
      setLastTerminalSearchTerm(q);
      if (!q) {
        try { addon.clearDecorations(); } catch (_) {}
        return false;
      }
      try {
        return !!addon.findPrevious(q, resolveOptions(opts, false));
      } catch (_) {
        return false;
      }
    },
    clear() {
      try { addon.clearDecorations(); } catch (_) {}
    },
    onDidChangeResults(cb) {
      if (!addon?.onDidChangeResults || typeof cb !== 'function') return () => {};
      try {
        const disposable = addon.onDidChangeResults(cb);
        return () => {
          try { disposable?.dispose?.(); } catch (_) {}
        };
      } catch (_) {
        return () => {};
      }
    },
    dispose() {
      try { addon.clearDecorations(); } catch (_) {}
      try { addon.dispose(); } catch (_) {}
    }
  };

  registry.set(tabId, entry);

  return () => {
    const current = registry.get(tabId);
    if (current === entry) {
      registry.delete(tabId);
    }
    try { entry.dispose(); } catch (_) {}
  };
}

/** True si el atajo debe abrir búsqueda (Ctrl/Cmd+F o Ctrl/Cmd+Shift+F). */
export function isTerminalSearchShortcut(domEvent) {
  if (!domEvent || domEvent.type !== 'keydown') return false;
  const key = domEvent.key ? domEvent.key.toLowerCase() : '';
  if (key !== 'f') return false;
  const isMac = typeof window !== 'undefined' && window.electron?.platform === 'darwin';
  return isMac ? !!domEvent.metaKey : !!domEvent.ctrlKey;
}
