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
    } catch (_) { /* ignore */ }
  }

  // Ordenar por tamaño (desc) para priorizar el más grande (más probable que esté completo)
  const result = Array.from(unique);
  try {
    result.sort((a, b) => {
      const sa = fs.statSync(a).size || 0;
      const sb = fs.statSync(b).size || 0;
      return sb - sa;
    });
  } catch (_) {}
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
    this.driveHostDir = ensureDriveHostDir();
  }

  /**
   * Inicializa el servicio guacd automáticamente
   * Intenta Docker primero, luego fallback a binarios nativos
   */
  async initialize() {
    try {
      // Primero verificar si guacd ya está corriendo
      const portAvailable = await this.isPortAvailable(this.port);
      if (!portAvailable) {
        console.log('✅ guacd ya está corriendo en puerto', this.port);
        this.isRunning = true;
        
        // Intentar detectar el método automáticamente
        await this.detectRunningMethod();

        // Si hay una preferencia explícita y lo detectado no coincide, intentar cambiar
        const desired = (this.preferredMethod === 'wsl') ? 'wsl' : (this.preferredMethod === 'docker' ? 'docker' : null);
        if (desired && this.detectedMethod && this.detectedMethod !== desired) {
          console.log(`🔁 Preferencia actual: ${desired}. Método preexistente detectado: ${this.detectedMethod}. Reiniciando según preferencia...`);
          try {
            await this.stop();
          } catch {}
        } else {
          const methodLabel = (this.detectedMethod || 'unknown').toUpperCase();
          console.log(`🔌 Conectado con ${methodLabel} (preexistente)`);
          return true;
        }
      }

      // Orden dinámico según preferencia y SO
      const isWindows = this.platform === 'win32';
      const all = isWindows ? ['docker', 'wsl', 'mock'] : ['docker', 'native', 'mock'];
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
    }
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

      // Intentar iniciar contenedor guacd
      const dockerArgs = [
        'run',
        '--name', 'nodeterm-guacd',
        '--rm', // Eliminar contenedor al salir
        '-d', // Modo detached
        '-p', `${this.port}:4822`,
        // Montar carpeta de staging del host dentro del contenedor
        // Importante: pasar como un único argumento host:container
        '-v', `${this.driveHostDir}:/guacdrive`,
        'guacamole/guacd'
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

      // Esperar un momento y verificar si el contenedor está corriendo
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
      }, 3000);
    });
  }

  /**
   * Intenta iniciar guacd usando binarios nativos
   */
  async startWithNative() {
    return new Promise(async (resolve) => {
      const platform = process.platform;
      const isWindows = platform === 'win32';

      // Buscar guacd en diferentes ubicaciones predefinidas
      const userDataInstallDir = path.join(getUserDataDir(), 'guacd');
      const possiblePaths = [
        // PATH del sistema
        isWindows ? 'guacd.exe' : 'guacd',
        'guacd',
        // Copias locales en el workspace (dev)
        path.join(__dirname, '..', '..', 'binaries', 'guacd', 'guacd.exe'),
        path.join(__dirname, '..', '..', 'binaries', 'guacd', 'bin', 'guacd.exe'),
        // Instalación previa en userData (prod)
        path.join(userDataInstallDir, 'bin', 'guacd.exe')
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
        console.log('❌ guacd no disponible.');
        console.log('💡 Sugerencias:');
        console.log('   - Verifica que el paquete binaries/guacd.zip esté incluido en el build');
        console.log('   - O instala Docker Desktop para usar el contenedor guacamole/guacd');
        resolve(false);
        return;
      }

      // Iniciar guacd nativo
      console.log(`🚀 Iniciando guacd desde: ${guacdPath}`);
      try {
        const finalCwd = spawnCwd || path.dirname(guacdPath);
        const envVars = { ...process.env };
        // Asegurar resolución de DLLs desde el directorio del ejecutable
        try {
          envVars.PATH = `${finalCwd};${envVars.PATH || ''}`;
        } catch (_) {}
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

      // Esperar un momento y verificar si está corriendo
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
      }, 2000);
    });
  }

  /**
   * Intenta iniciar guacd dentro de WSL (Ubuntu/Debian)
   */
  async startWithWSL() {
    return new Promise(async (resolve) => {
      // Listar distros en UTF-16LE, luego sanitizar
      execFile('wsl.exe', ['-l', '-q'], { encoding: 'buffer' }, async (listErr, stdoutBuf) => {
        if (listErr) {
          console.log('❌ WSL no está disponible:', listErr.message);
          resolve(false);
          return;
        }
        const raw = Buffer.isBuffer(stdoutBuf) ? stdoutBuf.toString('utf16le') : String(stdoutBuf || '');
        const normalized = raw.replace(/\u0000/g, '').replace(/[\r\n]+/g, '\n');
        const distros = normalized.split('\n').map(s => s.trim()).filter(Boolean);
        if (distros.length === 0) {
          console.log('❌ No hay distribuciones WSL registradas');
          resolve(false);
          return;
        }
        const preferred = ['Ubuntu-24.04', 'Ubuntu', 'Debian', 'kali-linux'];
        let selected = null;
        for (const name of preferred) { if (distros.includes(name)) { selected = name; break; } }
        if (!selected) selected = distros[0];
        this.wslDistro = selected;

        const wslExec = (args, cb) => execFile('wsl.exe', ['-d', selected, '-u', 'root', '--', ...args], { encoding: 'utf8' }, cb);

        // Determinar IP de WSL (robusto: hostname -I o ip -o -4 ... scope global)
        let wslIp = null;
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

        // Asegurar instalación de guacd
        await new Promise((r) => wslExec(['sh', '-lc', 'command -v guacd >/dev/null 2>&1 || (export DEBIAN_FRONTEND=noninteractive; apt-get update -y && apt-get install -y guacd)'], () => r()));

        // Crear directorio por defecto NodeTermDrive en el home del usuario WSL
        await new Promise((r) => wslExec(['sh', '-lc', 'mkdir -p /home/kalidus/NodeTermDrive && chown kalidus:kalidus /home/kalidus/NodeTermDrive'], () => r()));

        // Lanzar guacd en background dentro de WSL (bind a 127.0.0.1 y log a archivo)
        // Escuchar en todas las interfaces dentro de WSL para permitir acceso desde Windows
        const bindIp = '0.0.0.0';
        const startCmd = `/usr/sbin/guacd -b ${bindIp} -p ${this.port} -f >/var/log/guacd-wsl.log 2>&1 & echo $!`;
        wslExec(['sh', '-lc', startCmd], async (startErr, startOut) => {
          if (startErr) {
            console.log('❌ No se pudo iniciar guacd en WSL:', startErr.message);
            resolve(false);
            return;
          }
          const pidStr = (startOut || '').toString().trim();

          // Esperar a que el puerto esté escuchando dentro de WSL
          // Comprobar sólo por puerto (independiente de IP)
          const waitReadyCmd = `for i in $(seq 1 50); do ss -tln 2>/dev/null | grep -E ":${this.port}\\b" && echo READY && break; sleep 0.2; done`;
          await new Promise((r) => wslExec(['sh', '-lc', waitReadyCmd], () => r()));

          setTimeout(async () => {
            try {
              // Preferir localhost si Windows expone el puerto de WSL; fallback a IP de WSL
              let available = true;
              this.host = '127.0.0.1';
              available = await this.isPortAvailable(this.port);
              if (available && wslIp) {
                this.host = wslIp;
                available = await this.isPortAvailable(this.port);
              }
              if (!available) {
                this.isRunning = true;
                this.guacdProcess = null;
                resolve(true);
              } else {
                resolve(false);
              }
            } catch (e) {
              resolve(false);
            }
          }, 3000);
        });
      });
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
      
      socket.setTimeout(2000); // Aumentar timeout
      
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
    if (!this.isRunning) {
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
    // Intentar detectar WSL (distros y puerto 4822 escuchando)
    execFile('wsl.exe', ['-l', '-q'], { encoding: 'buffer' }, (listErr, stdoutBuf) => {
      const tryWSL = async () => {
        try {
          const raw = Buffer.isBuffer(stdoutBuf) ? stdoutBuf.toString('utf16le') : '';
          const distros = (raw.replace(/\u0000/g, '').replace(/[\r\n]+/g, '\n').split('\n').map(s => s.trim()).filter(Boolean));
          for (const d of distros) {
            // ¿Está el puerto escuchando?
            await new Promise((r) => execFile('wsl.exe', ['-d', d, '--', 'sh', '-lc', `ss -tln 2>/dev/null | grep -E ":${this.port}\\b" && echo LISTEN || true`], { encoding: 'utf8' }, (e, o) => {
              const out = String(o || '');
              if (out.includes('LISTEN')) {
                // Obtener IP de WSL
                execFile('wsl.exe', ['-d', d, '--', 'sh', '-lc', "ip -4 addr show eth0 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | head -n1"], { encoding: 'utf8' }, (_e2, ipOut) => {
                  const ip = String(ipOut || '').trim();
                  if (ip && /^(\d+\.){3}\d+$/.test(ip)) {
                    this.host = ip;
                  }
                  this.detectedMethod = 'wsl';
                  console.log('🐧 Detectado: guacd escuchando en WSL');
                  r('done');
                });
              } else { r(); }
            }));
            if (this.detectedMethod === 'wsl') { resolve(); return; }
          }
        } catch {}
        // Verificar proceso nativo como último intento
        exec('tasklist /FI "IMAGENAME eq guacd.exe" /FO CSV', (tErr, tOut) => {
          if (!tErr && tOut.includes('guacd.exe')) {
            console.log('📦 Detectado: guacd corriendo como proceso nativo');
            this.detectedMethod = 'native';
            resolve();
          } else {
            this.detectedMethod = 'unknown';
            resolve();
          }
        });
      };

      if (listErr) {
        tryWSL();
      } else {
        tryWSL();
      }
    });
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
   * - wsl: ruta nativa de Linux (/home/kalidus/NodeTermDrive) para evitar problemas de permisos
   * - native: ruta Windows del host
   * - mock/unknown: intenta usar /guacdrive por compatibilidad
   */
  getDrivePathForCurrentMethod() {
    const method = this.detectedMethod || this.preferredMethod || '';
    if (method === 'docker') {
      return '/guacdrive';
    }
    if (method === 'wsl') {
      // Para WSL, usar una ruta nativa de Linux en lugar de una ruta montada
      // Esto evita problemas de permisos con rutas montadas de Windows
      return '/home/kalidus/NodeTermDrive';
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
   */
  resolveDrivePath(hostDir) {
    const method = this.detectedMethod || this.preferredMethod || '';
    const dir = typeof hostDir === 'string' && hostDir.trim().length > 0 ? hostDir.trim() : this.driveHostDir;
    if (method === 'docker') {
      if (dir && this.driveHostDir && path.resolve(dir) !== path.resolve(this.driveHostDir)) {
        console.warn('[GuacdService] Advertencia: método docker activo; el volumen está montado en', this.driveHostDir, 'y no puede cambiarse sin reiniciar guacd.');
      }
      return '/guacdrive';
    }
    if (method === 'wsl') {
      // Para WSL, si el usuario especificó una ruta, convertirla a WSL
      // Si no, usar la ruta por defecto
      if (dir && hostDir && typeof hostDir === 'string' && hostDir.trim().length > 0) {
        // El usuario especificó una ruta personalizada, convertirla a WSL
        return toWslPath(dir);
      } else {
        // Usar la ruta por defecto nativa de Linux
        return '/home/kalidus/NodeTermDrive';
      }
    }
    if (method === 'native') {
      return dir;
    }
    return '/guacdrive';
  }
}

module.exports = GuacdService;
