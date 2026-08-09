/**
 * Utilidades para manejo de conexiones
 * - Envío seguro de mensajes al renderer
 * - Limpieza de conexiones huérfanas
 */

/**
 * Envía un mensaje de forma segura al renderer
 * @param {Object} sender - Objeto sender del evento IPC
 * @param {string} eventName - Nombre del evento a enviar
 * @param {...any} args - Argumentos adicionales para el evento
 */
function sendToRenderer(sender, eventName, ...args) {
  try {
    if (!sender) return;
    let wc = sender;
    if (typeof sender.isDestroyed === 'function') {
      if (sender.isDestroyed()) return;
      try {
        if (sender.webContents) wc = sender.webContents;
      } catch (_) {
        return;
      }
    }
    if (wc && typeof wc.isDestroyed === 'function' && !wc.isDestroyed()) {
      wc.send(eventName, ...args);
    }
  } catch (error) {
    // Ignorar silenciosamente errores de envío durante el cierre de la aplicación
  }
}

/**
 * Limpia conexiones SSH huérfanas del pool de conexiones
 * @param {Object} sshConnectionPool - Pool de conexiones SSH
 * @param {Object} sshConnections - Conexiones SSH activas
 */
function cleanupOrphanedConnections(sshConnectionPool, sshConnections) {
  Object.keys(sshConnectionPool).forEach(cacheKey => {
    const poolConnection = sshConnectionPool[cacheKey];
    // Verificar si hay alguna conexión activa usando esta conexión del pool
    const hasActiveConnections = Object.values(sshConnections).some(conn => conn.cacheKey === cacheKey);
    
    if (!hasActiveConnections) {
      // console.log(`Limpiando conexión SSH huérfana: ${cacheKey}`);
      try {
        // Limpiar listeners antes de cerrar
        poolConnection.removeAllListeners('error');
        poolConnection.removeAllListeners('close');
        poolConnection.removeAllListeners('end');
        if (poolConnection.ssh) {
          poolConnection.ssh.removeAllListeners('error');
          poolConnection.ssh.removeAllListeners('close');
          poolConnection.ssh.removeAllListeners('end');
        }
        poolConnection.close();
      } catch (e) {
        // Ignorar errores de cierre
      }
      delete sshConnectionPool[cacheKey];
    }
  });
}

module.exports = {
  sendToRenderer,
  cleanupOrphanedConnections
};
