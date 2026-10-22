/**
 * Selectores de fuentes derivados de fontCatalog.js.
 * El script scripts/download-fonts.js usa el mismo catálogo.
 */

import catalog from './fontCatalog.js';

const sortNames = (names) => (
  [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }))
);

export const MONOSPACE_FONT_NAMES = sortNames(
  catalog.fonts.filter((font) => font.role === 'mono').map((font) => font.family)
);

export const ADDITIONAL_FONTS = sortNames(
  catalog.fonts.filter((font) => font.terminal).map((font) => font.family)
);

const REPLACED_FAMILIES = Object.fromEntries(
  Object.entries(catalog.replacements || {}).map(([from, to]) => [from.toLowerCase(), to])
);

/**
 * Sustituye una familia que ya no se ofrece por su reemplazo empaquetado.
 * Acepta un nombre suelto o una pila CSS ("Poppins", sans-serif).
 * @param {string} value
 * @returns {string}
 */
export function migrateStoredFont(value) {
  if (!value || typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  const match = trimmed.match(/^["']?([^"',]+)["']?/);
  if (!match) return value;

  const replacement = REPLACED_FAMILIES[match[1].trim().toLowerCase()];
  if (!replacement) return value;

  const quoted = /\s/.test(replacement) ? `"${replacement}"` : replacement;
  const comma = trimmed.indexOf(',');
  if (comma === -1) {
    return /^["']/.test(trimmed) ? quoted : replacement;
  }
  return `${quoted}${trimmed.slice(comma)}`;
}

export const getAllFontsSorted = () => {
  const allFonts = [...MONOSPACE_FONT_NAMES, ...ADDITIONAL_FONTS];
  return sortNames(allFonts);
};

export const getAvailableFonts = () => {
  const allFonts = getAllFontsSorted();

  return allFonts.map((fontName) => {
    const needsQuotes = fontName.includes(' ') || fontName.includes('-');
    const isMonospace = MONOSPACE_FONT_NAMES.includes(fontName);
    const fallback = isMonospace ? 'monospace' : 'sans-serif';
    const cssValue = needsQuotes ? `"${fontName}", ${fallback}` : `${fontName}, ${fallback}`;

    return {
      label: fontName,
      value: cssValue
    };
  });
};

export const getExplorerFonts = () => (
  sortNames(catalog.fonts.map((font) => font.family))
);
