/** Families declared in src/styles/fonts.css (npm run download-fonts). */
const BUNDLED_FONT_FAMILIES = new Set([
  'Anonymous Pro',
  'B612 Mono',
  'Cousine',
  'Droid Sans Mono',
  'Fira Code',
  'Fira Mono',
  'IBM Plex Mono',
  'Inconsolata',
  'JetBrains Mono',
  'Major Mono Display',
  'Noto Sans Mono',
  'Nova Mono',
  'Overpass Mono',
  'Oxygen Mono',
  'PT Mono',
  'Recursive',
  'Red Hat Mono',
  'Roboto Mono',
  'Share Tech Mono',
  'Source Code Pro',
  'Space Mono',
  'Ubuntu Mono',
  'Victor Mono'
]);

const SYSTEM_OR_GENERIC_FONTS = new Set([
  'arial',
  'sans-serif',
  'system-ui',
  '-apple-system',
  'blinkmacsystemfont',
  'segoe ui',
  'helvetica neue',
  'sf pro display',
  'ubuntu',
  'inherit',
  'initial',
  'unset'
]);

/**
 * CSS font-family stack for whole application / UI typography.
 * @param {string} fontFamily
 * @returns {string}
 */
export function buildAppFontStack(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') {
    return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  }
  const trimmed = fontFamily.trim();
  if (!trimmed) {
    return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  }
  if (trimmed.includes(',')) {
    return trimmed;
  }
  return `"${trimmed}", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
}

/**
 * CSS font-family stack for sidebar / explorer typography.
 * @param {string} fontFamily
 * @returns {string}
 */
export function buildSidebarFontStack(fontFamily) {
  return buildAppFontStack(fontFamily);
}

export function isBundledSidebarFont(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') return false;
  const primary = fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
  return BUNDLED_FONT_FAMILIES.has(primary);
}

export function shouldLoadWebFont(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') return false;
  const primary = fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
  if (!primary) return false;
  if (isBundledSidebarFont(primary)) return false;
  if (SYSTEM_OR_GENERIC_FONTS.has(primary.toLowerCase())) return false;
  return true;
}

export const shouldLoadWebFontForSidebar = shouldLoadWebFont;

/**
 * Writes unified application typography variables on :root.
 */
export function applyAppTypography({
  uiFont,
  uiFontSize,
  sidebarFont,
  sidebarFontSize,
  explorerFont,
  explorerFontSize
}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const effectiveFont = uiFont || sidebarFont || explorerFont;
  if (effectiveFont) {
    const stack = buildAppFontStack(effectiveFont);
    root.style.setProperty('--ui-font-family', stack);
    root.style.setProperty('--font-family', stack);
    root.style.setProperty('--sidebar-font-family', stack);
    root.style.setProperty('--explorer-font-family', stack);
    root.style.setProperty('--home-tab-font-family', stack);
  }

  const effectiveSize = uiFontSize != null && uiFontSize !== ''
    ? uiFontSize
    : (sidebarFontSize != null && sidebarFontSize !== '' ? sidebarFontSize : explorerFontSize);

  if (effectiveSize != null && effectiveSize !== '') {
    const numericSize = typeof effectiveSize === 'number' ? effectiveSize : parseFloat(effectiveSize);
    if (!isNaN(numericSize) && numericSize > 0) {
      root.style.setProperty('--ui-font-size', `${numericSize}px`);
      root.style.setProperty('--sidebar-font-size', `${numericSize}px`);
      root.style.setProperty('--explorer-font-size', `${numericSize}px`);
      root.style.setProperty('--home-tab-font-size', `${numericSize}px`);
      // Dynamic rem scaling: ensures 0.875rem (the UI base label font size) calculates exactly to numericSize px.
      // Base ratio: 14px UI font size corresponds to standard 16px browser root (16/14 = 1.142857).
      root.style.setProperty('font-size', `${(numericSize * (16 / 14)).toFixed(3)}px`);
    }
  } else {
    root.style.removeProperty('font-size');
  }
}

/**
 * Legacy alias for applyAppTypography to preserve backwards compatibility.
 */
export function applySidebarTypographyCssVariables(options) {
  applyAppTypography(options || {});
}

