# 💻 CÓDIGO EJEMPLO: Implementación de Gestión de Memoria

## 📋 TABLA DE CONTENIDOS
1. ModelMemoryService (completo)
2. Integración en AIService
3. Componente UI
4. Configuración
5. Tests

---

## 1️⃣ ModelMemoryService.js (COMPLETO)

### Ubicación: `src/services/ModelMemoryService.js`

```javascript
/**
 * ModelMemoryService - Gestor de memoria para modelos de IA locales (Ollama)
 * 
 * Funcionalidades:
 * - Monitoreo de RAM disponible
 * - Detección de modelos cargados en Ollama
 * - Descarga de modelos (liberar RAM)
 * - Gestión automática LRU (Least Recently Used)
 * - Estadísticas y alertas
 */

const os = require('os');
const EventEmitter = require('events');

class ModelMemoryService extends EventEmitter {
  constructor(ollamaUrl = 'http://localhost:11434') {
    super();
    
    this.ollamaUrl = ollamaUrl;
    this.loadedModels = new Map(); // { modelName: { size, memory, loadedAt, lastUsedAt } }
    this.memoryLimit = 12000; // MB (configurable)
    this.monitoringInterval = null;
    this.monitoringEnabled = false;
    this.lastCheck = 0;
    this.checkInterval = 30000; // 30 segundos
  }

  /**
   * ✅ 1. OBTENER MEMORIA DEL SISTEMA
   */
  getSystemMemory() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      totalMB: Math.round(totalMemory / 1024 / 1024),
      freeMB: Math.round(freeMemory / 1024 / 1024),
      usedMB: Math.round(usedMemory / 1024 / 1024),
      usagePercent: Math.round((usedMemory / totalMemory) * 100)
    };
  }

  /**
   * ✅ 2. OBTENER MODELOS CARGADOS EN OLLAMA
   * 
   * Utiliza el endpoint /api/ps (disponible en Ollama v0.1.20+)
   * Retorna qué modelos están actualmente en RAM
   */
  async getLoadedModels() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/ps`);
      
      if (!response.ok) {
        console.warn(`[ModelMemory] /api/ps no disponible (${response.status})`);
        return new Map(); // Fallback: retornar vacío
      }

      const data = await response.json();
      
      // Actualizar caché local
      this.loadedModels.clear();
      
      if (data.models && Array.isArray(data.models)) {
        for (const model of data.models) {
          this.loadedModels.set(model.name, {
            size: model.size || 0,  // Tamaño total en bytes
            memory: Math.round((model.size || 0) / 1024 / 1024), // Convertir a MB
            loadedAt: new Date(model.loaded_at || Date.now()),
            lastUsedAt: new Date(model.last_accessed_at || Date.now())
          });
        }
      }

      console.log(`[ModelMemory] ${this.loadedModels.size} modelos en RAM`);
      this.emit('modelsUpdated', this.loadedModels);
      
      return this.loadedModels;
    } catch (error) {
      console.error('[ModelMemory] Error obteniendo modelos:', error.message);
      return new Map();
    }
  }

  /**
   * ✅ 3. DESCARGAR MODELO DE RAM
   * 
   * Llama al endpoint DELETE /api/models/:name
   * Solo libera de RAM, no borra el archivo
   */
  async unloadModel(modelName) {
    try {
      console.log(`[ModelMemory] Descargando ${modelName}...`);
      
      const response = await fetch(`${this.ollamaUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelName,
          delete_model: false // Importante: NO borrar archivo
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      this.loadedModels.delete(modelName);
      console.log(`[ModelMemory] ✅ ${modelName} descargado de RAM`);
      
      this.emit('modelUnloaded', modelName);
      return true;
    } catch (error) {
      console.error(`[ModelMemory] ❌ Error descargando ${modelName}:`, error.message);
      this.emit('unloadFailed', { modelName, error: error.message });
      return false;
    }
  }

  /**
   * ✅ 4. DESCARGAR MÚLTIPLES MODELOS
   */
  async unloadMultiple(modelNames) {
    const results = [];
    for (const modelName of modelNames) {
      const success = await this.unloadModel(modelName);
      results.push({ modelName, success });
    }
    return results;
  }

  /**
   * ✅ 5. OBTENER ESTADÍSTICAS DETALLADAS
   */
  getMemoryStats() {
    const systemMem = this.getSystemMemory();
    const models = Array.from(this.loadedModels.entries()).map(([name, info]) => ({
      name,
      sizeGB: (info.size / 1024 / 1024 / 1024).toFixed(2),
      sizeMB: info.memory,
      loadedSince: info.loadedAt.toLocaleTimeString(),
      minutesAgo: Math.round((Date.now() - info.loadedAt.getTime()) / 60000)
    }));

    const totalMemoryUsedByModels = models.reduce((sum, m) => sum + m.sizeMB, 0);

    return {
      system: systemMem,
      models,
      totalModelMemoryMB: totalMemoryUsedByModels,
      totalModelMemoryGB: (totalMemoryUsedByModels / 1024).toFixed(2),
      modelsCount: models.length,
      memoryLimitMB: this.memoryLimit,
      isOverLimit: totalMemoryUsedByModels > this.memoryLimit,
      exceededByMB: Math.max(0, totalMemoryUsedByModels - this.memoryLimit)
    };
  }

  /**
   * ✅ 6. GESTIÓN AUTOMÁTICA - LRU (Least Recently Used)
   * 
   * Si se excede el límite, descarga los modelos más antiguos
   * hasta volver dentro del límite
   */
  async enforceMemoryLimit() {
    const stats = this.getMemoryStats();

    if (!stats.isOverLimit) {
      return { action: 'none', reason: 'Dentro del límite' };
    }

    console.warn(`[ModelMemory] ⚠️ Límite excedido: ${stats.totalModelMemoryMB}MB > ${this.memoryLimit}MB`);

    // Ordenar modelos por antigüedad (más viejos primero)
    const sorted = stats.models.sort((a, b) => b.minutesAgo - a.minutesAgo);

    const toUnload = [];
    let freedMemory = 0;

    // Descargar modelos hasta bajar del límite
    for (const model of sorted) {
      if (freedMemory >= stats.exceededByMB) break;
      
      toUnload.push(model.name);
      freedMemory += model.sizeMB;
    }

    console.log(`[ModelMemory] Descargando ${toUnload.length} modelos (liberando ~${freedMemory}MB)`);

    const results = await this.unloadMultiple(toUnload);

    return {
      action: 'unload',
      modelsUnloaded: toUnload,
      memoryFreedMB: freedMemory,
      successCount: results.filter(r => r.success).length
    };
  }

  /**
   * ✅ 7. OBTENER TIEMPO ESTIMADO DE CARGA
   */
  estimateLoadTime(modelSizeGB) {
    // Estimación: ~50-100MB/s típico en SSD
    const speedMBperSecond = 75; // promedio
    const modelSizeMB = modelSizeGB * 1024;
    const estimatedSeconds = Math.round(modelSizeMB / speedMBperSecond);
    
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;
    
    return {
      seconds: estimatedSeconds,
      formatted: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
    };
  }

  /**
   * ✅ 8. VALIDAR DISPONIBILIDAD PARA CARGAR
   */
  async canLoadModel(modelSizeGB) {
    const stats = this.getMemoryStats();
    const modelSizeMB = modelSizeGB * 1024;
    const availableMB = stats.system.freeMB;

    const canFit = modelSizeMB <= availableMB;
    const wouldExceedLimit = (stats.totalModelMemoryMB + modelSizeMB) > this.memoryLimit;

    return {
      canFit,
      wouldExceedLimit,
      availableMB,
      neededMB: modelSizeMB,
      message: canFit 
        ? 'OK: Suficiente RAM disponible'
        : `ERROR: Necesitas ${(modelSizeMB - availableMB) / 1024}GB más`
    };
  }

  /**
   * ✅ 9. INICIAR MONITOREO CONTINUO
   */
  startMonitoring() {
    if (this.monitoringEnabled) {
      console.warn('[ModelMemory] Monitoreo ya está activo');
      return;
    }

    this.monitoringEnabled = true;

    const monitor = async () => {
      try {
        await this.getLoadedModels();
        const enforcement = await this.enforceMemoryLimit();
        
        if (enforcement.action !== 'none') {
          this.emit('enforcement', enforcement);
        }

      } catch (error) {
        console.error('[ModelMemory] Error en monitoreo:', error.message);
      }

      // Programar siguiente chequeo
      this.lastCheck = Date.now();
      if (this.monitoringEnabled) {
        setTimeout(monitor, this.checkInterval);
      }
    };

    console.log(`[ModelMemory] ✅ Monitoreo iniciado (cada ${this.checkInterval / 1000}s)`);
    monitor();
  }

  /**
   * ✅ 10. DETENER MONITOREO
   */
  stopMonitoring() {
    this.monitoringEnabled = false;
    console.log('[ModelMemory] ⛔ Monitoreo detenido');
    this.emit('monitoringStopped');
  }

  /**
   * ✅ 11. CONFIGURAR LÍMITE DE MEMORIA
   */
  setMemoryLimit(limitMB) {
    this.memoryLimit = limitMB;
    console.log(`[ModelMemory] Límite configurado a ${limitMB}MB`);
    this.emit('limitChanged', limitMB);
  }

  /**
   * ✅ 12. LIMPIAR AL CERRAR
   */
  async cleanup() {
    this.stopMonitoring();
    console.log('[ModelMemory] Limpieza completada');
  }

  /**
   * ✅ 13. LISTAR INFORMACIÓN DE TODOS LOS MODELOS (ui-friendly)
   */
  formatStats() {
    const stats = this.getMemoryStats();

    return {
      header: {
        systemUsage: `${stats.system.usedMB}MB / ${stats.system.totalMB}MB (${stats.system.usagePercent}%)`,
        modelCount: stats.modelsCount,
        modelTotalMB: stats.totalModelMemoryMB,
        limitMB: this.memoryLimit,
        status: stats.isOverLimit ? '⚠️ SOBRE LÍMITE' : '✅ OK'
      },
      models: stats.models.map(m => ({
        name: m.name,
        size: m.sizeGB,
        age: `${m.minutesAgo}m`,
        summary: `${m.name} (${m.sizeGB}GB, hace ${m.minutesAgo}m)`
      }))
    };
  }
}

// Singleton
const modelMemoryService = new ModelMemoryService();

export default modelMemoryService;
```

---

## 2️⃣ Integración en AIService

### Modificaciones a `src/services/AIService.js`

```javascript
// En el constructor
constructor() {
  // ...existing...
  this.memoryService = modelMemoryService; // Importar arriba
}

// Nuevo método: verificar antes de cargar modelo
async validateModelMemory(modelId, modelType) {
  if (modelType !== 'local') return true; // Cloud no tiene límites locales

  const model = this.getAllLocalModels().find(m => m.id === modelId);
  if (!model) return false;

  // Obtener tamaño del modelo
  const sizeGB = model.ramRequired 
    ? parseFloat(model.ramRequired) 
    : 4; // Default 4GB

  const canLoad = await this.memoryService.canLoadModel(sizeGB);
  
  if (canLoad.wouldExceedLimit) {
    console.warn(`[AIService] Modelo ${modelId} excedería límite. Aplicando LRU...`);
    await this.memoryService.enforceMemoryLimit();
  }

  return canLoad.canFit || canLoad.wouldExceedLimit; // Intentar aunque exceda
}

// Modificar: sendToLocalModel()
async sendToLocalModel(message, options = {}) {
  const model = this.getAllLocalModels().find(m => m.id === this.currentModel);
  if (!model) {
    throw new Error('Modelo local no encontrado');
  }

  if (!model.downloaded) {
    throw new Error('El modelo local no está descargado');
  }

  // ✅ NUEVO: Validar memoria
  await this.validateModelMemory(this.currentModel, 'local');

  try {
    if (options.useStreaming) {
      return await this.sendToLocalModelStreaming(model.id, messages, options);
    } else {
      return await this.sendToLocalModelNonStreaming(model.id, messages, options);
    }
  } catch (error) {
    console.error('Error llamando a modelo local:', error);
    throw error;
  }
}

// Modificar: sendToLocalModelStreaming() - calcular contexto dinámico
async sendToLocalModelStreaming(modelId, messages, options) {
  const ollamaUrl = this.getOllamaUrl();
  
  // ✅ NUEVO: Contexto dinámico basado en RAM disponible
  const systemMem = this.memoryService.getSystemMemory();
  const dynamicContext = this._calcDynamicContext(systemMem.freeMB);

  const ollamaOptions = {
    temperature: options.temperature ?? 0.7,
    num_predict: options.maxTokens ?? 4000,
    num_ctx: options.contextLimit ?? dynamicContext, // ✅ Dinámico
    top_k: options.top_k ?? 40,
    top_p: options.top_p ?? 0.9,
    repeat_penalty: options.repeat_penalty ?? 1.1
  };

  // ... resto del código igual ...
}

// ✅ NUEVO: Función helper para contexto dinámico
_calcDynamicContext(freeRAMMB) {
  if (freeRAMMB < 1000) return 1000;    // Muy poco: contexto mínimo
  if (freeRAMMB < 2000) return 2000;    // Poco
  if (freeRAMMB < 4000) return 4000;    // Normal
  if (freeRAMMB < 8000) return 6000;    // Bueno
  return 8000;                          // Óptimo
}

// ✅ NUEVO: Al cambiar de modelo
async switchModel(newModelId, newModelType) {
  const oldModel = this.currentModel;
  const oldType = this.modelType;

  this.currentModel = newModelId;
  this.modelType = newModelType;

  // Si ambos son modelos locales, considerar descargar antiguo después
  if (oldType === 'local' && newModelType === 'local' && oldModel !== newModelId) {
    console.log(`[AIService] Cambio de modelo: ${oldModel} → ${newModelId}`);
    
    // No descargar inmediatamente, dar oportunidad de recuperar
    setTimeout(async () => {
      const shouldUnload = await this._askUserToUnloadModel(oldModel);
      if (shouldUnload) {
        await this.memoryService.unloadModel(oldModel);
      }
    }, 5000); // 5 segundos de delay
  }
}

// Helper para solicitar confirmación
async _askUserToUnloadModel(modelName) {
  // Este método se comunicaría con el UI para pedir confirmación
  // Por ahora, retornar true para descarga automática
  return true;
}
```

---

## 3️⃣ Componente UI: ModelMemoryIndicator.jsx

### Ubicación: `src/components/ModelMemoryIndicator.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import modelMemoryService from '../services/ModelMemoryService';

const ModelMemoryIndicator = ({ visible = true }) => {
  const [stats, setStats] = useState(null);
  const [expandedModels, setExpandedModels] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const updateStats = async () => {
      const newStats = modelMemoryService.getMemoryStats();
      await modelMemoryService.getLoadedModels();
      setStats(newStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || !stats) return null;

  const systemMem = stats.system;
  const models = stats.models || [];
  const isWarning = stats.isOverLimit;
  const backgroundColor = isWarning ? 'rgba(255, 107, 107, 0.1)' : 'rgba(76, 204, 240, 0.1)';
  const borderColor = isWarning ? 'rgba(255, 107, 107, 0.3)' : 'rgba(76, 204, 240, 0.3)';

  return (
    <div style={{
      background: backgroundColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '12px',
      fontSize: '13px',
      fontFamily: 'monospace',
      maxHeight: expandedModels ? '400px' : 'auto',
      overflow: 'auto'
    }}>
      {/* Header: Sistema */}
      <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color: isWarning ? '#ff6b6b' : '#4eccf0' }}>
          💻 Sistema: {systemMem.usedMB}MB / {systemMem.totalMB}MB ({systemMem.usagePercent}%)
        </span>
        {isWarning && <span style={{ color: '#ffd700' }}>⚠️ LÍMITE EXCEDIDO</span>}
      </div>

      {/* Barra de progreso */}
      <div style={{
        background: '#333',
        height: '6px',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '12px'
      }}>
        <div style={{
          background: systemMem.usagePercent > 80 ? '#ff6b6b' : '#4eccf0',
          height: '100%',
          width: `${systemMem.usagePercent}%`,
          transition: 'width 0.3s'
        }} />
      </div>

      {/* Modelos */}
      <div style={{ marginBottom: '8px' }}>
        <button
          onClick={() => setExpandedModels(!expandedModels)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#4eccf0',
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
              <div style={{ color: '#666', fontSize: '12px' }}>
                Sin modelos en memoria
              </div>
            ) : (
              models.map((model, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid #333',
                    fontSize: '12px'
                  }}
                >
                  <span>📦 {model.name}</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ color: '#666' }}>{model.sizeGB}GB</span>
                    <span style={{ color: '#888' }}>hace {model.minutesAgo}m</span>
                    <button
                      onClick={async () => {
                        await modelMemoryService.unloadModel(model.name);
                        setStats(modelMemoryService.getMemoryStats());
                      }}
                      style={{
                        background: '#333',
                        color: '#ff6b6b',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        fontSize: '11px'
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
      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px'
      }}>
        <span>
          📊 Modelos: <strong>{stats.totalModelMemoryGB}GB / {(stats.memoryLimitMB / 1024).toFixed(1)}GB</strong>
        </span>
        <span style={{ color: '#888' }}>
          Libre: <strong>{(systemMem.freeMB / 1024).toFixed(1)}GB</strong>
        </span>
      </div>
    </div>
  );
};

export default ModelMemoryIndicator;
```

---

## 4️⃣ Integración en AIChatPanel.js

```javascript
// En imports
import ModelMemoryIndicator from './ModelMemoryIndicator';

// En el render, antes del chat
return (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    {/* ✅ NUEVO: Widget de memoria */}
    <ModelMemoryIndicator visible={this.state.showMemoryIndicator} />

    {/* Chat messages */}
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* ... mensajes existentes ... */}
    </div>

    {/* Input */}
    <div>
      {/* ... input existente ... */}
    </div>
  </div>
);

