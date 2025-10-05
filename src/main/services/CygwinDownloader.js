const https = require('https');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

/**
 * Servicio para descargar y extraer Cygwin pre-empaquetado
 * Descarga desde GitHub Releases en lugar de instalarlo desde cero
 */

// URL del paquete de Cygwin pre-empaquetado en GitHub Releases
// TODO: Actualizar con la URL real de tu release
const CYGWIN_PACKAGE_URL = 'https://github.com/TU_USUARIO/NodeTerm/releases/download/cygwin-v1.0.0/cygwin64-portable.7z';
const CYGWIN_PACKAGE_SIZE = 150 * 1024 * 1024; // ~150 MB

/**
 * Descarga el paquete de Cygwin pre-empaquetado
 * @param {string} destPath - Ruta donde guardar el archivo
 * @param {Function} progressCallback - Callback para progreso (bytes, total)
 */
async function downloadCygwinPackage(destPath, progressCallback) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Descargando Cygwin desde: ${CYGWIN_PACKAGE_URL}`);
    
    https.get(CYGWIN_PACKAGE_URL, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Seguir redirección
        https.get(response.headers.location, (redirectResponse) => {
          handleDownload(redirectResponse, destPath, progressCallback, resolve, reject);
        });
      } else {
        handleDownload(response, destPath, progressCallback, resolve, reject);
      }
    }).on('error', reject);
  });
}

function handleDownload(response, destPath, progressCallback, resolve, reject) {
  const totalBytes = parseInt(response.headers['content-length'], 10) || CYGWIN_PACKAGE_SIZE;
  let downloadedBytes = 0;

  const fileStream = createWriteStream(destPath);

  response.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    if (progressCallback) {
      progressCallback(downloadedBytes, totalBytes);
    }
  });

  response.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log('✅ Descarga completada');
    resolve();
  });

  fileStream.on('error', (err) => {
    fs.unlink(destPath, () => {}); // Limpiar archivo parcial
    reject(err);
  });
}

/**
 * Extrae el paquete de Cygwin usando 7-Zip o PowerShell
 * @param {string} archivePath - Ruta al archivo .7z
 * @param {string} destPath - Ruta donde extraer
 */
async function extractCygwinPackage(archivePath, destPath) {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    console.log(`📦 Extrayendo Cygwin a: ${destPath}`);
    
    // Intentar con PowerShell (Expand-Archive para .zip)
    const ps = spawn('powershell.exe', [
      '-Command',
      `Expand-Archive -Path "${archivePath}" -DestinationPath "${destPath}" -Force`
    ]);

    let output = '';
    let errorOutput = '';

    ps.stdout.on('data', (data) => {
      output += data.toString();
      console.log('[Extract]', data.toString().trim());
    });

    ps.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('[Extract Error]', data.toString().trim());
    });

    ps.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Extracción completada');
        resolve();
      } else {
        reject(new Error(`Extracción falló con código ${code}: ${errorOutput}`));
      }
    });

    ps.on('error', reject);
  });
}

/**
 * Descarga e instala Cygwin pre-empaquetado
 * @param {Function} progressCallback - Callback para progreso
 */
async function installCygwinPackage(progressCallback) {
  try {
    const tempDir = path.join(app.getPath('temp'), 'nodeterm-cygwin-download');
    const packagePath = path.join(tempDir, 'cygwin64-portable.7z');
    const destPath = path.join(app.getAppPath(), 'resources', 'cygwin64');

    // Crear directorio temporal
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Descargar paquete
    if (progressCallback) {
      progressCallback('downloading', 0, CYGWIN_PACKAGE_SIZE);
    }
    
    await downloadCygwinPackage(packagePath, (downloaded, total) => {
      if (progressCallback) {
        progressCallback('downloading', downloaded, total);
      }
    });

    // Extraer paquete
    if (progressCallback) {
      progressCallback('extracting', 0, 100);
    }

    // Crear directorio destino si no existe
    const resourcesDir = path.dirname(destPath);
    if (!fs.existsSync(resourcesDir)) {
      fs.mkdirSync(resourcesDir, { recursive: true });
    }

    await extractCygwinPackage(packagePath, resourcesDir);

    // Limpiar archivo temporal
    try {
      fs.unlinkSync(packagePath);
      fs.rmdirSync(tempDir);
    } catch (e) {
      console.warn('No se pudo limpiar archivos temporales:', e.message);
    }

    if (progressCallback) {
      progressCallback('completed', 100, 100);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error instalando Cygwin:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  downloadCygwinPackage,
  extractCygwinPackage,
  installCygwinPackage
};
