import React from 'react';

const FALLBACK_COLOR = '#5e81ac';

/** Extrae color primario del folder del tema (mismo criterio que getThemeDefaultColor). */
function extractThemeColor(theme) {
  const folderIcon = theme?.icons?.folder;
  if (!folderIcon?.props) return FALLBACK_COLOR;

  const { fill, stroke, children } = folderIcon.props;
  if (fill && fill !== 'none') return fill;
  if (stroke && stroke !== 'none') return stroke;

  const list = Array.isArray(children) ? children : children ? [children] : [];
  for (const child of list) {
    if (!child?.props) continue;
    if (child.props.fill && child.props.fill !== 'none') return child.props.fill;
    if (child.props.stroke && child.props.stroke !== 'none') return child.props.stroke;
  }
  return FALLBACK_COLOR;
}

/**
 * Glifo vault estilo Termius, coloreado con la paleta del tema.
 * viewBox 24×24 / 20×20 como el resto de icon-themes.
 *
 * @param {{ name?: string, icons?: Record<string, unknown> }} theme
 * @param {string} [themeId]
 */
export function makeVaultThemeIcon(theme, themeId = 'vault') {
  const color = extractThemeColor(theme);
  const pid = String(themeId || theme?.name || 'vault')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-vault-theme={pid}
    >
      <path
        fill={color}
        fillRule="evenodd"
        d={
          // Cuerpo (escala 16→24)
          'M4.275 4.05h15.45A2.925 2.925 0 0 1 22.65 6.975v10.05a2.925 2.925 0 0 1-2.925 2.925H4.275A2.925 2.925 0 0 1 1.35 17.025V6.975A2.925 2.925 0 0 1 4.275 4.05z' +
          // Patas
          'M3.525 19.95h2.925v2.025H3.525z' +
          'M17.55 19.95h2.925v2.025H17.55z' +
          // Ranura vertical
          'M5.325 8.025h1.65v7.5H5.325z' +
          // Hueco del dial
          'M10.2 11.775a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0-7.2 0'
        }
      />
      <circle cx="13.8" cy="11.775" r="2.625" fill={color} />
    </svg>
  );
}

/**
 * Asegura icons.vault en un tema (mutación in-place de icons).
 * @param {{ name?: string, icons?: Record<string, unknown> } | null | undefined} theme
 * @param {string} [themeId]
 */
export function ensureThemeVaultIcon(theme, themeId) {
  if (!theme?.icons || theme.icons.vault) return theme;
  theme.icons.vault = makeVaultThemeIcon(theme, themeId || theme.name || 'vault');
  return theme;
}
