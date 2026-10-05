/**
 * TerminalIpcBatcher - Micro-batching de salida de terminal en el proceso principal
 * 
 * Propósito:
 * - Evitar saturar el canal IPC de Chromium y el event loop del proceso principal
 *   durante ráfagas masivas de stdout (ej. 'cat archivo_grande.log', 'docker logs', 'find /').
 * - Agrupar micro-fragmentos de node-pty/ssh en un único payload IPC en ventanas de 4ms
 *   o hasta alcanzar el límite de fotograma (64 KB).
 * - Latencia interactiva imperceptible (<4ms, muy por debajo de 16.6ms / 60 FPS) para pulsaciones y comandos normales.
 * - Flush garantizado antes de emitir eventos de cierre o desconexión.
 */

const { sendToRenderer } = require('../utils/connection-utils');

class TerminalIpcBatcher {
  constructor(options = {}) {
    this.batchDelayMs = options.batchDelayMs || 4;
    this.maxBufferSize = options.maxBufferSize || 64 * 1024; // 64 KB
    this.channels = new Map();
  }

  /**
   * Encola un fragmento de datos para envío por lotes al renderer
   * @param {Object} sender - BrowserWindow o webContents destino
   * @param {string} channel - Canal IPC (ej. 'ssh:data:tab-1', 'powershell:data:tab-2')
   * @param {string|Buffer} data - Fragmento recibido del proceso/stream
   */
  send(sender, channel, data) {
    if (!data || !channel) return;
    const str = typeof data === 'string' ? data : data.toString('utf-8');
    if (!str) return;

    let entry = this.channels.get(channel);
    if (!entry) {
      entry = {
        sender,
        channel,
        buffer: '',
        timer: null
      };
      this.channels.set(channel, entry);
    } else {
      entry.sender = sender;
    }

    entry.buffer += str;

    // Si alcanzamos el tamaño máximo por lote, enviar de inmediato
    if (entry.buffer.length >= this.maxBufferSize) {
      this.flush(channel);
      return;
    }

    // Programar el flush si no hay temporizador activo
    if (!entry.timer) {
      entry.timer = setTimeout(() => {
        this.flush(channel);
      }, this.batchDelayMs);
    }
  }

  /**
   * Envía inmediatamente cualquier dato pendiente para un canal específico
   * @param {string} channel - Canal IPC a vaciar
   */
  flush(channel) {
    const entry = this.channels.get(channel);
    if (!entry) return;

    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }

    const payload = entry.buffer;
    const sender = entry.sender;
    this.channels.delete(channel);

    if (payload.length > 0) {
      sendToRenderer(sender, channel, payload);
    }
  }

  /**
   * Vacía todos los canales pendientes (ej. en apagado de la app o suspensión)
   */
  flushAll() {
    for (const channel of Array.from(this.channels.keys())) {
      this.flush(channel);
    }
  }

  /**
   * Cancela y descarta los datos pendientes de un canal sin enviarlos (ej. tab destruida)
   * @param {string} channel - Canal IPC
   */
  clear(channel) {
    const entry = this.channels.get(channel);
    if (entry) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      this.channels.delete(channel);
    }
  }

  /**
   * Devuelve si hay datos en cola para un canal
   * @param {string} channel
   * @returns {boolean}
   */
  hasPending(channel) {
    const entry = this.channels.get(channel);
    return !!(entry && entry.buffer.length > 0);
  }
}

const terminalIpcBatcher = new TerminalIpcBatcher();

module.exports = {
  TerminalIpcBatcher,
  terminalIpcBatcher
};
