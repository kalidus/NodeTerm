const FALLBACK_RGB = { r: 13, g: 17, b: 23 };

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function parseColorRgb(color) {
  if (!color || typeof color !== 'string') return null;
  const c = color.trim();
  if (!c || c === 'transparent' || c === 'none' || c === 'inherit') return null;

  if (c.includes('gradient')) {
    const match = c.match(/#([0-9a-fA-F]{3,8})|rgba?\([^)]+\)/i);
    return match ? parseColorRgb(match[0]) : null;
  }

  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    } else if (hex.length === 8) {
      hex = hex.slice(0, 6);
    }
    if (hex.length !== 6) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16) || 0,
      g: parseInt(hex.slice(2, 4), 16) || 0,
      b: parseInt(hex.slice(4, 6), 16) || 0
    };
  }

  if (c.startsWith('rgb')) {
    const m = c.match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    return { r: Number(m[0]), g: Number(m[1]), b: Number(m[2]) };
  }

  return null;
}

export function resolveHomePanelBaseColor(...candidates) {
  for (const color of candidates) {
    const rgb = parseColorRgb(color);
    if (rgb) return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }
  return `rgb(${FALLBACK_RGB.r}, ${FALLBACK_RGB.g}, ${FALLBACK_RGB.b})`;
}

/** Curva ease-out: el medio del slider se ve mas solido y el tramo bajo es mas gradual. */
export function mapHomePanelOpacity(slider) {
  const t = clamp01(slider);
  return 1 - Math.pow(1 - t, 2);
}

export function adjustOpacity(color, opacity) {
  const alpha = clamp01(opacity);
  const rgb = parseColorRgb(color) || FALLBACK_RGB;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function homePanelSurface(colors, slider) {
  const list = Array.isArray(colors) ? colors : [colors];
  return adjustOpacity(resolveHomePanelBaseColor(...list), mapHomePanelOpacity(slider));
}
