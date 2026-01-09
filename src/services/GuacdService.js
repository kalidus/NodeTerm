const { spawn, exec, execFile } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Electron app handle (may be undefined in non-Electron contexts)
let electronApp = null;
try {
  // Lazy require to avoid issues in non-Electron contexts
  // eslint-disable-next-line global-require
  electronApp = require('electron').app;
} catch (_) {
  electronApp = null;
}

function fileExistsSync(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch (_) {
    return false;
  }
}

function getUserDataDir() {
  try {
    if (electronApp && typeof electronApp.getPath === 'function') {
      return electronApp.getPath('userData');
    }
  } catch (_) {}
  // Fallback para contextos sin Electron: usar carpeta en el home
  return path.join(os.homedir(), '.nodeterm');
}

/**
 * Devuelve la carpeta local del host donde se almacenarán los archivos
 * redirigidos como unidad compartida para RDP (Guacamole).
 * Asegura su existencia.
 */
function ensureDriveHostDir() {
  // 1) Permitir override por variable de entorno
  const envDir = process.env.NODETERM_GUAC_DRIVE_DIR || process.env.GUAC_DRIVE_DIR;
  if (typeof envDir === 'string' && envDir.trim().length > 0) {
    const target = envDir.trim();
    try { if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true }); } catch {}
    if (fs.existsSync(target)) return target;
  }

  // 2) Intentar en Descargas del usuario: <Downloads>/NodeTerm Drive
  try {
    let downloadsBase = null;
    if (electronApp && typeof electronApp.getPath === 'function') {
      downloadsBase = electronApp.getPath('downloads');
    }
    if (!downloadsBase) {
      downloadsBase = path.join(os.homedir(), 'Downloads');
    }
    const downloadsDir = path.join(downloadsBase, 'NodeTerm Drive');
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
    if (fs.existsSync(downloadsDir)) return downloadsDir;
  } catch (_) {}

  // 3) Fallback: userData/GuacamoleDrive
  const base = getUserDataDir();
  const dir = path.join(base, 'GuacamoleDrive');
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (_) {
    // 4) Último recurso: carpeta temporal
    try {
      const fallback = path.join(os.tmpdir(), 'NodeTerm-GuacamoleDrive');
      if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
      return fallback;
    } catch {}
  }
  return dir;
}

/**
 * Detecta si una ruta es incompatible con el sistema operativo actual
 */
function isPathIncompatibleWithOS(inputPath) {
  try {
    if (typeof inputPath !== 'string' || !inputPath.trim()) return false;
    
    const trimmedPath = inputPath.trim();
    const currentPlatform = process.platform;
    
    // Detectar rutas de Windows en sistemas no-Windows
    if (currentPlatform !== 'win32' && /^[A-Za-z]:[\\/]/.test(trimmedPath)) {
      return true;
    }
    
    // Detectar rutas de Unix en Windows (menos común pero posible)
    if (currentPlatform === 'win32' && trimmedPath.startsWith('/') && !trimmedPath.startsWith('//')) {
      return true;
    }
    
    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Normaliza una ruta para el sistema operativo actual
 */
function normalizePathForCurrentOS(inputPath) {
  try {
    if (typeof inputPath !== 'string' || !inputPath.trim()) {
      return ensureDriveHostDir();
    }
    
    const trimmedPath = inputPath.trim();
    const currentPlatform = process.platform;
    
    // Si la ruta es incompatible, usar la ruta por defecto
    if (isPathIncompatibleWithOS(trimmedPath)) {
      return ensureDriveHostDir();
    }
    
    // Normalizar separadores de ruta según el SO
    const normalizedPath = currentPlatform === 'win32' 
      ? trimmedPath.replace(/\//g, '\\')
      : trimmedPath.replace(/\\/g, '/');
    
    // Verificar que la ruta existe y es accesible
    try {
      if (!fs.existsSync(normalizedPath)) {
        return ensureDriveHostDir();
      }
      
      // Verificar permisos de escritura
      fs.accessSync(normalizedPath, fs.constants.W_OK);
      return normalizedPath;
    } catch (error) {
      return ensureDriveHostDir();
    }
  } catch (_) {
    return ensureDriveHostDir();
  }
}

/**
 * Convierte una ruta de Windows (C:\\Users\\...) a su ruta equivalente en WSL (/mnt/c/Users/...).
 * Si no parece una ruta de Windows, devuelve el input tal cual.
 */
function toWslPath(winPath) {
  try {
    if (process.platform !== 'win32') return winPath;
    if (typeof winPath !== 'string' || winPath.length < 2) return winPath;
    // Normalizar y resolver
    let normalized = path.resolve(winPath);
    // Extraer letra de unidad
    const driveLetterMatch = normalized.match(/^[A-Za-z]:/);
    if (!driveLetterMatch) return normalized.replace(/\\/g, '/');
    const driveLetter = driveLetterMatch[0][0].toLowerCase();
    const withoutDrive = normalized.substring(2).replace(/\\/g, '/');
    return `/mnt/${driveLetter}${withoutDrive}`;
  } catch (_) {
    return winPath;
  }
}

/**
 * Convierte una ruta local a una ruta accesible por el servidor RDP remoto.
 * - Windows: convierte a ruta WSL (/mnt/c/...)
 * - macOS/Linux con Docker: devuelve /guacdrive (ruta dentro del contenedor)
 * - macOS/Linux nativo: devuelve la ruta tal cual
 */
function toRemoteAccessiblePath(localPath, method = '') {
  try {
    if (process.platform === 'win32') {
      // En Windows, convertir a ruta WSL para que el servidor RDP remoto pueda acceder
      return toWslPath(localPath);
    } else if (method === 'docker') {
      // Para Docker en macOS/Linux, devolver la ruta dentro del contenedor
      return '/guacdrive';
    } else {
      // Para método nativo en macOS/Linux, devolver la ruta tal cual
      return localPath;
    }
  } catch (_) {
    return localPath;
  }
}

function resolveGuacdZipCandidates() {
  const unique = new Set();
  const pushIfExists = (p) => { if (fileExistsSync(p)) unique.add(p); };

  // Rutas base a inspeccionar
  const baseDirs = [
    path.join(__dirname, '..', '..', 'binaries')
  ];
  if (process && typeof process.resourcesPath === 'string' && process.resourcesPath) {
    baseDirs.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'binaries'));
    baseDirs.push(path.join(process.resourcesPath, 'binaries'));
    baseDirs.push(path.join(process.resourcesPath, 'app.asar', 'binaries'));
  }

  // 1) Candidatos explícitos guacd.zip
  for (const base of baseDirs) {
    pushIfExists(path.join(base, 'guacd.zip'));
  }

  // 2) Cualquier ZIP que empiece por guacd (ignorar fuentes "guacamole-server-*.zip")
  for (const base of baseDirs) {
    try {
      const entries = fs.readdirSync(base, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const nameLower = entry.name.toLowerCase();
        if (!nameLower.endsWith('.zip')) continue;
        if (!nameLower.startsWith('guacd')) continue; // evitar guacamole-server-*.zip (solo fuentes)
        pushIfExists(path.join(base, entry.name));
      }
    } catch (err) {
      // ✅ MEJORADO: Log en desarrollo para debugging de problemas de archivos
      if (process.env.NODE_ENV === 'development') {
        console.warn('[GuacdService] Error leyendo directorio de guacd:', err?.message || err);
      }
    }
  }

  // Ordenar por tamaño (desc) para priorizar el más grande (más probable que esté completo)
  const result = Array.from(unique);
  try {
    result.sort((a, b) => {
      const sa = fs.statSync(a).size || 0;
      const sb = fs.statSync(b).size || 0;
      return sb - sa;
    });
  } catch (err) {
    // ✅ MEJORADO: Log en desarrollo si falla el ordenamiento
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GuacdService] Error ordenando archivos guacd:', err?.message || err);
    }
  }
  return result;
}