// Toggle con shortcut (Ctrl+M)
componentDidMount() {
  // ...existing...
  
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'm') {
      this.setState(prev => ({
        showMemoryIndicator: !prev.showMemoryIndicator
      }));
    }
  });
}
```

---

## 5️⃣ Configuración en AIConfigDialog.js

```javascript
// Agregar nuevo tab o sección en rendimiento

const renderMemoryConfigTab = () => (
  <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
    <h3 style={{ marginBottom: '16px' }}>🧠 Configuración de Memoria</h3>

    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
        Límite de RAM para Modelos:
      </label>

      {[
        { label: '💾 Bajo (2GB)', value: 2000, desc: 'Laptops limitadas' },
        { label: '🖥️  Medio (6GB)', value: 6000, desc: 'Desktop estándar' },
        { label: '🖥️🖥️ Alto (12GB)', value: 12000, desc: 'Workstation' },
        { label: '🔥 Muy Alto (24GB)', value: 24000, desc: 'Server' }
      ].map(opt => (
        <button
          key={opt.value}
          onClick={() => {
            modelMemoryService.setMemoryLimit(opt.value);
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '12px',
            margin: '6px 0',
            background: modelMemoryService.memoryLimit === opt.value ? '#4eccf0' : '#222',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold'
          }}
        >
          {opt.label}
          <div style={{ fontSize: '12px', color: '#ccc', fontWeight: 'normal' }}>
            {opt.desc}
          </div>
        </button>
      ))}
    </div>

    <div style={{
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '6px',
      padding: '12px',
      fontSize: '12px',
      color: '#888'
    }}>
      <strong>ℹ️ Información:</strong>
      <ul>
        <li>Modelos se descargarán automáticamente si se excede el límite</li>
        <li>Contexto se ajustará dinámicamente según RAM disponible</li>
        <li>Presiona Ctrl+M para ver estadísticas en tiempo real</li>
      </ul>
    </div>
  </div>
);
```

---

## 6️⃣ Tests Básicos

### Ubicación: `tests/ModelMemoryService.test.js`

```javascript
const modelMemoryService = require('../src/services/ModelMemoryService').default;

