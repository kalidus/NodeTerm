const fs = require('fs');
const crypto = require('crypto');

/**
 * Utilidades para operaciones de archivos
 */

/**
 * Versión segura de fs.statSync que no lanza excepciones
 * @param {string} path - Ruta del archivo
 * @returns {Object|null} Stats del archivo o null si hay error
 */
function safeStatSync(path) { 
  try { 
    return fs.statSync(path); 
  } catch { 
    return null; 
  } 
}

/**
 * Calcula el hash SHA256 de un archivo
 * @param {string} path - Ruta del archivo
 * @returns {string|null} Hash SHA256 del archivo o null si hay error
 */
function hashFileSync(path) {
  try {
    const data = fs.readFileSync(path);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch {
    return null;
  }
}

module.exports = {
  safeStatSync,
  hashFileSync
};
