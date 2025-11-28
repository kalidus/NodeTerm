/**
 * Tree Themes - Temas visuales para el árbol de sesiones
 * 
 * Cada tema define:
 * - name: Nombre para mostrar en el selector
 * - description: Descripción corta del estilo
 * - lineStyle: Tipo de líneas de conexión (none, ascii, solid, dotted, dashed)
 * - lineColor: Color de las líneas (puede usar CSS variables)
 * - lineWidth: Grosor de las líneas
 * - nodeSpacing: Espaciado entre nodos (compact, normal, comfortable)
 * - indentSize: Tamaño de indentación en px
 * - borderRadius: Radio de bordes para elementos
 * - hoverStyle: Estilo de hover (subtle, highlight, glow)
 * - connectorChars: Caracteres ASCII para líneas (si lineStyle es 'ascii')
 * - cssClass: Clase CSS a aplicar al árbol
 */

export const treeThemes = {
  default: {
    name: 'Default',
    description: 'Estilo clásico con líneas ASCII',
    lineStyle: 'ascii',
    lineColor: 'var(--text-color-secondary)',
    lineOpacity: 0.5,
    lineWidth: 1,
    nodeSpacing: 'normal',
    indentSize: 20,
    borderRadius: 4,
    hoverStyle: 'subtle',
    connectorChars: {
      vertical: '│',
      horizontal: '──',
      branch: '├',
      lastBranch: '└',
      space: ' '
    },
    cssClass: 'tree-theme-default'
  },

  minimal: {
    name: 'Minimal',
    description: 'Limpio sin líneas de conexión',
    lineStyle: 'none',
    lineColor: 'transparent',
    lineOpacity: 0,
    lineWidth: 0,
    nodeSpacing: 'normal',
    indentSize: 16,
    borderRadius: 4,
    hoverStyle: 'subtle',
    connectorChars: {
      vertical: '',
      horizontal: '',
      branch: '',
      lastBranch: '',
      space: ''
    },
    cssClass: 'tree-theme-minimal'
  },

  connected: {
    name: 'Líneas Conectadas',
    description: 'Líneas CSS continuas estilo VSCode',
    lineStyle: 'solid',
    lineColor: 'var(--ui-sidebar-border)',
    lineOpacity: 0.6,
    lineWidth: 1,
    nodeSpacing: 'normal',
    indentSize: 20,
    borderRadius: 4,
    hoverStyle: 'highlight',
    connectorChars: null, // Usa CSS en lugar de caracteres
    cssClass: 'tree-theme-connected'
  },

  compact: {
    name: 'Compacto',
    description: 'Espaciado mínimo para muchos nodos',
    lineStyle: 'solid',
    lineColor: 'var(--ui-sidebar-border)',
    lineOpacity: 0.4,
    lineWidth: 1,
    nodeSpacing: 'compact',
    indentSize: 14,
    borderRadius: 2,
    hoverStyle: 'subtle',
    connectorChars: null,
    cssClass: 'tree-theme-compact'
  },

  dotted: {
    name: 'Punteado',
    description: 'Líneas punteadas elegantes',
    lineStyle: 'dotted',
    lineColor: 'var(--ui-sidebar-text)',
    lineOpacity: 0.35,
    lineWidth: 1,
    nodeSpacing: 'normal',
    indentSize: 18,
    borderRadius: 4,
    hoverStyle: 'subtle',
    connectorChars: null,
    cssClass: 'tree-theme-dotted'
  },

  modern: {
    name: 'Moderno',
    description: 'Líneas con colores de acento y bordes suaves',
    lineStyle: 'solid',
    lineColor: 'var(--ui-button-primary)',
    lineOpacity: 0.5,
    lineWidth: 2,
    nodeSpacing: 'comfortable',
    indentSize: 22,
    borderRadius: 6,
    hoverStyle: 'glow',
    connectorChars: null,
    cssClass: 'tree-theme-modern'
  }
};

// Array para el dropdown del selector
export const treeThemeOptions = Object.entries(treeThemes).map(([key, theme]) => ({
  label: theme.name,
  value: key,
  description: theme.description
}));

// Obtener tema por clave, con fallback a 'default'
export const getTreeTheme = (themeKey) => {
  return treeThemes[themeKey] || treeThemes.default;
};

// Clave de localStorage
export const TREE_THEME_STORAGE_KEY = 'nodeterm_tree_theme';

// Guardar tema seleccionado
export const saveTreeTheme = (themeKey) => {
  try {
    localStorage.setItem(TREE_THEME_STORAGE_KEY, themeKey);
  } catch (e) {
    console.warn('No se pudo guardar el tema del árbol:', e);
  }
};

// Cargar tema guardado
export const loadTreeTheme = () => {
  try {
    return localStorage.getItem(TREE_THEME_STORAGE_KEY) || 'default';
  } catch (e) {
    console.warn('No se pudo cargar el tema del árbol:', e);
    return 'default';
  }
};

export default treeThemes;

