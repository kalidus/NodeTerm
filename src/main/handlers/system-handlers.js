const { ipcMain, clipboard, dialog, BrowserWindow, app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { parseProcessList } = require('../utils/parsing-utils');
const { registerClipboardHandlers } = require('./clipboard-handlers');

/**
 * Handlers para funcionalidades del sistema
 * - Clipboard (leer/escribir texto)
 * - Dialogos (guardar/abrir archivos)
 * - Importacion de archivos
 */

/**
 * Función utilitaria para obtener estadísticas de archivo de forma segura
 * @param {string} path - Ruta del archivo
 * @returns {Object|null} - Estadísticas del archivo o null si hay error
 */
function safeStatSync(path) {
  try {
    return fs.statSync(path);
  } catch {
    return null;
  }
}

/**
 * Función utilitaria para calcular hash SHA256 de un archivo
 * @param {string} path - Ruta del archivo
 * @returns {string|null} - Hash del archivo o null si hay error
 */
function hashFileSync(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch {
    return null;
  }
}

function readSysfsTrimmed(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return null;
  }
}

function readSysfsInt(filePath) {
  const raw = readSysfsTrimmed(filePath);
  if (raw == null || raw === '') return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function readHwmonTempC(deviceDir) {
  try {
    const hwmonRoot = path.join(deviceDir, 'hwmon');
    if (!fs.existsSync(hwmonRoot)) return null;
    for (const hwmon of fs.readdirSync(hwmonRoot)) {
      const tempPath = path.join(hwmonRoot, hwmon, 'temp1_input');
      const raw = readSysfsInt(tempPath);
      if (raw != null) return Math.round(raw / 1000);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function readNvidiaNameFromProc() {
  try {
    const root = '/proc/driver/nvidia/gpus';
    if (!fs.existsSync(root)) return null;
    for (const entry of fs.readdirSync(root)) {
      const info = readSysfsTrimmed(path.join(root, entry, 'information'));
      if (!info) continue;
      const match = info.match(/Model:\s*(.+)/i);
      if (match) return match[1].trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}

function classifyDrmCard(cardDir) {
  const uevent = readSysfsTrimmed(path.join(cardDir, 'device', 'uevent')) || '';
  const vendor = (readSysfsTrimmed(path.join(cardDir, 'device', 'vendor')) || '').toLowerCase();
  if (uevent.includes('DRIVER=nvidia') || uevent.includes('DRIVER=nouveau') || vendor === '0x10de' || /PCI_ID=10de:/i.test(uevent)) {
    return 'nvidia';
  }
  if (uevent.includes('DRIVER=amdgpu') || vendor === '0x1002' || /PCI_ID=1002:/i.test(uevent)) {
    return 'amd';
  }
  if (uevent.includes('DRIVER=i915') || uevent.includes('DRIVER=xe') || vendor === '0x8086' || /PCI_ID=8086:/i.test(uevent)) {
    return 'intel';
  }
  return null;
}

function drmCardHasConnectedDisplay(cardName) {
  try {
    const drmDir = '/sys/class/drm';
    const prefix = `${cardName}-`;
    for (const entry of fs.readdirSync(drmDir)) {
      if (!entry.startsWith(prefix)) continue;
      const status = readSysfsTrimmed(path.join(drmDir, entry, 'status'));
      if (status === 'connected') return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function readDrmVramMb(deviceDir) {
  const totalBytes = readSysfsInt(path.join(deviceDir, 'mem_info_vram_total'));
  const usedBytes = readSysfsInt(path.join(deviceDir, 'mem_info_vram_used'));
  if (totalBytes == null || usedBytes == null || totalBytes <= 0) {
    return { totalMB: null, usedMB: null, freeMB: null, usagePercent: null };
  }
  const totalMB = Math.round(totalBytes / 1024 / 1024);
  const usedMB = Math.round(usedBytes / 1024 / 1024);
  return {
    totalMB,
    usedMB,
    freeMB: totalMB - usedMB,
    usagePercent: Math.round((usedMB / totalMB) * 100)
  };
}

/**
 * Stats GPU en Linux solo vía sysfs/proc (sin nvidia-smi / rocm-smi).
 * Prefiere la tarjeta con conector connected (GPU del compositor).
 */
function readLinuxGpuStatsFromSysfs() {
  const drmDir = '/sys/class/drm';
  if (!fs.existsSync(drmDir)) return null;

  const cards = [];
  try {
    for (const entry of fs.readdirSync(drmDir)) {
      if (!/^card\d+$/.test(entry)) continue;
      const cardDir = path.join(drmDir, entry);
      const type = classifyDrmCard(cardDir);
      if (!type) continue;
      cards.push({
        name: entry,
        type,
        connected: drmCardHasConnectedDisplay(entry),
        deviceDir: path.join(cardDir, 'device')
      });
    }
  } catch {
    return null;
  }
  if (cards.length === 0) return null;

  const preferredEnv = (process.env.NODETERM_GPU || 'auto').trim().toLowerCase();
  let preferred = null;
  if (preferredEnv === 'nvidia') {
    preferred = cards.find((c) => c.type === 'nvidia') || null;
  } else if (preferredEnv === 'integrated') {
    preferred = cards.find((c) => c.type === 'amd' || c.type === 'intel') || null;
  }
  if (!preferred) preferred = cards.find((c) => c.connected) || cards[0];

  const { type, deviceDir } = preferred;
  const vram = readDrmVramMb(deviceDir);
  const busy = readSysfsInt(path.join(deviceDir, 'gpu_busy_percent'));
  let temperature = readHwmonTempC(deviceDir);
  let name = null;

  if (type === 'nvidia') {
    name = readNvidiaNameFromProc() || 'NVIDIA GPU';
  } else if (type === 'amd') {
    name = 'AMD Radeon Graphics';
  } else if (type === 'intel') {
    name = 'Intel HD/UHD Graphics';
  }

  return {
    ok: true,
    type,
    name,
    totalMB: vram.totalMB,
    usedMB: vram.usedMB,
    freeMB: vram.freeMB,
    usagePercent: vram.usagePercent,
    gpuUtilization: busy,
    temperature,
    driverVersion: null,
    note: 'Detectado vía kernel sysfs'
  };
}

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

// Utilitarios de seguridad y resolución de navegadores
function getWindowsBrowserPath(browser) {
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localAppData = process.env['LocalAppData'] || '';

  const candidates = {
    chrome: [
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ],
    edge: [
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ],
    firefox: [
      path.join(programFiles, 'Mozilla Firefox', 'firefox.exe'),
      path.join(programFilesX86, 'Mozilla Firefox', 'firefox.exe'),
    ],
    brave: [
      path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(programFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    ]
  };

  const list = candidates[browser] || [];
  for (const candidate of list) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function validateBrowserUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL inválida' };
  }
  const trimmedUrl = url.trim();

  // Prohibir caracteres de control, saltos de línea, comillas, backticks, pipes, escapes, punto y coma o subshells
  if (/[\x00-\x1F\x7F"'\s<>^`;|\\]|\$\(/.test(trimmedUrl)) {
    return { valid: false, error: 'URL contiene caracteres no permitidos' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch (_) {
    return { valid: false, error: 'Formato de URL inválido' };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { valid: false, error: 'Solo se permiten protocolos http:// y https://' };
  }

  return { valid: true, url: parsedUrl.href };
}

const ALLOWED_IMPORT_EXTENSIONS = new Set([
  '.xml', '.json', '.nodeterm', '.csv', '.tsv', '.yaml', '.yml', '.txt', '.rdp', '.jex'
]);

const SENSITIVE_FILENAME_PATTERNS = [
  /^\.?env(\..+)?$/i,
  /^security\.json$/i,
  /^app-data\.json$/i,
  /^id_[a-z0-9_-]+$/i,
  /^id_[a-z0-9_-]+\.pub$/i,
  /^known_hosts(\..+)?$/i,
  /^authorized_keys(\..+)?$/i,
  /master[-_]?key/i,
  /passwd/i,
  /shadow/i,
  /sam$/i,
  /system$/i
];

function validateImportFilePath(filePath) {
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    return { ok: false, error: 'filePath inválido o vacío' };
  }

  const safePath = path.resolve(filePath.trim());
  const fileName = path.basename(safePath).toLowerCase();
  const ext = path.extname(safePath).toLowerCase();

  // 1. Validar lista blanca de extensiones permitidas para importación
  if (!ALLOWED_IMPORT_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: `Extensión no permitida para importación: '${ext || '(sin extensión)'}'. Extensiones permitidas: ${Array.from(ALLOWED_IMPORT_EXTENSIONS).join(', ')}`
    };
  }

  // 2. Bloquear patrones de archivos sensibles
  for (const pattern of SENSITIVE_FILENAME_PATTERNS) {
    if (pattern.test(fileName)) {
      return { ok: false, error: 'Acceso denegado a archivo sensible o protegido' };
    }
  }

  return { ok: true, safePath };
}


let passwordAutoClearTimer = null;
let currentAutoClearSecret = null;

/**
 * Copia un texto/contraseña al portapapeles y programa su borrado automático.
 * Si el usuario copia otra cosa antes del timeout, el portapapeles no se borra.
 * @param {string} text - Contenido a copiar
 * @param {number} [timeoutMs=30000] - Tiempo de vida en ms (30s por defecto)
 * @param {Object} [clipboardImpl=clipboard] - Instancia de portapapeles (inyección para tests)
 * @returns {NodeJS.Timeout|null}
 */
function setClipboardWithAutoClear(text, timeoutMs = 30000, clipboardImpl = clipboard) {
  if (text == null || text === '') return null;
  const str = String(text);

  if (passwordAutoClearTimer) {
    clearTimeout(passwordAutoClearTimer);
    passwordAutoClearTimer = null;
    currentAutoClearSecret = null;
  }

  currentAutoClearSecret = str;
  try {
    clipboardImpl.writeText(str);
  } catch (err) {
    console.warn('[Clipboard] Error escribiendo al portapapeles:', err?.message || err);
  }

  const activeSecret = str;
  passwordAutoClearTimer = setTimeout(() => {
    try {
      if (clipboardImpl && typeof clipboardImpl.readText === 'function') {
        const current = clipboardImpl.readText();
        if (current === activeSecret) {
          clipboardImpl.clear();
        }
      }
    } catch (err) {
      console.warn('[Clipboard] Error limpiando portapapeles seguro:', err?.message || err);
    } finally {
      if (currentAutoClearSecret === activeSecret) {
        passwordAutoClearTimer = null;
        currentAutoClearSecret = null;
      }
    }
  }, timeoutMs);

  if (passwordAutoClearTimer && typeof passwordAutoClearTimer.unref === 'function') {
    passwordAutoClearTimer.unref();
  }

  return passwordAutoClearTimer;
}

function cancelClipboardAutoClear() {
  if (passwordAutoClearTimer) {
    clearTimeout(passwordAutoClearTimer);
    passwordAutoClearTimer = null;
    currentAutoClearSecret = null;
  }
}

/**
 * Registra handlers del sistema necesarios para la UI inicial
 * (clipboard + dialogs). Clipboard vive en clipboard-handlers.js.
 */
function registerSystemHandlers() {
  registerClipboardHandlers();

  // === DIALOG HANDLERS ===
  safeHandle('dialog:show-save-dialog', async (event, options) => {
    const win = BrowserWindow.getFocusedWindow();
    return await dialog.showSaveDialog(win, options);
  });

  safeHandle('dialog:show-open-dialog', async (event, options) => {
    const win = BrowserWindow.getFocusedWindow();
    const safeOptions = {
      properties: ['openDirectory'],
      ...options
    };
    return await dialog.showOpenDialog(win, safeOptions);
  });
}

/**
 * 🚀 REGISTRO INMEDIATO, EJECUCIÓN ON-DEMAND
 * 
 * Registra handlers de monitoreo del sistema (Import, File drop, System memory, GPU)
 * 
 * IMPORTANTE:
 * - El REGISTRO es inmediato y ligero (solo definir IPC handlers)
 * - La EJECUCIÓN es on-demand y solo ocurre cuando el frontend los llama
 * - La detección de GPU, aunque se registra aquí, solo se ejecuta cuando se solicita
 * - Esto evita errores "No handler registered" sin ralentizar el arranque
 */
function registerSystemMonitoringHandlers() {

  // === IMPORT HANDLERS ===

  // Handler para importar desde Joplin JEX (tar)
  ipcMain.handle('import:joplin-jex', async (event, filePath) => {
    try {
      const { assertTrustedIpcSender } = require('../utils/ipc-trust');
      const trust = assertTrustedIpcSender(event);
      if (!trust.ok) {
        return { ok: false, error: `IPC no autorizado: ${trust.error}` };
      }

      const validation = validateImportFilePath(filePath);
      if (!validation.ok) {
        return { ok: false, error: validation.error };
      }
      if (path.extname(validation.safePath).toLowerCase() !== '.jex') {
        return { ok: false, error: 'Solo se permiten archivos .jex para importación Joplin' };
      }

      // Lazy require: tar/marked no deben impedir registrar clipboard al cargar este modulo
      const JoplinImportService = require('../services/JoplinImportService');
      const result = await JoplinImportService.importJex(validation.safePath);
      return { ok: true, result };
    } catch (e) {
      console.error('Error en handler import:joplin-jex:', e);
      return { ok: false, error: e?.message || 'Error desconocido al importar desde Joplin' };
    }
  });

  // Handler para obtener información de archivo
  ipcMain.handle('import:get-file-info', async (event, filePath) => {
    const validation = validateImportFilePath(filePath);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }
    const stat = safeStatSync(validation.safePath);
    if (!stat) return { ok: false, error: 'No se pudo obtener información del archivo' };
    return { ok: true, mtimeMs: stat.mtimeMs, size: stat.size };
  });

  // Handler para obtener hash de archivo
  ipcMain.handle('import:get-file-hash', async (event, filePath) => {
    const validation = validateImportFilePath(filePath);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    try {
      const stats = fs.statSync(validation.safePath);
      const MAX_HASH_BYTES = 50 * 1024 * 1024; // 50 MB
      if (stats.size > MAX_HASH_BYTES) {
        return { ok: false, error: 'El archivo excede el tamaño máximo para hash (50 MB)' };
      }
    } catch {
      return { ok: false, error: 'No se pudo acceder al archivo' };
    }

    const hash = hashFileSync(validation.safePath);
    if (!hash) return { ok: false, error: 'No se pudo calcular el hash del archivo' };
    return { ok: true, hash };
  });

  // Handler para leer contenido de archivo de importación (seguro y asíncrono)
  ipcMain.handle('import:read-file', async (event, filePath) => {
    try {
      const validation = validateImportFilePath(filePath);
      if (!validation.ok) {
        return { ok: false, error: validation.error };
      }

      const safePath = validation.safePath;
      const stats = await fs.promises.stat(safePath);
      if (!stats.isFile()) {
        return { ok: false, error: 'La ruta especificada no es un archivo regular' };
      }

      const MAX_IMPORT_BYTES = 50 * 1024 * 1024; // 50 MB
      if (stats.size > MAX_IMPORT_BYTES) {
        return { ok: false, error: 'El archivo excede el tamaño máximo permitido para importación (50 MB)' };
      }

      const data = await fs.promises.readFile(safePath, 'utf-8');
      return { ok: true, content: data };
    } catch (e) {
      return { ok: false, error: e?.message || 'Error al leer archivo' };
    }
  });

  // Handler para guardar un archivo exportado (backup/configuración)
  ipcMain.handle('import:save-file', async (event, { fileName, fileContent, options = {} } = {}) => {
    try {
      if (typeof fileContent !== 'string') {
        return { success: false, error: 'Contenido de archivo no proporcionado o inválido' };
      }

      const win = BrowserWindow.getFocusedWindow();
      const defaultFileName = fileName || 'backup.nodeterm';

      const saveOptions = {
        defaultPath: defaultFileName,
        filters: [
          { name: 'Archivo NodeTerm (*.nodeterm)', extensions: ['nodeterm'] },
          { name: 'Archivo JSON (*.json)', extensions: ['json'] },
          { name: 'Todos los archivos (*.*)', extensions: ['*'] }
        ],
        ...options
      };

      const result = win ? await dialog.showSaveDialog(win, saveOptions) : await dialog.showSaveDialog(saveOptions);

      if (result.canceled || !result.filePath) {
        return { canceled: true, success: false };
      }

      fs.writeFileSync(result.filePath, fileContent, 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (e) {
      console.error('Error en handler import:save-file:', e);
      return { success: false, error: e?.message || 'Error desconocido al guardar archivo' };
    }
  });

  // Handler para obtener ruta de descargas
  ipcMain.handle('import:get-downloads-path', async () => {
    try {
      return { ok: true, path: app.getPath('downloads') };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  });

  // Handler para abrir URL externa
  ipcMain.handle('import:open-external', async (event, url) => {
    try {
      const val = validateBrowserUrl(url);
      if (!val.valid) {
        console.warn('⚠️ [Security] URL inválida en import:open-external:', url, val.error);
        return { ok: false, error: val.error };
      }

      await shell.openExternal(val.url);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  });

  // Handler para obtener el directorio home del usuario
  // IMPORTANTE: Este handler SIEMPRE debe retornar un string válido
  ipcMain.handle('get-user-home', async (event) => {
    console.log('🏠 [get-user-home] Handler INVOCADO');

    // Método 1: app.getPath('home') - MÁS CONFIABLE en Electron
    try {
      const homePath = app.getPath('home');
      if (homePath && typeof homePath === 'string' && homePath.trim().length > 0) {
        console.log('✅ [get-user-home] Home obtenido de app.getPath:', homePath);
        return homePath;
      }
      console.warn('⚠️ [get-user-home] app.getPath retornó valor vacío:', homePath);
    } catch (e) {
      console.warn('⚠️ [get-user-home] app.getPath falló:', e.message);
    }

    // Método 2: os.homedir() - fallback
    try {
      const homePath = os.homedir();
      if (homePath && typeof homePath === 'string' && homePath.trim().length > 0) {
        console.log('✅ [get-user-home] Home obtenido con os.homedir():', homePath);
        return homePath;
      }
      console.warn('⚠️ [get-user-home] os.homedir() retornó valor vacío:', homePath);
    } catch (e) {
      console.warn('⚠️ [get-user-home] os.homedir() falló:', e.message);
    }

    // Método 3: Variables de entorno (Windows)
    if (process.platform === 'win32') {
      // Primero intentar USERPROFILE que es la más confiable
      if (process.env.USERPROFILE) {
        const homePath = process.env.USERPROFILE.trim();
        if (homePath.length > 0) {
          console.log('✅ [get-user-home] Home obtenido de USERPROFILE:', homePath);
          return homePath;
        }
      }

      // Segundo: construir desde HOMEDRIVE + HOMEPATH
      if (process.env.HOMEDRIVE && process.env.HOMEPATH) {
        const homePath = (process.env.HOMEDRIVE + process.env.HOMEPATH).trim();
        if (homePath.length > 0) {
          console.log('✅ [get-user-home] Home obtenido de HOMEDRIVE+HOMEPATH:', homePath);
          return homePath;
        }
      }

      // Tercero: construir desde USERNAME
      if (process.env.USERNAME) {
        const homePath = `C:\\Users\\${process.env.USERNAME}`;
        console.log('✅ [get-user-home] Home obtenido de USERNAME:', homePath);
        return homePath;
      }
    } else {
      // Linux/Mac
      if (process.env.HOME) {
        const homePath = process.env.HOME.trim();
        if (homePath.length > 0) {
          console.log('✅ [get-user-home] Home obtenido de HOME:', homePath);
          return homePath;
        }
      }

      if (process.env.USER) {
        const homePath = `/home/${process.env.USER}`;
        console.log('✅ [get-user-home] Home obtenido de USER:', homePath);
        return homePath;
      }
    }

    // Último recurso: path por defecto (no debería llegar aquí nunca)
    const defaultPath = process.platform === 'win32' ? 'C:\\Users\\User' : '/home/user';
    console.error('❌ [get-user-home] Usando path por defecto:', defaultPath);
    console.error('❌ [get-user-home] Variables de entorno disponibles:', {
      USERPROFILE: process.env.USERPROFILE,
      HOMEDRIVE: process.env.HOMEDRIVE,
      HOMEPATH: process.env.HOMEPATH,
      USERNAME: process.env.USERNAME,
      HOME: process.env.HOME,
      USER: process.env.USER
    });
    return defaultPath;
  });


  // Handler para listar archivos locales - 🚀 OPTIMIZACIÓN: Totalmente asíncrono y no bloqueante
  ipcMain.handle('local:list-files', async (event, dirPath) => {
    try {
      if (!dirPath || typeof dirPath !== 'string') {
        return { success: false, error: 'Path inválido' };
      }

      const normalizedPath = path.normalize(dirPath);

      // Verificar directorio de forma asíncrona
      const stats = await fs.promises.stat(normalizedPath);
      if (!stats.isDirectory()) {
        return { success: false, error: 'El path no es un directorio' };
      }

      const entries = await fs.promises.readdir(normalizedPath, { withFileTypes: true });

      // 🚀 Procesar stats en paralelo y de forma asíncrona para no bloquear el Main Process
      const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(normalizedPath, entry.name);
        const isHidden = entry.name.startsWith('.');

        try {
          const stat = await fs.promises.stat(fullPath);
          return {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stat.size,
            modified: stat.mtime.toISOString(),
            path: fullPath,
            hidden: isHidden
          };
        } catch (e) {
          // Fallback para archivos sin permisos o errores de stat
          return {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: 0,
            modified: new Date().toISOString(),
            path: fullPath,
            hidden: isHidden
          };
        }
      }));

      return { success: true, files };
    } catch (error) {
      console.error('❌ [local:list-files] Error:', error.message);
      return { success: false, error: error.message || 'Error al listar archivos' };
    }
  });


  // Handler para encontrar el archivo XML más reciente en descargas - 🚀 OPTIMIZACIÓN: Asíncrono
  ipcMain.handle('import:find-latest-xml-download', async (event, { sinceMs } = {}) => {
    try {
      const downloadsDir = app.getPath('downloads');
      const entries = await fs.promises.readdir(downloadsDir);
      const xmlFiles = entries.filter(name => name.toLowerCase().endsWith('.xml'));

      let latest = null;

      // Procesar de forma asíncrona pero secuencial para no sobrecargar el sistema de archivos
      // (usualmente hay pocos XML en descargas)
      for (const name of xmlFiles) {
        const fullPath = path.join(downloadsDir, name);
        try {
          const stat = await fs.promises.stat(fullPath);

          // Si se especifica sinceMs, filtrar por fecha
          if (sinceMs && stat.mtimeMs <= sinceMs) continue;

          if (!latest || stat.mtimeMs > latest.mtimeMs) {
            latest = { name, path: fullPath, mtimeMs: stat.mtimeMs };
          }
        } catch (e) {
          continue;
        }
      }

      return { ok: true, latest };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  });

  // === FILE DROP HANDLERS ===

  // Handler para obtener el path de un archivo usando webUtils.getPathForFile
  // En Electron con contextIsolation, necesitamos usar webUtils desde el main process
  ipcMain.handle('file:get-path-for-file', async (event, fileIndex) => {
    try {
      // ✅ SEGURIDAD: validar índice (nunca interpolar valores no validados en executeJavaScript)
      // Solo number entero; Number('0);...') parsearía maliciosamente → rechazar strings
      const index = typeof fileIndex === 'number' ? fileIndex : NaN;
      if (!Number.isInteger(index) || index < 0 || index > 10000) {
        return { ok: false, error: 'Invalid file index' };
      }

      const { webContents } = require('electron');
      const sender = webContents.fromId(event.sender.id);

      if (!sender || !sender.webUtils) {
        return { ok: false, error: 'webUtils not available' };
      }

      // Ejecutar código en el renderer para obtener el objeto File y usar webUtils
      // webUtils.getPathForFile solo está disponible en el main process
      // Índice serializado vía JSON.stringify para evitar inyección de código
      const pathResult = await sender.executeJavaScript(`
        (async () => {
          try {
            const fileIndex = ${JSON.stringify(index)};
            const files = window.__lastDroppedFiles || [];
            if (files.length <= fileIndex || !files[fileIndex]) {
              return { ok: false, error: 'File not found' };
            }
            
            const file = files[fileIndex];
            
            // Intentar múltiples formas de obtener el path
            // En Electron, los archivos del sistema deberían tener path
            if (file.path) {
              return { ok: true, path: file.path };
            }
            
            // Intentar mediante descriptor
            try {
              const desc = Object.getOwnPropertyDescriptor(file, 'path');
              if (desc && desc.value) {
                return { ok: true, path: desc.value };
              }
            } catch (e) {}
            
            // Intentar mediante Reflect
            try {
              const path = Reflect.get(file, 'path');
              if (path && typeof path === 'string') {
                return { ok: true, path: path };
              }
            } catch (e) {}
            
            // Intentar acceder a todas las propiedades no enumerables
            try {
              const allProps = Object.getOwnPropertyNames(file);
              for (const prop of allProps) {
                if (prop === 'path' || prop.toLowerCase().includes('path')) {
                  const value = file[prop];
                  if (typeof value === 'string' && value.length > 0) {
                    return { ok: true, path: value };
                  }
                }
              }
            } catch (e) {}
            
            // Último intento: buscar en el prototipo
            try {
              const proto = Object.getPrototypeOf(file);
              if (proto) {
                const protoDesc = Object.getOwnPropertyDescriptor(proto, 'path');
                if (protoDesc && protoDesc.value) {
                  return { ok: true, path: protoDesc.value };
                }
              }
            } catch (e) {}
            
            return { ok: false, error: 'Path not found in file object' };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        })()
      `);

      return pathResult;
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  });

  // Handler para guardar archivo temporalmente desde ArrayBuffer
  // Esto permite subir archivos arrastrados sin necesidad de tener el path
  ipcMain.handle('file:save-temp-file', async (event, { fileName, arrayBuffer }) => {
    try {
      const pathMod = require('path');
      const os = require('os');
      const fsPromises = require('fs').promises;

      if (!fileName || typeof fileName !== 'string') {
        return { ok: false, error: 'fileName inválido' };
      }
      if (!arrayBuffer) {
        return { ok: false, error: 'arrayBuffer requerido' };
      }

      // ✅ VALIDACIÓN DE SEGURIDAD: Sanear el nombre del archivo para evitar path traversal
      const safeFileName = pathMod.basename(fileName).replace(/[^\w.\- ()[\]]+/g, '_');
      if (!safeFileName || safeFileName === '.' || safeFileName === '..') {
        return { ok: false, error: 'Nombre de archivo no permitido' };
      }

      const MAX_TEMP_BYTES = 100 * 1024 * 1024; // 100 MB
      const byteLength = arrayBuffer.byteLength != null
        ? arrayBuffer.byteLength
        : (Buffer.isBuffer(arrayBuffer) ? arrayBuffer.length : 0);
      if (byteLength > MAX_TEMP_BYTES) {
        return { ok: false, error: 'El archivo temporal excede el tamaño máximo (100 MB)' };
      }

      const tempDir = os.tmpdir();
      const tempFilePath = pathMod.join(tempDir, `nodeterm-upload-${Date.now()}-${safeFileName}`);

      // Convertir ArrayBuffer a Buffer y escribir
      const buffer = Buffer.from(arrayBuffer);
      await fsPromises.writeFile(tempFilePath, buffer);

      return { ok: true, path: tempFilePath };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  });

  // === SYSTEM MEMORY HANDLERS ===

  // Handler para obtener estadísticas reales de memoria del sistema
  ipcMain.handle('system:get-memory-stats', async () => {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      return {
        ok: true,
        totalMB: Math.round(totalMemory / 1024 / 1024),
        freeMB: Math.round(freeMemory / 1024 / 1024),
        usedMB: Math.round(usedMemory / 1024 / 1024),
        usagePercent: Math.round((usedMemory / totalMemory) * 100)
      };
    } catch (e) {
      return {
        ok: false,
        error: e?.message,
        // Fallback en caso de error
        totalMB: 16000,
        freeMB: 8000,
        usedMB: 8000,
        usagePercent: 50
      };
    }
  });

  // === GPU MEMORY HANDLERS ===

  // Variable estática para cachear la detección de GPU (evitar logs repetidos y mejorar performance)
  let gpuDetectionLogged = false;
  let detectedGpuType = null;
  let detectedGpuName = null;
  let cachedGpuStats = null;
  let lastGpuCheck = 0;
  let isGpuQuerying = false; // Bandera para evitar ejecuciones concurrentes
  const GPU_CACHE_TTL = 60000; // 60s: evita cascadas de PowerShell/wmic en Windows
  let nvidiaDisabledUntil = 0;
  const PENALTY_DURATION = 30 * 1000; // Penalización reducida a 30 segundos (asíncrono, no bloquea)

  function classifyControllerGpu(controller) {
    if (!controller) return null;
    const vendor = String(controller.vendor || '').toLowerCase();
    const name = String(controller.name || '').toLowerCase();
    const model = String(controller.model || '').toLowerCase();
    const blob = `${vendor} ${name} ${model}`;
    if (blob.includes('nvidia')) return 'nvidia';
    if (blob.includes('amd') || blob.includes('ati') || blob.includes('radeon')) return 'amd';
    if (blob.includes('intel')) return 'intel';
    if (blob.includes('apple')) return 'apple-metal';
    return null;
  }

  // Función asíncrona para detectar el tipo de GPU una única vez
  async function detectGpuTypeOnce() {
    if (detectedGpuType) return detectedGpuType;

    const platform = process.platform;
    if (platform === 'darwin') {
      detectedGpuType = 'apple-metal';
      detectedGpuName = 'Apple Silicon';
      return detectedGpuType;
    }

    if (platform === 'linux') {
      try {
        const drmDir = '/sys/class/drm';
        if (fs.existsSync(drmDir)) {
          const files = fs.readdirSync(drmDir);
          const cardDirs = files.filter(f => /^card\d+$/.test(f));
          
          let hasNvidia = false;
          let hasAmd = false;
          let hasIntel = false;
          let detectedName = '';
          
          for (const card of cardDirs) {
            const ueventPath = path.join(drmDir, card, 'device', 'uevent');
            if (fs.existsSync(ueventPath)) {
              const content = fs.readFileSync(ueventPath, 'utf8');
              const lines = content.split('\n');
              let driver = '';
              let pciId = '';
              for (const line of lines) {
                if (line.startsWith('DRIVER=')) {
                  driver = line.substring(7).trim();
                } else if (line.startsWith('PCI_ID=')) {
                  pciId = line.substring(7).trim();
                }
              }
              if (driver === 'nvidia' || driver === 'nouveau' || pciId.startsWith('10de:')) {
                hasNvidia = true;
                detectedName = 'NVIDIA Graphics Card';
              } else if (driver === 'amdgpu' || pciId.startsWith('1002:')) {
                hasAmd = true;
                if (!detectedName) detectedName = 'AMD Radeon Graphics';
              } else if (driver === 'i915' || driver === 'xe' || pciId.startsWith('8086:')) {
                hasIntel = true;
                if (!detectedName) detectedName = 'Intel HD/UHD Graphics';
              }
            }
          }
          
          if (hasNvidia) {
            detectedGpuType = 'nvidia';
            detectedGpuName = detectedName || 'NVIDIA GPU';
            console.log('[GPU Handler] 🔍 Detectado GPU NVIDIA por sysfs');
            return detectedGpuType;
          } else if (hasAmd) {
            detectedGpuType = 'amd';
            detectedGpuName = detectedName || 'AMD GPU';
            console.log('[GPU Handler] 🔍 Detectado GPU AMD por sysfs');
            return detectedGpuType;
          } else if (hasIntel) {
            detectedGpuType = 'intel';
            detectedGpuName = detectedName || 'Intel GPU';
            console.log('[GPU Handler] 🔍 Detectado GPU Intel por sysfs');
            return detectedGpuType;
          }
        }
      } catch (e) {
        console.warn('[GPU Handler] Error en detección DRM sysfs:', e.message);
      }
    }

    // Fallbacks one-shot de detección (no usados en el poll de stats).
    // En Linux preferimos evitar nvidia-smi/rocm-smi (pueden bloquear en D con Wayland).
    if (platform === 'win32') {
      try {
        const { stdout } = await execAsync('nvidia-smi --query-gpu=name --format=csv,noheader', { timeout: 1500 });
        if (stdout.trim()) {
          detectedGpuType = 'nvidia';
          detectedGpuName = stdout.trim().split('\n')[0] || 'NVIDIA GPU';
          console.log('[GPU Handler] 🔍 Detectado GPU NVIDIA por nvidia-smi');
          return detectedGpuType;
        }
      } catch (_) {}
    }

    if (platform === 'win32') {
      try {
        const { stdout } = await execAsync('wmic path win32_VideoController get name /format:csv', { timeout: 1500 });
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n').filter(l => l.trim() && !l.includes('Name') && !l.includes('Node'));
          if (lines.length > 0) {
            const name = lines[0].split(',')[2]?.trim() || '';
            if (name.toLowerCase().includes('nvidia')) {
              detectedGpuType = 'nvidia';
            } else if (name.toLowerCase().includes('amd') || name.toLowerCase().includes('radeon')) {
              detectedGpuType = 'amd';
            } else if (name.toLowerCase().includes('intel')) {
              detectedGpuType = 'intel';
            } else {
              detectedGpuType = 'integrated';
            }
            detectedGpuName = name;
            console.log(`[GPU Handler] 🔍 Detectado GPU Windows por WMIC: ${name} (${detectedGpuType})`);
            return detectedGpuType;
          }
        }
      } catch (_) {}
    }

    detectedGpuType = 'unknown';
    detectedGpuName = 'Generic GPU';
    return detectedGpuType;
  }

  // Handler para obtener estadísticas de GPU (mejorado con más información y totalmente asíncrono)
  ipcMain.handle('system:get-gpu-stats', async () => {
    const now = Date.now();

    // 1. Retornar caché si es reciente
    if (cachedGpuStats && (now - lastGpuCheck < GPU_CACHE_TTL)) {
      return cachedGpuStats;
    }

    // 2. Si ya hay una consulta en progreso, retornar la caché (o null) para no bloquear
    if (isGpuQuerying) {
      return cachedGpuStats || { ok: false, error: 'Consulta de GPU en curso' };
    }

    isGpuQuerying = true;

    // Linux: solo sysfs/proc — nunca nvidia-smi/rocm-smi en el poll (estado D en NVIDIA+Wayland).
    if (process.platform === 'linux') {
      try {
        const sysfsStats = readLinuxGpuStatsFromSysfs();
        if (sysfsStats) {
          detectedGpuType = sysfsStats.type || detectedGpuType;
          if (sysfsStats.name) detectedGpuName = sysfsStats.name;
          if (!gpuDetectionLogged) {
            console.log(`[GPU Handler] ✅ GPU Linux vía sysfs: ${sysfsStats.name} (${sysfsStats.type})`);
            gpuDetectionLogged = true;
          }
          cachedGpuStats = sysfsStats;
          lastGpuCheck = now;
          isGpuQuerying = false;
          return cachedGpuStats;
        }
      } catch (err) {
        console.warn('[GPU Handler] ⚠️ Lectura sysfs GPU fallida:', err.message);
      }
      // Identidad mínima sin subprocesos externos
      try {
        const type = await detectGpuTypeOnce();
        if (type && type !== 'unknown') {
          cachedGpuStats = {
            ok: true,
            type,
            name: detectedGpuName || type,
            totalMB: null,
            usedMB: null,
            freeMB: null,
            usagePercent: null,
            gpuUtilization: null,
            temperature: null,
            note: 'Identidad DRM sin métricas'
          };
          lastGpuCheck = now;
          isGpuQuerying = false;
          return cachedGpuStats;
        }
      } catch (_) { /* ignore */ }
      cachedGpuStats = {
        ok: false,
        type: null,
        name: null,
        totalMB: null,
        usedMB: null,
        freeMB: null,
        usagePercent: null,
        gpuUtilization: null,
        temperature: null
      };
      lastGpuCheck = now;
      isGpuQuerying = false;
      return cachedGpuStats;
    }

    // 3. Windows/macOS: systeminformation + fallbacks nativos
    try {
      const si = require('systeminformation');
      const graphicsData = await Promise.race([
        si.graphics(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('si.graphics timeout')), 4000))
      ]);

      if (graphicsData && Array.isArray(graphicsData.controllers) && graphicsData.controllers.length > 0) {
        const classified = graphicsData.controllers
          .map((controller) => ({ controller, type: classifyControllerGpu(controller) }))
          .find((entry) => entry.type);
        let type = classified ? classified.type : null;
        if (classified) {
          detectedGpuType = classified.type;
          const label = classified.controller.name || classified.controller.model;
          if (label) detectedGpuName = label;
        }
        
        // Buscar el controlador de GPU que coincida con el tipo detectado (o que tenga estadísticas de memoria)
        let controller = null;
        if (type && type !== 'unknown') {
          controller = graphicsData.controllers.find(c => {
            const vendor = String(c.vendor || '').toLowerCase();
            const name = String(c.name || '').toLowerCase();
            const model = String(c.model || '').toLowerCase();
            if (type === 'nvidia' && (vendor.includes('nvidia') || name.includes('nvidia') || model.includes('nvidia'))) return true;
            if (type === 'amd' && (vendor.includes('amd') || vendor.includes('ati') || name.includes('radeon') || model.includes('radeon') || name.includes('amd') || model.includes('amd'))) return true;
            if (type === 'intel' && (vendor.includes('intel') || name.includes('intel') || model.includes('intel'))) return true;
            if (type === 'apple-metal' && (vendor.includes('apple') || name.includes('apple') || model.includes('apple'))) return true;
            return false;
          });
        }

        // Fallback a cualquier controlador con información de memoria si no se encuentra por tipo
        if (!controller) {
          controller = graphicsData.controllers.find(c => (c.memoryTotal || c.vram) > 0);
        }

        // Si aún no hay controller, usar el primero
        if (!controller) {
          controller = graphicsData.controllers[0];
        }

        const totalMB = controller.memoryTotal || controller.vram || null;
        const usedMB = typeof controller.memoryUsed === 'number' ? controller.memoryUsed : null;
        const gpuName = controller.name || controller.model || detectedGpuName || 'Graphics Card';
        const detectedType = type && type !== 'unknown' ? type : 
          (String(controller.vendor || '').toLowerCase().includes('nvidia') ? 'nvidia' :
           String(controller.vendor || '').toLowerCase().includes('amd') ? 'amd' :
           String(controller.vendor || '').toLowerCase().includes('intel') ? 'intel' : 'unknown');

        if (!gpuDetectionLogged || detectedGpuName !== gpuName) {
          console.log(`[GPU Handler] ✅ GPU detectada mediante systeminformation: ${gpuName} (${detectedType})`);
          gpuDetectionLogged = true;
          detectedGpuName = gpuName;
        }

        // Aunque no haya memoria usable, no encadenar wmic: ya tenemos identidad de GPU.
        cachedGpuStats = {
          ok: true,
          type: detectedType,
          name: gpuName,
          totalMB: (totalMB && !isNaN(totalMB)) ? totalMB : null,
          usedMB: (usedMB !== null && !isNaN(usedMB)) ? usedMB : null,
          freeMB: (totalMB && usedMB !== null && !isNaN(totalMB) && !isNaN(usedMB)) ? (totalMB - usedMB) : null,
          usagePercent: (totalMB && usedMB !== null && totalMB > 0) ? Math.round((usedMB / totalMB) * 100) : null,
          gpuUtilization: typeof controller.utilizationGpu === 'number'
            ? controller.utilizationGpu
            : ((totalMB && usedMB !== null && totalMB > 0) ? Math.round((usedMB / totalMB) * 100) : null),
          temperature: typeof controller.temperatureGpu === 'number' ? controller.temperatureGpu : null,
          driverVersion: controller.driverVersion || null,
          note: 'Detectado mediante systeminformation'
        };
        lastGpuCheck = now;
        isGpuQuerying = false;
        return cachedGpuStats;
      }
    } catch (err) {
      console.warn('[GPU Handler] ⚠️ Consulta a systeminformation fallida o sin memoria. Usando fallbacks nativos.', err.message);
    }

    try {
      const type = await detectGpuTypeOnce();
      const platform = process.platform;

      // NVIDIA (Windows): nvidia-smi solo fuera de Linux
      if (type === 'nvidia' && platform === 'win32') {
        if (now > nvidiaDisabledUntil) {
          try {
            const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,memory.used,utilization.gpu,temperature.gpu --format=csv,nounits,noheader', {
              timeout: 4000
            });
            const output = stdout.trim();

            if (output) {
              const lines = output.split('\n').filter(l => l.trim());
              if (lines.length > 0) {
                const [name, total, used, gpuUtil, temp] = lines[0].split(',').map(v => v.trim());
                const totalMB = parseInt(total);
                const usedMB = parseInt(used);
                const gpuUsage = parseInt(gpuUtil) || 0;
                const temperature = parseInt(temp) || null;

                if (totalMB && !isNaN(totalMB) && !isNaN(usedMB)) {
                  if (!gpuDetectionLogged || detectedGpuName !== name) {
                    console.log('[GPU Handler] ✅ GPU NVIDIA activa:', name);
                    gpuDetectionLogged = true;
                    detectedGpuName = name;
                  }
                  cachedGpuStats = {
                    ok: true,
                    type: 'nvidia',
                    name: name || detectedGpuName || 'NVIDIA GPU',
                    totalMB: totalMB,
                    usedMB: usedMB,
                    freeMB: totalMB - usedMB,
                    usagePercent: Math.round((usedMB / totalMB) * 100),
                    gpuUtilization: gpuUsage,
                    temperature: temperature,
                    driverVersion: null
                  };
                  lastGpuCheck = now;
                  isGpuQuerying = false;
                  return cachedGpuStats;
                }
              }
            }
          } catch (e) {
            console.warn('[GPU Handler] ⚠️ Consulta nvidia-smi fallida. Reintento en 30s.', e.message);
            nvidiaDisabledUntil = Date.now() + PENALTY_DURATION;
          }
        }
      }

      // AMD (Windows): sin rocm-smi en poll Linux
      else if (type === 'amd' && platform === 'win32') {
        // Continuar a fallback genérico más abajo
      }

      // Apple Metal
      else if (type === 'apple-metal') {
        try {
          const totalMemory = os.totalmem();
          const freeMemory = os.freemem();
          const usedMemory = totalMemory - freeMemory;
          const totalMB = Math.round(totalMemory / 1024 / 1024);
          const usedMB = Math.round(usedMemory / 1024 / 1024);

          if (detectedGpuName && detectedGpuName !== 'Apple Silicon') {
            cachedGpuStats = {
              ok: true,
              type: 'apple-metal',
              name: detectedGpuName,
              totalMB: totalMB,
              usedMB: usedMB,
              freeMB: totalMB - usedMB,
              usagePercent: Math.round((usedMB / totalMB) * 100),
              gpuUtilization: null,
              temperature: null,
              note: 'Apple Metal comparte memoria de sistema unificada'
            };
            lastGpuCheck = now;
            isGpuQuerying = false;
            return cachedGpuStats;
          }

          const { stdout } = await execAsync('system_profiler SPDisplaysDataType', { timeout: 3000 });
          if (stdout.includes('GPU')) {
            const nameMatch = stdout.match(/Chipset Model:\s*(.+)/);
            const gpuName = nameMatch ? nameMatch[1].trim() : 'Apple Silicon GPU';

            if (!gpuDetectionLogged || detectedGpuName !== gpuName) {
              console.log('[GPU Handler] ✅ GPU Apple Silicon detectada:', gpuName);
              gpuDetectionLogged = true;
              detectedGpuName = gpuName;
            }

            cachedGpuStats = {
              ok: true,
              type: 'apple-metal',
              name: gpuName,
              totalMB: totalMB,
              usedMB: usedMB,
              freeMB: totalMB - usedMB,
              usagePercent: Math.round((usedMB / totalMB) * 100),
              gpuUtilization: null,
              temperature: null,
              note: 'Apple Metal comparte memoria de sistema unificada'
            };
            lastGpuCheck = now;
            isGpuQuerying = false;
            return cachedGpuStats;
          }
        } catch (_) {}
      }

      // Fallback si no tenemos estadísticas específicas pero se detectó un nombre genérico
      if (detectedGpuName && detectedGpuType && detectedGpuType !== 'unknown') {
        cachedGpuStats = {
          ok: true,
          type: detectedGpuType,
          name: detectedGpuName,
          totalMB: null,
          usedMB: null,
          freeMB: null,
          usagePercent: null,
          gpuUtilization: null,
          temperature: null
        };
        lastGpuCheck = now;
        isGpuQuerying = false;
        return cachedGpuStats;
      }

      // Si no hay GPU detectada o falló todo, retornar objeto con ok: false
      const finalStats = {
        ok: false,
        type: null,
        name: null,
        totalMB: null,
        usedMB: null,
        freeMB: null,
        usagePercent: null,
        gpuUtilization: null,
        temperature: null
      };
      cachedGpuStats = finalStats;
      lastGpuCheck = now;
      isGpuQuerying = false;
      return finalStats;

    } catch (e) {
      console.error('[GPU Handler] Error general:', e);
      isGpuQuerying = false;
      return {
        ok: false,
        error: e?.message,
        type: null
      };
    }
  });

  // Handler para obtener procesos locales (System Monitor para terminales locales)
  ipcMain.handle('app:get-local-processes', async () => {
    try {
      const platform = process.platform;
      let command = '';

      if (platform === 'win32') {
        // Preferir tasklist (sin PowerShell/WMI). Fallback a systeminformation.
        try {
          const { stdout } = await execAsync('tasklist /FO CSV /NH', { timeout: 4000, windowsHide: true });
          const processes = String(stdout || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              // "name","pid","session","session#","mem"
              const cols = line.match(/("([^"]*)"|[^,]+)/g) || [];
              const clean = cols.map((c) => c.replace(/^"|"$/g, ''));
              const name = clean[0] || '';
              const pid = parseInt(clean[1], 10) || 0;
              const memRaw = String(clean[4] || '').replace(/[^\d]/g, '');
              const memKb = parseInt(memRaw, 10) || 0;
              return {
                pid,
                user: '',
                cpu: 0,
                mem: 0,
                rss: memKb * 1024,
                command: name
              };
            })
            .filter((p) => p.pid > 0);
          if (processes.length > 0) {
            return { success: true, processes };
          }
        } catch (_) {}

        const si = require('systeminformation');
        const data = await si.processes();
        return {
          success: true,
          processes: data.list.map(p => ({
            pid: p.pid,
            user: p.user,
            cpu: p.cpu,
            mem: p.mem,
            rss: p.memRss * 1024, // KB to Bytes
            command: p.command
          }))
        };
      } else {
        // macOS / Linux: ps aux es extremadamente rápido
        command = 'ps aux';
        const { stdout } = await execAsync(command, { timeout: 5000 });
        const processes = parseProcessList(stdout);
        return { success: true, processes };
      }
    } catch (err) {
      console.error('Error fetching local processes:', err);
      return { success: false, error: err.message };
    }
  });

  // Handler para abrir URL en navegadores específicos con Auto-Type / Clipboard seguro (H-12)
  ipcMain.handle('system:open-with-browser', async (event, { url, browser, privateMode, username, password, autoTypeMode = 'clipboard', autoClearSeconds = 30 }) => {
    try {
      const val = validateBrowserUrl(url);
      if (!val.valid) {
        return { ok: false, error: val.error };
      }
      const safeUrl = val.url;

      const launchBrowser = async () => {
        if (!browser || browser === 'default') {
          await shell.openExternal(safeUrl);
          return;
        }

        if (process.platform === 'win32') {
          const exePath = getWindowsBrowserPath(browser);
          const args = [];
          if (privateMode) {
            if (browser === 'firefox') args.push('-private-window');
            else if (browser === 'edge') args.push('-inprivate');
            else args.push('--incognito');
          }
          args.push(safeUrl);

          if (exePath) {
            const child = spawn(exePath, args, { detached: true, stdio: 'ignore' });
            child.on('error', async (err) => {
              console.warn(`[system:open-with-browser] Error iniciando ${browser}:`, err.message);
              try { await shell.openExternal(safeUrl); } catch (_) {}
            });
            child.unref();
            return;
          }

          // Fallback directo a binario sin pasar por shell/cmd.exe
          const fallbackExe = browser === 'edge' ? 'msedge.exe' : (browser === 'chrome' ? 'chrome.exe' : (browser === 'firefox' ? 'firefox.exe' : `${browser}.exe`));
          try {
            const child = spawn(fallbackExe, args, { detached: true, stdio: 'ignore' });
            child.on('error', async () => {
              try { await shell.openExternal(safeUrl); } catch (_) {}
            });
            child.unref();
          } catch (_) {
            await shell.openExternal(safeUrl);
          }
        } else if (process.platform === 'darwin') {
          const macApps = {
            chrome: 'Google Chrome',
            firefox: 'Firefox',
            edge: 'Microsoft Edge',
            brave: 'Brave Browser'
          };
          const appName = macApps[browser];
          if (!appName) {
            await shell.openExternal(safeUrl);
            return;
          }
          const args = ['-a', appName];
          if (privateMode) {
            args.push('--args');
            if (browser === 'firefox') args.push('-private-window');
            else if (browser === 'edge') args.push('-inprivate');
            else args.push('--incognito');
          }
          args.push(safeUrl);
          try {
            const child = spawn('open', args, { detached: true, stdio: 'ignore' });
            child.on('error', async () => {
              try { await shell.openExternal(safeUrl); } catch (_) {}
            });
            child.unref();
          } catch (_) {
            await shell.openExternal(safeUrl);
          }
        } else {
          // Linux
          const linuxBins = {
            chrome: 'google-chrome',
            firefox: 'firefox',
            edge: 'microsoft-edge',
            brave: 'brave-browser'
          };
          const bin = linuxBins[browser] || browser;
          const args = [];
          if (privateMode) {
            if (browser === 'firefox') args.push('-private-window');
            else if (browser === 'edge') args.push('-inprivate');
            else args.push('--incognito');
          }
          args.push(safeUrl);
          try {
            const child = spawn(bin, args, { detached: true, stdio: 'ignore' });
            child.on('error', async () => {
              try { await shell.openExternal(safeUrl); } catch (_) {}
            });
            child.unref();
          } catch (_) {
            await shell.openExternal(safeUrl);
          }
        }
      };

      await launchBrowser();

      // Manejo de credenciales (H-12): Seguro por defecto con Portapapeles y auto-clear en 30s (0s de retraso)
      const secretToCopy = password || username;
      if (secretToCopy) {
        if (autoTypeMode === 'legacy' || autoTypeMode === 'keystrokes') {
          if (process.platform === 'win32') {
            const escapeSendKeys = (text) => {
              if (!text) return '';
              return text.replace(/([+^%~{}()\[\]])/g, '{$1}');
            };

            const escapePowerShellSingleQuote = (text) => {
              if (!text) return '';
              return text.replace(/'/g, "''");
            };

            const mapUser = escapePowerShellSingleQuote(escapeSendKeys(username));
            const mapPass = escapePowerShellSingleQuote(escapeSendKeys(password));

            let psScript = 'Add-Type -AssemblyName System.Windows.Forms;\nStart-Sleep -Seconds 3;\n';
            if (username) psScript += `[System.Windows.Forms.SendKeys]::SendWait('${mapUser}');\n`;
            if (username && password) psScript += `[System.Windows.Forms.SendKeys]::SendWait('{TAB}');\n`;
            if (password) psScript += `[System.Windows.Forms.SendKeys]::SendWait('${mapPass}');\n`;
            if (password) psScript += `[System.Windows.Forms.SendKeys]::SendWait('{ENTER}');\n`;
            psScript += 'exit\n';

            const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', '-']);
            child.stdin.write(psScript);
            child.stdin.end();
            child.on('error', (err) => {
              console.error('Failed to start PowerShell process for Auto-Type:', err);
              if (username) clipboard.writeText(username);
            });
          } else if (process.platform === 'darwin') {
            const escapeAppleScript = (str) => {
              if (!str) return '';
              return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            };
            const userEscaped = escapeAppleScript(username);
            const passEscaped = escapeAppleScript(password);

            let appleScript = 'delay 3\ntell application "System Events"\n';
            if (username) appleScript += `keystroke "${userEscaped}"\n`;
            if (username && password) appleScript += `key code 48\n`; // Tab
            if (password) appleScript += `keystroke "${passEscaped}"\n`;
            if (password) appleScript += `key code 36\n`; // Return (Enter)
            appleScript += 'end tell\n';

            const child = spawn('osascript', []);
            let stderr = '';
            child.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            child.on('close', (code) => {
              if (code !== 0) {
                console.error(`osascript exited with code ${code}. Stderr: ${stderr}`);
                if (username) clipboard.writeText(username);
              }
            });
            child.stdin.write(appleScript);
            child.stdin.end();
            child.on('error', (err) => {
              console.error('Failed to start osascript process for Auto-Type:', err);
              if (username) clipboard.writeText(username);
            });
          } else if (process.platform === 'linux') {
            const escapeLinux = (str) => {
              if (!str) return '';
              return str.replace(/'/g, "'\\''");
            };
            const userEscaped = escapeLinux(username);
            const passEscaped = escapeLinux(password);

            let bashCommand = 'sleep 3; ';
            if (username) bashCommand += `xdotool type --delay 10 '${userEscaped}'; `;
            if (username && password) bashCommand += `xdotool key Tab; `;
            if (password) bashCommand += `xdotool type --delay 10 '${passEscaped}'; `;
            if (password) bashCommand += `xdotool key Return; `;

            const child = spawn('bash', ['-s']);
            child.on('error', (err) => {
              console.warn('Error executing Auto-Type via xdotool (¿está instalado xdotool?):', err);
              if (username) clipboard.writeText(username);
            });
            child.stdin.write(bashCommand);
            child.stdin.end();
          }
          return { ok: true, mode: 'legacy' };
        } else {
          // Modo por defecto seguro (H-12): Copia al portapapeles sin espera (0s delay) y auto-clear en 30s
          setClipboardWithAutoClear(secretToCopy, autoClearSeconds * 1000);
          return {
            ok: true,
            mode: 'clipboard',
            copiedField: password ? 'password' : 'username',
            autoClearSeconds
          };
        }
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  });
}

module.exports = {
  registerSystemHandlers,
  registerSystemMonitoringHandlers,
  getWindowsBrowserPath,
  validateBrowserUrl,
  validateImportFilePath,
  setClipboardWithAutoClear,
  cancelClipboardAutoClear,
  getCurrentAutoClearSecret: () => currentAutoClearSecret,
  getAutoClearTimer: () => passwordAutoClearTimer
};
