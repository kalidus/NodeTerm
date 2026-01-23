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

        // Cancelar timer de desconexión pendiente si existe
        // Esto evita desconectar la sesión SSH cuando el componente se remonta rápidamente
        if (window.__sshDisconnectTimers && window.__sshDisconnectTimers[tabId]) {
            clearTimeout(window.__sshDisconnectTimers[tabId]);
            delete window.__sshDisconnectTimers[tabId];
        }

        // Detectar si es terminal local (inicio) de forma robusta
        const isLocalTerminal = !sshConfig || Object.keys(sshConfig).length === 0 || (!sshConfig.host && !sshConfig.username);
        let defaultFont = fontFamily || 'monospace';
        let defaultFontSize = fontSize;
        if (isLocalTerminal) {
            defaultFont = localStorage.getItem('basicapp_local_terminal_font_family') || '"FiraCode Nerd Font", monospace';
            defaultFontSize = parseInt(localStorage.getItem('basicapp_local_terminal_font_size') || '14', 10);
        }

        // Leer scrollback desde configuración (configurable en Settings)
        const scrollbackLines = parseInt(localStorage.getItem('nodeterm_scrollback_lines') || '1000', 10);

        // Initialize Terminal
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: defaultFont,
            fontSize: defaultFontSize,
            allowProposedApi: true,
            theme: theme,
            // Configuraciones adicionales para compatibilidad con aplicaciones TUI
            convertEol: true,
            scrollback: scrollbackLines, // Configurable desde Settings (default: 1000)
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
        
        // Restaurar el buffer preservado si existe (cuando el componente se remonta)
        if (window.__terminalBuffers && window.__terminalBuffers[tabId]) {
            try {
                const savedBuffer = window.__terminalBuffers[tabId];
                const timeSinceSaved = Date.now() - savedBuffer.timestamp;
                
                // Solo restaurar si fue guardado recientemente (menos de 3 segundos)
                if (timeSinceSaved < 3000) {
                    // Restaurar cada línea con salto de línea entre ellas
                    // NO agregar \r\n al final de la última línea para evitar prompt desplazado
                    savedBuffer.lines.forEach((line, index) => {
                        term.current.write(line);
                        if (index < savedBuffer.lines.length - 1) {
                            term.current.write('\r\n');
                        }
                    });
                }
                
                // Siempre limpiar el buffer guardado
                delete window.__terminalBuffers[tabId];
            } catch (error) {
                if (window.__terminalBuffers) {
                    delete window.__terminalBuffers[tabId];
                }
            }
        }
        
        term.current.focus();
        
        // ResizeObserver con debounce para evitar desplazamientos al hacer split
        // CRÍTICO: No hacer fit() inmediatamente cuando cambia el tamaño, esperar a que el DOM se estabilice
        let resizeRaf = null;
        let resizeTimeout = null;
        const resizeObserver = new ResizeObserver(() => {
            if (fitAddon.current && term.current) {
                // Cancelar RAF y timeout anteriores si existen
                if (resizeRaf) {
                    cancelAnimationFrame(resizeRaf);
                    resizeRaf = null;
                }
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                
                // Usar RAF + timeout para asegurar que el DOM está completamente estable
                // RAF para el siguiente frame, timeout adicional para splits complejos
                resizeRaf = requestAnimationFrame(() => {
                    resizeTimeout = setTimeout(() => {
                        try {
                            // Simplemente hacer fit sin tocar el scroll
                            // xterm.js maneja el scroll automáticamente
                            fitAddon.current.fit();
                        } catch (e) {
                            // Silenciar errores
                        }
                    }, 150); // Timeout de 150ms para dar tiempo al DOM en splits complejos
                });
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
            
            // IMPORTANTE: Registrar listeners ANTES de conectar para no perder datos iniciales
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
            
            // Ahora sí, verificar y conectar DESPUÉS de registrar los listeners
            // Verificar si ya existe una conexión SSH activa para este tabId
            // Esto evita reconectar cuando un terminal se convierte en parte de un split
            const checkExistingConnection = async () => {
                try {
                    const hasConnection = await window.electron.ipcRenderer.invoke('ssh:check-connection', tabId);
                    
                    if (!hasConnection) {
                        // Solo conectar si no existe una conexión activa
                        window.electron.ipcRenderer.send('ssh:connect', { tabId, config: sshConfig });
                    } else {
                        // Si ya existe, solo enviar el evento ready localmente
                        // para que el terminal se configure correctamente
                        setTimeout(() => {
                            window.electron.ipcRenderer.send('ssh:resize', {
                                tabId,
                                cols: term.current.cols,
                                rows: term.current.rows
                            });
                        }, 100);
                    }
                } catch (error) {
                    // En caso de error, intentar conectar de todas formas
                    window.electron.ipcRenderer.send('ssh:connect', { tabId, config: sshConfig });
                }
            };
            
            checkExistingConnection();

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
                
                // Preservar el buffer del terminal antes de desmontarlo
                // Guardar las últimas 500 líneas del buffer (o todo si hay menos)
                // Esto asegura preservar suficiente historial sin el scrollback antiguo completo
                if (term.current) {
                    try {
                        const buffer = term.current.buffer.active;
                        const lines = [];
                        
                        // Guardar las últimas 1500 líneas (historial extenso)
                        const linesToSave = 1500;
                        const startLine = Math.max(0, buffer.length - linesToSave);
                        const endLine = buffer.length;
                        
                        for (let i = startLine; i < endLine; i++) {
                            const line = buffer.getLine(i);
                            if (line) {
                                lines.push(line.translateToString(true));
                            }
                        }
                        
                        // Eliminar líneas vacías al final para evitar espaciado extra
                        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
                            lines.pop();
                        }
                        
                        if (!window.__terminalBuffers) window.__terminalBuffers = {};
                        window.__terminalBuffers[tabId] = {
                            lines,
                            cursorX: buffer.cursorX,
                            cursorY: buffer.cursorY,
                            viewportY: buffer.viewportY,
                            baseY: buffer.baseY,
                            timestamp: Date.now()
                        };
                    } catch (error) {
                        // Silenciar error
                    }
                }
                
                // Delay para desconectar SSH: evita desconexión innecesaria cuando el componente
                // se desmonta temporalmente (ej: al convertir un terminal en split)
                // Si el componente se vuelve a montar rápidamente, no se desconectará
                const disconnectTimer = setTimeout(() => {
                    window.electron.ipcRenderer.send('ssh:disconnect', tabId);
                    // Limpiar el timer del registro después de ejecutar
                    if (window.__sshDisconnectTimers) {
                        delete window.__sshDisconnectTimers[tabId];
                    }
                    // Limpiar el buffer guardado después de desconectar
                    if (window.__terminalBuffers) {
                        delete window.__terminalBuffers[tabId];
                    }
                }, 2000); // Aumentado a 2000ms para dar más margen en splits complejos
                
                // Guardar el timer en una variable global para poder cancelarlo si se remonta
                if (!window.__sshDisconnectTimers) window.__sshDisconnectTimers = {};
                window.__sshDisconnectTimers[tabId] = disconnectTimer;
                
                // Limpiar RAF y timeout del ResizeObserver
                if (resizeRaf) {
                    cancelAnimationFrame(resizeRaf);
                }
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                
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