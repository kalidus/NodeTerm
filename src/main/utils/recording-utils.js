// ============================================
// UTILIDADES PARA GRABACIÓN DE SESIONES
// Helper functions para gestionar directorios de grabación
// ============================================

const path = require('path');
const fs = require('fs').promises;

/**
 * Obtiene el directorio donde se guardan las grabaciones
 * Lee la configuración personalizada si existe, sino usa la ruta por defecto
 * @param {string} userDataPath - Ruta de userData de Electron
 * @returns {Promise<string>} Ruta al directorio de grabaciones
 */
async function getRecordingsDirectory(userDataPath) {
  try {
    const configPath = path.join(userDataPath, 'recording-config.json');
    
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      if (config.customPath && config.customPath.trim()) {
        try {
          await fs.access(config.customPath);
          return config.customPath;
        } catch {
          console.warn(`⚠️ Ruta personalizada de grabaciones no existe: ${config.customPath}, usando ruta por defecto`);
        }
      }
    } catch {
      // Config no existe, usar ruta por defecto
    }
    
    const defaultPath = path.join(userDataPath, 'recordings');
    return defaultPath;
  } catch (error) {
    console.error('Error obteniendo directorio de grabaciones:', error);
    return path.join(userDataPath, 'recordings');
  }
}

/**
 * Asegura que el directorio de grabaciones existe
 * @param {string} recordingsDir - Ruta al directorio de grabaciones
 */
async function ensureRecordingsDirectory(recordingsDir) {
  try {
    await fs.mkdir(recordingsDir, { recursive: true });
    return true;
  } catch (error) {
    console.error('Error creando directorio de grabaciones:', error);
    return false;
  }
}

/**
 * Obtiene la lista de archivos de grabación
 * @param {string} recordingsDir - Ruta al directorio de grabaciones
 * @returns {Promise<Array>} Lista de archivos .cast
 */
async function getRecordingFiles(recordingsDir) {
  try {
    const files = await fs.readdir(recordingsDir);
    return files.filter(file => file.endsWith('.cast'));
  } catch (error) {
    console.error('Error listando grabaciones:', error);
    return [];
  }
}

module.exports = {
  getRecordingsDirectory,
  ensureRecordingsDirectory,
  getRecordingFiles
};
