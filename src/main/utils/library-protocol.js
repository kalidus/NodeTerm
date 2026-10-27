/**
 * Handler del esquema nodeterm-library://
 *
 * URL: nodeterm-library://file/<token>, donde <token> lo emite library-access.
 * El renderer nunca pasa rutas, así que el handler solo puede servir blobs
 * dados de alta explícitamente para un nodo del árbol.
 *
 * Los blobs en claro soportan Range (seek de vídeo/audio); los cifrados se
 * sirven enteros porque AES-GCM necesita verificar el tag sobre todo el flujo.
 */

const fs = require('fs');
const { Readable } = require('stream');
const { protocol } = require('electron');
const libraryStore = require('./library-store');
const libraryAccess = require('./library-access');
const { createWebdavClient } = require('./webdav-client');

const SCHEME = 'nodeterm-library';

function errorResponse(status, message) {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}

/** @returns {{ start: number, end: number }|null} null si no hay Range válido */
function parseRange(header, size) {
  if (!header || typeof header !== 'string') return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start;
  let end;
  if (rawStart === '') {
    // Sufijo: últimos N bytes
    const suffix = parseInt(rawEnd, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(rawStart, 10);
    end = rawEnd === '' ? size - 1 : parseInt(rawEnd, 10);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

function commonHeaders(entry, size) {
  return {
    'content-type': entry.mime || 'application/octet-stream',
    'content-length': String(size),
    // Evita que un HTML/SVG servido inline se interprete como otra cosa
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store'
  };
}

async function handleRequest(request) {
  let token = '';
  try {
    const url = new URL(request.url);
    if (url.hostname !== 'file') return errorResponse(404, 'Not found');
    token = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch (_) {
    return errorResponse(400, 'Bad request');
  }

  const entry = libraryAccess.resolveToken(token);
  if (!entry) return errorResponse(403, 'Forbidden');

  // Nextcloud se lee al vuelo: el GET no se escribe en el almacén de la app.
  if (entry.descriptor?.storage === 'webdav') {
    try {
      const client = createWebdavClient(entry.descriptor);
      const body = await client.get(entry.descriptor.remotePath);
      if (!body) return errorResponse(404, 'Not found');
      return new Response(new Uint8Array(body), {
        status: 200,
        headers: commonHeaders(entry, body.length)
      });
    } catch (err) {
      const status = err?.code === 'UNAUTHORIZED' ? 401 : err?.code === 'FILE_TOO_LARGE' ? 413 : 502;
      return errorResponse(status, err?.message || 'WebDAV error');
    }
  }

  let blob;
  try {
    blob = libraryStore.resolveDescriptor(entry.descriptor);
  } catch (err) {
    return errorResponse(err?.code === 'FILE_NOT_FOUND' ? 404 : 400, err?.message || 'Error');
  }

  if (blob.encrypted && !libraryStore.hasSessionKey()) {
    return errorResponse(423, 'Library locked');
  }

  let size;
  try {
    size = libraryStore.plainSizeOf(blob);
  } catch (_) {
    return errorResponse(404, 'Not found');
  }

  try {
    if (blob.encrypted) {
      const stream = libraryStore.createPlainReadStream(blob);
      return new Response(Readable.toWeb(stream), {
        status: 200,
        headers: commonHeaders(entry, size)
      });
    }

    const range = parseRange(request.headers.get('range'), size);
    if (range) {
      const length = range.end - range.start + 1;
      const stream = fs.createReadStream(blob.path, { start: range.start, end: range.end });
      return new Response(Readable.toWeb(stream), {
        status: 206,
        headers: {
          ...commonHeaders(entry, length),
          'accept-ranges': 'bytes',
          'content-range': `bytes ${range.start}-${range.end}/${size}`
        }
      });
    }

    const stream = fs.createReadStream(blob.path);
    return new Response(Readable.toWeb(stream), {
      status: 200,
      headers: { ...commonHeaders(entry, size), 'accept-ranges': 'bytes' }
    });
  } catch (err) {
    console.error('[LibraryProtocol] Error sirviendo blob:', err?.message || err);
    return errorResponse(500, 'Read error');
  }
}

let registered = false;

function registerLibraryProtocol() {
  if (registered) return true;
  try {
    protocol.handle(SCHEME, handleRequest);
    registered = true;
    return true;
  } catch (err) {
    console.error('[LibraryProtocol] Error registrando handler:', err?.message || err);
    return false;
  }
}

module.exports = {
  SCHEME,
  registerLibraryProtocol,
  parseRange
};
