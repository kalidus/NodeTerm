/**
 * MCPLogger - Sistema de logging específico para MCP con métricas y debugging
 * 
 * Proporciona:
 * - Registro de comunicación JSON-RPC
 * - Errores de MCPs con stack trace
 * - Métricas: latencia de tools, uso por MCP
 * - Niveles de log configurables
 */

class MCPLogger {
  constructor() {
    this.logs = [];
    this.metrics = {
      toolCalls: new Map(), // Map<toolName, { count, totalTime, errors }>
      serverStats: new Map(), // Map<serverId, { calls, errors, uptime }>
    };
    this.maxLogs = 1000; // Máximo de logs a mantener en memoria
    this.logLevel = 'info'; // 'debug', 'info', 'warn', 'error'
  }

  /**
   * Establecer nivel de log
   */
  setLogLevel(level) {
    this.logLevel = level;
  }

  /**
   * Log genérico
   */
  log(level, category, message, data = {}) {
    const logEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data
    };

    this.logs.push(logEntry);

    // Mantener solo los últimos N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log en consola según el nivel
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (logLevels[level] >= logLevels[this.logLevel]) {
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
      }[level] || 'ℹ️';

      console.log(`${emoji} [MCP ${category}] ${message}`, data);
    }
  }

  /**
   * Log de debug
   */
  debug(category, message, data) {
    this.log('debug', category, message, data);
  }

  /**
   * Log de info
   */
  info(category, message, data) {
    this.log('info', category, message, data);
  }

  /**
   * Log de warning
   */
  warn(category, message, data) {
    this.log('warn', category, message, data);
  }

  /**
   * Log de error
   */
  error(category, message, error, data = {}) {
    this.log('error', category, message, {
      ...data,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
  }

  /**
   * Registrar comunicación JSON-RPC
   */
  logJSONRPC(serverId, direction, message) {
    this.debug('JSON-RPC', `${direction} ${serverId}`, {
      serverId,
      direction, // 'send' o 'receive'
      method: message.method,
      id: message.id,
      hasParams: !!message.params,
      hasResult: !!message.result,
      hasError: !!message.error
    });
  }

  /**
   * Registrar inicio de llamada a tool
   */
  logToolCallStart(serverId, toolName, args) {
    this.info('Tool Call', `Iniciando: ${toolName} en ${serverId}`, {
      serverId,
      toolName,
      args
    });

    // Inicializar métricas si no existen
    if (!this.metrics.toolCalls.has(toolName)) {
      this.metrics.toolCalls.set(toolName, {
        count: 0,
        totalTime: 0,
        errors: 0,
        lastCall: null
      });
    }

    return {
      serverId,
      toolName,
      startTime: Date.now()
    };
  }

  /**
   * Registrar finalización exitosa de llamada a tool
   */
  logToolCallSuccess(context, result) {
    const endTime = Date.now();
    const latency = endTime - context.startTime;

    this.info('Tool Call', `✅ Completado: ${context.toolName} (${latency}ms)`, {
      serverId: context.serverId,
      toolName: context.toolName,
      latency,
      resultSize: JSON.stringify(result).length
    });

    // Actualizar métricas
    const metrics = this.metrics.toolCalls.get(context.toolName);
    metrics.count++;
    metrics.totalTime += latency;
    metrics.lastCall = {
      timestamp: endTime,
      latency,
      success: true
    };

    // Actualizar stats del servidor
    this.updateServerStats(context.serverId, true, latency);
  }

  /**
   * Registrar error en llamada a tool
   */
  logToolCallError(context, error) {
    const endTime = Date.now();
    const latency = endTime - context.startTime;

    this.error('Tool Call', `❌ Error: ${context.toolName}`, error, {
      serverId: context.serverId,
      toolName: context.toolName,
      latency
    });

    // Actualizar métricas
    const metrics = this.metrics.toolCalls.get(context.toolName);
    metrics.errors++;
    metrics.lastCall = {
      timestamp: endTime,
      latency,
      success: false,
      error: error.message
    };

    // Actualizar stats del servidor
    this.updateServerStats(context.serverId, false, latency);
  }

  /**
   * Actualizar estadísticas del servidor
   */
  updateServerStats(serverId, success, latency) {
    if (!this.metrics.serverStats.has(serverId)) {
      this.metrics.serverStats.set(serverId, {
        calls: 0,
        errors: 0,
        totalLatency: 0,
        avgLatency: 0,
        startTime: Date.now()
      });
    }

    const stats = this.metrics.serverStats.get(serverId);
    stats.calls++;
    if (!success) {
      stats.errors++;
    }
    stats.totalLatency += latency;
    stats.avgLatency = stats.totalLatency / stats.calls;
  }

  /**
   * Registrar inicio de servidor
   */
  logServerStart(serverId, config) {
    this.info('Server', `🚀 Iniciando: ${serverId}`, {
      serverId,
      command: config.command,
      args: config.args
    });
  }

  /**
   * Registrar detención de servidor
   */
  logServerStop(serverId, reason) {
    this.info('Server', `🛑 Detenido: ${serverId}`, {
      serverId,
      reason
    });
  }

  /**
   * Registrar error de servidor
   */
  logServerError(serverId, error, context = {}) {
    this.error('Server', `Error en ${serverId}`, error, {
      serverId,
      ...context
    });
  }

  /**
   * Obtener métricas de tools
   */
  getToolMetrics() {
    const metrics = [];
    
    for (const [toolName, data] of this.metrics.toolCalls.entries()) {
      metrics.push({
        toolName,
        calls: data.count,
        errors: data.errors,
        avgLatency: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
        successRate: data.count > 0 ? ((data.count - data.errors) / data.count * 100).toFixed(1) : 100,
        lastCall: data.lastCall
      });
    }

    return metrics.sort((a, b) => b.calls - a.calls);
  }

  /**
   * Obtener métricas de servidores
   */
  getServerMetrics() {
    const metrics = [];
    
    for (const [serverId, data] of this.metrics.serverStats.entries()) {
      metrics.push({
        serverId,
        calls: data.calls,
        errors: data.errors,
        avgLatency: Math.round(data.avgLatency),
        errorRate: data.calls > 0 ? (data.errors / data.calls * 100).toFixed(1) : 0,
        uptime: Date.now() - data.startTime
      });
    }

    return metrics;
  }

  /**
   * Obtener logs recientes
   */
  getRecentLogs(count = 50, level = null) {
    let logs = this.logs;
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    return logs.slice(-count).reverse();
  }

  /**
   * Buscar logs por categoría
   */
  getLogsByCategory(category, count = 50) {
    return this.logs
      .filter(log => log.category === category)
      .slice(-count)
      .reverse();
  }

  /**
   * Limpiar logs antiguos
   */
  clearOldLogs(olderThanMs = 3600000) {
    const cutoff = Date.now() - olderThanMs;
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
  }

  /**
   * Reset de métricas
   */
  resetMetrics() {
    this.metrics.toolCalls.clear();
    this.metrics.serverStats.clear();
    this.info('System', 'Métricas reseteadas');
  }

  /**
   * Exportar logs a JSON
   */
  exportLogs() {
    return {
      logs: this.logs,
      metrics: {
        tools: this.getToolMetrics(),
        servers: this.getServerMetrics()
      },
      exportedAt: Date.now()
    };
  }

  /**
   * Obtener resumen de rendimiento
   */
  getPerformanceSummary() {
    const toolMetrics = this.getToolMetrics();
    const serverMetrics = this.getServerMetrics();

    const totalCalls = toolMetrics.reduce((sum, m) => sum + m.calls, 0);
    const totalErrors = toolMetrics.reduce((sum, m) => sum + m.errors, 0);
    const avgLatency = toolMetrics.length > 0
      ? Math.round(toolMetrics.reduce((sum, m) => sum + m.avgLatency, 0) / toolMetrics.length)
      : 0;

    return {
      totalCalls,
      totalErrors,
      successRate: totalCalls > 0 ? ((totalCalls - totalErrors) / totalCalls * 100).toFixed(1) : 100,
      avgLatency,
      activeServers: serverMetrics.length,
      toolsUsed: toolMetrics.length
    };
  }
}

// Singleton instance
const mcpLogger = new MCPLogger();

export { mcpLogger, MCPLogger };
export default mcpLogger;

