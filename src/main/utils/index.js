/**
 * Índice centralizado para todas las utilidades del proceso principal
 * 
 * Este archivo centraliza la exportación de todas las utilidades
 * para mantener una estructura organizada y facilitar el mantenimiento.
 */

const { parseDfOutput, parseNetDev } = require('./parsing-utils');
const { getGuacdPrefPath } = require('./file-utils');
const { sendToRenderer, cleanupOrphanedConnections } = require('./connection-utils');

/**
 * Exporta todas las utilidades organizadas por categoría
 */
module.exports = {
  // Utilidades de parsing
  parsing: {
    parseDfOutput,
    parseNetDev
  },
  
  // Utilidades de archivos
  file: {
    getGuacdPrefPath
  },
  
  // Utilidades de conexión
  connection: {
    sendToRenderer,
    cleanupOrphanedConnections
  },
  
  // Exportaciones directas para compatibilidad
  parseDfOutput,
  parseNetDev,
  getGuacdPrefPath,
  sendToRenderer,
  cleanupOrphanedConnections
};
