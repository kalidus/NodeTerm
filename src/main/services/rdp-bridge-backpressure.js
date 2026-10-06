/**
 * Contrapresión y métricas del bridge IronRDP.
 *
 * En bastión Wallix, pausar TLS provoca bufferbloat (el PAM encola).
 * En directo, pausar TLS a 512 KB tambien dejaba al servidor callado y luego
 * soltaba la rafaga (p95 de cientos de ms). En los dos casos: latest-wins
 * seguro — encolar Fast-Path BITMAP cuando la cola WebSocket esta llena y
 * descartar solo los que un bitmap posterior cubre por completo.
 * El presupuesto RLE (3 ms) solo aplica en bastion, que es quien reescribe.
 */

'use strict';

const {
  parseFastPathUpdate,
  FASTPATH_UPDATETYPE_BITMAP,
  getBitmapDestRects,
  rectsCoveredBy
} = require('./rdp-fastpath-helpers');

/** Tope de bitmaps pendientes antes de forzar su envio ordenado. */
const MAX_PENDING_FRAMES = 24;
const MAX_PENDING_BYTES = 1024 * 1024;

/** Bastión: umbral bajo para empezar a descartar (WASM aún no ha acumulado mucho). */
const WS_HIGH_WATER_MARK = 64 * 1024; // 64 KB
/** Reanudar envío del bitmap pendiente. */
const WS_LOW_WATER_MARK = 16 * 1024; // 16 KB
/** Solo path directo: pausa TLS como ultimo recurso anti-OOM, no al primer pico. */
const WS_PAUSE_TLS_MARK = 2 * 1024 * 1024; // 2 MB
/** Máx. ms de rewrite RLE por evento TLS en bastión (el resto se shed). */
const BASTION_REWRITE_BUDGET_MS = 3;

function isFastPathBitmapFrame(buf) {
  const parsed = parseFastPathUpdate(buf);
  return !!(
    parsed
    && parsed.updateCode === FASTPATH_UPDATETYPE_BITMAP
    && parsed.compression === 0
  );
}

/**
 * Clasifica un Fast-Path update completo (solo diagnostico).
 * @returns {'BITMAP'|'SURFACE_CMDS'|'ORDERS'|'POINTER'|'OTHER'|null} null si no es Fast-Path completo.
 */
