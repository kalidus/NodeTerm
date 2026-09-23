/**
 * Manejadores IPC para funcionalidades de archivos locales (Windows/Mac/Linux)
 */

const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Normaliza y securiza una ruta local
 */
function sanitizeLocalPath(userPath) {
    if (!userPath || typeof userPath !== 'string') return '';
    const unified = userPath.replace(/\\/g, path.sep);
    return path.normalize(unified);
}

/**
 * Convierte información de archivo fs.stat a formato estándar
 */
function formatLocalFile(filename, stats, fullPath) {
    let isSymbolic = false;
    let isJunction = false;
    try {
        const lstats = fs.lstatSync(fullPath);
        isSymbolic = lstats.isSymbolicLink();

        // Detect junctions/reparse points by comparing stat and lstat
        if (process.platform === 'win32' && !isSymbolic && stats.isDirectory()) {
            if (lstats.dev !== stats.dev || lstats.ino !== stats.ino || lstats.mode !== stats.mode) {
                isJunction = true;
            }
        }
    } catch (e) { }

    return {
        name: filename,
        path: fullPath,
        permissions: '', // Local permissions are harder to map cross-platform 1:1, leaving blank for simplicity
        owner: '',
        group: '',
        size: stats.size || 0,
        modified: stats.mtime ? stats.mtime.toLocaleString() : '',
        type: stats.isDirectory() ? 'directory' : (isSymbolic ? 'symlink' : 'file'),
        isSymbolic: isSymbolic || isJunction,
        isHidden: false
    };
}

/**
 * Obtiene el directorio home del usuario local
 */
async function getHomeDirectory() {
    try {
        return { success: true, home: os.homedir() };
    } catch (err) {
        return { success: false, error: err.message || err };
    }
}

let cachedDrives = null;
let lastDrivesCheck = 0;
const DRIVES_CACHE_TTL = 30000; // 30s cache

/**
 * Chequea una unidad con un timeout estricto para evitar bloqueos por unidades de red desconectadas
 */
function checkDriveWithTimeout(driveLetter, timeoutMs = 150) {
    return new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                resolve(null);
            }
        }, timeoutMs);
        if (timer.unref) timer.unref();

        fs.promises.access(driveLetter, fs.constants.F_OK)
            .then(() => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve(driveLetter);
                }
            })
            .catch(() => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve(null);
                }
            });
    });
}

/**
 * Obtiene las unidades/drives base (especialmente para Windows)
 */
async function getDrives() {
    const now = Date.now();
    if (cachedDrives && (now - lastDrivesCheck < DRIVES_CACHE_TTL)) {
        return { success: true, drives: cachedDrives };
    }
    try {
        if (process.platform === 'win32') {
            const driveLetters = [];
            for (let i = 65; i <= 90; i++) {
                driveLetters.push(String.fromCharCode(i) + ':\\');
            }
            // ✅ SEGURIDAD & RENDIMIENTO: Chequeo asíncrono en paralelo con timeout de 150ms.
            // No bloquea el event loop y descarta instantáneamente unidades de red desconectadas o inaccesibles.
            const checks = driveLetters.map(drive => checkDriveWithTimeout(drive, 150));
            const results = await Promise.all(checks);
            const drives = results.filter(Boolean);

            if (drives.length > 0) {
                cachedDrives = drives;
                lastDrivesCheck = now;
                return { success: true, drives };
            }
            return { success: true, drives: ['C:\\'] };
        } else {
            return { success: true, drives: ['/'] }; // Para Unix es simplemente /
        }
    } catch (err) {
        return { success: true, drives: ['C:\\'] };
    }
}

/**
 * Lista archivos en el disco local
 */
