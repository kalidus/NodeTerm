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
 * Renderer de una pestaña visible. Si está oculta no monta WebGL ni Canvas:
 * xterm se queda en el renderer DOM y el bitmap de GPU se libera.
 */
export function attachVisibleTerminalRenderer(termInstance, customAddons, active) {
  if (!active) return { rendererType: 'suspended', addon: null };
  return attachTerminalRenderer(termInstance, customAddons, { preferWebgl: true });
}

/**
 * Activa WebGL al mostrar la pestaña y lo suelta al ocultarla, sin recrear el terminal.
 */
/**
 * @param {boolean} preferWebgl
 * @param {{ canvasFallback?: boolean }} [opts] - Si preferWebgl=false y canvasFallback,
 *   monta Canvas en lugar de suspender (splits con muchos paneles).
 */
export function syncTerminalRenderer(termInstance, customAddons, preferWebgl, current, opts = {}) {
  if (!termInstance) return current || { rendererType: 'suspended', addon: null };

  if (!preferWebgl) {
    if (opts.canvasFallback) {
      if (current?.rendererType === 'canvas' && current.addon) return current;
      try {
        current?.addon?.dispose();
      } catch (_) {}
      return attachTerminalRenderer(termInstance, customAddons, { preferWebgl: false });
    }
    if (current?.rendererType === 'suspended') return current;
    try {
      current?.addon?.dispose();
    } catch (_) {}
    return { rendererType: 'suspended', addon: null };
  }

  if (current?.rendererType === 'webgl' && current.addon) {
    // Re-fit implícito: el caller debe llamar fit/refresh tras volver a visible
    return current;
  }

  try {
    current?.addon?.dispose();
  } catch (_) {}

  return attachTerminalRenderer(termInstance, customAddons, { preferWebgl: true });
}

/**
 * Opciones de xterm para un TUI a pantalla completa (AI CLI).
 * convertEol queda apagado: un \\n solo baja de fila y no arrastra el cursor a la columna 0.
 */
function readWindowsBuildNumber() {
  try {
    if (typeof process !== 'undefined' && typeof process.getSystemVersion === 'function') {
      const build = parseInt(String(process.getSystemVersion()).split('.')[2], 10);
      if (!Number.isNaN(build) && build > 0) return build;
    }
  } catch (_) {}
  try {
    const exposed = typeof window !== 'undefined' ? window.electron?.windowsBuildNumber : undefined;
    const build = parseInt(exposed, 10);
    if (!Number.isNaN(build) && build > 0) return build;
  } catch (_) {}
  return undefined;
}

function readHostPlatform() {
  try {
    const exposed = typeof window !== 'undefined' ? window.electron?.platform : undefined;
    if (exposed) return exposed;
  } catch (_) {}
  try {
    // process/browser del bundle reporta "browser"; no vale como SO real.
    if (typeof process !== 'undefined' && process.platform && process.platform !== 'browser') {
      return process.platform;
    }
  } catch (_) {}
  return undefined;
}

/**
 * Build de Windows para xterm `windowsPty`. ConPTY a partir de 21376 no
 * reinyecta el scrollback al crecer las filas; sin este dato el resize se come líneas.
 * El renderer no tiene Node: el build llega por el preload (`electron.windowsBuildNumber`).
 */
export function getWindowsConptyOptions() {
  try {
    if (readHostPlatform() !== 'win32') return undefined;
    const options = { backend: 'conpty' };
    const buildNumber = readWindowsBuildNumber();
    if (buildNumber) options.buildNumber = buildNumber;
    return options;
  } catch (_) {
    return undefined;
  }
}

export function createAiCliTerminalOptions({
  fontFamily,
  fontSize,
  theme = {},
  background,
  scrollback,
  allowTransparency = false,
  cursor,
  selection,
  windowsPty
}) {
  const options = {
    cursorBlink: true,
    fontFamily,
    fontSize,
    convertEol: false,
    scrollback,
    allowTransparency,
    allowProposedApi: true,
    windowsMode: false,
    letterSpacing: 0,
    lineHeight: 1,
    minimumContrastRatio: 1,
    fontWeight: '400',
    fontWeightBold: 'bold',
    rightClickSelectsWord: true,
    theme: {
      background,
      foreground: theme?.foreground || '#e5e7eb',
      cursor: cursor || theme?.cursor || '#e5e7eb',
      selection: selection || theme?.selection || 'rgba(255,255,255,0.3)',
      ...theme
    },
    cols: 120,
    rows: 30
  };
  if (windowsPty) options.windowsPty = windowsPty;
  return options;
}

