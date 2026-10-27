/**
 * Manejadores IPC de la Biblioteca personal.
 *
 * Toda ruta que llega del renderer se resuelve y valida en library-store; las
 * URLs que consume el visor se emiten como tokens opacos (library-access).
 */

const { ipcMain, dialog, shell, clipboard, net, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const libraryStore = require('../utils/library-store');
const libraryAccess = require('../utils/library-access');
const { assertTrustedIpcSender } = require('../utils/ipc-trust');
const { assertSafeOutboundUrl } = require('../utils/ssrf-guard');
const { webdavRequest, parsePropfind, davRoot, davUrl, createWebdavClient } = require('../utils/webdav-client');
const { syncLibrary } = require('../utils/library-sync');
const { listFiles } = require('./local-fs-handlers');
const { mimeForName, sanitizeFileName, extensionOf, EXT_MIME } = require('../../shared/library-mime');

/** Tope de descarga desde URL (más bajo que el de importación local). */
const MAX_DOWNLOAD_BYTES = 256 * 1024 * 1024;

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

function toError(err) {
  const code = err?.code || 'UNKNOWN';
  return { success: false, error: err?.message || String(err), code };
}

/** Envuelve un handler con comprobación de origen IPC y normalización de errores. */
function guarded(handler) {
  return async (event, payload) => {
    const trust = assertTrustedIpcSender(event);
    if (!trust.ok) {
      return { success: false, error: `IPC no autorizado: ${trust.error}`, code: 'UNTRUSTED' };
    }
    try {
      return await handler(payload || {}, event);
    } catch (err) {
      return toError(err);
    }
  };
}

function toNodeBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data && typeof data === 'object' && typeof data.base64 === 'string') {
    return Buffer.from(data.base64, 'base64');
  }
  if (typeof data === 'string') return Buffer.from(data, 'utf8');
  return Buffer.from(data || []);
}

function windowFrom(event) {
  return BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || null;
}

/** Descarga una URL a memoria respetando el tope de tamaño. */
function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    const request = net.request({ method: 'GET', url, redirect: 'follow' });
    const chunks = [];
    let total = 0;
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      try {
        request.abort();
      } catch (_) {
        /* noop */
      }
      reject(err);
    };

    request.on('redirect', (_status, _method, redirectUrl) => {
      const check = assertSafeOutboundUrl(redirectUrl);
      if (!check.ok) {
        fail(Object.assign(new Error(check.error), { code: 'UNSAFE_REDIRECT' }));
        return;
      }
      request.followRedirect();
    });

    request.on('response', (response) => {
      if (response.statusCode >= 400) {
        fail(Object.assign(new Error(`HTTP ${response.statusCode}`), { code: 'HTTP_ERROR' }));
        return;
      }
      const declared = Number(response.headers['content-length']);
      if (Number.isFinite(declared) && declared > MAX_DOWNLOAD_BYTES) {
        fail(Object.assign(new Error('FILE_TOO_LARGE'), { code: 'FILE_TOO_LARGE' }));
        return;
      }

      response.on('data', (chunk) => {
        total += chunk.length;
        if (total > MAX_DOWNLOAD_BYTES) {
          fail(Object.assign(new Error('FILE_TOO_LARGE'), { code: 'FILE_TOO_LARGE' }));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        if (settled) return;
        settled = true;
        const contentType = String(response.headers['content-type'] || '').split(';')[0].trim();
        const disposition = String(response.headers['content-disposition'] || '');
        resolve({ buffer: Buffer.concat(chunks), contentType, disposition });
      });
      response.on('error', fail);
    });

    request.on('error', fail);
    request.end();
  });
}

/** Nombre de archivo a partir de Content-Disposition o del path de la URL. */
function fileNameFromDownload(url, disposition, contentType) {
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition || '');
  const plain = /filename="?([^";]+)"?/i.exec(disposition || '');
  let name = '';
  if (star) {
    try {
      name = decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch (_) {
      name = star[1];
    }
  } else if (plain) {
    name = plain[1];
  }

  if (!name) {
    try {
      const parsed = new URL(url);
      name = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
      if (!name) name = parsed.hostname;
    } catch (_) {
      name = 'descarga';
    }
  }

  name = sanitizeFileName(name, 'descarga');
  if (!extensionOf(name)) {
    const guessed = Object.entries(EXT_MIME).find(([, mime]) => mime === contentType);
    if (guessed) name = `${name}.${guessed[0]}`;
  }
  return name;
}

