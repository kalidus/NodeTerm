const { ipcMain, clipboard, dialog, BrowserWindow, app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { parseProcessList } = require('../utils/parsing-utils');

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
 * 🚀 CRÍTICO: Registra handlers del sistema que son necesarios para la UI inicial
 * Solo incluye Clipboard y Dialog que son esenciales para el funcionamiento básico
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
      
      const safePath = path.resolve(filePath.trim());
      
      // Verificación básica: No permitir leer archivos de configuración sensibles directamente si no es necesario
      const fileName = path.basename(safePath).toLowerCase();
      if (fileName === 'id_rsa' || fileName === '.env' || fileName === 'security.json') {
        console.warn(`⚠️ [Security] Intento de lectura bloqueado para archivo sensible: ${fileName}`);
        return { ok: false, error: 'Acceso denegado a archivos sensibles del sistema' };
      }

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
      // ✅ VALIDACIÓN DE SEGURIDAD: Solo permitir protocolos web seguros
      if (!url || typeof url !== 'string') return { ok: false, error: 'URL inválida' };
      
      const trimmedUrl = url.trim();
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        console.warn('⚠️ [Security] Intento de abrir protocolo no seguro:', trimmedUrl);
        return { ok: false, error: 'Solo se permiten protocolos http:// y https://' };
      }

      await shell.openExternal(trimmedUrl);
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

      // ✅ VALIDACIÓN DE SEGURIDAD: Sanear el nombre del archivo para evitar path traversal
      const safeFileName = path.basename(fileName);
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `nodeterm-upload-${Date.now()}-${safeFileName}`);

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

  // Variable estática para cachear la detección de GPU (evitar logs repetidos y mejorar performance)
  let gpuDetectionLogged = false;
  let detectedGpuType = null;
  let detectedGpuName = null;
  let cachedGpuStats = null;
  let lastGpuCheck = 0;
  const GPU_CACHE_TTL = 15000; // 15 segundos de caché para evitar bloqueos del Main Process

  // Handler para obtener estadísticas de GPU (mejorado con más información)
  ipcMain.handle('system:get-gpu-stats', async () => {
    const now = Date.now();

    // 🚀 OPTIMIZACIÓN: Retornar caché si es reciente
    if (cachedGpuStats && (now - lastGpuCheck < GPU_CACHE_TTL)) {
      return cachedGpuStats;
    }

    try {
      const { execSync } = require('child_process');
      const platform = process.platform;

      // NVIDIA CUDA
      if (platform === 'win32' || platform === 'linux' || platform === 'darwin') {
        try {
          // Intenta nvidia-smi con más información (nombre, memoria, temperatura, uso)
          const output = execSync('nvidia-smi --query-gpu=name,memory.total,memory.used,utilization.gpu,temperature.gpu --format=csv,nounits,noheader', {
            encoding: 'utf-8',
            timeout: 2000 // Reducido de 3000ms a 2000ms
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
                const stats = {
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
                cachedGpuStats = stats;
                lastGpuCheck = now;
                return stats;
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
                const stats = {
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
                cachedGpuStats = stats;
                lastGpuCheck = now;
                return stats;
              }
            }
          } catch (e) {
            // No es AMD o rocm-smi no disponible
          }
        }

        // Windows (AMD e Intel)
        if (platform === 'win32') {
          try {
            // Obtener todas las controladoras de video con su VRAM (aproximada)
            const output = execSync('wmic path win32_VideoController get name,AdapterRAM /format:csv', {
              encoding: 'utf-8',
              timeout: 3000
            }).trim();

            if (output) {
              const lines = output.split('\n').filter(l => l.trim() && !l.includes('AdapterRAM') && !l.includes('Node'));
              const gpus = lines.map(line => {
                const parts = line.split(',');
                if (parts.length >= 3) {
                  return {
                    name: parts[2].trim(),
                    ram: parseInt(parts[1]) || 0
                  };
                }
                return null;
              }).filter(g => g && g.name);

              if (gpus.length > 0) {
                // Filtrar para evitar duplicar NVIDIA si ya se detectó arriba (aunque nvidia-smi tiene prioridad)
                // Priorizar AMD/ATI o Intel
                const gpu = gpus.find(g => (g.name.toLowerCase().includes('amd') || g.name.toLowerCase().includes('radeon') || g.name.toLowerCase().includes('ati'))) ||
                  gpus.find(g => g.name.toLowerCase().includes('intel')) ||
                  gpus[0];

                if (gpu) {
                  const gpuName = gpu.name;
                  const totalMB = Math.round(gpu.ram / 1024 / 1024);
                  const isIntel = gpuName.toLowerCase().includes('intel');
                  const isAmd = gpuName.toLowerCase().includes('amd') || gpuName.toLowerCase().includes('radeon') || gpuName.toLowerCase().includes('ati');
                  const type = isIntel ? 'intel' : (isAmd ? 'amd' : 'integrated');

                  if (!gpuDetectionLogged || detectedGpuType !== type || detectedGpuName !== gpuName) {
                    console.log(`[GPU Handler] ✅ GPU ${type.toUpperCase()} detectada en Windows:`, gpuName);
                    gpuDetectionLogged = true;
                    detectedGpuType = type;
                    detectedGpuName = gpuName;
                  }

                  const stats = {
                    ok: true,
                    type: type,
                    name: gpuName,
                    totalMB: totalMB > 0 ? totalMB : null,
                    usedMB: null,
                    freeMB: totalMB > 0 ? totalMB : null,
                    usagePercent: null,
                    gpuUtilization: null,
                    temperature: null,
                    note: 'Estadísticas limitadas en Windows WMIC'
                  };
                  cachedGpuStats = stats;
                  lastGpuCheck = now;
                  return stats;
                }
              }
            }
          } catch (e) {
            // No se pudo detectar vía wmic
          }
        }

        // Apple Silicon (Metal) - 🚀 OPTIMIZACIÓN: Si ya se detectó, no volver a ejecutar system_profiler
        if (platform === 'darwin') {
          try {
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const totalMB = Math.round(totalMemory / 1024 / 1024);
            const usedMB = Math.round(usedMemory / 1024 / 1024);

            if (detectedGpuType === 'apple-metal' && detectedGpuName) {
              const stats = {
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
              cachedGpuStats = stats;
              lastGpuCheck = now;
              return stats;
            }

            const output = execSync('system_profiler SPDisplaysDataType', {
              encoding: 'utf-8',
              timeout: 2000 // Reducido para evitar cuelgues largos
            });
            if (output.includes('GPU')) {
              // Intentar extraer nombre del GPU
              const nameMatch = output.match(/Chipset Model:\s*(.+)/);
              const gpuName = nameMatch ? nameMatch[1].trim() : 'Apple Silicon GPU';

              if (!gpuDetectionLogged || detectedGpuType !== 'apple-metal' || detectedGpuName !== gpuName) {
                console.log('[GPU Handler] ✅ GPU Apple Silicon detectada:', gpuName);
                gpuDetectionLogged = true;
                detectedGpuType = 'apple-metal';
                detectedGpuName = gpuName;
              }

              const stats = {
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
              cachedGpuStats = stats;
              lastGpuCheck = now;
              return stats;
            }
          } catch (e) {
            // No disponible
          }
        }
      }

      // Si no hay GPU detectada
      // Si no hay GPU detectada, cachear el resultado negativo
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
      return finalStats;
    } catch (e) {
      const errorStats = {
        ok: false,
        error: e?.message,
        type: null
      };
      // No cachear errores fatales por si son temporales
      return errorStats;
    }
  });

  // Handler para obtener procesos locales (System Monitor para terminales locales)
  ipcMain.handle('app:get-local-processes', async () => {
    try {
      const platform = process.platform;
      let command = '';

      if (platform === 'win32') {
        // En Windows, systeminformation es más robusto para esto, 
        // pero para rapidez usaremos un comando nativo si fuera posible.
        // Por ahora, usamos systeminformation que ya está instalado y es cross-platform.
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

  // Handler para abrir URL en navegadores específicos con Auto-Type automático en Windows
  ipcMain.handle('system:open-with-browser', async (event, { url, browser, privateMode, username, password }) => {
    try {
      if (!url || typeof url !== 'string') return { ok: false, error: 'URL inválida' };
      const trimmedUrl = url.trim();
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        console.warn('⚠️ [Security] Intento de abrir protocolo no seguro:', trimmedUrl);
        return { ok: false, error: 'Solo se permiten protocolos http:// y https://' };
      }

      // Evitar caracteres maliciosos para inyección de comandos
      if (/["`;|&]/.test(trimmedUrl)) {
        return { ok: false, error: 'URL contiene caracteres no permitidos' };
      }

      let command = '';
      if (process.platform === 'win32') {
        if (browser === 'chrome') {
          command = privateMode ? `start chrome --incognito "${trimmedUrl}"` : `start chrome "${trimmedUrl}"`;
        } else if (browser === 'firefox') {
          command = privateMode ? `start firefox -private-window "${trimmedUrl}"` : `start firefox "${trimmedUrl}"`;
        } else if (browser === 'edge') {
          command = privateMode ? `start msedge -inprivate "${trimmedUrl}"` : `start msedge "${trimmedUrl}"`;
        } else {
          await shell.openExternal(trimmedUrl);
          if (username) clipboard.writeText(username);
          return { ok: true };
        }
      } else if (process.platform === 'darwin') {
        if (browser === 'chrome') {
          command = privateMode ? `open -a "Google Chrome" --args --incognito "${trimmedUrl}"` : `open -a "Google Chrome" "${trimmedUrl}"`;
        } else if (browser === 'firefox') {
          command = privateMode ? `open -a "Firefox" --args -private-window "${trimmedUrl}"` : `open -a "Firefox" "${trimmedUrl}"`;
        } else if (browser === 'edge') {
          command = privateMode ? `open -a "Microsoft Edge" --args -inprivate "${trimmedUrl}"` : `open -a "Microsoft Edge" "${trimmedUrl}"`;
        } else {
          await shell.openExternal(trimmedUrl);
          if (username) clipboard.writeText(username);
          return { ok: true };
        }
      } else { // linux
        if (browser === 'chrome') {
          command = privateMode ? `google-chrome --incognito "${trimmedUrl}"` : `google-chrome "${trimmedUrl}"`;
        } else if (browser === 'firefox') {
          command = privateMode ? `firefox -private-window "${trimmedUrl}"` : `firefox "${trimmedUrl}"`;
        } else if (browser === 'edge') {
          command = privateMode ? `microsoft-edge -inprivate "${trimmedUrl}"` : `microsoft-edge "${trimmedUrl}"`;
        } else {
          await shell.openExternal(trimmedUrl);
          if (username) clipboard.writeText(username);
          return { ok: true };
        }
      }

      // Ejecutar apertura del navegador
      exec(process.platform === 'win32' ? `cmd.exe /c ${command}` : command, (err) => {
        if (err) {
          console.error(`Error opening browser ${browser}:`, err);
        }
      });

      // Ejecutar Auto-Type en segundo plano si hay credenciales
      if (username || password) {
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

          const { spawn } = require('child_process');
          const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', '-']);
          child.stdin.write(psScript);
          child.stdin.end();
          child.on('error', (err) => {
            console.error('Failed to start PowerShell process for Auto-Type:', err);
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

          const { spawn } = require('child_process');
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

          exec(bashCommand, (err) => {
            if (err) {
              console.warn('Error executing Auto-Type via xdotool (¿está instalado xdotool?):', err);
              if (username) clipboard.writeText(username);
            }
          });
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
  registerSystemMonitoringHandlers
};
