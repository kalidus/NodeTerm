import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { loadXtermModules, getCachedXtermModules } from '../utils/xtermLoader';
import { shouldBlockHumanInput } from '../services/terminalAgentState';
import { createXtermWriteBuffer } from '../utils/xtermWriteBuffer';
import { attachUnicode11, attachVisibleTerminalRenderer, createAiCliTerminalOptions, createDebouncedFn, createStableTerminalFit, createTimerBag, getTerminalScrollback, registerScrollbackSync, useTerminalMemoryGuards } from '../utils/xtermRenderer';
import { setupTerminalClipboard, pasteToTerminal } from '../utils/terminalClipboard';

const ClaudeTerminal = forwardRef(({
  fontFamily = 'Consolas, "Courier New", monospace',
  fontSize = 14,
  theme = {},
  tabId = 'default',
  isIntegrated = false,
  active = true,
  onContextMenu
}, ref) => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const fitAddon = useRef(null);
  const stableFitRef = useRef(null);
  const hasStartedRef = useRef(false);
  const isReadyRef = useRef(false);
  const writeBufferRef = useRef(null);
  const onContextMenuRef = useRef(onContextMenu);
  onContextMenuRef.current = onContextMenu;
  const activeRef = useRef(active);
  activeRef.current = active;
  const [xtermLib, setXtermLib] = useState(() => getCachedXtermModules());
  const rendererRef = useTerminalMemoryGuards(term, xtermLib, active, writeBufferRef);

  useEffect(() => {
    if (xtermLib) return undefined;
    let cancelled = false;
    loadXtermModules().then((lib) => {
      if (!cancelled) setXtermLib(lib);
    }).catch((err) => console.error('[ClaudeTerminal] Error cargando xterm:', err));
    return () => { cancelled = true; };
  }, [xtermLib]);
  // Claude Code renderiza mejor con fondo sólido también en modo integrado
  // para evitar bordes/zonas con colores distintos.
  const terminalBg = theme?.background || '#111827';

  const fitAndSyncSize = () => {
    const stable = stableFitRef.current;
    if (stable) {
      stable.fit(term.current, fitAddon.current, terminalRef.current);
    }
  };

  useImperativeHandle(ref, () => ({
    fit: () => {
      fitAndSyncSize();
    },
    focus: () => term.current?.focus(),
    clear: () => term.current?.clear(),
    getSelection: () => term.current?.getSelection() || '',
    selectAll: () => {
      term.current?.selectAll();
    },
    paste: (text) => {
      pasteToTerminal(term, text, (data) => {
        window.electron?.ipcRenderer.send(`claude:data:${tabId}`, data);
      });
    }
  }), [tabId]);

  useEffect(() => {
    if (!xtermLib) return;
    const { Terminal, FitAddon, WebLinksAddon, Unicode11Addon, WebglAddon, CanvasAddon } = xtermLib;
    hasStartedRef.current = false;
    isReadyRef.current = false;

    term.current = new Terminal(createAiCliTerminalOptions({
      fontFamily,
      fontSize,
      theme,
      background: terminalBg,
      scrollback: getTerminalScrollback(),
      allowTransparency: isIntegrated,
      cursor: '#60a5fa',
      selection: 'rgba(96, 165, 250, 0.3)'
    }));

    fitAddon.current = new FitAddon();
    const stableFit = createStableTerminalFit();
    stableFitRef.current = stableFit;
    term.current.loadAddon(fitAddon.current);
    term.current.loadAddon(new WebLinksAddon());
    attachUnicode11(term.current, Unicode11Addon);
    term.current.open(terminalRef.current);
    fitAndSyncSize();
    writeBufferRef.current = createXtermWriteBuffer(term, { active: !!activeRef.current });
    rendererRef.current = attachVisibleTerminalRenderer(term.current, { WebglAddon, CanvasAddon }, !!activeRef.current);
    const timers = createTimerBag();
    const debouncedFit = createDebouncedFn(() => {
      if (stableFit.isFitting()) return;
      fitAndSyncSize();
    }, 50);
    term.current.focus();

    window.electron?.claude?.validateConfig?.().then((result) => {
      if (result && result.valid === false && result.error) {
        term.current?.writeln(`\x1b[31m${result.error}\x1b[0m`);
      }
    }).catch(() => {});

    const startClaudeSession = () => {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

      window.electron?.ipcRenderer.send('register-tab-events', tabId);
      timers.later(() => {
        window.electron?.ipcRenderer.send(`claude:start:${tabId}`, {
          cols: term.current?.cols || 120,
          rows: term.current?.rows || 30
        });
      }, 25);
    };
    startClaudeSession();

    const cleanupClipboard = setupTerminalClipboard({
      term: term.current,
      container: terminalRef.current,
      tabId,
      onContextMenu: (e, id) => {
        if (typeof onContextMenuRef.current === 'function') {
          onContextMenuRef.current(e, id);
        }
      },
      onSendData: (data) => {
        window.electron?.ipcRenderer.send(`claude:data:${tabId}`, data);
      }
    });

    const dataHandler = term.current.onData((data) => {
      if (shouldBlockHumanInput(tabId)) return;
      window.electron?.ipcRenderer.send(`claude:data:${tabId}`, data);
    });

    const resizeHandler = term.current.onResize(({ cols, rows }) => {
      window.electron?.ipcRenderer.send(`claude:resize:${tabId}`, { cols, rows });
    });

    const onDataUnsubscribe = window.electron?.ipcRenderer.on(`claude:data:${tabId}`, (data) => {
      writeBufferRef.current?.write(data);
    });

    const onReadyUnsubscribe = window.electron?.ipcRenderer.on(`claude:ready:${tabId}`, () => {
      isReadyRef.current = true;
      fitAndSyncSize();
    });

    const onErrorUnsubscribe = window.electron?.ipcRenderer.on(`claude:error:${tabId}`, (error) => {
      term.current?.writeln(`\x1b[31mClaude Error: ${error}\x1b[0m`);
    });

    const resizeObserver = new ResizeObserver(() => {
      if (stableFit.isFitting()) return;
      debouncedFit();
    });
    if (terminalRef.current) resizeObserver.observe(terminalRef.current);

    const handleWindowResize = () => {
      if (stableFit.isFitting()) return;
      debouncedFit();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden && activeRef.current) {
        debouncedFit();
      }
    };
    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    timers.later(() => {
      if (!isReadyRef.current) {
        hasStartedRef.current = false;
        startClaudeSession();
      }
    }, 2000);

    return () => {
      if (cleanupClipboard) cleanupClipboard();
      writeBufferRef.current?.clear();
      resizeObserver.disconnect();
      debouncedFit.cancel();
      stableFit.reset();
      stableFitRef.current = null;
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      timers.clear();
      window.electron?.ipcRenderer.send(`claude:stop:${tabId}`);
      if (onDataUnsubscribe) onDataUnsubscribe();
      if (onReadyUnsubscribe) onReadyUnsubscribe();
      if (onErrorUnsubscribe) onErrorUnsubscribe();
      dataHandler.dispose();
      resizeHandler.dispose();
      term.current?.dispose();
    };
  }, [tabId, xtermLib]);

  useEffect(() => {
    return registerScrollbackSync(term);
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const id = setTimeout(() => {
      fitAndSyncSize();
      const rows = term.current?.rows || 0;
      if (rows > 0) {
        try { term.current.refresh(0, rows - 1); } catch (_) {}
      }
    }, 50);
    return () => clearTimeout(id);
  }, [active]);

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
          .claude-terminal-shell,
          .claude-terminal-shell .xterm,
          .claude-terminal-shell .xterm-viewport,
          .claude-terminal-shell .xterm-screen,
          .claude-terminal-shell .xterm-helpers {
            background: ${terminalBg} !important;
            background-color: ${terminalBg} !important;
          }
        `}
      </style>
      <div
        className="claude-terminal-shell"
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

export default ClaudeTerminal;
