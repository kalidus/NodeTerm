import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SSHIconRenderer, SSHIconPresets } from './SSHIconSelector';
import '../styles/ssh-monitor.css';

/**
 * Formats bytes to a human-readable string (KB, MB, GB)
 */
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formats bytes/sec to a human-readable network speed
 */
function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return `${(bytesPerSec / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}

/**
 * Mini sparkline component that renders the CPU history as tiny bars
 */
const Sparkline = ({ data, color = '#58a6ff', maxVal }) => {
    const max = maxVal || Math.max(...data, 1);
    return (
        <div className="ssh-monitor-sparkline" title={`CPU history (last ${data.length} readings)`}>
            {data.map((val, i) => (
                <div
                    key={i}
                    className="ssh-monitor-spark-bar"
                    style={{
                        height: `${Math.max(4, (val / max) * 100)}%`,
                        background: color,
                        opacity: 0.3 + 0.7 * (i / data.length)
                    }}
                />
            ))}
        </div>
    );
};

/**
 * Progress bar component
 */
const StatBar = ({ value, type = 'cpu' }) => {
    const pct = Math.min(100, Math.max(0, parseFloat(value) || 0));
    const color = pct > 85 ? '#da3633' : pct > 65 ? '#d29922' : undefined;
    return (
        <div className="ssh-monitor-bar-track">
            <div
                className={`ssh-monitor-bar-fill ${type}`}
                style={{ width: `${pct}%`, background: color || undefined }}
            />
        </div>
    );
};

const SORT_DIRECTIONS = { asc: 'asc', desc: 'desc' };
const REFRESH_OPTIONS = [1000, 2000, 3000, 5000, 10000];
const MAX_HISTORY = 40;

/**
 * SSHSystemMonitorPanel - Task Manager / htop style overlay for SSH sessions
 *
 * Props:
 *   tabId      - SSH tab identifier
 *   tab        - The actual tab object to fetch icon info
 *   stats      - Live stats object from sshStatsByTabId (cpu, mem, disk, network, uptime, hostname, ip, distro)
 *   onClose    - Callback to close the panel
 */
const SSHSystemMonitorPanel = ({ tabId, tab, stats = {}, onClose }) => {
    const [processes, setProcesses] = useState([]);
    const [processesLoading, setProcessesLoading] = useState(true);
    const [processFilter, setProcessFilter] = useState('');
    const [sortKey, setSortKey] = useState('cpu');
    const [sortDir, setSortDir] = useState(SORT_DIRECTIONS.desc);
    const [cpuHistory, setCpuHistory] = useState([]);
    const [memHistory, setMemHistory] = useState([]);
    const [netRxHistory, setNetRxHistory] = useState([]);
    const [netTxHistory, setNetTxHistory] = useState([]);
    const [diskHistory, setDiskHistory] = useState([]);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [netIfaces, setNetIfaces] = useState([]);

    // Dropdown refresh menu state
    const [refreshInterval, setRefreshInterval] = useState(() => {
        const saved = localStorage.getItem('ssh_monitor_refresh_ms');
        return saved ? parseInt(saved, 10) : 3000;
    });
    const [isRefreshMenuOpen, setIsRefreshMenuOpen] = useState(false);
    const refreshMenuRef = useRef(null);
    const intervalRef = useRef(null);
    const [opacity, setOpacity] = useState(() => {
        const saved = localStorage.getItem('ssh_monitor_opacity');
        return saved ? parseFloat(saved) : 0.9;
    });
    const [isOpacityMenuOpen, setIsOpacityMenuOpen] = useState(false);
    const opacityMenuRef = useRef(null);

    // ── Fetch process list from main process via IPC ──────────────────────────
    const fetchProcesses = useCallback(async () => {
        const invoke = window.electron?.ipcRenderer?.invoke;
        if (!invoke) return;
        try {
            const isLocal = tab?.type === 'local-terminal';
            const handler = isLocal ? 'app:get-local-processes' : 'ssh:get-processes';
            const result = await invoke(handler, { tabId });
            if (result?.success && Array.isArray(result.processes)) {
                setProcesses(result.processes);
            }
        } catch (e) {
            // ignore
        } finally {
            setProcessesLoading(false);
            setLastRefreshed(new Date());
        }
    }, [tabId, tab?.type]);

    // ── Handle interval changes and sync with backend ─────────────────────────
    const handleIntervalChange = useCallback((newMs) => {
        setRefreshInterval(newMs);
        localStorage.setItem('ssh_monitor_refresh_ms', newMs.toString());
        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.invoke('ssh:set-stats-interval', { intervalMs: newMs });
        }
    }, []);

    const handleOpacityChange = (e) => {
        const val = parseFloat(e.target.value);
        setOpacity(val);
        localStorage.setItem('ssh_monitor_opacity', val.toString());
    };

    // Sync init interval
    useEffect(() => {
        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.invoke('ssh:set-stats-interval', { intervalMs: refreshInterval });
        }
    }, [refreshInterval]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (refreshMenuRef.current && !refreshMenuRef.current.contains(e.target)) {
                setIsRefreshMenuOpen(false);
            }
            if (opacityMenuRef.current && !opacityMenuRef.current.contains(e.target)) {
                setIsOpacityMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);



    // ── Fetch network interfaces once on open ─────────────────────────────────
    const fetchNetIfaces = useCallback(async () => {
        try {
            const invoke = window.electron?.ipcRenderer?.invoke;
            if (!invoke) return;
            // ip -br address gives: iface  UP  ip/prefix ...
            const ifaceResult = await invoke('ssh:get-net-interfaces', { tabId });
            if (ifaceResult?.success && Array.isArray(ifaceResult.interfaces)) {
                setNetIfaces(ifaceResult.interfaces);
            }
        } catch (e) { /* ignore */ }
    }, [tabId]);

    // ── Start refresh loop ────────────────────────────────────────────────────
    useEffect(() => {
        fetchProcesses();
        fetchNetIfaces();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(fetchProcesses, refreshInterval);
        return () => clearInterval(intervalRef.current);
    }, [fetchProcesses, fetchNetIfaces, refreshInterval]);


    // ── Fetch local stats ONLY for local terminal ────────────────────────────
    const [localStats, setLocalStats] = useState(null);
    useEffect(() => {
        if (tab?.type !== 'local-terminal') return;

        let stopped = false;
        let timer = null;

        const fetchLocalStats = async () => {
            if (stopped) return;
            const systemStats = await window.electronAPI?.getSystemStats();
            if (systemStats && !stopped) {
                // Adapt stats for what the UI expects (matching SSHStatsService format)
                const adapted = {
                    cpu: (systemStats.cpu?.usage || 0).toFixed(2),
                    mem: {
                        total: (systemStats.memory?.total || 0) * 1024 * 1024 * 1024,
                        used: (systemStats.memory?.used || 0) * 1024 * 1024 * 1024
                    },
                    network: {
                        rx_speed: (systemStats.network?.download || 0) * 1024 * 1024 / 8,
                        tx_speed: (systemStats.network?.upload || 0) * 1024 * 1024 / 8
                    },
                    disk: Array.isArray(systemStats.disks)
                        ? systemStats.disks.map(d => ({ fs: d.name, use: d.percentage }))
                        : [],
                    hostname: systemStats.hostname,
                    ip: systemStats.ip,
                    distro: window.electron?.platform === 'darwin' ? 'macos' : (window.electron?.platform === 'win32' ? 'windows' : 'linux')
                };
                setLocalStats(adapted);
            }
            if (!stopped) {
                timer = setTimeout(fetchLocalStats, refreshInterval);
            }
        };

        fetchLocalStats();
        return () => {
            stopped = true;
            if (timer) clearTimeout(timer);
        };
    }, [tab?.type, refreshInterval]);

    // Determinar qué estadísticas usar (pasadas por prop para SSH, locales para terminal local)
    const activeStats = tab?.type === 'local-terminal' ? (localStats || {}) : (stats || {});

    // ── Track CPU and Memory history from active stats ───────────────────────
    useEffect(() => {
        if (activeStats?.cpu !== undefined) {
            const cpuVal = parseFloat(activeStats.cpu) || 0;
            setCpuHistory(prev => [...prev, cpuVal].slice(-MAX_HISTORY));
        }

        if (activeStats?.mem?.total !== undefined && activeStats?.mem?.used !== undefined) {
            const memTotal = activeStats.mem.total;
            const memUsed = activeStats.mem.used;
            const memPctVal = memTotal > 0 ? (memUsed / memTotal) * 100 : 0;
            setMemHistory(prev => [...prev, memPctVal].slice(-MAX_HISTORY));
        }

        if (activeStats?.network) {
            const rx = activeStats.network.rx_speed || 0;
            const tx = activeStats.network.tx_speed || 0;
            setNetRxHistory(prev => [...prev, rx].slice(-MAX_HISTORY));
            setNetTxHistory(prev => [...prev, tx].slice(-MAX_HISTORY));
        }

        if (Array.isArray(activeStats?.disk) && activeStats.disk.length > 0) {
            let totalUse = 0;
            activeStats.disk.forEach(d => {
                totalUse += typeof d.use === 'number' ? d.use : (d.percentage || 0);
            });
            const avgDisk = totalUse / activeStats.disk.length;
            setDiskHistory(prev => [...prev, avgDisk].slice(-MAX_HISTORY));
        }
    }, [activeStats?.cpu, activeStats?.mem?.total, activeStats?.mem?.used, activeStats?.network, activeStats?.disk]);

    // ── Close on Escape key ───────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // ── Derived stats ─────────────────────────────────────────────────────────
    const cpuPct = parseFloat(activeStats?.cpu) || 0;
    const memTotal = activeStats?.mem?.total || 0;
    const memUsed = activeStats?.mem?.used || 0;
    const memPct = memTotal > 0 ? (memUsed / memTotal) * 100 : 0;
    const memUsedGB = memTotal > 0 ? (memUsed / 1024 / 1024 / 1024).toFixed(1) : '?';
    const memTotalGB = memTotal > 0 ? (memTotal / 1024 / 1024 / 1024).toFixed(1) : '?';
    const disks = Array.isArray(activeStats?.disk) ? activeStats.disk : [];
    const rxSpeed = activeStats?.network?.rx_speed || 0;
    const txSpeed = activeStats?.network?.tx_speed || 0;

    // ── Sorting ───────────────────────────────────────────────────────────────
    const handleSort = (key) => {
        if (key === sortKey) {
            setSortDir(d => d === SORT_DIRECTIONS.desc ? SORT_DIRECTIONS.asc : SORT_DIRECTIONS.desc);
        } else {
            setSortKey(key);
            setSortDir(SORT_DIRECTIONS.desc);
        }
    };

    const filteredProcesses = processes
        .filter(p => !processFilter || p.command.toLowerCase().includes(processFilter.toLowerCase()) || p.user.toLowerCase().includes(processFilter.toLowerCase()) || String(p.pid).includes(processFilter))
        .sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (typeof aVal === 'number') {
                return sortDir === SORT_DIRECTIONS.desc ? bVal - aVal : aVal - bVal;
            }
            return sortDir === SORT_DIRECTIONS.desc
                ? String(bVal).localeCompare(String(aVal))
                : String(aVal).localeCompare(String(bVal));
        });

    const SortIndicator = ({ col }) => {
        if (col !== sortKey) return <span style={{ opacity: 0.3 }}> ↕</span>;
        return <span style={{ color: '#58a6ff' }}>{sortDir === 'desc' ? ' ↓' : ' ↑'}</span>;
    };

    // ── Resizing Logic ────────────────────────────────────────────────────────
    const [panelLeft, setPanelLeft] = useState(() => {
        const saved = localStorage.getItem('ssh_monitor_panel_left');
        const parsed = saved ? parseFloat(saved) : 45;
        return isNaN(parsed) ? 45 : parsed;
    });
    const [isResizing, setIsResizing] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    // Use refs for stable values in event listeners
    const panelLeftRef = useRef(panelLeft);
    const resizeStateRef = useRef({ isResizing: false, startX: 0, startLeftPx: 0, parentWidth: 0 });

    useEffect(() => {
        panelLeftRef.current = panelLeft;
    }, [panelLeft]);

    useEffect(() => {
        // Marcamos como montado después de un ciclo para permitir la animación inicial
        const timer = setTimeout(() => setHasMounted(true), 300);
        return () => clearTimeout(timer);
    }, []);

    const handleMouseMoveResizer = useCallback((e) => {
        if (!resizeStateRef.current.isResizing) return;

        const { startX, startLeftPx, parentWidth } = resizeStateRef.current;
        const deltaX = e.clientX - startX;

        // Nuevo posicionamiento en píxeles (min 20%, max 85%)
        const newLeftPx = Math.max(parentWidth * 0.2, Math.min(parentWidth * 0.85, startLeftPx + deltaX));
        const newLeftPct = (newLeftPx / parentWidth) * 100;

        setPanelLeft(newLeftPct);
    }, []);

    const handleMouseUpResizer = useCallback((e) => {
        if (resizeStateRef.current.isResizing) {
            localStorage.setItem('ssh_monitor_panel_left', panelLeftRef.current.toString());
            // Prevenir que el click se propague si estamos terminando un resize
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
        }

        resizeStateRef.current.isResizing = false;
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMoveResizer);
        document.removeEventListener('mouseup', handleMouseUpResizer);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [handleMouseMoveResizer]);

    const handleMouseDownResizer = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const overlay = e.currentTarget.closest('.ssh-monitor-overlay');
        if (!overlay) return;

        const parentRect = overlay.parentElement.getBoundingClientRect();
        const currentLeftPx = (panelLeftRef.current / 100) * parentRect.width;

        resizeStateRef.current = {
            isResizing: true,
            startX: e.clientX,
            startLeftPx: currentLeftPx,
            parentWidth: parentRect.width
        };

        setIsResizing(true);
        document.addEventListener('mousemove', handleMouseMoveResizer);
        document.addEventListener('mouseup', handleMouseUpResizer);
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    };

    // Clean up event listeners on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMoveResizer);
            document.removeEventListener('mouseup', handleMouseUpResizer);
        };
    }, [handleMouseMoveResizer, handleMouseUpResizer]);

    return (
        <div
            className="ssh-monitor-overlay"
            style={{
                '--ssh-monitor-left': `${panelLeft}%`,
                '--ssh-monitor-opacity': opacity
            }}
            onClick={(e) => {
                // Solo cerrar si el click es exactamente en el overlay (fondo transparente)
                // y NO estamos redimensionando
                if (e.target === e.currentTarget && !isResizing) onClose?.();
            }}
        >
            {/* Resize handle */}
            <div
                className={`ssh-monitor-resize-handle ${isResizing ? 'is-resizing' : ''}`}
                onMouseDown={handleMouseDownResizer}
                onClick={(e) => e.stopPropagation()} // Importante: evitar que el click cierre el monitor
            />

            <div className={`ssh-monitor-panel ${hasMounted || isResizing ? 'no-animation' : ''}`} onClick={(e) => e.stopPropagation()}>

                {/* ── Header ────────────────────────────────────────────────── */}
                <div className="ssh-monitor-header">
                    <div className="ssh-monitor-header-main">
                        <div className="ssh-monitor-server-title">
                            {tab?.iconId || tab?.nodeData?.iconId ? (
                                <SSHIconRenderer
                                    preset={SSHIconPresets[Object.keys(SSHIconPresets).find(k => SSHIconPresets[k].id === (tab?.iconId || tab?.nodeData?.iconId))] || SSHIconPresets.DEFAULT}
                                    pixelSize={20}
                                />
                            ) : (
                                <i className={`pi ${tab?.type === 'local-terminal' ? 'pi-desktop' : 'pi-server'} ssh-monitor-title-icon`} />
                            )}
                            <h2>{activeStats?.hostname || (tab?.type === 'local-terminal' ? 'Sistema Local' : 'Servidor SSH')}</h2>

                            <div className="ssh-monitor-header-sub">
                                {activeStats?.distro && (
                                    <>
                                        <span className="ssh-monitor-separator">•</span>
                                        <span className="ssh-monitor-distro-info" title="Sistema Operativo">
                                            {activeStats.distro === 'macos' ? '🍎' : (activeStats.distro === 'windows' ? '🪟' : <i className="pi pi-linux" />)}
                                            <span style={{ textTransform: 'capitalize', marginLeft: '4px' }}>{activeStats.distro}</span>
                                        </span>
                                    </>
                                )}
                                {activeStats?.uptime && (
                                    <>
                                        <span className="ssh-monitor-separator">•</span>
                                        <span className="ssh-monitor-uptime" title="Tiempo de actividad">⏱ {activeStats.uptime}</span>
                                    </>
                                )}
                                {activeStats?.ip && activeStats.ip !== activeStats?.hostname && (
                                    <>
                                        <span className="ssh-monitor-separator">•</span>
                                        <span className="ssh-monitor-server-ip" title="Dirección IP">{activeStats.ip}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="ssh-monitor-header-actions">
                            <div className="ssh-monitor-opacity-container" ref={opacityMenuRef}>
                                <button
                                    className={`ssh-monitor-opacity-toggle ${isOpacityMenuOpen ? 'active' : ''}`}
                                    onClick={() => setIsOpacityMenuOpen(!isOpacityMenuOpen)}
                                    title="Ajustar opacidad"
                                >
                                    <i className="pi pi-clone" style={{ fontSize: '12px', transform: 'rotate(45deg)' }} />
                                    <span className="ssh-monitor-opacity-val-text">{Math.round(opacity * 100)}%</span>
                                </button>

                                {isOpacityMenuOpen && (
                                    <div className="ssh-monitor-opacity-popover">
                                        <span className="ssh-monitor-opacity-label">Opacidad</span>
                                        <input
                                            type="range"
                                            className="ssh-monitor-opacity-slider"
                                            min="0.1"
                                            max="1"
                                            step="0.05"
                                            value={opacity}
                                            onChange={handleOpacityChange}
                                        />
                                    </div>
                                )}
                            </div>
                            <button className="ssh-monitor-close" onClick={onClose} title="Cerrar (Esc)">✕</button>
                        </div>
                    </div>
                </div>

                {/* ── Stats Cards ───────────────────────────────────────────── */}
                <div className="ssh-monitor-stats-grid">

                    {/* CPU */}
                    <div className="ssh-monitor-stat-card ssh-stat-hoverable">
                        <div className="ssh-monitor-stat-label">CPU {activeStats?.cores ? `(${activeStats.cores} cores)` : ''}</div>
                        <div className={`ssh-monitor-stat-value cpu`}>{cpuPct.toFixed(1)}%</div>
                        <StatBar value={cpuPct} type="cpu" />
                        {cpuHistory.length > 1 && (
                            <Sparkline data={cpuHistory} color="#58a6ff" maxVal={100} />
                        )}
                        {activeStats?.coreLoads && activeStats.coreLoads.length > 0 && (
                            <div className="ssh-monitor-hover-tooltip">
                                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#e6edf3', borderBottom: '1px solid #30363d', paddingBottom: '4px' }}>Utilización por Núcleo</div>
                                <div className="ssh-monitor-cpu-cores-grid">
                                    {stats.coreLoads.map((load, idx) => (
                                        <div key={idx} className="ssh-monitor-core-item">
                                            <span style={{ color: '#8b949e', width: '30px' }}>CPU{idx}</span>
                                            <div className="ssh-monitor-bar-track" style={{ flex: 1, margin: '0 8px', height: '4px' }}>
                                                <div className="ssh-monitor-bar-fill cpu" style={{ width: `${Math.min(100, load)}%` }} />
                                            </div>
                                            <span style={{ color: '#58a6ff', width: '36px', textAlign: 'right' }}>{load.toFixed(1)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Memory */}
                    <div className="ssh-monitor-stat-card ssh-stat-hoverable">
                        <div className="ssh-monitor-stat-label">Memoria</div>
                        <div className="ssh-monitor-stat-value mem">{memPct.toFixed(1)}%</div>
                        <StatBar value={memPct} type="mem" />
                        <div className="ssh-monitor-stat-sub" style={{ marginTop: '2px' }}>
                            {formatBytes(memUsed)} / {formatBytes(memTotal)}
                        </div>

                        <div className="ssh-monitor-hover-tooltip">
                            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#e6edf3', borderBottom: '1px solid #30363d', paddingBottom: '4px' }}>Detalles de Memoria</div>

                            {memHistory.length > 1 && (
                                <div style={{ height: '36px', marginBottom: '12px', position: 'relative' }}>
                                    <Sparkline data={memHistory} color="#d29922" maxVal={100} />
                                </div>
                            )}

                            <div className="ssh-monitor-stat-sub" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c9d1d9', flexWrap: 'wrap', gap: '4px' }}>
                                    <span>Usada:</span>
                                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatBytes(memUsed)} / {formatBytes(memTotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                    <span>Caché:</span>
                                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatBytes(stats?.mem?.cached || 0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', borderTop: '1px dotted #30363d', paddingTop: '8px', marginTop: '2px' }}>
                                    <span>Swap:</span>
                                    <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                                        <span style={{ color: stats?.mem?.swapUsed > 0 ? '#d29922' : 'inherit' }}>
                                            {formatBytes(stats?.mem?.swapUsed || 0)}
                                        </span>
                                        <span style={{ whiteSpace: 'nowrap' }}>&nbsp;/ {formatBytes(stats?.mem?.swapTotal || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Network */}
                    <div className="ssh-monitor-stat-card ssh-stat-hoverable">
                        <div className="ssh-monitor-stat-label">Red</div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: 2 }}>
                            <div>
                                <div className="ssh-monitor-stat-sub">↓ Recv</div>
                                <div className="ssh-monitor-stat-value net" style={{ fontSize: 15, marginTop: 2 }}>
                                    {formatSpeed(rxSpeed)}
                                </div>
                            </div>
                            <div>
                                <div className="ssh-monitor-stat-sub">↑ Send</div>
                                <div className="ssh-monitor-stat-value net" style={{ fontSize: 15, marginTop: 2, color: '#f78166' }}>
                                    {formatSpeed(txSpeed)}
                                </div>
                            </div>
                        </div>
                        <div className="ssh-monitor-bar-track" style={{ marginTop: 4 }}>
                            <div
                                className="ssh-monitor-bar-fill net"
                                style={{ width: `${Math.min(100, (rxSpeed / 10485760) * 100)}%` }}
                            />
                        </div>

                        <div className="ssh-monitor-hover-tooltip" style={{ right: '100%', left: 'auto', transform: 'translateY(-50%) translateX(-10px)', width: 340 }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#e6edf3', borderBottom: '1px solid #30363d', paddingBottom: '4px' }}>Detalles de Red</div>
                            {netRxHistory.length > 1 && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '9px', color: '#8b949e', marginBottom: '2px' }}>↓ Recv Historico</div>
                                        <div style={{ height: '24px', position: 'relative' }}>
                                            <Sparkline data={netRxHistory} color="#3fb950" maxVal={Math.max(...netRxHistory, 1024)} />
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '9px', color: '#8b949e', marginBottom: '2px' }}>↑ Send Historico</div>
                                        <div style={{ height: '24px', position: 'relative' }}>
                                            <Sparkline data={netTxHistory} color="#f78166" maxVal={Math.max(...netTxHistory, 1024)} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Per-interface list */}
                            {netIfaces.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 110, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 }}>
                                    {netIfaces.map((iface, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 10, color: '#8b949e', whiteSpace: 'nowrap' }}>
                                            <span style={{ color: iface.state === 'UP' ? '#3fb950' : '#484f58', width: 8, flexShrink: 0 }}>●</span>
                                            <span style={{ color: '#58a6ff', width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis' }} title={iface.name}>{iface.name}</span>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={iface.ip || '—'}>{iface.ip || '—'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Disk */}
                    <div className="ssh-monitor-stat-card disks-card">
                        <div className="ssh-monitor-stat-label">Discos</div>
                        {disks.length === 0 ? (
                            <div className="ssh-monitor-stat-sub" style={{ marginTop: 8 }}>Sin datos</div>
                        ) : (
                            <div className="ssh-monitor-disks">
                                {disks.map((disk, i) => {
                                    const pct = typeof disk.use === 'number' ? disk.use : (disk.percentage || 0);
                                    const name = disk.fs || disk.name || '/';
                                    return (
                                        <div key={i} className="ssh-monitor-disk-row">
                                            <span className="ssh-monitor-disk-name" title={name}>{name}</span>
                                            <div className="ssh-monitor-disk-bar-track">
                                                <div className="ssh-monitor-disk-bar-fill" style={{ width: `${Math.min(100, pct)}%` }} />
                                            </div>
                                            <span className="ssh-monitor-disk-pct">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Process List ──────────────────────────────────────────── */}
                <div className="ssh-monitor-process-section">
                    <div className="ssh-monitor-process-header">
                        <span className="ssh-monitor-process-title">Procesos</span>
                        <input
                            className="ssh-monitor-process-filter"
                            type="text"
                            placeholder="Filtrar por proceso, usuario o PID..."
                            value={processFilter}
                            onChange={e => setProcessFilter(e.target.value)}
                            autoComplete="off"
                        />
                        <span className="ssh-monitor-process-count">
                            {filteredProcesses.length} / {processes.length} procesos
                        </span>
                    </div>

                    <div className="ssh-monitor-table-wrapper">
                        {processesLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, color: '#8b949e', gap: 10 }}>
                                <i className="pi pi-spin pi-spinner" />
                                Cargando procesos...
                            </div>
                        ) : (
                            <table className="ssh-monitor-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('pid')} style={{ width: 65 }}>
                                            PID<SortIndicator col="pid" />
                                        </th>
                                        <th onClick={() => handleSort('user')} style={{ width: 95 }}>
                                            Usuario<SortIndicator col="user" />
                                        </th>
                                        <th onClick={() => handleSort('cpu')} style={{ width: 75 }} className={sortKey === 'cpu' ? 'sorted' : ''}>
                                            CPU%<SortIndicator col="cpu" />
                                        </th>
                                        <th onClick={() => handleSort('mem')} style={{ width: 65 }}>
                                            MEM%<SortIndicator col="mem" />
                                        </th>
                                        <th onClick={() => handleSort('rss')} style={{ width: 80 }}>
                                            RSS<SortIndicator col="rss" />
                                        </th>
                                        <th onClick={() => handleSort('command')}>
                                            Comando<SortIndicator col="command" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProcesses.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', color: '#8b949e', padding: '20px' }}>
                                                Sin resultados
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProcesses.map(proc => {
                                            const numCores = stats?.cores || 1;
                                            const normalizedCpu = proc.cpu / numCores;

                                            return (
                                                <tr key={proc.pid}>
                                                    <td className="pid">{proc.pid}</td>
                                                    <td className="user">{proc.user}</td>
                                                    <td className="cpu">
                                                        {normalizedCpu.toFixed(1)}%
                                                        <span
                                                            className="ssh-monitor-cpu-mini-bar"
                                                            style={{ width: `${Math.min(40, normalizedCpu * 2.5)}px` }}
                                                        />
                                                    </td>
                                                    <td className="mem">{normalizedCpu > 0 ? proc.mem.toFixed(1) : proc.mem.toFixed(1)}%</td>
                                                    <td className="rss">{formatBytes(proc.rss)}</td>
                                                    <td className="cmd" title={proc.command}>{proc.command}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* ── Footer ────────────────────────────────────────────────── */}
                <div className="ssh-monitor-footer">
                    <div className="ssh-monitor-refresh-selector" ref={refreshMenuRef}>
                        <div
                            className="ssh-monitor-refresh-btn"
                            onClick={() => setIsRefreshMenuOpen(!isRefreshMenuOpen)}
                        >
                            <div className="ssh-monitor-refresh-dot" />
                            Actualización: {refreshInterval / 1000}s
                            <i className={`pi ${isRefreshMenuOpen ? 'pi-chevron-up' : 'pi-chevron-down'}`} style={{ fontSize: '10px', marginLeft: 4 }} />
                        </div>

                        {isRefreshMenuOpen && (
                            <div className="ssh-monitor-refresh-menu">
                                {REFRESH_OPTIONS.map(ms => (
                                    <div
                                        key={ms}
                                        className={`ssh-monitor-refresh-option ${refreshInterval === ms ? 'active' : ''}`}
                                        onClick={() => {
                                            handleIntervalChange(ms);
                                            setIsRefreshMenuOpen(false);
                                        }}
                                    >
                                        Cada {ms / 1000} segundos
                                        {refreshInterval === ms && <i className="pi pi-check" style={{ fontSize: '10px', marginLeft: 'auto' }} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {lastRefreshed && (
                        <span>Última actualización: {lastRefreshed.toLocaleTimeString()}</span>
                    )}
                    <span style={{ color: '#484f58', marginLeft: 'auto' }}>ESC para cerrar</span>
                </div>

            </div>
        </div>
    );
};

export default SSHSystemMonitorPanel;
