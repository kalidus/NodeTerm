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

/**
 * Guarda el timeout de inactividad de guacd de forma persistente
 * @param {number} timeoutMs - Timeout en milisegundos (0 = desactivado)
 * @returns {Promise<boolean>} true si se guardó exitosamente
 */
async function saveGuacdInactivityTimeout(timeoutMs) {
  const prefPath = getGuacdPrefPath();
  if (!prefPath) return false;
  try {
    const dir = path.dirname(prefPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // Leer preferencias existentes para no sobrescribirlas
    let existingPrefs = {};
    try {
      if (fs.existsSync(prefPath)) {
        existingPrefs = JSON.parse(fs.readFileSync(prefPath, 'utf8') || '{}');
      }
    } catch {}
    
    // Actualizar solo el timeout
    existingPrefs.inactivityTimeoutMs = timeoutMs;
    fs.writeFileSync(prefPath, JSON.stringify(existingPrefs, null, 2), 'utf8');
    return true;
  } catch { 
    return false; 
  }
}

/**
 * Carga el timeout de inactividad de guacd desde el archivo persistente
 * @returns {Promise<number|null>} Timeout en ms o null si no existe
 */
async function loadGuacdInactivityTimeout() {
  const prefPath = getGuacdPrefPath();
  if (!prefPath) return null;
  try {
    if (!fs.existsSync(prefPath)) return null;
    const raw = fs.readFileSync(prefPath, 'utf8');
    const json = JSON.parse(raw || '{}');
    const timeout = json.inactivityTimeoutMs;
    if (typeof timeout === 'number' && timeout >= 0) {
      return timeout;
    }
    return null;
  } catch { 
    return null; 
  }
}

module.exports = {
  getGuacdPrefPath,
  savePreferredGuacdMethod,
  loadPreferredGuacdMethod,
  saveGuacdInactivityTimeout,
  loadGuacdInactivityTimeout
};