function classifyFastPathUpdate(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return null;
  if (buf[0] === 0x03 || buf[0] === 0x30) return null;
  if ((buf[0] & 0x03) !== 0) return null;
  const hdrLen = (buf[1] & 0x80) ? 3 : 2;
  if (buf.length <= hdrLen) return null;
  const code = buf[hdrLen] & 0x0f;
  switch (code) {
    case 0: return 'ORDERS';
    case 1: return 'BITMAP';
    case 4: return 'SURFACE_CMDS';
    case 5: case 6: case 7: case 8: case 9: case 10: case 11: return 'POINTER';
    default: return 'OTHER';
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

/**
 * Acumulador de latencia/cola (solo se instancia con NODETERM_RDP_DEBUG).
 */
class BridgeLatencyMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    this.rewriteSamplesMs = [];
    this.rewritePatched = 0;
    this.rewritePassthrough = 0;
    this.bitmapShed = 0;
    this.bitmapFlushed = 0;
    this.bitmapCoalesced = 0;
    this.budgetShed = 0;
    this.bufferedAmountPeak = 0;
    this.tlsPauseCount = 0;
    this.tlsPausedMs = 0;
    this._tlsPausedSince = 0;
    this.gapsMs = [];
    this.lastSummaryAt = 0;
    this.totalRewriteMs = 0;
    this.inputToUpdateMs = [];
    this._pendingInputAt = 0;
    this.updateBytesByKind = Object.create(null);
    this.updateCountByKind = Object.create(null);
    this._loopMonitor = null;
  }

  /** Input del cliente reenviado al servidor (se conserva el mas antiguo sin respuesta). */
  noteInput(now = Date.now()) {
    if (!this._pendingInputAt) this._pendingInputAt = now;
  }

  /** Update grafico recibido del servidor: cierra la medicion input -> update. */
  noteUpdate(kind, bytes, now = Date.now()) {
    if (!kind) return;
    this.updateBytesByKind[kind] = (this.updateBytesByKind[kind] || 0) + (bytes || 0);
    this.updateCountByKind[kind] = (this.updateCountByKind[kind] || 0) + 1;
    if (this._pendingInputAt && (kind === 'BITMAP' || kind === 'SURFACE_CMDS' || kind === 'ORDERS')) {
      const ms = now - this._pendingInputAt;
      this._pendingInputAt = 0;
      if (ms >= 0 && ms < 5000 && this.inputToUpdateMs.length < 2000) {
        this.inputToUpdateMs.push(ms);
      }
    }
  }

  /** Lag del event loop del proceso main (perf_hooks). No-op si no esta disponible. */
  startLoopMonitor() {
    if (this._loopMonitor) return;
    try {
      const { monitorEventLoopDelay } = require('perf_hooks');
      this._loopMonitor = monitorEventLoopDelay({ resolution: 5 });
      this._loopMonitor.enable();
    } catch (_) {
      this._loopMonitor = null;
    }
  }

  stopLoopMonitor() {
    if (!this._loopMonitor) return;
    try { this._loopMonitor.disable(); } catch (_) { /* noop */ }
    this._loopMonitor = null;
  }

  noteBufferedAmount(n) {
    if (typeof n === 'number' && n > this.bufferedAmountPeak) {
      this.bufferedAmountPeak = n;
    }
  }

  noteRewrite(ms, patched) {
    if (typeof ms === 'number' && ms >= 0) {
      this.totalRewriteMs += ms;
      if (this.rewriteSamplesMs.length < 2000) {
        this.rewriteSamplesMs.push(ms);
      }
    }
    if (patched) this.rewritePatched += 1;
    else this.rewritePassthrough += 1;
  }

  noteShed(reason) {
    this.bitmapShed += 1;
    if (reason === 'budget') this.budgetShed += 1;
  }

  noteFlushPending(count = 1) {
    this.bitmapFlushed += count;
  }

  /** Bitmap pendiente descartado por quedar totalmente tapado por uno posterior. */
  noteCoalesced() {
    this.bitmapCoalesced += 1;
  }

  noteGap(ms) {
    if (typeof ms === 'number' && ms >= 0 && this.gapsMs.length < 2000) {
      this.gapsMs.push(ms);
    }
  }

  noteTlsPause(paused) {
    if (paused) {
      this.tlsPauseCount += 1;
      this._tlsPausedSince = Date.now();
    } else if (this._tlsPausedSince) {
      this.tlsPausedMs += Date.now() - this._tlsPausedSince;
      this._tlsPausedSince = 0;
    }
  }

  summary() {
    const rw = this.rewriteSamplesMs.slice().sort((a, b) => a - b);
    const gaps = this.gapsMs.slice().sort((a, b) => a - b);
    const i2u = this.inputToUpdateMs.slice().sort((a, b) => a - b);
    let loopP99Ms = 0;
    let loopMaxMs = 0;
    if (this._loopMonitor) {
      // El histograma de perf_hooks va en nanosegundos.
      loopP99Ms = this._loopMonitor.percentile(99) / 1e6;
      loopMaxMs = this._loopMonitor.max / 1e6;
    }
    return {
      inputToUpdateCount: i2u.length,
      inputToUpdateP50Ms: percentile(i2u, 50),
      inputToUpdateP95Ms: percentile(i2u, 95),
      loopP99Ms,
      loopMaxMs,
      updateBytesByKind: { ...this.updateBytesByKind },
      updateCountByKind: { ...this.updateCountByKind },
      rewriteCount: this.rewriteSamplesMs.length,
      rewritePatched: this.rewritePatched,
      rewritePassthrough: this.rewritePassthrough,
      rewriteP50Ms: percentile(rw, 50),
      rewriteP95Ms: percentile(rw, 95),
      totalRewriteMs: this.totalRewriteMs,
      bitmapShed: this.bitmapShed,
      budgetShed: this.budgetShed,
      bitmapFlushed: this.bitmapFlushed,
      bitmapCoalesced: this.bitmapCoalesced,
      bufferedAmountPeak: this.bufferedAmountPeak,
      tlsPauseCount: this.tlsPauseCount,
      tlsPausedMs: this.tlsPausedMs + (this._tlsPausedSince ? Date.now() - this._tlsPausedSince : 0),
      gapP50Ms: percentile(gaps, 50),
      gapP95Ms: percentile(gaps, 95)
    };
  }

  formatLine() {
    const s = this.summary();
    const kinds = Object.keys(s.updateBytesByKind)
      .map((k) => `${k}=${Math.round(s.updateBytesByKind[k] / 1024)}KB/${s.updateCountByKind[k]}`)
      .join(' ');
    return (
      `[Bridge Perf] in->upd n=${s.inputToUpdateCount} p50=${s.inputToUpdateP50Ms}ms p95=${s.inputToUpdateP95Ms}ms` +
      ` loop p99=${s.loopP99Ms.toFixed(1)}ms max=${s.loopMaxMs.toFixed(1)}ms` +
      (kinds ? ` | ${kinds}` : '') + ' || ' +
      `rewrite n=${s.rewriteCount} p50=${s.rewriteP50Ms.toFixed(2)}ms p95=${s.rewriteP95Ms.toFixed(2)}ms` +
      ` sum=${s.totalRewriteMs.toFixed(0)}ms patched=${s.rewritePatched} pass=${s.rewritePassthrough}` +
      ` shed=${s.bitmapShed} (budget=${s.budgetShed}) flushPending=${s.bitmapFlushed} covered=${s.bitmapCoalesced}` +
      ` wsPeak=${s.bufferedAmountPeak}` +
      ` tlsPause=${s.tlsPauseCount} (${s.tlsPausedMs}ms)` +
      ` gap p50=${s.gapP50Ms} p95=${s.gapP95Ms}`
    );
  }

  /**
   * Log periódico; devuelve true si imprimió.
   */
  maybeLog(logFn, intervalMs = 2000) {
    const now = Date.now();
    if (this.lastSummaryAt && now - this.lastSummaryAt < intervalMs) return false;
    const hasUpdates = Object.keys(this.updateCountByKind).length > 0;
    if (!this.rewriteSamplesMs.length && !this.bitmapShed && !this.tlsPauseCount
        && !this.inputToUpdateMs.length && !hasUpdates) {
      this.lastSummaryAt = now;
      return false;
    }
    this.lastSummaryAt = now;
    if (typeof logFn === 'function') logFn(this.formatLine());
    this.rewriteSamplesMs = this.rewriteSamplesMs.slice(-200);
    this.gapsMs = this.gapsMs.slice(-200);
    this.inputToUpdateMs = this.inputToUpdateMs.slice(-200);
    this.updateBytesByKind = Object.create(null);
    this.updateCountByKind = Object.create(null);
    if (this._loopMonitor) {
      try { this._loopMonitor.reset(); } catch (_) { /* noop */ }
    }
    this.bufferedAmountPeak = 0;
    this.totalRewriteMs = 0;
    this.bitmapCoalesced = 0;
    return true;
  }
}

