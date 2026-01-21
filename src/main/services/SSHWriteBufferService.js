/**
 * SSHWriteBufferService - Servicio de buffering optimizado para conexiones Wallix/Bastion
 * 
 * Propósito:
 * - Reducir lag en conexiones Wallix/Bastion mediante micro-batching
 * - Acumular caracteres individuales en un buffer
 * - Flush inmediato para caracteres especiales (Enter, Ctrl+C, ESC, etc.)
 * - Flush con delay corto (5ms) para caracteres normales
 * 
 * Beneficios:
 * - Mejora significativa de rendimiento en conexiones lentas
 * - Reduce overhead de red al agrupar múltiples caracteres
 * - Mantiene respuesta inmediata para comandos importantes
 */

class SSHWriteBufferService {
  constructor() {
    // No necesitamos estado global, cada conexión tiene su propio buffer
  }

  /**
   * Inicializa el buffer de escritura para una conexión
   */
  initializeBuffer(conn) {
    if (!conn) return;

    conn._writeBuffer = '';
    conn._writeBufferTimeout = null;
  }

  /**
   * Verifica si una conexión usa buffering (Wallix/Bastion)
   */
  shouldUseBuffering(conn) {
    if (!conn) return false;
    
    return conn.config?.useBastionWallix || conn.ssh?._isWallixConnection;
  }

  /**
   * Verifica si un dato contiene caracteres especiales que requieren flush inmediato
   */
  hasSpecialCharacter(data) {
    return data.includes('\r') ||    // Enter
           data.includes('\n') ||    // Nueva línea
           data.includes('\x03') ||  // Ctrl+C
           data.includes('\x04') ||  // Ctrl+D (EOF)
           data.includes('\x1b');    // ESC
  }

  /**
   * Hace flush del buffer de escritura
   */
  flushBuffer(conn, tabId, getSessionRecorder) {
    if (!conn || !conn._writeBuffer || !conn.stream || conn.stream.destroyed) {
      return;
    }

    const bufferedData = conn._writeBuffer;
    conn._writeBuffer = '';
    conn._writeBufferTimeout = null;

    // Grabar input de forma asíncrona (no bloqueante)
    if (getSessionRecorder && getSessionRecorder().isRecording(tabId)) {
      setImmediate(() => {
        getSessionRecorder().recordInput(tabId, bufferedData);
      });
    }

    // Escribir al stream
    conn.stream.write(bufferedData);
  }

  /**
   * Procesa escritura de datos con buffering optimizado
   * @param {Object} conn - Objeto de conexión
   * @param {string} data - Datos a escribir
   * @param {string} tabId - ID de la pestaña
   * @param {Function} getSessionRecorder - Función para obtener el grabador de sesión
   * @returns {boolean} - true si se procesó con buffering, false si no aplica
   */
  writeWithBuffering(conn, data, tabId, getSessionRecorder) {
    if (!conn || !this.shouldUseBuffering(conn)) {
      return false; // No aplica buffering
    }

    // Inicializar buffer si no existe
    if (!conn._writeBuffer) {
      this.initializeBuffer(conn);
    }

    // Acumular datos en el buffer
    conn._writeBuffer += data;

    // Cancelar timeout previo si existe
    if (conn._writeBufferTimeout) {
      clearTimeout(conn._writeBufferTimeout);
    }

    // Decidir estrategia de flush
    const hasSpecialChar = this.hasSpecialCharacter(data);
    const bufferIsFull = conn._writeBuffer.length >= 8;

    if (hasSpecialChar || bufferIsFull) {
      // Flush inmediato para comandos o buffers largos
      this.flushBuffer(conn, tabId, getSessionRecorder);
    } else {
      // Para caracteres normales, hacer micro-batching con timeout corto
      conn._writeBufferTimeout = setTimeout(() => {
        this.flushBuffer(conn, tabId, getSessionRecorder);
      }, 5); // 5ms delay
    }

    return true; // Se procesó con buffering
  }

  /**
   * Limpia el buffer y timeout de una conexión
   */
  cleanup(conn) {
    if (!conn) return;

    if (conn._writeBufferTimeout) {
      clearTimeout(conn._writeBufferTimeout);
      conn._writeBufferTimeout = null;
    }

    conn._writeBuffer = '';
  }

  /**
   * Hace flush final del buffer antes de cerrar la conexión
   * Usado en limpieza de conexiones
   */
  finalFlush(conn) {
    if (!conn || !conn._writeBuffer) return;

    if (conn.stream && !conn.stream.destroyed) {
      try {
        conn.stream.write(conn._writeBuffer);
      } catch (e) {
        // Ignorar errores durante el cierre
      }
    }

    conn._writeBuffer = '';
  }
}

// Exportar instancia única (singleton)
module.exports = new SSHWriteBufferService();
