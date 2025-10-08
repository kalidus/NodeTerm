import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';

const PowerShellTerminal = forwardRef(({ 
    fontFamily = 'Consolas, "Courier New", monospace', 
    fontSize = 14, 
    theme = {},
    tabId = 'default'
}, ref) => {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [statusStats, setStatusStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [cpuHistory, setCpuHistory] = useState([]);
    const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
        try { return localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic'; } catch { return 'classic'; }
    });
    const [showNetworkDisks, setShowNetworkDisks] = useState(() => {
        try { return (localStorage.getItem('localShowNetworkDisks') || 'true') === 'true'; } catch { return true; }
    });
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => {
        try { return localStorage.getItem('localPowerShellStatusBarTheme') || localStorage.getItem('basicapp_statusbar_theme') || 'Default Dark'; } catch { return 'Default Dark'; }
    });

    // Build CSS variable overrides for StatusBar (scoped to this terminal only)
    const getScopedStatusBarCssVars = () => {
        const theme = statusBarThemes[localStatusBarThemeName] || statusBarThemes['Default Dark'];
        const colors = theme.colors || {};
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

    // Poll local system stats to feed the StatusBar
    useEffect(() => {
        let stopped = false;
        let timer = null;
        const POLL_KEY = 'statusBarPollingInterval';
        const getIntervalMs = () => {
            try { return Math.max(1, parseInt(localStorage.getItem(POLL_KEY) || '3', 10)) * 1000; } catch { return 3000; } // Reducido de 5s a 3s para locales
        };
        
        // Optimización: pausar polling cuando la ventana pierda foco
        const handleFocus = () => {
            if (window.electronAPI?.send) {
                window.electronAPI.send('window:focus-changed', true);
            }
        };
        const handleBlur = () => {
            if (window.electronAPI?.send) {
                window.electronAPI.send('window:focus-changed', false);
            }
        };
        
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        const fetchStats = async () => {
            try {
                const systemStats = await window.electronAPI?.getSystemStats();
                if (!systemStats) {
                    return;
                }
                // Map worker stats → StatusBar expected shape
                const memTotalBytes = (systemStats.memory?.total || 0) * 1024 * 1024 * 1024;
                const memUsedBytes = (systemStats.memory?.used || 0) * 1024 * 1024 * 1024;
                const disk = Array.isArray(systemStats.disks)
                    ? systemStats.disks.map(d => ({ fs: d.name, use: d.percentage, isNetwork: d.isNetwork }))
                    : [];
                const rxBytesPerSec = ((systemStats.network?.download || 0) * 1000000) / 8; // Mb/s → B/s
                const txBytesPerSec = ((systemStats.network?.upload || 0) * 1000000) / 8;   // Mb/s → B/s
                const showNet = (() => { try { return (localStorage.getItem('localShowNetworkDisks') || 'true') === 'true'; } catch { return true; } })();
                const displayDisk = showNet ? disk : disk.filter(d => {
                    const id = String((d && (d.fs || d.name || d.mount)) || '');
                    const isUNC = id.startsWith('\\\\') || id.startsWith('//');
                    return !(d && (d.isNetwork || isUNC));
                });
                const statsPayload = {
                    cpu: Math.round((systemStats.cpu?.usage || 0) * 10) / 10,
                    mem: { total: memTotalBytes, used: memUsedBytes },
                    disk: displayDisk,
                    network: { rx_speed: rxBytesPerSec, tx_speed: txBytesPerSec },
                    hostname: systemStats.hostname || undefined,
                    ip: systemStats.ip || undefined,
                    distro: 'windows',
                    // Optional fields omitted for local PS (hostname/distro/uptime/ip)
                    cpuHistory
                };
                setStatusStats(statsPayload);
                setIsLoadingStats(false);
                const cpuValue = typeof statsPayload.cpu === 'number' ? statsPayload.cpu : null;
                if (cpuValue !== null && !isNaN(cpuValue)) {
                    setCpuHistory(prev => {
                        const arr = [...prev, cpuValue];
                        return arr.slice(-30);
                    });
                }
            } catch (error) {
                console.error('Error obteniendo estadísticas:', error);
            }
        };

        const loop = () => {
            if (stopped) return;
            fetchStats().finally(() => {
                const ms = getIntervalMs();
                timer = setTimeout(loop, ms);
            });
        };
        loop();
        return () => { 
            stopped = true; 
            if (timer) clearTimeout(timer);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // Listen for changes to icon theme and local PS status bar theme via storage updates
    useEffect(() => {
        const onStorage = (e) => {
            if (!e) return;
            if (e.key === 'basicapp_statusbar_icon_theme') {
                setStatusBarIconTheme(e.newValue || 'classic');
            } else if (e.key === 'localPowerShellStatusBarTheme') {
                setLocalStatusBarThemeName(e.newValue || 'Default Dark');
            } else if (e.key === 'localShowNetworkDisks') {
                setShowNetworkDisks((e.newValue || 'true') === 'true');
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        fit: () => {
            // console.log(`PowerShellTerminal fit() called for tab ${tabId}`);
            try {
                fitAddon.current?.fit();
                // console.log(`PowerShellTerminal fit() successful for tab ${tabId}`);
            } catch (e) {
                // console.error(`PowerShellTerminal fit() error for tab ${tabId}:`, e);
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
                window.electron?.ipcRenderer.send(`powershell:data:${tabId}`, text);
            }
        }
    }));

    useEffect(() => {
        // Initialize Terminal with PowerShell-optimized settings
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: fontFamily,
            fontSize: fontSize,
            allowProposedApi: true,
            theme: {
                background: theme?.background || '#012456',
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
                brightWhite: theme?.brightWhite || '#F2F2F2',
                ...theme
            },
            // PowerShell optimized settings
            convertEol: true,
            scrollback: 10000,
            rightClickSelectsWord: true,
            macOptionIsMeta: true,
            windowsMode: true, // Important for PowerShell on Windows
            allowTransparency: false,
            cols: 120,
            rows: 30,
            fastScrollModifier: 'alt',
            fastScrollSensitivity: 5,
            scrollSensitivity: 1,
            disableStdin: false,
            drawBoldTextInBrightColors: true,
            minimumContrastRatio: 4.5,
            // ANSI support for rich PowerShell output
            bracketedPasteMode: false, // Disable to prevent weird characters
        });

        // Add addons
        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        term.current.loadAddon(new WebLinksAddon());
        term.current.loadAddon(new Unicode11Addon());
        term.current.unicode.activeVersion = '11';

        // Load WebGL renderer for better performance
        try {
            const webglAddon = new WebglAddon();
            term.current.loadAddon(webglAddon);
        } catch (e) {
            console.warn('WebGL addon failed to load, falling back to canvas renderer:', e);
        }

        // Open terminal in DOM
        term.current.open(terminalRef.current);
        
        // Try fit with error handling for React 18
        try {
            fitAddon.current.fit();
            term.current.focus();
        } catch (e) {
            // If fit fails, try again after a short delay
            setTimeout(() => {
                try {
                    fitAddon.current?.fit();
                    term.current?.focus();
                } catch (err) {
                    console.warn('Terminal fit failed:', err);
                }
            }, 100);
        }

        // ResizeObserver for dynamic resizing
        const resizeObserver = new ResizeObserver((entries) => {
            // console.log(`PowerShellTerminal resize observer triggered for tab ${tabId}`);
            try { 
                fitAddon.current?.fit(); 
                // console.log(`PowerShellTerminal resize observer fit successful for tab ${tabId}`);
            } catch (e) {
                // console.error(`PowerShellTerminal resize observer error for tab ${tabId}:`, e);
            }
        });
        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        // Listener para cambios de visibilidad del documento
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                // console.log(`PowerShellTerminal visibility change detected for tab ${tabId}`);
                setTimeout(() => {
                    try {
                        fitAddon.current?.fit();
                        // console.log(`PowerShellTerminal visibility change fit successful for tab ${tabId}`);
                    } catch (e) {
                        // console.error(`PowerShellTerminal visibility change fit error for tab ${tabId}:`, e);
                    }
                }, 100);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Setup Electron IPC if available
        if (window.electron) {
            // Initialize PowerShell session
            // term.current.writeln('\x1b[36mInitializing PowerShell...\x1b[0m');
            
            // Limpiar el terminal antes de iniciar
            term.current.clear();
            
            // Delay pequeño solo para tab-1 inicial para dar tiempo al backend
            const delay = tabId === 'tab-1' ? 300 : 0;
            
            setTimeout(() => {
                window.electron.ipcRenderer.send(`powershell:start:${tabId}`, {
                    cols: term.current.cols,
                    rows: term.current.rows
                });
            }, delay);

            // Handle keyboard events for copy/paste
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
                            // Asegurar que el terminal tenga el foco antes de enviar datos
                            term.current.focus();
                            setTimeout(() => {
                                window.electron.ipcRenderer.send(`powershell:data:${tabId}`, text);
                                // Restaurar el foco después de pegar
                                term.current.focus();
                            }, 10);
                        }
                    });
                    return;
                }
            });

            // Handle user input - send to PowerShell
            const dataHandler = term.current.onData(data => {
                window.electron.ipcRenderer.send(`powershell:data:${tabId}`, data);
            });

            // Handle terminal resize
            const resizeHandler = term.current.onResize(({ cols, rows }) => {
                window.electron.ipcRenderer.send(`powershell:resize:${tabId}`, { cols, rows });
            });

            // Listen for PowerShell output
            const dataListener = (data) => {
                if (term.current) {
                    term.current.write(data);
                }
            };
            const onDataUnsubscribe = window.electron.ipcRenderer.on(`powershell:data:${tabId}`, dataListener);

            // Listen for PowerShell ready event
            const readyListener = () => {
                setIsConnected(true);
                // term.current?.writeln('\x1b[32mPowerShell ready!\x1b[0m');
            };
            const onReadyUnsubscribe = window.electron.ipcRenderer.on(`powershell:ready:${tabId}`, readyListener);

            // Listen for PowerShell errors
            const errorListener = (error) => {
                term.current?.writeln(`\x1b[31mPowerShell Error: ${error}\x1b[0m`);
            };
            const onErrorUnsubscribe = window.electron.ipcRenderer.on(`powershell:error:${tabId}`, errorListener);

            // Handle right-click context menu
            const contextMenuHandler = (e) => {
                e.preventDefault();
                // Simple paste functionality on right-click
                window.electron.clipboard.readText().then(text => {
                    if (text) {
                        window.electron.ipcRenderer.send(`powershell:data:${tabId}`, text);
                    }
                });
            };
            terminalRef.current.addEventListener('contextmenu', contextMenuHandler);

            // Cleanup function
            return () => {
                resizeObserver.disconnect();
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                
                // Solo enviar stop cuando realmente se cierra el tab (no durante reloads)
                const isReloading = performance.navigation?.type === 1 || document.readyState === 'loading';
                if (!isReloading) {
                    window.electron.ipcRenderer.send(`powershell:stop:${tabId}`);
                }
                
                if (onDataUnsubscribe) onDataUnsubscribe();
                if (onReadyUnsubscribe) onReadyUnsubscribe();
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
            // Fallback when Electron API is not available
            term.current.writeln('\x1b[31mError: Electron API not available. PowerShell integration will not work.\x1b[0m');
            return () => {
                resizeObserver.disconnect();
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                if (term.current) {
                    term.current.dispose();
                }
            };
        }
    }, []);

    // Update font family dynamically
    useEffect(() => {
        if (term.current && fontFamily) {
            term.current.options.fontFamily = fontFamily;
            fitAddon.current?.fit();
        }
    }, [fontFamily]);

    // Update font size dynamically
    useEffect(() => {
        if (term.current && fontSize) {
            term.current.options.fontSize = fontSize;
            fitAddon.current?.fit();
        }
    }, [fontSize]);

    // Update theme dynamically
    useEffect(() => {
        if (term.current && theme) {
            term.current.options.theme = { ...term.current.options.theme, ...theme };
        }
    }, [theme]);

    // Auto-fit after render
    useEffect(() => {
        if (fitAddon.current) {
            setTimeout(() => {
                try { 
                    fitAddon.current?.fit(); 
                    // console.log(`PowerShellTerminal auto-fit successful for tab ${tabId}`);
                } catch (e) {
                    // console.error(`PowerShellTerminal auto-fit error for tab ${tabId}:`, e);
                }
            }, 0);
        }
    });

    // Efecto adicional para forzar redimensionamiento después del montaje
    useEffect(() => {
        const forceResize = () => {
            if (fitAddon.current) {
                try {
                    fitAddon.current?.fit();
                    // console.log(`PowerShellTerminal force resize successful for tab ${tabId}`);
                } catch (e) {
                    // console.error(`PowerShellTerminal force resize error for tab ${tabId}:`, e);
                }
            }
        };
        
        // Intentar múltiples veces después del montaje
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
                    // console.log(`PowerShellTerminal focus applied for tab ${tabId}`);
                } catch (e) {
                    // console.error(`PowerShellTerminal focus error for tab ${tabId}:`, e);
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', flex: 1, width: '100%', height: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative', background: theme?.background || '#012456' }}>
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
            <div style={{ ...getScopedStatusBarCssVars() }}>
                <StatusBar stats={{ ...(statusStats || {}), cpuHistory }} active={true} statusBarIconTheme={statusBarIconTheme} showNetworkDisks={showNetworkDisks} isLoading={isLoadingStats} />
            </div>
        </div>
    );
});

export default PowerShellTerminal;
