import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { useStatusBarSessionHistory } from '../hooks/useStatusBarSessionHistory';
import { loadXtermModules, getCachedXtermModules } from '../utils/xtermLoader';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';
import { shouldBlockHumanInput } from '../services/terminalAgentState';
import { createXtermWriteBuffer } from '../utils/xtermWriteBuffer';
import { attachTerminalSearch } from '../utils/terminalSearch';
import TerminalSearchBar from './TerminalSearchBar';
import { attachUnicode11, attachVisibleTerminalRenderer, createStableFitBinding, getTerminalScrollback, registerScrollbackSync, useTerminalMemoryGuards } from '../utils/xtermRenderer';
import { systemStatsService } from '../services/SystemStatsService';
import { writeText as clipboardWriteText, readText as clipboardReadText } from '../utils/clipboard';
import { setupTerminalClipboard, pasteToTerminal } from '../utils/terminalClipboard';
import { useLogColorizer } from '../hooks/useLogColorizer';
import { sendPtyUserInput } from '../utils/terminalInputSend';
import {
    resolveTerminalFontFamily,
    ensureTerminalFontsLoaded
} from '../utils/resolveTerminalFontFamily';
import { useResumeTerminalFit } from '../hooks/useResumeTerminalFit';
import { publishBroadcastInput } from '../utils/localPtyChannel';

