// Importar temas clásicos, futuristas, modernos, animados y de naturaleza
import { classicUiThemes, CLASSIC_UI_KEYS } from './classic-ui-themes.js';
import { futuristUiThemes, FUTURISTIC_UI_KEYS } from './futurist-ui-themes.js';
import { modernUiThemes, MODERN_UI_KEYS } from './modern-ui-themes.js';
import { animatedUiThemes, ANIMATED_UI_KEYS } from './animated-ui-themes.js';
import { natureUiThemes, NATURE_UI_KEYS } from './animated-ui-themes-nature.js';

// Categorías de temas de interfaz

export const uiThemes = {
  // === SECCIÓN CLÁSICOS ===
  ...classicUiThemes,

  // === SECCIÓN FUTURISTAS ===
  ...futuristUiThemes,

  // === SECCIÓN MODERNOS ===
  ...modernUiThemes,

  // === SECCIÓN ANIMADOS ===
  ...animatedUiThemes,

  // === SECCIÓN NATURALEZA ===
  ...natureUiThemes
};

// Exportar las categorías para uso en el ThemeSelector
export { CLASSIC_UI_KEYS, FUTURISTIC_UI_KEYS, MODERN_UI_KEYS, ANIMATED_UI_KEYS, NATURE_UI_KEYS }; 