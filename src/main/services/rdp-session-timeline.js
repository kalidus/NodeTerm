/**
 * Linea de tiempo de una sesion RDP del bridge (solo diagnostico, no cambia trafico).
 *
 * Responde a "donde se va el tiempo tras el banner": hitos con tiempo relativo al
 * inicio de la sesion y un resumen por segundo de lo que llega del servidor y de lo
 * que sale del WASM (por tipo), con la cola WebSocket y el retardo del event loop.
 *
 * Tipos de entrada (servidor -> WASM): fp (Fast-Path), dvc (TPKT DynVC reenviado),
 * tpkt (resto de TPKT), drop (frame consumido por el filtro).
 * Tipos de salida (WASM -> servidor): dvc (canal drdynvc), tpkt (resto), input (Fast-Path).
 */

'use strict';

const IN_KINDS = ['fp', 'dvc', 'tpkt', 'drop'];
const OUT_KINDS = ['dvc', 'tpkt', 'input'];
/** Segundos con linea por segundo (el resto de la sesion solo hitos y resumen final). */
const DEFAULT_MAX_SECONDS = 45;
/** Tope de hitos repetibles (DEMAND_ACTIVE, DEACTIVATE_ALL...). */
const MAX_EVENTS = 40;

function emptyCounters(kinds) {
  const out = {};
  for (const k of kinds) out[k] = { n: 0, bytes: 0 };
  return out;
}

