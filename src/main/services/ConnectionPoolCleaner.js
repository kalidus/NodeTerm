// ============================================
// SERVICIO DE LIMPIEZA DE POOL DE CONEXIONES SSH
// Limpia automáticamente conexiones SSH huérfanas del pool
// ============================================

let orphanCleanupInterval = null;
const CLEANUP_INTERVAL_MS = 60000; // 60 segundos
const MAX_IDLE_TIME_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Inicia el proceso de limpieza automática de conexiones huérfanas
 * @param {Object} sshConnectionPool - Pool de conexiones SSH compartidas
 * @param {Object} sshConnections - Conexiones SSH activas por tabId
 */
function startOrphanCleanup(sshConnectionPool, sshConnections) {
  // Si ya existe un intervalo, limpiarlo primero
  if (orphanCleanupInterval) {
    clearInterval(orphanCleanupInterval);
  }
  
  orphanCleanupInterval = setInterval(() => {
    const activeKeys = new Set(Object.values(sshConnections).map(conn => conn.cacheKey));
    
    for (const [poolKey, poolConnection] of Object.entries(sshConnectionPool)) {
      if (!activeKeys.has(poolKey)) {
        // Verificar si la conexión es realmente antigua (más de 5 minutos sin uso)
        const connectionAge = Date.now() - (poolConnection._lastUsed || poolConnection._createdAt || 0);
        if (connectionAge > MAX_IDLE_TIME_MS) {
          try {
            // Limpiar listeners antes de cerrar
            if (poolConnection.ssh) {
              poolConnection.ssh.removeAllListeners();
            }
            poolConnection.close();
          } catch (e) {
            // ✅ BUG FIX: Loggear errores en modo desarrollo para debugging
            if (process.env.NODE_ENV === 'development') {
              console.warn(`[SSH Pool] Error closing orphaned connection ${poolKey}:`, e.message);
            }
          }
          delete sshConnectionPool[poolKey];
        }
      } else {
        // Marcar como usado recientemente
        poolConnection._lastUsed = Date.now();
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Detiene el proceso de limpieza automática
 */
function stopOrphanCleanup() {
  if (orphanCleanupInterval) {
    clearInterval(orphanCleanupInterval);
    orphanCleanupInterval = null;
  }
}

/**
 * Verifica si el cleaner está activo
 */
function isCleanupActive() {
  return orphanCleanupInterval !== null;
}

/**
 * Limpieza manual de una conexión específica
 */
function cleanupConnection(sshConnectionPool, poolKey) {
  const poolConnection = sshConnectionPool[poolKey];
  if (poolConnection) {
    try {
      if (poolConnection.ssh) {
        poolConnection.ssh.removeAllListeners();
      }
      poolConnection.close();
      delete sshConnectionPool[poolKey];
      return true;
    } catch (e) {
      console.error(`Error cleaning up connection ${poolKey}:`, e.message);
      return false;
    }
  }
  return false;
}

module.exports = {
  startOrphanCleanup,
  stopOrphanCleanup,
  isCleanupActive,
  cleanupConnection,
  CLEANUP_INTERVAL_MS,
  MAX_IDLE_TIME_MS
};
