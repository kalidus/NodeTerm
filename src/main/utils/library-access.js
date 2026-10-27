/**
 * Registro de accesos temporales para el protocolo nodeterm-library://.
 *
 * El renderer nunca construye rutas: pide un token para un nodo concreto y
 * recibe una URL opaca. Así el handler de protocolo solo puede servir blobs
 * dados de alta explícitamente, aunque el renderer esté comprometido.
 */

const crypto = require('crypto');

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_TOKENS = 500;

/** token → { descriptor, mime, label, expiresAt } */
const tokens = new Map();

function prune() {
  const now = Date.now();
  for (const [token, entry] of tokens) {
    if (entry.expiresAt <= now) tokens.delete(token);
  }
  if (tokens.size > MAX_TOKENS) {
    const sorted = [...tokens.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    for (let i = 0; i < sorted.length - MAX_TOKENS; i += 1) {
      tokens.delete(sorted[i][0]);
    }
  }
}

/**
 * @param {{ storage: 'managed'|'linked'|'webdav', relPath?: string, absPath?: string,
 *           remotePath?: string, baseUrl?: string, username?: string, password?: string,
 *           ignoreSSLErrors?: boolean }} descriptor
 * @param {{ mime?: string, label?: string, ttlMs?: number }} [meta]
 * @returns {{ token: string, url: string, expiresAt: number }}
 */
function issueToken(descriptor, meta = {}) {
  prune();
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + (meta.ttlMs || TOKEN_TTL_MS);
  const storage = descriptor?.storage === 'linked'
    ? 'linked'
    : descriptor?.storage === 'webdav'
      ? 'webdav'
      : 'managed';
  // La cuenta WebDAV vive solo en este mapa, en memoria. Nunca vuelve al árbol.
  const stored = storage === 'webdav'
    ? {
        storage,
        remotePath: descriptor.remotePath || '',
        baseUrl: descriptor.baseUrl || '',
        username: descriptor.username || '',
        password: descriptor.password || '',
        ignoreSSLErrors: !!descriptor.ignoreSSLErrors
      }
    : {
        storage,
        relPath: descriptor?.relPath || null,
        absPath: descriptor?.absPath || null
      };
  tokens.set(token, {
    descriptor: stored,
    mime: meta.mime || '',
    label: meta.label || '',
    expiresAt
  });
  return { token, url: `nodeterm-library://file/${token}`, expiresAt };
}

/** @returns {{ descriptor: object, mime: string, label: string }|null} */
function resolveToken(token) {
  if (!token || typeof token !== 'string') return null;
  const entry = tokens.get(token);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    tokens.delete(token);
    return null;
  }
  return entry;
}

function revokeToken(token) {
  return tokens.delete(token);
}

/** Se llama al bloquear el vault: invalida cualquier URL ya entregada al renderer. */
function revokeAll() {
  tokens.clear();
}

module.exports = {
  issueToken,
  resolveToken,
  revokeToken,
  revokeAll
};
