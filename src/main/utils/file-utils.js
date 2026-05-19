const path = require('path');
const fs = require('fs');
const os = require('os');
const { app, safeStorage } = require('electron');

/**
 * Utilidades para manejo de archivos y rutas
 * - Obtener rutas de preferencias
 * - Manejo seguro de archivos del sistema
 */

/**
 * Obtiene el directorio de datos centralizado de NodeTerm en la carpeta estándar de AppData
 * @returns {string} Ruta absoluta del directorio de datos
 */
function getNodeTermDataDir() {
  try {
    const dir = path.join(app.getPath('appData'), 'nodeterm');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch (e) {
    const fallbackDir = path.join(os.homedir(), '.nodeterm');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
}

/**
 * Migra los datos de la carpeta antigua (~/.nodeterm) a la nueva (%APPDATA%/nodeterm)
 * y borra la carpeta antigua una vez finalizado el proceso de migración.
 */
function migrateDataFromHomeDir() {
  migrateDataFromHomeDirAsync().catch((err) => {
    console.error(`❌ [Migration] Error crítico durante migración:`, err.message);
  });
}

/**
 * Migración en background (no bloquea app.ready).
 */
async function migrateDataFromHomeDirAsync() {
  const oldDir = path.join(os.homedir(), '.nodeterm');
  const newDir = getNodeTermDataDir();

  if (oldDir === newDir) return;
  try {
    await fs.promises.access(oldDir);
  } catch {
    return;
  }

  console.log(`📦 [Migration] Migrando datos de NodeTerm desde: ${oldDir} hacia: ${newDir}`);

  await fs.promises.mkdir(newDir, { recursive: true });

  const copyRecursive = async (src, dest) => {
    const stats = await fs.promises.stat(src);
    if (stats.isDirectory()) {
      await fs.promises.mkdir(dest, { recursive: true });
      const children = await fs.promises.readdir(src);
      for (const child of children) {
        await copyRecursive(path.join(src, child), path.join(dest, child));
      }
    } else if (stats.isFile()) {
      try {
        await fs.promises.access(dest);
      } catch {
        await fs.promises.copyFile(src, dest);
      }
    }
  };

  const files = await fs.promises.readdir(oldDir);
  for (const file of files) {
    const srcPath = path.join(oldDir, file);
    const destPath = path.join(newDir, file);
    try {
      await copyRecursive(srcPath, destPath);
      console.log(`📦 [Migration] Migrado: ${file}`);
    } catch (err) {
      console.error(`❌ [Migration] Error migrando ${file}:`, err.message);
    }
  }

  try {
    await fs.promises.rm(oldDir, { recursive: true, force: true });
    console.log(`🧹 [Migration] Carpeta antigua ${oldDir} eliminada con éxito.`);
  } catch {
    console.warn(`⚠️ [Migration] No se pudo borrar la carpeta antigua, renombrando...`);
    try {
      await fs.promises.rename(oldDir, `${oldDir}.bak`);
    } catch (_) { /* noop */ }
  }
}

const APP_DATA_ENC_PREFIX = 'NTENC:';

function trimBom(str) {
  return str.replace(/^\uFEFF/, '').trim();
}

function isLikelyJsonText(str) {
  const t = trimBom(str);
  return t.startsWith('{') || t.startsWith('[');
}

/**
 * Cifrado con safeStorage (válido solo dentro del mismo userData / instancia primaria).
 * No usar para app-data.json compartido entre instancias.
 */
function encryptStringSecurely(str) {
  if (!str) return '';
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      const encryptedBuffer = safeStorage.encryptString(str);
      return APP_DATA_ENC_PREFIX + encryptedBuffer.toString('base64');
    } catch (err) {
      console.error('❌ [Security] Falló la encriptación de safeStorage:', err.message);
      return str;
    }
  }
  return str;
}

function decryptStringSecurely(str) {
  if (!str) return '';
  const trimmed = trimBom(str);

  if (isLikelyJsonText(trimmed)) {
    return trimmed;
  }

  let payload = trimmed;
  if (payload.startsWith(APP_DATA_ENC_PREFIX)) {
    payload = payload.slice(APP_DATA_ENC_PREFIX.length);
  }

  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(payload, 'base64');
    const decrypted = safeStorage.decryptString(buffer);
    if (!isLikelyJsonText(decrypted)) {
      throw new Error('Contenido desencriptado no es JSON válido');
    }
    return decrypted;
  }

  throw new Error('No se pudo desencriptar con safeStorage');
}

/**
 * Serializa app-data.json en JSON plano (legible por todas las instancias).
 * Los valores sensibles ya van cifrados dentro del payload (connections_encrypted, etc.).
 */
