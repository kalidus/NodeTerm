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
    return path.normalize(userPath);
}

/**
 * Convierte información de archivo fs.stat a formato estándar
 */
function formatLocalFile(filename, stats, fullPath) {
    return {
        name: filename,
        path: fullPath,
        permissions: '', // Local permissions are harder to map cross-platform 1:1, leaving blank for simplicity
        owner: '',
        group: '',
        size: stats.size || 0,
        modified: stats.mtime ? stats.mtime.toLocaleString() : '',
        type: stats.isDirectory() ? 'directory' : (stats.isSymbolicLink() ? 'symlink' : 'file'),
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

/**
 * Obtiene las unidades/drives base (especialmente para Windows)
 */
async function getDrives() {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execPromise('wmic logicaldisk get name');
            const drives = stdout.split('\r\n')
                .filter(line => /[a-zA-Z]:/.test(line))
                .map(line => line.trim() + '\\');
            return { success: true, drives };
        } else {
            return { success: true, drives: ['/'] }; // Para Unix es simplemente /
        }
    } catch (err) {
        // Fallback if wmic fails
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

        for (const file of files) {
            try {
                const fullPath = path.join(safePath, file);
                const stats = fs.statSync(fullPath);
                result.push(formatLocalFile(file, stats, fullPath));
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
 * Registra todos los manejadores IPC relacionados con archivos locales
 */
function registerLocalFsHandlers() {
    ipcMain.handle('local-fs:get-home-directory', async () => getHomeDirectory());
    ipcMain.handle('local-fs:get-drives', async () => getDrives());
    ipcMain.handle('local-fs:list-files', async (event, path) => listFiles(path));
    ipcMain.handle('local-fs:create-directory', async (event, path) => createDirectory(path));
    ipcMain.handle('local-fs:delete-file', async (event, { path, isDirectory }) => deleteFile(path, isDirectory));
    ipcMain.handle('local-fs:rename-file', async (event, { oldPath, newPath }) => renameFile(oldPath, newPath));
}

module.exports = {
    registerLocalFsHandlers
};
