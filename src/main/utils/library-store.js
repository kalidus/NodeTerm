/**
 * Almacén de archivos de la Biblioteca.
 *
 * Layout: <appData>/nodeterm/library/<folderKey>/<fileId>.<ext>
 * Si la carpeta es "encrypted", el blob vive en la misma ruta con sufijo .ntf
 * (formato NTLF1: magic(5) + iv(12) + authTag(16) + ciphertext).
 *
 * El árbol de nodos guarda siempre relPath SIN el sufijo .ntf; la existencia
 * de uno u otro archivo determina si el blob está cifrado, de modo que
 * convertir una carpeta no obliga a reescribir el árbol.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { getNodeTermDataDir } = require('./file-utils');
const { mimeForName, sanitizeFileName, extensionOf } = require('../../shared/library-mime');

const ENC_MAGIC = Buffer.from('NTLF1');
const ENC_IV_LEN = 12;
const ENC_TAG_LEN = 16;
const ENC_HEADER_LEN = ENC_MAGIC.length + ENC_IV_LEN + ENC_TAG_LEN;
const ENC_SUFFIX = '.ntf';

const KDF_ITERATIONS = 100000;
const KDF_SALT_LEN = 16;
const META_FILE = '.library-meta.json';

/** Tope por archivo importado. */
const MAX_IMPORT_BYTES = 512 * 1024 * 1024;
/** Tope al leer un archivo como texto en el visor. */
const MAX_TEXT_BYTES = 8 * 1024 * 1024;

function getLibraryDir() {
  if (process.env.NODETERM_TEST_DATA_DIR) {
    return path.join(process.env.NODETERM_TEST_DATA_DIR, 'library');
  }
  return path.join(getNodeTermDataDir(), 'library');
}

function ensureLibraryDir() {
  const dir = getLibraryDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

// ---------------------------------------------------------------------------
// Clave de sesión (cifrado por carpeta)
// ---------------------------------------------------------------------------

/** Clave derivada en memoria; nunca se persiste ni se devuelve al renderer. */
let sessionKey = null;
/** Master key del vault, también solo en memoria, para derivar de forma diferida. */
let vaultMasterKey = null;

function readMeta() {
  const file = path.join(ensureLibraryDir(), META_FILE);
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed && typeof parsed.kdfSalt === 'string') return parsed;
    }
  } catch (_) {
    /* meta corrupto: se regenera abajo */
  }
  return null;
}

/**
 * Salt de derivación de la biblioteca. Se crea una sola vez: si se perdiera,
 * los blobs .ntf existentes quedarían ilegibles.
 */
function getOrCreateKdfSalt() {
  const existing = readMeta();
  if (existing) return Buffer.from(existing.kdfSalt, 'base64');

  const salt = crypto.randomBytes(KDF_SALT_LEN);
  const file = path.join(ensureLibraryDir(), META_FILE);
  const meta = {
    v: 1,
    kdfSalt: salt.toString('base64'),
    iterations: KDF_ITERATIONS,
    createdAt: Date.now()
  };
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
  return salt;
}

/**
 * Guarda la master key del vault y deriva la clave de la biblioteca.
 *
 * Si todavía no hay salt se difiere la derivación en lugar de crear uno: así la
 * sincronización puede adoptar el salt de otro equipo antes de que este fije el
 * suyo, que sería irreversible. El salt acaba creándose en el primer cifrado o
 * descifrado real.
 */
function unlock(masterKey) {
  if (!masterKey || typeof masterKey !== 'string') {
    throw new Error('Master key requerida');
  }
  vaultMasterKey = masterKey;
  if (readMeta()) deriveSessionKey();
  return true;
}

function deriveSessionKey() {
  if (!vaultMasterKey) return null;
  const salt = getOrCreateKdfSalt();
  const iterations = readMeta()?.iterations || KDF_ITERATIONS;
  sessionKey = crypto.pbkdf2Sync(vaultMasterKey, salt, iterations, 32, 'sha256');
  return sessionKey;
}

function lock() {
  if (sessionKey) sessionKey.fill(0);
  sessionKey = null;
  vaultMasterKey = null;
}

/**
 * Parámetros de derivación para publicarlos en el manifiesto de sincronización.
 * El salt no es secreto: sin la master key no aporta nada, y es imprescindible
 * para que otro equipo derive la misma clave y pueda leer los .ntf sincronizados.
 */