function serializeAppDataFile(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Intenta descifrar formato legacy (safeStorage) — solo la instancia primaria puede hacerlo.
 */
function decryptLegacySafeStoragePayload(trimmed) {
  let payload = trimmed;
  if (payload.startsWith(APP_DATA_ENC_PREFIX)) {
    payload = payload.slice(APP_DATA_ENC_PREFIX.length);
  }
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage no disponible para formato legacy');
  }
  const buffer = Buffer.from(payload, 'base64');
  const decrypted = safeStorage.decryptString(buffer);
  if (!isLikelyJsonText(decrypted)) {
    throw new Error('Contenido legacy desencriptado no es JSON');
  }
  return decrypted;
}

function isAppDataPlainJson(raw) {
  return isLikelyJsonText(trimBom(raw));
}

/**
 * Lee y parsea app-data.json (JSON plano compartido; legacy safeStorage solo en instancia primaria).
 */
function parseAppDataFileContent(raw) {
  const trimmed = trimBom(raw);
  if (!trimmed) {
    throw new Error('app-data vacío');
  }

  if (isLikelyJsonText(trimmed)) {
    return JSON.parse(trimmed);
  }

  const isSecondary = process.env.NODETERM_IS_SECONDARY_INSTANCE === 'true';
  if (isSecondary) {
    throw new Error(
      'app-data en formato legacy (safeStorage). Abre primero la ventana principal para migrar el archivo.'
    );
  }

  const plaintext = decryptLegacySafeStoragePayload(trimmed);
  return JSON.parse(plaintext);
}

/**
 * Obtiene la ruta del archivo de preferencias de Guacd
 * @returns {string|null} Ruta del archivo de preferencias o null si hay error
 */
function getGuacdPrefPath() {
  try {
    return path.join(getNodeTermDataDir(), 'guacd-preferences.json');
  } catch {
    return null;
  }
}

/**
 * Guarda la preferencia del método Guacd de forma persistente
 * @param {string} method - Método preferido (docker|wsl|native|mock)
 * @returns {Promise<boolean>} true si se guardó exitosamente
 */
async function savePreferredGuacdMethod(method) {
  const prefPath = getGuacdPrefPath();
  if (!prefPath) return false;
  try {
    const dir = path.dirname(prefPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(prefPath, JSON.stringify({ preferredMethod: method }, null, 2), 'utf8');
    return true;
  } catch { 
    return false; 
  }
}

/**
 * Carga la preferencia del método Guacd desde el archivo persistente
 * @returns {Promise<string|null>} Método preferido o null si no existe
 */
async function loadPreferredGuacdMethod() {
  const prefPath = getGuacdPrefPath();
  if (!prefPath) return null;
  try {
    if (!fs.existsSync(prefPath)) return null;
    const raw = fs.readFileSync(prefPath, 'utf8');
    const json = JSON.parse(raw || '{}');
    const m = String(json.preferredMethod || '').toLowerCase();
    return (m === 'docker' || m === 'wsl' || m === 'native' || m === 'mock') ? m : null;
  } catch { 
    return null; 
  }
}

/**
 * Guarda el timeout de inactividad de guacd de forma persistente
 * @param {number} timeoutMs - Timeout en milisegundos (0 = desactivado)
 * @returns {Promise<boolean>} true si se guardó exitosamente
 */
async function saveGuacdInactivityTimeout(timeoutMs) {
  const prefPath = getGuacdPrefPath();
  if (!prefPath) return false;
  try {
    const dir = path.dirname(prefPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // Leer preferencias existentes para no sobrescribirlas
    let existingPrefs = {};
    try {
      if (fs.existsSync(prefPath)) {
        existingPrefs = JSON.parse(fs.readFileSync(prefPath, 'utf8') || '{}');
      }
    } catch {}
    
    // Actualizar solo el timeout
    existingPrefs.inactivityTimeoutMs = timeoutMs;
    fs.writeFileSync(prefPath, JSON.stringify(existingPrefs, null, 2), 'utf8');
    return true;
  } catch { 
    return false; 
  }
}

/**
 * Carga el timeout de inactividad de guacd desde el archivo persistente
 * @returns {Promise<number|null>} Timeout en ms o null si no existe
 */
async function loadGuacdInactivityTimeout() {
  const prefPath = getGuacdPrefPath();
  if (!prefPath) return null;
  try {
    if (!fs.existsSync(prefPath)) return null;
    const raw = fs.readFileSync(prefPath, 'utf8');
    const json = JSON.parse(raw || '{}');
    const timeout = json.inactivityTimeoutMs;
    if (typeof timeout === 'number' && timeout >= 0) {
      return timeout;
    }
    return null;
  } catch { 
    return null; 
  }
}

module.exports = {
  getGuacdPrefPath,
  savePreferredGuacdMethod,
  loadPreferredGuacdMethod,
  saveGuacdInactivityTimeout,
  loadGuacdInactivityTimeout,
  getNodeTermDataDir,
  migrateDataFromHomeDir,
  migrateDataFromHomeDirAsync,
  encryptStringSecurely,
  decryptStringSecurely,
  serializeAppDataFile,
  parseAppDataFileContent,
  isAppDataPlainJson,
  APP_DATA_ENC_PREFIX
};
