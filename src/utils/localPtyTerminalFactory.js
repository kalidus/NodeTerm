import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { useStatusBarSessionHistory } from '../hooks/useStatusBarSessionHistory';
import { loadXtermModules, getCachedXtermModules } from './xtermLoader';
import StatusBar from '../components/StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';
import { shouldBlockHumanInput } from '../services/terminalAgentState';
import { createXtermWriteBuffer } from './xtermWriteBuffer';
import { attachTerminalSearch } from './terminalSearch';
import TerminalSearchBar from '../components/TerminalSearchBar';
import {
  attachUnicode11,
  attachVisibleTerminalRenderer,
  createStableFitBinding,
  getTerminalScrollback,
  registerScrollbackSync,
  scheduleTerminalActivatePaint,
  useTerminalMemoryGuards
} from './xtermRenderer';
import { useLocalTelemetrySubscription } from '../hooks/useLocalTelemetrySubscription';
import { setupTerminalClipboard, pasteToTerminal } from './terminalClipboard';
import { useLogColorizer } from '../hooks/useLogColorizer';
import { sendPtyUserInput } from './terminalInputSend';
import { resolveTerminalFontFamily, ensureTerminalFontsLoaded } from './resolveTerminalFontFamily';
import { useResumeTerminalFit } from '../hooks/useResumeTerminalFit';
import { publishBroadcastInput } from './localPtyChannel';
import {
  getLocalPtyProfile,
  resolveLocalPtyChannel,
  buildLocalPtyStartPayload,
  localPtyStartDelayMs,
  shouldSendLocalPtyStop,
  localPtyProbeCommand,
  localPtyErrorLabel,
  localPtyUnavailableMessage
} from './localPtySession';

const GNOME_ANSI = {
  black: '#2E3436',
  brightBlack: '#555753',
  red: '#CC0000',
  brightRed: '#EF2929',
  green: '#4E9A06',
  brightGreen: '#8AE234',
  yellow: '#C4A000',
  brightYellow: '#FCE94F',
  blue: '#3465A4',
  brightBlue: '#729FCF',
  magenta: '#75507B',
  brightMagenta: '#AD7FA8',
  cyan: '#06989A',
  brightCyan: '#34E2E2',
  white: '#D3D7CF',
  brightWhite: '#EEEEEC'
};

const CYGWIN_ANSI = {
  black: '#000000',
  red: '#FF6C60',
  green: '#A8FF60',
  yellow: '#FFFFB6',
  blue: '#96CBFE',
  magenta: '#FF73FD',
  cyan: '#C6C5FE',
  white: '#EEEEEE',
  brightBlack: '#7C7C7C',
  brightRed: '#FFB6B0',
  brightGreen: '#CEFFAC',
  brightYellow: '#FFFFCC',
  brightBlue: '#B5DCFE',
  brightMagenta: '#FF9CFE',
  brightCyan: '#DFDFFE',
  brightWhite: '#FFFFFF'
};

function buildInitialTheme(profile, theme, isIntegrated) {
  const background = isIntegrated
    ? 'rgba(0,0,0,0)'
    : (theme?.background || profile.defaultBackground);

  if (profile.palette === 'powershell') {
    return {
      ...theme,
      background,
      foreground: theme?.foreground || '#FFFFFF',
      cursor: theme?.cursor || '#FFFFFF',
      selection: theme?.selection || 'rgba(255, 255, 255, 0.3)',
      black: theme?.black || '#000000',
      brightBlack: theme?.brightBlack || '#666666',
      red: theme?.red || '#E74856',
      brightRed: theme?.brightRed || '#F2B4B8',
      green: theme?.green || '#16C60C',
      brightGreen: theme?.brightGreen || '#B9F2A7',
      yellow: theme?.yellow || '#F9F1A5',
      brightYellow: theme?.brightYellow || '#FCEDA7',
      blue: theme?.blue || '#3B78FF',
      brightBlue: theme?.brightBlue || '#9ECBFF',
      magenta: theme?.magenta || '#B4009E',
      brightMagenta: theme?.brightMagenta || '#FECDFE',
      cyan: theme?.cyan || '#61D6D6',
      brightCyan: theme?.brightCyan || '#9AECEC',
      white: theme?.white || '#CCCCCC',
      brightWhite: theme?.brightWhite || '#F2F2F2'
    };
  }

  if (profile.palette === 'cygwin') {
    return {
      ...theme,
      background,
      foreground: theme?.foreground || '#CCCCCC',
      cursor: theme?.cursor || '#00FF00',
      cursorAccent: '#000000',
      selection: theme?.selection || 'rgba(255, 255, 255, 0.2)',
      ...CYGWIN_ANSI
    };
  }

  return {
    ...theme,
    background,
    foreground: '#FFFFFF',
    cursor: '#FFFFFF',
    selection: 'rgba(255, 255, 255, 0.3)',
    ...GNOME_ANSI
  };
}

