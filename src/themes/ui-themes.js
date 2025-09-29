// Importar temas clásicos, futuristas, modernos y animados
import { classicUiThemes, CLASSIC_UI_KEYS } from './classic-ui-themes.js';
import { futuristUiThemes, FUTURISTIC_UI_KEYS } from './futurist-ui-themes.js';
import { modernUiThemes, MODERN_UI_KEYS } from './modern-ui-themes.js';
import { animatedUiThemes, ANIMATED_UI_KEYS } from './animated-ui-themes.js';

// Categorías de temas de interfaz

export const uiThemes = {
  // === SECCIÓN CLÁSICOS ===
  ...classicUiThemes,

  // === SECCIÓN FUTURISTAS ===
  ...futuristUiThemes,

  // === SECCIÓN MODERNOS ===
  ...modernUiThemes,

  // === SECCIÓN ANIMADOS ===
  ...animatedUiThemes
};

// Exportar las categorías para uso en el ThemeSelector
export { CLASSIC_UI_KEYS, FUTURISTIC_UI_KEYS, MODERN_UI_KEYS, ANIMATED_UI_KEYS }; 