/**
 * Control de cola WS para una sesión bridge.
 * @param {{ bastion: boolean, metrics?: BridgeLatencyMetrics|null }} opts
 */
class WsBackpressureController {
  constructor(opts = {}) {
    this.bastion = opts.bastion === true;
    this.metrics = opts.metrics || null;
    this.highWater = opts.highWater != null ? opts.highWater : WS_HIGH_WATER_MARK;
    this.lowWater = opts.lowWater != null ? opts.lowWater : WS_LOW_WATER_MARK;
    this.pauseTlsMark = opts.pauseTlsMark != null ? opts.pauseTlsMark : WS_PAUSE_TLS_MARK;
    this.rewriteBudgetMs = opts.rewriteBudgetMs != null ? opts.rewriteBudgetMs : BASTION_REWRITE_BUDGET_MS;
    /** @type {Array<{ buf: Buffer, rects: Array<number[]>|null }>} */
    this.pendingBitmaps = [];
    this._pendingBytes = 0;
    this.isTlsPaused = false;
    this._rewriteSpentMs = 0;
  }

  /** Reinicia el presupuesto de CPU RLE al inicio de cada evento TLS `data`. */
  beginDataTick() {
    this._rewriteSpentMs = 0;
  }

  noteRewriteSpent(ms) {
    if (typeof ms === 'number' && ms > 0) this._rewriteSpentMs += ms;
  }

