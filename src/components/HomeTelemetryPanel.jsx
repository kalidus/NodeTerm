import React, { useState, useEffect, useRef, useCallback } from 'react';
import { systemStatsService } from '../services/SystemStatsService';
import { useStatusBarSessionHistory } from '../hooks/useStatusBarSessionHistory';
import {
  useMetricPopover,
  CpuPanel,
  MemPanel,
  NetPanel,
  HostNetworkPanel,
  DiskSummaryPanel,
  HostPanel,
  GpuPanel
} from './StatusBarMetricPopover';

/**
 * Formatea bytes por segundo a string legible (KB/s, MB/s, GB/s)
 */
function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || isNaN(bytesPerSec) || bytesPerSec <= 0) return '0.0 KB/s';
  const kb = bytesPerSec / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB/s`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB/s`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB/s`;
}

/**
 * Formatea bytes a GB
 */
function bytesToGb(bytes) {
  if (!bytes || isNaN(bytes)) return '0.0';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

/**
 * Dibuja un gráfico sparkline estilo HUD Cyberpunk en Canvas con soporte HiDPI y auto-resizing
 */
const CyberSparkline = ({ data = [], color = '#00f2ff', height = 24, max = 100 }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 140, height });

  // Escuchar cambios de tamaño del contenedor con ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0) {
          setSize({ width: cr.width, height: height });
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = size.width;
    const h = size.height;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    if (!data || data.length < 2) return;

    const step = w / (data.length - 1);
    const peak = max > 0 ? max : Math.max(...data, 1);

    // Gradiente de relleno
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `${color}55`);
    grad.addColorStop(1, `${color}00`);

    ctx.beginPath();
    data.forEach((val, idx) => {
      const normalized = Math.max(0, Math.min(peak, val || 0));
      const y = h - (normalized / peak) * (h - 4) - 2;
      const x = idx * step;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    // Línea principal con brillo
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
    ctx.stroke();

    // Relleno inferior
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.shadowBlur = 0;
    ctx.fill();
  }, [data, color, size, max]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: `${height}px`, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px`, display: 'block' }}
      />
    </div>
  );
};

