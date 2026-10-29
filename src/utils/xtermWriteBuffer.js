/**
 * Utility for batching data writes to Xterm.js instances.
 * Prevents UI thread freezing during high-frequency stdout data bursts (e.g., cat large_file, docker logs).
 * Uses an O(N) array-based chunk queue with backpressure protection.
 *
 * When inactive (hidden tab): keep a ring buffer only — no term.write / rAF paint.
 * On activate: flush pending chunks to the terminal.
 *
 * SSH (flowControl): no descartar — avisar al main para pause()/resume() del shellStream.
 * PTY local (dropWithMark): techo más alto; si se corta, marca visible en pantalla.
 */

const DEFAULT_MAX_CHUNK_PER_FRAME = 65536; // 64 KB por fotograma para mantener 60/120 FPS
const ACTIVE_MAX_BUFFER_BACKLOG_BYTES = 2 * 1024 * 1024; // 2 MB en pestana visible (default)
const INACTIVE_MAX_BUFFER_BACKLOG_BYTES = 256 * 1024; // 256 KB ring en pestana oculta
const LOCAL_ACTIVE_MAX_BACKLOG_BYTES = 8 * 1024 * 1024; // PTY local: techo blando
const LOCAL_HARD_MAX_BACKLOG_BYTES = 16 * 1024 * 1024; // PTY local: techo duro con marca
const FLOW_HIGH_WATER_BYTES = 1.5 * 1024 * 1024;
const FLOW_LOW_WATER_BYTES = 256 * 1024;
const DROP_MARK = '\r\n\x1b[33m… [salida omitida por carga]\x1b[0m\r\n';
const ESC = '\x1b';
const SYNC_BEGIN = `${ESC}[?2026h`;
const SYNC_END = `${ESC}[?2026l`;

function isHighSurrogate(code) {
  return code >= 0xD800 && code <= 0xDBFF;
}

function syncFrameIsOpen(text) {
  const begin = text.lastIndexOf(SYNC_BEGIN);
  if (begin === -1) return false;
  return text.indexOf(SYNC_END, begin) === -1;
}

/** Fin exclusivo de la secuencia que empieza en esc, o text.length si aún no termina. */
function sequenceEnd(text, esc) {
  const next = text.charCodeAt(esc + 1);
  if (Number.isNaN(next)) return text.length;
  if (next === 91) {
    for (let i = esc + 2; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0x40 && code <= 0x7e) return i + 1;
    }
    return text.length;
  }
  if (next === 93) {
    for (let i = esc + 2; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code === 7) return i + 1;
      if (code === 27 && text.charCodeAt(i + 1) === 92) return i + 2;
    }
    return text.length;
  }
  return Math.min(text.length, esc + 2);
}

/** ESC de una secuencia aún abierta que cubre `index`, o -1. */
function openEscapeStart(text, index) {
  const esc = text.lastIndexOf(ESC, index - 1);
  if (esc === -1) return -1;
  const end = sequenceEnd(text, esc);
  if (end <= index) return -1;
  return esc;
}

/**
 * Cuántos caracteres de `text` se pueden pintar sin partir un par subrogado,
 * una secuencia ESC ni un frame sincronizado (?2026h … ?2026l).
 * Si el frame no cabe en maxLen, se alarga el corte para dejarlo entero.
 */
export function takePaintSlice(text, maxLen) {
  if (!text) return 0;
  if (text.length <= maxLen) return text.length;

  let cut = maxLen;
  if (isHighSurrogate(text.charCodeAt(cut - 1))) cut -= 1;

  const esc = openEscapeStart(text, cut);
  if (esc !== -1) {
    const end = sequenceEnd(text, esc);
    if (end < text.length) cut = end;
    else cut = esc === 0 ? text.length : esc;
  }

  const begin = text.lastIndexOf(SYNC_BEGIN, Math.max(0, cut - 1));
  if (begin !== -1 && begin < cut) {
    const endAt = text.indexOf(SYNC_END, begin);
    if (endAt === -1) {
      cut = begin === 0 ? text.length : begin;
    } else {
      const endExclusive = endAt + SYNC_END.length;
      if (endExclusive > cut) cut = endExclusive;
    }
  }

  if (cut > 0 && cut < text.length && isHighSurrogate(text.charCodeAt(cut - 1))) {
    cut -= 1;
  }
  if (cut <= 0) return text.length;
  return cut;
}