function statusBarCssVars(profile, themeName) {
  const themeObj = statusBarThemes[themeName] || statusBarThemes['Default Dark'];
  const colors = themeObj?.colors || {};
  if (profile.statusBarCss === 'compact') {
    return {
      '--statusbar-bg': colors.background,
      '--statusbar-fg': colors.foreground,
      '--statusbar-border': colors.border,
      '--statusbar-badge-bg': colors.badgeBg,
      '--statusbar-badge-fg': colors.badgeFg
    };
  }
  return {
    '--statusbar-bg': colors.background,
    '--statusbar-text': colors.text,
    '--statusbar-border': colors.border,
    '--statusbar-icon-color': colors.iconColor,
    '--statusbar-cpu': colors.cpuBarColor,
    '--statusbar-mem': colors.memoryBarColor,
    '--statusbar-disk': colors.diskBarColor,
    '--statusbar-red-up': colors.networkUpColor,
    '--statusbar-red-down': colors.networkDownColor,
    '--statusbar-sparkline-color': colors.sparklineColor
  };
}

function readStoredStatusBarTheme(profile) {
  try {
    return localStorage.getItem(profile.statusBarStorageKey)
      || (profile.statusBarFallbackKey && localStorage.getItem(profile.statusBarFallbackKey))
      || 'Default Dark';
  } catch {
    return 'Default Dark';
  }
}

const DISPLAY_NAMES = {
  wsl: 'WSLTerminal',
  ubuntu: 'UbuntuTerminal',
  powershell: 'PowerShellTerminal',
  cygwin: 'CygwinTerminal'
};

/**
 * Montaje compartido de xterm/IPC/clipboard/fit para WSL, Ubuntu, PowerShell y Cygwin.
 * El canal y el payload salen de localPtySession.
 *
 * @param {'wsl'|'ubuntu'|'powershell'|'cygwin'} kind
 */