function fmtBytes(b) {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)}MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${b}B`;
}

function fmtCounters(counters, kinds) {
  return kinds.map((k) => `${k}=${counters[k].n}/${fmtBytes(counters[k].bytes)}`).join(' ');
}

/** Silencio: 1s, 5s, luego cada 15s (15, 30, 45...). */
function shouldLogSilence(idleStreak) {
  if (idleStreak === 1 || idleStreak === 5) return true;
  return idleStreak >= 15 && idleStreak % 15 === 0;
}

class SessionTimeline {
  /**
   * @param {{ enabled?: boolean, log?: (line: string) => void, now?: () => number,
   *           intervalMs?: number, maxSeconds?: number, label?: string }} [opts]
   */
  constructor(opts = {}) {
    this.enabled = opts.enabled !== false;
    this.log = typeof opts.log === 'function' ? opts.log : () => {};
    this.now = typeof opts.now === 'function' ? opts.now : Date.now;
    this.intervalMs = opts.intervalMs || 1000;
    this.maxSeconds = opts.maxSeconds || DEFAULT_MAX_SECONDS;
    this.label = opts.label ? String(opts.label) : '';
    this.t0 = this.now();
    this.marks = new Map();
    this.eventCount = 0;
    this.bucketIn = emptyCounters(IN_KINDS);
    this.bucketOut = emptyCounters(OUT_KINDS);
    this.totalIn = emptyCounters(IN_KINDS);
    this.totalOut = emptyCounters(OUT_KINDS);
    this.lastInAt = 0;
    this.idleStreak = 0;
    this.lines = 0;
    this.timer = null;
    this.lastTickAt = this.t0;
    this.getExtra = null;
  }

  /** Actualiza la etiqueta (p.ej. n/a → RDP tras promote del selector). */
  setLabel(label) {
    this.label = label != null ? String(label) : '';
  }

  /** Milisegundos desde el inicio de la sesion. */
  elapsed() {
    return this.now() - this.t0;
  }

  has(name) {
    return this.marks.has(name);
  }

  _prefix() {
    return this.label ? `[Timeline ${this.label} +` : '[Timeline +';
  }

  /** Hito unico: solo la primera vez. Devuelve true si se ha registrado ahora. */
  mark(name, detail = '') {
    if (!this.enabled || this.marks.has(name)) return false;
    const at = this.elapsed();
    this.marks.set(name, at);
    this.log(`${this._prefix()}${at}ms] ${name}${detail ? ` ${detail}` : ''}`);
    return true;
  }

  /** Hito repetible (con tope para no inundar el log). */
  event(name, detail = '') {
    if (!this.enabled) return;
    this.eventCount += 1;
    if (this.eventCount > MAX_EVENTS) return;
    this.log(`${this._prefix()}${this.elapsed()}ms] ${name}${detail ? ` ${detail}` : ''}`);
  }

  noteIn(kind, bytes) {
    if (!this.enabled) return;
    const k = this.bucketIn[kind] ? kind : 'tpkt';
    this.bucketIn[k].n += 1;
    this.bucketIn[k].bytes += bytes || 0;
    this.totalIn[k].n += 1;
    this.totalIn[k].bytes += bytes || 0;
    this.lastInAt = this.now();
  }

  noteOut(kind, bytes) {
    if (!this.enabled) return;
    const k = this.bucketOut[kind] ? kind : 'tpkt';
    this.bucketOut[k].n += 1;
    this.bucketOut[k].bytes += bytes || 0;
    this.totalOut[k].n += 1;
    this.totalOut[k].bytes += bytes || 0;
  }

  /**
   * Arranca el resumen por segundo.
   * @param {() => { pending?: number, buffered?: number }} [getExtra]
   */
  start(getExtra) {
    if (!this.enabled || this.timer) return;
    this.getExtra = typeof getExtra === 'function' ? getExtra : null;
    this.lastTickAt = this.now();
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    if (this.timer && typeof this.timer.unref === 'function') this.timer.unref();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Solo input (keepalive raton/teclado) sin fp/dvc/tpkt/drop = silencio. */
  _inputOnlyQuiet() {
    const inQuiet = !IN_KINDS.some((k) => this.bucketIn[k].n > 0);
    const outDvc = this.bucketOut.dvc.n;
    const outTpkt = this.bucketOut.tpkt.n;
    const outInput = this.bucketOut.input.n;
    return inQuiet && outDvc === 0 && outTpkt === 0 && outInput > 0;
  }

  /** Una linea por segundo (publico para tests). */
  tick() {
    if (!this.enabled) return;
    const now = this.now();
    const lagMs = Math.max(0, now - this.lastTickAt - this.intervalMs);
    this.lastTickAt = now;
    const seconds = Math.round(this.elapsed() / 1000);
    const hadIn = IN_KINDS.some((k) => this.bucketIn[k].n > 0);
    const hadOutMeaningful = this.bucketOut.dvc.n > 0 || this.bucketOut.tpkt.n > 0;
    const inputOnly = this._inputOnlyQuiet();
    const hadTraffic = hadIn || hadOutMeaningful;

    if (seconds <= this.maxSeconds && this.marks.has('first-frame')) {
      if ((hadTraffic || lagMs >= 200) && !inputOnly) {
        this.idleStreak = 0;
        let extra = '';
        if (this.getExtra) {
          try {
            const e = this.getExtra() || {};
            extra = ` | pend=${e.pending ?? '?'} ws=${fmtBytes(e.buffered || 0)}`;
          } catch (_) { /* noop */ }
        }
        this.lines += 1;
        this.log(
          `${this._prefix()}${this.elapsed()}ms] in: ${fmtCounters(this.bucketIn, IN_KINDS)}` +
          ` | out: ${fmtCounters(this.bucketOut, OUT_KINDS)}${extra}` +
          `${lagMs >= 200 ? ` | LAG event-loop ${lagMs}ms` : ''}`
        );
      } else {
        this.idleStreak += 1;
        if (shouldLogSilence(this.idleStreak)) {
          this.log(`${this._prefix()}${this.elapsed()}ms] silencio ${this.idleStreak}s (sin trafico servidor ni WASM)`);
        }
      }
    }
    this.bucketIn = emptyCounters(IN_KINDS);
    this.bucketOut = emptyCounters(OUT_KINDS);
  }

  /** Resumen final para el cierre de sesion. */
  summary() {
    if (!this.enabled) return '';
    const marks = [...this.marks.entries()].map(([k, v]) => `${k}=+${v}ms`).join(' ');
    const sinceLastIn = this.lastInAt ? `${this.now() - this.lastInAt}ms` : 'n/a';
    const head = this.label
      ? `[Timeline ${this.label} resumen +${this.elapsed()}ms]`
      : `[Timeline resumen +${this.elapsed()}ms]`;
    return `${head} in: ${fmtCounters(this.totalIn, IN_KINDS)}` +
      ` | out: ${fmtCounters(this.totalOut, OUT_KINDS)}` +
      ` | ultimo dato servidor hace ${sinceLastIn}` +
      `${marks ? ` | hitos: ${marks}` : ''}`;
  }
}

module.exports = { SessionTimeline, shouldLogSilence };
