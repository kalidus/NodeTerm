/**
 * DebugLogger - Sistema centralizado de logging para la aplicación
 * Permite controlar los niveles de debug y reducir el ruido en la consola
 */

class DebugLogger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      TRACE: 4
    };
    
    // Nivel por defecto: mostrar solo errores, warnings e info importantes
    this.currentLevel = this.levels.INFO;
    
    // Módulos habilitados para logging detallado
    this.enabledModules = new Set();
    
    // Cache para evitar logging repetitivo
    this.logCache = new Map();
    this.cacheTimeout = 5000; // 5 segundos
    
    // Configuración desde localStorage
    this.loadConfig();
  }

  /**
   * Cargar configuración desde localStorage
   */
  loadConfig() {
    try {
      const config = JSON.parse(localStorage.getItem('debugLogger') || '{}');
      this.currentLevel = config.level ?? this.levels.INFO;
      this.enabledModules = new Set(config.modules || []);
    } catch (error) {
      console.warn('Error loading debug logger config:', error);
    }
  }

  /**
   * Guardar configuración en localStorage
   */
  saveConfig() {
    try {
      localStorage.setItem('debugLogger', JSON.stringify({
        level: this.currentLevel,
        modules: Array.from(this.enabledModules)
      }));
    } catch (error) {
      console.warn('Error saving debug logger config:', error);
    }
  }

  /**
   * Establecer nivel de logging
   */
  setLevel(level) {
    if (typeof level === 'string') {
      level = this.levels[level.toUpperCase()];
    }
    this.currentLevel = level;
    this.saveConfig();
  }

  /**
   * Habilitar logging detallado para módulos específicos
   */
  enableModule(moduleName) {
    this.enabledModules.add(moduleName);
    this.saveConfig();
  }

  /**
   * Deshabilitar logging detallado para módulos específicos
   */
  disableModule(moduleName) {
    this.enabledModules.delete(moduleName);
    this.saveConfig();
  }

  /**
   * Verificar si un módulo está habilitado
   */
  isModuleEnabled(moduleName) {
    return this.enabledModules.has(moduleName);
  }

  /**
   * Obtener nombre del nivel de logging
   */
  getLevelName(level) {
    return Object.keys(this.levels).find(key => this.levels[key] === level) || 'UNKNOWN';
  }

  /**
   * Verificar si se debe loguear un mensaje
   */
  shouldLog(level, moduleName, message) {
    // Siempre mostrar errores y warnings críticos
    if (level <= this.levels.WARN) {
      return true;
    }

    // Si el módulo está específicamente habilitado, mostrar todos sus logs
    if (moduleName && this.enabledModules.has(moduleName)) {
      return true;
    }

    // Verificar contra el nivel global
    if (level <= this.currentLevel) {
      return true;
    }

    return false;
  }

  /**
   * Verificar cache para evitar logging repetitivo
   */
  checkCache(key, message) {
    const now = Date.now();
    const cached = this.logCache.get(key);
    
    if (cached && (now - cached.timestamp) < this.cacheTimeout && cached.message === message) {
      return false; // No loguear, está en cache
    }
    
    this.logCache.set(key, { message, timestamp: now });
    
    // Limpiar cache antigua ocasionalmente
    if (this.logCache.size > 100) {
      const cutoff = now - this.cacheTimeout;
      for (const [k, v] of this.logCache.entries()) {
        if (v.timestamp < cutoff) {
          this.logCache.delete(k);
        }
      }
    }
    
    return true; // Loguear
  }

  /**
   * Log genérico con nivel y módulo
   */
  log(level, moduleName, message, ...args) {
    if (!this.shouldLog(level, moduleName, message)) {
      return;
    }

    // Para logs de DEBUG y TRACE, verificar cache para evitar spam
    if (level >= this.levels.DEBUG) {
      const cacheKey = `${moduleName}:${typeof message === 'string' ? message : JSON.stringify(message)}`;
      if (!this.checkCache(cacheKey, message)) {
        return; // Skip logging, está en cache
      }
    }

    const prefix = `🔧 [${moduleName || 'App'}]`;
    const levelName = this.getLevelName(level);
    
    switch (level) {
      case this.levels.ERROR:
        console.error(`❌ ${prefix} ${message}`, ...args);
        break;
      case this.levels.WARN:
        console.warn(`⚠️ ${prefix} ${message}`, ...args);
        break;
      case this.levels.INFO:
        console.info(`ℹ️ ${prefix} ${message}`, ...args);
        break;
      case this.levels.DEBUG:
        console.log(`🔍 ${prefix} ${message}`, ...args);
        break;
      case this.levels.TRACE:
        console.log(`📍 ${prefix} ${message}`, ...args);
        break;
      default:
        console.log(`${prefix} ${message}`, ...args);
    }
  }

  /**
   * Métodos de conveniencia
   */
  error(moduleName, message, ...args) {
    this.log(this.levels.ERROR, moduleName, message, ...args);
  }

  warn(moduleName, message, ...args) {
    this.log(this.levels.WARN, moduleName, message, ...args);
  }

  info(moduleName, message, ...args) {
    this.log(this.levels.INFO, moduleName, message, ...args);
  }

  debug(moduleName, message, ...args) {
    this.log(this.levels.DEBUG, moduleName, message, ...args);
  }

  trace(moduleName, message, ...args) {
    this.log(this.levels.TRACE, moduleName, message, ...args);
  }

  /**
   * Mostrar configuración actual
   */
  showConfig() {
    console.group('🔧 [DebugLogger] Configuración actual');
    console.log('Nivel:', this.getLevelName(this.currentLevel));
    console.log('Módulos habilitados:', Array.from(this.enabledModules));
    console.log('Cache size:', this.logCache.size);
    console.groupEnd();
  }

  /**
   * Restablecer configuración por defecto
   */
  reset() {
    this.currentLevel = this.levels.INFO;
    this.enabledModules.clear();
    this.logCache.clear();
    this.saveConfig();
    console.log('🔧 [DebugLogger] Configuración restablecida');
  }
}

// Crear instancia singleton
const debugLogger = new DebugLogger();

// Exponer métodos globales para fácil uso
window.debugLogger = debugLogger;

// Métodos de conveniencia para desarrollo
window.enableDebugModule = (module) => debugLogger.enableModule(module);
window.disableDebugModule = (module) => debugLogger.disableModule(module);
window.setDebugLevel = (level) => debugLogger.setLevel(level);

export default debugLogger;
