import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
// import { ImageAddon } from '@xterm/addon-image'; // Comentado temporalmente por errores de require
import '@xterm/xterm/css/xterm.css';
import StatusBar from './StatusBar';

const TerminalComponent = forwardRef(({ tabId, sshConfig, fontFamily, fontSize, theme, onContextMenu, active, stats, hideStatusBar = false, statusBarIconTheme = 'classic' }, ref) => {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);
    const [forceUpdateCounter, setForceUpdateCounter] = useState(0); // <-- NUEVO
    const [cpuHistory, setCpuHistory] = useState([]);

    // Actualizar cpuHistory cada vez que cambie stats.cpu, pero solo si es válido
    useEffect(() => {
        const cpuValue = stats && typeof stats.cpu === 'string'
            ? parseFloat(stats.cpu)
            : stats && typeof stats.cpu === 'number'
                ? stats.cpu
                : null;
        if (cpuValue !== null && !isNaN(cpuValue)) {
            setCpuHistory(prev => {
                const newArr = [...prev, cpuValue].slice(-30);
                return newArr;
            });
        }
    }, [stats?.cpu]);

    // Expose fit method to parent component
    useImperativeHandle(ref, () => ({
        fit: () => {
            try {
                 fitAddon.current?.fit();
            } catch (e) {
                // Elimina cualquier console.log de depuración restante.
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
                // Asegurar que el terminal tenga el foco antes de pegar
                term.current.focus();
                // Usar un pequeño delay para asegurar que el terminal esté listo
                setTimeout(() => {
                    // Para terminales SSH, enviar datos al servidor SSH
                    if (sshConfig && sshConfig.host) {
                        window.electron.ipcRenderer.send('ssh:data', { tabId, data: text });
                    } else {
                        // Para terminales locales, usar write directamente
                        term.current.write(text);
                    }
                    // Restaurar el foco después de pegar y asegurar que los eventos funcionen
                    setTimeout(() => {
                        term.current.focus();
                        // Forzar un evento de foco para asegurar que el terminal esté completamente activo
                        term.current.element?.dispatchEvent(new Event('focus', { bubbles: true }));
                    }, 5);
                }, 10);
            }
        }
    }));

    useEffect(() => {
        if (!tabId) return;

        // Detectar si es terminal local (inicio) de forma robusta
        const isLocalTerminal = !sshConfig || Object.keys(sshConfig).length === 0 || (!sshConfig.host && !sshConfig.username);
        let defaultFont = fontFamily || 'monospace';
        let defaultFontSize = fontSize;
        if (isLocalTerminal) {
            defaultFont = localStorage.getItem('basicapp_local_terminal_font_family') || '"FiraCode Nerd Font", monospace';
            defaultFontSize = parseInt(localStorage.getItem('basicapp_local_terminal_font_size') || '14', 10);
        }

        // Initialize Terminal
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: defaultFont,
            fontSize: defaultFontSize,
            allowProposedApi: true,
            theme: theme,
            // Configuraciones adicionales para compatibilidad con aplicaciones TUI
            convertEol: true,
            scrollback: 10000,
            rightClickSelectsWord: true,
            macOptionIsMeta: true,
            windowsMode: false,
            // Habilitar soporte completo para códigos de escape ANSI
            allowTransparency: true,
            windowOptions: {},
            // Configuración para aplicaciones interactivas
            cols: 80,
            rows: 24,
            // Configuraciones críticas para aplicaciones TUI como htop, vim, etc.
            fastScrollModifier: 'alt',
            fastScrollSensitivity: 5,
            scrollSensitivity: 1,
            // Habilitar procesamiento completo de códigos de escape
            disableStdin: false,
            // Configuraciones de compatibilidad con aplicaciones complejas
            drawBoldTextInBrightColors: true,
            minimumContrastRatio: 4.5,
        });

        // Disable bracketed paste mode to prevent weird characters on Ctrl+V
        term.current.options.bracketedPasteMode = false;

        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        term.current.loadAddon(new WebLinksAddon());
        term.current.loadAddon(new Unicode11Addon());
        term.current.unicode.activeVersion = '11';

        // Load image addon - Comentado temporalmente por errores de require
        // term.current.loadAddon(new ImageAddon({ sixelScrolling: true }));

        // Load and activate the WebGL renderer
        const webglAddon = new WebglAddon();
        term.current.loadAddon(webglAddon);

        term.current.open(terminalRef.current);
        fitAddon.current.fit();
        term.current.focus();
        
        // ResizeObserver robusto: fit en cada cambio de tamaño
        const resizeObserver = new ResizeObserver(() => {
            if (fitAddon.current) {
                try { fitAddon.current.fit(); } catch (e) {}
            }
        });
        if (terminalRef.current) resizeObserver.observe(terminalRef.current);

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
                           // Asegurar que el terminal tenga el foco y esté listo
                           term.current.focus();
                           setTimeout(() => {
                               // Para terminales SSH, enviar datos al servidor SSH
                               if (sshConfig && sshConfig.host) {
                                   window.electron.ipcRenderer.send('ssh:data', { tabId, data: text });
                               } else {
                                   // Para terminales locales, usar write directamente
                                   term.current.write(text);
                               }
                               // Restaurar el foco después de pegar y asegurar que los eventos funcionen
                               setTimeout(() => {
                                   term.current.focus();
                                   // Forzar un evento de foco para asegurar que el terminal esté completamente activo
                                   term.current.element?.dispatchEvent(new Event('focus', { bubbles: true }));
                               }, 5);
                           }, 10);
                        }
                    });
                }
            });

            // Handle right-click context menu
            const contextMenuHandler = (e) => {
                if (onContextMenu) {
                    onContextMenu(e, tabId);
                } else {
                    // Fallback: paste functionality
                    e.preventDefault();
                    window.electron.clipboard.readText().then(text => {
                        if (text) {
                            // Para terminales SSH, enviar datos al servidor SSH
                            if (sshConfig && sshConfig.host) {
                                window.electron.ipcRenderer.send('ssh:data', { tabId, data: text });
                            } else {
                                // Para terminales locales, usar write directamente
                                term.current.write(text);
                            }
                        }
                    });
                }
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
                let message = error;
                if (typeof error === 'string' && error.includes('Channel open failure')) {
                    message = `No se pudo abrir un nuevo canal SSH.\r\n\r\nEsto suele ocurrir porque el servidor solo permite un canal SSH por sesión, o el sistema necesita ser reiniciado.\r\n\r\nDetalles: ${error}`;
                }
                if (!message || (typeof message === 'string' && message.trim() === '')) {
                    message = 'Error desconocido al conectar por SSH.';
                }
                term.current?.writeln(`\r\n\x1b[31mConnection Error: ${message}\x1b[0m`);
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

            // Cleanup on component unmount
            return () => {
                resizeObserver.disconnect();
                cleanupContextMenu();
                window.electron.ipcRenderer.send('ssh:disconnect', tabId);
                if (onDataUnsubscribe) onDataUnsubscribe();
                if (onErrorUnsubscribe) onErrorUnsubscribe();
                if (onReadyUnsubscribe) onReadyUnsubscribe();
                dataHandler.dispose();
                resizeHandler.dispose();
                if (term.current) {
                    term.current?.dispose();
                }
            };
        } else {
            term.current.writeln('\x1b[31mError: Electron API no disponible. El portapapeles y la comunicación no funcionarán.\x1b[0m');
            // Cleanup only the terminal if API is not ready
            return () => {
                resizeObserver.disconnect();
                if (term.current) {
                    term.current?.dispose();
                }
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

    // Focus automático cuando la pestaña se vuelve activa
    useEffect(() => {
        if (active && term.current) {
            term.current.focus();
            setForceUpdateCounter(c => c + 1); // <-- Forzar re-render StatusBar
        }
    }, [active]);

    // Forzar fit tras cada render (por si el layout cambia después del render)
    useEffect(() => {
        if (fitAddon.current) {
            setTimeout(() => {
                try { fitAddon.current.fit(); } catch (e) {}
            }, 0);
        }
    });

    return (
        <>
            <div 
                ref={terminalRef} 
                className={'terminal-outer-padding'}
                style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    flex: 1, 
                    width: '100%', 
                    minWidth: 0,
                    minHeight: 0,
                    height: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                    padding: 0,
                    margin: 0
                }} 
            />
            {!hideStatusBar && <StatusBar stats={{...stats, cpuHistory: cpuHistory}} active={active} statusBarIconTheme={statusBarIconTheme} />}
        </>
    );
});

export default TerminalComponent; 