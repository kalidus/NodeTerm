/**
 * Utility for batching data writes to Xterm.js instances.
 * Prevents UI thread freezing during high-frequency stdout data bursts (e.g., cat large_file, docker logs).
 * Uses an O(N) array-based chunk queue with backpressure protection.
 */

const DEFAULT_MAX_CHUNK_PER_FRAME = 65536; // 64 KB por fotograma para mantener 60/120 FPS
const MAX_BUFFER_BACKLOG_BYTES = 16 * 1024 * 1024; // 16 MB límite de contrapresión para prevenir OOM

function resolveTerm(termOrRef) {
  if (!termOrRef) return null;
  if (typeof termOrRef.write === 'function') return termOrRef;
  const current = termOrRef.current;
  return current && typeof current.write === 'function' ? current : null;
}

export function createXtermWriteBuffer(termRef, options = {}) {
  const maxChunkPerFrame = options.maxChunkPerFrame || DEFAULT_MAX_CHUNK_PER_FRAME;
  let chunks = [];
  let pendingBytes = 0;
  let rafId = null;

  const flush = () => {
    rafId = null;
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
          // El fragmento restante supera el cupo de este fotograma
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

    // Si aún quedan fragmentos pendientes en la cola, programar el siguiente fotograma
    if (chunks.length > 0 && resolveTerm(termRef)) {
      rafId = requestAnimationFrame(flush);
    }
  };

  const write = (data) => {
    if (!data) return;
    const dataStr = typeof data === 'string' ? data : String(data);
    const dataLen = dataStr.length;

    // Protección de contrapresión ante volcados masivos descontrolados
    if (pendingBytes + dataLen > MAX_BUFFER_BACKLOG_BYTES) {
      // Descartar la mitad más antigua de la cola acumulada para mantener responsividad
      const half = Math.floor(chunks.length / 2);
      chunks.splice(0, half);
      pendingBytes = chunks.reduce((acc, c) => acc + c.length, 0);
    }

    chunks.push(dataStr);
    pendingBytes += dataLen;

    if (!rafId) {
      rafId = requestAnimationFrame(flush);
    }
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
    const term = resolveTerm(termRef);
    if (chunks.length > 0 && term) {
      try {
        term.write(chunks.join(''));
      } catch (_) {}
      chunks = [];
      pendingBytes = 0;
    }
  };

  return {
    write,
    clear,
    flushSync
  };
}
