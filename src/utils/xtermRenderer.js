import { useEffect, useRef } from 'react';
import { getCachedXtermModules } from './xtermLoader';

/**
 * Attaches a hardware-accelerated renderer to an xterm.js instance with a tiered fallback:
 * Tier 1: WebGL (ultra-fast GPU accelerated) — only when preferWebgl is true
 * Tier 2: Canvas 2D (high-performance fallback if WebGL context is lost or exhausted)
 * Tier 3: DOM Renderer (fail-safe fallback)
 *
 * @param {import('@xterm/xterm').Terminal} termInstance - The Terminal instance
 * @param {Object} [customAddons] - Optional pre-loaded addon constructors (e.g. from dynamic import)
 * @param {any} [customAddons.WebglAddon]
 * @param {any} [customAddons.CanvasAddon]
 * @param {{ preferWebgl?: boolean }} [options]
 * @returns {{ rendererType: 'webgl' | 'canvas' | 'dom', addon: any }}
 */
export function attachTerminalRenderer(termInstance, customAddons = {}, options = {}) {
  const cached = getCachedXtermModules();
  const Webgl = customAddons.WebglAddon || cached?.WebglAddon;
  const Canvas = customAddons.CanvasAddon || cached?.CanvasAddon;
  const preferWebgl = options.preferWebgl !== false;

  if (!termInstance) {
    return { rendererType: 'dom', addon: null };
  }

  if (preferWebgl && Webgl) {
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

        if (Canvas) {
          try {
            const fallbackCanvasAddon = new Canvas();
            termInstance.loadAddon(fallbackCanvasAddon);
            console.log('[xtermRenderer] Fallback a Canvas 2D activado.');
          } catch (canvasErr) {
            console.warn('[xtermRenderer] Fallback a Canvas fallo, usando DOM renderer:', canvasErr);
          }
        }
      });

      termInstance.loadAddon(webglAddon);
      return { rendererType: 'webgl', addon: webglAddon };
    } catch (webglErr) {
      console.warn('[xtermRenderer] WebGL no disponible, intentando Canvas 2D:', webglErr?.message);
    }
  }

  if (Canvas) {
    try {
      const canvasAddon = new Canvas();
      termInstance.loadAddon(canvasAddon);
      return { rendererType: 'canvas', addon: canvasAddon };
    } catch (canvasErr) {
      console.warn('[xtermRenderer] Canvas no disponible, usando DOM renderer:', canvasErr?.message);
    }
  }

  return { rendererType: 'dom', addon: null };
}

/**
 * Cambia WebGL <-> Canvas segun visibilidad de la pestana, sin recrear el terminal.
 */
export function syncTerminalRenderer(termInstance, customAddons, preferWebgl, current) {
  if (!termInstance) return current || { rendererType: 'dom', addon: null };

  const wantWebgl = !!preferWebgl;
  const hasWebgl = current?.rendererType === 'webgl';
  if (current && wantWebgl === hasWebgl) {
    return current;
  }

  try {
    current?.addon?.dispose();
  } catch (_) {}

  return attachTerminalRenderer(termInstance, customAddons, { preferWebgl: wantWebgl });
}

/**
 * Ajusta renderer y write-buffer cuando la pestana pasa a segundo plano.
 * El attach inicial debe guardar el estado en el ref devuelto.
 */
export function useTerminalMemoryGuards(termRef, xtermLib, active, writeBufferRef) {
  const rendererRef = useRef(null);

  useEffect(() => {
    if (writeBufferRef?.current && typeof writeBufferRef.current.setActive === 'function') {
      writeBufferRef.current.setActive(!!active);
    }
  }, [active, writeBufferRef]);

  useEffect(() => {
    if (!termRef?.current || !xtermLib || !rendererRef.current) return;
    rendererRef.current = syncTerminalRenderer(
      termRef.current,
      { WebglAddon: xtermLib.WebglAddon, CanvasAddon: xtermLib.CanvasAddon },
      !!active,
      rendererRef.current
    );
  }, [active, xtermLib, termRef]);

  return rendererRef;
}

export const DEFAULT_SCROLLBACK_LINES = 2000;

/**
 * Obtiene el limite de lineas de scrollback configurado en Settings (por defecto 2.000 lineas).
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
 * Sincroniza dinamicamente el scrollback de un terminal cuando el usuario lo modifica en Settings.
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