function findGuacdExeUnder(rootDir, maxDepth = 6) {
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isFile()) {
        const fileNameLower = entry.name.toLowerCase();
        if (fileNameLower === 'guacd.exe') {
          return fullPath; // aceptar en cualquier subcarpeta
        }
      } else if (entry.isDirectory() && maxDepth > 0) {
        const found = findGuacdExeUnder(fullPath, maxDepth - 1);
        if (found) return found;
      }
    }
  } catch (_) {}
  return null;
}

async function extractZip(zipPath, extractPath) {
  await fs.promises.mkdir(extractPath, { recursive: true });
  // Intento 1: unzipper puro
  try {
    // Lazy require unzipper to avoid cost if not needed
    // eslint-disable-next-line global-require
    const unzipper = require('unzipper');
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .on('error', reject)
        .pipe(unzipper.Extract({ path: extractPath }))
        .on('close', resolve)
        .on('error', reject);
    });
    return;
  } catch (e) {
    console.warn('⚠️ unzipper falló:', e?.message || e);
  }

  // Intento 2 (Windows): PowerShell Expand-Archive
  if (process.platform === 'win32') {
    await new Promise((resolve, reject) => {
      const cmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Expand-Archive -Path \"${zipPath}\" -DestinationPath \"${extractPath}\" -Force"`;
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Expand-Archive error: ${stderr || err.message}`));
          return;
        }
        resolve();
      });
    });
    return;
  }

  // Si llegamos aquí, no hay más métodos
  throw new Error('No se pudo extraer el ZIP con los métodos disponibles');
}

async function ensureGuacdExtracted() {
  const installRootDir = path.join(getUserDataDir(), 'guacd');

  // Si ya existe, intentar detectar el ejecutable
  let exePath = findGuacdExeUnder(installRootDir);
  if (exePath) {
    return { exePath, cwd: path.dirname(exePath) };
  }

  // Buscar el ZIP en los posibles orígenes (dev / prod)
  const zipCandidates = resolveGuacdZipCandidates();
  if (!zipCandidates || zipCandidates.length === 0) {
    console.log('❌ No se encontró binaries/guacd.zip en el bundle.');
    // Intentar descarga automática como último recurso (solo Windows por ahora)
    if (process.platform === 'win32') {
      const downloaded = await attemptDownloadAndExtract(installRootDir);
      if (downloaded) {
        const exeAfter = findGuacdExeUnder(installRootDir);
        if (exeAfter) {
          return { exePath: exeAfter, cwd: path.dirname(exeAfter) };
        }
      }
    }
    return null;
  }

  const zipPath = zipCandidates[0];
  console.log('📦 Encontrado paquete guacd.zip en:', zipPath);
  console.log('📂 Extrayendo guacd a:', installRootDir);
  try {
    await extractZip(zipPath, installRootDir);
  } catch (e) {
    console.error('❌ Error extrayendo guacd.zip:', e?.message || e);
    // Intentar descarga automática como fallback (solo Windows)
    if (process.platform === 'win32') {
      console.log('🌐 Intentando descarga automática de guacd.zip como fallback...');
      const downloaded = await attemptDownloadAndExtract(installRootDir);
      if (!downloaded) return null;
    } else {
      return null;
    }
  }

  exePath = findGuacdExeUnder(installRootDir);
  if (exePath) {
    return { exePath, cwd: path.dirname(exePath) };
  }

  console.log('❌ No se encontró guacd.exe tras la extracción.');
  return null;
}

// === Descarga automática de guacd (Windows) ===
// No existen binarios oficiales precompilados de guacd.exe para Windows en GitHub.
// Por lo tanto, nuestra estrategia es:
// 1) Priorizar un ZIP preempaquetado en binaries/guacd.zip (que contenga los binarios ya compilados)
// 2) Como último recurso, descargar el código fuente oficial (guacamole-server-*.zip) y mostrar mensaje claro
//    indicando que no se puede compilar automáticamente en Windows. Esto evita URLs rotas de binarios inexistentes.
const GUACAMOLE_SERVER_VERSION = '1.6.0';
const CUSTOM_GUACD_URL = process.env.GUACD_ZIP_URL || process.env.NODETERM_GUACD_ZIP_URL || '';
const DEFAULT_GUACD_DOWNLOAD_URLS = [
  // Fuente oficial (código fuente, no binario)
  `https://github.com/apache/guacamole-server/archive/refs/tags/${GUACAMOLE_SERVER_VERSION}.zip`
];

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    try {
      const https = require('https');
      const file = fs.createWriteStream(destPath);
      const req = https.get(url, (res) => {
        if (res.statusCode !== 200) {
          try { file.close(); } catch {}
          try { fs.unlinkSync(destPath); } catch {}
          resolve(false);
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      });
      req.on('error', () => {
        try { file.close(); } catch {}
        try { fs.unlinkSync(destPath); } catch {}
        resolve(false);
      });
    } catch (_) {
      resolve(false);
    }
  });
}

async function attemptDownloadAndExtract(installRootDir) {
  try {
    if (process.platform !== 'win32') return false;
    await fs.promises.mkdir(installRootDir, { recursive: true });
    const tempZip = path.join(installRootDir, 'guacd.zip');

    const downloadCandidates = [];
    if (typeof CUSTOM_GUACD_URL === 'string' && CUSTOM_GUACD_URL.trim().length > 0) {
      downloadCandidates.push(CUSTOM_GUACD_URL.trim());
    }
    downloadCandidates.push(...DEFAULT_GUACD_DOWNLOAD_URLS);

    for (const url of downloadCandidates) {
      console.log('⬇️ Descargando guacd desde:', url);
      const ok = await downloadFile(url, tempZip);
      if (!ok) {
        console.log('❌ Descarga fallida, probando siguiente URL...');
        continue;
      }
      try {
        console.log('📂 Extrayendo zip descargado...');
        await extractZip(tempZip, installRootDir);
        try { fs.unlinkSync(tempZip); } catch {}
        // Intentar encontrar guacd.exe dentro de lo extraído (no debería existir en zip de fuentes)
        const exeMaybe = findGuacdExeUnder(installRootDir);
        if (exeMaybe) {
          console.log('✅ Descarga y extracción completadas (binarios presentes)');
          return true;
        }
        console.warn('⚠️ El ZIP descargado no contiene binarios de guacd.exe (probablemente es código fuente).');
        console.warn('   Por favor, incluye un binaries/guacd.zip con binarios precompilados en el bundle.');
        return false;
      } catch (e) {
        console.log('❌ Extracción del zip descargado falló:', e?.message || e);
      }
    }
  } catch (e) {
    console.log('❌ Error en attemptDownloadAndExtract:', e?.message || e);
  }
  return false;
}

