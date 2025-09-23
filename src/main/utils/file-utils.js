const path = require('path');
const fs = require('fs');
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

/**
 * Guarda la preferencia del método Guacd de forma persistente
 * @param {string} method - Método preferido (docker|wsl|mock)
 * @returns {Promise<boolean>} true si se guardó exitosamente
 */
async function savePreferredGuacdMethod(method) {
  const prefPath = getGuacdPrefPath();
  if (!prefPath) return false;
  try {
    const dir = path.dirname(prefPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(prefPath, JSON.stringify({ preferredMethod: method }, null, 2), 'utf8');
    return true;
  } catch { 
    return false; 
  }
}

/**
 * Carga la preferencia del método Guacd desde el archivo persistente
 * @returns {Promise<string|null>} Método preferido o null si no existe
 */
async function loadPreferredGuacdMethod() {
  const prefPath = getGuacdPrefPath();
  if (!prefPath) return null;
  try {
    if (!fs.existsSync(prefPath)) return null;
    const raw = fs.readFileSync(prefPath, 'utf8');
    const json = JSON.parse(raw || '{}');
    const m = String(json.preferredMethod || '').toLowerCase();
    return (m === 'docker' || m === 'wsl' || m === 'mock') ? m : null;
  } catch { 
    return null; 
  }
}

module.exports = {
  getGuacdPrefPath,
  savePreferredGuacdMethod,
  loadPreferredGuacdMethod
};
