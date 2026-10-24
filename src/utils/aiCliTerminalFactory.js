import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { loadXtermModules, getCachedXtermModules } from './xtermLoader';
import { shouldBlockHumanInput } from '../services/terminalAgentState';
import { createXtermWriteBuffer } from './xtermWriteBuffer';
import {
  attachUnicode11,
  attachVisibleTerminalRenderer,
  createAiCliTerminalOptions,
  createDebouncedFn,
  createStableTerminalFit,
  createTimerBag,
  getTerminalScrollback,
  getWindowsConptyOptions,
  registerScrollbackSync,
  useTerminalMemoryGuards
} from './xtermRenderer';
import { setupTerminalClipboard, pasteToTerminal } from './terminalClipboard';
import {
  resolveTerminalFontFamily,
  ensureTerminalFontsLoaded
} from './resolveTerminalFontFamily';

/**
 * Factory de terminales AI CLI (Claude, OpenCode, Codex, Antigravity, Hermes).
 * Un solo montaje de xterm/IPC; sin reintento de start a los 2s.
 *
 * @param {{
 *   displayName: string,
 *   ipcPrefix: string,
 *   errorLabel: string,
 *   defaultBackground: string,
 *   cursor: string,
 *   selection: string,
 *   shellClass: string,
 *   windowsConpty?: boolean,
 *   validateConfig?: () => Promise<{ valid?: boolean, error?: string } | null | undefined>
 * }} config
 */
