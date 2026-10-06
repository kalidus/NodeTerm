/**
 * Contrapresión y métricas del bridge IronRDP.
 *
 * En bastión Wallix, pausar TLS provoca bufferbloat (el PAM encola).
 * Mejor: latest-wins — descartar Fast-Path BITMAP intermedios cuando la cola
 * WebSocket está llena o el rewrite RLE agota el presupuesto de CPU por tick.
 */

'use strict';

const {
  parseFastPathUpdate,
  FASTPATH_UPDATETYPE_BITMAP
} = require('./rdp-fastpath-helpers');

/** Bastión: umbral bajo para empezar a descartar (WASM aún no ha acumulado mucho). */
const WS_HIGH_WATER_MARK = 64 * 1024; // 64 KB
/** Reanudar envío del bitmap pendiente. */
const WS_LOW_WATER_MARK = 16 * 1024; // 16 KB
/** Solo path directo: pausa TLS si la cola WS es extrema. */
const WS_PAUSE_TLS_MARK = 512 * 1024; // 512 KB
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
    this.budgetShed = 0;
    this.bufferedAmountPeak = 0;
    this.tlsPauseCount = 0;
    this.tlsPausedMs = 0;
    this._tlsPausedSince = 0;
    this.gapsMs = [];
    this.lastSummaryAt = 0;
    this.totalRewriteMs = 0;
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

  noteFlushPending() {
    this.bitmapFlushed += 1;
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
    return {
      rewriteCount: this.rewriteSamplesMs.length,
      rewritePatched: this.rewritePatched,
      rewritePassthrough: this.rewritePassthrough,
      rewriteP50Ms: percentile(rw, 50),
      rewriteP95Ms: percentile(rw, 95),
      totalRewriteMs: this.totalRewriteMs,
      bitmapShed: this.bitmapShed,
      budgetShed: this.budgetShed,
      bitmapFlushed: this.bitmapFlushed,
      bufferedAmountPeak: this.bufferedAmountPeak,
      tlsPauseCount: this.tlsPauseCount,
      tlsPausedMs: this.tlsPausedMs + (this._tlsPausedSince ? Date.now() - this._tlsPausedSince : 0),
      gapP50Ms: percentile(gaps, 50),
      gapP95Ms: percentile(gaps, 95)
    };
  }

  formatLine() {
    const s = this.summary();
    return (
      `[Bridge Perf] rewrite n=${s.rewriteCount} p50=${s.rewriteP50Ms.toFixed(2)}ms p95=${s.rewriteP95Ms.toFixed(2)}ms` +
      ` sum=${s.totalRewriteMs.toFixed(0)}ms patched=${s.rewritePatched} pass=${s.rewritePassthrough}` +
      ` shed=${s.bitmapShed} (budget=${s.budgetShed}) flushPending=${s.bitmapFlushed}` +
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
    if (!this.rewriteSamplesMs.length && !this.bitmapShed && !this.tlsPauseCount) {
      this.lastSummaryAt = now;
      return false;
    }
    this.lastSummaryAt = now;
    if (typeof logFn === 'function') logFn(this.formatLine());
    this.rewriteSamplesMs = this.rewriteSamplesMs.slice(-200);
    this.gapsMs = this.gapsMs.slice(-200);
    this.bufferedAmountPeak = 0;
    this.totalRewriteMs = 0;
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
    this.pendingLatestBitmap = null;
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

  _stashBitmap(frame, reason) {
    this.pendingLatestBitmap = Buffer.from(frame);
    if (this.metrics) this.metrics.noteShed(reason);
  }

  /**
   * ¿Descartar este frame bitmap? (cola WS llena o presupuesto RLE agotado)
   */
  shouldShedBitmap(bufferedAmount, frame) {
    this.noteBufferedAmount(bufferedAmount);
    if (!this.bastion) return false;
    if (!isFastPathBitmapFrame(frame)) return false;

    if (bufferedAmount > this.highWater) {
      this._stashBitmap(frame, 'queue');
      return true;
    }
    if (this._rewriteSpentMs >= this.rewriteBudgetMs) {
      this._stashBitmap(frame, 'budget');
      return true;
    }
    return false;
  }

  /**
   * Bitmap pendiente al drenar la cola (o null).
   * Con presupuesto: también se puede forzar al final del tick si la cola bajó.
   */
  /**
   * Bitmap pendiente al drenar la cola (o null).
   * @param {number} bufferedAmount
   * @param {{ force?: boolean, ignoreBudget?: boolean }} [opts]
   *   force: ignorar low-water (fin de tick / drain).
   *   ignoreBudget: permitir un rewrite del latest aunque el presupuesto se agotara.
   */
  takePendingIfDrained(bufferedAmount, { force = false, ignoreBudget = false } = {}) {
    this.noteBufferedAmount(bufferedAmount);
    if (!this.pendingLatestBitmap) return null;
    if (!force && bufferedAmount > this.lowWater) return null;
    if (!ignoreBudget && this._rewriteSpentMs >= this.rewriteBudgetMs) return null;
    const pending = this.pendingLatestBitmap;
    this.pendingLatestBitmap = null;
    if (this.metrics) this.metrics.noteFlushPending();
    return pending;
  }

  /**
   * Path directo: pausar TLS solo en colas muy altas.
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

module.exports = {
  WS_HIGH_WATER_MARK,
  WS_LOW_WATER_MARK,
  WS_PAUSE_TLS_MARK,
  BASTION_REWRITE_BUDGET_MS,
  isFastPathBitmapFrame,
  BridgeLatencyMetrics,
  WsBackpressureController
};
