/**
 * Resuelve la familia de fuente del terminal.
 * "FiraCode Nerd Font" es systemOnly (no embebida): en Linux suele faltar
 * y el fallback a monospace genérico empeora atlas/glyphs. Sustituir por
 * fuentes embebidas (Fira Code / JetBrains Mono) cuando la Nerd no esté disponible.
 */

const NERD_FONT_RE = /FiraCode\s+Nerd\s+Font/i;
const EMBEDDED_FALLBACK = '"Fira Code", "JetBrains Mono", monospace';

let nerdFontAvailableCache = null;

function probeNerdFontAvailable() {
  if (typeof document === 'undefined') return false;
  try {
    if (document.fonts?.check) {
      // check() devuelve true si la cara está cargada o disponible en el sistema
      if (document.fonts.check('12px "FiraCode Nerd Font"')) return true;
      if (document.fonts.check("12px 'FiraCode Nerd Font'")) return true;
    }
  } catch { /* ignore */ }
  try {
    // Fallback canvas: métricas distintas → fuente no instalada
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.font = '12px monospace';
    const base = ctx.measureText('ABCDEFWMi@|' ).width;
    ctx.font = '12px "FiraCode Nerd Font", monospace';
    const nerd = ctx.measureText('ABCDEFWMi@|' ).width;
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
 * @param {string} [fontFamily]
 * @returns {string}
 */
export function resolveTerminalFontFamily(fontFamily) {
  const raw = (fontFamily || '').trim();
  if (!raw) {
    return isNerdFontAvailable()
      ? '"FiraCode Nerd Font", monospace'
      : EMBEDDED_FALLBACK;
  }
  if (!NERD_FONT_RE.test(raw)) {
    return raw;
  }
  if (isNerdFontAvailable()) {
    return raw;
  }
  // Sustituir Nerd por stack embebido; conservar monospace al final
  return EMBEDDED_FALLBACK;
}

export function getDefaultLocalTerminalFontFamily() {
  try {
    const saved = localStorage.getItem('basicapp_local_terminal_font_family');
    if (saved) return resolveTerminalFontFamily(saved);
  } catch { /* ignore */ }
  return resolveTerminalFontFamily('"FiraCode Nerd Font", monospace');
}