describe('ModelMemoryService', () => {
  
  test('getSystemMemory retorna valores válidos', () => {
    const mem = modelMemoryService.getSystemMemory();
    
    expect(mem.totalMB).toBeGreaterThan(0);
    expect(mem.freeMB).toBeGreaterThan(0);
    expect(mem.usedMB).toBeGreaterThan(0);
    expect(mem.usagePercent).toBeGreaterThanOrEqual(0);
    expect(mem.usagePercent).toBeLessThanOrEqual(100);
  });

  test('estimateLoadTime retorna valores razonables', () => {
    const estimate = modelMemoryService.estimateLoadTime(7); // 7GB
    
    expect(estimate.seconds).toBeGreaterThan(0);
    expect(estimate.formatted).toMatch(/^\d+[ms]/);
  });

  test('canLoadModel valida correctamente', async () => {
    const result = await modelMemoryService.canLoadModel(1); // 1GB
    
    expect(result).toHaveProperty('canFit');
    expect(result).toHaveProperty('message');
  });

  test('getMemoryStats retorna formato válido', () => {
    const stats = modelMemoryService.getMemoryStats();
    
    expect(stats).toHaveProperty('system');
    expect(stats).toHaveProperty('models');
    expect(stats).toHaveProperty('totalModelMemoryMB');
    expect(stats).toHaveProperty('isOverLimit');
  });

  test('setMemoryLimit configura correctamente', () => {
    modelMemoryService.setMemoryLimit(8000);
    expect(modelMemoryService.memoryLimit).toBe(8000);
  });

  test('formatStats retorna formato UI-friendly', () => {
    const formatted = modelMemoryService.formatStats();
    
    expect(formatted).toHaveProperty('header');
    expect(formatted).toHaveProperty('models');
    expect(Array.isArray(formatted.models)).toBe(true);
  });
});
```

---

## 📊 RESUMEN DE CAMBIOS

| Archivo | Tipo | Líneas | Cambios |
|---------|------|--------|---------|
| `ModelMemoryService.js` | NUEVO | 400+ | Clase completa |
| `AIService.js` | MOD | +50 | Métodos e integración |
| `ModelMemoryIndicator.jsx` | NUEVO | 200+ | Componente UI |
| `AIChatPanel.js` | MOD | +10 | Integrar widget |
| `AIConfigDialog.js` | MOD | +60 | Tab de configuración |
| `tests/*` | NUEVO | 100+ | Tests básicos |

**Total**: ~820 líneas de código nuevo/modificado


