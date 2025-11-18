import React, { useState, useEffect, useRef } from 'react';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';

const StandaloneStatusBar = ({ visible = true }) => {
    const [statusStats, setStatusStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [cpuHistory, setCpuHistory] = useState([]);
    const cpuHistoryRef = useRef([]);
    const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
        try { return localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic'; } catch { return 'classic'; }
    });
    const [showNetworkDisks, setShowNetworkDisks] = useState(() => {
        try { return (localStorage.getItem('localShowNetworkDisks') || 'true') === 'true'; } catch { return true; }
    });
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => {
        try { return localStorage.getItem('localPowerShellStatusBarTheme') || localStorage.getItem('basicapp_statusbar_theme') || 'Default Dark'; } catch { return 'Default Dark'; }
    });

    // Build CSS variable overrides for StatusBar
    const getScopedStatusBarCssVars = () => {
        const theme = statusBarThemes[localStatusBarThemeName] || statusBarThemes['Default Dark'];
        const colors = theme.colors || {};
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

    // Poll local system stats
    useEffect(() => {
        if (!visible) return; // No hacer polling si no está visible
        
        let stopped = false;
        let timer = null;
        const pollingInterval = parseInt(localStorage.getItem('statusBarPollingInterval') || '3', 10) * 1000;

        const handleBlur = () => {
            stopped = true;
            if (timer) clearInterval(timer);
        };

        const handleFocus = () => {
            stopped = false;
            if (timer) clearInterval(timer);
            timer = setInterval(fetchStats, pollingInterval);
            fetchStats();
        };

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        const fetchStats = async () => {
            try {
                const systemStats = await window.electronAPI?.getSystemStats();
                if (!systemStats || stopped) {
                    return;
                }
                
                // Map worker stats → StatusBar expected shape
                const memTotalBytes = (systemStats.memory?.total || 0) * 1024 * 1024 * 1024;
                const memUsedBytes = (systemStats.memory?.used || 0) * 1024 * 1024 * 1024;
                const disk = Array.isArray(systemStats.disks)
                    ? systemStats.disks.map(d => ({ fs: d.name, use: d.percentage, isNetwork: d.isNetwork }))
                    : [];
                const rxBytesPerSec = ((systemStats.network?.download || 0) * 1000000) / 8; // Mb/s → B/s
                const txBytesPerSec = ((systemStats.network?.upload || 0) * 1000000) / 8;   // Mb/s → B/s
                const showNet = (() => { try { return (localStorage.getItem('localShowNetworkDisks') || 'true') === 'true'; } catch { return true; } })();
                const displayDisk = showNet ? disk : disk.filter(d => {
                    const id = String((d && (d.fs || d.name || d.mount)) || '');
                    const isUNC = id.startsWith('\\\\') || id.startsWith('//');
                    return !(d && (d.isNetwork || isUNC));
                });
                
                const cpuVal = typeof systemStats.cpu?.usage === 'number' ? systemStats.cpu.usage : null;
                if (cpuVal !== null && !isNaN(cpuVal)) {
                    cpuHistoryRef.current = [...cpuHistoryRef.current, cpuVal].slice(-20);
                    setCpuHistory([...cpuHistoryRef.current]);
                }
                
                // Usar el historial actualizado desde el ref
                const statsPayload = {
                    cpu: Math.round((systemStats.cpu?.usage || 0) * 10) / 10,
                    mem: { total: memTotalBytes, used: memUsedBytes },
                    disk: displayDisk,
                    network: { rx_speed: rxBytesPerSec, tx_speed: txBytesPerSec },
                    hostname: systemStats.hostname || undefined,
                    ip: systemStats.ip || undefined,
                    distro: 'windows',
                    cpuHistory: [...cpuHistoryRef.current]
                };
                
                setStatusStats(statsPayload);
                setIsLoadingStats(false);
            } catch (error) {
                console.error('Error fetching system stats for standalone status bar:', error);
            }
        };

        // Escuchar cambios en configuración
        const handleStorageChange = (e) => {
            if (e.key === 'basicapp_statusbar_icon_theme') {
                setStatusBarIconTheme(e.newValue || 'classic');
            } else if (e.key === 'localPowerShellStatusBarTheme' || e.key === 'basicapp_statusbar_theme') {
                setLocalStatusBarThemeName(e.newValue || 'Default Dark');
            } else if (e.key === 'localShowNetworkDisks') {
                setShowNetworkDisks((e.newValue || 'true') === 'true');
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Inicializar
        fetchStats();
        timer = setInterval(fetchStats, pollingInterval);

        return () => {
            stopped = true;
            if (timer) clearInterval(timer);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [visible]);

    if (!visible) {
        return null;
    }

    return (
        <div style={{ 
            ...getScopedStatusBarCssVars(),
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            width: '100%'
        }}>
            <StatusBar 
                stats={statusStats || {}} 
                active={true} 
                statusBarIconTheme={statusBarIconTheme} 
                showNetworkDisks={showNetworkDisks} 
                isLoading={isLoadingStats} 
            />
        </div>
    );
};

export default StandaloneStatusBar;

