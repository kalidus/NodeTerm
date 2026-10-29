/**
 * TerminalIpcBatcher - Micro-batching de salida de terminal en el proceso principal
 *
 * Propósito:
 * - Evitar saturar el canal IPC de Chromium y el event loop del proceso principal
 *   durante ráfagas masivas de stdout (ej. 'cat archivo_grande.log', 'docker logs', 'find /').
 * - Agrupar micro-fragmentos de node-pty/ssh en un único payload IPC en ventanas de 4ms
 *   o hasta alcanzar el límite de fotograma (64 KB).
 * - Latencia interactiva imperceptible (<4ms, muy por debajo de 16.6ms / 60 FPS).
 * - Flush garantizado antes de emitir eventos de cierre o desconexión.
 * - SSH: decodificar UTF-8 al instante con StringDecoder (nunca encolar Buffer).
 *   ssh2 reutiliza el pool de memoria entre eventos 'data'; retener el Buffer aunque
 *   se haya copiado es frágil — StringDecoder consume los bytes de forma síncrona.
 */

const { StringDecoder } = require('string_decoder');
const { sendToRenderer } = require('../utils/connection-utils');
const { terminalStdoutRingBuffer } = require('./TerminalStdoutRingBuffer');

function sshTabIdFromChannel(channel) {
  if (!channel || typeof channel !== 'string') return null;
  if (!channel.startsWith('ssh:data:')) return null;
  return channel.slice('ssh:data:'.length) || null;
}

/**
 * Copia defensiva de bytes entrantes (tests / callers que aún pasan Buffer).
 * Preferir decodeInSend: no retener el resultado entre ticks.
 */
function normalizeChunk(data) {
  if (data == null) return null;
  if (typeof data === 'string') {
    return data.length ? data : null;
  }
  if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
    if (data.length === 0) return null;
    return Buffer.from(data);
  }
  const buf = Buffer.from(String(data));
  return buf.length ? buf : null;
}

class TerminalIpcBatcher {
  constructor(options = {}) {
    this.batchDelayMs = options.batchDelayMs || 4;
    this.maxBufferSize = options.maxBufferSize || 64 * 1024; // 64 KB
    this.channels = new Map();
    /** @type {Map<string, import('string_decoder').StringDecoder>} */
    this.decoders = new Map();
    /** @type {Map<string, Object>} último sender por canal (flush final sin entry) */
    this.lastSenderByChannel = new Map();
  }

  getDecoder(channel) {
    let decoder = this.decoders.get(channel);
    if (!decoder) {
      decoder = new StringDecoder('utf8');
      this.decoders.set(channel, decoder);
    }
    return decoder;
  }

  dropDecoder(channel) {
    this.decoders.delete(channel);
  }

  rememberSender(channel, sender) {
    if (channel && sender) this.lastSenderByChannel.set(channel, sender);
  }

