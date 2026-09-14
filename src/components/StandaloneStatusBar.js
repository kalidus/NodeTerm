import React, { useState, useEffect } from 'react';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';
import { useStatusBarSessionHistory } from '../hooks/useStatusBarSessionHistory';
import { systemStatsService } from '../services/SystemStatsService';

const StandaloneStatusBar = React.memo(({ visible = true, style = {} }) => {
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

        const unsubscribe = systemStatsService.subscribe(async (stats) => {
            if (stats) {
                setStatusStats(stats);
                setIsLoadingStats(false);
                try {
                    const gpuData = await window.electron.system?.getGPUStats();
                    setGpuStats(gpuData && gpuData.ok ? gpuData : null);
                } catch {
                    setGpuStats(null);
                }
            }
        });

        return unsubscribe;
    }, [visible]);

    useEffect(() => {
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

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('statusbar-theme-changed', onThemeChanged);
        };
    }, []);

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
});

export default StandaloneStatusBar;
