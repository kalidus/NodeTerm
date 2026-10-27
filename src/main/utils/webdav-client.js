/**
 * Cliente WebDAV binario para la biblioteca.
 *
 * El canal nextcloud:http-request existente acumula la respuesta en una cadena,
 * lo que corrompe cualquier contenido que no sea texto. Aquí se trabaja siempre
 * con Buffer y se reutiliza la misma guarda SSRF: solo se permite el origen de
 * la instancia configurada, incluidas las self-hosted en LAN o loopback.
 */

const https = require('https');
const { assertSafeOutboundUrl, isLoopbackHost, isPrivateHost } = require('./ssrf-guard');
const { mimeForName } = require('../../shared/library-mime');

const MAX_RESPONSE_BYTES = 256 * 1024 * 1024;

/**
 * En Electron, rejectUnauthorized en la petición no basta: el agente global
 * sigue verificando el certificado. Este agente solo se usa si la cuenta
 * tiene activado Ignorar SSL.
 */
let insecureAgent = null;
function getInsecureAgent() {
  if (!insecureAgent) {
    insecureAgent = new https.Agent({
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    });
  }
  return insecureAgent;
}

function authHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password || ''}`).toString('base64')}`;
}

/** Raíz DAV de los archivos de un usuario. */
function davRoot(username) {
  return `/remote.php/dav/files/${encodeURIComponent(username)}`;
}

/** Construye la URL absoluta de una ruta relativa al espacio del usuario. */
function davUrl(baseUrl, username, relativePath) {
  const clean = String(relativePath || '').replace(/^\/+|\/+$/g, '');
  const encoded = clean ? `/${clean.split('/').map(encodeURIComponent).join('/')}` : '';
  return `${String(baseUrl).replace(/\/+$/, '')}${davRoot(username)}${encoded}`;
}

function webdavRequest({ baseUrl, url, method, headers, body, ignoreSSLErrors }) {
  const { URL } = require('url');

  let origin;
  let host;
  try {
    const parsedBase = new URL(String(baseUrl || '').trim());
    origin = parsedBase.origin;
    host = parsedBase.hostname;
  } catch (_) {
    return Promise.reject(Object.assign(new Error('baseUrl inválido'), { code: 'INVALID_BASE_URL' }));
  }

  const allowLoopback = isLoopbackHost(host);
  const allowPrivate = isPrivateHost(host) || allowLoopback;
  const safe = assertSafeOutboundUrl(url, { allowedOrigin: origin, allowPrivate, allowLoopback });
  if (!safe.ok) {
    return Promise.reject(Object.assign(new Error(safe.error), { code: 'UNSAFE_URL' }));
  }

  const target = safe.parsed;
  const isHttps = target.protocol === 'https:';
  const client = isHttps ? https : require('http');
  const relaxTls = Boolean(ignoreSSLErrors) && isHttps;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: target.pathname + target.search,
        method: method || 'GET',
        headers: headers || {},
        servername: target.hostname,
        ...(relaxTls && { agent: getInsecureAgent() })
      },
      (res) => {
        const chunks = [];
        let total = 0;
        res.on('data', (chunk) => {
          total += chunk.length;
          if (total > MAX_RESPONSE_BYTES) {
            req.destroy();
            reject(Object.assign(new Error('FILE_TOO_LARGE'), { code: 'FILE_TOO_LARGE' }));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        }));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/** Parseo del multistatus de un PROPFIND de profundidad 1. */
function parsePropfind(xml, requestPath) {
  const entries = [];
  const responseBlocks = String(xml).match(/<(?:[a-z0-9]+:)?response[\s>][\s\S]*?<\/(?:[a-z0-9]+:)?response>/gi) || [];
  const pick = (block, tag) => {
    const match = new RegExp(`<(?:[a-z0-9]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[a-z0-9]+:)?${tag}>`, 'i').exec(block);
    return match ? match[1].trim() : '';
  };

  const normalizedRequest = decodeURIComponent(requestPath).replace(/\/+$/, '');

  for (const block of responseBlocks) {
    const href = pick(block, 'href');
    if (!href) continue;
    let decodedHref;
    try {
      decodedHref = decodeURIComponent(href);
    } catch (_) {
      decodedHref = href;
    }
    // La primera entrada es la propia carpeta. En un Nextcloud instalado en
    // subdirectorio el href lleva ese prefijo y la ruta pedida no.
    const normalizedHref = decodedHref.replace(/\/+$/, '');
    if (
      normalizedHref === normalizedRequest
      || (normalizedRequest && normalizedHref.endsWith(normalizedRequest))
    ) continue;

    const isDirectory = /<(?:[a-z0-9]+:)?collection\s*\/?>/i.test(block);
    const name = decodedHref.replace(/\/+$/, '').split('/').pop();
    if (!name) continue;

    entries.push({
      name,
      href,
      path: decodedHref,
      isDirectory,
      size: Number(pick(block, 'getcontentlength')) || 0,
      mime: pick(block, 'getcontenttype') || (isDirectory ? null : mimeForName(name)),
      modified: pick(block, 'getlastmodified') || ''
    });
  }

  entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, 'es');
  });
  return entries;
}

