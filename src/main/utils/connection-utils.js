/**
 * Utilidades para manejo de conexiones
 * - Envío seguro de mensajes al renderer
 * - Limpieza de conexiones huérfanas
 */

/**
 * Devuelve webContents si el renderer puede recibir IPC.
 * @param {Object} sender - BrowserWindow, webContents o sender IPC
 * @returns {Object|null}
 */
function isRendererSendable(sender) {
  if (!sender) return null;
  let wc = sender;
  if (typeof sender.isDestroyed === 'function') {
    if (sender.isDestroyed()) return null;
    try {
      if (sender.webContents) wc = sender.webContents;
    } catch (_) {
      return null;
    }
  }
  if (!wc) return null;
  if (typeof wc.isDestroyed === 'function' && wc.isDestroyed()) return null;
  if (typeof wc.isCrashed === 'function' && wc.isCrashed()) return null;
  try {
    const frame = wc.mainFrame;
    if (frame && typeof frame.isDestroyed === 'function' && frame.isDestroyed()) {
      return null;
    }
  } catch (_) {
    return null;
  }
  return wc;
}

/**
 * Envia un mensaje de forma segura al renderer
 * @param {Object} sender - Objeto sender del evento IPC
 * @param {string} eventName - Nombre del evento a enviar
 * @param {...any} args - Argumentos adicionales para el evento
 */
function sendToRenderer(sender, eventName, ...args) {
  try {
    const wc = isRendererSendable(sender);
    if (!wc) return;
    wc.send(eventName, ...args);
  } catch (error) {
    // Ignorar silenciosamente errores de envio durante el cierre o crash del renderer
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
  isRendererSendable,
  sendToRenderer,
  cleanupOrphanedConnections
};
