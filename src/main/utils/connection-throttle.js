// ============================================
// SISTEMA DE THROTTLING PARA CONEXIONES SSH
// Controla la frecuencia de intentos de conexión al mismo servidor
// ============================================

// Sistema de throttling para conexiones SSH
const connectionThrottle = {
  pending: new Map(), // Conexiones en proceso por cacheKey
  lastAttempt: new Map(), // Último intento por cacheKey
  minInterval: 2000, // Mínimo 2 segundos entre intentos al mismo servidor
  
  async throttle(cacheKey, connectionFn) {
    // Si ya hay una conexión pendiente para este servidor, esperar
    if (this.pending.has(cacheKey)) {
      return await this.pending.get(cacheKey);
    }
    
    // Verificar intervalo mínimo
    const lastAttempt = this.lastAttempt.get(cacheKey) || 0;
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    
    if (timeSinceLastAttempt < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastAttempt;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Crear la conexión
    this.lastAttempt.set(cacheKey, Date.now());
    const connectionPromise = connectionFn();
    this.pending.set(cacheKey, connectionPromise);
    
    try {
      const result = await connectionPromise;
      return result;
    } finally {
      this.pending.delete(cacheKey);
    }
  },
  
  // Limpiar estado del throttle
  clear() {
    this.pending.clear();
    this.lastAttempt.clear();
  },
  
  // Obtener estado actual
  getStatus() {
    return {
      pendingConnections: this.pending.size,
      trackedHosts: this.lastAttempt.size
    };
  }
};

module.exports = connectionThrottle;
