import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useMemo } from 'react';
import { useStatusBarSessionHistory } from '../hooks/useStatusBarSessionHistory';
import { loadXtermModules, getCachedXtermModules } from '../utils/xtermLoader';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';
import { themes } from '../themes';
import { shouldBlockHumanInput } from '../services/terminalAgentState';
import { createXtermWriteBuffer } from '../utils/xtermWriteBuffer';
import {
    attachTerminalRenderer,
    attachUnicode11,
    attachVisibleTerminalRenderer,
    createStableTerminalFit,
    getTerminalScrollback,
    syncTerminalRenderer,
    useTerminalMemoryGuards
} from '../utils/xtermRenderer';
import { useLogColorizer } from '../hooks/useLogColorizer';
import {
    colorizeLogLine,
    looksLikeRestorableLogLine,
    looksLikeTuiChrome,
    looksLikeTuiSnapshot
} from '../utils/logColorizer';
import { writeText as clipboardWriteText, readText as clipboardReadText } from '../utils/clipboard';
import { useSshTabStats } from '../services/SshStatsStore';
import { sendSshUserInput, deferNonCritical } from '../utils/terminalInputSend';
import {
    resolveTerminalFontFamily,
    getDefaultLocalTerminalFontFamily,
    ensureTerminalFontsLoaded
} from '../utils/resolveTerminalFontFamily';
import { getAvailableFonts } from '../utils/fontsList';

