/**
 * Sonda de dibujado del canvas RDP (solo diagnostico, opt-in).
 *
 * El WASM de IronRDP pinta cada rectangulo con putImageData sobre el contexto 2D
 * del canvas. Envolviendo el metodo en la instancia (no en el prototipo) se cuenta
 * cuantas llamadas / pixeles / ms por segundo cuesta el dibujado, sin tocar el WASM.
 * Se activa solo con window.__NODETERM_RDP_DEBUG__ o localStorage NODETERM_RDP_DEBUG=1.
 */

const LOG_INTERVAL_MS = 2000;

export function installCanvasDrawProbe(canvas, log = console.log) {
  if (!canvas || typeof canvas.getContext !== 'function') return () => {};
  let ctx = null;
  try {
    ctx = canvas.getContext('2d');
  } catch (_) {
    return () => {};
  }
  if (!ctx || ctx.__nodetermProbe) return () => {};

  const stats = { calls: 0, pixels: 0, ms: 0, maxMs: 0 };
  const originals = {};

  const wrap = (name, pixelsOf) => {
    const original = ctx[name];
    if (typeof original !== 'function') return;
    originals[name] = original;
    ctx[name] = function probed(...args) {
      const t0 = performance.now();
      try {
        return original.apply(this, args);
      } finally {
        const dt = performance.now() - t0;
        stats.calls += 1;
        stats.ms += dt;
        if (dt > stats.maxMs) stats.maxMs = dt;
        try { stats.pixels += pixelsOf(args) || 0; } catch (_) { /* noop */ }
      }
    };
  };

  wrap('putImageData', (args) => {
    const img = args[0];
    return img ? img.width * img.height : 0;
  });
  wrap('drawImage', (args) => {
    const src = args[0];
    return src && src.width && src.height ? src.width * src.height : 0;
  });
  wrap('fillRect', (args) => (args[2] || 0) * (args[3] || 0));

  ctx.__nodetermProbe = true;

  const timer = setInterval(() => {
    if (!stats.calls) return;
    const secs = LOG_INTERVAL_MS / 1000;
    log(
      `[RDP Canvas Perf] draws/s=${(stats.calls / secs).toFixed(0)}` +
      ` Mpx/s=${(stats.pixels / secs / 1e6).toFixed(2)}` +
      ` cpu=${stats.ms.toFixed(1)}ms/${LOG_INTERVAL_MS}ms max=${stats.maxMs.toFixed(1)}ms`
    );
    stats.calls = 0;
    stats.pixels = 0;
    stats.ms = 0;
    stats.maxMs = 0;
  }, LOG_INTERVAL_MS);

  return () => {
    clearInterval(timer);
    for (const name of Object.keys(originals)) {
      try { delete ctx[name]; } catch (_) { /* noop */ }
    }
    try { delete ctx.__nodetermProbe; } catch (_) { /* noop */ }
  };
}
