/**
 * Ring buffer de stdout por tabId mientras la UI del terminal está hibernada.
 * La sesión SSH/PTY sigue viva; al despertar se drena el ring al remount.
 */

const DEFAULT_MAX_BYTES = 256 * 1024;

class TerminalStdoutRingBuffer {
  constructor(options = {}) {
    this.maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
    this.hibernating = new Set();
    this.buffers = new Map(); // tabId -> { chunks: string[], pendingBytes: number }
  }

  isHibernating(tabId) {
    return !!tabId && this.hibernating.has(tabId);
  }

  setHibernating(tabId, hibernated) {
    if (!tabId) return;
    if (hibernated) {
      this.hibernating.add(tabId);
      if (!this.buffers.has(tabId)) {
        this.buffers.set(tabId, { chunks: [], pendingBytes: 0 });
      }
    } else {
      this.hibernating.delete(tabId);
    }
  }

  _trim(entry) {
    while (entry.pendingBytes > this.maxBytes && entry.chunks.length > 0) {
      const half = Math.floor(entry.chunks.length / 2) || 1;
      const removed = entry.chunks.splice(0, half);
      entry.pendingBytes -= removed.reduce((acc, c) => acc + c.length, 0);
    }
    if (entry.pendingBytes < 0) entry.pendingBytes = 0;
  }

  push(tabId, data) {
    if (!tabId || data == null) return;
    const str = typeof data === 'string' ? data : String(data);
    if (!str) return;

    let entry = this.buffers.get(tabId);
    if (!entry) {
      entry = { chunks: [], pendingBytes: 0 };
      this.buffers.set(tabId, entry);
    }
    entry.chunks.push(str);
    entry.pendingBytes += str.length;
    this._trim(entry);
  }

  /**
   * Vacía y devuelve el contenido acumulado (string vacío si no hay nada).
   * También sale del modo hibernación para ese tabId.
   */
  drain(tabId) {
    this.hibernating.delete(tabId);
    const entry = this.buffers.get(tabId);
    if (!entry || entry.chunks.length === 0) {
      this.buffers.delete(tabId);
      return '';
    }
    const payload = entry.chunks.length === 1 ? entry.chunks[0] : entry.chunks.join('');
    this.buffers.delete(tabId);
    return payload;
  }

  clear(tabId) {
    if (!tabId) return;
    this.buffers.delete(tabId);
    this.hibernating.delete(tabId);
  }
}

const terminalStdoutRingBuffer = new TerminalStdoutRingBuffer();

module.exports = {
  TerminalStdoutRingBuffer,
  terminalStdoutRingBuffer
};