const HomeTelemetryPanel = ({
  themeColors = {},
  terminalTheme = {},
  pollingIntervalMs = 2500
}) => {
  const rootRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 340, height: 260 });
  const [stats, setStats] = useState(null);
  const [gpuStats, setGpuStats] = useState(null);
  const [cpuHistory, setCpuHistory] = useState([15, 20, 18, 25, 22, 30, 24, 28, 35, 20, 18, 25]);
  const [netRxHistory, setNetRxHistory] = useState([0, 10, 5, 20, 15, 30, 25, 40, 30, 50]);

  // Hook de gestión de popovers interactivos al pasar el ratón (hover)
  const { open: popOpen, openPopover, closePopover, cancelClose } = useMetricPopover();

  // Histórico continuo de sesión para métricas de CPU, RAM, Red, GPU
  const sessionHistory = useStatusBarSessionHistory(stats, { gpuStats });

  // Colores principales derivados del tema con acentos Cyberpunk
  const primaryColor = themeColors.primaryColor || terminalTheme.green || '#00f2ff';
  const secondaryColor = terminalTheme.cyan || '#00d2ff';
  const warnColor = '#ffb300';
  const dangerColor = '#ff3366';

  // Observador de redimensionamiento del contenedor principal
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Suscripción al servicio centralizado de telemetría
  useEffect(() => {
    let stopped = false;
    let lastGpuAt = 0;

    const unsubscribe = systemStatsService.subscribe(async (systemStatsPayload) => {
      if (!systemStatsPayload || stopped) return;
      const cpuUsage = systemStatsPayload.cpu || 0;
      const rxBytes = systemStatsPayload.network?.rx_speed || 0;
      const txBytes = systemStatsPayload.network?.tx_speed || 0;

      const now = Date.now();
      if (now - lastGpuAt >= Math.max(1500, pollingIntervalMs)) {
        lastGpuAt = now;
        try {
          const gpuData = await window.electron?.system?.getGPUStats();
          if (!stopped) setGpuStats(gpuData?.ok ? gpuData : null);
        } catch {
          if (!stopped) setGpuStats(null);
        }
      }

      const memTotal = systemStatsPayload.mem?.total || 0;
      const memUsed = systemStatsPayload.mem?.used || 0;
      const memFree = systemStatsPayload.mem?.free || 0;

      const payload = {
        cpu: cpuUsage,
        cpuMeta: systemStatsPayload.cpuMeta || {
          model: systemStatsPayload.cpuMeta?.model || '',
          cores: systemStatsPayload.cpuMeta?.cores || 4,
          perCpuLoad: systemStatsPayload.cpuMeta?.perCpuLoad || []
        },
        cores: systemStatsPayload.cpuMeta?.cores || 4,
        perCpuLoad: systemStatsPayload.cpuMeta?.perCpuLoad || [],
        mem: { total: memTotal, used: memUsed, free: memFree },
        memPercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0,
        disks: systemStatsPayload.raw?.disks || systemStatsPayload.disk || [],
        network: { rx_speed: rxBytes, tx_speed: txBytes, rx: rxBytes, tx: txBytes },
        networkInterfaces: systemStatsPayload.networkInterfaces || [],
        hostname: systemStatsPayload.hostname || 'localhost',
        uptime: systemStatsPayload.uptime || '',
        distro: systemStatsPayload.distro || 'linux',
        kernel: systemStatsPayload.kernel || '',
        arch: systemStatsPayload.arch || '',
        platform: systemStatsPayload.platform || 'win32',
        osPrettyName: systemStatsPayload.osPrettyName || systemStatsPayload.platform || 'Linux/Windows',
        raw: systemStatsPayload.raw || systemStatsPayload
      };

      if (!stopped) {
        setStats(payload);
        setCpuHistory((prev) => [...prev.slice(-20), cpuUsage]);
        setNetRxHistory((prev) => [...prev.slice(-20), rxBytes / 1024]);
      }
    });

    return () => {
      stopped = true;
      unsubscribe();
    };
  }, [pollingIntervalMs]);

  const cpuLoad = stats?.cpu || 0;
  const memUsedGb = bytesToGb(stats?.mem?.used);
  const memTotalGb = bytesToGb(stats?.mem?.total);
  const memPct = stats?.memPercent || 0;
  const rxSpeed = formatSpeed(stats?.network?.rx_speed || stats?.network?.rx);
  const txSpeed = formatSpeed(stats?.network?.tx_speed || stats?.network?.tx);

  const getStatusColor = useCallback((percent) => {
    if (percent > 85) return dangerColor;
    if (percent > 65) return warnColor;
    return primaryColor;
  }, [dangerColor, warnColor, primaryColor]);

  // Modos de visualización según dimensiones
  const isUltraCompact = dimensions.height < 135 || dimensions.width < 240;
  const isCompactHeight = dimensions.height < 190;
  const isNarrow = dimensions.width < 340;

  const sparklineHeight = isUltraCompact ? 14 : isCompactHeight ? 20 : 26;

  // Manejadores de hover para popovers
  const handleCardHover = (type, e, extraIdx = 0) => {
    const rect = e.currentTarget.getBoundingClientRect();
    openPopover(type, rect, extraIdx);
  };

  return (
    <div
      ref={rootRef}
      className={`cyber-telemetry-root ${isUltraCompact ? 'is-ultra-compact' : ''} ${isCompactHeight ? 'is-compact-height' : ''} ${isNarrow ? 'is-narrow' : ''}`}
    >
      <style>{`
        .cyber-telemetry-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 8px 10px;
          box-sizing: border-box;
          gap: 6px;
          overflow-y: auto;
          overflow-x: hidden;
          font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
          color: #e0e6ed;
          background: radial-gradient(circle at 85% 15%, rgba(0, 242, 255, 0.05) 0%, transparent 65%);
          position: relative;
          scrollbar-width: none !important;
          user-select: none;
        }
        .cyber-telemetry-root::-webkit-scrollbar {
          display: none !important;
        }

        /* Variaciones compactas */
        .cyber-telemetry-root.is-compact-height {
          padding: 5px 7px;
          gap: 4px;
        }
        .cyber-telemetry-root.is-ultra-compact {
          padding: 3px 5px;
          gap: 3px;
        }

        /* Cyber HUD Header */
        .cyber-hud-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 3px 8px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-left: 3px solid ${primaryColor};
          border-radius: 4px;
          font-size: 0.7rem;
          flex-shrink: 0;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .cyber-hud-header:hover {
          background: rgba(0, 242, 255, 0.08);
          border-color: rgba(0, 242, 255, 0.3);
        }
        .cyber-telemetry-root.is-ultra-compact .cyber-hud-header {
          padding: 1px 5px;
          font-size: 0.62rem;
        }

        .cyber-status-pulse {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${primaryColor};
          box-shadow: 0 0 8px ${primaryColor};
          margin-right: 6px;
          animation: cyber-blink 1.8s infinite ease-in-out;
        }
        @keyframes cyber-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.85); }
        }

        /* Grid de Módulos */
        .cyber-modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
          gap: 6px;
          flex: 1;
          min-height: 0;
        }
        .cyber-telemetry-root.is-ultra-compact .cyber-modules-grid {
          gap: 4px;
          grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
        }

        /* Tarjeta de Módulo Sci-Fi */
        .cyber-card {
          background: rgba(15, 20, 28, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 5px;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          backdrop-filter: blur(8px);
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .cyber-card:hover {
          border-color: rgba(0, 242, 255, 0.45);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), inset 0 0 10px rgba(0, 242, 255, 0.05);
          transform: translateY(-1px);
        }
        .cyber-telemetry-root.is-ultra-compact .cyber-card {
          padding: 4px 6px;
        }

        .cyber-card-title {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cyber-telemetry-root.is-ultra-compact .cyber-card-title {
          font-size: 0.58rem;
          margin-bottom: 1px;
        }

        .cyber-card-val {
          font-size: 1rem;
          font-weight: 800;
          color: #fff;
          display: flex;
          align-items: baseline;
          gap: 4px;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
          line-height: 1.1;
        }
        .cyber-telemetry-root.is-ultra-compact .cyber-card-val {
          font-size: 0.85rem;
        }
        .cyber-card-val small {
          font-size: 0.65rem;
          font-weight: 500;
          opacity: 0.7;
        }

        /* Barra de Progreso */
        .cyber-meter-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
          margin-top: 3px;
        }
        .cyber-meter-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 6px currentColor;
        }

        /* Matriz de Núcleos CPU */
        .cpu-cores-matrix {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(18px, 1fr));
          gap: 2px;
          margin-top: 4px;
        }
        .cpu-core-cell {
          height: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .cpu-core-fill {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          transition: height 0.3s;
        }

        /* Tráfico de Red */
        .net-stats-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2px;
          font-size: 0.68rem;
          font-weight: 600;
        }
        .net-stat-badge {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        /* Discos */
        .disks-grid {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 2px;
        }
        .disk-row {
          display: flex;
          flex-direction: column;
          gap: 1px;
          font-size: 0.64rem;
        }
        .disk-row-header {
          display: flex;
          justify-content: space-between;
          opacity: 0.85;
        }
      `}</style>

      {/* Header HUD Superior (Interactivo al pasar el ratón) */}
      <div
        className="cyber-hud-header"
        onMouseEnter={(e) => handleCardHover('host', e)}
        onMouseLeave={closePopover}
        title="Ver información del sistema operativo y host"
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="cyber-status-pulse" />
          <span style={{ fontWeight: 700, letterSpacing: '0.8px', color: primaryColor }}>
            SYS.MON // TELEMETRY
          </span>
        </div>
        <div style={{ opacity: 0.8, display: 'flex', gap: '8px', fontSize: '0.66rem' }}>
          <span>HOST: <strong style={{ color: '#fff' }}>{stats?.hostname || 'Node'}</strong></span>
          {stats?.uptime && <span>· UP: {stats.uptime}</span>}
        </div>
      </div>

      {/* Grid de Módulos Adaptable */}
      <div className="cyber-modules-grid">
        {/* 1. Módulo CPU */}
        <div
          className="cyber-card"
          onMouseEnter={(e) => handleCardHover('cpu', e)}
          onMouseLeave={closePopover}
          title="CPU · Pasa el ratón para ver histórico y núcleos"
        >
          <div>
            <div className="cyber-card-title">
              <span><i className="pi pi-bolt" style={{ color: getStatusColor(cpuLoad), marginRight: 4 }} /> CPU</span>
              <span style={{ color: getStatusColor(cpuLoad) }}>{cpuLoad}%</span>
            </div>
            <div className="cyber-card-val" style={{ color: getStatusColor(cpuLoad) }}>
              {cpuLoad}<small>%</small>
            </div>
          </div>

          <div className="cyber-meter-track">
            <div
              className="cyber-meter-fill"
              style={{
                width: `${Math.min(100, Math.max(0, cpuLoad))}%`,
                background: getStatusColor(cpuLoad),
                color: getStatusColor(cpuLoad)
              }}
            />
          </div>

          {/* Sparkline de CPU adaptable */}
          <div style={{ marginTop: '3px' }}>
            <CyberSparkline data={cpuHistory} color={getStatusColor(cpuLoad)} height={sparklineHeight} />
          </div>

          {/* Matriz de núcleos (solo en modo expandido) */}
          {!isCompactHeight && stats?.perCpuLoad && stats.perCpuLoad.length > 0 && (
            <div className="cpu-cores-matrix">
              {stats.perCpuLoad.slice(0, 16).map((load, i) => (
                <div key={i} className="cpu-core-cell" title={`Core #${i + 1}: ${load}%`}>
                  <div
                    className="cpu-core-fill"
                    style={{
                      height: `${Math.min(100, Math.max(8, load))}%`,
                      background: getStatusColor(load)
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Módulo Memoria RAM */}
        <div
          className="cyber-card"
          onMouseEnter={(e) => handleCardHover('mem', e)}
          onMouseLeave={closePopover}
          title="RAM · Pasa el ratón para ver desglose e histórico"
        >
          <div>
            <div className="cyber-card-title">
              <span><i className="pi pi-database" style={{ color: getStatusColor(memPct), marginRight: 4 }} /> RAM</span>
              <span style={{ color: getStatusColor(memPct) }}>{memPct}%</span>
            </div>
            <div className="cyber-card-val" style={{ color: getStatusColor(memPct) }}>
              {memUsedGb}<small>/ {memTotalGb} GB</small>
            </div>
          </div>

          <div className="cyber-meter-track">
            <div
              className="cyber-meter-fill"
              style={{
                width: `${Math.min(100, Math.max(0, memPct))}%`,
                background: getStatusColor(memPct),
                color: getStatusColor(memPct)
              }}
            />
          </div>

          {/* Información secundaria de RAM o GPU */}
          {!isUltraCompact && (
            <div style={{ marginTop: '4px', fontSize: '0.64rem', display: 'flex', justifyContent: 'space-between', opacity: 0.75 }}>
              <span>Libre: {bytesToGb(stats?.mem?.free)} GB</span>
              <span>Uso: {memPct}%</span>
            </div>
          )}

          {!isCompactHeight && gpuStats?.gpuUsage != null && (
            <div
              style={{ marginTop: '3px', paddingTop: '3px', borderTop: '1px dashed rgba(255,255,255,0.08)', fontSize: '0.64rem', display: 'flex', justifyContent: 'space-between', color: secondaryColor }}
              onMouseEnter={(e) => { e.stopPropagation(); handleCardHover('gpu', e); }}
            >
              <span><i className="pi pi-desktop" style={{ marginRight: 4 }} /> GPU:</span>
              <strong>{gpuStats.gpuUsage}%</strong>
            </div>
          )}
        </div>

        {/* 3. Módulo Tráfico de Red */}
        <div
          className="cyber-card"
          onMouseEnter={(e) => handleCardHover('net', e)}
          onMouseLeave={closePopover}
          title="RED · Pasa el ratón para ver interfaces e histórico"
        >
          <div>
            <div className="cyber-card-title">
              <span><i className="pi pi-wifi" style={{ color: '#00f2ff', marginRight: 4 }} /> RED</span>
            </div>
            <div className="net-stats-row">
              <div className="net-stat-badge" style={{ color: '#39ff14' }}>
                <i className="pi pi-arrow-down" style={{ fontSize: '0.6rem' }} />
                <span>{rxSpeed}</span>
              </div>
              <div className="net-stat-badge" style={{ color: '#00f2ff' }}>
                <i className="pi pi-arrow-up" style={{ fontSize: '0.6rem' }} />
                <span>{txSpeed}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '4px' }}>
            <CyberSparkline
              data={netRxHistory}
              color="#39ff14"
              height={sparklineHeight}
              max={Math.max(...netRxHistory, 50)}
            />
          </div>
        </div>

        {/* 4. Módulo Unidades de Disco */}
        <div
          className="cyber-card"
          onMouseEnter={(e) => handleCardHover('disk-summary', e)}
          onMouseLeave={closePopover}
          title="DISCOS · Pasa el ratón para ver todas las unidades"
        >
          <div>
            <div className="cyber-card-title">
              <span><i className="pi pi-folder" style={{ color: '#ffb300', marginRight: 4 }} /> DISCOS</span>
              <span>{stats?.disks?.length || 1} U</span>
            </div>
          </div>

          <div className="disks-grid">
            {(stats?.disks && stats.disks.length > 0
              ? isCompactHeight
                ? stats.disks.slice(0, 1)
                : stats.disks.slice(0, 3)
              : [{ fs: 'Root', mount: '/', percentage: 45, used: 120, total: 500 }]
            ).map((d, i) => {
              const dPct = d.percentage ?? d.use ?? 0;
              const dColor = getStatusColor(dPct);
              const label = d.mount || d.fs || `Drive ${i + 1}`;
              return (
                <div key={i} className="disk-row">
                  <div className="disk-row-header">
                    <span><strong>{label}</strong></span>
                    <span>{d.used || d.usedGb || '?'}/{d.total || d.totalGb || '?'} GB ({dPct}%)</span>
                  </div>
                  <div className="cyber-meter-track" style={{ height: '3px', margin: '2px 0 1px 0' }}>
                    <div
                      className="cyber-meter-fill"
                      style={{
                        width: `${Math.min(100, Math.max(0, dPct))}%`,
                        background: dColor,
                        color: dColor
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {isCompactHeight && stats?.disks && stats.disks.length > 1 && (
            <div style={{ fontSize: '0.58rem', opacity: 0.6, textAlign: 'right', marginTop: '1px' }}>
              +{stats.disks.length - 1} más...
            </div>
          )}
        </div>
      </div>

      {/* Renderizado de Popovers Interactivos mediante Portal */}
      {popOpen?.type === 'cpu' && (
        <CpuPanel
          stats={stats}
          sessionHistory={sessionHistory}
          anchorRect={popOpen.rect}
          onClose={closePopover}
          onStay={cancelClose}
        />
      )}
      {popOpen?.type === 'mem' && (
        <MemPanel
          stats={stats}
          sessionHistory={sessionHistory}
          anchorRect={popOpen.rect}
          onClose={closePopover}
          onStay={cancelClose}
        />
      )}
      {popOpen?.type === 'net' && (
        <NetPanel
          stats={stats}
          sessionHistory={sessionHistory}
          anchorRect={popOpen.rect}
          onClose={closePopover}
          onStay={cancelClose}
        />
      )}
      {popOpen?.type === 'host-net' && (
        <HostNetworkPanel
          stats={stats}
          sessionHistory={sessionHistory}
          anchorRect={popOpen.rect}
          onClose={closePopover}
          onStay={cancelClose}
        />
      )}
      {popOpen?.type === 'disk-summary' && (
        <DiskSummaryPanel
          disks={stats?.disks || stats?.raw?.disks || []}
          title="ALMACENAMIENTO"
          anchorRect={popOpen.rect}
          onClose={closePopover}
          onStay={cancelClose}
        />
      )}
      {popOpen?.type === 'host' && (
        <HostPanel
          stats={stats}
          anchorRect={popOpen.rect}
          onClose={closePopover}
          onStay={cancelClose}
        />
      )}
      {popOpen?.type === 'gpu' && gpuStats && (
        <GpuPanel
          gpuStats={gpuStats}
          sessionHistory={sessionHistory}
          anchorRect={popOpen.rect}
          onClose={closePopover}
          onStay={cancelClose}
        />
      )}
    </div>
  );
};

export default React.memo(HomeTelemetryPanel);
