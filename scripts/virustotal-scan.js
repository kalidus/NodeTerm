/**
 * Script para subir ejecutables a VirusTotal y verificar resultados
 * Uso: node scripts/virustotal-scan.js [ruta-al-archivo]
 * 
 * Requiere API key de VirusTotal (opcional, pero recomendado)
 * Obtener en: https://www.virustotal.com/gui/join-us
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

// Obtener API key de variable de entorno o archivo .env
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY || '';

// Límites de la API gratuita
const FREE_API_LIMIT = 4; // solicitudes por minuto
const FREE_DAILY_LIMIT = 500; // solicitudes por día

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findExecutable() {
  // Buscar el ejecutable más reciente en dist/
  const distDir = path.join(__dirname, '..', 'dist');
  const releaseDir = path.join(__dirname, '..', 'release');

  const searchDirs = [distDir, releaseDir];
  const extensions = ['.exe', '.msi', '.dmg', '.AppImage'];

  let latestFile = null;
  let latestTime = 0;

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir, { recursive: true });

    for (const file of files) {
      const filePath = path.join(dir, file);
      const ext = path.extname(file).toLowerCase();

      if (extensions.includes(ext) && fs.statSync(filePath).isFile()) {
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs > latestTime) {
          latestTime = stats.mtimeMs;
          latestFile = filePath;
        }
      }
    }
  }

  return latestFile;
}

function uploadToVirusTotal(filePath, apiKey = '') {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`Archivo no encontrado: ${filePath}`));
      return;
    }

    const fileSize = fs.statSync(filePath).size;
    const maxSize = 32 * 1024 * 1024; // 32MB límite de VirusTotal

    if (fileSize > maxSize) {
      log(`⚠️  El archivo es muy grande (${(fileSize / 1024 / 1024).toFixed(2)}MB).`, 'yellow');
      log(`   VirusTotal tiene un límite de 32MB para subidas directas.`, 'yellow');
      log('');
      log('📤 Para escanear manualmente:', 'blue');
      log(`   1. Ve a: https://www.virustotal.com/gui/home/upload`, 'cyan');
      log(`   2. Sube el archivo: ${filePath}`, 'cyan');
      log(`   3. El sitio web de VirusTotal sí permite archivos de hasta 650MB.`, 'cyan');
      resolve({ method: 'manual', url: 'https://www.virustotal.com/gui/home/upload' });
      return;
    }

    if (!apiKey) {
      log('⚠️  No se encontró API key de VirusTotal.', 'yellow');
      log('   Usando método web (sin API).', 'yellow');
      log(`   Para usar la API, configura VIRUSTOTAL_API_KEY en variables de entorno.`, 'yellow');
      log(`   Obtén tu API key en: https://www.virustotal.com/gui/join-us`, 'cyan');
      log('');
      log('📤 Para subir manualmente:', 'blue');
      log(`   1. Ve a: https://www.virustotal.com/gui/home/upload`, 'cyan');
      log(`   2. Sube el archivo: ${filePath}`, 'cyan');
      log(`   3. Espera el análisis y revisa los resultados`, 'cyan');
      resolve({ method: 'manual', url: 'https://www.virustotal.com/gui/home/upload' });
      return;
    }

    log('📤 Subiendo archivo a VirusTotal...', 'cyan');

    // Crear multipart/form-data manualmente
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const formData = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="apikey"`,
      '',
      apiKey,
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      'Content-Type: application/octet-stream',
      '',
      ''
    ].join('\r\n');

    const footer = `\r\n--${boundary}--\r\n`;
    const bodyBuffer = Buffer.concat([
      Buffer.from(formData, 'utf8'),
      fileContent,
      Buffer.from(footer, 'utf8')
    ]);

    const options = {
      hostname: 'www.virustotal.com',
      path: '/vtapi/v2/file/scan',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.response_code === 1) {
              log('✅ Archivo subido exitosamente', 'green');
              log(`   Resource ID: ${response.resource}`, 'cyan');
              log(`   Scan ID: ${response.scan_id}`, 'cyan');
              log('');
              log('⏳ Esperando análisis... (esto puede tomar 1-2 minutos)', 'yellow');
              log(`   URL: https://www.virustotal.com/gui/file/${response.resource}`, 'cyan');

              // Esperar y verificar resultados
              setTimeout(() => {
                checkVirusTotalResults(response.resource, apiKey)
                  .then(resolve)
                  .catch(reject);
              }, 60000); // Esperar 1 minuto antes de verificar
            } else {
              reject(new Error(`Error de VirusTotal: ${response.verbose_msg || 'Unknown error'}`));
            }
          } catch (error) {
            reject(new Error(`Error parseando respuesta: ${error.message}`));
          }
        } else {
          reject(new Error(`Error HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(bodyBuffer);
    req.end();
  });
}

function checkVirusTotalResults(resourceId, apiKey) {
  return new Promise((resolve, reject) => {
    log('🔍 Verificando resultados del análisis...', 'cyan');

    const options = {
      hostname: 'www.virustotal.com',
      path: `/vtapi/v2/file/report?apikey=${apiKey}&resource=${resourceId}`,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);

            if (response.response_code === 1) {
              const total = response.total || 0;
              const positives = response.positives || 0;
              const scans = response.scans || {};

              log('');
              log('═══════════════════════════════════════════════════', 'cyan');
              log('📊 RESULTADOS DE VIRUSTOTAL', 'cyan');
              log('═══════════════════════════════════════════════════', 'cyan');
              log(`   Total de motores: ${total}`, 'blue');
              log(`   Detecciones: ${positives}`, positives > 0 ? 'red' : 'green');
              log(`   Porcentaje limpio: ${((total - positives) / total * 100).toFixed(1)}%`, 'blue');
              log('');

              if (positives === 0) {
                log('✅ ¡Archivo limpio! No se detectaron amenazas.', 'green');
              } else {
                log('⚠️  Se detectaron falsos positivos:', 'yellow');
                log('');

                // Mostrar qué antivirus detectaron
                for (const [engine, result] of Object.entries(scans)) {
                  if (result.detected) {
                    log(`   🔴 ${engine}: ${result.result}`, 'red');
                  }
                }

                log('');
                log('💡 Recomendaciones:', 'yellow');
                log('   1. Si es un falso positivo, contacta a los proveedores', 'yellow');
                log('   2. Considera obtener un certificado de código', 'yellow');
                log('   3. Envía a Microsoft Defender para análisis', 'yellow');
              }

              log('');
              log(`🔗 URL completa: https://www.virustotal.com/gui/file/${resourceId}`, 'cyan');
              log('═══════════════════════════════════════════════════', 'cyan');

              resolve({
                resource: resourceId,
                total,
                positives,
                scans,
                url: `https://www.virustotal.com/gui/file/${resourceId}`
              });
            } else if (response.response_code === -2) {
              log('⏳ El análisis aún está en proceso. Espera unos minutos más.', 'yellow');
              log(`   URL: https://www.virustotal.com/gui/file/${resourceId}`, 'cyan');
              resolve({ resource: resourceId, status: 'queued' });
            } else {
              reject(new Error(`Error: ${response.verbose_msg || 'Unknown error'}`));
            }
          } catch (error) {
            reject(new Error(`Error parseando respuesta: ${error.message}`));
          }
        } else {
          reject(new Error(`Error HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Función principal
async function main() {
  log('');
  log('═══════════════════════════════════════════════════', 'cyan');
  log('🛡️  VIRUSTOTAL SCANNER', 'cyan');
  log('═══════════════════════════════════════════════════', 'cyan');
  log('');

  // Obtener archivo a escanear
  const filePath = process.argv[2] || findExecutable();

  if (!filePath) {
    log('❌ No se encontró ningún ejecutable para escanear.', 'red');
    log('');
    log('Uso:', 'yellow');
    log('   node scripts/virustotal-scan.js [ruta-al-archivo]', 'cyan');
    log('');
    log('O ejecuta después de build:', 'yellow');
    log('   npm run dist && npm run scan:virustotal', 'cyan');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    log(`❌ Archivo no encontrado: ${filePath}`, 'red');
    process.exit(1);
  }

  log(`📁 Archivo: ${filePath}`, 'blue');
  log(`📦 Tamaño: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`, 'blue');
  log('');

  try {
    const result = await uploadToVirusTotal(filePath, VIRUSTOTAL_API_KEY);

    if (result.method === 'manual') {
      log('✅ Instrucciones mostradas arriba.', 'green');
      process.exit(0);
    }

    log('');
    log('✅ Proceso completado', 'green');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadToVirusTotal, checkVirusTotalResults };