async function listFiles(targetPath) {
    try {
        const safePath = sanitizeLocalPath(targetPath);
        if (!fs.existsSync(safePath)) {
            return { success: false, error: 'Directorio no encontrado' };
        }

        const files = fs.readdirSync(safePath);
        const result = [];

        // Identify hidden files via Windows attrib
        const hiddenSet = new Set();
        if (process.platform === 'win32') {
            try {
                // To avoid long execs in massive directories, limit timeout
                if (files.length < 1000) {
                    // ✅ SEGURIDAD: Usar spawn en lugar de exec para evitar inyección de comandos
                    const { spawn } = require('child_process');
                    const child = spawn('attrib', ['/D', path.join(safePath, '*')], { timeout: 1500 });
                    
                    let stdout = '';
                    child.stdout.on('data', chunk => { stdout += chunk; });
                    await new Promise((resolve) => {
                        child.on('close', resolve);
                        child.on('error', resolve);
                    });

                    // Use regex that handles both CRLF and LF safely
                    const lines = stdout.split(/\r?\n/);
                    for (const line of lines) {
                        if (line.length > 21) {
                            const attrs = line.substring(0, 20);
                            if (attrs.includes('H') || attrs.includes('S')) {
                                const fullPathInLine = line.substring(20).trim();
                                if (fullPathInLine) {
                                    hiddenSet.add(path.basename(fullPathInLine).toLowerCase());
                                }
                            }
                        }
                    }
                }
            } catch (err) { }
        }

        const windowsSystemFolders = new Set([
            'sendto', 'recent', 'plantillas', 'templates', 'cookies',
            'nethood', 'printhood', 'application data', 'my documents',
            'local settings', 'inicio', 'start menu', 'menú inicio',
            'desktop', 'escritorio', 'documents', 'documentos',
            'pictures', 'imágenes', 'music', 'música', 'videos', 'vídeos',
            'searches', 'búsquedas', 'links', 'vínculos', 'favorites', 'favoritos',
            'saved games', 'juegos guardados', 'contacts', 'contactos',
            'downloads', 'descargas', 'appdata', 'entorno de red', 'ntuser.dat', 'ntuser.ini'
        ]);

        for (const file of files) {
            try {
                const fullPath = path.join(safePath, file);
                const stats = fs.statSync(fullPath);
                const item = formatLocalFile(file, stats, fullPath);

                const lowerName = file.toLowerCase();

                if (file.startsWith('.') || hiddenSet.has(lowerName)) {
                    item.isHidden = true;
                } else if (process.platform === 'win32') {
                    // Force hide common system junctions
                    if (windowsSystemFolders.has(lowerName) && item.isSymbolic) {
                        item.isHidden = true;
                    }
                }

                result.push(item);
            } catch (e) {
                // Ignorar archivos sin permisos de lectura
            }
        }

        return { success: true, files: result };
    } catch (err) {
        return { success: false, error: err.message || err };
    }
}

/**
 * Crea un directorio local
 */
async function createDirectory(targetPath) {
    try {
        const safePath = sanitizeLocalPath(targetPath);
        fs.mkdirSync(safePath, { recursive: true });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message || err };
    }
}

/**
 * Elimina un archivo o directorio local
 */
async function deleteFile(targetPath, isDirectory) {
    try {
        const safePath = sanitizeLocalPath(targetPath);
        if (isDirectory) {
            fs.rmSync(safePath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(safePath);
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message || err };
    }
}

/**
 * Renombra/Mueve un archivo o directorio local
 */
async function renameFile(oldPath, newPath) {
    try {
        const safeOldPath = sanitizeLocalPath(oldPath);
        const safeNewPath = sanitizeLocalPath(newPath);
        fs.renameSync(safeOldPath, safeNewPath);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message || err };
    }
}

/**
 * Copia un archivo o directorio local a otra ruta
 */
async function copyFile(srcPath, destPath) {
    try {
        const safeSrc = sanitizeLocalPath(srcPath);
        const safeDest = sanitizeLocalPath(destPath);
        const srcStats = fs.statSync(safeSrc);
        if (srcStats.isDirectory()) {
            fs.cpSync(safeSrc, safeDest, { recursive: true, force: true });
        } else {
            fs.copyFileSync(safeSrc, safeDest);
        }
        return { success: true, destPath: safeDest };
    } catch (err) {
        return { success: false, error: err.message || err };
    }
}

/**
 * Registra todos los manejadores IPC relacionados con archivos locales
 */
function registerLocalFsHandlers() {
    ipcMain.handle('local-fs:get-home-directory', async () => getHomeDirectory());
    ipcMain.handle('local-fs:get-drives', async () => getDrives());
    ipcMain.handle('local-fs:list-files', async (event, path) => listFiles(path));
    ipcMain.handle('local-fs:create-directory', async (event, path) => createDirectory(path));
    ipcMain.handle('local-fs:delete-file', async (event, { path, isDirectory }) => deleteFile(path, isDirectory));
    ipcMain.handle('local-fs:rename-file', async (event, { oldPath, newPath }) => renameFile(oldPath, newPath));
    ipcMain.handle('local-fs:copy-file', async (event, { srcPath, destPath }) => copyFile(srcPath, destPath));
}

module.exports = {
    registerLocalFsHandlers,
    getDrives,
    sanitizeLocalPath
};
