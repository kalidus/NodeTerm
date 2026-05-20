/**
 * Carga diferida de servicios de terminal/CLI (no bloquear parse de main.js).
 */
let _WSL = null;
let _PowerShell = null;
let _Cygwin = null;
let _Claude = null;
let _OpenCode = null;
let _GeminiCli = null;
let _CodexCli = null;
let _AntigravityCli = null;

function getWSL() {
  if (!_WSL) _WSL = require('./WSLService');
  return _WSL;
}
function getPowerShell() {
  if (!_PowerShell) _PowerShell = require('./PowerShellService');
  return _PowerShell;
}
function getCygwin() {
  if (!_Cygwin) _Cygwin = require('./CygwinService');
  return _Cygwin;
}
function getClaude() {
  if (!_Claude) _Claude = require('./ClaudeService');
  return _Claude;
}
function getOpenCode() {
  if (!_OpenCode) _OpenCode = require('./OpenCodeService');
  return _OpenCode;
}
function getGeminiCli() {
  if (!_GeminiCli) _GeminiCli = require('./GeminiCliService');
  return _GeminiCli;
}
function getCodexCli() {
  if (!_CodexCli) _CodexCli = require('./CodexCliService');
  return _CodexCli;
}
function getAntigravityCli() {
  if (!_AntigravityCli) _AntigravityCli = require('./AntigravityCliService');
  return _AntigravityCli;
}

module.exports = {
  getWSL,
  getPowerShell,
  getCygwin,
  getClaude,
  getOpenCode,
  getGeminiCli,
  getCodexCli,
  getAntigravityCli
};
