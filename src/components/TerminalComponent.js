import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import { ImageAddon } from '@xterm/addon-image';
import '@xterm/xterm/css/xterm.css';
import StatusBar from './StatusBar';

const TerminalComponent = forwardRef(({ tabId, sshConfig, fontFamily, fontSize, theme }, ref) => {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);
    const [remoteStats, setRemoteStats] = useState(null);

    // Expose fit method to parent component
    useImperativeHandle(ref, () => ({
        fit: () => {
            try {
                 fitAddon.current?.fit();
            } catch (e) {
                console.log("Failed to fit terminal", e);
            }
        }
    }));

    useEffect(() => {
        if (!tabId || !sshConfig) return;

        // Initialize Terminal
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: fontFamily,
            fontSize: fontSize,
            allowProposedApi: true,
            theme: theme,
        });

        // Disable bracketed paste mode to prevent weird characters on Ctrl+V
        term.current.options.bracketedPasteMode = false;

        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        term.current.loadAddon(new WebLinksAddon());
        term.current.loadAddon(new Unicode11Addon());
        term.current.unicode.activeVersion = '11';

        // Load image addon
        term.current.loadAddon(new ImageAddon({ sixelScrolling: true }));

        // Load and activate the WebGL renderer
        const webglAddon = new WebglAddon();
        term.current.loadAddon(webglAddon);

        term.current.open(terminalRef.current);
        fitAddon.current.fit();
        term.current.focus();
        
        const resizeObserver = new ResizeObserver(() => {
            fitAddon.current?.fit();
        });
        resizeObserver.observe(terminalRef.current);

        // --- Clipboard and Event Handling ---
        // We wrap this in a check to ensure the electron API is ready.
        if (window.electron) {
             // Custom keyboard handling for copy/paste
            term.current.onKey(({ key, domEvent }) => {
                const isMac = window.electron.platform === 'darwin';
                const modifierKey = isMac ? domEvent.metaKey : domEvent.ctrlKey;

                if (modifierKey && domEvent.key === 'c') {
                    const selection = term.current.getSelection();
                    if (selection) {
                        window.electron.clipboard.writeText(selection);
                        domEvent.preventDefault();
                    }
                } else if (modifierKey && domEvent.key === 'v') {
                    domEvent.preventDefault(); // Prevenir el comportamiento por defecto primero
                    window.electron.clipboard.readText().then(text => {
                        if (text) {
                           term.current.write(text); // Usar 'write' en lugar de 'paste'
                        }
                    });
                }
            });

            // Handle right-click to paste
            const contextMenuHandler = (e) => {
                e.preventDefault();
                window.electron.clipboard.readText().then(text => {
                    if (text) {
                        term.current.paste(text);
                    }
                });
            };
            terminalRef.current.addEventListener('contextmenu', contextMenuHandler);
            
            // Cleanup for context menu
            const cleanupContextMenu = () => {
                if (terminalRef.current) {
                    terminalRef.current.removeEventListener('contextmenu', contextMenuHandler);
                }
            };
            
            // --- End of Clipboard Handling ---
            
            term.current.writeln('Connecting to SSH...');

            // Connect via IPC
            window.electron.ipcRenderer.send('ssh:connect', { tabId, config: sshConfig });

            // After the SSH connection is ready, send an initial resize so programs like vim/htop get the correct size
            const onReady = () => {
                window.electron.ipcRenderer.send('ssh:resize', {
                    tabId,
                    cols: term.current.cols,
                    rows: term.current.rows
                });
            };
            const onReadyUnsubscribe = window.electron.ipcRenderer.on(`ssh:ready:${tabId}`, onReady);

            // Listen for incoming data
            const dataListener = (data) => {
                term.current?.write(data);
            };
            const onDataUnsubscribe = window.electron.ipcRenderer.on(`ssh:data:${tabId}`, dataListener);

            // Listen for connection error
            const errorListener = (error) => {
                term.current?.writeln(`\r\n\x1b[31mConnection Error: ${error}\x1b[0m`);
            };
            const onErrorUnsubscribe = window.electron.ipcRenderer.on(`ssh:error:${tabId}`, errorListener);

            // Handle user input
            const dataHandler = term.current.onData(data => {
                window.electron.ipcRenderer.send('ssh:data', { tabId, data });
            });

            // Handle resize
            const resizeHandler = term.current.onResize(({ cols, rows }) => {
                window.electron.ipcRenderer.send('ssh:resize', { tabId, cols, rows });
            });

            // Listen for stats updates for this specific tab
            const onStatsUpdate = (stats) => {
                setRemoteStats(stats);
            };
            const onStatsUnsubscribe = window.electron.ipcRenderer.on(`ssh-stats:update:${tabId}`, onStatsUpdate);

            // Cleanup on component unmount
            return () => {
                resizeObserver.disconnect();
                cleanupContextMenu();
                window.electron.ipcRenderer.send('ssh:disconnect', tabId);
                if (onDataUnsubscribe) onDataUnsubscribe();
                if (onErrorUnsubscribe) onErrorUnsubscribe();
                if (onReadyUnsubscribe) onReadyUnsubscribe();
                if (onStatsUnsubscribe) onStatsUnsubscribe();
                dataHandler.dispose();
                resizeHandler.dispose();
                term.current?.dispose();
            };
        } else {
            term.current.writeln('\x1b[31mError: Electron API no disponible. El portapapeles y la comunicación no funcionarán.\x1b[0m');
            // Cleanup only the terminal if API is not ready
            return () => {
                resizeObserver.disconnect();
                term.current?.dispose();
            };
        }
    }, [tabId, sshConfig]);

    // Effect to update font family dynamically
    useEffect(() => {
        if (term.current && fontFamily) {
            term.current.options.fontFamily = fontFamily;
            // We might need to call fit again to readjust character sizes
            fitAddon.current?.fit();
        }
    }, [fontFamily]);

    // Effect to update font size dynamically
    useEffect(() => {
        if (term.current && fontSize) {
            term.current.options.fontSize = fontSize;
            // We might need to call fit again to readjust character sizes
            fitAddon.current?.fit();
        }
    }, [fontSize]);

    // Effect to update theme dynamically
    useEffect(() => {
        if (term.current && theme) {
            term.current.options.theme = theme;
        }
    }, [theme]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: theme?.background }}>
            <div ref={terminalRef} style={{ flex: 1, width: '100%', minHeight: 0 }} />
            <StatusBar stats={remoteStats} />
        </div>
    );
});

export default TerminalComponent; 