function getKdfParams() {
  const meta = readMeta();
  if (!meta) return null;
  return { kdfSalt: meta.kdfSalt, iterations: meta.iterations || KDF_ITERATIONS };
}

/**
 * Adopta los parámetros de derivación de otro equipo. Solo se permite si aquí
 * todavía no hay ninguno: cambiarlos dejaría ilegibles los .ntf ya escritos.
 * @returns {boolean} true si se adoptaron
 */
function adoptKdfParams(params) {
  if (!params?.kdfSalt || readMeta()) return false;
  const file = path.join(ensureLibraryDir(), META_FILE);
  const meta = {
    v: 1,
    kdfSalt: params.kdfSalt,
    iterations: Number(params.iterations) || KDF_ITERATIONS,
    createdAt: Date.now(),
    adopted: true
  };
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
  // Rederivar con el salt recién adoptado sin perder el desbloqueo
  if (sessionKey) sessionKey.fill(0);
  sessionKey = null;
  if (vaultMasterKey) deriveSessionKey();
  return true;
}

function hasSessionKey() {
  return Buffer.isBuffer(sessionKey) || Boolean(vaultMasterKey);
}

function requireSessionKey() {
  if (!Buffer.isBuffer(sessionKey) && vaultMasterKey) deriveSessionKey();
  if (!Buffer.isBuffer(sessionKey)) {
    const err = new Error('LIBRARY_LOCKED');
    err.code = 'LIBRARY_LOCKED';
    throw err;
  }
  return sessionKey;
}

// ---------------------------------------------------------------------------
// Resolución de rutas
// ---------------------------------------------------------------------------

/** Segmento de ruta seguro para usar como nombre de carpeta en disco. */
function safeSegment(value, fallback) {
  const clean = String(value || '').replace(/[^A-Za-z0-9._-]/g, '');
  if (!clean || clean === '.' || clean === '..') return fallback;
  return clean.slice(0, 120);
}

/**
 * Resuelve un relPath dentro de la biblioteca rechazando cualquier escape.
 * @returns {string} ruta absoluta canónica (sin sufijo de cifrado)
 */
function resolveManagedPath(relPath) {
  if (!relPath || typeof relPath !== 'string') {
    throw new Error('relPath requerido');
  }
  if (relPath.includes('\0')) {
    throw new Error('relPath inválido');
  }
  const root = getLibraryDir();
  const abs = path.resolve(root, relPath);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (abs !== root && !abs.startsWith(rootWithSep)) {
    const err = new Error('PATH_OUTSIDE_LIBRARY');
    err.code = 'PATH_OUTSIDE_LIBRARY';
    throw err;
  }
  return abs;
}

/**
 * Localiza el blob real de un archivo managed.
 * @returns {{ path: string, encrypted: boolean }|null}
 */
function locateManagedBlob(relPath) {
  const base = resolveManagedPath(relPath);
  if (fs.existsSync(base)) return { path: base, encrypted: false };
  const enc = base + ENC_SUFFIX;
  if (fs.existsSync(enc)) return { path: enc, encrypted: true };
  return null;
}

/** Valida una ruta absoluta de archivo enlazado. */
function resolveLinkedPath(absPath) {
  if (!absPath || typeof absPath !== 'string' || absPath.includes('\0')) {
    throw new Error('absPath requerido');
  }
  const abs = path.resolve(absPath.replace(/\\/g, path.sep));
  let stats;
  try {
    stats = fs.statSync(abs);
  } catch (_) {
    const err = new Error('FILE_NOT_FOUND');
    err.code = 'FILE_NOT_FOUND';
    throw err;
  }
  if (stats.isDirectory()) {
    const err = new Error('IS_DIRECTORY');
    err.code = 'IS_DIRECTORY';
    throw err;
  }
  return abs;
}

/**
 * Resuelve un descriptor de nodo a su blob en disco.
 * @param {{ storage: 'managed'|'linked', relPath?: string, absPath?: string }} descriptor
 * @returns {{ path: string, encrypted: boolean, storage: string }}
 */
function resolveDescriptor(descriptor) {
  const storage = descriptor?.storage === 'linked' ? 'linked' : 'managed';
  if (storage === 'linked') {
    return { path: resolveLinkedPath(descriptor.absPath), encrypted: false, storage };
  }
  const found = locateManagedBlob(descriptor?.relPath);
  if (!found) {
    const err = new Error('FILE_NOT_FOUND');
    err.code = 'FILE_NOT_FOUND';
    throw err;
  }
  return { ...found, storage };
}

