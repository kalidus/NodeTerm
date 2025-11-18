const { ipcMain, clipboard, dialog, BrowserWindow, app, shell } = require('electron');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

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
    // ✅ VALIDACIÓN CRÍTICA: Validar input antes de procesar
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return { ok: false, error: 'filePath inválido o vacío' };
    }
    const stat = safeStatSync(filePath.trim());
    if (!stat) return { ok: false, error: 'No se pudo obtener información del archivo' };
    return { ok: true, mtimeMs: stat.mtimeMs, size: stat.size };
  });

  // Handler para obtener hash de archivo
  ipcMain.handle('import:get-file-hash', async (event, filePath) => {
    // ✅ VALIDACIÓN CRÍTICA: Validar input antes de procesar
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return { ok: false, error: 'filePath inválido o vacío' };
    }
    const hash = hashFileSync(filePath.trim());
    if (!hash) return { ok: false, error: 'No se pudo calcular el hash del archivo' };
    return { ok: true, hash };
  });

  // Handler para leer contenido de archivo
  ipcMain.handle('import:read-file', async (event, filePath) => {
    try {
      // ✅ VALIDACIÓN CRÍTICA: Validar input antes de procesar
      if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
        return { ok: false, error: 'filePath inválido o vacío' };
      }
      const safePath = filePath.trim();
      const data = fs.readFileSync(safePath, 'utf-8');
      return { ok: true, content: data };
    } catch (e) {
      return { ok: false, error: e?.message || 'Error desconocido al leer archivo' };
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

  // === FILE DROP HANDLERS ===
  
  // Handler para obtener el path de un archivo usando webUtils.getPathForFile
  // En Electron con contextIsolation, necesitamos usar webUtils desde el main process
  ipcMain.handle('file:get-path-for-file', async (event, fileIndex) => {
    try {
      const { webContents } = require('electron');
      const sender = webContents.fromId(event.sender.id);
      
      if (!sender || !sender.webUtils) {
        return { ok: false, error: 'webUtils not available' };
      }
      
      // Ejecutar código en el renderer para obtener el objeto File y usar webUtils
      // webUtils.getPathForFile solo está disponible en el main process
      const pathResult = await sender.executeJavaScript(`
        (async () => {
          try {
            const files = window.__lastDroppedFiles || [];
            if (files.length <= ${fileIndex} || !files[${fileIndex}]) {
              return { ok: false, error: 'File not found' };
            }
            
            const file = files[${fileIndex}];
            
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
      const path = require('path');
      const os = require('os');
      const fs = require('fs').promises;
      
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `nodeterm-upload-${Date.now()}-${fileName}`);
      
      // Convertir ArrayBuffer a Buffer y escribir
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(tempFilePath, buffer);
      
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

  // Handler para obtener estadísticas de GPU
  ipcMain.handle('system:get-gpu-stats', async () => {
    try {
      const { execSync } = require('child_process');
      const platform = process.platform;

      // NVIDIA CUDA
      if (platform === 'win32' || platform === 'linux' || platform === 'darwin') {
        try {
          // Intenta nvidia-smi (disponible en NVIDIA GPUs)
          const output = execSync('nvidia-smi --query-gpu=memory.total,memory.used --format=csv,nounits,noheader', {
            encoding: 'utf-8',
            timeout: 2000
          }).trim();

          if (output) {
            const [total, used] = output.split(',').map(v => parseInt(v.trim()));
            if (total && !isNaN(total) && !isNaN(used)) {
              console.log('[GPU Handler] ✅ GPU NVIDIA detectada');
              return {
                ok: true,
                type: 'nvidia',
                totalMB: total,
                usedMB: used,
                freeMB: total - used,
                usagePercent: Math.round((used / total) * 100)
              };
            }
          }
        } catch (e) {
          // No es NVIDIA o nvidia-smi no disponible
        }

        // AMD ROCm (Linux)
        if (platform === 'linux') {
          try {
            const output = execSync('rocm-smi --showmeminfo --json', {
              encoding: 'utf-8',
              timeout: 2000
            });
            const data = JSON.parse(output);
            if (data && data.gpu_memory_use && data.gpu_memory_use.length > 0) {
              const used = parseInt(data.gpu_memory_use[0]);
              const total = parseInt(data.gpu_memory_tot[0]);
              if (total && !isNaN(used) && !isNaN(total)) {
                console.log('[GPU Handler] ✅ GPU AMD (ROCm) detectada');
                return {
                  ok: true,
                  type: 'amd',
                  totalMB: total,
                  usedMB: used,
                  freeMB: total - used,
                  usagePercent: Math.round((used / total) * 100)
                };
              }
            }
          } catch (e) {
            // No es AMD o rocm-smi no disponible
          }
        }

        // Apple Silicon (Metal)
        if (platform === 'darwin') {
          try {
            const output = execSync('system_profiler SPDisplaysDataType', {
              encoding: 'utf-8',
              timeout: 2000
            });
            if (output.includes('GPU Memory')) {
              console.log('[GPU Handler] ✅ GPU Apple Silicon detectada');
              // Apple Silicon no expone VRAM de forma directa, retornamos placeholder
              return {
                ok: true,
                type: 'apple-metal',
                totalMB: null,
                usedMB: null,
                freeMB: null,
                usagePercent: null,
                note: 'Apple Metal no expone datos de VRAM'
              };
            }
          } catch (e) {
            // No disponible
          }
        }
      }

      // Si no hay GPU detectada
      return {
        ok: false,
        type: null,
        totalMB: null,
        usedMB: null,
        freeMB: null,
        usagePercent: null
      };
    } catch (e) {
      return {
        ok: false,
        error: e?.message,
        type: null
      };
    }
  });
}

module.exports = {
  registerSystemHandlers
};
