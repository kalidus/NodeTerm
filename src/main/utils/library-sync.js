/**
 * Sincronización de los blobs de la biblioteca contra Nextcloud.
 *
 * Solo entran aquí los archivos cuya carpeta está marcada con syncMode
 * 'nextcloud'. Se suben los bytes tal cual están en disco: si la carpeta además
 * es cifrada, lo que viaja es el ciphertext, de modo que el servidor nunca ve
 * contenido en claro.
 *
 * El árbol de nodos (metadatos, etiquetas, jerarquía) ya viaja en
 * nodeterm-documents.json; aquí solo se mueven los binarios y el manifiesto que
 * permite reconciliarlos.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const libraryStore = require('./library-store');
const { createWebdavClient } = require('./webdav-client');
const { mimeForName, extensionOf } = require('../../shared/library-mime');

const REMOTE_ROOT = 'NodeTerm/library';
const MANIFEST_NAME = 'library-manifest.json';
const STATE_FILE = '.library-sync.json';
const MANIFEST_VERSION = 1;
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const remotePathFor = (relPath, encrypted) =>
  `${REMOTE_ROOT}/${relPath}${encrypted ? libraryStore.ENC_SUFFIX : ''}`;

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/* ── Estado local de reconciliación ──────────────────────────────────────── */

/**
 * Hash con el que cada relPath quedó sincronizado por última vez. Es la "base"
 * de la comparación a tres vías: sin ella no se puede distinguir "el remoto
 * cambió" de "cambié yo", y todo acabaría marcado como conflicto.
 */
function stateFilePath() {
  return path.join(libraryStore.ensureLibraryDir(), STATE_FILE);
}

function readState() {
  try {
    const raw = fs.readFileSync(stateFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { base: {} };
  } catch (_) {
    return { base: {} };
  }
}

function writeState(state) {
  try {
    const target = stateFilePath();
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state), { mode: 0o600 });
    fs.renameSync(tmp, target);
  } catch (err) {
    console.warn('[LibrarySync] No se pudo guardar el estado:', err.message);
  }
}

/* ── Manifiesto remoto ───────────────────────────────────────────────────── */

function emptyManifest() {
  return { version: MANIFEST_VERSION, updatedAt: null, kdf: null, files: {} };
}

function normalizeManifest(raw) {
  if (!raw || typeof raw !== 'object' || !raw.files || typeof raw.files !== 'object') {
    return emptyManifest();
  }
  return {
    version: MANIFEST_VERSION,
    updatedAt: raw.updatedAt || null,
    kdf: raw.kdf || null,
    files: raw.files
  };
}

/**
 * Alinea los parámetros de derivación entre equipos.
 *
 * Un blob .ntf solo se puede descifrar con la clave derivada del mismo salt, y
 * el salt se crea localmente la primera vez que se desbloquea la biblioteca. Si
 * cada equipo usa el suyo, los cifrados sincronizados serían ilegibles en el
 * otro. El salt no es secreto, así que se publica en el manifiesto; un equipo
 * que aún no tenga el suyo adopta el remoto.
 *
 * @returns {{ kdf: object|null, mismatch: boolean }}
 */
function reconcileKdf(manifest) {
  const remote = manifest.kdf;
  let local = libraryStore.getKdfParams();

  if (remote && !local && libraryStore.adoptKdfParams(remote)) {
    local = libraryStore.getKdfParams();
  }
  if (remote && local && remote.kdfSalt !== local.kdfSalt) {
    // Ambos equipos ya tenían blobs cifrados con salts distintos: cambiar el
    // nuestro los haría ilegibles, así que se avisa y se sigue en claro.
    return { kdf: local, mismatch: true };
  }
  return { kdf: local || remote || null, mismatch: false };
}

/** Elimina las lápidas suficientemente antiguas para que no crezcan sin fin. */
function pruneTombstones(manifest) {
  const cutoff = Date.now() - TOMBSTONE_TTL_MS;
  for (const [relPath, entry] of Object.entries(manifest.files)) {
    if (entry?.deletedAt && entry.deletedAt < cutoff) {
      delete manifest.files[relPath];
    }
  }
}

/** Nombre alternativo para la copia de un conflicto. */
function conflictName(label) {
  const ext = extensionOf(label);
  const stem = ext ? label.slice(0, -(ext.length + 1)) : label;
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ').replace(':', '.');
  return ext ? `${stem} (remoto ${stamp}).${ext}` : `${stem} (remoto ${stamp})`;
}

/* ── Sincronización ──────────────────────────────────────────────────────── */

/**
 * @param {{ baseUrl: string, username: string, password: string, ignoreSSLErrors?: boolean }} account
 * @param {Array<{ relPath: string, folderKey: string|null, label: string, mime?: string, updatedAt?: number }>} localFiles
 *        archivos managed que viven en carpetas con syncMode 'nextcloud'
 * @returns {Promise<{ uploaded: number, downloaded: number, deletedRemote: number,
 *                     conflicts: Array, added: Array, updated: Array, failed: Array }>}
 */