class GuacdService {
  constructor() {
    this.guacdProcess = null;
    this.isRunning = false;
    this.port = 4822;
    this.host = '127.0.0.1'; // Usar IPv4 específicamente
    this.platform = process.platform;
    // Método preferido configurable: docker | wsl | native | mock (según SO)
    this.preferredMethod = (process.env.NODETERM_GUACD_METHOD || process.env.GUACD_METHOD || 'docker').toLowerCase();
    this.detectedMethod = null;
    this.wslDistro = null;
    // Si detectamos guacd en WSL escuchando solo en 127.0.0.1, Windows no podrá acceder via localhost-forwarding.
    // Usamos este flag para forzar un reinicio con bind 0.0.0.0.
    this.wslNeedsRebind = false;
    // Logs detallados (debug) para guacd (por defecto: off)
    this.debug = process.env.NODETERM_DEBUG_GUACD === '1';
    // Mutex: evitar inicializaciones concurrentes
    this._initializePromise = null;
    this.driveHostDir = ensureDriveHostDir();
    // Health check interval para WSL (cada 30 segundos)
    this._healthCheckInterval = null;
    this._lastHealthCheck = Date.now();
    this._healthCheckFailures = 0;
  }

  _debug(...args) {
    if (this.debug) console.log(...args);
  }

  /**
   * Inicia el health check periódico para WSL
   * Verifica que guacd sigue vivo y accesible con una conexión TCP real
   */
  _startHealthCheck() {
    // Solo para WSL
    if (this.detectedMethod !== 'wsl') return;
    
    // Limpiar intervalo anterior si existe
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
    }
    
    console.log('🏥 [GuacdService] Health check para WSL iniciado (cada 15s)');
    
