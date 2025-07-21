import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { ProgressBar } from 'primereact/progressbar';
import { Tooltip } from 'primereact/tooltip';

const SystemStats = () => {
  const [stats, setStats] = useState({
    cpu: { usage: 0, cores: 0, model: 'Cargando...' },
    memory: { used: 0, total: 0, percentage: 0 },
    disks: [],
    network: { download: 0, upload: 0 },
    temperature: { cpu: 0, gpu: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  // Sticky stats para todas las métricas
  const lastStatsRef = React.useRef(stats);

  useEffect(() => {
    const updateStats = async () => {
      try {
        if (window.electronAPI) {
          const systemStats = await window.electronAPI.getSystemStats();
          // Sticky para cada métrica
          const mergedStats = { ...lastStatsRef.current };
          // CPU
          if (systemStats.cpu && systemStats.cpu.usage > 0) mergedStats.cpu = systemStats.cpu;
          // Memoria
          if (systemStats.memory && systemStats.memory.total > 0) mergedStats.memory = systemStats.memory;
          // Discos
          if (systemStats.disks && systemStats.disks.length > 0) mergedStats.disks = systemStats.disks;
          // Red
          if (systemStats.network && (systemStats.network.download > 0 || systemStats.network.upload > 0)) mergedStats.network = systemStats.network;
          // Temperatura
          if (systemStats.temperature && (systemStats.temperature.cpu > 0 || systemStats.temperature.gpu > 0)) mergedStats.temperature = systemStats.temperature;
          lastStatsRef.current = mergedStats;
          setStats(mergedStats);
          setIsLoading(false);
        }
      } catch (error) {
        setStats(lastStatsRef.current);
        setIsLoading(false);
      }
    };
    updateStats();
    const interval = setInterval(updateStats, 2000); // Actualizar cada 2 segundos
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getProgressColor = (percentage) => {
    if (percentage < 50) return '#4CAF50'; // Verde
    if (percentage < 80) return '#FF9800'; // Naranja
    return '#F44336'; // Rojo
  };

  const getTemperatureColor = (temp) => {
    if (temp < 60) return '#4CAF50';
    if (temp < 80) return '#FF9800';
    return '#F44336';
  };

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

      {/* Red y Temperatura */}
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
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Red & Temp</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.3rem' }}>
              <span>↓ {stats.network.download.toFixed(1)} Mbps</span>
              <span>↑ {stats.network.upload.toFixed(1)} Mbps</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', opacity: 0.8 }}>
              <span>CPU: {stats.temperature.cpu.toFixed(0)}°C</span>
              <span>GPU: {stats.temperature.gpu.toFixed(0)}°C</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemStats;