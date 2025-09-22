const { ipcMain, clipboard, dialog, BrowserWindow, app, shell } = require('electron');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Handlers para funcionalidades del sistema
 * - Clipboard (leer/escribir texto)
 * - Diálogos (guardar/abrir archivos)
 * - Importación de archivos
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
function hashFileSync(path) {
  try {
    const data = fs.readFileSync(path);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Registra todos los handlers del sistema
 */
function registerSystemHandlers() {
  
  // === CLIPBOARD HANDLERS ===
  
  // Handler para leer texto del clipboard
  ipcMain.handle('clipboard:readText', () => {
    return clipboard.readText();
  });

  // Handler para escribir texto al clipboard
  ipcMain.handle('clipboard:writeText', (event, text) => {
    clipboard.writeText(text);
  });

  // === DIALOG HANDLERS ===
  
  // Handler para mostrar el diálogo de guardado
  ipcMain.handle('dialog:show-save-dialog', async (event, options) => {
    const win = BrowserWindow.getFocusedWindow();
    return await dialog.showSaveDialog(win, options);
  });

  // Handler para mostrar el diálogo de selección (abrir carpeta/archivo)
  ipcMain.handle('dialog:show-open-dialog', async (event, options) => {
    const win = BrowserWindow.getFocusedWindow();
    // Asegurar propiedades por defecto si no vienen
    const safeOptions = {
      properties: ['openDirectory'],
      ...options
    };
    return await dialog.showOpenDialog(win, safeOptions);
  });

  // === IMPORT HANDLERS ===
  
  // Handler para obtener información de archivo
  ipcMain.handle('import:get-file-info', async (event, filePath) => {
    const stat = safeStatSync(filePath);
    if (!stat) return { ok: false };
    return { ok: true, mtimeMs: stat.mtimeMs, size: stat.size };
  });

  // Handler para obtener hash de archivo
  ipcMain.handle('import:get-file-hash', async (event, filePath) => {
    const hash = hashFileSync(filePath);
    if (!hash) return { ok: false };
    return { ok: true, hash };
  });

  // Handler para leer contenido de archivo
  ipcMain.handle('import:read-file', async (event, filePath) => {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return { ok: true, content: data };
    } catch (e) {
      return { ok: false, error: e?.message };
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
      await shell.openExternal(url);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  });

  // Handler para encontrar el archivo XML más reciente en descargas
  ipcMain.handle('import:find-latest-xml-download', async (event, { sinceMs } = {}) => {
    try {
      const downloadsDir = app.getPath('downloads');
      const entries = fs.readdirSync(downloadsDir).filter(name => name.toLowerCase().endsWith('.xml'));
      let latest = null;
      
      for (const name of entries) {
        const fullPath = require('path').join(downloadsDir, name);
        const stat = safeStatSync(fullPath);
        if (!stat) continue;
        
        // Si se especifica sinceMs, filtrar por fecha
        if (sinceMs && stat.mtimeMs <= sinceMs) continue;
        
        if (!latest || stat.mtimeMs > latest.mtimeMs) {
          latest = { name, path: fullPath, mtimeMs: stat.mtimeMs };
        }
      }
      
      return { ok: true, latest };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  });
}

module.exports = {
  registerSystemHandlers
};
