/**
 * Sistema de carga de fuentes web para NodeTerm
 * Permite cargar fuentes desde Google Fonts y otras fuentes web
 */

class FontLoader {
  constructor() {
    this.loadedFonts = new Set();
    this.googleFontsApiKey = 'AIzaSyBxJ4xJ4xJ4xJ4xJ4xJ4xJ4xJ4xJ4xJ4xJ4'; // Placeholder
    this.googleFontsBaseUrl = 'https://fonts.googleapis.com/css2';
  }

  /**
   * Carga una fuente desde Google Fonts
   * @param {string} fontFamily - Nombre de la fuente
   * @param {Array} weights - Pesos de la fuente (ej: [300, 400, 500, 700])
   * @param {Array} styles - Estilos de la fuente (ej: ['normal', 'italic'])
   * @param {string} display - Modo de visualización ('swap', 'block', 'fallback')
   * @returns {Promise<boolean>} - True si se cargó correctamente
   */
  async loadGoogleFont(fontFamily, weights = [400], styles = ['normal'], display = 'swap') {
    try {
      const fontKey = `${fontFamily}-${weights.join(',')}-${styles.join(',')}`;
      
      if (this.loadedFonts.has(fontKey)) {
        return true;
      }

      const weightsParam = weights.join(';');
      const stylesParam = styles.join(';');
      const url = `${this.googleFontsBaseUrl}?family=${encodeURIComponent(fontFamily)}:wght@${weightsParam}&display=${display}`;
      
      // Crear link element
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.media = 'print';
      link.onload = () => {
        link.media = 'all';
        this.loadedFonts.add(fontKey);
        console.log(`[FontLoader] Fuente Google Fonts cargada: ${fontFamily}`);
      };
      
      // Agregar al head
      document.head.appendChild(link);
      
      // Esperar a que se cargue
      return new Promise((resolve) => {
        link.onload = () => {
          link.media = 'all';
          this.loadedFonts.add(fontKey);
          console.log(`[FontLoader] Fuente Google Fonts cargada: ${fontFamily}`);
          resolve(true);
        };
        link.onerror = () => {
          console.warn(`[FontLoader] Error cargando fuente Google Fonts: ${fontFamily}`);
          resolve(false);
        };
      });
    } catch (error) {
      console.error(`[FontLoader] Error cargando fuente ${fontFamily}:`, error);
      return false;
    }
  }

  /**
   * Carga múltiples fuentes desde Google Fonts
   * @param {Array} fonts - Array de objetos con configuración de fuentes
   * @returns {Promise<Array>} - Array de resultados de carga
   */
  async loadMultipleGoogleFonts(fonts) {
    const promises = fonts.map(font => {
      const { family, weights = [400], styles = ['normal'], display = 'swap' } = font;
      return this.loadGoogleFont(family, weights, styles, display);
    });
    
    return Promise.all(promises);
  }

  /**
   * Carga una fuente desde una URL personalizada
   * @param {string} fontFamily - Nombre de la fuente
   * @param {string} url - URL de la fuente CSS
   * @returns {Promise<boolean>} - True si se cargó correctamente
   */
  async loadCustomFont(fontFamily, url) {
    try {
      if (this.loadedFonts.has(fontFamily)) {
        return true;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.media = 'print';
      
      document.head.appendChild(link);
      
      return new Promise((resolve) => {
        link.onload = () => {
          link.media = 'all';
          this.loadedFonts.add(fontFamily);
          console.log(`[FontLoader] Fuente personalizada cargada: ${fontFamily}`);
          resolve(true);
        };
        link.onerror = () => {
          console.warn(`[FontLoader] Error cargando fuente personalizada: ${fontFamily}`);
          resolve(false);
        };
      });
    } catch (error) {
      console.error(`[FontLoader] Error cargando fuente personalizada ${fontFamily}:`, error);
      return false;
    }
  }

  /**
   * Verifica si una fuente está disponible en el sistema
   * @param {string} fontFamily - Nombre de la fuente
   * @returns {boolean} - True si la fuente está disponible
   */
  isFontAvailable(fontFamily) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Fuente de referencia
    context.font = '12px monospace';
    const referenceWidth = context.measureText('abcdefghijklmnopqrstuvwxyz0123456789').width;
    
    // Fuente a probar
    context.font = `12px "${fontFamily}", monospace`;
    const testWidth = context.measureText('abcdefghijklmnopqrstuvwxyz0123456789').width;
    
    return referenceWidth !== testWidth;
  }

  /**
   * Precarga las fuentes más comunes para mejorar la experiencia
   */
  async preloadCommonFonts() {
    const commonFonts = [
      { family: 'Inter', weights: [300, 400, 500, 600, 700] },
      { family: 'Roboto', weights: [300, 400, 500, 700] },
      { family: 'Open Sans', weights: [300, 400, 600, 700] },
      { family: 'Lato', weights: [300, 400, 700] },
      { family: 'Montserrat', weights: [300, 400, 500, 600, 700] },
      { family: 'Source Sans Pro', weights: [300, 400, 600, 700] },
      { family: 'Poppins', weights: [300, 400, 500, 600, 700] },
      { family: 'Nunito', weights: [300, 400, 600, 700] },
      { family: 'Work Sans', weights: [300, 400, 500, 600] },
      { family: 'DM Sans', weights: [300, 400, 500, 700] },
      { family: 'Ubuntu', weights: [300, 400, 500, 700] },
      { family: 'JetBrains Mono', weights: [300, 400, 500, 700] },
      { family: 'Fira Code', weights: [300, 400, 500, 700] },
      { family: 'Cascadia Code', weights: [400, 600] }
    ];

    console.log('[FontLoader] Precargando fuentes comunes...');
    const results = await this.loadMultipleGoogleFonts(commonFonts);
    const loadedCount = results.filter(result => result).length;
    console.log(`[FontLoader] ${loadedCount}/${commonFonts.length} fuentes precargadas`);
  }

  /**
   * Obtiene información sobre las fuentes cargadas
   * @returns {Object} - Información sobre las fuentes cargadas
   */
  getLoadedFontsInfo() {
    return {
      loadedFonts: Array.from(this.loadedFonts),
      count: this.loadedFonts.size,
      timestamp: new Date().toISOString()
    };
  }
}

// Crear instancia singleton
export const fontLoader = new FontLoader();

// Auto-precargar fuentes comunes al importar
if (typeof window !== 'undefined') {
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fontLoader.preloadCommonFonts();
    });
  } else {
    fontLoader.preloadCommonFonts();
  }
}

export default FontLoader;
