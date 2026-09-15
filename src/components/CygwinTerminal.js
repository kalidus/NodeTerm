import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { useStatusBarSessionHistory } from '../hooks/useStatusBarSessionHistory';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';
import { shouldBlockHumanInput } from '../services/terminalAgentState';
import { createXtermWriteBuffer } from '../utils/xtermWriteBuffer';
import { attachTerminalRenderer, getTerminalScrollback, registerScrollbackSync } from '../utils/xtermRenderer';
import { systemStatsService } from '../services/SystemStatsService';
import { writeText as clipboardWriteText, readText as clipboardReadText } from '../utils/clipboard';

const CygwinTerminal = forwardRef(({
    fontFamily = '"FiraCode Nerd Font", Consolas, monospace',
    fontSize = 14,
    theme = {},
    tabId = 'default',
    hideStatusBar = false,
    isIntegrated = false,
    active = true
}, ref) => {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const writeBufferRef = useRef(null);
    const fitAddon = useRef(null);
    const [statusStats, setStatusStats] = useState(null);
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
        const unsubscribe = systemStatsService.subscribe((stats) => {
            if (stats) {
                setStatusStats(stats);
                setIsLoadingStats(false);
            }
        });
        return unsubscribe;
    }, []);

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
            try {
                if (terminalRef.current && terminalRef.current.offsetHeight > 0 && terminalRef.current.offsetWidth > 0) {
                    fitAddon.current?.fit();
                }
            } catch (e) {
                console.error('Error fitting terminal:', e);
            }
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
            if (term.current && text) {
                window.electron?.ipcRenderer.send(`cygwin:data:${tabId}`, text);
            }
        }
    }));

    useEffect(() => {
        // Leer scrollback desde configuración (configurable en Settings, por defecto 10000)
        const scrollbackLines = getTerminalScrollback();

        // Initialize Terminal con tema moderno estilo MobaXterm
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: fontFamily,
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
            convertEol: true,
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
            minimumContrastRatio: 4.5,
            bracketedPasteMode: true,
        });

        // Inicializar buffer de escrituras por fotograma (60/120 FPS batching)
        writeBufferRef.current = createXtermWriteBuffer(term);

        // Add addons
        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        term.current.loadAddon(new WebLinksAddon());
        term.current.loadAddon(new Unicode11Addon());
        term.current.unicode.activeVersion = '11';

        // Load hardware-accelerated renderer with Canvas 2D fallback
        attachTerminalRenderer(term.current);

        term.current.open(terminalRef.current);

        try {
            fitAddon.current.fit();
            term.current.focus();
        } catch (e) {
            setTimeout(() => {
                try {
                    fitAddon.current?.fit();
                    term.current?.focus();
                } catch (err) {
                    console.warn('Terminal fit failed:', err);
                }
            }, 100);
        }

        const resizeObserver = new ResizeObserver(() => {
            if (terminalRef.current && terminalRef.current.offsetHeight > 0 && terminalRef.current.offsetWidth > 0) {
                try {
                    fitAddon.current?.fit();
                } catch (e) {
                    // Silently handle resize errors
                }
            }
        });

        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        const handleVisibilityChange = () => {
            if (!document.hidden && active) {
                setTimeout(() => {
                    if (terminalRef.current && terminalRef.current.offsetHeight > 0 && terminalRef.current.offsetWidth > 0) {
                        try {
                            fitAddon.current?.fit();
                        } catch (e) {
                            // Silently handle
                        }
                    }
                }, 100);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (window.electron) {
            term.current.clear();
            // Terminal creado silenciosamente

            const delay = tabId === 'tab-1' ? 300 : 0;
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

            // Copy/Paste handlers
            term.current.onKey(({ key, domEvent }) => {
                const isMac = window.electron.platform === 'darwin';
                const modifierKey = isMac ? domEvent.metaKey : domEvent.ctrlKey;

                if (modifierKey && domEvent.key === 'c') {
                    const selection = term.current.getSelection();
                    if (selection) {
                        clipboardWriteText(selection).catch(() => {});
                        domEvent.preventDefault();
                        return;
                    }
                } else if (modifierKey && domEvent.key === 'v') {
                    domEvent.preventDefault();
                    if (shouldBlockHumanInput(tabId)) return;
                    clipboardReadText().then(text => {
                        if (text) {
                            term.current.focus();
                            setTimeout(() => {
                                window.electron.ipcRenderer.send(`cygwin:data:${tabId}`, text);
                                term.current.focus();
                            }, 10);
                        }
                    }).catch(() => {});
                    return;
                }
            });

            const dataHandler = term.current.onData(data => {
                if (shouldBlockHumanInput(tabId)) return;
                window.electron.ipcRenderer.send(`cygwin:data:${tabId}`, data);
            });

            const resizeHandler = term.current.onResize(({ cols, rows }) => {
                window.electron.ipcRenderer.send(`cygwin:resize:${tabId}`, { cols, rows });
            });

            const dataListener = (data) => {
                if (writeBufferRef.current) {
                    writeBufferRef.current.write(data);
                } else if (term.current) {
                    term.current.write(data);
                }
            };
            const onDataUnsubscribe = window.electron.ipcRenderer.on(`cygwin:data:${tabId}`, dataListener);

            const errorListener = (error) => {
                term.current?.writeln(`\x1b[31mCygwin Error: ${error}\x1b[0m`);
            };
            const onErrorUnsubscribe = window.electron.ipcRenderer.on(`cygwin:error:${tabId}`, errorListener);

            const contextMenuHandler = (e) => {
                e.preventDefault();
                if (shouldBlockHumanInput(tabId)) return;
                clipboardReadText().then(text => {
                    if (text) {
                        window.electron.ipcRenderer.send(`cygwin:data:${tabId}`, text);
                    }
                }).catch(() => {});
            };
            terminalRef.current.addEventListener('contextmenu', contextMenuHandler);

            return () => {
                if (writeBufferRef.current) {
                    writeBufferRef.current.clear();
                }
                resizeObserver.disconnect();
                document.removeEventListener('visibilitychange', handleVisibilityChange);

                const isReloading = performance.navigation?.type === 1 || document.readyState === 'loading';
                if (!isReloading) {
                    window.electron.ipcRenderer.send(`cygwin:stop:${tabId}`);
                }

                if (onDataUnsubscribe) onDataUnsubscribe();
                if (onErrorUnsubscribe) onErrorUnsubscribe();
                if (terminalRef.current) {
                    terminalRef.current.removeEventListener('contextmenu', contextMenuHandler);
                }
                dataHandler.dispose();
                resizeHandler.dispose();
                if (term.current) {
                    term.current.dispose();
                }
            };
        } else {
            term.current.writeln('\x1b[31mError: Electron API not available. Cygwin integration will not work.\x1b[0m');
            return () => {
                resizeObserver.disconnect();
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                if (term.current) {
                    term.current.dispose();
                }
            };
        }
    }, [tabId]);

    // Sincronizar scrollback dinámicamente si cambia en Settings
    useEffect(() => {
        return registerScrollbackSync(term);
    }, []);

    // Update font/theme dynamically
    useEffect(() => {
        if (term.current && fontFamily) {
            term.current.options.fontFamily = fontFamily;
            fitAddon.current?.fit();
        }
    }, [fontFamily]);

    useEffect(() => {
        if (term.current && fontSize) {
            term.current.options.fontSize = fontSize;
            fitAddon.current?.fit();
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

    // Auto-fit
    useEffect(() => {
        if (fitAddon.current) {
            setTimeout(() => {
                try {
                    if (terminalRef.current && terminalRef.current.offsetHeight > 0 && terminalRef.current.offsetWidth > 0) {
                        fitAddon.current?.fit();
                    }
                } catch (e) {
                    console.error('Error en fit:', e);
                }
            }, 0);
        }
    });

    // Force resize after mount
    useEffect(() => {
        const forceResize = () => {
            if (fitAddon.current && terminalRef.current && terminalRef.current.offsetHeight > 0 && terminalRef.current.offsetWidth > 0) {
                try {
                    fitAddon.current?.fit();
                } catch (e) {
                    // Silently handle
                }
            }
        };

        forceResize();
        setTimeout(forceResize, 50);
        setTimeout(forceResize, 150);
        setTimeout(forceResize, 300);
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
        <div style={{
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
            </div>
            {!hideStatusBar && (
                <StatusBar
                    stats={{ ...(statusStats || {}), cpuHistory: sessionHistory.map(s => s.cpu), sessionHistory }}
                    active={true}
                    statusBarIconTheme={statusBarIconTheme}
                    isLoading={isLoadingStats}
                    terminalType="cygwin"
                />
            )}
        </div>
    );
});

export default CygwinTerminal;