async function syncLibrary(account, localFiles = []) {
  const client = createWebdavClient(account);
  await client.ensureDir(REMOTE_ROOT);

  const state = readState();
  const base = state.base && typeof state.base === 'object' ? state.base : {};

  let manifest;
  try {
    const raw = await client.get(`${REMOTE_ROOT}/${MANIFEST_NAME}`);
    manifest = raw ? normalizeManifest(JSON.parse(raw.toString('utf8'))) : emptyManifest();
  } catch (err) {
    console.warn('[LibrarySync] Manifiesto ilegible, se reconstruye:', err.message);
    manifest = emptyManifest();
  }

  const { kdf, mismatch: kdfMismatch } = reconcileKdf(manifest);

  const result = {
    uploaded: 0,
    downloaded: 0,
    deletedRemote: 0,
    kdfMismatch,
    conflicts: [],
    added: [],
    updated: [],
    failed: []
  };

  const localByRelPath = new Map();
  for (const file of localFiles) {
    if (file?.relPath) localByRelPath.set(file.relPath, file);
  }

  const ensuredDirs = new Set();
  const ensureRemoteFolder = async (relPath) => {
    const folder = relPath.split('/').slice(0, -1).join('/');
    if (!folder || ensuredDirs.has(folder)) return;
    await client.ensureDir(`${REMOTE_ROOT}/${folder}`);
    ensuredDirs.add(folder);
  };

  const uploadLocal = async (file, blob) => {
    await ensureRemoteFolder(file.relPath);
    await client.put(
      remotePathFor(file.relPath, blob.encrypted),
      blob.buffer,
      blob.encrypted ? 'application/octet-stream' : (file.mime || mimeForName(file.label))
    );
    const hash = sha256(blob.buffer);
    manifest.files[file.relPath] = {
      label: file.label,
      folderKey: file.folderKey || null,
      mime: file.mime || mimeForName(file.label),
      size: blob.size,
      hash,
      encrypted: blob.encrypted,
      updatedAt: Date.now()
    };
    base[file.relPath] = hash;
    result.uploaded += 1;
  };

  const downloadRemote = async (relPath, entry) => {
    const buffer = await client.get(remotePathFor(relPath, entry.encrypted));
    if (!buffer) {
      // El manifiesto apunta a un blob que ya no está: se ignora la entrada
      delete manifest.files[relPath];
      return null;
    }
    return buffer;
  };

  // --- 1. Recorrido de los archivos locales --------------------------------
  for (const file of localByRelPath.values()) {
    try {
      const remote = manifest.files[file.relPath];
      const blob = await libraryStore.readRawBlob(file.relPath);
      if (kdfMismatch && blob.encrypted) {
        result.failed.push({ relPath: file.relPath, error: 'KDF_MISMATCH' });
        continue;
      }
      const localHash = sha256(blob.buffer);
      const baseHash = base[file.relPath] || null;

      if (!remote || remote.deletedAt) {
        await uploadLocal(file, blob);
        continue;
      }
      if (remote.hash === localHash) {
        base[file.relPath] = localHash;
        continue;
      }

      const localChanged = localHash !== baseHash;
      const remoteChanged = remote.hash !== baseHash;

      if (localChanged && !remoteChanged) {
        await uploadLocal(file, blob);
        continue;
      }

      if (!localChanged && remoteChanged) {
        const buffer = await downloadRemote(file.relPath, remote);
        if (!buffer) continue;
        await libraryStore.writeRawBlob(file.relPath, buffer, remote.encrypted);
        base[file.relPath] = remote.hash;
        result.downloaded += 1;
        result.updated.push({
          relPath: file.relPath,
          size: buffer.length,
          hash: remote.hash,
          mime: remote.mime || file.mime
        });
        continue;
      }

      // Ambos lados cambiaron: gana el local y la versión remota se conserva
      // como copia aparte para que el usuario decida.
      const buffer = await downloadRemote(file.relPath, remote);
      await uploadLocal(file, blob);
      if (!buffer) continue;

      const label = conflictName(file.label || path.basename(file.relPath));
      const target = libraryStore.reserveRelPath(file.folderKey, label);
      await libraryStore.writeRawBlob(target.relPath, buffer, remote.encrypted);
      result.conflicts.push({
        original: file.relPath,
        relPath: target.relPath,
        folderKey: file.folderKey || null,
        label,
        mime: remote.mime || mimeForName(label),
        size: buffer.length,
        encrypted: remote.encrypted
      });
    } catch (err) {
      result.failed.push({ relPath: file.relPath, error: err.code || err.message });
    }
  }

  // --- 2. Entradas que solo existen en remoto ------------------------------
  for (const [relPath, entry] of Object.entries(manifest.files)) {
    if (localByRelPath.has(relPath) || !entry || entry.deletedAt) continue;
    if (kdfMismatch && entry.encrypted) continue;
    try {
      if (base[relPath]) {
        // Estuvo sincronizado y ya no está en el árbol local: se borró aquí.
        await client.remove(remotePathFor(relPath, entry.encrypted));
        manifest.files[relPath] = { deletedAt: Date.now() };
        delete base[relPath];
        result.deletedRemote += 1;
        continue;
      }
      const buffer = await downloadRemote(relPath, entry);
      if (!buffer) continue;
      await libraryStore.writeRawBlob(relPath, buffer, entry.encrypted);
      base[relPath] = entry.hash || sha256(buffer);
      result.downloaded += 1;
      result.added.push({
        relPath,
        folderKey: entry.folderKey || null,
        label: entry.label || path.basename(relPath),
        mime: entry.mime || mimeForName(entry.label || relPath),
        size: buffer.length,
        hash: entry.hash || null,
        encrypted: !!entry.encrypted
      });
    } catch (err) {
      result.failed.push({ relPath, error: err.code || err.message });
    }
  }

  // --- 3. Cierre: manifiesto y estado --------------------------------------
  pruneTombstones(manifest);
  manifest.updatedAt = new Date().toISOString();
  if (kdf && !kdfMismatch) manifest.kdf = kdf;
  await client.put(
    `${REMOTE_ROOT}/${MANIFEST_NAME}`,
    Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
    'application/json'
  );

  writeState({ base, lastSyncAt: Date.now() });
  return result;
}

module.exports = {
  REMOTE_ROOT,
  MANIFEST_NAME,
  syncLibrary
};
