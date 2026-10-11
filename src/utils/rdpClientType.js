/**
 * Resolución y validación del cliente RDP (web-rdp / mstsc / guacamole).
 */

const VALID_RDP_CLIENT_TYPES = ['web-rdp', 'mstsc', 'guacamole'];

function isPlatformWindows() {
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32';
  }
  if (typeof window !== 'undefined' && window.electron?.platform) {
    return window.electron.platform === 'win32';
  }
  if (typeof navigator !== 'undefined' && navigator.platform) {
    return navigator.platform.toLowerCase().includes('win');
  }
  return true;
}

/**
 * Normaliza un clientType RDP.
 * @param {string} [clientType]
 * @param {{ isWindows?: boolean }} [options]
 * @returns {'web-rdp'|'mstsc'|'guacamole'}
 */
function resolveRdpClientType(clientType, options = {}) {
  const isWindows = options.isWindows !== undefined ? options.isWindows : isPlatformWindows();
  const raw = VALID_RDP_CLIENT_TYPES.includes(clientType) ? clientType : 'web-rdp';
  if (raw === 'mstsc' && !isWindows) return 'web-rdp';
  return raw;
}

module.exports = {
  VALID_RDP_CLIENT_TYPES,
  isPlatformWindows,
  resolveRdpClientType
};
