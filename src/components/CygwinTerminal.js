import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';

const CygwinTerminal = forwardRef(({ 
    fontFamily = '"FiraCode Nerd Font", Consolas, monospace', 
    fontSize = 14, 
    theme = {},
    tabId = 'default',
    hideStatusBar = false
}, ref) => {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);
    const [statusStats, setStatusStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [cpuHistory, setCpuHistory] = useState([]);
    const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
        try { return localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic'; } catch { return 'classic'; }
    });
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => {
        try { return localStorage.getItem('localCygwinStatusBarTheme') || 'Default Dark'; } catch { return 'Default Dark'; }
    });
    const [showNetworkDisks, setShowNetworkDisks] = useState(() => {
        try { return (localStorage.getItem('localShowNetworkDisks') || 'true') === 'true'; } catch { return true; }
    });

    const getScopedStatusBarCssVars = () => {
        const themeObj = statusBarThemes[localStatusBarThemeName] || statusBarThemes['Default Dark'];
        const colors = themeObj.colors || {};
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
    };

    // Poll system stats
    useEffect(() => {
        let stopped = false;
        let timer = null;
        
        const fetchStats = async () => {
            try {
                const systemStats = await window.electronAPI?.getSystemStats();
                if (!systemStats) return;
                
                const memTotalBytes = (systemStats.memory?.total || 0) * 1024 * 1024 * 1024;
                const memUsedBytes = (systemStats.memory?.used || 0) * 1024 * 1024 * 1024;
                const disk = Array.isArray(systemStats.disks)
                    ? systemStats.disks.map(d => ({ fs: d.name, use: d.percentage, isNetwork: d.isNetwork }))
                    : [];
                const rxBytesPerSec = ((systemStats.network?.download || 0) * 1000000) / 8;
                const txBytesPerSec = ((systemStats.network?.upload || 0) * 1000000) / 8;
                const showNet = (() => { try { return (localStorage.getItem('localShowNetworkDisks') || 'true') === 'true'; } catch { return true; } })();
                const displayDisk = showNet ? disk : disk.filter(d => {
                    const id = String((d && (d.fs || d.name || d.mount)) || '');
                    const isUNC = id.startsWith('\\\\') || id.startsWith('//');
                    return !(d && (d.isNetwork || isUNC));
                });
                
                const payload = {
                    cpu: Math.round((systemStats.cpu?.usage || 0) * 10) / 10,
                    mem: { total: memTotalBytes, used: memUsedBytes },
                    disk: displayDisk,
                    network: { rx_speed: rxBytesPerSec, tx_speed: txBytesPerSec },
                    hostname: systemStats.hostname || undefined,
                    ip: systemStats.ip || undefined,
                    distro: 'cygwin',
                    cpuHistory
                };
                setStatusStats(payload);
                setIsLoadingStats(false);
                
                const cpuVal = typeof payload.cpu === 'number' ? payload.cpu : null;
                if (cpuVal !== null && !isNaN(cpuVal)) {
                    setCpuHistory(prev => [...prev, cpuVal].slice(-30));
                }
            } catch (error) {
                console.error('Error obteniendo estadísticas:', error);
            }
        };

        const loop = () => {
            if (stopped) return;
            fetchStats().finally(() => {
                timer = setTimeout(loop, 3000);
            });
        };
        loop();
        
        return () => { 
            stopped = true; 
            if (timer) clearTimeout(timer);
        };
    }, []);

    // Listen for storage events
    useEffect(() => {
        const onStorage = (e) => {
            if (!e) return;
            if (e.key === 'basicapp_statusbar_icon_theme') {
                setStatusBarIconTheme(e.newValue || 'classic');
            } else if (e.key === 'localCygwinStatusBarTheme') {
                setLocalStatusBarThemeName(e.newValue || 'Default Dark');
            } else if (e.key === 'localShowNetworkDisks') {
                setShowNetworkDisks((e.newValue || 'true') === 'true');
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        fit: () => {
            try {
                fitAddon.current?.fit();
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
        // Leer scrollback desde configuración (configurable en Settings)
        const scrollbackLines = parseInt(localStorage.getItem('nodeterm_scrollback_lines') || '1000', 10);

        // Initialize Terminal con tema moderno estilo MobaXterm
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: fontFamily,
            fontSize: fontSize,
            allowProposedApi: true,
            theme: {
                // Fondo oscuro moderno
                background: theme.background || '#0C0C0C',
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
                // Colores brillantes - más vibrantes
                brightBlack: '#7C7C7C',
                brightRed: '#FFB6B0',
                brightGreen: '#CEFFAC',
                brightYellow: '#FFFFCC',
                brightBlue: '#B5DCFE',
                brightMagenta: '#FF9CFE',
                brightCyan: '#DFDFFE',
                brightWhite: '#FFFFFF',
                ...theme
            },
            convertEol: true,
            scrollback: scrollbackLines, // Configurable desde Settings (default: 1000)
            rightClickSelectsWord: true,
            macOptionIsMeta: true,
            windowsMode: false,
            allowTransparency: false,
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

        // Add addons
        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        term.current.loadAddon(new WebLinksAddon());
        term.current.loadAddon(new Unicode11Addon());
        term.current.unicode.activeVersion = '11';

        try {
            const webglAddon = new WebglAddon();
            term.current.loadAddon(webglAddon);
        } catch (e) {
            console.warn('WebGL addon failed to load:', e);
        }

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
            try { 
                fitAddon.current?.fit(); 
            } catch (e) {
                // Silently handle resize errors
            }
        });
        
        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                setTimeout(() => {
                    try {
                        fitAddon.current?.fit();
                    } catch (e) {
                        // Silently handle
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
                console.log(`🚀 CygwinTerminal [${tabId}] enviando cygwin:start`, {
                    cols: term.current?.cols,
                    rows: term.current?.rows,
                    delay
                });
                window.electron.ipcRenderer.send(`cygwin:start:${tabId}`, {
                    cols: term.current.cols,
                    rows: term.current.rows
                });
                console.log(`✅ CygwinTerminal [${tabId}] comando start enviado`);
            }, delay);

            // Copy/Paste handlers
            term.current.onKey(({ key, domEvent }) => {
                const isMac = window.electron.platform === 'darwin';
                const modifierKey = isMac ? domEvent.metaKey : domEvent.ctrlKey;

                if (modifierKey && domEvent.key === 'c') {
                    const selection = term.current.getSelection();
                    if (selection) {
                        window.electron.clipboard.writeText(selection);
                        domEvent.preventDefault();
                        return;
                    }
                } else if (modifierKey && domEvent.key === 'v') {
                    domEvent.preventDefault();
                    window.electron.clipboard.readText().then(text => {
                        if (text) {
                            term.current.focus();
                            setTimeout(() => {
                                window.electron.ipcRenderer.send(`cygwin:data:${tabId}`, text);
                                term.current.focus();
                            }, 10);
                        }
                    });
                    return;
                }
            });

            const dataHandler = term.current.onData(data => {
                window.electron.ipcRenderer.send(`cygwin:data:${tabId}`, data);
            });

            const resizeHandler = term.current.onResize(({ cols, rows }) => {
                window.electron.ipcRenderer.send(`cygwin:resize:${tabId}`, { cols, rows });
            });

            const dataListener = (data) => {
                console.log(`📥 CygwinTerminal [${tabId}] recibió datos:`, { 
                    length: data?.length, 
                    preview: data?.substring(0, 50),
                    hasTerminal: !!term.current 
                });
                if (term.current) {
                    term.current.write(data);
                } else {
                    console.error(`🔴 Cygwin ${tabId}: Terminal no disponible`);
                }
            };
            console.log(`👂 CygwinTerminal [${tabId}] registrando listener en canal: cygwin:data:${tabId}`);
            const onDataUnsubscribe = window.electron.ipcRenderer.on(`cygwin:data:${tabId}`, dataListener);
            console.log(`✅ CygwinTerminal [${tabId}] listener registrado`);

            const errorListener = (error) => {
                term.current?.writeln(`\x1b[31mCygwin Error: ${error}\x1b[0m`);
            };
            const onErrorUnsubscribe = window.electron.ipcRenderer.on(`cygwin:error:${tabId}`, errorListener);

            const contextMenuHandler = (e) => {
                e.preventDefault();
                window.electron.clipboard.readText().then(text => {
                    if (text) {
                        window.electron.ipcRenderer.send(`cygwin:data:${tabId}`, text);
                    }
                });
            };
            terminalRef.current.addEventListener('contextmenu', contextMenuHandler);

            return () => {
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
            term.current.options.theme = { ...term.current.options.theme, ...theme };
        }
    }, [theme]);

    // Auto-fit
    useEffect(() => {
        if (fitAddon.current) {
            setTimeout(() => {
                try { 
                    fitAddon.current?.fit(); 
                } catch (e) {
                    // Silently handle
                }
            }, 0);
        }
    });

    // Force resize after mount
    useEffect(() => {
        const forceResize = () => {
            if (fitAddon.current) {
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

    // Efecto adicional para asegurar el focus automático después del montaje
    useEffect(() => {
        const ensureFocus = () => {
            if (term.current) {
                try {
                    term.current.focus();
                } catch (e) {
                    // Silently handle
                }
            }
        };
        
        // Aplicar focus múltiples veces para asegurar que se aplique correctamente
        setTimeout(ensureFocus, 100);
        setTimeout(ensureFocus, 250);
        setTimeout(ensureFocus, 400);
        setTimeout(ensureFocus, 600);
    }, [tabId]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', flex: 1, width: '100%', height: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative', background: theme.background || '#000000' }}>
            <div 
                ref={terminalRef} 
                style={{ 
                    flex: 1,
                    width: '100%', 
                    minWidth: 0,
                    minHeight: 0,
                    overflow: 'hidden',
                    position: 'relative',
                    padding: '0 0 0 8px',
                    margin: 0
                }} 
            />
            {!hideStatusBar && (
                <div style={{ ...getScopedStatusBarCssVars() }}>
                    <StatusBar 
                        stats={{ ...(statusStats || {}), cpuHistory }} 
                        active={true} 
                        statusBarIconTheme={statusBarIconTheme} 
                        showNetworkDisks={showNetworkDisks} 
                        isLoading={isLoadingStats}
                    />
                </div>
            )}
        </div>
    );
});

export default CygwinTerminal;
