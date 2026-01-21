/**
 * SSHConnectionCleanupService - Servicio centralizado para limpieza de conexiones SSH
 * 
 * Maneja:
 * - Limpieza de timeouts (stats, buffers)
 * - Cierre seguro de streams
 * - Cierre de conexiones SSH compartidas
 * - Limpieza de pools de conexiones
 * - Flush de buffers pendientes
 */

const { sendToRenderer } = require('../utils');
const sshWriteBufferService = require('./SSHWriteBufferService');

class SSHConnectionCleanupService {
  constructor() {
    // No necesitamos estado global
  }

  /**
   * Limpia todos los timeouts asociados a una conexión
   */
  cleanupTimeouts(conn) {
    if (!conn) return;

    // Limpiar timeout de stats
    if (conn.statsTimeout) {
      clearTimeout(conn.statsTimeout);
      conn.statsTimeout = null;
    }

    // Limpiar buffer de escritura pendiente (Wallix)
    // Usa SSHWriteBufferService para consistencia
    sshWriteBufferService.cleanup(conn);
  }

  /**
   * Hace flush del buffer de escritura pendiente antes de cerrar
   * Usa SSHWriteBufferService para consistencia
   */
  flushWriteBuffer(conn) {
    if (!conn) return;
    
    sshWriteBufferService.finalFlush(conn);
  }

  /**
   * Cierra el stream de forma segura
   */
  closeStream(conn) {
    if (!conn || !conn.stream) return;

    try {
      conn.stream.removeAllListeners();
      if (!conn.stream.destroyed) {
        conn.stream.destroy();
      }
    } catch (e) {
      // Ignorar errores al destruir stream
    }
  }

  /**
   * Verifica si otras pestañas están usando la misma conexión SSH
   */
  getOtherTabsUsingConnection(conn, sshConnections) {
    if (!conn || !conn.cacheKey) return [];

    return Object.values(sshConnections)
      .filter(c => c !== conn && c.cacheKey === conn.cacheKey);
  }

  /**
   * Cierra la conexión SSH de forma segura
   * Solo cierra si no hay otras pestañas usando la misma conexión
   */
  closeSSHConnection(conn, sshConnectionPool, otherTabsCount = 0) {
    if (!conn || !conn.ssh) return;

    // Solo cerrar si no hay otras pestañas usando la conexión
    // Para bastiones, cada terminal es independiente, así que siempre cerrar
    if (otherTabsCount === 0 && conn.cacheKey) {
      try {
        // Limpiar listeners específicos de la conexión SSH
        if (conn.ssh.ssh) {
          // Solo remover listeners específicos en lugar de todos
          conn.ssh.ssh.removeAllListeners('error');
          conn.ssh.ssh.removeAllListeners('close');
          conn.ssh.ssh.removeAllListeners('end');
        }

        // Limpiar listeners del SSH2Promise también
        conn.ssh.removeAllListeners('error');
        conn.ssh.removeAllListeners('close');
        conn.ssh.removeAllListeners('end');

        // Cerrar conexión
        conn.ssh.close();

        // Eliminar del pool de conexiones
        if (sshConnectionPool && conn.cacheKey) {
          delete sshConnectionPool[conn.cacheKey];
        }
      } catch (e) {
        // Ignorar errores al cerrar conexión SSH
      }
    }
  }