  /**
   * Convierte el fragmento a string UTF-8 de inmediato.
   * Los Buffer/Uint8Array se consumen con StringDecoder (incompletos quedan en el decoder).
   * Nunca se retienen referencias al Buffer del socket.
   */
  toBatchedText(channel, data) {
    if (data == null) return '';
    if (typeof data === 'string') {
      // Si había bytes incompletos de un Buffer previo, cerrar el decoder antes del string.
      if (this.decoders.has(channel)) {
        const tail = this.decoders.get(channel).end();
        this.dropDecoder(channel);
        return tail + data;
      }
      return data;
    }
    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
      if (data.length === 0) return '';
      // StringDecoder.write lee de forma síncrona; tras volver, ssh2 puede reutilizar el pool.
      // Pasamos el Buffer original (sin copiar): no lo retenemos.
      return this.getDecoder(channel).write(data);
    }
    return String(data);
  }

  endDecoder(channel) {
    if (!this.decoders.has(channel)) return '';
    const tail = this.decoders.get(channel).end();
    this.dropDecoder(channel);
    return tail || '';
  }

  /**
   * Encola un fragmento de datos para envío por lotes al renderer
   * @param {Object} sender - BrowserWindow o webContents destino
   * @param {string} channel - Canal IPC (ej. 'ssh:data:tab-1', 'powershell:data:tab-2')
   * @param {string|Buffer|Uint8Array} data - Fragmento recibido del proceso/stream
   */
  send(sender, channel, data) {
    if (!channel || data == null || data === '') return;

    this.rememberSender(channel, sender);

    const text = this.toBatchedText(channel, data);
    // text vacío es válido tras un Buffer con UTF-8 incompleto (queda en el decoder).
    if (!text) return;

    const hibernateTabId = sshTabIdFromChannel(channel);
    if (hibernateTabId && terminalStdoutRingBuffer.isHibernating(hibernateTabId)) {
      terminalStdoutRingBuffer.push(hibernateTabId, text);
      return;
    }

    let entry = this.channels.get(channel);
    if (!entry) {
      entry = {
        sender,
        channel,
        chunks: [],
        pendingBytes: 0,
        timer: null
      };
      this.channels.set(channel, entry);
    } else {
      entry.sender = sender;
    }

    entry.chunks.push(text);
    entry.pendingBytes += Buffer.byteLength(text, 'utf8');

    if (entry.pendingBytes >= this.maxBufferSize) {
      this.flush(channel);
      return;
    }

    if (!entry.timer) {
      entry.timer = setTimeout(() => {
        this.flush(channel);
      }, this.batchDelayMs);
    }
  }

  /**
   * Envía inmediatamente cualquier dato pendiente para un canal específico
   * @param {string} channel - Canal IPC a vaciar
   * @param {{ final?: boolean }} [options] - final=true en cierre (flushea el decoder)
   */
  flush(channel, options = {}) {
    const entry = this.channels.get(channel);
    const final = !!options.final;
    const hasDecoder = this.decoders.has(channel);

    if (!entry && !(final && hasDecoder)) return;

    if (entry?.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }

    const chunks = entry ? entry.chunks : [];
    const sender = (entry && entry.sender) || this.lastSenderByChannel.get(channel) || null;
    if (entry) this.channels.delete(channel);

    let payload = chunks.length === 0 ? '' : (chunks.length === 1 ? chunks[0] : chunks.join(''));
    if (final) {
      payload += this.endDecoder(channel);
    }

    if (payload && payload.length > 0 && sender) {
      sendToRenderer(sender, channel, payload);
    }
    if (final) this.lastSenderByChannel.delete(channel);
  }

  /**
   * Vacía todos los canales pendientes (ej. en apagado de la app o suspensión)
   */
  flushAll() {
    const channels = new Set([
      ...this.channels.keys(),
      ...this.decoders.keys()
    ]);
    for (const channel of channels) {
      this.flush(channel, { final: true });
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
    this.dropDecoder(channel);
    this.lastSenderByChannel.delete(channel);
  }

  /**
   * Mueve datos pendientes del batcher al ring de hibernación (sin IPC al renderer).
   */
  divertPendingToRing(channel, tabId) {
    const entry = this.channels.get(channel);
    const hasDecoder = this.decoders.has(channel);
    if (!entry && !hasDecoder) return;

    if (entry?.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }

    const chunks = entry ? entry.chunks : [];
    if (entry) this.channels.delete(channel);

    let payload = chunks.length === 0 ? '' : (chunks.length === 1 ? chunks[0] : chunks.join(''));
    payload += this.endDecoder(channel);
    if (payload && tabId) {
      terminalStdoutRingBuffer.push(tabId, payload);
    }
  }

  /**
   * Devuelve si hay datos en cola para un canal
   * @param {string} channel
   * @returns {boolean}
   */
  hasPending(channel) {
    const entry = this.channels.get(channel);
    return !!(entry && entry.pendingBytes > 0);
  }
}

const terminalIpcBatcher = new TerminalIpcBatcher();

module.exports = {
  TerminalIpcBatcher,
  terminalIpcBatcher,
  normalizeChunk
};