const PROPFIND_BODY = '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop>'
  + '<d:resourcetype/><d:getcontentlength/><d:getcontenttype/><d:getlastmodified/>'
  + '</d:prop></d:propfind>';

/**
 * Cliente con la cuenta ya fijada, para no repetir credenciales en cada llamada.
 * @param {{ baseUrl: string, username: string, password: string, ignoreSSLErrors?: boolean }} account
 */
function createWebdavClient(account) {
  const { baseUrl, username, password, ignoreSSLErrors } = account || {};
  if (!baseUrl || !username) {
    throw Object.assign(new Error('Nextcloud no está configurado'), { code: 'NOT_CONFIGURED' });
  }

  const call = (method, relativePath, { headers, body, trailingSlash } = {}) => webdavRequest({
    baseUrl,
    url: davUrl(baseUrl, username, relativePath) + (trailingSlash ? '/' : ''),
    method,
    ignoreSSLErrors,
    headers: { Authorization: authHeader(username, password), ...(headers || {}) },
    body
  });

  return {
    call,
    /** Crea la colección si no existe; 405 significa que ya estaba. */
    async ensureDir(relativePath) {
      const res = await call('MKCOL', relativePath, { trailingSlash: true });
      if (res.status === 405 || (res.status >= 200 && res.status < 300)) return true;
      if (res.status === 409) {
        // Falta algún nivel intermedio: crearlos de arriba abajo
        const parts = String(relativePath).split('/').filter(Boolean);
        let acc = '';
        for (const part of parts) {
          acc = acc ? `${acc}/${part}` : part;
          const step = await call('MKCOL', acc, { trailingSlash: true });
          if (step.status !== 405 && (step.status < 200 || step.status >= 300)) {
            throw Object.assign(new Error(`MKCOL ${acc} HTTP ${step.status}`), { code: 'HTTP_ERROR' });
          }
        }
        return true;
      }
      throw Object.assign(new Error(`MKCOL HTTP ${res.status}`), { code: 'HTTP_ERROR' });
    },
    /** @returns {Promise<Buffer|null>} null si no existe */
    async get(relativePath) {
      const res = await call('GET', relativePath);
      if (res.status === 404) return null;
      if (res.status >= 400) {
        throw Object.assign(new Error(`GET HTTP ${res.status}`), { code: 'HTTP_ERROR', status: res.status });
      }
      return res.body;
    },
    async put(relativePath, buffer, mime) {
      const res = await call('PUT', relativePath, {
        headers: {
          'Content-Type': mime || 'application/octet-stream',
          'Content-Length': String(buffer.length)
        },
        body: buffer
      });
      if (res.status >= 400) {
        throw Object.assign(new Error(`PUT HTTP ${res.status}`), { code: 'HTTP_ERROR', status: res.status });
      }
      return true;
    },
    async remove(relativePath) {
      const res = await call('DELETE', relativePath);
      return res.status === 404 || (res.status >= 200 && res.status < 300);
    },
    async list(relativePath) {
      const res = await call('PROPFIND', relativePath, {
        trailingSlash: true,
        headers: { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
        body: PROPFIND_BODY
      });
      if (res.status === 401 || res.status === 403) {
        throw Object.assign(new Error('Credenciales de Nextcloud rechazadas'), { code: 'UNAUTHORIZED' });
      }
      if (res.status === 404) {
        throw Object.assign(new Error('La carpeta no existe en Nextcloud'), { code: 'NOT_FOUND' });
      }
      if (res.status >= 400) {
        throw Object.assign(new Error(`PROPFIND HTTP ${res.status}`), { code: 'HTTP_ERROR' });
      }
      const clean = String(relativePath || '').replace(/^\/+|\/+$/g, '');
      const encoded = clean ? `/${clean.split('/').map(encodeURIComponent).join('/')}` : '';
      return parsePropfind(res.body.toString('utf8'), `${davRoot(username)}${encoded}`);
    }
  };
}

module.exports = {
  MAX_RESPONSE_BYTES,
  authHeader,
  davRoot,
  davUrl,
  webdavRequest,
  parsePropfind,
  createWebdavClient
};
