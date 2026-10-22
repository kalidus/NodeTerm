/**
 * Resuelve la familia de fuente del terminal.
 * "FiraCode Nerd Font" es systemOnly: si no está instalada se usa Fira Code
 * embebida. "Symbols Nerd Font Mono" va siempre de fallback para iconos PUA
 * (eza/ll, powerline) sin depender de una Nerd completa en el sistema.
 */

const NERD_FONT_RE = /FiraCode\s+Nerd\s+Font/i;
const NERD_SYMBOLS_FAMILY = 'Symbols Nerd Font Mono';
const NERD_SYMBOLS = `"${NERD_SYMBOLS_FAMILY}"`;
const EMBEDDED_PRIMARY = '"Fira Code", "JetBrains Mono"';

let nerdFontAvailableCache = null;
let fontsCssLoadPromise = null;

function probeNerdFontAvailable() {
  if (typeof document === 'undefined') return false;
  try {
    if (document.fonts?.check) {
      if (document.fonts.check('12px "FiraCode Nerd Font"')) return true;
      if (document.fonts.check("12px 'FiraCode Nerd Font'")) return true;
    }
  } catch { /* ignore */ }
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.font = '12px monospace';
    const base = ctx.measureText('ABCDEFWMi@|').width;
    ctx.font = '12px "FiraCode Nerd Font", monospace';
    const nerd = ctx.measureText('ABCDEFWMi@|').width;
    return Math.abs(nerd - base) > 0.5;
  } catch {
    return false;
  }
}

export function isNerdFontAvailable() {
  if (nerdFontAvailableCache !== null) return nerdFontAvailableCache;
  nerdFontAvailableCache = probeNerdFontAvailable();
  return nerdFontAvailableCache;
}

/** Invalida caché (p. ej. tras instalar fuentes). */
export function resetNerdFontAvailabilityCache() {
  nerdFontAvailableCache = null;
}

/**
 * Carga fonts.css (incluye Symbols Nerd Font Mono) si aún no está en el bundle.
 * Idempotente; seguro llamar al montar un terminal.
 * @returns {Promise<void>}
 */
export function ensureTerminalFontsLoaded() {
  if (typeof document === 'undefined') return Promise.resolve();
  if (fontsCssLoadPromise) return fontsCssLoadPromise;
  fontsCssLoadPromise = import('../styles/fonts.css')
    .then(() => undefined)
    .catch(() => undefined);
  return fontsCssLoadPromise;
}

/**
 * Inserta "Symbols Nerd Font Mono" antes de monospace / al final de la pila.
 * @param {string} stack
 * @returns {string}
 */
export function withNerdSymbols(stack) {
  const raw = (stack || '').trim();
  if (!raw) {
    return `${EMBEDDED_PRIMARY}, ${NERD_SYMBOLS}, monospace`;
  }

  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  const filtered = parts.filter((part) => {
    const name = part.replace(/^["']|["']$/g, '');
    return name.toLowerCase() !== NERD_SYMBOLS_FAMILY.toLowerCase();
  });

  const monoIdx = filtered.findIndex((part) => {
    const name = part.replace(/^["']|["']$/g, '').toLowerCase();
    return name === 'monospace' || name === 'ui-monospace';
  });

  if (monoIdx === -1) {
    filtered.push(NERD_SYMBOLS, 'monospace');
  } else {
    filtered.splice(monoIdx, 0, NERD_SYMBOLS);
  }

  return filtered.join(', ');
}

/**
 * @param {string} [fontFamily]
 * @returns {string}
 */
export function resolveTerminalFontFamily(fontFamily) {
  const raw = (fontFamily || '').trim();

  if (!raw) {
    if (isNerdFontAvailable()) {
      return withNerdSymbols('"FiraCode Nerd Font", monospace');
    }
    return withNerdSymbols(`${EMBEDDED_PRIMARY}, monospace`);
  }

  if (NERD_FONT_RE.test(raw)) {
    if (isNerdFontAvailable()) {
      return withNerdSymbols(raw);
    }
    return withNerdSymbols(`${EMBEDDED_PRIMARY}, monospace`);
  }

  return withNerdSymbols(raw);
}

export function getDefaultLocalTerminalFontFamily() {
  try {
    const saved = localStorage.getItem('basicapp_local_terminal_font_family');
    if (saved) return resolveTerminalFontFamily(saved);
  } catch { /* ignore */ }
  return resolveTerminalFontFamily('"FiraCode Nerd Font", monospace');
}
