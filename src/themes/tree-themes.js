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
  },

  // ═══════════════════════════════════════════════════════════════
  // TEMAS COMPACTOS MODERNOS
  // ═══════════════════════════════════════════════════════════════

  connectedCompact: {
    name: 'Conectado Compacto',
    description: 'Líneas conectadas con espaciado mínimo',
    lineStyle: 'solid',
    lineColor: 'var(--ui-sidebar-border)',
    lineOpacity: 0.5,
    lineWidth: 1,
    nodeSpacing: 'compact',
    indentSize: 14,
    borderRadius: 3,
    hoverStyle: 'highlight',
    connectorChars: null,
    cssClass: 'tree-theme-connected-compact'
  },

  modernCompact: {
    name: 'Moderno Compacto',
    description: 'Estilo moderno con espaciado reducido',
    lineStyle: 'solid',
    lineColor: 'var(--ui-button-primary)',
    lineOpacity: 0.4,
    lineWidth: 1,
    nodeSpacing: 'compact',
    indentSize: 16,
    borderRadius: 4,
    hoverStyle: 'glow',
    connectorChars: null,
    cssClass: 'tree-theme-modern-compact'
  },

  // ═══════════════════════════════════════════════════════════════
  // TEMAS FUTURISTAS
  // ═══════════════════════════════════════════════════════════════

  neon: {
    name: 'Neón',
    description: 'Líneas brillantes con efecto neón',
    lineStyle: 'solid',
    lineColor: '#00ffff',
    lineOpacity: 0.8,
    lineWidth: 1,
    nodeSpacing: 'normal',
    indentSize: 20,
    borderRadius: 4,
    hoverStyle: 'neon-glow',
    connectorChars: null,
    cssClass: 'tree-theme-neon'
  },

  cyber: {
    name: 'Cyberpunk',
    description: 'Estilo cyberpunk con rosa y azul',
    lineStyle: 'solid',
    lineColor: '#ff00ff',
    lineOpacity: 0.6,
    lineWidth: 2,
    nodeSpacing: 'normal',
    indentSize: 20,
    borderRadius: 0,
    hoverStyle: 'cyber-glow',
    connectorChars: null,
    cssClass: 'tree-theme-cyber'
  },

  matrix: {
    name: 'Matrix',
    description: 'Verde digital estilo Matrix',
    lineStyle: 'solid',
    lineColor: '#00ff00',
    lineOpacity: 0.5,
    lineWidth: 1,
    nodeSpacing: 'compact',
    indentSize: 16,
    borderRadius: 0,
    hoverStyle: 'matrix-glow',
    connectorChars: null,
    cssClass: 'tree-theme-matrix'
  },

  hologram: {
    name: 'Holograma',
    description: 'Efecto holográfico translúcido',
    lineStyle: 'solid',
    lineColor: '#64ffda',
    lineOpacity: 0.4,
    lineWidth: 1,
    nodeSpacing: 'normal',
    indentSize: 20,
    borderRadius: 8,
    hoverStyle: 'hologram',
    connectorChars: null,
    cssClass: 'tree-theme-hologram'
  },

  gradient: {
    name: 'Gradiente',
    description: 'Líneas con gradientes coloridos',
    lineStyle: 'gradient',
    lineColor: 'linear-gradient(180deg, #667eea, #764ba2)',
    lineOpacity: 0.7,
    lineWidth: 2,
    nodeSpacing: 'normal',
    indentSize: 20,
    borderRadius: 6,
    hoverStyle: 'gradient-glow',
    connectorChars: null,
    cssClass: 'tree-theme-gradient'
  },

  aurora: {
    name: 'Aurora',
    description: 'Colores de aurora boreal',
    lineStyle: 'solid',
    lineColor: '#7f5af0',
    lineOpacity: 0.6,
    lineWidth: 2,
    nodeSpacing: 'comfortable',
    indentSize: 22,
    borderRadius: 8,
    hoverStyle: 'aurora-glow',
    connectorChars: null,
    cssClass: 'tree-theme-aurora'
  },

  frost: {
    name: 'Escarcha',
    description: 'Efecto de hielo frío y cristalino',
    lineStyle: 'solid',
    lineColor: '#a8dadc',
    lineOpacity: 0.5,
    lineWidth: 1,
    nodeSpacing: 'normal',
    indentSize: 20,
    borderRadius: 6,
    hoverStyle: 'frost',
    connectorChars: null,
    cssClass: 'tree-theme-frost'
  },

  // ═══════════════════════════════════════════════════════════════
  // TEMAS CON ESTILOS DE LÍNEAS ÚNICOS
  // ═══════════════════════════════════════════════════════════════

  double: {
    name: 'Doble Línea',
    description: 'Líneas dobles paralelas',
    lineStyle: 'double',
    lineColor: 'var(--ui-sidebar-border)',
    lineOpacity: 0.7,
    lineWidth: 2,
    nodeSpacing: 'normal',
    indentSize: 20,
    borderRadius: 4,
    hoverStyle: 'highlight',
    connectorChars: null,
    cssClass: 'tree-theme-double'
  },

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

