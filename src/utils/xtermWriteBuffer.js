/**
 * Utility for batching data writes to Xterm.js instances.
 * Prevents UI thread freezing during high-frequency stdout data bursts (e.g., cat large_file, docker logs).
 * Uses an O(N) array-based chunk queue with backpressure protection.
 *
 * When inactive (hidden tab): keep a ring buffer only — no term.write / rAF paint.
 * On activate: flush pending chunks to the terminal.
 */

const DEFAULT_MAX_CHUNK_PER_FRAME = 65536; // 64 KB por fotograma para mantener 60/120 FPS
const ACTIVE_MAX_BUFFER_BACKLOG_BYTES = 2 * 1024 * 1024; // 2 MB en pestana visible
const INACTIVE_MAX_BUFFER_BACKLOG_BYTES = 256 * 1024; // 256 KB ring en pestana oculta

function resolveTerm(termOrRef) {
  if (!termOrRef) return null;
  if (typeof termOrRef.write === 'function') return termOrRef;
  const current = termOrRef.current;
  return current && typeof current.write === 'function' ? current : null;
}

export function createXtermWriteBuffer(termRef, options = {}) {
  const maxChunkPerFrame = options.maxChunkPerFrame || DEFAULT_MAX_CHUNK_PER_FRAME;
  let isActive = options.active !== false;
  let maxBacklogBytes = isActive ? ACTIVE_MAX_BUFFER_BACKLOG_BYTES : INACTIVE_MAX_BUFFER_BACKLOG_BYTES;
  let chunks = [];
  let pendingBytes = 0;
  let rafId = null;

  const trimBacklog = () => {
    if (pendingBytes <= maxBacklogBytes || chunks.length === 0) return;
    const half = Math.floor(chunks.length / 2) || 1;
    chunks.splice(0, half);
    pendingBytes = chunks.reduce((acc, c) => acc + c.length, 0);
  };

  const flush = () => {
    rafId = null;
    if (!isActive) {
      return;
    }

    const term = resolveTerm(termRef);
    if (!term || chunks.length === 0) {
      chunks = [];
      pendingBytes = 0;
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
          batch += nextChunk.slice(0, remainingQuota);
          chunks[0] = nextChunk.slice(remainingQuota);
          bytesThisFrame += remainingQuota;
          break;
        }
      }

      pendingBytes = Math.max(0, pendingBytes - bytesThisFrame);
      if (batch) {
        term.write(batch);
      }
    } catch (_) {
      chunks = [];
      pendingBytes = 0;
    }

    if (chunks.length > 0 && isActive && resolveTerm(termRef)) {
      rafId = requestAnimationFrame(flush);
    }
  };

  const scheduleFlush = () => {
    if (!isActive || rafId) return;
    rafId = requestAnimationFrame(flush);
  };

  const write = (data) => {
    if (!data) return;
    const dataStr = typeof data === 'string' ? data : String(data);
    const dataLen = dataStr.length;

    if (pendingBytes + dataLen > maxBacklogBytes) {
      trimBacklog();
    }

    chunks.push(dataStr);
    pendingBytes += dataLen;

    // Pestana oculta: solo ring buffer, sin pintar xterm
    if (!isActive) {
      trimBacklog();
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
  };

  const flushSync = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (!isActive) return;
    const term = resolveTerm(termRef);
    if (chunks.length > 0 && term) {
      try {
        term.write(chunks.join(''));
      } catch (_) {}
      chunks = [];
      pendingBytes = 0;
    }
  };

  const setActive = (nextActive) => {
    const wasActive = isActive;
    isActive = !!nextActive;
    maxBacklogBytes = isActive ? ACTIVE_MAX_BUFFER_BACKLOG_BYTES : INACTIVE_MAX_BUFFER_BACKLOG_BYTES;
    trimBacklog();

    if (!isActive) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      return;
    }

    if (!wasActive && chunks.length > 0) {
      scheduleFlush();
    }
  };

  return {
    write,
    clear,
    flushSync,
    setActive
  };
}
