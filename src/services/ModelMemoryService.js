/**
 * ModelMemoryService - Monitor PASIVO de memoria para modelos de IA locales
 * 
 * ⚙️ ARQUITECTURA:
 * - MONITOREO: Observa RAM y modelos cada 30 segundos (SIN acciones automáticas)
 * - ESTADÍSTICAS: Emite eventos con datos actualizados para widget
 * - CARGA DE MODELOS: Usa /api/generate con keep_alive para mantener en memoria
 * - SIN ELIMINACIÓN: NUNCA usa /api/delete (eso borra los archivos permanentemente)
 * 
 * Funcionalidades:
 * - ✅ Detecta RAM disponible en el sistema
 * - ✅ Detecta modelos cargados en Ollama
 * - ✅ Monitorea GPU memory (NVIDIA/AMD/Apple)
 * - ✅ Estadísticas y reportes en tiempo real
 * - ✅ Contexto dinámico según RAM disponible
 * - ✅ Carga modelos en memoria usando /api/generate (NO delete)
 * - ✅ Confía en que Ollama descarga automáticamente modelos inactivos
 * 
 * ❌ NUNCA: /api/delete (borra archivos permanentemente)
 * ❌ OBSOLETO: Auto-descarga LRU (ahora confía en Ollama)
 * ❌ OBSOLETO: Límites automáticos (ahora es solo información)
 */

// ✅ Detectar si estamos en Node.js o navegador
const isNodeEnvironment = typeof window === 'undefined';

// ✅ Cargar módulos de Node.js SOLO si estamos en Node.js
let os = null;
if (isNodeEnvironment) {
  try {
    os = require('os');
  } catch (e) {
    // Fallback
    os = null;
  }
}

// ✅ Fallback para EventEmitter en navegador
let EventEmitter = null;
if (isNodeEnvironment) {
  try {
    EventEmitter = require('events');
  } catch (e) {
    // Fallback a polyfill
    EventEmitter = null;
  }
}

// Si estamos en navegador, usar polyfill de EventEmitter
if (!EventEmitter) {
  EventEmitter = class {
    constructor() {
      this.listeners = {};
    }
    on(event, fn) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
      return this;
    }
    emit(event, ...args) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(fn => fn(...args));
      }
    }
    removeListener(event, fn) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(f => f !== fn);
      }
      return this;
    }
    addListener(event, fn) {
      return this.on(event, fn);
    }
  };
}

// ✅ Importar GPUMemoryService
let gpuMemoryService = null;
if (isNodeEnvironment) {
  try {
    gpuMemoryService = require('./GPUMemoryService').default;
  } catch (e) {
    // GPUMemoryService no disponible
    gpuMemoryService = null;
  }
}

class ModelMemoryService extends EventEmitter {
  constructor(ollamaUrl = 'http://localhost:11434') {
    super();
    
    this.ollamaUrl = ollamaUrl;
    this.loadedModels = new Map(); // { modelName: { size, memory, loadedAt } }
    this.monitoringInterval = null;
    this.monitoringEnabled = false;
    this.checkInterval = 30000; // 30 segundos - solo para actualizar datos
    this.lastSystemMemory = null; // Cache del último estado del sistema
  }

  /**
   * ✅ 1. OBTENER MEMORIA DEL SISTEMA (RAM + GPU)
   * Retorna información de RAM disponible en el SO
   * 
   * Primero intenta obtener datos REALES vía IPC (Electron - window.electron.ipcRenderer)
   * Si no está disponible, usa el módulo 'os' de Node.js
   * Si nada funciona, devuelve valores por defecto
   */
  async getSystemMemory() {
    // Opción 1: Intentar obtener datos REALES vía IPC (Electron)
    if (typeof window !== 'undefined' && window.electron && window.electron.ipcRenderer) {
      try {
        const stats = await window.electron.ipcRenderer.invoke('system:get-memory-stats');
        if (stats && stats.ok) {
          return {
            totalMB: stats.totalMB,
            freeMB: stats.freeMB,
            usedMB: stats.usedMB,
            usagePercent: stats.usagePercent
          };
        }
      } catch (error) {
        console.warn('[ModelMemory] ⚠️ IPC error:', error.message);
      }
    }

    // Opción 2: Fallback - usar módulo 'os' si está disponible
    if (os) {
      try {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;

        return {
          totalMB: Math.round(totalMemory / 1024 / 1024),
          freeMB: Math.round(freeMemory / 1024 / 1024),
          usedMB: Math.round(usedMemory / 1024 / 1024),
          usagePercent: Math.round((usedMemory / totalMemory) * 100)
        };
      } catch (error) {
        console.warn('[ModelMemory] ⚠️ Error con Node.js os module');
      }
    }

    // Opción 3: Fallback final - valores por defecto
    console.warn('[ModelMemory] ⚠️ Usando valores por defecto (no se pudo obtener datos reales)');
    return {
      totalMB: 16000,
      freeMB: 8000,
      usedMB: 8000,
      usagePercent: 50
    };
  }

