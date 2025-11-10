import React, { useState, useEffect } from 'react';
import modelMemoryService from '../services/ModelMemoryService';

const ModelMemoryIndicator = ({ visible = true, themeColors = {} }) => {
  const [stats, setStats] = useState(null);
  const [gpuMemory, setGpuMemory] = useState(null);
  const [expandedModels, setExpandedModels] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Colores por defecto
  const defaultColors = {
    textPrimary: '#e0e0e0',
    textSecondary: '#888',
    textWarning: '#ffd700',
    textError: '#ff6b6b',
    bgNormal: 'rgba(76, 204, 240, 0.1)',
    borderNormal: 'rgba(76, 204, 240, 0.3)',
    bgWarning: 'rgba(255, 107, 107, 0.1)',
    borderWarning: 'rgba(255, 107, 107, 0.3)',
    colorOk: '#4eccf0',
    colorWarning: '#ffd700',
    colorDanger: '#ff6b6b'
  };

  const colors = { ...defaultColors, ...themeColors };

  useEffect(() => {
    if (!visible) return;

    const updateStats = async () => {
      try {
        setUpdating(true);
        await modelMemoryService.getLoadedModels();
        const newStats = modelMemoryService.getMemoryStats();
        setStats(newStats);

        // 🎮 Cargar GPU stats
        try {
          const gpuStats = await modelMemoryService.getGPUStats();
          setGpuMemory(gpuStats);
        } catch (e) {
          // GPU no disponible
          setGpuMemory(null);
        }

        setUpdating(false);
      } catch (error) {
        console.error('[ModelMemoryIndicator] Error actualizando stats:', error);
        setUpdating(false);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || !stats) return null;

  const systemMem = stats.system;
  const models = stats.models || [];
  const isWarning = stats.isOverLimit;
  const backgroundColor = isWarning ? colors.bgWarning : colors.bgNormal;
  const borderColor = isWarning ? colors.borderWarning : colors.borderNormal;
  const statusColor = isWarning ? colors.colorWarning : colors.colorOk;

  return (
    <div
      style={{
        background: backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px',
        fontSize: '13px',
        fontFamily: 'monospace',
        maxHeight: expandedModels ? '400px' : 'auto',
        overflow: 'auto',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header: Sistema */}
      <div
        style={{
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 'bold',
              color: statusColor,
              marginBottom: '4px'
            }}
          >
            💻 Sistema: {systemMem.usedMB}MB / {systemMem.totalMB}MB ({systemMem.usagePercent}%)
          </div>
          <div style={{ fontSize: '12px', color: colors.textSecondary }}>
            📊 Disponible: <strong>{systemMem.freeMB}MB</strong> | 
            <strong style={{ marginLeft: '8px' }}>Usado: {systemMem.usedMB}MB</strong>
          </div>
        </div>
        {isWarning && (
          <span style={{ color: colors.textError, marginLeft: '12px', whiteSpace: 'nowrap' }}>⚠️ LÍMITE</span>
        )}
      </div>

      {/* Barra de progreso */}
      <div
        style={{
          background: '#333',
          height: '6px',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '12px'
        }}
      >
        <div
          style={{
            background:
              systemMem.usagePercent > 80 ? colors.colorDanger : colors.colorOk,
            height: '100%',
            width: `${systemMem.usagePercent}%`,
            transition: 'width 0.3s'
          }}
        />
      </div>

      {/* Modelos */}
      <div style={{ marginBottom: '8px' }}>
        <button
          onClick={() => setExpandedModels(!expandedModels)}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.colorOk,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            padding: '0',
            textDecoration: 'underline'
          }}
        >
          {expandedModels ? '▼' : '▶'} 🧠 Modelos en RAM: {models.length}
        </button>

        {expandedModels && (
          <div style={{ marginTop: '8px', paddingLeft: '12px' }}>
            {models.length === 0 ? (
              <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
                Sin modelos en memoria
              </div>
            ) : (
              models.map((model, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #333',
                    fontSize: '12px'
                  }}
                >
                  <span>📦 {model.name}</span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: colors.textSecondary }}>{model.sizeGB}GB</span>
                    <span style={{ color: '#888' }}>hace {model.minutesAgo}m</span>
                    <button
                      onClick={async () => {
                        try {
                          await modelMemoryService.unloadModel(model.name);
                          // Actualizar stats después de descargar
                          setTimeout(async () => {
                            await modelMemoryService.getLoadedModels();
                            const newStats = modelMemoryService.getMemoryStats();
                            setStats(newStats);
                          }, 500);
                        } catch (error) {
                          console.error('[ModelMemoryIndicator] Error descargando:', error);
                        }
                      }}
                      style={{
                        background: '#ff6b6b',
                        color: '#000',
                        border: '1px solid #ff5555',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#ff5555';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#ff6b6b';
                        e.target.style.transform = 'scale(1)';
                      }}
                      title="Descargar de RAM (archivo en disco permanece protegido)"
                    >
                      📤 Liberar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Resumen RAM */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #333'
        }}
      >
        <div style={{ fontSize: '12px', marginBottom: '8px' }}>
          <span>📊 Modelos cargados: </span>
          <strong style={{ color: colors.colorOk }}>{stats.totalModelMemoryGB}GB</strong>
        </div>
        <div style={{ fontSize: '12px', marginBottom: '8px' }}>
          <span>💾 Disponible: </span>
          <strong style={{ color: colors.colorOk }}>{(systemMem.freeMB / 1024).toFixed(1)}GB</strong>
        </div>
        <div style={{ fontSize: '11px', color: colors.textSecondary }}>
          ℹ️ Ollama descargará automáticamente modelos inactivos cuando sea necesario
        </div>
      </div>

      {/* 🎮 NUEVO: GPU Memory si está disponible */}
      {gpuMemory && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #333'
          }}
        >
          <div style={{ marginBottom: '8px', color: colors.colorOk, fontWeight: 'bold' }}>
            🎮 GPU Memory
          </div>
          {gpuMemory.available && gpuMemory.gpus && gpuMemory.gpus.length > 0 ? (
            <div style={{ paddingLeft: '12px' }}>
              {gpuMemory.gpus.map((gpu, idx) => (
                <div key={idx} style={{ marginBottom: '8px', fontSize: '11px' }}>
                  <div style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: '4px' }}>
                    {gpu.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textSecondary }}>
                    <span>
                      VRAM: {gpu.usedGB}/{gpu.totalGB}GB ({gpu.usagePercent}%)
                    </span>
                    <span>{gpu.status}</span>
                  </div>
                  <div
                    style={{
                      background: '#333',
                      height: '4px',
                      borderRadius: '2px',
                      marginTop: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        background:
                          gpu.usagePercent > 80
                            ? colors.colorDanger
                            : gpu.usagePercent > 50
                            ? colors.colorWarning
                            : colors.colorOk,
                        height: '100%',
                        width: `${gpu.usagePercent}%`,
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: colors.textSecondary }}>
              Sin GPU detectada o sin soporte
            </div>
          )}
        </div>
      )}

      {/* Status indicator */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '11px',
          color: colors.textSecondary,
          textAlign: 'center'
        }}
      >
        {updating ? '🔄 Actualizando...' : '✅ Actualizado'}
      </div>
    </div>
  );
};

export default ModelMemoryIndicator;

