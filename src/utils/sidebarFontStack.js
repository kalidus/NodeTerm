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
 * CSS font-family stack for sidebar / explorer typography.
 * @param {string} fontFamily
 * @returns {string}
 */
export function buildSidebarFontStack(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') {
    return 'system-ui, sans-serif';
  }
  const trimmed = fontFamily.trim();
  if (!trimmed) {
    return 'system-ui, sans-serif';
  }
  if (trimmed.includes(',')) {
    return trimmed;
  }
  return `"${trimmed}", system-ui, sans-serif`;
}

export function isBundledSidebarFont(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') return false;
  const primary = fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
  return BUNDLED_FONT_FAMILIES.has(primary);
}

export function shouldLoadWebFontForSidebar(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') return false;
  const primary = fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
  if (!primary) return false;
  if (isBundledSidebarFont(primary)) return false;
  if (SYSTEM_OR_GENERIC_FONTS.has(primary.toLowerCase())) return false;
  return true;
}

/**
 * Writes sidebar / explorer typography variables on :root.
 */
export function applySidebarTypographyCssVariables({
  sidebarFont,
  sidebarFontSize,
  explorerFont,
  explorerFontSize
}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (sidebarFont) {
    root.style.setProperty('--sidebar-font-family', buildSidebarFontStack(sidebarFont));
  }
  if (sidebarFontSize != null && sidebarFontSize !== '') {
    root.style.setProperty('--sidebar-font-size', `${sidebarFontSize}px`);
  }
  if (explorerFont) {
    root.style.setProperty('--explorer-font-family', buildSidebarFontStack(explorerFont));
  }
  if (explorerFontSize != null && explorerFontSize !== '') {
    root.style.setProperty('--explorer-font-size', `${explorerFontSize}px`);
  }
}
