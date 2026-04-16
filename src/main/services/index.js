/**
 * Índice centralizado para todos los servicios del proceso principal
 * 
 * Este archivo centraliza la exportación de todos los servicios
 * para mantener una estructura organizada y facilitar el mantenimiento.
 */

const WSLService = require('./WSLService');
const PowerShellService = require('./PowerShellService');
const CygwinService = require('./CygwinService');
const DockerService = require('./DockerService');
const ClaudeService = require('./ClaudeService');
const OpenCodeService = require('./OpenCodeService');
const GeminiCliService = require('./GeminiCliService');

/**
 * Exporta todos los servicios organizados por categoría
 */
module.exports = {
  // Servicios de terminal
  WSL: WSLService,
  PowerShell: PowerShellService,
  Cygwin: CygwinService,
  Docker: DockerService,
  Claude: ClaudeService,
  OpenCode: OpenCodeService,
  GeminiCli: GeminiCliService,
  
  // Exportaciones directas para compatibilidad
  ...WSLService,
  ...PowerShellService,
  ...CygwinService,
  ...DockerService,
  ...ClaudeService,
  ...OpenCodeService,
  ...GeminiCliService
};