export function createLocalPtyTerminal(kind) {
  const profile = getLocalPtyProfile(kind);

  const LocalPtyTerminal = forwardRef((props, ref) => {
    const {
      fontFamily = profile.defaultFontFamily,
      fontSize = 14,
      theme = {},
      tabId = 'default',
      hideStatusBar = false,
      isIntegrated = false,
      active = true,
      onContextMenu,
      layoutSuspended = false,
      onBroadcastData,
      isBroadcastActive = false,
      broadcastExcludedTargets,
      onTerminalFocus
    } = props;
    const sessionInfo = profile.sessionProp ? props[profile.sessionProp] : null;

    const terminalRef = useRef(null);
    const term = useRef(null);
    const writeBufferRef = useRef(null);
    const activeRef = useRef(active);
    const { push: pushColored, flushPending } = useLogColorizer(term, writeBufferRef, activeRef);
    const fitAddon = useRef(null);
    const { fitStable, beginMount, endMount, isFitting, invalidate } = useRef(
      createStableFitBinding(term, fitAddon, terminalRef)
    ).current;
    const layoutSuspendedRef = useRef(!!layoutSuspended);
    layoutSuspendedRef.current = !!layoutSuspended;
    const onTerminalFocusRef = useRef(onTerminalFocus);
    onTerminalFocusRef.current = onTerminalFocus;
    const onContextMenuRef = useRef(onContextMenu);
    onContextMenuRef.current = onContextMenu;
    const broadcastPropsRef = useRef({});
    broadcastPropsRef.current = { isBroadcastActive, onBroadcastData, broadcastExcludedTargets };
    const sessionInfoRef = useRef(sessionInfo);
    sessionInfoRef.current = sessionInfo;
    useResumeTerminalFit(layoutSuspended, fitStable);
    const [xtermLib, setXtermLib] = useState(() => getCachedXtermModules());
    const rendererRef = useTerminalMemoryGuards(term, xtermLib, active, writeBufferRef);
    const { statusStats, isLoadingStats, telemetryDisabled } = useLocalTelemetrySubscription({
      active,
      enabled: !hideStatusBar
    });
    const sessionHistory = useStatusBarSessionHistory(statusStats);
    const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
      try { return localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic'; } catch { return 'classic'; }
    });
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => readStoredStatusBarTheme(profile));

    const channelOf = () => resolveLocalPtyChannel(kind, sessionInfoRef.current);
    const shellBackground = isIntegrated ? 'transparent' : (theme?.background || profile.defaultBackground);
    const sessionKey = profile.sessionProp
      ? `${sessionInfo?.name || ''}|${sessionInfo?.category || ''}`
      : '';

    useEffect(() => {
      activeRef.current = active;
      if (active) flushPending();
    }, [active, flushPending]);

    useEffect(() => {
      if (xtermLib) return undefined;
      let cancelled = false;
      loadXtermModules().then((lib) => {
        if (!cancelled) setXtermLib(lib);
      }).catch((err) => console.error(`[${DISPLAY_NAMES[kind]}] Error cargando xterm:`, err));
      return () => { cancelled = true; };
    }, [xtermLib]);

    useEffect(() => {
      const command = localPtyProbeCommand(kind, sessionInfo);
      if (!command || !window.electron?.ipcRenderer) return undefined;
      const channel = resolveLocalPtyChannel(kind, sessionInfo);
      window.electron.ipcRenderer.send(`${channel}:data:${tabId}`, command);
      return undefined;
    }, [tabId, sessionInfo?.category, sessionInfo?.name]);

    useEffect(() => {
      if (!profile.refocusOnWindowFocus) return undefined;
      const handleFocus = () => {
        if (activeRef.current && term.current) term.current.focus();
      };
      window.addEventListener('focus', handleFocus);
      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }, [active]);

    useEffect(() => {
      const onStorage = (e) => {
        if (!e) return;
        if (e.key === 'basicapp_statusbar_icon_theme') setStatusBarIconTheme(e.newValue || 'classic');
        if (e.key === profile.statusBarStorageKey) setLocalStatusBarThemeName(e.newValue || 'Default Dark');
      };
      const onThemeChanged = (e) => {
        if (e.detail && e.detail.terminalType === profile.statusBarTerminalType) {
          setLocalStatusBarThemeName(e.detail.theme);
        }
      };
      window.addEventListener('storage', onStorage);
      window.addEventListener('statusbar-theme-changed', onThemeChanged);
      return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('statusbar-theme-changed', onThemeChanged);
      };
    }, []);

    useImperativeHandle(ref, () => {
      const api = {
        fit: () => { fitStable(); },
        focus: () => { term.current?.focus(); },
        getSelection: () => term.current?.getSelection() || '',
        selectAll: () => { term.current?.selectAll(); },
        clear: () => { term.current?.clear(); },
        paste: (text) => {
          pasteToTerminal(term, text, (data) => {
            window.electron?.ipcRenderer.send(`${channelOf()}:data:${tabId}`, data);
            publishBroadcastInput(broadcastPropsRef, tabId, data);
          });
        }
      };
      if (profile.exposeAgentApi) {
        api.agentWrite = (data) => {
          if (!data) return;
          window.electron?.ipcRenderer?.send(`${channelOf()}:data:${tabId}`, data);
        };
        api.getScrollback = (maxLines = 500) => {
          if (!term.current) return '';
          try {
            const buffer = term.current.buffer.active;
            const lines = [];
            const start = Math.max(0, buffer.length - maxLines);
            for (let i = start; i < buffer.length; i++) {
              const line = buffer.getLine(i);
              if (line) lines.push(line.translateToString(true));
            }
            return lines.join('\n');
          } catch (_) {
            return '';
          }
        };
        api.isReady = () => !!term.current;
      }
      return api;
    });

    useEffect(() => {
      if (!xtermLib) return undefined;
      const { Terminal, FitAddon, WebLinksAddon, Unicode11Addon, WebglAddon, CanvasAddon, SearchAddon } = xtermLib;
      ensureTerminalFontsLoaded();

      term.current = new Terminal({
        cursorBlink: true,
        fontFamily: resolveTerminalFontFamily(fontFamily),
        fontSize,
        allowProposedApi: true,
        theme: buildInitialTheme(profile, theme, isIntegrated),
        convertEol: false,
        scrollback: getTerminalScrollback(),
        rightClickSelectsWord: true,
        macOptionIsMeta: true,
        windowsMode: profile.windowsMode,
        allowTransparency: isIntegrated,
        cols: 120,
        rows: 30,
        fastScrollModifier: 'alt',
        fastScrollSensitivity: 5,
        scrollSensitivity: 1,
        disableStdin: false,
        drawBoldTextInBrightColors: true,
        minimumContrastRatio: 1,
        bracketedPasteMode: profile.bracketedPasteMode
      });

      writeBufferRef.current = createXtermWriteBuffer(term, { active: !!active, dropWithMark: true });
      fitAddon.current = new FitAddon();
      const stableFit = beginMount();
      term.current.loadAddon(fitAddon.current);
      term.current.loadAddon(new WebLinksAddon());
      attachUnicode11(term.current, Unicode11Addon);
      const detachSearch = attachTerminalSearch(term.current, tabId, SearchAddon);
      rendererRef.current = attachVisibleTerminalRenderer(term.current, { WebglAddon, CanvasAddon }, !!active);
      term.current.open(terminalRef.current);
      fitStable();
      term.current.focus();

      let focusDisposable = null;
      try {
        if (typeof term.current.onFocus === 'function') {
          focusDisposable = term.current.onFocus(() => {
            onTerminalFocusRef.current?.();
          });
        }
      } catch (_) { /* noop */ }

      const resizeObserver = new ResizeObserver(() => {
        if (layoutSuspendedRef.current || isFitting()) return;
        fitStable();
      });
      if (terminalRef.current) resizeObserver.observe(terminalRef.current);

      let visibilityTimer = null;
      const handleVisibilityChange = () => {
        if (!profile.listenVisibility) return;
        if (!document.hidden && activeRef.current && !layoutSuspendedRef.current) {
          visibilityTimer = setTimeout(() => {
            if (!isFitting()) fitStable();
          }, 100);
        }
      };
      if (profile.listenVisibility) {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      const disposeTerminal = () => {
        try { focusDisposable?.dispose?.(); } catch (_) { /* noop */ }
        resizeObserver.disconnect();
        if (profile.listenVisibility) {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
        if (visibilityTimer) clearTimeout(visibilityTimer);
        try { detachSearch?.(); } catch (_) { /* noop */ }
        endMount(stableFit);
        term.current?.dispose();
      };

      if (!window.electron) {
        const label = localPtyErrorLabel(kind, {
          platform: undefined,
          sessionInfo: sessionInfoRef.current
        });
        term.current.writeln(`\x1b[31m${localPtyUnavailableMessage(kind, label)}\x1b[0m`);
        return disposeTerminal;
      }

      term.current.clear();
      const channelAtStart = resolveLocalPtyChannel(kind, sessionInfoRef.current);
      const delay = localPtyStartDelayMs(kind, tabId);
      window.electron.ipcRenderer.send('register-tab-events', tabId);
      const startTimer = setTimeout(() => {
        const info = sessionInfoRef.current;
        const channel = resolveLocalPtyChannel(kind, info);
        window.electron.ipcRenderer.send(
          `${channel}:start:${tabId}`,
          buildLocalPtyStartPayload(channel, term.current?.cols, term.current?.rows, info)
        );
      }, delay);

      const cleanupClipboard = setupTerminalClipboard({
        term,
        container: terminalRef.current,
        tabId,
        onContextMenu: (event, id) => onContextMenuRef.current?.(event, id),
        onSendData: (data) => {
          window.electron.ipcRenderer.send(`${channelOf()}:data:${tabId}`, data);
          publishBroadcastInput(broadcastPropsRef, tabId, data);
        }
      });

      const dataHandler = term.current.onData((data) => {
        if (shouldBlockHumanInput(tabId)) return;
        sendPtyUserInput(
          (ch, payload) => window.electron.ipcRenderer.send(ch, payload),
          `${channelOf()}:data:${tabId}`,
          data
        );
        publishBroadcastInput(broadcastPropsRef, tabId, data);
      });

      const resizeHandler = term.current.onResize(({ cols, rows }) => {
        if (layoutSuspendedRef.current || !cols || !rows) return;
        window.electron.ipcRenderer.send(`${channelOf()}:resize:${tabId}`, { cols, rows });
      });

      const onDataUnsubscribe = window.electron.ipcRenderer.on(`${channelAtStart}:data:${tabId}`, (data) => {
        pushColored(data);
      });
      const onReadyUnsubscribe = profile.listenReady
        ? window.electron.ipcRenderer.on(`${channelAtStart}:ready:${tabId}`, () => {})
        : null;
      const onErrorUnsubscribe = window.electron.ipcRenderer.on(`${channelAtStart}:error:${tabId}`, (error) => {
        const label = localPtyErrorLabel(kind, {
          platform: window.electron?.platform,
          sessionInfo: sessionInfoRef.current
        });
        term.current?.writeln(`\x1b[31m${label} Error: ${error}\x1b[0m`);
      });

      return () => {
        clearTimeout(startTimer);
        flushPending();
        if (profile.cleanupBuffer === 'flush') writeBufferRef.current?.flushSync();
        else writeBufferRef.current?.clear();
        if (shouldSendLocalPtyStop(kind, {
          navigationType: performance.navigation?.type,
          readyState: document.readyState
        })) {
          window.electron.ipcRenderer.send(`${channelOf()}:stop:${tabId}`);
        }
        if (onDataUnsubscribe) onDataUnsubscribe();
        if (onReadyUnsubscribe) onReadyUnsubscribe();
        if (onErrorUnsubscribe) onErrorUnsubscribe();
        cleanupClipboard();
        dataHandler.dispose();
        resizeHandler.dispose();
        disposeTerminal();
      };
      // El tema y la fuente se actualizan en efectos aparte, igual que antes.
      // sessionKey recrea la sesión si cambia la distro de Ubuntu.
    }, [tabId, xtermLib, sessionKey]);

    useEffect(() => registerScrollbackSync(term), []);

    useEffect(() => {
      if (term.current && fontFamily) {
        term.current.options.fontFamily = resolveTerminalFontFamily(fontFamily);
        invalidate();
        fitStable();
      }
    }, [fontFamily]);

    useEffect(() => {
      if (term.current && fontSize) {
        term.current.options.fontSize = fontSize;
        invalidate();
        fitStable();
      }
    }, [fontSize]);

    useEffect(() => {
      if (term.current && theme) {
        term.current.options.theme = {
          ...term.current.options.theme,
          ...theme,
          background: isIntegrated
            ? 'rgba(0,0,0,0)'
            : (theme?.background || profile.themeUpdateBackground)
        };
      }
    }, [theme, isIntegrated]);

    useEffect(() => {
      if (!fitAddon.current || layoutSuspendedRef.current) return undefined;
      const id = setTimeout(() => {
        if (!isFitting()) fitStable();
      }, 0);
      return () => clearTimeout(id);
    });

    useEffect(() => {
      if (!active || layoutSuspendedRef.current) return undefined;
      return scheduleTerminalActivatePaint(
        () => {
          const el = terminalRef.current;
          const sizeMissing = !el || el.offsetWidth <= 0 || el.offsetHeight <= 0;
          fitStable();
          try { term.current?.focus(); } catch (_) { /* noop */ }
          return {
            needsRetry: sizeMissing,
            cols: term.current?.cols,
            rows: term.current?.rows
          };
        },
        {
          getSize: () => (
            term.current ? { cols: term.current.cols, rows: term.current.rows } : null
          )
        }
      );
    }, [active, tabId]);

    return (
      <div
        onMouseDown={() => onTerminalFocus?.()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          flex: profile.fillFlex ? 1 : undefined,
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative',
          background: shellBackground,
          ...statusBarCssVars(profile, localStatusBarThemeName)
        }}
      >
        <div
          className="terminal-outer-padding"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            width: '100%',
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
            margin: 0,
            padding: '10px',
            marginBottom: (isIntegrated || hideStatusBar) ? 0 : '-1px',
            zIndex: isIntegrated ? 0 : 1,
            background: shellBackground,
            backgroundColor: shellBackground,
            '--terminal-bg': shellBackground
          }}
        >
          <div
            ref={terminalRef}
            style={{
              padding: 0,
              width: '100%',
              height: '100%',
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
              position: 'relative',
              background: shellBackground
            }}
          />
          <TerminalSearchBar tabId={tabId} />
        </div>
        {!hideStatusBar && (
          <StatusBar
            stats={{ ...(statusStats || {}), cpuHistory: sessionHistory.map((s) => s.cpu), sessionHistory }}
            active={true}
            statusBarIconTheme={statusBarIconTheme}
            isLoading={isLoadingStats}
            telemetryDisabled={telemetryDisabled}
            terminalType={profile.statusBarTerminalType}
            fontFamily={fontFamily}
          />
        )}
      </div>
    );
  });

  LocalPtyTerminal.displayName = DISPLAY_NAMES[kind] || 'LocalPtyTerminal';
  return LocalPtyTerminal;
}
