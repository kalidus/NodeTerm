/**
 * Politica CredSSP / NLA para RDP Web (IronRDP).
 * Independiente del hostname. Con security=any usa selectedProtocol del preflight X.224.
 */

export const PROTOCOL_SSL = 0x00000001;
export const PROTOCOL_HYBRID = 0x00000002;
export const PROTOCOL_HYBRID_EX = 0x00000008;

/**
 * @param {string} security - any|nla|tls|rdp
 * @param {number|null|undefined} selectedProtocol - resultado preflight X.224 (opcional)
 */
export function resolveCredsspPolicy(security, selectedProtocol) {
  const sec = String(security || 'any').toLowerCase();
  if (sec === 'tls' || sec === 'rdp') return false;
  if (sec === 'nla') return true;

  // any / automatico: seguir lo que nego el servidor si lo conocemos
  if (selectedProtocol === PROTOCOL_SSL) return false;
  if (
    selectedProtocol === PROTOCOL_HYBRID ||
    selectedProtocol === PROTOCOL_HYBRID_EX ||
    (typeof selectedProtocol === 'number' && (selectedProtocol & (PROTOCOL_HYBRID | PROTOCOL_HYBRID_EX)))
  ) {
    return true;
  }

  // Sin preflight: anunciar CredSSP+TLS (WASM enable_tls siempre on)
  return true;
}
