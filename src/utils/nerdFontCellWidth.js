/**
 * Anchos de celda para iconos Nerd Font (PUA).
 * Unicode marca PUA como ancho 1; Symbols Nerd Font dibuja glifos de 2 celdas,
 * así que sin esto el icono invade el espacio/nombre (eza/ll).
 *
 * Rangos alineados con powerman/wcwidth-icons y nerd-fonts v3.
 * Powerline (U+E0A0–E0BF) se deja en 1 para no romper prompts.
 */

/** @type {Array<[number, number]>} */
const NERD_WIDE_RANGES = [
  [0x23fb, 0x23fe],
  [0x2665, 0x2665],
  [0x2b58, 0x2b58],
  [0xe000, 0xe09f],
  [0xe0c0, 0xf8ff],
  [0xf0000, 0xffffd],
  [0x100000, 0x10fffd]
];

/**
 * @param {number} codepoint
 * @returns {boolean}
 */
export function isNerdFontWideIcon(codepoint) {
  if (!Number.isFinite(codepoint) || codepoint < 0) return false;
  for (let i = 0; i < NERD_WIDE_RANGES.length; i++) {
    const [from, to] = NERD_WIDE_RANGES[i];
    if (codepoint >= from && codepoint <= to) return true;
  }
  return false;
}

/**
 * propertyValue = (kind << 3) | (width << 1) | shouldJoin
 * @see xterm UnicodeService.createPropertyValue(0, 2, false)
 */
const WIDE_CHAR_PROPERTIES = 4;

/**
 * Registra Unicode 11 + variante con iconos Nerd a ancho 2.
 * @param {import('@xterm/xterm').Terminal} term
 * @param {new () => import('@xterm/xterm').ITerminalAddon} Unicode11Addon
 */
export function attachNerdAwareUnicode(term, Unicode11Addon) {
  if (!term || typeof Unicode11Addon !== 'function') return;

  try {
    term.loadAddon(new Unicode11Addon());
  } catch (_) {
    return;
  }

  let baseProvider = null;
  try {
    // Core expone unicodeService; el mapa de providers es interno.
    const service = term._core?.unicodeService || term._core?._unicodeService;
    baseProvider = service?._providers?.['11'] || null;
  } catch (_) {
    baseProvider = null;
  }

  if (!baseProvider || typeof term.unicode?.register !== 'function') {
    try {
      term.unicode.activeVersion = '11';
    } catch (_) {}
    return;
  }

  try {
    term.unicode.register({
      version: '11-nerd',
      wcwidth(codepoint) {
        if (isNerdFontWideIcon(codepoint)) return 2;
        return baseProvider.wcwidth(codepoint);
      },
      charProperties(codepoint, preceding) {
        if (isNerdFontWideIcon(codepoint)) return WIDE_CHAR_PROPERTIES;
        return baseProvider.charProperties(codepoint, preceding);
      }
    });
    term.unicode.activeVersion = '11-nerd';
  } catch (_) {
    try {
      term.unicode.activeVersion = '11';
    } catch (__) {}
  }
}
