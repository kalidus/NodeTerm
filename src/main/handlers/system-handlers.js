const { ipcMain, clipboard, dialog, BrowserWindow, app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
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
  console.log('📋 [registerSystemHandlers] Iniciando registro de handlers del sistema...');
  
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
  console.log('✅ [registerSystemHandlers] Handler get-user-home registrado');

  // Handler para listar archivos locales
  ipcMain.handle('local:list-files', async (event, dirPath) => {
    try {
      console.log('📁 [local:list-files] Handler INVOCADO con path:', dirPath);
      
      if (!dirPath || typeof dirPath !== 'string') {
        console.error('❌ [local:list-files] Path inválido:', dirPath);
        return { success: false, error: 'Path inválido' };
      }

      // Normalizar el path (asegurar que exista)
      const normalizedPath = path.normalize(dirPath);
      console.log('📁 [local:list-files] Path normalizado:', normalizedPath);

      // Verificar que el directorio existe
      try {
        const stat = fs.statSync(normalizedPath);
        if (!stat.isDirectory()) {
          console.error('❌ [local:list-files] Path no es un directorio:', normalizedPath);
          return { success: false, error: 'El path no es un directorio' };
        }
      } catch (statError) {
        console.error('❌ [local:list-files] Error verificando directorio:', statError.message);
        return { success: false, error: `El directorio no existe o no es accesible: ${statError.message}` };
      }

      console.log('📁 [local:list-files] Leyendo directorio...');
      const entries = await fs.promises.readdir(normalizedPath, { withFileTypes: true });
      console.log('📁 [local:list-files] Entradas encontradas:', entries.length);

      const files = entries.map(entry => {
        try {
          const fullPath = path.join(normalizedPath, entry.name);
          const stat = fs.statSync(fullPath);
          
          // Detectar si el archivo está oculto
          // En Windows y Unix: archivos que empiezan con punto están ocultos
          // También verificar atributo hidden en Windows si está disponible
          let isHidden = entry.name.startsWith('.');
          
          // En Windows, también verificar el atributo del sistema
          if (process.platform === 'win32' && !isHidden) {
            try {
              // Usar fs.constants para verificar atributos (más eficiente)
              const fs = require('fs');
              // Los archivos ocultos en Windows tienen el bit FILE_ATTRIBUTE_HIDDEN
              // Por ahora, usamos solo la heurística del punto para ser más rápido
              // Si necesitamos verificar atributos reales, habría que usar otra API
            } catch {
              // Ignorar errores de verificación
            }
          }
          
          return {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stat.size,
            modified: stat.mtime.toISOString(),
            path: fullPath,
            hidden: isHidden
          };
        } catch (entryError) {
          console.warn('⚠️ [local:list-files] Error procesando entrada:', entry.name, entryError.message);
          // Retornar entrada básica si hay error al obtener stat
          const isHidden = entry.name.startsWith('.');
          return {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: 0,
            modified: new Date().toISOString(),
            path: path.join(normalizedPath, entry.name),
            hidden: isHidden
          };
        }
      });

      console.log('✅ [local:list-files] Archivos procesados:', files.length);
      return { success: true, files };
    } catch (error) {
      console.error('❌ [local:list-files] Error completo:', error);
      console.error('❌ [local:list-files] Stack:', error.stack);
      return { success: false, error: error.message || 'Error desconocido al listar archivos' };
    }
  });
  console.log('✅ [registerSystemHandlers] Handler local:list-files registrado');

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

  // Variable estática para cachear la detección de GPU (evitar logs repetidos)
  let gpuDetectionLogged = false;
  let detectedGpuType = null;
  let detectedGpuName = null;

  // Handler para obtener estadísticas de GPU (mejorado con más información)
  ipcMain.handle('system:get-gpu-stats', async () => {
    try {
      const { execSync } = require('child_process');
      const platform = process.platform;

      // NVIDIA CUDA
      if (platform === 'win32' || platform === 'linux' || platform === 'darwin') {
        try {
          // Intenta nvidia-smi con más información (nombre, memoria, temperatura, uso)
          const output = execSync('nvidia-smi --query-gpu=name,memory.total,memory.used,utilization.gpu,temperature.gpu --format=csv,nounits,noheader', {
            encoding: 'utf-8',
            timeout: 3000
          }).trim();

          if (output) {
            const lines = output.split('\n').filter(l => l.trim());
            if (lines.length > 0) {
              const [name, total, used, gpuUtil, temp] = lines[0].split(',').map(v => v.trim());
              const totalMB = parseInt(total);
              const usedMB = parseInt(used);
              const gpuUsage = parseInt(gpuUtil) || 0;
              const temperature = parseInt(temp) || null;

              if (totalMB && !isNaN(totalMB) && !isNaN(usedMB)) {
                // Solo loguear la primera vez que se detecta
                if (!gpuDetectionLogged || detectedGpuType !== 'nvidia' || detectedGpuName !== name) {
                  console.log('[GPU Handler] ✅ GPU NVIDIA detectada:', name);
                  gpuDetectionLogged = true;
                  detectedGpuType = 'nvidia';
                  detectedGpuName = name;
                }
                return {
                  ok: true,
                  type: 'nvidia',
                  name: name || 'NVIDIA GPU',
                  totalMB: totalMB,
                  usedMB: usedMB,
                  freeMB: totalMB - usedMB,
                  usagePercent: Math.round((usedMB / totalMB) * 100),
                  gpuUtilization: gpuUsage, // Uso de GPU (0-100)
                  temperature: temperature, // Temperatura en °C
                  driverVersion: null // Se puede obtener con otro comando si es necesario
                };
              }
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
              timeout: 3000
            });
            const data = JSON.parse(output);
            if (data && data.gpu_memory_use && data.gpu_memory_use.length > 0) {
              const used = parseInt(data.gpu_memory_use[0]);
              const total = parseInt(data.gpu_memory_tot[0]);
              // Intentar obtener nombre del modelo
              let gpuName = 'AMD GPU';
              try {
                const nameOutput = execSync('rocm-smi --showproductname', {
                  encoding: 'utf-8',
                  timeout: 2000
                });
                const nameMatch = nameOutput.match(/Product Name:\s*(.+)/);
                if (nameMatch) gpuName = nameMatch[1].trim();
              } catch (e) {
                // No se pudo obtener nombre
              }
              
              if (total && !isNaN(used) && !isNaN(total)) {
                // Solo loguear la primera vez que se detecta
                if (!gpuDetectionLogged || detectedGpuType !== 'amd' || detectedGpuName !== gpuName) {
                  console.log('[GPU Handler] ✅ GPU AMD (ROCm) detectada:', gpuName);
                  gpuDetectionLogged = true;
                  detectedGpuType = 'amd';
                  detectedGpuName = gpuName;
                }
                return {
                  ok: true,
                  type: 'amd',
                  name: gpuName,
                  totalMB: total,
                  usedMB: used,
                  freeMB: total - used,
                  usagePercent: Math.round((used / total) * 100),
                  gpuUtilization: null, // ROCm no expone esto fácilmente
                  temperature: null, // Se puede obtener con otro comando
                  driverVersion: null
                };
              }
            }
          } catch (e) {
            // No es AMD o rocm-smi no disponible
          }
        }

        // AMD en Windows (usando wmic)
        if (platform === 'win32') {
          try {
            const output = execSync('wmic path win32_VideoController get name', {
              encoding: 'utf-8',
              timeout: 2000
            });
            const lines = output.split('\n').filter(l => l.trim() && !l.includes('Name') && !l.includes('----'));
            const amdGpus = lines.filter(l => l.toLowerCase().includes('amd') || l.toLowerCase().includes('radeon'));
            if (amdGpus.length > 0) {
              const gpuName = amdGpus[0].trim();
              // Solo loguear la primera vez que se detecta
              if (!gpuDetectionLogged || detectedGpuType !== 'amd' || detectedGpuName !== gpuName) {
                console.log('[GPU Handler] ✅ GPU AMD detectada en Windows:', gpuName);
                gpuDetectionLogged = true;
                detectedGpuType = 'amd';
                detectedGpuName = gpuName;
              }
              // Windows no expone VRAM fácilmente sin drivers específicos
              return {
                ok: true,
                type: 'amd',
                name: gpuName,
                totalMB: null,
                usedMB: null,
                freeMB: null,
                usagePercent: null,
                gpuUtilization: null,
                temperature: null,
                note: 'AMD en Windows requiere drivers AMD para mostrar VRAM'
              };
            }
          } catch (e) {
            // No se pudo detectar AMD en Windows
          }
        }

        // Apple Silicon (Metal)
        if (platform === 'darwin') {
          try {
            const output = execSync('system_profiler SPDisplaysDataType', {
              encoding: 'utf-8',
              timeout: 3000
            });
            if (output.includes('GPU')) {
              // Intentar extraer nombre del GPU
              const nameMatch = output.match(/Chipset Model:\s*(.+)/);
              const gpuName = nameMatch ? nameMatch[1].trim() : 'Apple Silicon GPU';
              // Solo loguear la primera vez que se detecta
              if (!gpuDetectionLogged || detectedGpuType !== 'apple-metal' || detectedGpuName !== gpuName) {
                console.log('[GPU Handler] ✅ GPU Apple Silicon detectada:', gpuName);
                gpuDetectionLogged = true;
                detectedGpuType = 'apple-metal';
                detectedGpuName = gpuName;
              }
              // Apple Silicon no expone VRAM de forma directa
              return {
                ok: true,
                type: 'apple-metal',
                name: gpuName,
                totalMB: null,
                usedMB: null,
                freeMB: null,
                usagePercent: null,
                gpuUtilization: null,
                temperature: null,
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
        name: null,
        totalMB: null,
        usedMB: null,
        freeMB: null,
        usagePercent: null,
        gpuUtilization: null,
        temperature: null
      };
    } catch (e) {
      return {
        ok: false,
        error: e?.message,
        type: null
      };
    }
  });
  
  console.log('✅ [registerSystemHandlers] Todos los handlers del sistema registrados correctamente');
}

module.exports = {
  registerSystemHandlers
};
