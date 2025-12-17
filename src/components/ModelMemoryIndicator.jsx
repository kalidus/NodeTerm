import React, { useState, useEffect } from 'react';
import modelMemoryService from '../services/ModelMemoryService';

const ModelMemoryIndicator = ({ visible = true, themeColors = {}, onExpandedChange }) => {
  const [stats, setStats] = useState(null);
  const [gpuMemory, setGpuMemory] = useState(null);
  const [systemStats, setSystemStats] = useState(null); // ✅ NUEVO: Stats del sistema (CPU, etc.)
  const [expandedModels, setExpandedModels] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState(false); // Colapsado por defecto
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
        
        // ✅ Obtener datos REALES de RAM (cada 5 segundos)
        const systemMemory = await modelMemoryService.getSystemMemory();
        modelMemoryService.lastSystemMemory = systemMemory;
        
        // ✅ Obtener estadísticas del sistema (CPU, etc.)
        try {
          const sysStats = await window.electronAPI?.getSystemStats();
          if (sysStats) {
            setSystemStats({
              cpu: Math.round((sysStats.cpu?.usage || 0) * 10) / 10,
              hostname: sysStats.hostname || null,
              platform: sysStats.platform || null
            });
          }
        } catch (e) {
          // Sistema stats no disponible
          setSystemStats(null);
        }
        
        // Obtener modelos cargados
        await modelMemoryService.getLoadedModels();
        const newStats = modelMemoryService.getMemoryStats();
        setStats(newStats);

        // 🎮 Cargar GPU stats (con más información ahora)
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
    const interval = setInterval(updateStats, 10000); // Reducido de 5000ms a 10000ms para ahorrar CPU/RAM
    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(expandedMemory);
    }
  }, [expandedMemory, onExpandedChange]);

  if (!visible || !stats) return null;

  const systemMem = stats.system;
  const models = stats.models || [];
  const isWarning = stats.isOverLimit;
  const statusColor = isWarning ? colors.colorWarning : colors.colorOk;

  // Usar los mismos colores que themeColors si están disponibles
  const primaryColor = themeColors?.primaryColor || colors.colorOk;
  const cardBackground = themeColors?.cardBackground || colors.bgNormal;
  const borderColorTheme = themeColors?.borderColor || colors.borderNormal;
  const textPrimary = themeColors?.textPrimary || colors.textPrimary;
  const textSecondary = themeColors?.textSecondary || colors.textSecondary;

  return (
    <div
      style={{
        position: 'relative',
        background: expandedMemory 
          ? `linear-gradient(135deg, ${cardBackground} 0%, ${cardBackground}dd 100%)`
          : 'transparent',
        border: expandedMemory ? `1px solid ${borderColorTheme}` : 'none',
        borderRadius: expandedMemory ? '8px' : '0',
        padding: expandedMemory ? '0.75rem' : '0',
        marginBottom: expandedMemory ? '0.5rem' : '0',
        fontSize: '13px',
        fontFamily: 'monospace',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Header Principal Desplegable */}
      <div
        onClick={() => setExpandedMemory(!expandedMemory)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: expandedMemory ? '0' : '0.5rem',
          background: !expandedMemory 
            ? `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`
            : 'transparent',
          border: !expandedMemory ? `1px solid ${primaryColor}40` : 'none',
          borderRadius: '8px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!expandedMemory) {
            e.currentTarget.style.background = `linear-gradient(135deg, ${primaryColor}30 0%, ${primaryColor}15 100%)`;
          }
        }}
        onMouseLeave={(e) => {
          if (!expandedMemory) {
            e.currentTarget.style.background = `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`;
          }
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: textPrimary,
          fontWeight: '500'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#4eccf0',
            boxShadow: '0 0 6px #4eccf0'
          }} />
          <i className="pi pi-database" style={{ fontSize: '0.9rem' }} />
          <span>{models.length} modelo{models.length !== 1 ? 's' : ''} en RAM</span>
        </div>

        <i className={`pi ${expandedMemory ? 'pi-chevron-up' : 'pi-chevron-down'}`}
           style={{ fontSize: '0.8rem', color: textSecondary }} />
      </div>

      {/* Contenido Desplegable */}
      {expandedMemory && (
        <div
          style={{
            padding: '0 12px 12px 12px',
            maxHeight: '70vh',
            overflow: 'auto',
            borderTop: `1px solid ${borderColorTheme}`,
            transition: 'all 0.3s ease'
          }}
        >
          {/* Header: Sistema */}
          <div
            style={{
              marginBottom: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '12px'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span
                style={{
                  fontWeight: 'bold',
                  color: statusColor
                }}
              >
                💻 RAM: {systemMem.usedMB}MB / {systemMem.totalMB}MB ({systemMem.usagePercent}%)
              </span>
              {systemStats && systemStats.cpu !== undefined && (
                <span
                  style={{
                    fontWeight: 'bold',
                    color: systemStats.cpu > 80 ? colors.colorWarning : colors.colorOk,
                    fontSize: '0.85rem'
                  }}
                >
                  🔥 CPU: {systemStats.cpu}%
                </span>
              )}
            </div>
            {systemStats && systemStats.hostname && (
              <div style={{
                fontSize: '11px',
                color: colors.textSecondary,
                marginTop: '4px'
              }}>
                🖥️ {systemStats.hostname}
                {systemStats.platform && ` (${systemStats.platform})`}
              </div>
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
                            background: 'transparent',
                            color: colors.textSecondary,
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.color = colors.colorOk;
                            e.target.style.transform = 'scale(1.1)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.color = colors.textSecondary;
                            e.target.style.transform = 'scale(1)';
                          }}
                          title="Descargar modelo de RAM (archivo en disco permanece protegido)"
                        >
                          ⬇️
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
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px'
            }}
          >
            <span>
              📊 Modelos en RAM: <strong>{stats.totalModelMemoryGB}GB</strong>
            </span>
            <span style={{ color: colors.textSecondary }}>
              Libre: <strong>{(systemMem.freeMB / 1024).toFixed(1)}GB</strong>
            </span>
          </div>

          {/* 🎮 GPU Memory si está disponible */}
          {gpuMemory && (
            <div
              style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #333'
              }}
            >
              <div style={{ marginBottom: '8px', color: colors.colorOk, fontWeight: 'bold' }}>
                🎮 GPU: {gpuMemory.name || (gpuMemory.gpus && gpuMemory.gpus.length > 0 && gpuMemory.gpus[0]?.name) || (gpuMemory.type ? `${gpuMemory.type.toUpperCase()} GPU` : 'GPU')}
              </div>
              {gpuMemory.available && gpuMemory.gpus && gpuMemory.gpus.length > 0 ? (
                <div style={{ paddingLeft: '12px' }}>
                  {gpuMemory.gpus.map((gpu, idx) => (
                    <div key={idx} style={{ marginBottom: '8px', fontSize: '11px' }}>
                      <div style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: '4px' }}>
                        {gpu.name || gpuMemory.name || 'GPU'}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        color: colors.textSecondary,
                        marginBottom: '4px'
                      }}>
                        <span>
                          VRAM: {gpu.usedGB}/{gpu.totalGB}GB ({gpu.usagePercent}%)
                        </span>
                        {(gpu.temperature !== null && gpu.temperature !== undefined) || (gpuMemory.temperature !== null && gpuMemory.temperature !== undefined) ? (
                          <span style={{ 
                            color: ((gpu.temperature || gpuMemory.temperature) > 80) ? colors.colorWarning : colors.colorOk 
                          }}>
                            🌡️ {gpu.temperature || gpuMemory.temperature}°C
                          </span>
                        ) : null}
                      </div>
                      {(gpu.gpuUtilization !== null && gpu.gpuUtilization !== undefined) || (gpuMemory.gpuUtilization !== null && gpuMemory.gpuUtilization !== undefined) ? (
                        <div style={{ 
                          fontSize: '10px', 
                          color: colors.textSecondary,
                          marginBottom: '4px'
                        }}>
                          Uso GPU: {gpu.gpuUtilization || gpuMemory.gpuUtilization}%
                        </div>
                      ) : null}
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
              ) : (gpuMemory.type || gpuMemory.name) ? (
                <div style={{ paddingLeft: '12px', fontSize: '11px' }}>
                  {gpuMemory.type && (
                    <div style={{ color: colors.textPrimary, marginBottom: '4px', fontWeight: 'bold' }}>
                      Tipo: {gpuMemory.type.toUpperCase()}
                    </div>
                  )}
                  {gpuMemory.name && (
                    <div style={{ color: colors.textSecondary, marginBottom: '4px' }}>
                      Modelo: {gpuMemory.name}
                    </div>
                  )}
                  {gpuMemory.totalMB !== null && gpuMemory.usedMB !== null && (
                    <div style={{ color: colors.textSecondary, marginBottom: '4px' }}>
                      VRAM: {Math.round(gpuMemory.usedMB / 1024 * 10) / 10}GB / {Math.round(gpuMemory.totalMB / 1024 * 10) / 10}GB ({gpuMemory.usagePercent}%)
                    </div>
                  )}
                  {gpuMemory.temperature !== null && gpuMemory.temperature !== undefined && (
                    <div style={{ 
                      color: gpuMemory.temperature > 80 ? colors.colorWarning : colors.textSecondary, 
                      marginBottom: '4px' 
                    }}>
                      🌡️ Temperatura: {gpuMemory.temperature}°C
                    </div>
                  )}
                  {gpuMemory.gpuUtilization !== null && gpuMemory.gpuUtilization !== undefined && (
                    <div style={{ color: colors.textSecondary, marginBottom: '4px' }}>
                      Uso: {gpuMemory.gpuUtilization}%
                    </div>
                  )}
                  {gpuMemory.note && (
                    <div style={{ color: colors.textSecondary, fontSize: '10px', marginTop: '4px', fontStyle: 'italic' }}>
                      ℹ️ {gpuMemory.note}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: colors.textSecondary, paddingLeft: '12px' }}>
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
      )}
    </div>
  );
};

export default ModelMemoryIndicator;