/** Unicode 11 + iconos Nerd Font a 2 celdas (eza/ll sin solapar el nombre). */
export { attachNerdAwareUnicode as attachUnicode11 } from './nerdFontCellWidth';

/**
 * Ajusta cols/rows al contenedor.
 * No avisa al PTY: xterm dispara onResize solo cuando el tamaño cambia de verdad.
 */
export function fitTerminalToContainer(term, fitAddon, container) {
  try {
    if (!term || !fitAddon || !container) return false;
    if (container.offsetWidth <= 0 || container.offsetHeight <= 0) return false;
    fitAddon.fit();
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Fit que no oscila: salta si el contenedor no cambió en píxeles y marca
 * un flag breve para que ResizeObserver ignore el eco del propio fit.
 */
export function createStableTerminalFit() {
  let lastWidth = -1;
  let lastHeight = -1;
  let fitting = false;
  let releaseTimer = null;

  const releaseFitting = () => {
    if (releaseTimer != null) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }
    fitting = false;
  };

  return {
    isFitting() {
      return fitting;
    },
    fit(term, fitAddon, container) {
      try {
        if (!term || !fitAddon || !container) return false;
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        if (width <= 0 || height <= 0) return false;
        if (width === lastWidth && height === lastHeight) return false;

        fitting = true;
        if (releaseTimer != null) clearTimeout(releaseTimer);
        fitAddon.fit();
        lastWidth = container.offsetWidth;
        lastHeight = container.offsetHeight;
        // El canvas puede notificar un frame después; ignorar ese eco.
        releaseTimer = setTimeout(releaseFitting, 80);
        return true;
      } catch (_) {
        releaseFitting();
        return false;
      }
    },
    reset() {
      lastWidth = -1;
      lastHeight = -1;
      releaseFitting();
    }
  };
}

/**
 * Binding reutilizable de fit estable para terminales locales/SSH.
 * Las refs deben ser React refs (o { current }) de term, FitAddon y contenedor DOM.
 */
export function createStableFitBinding(termRef, fitAddonRef, containerRef) {
  const stableFitRef = { current: null };

  const fitStable = () => {
    const stable = stableFitRef.current;
    if (stable) {
      return stable.fit(termRef.current, fitAddonRef.current, containerRef.current);
    }
    try {
      const term = termRef.current;
      const fitAddon = fitAddonRef.current;
      const container = containerRef.current;
      if (!term || !fitAddon || !container) return false;
      if (container.offsetWidth <= 0 || container.offsetHeight <= 0) return false;
      fitAddon.fit();
      return true;
    } catch (_) {
      return false;
    }
  };

  const beginMount = () => {
    const stableFit = createStableTerminalFit();
    stableFitRef.current = stableFit;
    return stableFit;
  };

  const endMount = (stableFit) => {
    if (stableFit) stableFit.reset();
    if (stableFitRef.current === stableFit) {
      stableFitRef.current = null;
    }
  };

  const isFitting = () => !!(stableFitRef.current && stableFitRef.current.isFitting());

  const invalidate = () => {
    stableFitRef.current?.reset();
  };

  return { fitStable, beginMount, endMount, isFitting, invalidate, stableFitRef };
}

/** Agrupa ráfagas de resize (observer, ventana) en una sola llamada. */
export function createDebouncedFn(fn, ms = 50) {
  let timer = null;
  const wrapped = () => {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try {
        fn();
      } catch (_) {}
    }, ms);
  };
  wrapped.cancel = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return wrapped;
}

/** Temporizadores de fit/resize que hay que cancelar al desmontar. */
export function createTimerBag() {
  const ids = [];
  return {
    later(fn, ms) {
      const id = setTimeout(fn, ms);
      ids.push(id);
      return id;
    },
    clear() {
      while (ids.length) clearTimeout(ids.pop());
    }
  };
}

/**
 * Ajusta renderer y write-buffer cuando la pestana pasa a segundo plano.
 * El attach inicial debe guardar el estado en el ref devuelto.
 * @param {boolean} [preferWebgl] - Si se omite, sigue a `active`. En splits densos
 *   se puede pasar false con active=true para usar Canvas y liberar contextos WebGL.
 */
export function useTerminalMemoryGuards(termRef, xtermLib, active, writeBufferRef, preferWebgl) {
  const rendererRef = useRef(null);
  const wantWebgl = active && (preferWebgl !== false);

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
      !!wantWebgl,
      rendererRef.current,
      { canvasFallback: !!active && !wantWebgl }
    );
  }, [active, wantWebgl, xtermLib, termRef]);

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
