/**
 * Índice centralizado para todos los servicios del proceso principal
 * 
 * Este archivo centraliza la exportación de todos los servicios
 * para mantener una estructura organizada y facilitar el mantenimiento.
 */

const WSLService = require('./WSLService');
const PowerShellService = require('./PowerShellService');
const CygwinService = require('./CygwinService');

/**
 * Exporta todos los servicios organizados por categoría
 */
module.exports = {
  // Servicios de terminal
  WSL: WSLService,
  PowerShell: PowerShellService,
  Cygwin: CygwinService,
  
  // Exportaciones directas para compatibilidad
  ...WSLService,
  ...PowerShellService,
  ...CygwinService
};