const CygwinTerminal = forwardRef(({
    fontFamily = '"FiraCode Nerd Font", Consolas, monospace',
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
}, ref) => {
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
    const broadcastPropsRef = useRef({});
    broadcastPropsRef.current = { isBroadcastActive, onBroadcastData, broadcastExcludedTargets };
    useResumeTerminalFit(layoutSuspended, fitStable);
    const [xtermLib, setXtermLib] = useState(() => getCachedXtermModules());
    const rendererRef = useTerminalMemoryGuards(term, xtermLib, active, writeBufferRef);
    const [statusStats, setStatusStats] = useState(null);

    useEffect(() => {
        activeRef.current = active;
        if (active) flushPending();
    }, [active, flushPending]);

    useEffect(() => {
        if (xtermLib) return undefined;
        let cancelled = false;
        loadXtermModules().then((lib) => {
            if (!cancelled) setXtermLib(lib);
        }).catch((err) => console.error('[CygwinTerminal] Error cargando xterm:', err));
        return () => { cancelled = true; };
    }, [xtermLib]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const sessionHistory = useStatusBarSessionHistory(statusStats);
    const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
        try { return localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic'; } catch { return 'classic'; }
    });
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => {
        try { return localStorage.getItem('localCygwinStatusBarTheme') || 'Default Dark'; } catch { return 'Default Dark'; }
    });

    const getScopedStatusBarCssVars = () => {
        const themeObj = statusBarThemes[localStatusBarThemeName] || statusBarThemes['Default Dark'];
        const colors = themeObj.colors || {};
        return {
            '--statusbar-bg': colors.background,
            '--statusbar-fg': colors.foreground,
            '--statusbar-border': colors.border,
            '--statusbar-badge-bg': colors.badgeBg,
            '--statusbar-badge-fg': colors.badgeFg
        };
    };

    // Poll system stats consolidado
    useEffect(() => {
        if (!active || hideStatusBar) return undefined;
        const unsubscribe = systemStatsService.subscribe((stats) => {
            if (stats) {
                setStatusStats(stats);
                setIsLoadingStats(false);
            }
        });
        return unsubscribe;
    }, [active, hideStatusBar]);

    // Listen for storage events
    useEffect(() => {
        const onStorage = (e) => {
            if (!e) return;
            if (e.key === 'basicapp_statusbar_icon_theme') {
                setStatusBarIconTheme(e.newValue || 'classic');
            } else if (e.key === 'localCygwinStatusBarTheme') {
                setLocalStatusBarThemeName(e.newValue || 'Default Dark');
            }
        };
        const onThemeChanged = (e) => {
            if (e.detail && e.detail.terminalType === 'cygwin') {
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

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        fit: () => {
            fitStable();
        },
        focus: () => {
            term.current?.focus();
        },
        getSelection: () => {
            return term.current?.getSelection() || '';
        },
        selectAll: () => {
            if (term.current) {
                term.current.selectAll();
            }
        },
        clear: () => {
            if (term.current) {
                term.current.clear();
            }
        },
        paste: (text) => {
            pasteToTerminal(term, text, (data) => {
                window.electron?.ipcRenderer.send(`cygwin:data:${tabId}`, data);
                publishBroadcastInput(broadcastPropsRef, tabId, data);
            });
        }
    }));

    useEffect(() => {
        if (!xtermLib) return;
        const { Terminal, FitAddon, WebLinksAddon, Unicode11Addon, WebglAddon, CanvasAddon, SearchAddon } = xtermLib;

        ensureTerminalFontsLoaded();

        // Leer scrollback desde configuración (configurable en Settings, por defecto 10000)
        const scrollbackLines = getTerminalScrollback();

        // Initialize Terminal con tema moderno estilo MobaXterm
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: resolveTerminalFontFamily(fontFamily),
            fontSize: fontSize,
            allowProposedApi: true,
            theme: {
                ...theme,
                // Fondo oscuro moderno
                background: isIntegrated ? 'rgba(0,0,0,0)' : (theme.background || '#0a0d0a'),
                foreground: theme.foreground || '#CCCCCC',
                cursor: theme.cursor || '#00FF00',
                cursorAccent: '#000000',
                selection: theme.selection || 'rgba(255, 255, 255, 0.2)',
                // Colores normales - estilo Solarized/Monokai
                black: '#000000',
                red: '#FF6C60',
                green: '#A8FF60',
                yellow: '#FFFFB6',
                blue: '#96CBFE',
                magenta: '#FF73FD',
                cyan: '#C6C5FE',
                white: '#EEEEEE',
                // Colores brillantes - m??s vibrantes
                brightBlack: '#7C7C7C',
                brightRed: '#FFB6B0',
                brightGreen: '#CEFFAC',
                brightYellow: '#FFFFCC',
                brightBlue: '#B5DCFE',
                brightMagenta: '#FF9CFE',
                brightCyan: '#DFDFFE',
                brightWhite: '#FFFFFF'
            },
            convertEol: false,
            scrollback: scrollbackLines, // Configurable desde Settings (default: 1000)
            rightClickSelectsWord: true,
            macOptionIsMeta: true,
            windowsMode: false,
            allowTransparency: isIntegrated,
            cols: 120,
            rows: 30,
            fastScrollModifier: 'alt',
            fastScrollSensitivity: 5,
            scrollSensitivity: 1,
            disableStdin: false,
            drawBoldTextInBrightColors: true,
            minimumContrastRatio: 1,
            bracketedPasteMode: true,
        });

        // Inicializar buffer de escrituras por fotograma (60/120 FPS batching)
        writeBufferRef.current = createXtermWriteBuffer(term, { active: !!active, dropWithMark: true });

        // Add addons
        fitAddon.current = new FitAddon();
        const stableFit = beginMount();
        term.current.loadAddon(fitAddon.current);
        term.current.loadAddon(new WebLinksAddon());
        attachUnicode11(term.current, Unicode11Addon);
        const detachSearch = attachTerminalSearch(term.current, tabId, SearchAddon);

        // Load hardware-accelerated renderer with Canvas 2D fallback
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

        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        const handleVisibilityChange = () => {
            if (!document.hidden && active && !layoutSuspendedRef.current) {
                setTimeout(() => {
                    if (!isFitting()) fitStable();
                }, 100);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (window.electron) {
            term.current.clear();
            // Terminal creado silenciosamente

            const delay = tabId === 'tab-1' ? 300 : 0;
            window.electron.ipcRenderer.send('register-tab-events', tabId);
            setTimeout(() => {
                // console.log(`???? CygwinTerminal [${tabId}] enviando cygwin:start`, {
                //     cols: term.current?.cols,
                //     rows: term.current?.rows,
                //     delay
                // });
                window.electron.ipcRenderer.send(`cygwin:start:${tabId}`, {
                    cols: term.current.cols,
                    rows: term.current.rows
                });
                // console.log(`??? CygwinTerminal [${tabId}] comando start enviado`);
            }, delay);

            // Setup unified clipboard handling (Ctrl+C, Ctrl+Shift+C, Ctrl+V, Shift+Insert, context menu)
            const cleanupClipboard = setupTerminalClipboard({
                term,
                container: terminalRef.current,
                tabId,
                onContextMenu,
                onSendData: (data) => {
                    window.electron.ipcRenderer.send(`cygwin:data:${tabId}`, data);
                    publishBroadcastInput(broadcastPropsRef, tabId, data);
                }
            });

            const dataHandler = term.current.onData(data => {
                if (shouldBlockHumanInput(tabId)) return;
                sendPtyUserInput(
                    (ch, payload) => window.electron.ipcRenderer.send(ch, payload),
                    `cygwin:data:${tabId}`,
                    data
                );
                publishBroadcastInput(broadcastPropsRef, tabId, data);
            });

            const resizeHandler = term.current.onResize(({ cols, rows }) => {
                if (layoutSuspendedRef.current || !cols || !rows) return;
                window.electron.ipcRenderer.send(`cygwin:resize:${tabId}`, { cols, rows });
            });

            const dataListener = (data) => {
                pushColored(data);
            };
            const onDataUnsubscribe = window.electron.ipcRenderer.on(`cygwin:data:${tabId}`, dataListener);

            const errorListener = (error) => {
                term.current?.writeln(`\x1b[31mCygwin Error: ${error}\x1b[0m`);
            };
            const onErrorUnsubscribe = window.electron.ipcRenderer.on(`cygwin:error:${tabId}`, errorListener);

            return () => {
                flushPending();
                if (writeBufferRef.current) {
                    writeBufferRef.current.clear();
                }
                try { focusDisposable?.dispose?.(); } catch (_) { /* noop */ }
                resizeObserver.disconnect();
                document.removeEventListener('visibilitychange', handleVisibilityChange);

                const isReloading = performance.navigation?.type === 1 || document.readyState === 'loading';
                if (!isReloading) {
                    window.electron.ipcRenderer.send(`cygwin:stop:${tabId}`);
                }

                if (onDataUnsubscribe) onDataUnsubscribe();
                if (onErrorUnsubscribe) onErrorUnsubscribe();
                cleanupClipboard();
                try { detachSearch?.(); } catch (_) { /* noop */ }
                dataHandler.dispose();
                resizeHandler.dispose();
                endMount(stableFit);
                if (term.current) {
                    term.current.dispose();
                }
            };
        } else {
            term.current.writeln('\x1b[31mError: Electron API not available. Cygwin integration will not work.\x1b[0m');
            return () => {
                try { focusDisposable?.dispose?.(); } catch (_) { /* noop */ }
                resizeObserver.disconnect();
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                try { detachSearch?.(); } catch (_) { /* noop */ }
                endMount(stableFit);
                if (term.current) {
                    term.current.dispose();
                }
            };
        }
    }, [tabId, xtermLib]);

    // Sincronizar scrollback dinámicamente si cambia en Settings
    useEffect(() => {
        return registerScrollbackSync(term);
    }, []);

    // Update font/theme dynamically
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
                background: isIntegrated ? 'rgba(0,0,0,0)' : (theme?.background || '#0c0c0c')
            };
        }
    }, [theme, isIntegrated]);

    // Auto-fit after render (stable fit no-ops si el tamaño no cambió)
    useEffect(() => {
        if (!fitAddon.current || layoutSuspendedRef.current) return undefined;
        const id = setTimeout(() => {
            if (!isFitting()) fitStable();
        }, 0);
        return () => clearTimeout(id);
    });

    // Fit tras montaje / cambio de tab (sin ráfaga de resize al PTY)
    useEffect(() => {
        if (layoutSuspendedRef.current) return undefined;
        fitStable();
        const t1 = setTimeout(fitStable, 50);
        const t2 = setTimeout(fitStable, 150);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [tabId]);

    // Efecto para asegurar el focus automático al estar activa la pestaña
    useEffect(() => {
        if (!active) return;
        const ensureFocus = () => {
            if (term.current) {
                try {
                    term.current.focus();
                } catch (e) {
                    // Silently handle
                }
            }
        };

        ensureFocus();
        const timer = setTimeout(ensureFocus, 50);
        return () => clearTimeout(timer);
    }, [active, tabId]);

    return (
        <div
            onMouseDown={() => onTerminalFocus?.()}
            style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            flex: 1,
            width: '100%',
            height: '100%',
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
            background: isIntegrated ? 'transparent' : (theme?.background || '#0c0c0c'),
            ...getScopedStatusBarCssVars()
        }}>
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
                    marginBottom: (isIntegrated || hideStatusBar) ? 0 : '-1px', // Solapamiento de 1px para ocultar huecos de renderizado, solo si hay StatusBar
                    zIndex: isIntegrated ? 0 : 1,
                    background: isIntegrated ? 'transparent' : (theme?.background || '#0c0c0c'),
                    backgroundColor: isIntegrated ? 'transparent' : (theme?.background || '#0c0c0c'),
                    '--terminal-bg': isIntegrated ? 'transparent' : (theme?.background || '#0c0c0c')
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
                        background: isIntegrated ? 'transparent' : (theme?.background || '#0c0c0c')
                    }}
                />
                <TerminalSearchBar tabId={tabId} />
            </div>
            {!hideStatusBar && (
                <StatusBar
                    stats={{ ...(statusStats || {}), cpuHistory: sessionHistory.map(s => s.cpu), sessionHistory }}
                    active={true}
                    statusBarIconTheme={statusBarIconTheme}
                    isLoading={isLoadingStats}
                    terminalType="cygwin"
                    fontFamily={fontFamily}
                />
            )}
        </div>
    );
});

export default CygwinTerminal;