  noteBufferedAmount(bufferedAmount) {
    if (this.metrics) this.metrics.noteBufferedAmount(bufferedAmount);
  }

  /**
   * Encola el bitmap (en orden). Los pendientes mas antiguos solo se descartan si
   * TODOS sus rects quedan dentro de algun rect del nuevo: el resultado en pantalla
   * es identico. Un delta que no queda tapado se conserva y se enviara en orden.
   */
  _stashBitmap(frame, reason) {
    const copy = Buffer.from(frame);
    const rects = getBitmapDestRects(copy);
    if (rects) {
      let w = 0;
      for (let r = 0; r < this.pendingBitmaps.length; r++) {
        const old = this.pendingBitmaps[r];
        if (old.rects && rectsCoveredBy(old.rects, rects)) {
          this._pendingBytes -= old.buf.length;
          if (this.metrics) this.metrics.noteCoalesced();
          continue;
        }
        this.pendingBitmaps[w++] = old;
      }
      this.pendingBitmaps.length = w;
    }
    this.pendingBitmaps.push({ buf: copy, rects });
    this._pendingBytes += copy.length;
    if (this.metrics) this.metrics.noteShed(reason);
  }

  /** ¿Hay bitmaps esperando? (mantener orden: no adelantar nada grafico). */
  hasPending() {
    return this.pendingBitmaps.length > 0;
  }

  /**
   * ¿Hay que vaciar los pendientes antes de reenviar este frame? Cualquier cosa que
   * no sea un bitmap descartable ni un puntero podria depender del contenido previo.
   */
  mustFlushBefore(frame) {
    if (this.pendingBitmaps.length === 0) return false;
    if (isFastPathBitmapFrame(frame)) return false;
    return classifyFastPathUpdate(frame) !== 'POINTER';
  }

  /** La lista de pendientes crecio demasiado: hay que vaciarla ya (en orden). */
  pendingOverflow() {
    return this.pendingBitmaps.length > MAX_PENDING_FRAMES || this._pendingBytes > MAX_PENDING_BYTES;
  }

  /**
   * ¿Descartar este frame bitmap? (cola WS llena o presupuesto RLE agotado)
   */
  shouldShedBitmap(bufferedAmount, frame) {
    this.noteBufferedAmount(bufferedAmount);
    if (!isFastPathBitmapFrame(frame)) return false;

    // Hay pendientes mas antiguos: este bitmap debe ir detras (orden de pintado).
    if (this.pendingBitmaps.length > 0) {
      this._stashBitmap(frame, bufferedAmount > this.highWater ? 'queue' : 'budget');
      return true;
    }
    if (bufferedAmount > this.highWater) {
      this._stashBitmap(frame, 'queue');
      return true;
    }
    // El presupuesto RLE solo existe en bastion. En directo no hay rewrite.
    if (this.bastion && this._rewriteSpentMs >= this.rewriteBudgetMs) {
      this._stashBitmap(frame, 'budget');
      return true;
    }
    return false;
  }

