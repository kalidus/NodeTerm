/**
 * ModelMemoryService - Gestor inteligente de memoria para modelos de IA locales
 * 
 * Funcionalidades:
 * - Monitoreo de RAM disponible en el sistema
 * - Detección de modelos cargados en Ollama
 * - Descarga automática de modelos (liberar RAM)
 * - Gestión LRU (Least Recently Used) para mantener RAM bajo límite
 * - Estadísticas y alertas en tiempo real
 * - Contexto dinámico según disponibilidad de memoria
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

class ModelMemoryService extends EventEmitter {
  constructor(ollamaUrl = 'http://localhost:11434') {
    super();
    
    this.ollamaUrl = ollamaUrl;
    this.loadedModels = new Map(); // { modelName: { size, memory, loadedAt } }
    this.memoryLimit = 6000; // MB (predeterminado: Medio - 6GB)
    this.monitoringInterval = null;
    this.monitoringEnabled = false;
    this.checkInterval = 30000; // 30 segundos
    
    console.log('[ModelMemory] ✅ Servicio inicializado');
  }

  /**
   * ✅ 1. OBTENER MEMORIA DEL SISTEMA
   * Retorna información de RAM disponible en el SO
   */
  getSystemMemory() {
    // Fallback para navegador o si 'os' no está disponible
    if (!os) {
      // Devolver valores estimados cuando no hay acceso a memoria real
      return {
        totalMB: 16000,  // Estimado: 16GB
        freeMB: 8000,    // Estimado: 8GB libre
        usedMB: 8000,    // Estimado: 8GB usado
        usagePercent: 50  // 50% por defecto
      };
    }

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
      console.error('[ModelMemory] Error obteniendo memoria del sistema:', error);
      // Fallback en caso de error
      return {
        totalMB: 16000,
        freeMB: 8000,
        usedMB: 8000,
        usagePercent: 50
      };
    }
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
   * Libera modelo de memoria sin borrar el archivo
   */
  async unloadModel(modelName) {
    try {
      console.log(`[ModelMemory] 🔄 Descargando ${modelName}...`);
      
      const response = await fetch(`${this.ollamaUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: modelName,
          delete_model: false // NO borrar archivo, solo liberar RAM
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
   * ✅ 6. GESTIÓN AUTOMÁTICA LRU (Least Recently Used)
   * Si se excede el límite, descargar modelos más antiguos
   */
  async enforceMemoryLimit() {
    const stats = this.getMemoryStats();

    if (!stats.isOverLimit) {
      return { action: 'none', reason: 'Dentro del límite' };
    }

    console.warn(`[ModelMemory] ⚠️ LÍMITE EXCEDIDO: ${stats.totalModelMemoryMB}MB > ${this.memoryLimit}MB`);

    // Ordenar por antigüedad (más viejos primero)
    const sorted = stats.models.sort((a, b) => b.minutesAgo - a.minutesAgo);

    const toUnload = [];
    let freedMemory = 0;

    // Descargar modelos hasta bajar del límite
    for (const model of sorted) {
      if (freedMemory >= stats.exceededByMB) break;
      toUnload.push(model.name);
      freedMemory += model.sizeMB;
    }

    console.log(`[ModelMemory] 🧹 Descargando ${toUnload.length} modelos (liberando ~${freedMemory}MB)`);

    const results = await this.unloadMultiple(toUnload);
    const successCount = results.filter(r => r.success).length;

    return {
      action: 'unload',
      modelsUnloaded: toUnload,
      memoryFreedMB: freedMemory,
      successCount
    };
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
    console.log(`[ModelMemory] ⚙️ Límite configurado a ${limitMB}MB (${(limitMB / 1024).toFixed(1)}GB)`);
    this.emit('limitChanged', limitMB);
  }

  /**
   * ✅ 12. LIMPIAR AL CERRAR
   */
  async cleanup() {
    this.stopMonitoring();
    console.log('[ModelMemory] 🧹 Limpieza completada');
  }

  /**
   * ✅ 13. OBTENER INFO FORMATEADA PARA UI
   */
  formatStats() {
    const stats = this.getMemoryStats();

    return {
      header: {
        systemUsage: `${stats.system.usedMB}MB / ${stats.system.totalMB}MB (${stats.system.usagePercent}%)`,
        modelCount: stats.modelsCount,
        modelTotalGB: stats.totalModelMemoryGB,
        limitGB: (stats.memoryLimitMB / 1024).toFixed(1),
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

// Singleton instance
const modelMemoryService = new ModelMemoryService();

export default modelMemoryService;

