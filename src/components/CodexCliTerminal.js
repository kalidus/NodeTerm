import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { loadXtermModules, getCachedXtermModules } from '../utils/xtermLoader';
import { shouldBlockHumanInput } from '../services/terminalAgentState';
import { createXtermWriteBuffer } from '../utils/xtermWriteBuffer';
import { attachTerminalRenderer, getTerminalScrollback, registerScrollbackSync } from '../utils/xtermRenderer';

const CodexCliTerminal = forwardRef(({
  fontFamily = 'Consolas, "Courier New", monospace',
  fontSize = 14,
  theme = {},
  tabId = 'default',
  isIntegrated = false,
  active = true
}, ref) => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const fitAddon = useRef(null);
  const hasStartedRef = useRef(false);
  const isReadyRef = useRef(false);
  const writeBufferRef = useRef(null);
  const [xtermLib, setXtermLib] = useState(() => getCachedXtermModules());

  useEffect(() => {
    if (xtermLib) return undefined;
    let cancelled = false;
    loadXtermModules().then((lib) => {
      if (!cancelled) setXtermLib(lib);
    }).catch((err) => console.error('[CodexCliTerminal] Error cargando xterm:', err));
    return () => { cancelled = true; };
  }, [xtermLib]);
  const terminalBg = theme?.background || '#111827';

  const fitAndSyncSize = () => {
    try {
      if (!term.current || !fitAddon.current || !terminalRef.current) return;
      if (terminalRef.current.offsetWidth <= 0 || terminalRef.current.offsetHeight <= 0) return;
      fitAddon.current.fit();
      window.electron?.ipcRenderer.send(`codexcli:resize:${tabId}`, {
        cols: term.current.cols,
        rows: term.current.rows
      });
    } catch {
      // noop
    }
  };

  useImperativeHandle(ref, () => ({
    fit: () => {
      fitAndSyncSize();
    },
    focus: () => term.current?.focus(),
    clear: () => term.current?.clear(),
    getSelection: () => term.current?.getSelection() || '',
    paste: (text) => {
      if (text) {
        window.electron?.ipcRenderer.send(`codexcli:data:${tabId}`, text);
      }
    }
  }));

  useEffect(() => {
    if (!xtermLib) return;
    const { Terminal, FitAddon, WebLinksAddon, WebglAddon, CanvasAddon } = xtermLib;
    hasStartedRef.current = false;
    isReadyRef.current = false;

    term.current = new Terminal({
      cursorBlink: true,
      fontFamily,
      fontSize,
      convertEol: true,
      scrollback: getTerminalScrollback(),
      allowTransparency: isIntegrated,
      theme: {
        background: terminalBg,
        foreground: theme?.foreground || '#e5e7eb',
        cursor: theme?.cursor || '#10b981',
        selection: theme?.selection || 'rgba(16, 185, 129, 0.3)',
        ...theme
      },
      cols: 120,
      rows: 30
    });

    fitAddon.current = new FitAddon();
    term.current.loadAddon(fitAddon.current);
    term.current.loadAddon(new WebLinksAddon());
    term.current.open(terminalRef.current);
    fitAndSyncSize();
    writeBufferRef.current = createXtermWriteBuffer(term);
    attachTerminalRenderer(term.current, { WebglAddon, CanvasAddon });
    setTimeout(fitAndSyncSize, 80);
    setTimeout(fitAndSyncSize, 180);
    setTimeout(fitAndSyncSize, 320);
    term.current.focus();

    window.electron?.codexcli?.validateConfig?.().then((result) => {
      if (result && result.valid === false && result.error) {
        term.current?.writeln(`\x1b[31m${result.error}\x1b[0m`);
      }
    }).catch(() => {});

    const startCodexCliSession = () => {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

      window.electron?.ipcRenderer.send('register-tab-events', tabId);
      setTimeout(() => {
        window.electron?.ipcRenderer.send(`codexcli:start:${tabId}`, {
          cols: term.current?.cols || 120,
          rows: term.current?.rows || 30
        });
      }, 25);
    };
    startCodexCliSession();

    const keyHandler = term.current.onKey(({ domEvent }) => {
      const isMac = window.electron?.platform === 'darwin';
      const modifierKey = isMac ? domEvent.metaKey : domEvent.ctrlKey;

      if (modifierKey && domEvent.key === 'c') {
        const selection = term.current?.getSelection();
        if (selection) {
          window.electron?.clipboard?.writeText?.(selection);
          domEvent.preventDefault();
        }
      } else if (modifierKey && domEvent.key === 'v') {
        domEvent.preventDefault();
        window.electron?.clipboard?.readText?.().then((text) => {
          if (!text) return;
          term.current?.focus();
          setTimeout(() => {
            window.electron?.ipcRenderer.send(`codexcli:data:${tabId}`, text);
            term.current?.focus();
          }, 10);
        });
      }
    });

    const dataHandler = term.current.onData((data) => {
      if (shouldBlockHumanInput(tabId)) return;
      window.electron?.ipcRenderer.send(`codexcli:data:${tabId}`, data);
    });

    const resizeHandler = term.current.onResize(({ cols, rows }) => {
      window.electron?.ipcRenderer.send(`codexcli:resize:${tabId}`, { cols, rows });
    });

    const onDataUnsubscribe = window.electron?.ipcRenderer.on(`codexcli:data:${tabId}`, (data) => {
      writeBufferRef.current?.write(data);
    });

    const onReadyUnsubscribe = window.electron?.ipcRenderer.on(`codexcli:ready:${tabId}`, () => {
      isReadyRef.current = true;
      setTimeout(fitAndSyncSize, 10);
      setTimeout(fitAndSyncSize, 120);
      setTimeout(fitAndSyncSize, 280);
    });

    const onErrorUnsubscribe = window.electron?.ipcRenderer.on(`codexcli:error:${tabId}`, (error) => {
      term.current?.writeln(`\x1b[31mCodex CLI Error: ${error}\x1b[0m`);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAndSyncSize();
    });
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    const handleWindowResize = () => fitAndSyncSize();
    const handleVisibilityChange = () => {
      if (!document.hidden && active) {
        setTimeout(fitAndSyncSize, 100);
      }
    };
    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const contextMenuHandler = (e) => {
      e.preventDefault();
      window.electron?.clipboard?.readText?.().then((text) => {
        if (text) {
          window.electron?.ipcRenderer.send(`codexcli:data:${tabId}`, text);
        }
      });
    };
    terminalRef.current?.addEventListener('contextmenu', contextMenuHandler);

    const startupSyncTimers = [400, 700, 1100, 1700, 2600].map(ms => setTimeout(fitAndSyncSize, ms));
    const startRetryTimers = [900, 1800, 3200].map((ms) => setTimeout(() => {
      if (!isReadyRef.current) {
        hasStartedRef.current = false;
        startCodexCliSession();
      }
    }, ms));

    return () => {
      writeBufferRef.current?.clear();
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      startupSyncTimers.forEach(clearTimeout);
      startRetryTimers.forEach(clearTimeout);
      window.electron?.ipcRenderer.send(`codexcli:stop:${tabId}`);
      if (onDataUnsubscribe) onDataUnsubscribe();
      if (onReadyUnsubscribe) onReadyUnsubscribe();
      if (onErrorUnsubscribe) onErrorUnsubscribe();
      terminalRef.current?.removeEventListener('contextmenu', contextMenuHandler);
      keyHandler.dispose();
      dataHandler.dispose();
      resizeHandler.dispose();
      term.current?.dispose();
    };
  }, [tabId, xtermLib]);

  useEffect(() => {
    return registerScrollbackSync(term);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      minWidth: 0,
      minHeight: 0,
      overflow: 'hidden',
      background: terminalBg,
      padding: '8px 10px 2px 10px',
      marginBottom: '-1px'
    }}>
      <style>
        {`
          .codexcli-terminal-shell,
          .codexcli-terminal-shell .xterm,
          .codexcli-terminal-shell .xterm-viewport,
          .codexcli-terminal-shell .xterm-screen,
          .codexcli-terminal-shell .xterm-helpers {
            background: ${terminalBg} !important;
            background-color: ${terminalBg} !important;
          }
        `}
      </style>
      <div
        className="codexcli-terminal-shell"
        ref={terminalRef}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          background: terminalBg
        }}
      />
    </div>
  );
});

export default CodexCliTerminal;