function resolveTerm(termOrRef) {
  if (!termOrRef) return null;
  if (typeof termOrRef.write === 'function') return termOrRef;
  const current = termOrRef.current;
  return current && typeof current.write === 'function' ? current : null;
}

/**
 * @param {import('@xterm/xterm').Terminal|{current:?}} termRef
 * @param {{
 *   maxChunkPerFrame?: number,
 *   active?: boolean,
 *   onPainted?: Function,
 *   flowControl?: { onChange: (paused: boolean) => void },
 *   dropWithMark?: boolean,
 * }} [options]
 */
export function createXtermWriteBuffer(termRef, options = {}) {
  const maxChunkPerFrame = options.maxChunkPerFrame || DEFAULT_MAX_CHUNK_PER_FRAME;
  const onPainted = typeof options.onPainted === 'function' ? options.onPainted : null;
  const flowControl = options.flowControl && typeof options.flowControl.onChange === 'function'
    ? options.flowControl
    : null;
  const dropWithMark = !!options.dropWithMark;
  let isActive = options.active !== false;
  let hold = false;
  let maxBacklogBytes = isActive
    ? (dropWithMark ? LOCAL_ACTIVE_MAX_BACKLOG_BYTES : ACTIVE_MAX_BUFFER_BACKLOG_BYTES)
    : INACTIVE_MAX_BUFFER_BACKLOG_BYTES;
  let chunks = [];
  let pendingBytes = 0;
  let rafId = null;
  let flowPaused = false;

  const notifyPainted = () => {
    if (!onPainted) return;
    try { onPainted(); } catch (_) {}
  };

  const setFlowPaused = (paused) => {
    if (!flowControl) return;
    const next = !!paused;
    if (next === flowPaused) return;
    flowPaused = next;
    try { flowControl.onChange(flowPaused); } catch (_) {}
  };

  const updateFlowControl = () => {
    if (!flowControl) return;
    if (!flowPaused && pendingBytes >= FLOW_HIGH_WATER_BYTES) {
      setFlowPaused(true);
    } else if (flowPaused && pendingBytes <= FLOW_LOW_WATER_BYTES) {
      setFlowPaused(false);
    }
  };

  const trimBacklog = () => {
    // SSH / flowControl: no descartar; solo pausar el stream remoto.
    if (flowControl) {
      updateFlowControl();
      return;
    }

    const dropLimit = dropWithMark ? LOCAL_HARD_MAX_BACKLOG_BYTES : maxBacklogBytes;
    if (pendingBytes <= dropLimit || chunks.length === 0) return;

    const half = Math.floor(chunks.length / 2) || 1;
    chunks.splice(0, half);
    if (dropWithMark) {
      chunks.unshift(DROP_MARK);
    }
    pendingBytes = chunks.reduce((acc, c) => acc + c.length, 0);
  };

  const flush = () => {
    rafId = null;
    if (!isActive || hold) {
      return;
    }

    const term = resolveTerm(termRef);
    if (!term || chunks.length === 0) {
      chunks = [];
      pendingBytes = 0;
      updateFlowControl();
      return;
    }

    try {
      let bytesThisFrame = 0;
      let batch = '';

      while (chunks.length > 0 && bytesThisFrame < maxChunkPerFrame) {
        const nextChunk = chunks[0];
        const nextLen = nextChunk.length;

        if (bytesThisFrame + nextLen <= maxChunkPerFrame) {
          batch += chunks.shift();
          bytesThisFrame += nextLen;
        } else {
          const remainingQuota = maxChunkPerFrame - bytesThisFrame;
          const cut = takePaintSlice(nextChunk, remainingQuota);
          if (cut >= nextChunk.length) {
            batch += chunks.shift();
            bytesThisFrame += nextLen;
          } else {
            batch += nextChunk.slice(0, cut);
            chunks[0] = nextChunk.slice(cut);
            bytesThisFrame += cut;
          }
          break;
        }
      }

      // Si el frame sincronizado sigue en cola, no pintarlo a medias.
      const syncCap = maxChunkPerFrame * 16;
      while (syncFrameIsOpen(batch) && chunks.length > 0 && bytesThisFrame < syncCap) {
        const next = chunks[0];
        const endAt = next.indexOf(SYNC_END);
        if (endAt === -1) {
          batch += chunks.shift();
          bytesThisFrame += next.length;
          continue;
        }
        const cut = endAt + SYNC_END.length;
        if (cut >= next.length) {
          batch += chunks.shift();
          bytesThisFrame += next.length;
        } else {
          batch += next.slice(0, cut);
          chunks[0] = next.slice(cut);
          bytesThisFrame += cut;
        }
        break;
      }

      pendingBytes = Math.max(0, pendingBytes - bytesThisFrame);
      if (batch) {
        term.write(batch, notifyPainted);
      }
    } catch (_) {
      chunks = [];
      pendingBytes = 0;
    }

    updateFlowControl();

    if (chunks.length > 0 && isActive && !hold && resolveTerm(termRef)) {
      rafId = requestAnimationFrame(flush);
    }
  };

  const scheduleFlush = () => {
    if (!isActive || hold || rafId) return;
    rafId = requestAnimationFrame(flush);
  };

  const write = (data) => {
    if (!data) return;
    const dataStr = typeof data === 'string' ? data : String(data);
    const dataLen = dataStr.length;

    chunks.push(dataStr);
    pendingBytes += dataLen;

    if (flowControl) {
      updateFlowControl();
    } else if (pendingBytes > (dropWithMark ? LOCAL_HARD_MAX_BACKLOG_BYTES : maxBacklogBytes)) {
      trimBacklog();
    }

    // Pestana oculta: solo ring buffer, sin pintar xterm
    if (!isActive) {
      if (!flowControl) trimBacklog();
      else updateFlowControl();
      return;
    }

    scheduleFlush();
  };

  const clear = () => {
    chunks = [];
    pendingBytes = 0;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    setFlowPaused(false);
  };

  const flushSync = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (!isActive || hold) return;
    const term = resolveTerm(termRef);
    if (!term || chunks.length === 0) return;
    const payload = chunks.join('');
    chunks = [];
    pendingBytes = 0;
    try {
      term.write(payload, notifyPainted);
    } catch (_) {}
    updateFlowControl();
  };

  /** Un solo write al soltar la retención, con el frame DEC 2026 entero. */
  const releaseHold = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (!isActive) return;
    const term = resolveTerm(termRef);
    if (!term || chunks.length === 0) {
      notifyPainted();
      updateFlowControl();
      return;
    }
    const payload = chunks.join('');
    chunks = [];
    pendingBytes = 0;
    try {
      term.write(payload, notifyPainted);
    } catch (_) {}
    updateFlowControl();
  };

  const setHold = (nextHold) => {
    const next = !!nextHold;
    if (next === hold) return;
    hold = next;
    if (hold) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      return;
    }
    releaseHold();
  };

  const setActive = (nextActive) => {
    const wasActive = isActive;
    isActive = !!nextActive;
    maxBacklogBytes = isActive
      ? (dropWithMark ? LOCAL_ACTIVE_MAX_BACKLOG_BYTES : ACTIVE_MAX_BUFFER_BACKLOG_BYTES)
      : INACTIVE_MAX_BUFFER_BACKLOG_BYTES;

    if (!flowControl) {
      trimBacklog();
    } else {
      updateFlowControl();
    }

    if (!isActive) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      return;
    }

    if (!wasActive && chunks.length > 0 && !hold) {
      scheduleFlush();
    }
  };

  return {
    write,
    clear,
    flushSync,
    setActive,
    setHold,
    isHeld: () => hold,
    /** @internal tests */
    getPendingBytes: () => pendingBytes,
    isFlowPaused: () => flowPaused
  };
}
