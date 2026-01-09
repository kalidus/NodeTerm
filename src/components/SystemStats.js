import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { ProgressBar } from 'primereact/progressbar';

const SystemStats = () => {
  const [stats, setStats] = useState({
    cpu: { usage: 0, cores: 0, model: 'Cargando...' },
    memory: { used: 0, total: 0, percentage: 0 },
    disks: [],
    network: { download: 0, upload: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  // Sticky stats para todas las métricas
  const lastStatsRef = React.useRef(stats);
  // Historial para barras adaptativas de red
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const HISTORY_LENGTH = 30;

  useEffect(() => {
    let interval = null;
    let stopped = false;
    let paused = false;

    const updateStats = async () => {
      try {
        if (window.electronAPI) {
          const systemStats = await window.electronAPI.getSystemStats();
          const mergedStats = { ...lastStatsRef.current };
          if (systemStats.cpu && systemStats.cpu.usage > 0) mergedStats.cpu = systemStats.cpu;
          if (systemStats.memory && systemStats.memory.total > 0) mergedStats.memory = systemStats.memory;
          if (systemStats.disks && systemStats.disks.length > 0) mergedStats.disks = systemStats.disks;
          if (systemStats.network && (systemStats.network.download > 0 || systemStats.network.upload > 0)) mergedStats.network = systemStats.network;
          lastStatsRef.current = mergedStats;
          setStats(mergedStats);
          setDownloadHistory(prev => ([...prev, mergedStats.network.download].slice(-HISTORY_LENGTH)));
          setUploadHistory(prev => ([...prev, mergedStats.network.upload].slice(-HISTORY_LENGTH)));
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[SystemStats] Error al obtener stats:', error);
        setStats(lastStatsRef.current);
        setIsLoading(false);
      }
    };

    function maybeUpdateStats() {
      if (!paused) {
        updateStats();
      }
    }

    // Event listeners para pausar/reanudar
    const pauseStats = () => { paused = true; };
    const resumeStats = () => { paused = false; updateStats(); };
    window.addEventListener('split-move-start', pauseStats);
    window.addEventListener('split-move-stop', resumeStats);

    updateStats();
    interval = setInterval(maybeUpdateStats, 10000); // Aumentado de 5000ms a 10000ms para reducir carga
    return () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener('split-move-start', pauseStats);
      window.removeEventListener('split-move-stop', resumeStats);
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        padding: '1rem'
      }}>
        {[1, 2, 3, 4].map(i => (
          <Card key={i} style={{ minHeight: '120px' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-color-secondary)' }}>
              <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
              <p>Cargando...</p>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '1rem',
      padding: '1rem'
    }}>
      {/* CPU */}
      <Card 
        className="system-stat-card"
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          minHeight: '120px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <i className="pi pi-desktop" style={{ fontSize: '2.5rem', opacity: 0.8 }}></i>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>CPU</h3>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.8 }}>
              {stats.cpu.cores} núcleos
            </p>
            <ProgressBar 
              value={stats.cpu.usage} 
              style={{ height: '8px' }}
              color="rgba(255,255,255,0.9)"
            />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
              {stats.cpu.usage.toFixed(1)}% utilizado
            </p>
          </div>
        </div>
      </Card>

      {/* Memoria */}
      <Card 
        className="system-stat-card"
        style={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          border: 'none',
          minHeight: '120px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <i className="pi pi-chart-bar" style={{ fontSize: '2.5rem', opacity: 0.8 }}></i>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Memoria RAM</h3>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.8 }}>
              {stats.memory.used.toFixed(1)} GB / {stats.memory.total} GB
            </p>
            <ProgressBar 
              value={stats.memory.percentage} 
              style={{ height: '8px' }}
              color="rgba(255,255,255,0.9)"
            />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
              {stats.memory.percentage.toFixed(1)}% utilizado
            </p>
          </div>
        </div>
      </Card>

      {/* Discos */}
      <Card 
        className="system-stat-card"
        style={{ 
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white',
          border: 'none',
          minHeight: '120px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <i className="pi pi-database" style={{ fontSize: '2.5rem', opacity: 0.8 }}></i>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Almacenamiento</h3>
            {stats.disks.slice(0, 2).map((disk, index) => (
              <div key={index} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', opacity: 0.8 }}>
                  <span>{disk.name}</span>
                  <span>{disk.used} GB / {disk.total} GB</span>
                </div>
                <ProgressBar 
                  value={disk.percentage} 
                  style={{ height: '6px', marginTop: '0.2rem' }}
                  color="rgba(255,255,255,0.9)"
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Red */}
      <Card 
        className="system-stat-card"
        style={{ 
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          color: 'white',
          border: 'none',
          minHeight: '120px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <i className="pi pi-wifi" style={{ fontSize: '2.5rem', opacity: 0.8 }}></i>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Red</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.3rem' }}>
              <span>↓ {stats.network.download.toFixed(1)} Mbps</span>
              <span>↑ {stats.network.upload.toFixed(1)} Mbps</span>
            </div>
            {/* Barras de progreso de red */}
            <div style={{ marginBottom: '0.3rem' }}>
              <div style={{ fontSize: '0.8rem', marginBottom: 2 }}>Descarga</div>
              <ProgressBar 
                value={stats.network.download}
                showValue={false}
                style={{ height: '6px', background: '#fff2', marginBottom: 4 }}
                color="#007acc"
                max={Math.max(100, Math.max(...downloadHistory, 0), stats.network.download, 1000)}
              />
              <div style={{ fontSize: '0.8rem', marginBottom: 2 }}>Subida</div>
              <ProgressBar 
                value={stats.network.upload}
                showValue={false}
                style={{ height: '6px', background: '#fff2', marginBottom: 0 }}
                color="#f093fb"
                max={Math.max(100, Math.max(...uploadHistory, 0), stats.network.upload, 1000)}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemStats;