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

export const DEFAULT_SCROLLBACK_LINES = 10000;

/**
 * Obtiene el límite de líneas de scrollback configurado en Settings (por defecto 10,000 líneas).
 */
export function getTerminalScrollback() {
  try {
    const saved = localStorage.getItem('nodeterm_scrollback_lines');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1000) {
        return parsed;
      }
    }
  } catch (_) {}
  return DEFAULT_SCROLLBACK_LINES;
}

/**
 * Sincroniza dinámicamente el scrollback de un terminal cuando el usuario lo modifica en Settings.
 */
export function registerScrollbackSync(termRef) {
  const handler = (e) => {
    if (e.detail && typeof e.detail.scrollback === 'number' && termRef.current) {
      termRef.current.options.scrollback = e.detail.scrollback;
    }
  };
  window.addEventListener('terminal-settings-changed', handler);
  return () => window.removeEventListener('terminal-settings-changed', handler);
}
