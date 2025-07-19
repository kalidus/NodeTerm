import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

const UbuntuTerminal = forwardRef(({ 
    fontFamily = 'Consolas, "Courier New", monospace', 
    fontSize = 14, 
    theme = {},
    tabId = 'default',
    ubuntuInfo = null // Mantener nombre por compatibilidad, pero puede ser cualquier distribución WSL
}, ref) => {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    // Determinar el canal IPC basado en la categoría de la distribución
    const getChannelPrefix = () => {
        if (ubuntuInfo?.category === 'ubuntu') {
            return 'ubuntu';
        } else if (ubuntuInfo?.category) {
            return 'wsl-distro';
        } else {
            // Fallback para compatibilidad con versiones anteriores
            return 'ubuntu';
        }
    };

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        fit: () => {
            try {
                console.log(`UbuntuTerminal fit() called for tab ${tabId}`);
                if (fitAddon.current) {
                    fitAddon.current.fit();
                    console.log(`UbuntuTerminal fit() successful for tab ${tabId}`);
                } else {
                    console.warn(`UbuntuTerminal fitAddon not available for tab ${tabId}`);
                }
            } catch (e) {
                console.error(`UbuntuTerminal fit() error for tab ${tabId}:`, e);
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
                window.electron?.ipcRenderer.send(`${getChannelPrefix()}:data:${tabId}`, text);
            }
        }
    }));

    useEffect(() => {
        // Initialize Terminal with Ubuntu-optimized settings
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: fontFamily,
            fontSize: fontSize,
            allowProposedApi: true,
            theme: {
                background: '#300A24', // Ubuntu terminal background
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
                ...theme
            },
            // Ubuntu/Linux optimized settings
            convertEol: true,
            scrollback: 10000,
            rightClickSelectsWord: true,
            macOptionIsMeta: true,
            windowsMode: false, // Ubuntu runs on Linux
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
        const resizeObserver = new ResizeObserver((entries) => {
            console.log(`UbuntuTerminal resize observer triggered for tab ${tabId}`);
            if (fitAddon.current) {
                try { 
                    fitAddon.current.fit(); 
                    console.log(`UbuntuTerminal resize observer fit successful for tab ${tabId}`);
                } catch (e) {
                    console.error(`UbuntuTerminal resize observer error for tab ${tabId}:`, e);
                }
            }
        });
        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        // Listener para cambios de visibilidad del documento
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log(`UbuntuTerminal visibility change detected for tab ${tabId}`);
                setTimeout(() => {
                    if (fitAddon.current) {
                        try {
                            fitAddon.current.fit();
                            console.log(`UbuntuTerminal visibility change fit successful for tab ${tabId}`);
                        } catch (e) {
                            console.error(`UbuntuTerminal visibility change fit error for tab ${tabId}:`, e);
                        }
                    }
                }, 100);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Setup Electron IPC if available
        if (window.electron) {
            // Initialize Ubuntu session
            term.current.clear();
            
            // Delay pequeño solo para tab-1 inicial para dar tiempo al backend
            const delay = tabId === 'tab-1' ? 300 : 0;
            
            setTimeout(() => {
                const channelPrefix = getChannelPrefix();
                
                // Usar el nombre de parámetro correcto según el canal
                const dataToSend = {
                    cols: term.current.cols,
                    rows: term.current.rows
                };
                
                if (channelPrefix === 'ubuntu') {
                    dataToSend.ubuntuInfo = ubuntuInfo;
                } else {
                    dataToSend.distroInfo = ubuntuInfo; // Para wsl-distro, usar distroInfo
                }
                
                window.electron.ipcRenderer.send(`${channelPrefix}:start:${tabId}`, dataToSend);
                
                const distroLabel = ubuntuInfo?.label || 'WSL Distribution';
                console.log(`🚀 Iniciando ${distroLabel} con info:`, ubuntuInfo);
                console.log(`🔧 Canal usado: ${channelPrefix}, parámetro: ${channelPrefix === 'ubuntu' ? 'ubuntuInfo' : 'distroInfo'}`);
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
                            window.electron.ipcRenderer.send(`${getChannelPrefix()}:data:${tabId}`, text);
                        }
                    });
                    return;
                }
            });

            // Handle user input - send to WSL distribution
            const dataHandler = term.current.onData(data => {
                window.electron.ipcRenderer.send(`${getChannelPrefix()}:data:${tabId}`, data);
            });

            // Handle terminal resize
            const resizeHandler = term.current.onResize(({ cols, rows }) => {
                window.electron.ipcRenderer.send(`${getChannelPrefix()}:resize:${tabId}`, { cols, rows });
            });

            // Listen for WSL distribution output
            const dataListener = (data) => {
                if (term.current) {
                    term.current.write(data);
                }
            };
            const channelPrefix = getChannelPrefix();
            const onDataUnsubscribe = window.electron.ipcRenderer.on(`${channelPrefix}:data:${tabId}`, dataListener);

            // Listen for WSL distribution ready event
            const readyListener = () => {
                setIsConnected(true);
            };
            const onReadyUnsubscribe = window.electron.ipcRenderer.on(`${channelPrefix}:ready:${tabId}`, readyListener);

            // Listen for WSL distribution errors
            const errorListener = (error) => {
                const distroLabel = ubuntuInfo?.label || 'WSL Distribution';
                term.current?.writeln(`\x1b[31m${distroLabel} Error: ${error}\x1b[0m`);
            };
            const onErrorUnsubscribe = window.electron.ipcRenderer.on(`${channelPrefix}:error:${tabId}`, errorListener);

            // Handle right-click context menu
            const contextMenuHandler = (e) => {
                e.preventDefault();
                // Simple paste functionality on right-click
                window.electron.clipboard.readText().then(text => {
                    if (text) {
                        window.electron.ipcRenderer.send(`${getChannelPrefix()}:data:${tabId}`, text);
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
                    window.electron.ipcRenderer.send(`${getChannelPrefix()}:stop:${tabId}`);
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
            term.current.writeln('\x1b[31mError: Electron API not available. Ubuntu integration will not work.\x1b[0m');
            return () => {
                resizeObserver.disconnect();
                document.removeEventListener('visibilitychange', handleVisibilityChange);
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
                    console.log(`UbuntuTerminal auto-fit successful for tab ${tabId}`);
                } catch (e) {
                    console.error(`UbuntuTerminal auto-fit error for tab ${tabId}:`, e);
                }
            }, 0);
        }
    });

    // Efecto adicional para forzar redimensionamiento después del montaje
    useEffect(() => {
        const forceResize = () => {
            if (fitAddon.current) {
                try {
                    fitAddon.current.fit();
                    console.log(`UbuntuTerminal force resize successful for tab ${tabId}`);
                } catch (e) {
                    console.error(`UbuntuTerminal force resize error for tab ${tabId}:`, e);
                }
            }
        };
        
        // Intentar múltiples veces después del montaje
        forceResize();
        setTimeout(forceResize, 50);
        setTimeout(forceResize, 150);
        setTimeout(forceResize, 300);
    }, [tabId]);

    return (
        <div 
            ref={terminalRef} 
            style={{ 
                flex: 1, 
                width: '100%', 
                height: '100%',
                minWidth: 0,
                minHeight: 0,
                overflow: 'hidden',
                position: 'relative',
                background: '#300A24', // Ubuntu terminal background
                padding: '0 0 0 8px',
                margin: 0
            }} 
        />
    );
});

export default UbuntuTerminal; 