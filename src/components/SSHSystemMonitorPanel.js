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
const REFRESH_INTERVAL_MS = 3000;
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
    const intervalRef = useRef(null);

    // ── Fetch process list from main process via IPC ──────────────────────────
    const fetchProcesses = useCallback(async () => {
        if (!window.electronAPI && !window.electron?.ipcRenderer) return;
        try {
            let result;
            if (window.electronAPI?.invoke) {
                result = await window.electronAPI.invoke('ssh:get-processes', { tabId });
            } else if (window.electron?.ipcRenderer?.invoke) {
                result = await window.electron.ipcRenderer.invoke('ssh:get-processes', { tabId });
            }
            if (result?.success && Array.isArray(result.processes)) {
                setProcesses(result.processes);
            }
        } catch (e) {
            // Silently ignore errors
        } finally {
            setProcessesLoading(false);
            setLastRefreshed(new Date());
        }
    }, [tabId]);

    // ── Start refresh loop ────────────────────────────────────────────────────
    useEffect(() => {
        fetchProcesses();
        intervalRef.current = setInterval(fetchProcesses, REFRESH_INTERVAL_MS);
        return () => clearInterval(intervalRef.current);
    }, [fetchProcesses]);

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

    return (
        <div className="ssh-monitor-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            <div className="ssh-monitor-panel" onClick={(e) => e.stopPropagation()}>

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
                        <div className="ssh-monitor-stat-label">CPU</div>
                        <div className={`ssh-monitor-stat-value cpu`}>{cpuPct.toFixed(1)}%</div>
                        <StatBar value={cpuPct} type="cpu" />
                        {cpuHistory.length > 1 && (
                            <Sparkline data={cpuHistory} color="#58a6ff" maxVal={100} />
                        )}
                    </div>

                    {/* Memory */}
                    <div className="ssh-monitor-stat-card">
                        <div className="ssh-monitor-stat-label">Memoria RAM</div>
                        <div className="ssh-monitor-stat-value mem">{memPct.toFixed(1)}%</div>
                        <StatBar value={memPct} type="mem" />
                        <div className="ssh-monitor-stat-sub">{memUsedGB} GB / {memTotalGB} GB</div>
                    </div>

                    {/* Disk */}
                    <div className="ssh-monitor-stat-card">
                        <div className="ssh-monitor-stat-label">Disco</div>
                        {disks.length === 0 ? (
                            <div className="ssh-monitor-stat-sub" style={{ marginTop: 8 }}>Sin datos</div>
                        ) : (
                            <div className="ssh-monitor-disks">
                                {disks.slice(0, 4).map((disk, i) => {
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
                        <div style={{ display: 'flex', gap: '12px', marginTop: 4 }}>
                            <div>
                                <div className="ssh-monitor-stat-sub">↓ Recv</div>
                                <div className="ssh-monitor-stat-value net" style={{ fontSize: 16, marginTop: 2 }}>
                                    {formatSpeed(rxSpeed)}
                                </div>
                            </div>
                            <div>
                                <div className="ssh-monitor-stat-sub">↑ Send</div>
                                <div className="ssh-monitor-stat-value net" style={{ fontSize: 16, marginTop: 2, color: '#f78166' }}>
                                    {formatSpeed(txSpeed)}
                                </div>
                            </div>
                        </div>
                        <div className="ssh-monitor-bar-track" style={{ marginTop: 6 }}>
                            <div
                                className="ssh-monitor-bar-fill net"
                                style={{ width: `${Math.min(100, (rxSpeed / 10485760) * 100)}%` }}
                            />
                        </div>
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
                                        filteredProcesses.map(proc => (
                                            <tr key={proc.pid}>
                                                <td className="pid">{proc.pid}</td>
                                                <td className="user">{proc.user}</td>
                                                <td className="cpu">
                                                    {proc.cpu.toFixed(1)}%
                                                    <span
                                                        className="ssh-monitor-cpu-mini-bar"
                                                        style={{ width: `${Math.min(40, proc.cpu * 2)}px` }}
                                                    />
                                                </td>
                                                <td className="mem">{proc.mem.toFixed(1)}%</td>
                                                <td className="rss">{formatBytes(proc.rss)}</td>
                                                <td className="cmd" title={proc.command}>{proc.command}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* ── Footer ────────────────────────────────────────────────── */}
                <div className="ssh-monitor-footer">
                    <div className="ssh-monitor-refresh-indicator">
                        <div className="ssh-monitor-refresh-dot" />
                        Actualización cada {REFRESH_INTERVAL_MS / 1000}s
                    </div>
                    {lastRefreshed && (
                        <span>Última actualización: {lastRefreshed.toLocaleTimeString()}</span>
                    )}
                    <span style={{ color: '#484f58' }}>Pulsa ESC para cerrar</span>
                </div>

            </div>
        </div>
    );
};

export default SSHSystemMonitorPanel;
