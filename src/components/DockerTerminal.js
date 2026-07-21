import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { useStatusBarSessionHistory } from '../hooks/useStatusBarSessionHistory';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';
import { shouldBlockHumanInput } from '../services/terminalAgentState';

const DockerTerminal = forwardRef(({
    fontFamily = '"FiraCode Nerd Font", Consolas, monospace',
    fontSize = 14,
    theme = {},
    tabId = 'default',
    dockerInfo = {},
    hideStatusBar = false,
    isIntegrated = false
}, ref) => {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);
    const [statusStats, setStatusStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const sessionHistory = useStatusBarSessionHistory(statusStats);
    const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
        try { return localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic'; } catch { return 'classic'; }
    });
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => {
        try { return localStorage.getItem('localDockerStatusBarTheme') || 'Default Dark'; } catch { return 'Default Dark'; }
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

    // Poll system stats
    useEffect(() => {
        let stopped = false;
        let timer = null;

        const fetchStats = async () => {
            try {
                const systemStats = await window.electronAPI?.getSystemStats();
                if (!systemStats) return;

                const memTotalBytes = (systemStats.memory?.total || 0) * 1024 * 1024 * 1024;
                const memUsedBytes = (systemStats.memory?.used || 0) * 1024 * 1024 * 1024;
                const disk = Array.isArray(systemStats.disks)
                    ? systemStats.disks.map(d => ({ fs: d.name, mount: d.mount, use: d.percentage, isNetwork: d.isNetwork, usedGb: d.used, totalGb: d.total }))
                    : [];
                const rxBytesPerSec = ((systemStats.network?.download || 0) * 1000000) / 8;
                const txBytesPerSec = ((systemStats.network?.upload || 0) * 1000000) / 8;

                const memFreeBytes = (systemStats.memory?.free || 0) * 1024 * 1024 * 1024;
                const payload = {
                    cpu: Math.round((systemStats.cpu?.usage || 0) * 10) / 10,
                    mem: { total: memTotalBytes, used: memUsedBytes, free: memFreeBytes },
                    disk,
                    network: { rx_speed: rxBytesPerSec, tx_speed: txBytesPerSec },
                    networkInterfaces: Array.isArray(systemStats.networkInterfaces) ? systemStats.networkInterfaces : [],
                    hostname: systemStats.hostname || undefined,
                    ip: systemStats.ip || undefined,
                    distro: 'docker',
                    versionId: systemStats.osVersion || '',
                    kernel: systemStats.kernel || '',
                    platform: systemStats.platform || window.electron?.platform || '',
                    arch: systemStats.arch || '',
                    osPrettyName: systemStats.osPrettyName || '',
                    uptime: systemStats.uptime || '',
                    cpuMeta: {
                        cores: systemStats.cpu?.cores || 0,
                        model: systemStats.cpu?.model || '',
                        perCpuLoad: systemStats.cpu?.perCpuLoad || [],
                    },
                };
                setStatusStats(payload);
                setIsLoadingStats(false);
            } catch (error) {
                console.error('Error obteniendo estad??sticas:', error);
            }
        };

        const loop = () => {
            if (stopped) return;
            fetchStats().finally(() => {
                timer = setTimeout(loop, 3000);
            });
        };

        const initialTimer = setTimeout(loop, 500);

        return () => {
            stopped = true;
            clearTimeout(initialTimer);
            if (timer) clearTimeout(timer);
        };
    }, []);

    // Inicializar terminal
    useEffect(() => {
        if (!terminalRef.current) return;

        // Leer scrollback desde configuraci??n (configurable en Settings)
        const scrollbackLines = parseInt(localStorage.getItem('nodeterm_scrollback_lines') || '1000', 10);

        // Crear terminal
        term.current = new Terminal({
            fontFamily: fontFamily,
            fontSize: fontSize,
            theme: isIntegrated ? { ...theme, background: 'rgba(0,0,0,0)' } : theme,
            cursorBlink: true,
            scrollback: scrollbackLines, // Configurable desde Settings (default: 1000)
            convertEol: true,
            allowProposedApi: true,
            allowTransparency: isIntegrated,
        });

        // Agregar addons
        fitAddon.current = new FitAddon();
        term.current.loadAddon(fitAddon.current);
        term.current.loadAddon(new WebLinksAddon());
        term.current.loadAddon(new Unicode11Addon());

        // Intentar agregar WebGL addon para mejor rendimiento
        try {
            term.current.loadAddon(new WebglAddon());
        } catch (e) {
            console.warn('WebGL addon no disponible para Docker');
        }

        // Abrir terminal en elemento DOM
        term.current.open(terminalRef.current);

        // Hacer resize inicial
        try {
            if (terminalRef.current && terminalRef.current.offsetHeight > 0 && terminalRef.current.offsetWidth > 0) {
                fitAddon.current.fit();
            }
        } catch (e) {
            console.error('Error en fit inicial de Docker:', e);
        }

        // Definir handlers
        const handleDockerOutput = (outputData) => {
            if (term.current && outputData) {
                term.current.write(outputData);
            }
        };

        const handleDockerError = (errorMsg) => {
            if (term.current) {
                term.current.write(`\r\n\x1b[31m??? Error: ${errorMsg}\x1b[0m\r\n`);
            }
        };

        const handleDockerExit = (exitCode) => {
            if (term.current) {
                term.current.write(`\r\n\x1b[33m?????? Sesi??n terminada (c??digo: ${exitCode})\x1b[0m\r\n`);
            }
        };

        const dockerDataEvent = `docker:data:${tabId}`;
        const dockerErrorEvent = `docker:error:${tabId}`;
        const dockerExitEvent = `docker:exit:${tabId}`;

        // PASO 1: Registrar listeners PRIMERO (antes de iniciar Docker)
        console.log(`???? Registrando listeners para ${tabId}...`);
        let unsubscribeData = null;
        let unsubscribeError = null;
        let unsubscribeExit = null;
        if (window.electron) {
            unsubscribeData = window.electron.ipcRenderer.on(dockerDataEvent, handleDockerOutput);
            unsubscribeError = window.electron.ipcRenderer.on(dockerErrorEvent, handleDockerError);
            unsubscribeExit = window.electron.ipcRenderer.on(dockerExitEvent, handleDockerExit);
        }
        console.log(`??? Listeners registrados para ${tabId}`);

        // Manejar input del usuario
        term.current.onData((data) => {
            if (shouldBlockHumanInput(tabId)) return;
            if (window.electron) {
                window.electron.ipcRenderer.send(`docker:data:${tabId}`, data);
            }
        });

        // PASO 2: Ahora s??, iniciar sesi??n Docker
        if (window.electron && window.electronAPI) {
            const containerName = dockerInfo?.containerName || 'unknown';
            console.log(`???? Iniciando sesi??n Docker para ${containerName} en tab ${tabId}`);

            // Delay m??s largo para asegurar que listeners est??n COMPLETAMENTE listos en Electron
            setTimeout(() => {
                console.log(`???? Enviando docker:start:${tabId} despu??s del delay`);
                window.electron.ipcRenderer.send(`docker:start:${tabId}`, {
                    tabId: tabId,
                    containerName: containerName,
                    cols: Math.floor(term.current.cols),
                    rows: Math.floor(term.current.rows)
                });
            }, 500);
        }

        // Cleanup
        return () => {
            if (window.electron) {
                if (unsubscribeData) unsubscribeData();
                if (unsubscribeError) unsubscribeError();
                if (unsubscribeExit) unsubscribeExit();
                window.electron.ipcRenderer.send(`docker:stop:${tabId}`);
            }
            if (term.current) {
                term.current.dispose();
                term.current = null;
            }
        };
    }, [tabId, dockerInfo, fontFamily, fontSize, isIntegrated]);

    // Update theme dynamically
    useEffect(() => {
        if (term.current && theme) {
            term.current.options.theme = {
                ...term.current.options.theme,
                ...theme,
                background: isIntegrated ? 'rgba(0,0,0,0)' : (theme?.background || '#0c1a25')
            };
        }
    }, [theme, isIntegrated]);

    // Manejar resize de la ventana
    useEffect(() => {
        const handleResize = () => {
            if (fitAddon.current && term.current && terminalRef.current && terminalRef.current.offsetHeight > 0 && terminalRef.current.offsetWidth > 0) {
                try {
                    fitAddon.current.fit();
                    const { cols, rows } = term.current;
                    if (window.electron) {
                        window.electron.ipcRenderer.send('docker:resize', { tabId, cols, rows });
                    }
                } catch (e) {
                    console.error('Error en resize de Docker:', e);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);
        return () => window.removeEventListener('resize', handleResize);
    }, [tabId]);

    // Listen for changes to icon theme and local docker status bar theme via storage updates
    useEffect(() => {
        const onStorage = (e) => {
            if (!e) return;
            if (e.key === 'basicapp_statusbar_icon_theme') {
                setStatusBarIconTheme(e.newValue || 'classic');
            } else if (e.key === 'localDockerStatusBarTheme') {
                setLocalStatusBarThemeName(e.newValue || 'Default Dark');
            }
        };
        window.addEventListener('storage', onStorage);

        // También escuchar el evento customizado
        const onThemeChanged = (e) => {
            if (e.detail && e.detail.terminalType === 'docker') {
                setLocalStatusBarThemeName(e.detail.theme);
            }
        };
        window.addEventListener('statusbar-theme-changed', onThemeChanged);

        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('statusbar-theme-changed', onThemeChanged);
        };
    }, []);

    // Exponer m??todos
    useImperativeHandle(ref, () => ({
        fit: () => {
            try {
                if (terminalRef.current && terminalRef.current.offsetHeight > 0 && terminalRef.current.offsetWidth > 0) {
                    fitAddon.current?.fit();
                }
            } catch (e) {
                console.error('Error en fit:', e);
            }
        },
        focus: () => {
            term.current?.focus();
        },
        write: (data) => {
            term.current?.write(data);
        },
        clear: () => {
            term.current?.clear();
        }
    }), []);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                backgroundColor: isIntegrated ? 'transparent' : (theme?.background || '#0c1a25'),
                overflow: 'hidden',
                ...getScopedStatusBarCssVars()
            }}
        >
            {/* Terminal */}
            <div
                className="terminal-outer-padding"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    width: '100%',
                    minWidth: 0,
                    minHeight: 0,
                    overflow: 'hidden',
                    position: 'relative',
                    margin: 0,
                    padding: '10px',
                    marginBottom: (isIntegrated || hideStatusBar) ? 0 : '-1px', // Solapamiento de 1px para ocultar huecos de renderizado, solo si hay StatusBar
                    zIndex: isIntegrated ? 0 : 1,
                    background: isIntegrated ? 'transparent' : (theme?.background || '#0c1a25'),
                    backgroundColor: isIntegrated ? 'transparent' : (theme?.background || '#0c1a25'),
                    '--terminal-bg': isIntegrated ? 'transparent' : (theme?.background || '#0c1a25')
                }}
            >
                <div
                    ref={terminalRef}
                    style={{
                        padding: 0,
                        width: '100%',
                        height: '100%',
                        minWidth: 0,
                        minHeight: 0,
                        overflow: 'hidden',
                        position: 'relative',
                        background: isIntegrated ? 'transparent' : (theme?.background || '#0c1a25')
                    }}
                />
            </div>

            {/* Status Bar */}
            {!hideStatusBar && (
                <StatusBar
                    stats={{ ...(statusStats || {}), cpuHistory: sessionHistory.map(s => s.cpu), sessionHistory }}
                    isLoading={isLoadingStats}
                    active={true}
                    statusBarIconTheme={statusBarIconTheme}
                    terminalType="docker"
                />
            )}
        </div>
    );
});

DockerTerminal.displayName = 'DockerTerminal';

export default DockerTerminal;