const TerminalComponent = forwardRef(({
    tabId,
    sshConfig,
    fontFamily,
    fontSize,
    theme,
    onContextMenu,
    active,
    /** En splits densos: false = Canvas (sigue pintando) sin contexto WebGL extra */
    preferWebgl,
    stats: propsStats,
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
    isSplit = false,
    /** Si true, al desmontar no se programa ssh:disconnect (hibernación / splits) */
    preserveSessionOnUnmount = false
}, ref) => {
    const preserveSessionRef = useRef(preserveSessionOnUnmount);
    useEffect(() => {
        preserveSessionRef.current = preserveSessionOnUnmount;
    }, [preserveSessionOnUnmount]);
    const storeStats = useSshTabStats(tabId);
    const effectiveStats = propsStats !== undefined ? propsStats : storeStats;
    const sessionHistory = useStatusBarSessionHistory(effectiveStats);
    // Visibilidad local del status bar (toggle desde el menú de la sesión SSH)
    const [localStatusBarVisible, setLocalStatusBarVisible] = useState(true);
    // Menú unificado de apariencia SSH (tema + tipografía)
    const [appearanceMenuOpen, setAppearanceMenuOpen] = useState(false);
    const [appearanceTab, setAppearanceTab] = useState('theme'); // 'theme' | 'font'
    const appearanceMenuRef = useRef(null);
    // En split: overrides solo para este panel (no se guardan ni afectan al global)
    const [splitThemeOverride, setSplitThemeOverride] = useState(null);
    const [splitFontOverride, setSplitFontOverride] = useState(null);
    const [splitFontSizeOverride, setSplitFontSizeOverride] = useState(null);
    const availableFonts = useMemo(() => getAvailableFonts(), []);

    // Detectar si es terminal local de forma robusta
    const isLocalTerminal = useMemo(() => {
        return !sshConfig || Object.keys(sshConfig).length === 0 || (!sshConfig.host && !sshConfig.username);
    }, [sshConfig]);

    useEffect(() => {
        if (isLocalTerminal || tabId == null) return undefined;
        const send = window.electron?.ipcRenderer?.send;
        if (typeof send !== 'function') return undefined;
        send('ssh:set-statusbar-visible', tabId, !hideStatusBar && localStatusBarVisible);
        return () => {
            send('ssh:set-statusbar-visible', tabId, false);
        };
    }, [isLocalTerminal, tabId, hideStatusBar, localStatusBarVisible]);

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


    // Escuchar cambios de settings de terminal (echo local SSH, scrollback, etc.)
    useEffect(() => {
        const handleSettingsChange = (e) => {
            if (e.detail && typeof e.detail.sshLocalEcho === 'boolean') {
                sshLocalEchoRef.current = e.detail.sshLocalEcho;
            }
            if (e.detail && typeof e.detail.scrollback === 'number' && term.current) {
                term.current.options.scrollback = e.detail.scrollback;
            }
        };
        window.addEventListener('terminal-settings-changed', handleSettingsChange);
        return () => window.removeEventListener('terminal-settings-changed', handleSettingsChange);
    }, []);

    // Cerrar menú de apariencia al hacer clic fuera
    useEffect(() => {
        if (!appearanceMenuOpen) return;
        const handleClickOutside = (e) => {
            if (appearanceMenuRef.current && !appearanceMenuRef.current.contains(e.target)) {
                setAppearanceMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [appearanceMenuOpen]);

    // Tema efectivo: en split con override local usa ese; si no, el que viene por props
    const effectiveTheme = useMemo(() => {
        if (isSplit && splitThemeOverride && themes && themes[splitThemeOverride]?.theme) {
            return themes[splitThemeOverride].theme;
        }
        return theme || {};
    }, [isSplit, splitThemeOverride, theme]);

    // Fuente efectiva: override local (menú rápido / split) gana sobre la prop global
    const effectiveFontFamily = useMemo(() => {
        if (splitFontOverride) return splitFontOverride;
        return fontFamily;
    }, [splitFontOverride, fontFamily]);

    useEffect(() => {
        setSplitFontOverride(null);
    }, [fontFamily]);

    // Tamaño efectivo: en split con override local usa ese; si no, la prop global
    const effectiveFontSize = useMemo(() => {
        if (isSplit && splitFontSizeOverride != null) return splitFontSizeOverride;
        return fontSize;
    }, [isSplit, splitFontSizeOverride, fontSize]);

    const terminalRef = useRef(null);
    const term = useRef(null);
    const writeBufferRef = useRef(null);
    const fitAddon = useRef(null);
    const stableFitRef = useRef(null);
    const activeRef = useRef(active);

    const fitStable = () => {
        const stable = stableFitRef.current;
        if (stable) {
            return stable.fit(term.current, fitAddon.current, terminalRef.current);
        }
        try {
            if (!fitAddon.current || !term.current || !terminalRef.current) return false;
            if (terminalRef.current.offsetWidth <= 0 || terminalRef.current.offsetHeight <= 0) return false;
            fitAddon.current.fit();
            return true;
        } catch (_) {
            return false;
        }
    };
    const { push: pushColored, flushPending } = useLogColorizer(term, writeBufferRef, activeRef);
    const [xtermLib, setXtermLib] = useState(() => getCachedXtermModules());
    const effectivePreferWebgl = preferWebgl !== false;
    const rendererRef = useTerminalMemoryGuards(term, xtermLib, active, writeBufferRef, effectivePreferWebgl);

    useEffect(() => {
        activeRef.current = active;
        if (active) flushPending();
    }, [active, flushPending]);

    useEffect(() => {
      if (xtermLib && typeof xtermLib.SerializeAddon === 'function') return undefined;
      let cancelled = false;
      loadXtermModules().then((lib) => {
        if (!cancelled) setXtermLib(lib);
      }).catch((err) => console.error('[Terminal] Error cargando xterm:', err));
      return () => { cancelled = true; };
    }, [xtermLib]);

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
            fitStable();
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
        },
        agentWrite: (data) => {
            if (!data) return;
            window.electron?.ipcRenderer?.send('ssh:data', { tabId, data });
        },
        getScrollback: (maxLines = 500) => {
            if (!term.current) return '';
            try {
                const buffer = term.current.buffer.active;
                const lines = [];
                const start = Math.max(0, buffer.length - maxLines);
                for (let i = start; i < buffer.length; i++) {
                    const line = buffer.getLine(i);
                    if (line) lines.push(line.translateToString(true));
                }
                return lines.join('\n');
            } catch (_) {
                return '';
            }
        },
        isReady: () => !!(term.current)
    }));

    useEffect(() => {
        if (!tabId || !xtermLib) return;
        const { Terminal, FitAddon, WebLinksAddon, Unicode11Addon, WebglAddon, CanvasAddon, SerializeAddon } = xtermLib;

        // Cancelar timer de desconexi??n pendiente si existe
        // Esto evita desconectar la sesi??n SSH cuando el componente se remonta r??pidamente
        if (window.__sshDisconnectTimers && window.__sshDisconnectTimers[tabId]) {
            clearTimeout(window.__sshDisconnectTimers[tabId]);
            delete window.__sshDisconnectTimers[tabId];
        }

        // Importante: NO quitar hibernación aquí. Si se hace antes de registrar
        // ssh:data:*, el stdout se pierde (ni ring ni listener) y el terminal queda en blanco.

        // Symbols Nerd Font (iconos eza/ll) vive en fonts.css diferido
        ensureTerminalFontsLoaded();

        // Detectar si es terminal local (inicio) de forma robusta
        let defaultFont = resolveTerminalFontFamily(effectiveFontFamily || fontFamily || 'monospace');
        let defaultFontSize = fontSize;
        if (isLocalTerminal) {
            defaultFont = getDefaultLocalTerminalFontFamily();
            defaultFontSize = parseInt(localStorage.getItem('basicapp_local_terminal_font_size') || '14', 10);
        }

        const scrollbackLines = getTerminalScrollback();

        // Initialize Terminal
        term.current = new Terminal({
            cursorBlink: true,
            fontFamily: defaultFont,
            fontSize: defaultFontSize,
            allowProposedApi: true,
            theme: isIntegrated
                ? { ...theme, background: 'rgba(0,0,0,0)' }
                : theme,
            // PTY SSH ya manda CRLF; convertEol fuerza columna 0 y destroza TUI/CLIs
            convertEol: false,
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
            // 1.0 evita celdas fraccionarias con HiDPI/scaling en Linux (FreeType)
            lineHeight: 1.0,
        });

        // Inicializar buffer de escrituras por fotograma (60 FPS write batching)
        writeBufferRef.current = createXtermWriteBuffer(term, { active: !!activeRef.current });

        // Disable bracketed paste mode to prevent weird characters on Ctrl+V
        term.current.options.bracketedPasteMode = false;

        fitAddon.current = new FitAddon();
        const stableFit = createStableTerminalFit();
        stableFitRef.current = stableFit;
        term.current.loadAddon(fitAddon.current);
        term.current.loadAddon(new WebLinksAddon());
        attachUnicode11(term.current, Unicode11Addon);

        // SerializeAddon: snapshot con ANSI/SGR (imprescindible para htop al hibernar pestañas)
        let serializeAddon = null;
        if (typeof SerializeAddon === 'function') {
            try {
                serializeAddon = new SerializeAddon();
                term.current.loadAddon(serializeAddon);
            } catch (_) {
                serializeAddon = null;
            }
        }

        // Load image addon - Comentado temporalmente por errores de require
        // term.current.loadAddon(new ImageAddon({ sixelScrolling: true }));

        // Abrir el DOM primero; el renderer GPU después (evita canvas en blanco al remount)
        term.current.open(terminalRef.current);
        fitStable();

        // preferWebgl=false en splits densos: Canvas (sigue pintando) sin WebGL extra
        if (activeRef.current && preferWebgl === false) {
            rendererRef.current = attachTerminalRenderer(term.current, { WebglAddon, CanvasAddon }, { preferWebgl: false });
        } else {
            rendererRef.current = attachVisibleTerminalRenderer(term.current, { WebglAddon, CanvasAddon }, !!activeRef.current);
        }

        if (activeRef.current) {
            try {
                term.current.focus();
            } catch (_) { /* noop */ }
        }

        // Restaurar el buffer preservado si existe (cuando el componente se remonta)
        let restoredTuiSnapshot = false;
        if (window.__terminalBuffers && window.__terminalBuffers[tabId]) {
            try {
                const savedBuffer = window.__terminalBuffers[tabId];
                const timeSinceSaved = Date.now() - savedBuffer.timestamp;
                const allowLongRestore = !!savedBuffer.hibernated || preserveSessionRef.current;

                // Hibernación: restaurar siempre; splits: solo si < 3s
                if (allowLongRestore || timeSinceSaved < 3000) {
                    if (savedBuffer.serialized) {
                        // Snapshot ANSI real (SerializeAddon) — conserva reverse-video / layout htop
                        if (savedBuffer.cols > 0 && savedBuffer.rows > 0) {
                            try {
                                term.current.resize(savedBuffer.cols, savedBuffer.rows);
                            } catch (_) { /* noop */ }
                        }
                        term.current.write(savedBuffer.serialized);
                        restoredTuiSnapshot = !!savedBuffer.wasTui;
                    } else if (Array.isArray(savedBuffer.lines) && savedBuffer.lines.length > 0) {
                        // Fallback legacy: translateToString pierde ANSI.
                        // No volcar pantallas TUI (htop) como líneas \r\n — se destroza el layout.
                        if (looksLikeTuiSnapshot(savedBuffer.lines) || savedBuffer.wasTui) {
                            restoredTuiSnapshot = true;
                        } else {
                            savedBuffer.lines.forEach((line, index) => {
                                const out = looksLikeRestorableLogLine(line)
                                  ? colorizeLogLine(line)
                                  : line;
                                term.current.write(out);
                                if (index < savedBuffer.lines.length - 1) {
                                    term.current.write('\r\n');
                                }
                            });
                        }
                    }
                }

                delete window.__terminalBuffers[tabId];
            } catch (error) {
                if (window.__terminalBuffers) {
                    delete window.__terminalBuffers[tabId];
                }
            }
        }

        // Refresco de pintura tras restaurar (WebGL a veces queda vacío tras remount)
        try {
            term.current.refresh(0, Math.max(0, term.current.rows - 1));
        } catch (_) { /* noop */ }

        term.current.focus();

        // ResizeObserver con throttling (30ms); fit estable ignora eco del propio canvas
        let resizeTimeout = null;
        const resizeObserver = new ResizeObserver(() => {
            if (!fitAddon.current || !term.current) return;
            if (stableFit.isFitting()) return;
            if (resizeTimeout) return;
            resizeTimeout = setTimeout(() => {
                requestAnimationFrame(() => {
                    if (!stableFit.isFitting()) {
                        fitStable();
                    }
                    resizeTimeout = null;
                });
            }, 30);
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
                    // Copy UI nunca consulta el lock MCP
                    const selection = term.current.getSelection();
                    if (selection) {
                        clipboardWriteText(selection).catch(() => {});
                        domEvent.preventDefault();
                    }
                } else if (modifierKey && domEvent.key === 'v') {
                    domEvent.preventDefault();
                    // Solo bloquear envio al PTY si el agente tiene el terminal locked
                    if (shouldBlockHumanInput(tabId)) return;
                    clipboardReadText().then(text => {
                        if (text) {
                            term.current.focus();
                            setTimeout(() => {
                                if (sshConfig && sshConfig.host) {
                                    window.electron.ipcRenderer.send('ssh:data', { tabId, data: text });
                                } else {
                                    term.current.write(text);
                                }
                                setTimeout(() => {
                                    term.current.focus();
                                    term.current.element?.dispatchEvent(new Event('focus', { bubbles: true }));
                                }, 5);
                            }, 10);
                        }
                    }).catch(() => {});
                }
            });

            // Handle right-click context menu
            const contextMenuHandler = (e) => {
                if (onContextMenu) {
                    onContextMenu(e, tabId);
                } else {
                    e.preventDefault();
                    if (shouldBlockHumanInput(tabId)) return;
                    clipboardReadText().then(text => {
                        if (text) {
                            if (sshConfig && sshConfig.host) {
                                window.electron.ipcRenderer.send('ssh:data', { tabId, data: text });
                            } else {
                                term.current.write(text);
                            }
                        }
                    }).catch(() => {});
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

            // Tras remount de htop/TUI: bypass colorizer hasta alt-screen leave
            let tuiPassthrough = restoredTuiSnapshot;

            // Listen for incoming data (60 FPS write batching)
            const dataListener = (data) => {
                if (tuiPassthrough) {
                    if (typeof data === 'string' && /\x1b\[\?(?:1049|1048|1047|47)l/.test(data)) {
                        tuiPassthrough = false;
                    }
                    if (writeBufferRef.current) writeBufferRef.current.write(data);
                    else term.current?.write(data);
                    return;
                }
                pushColored(data);
            };
            const onDataUnsubscribe = window.electron.ipcRenderer.on(`ssh:data:${tabId}`, dataListener);

            // Despertar hibernación SOLO tras tener listener: drenar ring (con colorizer) y pintar
            const wakeFromHibernation = async () => {
                try {
                    const drained = await window.electron.ipcRenderer.invoke('terminal:drain-stdout-ring', tabId);
                    if (drained) {
                        // Si volvemos a un TUI (htop), no pasar el ring por el colorizer de logs
                        if (restoredTuiSnapshot) {
                            writeBufferRef.current?.write(drained);
                            writeBufferRef.current?.flushSync();
                        } else {
                            pushColored(drained);
                            flushPending();
                            writeBufferRef.current?.flushSync();
                        }
                    } else {
                        window.electron.ipcRenderer.send('terminal:set-hibernated', {
                            tabId,
                            hibernated: false
                        });
                    }
                    try {
                        fitStable();
                        term.current?.refresh(0, Math.max(0, (term.current?.rows || 1) - 1));
                        // SIGWINCH → htop/vim redibujan; crítico si el snapshot era TUI o solo había ring
                        window.electron.ipcRenderer.send('ssh:resize', {
                            tabId,
                            cols: term.current.cols,
                            rows: term.current.rows
                        });
                    } catch (_) { /* noop */ }
                } catch (_) {
                    try {
                        window.electron.ipcRenderer.send('terminal:set-hibernated', {
                            tabId,
                            hibernated: false
                        });
                    } catch (__) { /* noop */ }
                }
            };
            wakeFromHibernation();

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

            // Handle user input (estilo clientes modernos: IPC inmediato, broadcast diferido)
            const dataHandler = term.current.onData(data => {
                if (shouldBlockHumanInput(tabId)) {
                    return;
                }
                const { isBroadcastActive: currentBroadcast, onBroadcastData: currentBroadcastFn } = broadcastPropsRef.current;

                // Local echo SSH: solo caracteres imprimibles de 1 byte
                const isSSH = sshConfig && (sshConfig.host || sshConfig.bastionHost);
                if (isSSH && sshLocalEchoRef.current) {
                    const code = data.charCodeAt(0);
                    const isPrintable =
                        data.length === 1 &&
                        code >= 0x20 &&
                        code !== 0x7f &&
                        code < 0x80;
                    if (isPrintable) {
                        term.current?.write(data);
                    }
                }

                sendSshUserInput(
                    (payload) => window.electron.ipcRenderer.send('ssh:data', payload),
                    tabId,
                    data
                );

                if (currentBroadcast && currentBroadcastFn) {
                    deferNonCritical(() => currentBroadcastFn(tabId, data));
                }
            });

            // Handle resize with 80ms debounce to prevent flooding the backend PTY process
            let resizeIpcTimeout = null;
            const resizeHandler = term.current.onResize(({ cols, rows }) => {
                if (resizeIpcTimeout) clearTimeout(resizeIpcTimeout);
                resizeIpcTimeout = setTimeout(() => {
                    window.electron.ipcRenderer.send('ssh:resize', { tabId, cols, rows });
                }, 80);
            });

            // Cleanup on component unmount
            return () => {
                flushPending();
                writeBufferRef.current?.flushSync();
                resizeObserver.disconnect();
                cleanupContextMenu();
                if (resizeTimeout) clearTimeout(resizeTimeout);
                if (resizeIpcTimeout) clearTimeout(resizeIpcTimeout);

                // Marcar hibernación ANTES de dispose para no perder stdout del gap
                if (preserveSessionRef.current) {
                    try {
                        window.electron.ipcRenderer.send('terminal:set-hibernated', { tabId, hibernated: true });
                    } catch (_) { /* noop */ }
                }

                // Preservar el buffer del terminal antes de desmontarlo
                if (term.current) {
                    try {
                        const buffer = term.current.buffer.active;
                        let serialized = '';
                        try {
                            if (serializeAddon) {
                                serialized = serializeAddon.serialize() || '';
                            }
                        } catch (_) {
                            serialized = '';
                        }

                        const lines = [];
                        // Solo volcar líneas planas si no hay snapshot ANSI (legacy / fallback)
                        if (!serialized) {
                            const linesToSave = 1500;
                            const startLine = Math.max(0, buffer.length - linesToSave);
                            const endLine = buffer.length;

                            for (let i = startLine; i < endLine; i++) {
                                const line = buffer.getLine(i);
                                if (line) {
                                    lines.push(line.translateToString(true));
                                }
                            }

                            while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
                                lines.pop();
                            }
                        }

                        const wasTui = !!(
                            serialized
                              ? (/\x1b\[\?(?:1049|1048|1047|47)h/.test(serialized) ||
                                 looksLikeTuiChrome(serialized) ||
                                 /\x1b\[(?:\d+;)*7(?:;\d+)*m/.test(serialized) ||
                                 /F1Help|F10Quit|\bPID\s+USER\s+(?:PRI|NI|VIRT)\b/.test(serialized))
                              : looksLikeTuiSnapshot(lines)
                        );

                        if (!window.__terminalBuffers) window.__terminalBuffers = {};
                        window.__terminalBuffers[tabId] = {
                            serialized: serialized || undefined,
                            lines,
                            cols: term.current.cols,
                            rows: term.current.rows,
                            cursorX: buffer.cursorX,
                            cursorY: buffer.cursorY,
                            viewportY: buffer.viewportY,
                            baseY: buffer.baseY,
                            timestamp: Date.now(),
                            hibernated: !!preserveSessionRef.current,
                            wasTui
                        };
                    } catch (error) {
                        // Silenciar error
                    }
                }

                // Hibernación / preserveSession: no desconectar
                if (preserveSessionRef.current) {
                    // ya marcado hibernated arriba
                } else {
                    // Delay para desconectar SSH en unmount temporal (splits legacy)
                    const disconnectTimer = setTimeout(() => {
                        window.electron.ipcRenderer.send('ssh:disconnect', tabId);
                        if (window.__sshDisconnectTimers) {
                            delete window.__sshDisconnectTimers[tabId];
                        }
                        if (window.__terminalBuffers) {
                            delete window.__terminalBuffers[tabId];
                        }
                    }, 2000);

                    if (!window.__sshDisconnectTimers) window.__sshDisconnectTimers = {};
                    window.__sshDisconnectTimers[tabId] = disconnectTimer;
                }

                if (onDataUnsubscribe) onDataUnsubscribe();
                if (onErrorUnsubscribe) onErrorUnsubscribe();
                if (onReadyUnsubscribe) onReadyUnsubscribe();
                dataHandler.dispose();
                resizeHandler.dispose();
                stableFit.reset();
                if (stableFitRef.current === stableFit) {
                    stableFitRef.current = null;
                }
                if (term.current) {
                    term.current?.dispose();
                }
            };
        } else {
            term.current.writeln('\x1b[31mError: Electron API no disponible. El portapapeles y la comunicaci??n no funcionar??n.\x1b[0m');
            // Cleanup only the terminal if API is not ready
            return () => {
                resizeObserver.disconnect();
                stableFit.reset();
                if (stableFitRef.current === stableFit) {
                    stableFitRef.current = null;
                }
                if (term.current) {
                    term.current?.dispose();
                }
            };
        }
    }, [tabId, sshConfig, xtermLib]);

    // Effect to update font family dynamically
    useEffect(() => {
        if (term.current && effectiveFontFamily) {
            term.current.options.fontFamily = resolveTerminalFontFamily(effectiveFontFamily);

            // CR??TICO: Re-aplicar opciones de nitidez al cambiar de fuente
            // xterm.js a veces resetea o recalcula el renderizado internamente
            term.current.options.fontWeight = '400';
            term.current.options.fontWeightBold = 'bold';
            term.current.options.minimumContrastRatio = 1;
            term.current.options.letterSpacing = 0;
            term.current.options.lineHeight = 1.0;

            // We might need to call fit again to readjust character sizes
            stableFitRef.current?.reset();
            fitStable();
        }
    }, [effectiveFontFamily]);

    // Effect to update font size dynamically
    useEffect(() => {
        if (term.current && effectiveFontSize) {
            term.current.options.fontSize = effectiveFontSize;

            // CR??TICO: Re-aplicar opciones de nitidez al cambiar el tama??o
            term.current.options.fontWeight = '400';
            term.current.options.fontWeightBold = 'bold';
            term.current.options.minimumContrastRatio = 1;
            term.current.options.lineHeight = 1.1;

            // We might need to call fit again to readjust character sizes
            stableFitRef.current?.reset();
            fitStable();
        }
    }, [effectiveFontSize]);

    // Effect to update theme dynamically (effectiveTheme = en split puede ser override local)
    useEffect(() => {
        if (term.current && effectiveTheme) {
            term.current.options.theme = isIntegrated
                ? { ...effectiveTheme, background: 'rgba(0,0,0,0)' }
                : effectiveTheme;
        }
    }, [effectiveTheme, isIntegrated]);

    // Al activar pestaña: re-fit + re-attach GPU + refresh (evita canvas en blanco)
    useEffect(() => {
        if (!active || !xtermLib || !term.current) return;

        const repaint = () => {
            if (!term.current) return;
            try {
                if (writeBufferRef.current?.setActive) {
                    writeBufferRef.current.setActive(true);
                }
                if (xtermLib) {
                    rendererRef.current = syncTerminalRenderer(
                        term.current,
                        { WebglAddon: xtermLib.WebglAddon, CanvasAddon: xtermLib.CanvasAddon },
                        preferWebgl !== false,
                        rendererRef.current,
                        { canvasFallback: preferWebgl === false }
                    );
                }
                fitStable();
                term.current.refresh(0, Math.max(0, term.current.rows - 1));
                term.current.focus();
            } catch (_) { /* noop */ }
        };

        let raf1 = 0;
        let raf2 = 0;
        raf1 = requestAnimationFrame(() => {
            repaint();
            raf2 = requestAnimationFrame(repaint);
        });
        const t1 = setTimeout(repaint, 50);
        const t2 = setTimeout(repaint, 160);

        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [active, preferWebgl, xtermLib]);

    // Forzar fit tras el primer render (por si el layout cambia despu??s del render)
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                fitStable();
                term.current?.refresh(0, Math.max(0, (term.current?.rows || 1) - 1));
            } catch (e) { /* noop */ }
        }, 100);
        return () => clearTimeout(timer);
    }, []); // Solo al montar

    if (!xtermLib) {
        return (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    background: isIntegrated ? 'transparent' : (theme?.background || '#1e1e1e'),
                }}
                aria-hidden="true"
            />
        );
    }

    return (
        <div
            className="terminal-component-wrapper"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                backgroundColor: isIntegrated ? 'transparent' : (effectiveTheme?.background || '#1e1e1e'),
                '--terminal-bg': effectiveTheme?.background || '#1e1e1e',
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
                    backgroundColor: isIntegrated ? 'transparent' : (effectiveTheme?.background || 'var(--terminal-bg)'),
                    '--terminal-bg': effectiveTheme?.background || 'transparent',
                    '--terminal-fg': effectiveTheme?.foreground || 'inherit',
                    '--terminal-scrollbar-thumb': effectiveTheme?.brightBlack || effectiveTheme?.selectionBackground || '#555555',
                    '--terminal-scrollbar-hover': effectiveTheme?.white || effectiveTheme?.foreground || '#cccccc'
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
                        background: isIntegrated ? 'transparent' : (effectiveTheme?.background || 'var(--terminal-bg)'),
                        backgroundColor: isIntegrated ? 'transparent' : (effectiveTheme?.background || 'var(--terminal-bg)')
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
                        transform: 'translateZ(0)',
                        transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
                        pointerEvents: 'auto',
                        userSelect: 'none'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'translateY(1px) translateZ(0)';
                            e.currentTarget.style.boxShadow = '0 6px 20px var(--ui-dialog-shadow, rgba(0, 0, 0, 0.5))';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.2';
                            e.currentTarget.style.transform = 'translateY(0) translateZ(0)';
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

                        {/* Broadcast Button - Solo en Split; va primero antes del tema */}
                        {isSplit && (() => {
                            const isExcluded = broadcastExcludedTargets && broadcastExcludedTargets.includes(tabId);
                            const isActiveForThisTerminal = isBroadcastActive && !isExcluded;
                            return (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleBroadcastTarget && onToggleBroadcastTarget(tabId);
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

                        {/* Apariencia SSH unificada (tema + tipografía); en split solo aplica a este panel */}
                        {(() => {
                            const SSH_THEME_KEY = 'basicapp_terminal_theme';
                            const SSH_FONT_KEY = 'basicapp_font_family';
                            const SSH_FONT_KEY_ALIAS = 'basicapp_terminal_font_family';
                            const SSH_SIZE_KEY = 'basicapp_font_size';
                            const SSH_SIZE_KEY_ALIAS = 'basicapp_terminal_font_size';
                            const FONT_SIZE_MIN = 10;
                            const FONT_SIZE_MAX = 24;

                            const currentThemeName = isSplit
                                ? (splitThemeOverride || (typeof localStorage !== 'undefined' ? localStorage.getItem(SSH_THEME_KEY) : null) || 'Default Dark')
                                : (typeof localStorage !== 'undefined' ? (localStorage.getItem(SSH_THEME_KEY) || 'Default Dark') : 'Default Dark');
                            const currentFontValue = effectiveFontFamily
                                || (typeof localStorage !== 'undefined' ? localStorage.getItem(SSH_FONT_KEY) : '')
                                || '';
                            const currentSize = Number(effectiveFontSize) || 14;
                            const themeNames = themes ? Object.keys(themes) : [];
                            const previewTheme = (themes && themes[currentThemeName]?.theme) || effectiveTheme || {};
                            const previewBg = previewTheme.background || '#1e1e1e';
                            const previewFg = previewTheme.foreground || '#d4d4d4';

                            const chipStyle = (active) => ({
                                flex: 1,
                                border: 'none',
                                borderRadius: '5px',
                                padding: '5px 8px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: active ? 600 : 400,
                                background: active ? 'rgba(79, 195, 247, 0.2)' : 'transparent',
                                color: active ? '#4fc3f7' : 'var(--ui-dialog-text, rgba(255,255,255,0.75))',
                                transition: 'all 0.15s'
                            });

                            const applyTheme = (themeName) => {
                                try {
                                    if (isSplit) {
                                        setSplitThemeOverride(themeName);
                                    } else {
                                        localStorage.setItem(SSH_THEME_KEY, themeName);
                                        window.dispatchEvent(new CustomEvent('terminal-theme-changed', {
                                            detail: { theme: themeName, terminalType: 'ssh' }
                                        }));
                                    }
                                } catch (err) { /* noop */ }
                            };

                            const applyFont = (fontValue) => {
                                try {
                                    setSplitFontOverride(fontValue);
                                    if (!isSplit) {
                                        localStorage.setItem(SSH_FONT_KEY, fontValue);
                                        localStorage.setItem(SSH_FONT_KEY_ALIAS, fontValue);
                                        window.dispatchEvent(new CustomEvent('terminal-font-changed', {
                                            detail: { fontFamily: fontValue, terminalType: 'ssh' }
                                        }));
                                    }
                                } catch (err) { /* noop */ }
                            };

                            const applyFontSize = (nextSize) => {
                                const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, nextSize));
                                try {
                                    if (isSplit) {
                                        setSplitFontSizeOverride(clamped);
                                    } else {
                                        localStorage.setItem(SSH_SIZE_KEY, String(clamped));
                                        localStorage.setItem(SSH_SIZE_KEY_ALIAS, String(clamped));
                                        window.dispatchEvent(new CustomEvent('terminal-font-changed', {
                                            detail: { fontSize: clamped, terminalType: 'ssh' }
                                        }));
                                    }
                                } catch (err) { /* noop */ }
                            };

                            return (
                                <div ref={appearanceMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAppearanceMenuOpen((v) => !v);
                                        }}
                                        title="Apariencia de la terminal SSH"
                                        className="quick-action-btn"
                                        style={{
                                            background: appearanceMenuOpen ? 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))' : 'transparent',
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
                                            if (!appearanceMenuOpen) e.currentTarget.style.background = 'var(--ui-sidebar-hover, rgba(255, 255, 255, 0.1))';
                                            e.currentTarget.style.color = 'var(--primary-color, #fff)';
                                        }}
                                        onMouseOut={(e) => {
                                            if (!appearanceMenuOpen) e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--ui-dialog-text, rgba(255, 255, 255, 0.8))';
                                        }}
                                    >
                                        <i className="pi pi-palette" />
                                    </button>
                                    {appearanceMenuOpen && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                marginTop: '4px',
                                                width: '260px',
                                                background: 'var(--ui-dialog-bg, rgba(20, 20, 22, 0.98))',
                                                border: '1px solid var(--ui-dialog-border, rgba(255, 255, 255, 0.15))',
                                                borderRadius: '8px',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                                padding: '8px',
                                                zIndex: 9999,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '4px',
                                                    padding: '3px',
                                                    borderRadius: '6px',
                                                    background: 'rgba(255,255,255,0.04)'
                                                }}
                                            >
                                                <button type="button" style={chipStyle(appearanceTab === 'theme')} onClick={() => setAppearanceTab('theme')}>
                                                    Tema
                                                </button>
                                                <button type="button" style={chipStyle(appearanceTab === 'font')} onClick={() => setAppearanceTab('font')}>
                                                    Tipografía
                                                </button>
                                            </div>

                                            <div
                                                style={{
                                                    borderRadius: '6px',
                                                    padding: '10px 12px',
                                                    background: previewBg,
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    color: previewFg,
                                                    fontFamily: resolveTerminalFontFamily(currentFontValue || 'monospace'),
                                                    fontSize: `${currentSize}px`,
                                                    lineHeight: 1.3,
                                                    overflow: 'hidden',
                                                    whiteSpace: 'nowrap',
                                                    textOverflow: 'ellipsis'
                                                }}
                                            >
                                                Aa Bb 123
                                            </div>

                                            {appearanceTab === 'theme' && (
                                                <div style={{ maxHeight: '220px', overflowY: 'auto', margin: '0 -4px' }}>
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

                                            {appearanceTab === 'font' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: '8px',
                                                            padding: '4px 2px'
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '11px', color: 'var(--ui-dialog-text)', opacity: 0.8 }}>Tamaño</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyFontSize(currentSize - 1)}
                                                                disabled={currentSize <= FONT_SIZE_MIN}
                                                                style={{
                                                                    width: '22px',
                                                                    height: '22px',
                                                                    border: '1px solid rgba(255,255,255,0.15)',
                                                                    borderRadius: '4px',
                                                                    background: 'rgba(255,255,255,0.06)',
                                                                    color: 'var(--ui-dialog-text)',
                                                                    cursor: currentSize <= FONT_SIZE_MIN ? 'default' : 'pointer',
                                                                    opacity: currentSize <= FONT_SIZE_MIN ? 0.4 : 1,
                                                                    fontSize: '14px',
                                                                    lineHeight: 1,
                                                                    padding: 0
                                                                }}
                                                            >
                                                                −
                                                            </button>
                                                            <span style={{ fontSize: '12px', minWidth: '36px', textAlign: 'center', color: 'var(--ui-dialog-text)', fontWeight: 600 }}>
                                                                {currentSize}px
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyFontSize(currentSize + 1)}
                                                                disabled={currentSize >= FONT_SIZE_MAX}
                                                                style={{
                                                                    width: '22px',
                                                                    height: '22px',
                                                                    border: '1px solid rgba(255,255,255,0.15)',
                                                                    borderRadius: '4px',
                                                                    background: 'rgba(255,255,255,0.06)',
                                                                    color: 'var(--ui-dialog-text)',
                                                                    cursor: currentSize >= FONT_SIZE_MAX ? 'default' : 'pointer',
                                                                    opacity: currentSize >= FONT_SIZE_MAX ? 0.4 : 1,
                                                                    fontSize: '14px',
                                                                    lineHeight: 1,
                                                                    padding: 0
                                                                }}
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div style={{ maxHeight: '180px', overflowY: 'auto', margin: '0 -4px' }}>
                                                        {availableFonts.map((fontOpt) => {
                                                            const isSelected = fontOpt.value === currentFontValue;
                                                            return (
                                                                <div
                                                                    key={fontOpt.value}
                                                                    onClick={() => applyFont(fontOpt.value)}
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
                                                                    <span
                                                                        style={{
                                                                            fontSize: '12px',
                                                                            color: 'var(--ui-dialog-text)',
                                                                            fontWeight: isSelected ? 600 : 400,
                                                                            flex: 1,
                                                                            fontFamily: fontOpt.value
                                                                        }}
                                                                    >
                                                                        {fontOpt.label}
                                                                    </span>
                                                                    {isSelected && <i className="pi pi-check" style={{ fontSize: '10px', color: '#4fc3f7' }} />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Status Bar visibility toggle - oculto en split (no aplica por panel) */}
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
                stats={{ ...effectiveStats, cpuHistory: sessionHistory.map(s => s.cpu), sessionHistory }}
                active={active}
                statusBarIconTheme={statusBarIconTheme}
                terminalType={isLocalTerminal ? 'linux' : 'ssh'}
                fontFamily={effectiveFontFamily}
                isLoading={!isLocalTerminal && (!effectiveStats || (typeof effectiveStats?.cpu === 'undefined' && !effectiveStats?.hostname))}
            />}
        </div >
    );
});

export default TerminalComponent; 