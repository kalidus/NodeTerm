import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';

const WSLTerminal = forwardRef(({ 
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
    const [cpuHistory, setCpuHistory] = useState([]);
    const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
        try { return localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic'; } catch { return 'classic'; }
    });
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => {
        try { return localStorage.getItem('localLinuxStatusBarTheme') || localStorage.getItem('basicapp_statusbar_theme') || 'Default Dark'; } catch { return 'Default Dark'; }
    });
    const [distroId, setDistroId] = useState('ubuntu');
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

    // Derivar icono de distro desde la sesión (mejor esfuerzo por nombre)
    useEffect(() => {
        // Intentar detectar la distro ejecutando 'cat /etc/os-release' vía IPC de WSL
        const detectDistro = async () => {
            try {
                // Enviar una pequeña orden para que el backend devuelva la info en el canal de datos
                // y parsear una única vez el NAME/ID. Si no llega, conservamos 'ubuntu'.
                const handler = (data) => {
                    try {
                        const text = String(data || '');
                        if (text.includes('ID=')) {
                            const match = text.match(/\bID=("?)([^"\n]+)\1/);
                            if (match && match[2]) {
                                setDistroId(match[2].toLowerCase());
                            }
                        }
                    } catch {}
                };
                const unsubscribe = window.electron?.ipcRenderer.on(`wsl:data:${tabId}`, handler);
                window.electron?.ipcRenderer.send(`wsl:data:${tabId}`, 'cat /etc/os-release\n');
                setTimeout(() => { try { if (typeof unsubscribe === 'function') unsubscribe(); } catch {} }, 1200);
            } catch {}
        };
        detectDistro();
    }, [tabId]);

    // Poll Windows host stats (local) for WSL status bar
    useEffect(() => {
        let stopped = false;
        let timer = null;
        const POLL_KEY = 'statusBarPollingInterval';
        const getIntervalMs = () => {
            try { return Math.max(1, parseInt(localStorage.getItem(POLL_KEY) || '5', 10)) * 1000; } catch { return 5000; }
        };
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
                    distro: distroId || 'ubuntu',
                    cpuHistory
                };
                setStatusStats(payload);
                const cpuVal = typeof payload.cpu === 'number' ? payload.cpu : null;
                if (cpuVal !== null && !isNaN(cpuVal)) {
                    setCpuHistory(prev => [...prev, cpuVal].slice(-30));
                }
            } catch {}
        };
        const loop = () => {
            if (stopped) return;
            fetchStats().finally(() => {
                timer = setTimeout(loop, getIntervalMs());
            });
        };
        loop();
        return () => { stopped = true; if (timer) clearTimeout(timer); };
    }, [distroId]);

    useEffect(() => {
        const onStorage = (e) => {
            if (!e) return;
            if (e.key === 'basicapp_statusbar_icon_theme') setStatusBarIconTheme(e.newValue || 'classic');
            if (e.key === 'localLinuxStatusBarTheme') setLocalStatusBarThemeName(e.newValue || 'Default Dark');
            if (e.key === 'localShowNetworkDisks') setShowNetworkDisks((e.newValue || 'true') === 'true');
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Expose methods to parent component
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
                window.electron?.ipcRenderer.send(`wsl:data:${tabId}`, text);
            }
        }
    }));

    useEffect(() => {
        // Initialize Terminal with WSL-optimized settings
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: fontFamily,
            fontSize: fontSize,
            allowProposedApi: true,
            theme: {
                background: theme.background || '#300A24', // Usar theme.background con fallback
                foreground: '#FFFFFF',
                cursor: '#FFFFFF',
                selection: 'rgba(255, 255, 255, 0.3)',
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
                brightWhite: '#EEEEEC',
                ...theme  // Permitir que theme sobrescriba cualquier color
            },
            // WSL/Linux optimized settings
            convertEol: true,
            scrollback: 10000,
            rightClickSelectsWord: true,
            macOptionIsMeta: true,
            windowsMode: false, // Different from PowerShell
            allowTransparency: false,
            cols: 120,
            rows: 30,
            fastScrollModifier: 'alt',
            fastScrollSensitivity: 5,
            scrollSensitivity: 1,
            disableStdin: false,
            drawBoldTextInBrightColors: true,
            minimumContrastRatio: 4.5,
            bracketedPasteMode: true, // Enable for better paste support in Linux
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
        fitAddon.current.fit();
        term.current.focus();

        // ResizeObserver for dynamic resizing
        const resizeObserver = new ResizeObserver(() => {
            if (fitAddon.current) {
                try { 
                    fitAddon.current.fit(); 
                } catch (e) {
                    console.error('Error during fit:', e);
                }
            }
        });
        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        // Setup Electron IPC if available
        if (window.electron) {
            // Initialize WSL session
            // term.current.writeln('\x1b[36mInitializing WSL...\x1b[0m');
            
            // Limpiar el terminal antes de iniciar
            term.current.clear();
            
            window.electron.ipcRenderer.send(`wsl:start:${tabId}`, {
                cols: term.current.cols,
                rows: term.current.rows
            });

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
                            window.electron.ipcRenderer.send(`wsl:data:${tabId}`, text);
                        }
                    });
                    return;
                }
            });

            // Handle user input - send to WSL
            const dataHandler = term.current.onData(data => {
                window.electron.ipcRenderer.send(`wsl:data:${tabId}`, data);
            });

            // Handle terminal resize
            const resizeHandler = term.current.onResize(({ cols, rows }) => {
                window.electron.ipcRenderer.send(`wsl:resize:${tabId}`, { cols, rows });
            });

            // Listen for WSL output
            const dataListener = (data) => {
                if (term.current) {
                    term.current.write(data);
                }
            };
            const onDataUnsubscribe = window.electron.ipcRenderer.on(`wsl:data:${tabId}`, dataListener);

            // Listen for WSL ready event
            const readyListener = () => {
                setIsConnected(true);
                // term.current?.writeln('\x1b[32mWSL ready!\x1b[0m');
            };
            const onReadyUnsubscribe = window.electron.ipcRenderer.on(`wsl:ready:${tabId}`, readyListener);

            // Listen for WSL errors
            const errorListener = (error) => {
                term.current?.writeln(`\x1b[31mWSL Error: ${error}\x1b[0m`);
            };
            const onErrorUnsubscribe = window.electron.ipcRenderer.on(`wsl:error:${tabId}`, errorListener);

            // Handle right-click context menu
            const contextMenuHandler = (e) => {
                e.preventDefault();
                // Simple paste functionality on right-click
                window.electron.clipboard.readText().then(text => {
                    if (text) {
                        window.electron.ipcRenderer.send(`wsl:data:${tabId}`, text);
                    }
                });
            };
            terminalRef.current.addEventListener('contextmenu', contextMenuHandler);

            // Cleanup function
            return () => {
                resizeObserver.disconnect();
                window.electron.ipcRenderer.send(`wsl:stop:${tabId}`);
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
            term.current.writeln('\x1b[31mError: Electron API not available. WSL integration will not work.\x1b[0m');
            return () => {
                resizeObserver.disconnect();
                if (term.current) {
                    term.current.dispose();
                }
            };
        }
    }, [tabId]);

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
                    fitAddon.current.fit(); 
                } catch (e) {
                    console.error('Error in auto-fit:', e);
                }
            }, 0);
        }
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%', height: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative', background: theme.background || '#300A24' }}>
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
                <StatusBar stats={{ ...(statusStats || {}), cpuHistory }} active={true} statusBarIconTheme={statusBarIconTheme} showNetworkDisks={showNetworkDisks} />
            </div>
        </div>
    );
});

export default WSLTerminal;
