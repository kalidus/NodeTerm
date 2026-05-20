/**
 * Carga diferida de @xterm y addons (chunk webpack async).
 */
let cached = null;

/** Módulos xterm ya cargados (p. ej. tras precalentado). */
export function getCachedXtermModules() {
  return cached;
}

export function loadXtermModules() {
  if (cached) return Promise.resolve(cached);
  return Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
    import('@xterm/addon-web-links'),
    import('@xterm/addon-unicode11'),
    import('@xterm/addon-webgl'),
    import('@xterm/xterm/css/xterm.css')
  ]).then(([xterm, fit, webLinks, unicode11, webgl]) => {
    cached = {
      Terminal: xterm.Terminal,
      FitAddon: fit.FitAddon,
      WebLinksAddon: webLinks.WebLinksAddon,
      Unicode11Addon: unicode11.Unicode11Addon,
      WebglAddon: webgl.WebglAddon
    };
    return cached;
  });
}
