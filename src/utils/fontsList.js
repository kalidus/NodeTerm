/**
 * Lista maestra unificada de todas las fuentes
 * Esta lista se usa para sincronizar availableFonts y explorerFonts
 * Todas las listas están ordenadas alfabéticamente para consistencia
 */

// Lista completa de nombres de fuentes monoespaciadas (sin formato CSS)
// ORDENADA ALFABÉTICAMENTE para garantizar orden consistente en todos los selectores
export const MONOSPACE_FONT_NAMES = [
  'Andale Mono',
  'Anonymous Pro',
  'B612 Mono',
  'Cascadia Code',
  'Consolas',
  'Courier New',
  'Cousine',
  'Dank Mono',
  'DejaVu Sans Mono',
  'Droid Sans Mono',
  'Fira Code',
  'Fira Mono',
  'FiraCode Nerd Font',
  'Hack',
  'IBM Plex Mono',
  'Inconsolata',
  'JetBrains Mono',
  'Liberation Mono',
  'Lucida Console',
  'Major Mono Display',
  'Menlo',
  'Monaco',
  'Monoid',
  'Noto Sans Mono',
  'Nova Mono',
  'Operator Mono',
  'Oxygen Mono',
  'Overpass Mono',
  'PT Mono',
  'Recursive',
  'Red Hat Mono',
  'Roboto Mono',
  'SF Mono',
  'Share Tech Mono',
  'Source Code Pro',
  'Space Mono',
  'Ubuntu Mono',
  'Victor Mono'
];

// Fuentes adicionales no monoespaciadas que deben estar en ambos lugares
// ORDENADAS ALFABÉTICAMENTE
export const ADDITIONAL_FONTS = [
  'Ubuntu'  // Fuente sans-serif popular que debe estar disponible en terminales también
];

/**
 * Obtiene todas las fuentes ordenadas alfabéticamente
 * MONOSPACE_FONT_NAMES ya está ordenado, solo agregamos ADDITIONAL_FONTS y ordenamos
 * @returns {Array<string>} Lista de nombres de fuentes ordenadas
 */
export const getAllFontsSorted = () => {
  // MONOSPACE_FONT_NAMES ya está ordenado alfabéticamente
  // Solo necesitamos agregar ADDITIONAL_FONTS y ordenar el resultado final
  const allFonts = [...MONOSPACE_FONT_NAMES, ...ADDITIONAL_FONTS];
  return allFonts.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
};

/**
 * Genera el array de availableFonts con formato { label, value }
 * Ordenado alfabéticamente para consistencia
 * Mismo orden que getAllFontsSorted() para garantizar sincronización
 */
export const getAvailableFonts = () => {
  // Obtener todas las fuentes ordenadas alfabéticamente (mismo orden que explorerFonts)
  const allFonts = getAllFontsSorted();
  
  return allFonts.map(fontName => {
    // Algunas fuentes no necesitan comillas en el CSS
    const needsQuotes = fontName.includes(' ') || fontName.includes('-');
    
    // Las fuentes monoespaciadas usan monospace, las demás usan sans-serif
    const isMonospace = MONOSPACE_FONT_NAMES.includes(fontName);
    const fallback = isMonospace ? 'monospace' : 'sans-serif';
    const cssValue = needsQuotes ? `"${fontName}", ${fallback}` : `${fontName}, ${fallback}`;
    
    return {
      label: fontName,
      value: cssValue
    };
  });
};

/**
 * Obtiene la lista de fuentes para el explorador ordenada alfabéticamente
 * Incluye fuentes del sistema, modernas y monoespaciadas
 * Las fuentes monoespaciadas aparecen en el MISMO ORDEN que en availableFonts
 */
export const getExplorerFonts = () => {
  // Fuentes del sistema y modernas (no monoespaciadas) - ORDENADAS ALFABÉTICAMENTE
  const systemAndModernFonts = [
    'Arial',
    'Clash Grotesk',
    'DM Sans',
    'Epilogue',
    'Figtree',
    'Geist',
    'Helvetica Neue',
    'Inter',
    'Lato',
    'Lexend',
    'Manrope',
    'Montserrat',
    'Nunito',
    'Open Sans',
    'Outfit',
    'Plus Jakarta Sans',
    'Poppins',
    'Roboto',
    'Sans-serif',
    'Satoshi',
    'SF Pro Display',
    'Segoe UI',
    'Source Sans Pro',
    'Ubuntu',
    'Work Sans'
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
  
  // Obtener fuentes monoespaciadas en el MISMO ORDEN que availableFonts
  const monoFontsOrdered = getAllFontsSorted();
  
  // Combinar todas las fuentes y ordenar alfabéticamente
  // Esto garantiza que las fuentes monoespaciadas aparezcan en el mismo orden relativo
  const allFonts = [...systemAndModernFonts, ...monoFontsOrdered];
  
  // Eliminar duplicados (Ubuntu puede estar en ambos grupos) y ordenar alfabéticamente
  // Usar el mismo método de ordenación que getAllFontsSorted() para garantizar consistencia
  const uniqueFonts = [...new Set(allFonts)];
  return uniqueFonts.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
};