  /**
   * Limpia una conexión SSH completa (usado en ssh:disconnect)
   * @param {string} tabId - ID de la pestaña
   * @param {Object} conn - Objeto de conexión
   * @param {Object} sshConnections - Mapa de conexiones SSH
   * @param {Object} sshConnectionPool - Pool de conexiones SSH
   * @param {Object} bastionStatsState - Estado de estadísticas de bastion (opcional)
   * @param {Object} sender - Sender para eventos IPC (opcional)
   * @returns {boolean} - true si se limpió exitosamente
   */
  cleanupConnection(tabId, conn, sshConnections, sshConnectionPool, bastionStatsState = null, sender = null) {
    if (!conn) return false;

    try {
      // 1. Limpiar timeouts
      this.cleanupTimeouts(conn);

      // 2. Flush buffer pendiente
      this.flushWriteBuffer(conn);

      // 3. Verificar otras pestañas usando la misma conexión
      const otherTabsUsingConnection = this.getOtherTabsUsingConnection(conn, sshConnections);

      // 4. Cerrar stream
      this.closeStream(conn);

      // 5. Enviar evento de desconexión (solo si no hay otras tabs)
      if (otherTabsUsingConnection.length === 0 && sender) {
        const disconnectOriginalKey = conn.originalKey || conn.cacheKey;
        sendToRenderer(sender, 'ssh-connection-disconnected', {
          originalKey: disconnectOriginalKey,
          tabId: tabId
        });
      }

      // 6. Cerrar conexión SSH si no hay otras tabs usándola
      this.closeSSHConnection(conn, sshConnectionPool, otherTabsUsingConnection.length);

      // 7. Limpiar estado de bastion si existe
      if (bastionStatsState && bastionStatsState[tabId]) {
        delete bastionStatsState[tabId];
      }

      return true;
    } catch (error) {
      // Error cleaning up SSH connection
      return false;
    } finally {
      // 8. Siempre eliminar la conexión del mapa
      delete sshConnections[tabId];
    }
  }

  /**
   * Limpia todas las conexiones SSH (usado en before-quit)
   * @param {Object} sshConnections - Mapa de conexiones SSH
   */
  cleanupAllConnections(sshConnections) {
    if (!sshConnections) return;

    Object.values(sshConnections).forEach(conn => {
      // Limpiar timeouts
      if (conn.statsTimeout) {
        clearTimeout(conn.statsTimeout);
      }

      // Limpiar buffer de escritura usando el servicio
      sshWriteBufferService.cleanup(conn);

      // Cerrar stream
      if (conn.stream) {
        try {
          conn.stream.removeAllListeners();
          if (!conn.stream.destroyed) {
            conn.stream.destroy();
          }
        } catch (e) {
          // Ignorar errores
        }
      }

      // Cerrar conexión SSH
      if (conn.ssh) {
        try {
          if (conn.ssh.ssh) {
            // Limpiar listeners específicos
            conn.ssh.ssh.removeAllListeners('error');
            conn.ssh.ssh.removeAllListeners('close');
            conn.ssh.ssh.removeAllListeners('end');
          }

          // Limpiar listeners del SSH2Promise
          conn.ssh.removeAllListeners('error');
          conn.ssh.removeAllListeners('close');
          conn.ssh.removeAllListeners('end');

          conn.ssh.close();
        } catch (e) {
          // Ignorar errores
        }
      }
    });
  }

  /**
   * Crea un handler de cierre para conexiones (callback)
   * Útil para crear callbacks estandarizados de 'close'
   */
  createCloseHandler(tabId, conn, sshConnections, bastionStatsState, sender, additionalCleanup = null) {
    return () => {
      sendToRenderer(sender, `ssh:data:${tabId}`, '\r\nConnection closed.\r\n');

      // Limpiar timeout de stats
      if (conn && conn.statsTimeout) {
        clearTimeout(conn.statsTimeout);
      }

      // Enviar evento de desconexión
      sendToRenderer(sender, 'ssh-connection-disconnected', {
        originalKey: conn.originalKey || tabId,
        tabId: tabId
      });

      // Limpieza adicional personalizada
      if (additionalCleanup && typeof additionalCleanup === 'function') {
        additionalCleanup();
      }

      // Limpiar estado de bastion
      if (bastionStatsState && bastionStatsState[tabId]) {
        delete bastionStatsState[tabId];
      }

      // Eliminar conexión
      delete sshConnections[tabId];
    };
  }
}

// Exportar instancia única (singleton)
module.exports = new SSHConnectionCleanupService();