  /**
   * Bitmaps pendientes, en orden, al drenar la cola (o null).
   * @param {number} bufferedAmount
   * @param {{ force?: boolean, ignoreBudget?: boolean }} [opts]
   *   force: ignorar low-water (fin de tick / drain / overflow / frame no-bitmap).
   *   ignoreBudget: permitir el rewrite aunque el presupuesto se agotara.
   * @returns {Buffer[]|null}
   */
  takePendingIfDrained(bufferedAmount, { force = false, ignoreBudget = false } = {}) {
    this.noteBufferedAmount(bufferedAmount);
    if (this.pendingBitmaps.length === 0) return null;
    if (!force && bufferedAmount > this.lowWater) return null;
    if (!ignoreBudget && this._rewriteSpentMs >= this.rewriteBudgetMs) return null;
    const pending = this.pendingBitmaps.map((p) => p.buf);
    this.pendingBitmaps = [];
    this._pendingBytes = 0;
    if (this.metrics) this.metrics.noteFlushPending(pending.length);
    return pending;
  }

  /**
   * El siguiente bitmap pendiente, si el presupuesto RLE aun da (o null).
   * No vacia la lista: la rodaja del bastion reescribe de uno en uno hasta gastar ~3 ms.
   * @param {number} bufferedAmount
   * @param {{ force?: boolean, ignoreBudget?: boolean }} [opts]
   * @returns {Buffer|null}
   */
  takePendingWithinBudget(bufferedAmount, { force = false, ignoreBudget = false } = {}) {
    this.noteBufferedAmount(bufferedAmount);
    if (this.pendingBitmaps.length === 0) return null;
    if (!force && bufferedAmount > this.lowWater) return null;
    if (!ignoreBudget && this._rewriteSpentMs >= this.rewriteBudgetMs) return null;
    const next = this.pendingBitmaps.shift();
    this._pendingBytes -= next.buf.length;
    if (this._pendingBytes < 0) this._pendingBytes = 0;
    if (this.metrics) this.metrics.noteFlushPending(1);
    return next.buf;
  }

  /** Deja el presupuesto RLE agotado para que el resto del tick siga encolando. */
  exhaustBudget() {
    this._rewriteSpentMs = this.rewriteBudgetMs;
  }

  /**
   * Path directo: pausar TLS solo como ultimo recurso (2 MB). Por debajo, el
   * shed de bitmaps cubiertos absorbe la rafaga sin callar al servidor.
   * Bastión: nunca pausar (latest-wins evita bufferbloat).
   */
  shouldPauseTls(bufferedAmount) {
    this.noteBufferedAmount(bufferedAmount);
    if (this.bastion) return false;
    return bufferedAmount > this.pauseTlsMark && !this.isTlsPaused;
  }

  markTlsPaused(paused) {
    if (paused === this.isTlsPaused) return;
    this.isTlsPaused = paused;
    if (this.metrics) this.metrics.noteTlsPause(paused);
  }

  shouldResumeTls(bufferedAmount) {
    return this.isTlsPaused && bufferedAmount <= this.lowWater;
  }
}

/**
 * Junta todo lo que se manda al WASM durante un evento TLS 'data' en un unico
 * mensaje WebSocket. El WASM consume el WS como flujo de bytes, asi que el orden
 * se conserva y solo cambia el numero de mensajes.
 */
class WsTickBatcher {
  constructor(enabled = true) {
    this.enabled = enabled !== false;
    /** @type {Buffer[]|null} */
    this._parts = null;
  }

  begin() {
    this._parts = this.enabled ? [] : null;
  }

  get active() {
    return this._parts !== null;
  }

  /** @returns {boolean} true si el buffer quedo acumulado (no hay que enviarlo ya). */
  push(buf) {
    if (!this._parts) return false;
    this._parts.push(buf);
    return true;
  }

  /** Devuelve el mensaje unico a enviar (o null) y cierra el lote. */
  take() {
    const parts = this._parts;
    this._parts = null;
    if (!parts || parts.length === 0) return null;
    return parts.length === 1 ? parts[0] : Buffer.concat(parts);
  }
}

module.exports = {
  WsTickBatcher,
  WS_HIGH_WATER_MARK,
  WS_LOW_WATER_MARK,
  WS_PAUSE_TLS_MARK,
  BASTION_REWRITE_BUDGET_MS,
  isFastPathBitmapFrame,
  classifyFastPathUpdate,
  BridgeLatencyMetrics,
  WsBackpressureController
};
