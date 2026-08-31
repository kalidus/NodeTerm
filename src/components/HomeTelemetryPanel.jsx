import React, { useState, useEffect, useRef } from 'react';

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
 * Dibuja un gráfico sparkline estilo HUD Cyberpunk en Canvas
 */
const CyberSparkline = ({ data = [], color = '#00f2ff', height = 32, max = 100 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!data || data.length < 2) return;

    const step = w / (data.length - 1);

    // Gradiente de relleno
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `${color}44`);
    grad.addColorStop(1, `${color}00`);

    ctx.beginPath();
    data.forEach((val, idx) => {
      const normalized = Math.max(0, Math.min(max, val || 0));
      const y = h - (normalized / max) * (h - 4) - 2;
      const x = idx * step;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    // Línea principal con brillo
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.stroke();

    // Relleno inferior
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.shadowBlur = 0;
    ctx.fill();
  }, [data, color, height, max]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={height}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  );
};

const HomeTelemetryPanel = ({
  themeColors = {},
  terminalTheme = {},
  pollingIntervalMs = 2500
}) => {
  const [stats, setStats] = useState(null);
  const [gpuStats, setGpuStats] = useState(null);
  const [cpuHistory, setCpuHistory] = useState([15, 20, 18, 25, 22, 30, 24, 28, 35, 20, 18, 25]);
  const [netRxHistory, setNetRxHistory] = useState([0, 10, 5, 20, 15, 30, 25, 40, 30, 50]);
  const [netTxHistory, setNetTxHistory] = useState([0, 5, 2, 10, 8, 15, 12, 20, 15, 25]);

  // Colores principales derivados del tema con acentos Cyberpunk
  const primaryColor = themeColors.primaryColor || terminalTheme.green || '#00f2ff';
  const secondaryColor = terminalTheme.cyan || '#00d2ff';
  const warnColor = '#ffb300';
  const dangerColor = '#ff3366';

  useEffect(() => {
    let stopped = false;
    let timer = null;

    const fetchStats = async () => {
      try {
        const systemStats = await window.electronAPI?.getSystemStats();
        if (!systemStats || stopped) return;

        const memTotal = (systemStats.memory?.total || 0) * 1024 * 1024 * 1024;
        const memUsed = (systemStats.memory?.used || 0) * 1024 * 1024 * 1024;
        const memFree = (systemStats.memory?.free || 0) * 1024 * 1024 * 1024;
        const cpuUsage = Math.round((systemStats.cpu?.usage || 0) * 10) / 10;

        const rxBytes = ((systemStats.network?.download || 0) * 1000000) / 8;
        const txBytes = ((systemStats.network?.upload || 0) * 1000000) / 8;

        try {
          const gpuData = await window.electron?.system?.getGPUStats();
          if (!stopped) setGpuStats(gpuData?.ok ? gpuData : null);
        } catch {
          if (!stopped) setGpuStats(null);
        }

        const payload = {
          cpu: cpuUsage,
          cpuModel: systemStats.cpu?.model || '',
          cores: systemStats.cpu?.cores || 4,
          perCpuLoad: Array.isArray(systemStats.cpu?.perCpuLoad) ? systemStats.cpu.perCpuLoad : [],
          mem: { total: memTotal, used: memUsed, free: memFree },
          memPercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0,
          disks: Array.isArray(systemStats.disks) ? systemStats.disks : [],
          network: { rx: rxBytes, tx: txBytes },
          hostname: systemStats.hostname || 'localhost',
          uptime: systemStats.uptime || '',
          os: systemStats.osPrettyName || systemStats.platform || 'Linux/Windows'
        };

        if (!stopped) {
          setStats(payload);
          setCpuHistory((prev) => [...prev.slice(-20), cpuUsage]);
          setNetRxHistory((prev) => [...prev.slice(-20), rxBytes / 1024]);
          setNetTxHistory((prev) => [...prev.slice(-20), txBytes / 1024]);
        }
      } catch (err) {
        console.warn('[HomeTelemetryPanel] Error fetching stats:', err);
      }
    };

    fetchStats();
    timer = setInterval(fetchStats, pollingIntervalMs);

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };
  }, [pollingIntervalMs]);

  const cpuLoad = stats?.cpu || 0;
  const memUsedGb = bytesToGb(stats?.mem?.used);
  const memTotalGb = bytesToGb(stats?.mem?.total);
  const memPct = stats?.memPercent || 0;
  const rxSpeed = formatSpeed(stats?.network?.rx);
  const txSpeed = formatSpeed(stats?.network?.tx);

  const getStatusColor = (percent) => {
    if (percent > 85) return dangerColor;
    if (percent > 65) return warnColor;
    return primaryColor;
  };

  return (
    <div className="cyber-telemetry-root">
      <style>{`
        .cyber-telemetry-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 8px 10px;
          box-sizing: border-box;
          gap: 8px;
          overflow-y: auto;
          overflow-x: hidden;
          font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
          color: #e0e6ed;
          background: radial-gradient(circle at 85% 15%, rgba(0, 242, 255, 0.05) 0%, transparent 65%);
          position: relative;
          scrollbar-width: none !important;
        }
        .cyber-telemetry-root::-webkit-scrollbar {
          display: none !important;
        }

        /* Cyber HUD Header */
        .cyber-hud-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 3px 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-left: 3px solid ${primaryColor};
          border-radius: 4px;
          font-size: 0.7rem;
          flex-shrink: 0;
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
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 8px;
          flex: 1;
          min-height: 0;
        }

        /* Tarjeta de Módulo Sci-Fi */
        .cyber-card {
          background: rgba(15, 20, 28, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          padding: 7px 9px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          backdrop-filter: blur(8px);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .cyber-card:hover {
          border-color: rgba(0, 242, 255, 0.3);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), inset 0 0 12px rgba(0, 242, 255, 0.03);
        }
        .cyber-card-title {
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .cyber-card-val {
          font-size: 1.05rem;
          font-weight: 800;
          color: #fff;
          display: flex;
          align-items: baseline;
          gap: 4px;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
        }
        .cyber-card-val small {
          font-size: 0.68rem;
          font-weight: 500;
          opacity: 0.7;
        }

        /* Barra de Progreso Segmentada Cyberpunk */
        .cyber-meter-track {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 3px;
          overflow: hidden;
          position: relative;
          margin-top: 4px;
        }
        .cyber-meter-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 8px currentColor;
        }

        /* Matriz de Núcleos CPU */
        .cpu-cores-matrix {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(20px, 1fr));
          gap: 2px;
          margin-top: 4px;
        }
        .cpu-core-cell {
          height: 12px;
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
          font-size: 0.72rem;
        }
        .net-stat-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        /* Discos Compactos */
        .disks-grid {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: 3px;
        }
        .disk-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.68rem;
        }
        .disk-row-header {
          display: flex;
          justify-content: space-between;
          opacity: 0.8;
        }
      `}</style>

      {/* Header HUD Superior */}
      <div className="cyber-hud-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="cyber-status-pulse" />
          <span style={{ fontWeight: 700, letterSpacing: '0.8px', color: primaryColor }}>
            SYS.MON // TELEMETRY
          </span>
        </div>
        <div style={{ opacity: 0.75, display: 'flex', gap: '8px' }}>
          <span>HOST: <strong style={{ color: '#fff' }}>{stats?.hostname || 'Node'}</strong></span>
          {stats?.uptime && <span>· UP: {stats.uptime}</span>}
        </div>
      </div>

      {/* Grid de Módulos */}
      <div className="cyber-modules-grid">
        {/* 1. Módulo CPU */}
        <div className="cyber-card">
          <div className="cyber-card-title">
            <span><i className="pi pi-bolt" style={{ color: getStatusColor(cpuLoad), marginRight: 4 }} /> PROCESADOR (CPU)</span>
            <span style={{ color: getStatusColor(cpuLoad) }}>{cpuLoad}%</span>
          </div>
          <div className="cyber-card-val" style={{ color: getStatusColor(cpuLoad) }}>
            {cpuLoad}<small>%</small>
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

          {/* Gráfico Sparkline de CPU */}
          <div style={{ marginTop: '4px' }}>
            <CyberSparkline data={cpuHistory} color={getStatusColor(cpuLoad)} height={24} />
          </div>

          {/* Per-Core Load Matrix */}
          {stats?.perCpuLoad && stats.perCpuLoad.length > 0 && (
            <div className="cpu-cores-matrix" title="Carga por núcleo individual">
              {stats.perCpuLoad.slice(0, 16).map((load, i) => {
                const cColor = getStatusColor(load);
                return (
                  <div key={i} className="cpu-core-cell" title={`Core #${i + 1}: ${load}%`}>
                    <div
                      className="cpu-core-fill"
                      style={{
                        height: `${Math.min(100, Math.max(8, load))}%`,
                        background: cColor
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Módulo Memoria RAM */}
        <div className="cyber-card">
          <div className="cyber-card-title">
            <span><i className="pi pi-database" style={{ color: getStatusColor(memPct), marginRight: 4 }} /> MEMORIA (RAM)</span>
            <span style={{ color: getStatusColor(memPct) }}>{memPct}%</span>
          </div>
          <div className="cyber-card-val" style={{ color: getStatusColor(memPct) }}>
            {memUsedGb}<small>/ {memTotalGb} GB</small>
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

          <div style={{ marginTop: '6px', fontSize: '0.68rem', display: 'flex', justifyContent: 'space-between', opacity: 0.7 }}>
            <span>Libre: {bytesToGb(stats?.mem?.free)} GB</span>
            <span>Uso: {memPct}%</span>
          </div>

          {gpuStats?.gpuUsage != null && (
            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.08)', fontSize: '0.68rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: secondaryColor }}>
                <span><i className="pi pi-desktop" style={{ marginRight: 4 }} /> GPU LOAD:</span>
                <strong>{gpuStats.gpuUsage}%</strong>
              </div>
            </div>
          )}
        </div>

        {/* 3. Módulo Tráfico de Red */}
        <div className="cyber-card">
          <div className="cyber-card-title">
            <span><i className="pi pi-wifi" style={{ color: '#00f2ff', marginRight: 4 }} /> TRÁFICO RED (I/O)</span>
          </div>
          <div className="net-stats-row">
            <div className="net-stat-badge" style={{ color: '#39ff14' }}>
              <i className="pi pi-arrow-down" />
              <span>{rxSpeed}</span>
            </div>
            <div className="net-stat-badge" style={{ color: '#00f2ff' }}>
              <i className="pi pi-arrow-up" />
              <span>{txSpeed}</span>
            </div>
          </div>

          <div style={{ marginTop: '6px' }}>
            <CyberSparkline data={netRxHistory} color="#39ff14" height={26} max={Math.max(...netRxHistory, 50)} />
          </div>
        </div>

        {/* 4. Módulo Unidades de Disco */}
        <div className="cyber-card">
          <div className="cyber-card-title">
            <span><i className="pi pi-folder" style={{ color: '#ffb300', marginRight: 4 }} /> ALMACENAMIENTO</span>
            <span>{stats?.disks?.length || 1} Unidades</span>
          </div>

          <div className="disks-grid">
            {(stats?.disks && stats.disks.length > 0 ? stats.disks.slice(0, 3) : [{ fs: 'Root', mount: '/', percentage: 45, used: 120, total: 500 }]).map((d, i) => {
              const dPct = d.percentage || d.use || 0;
              const dColor = getStatusColor(dPct);
              return (
                <div key={i} className="disk-row">
                  <div className="disk-row-header">
                    <span><strong>{d.mount || d.fs || `Drive ${i + 1}`}</strong></span>
                    <span>{d.used || '?'} / {d.total || '?'} GB ({dPct}%)</span>
                  </div>
                  <div className="cyber-meter-track" style={{ height: '4px', margin: '2px 0 3px 0' }}>
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
        </div>
      </div>
    </div>
  );
};

export default React.memo(HomeTelemetryPanel);