function registerLibraryHandlers() {
  // --- Estado del almacén -------------------------------------------------

  safeHandle('library:unlock', guarded(async ({ masterKey }) => {
    libraryStore.unlock(masterKey);
    return { success: true };
  }));

  safeHandle('library:lock', guarded(async () => {
    libraryStore.lock();
    libraryAccess.revokeAll();
    return { success: true };
  }));

  safeHandle('library:get-status', guarded(async () => ({
    success: true,
    unlocked: libraryStore.hasSessionKey(),
    root: libraryStore.getLibraryDir(),
    maxImportBytes: libraryStore.MAX_IMPORT_BYTES,
    maxTextBytes: libraryStore.MAX_TEXT_BYTES
  })));

  safeHandle('library:get-usage', guarded(async () => libraryStore.getUsage()));

  // --- Acceso para el visor ----------------------------------------------

  safeHandle('library:create-access', guarded(async ({ storage, relPath, absPath, remotePath, baseUrl, username, password, ignoreSSLErrors, mime, label }) => {
    if (storage === 'webdav') {
      if (!remotePath || !baseUrl || !username) {
        return { success: false, error: 'Faltan datos de la cuenta de Nextcloud', code: 'NOT_CONFIGURED' };
      }
      const issued = libraryAccess.issueToken(
        { storage: 'webdav', remotePath, baseUrl, username, password, ignoreSSLErrors },
        { mime: mime || mimeForName(label || remotePath), label }
      );
      return { success: true, ...issued, encrypted: false };
    }

    // Valida que el blob exista y sea legible antes de emitir el token
    const blob = libraryStore.resolveDescriptor({ storage, relPath, absPath });
    if (blob.encrypted && !libraryStore.hasSessionKey()) {
      return { success: false, error: 'Biblioteca bloqueada', code: 'LIBRARY_LOCKED' };
    }
    const issued = libraryAccess.issueToken(
      { storage, relPath, absPath },
      { mime: mime || mimeForName(label || relPath || absPath), label }
    );
    return { success: true, ...issued, encrypted: blob.encrypted };
  }));

  safeHandle('library:revoke-access', guarded(async ({ token }) => ({
    success: libraryAccess.revokeToken(token)
  })));

  // --- Lectura / metadatos ------------------------------------------------

  safeHandle('library:read-file', guarded(async (payload) => {
    if (payload?.storage === 'webdav') {
      const { remotePath, baseUrl, username, password, ignoreSSLErrors, encoding } = payload;
      if (!remotePath || !baseUrl || !username) {
        return { success: false, error: 'Faltan datos de la cuenta de Nextcloud', code: 'NOT_CONFIGURED' };
      }
      const client = createWebdavClient({ baseUrl, username, password, ignoreSSLErrors });
      const buffer = await client.get(remotePath);
      if (!buffer) return { success: false, error: 'El archivo ya no está en Nextcloud', code: 'FILE_NOT_FOUND' };
      const asText = encoding === 'utf8';
      const limit = asText ? libraryStore.MAX_TEXT_BYTES : libraryStore.MAX_IMPORT_BYTES;
      if (buffer.length > limit) {
        return { success: false, error: 'FILE_TOO_LARGE', code: 'FILE_TOO_LARGE' };
      }
      if (asText) {
        return { success: true, encoding: 'utf8', size: buffer.length, content: buffer.toString('utf8') };
      }
      return { success: true, encoding: 'binary', size: buffer.length, content: new Uint8Array(buffer) };
    }
    return libraryStore.readFileContent(
      { storage: payload?.storage, relPath: payload?.relPath, absPath: payload?.absPath },
      { encoding: payload?.encoding }
    );
  }));

  safeHandle('library:stat', guarded(async ({ storage, relPath, absPath }) =>
    libraryStore.statFile({ storage, relPath, absPath })
  ));

  /** Distingue archivo y carpeta al soltar algo desde el explorador de Windows. */
  safeHandle('library:classify-path', guarded(async ({ absPath }) => {
    if (!absPath || typeof absPath !== 'string' || absPath.includes('\0')) {
      return { success: false, error: 'Ruta no válida', code: 'BAD_REQUEST' };
    }
    const abs = path.resolve(absPath);
    let stats;
    try {
      stats = fs.statSync(abs);
    } catch (_) {
      return { success: false, error: 'No existe', code: 'FILE_NOT_FOUND' };
    }
    return {
      success: true,
      path: abs,
      name: path.basename(abs),
      isDirectory: stats.isDirectory(),
      size: stats.isDirectory() ? 0 : stats.size
    };
  }));

  // --- Importación --------------------------------------------------------

  safeHandle('library:pick-files', guarded(async ({ multiple = true, filters } = {}, event) => {
    const win = windowFrom(event);
    const properties = ['openFile', 'dontAddToRecent'];
    if (multiple) properties.push('multiSelections');
    const result = win
      ? await dialog.showOpenDialog(win, { properties, filters })
      : await dialog.showOpenDialog({ properties, filters });
    if (result.canceled) return { success: true, canceled: true, paths: [] };
    return { success: true, canceled: false, paths: result.filePaths };
  }));

  safeHandle('library:pick-folder', guarded(async (_payload, event) => {
    const win = windowFrom(event);
    const options = { properties: ['openDirectory', 'dontAddToRecent'] };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths.length) {
      return { success: true, canceled: true, path: null };
    }
    return { success: true, canceled: false, path: result.filePaths[0] };
  }));

  safeHandle('library:import-path', guarded(async ({ folderKey, sourcePath, encrypt, origin }) => {
    const file = await libraryStore.importFromPath({ folderKey, sourcePath, encrypt, origin });
    return { success: true, file };
  }));

  safeHandle('library:import-buffer', guarded(async ({ folderKey, fileName, data, mime, encrypt, origin }) => {
    const file = await libraryStore.importFromBuffer({
      folderKey,
      fileName,
      data: toNodeBuffer(data),
      mime,
      encrypt,
      origin
    });
    return { success: true, file };
  }));

  /** Lista recursivamente los archivos de una carpeta local, para importarla entera. */
  safeHandle('library:scan-folder', guarded(async ({ sourcePath, maxFiles = 2000 }) => {
    const root = path.resolve(String(sourcePath || ''));
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
      return { success: false, error: 'Carpeta no encontrada', code: 'NOT_A_DIRECTORY' };
    }
    const entries = [];
    let truncated = false;
    const walk = (dir, relative) => {
      if (truncated) return;
      let items = [];
      try {
        items = fs.readdirSync(dir, { withFileTypes: true });
      } catch (_) {
        return;
      }
      for (const item of items) {
        if (truncated) return;
        if (item.name.startsWith('.')) continue;
        const full = path.join(dir, item.name);
        const rel = relative ? `${relative}/${item.name}` : item.name;
        if (item.isDirectory()) {
          walk(full, rel);
        } else if (item.isFile()) {
          if (entries.length >= maxFiles) {
            truncated = true;
            return;
          }
          let size = 0;
          try {
            size = fs.statSync(full).size;
          } catch (_) {
            /* noop */
          }
          entries.push({ path: full, relative: rel, name: item.name, size });
        }
      }
    };
    walk(root, '');
    return { success: true, root, entries, truncated };
  }));

  safeHandle('library:download-url', guarded(async ({ folderKey, url, encrypt, allowPrivate }) => {
    const check = assertSafeOutboundUrl(url, { allowPrivate: !!allowPrivate });
    if (!check.ok) {
      return { success: false, error: check.error, code: 'UNSAFE_URL' };
    }
    const { buffer, contentType, disposition } = await downloadToBuffer(check.parsed.toString());
    const fileName = fileNameFromDownload(check.parsed.toString(), disposition, contentType);
    const file = await libraryStore.importFromBuffer({
      folderKey,
      fileName,
      data: buffer,
      mime: contentType || mimeForName(fileName),
      encrypt,
      origin: { kind: 'url', ref: check.parsed.toString(), fetchedAt: Date.now() }
    });
    return { success: true, file };
  }));

  /** Escribe un temporal para abrir un archivo sin dejarlo en la biblioteca. */
  function writePreviewFile(fileName, buffer, mime) {
    const dir = path.join(os.tmpdir(), 'nodeterm-library-preview');
    fs.mkdirSync(dir, { recursive: true });
    const label = sanitizeFileName(fileName || 'archivo');
    const target = path.join(dir, `${Date.now().toString(36)}_${label}`);
    fs.writeFileSync(target, buffer, { mode: 0o600 });
    return {
      success: true,
      label,
      absPath: target,
      mime: mime || mimeForName(label),
      size: buffer.length
    };
  }

  safeHandle('library:stage-buffer', guarded(async ({ fileName, data, mime }) => {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data || []);
    if (!buffer.length) return { success: false, error: 'Contenido vacío', code: 'EMPTY' };
    if (buffer.length > MAX_DOWNLOAD_BYTES) {
      return { success: false, error: 'FILE_TOO_LARGE', code: 'FILE_TOO_LARGE' };
    }
    return writePreviewFile(fileName, buffer, mime);
  }));

  safeHandle('library:stage-url', guarded(async ({ url, allowPrivate }) => {
    const check = assertSafeOutboundUrl(url, { allowPrivate: !!allowPrivate });
    if (!check.ok) return { success: false, error: check.error, code: 'UNSAFE_URL' };
    const { buffer, contentType, disposition } = await downloadToBuffer(check.parsed.toString());
    const fileName = fileNameFromDownload(check.parsed.toString(), disposition, contentType);
    return writePreviewFile(fileName, buffer, contentType || mimeForName(fileName));
  }));

  // --- Nextcloud / WebDAV -------------------------------------------------

  safeHandle('library:list-webdav', guarded(async ({ baseUrl, username, password, path: remotePath, ignoreSSLErrors }) => {
    if (!baseUrl || !username) {
      return { success: false, error: 'Nextcloud no está configurado', code: 'NOT_CONFIGURED' };
    }
    const clean = String(remotePath || '').replace(/^\/+|\/+$/g, '');
    const root = davRoot(username);
    const encoded = clean ? `/${clean.split('/').map(encodeURIComponent).join('/')}` : '';
    const url = `${String(baseUrl).replace(/\/+$/, '')}${root}${encoded}/`;

    const response = await webdavRequest({
      baseUrl,
      url,
      method: 'PROPFIND',
      ignoreSSLErrors,
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password || ''}`).toString('base64')}`,
        Depth: '1',
        'Content-Type': 'application/xml; charset=utf-8'
      },
      body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop>'
        + '<d:resourcetype/><d:getcontentlength/><d:getcontenttype/><d:getlastmodified/>'
        + '</d:prop></d:propfind>'
    });

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'Credenciales de Nextcloud rechazadas', code: 'UNAUTHORIZED' };
    }
    if (response.status === 404) {
      return { success: false, error: 'La carpeta no existe en Nextcloud', code: 'NOT_FOUND' };
    }
    if (response.status >= 400) {
      return { success: false, error: `WebDAV HTTP ${response.status}`, code: 'HTTP_ERROR' };
    }

    return {
      success: true,
      path: clean,
      entries: parsePropfind(response.body.toString('utf8'), `${root}${encoded}`)
    };
  }));

  safeHandle('library:import-webdav', guarded(async ({ baseUrl, username, password, ignoreSSLErrors, folderKey, remotePath, fileName, encrypt }) => {
    if (!baseUrl || !username || !remotePath) {
      return { success: false, error: 'Parámetros de descarga incompletos', code: 'BAD_REQUEST' };
    }
    const url = String(remotePath).includes('/remote.php/')
      ? `${String(baseUrl).replace(/\/+$/, '')}${remotePath.startsWith('/') ? '' : '/'}${remotePath}`
      : davUrl(baseUrl, username, remotePath);
    const response = await webdavRequest({
      baseUrl,
      url,
      method: 'GET',
      ignoreSSLErrors,
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password || ''}`).toString('base64')}`
      }
    });
    if (response.status >= 400) {
      return { success: false, error: `WebDAV HTTP ${response.status}`, code: 'HTTP_ERROR' };
    }

    const name = sanitizeFileName(fileName || decodeURIComponent(remotePath).split('/').pop() || 'archivo');
    const file = await libraryStore.importFromBuffer({
      folderKey,
      fileName: name,
      data: response.body,
      mime: String(response.headers['content-type'] || '').split(';')[0].trim() || mimeForName(name),
      encrypt,
      origin: { kind: 'webdav', ref: url, fetchedAt: Date.now() }
    });
    return { success: true, file };
  }));

  /**
   * Sincroniza los blobs de las carpetas marcadas con syncMode 'nextcloud'.
   * El renderer aporta la lista porque solo él conoce el árbol y las políticas
   * heredadas; aquí se resuelve la reconciliación contra el manifiesto remoto.
   */
  safeHandle('library:sync', guarded(async ({ baseUrl, username, password, ignoreSSLErrors, files }) => {
    if (!baseUrl || !username) {
      return { success: false, error: 'Nextcloud no está configurado', code: 'NOT_CONFIGURED' };
    }
    const result = await syncLibrary({ baseUrl, username, password, ignoreSSLErrors }, files || []);
    return { success: true, ...result };
  }));

  /** Imagen del portapapeles del sistema (respaldo cuando el renderer no tiene permiso). */
  safeHandle('library:read-clipboard-image', guarded(async () => {
    const image = clipboard.readImage();
    if (!image || image.isEmpty()) {
      return { success: false, error: 'Portapapeles sin imagen', code: 'EMPTY_CLIPBOARD' };
    }
    return { success: true, data: image.toPNG(), mime: 'image/png' };
  }));

  // --- Mutaciones ---------------------------------------------------------

  safeHandle('library:delete-file', guarded(async ({ relPath }) => libraryStore.deleteManagedFile(relPath)));

  safeHandle('library:move-file', guarded(async ({ relPath, folderKey, fileName }) =>
    libraryStore.moveManagedFile(relPath, folderKey, fileName)
  ));

  safeHandle('library:convert-blobs', guarded(async ({ relPaths, encrypt }) => {
    const result = await libraryStore.convertBlobs(relPaths, !!encrypt);
    return { success: true, ...result };
  }));

  // --- Carpetas enlazadas -------------------------------------------------

  safeHandle('library:list-linked', guarded(async ({ absPath }) => {
    const result = await listFiles(absPath);
    if (!result.success) return result;
    return {
      success: true,
      files: result.files
        .filter((item) => !item.isHidden)
        .map((item) => ({
          ...item,
          mime: item.type === 'directory' ? null : mimeForName(item.name)
        }))
    };
  }));

  // --- Integración con el sistema ----------------------------------------

  safeHandle('library:open-external', guarded(async ({ storage, relPath, absPath }) => {
    const blob = libraryStore.resolveDescriptor({ storage, relPath, absPath });
    if (blob.encrypted) {
      return {
        success: false,
        error: 'No se puede abrir externamente un archivo cifrado',
        code: 'ENCRYPTED'
      };
    }
    const error = await shell.openPath(blob.path);
    return error ? { success: false, error } : { success: true };
  }));

  safeHandle('library:reveal', guarded(async ({ storage, relPath, absPath }) => {
    const blob = libraryStore.resolveDescriptor({ storage, relPath, absPath });
    shell.showItemInFolder(blob.path);
    return { success: true };
  }));

  safeHandle('library:export-file', guarded(async ({ storage, relPath, absPath, fileName }, event) => {
    const blob = libraryStore.resolveDescriptor({ storage, relPath, absPath });
    const win = windowFrom(event);
    const options = { defaultPath: sanitizeFileName(fileName || path.basename(blob.path)) };
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return { success: true, canceled: true };

    if (blob.encrypted) {
      const content = await libraryStore.readFileContent({ storage, relPath, absPath });
      await fs.promises.writeFile(result.filePath, Buffer.from(content.content));
    } else {
      await fs.promises.copyFile(blob.path, result.filePath);
    }
    return { success: true, canceled: false, path: result.filePath };
  }));
}

module.exports = {
  registerLibraryHandlers,
  MAX_DOWNLOAD_BYTES
};
