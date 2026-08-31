/**
 * Marcas de rendimiento del renderer para medir arranque (consola DevTools).
 */
const START = typeof performance !== 'undefined' ? performance.now() : Date.now();

export function markStartup(label) {
  const elapsed = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - START);
  if (typeof performance !== 'undefined' && performance.mark) {
    try {
      performance.mark(`startup:${label}`);
    } catch (_) { /* noop */ }
  }
  if (typeof process !== 'undefined' && (process.env?.DEBUG_STARTUP === 'true' || process.env?.NODETERM_PROFILE === '1')) {
    console.log(`⏱️ [renderer ${elapsed}ms] ${label}`);
  }
}

export function getStartupElapsed() {
  return Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - START);
}
