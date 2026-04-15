import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

const ClaudeTerminal = forwardRef(({
  fontFamily = 'Consolas, "Courier New", monospace',
  fontSize = 14,
  theme = {},
  tabId = 'default',
  isIntegrated = false
}, ref) => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const fitAddon = useRef(null);

  useImperativeHandle(ref, () => ({
    fit: () => {
      try {
        fitAddon.current?.fit();
      } catch {
        // noop
      }
    },
    focus: () => term.current?.focus(),
    clear: () => term.current?.clear(),
    getSelection: () => term.current?.getSelection() || '',
    paste: (text) => {
      if (text) {
        window.electron?.ipcRenderer.send(`claude:data:${tabId}`, text);
      }
    }
  }));

  useEffect(() => {
    term.current = new Terminal({
      cursorBlink: true,
      fontFamily,
      fontSize,
      convertEol: true,
      scrollback: parseInt(localStorage.getItem('nodeterm_scrollback_lines') || '1000', 10),
      allowTransparency: isIntegrated,
      theme: {
        background: isIntegrated ? 'rgba(0,0,0,0)' : (theme?.background || '#111827'),
        foreground: theme?.foreground || '#e5e7eb',
        cursor: theme?.cursor || '#60a5fa',
        selection: theme?.selection || 'rgba(96, 165, 250, 0.3)',
        ...theme
      },
      cols: 120,
      rows: 30
    });

    fitAddon.current = new FitAddon();
    term.current.loadAddon(fitAddon.current);
    term.current.loadAddon(new WebLinksAddon());
    term.current.open(terminalRef.current);
    fitAddon.current.fit();
    term.current.focus();

    window.electron?.claude?.validateConfig?.().then((result) => {
      if (result && result.valid === false && result.error) {
        term.current?.writeln(`\x1b[31m${result.error}\x1b[0m`);
      }
    }).catch(() => {});

    window.electron?.ipcRenderer.send(`claude:start:${tabId}`, {
      cols: term.current.cols,
      rows: term.current.rows
    });

    const dataHandler = term.current.onData((data) => {
      window.electron?.ipcRenderer.send(`claude:data:${tabId}`, data);
    });

    const resizeHandler = term.current.onResize(({ cols, rows }) => {
      window.electron?.ipcRenderer.send(`claude:resize:${tabId}`, { cols, rows });
    });

    const onDataUnsubscribe = window.electron?.ipcRenderer.on(`claude:data:${tabId}`, (data) => {
      term.current?.write(data);
    });

    const onErrorUnsubscribe = window.electron?.ipcRenderer.on(`claude:error:${tabId}`, (error) => {
      term.current?.writeln(`\x1b[31mClaude Error: ${error}\x1b[0m`);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.current?.fit();
    });
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      window.electron?.ipcRenderer.send(`claude:stop:${tabId}`);
      if (onDataUnsubscribe) onDataUnsubscribe();
      if (onErrorUnsubscribe) onErrorUnsubscribe();
      dataHandler.dispose();
      resizeHandler.dispose();
      term.current?.dispose();
    };
  }, [tabId]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minWidth: 0,
      minHeight: 0,
      overflow: 'hidden',
      background: isIntegrated ? 'transparent' : (theme?.background || '#111827'),
      padding: '10px'
    }}>
      <div
        ref={terminalRef}
        style={{
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0
        }}
      />
    </div>
  );
});

export default ClaudeTerminal;
