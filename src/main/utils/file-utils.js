const path = require('path');
const { app } = require('electron');

/**
 * Utilidades para manejo de archivos y rutas
 * - Obtener rutas de preferencias
 * - Manejo seguro de archivos del sistema
 */

/**
 * Obtiene la ruta del archivo de preferencias de Guacd
 * @returns {string|null} Ruta del archivo de preferencias o null si hay error
 */
function getGuacdPrefPath() {
  try {
    return path.join(app.getPath('userData'), 'guacd-preferences.json');
  } catch {
    return null;
  }
}

module.exports = {
  getGuacdPrefPath
};
