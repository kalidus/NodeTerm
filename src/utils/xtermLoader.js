import { isIntegratedBrowserEnabled, openUrlInSystemBrowser } from './browserWebview';

/**
 * Carga diferida de @xterm y addons (chunk webpack async).
 */
let cached = null;

/** Módulos xterm ya cargados (p. ej. tras precalentado). */
export function getCachedXtermModules() {
  if (cached && (typeof cached.SerializeAddon !== 'function' || typeof cached.SearchAddon !== 'function')) {
    cached = null;
  }
  return cached;
}

function handleTerminalLink(event, uri) {
  if (!uri || typeof uri !== 'string') return;
  const trimmed = uri.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return;

  // Si el usuario presiona Alt o Shift al hacer clic, forzar apertura en navegador externo
  if (event && (event.altKey || event.shiftKey)) {
    openUrlInSystemBrowser(trimmed);
    return;
  }

  // App Navegador desactivada → navegador del sistema
  if (!isIntegratedBrowserEnabled()) {
    openUrlInSystemBrowser(trimmed);
    return;
  }

  // 🌐 Por defecto: abrir en una ventana emergente flotante dentro de NodeTerm
  try {
    const domain = trimmed.replace(/^https?:\/\//i, '').split('/')[0];
    window.dispatchEvent(new CustomEvent('open-browser-popup', {
      detail: {
        url: trimmed,
        title: domain || 'Vista previa'
      }
    }));
  } catch (err) {
    console.warn('[xtermLoader] Fallo abriendo ventana emergente interna, abriendo en navegador externo:', err);
    openUrlInSystemBrowser(trimmed);
  }
}

export function loadXtermModules() {
  // Invalidar cache incompleto (p. ej. HMR anterior sin SerializeAddon/SearchAddon)
  if (cached && (typeof cached.SerializeAddon !== 'function' || typeof cached.SearchAddon !== 'function')) {
    cached = null;
  }
  if (cached) return Promise.resolve(cached);
  return Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
    import('@xterm/addon-web-links'),
    import('@xterm/addon-unicode11'),
    import('@xterm/addon-webgl'),
    import('@xterm/addon-canvas'),
    import('@xterm/addon-serialize'),
    import('@xterm/addon-search'),
    import('@xterm/xterm/css/xterm.css')
  ]).then(([xterm, fit, webLinks, unicode11, webgl, canvas, serialize, search]) => {
    // 🛡️ Wrapper para WebLinksAddon que usa el manejador seguro de NodeTerm
    // evitando el intento de window.open() vacío que Electron bloquea
    class SafeWebLinksAddon extends webLinks.WebLinksAddon {
      constructor(customHandler, options) {
        const handler = customHandler || handleTerminalLink;
        super(handler, options);
      }
    }

    cached = {
      Terminal: xterm.Terminal,
      FitAddon: fit.FitAddon,
      WebLinksAddon: SafeWebLinksAddon,
      Unicode11Addon: unicode11.Unicode11Addon,
      WebglAddon: webgl.WebglAddon,
      CanvasAddon: canvas.CanvasAddon,
      SerializeAddon: serialize.SerializeAddon,
      SearchAddon: search.SearchAddon
    };
    return cached;
  });
}
