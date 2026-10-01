/**
 * Carga diferida de @xterm y addons (chunk webpack async).
 */
let cached = null;

/** Módulos xterm ya cargados (p. ej. tras precalentado). */
export function getCachedXtermModules() {
  return cached;
}

function handleTerminalLink(event, uri) {
  if (!uri || typeof uri !== 'string') return;
  const trimmed = uri.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return;

  // Si el usuario presiona Alt o Shift al hacer clic, forzar apertura en navegador externo
  if (event && (event.altKey || event.shiftKey)) {
    if (window.electron?.system?.openWithBrowser) {
      window.electron.system.openWithBrowser(trimmed).catch(() => {
        window.electron?.openExternal?.(trimmed);
      });
      return;
    }
    if (window.electron?.openExternal) {
      window.electron.openExternal(trimmed);
      return;
    }
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
    if (window.electron?.system?.openWithBrowser) {
      window.electron.system.openWithBrowser(trimmed).catch(() => {
        window.electron?.openExternal?.(trimmed);
      });
    } else if (window.electron?.openExternal) {
      window.electron.openExternal(trimmed);
    }
  }
}

export function loadXtermModules() {
  if (cached) return Promise.resolve(cached);
  return Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
    import('@xterm/addon-web-links'),
    import('@xterm/addon-unicode11'),
    import('@xterm/addon-webgl'),
    import('@xterm/addon-canvas'),
    import('@xterm/xterm/css/xterm.css')
  ]).then(([xterm, fit, webLinks, unicode11, webgl, canvas]) => {
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
      CanvasAddon: canvas.CanvasAddon
    };
    return cached;
  });
}
