import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';

const DockerTerminal = forwardRef(({ 
    fontFamily = '"FiraCode Nerd Font", Consolas, monospace', 
    fontSize = 14, 
    theme = {},
    tabId = 'default',
    dockerInfo = {},
    hideStatusBar = false
}, ref) => {
    const terminalRef = useRef(null);
    const term = useRef(null);
    const fitAddon = useRef(null);
    const [statusStats, setStatusStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [cpuHistory, setCpuHistory] = useState([]);
    const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
        try { return localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic'; } catch { return 'classic'; }
    });
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => {
        try { return localStorage.getItem('localDockerStatusBarTheme') || 'Default Dark'; } catch { return 'Default Dark'; }
    });
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
                    distro: 'docker',
                    cpuHistory
                };
                setStatusStats(payload);
                setIsLoadingStats(false);
                
                const cpuVal = typeof payload.cpu === 'number' ? payload.cpu : null;
                if (cpuVal !== null && !isNaN(cpuVal)) {
                    setCpuHistory(prev => [...prev, cpuVal].slice(-30));
                }
            } catch (error) {
                console.error('Error obteniendo estadísticas:', error);
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
    }, [cpuHistory]);

    // Inicializar terminal
    useEffect(() => {
        if (!terminalRef.current) return;

        // Crear terminal
        term.current = new Terminal({
            fontFamily: fontFamily,
            fontSize: fontSize,
            theme: theme,
            cursorBlink: true,
            scrollback: 1000,
            convertEol: true,
            allowProposedApi: true,
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
            fitAddon.current.fit();
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
                term.current.write(`\r\n\x1b[31m❌ Error: ${errorMsg}\x1b[0m\r\n`);
            }
        };

        const handleDockerExit = (exitCode) => {
            if (term.current) {
                term.current.write(`\r\n\x1b[33m⏹️ Sesión terminada (código: ${exitCode})\x1b[0m\r\n`);
            }
        };

        const dockerDataEvent = `docker:data:${tabId}`;
        const dockerErrorEvent = `docker:error:${tabId}`;
        const dockerExitEvent = `docker:exit:${tabId}`;

        // PASO 1: Registrar listeners PRIMERO (antes de iniciar Docker)
        console.log(`🐳 Registrando listeners para ${tabId}...`);
        if (window.electron) {
            window.electron.ipcRenderer.on(dockerDataEvent, handleDockerOutput);
            window.electron.ipcRenderer.on(dockerErrorEvent, handleDockerError);
            window.electron.ipcRenderer.on(dockerExitEvent, handleDockerExit);
        }
        console.log(`✅ Listeners registrados para ${tabId}`);

        // Manejar input del usuario
        term.current.onData((data) => {
            if (window.electron) {
                window.electron.ipcRenderer.send(`docker:data:${tabId}`, data);
            }
        });

        // PASO 2: Ahora sí, iniciar sesión Docker
        if (window.electron && window.electronAPI) {
            const containerName = dockerInfo?.containerName || 'unknown';
            console.log(`🐳 Iniciando sesión Docker para ${containerName} en tab ${tabId}`);

            // Delay más largo para asegurar que listeners están COMPLETAMENTE listos en Electron
            setTimeout(() => {
                console.log(`🐳 Enviando docker:start:${tabId} después del delay`);
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
                window.electron.ipcRenderer.off(dockerDataEvent, handleDockerOutput);
                window.electron.ipcRenderer.off(dockerErrorEvent, handleDockerError);
                window.electron.ipcRenderer.off(dockerExitEvent, handleDockerExit);
                window.electron.ipcRenderer.send(`docker:stop:${tabId}`);
            }
            if (term.current) {
                term.current.dispose();
                term.current = null;
            }
        };
    }, [tabId, dockerInfo, fontFamily, fontSize, theme]);

    // Manejar resize de la ventana
    useEffect(() => {
        const handleResize = () => {
            if (fitAddon.current && term.current && terminalRef.current) {
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

    // Exponer métodos
    useImperativeHandle(ref, () => ({
        fit: () => {
            try {
                fitAddon.current?.fit();
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
                backgroundColor: theme.background || '#000000',
                overflow: 'hidden'
            }}
        >
            {/* Terminal */}
            <div
                ref={terminalRef}
                style={{
                    flex: 1,
                    overflow: 'hidden',
                    width: '100%'
                }}
            />
            
            {/* Status Bar */}
            {!hideStatusBar && (
                <div style={getScopedStatusBarCssVars()}>
                    <StatusBar
                        stats={statusStats}
                        isLoading={isLoadingStats}
                        themeName={localStatusBarThemeName}
                        iconTheme={statusBarIconTheme}
                        showNetworkDisks={showNetworkDisks}
                    />
                </div>
            )}
        </div>
    );
});

DockerTerminal.displayName = 'DockerTerminal';

export default DockerTerminal;


