// Importar temas clásicos, futuristas y modernos
import { classicUiThemes, CLASSIC_UI_KEYS } from './classic-ui-themes.js';
import { futuristUiThemes, FUTURISTIC_UI_KEYS } from './futurist-ui-themes.js';
import { modernUiThemes, MODERN_UI_KEYS } from './modern-ui-themes.js';

// Categorías de temas de interfaz

export const uiThemes = {
  // === SECCIÓN CLÁSICOS ===
  ...classicUiThemes,

  // === SECCIÓN FUTURISTAS ===
  ...futuristUiThemes,

  // === SECCIÓN MODERNOS ===
  ...modernUiThemes
};

// Exportar las categorías para uso en el ThemeSelector
export { CLASSIC_UI_KEYS, FUTURISTIC_UI_KEYS, MODERN_UI_KEYS }; 