/**
 * Utility for batching data writes to Xterm.js instances.
 * Prevents UI thread freezing during high-frequency stdout data bursts (e.g., cat large_file, docker logs).
 */

const MAX_CHUNK_PER_FRAME = 65536; // 64 KB por fotograma para mantener 60 FPS

export function createXtermWriteBuffer(termRef) {
  let queue = '';
  let rafId = null;

  const flush = () => {
    if (queue && termRef.current) {
      try {
        if (queue.length > MAX_CHUNK_PER_FRAME) {
          const chunk = queue.slice(0, MAX_CHUNK_PER_FRAME);
          queue = queue.slice(MAX_CHUNK_PER_FRAME);
          termRef.current.write(chunk);
          // Re-programar el siguiente chunk en el próximo fotograma de pantalla
          rafId = requestAnimationFrame(flush);
          return;
        } else {
          termRef.current.write(queue);
          queue = '';
        }
      } catch (e) {
        queue = '';
      }
    }
    rafId = null;
  };

  const write = (data) => {
    if (!data) return;
    queue += data;
    if (!rafId) {
      rafId = requestAnimationFrame(flush);
    }
  };

  const clear = () => {
    queue = '';
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
    if (queue && termRef.current) {
      try {
        termRef.current.write(queue);
      } catch (_) {}
      queue = '';
    }
  };

  return {
    write,
    clear,
    flushSync
  };
}
