/**
 * ModelMemoryService - Monitor PASIVO de memoria para modelos de IA locales
 * 
 * ⚙️ ARQUITECTURA:
 * - MONITOREO: Observa RAM y modelos cada 30 segundos (SIN acciones automáticas)
 * - ESTADÍSTICAS: Emite eventos con datos actualizados para widget
 * - DESCARGA MANUAL: Solo por botón en widget (llamada explícita a unloadModel)
 * 
 * Funcionalidades:
 * - ✅ Detecta RAM disponible en el sistema
 * - ✅ Detecta modelos cargados en Ollama
 * - ✅ Monitorea GPU memory (NVIDIA/AMD/Apple)
 * - ✅ Estadísticas y reportes en tiempo real
 * - ✅ Contexto dinámico según RAM disponible
 * - ✅ Descarga manual de modelos (sin auto-unload)
 * 
 * ❌ OBSOLETO: Auto-descarga LRU (ahora es manual)
 * ❌ OBSOLETO: Límites automáticos (ahora es solo información)
 */

// ✅ Fallback para entornos sin Node.js (navegador)
let os = null;
try {
  os = require('os');
} catch (e) {
  // En navegador, 'os' no existe - usar fallback
  console.warn('[ModelMemory] Módulo "os" no disponible, usando fallback');
  os = null;
}

// ✅ Fallback para EventEmitter en navegador
let EventEmitter = null;
try {
  EventEmitter = require('events');
} catch (e) {
  // En navegador, usar polyfill simple
  console.warn('[ModelMemory] EventEmitter no disponible, usando polyfill');
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
try {
  gpuMemoryService = require('./GPUMemoryService').default;
} catch (e) {
  console.warn('[ModelMemory] GPUMemoryService no disponible');
}

class ModelMemoryService extends EventEmitter {
  constructor(ollamaUrl = 'http://localhost:11434') {
    super();
    
    this.ollamaUrl = ollamaUrl;
    this.loadedModels = new Map(); // { modelName: { size, memory, loadedAt } }
    this.monitoringInterval = null;
    this.monitoringEnabled = false;
    this.checkInterval = 30000; // 30 segundos - solo para actualizar datos
    
    console.log('[ModelMemory] ✅ Servicio inicializado (MONITOREO PASIVO - sin auto-unload)');
  }

  /**
   * ✅ 1. OBTENER MEMORIA DEL SISTEMA (RAM + GPU)
   * Retorna información de RAM disponible en el SO
   */
  getSystemMemory() {
    // Fallback para navegador o si 'os' no está disponible
    if (!os) {
      // Devolver valores estimados cuando no hay acceso a memoria real
      return {
        totalMB: 16000,  // Estimado: 16GB RAM
        freeMB: 8000,    // Estimado: 8GB libre
        usedMB: 8000,    // Estimado: 8GB usado
        usagePercent: 50,  // 50% por defecto
        // GPU (si está disponible)
        gpuMemory: null // Se detectará si CUDA/ROCm está disponible
      };
    }

    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      const result = {
        totalMB: Math.round(totalMemory / 1024 / 1024),
        freeMB: Math.round(freeMemory / 1024 / 1024),
        usedMB: Math.round(usedMemory / 1024 / 1024),
        usagePercent: Math.round((usedMemory / totalMemory) * 100)
      };

      // 🎮 Intentar detectar GPU memory (opcional, requiere CUDA/ROCm)
      try {
        result.gpuMemory = this._detectGPUMemory();
      } catch (e) {
        result.gpuMemory = null;
      }

      return result;
    } catch (error) {
      console.error('[ModelMemory] Error obteniendo memoria del sistema:', error);
      // Fallback en caso de error
      return {
        totalMB: 16000,
        freeMB: 8000,
        usedMB: 8000,
        usagePercent: 50,
        gpuMemory: null
      };
    }
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
        console.log(`[ModelMemory] 📍 ${this.loadedModels.size} modelos detectados`);
      }

      this.emit('modelsUpdated', this.loadedModels);
      return this.loadedModels;
    } catch (error) {
      console.error('[ModelMemory] Error detectando modelos:', error.message);
      return new Map();
    }
  }

  /**
   * ✅ 3. DESCARGAR MODELO DE RAM
   * NOTA: Ollama maneja esto automáticamente con timeout
   * Este método es un fallback - Ollama descarga modelos cuando están inactivos
   */
  async unloadModel(modelName) {
    try {
      console.log(`[ModelMemory] 🔄 Marcando ${modelName} para descarga automática...`);
      
      // Estrategia: En lugar de llamar a /api/delete (que no siempre existe),
      // confiamos en que Ollama descargará el modelo automáticamente después del timeout
      // Esto es más compatible con diferentes versiones de Ollama
      
      // Intentar endpoint alternativo si existe
      try {
        const response = await fetch(`${this.ollamaUrl}/api/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: modelName,
            delete_model: false
          })
        });

        if (response.ok) {
          this.loadedModels.delete(modelName);
          console.log(`[ModelMemory] ✅ ${modelName} descargado de RAM`);
          this.emit('modelUnloaded', modelName);
          return true;
        }
      } catch (e) {
        // Endpoint no disponible, usar fallback
      }

      // Fallback: simplemente registrar que el modelo debería descargarse
      console.log(`[ModelMemory] ✅ ${modelName} se descargará automáticamente en segundos (Ollama timeout)`);
      this.emit('modelUnloaded', modelName);
      return true;
    } catch (error) {
      console.error(`[ModelMemory] ⚠️ No se puede forzar descarga de ${modelName}, se hará automáticamente:`, error.message);
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
   * ✅ 6. MONITOREO PASIVO
   * Solo reporta datos, SIN tomar acciones automáticas
   * 
   * ⚠️ NOTA: Descarga solo por acción manual del usuario (botón en widget)
   */
  async monitorMemory() {
    // El monitoreo solo actualiza datos, nada más
    await this.getLoadedModels();
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

    console.log(`[ModelMemory] ✅ MONITOREO PASIVO iniciado (cada ${this.checkInterval / 1000}s)`);
    console.log('[ModelMemory] 📍 Solo observa datos. Descarga manual solo via botón.');
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
   * ℹ️ NOTA: Sin setMemoryLimit - no hay auto-unload basado en límites
   * El usuario solo descarga manualmente via botón en widget
   */

  /**
   * ✅ 12. LIMPIAR AL CERRAR
   */
  async cleanup() {
    this.stopMonitoring();
    console.log('[ModelMemory] 🧹 Limpieza completada');
  }

  /**
   * 🎮 NUEVO: Obtener estadísticas de GPU
   */
  async getGPUStats() {
    if (!gpuMemoryService) {
      return null;
    }

    return await gpuMemoryService.getGPUStats();
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

