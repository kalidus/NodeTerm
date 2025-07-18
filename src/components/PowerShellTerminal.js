import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

const PowerShellTerminal = forwardRef(({ fontFamily = 'Consolas, "Courier New", monospace', fontSize = 14, theme = {} }, ref) => {
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
                window.electron?.ipcRenderer.send('powershell:data', text);
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
                background: '#012456',
                foreground: '#FFFFFF',
                cursor: '#FFFFFF',
                selection: 'rgba(255, 255, 255, 0.3)',
                black: '#000000',
                brightBlack: '#666666',
                red: '#E74856',
                brightRed: '#F2B4B8',
                green: '#16C60C',
                brightGreen: '#B9F2A7',
                yellow: '#F9F1A5',
                brightYellow: '#FCEDA7',
                blue: '#3B78FF',
                brightBlue: '#9ECBFF',
                magenta: '#B4009E',
                brightMagenta: '#FECDFE',
                cyan: '#61D6D6',
                brightCyan: '#9AECEC',
                white: '#CCCCCC',
                brightWhite: '#F2F2F2',
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
            // Initialize PowerShell session
            term.current.writeln('\x1b[36mInitializing PowerShell...\x1b[0m');
            window.electron.ipcRenderer.send('powershell:start', {
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
                            window.electron.ipcRenderer.send('powershell:data', text);
                        }
                    });
                    return;
                }
            });

            // Handle user input - send to PowerShell
            const dataHandler = term.current.onData(data => {
                window.electron.ipcRenderer.send('powershell:data', data);
            });

            // Handle terminal resize
            const resizeHandler = term.current.onResize(({ cols, rows }) => {
                window.electron.ipcRenderer.send('powershell:resize', { cols, rows });
            });

            // Listen for PowerShell output
            const dataListener = (data) => {
                if (term.current) {
                    term.current.write(data);
                }
            };
            const onDataUnsubscribe = window.electron.ipcRenderer.on('powershell:data', dataListener);

            // Listen for PowerShell ready event
            const readyListener = () => {
                setIsConnected(true);
                term.current?.writeln('\x1b[32mPowerShell ready!\x1b[0m');
            };
            const onReadyUnsubscribe = window.electron.ipcRenderer.on('powershell:ready', readyListener);

            // Listen for PowerShell errors
            const errorListener = (error) => {
                term.current?.writeln(`\x1b[31mPowerShell Error: ${error}\x1b[0m`);
            };
            const onErrorUnsubscribe = window.electron.ipcRenderer.on('powershell:error', errorListener);

            // Handle right-click context menu
            const contextMenuHandler = (e) => {
                e.preventDefault();
                // Simple paste functionality on right-click
                window.electron.clipboard.readText().then(text => {
                    if (text) {
                        window.electron.ipcRenderer.send('powershell:data', text);
                    }
                });
            };
            terminalRef.current.addEventListener('contextmenu', contextMenuHandler);

            // Cleanup function
            return () => {
                resizeObserver.disconnect();
                window.electron.ipcRenderer.send('powershell:stop');
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
                background: '#012456',
                padding: 0,
                margin: 0
            }} 
        />
    );
});

export default PowerShellTerminal;
