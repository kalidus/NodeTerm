import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

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
                background: '#300A24',
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
            term.current.writeln('\x1b[36mInitializing WSL...\x1b[0m');
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
                term.current?.writeln('\x1b[32mWSL ready!\x1b[0m');
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
                background: '#300A24',
                padding: 0,
                margin: 0
            }} 
        />
    );
});

export default WSLTerminal;
