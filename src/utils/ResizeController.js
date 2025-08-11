/*
 * ResizeController
 *
 * Centraliza la lógica de redimensionamiento para Guacamole:
 * - Observa el contenedor con ResizeObserver
 * - Solo envía el tamaño final (debounce trailing)
 * - Cola de un solo elemento; nunca satura el servidor
 * - Gate por ACK: espera display.onresize o timeout
 */

export default class ResizeController {
  constructor(options) {
    this.getContainer = options.getContainer; // () => HTMLElement | null
    this.canSend = options.canSend; // () => boolean
    this.sendSize = options.sendSize; // (w,h) => void

    // ACK gating externo (refs en el componente)
    this.getAwaitingAck = options.getAwaitingAck; // () => boolean
    this.getAckDeadline = options.getAckDeadline; // () => number
    this.setAwaitingAck = options.setAwaitingAck; // (bool, deadlineTs) => void
    this.releaseAck = options.releaseAck; // () => void

    // Dedupe con última dimensión conocida
    this.getLastDims = options.getLastDims; // () => { width:number, height:number }
    this.setLastDims = options.setLastDims; // ({width,height}) => void

    // Config
    this.debounceMs = Math.max(50, Number(options.debounceMs || 300));
    this.ackTimeoutMs = Math.max(300, Number(options.ackTimeoutMs || 1500));
    this.onLog = options.onLog || (() => {});

    // Internos
    this._observer = null;
    this._debounceTimer = null;
    this._pendingSize = null; // { width, height }
    this._started = false;
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  start() {
    if (this._started) this.stop();
    const container = this.getContainer();
    if (!container) return;

    // ResizeObserver para detectar cambios reales de contenedor
    this._observer = new ResizeObserver(() => {
      const el = this.getContainer();
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width <= 0 || height <= 0) return;
      this._pendingSize = { width, height };
      this._schedule();
    });
    try {
      this._observer.observe(container);
    } catch {}

    // Flush inmediato al soltar el ratón (si el OS lo notifica)
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('pointerup', this._onMouseUp);
    document.addEventListener('touchend', this._onMouseUp, { passive: true });

    this._started = true;
    this.onLog('🧭 ResizeController: start()');
  }

  stop() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    if (this._observer) {
      try { this._observer.disconnect(); } catch {}
      this._observer = null;
    }
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('pointerup', this._onMouseUp);
    document.removeEventListener('touchend', this._onMouseUp);
    this._started = false;
    this.onLog('🧭 ResizeController: stop()');
  }

  notify() {
    // Medir y programar debounced
    const el = this.getContainer();
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    if (width <= 0 || height <= 0) return;
    this._pendingSize = { width, height };
    this._schedule();
  }

  flush() {
    // Medir y enviar inmediatamente si es posible
    const el = this.getContainer();
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    if (width <= 0 || height <= 0) return;
    this._pendingSize = { width, height };
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    this._trySend();
  }

  handleAck() {
    // Se llama desde display.onresize
    this.releaseAck();
    // Si hay tamaño pendiente, intentar enviar ahora
    if (this._pendingSize) {
      // microtask para no bloquear onresize
      setTimeout(() => this._trySend(), 0);
    }
  }

  _onMouseUp() {
    // Flush inmediato cuando el usuario suelta el botón
    if (this._pendingSize) this.flush();
  }

  _schedule() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._trySend();
    }, this.debounceMs);
  }

  _trySend() {
    if (!this._pendingSize) return;
    if (!this.canSend || !this.canSend()) return;

    const now = Date.now();
    if (this.getAwaitingAck && this.getAwaitingAck()) {
      const deadline = this.getAckDeadline ? Number(this.getAckDeadline()) : 0;
      if (deadline && now < deadline) {
        // Aún esperando ACK. Mantener pendiente y salir
        this.onLog('⏸️ ResizeController: esperando ACK, envío aplazado');
        return;
      }
      // Deadline vencido, liberar gate
      this.releaseAck && this.releaseAck();
    }

    const { width, height } = this._pendingSize;
    const last = this.getLastDims ? this.getLastDims() : { width: 0, height: 0 };
    if (last && last.width === width && last.height === height) {
      // Nada que enviar
      this._pendingSize = null;
      return;
    }

    try {
      this.sendSize(width, height);
      this.setLastDims && this.setLastDims({ width, height });
      this.setAwaitingAck && this.setAwaitingAck(true, now + this.ackTimeoutMs);
      this.onLog(`📡 ResizeController: sendSize ${width}x${height}`);
    } catch (e) {
      this.onLog(`❌ ResizeController: error sendSize ${e?.message || e}`);
    } finally {
      this._pendingSize = null;
    }
  }
}


