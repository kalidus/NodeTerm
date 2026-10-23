/**
 * Guardas anti-SSRF para peticiones HTTP salientes desde el proceso main.
 */

const { URL } = require('url');
const net = require('net');

const METADATA_HOSTNAMES = new Set([
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
  'instance-data'
]);

/**
 * ¿Hostname/IP es metadata de cloud o link-local?
 * @param {string} hostname
 * @returns {boolean}
 */
function isBlockedMetadataHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return true;
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();

  if (METADATA_HOSTNAMES.has(host)) return true;
  if (host === '169.254.169.254' || host === '169.254.170.2') return true;
  if (host === 'fd00:ec2::254' || host === 'fe80::a9fe:a9fe') return true;

  // Link-local IPv4 169.254.0.0/16
  if (net.isIPv4(host)) {
    const parts = host.split('.').map(Number);
    if (parts[0] === 169 && parts[1] === 254) return true;
  }

  return false;
}

/**
 * ¿IP/hostname es loopback?
 * @param {string} hostname
 * @returns {boolean}
 */
function isLoopbackHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host === 'ip6-localhost' || host === 'ip6-loopback') return true;
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
  if (net.isIPv4(host)) {
    const parts = host.split('.').map(Number);
    if (parts[0] === 127) return true;
  }
  return false;
}

/**
 * ¿IP privada RFC1918 / ULA?
 * @param {string} hostname
 * @returns {boolean}
 */
function isPrivateHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  if (isLoopbackHost(hostname)) return true;
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (net.isIPv4(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  // IPv6 ULA fc00::/7 y link-local fe80::/10
  if (net.isIPv6(host)) {
    const h = host.toLowerCase();
    if (h.startsWith('fc') || h.startsWith('fd')) return true;
    if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true;
  }
  return false;
}

/**
 * Valida una URL saliente.
 * @param {string} url
 * @param {Object} [opts]
 * @param {boolean} [opts.allowPrivate=false] - permitir RFC1918 (herramientas de red)
 * @param {boolean} [opts.allowLoopback=false] - permitir localhost
 * @param {string} [opts.allowedOrigin] - si se indica, origin de la URL debe coincidir
 * @returns {{ ok: true, parsed: URL } | { ok: false, error: string }}
 */
function assertSafeOutboundUrl(url, opts = {}) {
  const {
    allowPrivate = false,
    allowLoopback = false,
    allowedOrigin = null
  } = opts;

  if (!url || typeof url !== 'string') {
    return { ok: false, error: 'URL inválida' };
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { ok: false, error: 'Formato de URL inválido' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Solo se permiten protocolos http: y https:' };
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    return { ok: false, error: 'Hostname vacío' };
  }

  if (isBlockedMetadataHost(hostname)) {
    return { ok: false, error: 'Destino bloqueado (metadata / link-local)' };
  }

  if (!allowLoopback && isLoopbackHost(hostname)) {
    return { ok: false, error: 'Destino loopback no permitido' };
  }

  if (!allowPrivate && isPrivateHost(hostname)) {
    return { ok: false, error: 'Destino en red privada no permitido' };
  }

  if (allowedOrigin) {
    let expected;
    try {
      expected = new URL(allowedOrigin);
    } catch {
      return { ok: false, error: 'allowedOrigin inválido' };
    }
    if (parsed.origin !== expected.origin) {
      return { ok: false, error: 'La URL no coincide con el origen permitido' };
    }
  }

  return { ok: true, parsed };
}

module.exports = {
  assertSafeOutboundUrl,
  isBlockedMetadataHost,
  isLoopbackHost,
  isPrivateHost
};
