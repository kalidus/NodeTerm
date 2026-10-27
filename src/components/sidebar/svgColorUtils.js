import React from 'react';
import { iconThemes } from '../../themes/icon-themes';
import { defaultColorCache } from './iconCache';

/** Convierte hex a HSL. */
export const hexToHsl = (hex) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return [0, 0, 0];
  const r = parseInt(hex.substr(1, 2), 16) / 255;
  const g = parseInt(hex.substr(3, 2), 16) / 255;
  const b = parseInt(hex.substr(5, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
};

/**
 * Modifica colores de un elemento SVG de forma recursiva.
 * Algunos temas preservan colores originales.
 */
export const modifySVGColors = (element, newColor, themeKey, index = 0) => {
  if (!element || !element.props) return element;

  const newProps = { ...element.props };

  if (!newProps.key) {
    newProps.key = `svg-child-${index}-${Date.now()}`;
  }

  const preserveOriginalColorsThemes = [
    'monokai', 'onedark', 'gruvbox', 'tokyonight', 'palenight', 'minimal',
    'cyberpunk', 'retroGaming', 'corporate', 'space', 'ocean',
    'fire', 'ice', 'forest', 'sunset', 'matrix', 'neon', 'gradient',
    'rainbow', 'metallic', 'holographic', 'glitch',
    'vaporwave', 'minimalist', 'geometric', 'organic', 'tech', 'gaming', 'professional',
    'acrylic', 'neumorphic'
  ];

  if (preserveOriginalColorsThemes.includes(themeKey)) {
    return element;
  }

  const colorMapping = {
    '#ff007c': newColor,
    '#00d4ff': '#00d4ff',
    '#5e81ac': newColor,
    '#88c0d0': '#88c0d0',
    '#bd93f9': newColor,
    '#ff79c6': '#ff79c6',
    '#0078d4': newColor,
    '#50e6ff': '#50e6ff',
    '#b58900': newColor,
    '#268bd2': '#268bd2',
    '#007ad9': newColor,
    '#42a5f5': '#42a5f5',
    '#1976d2': newColor,
    '#2196f3': newColor,
    '#dcb67a': newColor,
    '#f5d18a': '#f5d18a',
  };

  if (newProps.fill && newProps.fill !== 'none' && !newProps.fill.startsWith('url')) {
    if (colorMapping[newProps.fill]) {
      newProps.fill = colorMapping[newProps.fill];
    } else {
      newProps.fill = newColor;
    }
  }

  if (newProps.stroke && newProps.stroke !== 'none' && !newProps.stroke.startsWith('url')) {
    if (colorMapping[newProps.stroke]) {
      newProps.stroke = colorMapping[newProps.stroke];
    } else {
      newProps.stroke = newColor;
    }
  }

  if (newProps.children) {
    if (Array.isArray(newProps.children)) {
      newProps.children = newProps.children.map((child, idx) =>
        typeof child === 'object' ? modifySVGColors(child, newColor, themeKey, idx) : child
      );
    } else if (typeof newProps.children === 'object') {
      newProps.children = modifySVGColors(newProps.children, newColor, themeKey, 0);
    }
  }

  return React.cloneElement(element, newProps);
};

/** Verifica si un color es el color por defecto de algún tema. */
export const isDefaultThemeColor = (color) => {
  if (!color || typeof color !== 'string') return false;

  const lowerColor = color.toLowerCase();
  if (defaultColorCache.has(lowerColor)) {
    return defaultColorCache.get(lowerColor);
  }

  const defaultThemeColors = [
    '#007ad9', '#42a5f5', '#1976d2', '#2196f3',
    '#0078d4', '#50e6ff',
    '#ff007c', '#00d4ff',
    '#5e81ac', '#88c0d0',
    '#bd93f9', '#ff79c6',
    '#b58900', '#268bd2',
    '#dcb67a', '#f5d18a',
    '#6c7086', '#808080', '#999999', '#7f8c8d', '#95a5a6'
  ];

  if (defaultThemeColors.includes(lowerColor)) {
    defaultColorCache.set(lowerColor, true);
    return true;
  }

  try {
    const [, s] = hexToHsl(color);
    if (s < 15) {
      defaultColorCache.set(lowerColor, true);
      return true;
    }
  } catch (e) {
    // Ignorar errores de parseo
  }

  defaultColorCache.set(lowerColor, false);
  return false;
};

/** Color por defecto del icono folder del tema actual. */
export const getThemeDefaultColor = (themeName) => {
  const theme = iconThemes[themeName?.toLowerCase() || 'nord'];
  if (!theme || !theme.icons || !theme.icons.folder) return '#5e81ac';

  const folderIcon = theme.icons.folder;

  if (folderIcon.props && folderIcon.props.fill && folderIcon.props.fill !== 'none') {
    return folderIcon.props.fill;
  }

  if (folderIcon.props && folderIcon.props.stroke) {
    return folderIcon.props.stroke;
  }

  if (folderIcon.props && folderIcon.props.children) {
    const children = Array.isArray(folderIcon.props.children)
      ? folderIcon.props.children
      : [folderIcon.props.children];

    for (const child of children) {
      if (child.props && child.props.fill && child.props.fill !== 'none') {
        return child.props.fill;
      }
      if (child.props && child.props.stroke) {
        return child.props.stroke;
      }
    }
  }

  return '#5e81ac';
};