  /**
   * 🎮 NUEVO: Detectar memoria de GPU si está disponible
   * Retorna { model: string, totalVRAM_MB, usedVRAM_MB } o null
   */
  _detectGPUMemory() {
    // Nota: Esta es una función stub que podría conectar con:
    // - nvidia-smi para NVIDIA GPUs (requiere system call)
    // - ROCm para AMD GPUs
    // - Metal para Apple Silicon
    // Por ahora, retorna null (sería necesario acceso a proceso del sistema)
    
    // Futuro: Implementar si se necesita
    return null;
  }

  /**
   * ✅ 2. OBTENER MODELOS CARGADOS EN OLLAMA
   * Usa /api/ps para detectar qué modelos están actualmente en RAM
   */
  async getLoadedModels() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/ps`);
      
      if (!response.ok) {
        console.warn(`[ModelMemory] /api/ps no disponible (HTTP ${response.status})`);
        return new Map();
      }

      const data = await response.json();
      
      this.loadedModels.clear();
      
      if (data.models && Array.isArray(data.models)) {
        for (const model of data.models) {
          this.loadedModels.set(model.name, {
            size: model.size || 0,
            memory: Math.round((model.size || 0) / 1024 / 1024), // Convertir a MB
            loadedAt: new Date(model.loaded_at || Date.now()),
            lastUsedAt: new Date(model.expires_at || Date.now())
          });
        }
      }

      this.emit('modelsUpdated', this.loadedModels);
      return this.loadedModels;
    } catch (error) {
      console.error('[ModelMemory] Error detectando modelos:', error.message);
      return new Map();
    }
  }

  /**
   * ✅ 3. CARGAR MODELO EN MEMORIA
   * Usa /api/generate con keep_alive para mantener el modelo en memoria
   * NO usa /api/delete (que borra archivos permanentemente)
   * 
   * ⚠️ IMPORTANTE: Este método CARGA el modelo cuando se selecciona
   * Ollama automáticamente descargará de RAM modelos inactivos según OLLAMA_MAX_LOADED_MODELS
   */
  async loadModelToMemory(modelName) {
    try {
      // Usar /api/generate para hacer "warm up" del modelo
      // keep_alive: -1 = mantener indefinidamente (hasta que Ollama decida descargarlo por otros modelos)
      // stream: false = no queremos generar respuesta, solo cargar el modelo
      
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: '', // Prompt vacío, solo para cargar
          stream: false,
          keep_alive: -1 // Mantener modelo en memoria indefinidamente
        })
      });

      if (response.ok) {
        this.emit('modelLoaded', modelName);
        return true;
      } else {
        console.warn(`[ModelMemory] ⚠️ HTTP ${response.status} al cargar ${modelName}`);
        return false;
      }
    } catch (error) {
      console.error(`[ModelMemory] ⚠️ Error cargando ${modelName}:`, error.message);
      this.emit('loadFailed', { modelName, error: error.message });
      return false;
    }
  }

  /**
   * ✅ DESCARGAR MODELO DE RAM (Opción B: Control Manual)
   * 
   * Descarga el modelo de RAM INMEDIATAMENTE usando keep_alive: 0
   * ⚠️ El archivo del modelo PERMANECE en disco (~/.ollama/models)
   * Solo se descarga de RAM, nunca se borra el archivo
   * 
   * Ollama automáticamente también descarga modelos cuando:
   * 1. El modelo está inactivo por tiempo (configurable con keep_alive en requests)
   * 2. Se alcanza OLLAMA_MAX_LOADED_MODELS (por defecto 3 modelos)
   * 3. Se necesita memoria para otros modelos
   */
  async unloadModel(modelName) {
    try {
      // Usar /api/generate con keep_alive: 0 para descargar inmediatamente
      // stream: false = no queremos generar respuesta
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: '',
          stream: false,
          keep_alive: 0  // ← Descargar inmediatamente de RAM
        })
      });

      if (response.ok) {
        this.emit('modelUnloaded', modelName);
        return true;
      } else {
        console.warn(`[ModelMemory] ⚠️ HTTP ${response.status} al descargar ${modelName}`);
        return false;
      }
    } catch (error) {
      console.error(`[ModelMemory] ⚠️ Error descargando ${modelName}:`, error.message);
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
   * Usa memoria cacheada del último monitoreo
   */
  getMemoryStats() {
    // Usar el último sistema memory cacheado
    const systemMem = this.lastSystemMemory || {
      totalMB: 16000,
      freeMB: 8000,
      usedMB: 8000,
      usagePercent: 50
    };

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
   * ✅ 6. MONITOREO PASIVO
   * Solo reporta datos, SIN tomar acciones automáticas
   * 
   * ⚠️ NOTA: Descarga solo por acción manual del usuario (botón en widget)
   */
  async monitorMemory() {
    // El monitoreo obtiene datos REALES del sistema
    await this.getLoadedModels();
    
    // ✅ Obtener datos REALES de RAM (vía IPC si está disponible)
    this.lastSystemMemory = await this.getSystemMemory();
    
    const stats = this.getMemoryStats();
    
    // Solo emitir evento para que el widget se actualice
    this.emit('memoryUpdated', stats);
    
    return stats;
  }

  /**
   * ✅ 7. VALIDAR DISPONIBILIDAD PARA CARGAR MODELO
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
        : `ERROR: Necesitas ${Math.round((modelSizeMB - availableMB) / 1024)}GB más`
    };
  }

  /**
   * ✅ 8. CALCULAR CONTEXTO DINÁMICO
   * Ajusta tamaño de contexto según RAM disponible
   */
  calcDynamicContext(freeRAMMB) {
    if (freeRAMMB < 1000) return 1000;    // Crisis
    if (freeRAMMB < 2000) return 2000;    // Bajo
    if (freeRAMMB < 4000) return 4000;    // Normal
    if (freeRAMMB < 8000) return 6000;    // Bueno
    return 8000;                          // Óptimo
  }

  /**
   * ✅ 9. INICIAR MONITOREO CONTINUO (PASIVO)
   * 
   * Solo actualiza datos cada 30 segundos, SIN tomar acciones
   */
  startMonitoring() {
    if (this.monitoringEnabled) {
      console.warn('[ModelMemory] Monitoreo ya está activo');
      return;
    }

    this.monitoringEnabled = true;

    const monitor = async () => {
      try {
        // Solo obtener datos, sin acciones automáticas
        await this.monitorMemory();

      } catch (error) {
        console.error('[ModelMemory] Error en monitoreo:', error.message);
      }

      // Programar siguiente chequeo
      if (this.monitoringEnabled) {
        setTimeout(monitor, this.checkInterval);
      }
    };

    monitor();
  }

  /**
   * ✅ 10. DETENER MONITOREO
   */
  stopMonitoring() {
    this.monitoringEnabled = false;
    this.emit('monitoringStopped');
  }

  /**
   * ℹ️ NOTA: Sin setMemoryLimit - no hay auto-unload basado en límites
   * El usuario solo descarga manualmente via botón en widget
   */

  /**
   * ✅ 12. LIMPIAR AL CERRAR
   */
  async cleanup() {
    this.stopMonitoring();
  }

  /**
   * 🎮 NUEVO: Obtener estadísticas de GPU vía IPC
   * Soporta NVIDIA, AMD, Apple Silicon
   */
  async getGPUStats() {
    try {
      // Opción 1: Intentar obtener datos REALES vía IPC (Electron)
      if (typeof window !== 'undefined' && window.electron && window.electron.system) {
        try {
          const gpuStats = await window.electron.system.getGPUStats();
          
          if (gpuStats && gpuStats.ok && gpuStats.type) {
            return {
              available: true,
              gpus: [{
                name: `${gpuStats.type.toUpperCase()} GPU`,
                totalGB: (gpuStats.totalMB / 1024).toFixed(2),
                usedGB: (gpuStats.usedMB / 1024).toFixed(2),
                freeGB: (gpuStats.freeMB / 1024).toFixed(2),
                usagePercent: gpuStats.usagePercent || 0,
                status: '✅ Activa'
              }]
            };
          }
        } catch (error) {
          console.warn('[ModelMemory] IPC GPU error:', error.message);
        }
      }

      // Fallback: Si no hay GPU o IPC no disponible
      return {
        available: false,
        gpus: []
      };
    } catch (error) {
      console.warn('[ModelMemory] Error obteniendo stats GPU:', error.message);
      return {
        available: false,
        gpus: []
      };
    }
  }

  /**
   * ✅ 13. OBTENER INFO FORMATEADA PARA UI (con GPU)
   */
  async formatStats() {
    const stats = this.getMemoryStats();
    const gpuStats = await this.getGPUStats();

    return {
      header: {
        systemUsage: `${stats.system.usedMB}MB / ${stats.system.totalMB}MB (${stats.system.usagePercent}%)`,
        modelCount: stats.modelsCount,
        modelTotalGB: stats.totalModelMemoryGB,
        limitGB: (stats.memoryLimitMB / 1024).toFixed(1),
        status: stats.isOverLimit ? '⚠️ SOBRE LÍMITE' : '✅ OK'
      },
      gpu: gpuStats, // 🎮 Agregar stats de GPU
      models: stats.models.map(m => ({
        name: m.name,
        size: m.sizeGB,
        age: `${m.minutesAgo}m`,
        summary: `${m.name} (${m.sizeGB}GB, hace ${m.minutesAgo}m)`
      }))
    };
  }
}

// Singleton instance
const modelMemoryService = new ModelMemoryService();

export default modelMemoryService;

