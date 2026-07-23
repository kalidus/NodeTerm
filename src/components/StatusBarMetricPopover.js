import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ─── Mini SVG area chart ────────────────────────────────────────────────────

const padOnePoint = (arr) => {
    if (!arr || arr.length === 0) return [];
    if (arr.length === 1) return [arr[0], arr[0]];
    return arr;
};

const MiniAreaChart = ({ data, width = 220, height = 52, color = '#00ffe7', maxVal, secondData, secondColor }) => {
    const dataP = padOnePoint(data);
    const secondP = secondData ? padOnePoint(secondData) : null;

    if (!dataP || dataP.length < 2) {
        return (
            <svg width={width} height={height} style={{ display: 'block' }}>
                <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fill="color-mix(in srgb, var(--ui-dialog-text) 25%, transparent)" fontSize="10">sin datos</text>
            </svg>
        );
    }

    const pad = { t: 4, r: 2, b: 4, l: 2 };
    const W = width - pad.l - pad.r;
    const H = height - pad.t - pad.b;

    const allVals = secondP ? [...dataP, ...secondP] : dataP;
    const peak = maxVal !== undefined ? maxVal : Math.max(...allVals, 1e-9);

    const toX = (i, len) => (len < 2 ? pad.l : pad.l + (i / (len - 1)) * W);
    const toY = (v) => pad.t + H - (v / peak) * H;

    const buildPath = (arr) => {
        if (arr.length < 2) return '';
        const pts = arr.map((v, i) => `${toX(i, arr.length).toFixed(1)},${toY(v).toFixed(1)}`).join(' L ');
        const x0 = toX(0, arr.length).toFixed(1);
        const xN = toX(arr.length - 1, arr.length).toFixed(1);
        const yBase = (pad.t + H).toFixed(1);
        return `M ${x0},${yBase} L ${pts} L ${xN},${yBase} Z`;
    };

    const buildLine = (arr) => {
        if (arr.length < 2) return '';
        return arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i, arr.length).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
    };

    // Grid lines: 25%, 50%, 75%
    const gridYs = [0.25, 0.5, 0.75].map(f => pad.t + H - f * H);

    return (
        <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
            {/* Grid */}
            {gridYs.map((y, i) => (
                <line key={i} x1={pad.l} y1={y} x2={pad.l + W} y2={y}
                    stroke="color-mix(in srgb, var(--ui-dialog-text) 10%, transparent)" strokeWidth="0.5" strokeDasharray="3,3" />
            ))}
            {/* Area fill */}
            <path d={buildPath(dataP)} fill={color} fillOpacity="0.12" />
            {secondP && <path d={buildPath(secondP)} fill={secondColor || '#ff5f87'} fillOpacity="0.1" />}
            {/* Line */}
            <path d={buildLine(dataP)} fill="none" stroke={color} strokeWidth="1.5"
                strokeLinejoin="round" strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
            {secondP && (
                <path d={buildLine(secondP)} fill="none" stroke={secondColor || '#ff5f87'} strokeWidth="1.5"
                    strokeLinejoin="round" strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 3px ${secondColor || '#ff5f87'})` }} />
            )}
            {/* Last value dot */}
            <circle cx={toX(dataP.length - 1, dataP.length)} cy={toY(dataP[dataP.length - 1])} r="2.5"
                fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        </svg>
    );
};

// ─── Per-core mini bars ──────────────────────────────────────────────────────

const CoreGrid = ({ coreLoads, color }) => {
    if (!coreLoads || coreLoads.length === 0) return null;
    const cols = coreLoads.length <= 4 ? coreLoads.length : coreLoads.length <= 8 ? 4 : 6;
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '4px',
            marginTop: '6px',
        }}>
            {coreLoads.map((load, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{
                        width: '100%',
                        height: '28px',
                        background: 'color-mix(in srgb, var(--ui-dialog-text) 8%, transparent)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        position: 'relative',
                    }}>
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: `${Math.max(load, 1)}%`,
                            background: `linear-gradient(to top, ${color}, ${color}88)`,
                            borderRadius: '2px 2px 0 0',
                            transition: 'height 0.4s ease',
                            boxShadow: `0 0 4px ${color}66`,
                        }} />
                    </div>
                    <span style={{ fontSize: '9px', color: 'color-mix(in srgb, var(--ui-dialog-text) 45%, transparent)', fontFamily: 'monospace' }}>
                        {i}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Format helpers ──────────────────────────────────────────────────────────

const fmtBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const fmtSpeed = (bps) => {
    if (!bps || bps <= 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return `${parseFloat((bps / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// ─── Popover container ───────────────────────────────────────────────────────

const PANEL_W = 240;

const MetricPopover = ({ anchorRect, children, onMouseLeave, onMouseEnter }) => {
    if (!anchorRect) return null;

    const left = Math.max(4, Math.min(anchorRect.left + anchorRect.width / 2 - PANEL_W / 2, window.innerWidth - PANEL_W - 4));
    const bottom = window.innerHeight - anchorRect.top + 6;

    return createPortal(
        <div
            className="sbpop-panel app-surface"
            style={{ left, bottom, width: PANEL_W }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </div>,
        document.body
    );
};

// ─── Individual panels ───────────────────────────────────────────────────────

export const CpuPanel = ({ stats, sessionHistory, anchorRect, onClose, onStay }) => {
    const cpuColor = 'var(--sbpop-cpu, #00ffe7)';
    const cpuColorHex = '#00ffe7';
    const cpuData = sessionHistory ? sessionHistory.map(s => s.cpu) : (stats?.cpuHistory || []);
    const cpuMeta = stats?.cpuMeta || {};
    // SSH provides cores/coreLoads directly on stats
    const cores = cpuMeta.cores || stats?.cores || 0;
    const model = cpuMeta.model || stats?.model || '';
    const coreLoads = cpuMeta.perCpuLoad?.length ? cpuMeta.perCpuLoad : (stats?.coreLoads || []);
    const currentCpu = typeof stats?.cpu === 'number' ? stats.cpu : parseFloat(stats?.cpu) || 0;

    return (
        <MetricPopover anchorRect={anchorRect} onMouseEnter={onStay} onMouseLeave={onClose}>
            <div className="sbpop-header">
                <span className="sbpop-label" style={{ color: cpuColorHex }}>CPU</span>
                {model && <span className="sbpop-sublabel">{model}</span>}
            </div>
            <div className="sbpop-bigval" style={{ color: cpuColorHex }}>
                {currentCpu.toFixed(1)}<span className="sbpop-unit">%</span>
                {cores > 0 && <span className="sbpop-cores">{cores} cores</span>}
            </div>
            <MiniAreaChart data={cpuData} color={cpuColorHex} maxVal={100} width={PANEL_W - 16} height={52} />
            <CoreGrid coreLoads={coreLoads} color={cpuColorHex} />
        </MetricPopover>
    );
};

export const MemPanel = ({ stats, sessionHistory, anchorRect, onClose, onStay }) => {
    const memColor = '#b57aff';
    const mem = stats?.mem || {};
    const usedBytes = mem.used || 0;
    const totalBytes = mem.total || 0;
    const freeBytes = mem.free || (totalBytes - usedBytes);
    const usedPct = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
    const freePct = 100 - usedPct;
    const memData = sessionHistory ? sessionHistory.map(s => s.memUsed) : [];

    return (
        <MetricPopover anchorRect={anchorRect} onMouseEnter={onStay} onMouseLeave={onClose}>
            <div className="sbpop-header">
                <span className="sbpop-label" style={{ color: memColor }}>MEM</span>
            </div>
            <div className="sbpop-bigval" style={{ color: memColor }}>
                {fmtBytes(usedBytes)}<span className="sbpop-unit"> / {fmtBytes(totalBytes)}</span>
            </div>
            <div className="sbpop-row">
                <span className="sbpop-key">Usada</span>
                <span className="sbpop-val" style={{ color: memColor }}>{usedPct}%</span>
            </div>
            <div className="sbpop-row">
                <span className="sbpop-key">Libre</span>
                <span className="sbpop-val" style={{ color: '#5effa0' }}>{fmtBytes(freeBytes)} ({freePct}%)</span>
            </div>
            {/* Progress bar */}
            <div className="sbpop-bar-track">
                <div className="sbpop-bar-fill" style={{ width: `${usedPct}%`, background: memColor, boxShadow: `0 0 6px ${memColor}88` }} />
            </div>
            {memData.length > 1 && (
                <MiniAreaChart data={memData} color={memColor} width={PANEL_W - 16} height={44} />
            )}
        </MetricPopover>
    );
};

const gpuAccent = (type) => {
    if (!type) return '#b57aff';
    const t = String(type).toLowerCase();
    if (t.includes('nvidia')) return '#76b900';
    if (t.includes('amd')) return '#ed1c24';
    if (t.includes('intel')) return '#0071c5';
    if (t.includes('apple')) return '#a8a8a8';
    return '#b57aff';
};

export const GpuPanel = ({ gpuStats, sessionHistory, anchorRect, onClose, onStay }) => {
    if (!gpuStats || !gpuStats.ok) return null;
    const accent = gpuAccent(gpuStats.type);
    const name = gpuStats.name || (gpuStats.type && String(gpuStats.type).toUpperCase()) || 'GPU';
    const totalMB = gpuStats.totalMB || 0;
    const usedMB = typeof gpuStats.usedMB === 'number' ? gpuStats.usedMB : null;
    const usePct = totalMB > 0 && usedMB != null ? Math.round((usedMB / totalMB) * 100) : null;
    const temp = gpuStats.temperature;

    const sh = sessionHistory || [];
    const vramSeries = sh.map(s => {
        if (s.gpuTotalMB > 0 && typeof s.gpuUsedMB === 'number') {
            return (s.gpuUsedMB / s.gpuTotalMB) * 100;
        }
        return 0;
    });
    const tempSeries = sh.map(s => (typeof s.gpuTemp === 'number' ? s.gpuTemp : 0));
    const hasTempLine = sh.some(s => typeof s.gpuTemp === 'number') || (typeof temp === 'number');
    const tempMax = hasTempLine ? Math.max(100, ...tempSeries, typeof temp === 'number' ? temp : 0, 1) : 100;

    return (
        <MetricPopover anchorRect={anchorRect} onMouseEnter={onStay} onMouseLeave={onClose}>
            <div className="sbpop-header">
                <span className="sbpop-label" style={{ color: accent }}>GPU</span>
                <span className="sbpop-sublabel">{name}</span>
            </div>
            {totalMB > 0 && usedMB != null && (
                <div className="sbpop-bigval" style={{ color: accent, fontSize: '15px' }}>
                    {(usedMB / 1024).toFixed(1)}<span className="sbpop-unit"> / {(totalMB / 1024).toFixed(1)} GB</span>
                </div>
            )}
            {usePct != null && (
                <>
                    <div className="sbpop-row">
                        <span className="sbpop-key">VRAM</span>
                        <span className="sbpop-val" style={{ color: accent }}>{usePct}%</span>
                    </div>
                    <div className="sbpop-bar-track">
                        <div
                            className="sbpop-bar-fill"
                            style={{ width: `${usePct}%`, background: accent, boxShadow: `0 0 6px ${accent}88` }}
                        />
                    </div>
                </>
            )}
            {vramSeries.length > 0 && (
                <div className="sbpop-chart-caption">Histórico VRAM (sesión)</div>
            )}
            {vramSeries.length > 0 && (
                <MiniAreaChart
                    data={vramSeries}
                    color={accent}
                    maxVal={100}
                    width={PANEL_W - 16}
                    height={46}
                />
            )}
            {hasTempLine && (
                <div className="sbpop-chart-caption">Temperatura (°C)</div>
            )}
            {hasTempLine && (
                <MiniAreaChart
                    data={tempSeries}
                    color="#5effa0"
                    maxVal={tempMax}
                    width={PANEL_W - 16}
                    height={40}
                />
            )}
            {typeof temp === 'number' && (
                <div className="sbpop-row" style={{ marginTop: 4 }}>
                    <span className="sbpop-key">Actual</span>
                    <span className="sbpop-val" style={{ color: '#5effa0' }}>{temp}°C</span>
                </div>
            )}
        </MetricPopover>
    );
};

export const NetPanel = ({ stats, sessionHistory, anchorRect, onClose, onStay }) => {
    const rxColorHex = '#40c8ff';
    const txColorHex = '#ff9f40';
    const network = stats?.network || {};
    const rx = network.rx_speed || 0;
    const tx = network.tx_speed || 0;
    const sh = sessionHistory || [];
    const rxData = sh.map(s => s.rx);
    const txData = sh.map(s => s.tx);
    const totalData = sh.map(s => (s.rx || 0) + (s.tx || 0));
    const peak = Math.max(1e-9, ...rxData, ...txData);

    const peakRx = rxData.length ? Math.max(...rxData) : 0;
    const peakTx = txData.length ? Math.max(...txData) : 0;
    const peakTotal = totalData.length ? Math.max(...totalData) : 0;

    const hasHistory = sh.length > 0;

    return (
        <MetricPopover anchorRect={anchorRect} onMouseEnter={onStay} onMouseLeave={onClose}>
            <div className="sbpop-header">
                <span className="sbpop-label" style={{ color: rxColorHex }}>RED</span>
            </div>
            <div className="sbpop-row" style={{ marginTop: '4px' }}>
                <span className="sbpop-key">▼ RX</span>
                <span className="sbpop-val" style={{ color: rxColorHex }}>{fmtSpeed(rx)}</span>
            </div>
            <div className="sbpop-row">
                <span className="sbpop-key">▲ TX</span>
                <span className="sbpop-val" style={{ color: txColorHex }}>{fmtSpeed(tx)}</span>
            </div>
            {hasHistory && (
                <>
                    <div className="sbpop-row sbpop-dim">
                        <span className="sbpop-key">Pico RX</span>
                        <span className="sbpop-val">{fmtSpeed(peakRx)}</span>
                    </div>
                    <div className="sbpop-row sbpop-dim">
                        <span className="sbpop-key">Pico TX</span>
                        <span className="sbpop-val">{fmtSpeed(peakTx)}</span>
                    </div>
                </>
            )}
            {hasHistory && (
                <div className="sbpop-chart-caption">RX / TX (sesión)</div>
            )}
            {hasHistory && (
                <MiniAreaChart
                    data={rxData.length ? rxData : [0]}
                    secondData={txData.length ? txData : undefined}
                    color={rxColorHex}
                    secondColor={txColorHex}
                    maxVal={peak}
                    width={PANEL_W - 16}
                    height={48}
                />
            )}
            {hasHistory && totalData.some((v) => v > 0) && (
                <div className="sbpop-chart-caption">Ancho de banda total (RX+TX)</div>
            )}
            {hasHistory && totalData.some((v) => v > 0) && (
                <MiniAreaChart
                    data={totalData}
                    color="#7af7c7"
                    maxVal={Math.max(peakTotal, 1e-9)}
                    width={PANEL_W - 16}
                    height={40}
                />
            )}
            <div className="sbpop-legend">
                <span style={{ color: rxColorHex }}>▼</span> RX &nbsp;
                <span style={{ color: txColorHex }}>▲</span> TX
            </div>
        </MetricPopover>
    );
};

export const HostNetworkPanel = ({ stats, sessionHistory, anchorRect, onClose, onStay }) => {
    const accent = '#40c8ff';
    const accent2 = '#ff4fd8';
    const [expanded, setExpanded] = useState({});
    const sh = sessionHistory || [];
    const interfaces = Array.isArray(stats?.networkInterfaces) ? stats.networkInterfaces : [];
    const interfaceRows = interfaces
        .filter((row) => row && row.iface)
        .map((row) => ({
            iface: row.iface,
            ip4: row.ip4 || '',
            ip6: row.ip6 || '',
            mac: row.mac || '',
            operstate: row.operstate || '',
            rxSpeed: typeof row.rx_speed === 'number' ? row.rx_speed : 0,
            txSpeed: typeof row.tx_speed === 'number' ? row.tx_speed : 0,
        }))
        .filter((row) => String(row.operstate || '').toLowerCase() !== 'down')
        .map((row) => {
            const rxSeries = sh.map((sample) => {
                const item = (sample?.netIfaces || []).find((entry) => entry.iface === row.iface);
                return item ? (item.rx || 0) : 0;
            });
            const txSeries = sh.map((sample) => {
                const item = (sample?.netIfaces || []).find((entry) => entry.iface === row.iface);
                return item ? (item.tx || 0) : 0;
            });
            return {
                ...row,
                rxSeries,
                txSeries,
                peak: Math.max(1e-9, ...rxSeries, ...txSeries),
            };
        })
        .sort((a, b) => a.iface.localeCompare(b.iface));

    return (
        <MetricPopover anchorRect={anchorRect} onMouseEnter={onStay} onMouseLeave={onClose}>
            <div className="sbpop-header" style={{ borderBottomColor: 'rgba(64,200,255,0.25)' }}>
                <span className="sbpop-label" style={{ color: accent, textShadow: '0 0 6px rgba(64,200,255,0.6)' }}>
                    INTERFACES
                </span>
                <span className="sbpop-sublabel" style={{ color: 'rgba(255,79,216,0.75)' }}>
                    NET-MATRIX
                </span>
            </div>
            {interfaceRows.length === 0 && (
                <div className="sbpop-row sbpop-dim">
                    <span className="sbpop-key">Interfaces</span>
                    <span className="sbpop-val">Sin datos</span>
                </div>
            )}
            {interfaceRows.map((row) => (
                <div
                    key={row.iface}
                    className="sbpop-disklogical-card"
                    style={{
                        marginTop: 6,
                        borderColor: 'rgba(64,200,255,0.25)',
                        background: 'linear-gradient(180deg, rgba(64,200,255,0.08), rgba(255,79,216,0.05))',
                        boxShadow: '0 0 10px rgba(64,200,255,0.15) inset'
                    }}
                >
                    <div className="sbpop-row" style={{ paddingBottom: 1 }}>
                        <span className="sbpop-key" style={{ color: 'color-mix(in srgb, var(--ui-dialog-text) 70%, transparent)' }}>{row.iface}</span>
                        <span className="sbpop-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span>{row.operstate || '--'}</span>
                            <button
                                type="button"
                                onClick={() => setExpanded((prev) => ({ ...prev, [row.iface]: !prev[row.iface] }))}
                                aria-label={expanded[row.iface] ? `Ocultar detalles de ${row.iface}` : `Ver detalles de ${row.iface}`}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'color-mix(in srgb, var(--ui-dialog-text) 75%, transparent)',
                                    fontSize: '11px',
                                    lineHeight: 1,
                                    padding: 0,
                                    cursor: 'pointer'
                                }}
                            >
                                {expanded[row.iface] ? '▲' : '▼'}
                            </button>
                        </span>
                    </div>
                    {row.ip4 && (
                        <div className="sbpop-row sbpop-dim">
                            <span className="sbpop-key">IPv4</span>
                            <span className="sbpop-val">{row.ip4}</span>
                        </div>
                    )}
                    <div className="sbpop-row sbpop-dim">
                        <span className="sbpop-key">RX/TX</span>
                        <span className="sbpop-val" style={{ color: 'color-mix(in srgb, var(--ui-dialog-text) 70%, transparent)' }}>
                            {fmtSpeed(row.rxSpeed)} / {fmtSpeed(row.txSpeed)}
                        </span>
                    </div>
                    {sh.length > 1 && (
                        <MiniAreaChart
                            data={row.rxSeries}
                            secondData={row.txSeries}
                            color={accent}
                            secondColor={accent2}
                            maxVal={row.peak}
                            width={PANEL_W - 28}
                            height={34}
                        />
                    )}
                    {expanded[row.iface] && row.ip6 && (
                        <div className="sbpop-row sbpop-dim">
                            <span className="sbpop-key">IPv6</span>
                            <span className="sbpop-val">{row.ip6}</span>
                        </div>
                    )}
                    {expanded[row.iface] && row.mac && (
                        <div className="sbpop-row sbpop-dim">
                            <span className="sbpop-key">MAC</span>
                            <span className="sbpop-val">{row.mac}</span>
                        </div>
                    )}
                </div>
            ))}
        </MetricPopover>
    );
};

export const HostPanel = ({ stats, anchorRect, onClose, onStay }) => {
    const hostColor = '#7ab8ff';
    const hostname = stats?.hostname || 'Unknown';
    const distro = stats?.distro || 'linux';
    const versionId = stats?.versionId || '';
    const kernel = stats?.kernel || '';
    const platform = stats?.platform || '';
    const arch = stats?.arch || '';
    const osPrettyName = stats?.osPrettyName || '';
    const kernelLabel = kernel || 'N/A';
    const archLabel = arch || 'N/A';

    const distroLabel = String(distro).toUpperCase();
    const osLabel = osPrettyName || `${distroLabel}${versionId ? ` ${versionId}` : ''}`;

    return (
        <MetricPopover anchorRect={anchorRect} onMouseEnter={onStay} onMouseLeave={onClose}>
            <div className="sbpop-header">
                <span className="sbpop-label" style={{ color: hostColor }}>HOST</span>
                <span className="sbpop-sublabel">{hostname}</span>
            </div>
            <div className="sbpop-row">
                <span className="sbpop-key">Hostname</span>
                <span className="sbpop-val">{hostname}</span>
            </div>
            <div className="sbpop-row">
                <span className="sbpop-key">Sistema</span>
                <span className="sbpop-val">{osLabel}</span>
            </div>
            <div className="sbpop-row">
                <span className="sbpop-key">Kernel</span>
                <span className="sbpop-val">{kernelLabel}</span>
            </div>
            {platform && (
                <div className="sbpop-row sbpop-dim">
                    <span className="sbpop-key">Plataforma</span>
                    <span className="sbpop-val">{platform}</span>
                </div>
            )}
            <div className="sbpop-row sbpop-dim">
                <span className="sbpop-key">Arquitectura</span>
                <span className="sbpop-val">{archLabel}</span>
            </div>
        </MetricPopover>
    );
};

export const DiskPanel = ({ disk, anchorRect, onClose, onStay }) => {
    if (!disk) return null;
    const diskColor = '#ffd580';
    const label = disk.fs || disk.name || disk.mount || '?';
    const mount = disk.mount || disk.fs || '';
    const pct = disk.use ?? disk.percentage ?? 0;
    // disk.used / disk.total from worker are in GB; disk.size is not in status bar shape
    // In the status bar, used/total are not present in the StatusBar disk shape,
    // only fs, use, isNetwork. We show what we have.
    const usedGb = typeof disk.usedGb === 'number' ? disk.usedGb : null;
    const totalGb = typeof disk.totalGb === 'number' ? disk.totalGb : null;
    const freeGb = usedGb !== null && totalGb !== null ? Math.max(0, totalGb - usedGb) : null;

    return (
        <MetricPopover anchorRect={anchorRect} onMouseEnter={onStay} onMouseLeave={onClose}>
            <div className="sbpop-header">
                <span className="sbpop-label" style={{ color: diskColor }}>DISCO</span>
                {disk.isNetwork && <span className="sbpop-badge">RED</span>}
            </div>
            <div className="sbpop-bigval" style={{ color: diskColor, fontSize: '13px', letterSpacing: '0.5px' }}>
                {label}
            </div>
            {mount && mount !== label && (
                <div className="sbpop-row sbpop-dim" style={{ marginBottom: '4px' }}>
                    <span className="sbpop-key">Mount</span>
                    <span className="sbpop-val">{mount}</span>
                </div>
            )}
            <div className="sbpop-row">
                <span className="sbpop-key">Uso</span>
                <span className="sbpop-val" style={{ color: pct > 90 ? '#ff4d6d' : pct > 70 ? '#ffd580' : '#5effa0' }}>
                    {pct}%
                </span>
            </div>
            {usedGb !== null && (
                <div className="sbpop-row">
                    <span className="sbpop-key">Usado</span>
                    <span className="sbpop-val">{usedGb.toFixed(1)} GB</span>
                </div>
            )}
            {totalGb !== null && (
                <div className="sbpop-row">
                    <span className="sbpop-key">Total</span>
                    <span className="sbpop-val">{totalGb.toFixed(1)} GB</span>
                </div>
            )}
            {freeGb !== null && (
                <div className="sbpop-row">
                    <span className="sbpop-key">Libre</span>
                    <span className="sbpop-val" style={{ color: '#5effa0' }}>{freeGb.toFixed(1)} GB</span>
                </div>
            )}
            <div className="sbpop-bar-track" style={{ marginTop: '8px' }}>
                <div className="sbpop-bar-fill" style={{
                    width: `${pct}%`,
                    background: pct > 90 ? '#ff4d6d' : pct > 70 ? '#ffd580' : diskColor,
                    boxShadow: `0 0 6px ${diskColor}66`
                }} />
            </div>
        </MetricPopover>
    );
};

const getDiskLabel = (disk) => disk?.fs || disk?.name || disk?.mount || '?';

const getPhysicalKey = (disk) => {
    const fs = String(disk?.fs || '');
    const mount = String(disk?.mount || '');
    const identity = fs || mount;

    // Windows: C:, D:, ...
    const letter = identity.match(/^[A-Z]:/i);
    if (letter) return letter[0].toUpperCase();

    // Linux/macOS: /dev/sda1 -> /dev/sda, /dev/nvme0n1p2 -> /dev/nvme0n1
    if (fs.startsWith('/dev/')) {
        const base = fs.replace(/p?\d+$/, '');
        return base || fs;
    }

    // Network shares: group by host/share prefix when possible
    if (identity.startsWith('\\\\') || identity.startsWith('//')) {
        const normalized = identity.replace(/\\/g, '/');
        const parts = normalized.split('/').filter(Boolean);
        if (parts.length >= 2) return `//${parts[0]}/${parts[1]}`;
        return normalized;
    }

    // Fallback by mount root, then label
    if (mount && mount !== '/') return mount.split('/')[1] ? `/${mount.split('/')[1]}` : mount;
    return identity || '?';
};

export const buildDiskGroups = (disks) => {
    const groups = new Map();
    (Array.isArray(disks) ? disks : []).forEach((disk) => {
        const key = getPhysicalKey(disk);
        const list = groups.get(key) || [];
        list.push(disk);
        groups.set(key, list);
    });

    return Array.from(groups.entries()).map(([key, logicals]) => {
        const avgUse = logicals.length
            ? Math.round(logicals.reduce((acc, d) => acc + Number(d?.use ?? d?.percentage ?? 0), 0) / logicals.length)
            : 0;
        const isNetwork = logicals.some((d) => Boolean(d?.isNetwork));
        return { key, logicals, avgUse, isNetwork };
    });
};

export const DiskPhysicalPanel = ({ group, anchorRect, onClose, onStay }) => {
    if (!group) return null;
    const diskColor = '#ffd580';

    return (
        <MetricPopover anchorRect={anchorRect} onMouseEnter={onStay} onMouseLeave={onClose}>
            <div className="sbpop-header">
                <span className="sbpop-label" style={{ color: diskColor }}>DISCO</span>
                <span className="sbpop-sublabel">{group.key}</span>
            </div>
            <div className="sbpop-row">
                <span className="sbpop-key">Uso medio</span>
                <span className="sbpop-val" style={{ color: group.avgUse > 90 ? '#ff4d6d' : group.avgUse > 70 ? '#ffd580' : '#5effa0' }}>
                    {group.avgUse}%
                </span>
            </div>
            {group.logicals.map((logical, index) => {
                const pct = Number(logical?.use ?? logical?.percentage ?? 0);
                const label = getDiskLabel(logical);
                return (
                    <div key={`${group.key}-${index}`} className="sbpop-row">
                        <span className="sbpop-key">{label}</span>
                        <span className="sbpop-val">{pct}%</span>
                    </div>
                );
            })}
        </MetricPopover>
    );
};

export const DiskSummaryPanel = ({ disks, title = 'DISCOS', anchorRect, onClose, onStay }) => {
    const diskColor = '#ffd580';
    const groups = buildDiskGroups(disks);

    return (
        <MetricPopover anchorRect={anchorRect} onMouseEnter={onStay} onMouseLeave={onClose}>
            <div className="sbpop-header">
                <span className="sbpop-label" style={{ color: diskColor }}>{title}</span>
                <span className="sbpop-sublabel">{groups.length} fisicos</span>
            </div>
            {groups.length === 0 && (
                <div className="sbpop-row sbpop-dim">
                    <span className="sbpop-key">Sin datos de disco</span>
                    <span className="sbpop-val">--</span>
                </div>
            )}
            {groups.map((group) => (
                <div key={group.key} className="sbpop-diskgroup">
                    <div className="sbpop-row sbpop-diskgroup-header">
                        <span className="sbpop-key">
                            {group.key}
                            {group.isNetwork ? ' (RED)' : ''}
                        </span>
                        <span className="sbpop-val" style={{ color: group.avgUse > 90 ? '#ff4d6d' : group.avgUse > 70 ? '#ffd580' : '#5effa0' }}>
                            {group.avgUse}%
                        </span>
                    </div>
                    <div className="sbpop-diskgroup-logicals sbpop-diskgroup-logicals-open sbpop-diskgroup-details">
                        {group.logicals.map((logical, index) => {
                            const pct = Number(logical?.use ?? logical?.percentage ?? 0);
                            const usedGb = typeof logical?.usedGb === 'number' ? logical.usedGb : null;
                            const totalGb = typeof logical?.totalGb === 'number' ? logical.totalGb : null;
                            const freeGb = usedGb !== null && totalGb !== null ? Math.max(0, totalGb - usedGb) : null;
                            const mount = logical?.mount || '';
                            return (
                                <div key={`${group.key}-${index}`} className="sbpop-disklogical-card">
                                    {group.logicals.length > 1 && (
                                        <div className="sbpop-row sbpop-disklogical-header">
                                            <span className="sbpop-key">{getDiskLabel(logical)}</span>
                                            <span className="sbpop-val">{pct}%</span>
                                        </div>
                                    )}
                                    <div className="sbpop-disklogical-details">
                                        {mount && (
                                            <div className="sbpop-row sbpop-dim">
                                                <span className="sbpop-key">Mount</span>
                                                <span className="sbpop-val">{mount}</span>
                                            </div>
                                        )}
                                        {(usedGb !== null && totalGb !== null) ? (
                                            <>
                                                <div className="sbpop-row">
                                                    <span className="sbpop-key">Uso</span>
                                                    <span className="sbpop-val">{usedGb.toFixed(1)} GB / {totalGb.toFixed(1)} GB</span>
                                                </div>
                                                {freeGb !== null && (
                                                    <div className="sbpop-row sbpop-dim">
                                                        <span className="sbpop-key">Libre</span>
                                                        <span className="sbpop-val" style={{ color: '#5effa0' }}>{freeGb.toFixed(1)} GB</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="sbpop-row sbpop-dim">
                                                <span className="sbpop-key">Capacidad</span>
                                                <span className="sbpop-val">No disponible</span>
                                            </div>
                                        )}
                                        <div className="sbpop-bar-track" style={{ marginTop: '4px' }}>
                                            <div className="sbpop-bar-fill" style={{
                                                width: `${pct}%`,
                                                background: pct > 90 ? '#ff4d6d' : pct > 70 ? '#ffd580' : diskColor,
                                                boxShadow: `0 0 6px ${diskColor}66`
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            <div className="sbpop-legend">Se muestran particiones con uso y capacidad</div>
        </MetricPopover>
    );
};

// ─── Hook to manage popover state ────────────────────────────────────────────

export function useMetricPopover() {
    const [open, setOpen] = useState(null); // null | { type, diskIndex, rect }
    const timerRef = useRef(null);
    const leaveTimerRef = useRef(null);

    const openPopover = (type, rect, diskIndex = 0) => {
        clearTimeout(leaveTimerRef.current);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setOpen({ type, diskIndex, rect }), 120);
    };

    const closePopover = () => {
        clearTimeout(timerRef.current);
        leaveTimerRef.current = setTimeout(() => setOpen(null), 150);
    };

    const cancelClose = () => clearTimeout(leaveTimerRef.current);

    useEffect(() => () => {
        clearTimeout(timerRef.current);
        clearTimeout(leaveTimerRef.current);
    }, []);

    return { open, openPopover, closePopover, cancelClose };
}
