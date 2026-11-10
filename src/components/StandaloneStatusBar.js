import React, { useState, useEffect, useMemo, useRef } from 'react';
import StatusBar from './StatusBar';
import { statusBarThemes } from '../themes/status-bar-themes';
import { useStatusBarSessionHistory } from '../hooks/useStatusBarSessionHistory';
import { systemStatsService } from '../services/SystemStatsService';
import { getDefaultLocalTerminalFontFamily } from '../utils/resolveTerminalFontFamily';

function statsSignature(stats) {
  if (!stats) return '';
  return [
    stats.cpu,
    stats.mem?.used,
    stats.mem?.total,
    stats.network?.rx_speed,
    stats.network?.tx_speed,
    stats.hostname,
    stats.ip
  ].join('|');
}

const StandaloneStatusBar = React.memo(({ visible = true, style = {}, fontFamily }) => {
    const resolvedFontFamily = fontFamily || getDefaultLocalTerminalFontFamily();
    const [statusStats, setStatusStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [telemetryDisabled, setTelemetryDisabled] = useState(() => !systemStatsService.isTelemetryEnabled());
    const [gpuStats, setGpuStats] = useState(null);
    const lastStatsSigRef = useRef('');
    const lastGpuAtRef = useRef(0);
    const [statusBarIconTheme, setStatusBarIconTheme] = useState(() => {
        try { return localStorage.getItem('basicapp_statusbar_icon_theme') || 'classic'; } catch { return 'classic'; }
    });
    const [localStatusBarThemeName, setLocalStatusBarThemeName] = useState(() => {
        try { return localStorage.getItem('localLinuxStatusBarTheme') || localStorage.getItem('basicapp_statusbar_theme') || 'Default Dark'; } catch { return 'Default Dark'; }
    });
    const [pollingInterval, setPollingInterval] = useState(() => {
        try {
            const saved = localStorage.getItem('statusBarPollingInterval');
            if (saved) return parseInt(saved, 10) * 1000;
            // Linux: intervalo mayor por defecto (menos IPC / nvidia-smi)
            const isLinux = window.electron?.platform === 'linux';
            return (isLinux ? 5 : 3) * 1000;
        } catch {
            return 3000;
        }
    });

    const sessionHistory = useStatusBarSessionHistory(statusStats, { gpuStats });

    const statusBarStats = useMemo(() => ({
        ...(statusStats || {}),
        cpuHistory: sessionHistory.map(s => s.cpu),
        sessionHistory
    }), [statusStats, sessionHistory]);

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
        systemStatsService.setIntervalMs(pollingInterval);
    }, [pollingInterval]);

    useEffect(() => {
        const syncTelemetry = (e) => {
            const enabled = e?.detail?.enabled !== undefined
              ? !!e.detail.enabled
              : systemStatsService.isTelemetryEnabled();
            setTelemetryDisabled(!enabled);
            if (!enabled) {
                setStatusStats(null);
                setGpuStats(null);
                setIsLoadingStats(false);
            }
        };
        window.addEventListener('local-telemetry-enabled-changed', syncTelemetry);
        return () => window.removeEventListener('local-telemetry-enabled-changed', syncTelemetry);
    }, []);

    useEffect(() => {
        if (!visible) return;

        let unsubscribe = () => {};
        let cancelled = false;
        // GPU stats: en Linux espaciar más (nvidia-smi / DRM)
        const isLinux = window.electron?.platform === 'linux';
        const gpuMinInterval = Math.max(isLinux ? 15000 : 5000, pollingInterval * (isLinux ? 3 : 2));

        const start = () => {
            if (cancelled) return;
            if (!systemStatsService.isTelemetryEnabled()) {
                setTelemetryDisabled(true);
                setIsLoadingStats(false);
            } else {
                setTelemetryDisabled(false);
            }
            unsubscribe = systemStatsService.subscribe(async (stats) => {
                if (cancelled) return;
                if (!systemStatsService.isTelemetryEnabled()) {
                    setTelemetryDisabled(true);
                    setStatusStats(null);
                    setGpuStats(null);
                    setIsLoadingStats(false);
                    return;
                }
                if (!stats) return;
                setTelemetryDisabled(false);

                const sig = statsSignature(stats);
                if (sig !== lastStatsSigRef.current) {
                    lastStatsSigRef.current = sig;
                    setStatusStats(stats);
                    setIsLoadingStats(false);
                }

                const now = Date.now();
                if (now - lastGpuAtRef.current < gpuMinInterval) return;
                lastGpuAtRef.current = now;
                try {
                    const gpuData = await window.electron.system?.getGPUStats();
                    if (!cancelled) {
                        setGpuStats(gpuData && gpuData.ok ? gpuData : null);
                    }
                } catch {
                    if (!cancelled) setGpuStats(null);
                }
            });
        };

        let cancelIdle = () => {};
        if (typeof requestIdleCallback === 'function') {
            const idleId = requestIdleCallback(start, { timeout: 1500 });
            cancelIdle = () => cancelIdleCallback(idleId);
        } else {
            const timerId = setTimeout(start, 1500);
            cancelIdle = () => clearTimeout(timerId);
        }

        return () => {
            cancelled = true;
            cancelIdle();
            unsubscribe();
        };
    }, [visible, pollingInterval]);

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
                stats={statusBarStats}
                gpuStats={gpuStats}
                active={true}
                statusBarIconTheme={statusBarIconTheme}
                isLoading={isLoadingStats}
                telemetryDisabled={telemetryDisabled}
                terminalType="linux"
                fontFamily={resolvedFontFamily}
            />
        </div>
    );
});

export default StandaloneStatusBar;
