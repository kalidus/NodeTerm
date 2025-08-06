const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Usar una fuente alternativa que funcione
const GUACD_VERSION = '1.5.5';
const DOWNLOAD_URL = `https://github.com/apache/guacamole-server/releases/download/${GUACD_VERSION}/guacd-${GUACD_VERSION}-windows-x64.zip`;
const ALTERNATIVE_URL = `https://github.com/apache/guacamole-server/releases/download/${GUACD_VERSION}/guacd-${GUACD_VERSION}-win64.zip`;
const DOWNLOAD_DIR = path.join(__dirname, '..', 'binaries');
const EXTRACT_DIR = path.join(DOWNLOAD_DIR, 'guacd');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete the file async
      reject(err);
    });
  });
}

async function extractZip(zipPath, extractPath) {
  return new Promise((resolve, reject) => {
    const unzip = require('unzipper');
    fs.createReadStream(zipPath)
      .pipe(unzip.Extract({ path: extractPath }))
      .on('close', resolve)
      .on('error', reject);
  });
}

async function main() {
  console.log('📦 Descargando guacd para Windows...');
  
  // Crear directorio si no existe
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
  
  const zipPath = path.join(DOWNLOAD_DIR, 'guacd.zip');
  
  try {
    // Intentar URL principal
    console.log(`⬇️ Intentando descargar desde: ${DOWNLOAD_URL}`);
    try {
      await downloadFile(DOWNLOAD_URL, zipPath);
      console.log('✅ Descarga completada con URL principal');
    } catch (error) {
      console.log(`❌ URL principal falló: ${error.message}`);
      console.log(`⬇️ Intentando URL alternativa: ${ALTERNATIVE_URL}`);
      await downloadFile(ALTERNATIVE_URL, zipPath);
      console.log('✅ Descarga completada con URL alternativa');
    }
    
    // Extraer
    console.log('📂 Extrayendo archivos...');
    await extractZip(zipPath, DOWNLOAD_DIR);
    console.log('✅ Extracción completada');
    
    // Limpiar archivo zip
    fs.unlinkSync(zipPath);
    
    console.log(`✅ guacd instalado en: ${EXTRACT_DIR}`);
    console.log('💡 Ahora puedes usar la opción nativa en GuacdService');
    
  } catch (error) {
    console.error('❌ Error descargando guacd:', error.message);
    console.log('💡 Alternativa: Instala Docker Desktop y reinicia la aplicación');
    console.log('💡 O descarga guacd manualmente desde: https://github.com/apache/guacamole-server/releases');
  }
}

if (require.main === module) {
  main();
}

module.exports = { downloadGuacd: main };
