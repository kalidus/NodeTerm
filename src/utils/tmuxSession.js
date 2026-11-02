/**
 * Sesión SSH persistente vía tmux (new -A / reattach).
 * Usado por main (SSHAuthService) y por UI para previsualizar el nombre.
 */

function sanitizeTmuxSessionName(name) {
  const cleaned = String(name || '')
    .replace(/[^A-Za-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned || 'nodeterm';
}

function buildDefaultTmuxSessionName(config = {}) {
  const user = config.username || config.user || 'user';
  const host = config.host || config.hostname || 'host';
  return sanitizeTmuxSessionName(`nodeterm-${user}-${host}`);
}

function resolveTmuxSessionName(config = {}) {
  if (config.tmuxSessionName && String(config.tmuxSessionName).trim()) {
    return sanitizeTmuxSessionName(config.tmuxSessionName);
  }
  return buildDefaultTmuxSessionName(config);
}

function buildTmuxAttachCommand(sessionName) {
  const name = sanitizeTmuxSessionName(sessionName);
  return `tmux new-session -A -s ${name}`;
}

function shouldUseTmuxPersist(config) {
  if (!config || !config.persistSession) return false;
  // Bastiones PAM suelen restringir el comando remoto / PATH.
  if (config.useBastionWallix || config.isBastion) return false;
  return true;
}

module.exports = {
  sanitizeTmuxSessionName,
  buildDefaultTmuxSessionName,
  resolveTmuxSessionName,
  buildTmuxAttachCommand,
  shouldUseTmuxPersist
};
