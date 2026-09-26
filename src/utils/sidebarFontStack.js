import { MONOSPACE_FONT_NAMES } from './fontsList';

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

const GENERIC_CSS_FAMILIES = new Set([
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
  '-apple-system',
  'blinkmacsystemfont',
  'inherit',
  'initial',
  'unset'
]);

const SYSTEM_OR_LOCAL_FONTS = new Set([
  'arial',
  'helvetica',
  'helvetica neue',
  'segoe ui',
  'sf pro display',
  'sf mono',
  'consolas',
  'courier new',
  'menlo',
  'monaco',
  'lucida console',
  'cascadia code',
  'andale mono',
  'dejavu sans mono',
  'liberation mono',
  'hack',
  'operator mono',
  'dank mono',
  'monoid',
  'firacode nerd font',
  'ubuntu',
  'clash grotesk',
  'geist',
  'satoshi'
]);

const DEFAULT_SANS_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const DEFAULT_MONO_STACK = 'ui-monospace, "Cascadia Code", Consolas, "Courier New", monospace';

export const UI_FONT_SIZE_MIN = 8;
export const UI_FONT_SIZE_MAX = 32;
export const UI_FONT_SIZE_STEP = 0.5;
export const UI_FONT_SIZE_DEFAULT = 14;
export const UI_ICON_RATIO = 20 / 14;
export const UI_FONT_SIZE_PRESETS = [11, 12, 13, 14, 15, 16, 18];

const MONOSPACE_LOOKUP = new Set(
  MONOSPACE_FONT_NAMES.map((name) => name.toLowerCase())
);

function normalizeFamilyName(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') return '';
  return fontFamily.trim().replace(/^["']|["']$/g, '');
}

export function clampUiFontSize(value) {
  const raw = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(raw)) return UI_FONT_SIZE_DEFAULT;
  return Number(Math.max(UI_FONT_SIZE_MIN, Math.min(UI_FONT_SIZE_MAX, raw)).toFixed(1));
}

export function deriveUiIconSize(fontSize) {
  return Math.max(12, Math.min(32, Math.round(clampUiFontSize(fontSize) * UI_ICON_RATIO)));
}

export function formatUiFontSize(size) {
  const n = clampUiFontSize(size);
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export function iconSizeToUiFontSize(iconSize) {
  const raw = typeof iconSize === 'number' ? iconSize : parseFloat(iconSize);
  if (isNaN(raw)) return UI_FONT_SIZE_DEFAULT;
  return clampUiFontSize(raw * (14 / 20));
}

export function getUiFontSizePx(fallback = UI_FONT_SIZE_DEFAULT) {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--ui-font-size');
  const n = parseFloat(raw);
  return !isNaN(n) && n > 0 ? n : fallback;
}

/**
 * CSS font-family stack for whole application / UI typography.
 * @param {string} fontFamily
 * @returns {string}
 */
export function buildAppFontStack(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') {
    return DEFAULT_SANS_STACK;
  }
  const trimmed = fontFamily.trim();
  if (!trimmed) {
    return DEFAULT_SANS_STACK;
  }
  if (trimmed.includes(',')) {
    return trimmed;
  }

  const primary = normalizeFamilyName(trimmed);
  if (!primary) {
    return DEFAULT_SANS_STACK;
  }

  const lower = primary.toLowerCase();
  if (GENERIC_CSS_FAMILIES.has(lower)) {
    if (lower === 'sans-serif' || lower === 'ui-sans-serif') return DEFAULT_SANS_STACK;
    if (lower === 'monospace' || lower === 'ui-monospace') return DEFAULT_MONO_STACK;
    if (lower === 'system-ui' || lower === '-apple-system' || lower === 'blinkmacsystemfont') {
      return `${primary}, ${DEFAULT_SANS_STACK}`;
    }
    return primary;
  }

  const quoted = `"${primary}"`;
  if (MONOSPACE_LOOKUP.has(lower)) {
    return `${quoted}, ${DEFAULT_MONO_STACK}`;
  }
  return `${quoted}, ${DEFAULT_SANS_STACK}`;
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
  const primary = normalizeFamilyName(fontFamily.split(',')[0]);
  return BUNDLED_FONT_FAMILIES.has(primary);
}

export function isMonospaceUiFont(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') return false;
  const primary = normalizeFamilyName(fontFamily.split(',')[0]);
  return MONOSPACE_LOOKUP.has(primary.toLowerCase());
}

export function shouldLoadWebFont(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') return false;
  const primary = normalizeFamilyName(fontFamily.split(',')[0]);
  if (!primary) return false;
  if (isBundledSidebarFont(primary)) return false;
  const lower = primary.toLowerCase();
  if (GENERIC_CSS_FAMILIES.has(lower)) return false;
  if (SYSTEM_OR_LOCAL_FONTS.has(lower)) return false;
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
    const numericSize = clampUiFontSize(effectiveSize);
    const iconPx = deriveUiIconSize(numericSize);
    root.style.setProperty('--ui-font-size', `${numericSize}px`);
    root.style.setProperty('--ui-font-size-xs', `${Math.max(UI_FONT_SIZE_MIN, numericSize - 2)}px`);
    root.style.setProperty('--ui-font-size-sm', `${Math.max(UI_FONT_SIZE_MIN, numericSize - 1)}px`);
    root.style.setProperty('--ui-font-size-md', `${numericSize}px`);
    root.style.setProperty('--ui-font-size-lg', `${numericSize + 1}px`);
    root.style.setProperty('--ui-font-size-xl', `${numericSize + 2}px`);
    root.style.setProperty('--sidebar-font-size', `${numericSize}px`);
    root.style.setProperty('--explorer-font-size', `${numericSize}px`);
    root.style.setProperty('--home-tab-font-size', `${numericSize}px`);
    root.style.setProperty('--ui-icon-size', `${iconPx}px`);
    root.style.setProperty('--icon-size', `${iconPx}px`);
    root.style.setProperty('--sidebar-icon-size', `${iconPx}px`);
    root.style.setProperty('--sidebar-folder-icon-size', `${iconPx}px`);
    root.style.setProperty('--sidebar-connection-icon-size', `${iconPx}px`);
    root.style.setProperty('--ui-line-height', '1.3');
    root.style.setProperty('font-size-adjust', 'from-font');
    // 14px UI <=> 16px html rem. 4 decimals keep 0.5px steps smooth.
    root.style.setProperty('font-size', `${(numericSize * (16 / 14)).toFixed(4)}px`);
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