// ---------------------------------------------------------------------------
// Cifrado de blobs
// ---------------------------------------------------------------------------

function encryptBuffer(plain) {
  const key = requireSessionKey();
  const iv = crypto.randomBytes(ENC_IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([ENC_MAGIC, iv, cipher.getAuthTag(), body]);
}

function parseEncryptedHeader(buf) {
  if (buf.length < ENC_HEADER_LEN || !buf.subarray(0, ENC_MAGIC.length).equals(ENC_MAGIC)) {
    const err = new Error('INVALID_BLOB');
    err.code = 'INVALID_BLOB';
    throw err;
  }
  return {
    iv: buf.subarray(ENC_MAGIC.length, ENC_MAGIC.length + ENC_IV_LEN),
    authTag: buf.subarray(ENC_MAGIC.length + ENC_IV_LEN, ENC_HEADER_LEN)
  };
}

function decryptBuffer(buf) {
  const key = requireSessionKey();
  const { iv, authTag } = parseEncryptedHeader(buf);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(buf.subarray(ENC_HEADER_LEN)), decipher.final()]);
}

/**
 * Stream de lectura en claro de un blob, descifrando al vuelo si hace falta.
 * Nunca escribe el contenido descifrado en disco.
 */
function createPlainReadStream(blob) {
  if (!blob.encrypted) {
    return fs.createReadStream(blob.path);
  }
  const key = requireSessionKey();
  const header = Buffer.alloc(ENC_HEADER_LEN);
  const fd = fs.openSync(blob.path, 'r');
  try {
    const read = fs.readSync(fd, header, 0, ENC_HEADER_LEN, 0);
    if (read < ENC_HEADER_LEN) {
      const err = new Error('INVALID_BLOB');
      err.code = 'INVALID_BLOB';
      throw err;
    }
  } finally {
    fs.closeSync(fd);
  }
  const { iv, authTag } = parseEncryptedHeader(header);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return fs.createReadStream(blob.path, { start: ENC_HEADER_LEN }).pipe(decipher);
}

/** Tamaño del contenido en claro (descuenta la cabecera del blob cifrado). */
function plainSizeOf(blob) {
  const stats = fs.statSync(blob.path);
  return blob.encrypted ? Math.max(0, stats.size - ENC_HEADER_LEN) : stats.size;
}

// ---------------------------------------------------------------------------
// Importación
// ---------------------------------------------------------------------------

function hashBuffer(buf) {
  return `sha256:${crypto.createHash('sha256').update(buf).digest('hex')}`;
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(filePath), hash);
  return `sha256:${hash.digest('hex')}`;
}

/** Genera un relPath libre dentro de la carpeta destino. */
function allocateRelPath(folderKey, fileName) {
  const folderSeg = safeSegment(folderKey, '_root');
  const safeName = sanitizeFileName(fileName);
  const ext = extensionOf(safeName);
  const stem = ext ? safeName.slice(0, -(ext.length + 1)) : safeName;
  const dir = path.join(ensureLibraryDir(), folderSeg);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const unique = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
  const diskStem = `${stem.slice(0, 80) || 'archivo'}_${unique}`;
  const diskName = ext ? `${diskStem}.${ext}` : diskStem;
  return {
    relPath: path.posix.join(folderSeg, diskName),
    absPath: path.join(dir, diskName),
    fileName: safeName
  };
}

function writeBlob(targetAbsPath, buffer, encrypt) {
  const payload = encrypt ? encryptBuffer(buffer) : buffer;
  const finalPath = encrypt ? targetAbsPath + ENC_SUFFIX : targetAbsPath;
  const tmp = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, payload, { mode: 0o600 });
  fs.renameSync(tmp, finalPath);
  return finalPath;
}

/**
 * Copia un archivo del disco a la biblioteca.
 * @param {{ folderKey?: string, sourcePath: string, encrypt?: boolean, origin?: object }} options
 */
