import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/ssh-monitor.css';

/**
 * Formats bytes to a human-readable string (KB, MB, GB)
 */
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024) return `${bytes} KB`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Formats bytes/sec to a human-readable network speed
 */
function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / 1024 / 1024).toFixed(2)} MB/s`;
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
 *   stats      - Live stats object from sshStatsByTabId (cpu, mem, disk, network, uptime, hostname, ip, distro)
 *   onClose    - Callback to close the panel
 */
const SSHSystemMonitorPanel = ({ tabId, stats = {}, onClose }) => {
    const [processes, setProcesses] = useState([]);
    const [processesLoading, setProcessesLoading] = useState(true);
    const [processFilter, setProcessFilter] = useState('');
    const [sortKey, setSortKey] = useState('cpu');
    const [sortDir, setSortDir] = useState(SORT_DIRECTIONS.desc);
    const [cpuHistory, setCpuHistory] = useState([]);
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

    // ── Fetch process list from main process via IPC ──────────────────────────
    const fetchProcesses = useCallback(async () => {
        const invoke = window.electron?.ipcRenderer?.invoke;
        if (!invoke) return;
        try {
            const result = await invoke('ssh:get-processes', { tabId });
            if (result?.success && Array.isArray(result.processes)) {
                setProcesses(result.processes);
            }
        } catch (e) {
            // ignore
        } finally {
            setProcessesLoading(false);
            setLastRefreshed(new Date());
        }
    }, [tabId]);

    // ── Handle interval changes and sync with backend ─────────────────────────
    const handleIntervalChange = useCallback((newMs) => {
        setRefreshInterval(newMs);
        localStorage.setItem('ssh_monitor_refresh_ms', newMs.toString());
        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.invoke('ssh:set-stats-interval', { intervalMs: newMs });
        }
    }, []);

    // Sync init interval
    useEffect(() => {
        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.invoke('ssh:set-stats-interval', { intervalMs: refreshInterval });
        }
    }, [refreshInterval]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (refreshMenuRef.current && !refreshMenuRef.current.contains(e.target)) {
                setIsRefreshMenuOpen(false);
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

    // ── Track CPU history from incoming stats ─────────────────────────────────
    useEffect(() => {
        if (stats?.cpu !== undefined) {
            const cpuVal = parseFloat(stats.cpu) || 0;
            setCpuHistory(prev => [...prev, cpuVal].slice(-MAX_HISTORY));
        }
    }, [stats?.cpu]);

    // ── Close on Escape key ───────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // ── Derived stats ─────────────────────────────────────────────────────────
    const cpuPct = parseFloat(stats?.cpu) || 0;
    const memTotal = stats?.mem?.total || 0;
    const memUsed = stats?.mem?.used || 0;
    const memPct = memTotal > 0 ? (memUsed / memTotal) * 100 : 0;
    const memUsedGB = memTotal > 0 ? (memUsed / 1024 / 1024 / 1024).toFixed(1) : '?';
    const memTotalGB = memTotal > 0 ? (memTotal / 1024 / 1024 / 1024).toFixed(1) : '?';
    const disks = Array.isArray(stats?.disk) ? stats.disk : [];
    const rxSpeed = stats?.network?.rx_speed || 0;
    const txSpeed = stats?.network?.tx_speed || 0;

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
            style={{ '--ssh-monitor-left': `${panelLeft}%` }}
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
                    <div className="ssh-monitor-title">
                        <span className="ssh-monitor-title-icon">📊</span>
                        <h2>Monitor del Sistema SSH</h2>
                    </div>
                    <div className="ssh-monitor-host-info">
                        {stats?.hostname && (
                            <span className="ssh-monitor-host-badge">
                                <i className="pi pi-server" style={{ fontSize: '11px' }} />
                                {stats.hostname}
                            </span>
                        )}
                        {stats?.ip && stats.ip !== stats?.hostname && (
                            <span>{stats.ip}</span>
                        )}
                        {stats?.distro && (
                            <span style={{ color: '#8b949e', textTransform: 'capitalize' }}>{stats.distro}</span>
                        )}
                        {stats?.uptime && (
                            <span className="ssh-monitor-uptime">⏱ {stats.uptime}</span>
                        )}
                    </div>
                    <button className="ssh-monitor-close" onClick={onClose} title="Cerrar (Esc)">✕</button>
                </div>

                {/* ── Stats Cards ───────────────────────────────────────────── */}
                <div className="ssh-monitor-stats-grid">

                    {/* CPU */}
                    <div className="ssh-monitor-stat-card">
                        <div className="ssh-monitor-stat-label">CPU {stats?.cores ? `(${stats.cores} cores)` : ''}</div>
                        <div className={`ssh-monitor-stat-value cpu`}>{cpuPct.toFixed(1)}%</div>
                        <StatBar value={cpuPct} type="cpu" />
                        {cpuHistory.length > 1 && (
                            <Sparkline data={cpuHistory} color="#58a6ff" maxVal={100} />
                        )}
                    </div>

                    {/* Memory */}
                    <div className="ssh-monitor-stat-card">
                        <div className="ssh-monitor-stat-label">Memoria</div>
                        <div className="ssh-monitor-stat-value mem">{memPct.toFixed(1)}%</div>
                        <StatBar value={memPct} type="mem" />
                        <div className="ssh-monitor-stat-sub" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c9d1d9', flexWrap: 'wrap', gap: '4px' }}>
                                <span>Usada:</span>
                                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{memUsedGB} / {memTotalGB} GB</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                <span>Caché:</span>
                                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{stats?.mem?.cached ? (stats.mem.cached / 1024 / 1024 / 1024).toFixed(1) : '0.0'} GB</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', borderTop: '1px dotted #30363d', paddingTop: '4px', marginTop: '1px' }}>
                                <span>Swap:</span>
                                <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                                    <span style={{ color: stats?.mem?.swapUsed > 0 ? '#d29922' : 'inherit' }}>
                                        {stats?.mem?.swapUsed ? (stats.mem.swapUsed / 1024 / 1024 / 1024).toFixed(1) : '0.0'}
                                    </span>
                                    <span style={{ whiteSpace: 'nowrap' }}>&nbsp;/ {stats?.mem?.swapTotal ? (stats.mem.swapTotal / 1024 / 1024 / 1024).toFixed(1) : '0.0'} GB</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Disk */}
                    <div className="ssh-monitor-stat-card">
                        <div className="ssh-monitor-stat-label">Disco</div>
                        {disks.length === 0 ? (
                            <div className="ssh-monitor-stat-sub" style={{ marginTop: 8 }}>Sin datos</div>
                        ) : (
                            <div className="ssh-monitor-disks" style={{ maxHeight: 90, overflowY: 'auto' }}>
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

                    {/* Network */}
                    <div className="ssh-monitor-stat-card">
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
                        {/* Per-interface list */}
                        {netIfaces.length > 0 && (
                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 60, overflowY: 'auto' }}>
                                {netIfaces.map((iface, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 6, fontSize: 10, color: '#8b949e' }}>
                                        <span style={{ color: iface.state === 'UP' ? '#3fb950' : '#484f58', width: 8 }}>●</span>
                                        <span style={{ color: '#58a6ff', minWidth: 60 }}>{iface.name}</span>
                                        <span>{iface.ip || '—'}</span>
                                    </div>
                                ))}
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
