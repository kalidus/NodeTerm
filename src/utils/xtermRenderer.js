import { CanvasAddon } from '@xterm/addon-canvas';
import { WebglAddon } from '@xterm/addon-webgl';

/**
 * Attaches a hardware-accelerated renderer to an xterm.js instance with a tiered fallback:
 * Tier 1: WebGL (ultra-fast GPU accelerated)
 * Tier 2: Canvas 2D (high-performance fallback if WebGL context is lost or exhausted)
 * Tier 3: DOM Renderer (fail-safe fallback)
 *
 * @param {import('@xterm/xterm').Terminal} termInstance - The Terminal instance
 * @param {Object} [customAddons] - Optional pre-loaded addon constructors (e.g. from dynamic import)
 * @param {typeof WebglAddon} [customAddons.WebglAddon]
 * @param {typeof CanvasAddon} [customAddons.CanvasAddon]
 * @returns {{ rendererType: 'webgl' | 'canvas' | 'dom', addon: any }}
 */
export function attachTerminalRenderer(termInstance, customAddons = {}) {
  const Webgl = customAddons.WebglAddon || WebglAddon;
  const Canvas = customAddons.CanvasAddon || CanvasAddon;

  if (!termInstance) {
    return { rendererType: 'dom', addon: null };
  }

  // Intentar cargar WebGL como opción primaria
  if (Webgl) {
    try {
      const webglAddon = new Webgl();
      let hasLostContext = false;

      webglAddon.onContextLoss(() => {
        if (hasLostContext) return;
        hasLostContext = true;
        console.warn('[xtermRenderer] Contexto WebGL perdido. Intentando fallback a Canvas 2D...');
        try {
          webglAddon.dispose();
        } catch (_) {}

        // Intentar fallback a Canvas si el contexto WebGL fue purgado por Chromium
        if (Canvas) {
          try {
            const fallbackCanvasAddon = new Canvas();
            termInstance.loadAddon(fallbackCanvasAddon);
            console.log('✅ [xtermRenderer] Fallback a Canvas 2D activado con éxito.');
          } catch (canvasErr) {
            console.warn('[xtermRenderer] Fallback a Canvas falló, usando DOM renderer:', canvasErr);
          }
        }
      });

      termInstance.loadAddon(webglAddon);
      return { rendererType: 'webgl', addon: webglAddon };
    } catch (webglErr) {
      console.warn('[xtermRenderer] WebGL no disponible, intentando Canvas 2D:', webglErr?.message);
    }
  }

  // Fallback 1: Canvas 2D
  if (Canvas) {
    try {
      const canvasAddon = new Canvas();
      termInstance.loadAddon(canvasAddon);
      return { rendererType: 'canvas', addon: canvasAddon };
    } catch (canvasErr) {
      console.warn('[xtermRenderer] Canvas no disponible, usando DOM renderer:', canvasErr?.message);
    }
  }

  // Fallback 2: DOM por defecto de xterm
  return { rendererType: 'dom', addon: null };
}
