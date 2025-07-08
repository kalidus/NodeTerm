import { statusBarThemes } from '../themes/status-bar-themes';

class StatusBarThemeManager {
  constructor() {
    this.currentTheme = 'Default Dark';
    this.cssVariables = null;
  }

  // Cargar tema guardado desde localStorage
  loadSavedTheme() {
    const savedTheme = localStorage.getItem('basicapp_statusbar_theme') || 'Default Dark';
    this.applyTheme(savedTheme);
  }

  // Aplicar un tema específico
  applyTheme(themeName) {
    const theme = statusBarThemes[themeName];
    if (!theme) {
      console.warn(`StatusBar theme '${themeName}' not found`);
      return;
    }

    this.currentTheme = themeName;
    this.updateCSSVariables(theme.colors);
    
    // Guardar en localStorage
    localStorage.setItem('basicapp_statusbar_theme', themeName);
  }

  // Actualizar variables CSS en el documento
  updateCSSVariables(colors) {
    const root = document.documentElement;
    
    // Definir variables CSS para la status bar
    root.style.setProperty('--statusbar-bg', colors.background);
    root.style.setProperty('--statusbar-text', colors.text);
    root.style.setProperty('--statusbar-border', colors.border);
    root.style.setProperty('--statusbar-icon-color', colors.iconColor);
    root.style.setProperty('--statusbar-cpu-color', colors.cpuBarColor);
    root.style.setProperty('--statusbar-memory-color', colors.memoryBarColor);
    root.style.setProperty('--statusbar-disk-color', colors.diskBarColor);
    root.style.setProperty('--statusbar-network-up-color', colors.networkUpColor);
    root.style.setProperty('--statusbar-network-down-color', colors.networkDownColor);
    root.style.setProperty('--statusbar-sparkline-color', colors.sparklineColor);

    this.cssVariables = colors;
  }

  // Obtener el tema actual
  getCurrentTheme() {
    return this.currentTheme;
  }

  // Obtener los colores del tema actual
  getCurrentColors() {
    return this.cssVariables;
  }

  // Obtener todos los temas disponibles
  getAvailableThemes() {
    return Object.keys(statusBarThemes);
  }
}

// Instancia singleton
export const statusBarThemeManager = new StatusBarThemeManager();
