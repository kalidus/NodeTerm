import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
// import { ImageAddon } from '@xterm/addon-image'; // Comentado temporalmente por errores de require
import '@xterm/xterm/css/xterm.css';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';
import { themes } from '../themes';

const TerminalComponent = forwardRef(({
    tabId,
    sshConfig,
    fontFamily,
    fontSize,
    theme,
    onContextMenu,
    active,
    stats,
    hideStatusBar = false,
    statusBarIconTheme = 'classic',
    onDrop,
    onDragOver,
    isBroadcastActive,
    onBroadcastData,
    broadcastExcludedTargets = [],
    isIntegrated = false,
    // Quick Actions Props
    onStartRecording,
    onStopRecording,
    isRecording,
    onShowSystemMonitor,
    onShowFileExplorer,
    onToggleBroadcast,
    onToggleBroadcastTarget,
    isSplit = false
}, ref) => {
    const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
    const [cpuHistory, setCpuHistory] = useState([]);
    // Visibilidad local del status bar (toggle desde el menú de la sesión SSH)
    const [localStatusBarVisible, setLocalStatusBarVisible] = useState(true);
    // Menú rápido de tema de terminal (abierto/cerrado)
    const [themeMenuOpen, setThemeMenuOpen] = useState(false);
    const themeMenuRef = useRef(null);

    // Detectar si es terminal local de forma robusta
    const isLocalTerminal = useMemo(() => {
        return !sshConfig || Object.keys(sshConfig).length === 0 || (!sshConfig.host && !sshConfig.username);
    }, [sshConfig]);

    // Ref para local echo SSH (se lee de localStorage y se actualiza con eventos)
    const sshLocalEchoRef = useRef(
        localStorage.getItem('nodeterm_ssh_local_echo') === 'true'
    );
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => {
        const isSSH = !isLocalTerminal;
        const storageKey = isSSH ? 'basicapp_statusbar_theme' : 'localLinuxStatusBarTheme';
        try { return localStorage.getItem(storageKey) || 'Default Dark'; } catch { return 'Default Dark'; }
    });
    // Ref para evitar regenerar el terminal si cambian los props de broadcast
    const broadcastPropsRef = useRef({ isBroadcastActive, onBroadcastData });
    useEffect(() => {
        broadcastPropsRef.current = { isBroadcastActive, onBroadcastData };
    }, [isBroadcastActive, onBroadcastData]);

    // Actualizar cpuHistory cada vez que cambie stats.cpu, pero solo si es v??lido
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

    // Escuchar cambios del setting de local echo SSH
    useEffect(() => {
        const handleSettingsChange = (e) => {
            if (e.detail && typeof e.detail.sshLocalEcho === 'boolean') {
                sshLocalEchoRef.current = e.detail.sshLocalEcho;
            }
        };
        window.addEventListener('terminal-settings-changed', handleSettingsChange);
        return () => window.removeEventListener('terminal-settings-changed', handleSettingsChange);
    }, []);

    // Cerrar menú de tema al hacer clic fuera
    useEffect(() => {
        if (!themeMenuOpen) return;
        const handleClickOutside = (e) => {
            if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
                setThemeMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [themeMenuOpen]);

    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);

    // Build CSS variable overrides for StatusBar
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

    // Escuchar cambios de tema
    useEffect(() => {
        const handleStorage = (e) => {
            if (!e) return;
            const isSSH = !isLocalTerminal;
            const storageKey = isSSH ? 'basicapp_statusbar_theme' : 'localLinuxStatusBarTheme';
            if (e.key === storageKey) {
                setLocalStatusBarThemeName(e.newValue || 'Default Dark');
            }
        };
        const handleThemeChanged = (e) => {
            const isSSH = !isLocalTerminal;
            const targetType = isSSH ? 'ssh' : 'linux';
            if (e.detail && e.detail.terminalType === targetType) {
                setLocalStatusBarThemeName(e.detail.theme);
            }
        };
        window.addEventListener('storage', handleStorage);
        window.addEventListener('statusbar-theme-changed', handleThemeChanged);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('statusbar-theme-changed', handleThemeChanged);
        };
    }, [isLocalTerminal]);

    // Expose fit method to parent component
    useImperativeHandle(ref, () => ({
        fit: () => {
            try {
                fitAddon.current?.fit();
            } catch (e) {
                // Elimina cualquier console.log de depuraci??n restante.
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
                // Usar un peque??o delay para asegurar que el terminal est?? listo
                setTimeout(() => {
                    // Para terminales SSH, enviar datos al servidor SSH
                    if (sshConfig && sshConfig.host) {
                        window.electron.ipcRenderer.send('ssh:data', { tabId, data: text });
                    } else {
                        // Para terminales locales, usar write directamente
                        term.current.write(text);
                    }
                    // Restaurar el foco despu??s de pegar y asegurar que los eventos funcionen
                    setTimeout(() => {
                        term.current.focus();
                        // Forzar un evento de foco para asegurar que el terminal est?? completamente activo
                        term.current.element?.dispatchEvent(new Event('focus', { bubbles: true }));
                    }, 5);
                }, 10);
            }
        }
    }));

    useEffect(() => {
        if (!tabId) return;

        // Cancelar timer de desconexi??n pendiente si existe
        // Esto evita desconectar la sesi??n SSH cuando el componente se remonta r??pidamente
        if (window.__sshDisconnectTimers && window.__sshDisconnectTimers[tabId]) {
            clearTimeout(window.__sshDisconnectTimers[tabId]);
            delete window.__sshDisconnectTimers[tabId];
        }

        // Detectar si es terminal local (inicio) de forma robusta
        let defaultFont = fontFamily || 'monospace';
        let defaultFontSize = fontSize;
        if (isLocalTerminal) {
            defaultFont = localStorage.getItem('basicapp_local_terminal_font_family') || '"FiraCode Nerd Font", monospace';
            defaultFontSize = parseInt(localStorage.getItem('basicapp_local_terminal_font_size') || '14', 10);
        }

        // Leer scrollback desde configuraci??n (configurable en Settings)
        const scrollbackLines = parseInt(localStorage.getItem('nodeterm_scrollback_lines') || '1000', 10);

        // Initialize Terminal
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: defaultFont,
            fontSize: defaultFontSize,
            allowProposedApi: true,
            theme: isIntegrated
                ? { ...theme, background: 'rgba(0,0,0,0)' }
                : theme,
            // Configuraciones adicionales para compatibilidad con aplicaciones TUI
            convertEol: true,
            scrollback: scrollbackLines, // Configurable desde Settings (default: 1000)
            rightClickSelectsWord: true,
            macOptionIsMeta: true,
            windowsMode: false,
            // Habilitar soporte completo para c??digos de escape ANSI
            allowTransparency: isIntegrated,
            windowOptions: {},
            // Configuraci??n para aplicaciones interactivas
            cols: 80,
            rows: 24,
            // Configuraciones cr??ticas para aplicaciones TUI como htop, vim, etc.
            fastScrollModifier: 'alt',
            fastScrollSensitivity: 5,
            scrollSensitivity: 1,
            // Habilitar procesamiento completo de c??digos de escape
            disableStdin: false,
            // Configuraciones de compatibilidad con aplicaciones complejas
            drawBoldTextInBrightColors: true,
            minimumContrastRatio: 1, // Desactivar ajuste de contraste autom??tico para evitar desenfoque de color
            fontWeight: '400', // Forzar un peso de fuente est??ndar definido
            fontWeightBold: 'bold',
            letterSpacing: 0,
            lineHeight: 1.1,
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
                    // Restaurar cada l??nea con salto de l??nea entre ellas
                    // NO agregar \r\n al final de la ??ltima l??nea para evitar prompt desplazado
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
        // CR??TICO: No hacer fit() inmediatamente cuando cambia el tama??o, esperar a que el DOM se estabilice
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

                // Usar RAF + timeout para asegurar que el DOM est?? completamente estable
                // RAF para el siguiente frame, timeout adicional para splits complejos
                resizeRaf = requestAnimationFrame(() => {
                    resizeTimeout = setTimeout(() => {
                        try {
                            // Simplemente hacer fit sin tocar el scroll
                            // xterm.js maneja el scroll autom??ticamente
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
                            // Asegurar que el terminal tenga el foco y est?? listo
                            term.current.focus();
                            setTimeout(() => {
                                // Para terminales SSH, enviar datos al servidor SSH
                                if (sshConfig && sshConfig.host) {
                                    window.electron.ipcRenderer.send('ssh:data', { tabId, data: text });
                                } else {
                                    // Para terminales locales, usar write directamente
                                    term.current.write(text);
                                }
                                // Restaurar el foco despu??s de pegar y asegurar que los eventos funcionen
                                setTimeout(() => {
                                    term.current.focus();
                                    // Forzar un evento de foco para asegurar que el terminal est?? completamente activo
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
                    message = `No se pudo abrir un nuevo canal SSH.\r\n\r\nEsto suele ocurrir porque el servidor solo permite un canal SSH por sesi??n, o el sistema necesita ser reiniciado.\r\n\r\nDetalles: ${error}`;
                }
                if (!message || (typeof message === 'string' && message.trim() === '')) {
                    message = 'Error desconocido al conectar por SSH.';
                }
                term.current?.writeln(`\r\n\x1b[31mConnection Error: ${message}\x1b[0m`);
            };
            const onErrorUnsubscribe = window.electron.ipcRenderer.on(`ssh:error:${tabId}`, errorListener);

            // Ahora s??, verificar y conectar DESPU??S de registrar los listeners
            // Verificar si ya existe una conexi??n SSH activa para este tabId
            // Esto evita reconectar cuando un terminal se convierte en parte de un split
            const checkExistingConnection = async () => {
                try {
                    const hasConnection = await window.electron.ipcRenderer.invoke('ssh:check-connection', tabId);

                    if (!hasConnection) {
                        // Solo conectar si no existe una conexi??n activa
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
                const { isBroadcastActive: currentBroadcast, onBroadcastData: currentBroadcastFn } = broadcastPropsRef.current;

                // Local echo SSH: mostrar el car??cter localmente ANTES del round-trip al servidor
                // Solo para terminales SSH, solo si est?? habilitado, y solo para caracteres imprimibles
                const isSSH = sshConfig && (sshConfig.host || sshConfig.bastionHost);
                if (isSSH && sshLocalEchoRef.current) {
                    // Solo hacer echo de caracteres imprimibles (no secuencias de escape, no control chars)
                    // - Excluir: ESC (\x1b), caracteres de control (< 0x20), DEL (0x7f), backspace (0x08)
                    // - Excluir: secuencias de m??s de 1 car??cter (teclas especiales como flechas, F1..)
                    const code = data.charCodeAt(0);
                    const isPrintable =
                        data.length === 1 &&
                        code >= 0x20 &&   // >= SPACE
                        code !== 0x7f &&  // no DEL
                        code < 0x80;     // no bytes multibyte (UTF-8 extendido)
                    if (isPrintable) {
                        term.current?.write(data);
                    }
                }

                // ✅ FIX: Siempre enviamos al backend propio para que no se "congele" el terminal
                // si está excluido del broadcast o si el broadcast está activo pero el usuario escribe aquí.
                window.electron.ipcRenderer.send('ssh:data', { tabId, data });

                // ✅ FIX: Si el broadcast está activo, notificamos al gestor global
                // Pasamos el tabId de origen para que handleBroadcastData pueda filtrarlo
                // y evitar el eco (enviar dos veces al mismo terminal)
                if (currentBroadcast && currentBroadcastFn) {
                    currentBroadcastFn(tabId, data);
                }
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
                // Guardar las ??ltimas 500 l??neas del buffer (o todo si hay menos)
                // Esto asegura preservar suficiente historial sin el scrollback antiguo completo
                if (term.current) {
                    try {
                        const buffer = term.current.buffer.active;
                        const lines = [];

                        // Guardar las ??ltimas 1500 l??neas (historial extenso)
                        const linesToSave = 1500;
                        const startLine = Math.max(0, buffer.length - linesToSave);
                        const endLine = buffer.length;

                        for (let i = startLine; i < endLine; i++) {
                            const line = buffer.getLine(i);
                            if (line) {
                                lines.push(line.translateToString(true));
                            }
                        }

                        // Eliminar l??neas vac??as al final para evitar espaciado extra
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

                // Delay para desconectar SSH: evita desconexi??n innecesaria cuando el componente
                // se desmonta temporalmente (ej: al convertir un terminal en split)
                // Si el componente se vuelve a montar r??pidamente, no se desconectar??
                const disconnectTimer = setTimeout(() => {
                    window.electron.ipcRenderer.send('ssh:disconnect', tabId);
                    // Limpiar el timer del registro despu??s de ejecutar
                    if (window.__sshDisconnectTimers) {
                        delete window.__sshDisconnectTimers[tabId];
                    }
                    // Limpiar el buffer guardado despu??s de desconectar
                    if (window.__terminalBuffers) {
                        delete window.__terminalBuffers[tabId];
                    }
                }, 2000); // Aumentado a 2000ms para dar m??s margen en splits complejos

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
            term.current.writeln('\x1b[31mError: Electron API no disponible. El portapapeles y la comunicaci??n no funcionar??n.\x1b[0m');
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

            // CR??TICO: Re-aplicar opciones de nitidez al cambiar de fuente
            // xterm.js a veces resetea o recalcula el renderizado internamente
            term.current.options.fontWeight = '400';
            term.current.options.fontWeightBold = 'bold';
            term.current.options.minimumContrastRatio = 1;
            term.current.options.letterSpacing = 0;
            term.current.options.lineHeight = 1.1;

            // We might need to call fit again to readjust character sizes
            fitAddon.current?.fit();
        }
    }, [fontFamily]);

    // Effect to update font size dynamically
    useEffect(() => {
        if (term.current && fontSize) {
            term.current.options.fontSize = fontSize;

            // CR??TICO: Re-aplicar opciones de nitidez al cambiar el tama??o
            term.current.options.fontWeight = '400';
            term.current.options.fontWeightBold = 'bold';
            term.current.options.minimumContrastRatio = 1;
            term.current.options.lineHeight = 1.1;

            // We might need to call fit again to readjust character sizes
            fitAddon.current?.fit();
        }
    }, [fontSize]);

    // Effect to update theme dynamically
    useEffect(() => {
        if (term.current && theme) {
            term.current.options.theme = isIntegrated
                ? { ...theme, background: 'rgba(0,0,0,0)' }
                : theme;
        }
    }, [theme, isIntegrated]);

    // Focus autom??tico cuando la pesta??a se vuelve activa
    useEffect(() => {
        if (active && term.current) {
            term.current.focus();
            setForceUpdateCounter(c => c + 1); // <-- Forzar re-render StatusBar
        }
    }, [active]);

    // Forzar fit tras el primer render (por si el layout cambia despu??s del render)
    useEffect(() => {
        if (fitAddon.current) {
            const timer = setTimeout(() => {
                try { fitAddon.current.fit(); } catch (e) { }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, []); // Solo al montar

    return (
        <div
            className="terminal-component-wrapper"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                backgroundColor: isIntegrated ? 'transparent' : (theme?.background || '#1e1e1e'),
                '--terminal-bg': theme?.background || '#1e1e1e',
                overflow: 'hidden',
                ...getScopedStatusBarCssVars()
            }}
        >
            <div
                className={`terminal-outer-padding ${isIntegrated ? 'integrated-terminal' : ''} ${isBroadcastActive && !broadcastExcludedTargets?.includes(tabId) ? 'broadcast-active' : ''}`}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    flex: 1,
                    width: '100%',
                    minWidth: 0,
                    minHeight: 0,
                    overflow: 'hidden',
                    position: 'relative',
                    padding: '10px', // Padding ajustado para evitar huecos grandes
                    margin: 0,
                    marginBottom: (isIntegrated || hideStatusBar || !localStatusBarVisible) ? 0 : '-1px', // Solapamiento de 1px para ocultar huecos de renderizado, solo si hay StatusBar
                    zIndex: isIntegrated ? 0 : 1,
                    backgroundColor: isIntegrated ? 'transparent' : (theme?.background || 'var(--terminal-bg)'),
                    '--terminal-bg': theme?.background || 'transparent',
                    '--terminal-fg': theme?.foreground || 'inherit',
                    '--terminal-scrollbar-thumb': theme?.brightBlack || theme?.selectionBackground || '#555555',
                    '--terminal-scrollbar-hover': theme?.white || theme?.foreground || '#cccccc'
                }}
                onDrop={onDrop}
                onDragOver={onDragOver}
            >
                <div
                    ref={terminalRef}
                    style={{
                        padding: 0,
                        width: '100%',
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        background: isIntegrated ? 'transparent' : (theme?.background || 'var(--terminal-bg)'),
                        backgroundColor: isIntegrated ? 'transparent' : (theme?.background || 'var(--terminal-bg)')
                    }}
                />

                {/* Quick Actions Menu (only for SSH connections) */}
                {sshConfig && (sshConfig.host || sshConfig.hostname) && !isIntegrated && (
                    <div className="terminal-quick-actions" style={{
                        position: 'absolute',
                        top: '8px',
                        right: isSplit ? '26px' : '8px',
                        zIndex: 100,
                        display: 'flex',
                        gap: isSplit ? '0' : '4px',
                        padding: isSplit ? '2px' : '2px 6px',
                        borderRadius: '6px',
                        background: 'var(--ui-dialog-bg, rgba(15, 15, 15, 0.8))',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid var(--ui-dialog-border, rgba(255, 255, 255, 0.15))',
                        boxShadow: '0 4px 15px var(--ui-dialog-shadow, rgba(0, 0, 0, 0.4))',
                        opacity: 0.2, // Very low opacity when not hovered
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        pointerEvents: 'auto',
                        userSelect: 'none'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'translateY(1px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px var(--ui-dialog-shadow, rgba(0, 0, 0, 0.5))';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.2';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px var(--ui-dialog-shadow, rgba(0, 0, 0, 0.4))';
                        }}
                    >
                        {/* System Monitor Button - Hidden in Split Mode */}
                        {!isSplit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onShowSystemMonitor && onShowSystemMonitor(); }}
                                title="Monitor de Sistema"
                                className="quick-action-btn"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3px',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))';
                                    e.currentTarget.style.color = 'var(--primary-color, #fff)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))';
                                }}
                            >
                                <i className="pi pi-chart-bar" />
                            </button>
                        )}

                        {/* File Explorer Button - Hidden in Split Mode */}
                        {!isSplit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onShowFileExplorer && onShowFileExplorer(); }}
                                title="Explorador de Archivos (SFTP)"
                                className="quick-action-btn"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3px',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))';
                                    e.currentTarget.style.color = 'var(--primary-color, #fff)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))';
                                }}
                            >
                                <i className="pi pi-folder-open" />
                            </button>
                        )}

                        {/* Terminal theme - menú rápido (temas SSH, mismo que Configuración > Terminal > SSH) - Hidden in Split Mode */}
                        {!isSplit && (() => {
                            const SSH_THEME_KEY = 'basicapp_terminal_theme';
                            const currentThemeName = typeof localStorage !== 'undefined' ? (localStorage.getItem(SSH_THEME_KEY) || 'Default Dark') : 'Default Dark';
                            const themeNames = themes ? Object.keys(themes) : [];
                            const applyTheme = (themeName) => {
                                try {
                                    localStorage.setItem(SSH_THEME_KEY, themeName);
                                    window.dispatchEvent(new CustomEvent('terminal-theme-changed', { detail: { theme: themeName, terminalType: 'ssh' } }));
                                    setThemeMenuOpen(false);
                                } catch (err) { /* noop */ }
                            };
                            return (
                                <div ref={themeMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setThemeMenuOpen((v) => !v); }}
                                        title="Tema de la terminal SSH"
                                        className="quick-action-btn"
                                        style={{
                                            background: themeMenuOpen ? 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))' : 'transparent',
                                            border: 'none',
                                            color: 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '3px',
                                            borderRadius: '4px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!themeMenuOpen) e.currentTarget.style.background = 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))';
                                            e.currentTarget.style.color = 'var(--primary-color, #fff)';
                                        }}
                                        onMouseOut={(e) => {
                                            if (!themeMenuOpen) e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))';
                                        }}
                                    >
                                        <i className="pi pi-palette" />
                                    </button>
                                    {themeMenuOpen && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                marginTop: '4px',
                                                minWidth: '180px',
                                                maxHeight: '280px',
                                                overflowY: 'auto',
                                                background: 'var(--ui-dialog-bg, rgba(20, 20, 22, 0.98))',
                                                border: '1px solid var(--ui-dialog-border, rgba(255, 255, 255, 0.15))',
                                                borderRadius: '8px',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                                padding: '6px 0',
                                                zIndex: 9999
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {themeNames.map((themeKey) => {
                                                const t = themes[themeKey]?.theme || {};
                                                const bg = t.background || '#1e1e1e';
                                                const accent = t.cursor || t.green || t.foreground || '#fff';
                                                const isSelected = themeKey === currentThemeName;
                                                return (
                                                    <div
                                                        key={themeKey}
                                                        onClick={() => applyTheme(themeKey)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '6px 10px',
                                                            cursor: 'pointer',
                                                            borderRadius: '4px',
                                                            margin: '0 4px',
                                                            background: isSelected ? 'rgba(79, 195, 247, 0.15)' : 'transparent',
                                                            transition: 'all 0.15s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: '14px',
                                                                height: '14px',
                                                                borderRadius: '3px',
                                                                background: `linear-gradient(135deg, ${bg} 0%, ${accent} 100%)`,
                                                                border: '1px solid rgba(255,255,255,0.25)',
                                                                flexShrink: 0
                                                            }}
                                                        />
                                                        <span style={{ fontSize: '12px', color: 'var(--ui-dialog-text)', fontWeight: isSelected ? 600 : 400, flex: 1 }}>{themeKey}</span>
                                                        {isSelected && <i className="pi pi-check" style={{ fontSize: '10px', color: '#4fc3f7' }} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Status Bar visibility toggle - Hidden in Split Mode */}
                        {!isSplit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setLocalStatusBarVisible((v) => !v); }}
                                title={localStatusBarVisible ? 'Ocultar barra de estado' : 'Mostrar barra de estado'}
                                className="quick-action-btn"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3px',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))';
                                    e.currentTarget.style.color = 'var(--primary-color, #fff)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))';
                                }}
                            >
                                <i className="pi pi-bars" />
                            </button>
                        )}

                        {!isSplit && (
                            <div style={{
                                width: '1px',
                                height: '12px',
                                background: 'var(--ui-dialog-border, rgba(255, 255, 255, 0.1))',
                                alignSelf: 'center',
                                margin: '0 1px',
                                opacity: 0.5
                            }} />
                        )}

                        {/* Recording Button - Hidden in Split Mode */}
                        {!isSplit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); isRecording ? onStopRecording(tabId) : onStartRecording(tabId); }}
                                title={isRecording ? "Detener Grabación" : "Iniciar Grabación"}
                                className="quick-action-btn"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: isRecording ? '#ff4d4d' : 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3px',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))';
                                    e.currentTarget.style.color = isRecording ? '#ff4d4d' : 'var(--primary-color, #fff)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = isRecording ? '#ff4d4d' : 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))';
                                }}
                            >
                                <i className={`pi ${isRecording ? 'pi-stop-circle' : 'pi-circle-fill'}`} style={{ animation: isRecording ? 'pulse-red 2s infinite' : 'none' }} />
                            </button>
                        )}

                        {/* Broadcast Button - Only Visible in Split Mode */}
                        {isSplit && (() => {
                            const isExcluded = broadcastExcludedTargets && broadcastExcludedTargets.includes(tabId);
                            // Un terminal está "emitiendo" si el broadcast global está ON y este terminal no está excluido
                            const isActiveForThisTerminal = isBroadcastActive && (isSplit ? !isExcluded : true);

                            return (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isSplit) {
                                            onToggleBroadcastTarget && onToggleBroadcastTarget(tabId);
                                        } else {
                                            onToggleBroadcast && onToggleBroadcast();
                                        }
                                    }}
                                    title={isActiveForThisTerminal ? "Desactivar Broadcast" : "Activar Broadcast"}
                                    className="quick-action-btn"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: isActiveForThisTerminal ? '#4da6ff' : 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '3px',
                                        borderRadius: '4px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))';
                                        e.currentTarget.style.color = '#4da6ff';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = isActiveForThisTerminal ? '#4da6ff' : 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))';
                                    }}
                                >
                                    <i className="pi pi-megaphone" />
                                </button>
                            );
                        })()}
                    </div>
                )}

                {/* CSS for pulse animation */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                        @keyframes pulse-red {
                            0% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.5; transform: scale(1.2); }
                            100% { opacity: 1; transform: scale(1); }
                        }
                    `
                }} />
            </div>
            {!hideStatusBar && localStatusBarVisible && <StatusBar
                stats={{ ...stats, cpuHistory: cpuHistory }}
                active={active}
                statusBarIconTheme={statusBarIconTheme}
                terminalType={isLocalTerminal ? 'linux' : 'ssh'}
            />}
        </div >
    );
});

export default TerminalComponent; 