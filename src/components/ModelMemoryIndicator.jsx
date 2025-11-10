import React, { useState, useEffect } from 'react';
import modelMemoryService from '../services/ModelMemoryService';

const ModelMemoryIndicator = ({ visible = true, themeColors = {} }) => {
  const [stats, setStats] = useState(null);
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
        <span
          style={{
            fontWeight: 'bold',
            color: statusColor
          }}
        >
          💻 Sistema: {systemMem.usedMB}MB / {systemMem.totalMB}MB ({systemMem.usagePercent}%)
        </span>
        {isWarning && (
          <span style={{ color: colors.textError }}>⚠️ LÍMITE EXCEDIDO</span>
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
                          const newStats = modelMemoryService.getMemoryStats();
                          setStats(newStats);
                        } catch (error) {
                          console.error('[ModelMemoryIndicator] Error descargando:', error);
                        }
                      }}
                      style={{
                        background: '#333',
                        color: colors.textError,
                        border: '1px solid #555',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#444';
                        e.target.style.color = '#ff6b6b';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#333';
                        e.target.style.color = colors.textError;
                      }}
                    >
                      ❌ Descargar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Resumen */}
      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px'
        }}
      >
        <span>
          📊 Modelos: <strong>{stats.totalModelMemoryGB}GB</strong> /{' '}
          <strong>{(stats.memoryLimitMB / 1024).toFixed(1)}GB</strong>
        </span>
        <span style={{ color: colors.textSecondary }}>
          Libre: <strong>{(systemMem.freeMB / 1024).toFixed(1)}GB</strong>
        </span>
      </div>

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