async function importFromPath(options = {}) {
  const source = resolveLinkedPath(options.sourcePath);
  const stats = fs.statSync(source);
  if (stats.size > MAX_IMPORT_BYTES) {
    const err = new Error('FILE_TOO_LARGE');
    err.code = 'FILE_TOO_LARGE';
    err.limit = MAX_IMPORT_BYTES;
    throw err;
  }

  const fileName = path.basename(source);
  const target = allocateRelPath(options.folderKey, fileName);
  const encrypt = !!options.encrypt;

  if (encrypt) {
    // Cifrar exige el contenido completo en memoria (AES-GCM de un solo bloque)
    const buffer = await fs.promises.readFile(source);
    writeBlob(target.absPath, buffer, true);
  } else {
    await fs.promises.copyFile(source, target.absPath);
    await fs.promises.chmod(target.absPath, 0o600).catch(() => {});
  }

  const hash = await hashFile(source);
  return {
    label: target.fileName,
    storage: 'managed',
    relPath: target.relPath,
    mime: mimeForName(target.fileName),
    size: stats.size,
    hash,
    encrypted: encrypt,
    origin: options.origin || { kind: 'local', ref: source, fetchedAt: Date.now() }
  };
}

/**
 * Guarda un buffer (portapapeles, descarga, WebDAV) como archivo de la biblioteca.
 * @param {{ folderKey?: string, fileName: string, data: Buffer|Uint8Array,
 *           encrypt?: boolean, origin?: object, mime?: string }} options
 */
async function importFromBuffer(options = {}) {
  const buffer = Buffer.isBuffer(options.data) ? options.data : Buffer.from(options.data || []);
  if (!buffer.length) {
    throw new Error('Contenido vacío');
  }
  if (buffer.length > MAX_IMPORT_BYTES) {
    const err = new Error('FILE_TOO_LARGE');
    err.code = 'FILE_TOO_LARGE';
    err.limit = MAX_IMPORT_BYTES;
    throw err;
  }

  const target = allocateRelPath(options.folderKey, options.fileName || 'archivo');
  writeBlob(target.absPath, buffer, !!options.encrypt);

  return {
    label: target.fileName,
    storage: 'managed',
    relPath: target.relPath,
    mime: options.mime || mimeForName(target.fileName),
    size: buffer.length,
    hash: hashBuffer(buffer),
    encrypted: !!options.encrypt,
    origin: options.origin || { kind: 'local', ref: '', fetchedAt: Date.now() }
  };
}

// ---------------------------------------------------------------------------
// Lectura / metadatos / borrado
// ---------------------------------------------------------------------------

/**
 * Lee un archivo completo. `encoding: 'utf8'` lo devuelve como texto con tope
 * de tamaño; en otro caso devuelve un Uint8Array.
 */
async function readFileContent(descriptor, options = {}) {
  const blob = resolveDescriptor(descriptor);
  const size = plainSizeOf(blob);
  const asText = options.encoding === 'utf8';
  const limit = asText ? MAX_TEXT_BYTES : MAX_IMPORT_BYTES;
  if (size > limit) {
    const err = new Error('FILE_TOO_LARGE');
    err.code = 'FILE_TOO_LARGE';
    err.limit = limit;
    err.size = size;
    throw err;
  }

  const raw = await fs.promises.readFile(blob.path);
  const plain = blob.encrypted ? decryptBuffer(raw) : raw;
  if (asText) {
    return { success: true, encoding: 'utf8', size, content: plain.toString('utf8') };
  }
  return { success: true, encoding: 'binary', size, content: new Uint8Array(plain) };
}

function statFile(descriptor) {
  const blob = resolveDescriptor(descriptor);
  const stats = fs.statSync(blob.path);
  return {
    success: true,
    path: blob.path,
    encrypted: blob.encrypted,
    size: plainSizeOf(blob),
    modified: stats.mtimeMs,
    created: stats.birthtimeMs
  };
}

