import React, { useState, useEffect } from 'react';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';
import { useStatusBarSessionHistory } from '../hooks/useStatusBarSessionHistory';

const StandaloneStatusBar = ({ visible = true, style = {} }) => {
    const [statusStats, setStatusStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [gpuStats, setGpuStats] = useState(null);
    const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
        try { return localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic'; } catch { return 'classic'; }
    });
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => {
        try { return localStorage.getItem('localLinuxStatusBarTheme') || localStorage.getItem('basicapp_statusbar_theme') || 'Default Dark'; } catch { return 'Default Dark'; }
    });
    const [pollingInterval, setPollingInterval] = useState(() => {
        try { return parseInt(localStorage.getItem('statusBarPollingInterval') || '3', 10) * 1000; } catch { return 3000; }
    });

    const sessionHistory = useStatusBarSessionHistory(statusStats, { gpuStats });

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

    useEffect(() => {
        if (!visible) return;

        let stopped = false;
        let timer = null;

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
                if (!systemStats || stopped) return;

                const memTotalBytes = (systemStats.memory?.total || 0) * 1024 * 1024 * 1024;
                const memUsedBytes = (systemStats.memory?.used || 0) * 1024 * 1024 * 1024;
                const memFreeBytes = (systemStats.memory?.free || 0) * 1024 * 1024 * 1024;
                const disk = Array.isArray(systemStats.disks)
                    ? systemStats.disks.map(d => ({ fs: d.name, mount: d.mount, use: d.percentage, isNetwork: d.isNetwork, usedGb: d.used, totalGb: d.total }))
                    : [];
                const rxBytesPerSec = ((systemStats.network?.download || 0) * 1000000) / 8;
                const txBytesPerSec = ((systemStats.network?.upload || 0) * 1000000) / 8;
                try {
                    const gpuData = await window.electron.system?.getGPUStats();
                    setGpuStats(gpuData && gpuData.ok ? gpuData : null);
                } catch {
                    setGpuStats(null);
                }

                let distroVal = systemStats.platform === 'win32' ? 'windows' : (systemStats.platform === 'darwin' ? 'macos' : 'linux');
                if (systemStats.platform === 'linux' && systemStats.osPrettyName) {
                    const pretty = systemStats.osPrettyName.toLowerCase();
                    const distros = ['ubuntu', 'debian', 'fedora', 'centos', 'arch', 'opensuse', 'redhat', 'rhel', 'alpine', 'kali', 'gentoo', 'linuxmint', 'pop'];
                    const found = distros.find(d => pretty.includes(d));
                    if (found) {
                        distroVal = found === 'rhel' ? 'redhat' : found;
                    }
                }

                const statsPayload = {
                    cpu: Math.round((systemStats.cpu?.usage || 0) * 10) / 10,
                    mem: { total: memTotalBytes, used: memUsedBytes, free: memFreeBytes },
                    disk,
                    network: { rx_speed: rxBytesPerSec, tx_speed: txBytesPerSec },
                    networkInterfaces: Array.isArray(systemStats.networkInterfaces) ? systemStats.networkInterfaces : [],
                    hostname: systemStats.hostname,
                    ip: systemStats.ip || undefined,
                    distro: distroVal,
                    versionId: systemStats.osVersion || '',
                    kernel: systemStats.kernel || '',
                    platform: systemStats.platform || 'win32',
                    arch: systemStats.arch || '',
                    osPrettyName: systemStats.osPrettyName || '',
                    uptime: systemStats.uptime || '',
                    cpuMeta: {
                        cores: systemStats.cpu?.cores || 0,
                        model: systemStats.cpu?.model || '',
                        perCpuLoad: systemStats.cpu?.perCpuLoad || [],
                    },
                };

                setStatusStats(statsPayload);
                setIsLoadingStats(false);
            } catch (error) {
                console.error('Error fetching system stats for standalone status bar:', error);
            }
        };

        const handleStorageChange = (e) => {
            if (e.key === 'basicapp_statusbar_icon_theme') {
                setStatusBarIconTheme(e.newValue || 'classic');
            } else if (e.key === 'localLinuxStatusBarTheme' || e.key === 'basicapp_statusbar_theme') {
                setLocalStatusBarThemeName(e.newValue || 'Default Dark');
            } else if (e.key === 'statusBarPollingInterval') {
                setPollingInterval(parseInt(e.newValue || '3', 10) * 1000);
            }
        };
        const onThemeChanged = (e) => {
            if (e.detail && e.detail.terminalType === 'linux') {
                setLocalStatusBarThemeName(e.detail.theme);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('statusbar-theme-changed', onThemeChanged);

        fetchStats();
        timer = setInterval(fetchStats, pollingInterval);

        return () => {
            stopped = true;
            if (timer) clearInterval(timer);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('statusbar-theme-changed', onThemeChanged);
        };
    }, [visible, pollingInterval]);

    if (!visible) return null;

    return (
        <div style={{
            ...getScopedStatusBarCssVars(),
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            width: '100%',
            ...style
        }}>
            <StatusBar
                stats={{ ...(statusStats || {}), cpuHistory: sessionHistory.map(s => s.cpu), sessionHistory }}
                gpuStats={gpuStats}
                active={true}
                statusBarIconTheme={statusBarIconTheme}
                isLoading={isLoadingStats}
                terminalType="linux"
            />
        </div>
    );
};

export default StandaloneStatusBar;