    this._healthCheckInterval = setInterval(async () => {
      try {
        // Hacer una conexión TCP real para verificar que guacd responde
        const isHealthy = await this._checkGuacdConnection();
        
        if (!isHealthy) {
          this._healthCheckFailures++;
          console.warn(`⚠️ [GuacdService] Health check fallido (${this._healthCheckFailures}/2): guacd no responde`);
          
          if (this._healthCheckFailures >= 2) {
            console.error('🚨 [GuacdService] guacd en WSL dejó de responder. Reiniciando...');
            this._healthCheckFailures = 0;
            
            // Intentar reiniciar guacd en WSL
            try {
              await this._restartGuacdInWSL();
            } catch (e) {
              console.error('❌ [GuacdService] Error reiniciando guacd:', e?.message);
            }
          }
        } else {
          if (this._healthCheckFailures > 0) {
            console.log('✅ [GuacdService] Health check OK: guacd respondiendo');
          }
          this._healthCheckFailures = 0;
          this._lastHealthCheck = Date.now();
        }
      } catch (e) {
        console.warn('⚠️ [GuacdService] Error en health check:', e?.message);
      }
    }, 15000); // Cada 15 segundos (más frecuente)
  }
  
  /**
   * Verifica la conexión a guacd con una conexión TCP real
   * @returns {Promise<boolean>} true si guacd responde correctamente
   */
  async _checkGuacdConnection() {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          try { socket.destroy(); } catch {}
        }
      };
      
      socket.setTimeout(3000); // 3 segundos de timeout
      
      socket.on('connect', () => {
        // Conexión exitosa - guacd está escuchando
        cleanup();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        cleanup();
        resolve(false);
      });
      
      socket.on('error', () => {
        cleanup();
        resolve(false);
      });
      
      socket.on('close', () => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      });
      
      try {
        socket.connect(this.port, this.host);
      } catch {
        cleanup();
        resolve(false);
      }
    });
  }
  
  /**
   * Detiene el health check periódico
   */
  _stopHealthCheck() {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
      console.log('🏥 [GuacdService] Health check detenido');
    }
  }
  
  /**
   * Reinicia guacd en WSL si dejó de responder
   */
  async _restartGuacdInWSL() {
    if (this.detectedMethod !== 'wsl') return;
    
    const wslExec = (args, cb) => execFile('wsl.exe', ['-u', 'root', '--', ...args], { encoding: 'utf8' }, cb);
    
    // Matar procesos guacd existentes
    await new Promise((r) => wslExec(['sh', '-lc', 'pkill -9 guacd || true'], () => r()));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reiniciar guacd
    const bindIp = '0.0.0.0';
    const guacdCmd = '/usr/sbin/guacd';
    const startCmd = `${guacdCmd} -b ${bindIp} -l ${this.port} >/var/log/guacd-wsl.log 2>&1`;
    
    await new Promise((r) => wslExec(['sh', '-lc', startCmd], () => r()));
    
    // Esperar a que el puerto esté escuchando
    const waitReadyCmd = `for i in $(seq 1 30); do ss -tln 2>/dev/null | grep -E ":${this.port}\\b" && echo READY && break; sleep 0.2; done`;
    await new Promise((r) => wslExec(['sh', '-lc', waitReadyCmd], () => r()));
    
    // Verificar que esté accesible
    const isAvailable = await this.isPortAvailable(this.port);
    if (!isAvailable) {
      console.log('✅ [GuacdService] guacd reiniciado correctamente en WSL');
      this.isRunning = true;
    } else {
      console.error('❌ [GuacdService] No se pudo reiniciar guacd en WSL');
    }
  }

  /**
   * Inicializa el servicio guacd automáticamente
   * Intenta Docker primero, luego fallback a binarios nativos
   */
  async initialize() {
    if (this._initializePromise) {
      return this._initializePromise;
    }

    this._initializePromise = (async () => {
      try {
      // Evitar inicialización múltiple
      if (this.isRunning) {
        console.log('✅ GuacdService ya está corriendo, omitiendo inicialización...');
        return true;
      }

      // Primero verificar si guacd ya está corriendo
      const portAvailable = await this.isPortAvailable(this.port);
      if (!portAvailable) {
        this._debug('🔍 Detectado puerto ocupado, verificando si guacd está accesible...');
        
        // Intentar detectar el método automáticamente
        await this.detectRunningMethod();

        // Caso especial: WSL detectado pero mal configurado (solo 127.0.0.1 dentro de WSL)
        if (this.detectedMethod === 'wsl' && this.wslNeedsRebind) {
          console.log('⚠️ guacd en WSL está escuchando solo en 127.0.0.1. Reiniciando para bind 0.0.0.0...');
          try {
            await this.stop(); // stop() en WSL hace pkill dentro de WSL (por defecto)
          } catch {}
          this.wslNeedsRebind = false;
          // Continuar con el inicio normal más abajo
        }

        // Si no se detectó método o está mal configurado, matar procesos existentes y reiniciar
        if (!this.detectedMethod) {
          console.log('⚠️ Proceso guacd detectado pero no está bien configurado, limpiando procesos existentes...');
          // Intentar matar procesos guacd en WSL por defecto SIEMPRE (sin depender de isRunning)
          if (process.platform === 'win32') {
            this._debug('🧹 Matando procesos guacd en WSL por defecto...');
            execFile('wsl.exe', ['-u', 'root', '--', 'sh', '-lc', 'pkill -9 guacd || true'], () => {});
          }
          // Continuar con el inicio normal más abajo
        } else {
          // El proceso está bien configurado y accesible
          this.isRunning = true;
          const methodLabel = (this.detectedMethod || 'unknown').toUpperCase();
          console.log(`✅ guacd ya está corriendo y accesible en puerto ${this.port} (método: ${methodLabel})`);

          // Si hay una preferencia explícita y lo detectado no coincide, intentar cambiar
          const desired = (this.preferredMethod === 'wsl') ? 'wsl' : (this.preferredMethod === 'docker' ? 'docker' : null);
          if (desired && this.detectedMethod && this.detectedMethod !== desired) {
            console.log(`🔁 Preferencia actual: ${desired}. Método preexistente detectado: ${this.detectedMethod}. Reiniciando según preferencia...`);
            try {
              await this.stop();
            } catch {}
            // Continuar con el inicio normal más abajo
          } else {
            // Verificar una vez más que realmente sea accesible
            const finalCheck = await this.isPortAvailable(this.port);
            if (!finalCheck) {
              console.log(`🔌 Conectado con ${methodLabel} (preexistente)`);
              
              // Iniciar health check para WSL preexistente
              if (this.detectedMethod === 'wsl') {
                this._startHealthCheck();
              }
              
              return true;
            } else {
              console.log('⚠️ El proceso parece haberse detenido, continuando con inicio normal...');
              // Continuar con el inicio normal más abajo
            }
          }
        }
      }

      // Orden dinámico según preferencia y SO
      const isWindows = this.platform === 'win32';
      const isMacOS = this.platform === 'darwin';
      // Windows: solo docker, wsl, mock (no hay guacd nativo)
      // macOS: solo docker, mock (no hay guacd nativo)
      // Linux: docker, native, mock (guacd nativo disponible)
      const all = isWindows ? ['docker', 'wsl', 'mock'] : 
                  isMacOS ? ['docker', 'mock'] : 
                  ['docker', 'native', 'mock'];
      const pref = all.includes(this.preferredMethod) ? this.preferredMethod : 'docker';
      const rest = all.filter(m => m !== pref);
      const orderedMethods = [pref, ...rest];

      for (const method of orderedMethods) {
        try {
          if (method === 'docker') {
            if (await this.startWithDocker()) { this.detectedMethod = 'docker'; console.log('🔌 Conectado con DOCKER'); return true; }
          } else if (method === 'wsl') {
            if (await this.startWithWSL()) { this.detectedMethod = 'wsl'; console.log('🔌 Conectado con WSL'); return true; }
          } else if (method === 'native') {
            if (await this.startWithNative()) { this.detectedMethod = 'native'; console.log('🔌 Conectado con NATIVE'); return true; }
          } else if (method === 'mock') {
            if (await this.startMockMode()) { this.detectedMethod = 'mock'; console.log('🔌 Conectado con MOCK'); return true; }
          }
        } catch (e) {
          // Error intentando método
        }
      }

      throw new Error('No se pudo iniciar guacd con ningún método');
      } catch (error) {
        console.error('❌ Error inicializando GuacdService:', error);
        return false;
      } finally {
        this._initializePromise = null;
      }
    })();

    return this._initializePromise;
  }

  setPreferredMethod(method) {
    const m = String(method || '').toLowerCase();
    if (m === 'docker' || m === 'wsl' || m === 'mock') {
      this.preferredMethod = m;
    }
  }

  /**
   * Reinicia el servicio guacd con la preferencia actual
   */
  async restart() {
    try {
      console.log('🔄 Reiniciando GuacdService con preferencia:', this.preferredMethod);
      
      // Detener el servicio actual si está corriendo
      if (this.isRunning) {
        await this.stop();
      }
      
      // Limpiar estado
      this.isRunning = false;
      this.detectedMethod = null;
      
      // Pequeña pausa para asegurar que el puerto se libere
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reinicializar con la nueva preferencia
      return await this.initialize();
    } catch (error) {
      console.error('❌ Error reiniciando GuacdService:', error);
      return false;
    }
  }

  /**
   * Intenta iniciar guacd usando Docker
   */
  async startWithDocker() {
    return new Promise((resolve) => {
      // Verificar si Docker está disponible y corriendo
      // En aplicaciones empaquetadas, usar PATH completo para Docker
      const dockerCommand = process.platform === 'darwin' ? 
        '/usr/local/bin/docker' : 
        process.platform === 'win32' ? 
          'docker.exe' : 
          'docker';
      
      // Verificando Docker
      
      exec(`${dockerCommand} --version`, (error) => {
        if (error) {
          console.log('❌ Docker no está disponible:', error.message);
          // Intentar con docker sin ruta completa
          if (dockerCommand !== 'docker') {
            exec('docker --version', (error2) => {
              if (error2) {
                resolve(false);
                return;
              }
              // Continuar con docker genérico
              this._checkDockerRunning(resolve);
            });
            return;
          }
          resolve(false);
          return;
        }
        // Continuar con el comando que funcionó
        this._checkDockerRunning(resolve, dockerCommand);
      });
    });
  }

  _checkDockerRunning(resolve, dockerCommand = 'docker') {
    // Verificar si Docker Desktop está corriendo
      exec(`${dockerCommand} ps`, (dockerError) => {
        if (dockerError) {
          console.log('❌ Docker Desktop no está corriendo');
          resolve(false);
          return;
        }

      // Intentar iniciar contenedor guacd con imagen multi-arquitectura
      const dockerArgs = [
        'run',
        '--name', 'nodeterm-guacd',
        '--rm', // Eliminar contenedor al salir
        '-d', // Modo detached
        '-p', `${this.port}:4822`,
        // Montar carpeta de staging del host dentro del contenedor
        // Importante: pasar como un único argumento host:container
        '-v', `${this.driveHostDir}:/guacdrive`,
        'guacamole/guacd:latest' // Usar tag latest para mejor compatibilidad multi-arquitectura
      ];

      this.guacdProcess = spawn(dockerCommand, dockerArgs);

      this.guacdProcess.stdout.on('data', (data) => {
        // Docker stdout
      });

      this.guacdProcess.stderr.on('data', (data) => {
        // Docker stderr
      });

      this.guacdProcess.on('error', (error) => {
        console.error('❌ Error ejecutando Docker:', error);
        resolve(false);
      });

      this.guacdProcess.on('close', (code) => {
        // Docker proceso cerrado
      });

      // Esperar un momento y verificar si el contenedor está corriendo (optimizado)
      setTimeout(async () => {
        try {
          // Verificar si el puerto está disponible (cerrado = guacd corriendo)
          const available = await this.isPortAvailable(this.port);
          if (!available) {
            this.isRunning = true;
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          resolve(false);
        }
      }, 1500);
    });
  }

  /**
   * Fuerza la recreación del contenedor Docker con la nueva carpeta
   */
  async _forceDockerContainerRecreation() {
    try {
      console.log('[GuacdService] Deteniendo contenedor Docker existente...');
      
      // Detener y eliminar el contenedor existente
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      try {
        await execAsync('docker stop nodeterm-guacd');
        console.log('[GuacdService] Contenedor detenido exitosamente');
      } catch (error) {
        console.log('[GuacdService] Contenedor no estaba corriendo o ya fue eliminado');
      }
      
      try {
        await execAsync('docker rm nodeterm-guacd');
        console.log('[GuacdService] Contenedor eliminado exitosamente');
      } catch (error) {
        console.log('[GuacdService] Contenedor no existía o ya fue eliminado');
      }
      
      // Reiniciar guacd con la nueva configuración
      console.log('[GuacdService] Reiniciando guacd con nueva carpeta:', this.driveHostDir);
      this.isRunning = false;
      await this.startWithDocker();
      
    } catch (error) {
      console.error('[GuacdService] Error recreando contenedor Docker:', error);
    }
  }

  /**
   * Método público para forzar la recreación del contenedor Docker
   */
  async forceDockerRecreation() {
    console.log('[GuacdService] Forzando recreación del contenedor Docker...');
    await this._forceDockerContainerRecreation();
  }

  /**
   * Intenta iniciar guacd usando binarios nativos
   * NOTA: Solo disponible en Linux (Windows y macOS usan Docker)
   */
  async startWithNative() {
    return new Promise(async (resolve) => {
      const platform = process.platform;
      const isWindows = platform === 'win32';
      const isMacOS = platform === 'darwin';

      // En Windows y macOS, guacd nativo no está disponible
      if (isWindows || isMacOS) {
        console.log('❌ guacd nativo no está disponible en', isWindows ? 'Windows' : 'macOS', '. Usa Docker.');
        resolve(false);
        return;
      }

      // Buscar guacd en diferentes ubicaciones predefinidas (solo Linux)
      const userDataInstallDir = path.join(getUserDataDir(), 'guacd');
      const possiblePaths = [
        // PATH del sistema
        'guacd',
        // Copias locales en el workspace (dev)
        path.join(__dirname, '..', '..', 'binaries', 'guacd', 'guacd'),
        path.join(__dirname, '..', '..', 'binaries', 'guacd', 'bin', 'guacd'),
        // Instalación previa en userData (prod)
        path.join(userDataInstallDir, 'bin', 'guacd')
      ];

      let guacdPath = null;
      let spawnCwd = null;

      // Verificar cada ubicación conocida
      for (const testPath of possiblePaths) {
        try {
          await new Promise((testResolve) => {
            exec(`"${testPath}" --version`, (error) => {
              if (!error) {
                guacdPath = testPath;
                spawnCwd = path.dirname(testPath);
                console.log(`✅ guacd encontrado en: ${testPath}`);
              }
              testResolve();
            });
          });
          if (guacdPath) break;
        } catch (_) {
          // continuar
        }
      }

      // Si no se encontró, intentar auto-extraer desde binaries/guacd.zip
      if (!guacdPath) {
        console.log('🔎 guacd no encontrado. Intentando auto-extracción...');
        const extracted = await ensureGuacdExtracted();
        if (extracted && extracted.exePath) {
          // Validar ejecutable
          try {
            await new Promise((testResolve) => {
              exec(`"${extracted.exePath}" --version`, (error) => {
                if (!error) {
                  guacdPath = extracted.exePath;
                  spawnCwd = extracted.cwd || path.dirname(extracted.exePath);
                  console.log(`✅ guacd preparado en: ${guacdPath}`);
                }
                testResolve();
              });
            });
          } catch (_) {}
        }
      }

      if (!guacdPath) {
        console.log('❌ guacd nativo no disponible.');
        console.log('💡 Sugerencias:');
        console.log('   - Instala guacd desde el repositorio de tu distribución Linux');
        console.log('   - O usa Docker para usar el contenedor guacamole/guacd');
        resolve(false);
        return;
      }

      // Iniciar guacd nativo
      console.log(`🚀 Iniciando guacd desde: ${guacdPath}`);
      try {
        const finalCwd = spawnCwd || path.dirname(guacdPath);
        const envVars = { ...process.env };
        // Asegurar resolución de DLLs desde el directorio del ejecutable (solo Windows)
        if (isWindows) {
          try {
            envVars.PATH = `${finalCwd};${envVars.PATH || ''}`;
          } catch (_) {}
        }
        // Intentar configurar ruta de plugins de FreeRDP si existe
        try {
          const pluginsDir = path.join(finalCwd, '..', 'lib', 'freerdp2');
          if (fileExistsSync(pluginsDir)) {
            envVars.FREERDP_PLUGIN_PATH = pluginsDir;
            console.log('🔧 FREERDP_PLUGIN_PATH =', pluginsDir);
          }
        } catch (_) {}

        this.guacdProcess = spawn(guacdPath, ['-f', '-p', this.port.toString()], {
          cwd: finalCwd,
          env: envVars
        });
      } catch (spawnError) {
        console.error('❌ Error lanzando guacd:', spawnError);
        resolve(false);
        return;
      }

      this.guacdProcess.stdout.on('data', (data) => {
        console.log('guacd stdout:', data.toString());
      });

      this.guacdProcess.stderr.on('data', (data) => {
        console.log('guacd stderr:', data.toString());
      });

      this.guacdProcess.on('error', (error) => {
        console.error('Error ejecutando guacd nativo:', error);
        resolve(false);
      });

      // Esperar un momento y verificar si está corriendo (optimizado)
      setTimeout(async () => {
        try {
          const available = await this.isPortAvailable(this.port);
          if (!available) {
            this.isRunning = true;
            console.log('✅ Native guacd iniciado exitosamente');
            resolve(true);
          } else {
            console.log('❌ Native guacd no se pudo iniciar');
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Error verificando Native guacd:', error);
          resolve(false);
        }
      }, 1500);
    });
  }

  /**
   * Intenta iniciar guacd dentro de WSL (Ubuntu/Debian)
   */
  async startWithWSL() {
    return new Promise(async (resolve) => {
      // Usar la distribución WSL por defecto del sistema (sin especificar -d)
      this.wslDistro = null;

      const wslExec = (args, cb) => execFile('wsl.exe', ['-u', 'root', '--', ...args], { encoding: 'utf8' }, cb);

      // Comprobar rápidamente que WSL responde (sin listar distribuciones)
      wslExec(['sh', '-lc', 'true'], async (pingErr) => {
        if (pingErr) {
          console.log('❌ WSL no está disponible:', pingErr.message);
          resolve(false);
          return;
        }

        // Verificar si guacd está disponible, e instalarlo automáticamente si no existe
        let guacdAvailable = false;
        let guacdPath = null;
        await new Promise((r) => wslExec(['sh', '-lc', 'command -v guacd'], (e, out) => {
          const result = String(out || '').trim();
          if (result && !e) {
            guacdAvailable = true;
            guacdPath = result;
          } else {
            guacdAvailable = false;
          }
          r();
        }));
        
        if (!guacdAvailable) {
          console.log('📦 guacd no está instalado en WSL. Instalando automáticamente...');
          let installSuccess = false;
          await new Promise((r) => {
            const installCmd = 'export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y -qq guacd >/dev/null 2>&1 && echo INSTALL_OK || echo INSTALL_FAILED';
            wslExec(['sh', '-lc', installCmd], (installErr, installOut) => {
              const installResult = String(installOut || '').trim();
              if (installResult.includes('INSTALL_OK')) {
                installSuccess = true;
                console.log('✅ guacd instalado correctamente en WSL');
              } else {
                console.error('❌ No se pudo instalar guacd automáticamente en WSL.');
                console.error('   Por favor, instálalo manualmente con:');
                console.error('   wsl -- sudo apt-get update && sudo apt-get install -y guacd');
                console.error('   O usa Docker Desktop como alternativa.');
              }
              r();
            });
          });
          
          if (!installSuccess) {
            resolve(false);
            return;
          }
        }

        // NO crear directorio en WSL - se usará la carpeta del host convertida con toWslPath()

        // Verificar si el puerto está ocupado dentro de WSL antes de intentar iniciar
        let portInUse = false;
        await new Promise((r) => wslExec(['sh', '-lc', `ss -tln 2>/dev/null | grep -E ":${this.port}\\b" >/dev/null && echo YES || echo NO`], (e, out) => {
          const result = String(out || '').trim();
          portInUse = result === 'YES';
          r();
        }));
        
        if (portInUse) {
          console.log(`⚠️ El puerto ${this.port} está ocupado en WSL. Intentando detener procesos guacd existentes...`);
          // Intentar detener procesos guacd existentes
          await new Promise((r) => wslExec(['sh', '-lc', 'pkill -9 guacd || true'], () => r()));
          // Esperar un momento para que el puerto se libere
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Verificar nuevamente
          await new Promise((r) => wslExec(['sh', '-lc', `ss -tln 2>/dev/null | grep -E ":${this.port}\\b" >/dev/null && echo YES || echo NO`], (e, out) => {
            const result = String(out || '').trim();
            portInUse = result === 'YES';
            r();
          }));
          if (portInUse) {
            console.error(`❌ El puerto ${this.port} sigue ocupado en WSL después de intentar detener guacd.`);
            console.error('   Por favor, verifica manualmente con: wsl -- ss -tln | grep 4822');
            resolve(false);
            return;
          }
        }

        // WSL2 usa red virtualizada con NAT. Para que funcione localhost forwarding:
        // - guacd debe escuchar en 0.0.0.0 dentro de WSL (todas las interfaces)
        // - Windows conecta via localhost:4822 (WSL2 reenvía automáticamente)
        const bindIp = '0.0.0.0';
        
        // Establecer el host ANTES de iniciar para evitar race conditions
        // Windows usará localhost gracias al localhost forwarding de WSL2
        this.host = '127.0.0.1';
        
        console.log(`🔧 [WSL] guacd bind: ${bindIp}:${this.port} → Windows accede via ${this.host}:${this.port}`);
        // IMPORTANTE (WSL): no usar `-f` (foreground) + `&` desde `sh -lc`, porque el proceso puede morir al cerrar el shell.
        // Dejamos que guacd demonize normalmente para que permanezca vivo.
        // Asegurar que el directorio de logs existe y usar la ruta correcta de guacd
        const guacdCmd = guacdPath || '/usr/sbin/guacd';
        const startCmd = `mkdir -p /var/log && ${guacdCmd} -b ${bindIp} -l ${this.port} >/var/log/guacd-wsl.log 2>&1 || echo "__GUACD_START_FAILED__"`;
        wslExec(['sh', '-lc', startCmd], async (startErr, startOut) => {
          if (startErr) {
            console.log('❌ No se pudo iniciar guacd en WSL:', startErr.message);
            resolve(false);
            return;
          }
          const outStr = (startOut || '').toString();
          if (outStr.includes('__GUACD_START_FAILED__')) {
            console.log('❌ No se pudo iniciar guacd en WSL. Leyendo log de errores...');
            // Leer el log para mostrar el error real
            await new Promise((r) => wslExec(['sh', '-lc', 'cat /var/log/guacd-wsl.log 2>/dev/null || echo "No se pudo leer el log"'], (logErr, logOut) => {
              const logContent = String(logOut || '').trim();
              if (logContent && logContent !== 'No se pudo leer el log') {
                console.error('📋 Error de guacd en WSL:');
                console.error(logContent);
              } else {
                console.error('❌ No se pudo leer el log de errores. Posibles causas:');
                console.error('   - guacd no está instalado correctamente');
                console.error('   - Permisos insuficientes');
                console.error('   - El puerto 4822 está ocupado');
              }
              r();
            }));
            resolve(false);
            return;
          }
          this._debug('🚀 [WSL] guacd iniciado (daemon)');

          // Esperar a que el puerto esté escuchando dentro de WSL
          const waitReadyCmd = `for i in $(seq 1 50); do ss -tln 2>/dev/null | grep -E ":${this.port}\\b" && echo READY && break; sleep 0.2; done`;
          await new Promise((r) => wslExec(['sh', '-lc', waitReadyCmd], () => r()));

          // Verificar periódicamente que Windows puede conectarse via localhost (WSL2 localhost forwarding)
          // Esto asegura que guacd esté realmente accesible antes de retornar
          const maxWaitTime = 10000; // 10 segundos máximo
          const checkInterval = 500; // Verificar cada 500ms
          const startTime = Date.now();
          let verified = false;
          
          while (!verified && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(r => setTimeout(r, checkInterval));
            
            try {
              const available = await this.isPortAvailable(this.port);
              if (!available) {
                // Puerto ocupado = guacd está escuchando y accesible
                verified = true;
                break;
              }
            } catch (e) {
              // Continuar verificando
            }
          }
          
          // Si localhost no funcionó después del timeout, intentar con IP de WSL directamente (fallback)
          if (!verified) {
            let wslIp = null;
            const readIp = async () => {
              await new Promise((r) => wslExec(['sh', '-lc', "(hostname -I 2>/dev/null | awk '{print $1}') || true"], (e, out) => {
                const ip = String(out || '').trim();
                if (ip && /^(\d+\.){3}\d+$/.test(ip)) { wslIp = ip; }
                r();
              }));
              if (!wslIp) {
                await new Promise((r) => wslExec(['sh', '-lc', "ip -o -4 addr show up primary scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -n1"], (e, out) => {
                  const ip = String(out || '').trim();
                  if (ip && /^(\d+\.){3}\d+$/.test(ip)) { wslIp = ip; }
                  r();
                }));
              }
            };

            try {
              await readIp();
              if (wslIp) {
                this.host = wslIp;
                const availableWsl = await this.isPortAvailable(this.port);
                if (!availableWsl) {
                  verified = true;
                }
              }
            } catch {
              // noop
            }
          }
          
          if (verified) {
            this.isRunning = true;
            this.detectedMethod = 'wsl';
            this.guacdProcess = null;
            console.log(`✅ [WSL] guacd accesible desde Windows via ${this.host}:${this.port}`);
            
            // Iniciar health check periódico para WSL
            this._startHealthCheck();
            
            resolve(true);
          } else {
            console.log('❌ [WSL] guacd no accesible desde Windows después de esperar');
            resolve(false);
          }
        });
      }); // pingErr
    });
  }

  /**
   * Modo mock para testing cuando guacd no está disponible
   */
  async startMockMode() {
    return new Promise((resolve) => {
      // Simular que guacd está corriendo
      this.isRunning = true;
      this.detectedMethod = 'mock';
      
      // Simular un proceso que se puede detener
      this.guacdProcess = {
        kill: () => {
          this.isRunning = false;
        }
      };
      
      resolve(true);
    });
  }

  /**
   * Verifica si un puerto está disponible (true = disponible, false = ocupado)
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(1000); // Timeout optimizado para conexión más rápida
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(false); // Puerto ocupado (guacd corriendo)
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(true); // Puerto disponible
      });
      
      socket.on('error', (error) => {
        resolve(true); // Puerto disponible
      });
      socket.connect(port, this.host);
    });
  }

  /**
   * Detiene el servicio guacd
   */
  async stop() {
    // Detener health check si está activo
    this._stopHealthCheck();
    
    // Intentar detener aunque isRunning sea false (p.ej. proceso externo/preexistente).
    if (!this.isRunning && !this.detectedMethod && !this.guacdProcess) {
      return;
    }

    // Deteniendo GuacdService

    try {
      if (this.detectedMethod === 'docker') {
        // Detener contenedor Docker
        const dockerCommand = process.platform === 'darwin' ? 
          '/usr/local/bin/docker' : 
          process.platform === 'win32' ? 
            'docker.exe' : 
            'docker';
        
        exec(`${dockerCommand} stop nodeterm-guacd`, (error) => {
          if (error) {
            console.error('Error deteniendo contenedor Docker:', error);
            // Intentar con comando genérico si falla
            if (dockerCommand !== 'docker') {
              exec('docker stop nodeterm-guacd', (error2) => {
                if (error2) {
                  console.error('Error deteniendo contenedor Docker (genérico):', error2);
            }
              });
            }
          }
        });
      } else if (this.detectedMethod === 'wsl') {
        // Intentar detener guacd dentro de WSL
        const args = this.wslDistro ? ['-d', this.wslDistro, '--', 'sh', '-lc', 'pkill -f guacd || true'] : ['--', 'sh', '-lc', 'pkill -f guacd || true'];
        execFile('wsl.exe', args, (error) => {
          // guacd detenido en WSL
        });
      } else if (this.guacdProcess) {
        // Detener proceso nativo
        this.guacdProcess.kill('SIGTERM');
      }
    } catch (error) {
      console.error('Error deteniendo guacd:', error);
    }

    this.guacdProcess = null;
    this.isRunning = false;
    this.detectedMethod = null;
    this.wslNeedsRebind = false;
  }

  /**
   * Obtiene el estado del servicio
   */
  getStatus() {
    // Si guacd está corriendo pero no sabemos el método, intentar detectarlo
    let method = this.detectedMethod;
    if (this.isRunning && !method) {
      // Intentar detectar el método basado en el proceso
      if (this.guacdProcess) {
        method = 'native';
      } else {
        // Verificar si hay un contenedor Docker corriendo
        method = 'unknown';
      }
    }
    
    return {
      isRunning: this.isRunning,
      method: method,
      port: this.port,
      host: this.host
    };
  }

  /**
   * Detecta automáticamente el método usado cuando guacd ya está corriendo
   */
  async detectRunningMethod() {
    return new Promise((resolve) => {
      // Verificar Docker primero
      const dockerCommand = process.platform === 'darwin' ? 
        '/usr/local/bin/docker' : 
        process.platform === 'win32' ? 
          'docker.exe' : 
          'docker';
      
      exec(`${dockerCommand} ps --filter "name=nodeterm-guacd" --format "{{.Names}}"`, (dockerErr, dockerOut) => {
        if (!dockerErr && dockerOut.trim() === 'nodeterm-guacd') {
          console.log('🐳 Detectado: guacd corriendo en Docker');
          this.detectedMethod = 'docker';
          resolve();
          return;
        }
        
        // Si falla con ruta completa, intentar con comando genérico
        if (dockerCommand !== 'docker') {
          exec('docker ps --filter "name=nodeterm-guacd" --format "{{.Names}}"', (dockerErr2, dockerOut2) => {
            if (!dockerErr2 && dockerOut2.trim() === 'nodeterm-guacd') {
              console.log('🐳 Detectado: guacd corriendo en Docker');
              this.detectedMethod = 'docker';
              resolve();
              return;
            }
            this._continueDetection(resolve);
          });
        } else {
          this._continueDetection(resolve);
        }
      });
    });
  }

  _continueDetection(resolve) {
    // Intentar detectar WSL (solo en Windows)
    if (process.platform !== 'win32') {
      this.detectedMethod = 'unknown';
      resolve();
      return;
    }
    
    // Usar la distribución WSL por defecto (sin especificar -d)
    const tryWSL = async () => {
      let found = false;
      try {
        // Verificar si el puerto está escuchando en la distribución WSL por defecto
        await new Promise((r) => execFile('wsl.exe', ['--', 'sh', '-lc', `ss -tln 2>/dev/null | grep -E ":${this.port}\\b" || true`], { encoding: 'utf8' }, (e, o) => {
          const out = String(o || '');
          if (out.includes(`${this.port}`)) {
            // No establecer distribución específica (usar por defecto)
            this.wslDistro = null;
            
            // Verificar si está escuchando en 0.0.0.0 (correcto) o solo en 127.0.0.1 (incorrecto)
            const isListeningOnAll = out.includes('0.0.0.0') || out.includes('::');
            const isListeningOnLocalhost = out.includes('127.0.0.1');
            
            if (isListeningOnAll) {
              // Está bien configurado, accesible desde Windows
              this.host = '127.0.0.1'; // Windows accede via localhost
              this.detectedMethod = 'wsl';
              this.wslNeedsRebind = false;
              this._debug('🐧 Detectado: guacd escuchando en WSL por defecto (correctamente configurado en 0.0.0.0)');
              found = true;
              r('done');
            } else if (isListeningOnLocalhost) {
              // Está mal configurado, solo escuchando en 127.0.0.1 dentro de WSL
              console.warn('⚠️ Detectado: guacd en WSL escuchando solo en 127.0.0.1 (no accesible desde Windows), se reiniciará');
              // Marcamos WSL como método detectado, pero forzamos reinicio para rebind 0.0.0.0
              this.detectedMethod = 'wsl';
              this.wslNeedsRebind = true;
              found = true;
              r('done');
            } else {
              // Escuchando en otra IP, verificar si es accesible
              const match = out.match(/LISTEN\s+(\d+)\s+(\d+)\s+(\S+):\d+/);
              if (match) {
                const bindIp = match[3];
                if (bindIp && bindIp !== '127.0.0.1' && bindIp !== '::1') {
                  // Obtener IP de WSL
                  execFile('wsl.exe', ['--', 'sh', '-lc', "ip -4 addr show eth0 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | head -n1"], { encoding: 'utf8' }, (_e2, ipOut) => {
                    const ip = String(ipOut || '').trim();
                    if (ip && /^(\d+\.){3}\d+$/.test(ip)) {
                      this.host = ip;
                    }
                    this.detectedMethod = 'wsl';
                    this.wslNeedsRebind = false;
                    this._debug(`🐧 Detectado: guacd escuchando en WSL por defecto (IP: ${bindIp})`);
                    found = true;
                    r('done');
                  });
                  return;
                }
              }
              r();
            }
          } else { r(); }
        }));
      } catch {}
      if (!found) {
        // En Windows, no hay guacd nativo, solo Docker o WSL
        this.detectedMethod = 'unknown';
      }
      resolve();
    };

    tryWSL();
  }

  /**
   * Obtiene la configuración para guacamole-lite
   */
  getGuacdOptions() {
    const options = {
      host: this.host || '127.0.0.1',
      port: this.port
    };
    return options;
  }

  /**
   * Devuelve la ruta del host donde se almacenan los archivos compartidos.
   */
  getDriveHostDir() {
    return this.driveHostDir;
  }

  /**
   * Devuelve el nombre de la unidad que verá el usuario dentro de Windows remoto.
   */
  getDriveName() {
    return 'NodeTerm Drive';
  }

  /**
   * Devuelve la ruta que debe enviarse en el token RDP como "drive-path",
   * dependiendo del método con el que corre guacd.
   * - docker: la ruta montada dentro del contenedor (/guacdrive)
   * - wsl: convierte la ruta del host Windows a WSL usando toWslPath()
   * - native: ruta Windows del host
   * - mock/unknown: intenta usar /guacdrive por compatibilidad
   */
  getDrivePathForCurrentMethod() {
    const method = this.detectedMethod || this.preferredMethod || '';
    if (method === 'docker') {
      // Para Docker, convertir la ruta local a ruta accesible por el servidor RDP remoto
      // Esto permite que el servidor RDP remoto acceda a los archivos
      return toRemoteAccessiblePath(this.driveHostDir, 'docker');
    }
    if (method === 'wsl') {
      // Para WSL, convertir la ruta del host Windows a ruta WSL
      // Usa la carpeta del host que ya existe, no crea nada nuevo
      if (this.driveHostDir) {
        return toWslPath(this.driveHostDir);
      }
      // Fallback temporal si no hay driveHostDir configurado
      return '/tmp/NodeTermDrive';
    }
    if (method === 'native') {
      return this.driveHostDir;
    }
    // Fallback: asumir contenedor
    return '/guacdrive';
  }

  /**
   * Resuelve el drive-path a partir de un directorio del host especificado.
   * Para docker, siempre devuelve '/guacdrive' (requiere que el contenedor monte hostDir previamente).
   * Para wsl, si el usuario especifica una ruta personalizada, la convierte a WSL; si no, usa ruta nativa de Linux.
   * Para nativo, devuelve hostDir.
   * 
   * NUEVO: Valida automáticamente rutas incompatibles con el SO actual y las corrige.
   */
  resolveDrivePath(hostDir) {
    const method = this.detectedMethod || this.preferredMethod || '';
    
    // NUEVA VALIDACIÓN: Normalizar ruta para el SO actual
    const originalDir = typeof hostDir === 'string' && hostDir.trim().length > 0 ? hostDir.trim() : this.driveHostDir;
    const dir = normalizePathForCurrentOS(originalDir);
    
    // Si la ruta fue corregida automáticamente, actualizar driveHostDir
    if (originalDir !== dir) {
      this.driveHostDir = dir;
    }
    
    if (method === 'docker') {
      if (dir && this.driveHostDir && path.resolve(dir) !== path.resolve(this.driveHostDir)) {
        console.warn('[GuacdService] Advertencia: método docker activo; el volumen está montado en', this.driveHostDir, 'y no puede cambiarse sin reiniciar guacd.');
        console.log('[GuacdService] Nueva carpeta solicitada:', dir);
        console.log('[GuacdService] Actualizando driveHostDir y forzando recreación del contenedor...');
        
        // Actualizar la carpeta del host
        this.driveHostDir = dir;
        
        // Forzar recreación del contenedor Docker con la nueva carpeta
        this._forceDockerContainerRecreation();
      } else {
        console.log('[GuacdService] No se detectó cambio de carpeta o ya está actualizada');
      }
      // Para Docker, convertir la ruta local a ruta accesible por el servidor RDP remoto
      // Esto permite que el servidor RDP remoto acceda a los archivos
      return toRemoteAccessiblePath(this.driveHostDir, 'docker');
    }
    if (method === 'wsl') {
      // Para WSL, convertir la ruta del host Windows a ruta WSL
      // Usa la carpeta del host que ya existe, no crea nada nuevo
      if (dir && typeof dir === 'string' && dir.trim().length > 0) {
        // Convertir la ruta del host a WSL
        return toWslPath(dir);
      } else if (this.driveHostDir) {
        // Usar driveHostDir por defecto si no se especificó otra ruta
        return toWslPath(this.driveHostDir);
      } else {
        // Fallback temporal si no hay ninguna ruta configurada
        return process.platform === 'win32' ? '/tmp/NodeTermDrive' : '/guacdrive';
      }
    }
    if (method === 'native') {
      return dir;
    }
    return '/guacdrive';
  }
}

module.exports = GuacdService;