function deleteManagedFile(relPath) {
  const found = locateManagedBlob(relPath);
  if (!found) return { success: true, removed: false };
  fs.unlinkSync(found.path);
  // Limpia la carpeta si se queda vacía
  try {
    const dir = path.dirname(found.path);
    if (dir !== getLibraryDir() && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  } catch (_) {
    /* noop */
  }
  return { success: true, removed: true };
}

/** Mueve el blob a la carpeta de otro nodo, devolviendo el nuevo relPath. */
function moveManagedFile(relPath, newFolderKey, fileName) {
  const found = locateManagedBlob(relPath);
  if (!found) {
    const err = new Error('FILE_NOT_FOUND');
    err.code = 'FILE_NOT_FOUND';
    throw err;
  }
  const target = allocateRelPath(newFolderKey, fileName || path.basename(relPath));
  const finalPath = found.encrypted ? target.absPath + ENC_SUFFIX : target.absPath;
  fs.renameSync(found.path, finalPath);
  return { success: true, relPath: target.relPath, encrypted: found.encrypted };
}

/**
 * Convierte blobs entre claro y cifrado (cambio de vaultMode de una carpeta).
 * @param {string[]} relPaths
 * @param {boolean} encrypt
 */
async function convertBlobs(relPaths, encrypt) {
  requireSessionKey();
  const results = { converted: 0, skipped: 0, failed: [] };
  for (const relPath of relPaths || []) {
    try {
      const found = locateManagedBlob(relPath);
      if (!found || found.encrypted === encrypt) {
        results.skipped += 1;
        continue;
      }
      const raw = await fs.promises.readFile(found.path);
      const plain = found.encrypted ? decryptBuffer(raw) : raw;
      const base = resolveManagedPath(relPath);
      writeBlob(base, plain, encrypt);
      fs.unlinkSync(found.path);
      results.converted += 1;
    } catch (err) {
      results.failed.push({ relPath, error: err.code || err.message });
    }
  }
  return results;
}

/**
 * Lee un blob tal y como está en disco, sin descifrar.
 *
 * La sincronización sube exactamente estos bytes: si la carpeta es cifrada, lo
 * que viaja a Nextcloud es el ciphertext, nunca el contenido en claro.
 */
async function readRawBlob(relPath) {
  const found = locateManagedBlob(relPath);
  if (!found) {
    const err = new Error('FILE_NOT_FOUND');
    err.code = 'FILE_NOT_FOUND';
    throw err;
  }
  const stats = await fs.promises.stat(found.path);
  return {
    buffer: await fs.promises.readFile(found.path),
    encrypted: found.encrypted,
    size: stats.size,
    modified: stats.mtimeMs
  };
}

/** Escribe bytes en crudo en un relPath concreto, respetando el sufijo .ntf. */
async function writeRawBlob(relPath, buffer, encrypted) {
  const base = resolveManagedPath(relPath);
  await fs.promises.mkdir(path.dirname(base), { recursive: true, mode: 0o700 });
  const finalPath = encrypted ? base + ENC_SUFFIX : base;
  const tmp = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmp, buffer, { mode: 0o600 });
  await fs.promises.rename(tmp, finalPath);
  // Un mismo relPath no puede existir a la vez en claro y cifrado
  const stale = encrypted ? base : base + ENC_SUFFIX;
  try {
    await fs.promises.unlink(stale);
  } catch (_) {
    /* no existía */
  }
  return { success: true, relPath, encrypted: !!encrypted };
}

/** Reserva un relPath libre sin escribir nada todavía. */
function reserveRelPath(folderKey, fileName) {
  return allocateRelPath(folderKey, fileName);
}

/** Metadatos de disco de un blob managed, sin lanzar si no existe. */
function statManagedBlob(relPath) {
  const found = locateManagedBlob(relPath);
  if (!found) return { exists: false };
  const stats = fs.statSync(found.path);
  return { exists: true, encrypted: found.encrypted, size: stats.size, modified: stats.mtimeMs };
}

/** Uso total en disco de la biblioteca. */
function getUsage() {
  const root = getLibraryDir();
  let bytes = 0;
  let files = 0;
  const walk = (dir) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name !== META_FILE) {
        try {
          bytes += fs.statSync(full).size;
          files += 1;
        } catch (_) {
          /* noop */
        }
      }
    }
  };
  if (fs.existsSync(root)) walk(root);
  return { success: true, bytes, files, root };
}

module.exports = {
  ENC_SUFFIX,
  MAX_IMPORT_BYTES,
  MAX_TEXT_BYTES,
  getLibraryDir,
  ensureLibraryDir,
  unlock,
  lock,
  hasSessionKey,
  getKdfParams,
  adoptKdfParams,
  resolveManagedPath,
  resolveLinkedPath,
  resolveDescriptor,
  locateManagedBlob,
  createPlainReadStream,
  plainSizeOf,
  importFromPath,
  importFromBuffer,
  readFileContent,
  statFile,
  deleteManagedFile,
  moveManagedFile,
  convertBlobs,
  readRawBlob,
  writeRawBlob,
  reserveRelPath,
  statManagedBlob,
  getUsage
};