export function createAiCliTerminalComponent(config) {
  const {
    displayName,
    ipcPrefix,
    errorLabel,
    defaultBackground,
    cursor,
    selection,
    shellClass,
    windowsConpty = false,
    validateConfig
  } = config;

  const AiCliTerminal = forwardRef(({
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
    const writeBufferRef = useRef(null);
    const onContextMenuRef = useRef(onContextMenu);
    onContextMenuRef.current = onContextMenu;
    const activeRef = useRef(active);
    activeRef.current = active;
    const [xtermLib, setXtermLib] = useState(() => getCachedXtermModules());
    const rendererRef = useTerminalMemoryGuards(term, xtermLib, active, writeBufferRef);
    const terminalBg = theme?.background || defaultBackground;

    const fitAndSyncSize = () => {
      const stable = stableFitRef.current;
      if (stable) {
        stable.fit(term.current, fitAddon.current, terminalRef.current);
      }
    };

    useEffect(() => {
      if (xtermLib) return undefined;
      let cancelled = false;
      loadXtermModules().then((lib) => {
        if (!cancelled) setXtermLib(lib);
      }).catch((err) => console.error(`[${displayName}] Error cargando xterm:`, err));
      return () => { cancelled = true; };
    }, [xtermLib]);

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
          window.electron?.ipcRenderer.send(`${ipcPrefix}:data:${tabId}`, data);
        });
      }
    }), [tabId]);

    useEffect(() => {
      if (!xtermLib) return undefined;
      const { Terminal, FitAddon, WebLinksAddon, Unicode11Addon, WebglAddon, CanvasAddon } = xtermLib;
      hasStartedRef.current = false;
      ensureTerminalFontsLoaded();

      term.current = new Terminal(createAiCliTerminalOptions({
        fontFamily: resolveTerminalFontFamily(fontFamily),
        fontSize,
        theme,
        background: terminalBg,
        scrollback: getTerminalScrollback(),
        allowTransparency: isIntegrated,
        cursor,
        selection,
        windowsPty: windowsConpty ? getWindowsConptyOptions() : undefined
      }));

      fitAddon.current = new FitAddon();
      const stableFit = createStableTerminalFit();
      stableFitRef.current = stableFit;
      term.current.loadAddon(fitAddon.current);
      term.current.loadAddon(new WebLinksAddon());
      attachUnicode11(term.current, Unicode11Addon);
      term.current.open(terminalRef.current);
      fitAndSyncSize();
      let healRaf = null;
      const healViewport = () => {
        if (!term.current) return;
        try { rendererRef.current?.addon?.clearTextureAtlas?.(); } catch (_) {}
        const rows = term.current.rows || 0;
        if (rows > 0) {
          try { term.current.refresh(0, rows - 1); } catch (_) {}
        }
      };
      const scheduleHeal = () => {
        if (healRaf != null) return;
        healRaf = requestAnimationFrame(() => {
          healRaf = null;
          healViewport();
        });
      };
      writeBufferRef.current = createXtermWriteBuffer(term, {
        active: !!activeRef.current,
        onPainted: scheduleHeal
      });
      rendererRef.current = attachVisibleTerminalRenderer(term.current, { WebglAddon, CanvasAddon }, !!activeRef.current);
      const timers = createTimerBag();
      const debouncedFit = createDebouncedFn(() => {
        if (stableFit.isFitting()) return;
        fitAndSyncSize();
      }, 50);
      term.current.focus();

      if (typeof validateConfig === 'function') {
        Promise.resolve(validateConfig()).then((result) => {
          if (result && result.valid === false && result.error) {
            term.current?.writeln(`\x1b[31m${result.error}\x1b[0m`);
          }
        }).catch(() => {});
      }

      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        window.electron?.ipcRenderer.send('register-tab-events', tabId);
        timers.later(() => {
          window.electron?.ipcRenderer.send(`${ipcPrefix}:start:${tabId}`, {
            cols: term.current?.cols || 120,
            rows: term.current?.rows || 30
          });
        }, 25);
      }

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
          window.electron?.ipcRenderer.send(`${ipcPrefix}:data:${tabId}`, data);
        }
      });

      const dataHandler = term.current.onData((data) => {
        if (shouldBlockHumanInput(tabId)) return;
        window.electron?.ipcRenderer.send(`${ipcPrefix}:data:${tabId}`, data);
      });

      const resizeHandler = term.current.onResize(({ cols, rows }) => {
        window.electron?.ipcRenderer.send(`${ipcPrefix}:resize:${tabId}`, { cols, rows });
      });

      const onDataUnsubscribe = window.electron?.ipcRenderer.on(`${ipcPrefix}:data:${tabId}`, (data) => {
        writeBufferRef.current?.write(data);
      });

      const scrollDisposable = term.current.onScroll(() => {
        const buffer = term.current?.buffer?.active;
        if (!buffer) return;
        const atBottom = buffer.viewportY >= buffer.baseY;
        const wasHeld = writeBufferRef.current?.isHeld?.() === true;
        writeBufferRef.current?.setHold(!atBottom);
        if (!atBottom || wasHeld) scheduleHeal();
      });

      const onReadyUnsubscribe = window.electron?.ipcRenderer.on(`${ipcPrefix}:ready:${tabId}`, () => {
        fitAndSyncSize();
      });

      const onErrorUnsubscribe = window.electron?.ipcRenderer.on(`${ipcPrefix}:error:${tabId}`, (error) => {
        term.current?.writeln(`\x1b[31m${errorLabel} Error: ${error}\x1b[0m`);
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

      return () => {
        if (cleanupClipboard) cleanupClipboard();
        if (healRaf != null) cancelAnimationFrame(healRaf);
        scrollDisposable.dispose();
        writeBufferRef.current?.clear();
        resizeObserver.disconnect();
        debouncedFit.cancel();
        stableFit.reset();
        stableFitRef.current = null;
        window.removeEventListener('resize', handleWindowResize);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        timers.clear();
        window.electron?.ipcRenderer.send(`${ipcPrefix}:stop:${tabId}`);
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
            .${shellClass},
            .${shellClass} .xterm,
            .${shellClass} .xterm-viewport,
            .${shellClass} .xterm-screen,
            .${shellClass} .xterm-helpers {
              background: ${terminalBg} !important;
              background-color: ${terminalBg} !important;
            }
          `}
        </style>
        <div
          className={shellClass}
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

  AiCliTerminal.displayName = displayName;
  return AiCliTerminal;
}
