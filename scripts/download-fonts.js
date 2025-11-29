/**
 * Script para descargar y guardar fuentes localmente
 * Ejecutar: node scripts/download-fonts.js
 * 
 * Descarga todas las fuentes populares desde Google Fonts y las guarda
 * en src/assets/fonts/ para que funcionen offline
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const fontsDir = path.join(__dirname, '../src/assets/fonts');
const fontsCSSFile = path.join(__dirname, '../src/styles/fonts.css');

// Lista completa de fuentes a descargar
const fontsToDownload = [
  { name: 'JetBrains Mono', weights: [300, 400, 500, 700], googleName: 'JetBrains+Mono' },
  { name: 'Fira Code', weights: [300, 400, 500, 700], googleName: 'Fira+Code' },
  { name: 'Source Code Pro', weights: [300, 400, 600, 700], googleName: 'Source+Code+Pro' },
  { name: 'Roboto Mono', weights: [300, 400, 500, 700], googleName: 'Roboto+Mono' },
  { name: 'Space Mono', weights: [400, 700], googleName: 'Space+Mono' },
  { name: 'Ubuntu Mono', weights: [400, 700], googleName: 'Ubuntu+Mono' },
  { name: 'Inconsolata', weights: [400, 700], googleName: 'Inconsolata' },
  // Nota: Hack y Monoid no están en Google Fonts, se mantienen como fuentes del sistema
  { name: 'Victor Mono', weights: [300, 400, 500, 700], googleName: 'Victor+Mono' },
  { name: 'IBM Plex Mono', weights: [300, 400, 500, 700], googleName: 'IBM+Plex+Mono' },
  { name: 'Recursive', weights: [400, 700], googleName: 'Recursive' },
  { name: 'Overpass Mono', weights: [400, 700], googleName: 'Overpass+Mono' },
  { name: 'Anonymous Pro', weights: [400, 700], googleName: 'Anonymous+Pro' },
  { name: 'PT Mono', weights: [400], googleName: 'PT+Mono' },
  { name: 'Droid Sans Mono', weights: [400], googleName: 'Droid+Sans+Mono' },
  { name: 'Share Tech Mono', weights: [400], googleName: 'Share+Tech+Mono' },
  { name: 'Nova Mono', weights: [400], googleName: 'Nova+Mono' },
  { name: 'Oxygen Mono', weights: [400], googleName: 'Oxygen+Mono' },
  { name: 'Cousine', weights: [400, 700], googleName: 'Cousine' },
  { name: 'B612 Mono', weights: [400, 700], googleName: 'B612+Mono' },
  { name: 'Fira Mono', weights: [400, 700], googleName: 'Fira+Mono' },
  { name: 'Major Mono Display', weights: [400], googleName: 'Major+Mono+Display' },
  // Fuentes adicionales populares
  { name: 'Red Hat Mono', weights: [400, 500, 700], googleName: 'Red+Hat+Mono' },
  { name: 'Noto Sans Mono', weights: [400, 500, 700], googleName: 'Noto+Sans+Mono' }
];

// Fuentes que NO están en Google Fonts pero se mantienen en la lista para usar del sistema
const systemOnlyFonts = ['Hack', 'Monoid', 'FiraCode Nerd Font', 'Cascadia Code', 'SF Mono', 'Operator Mono', 'Dank Mono', 'Monaco', 'Consolas', 'Courier New', 'Lucida Console', 'Menlo', 'Andale Mono', 'DejaVu Sans Mono', 'Liberation Mono'];

// Crear directorio de fuentes si no existe
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
  console.log(`📁 Directorio creado: ${fontsDir}`);
}

/**
 * Descarga un archivo
 */
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
    
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Seguir redirecciones
        file.close();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return downloadFile(response.headers.location, filePath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        reject(new Error(`Error ${response.statusCode} descargando ${url}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(err);
    });
  });
}

/**
 * Obtiene el CSS de Google Fonts y extrae las URLs de las fuentes
 */
async function getFontCSS(fontName, weights) {
  const weightsParam = weights.join(';');
  const url = `https://fonts.googleapis.com/css2?family=${fontName}:wght@${weightsParam}&display=swap`;
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        resolve(data);
      });
    }).on('error', reject);
  });
}

/**
 * Extrae URLs de fuentes del CSS
 */
function extractFontUrls(css) {
  const urls = [];
  const regex = /url\(([^)]+)\)/g;
  let match;
  
  while ((match = regex.exec(css)) !== null) {
    let url = match[1].replace(/['"]/g, '');
    if (!url.startsWith('http')) {
      url = 'https:' + url;
    }
    urls.push(url);
  }
  
  return urls;
}

/**
 * Descarga una fuente completa
 */
async function downloadFont(font) {
  console.log(`\n📥 Descargando ${font.name}...`);
  
  try {
    // Obtener CSS de Google Fonts
    const css = await getFontCSS(font.googleName, font.weights);
    
    // Verificar si el CSS está vacío o es muy corto (posible error)
    if (!css || css.length < 50) {
      console.log(`  ⚠️  ${font.name} no está disponible en Google Fonts`);
      console.log(`  💡 Esta fuente usará el fallback del sistema si está instalada`);
      return null;
    }
    
    // Extraer URLs de archivos de fuentes
    const fontUrls = extractFontUrls(css);
    
    if (fontUrls.length === 0) {
      console.log(`  ⚠️  No se encontraron URLs de fuentes para ${font.name}`);
      console.log(`  💡 Esta fuente usará el fallback del sistema si está instalada`);
      return null;
    }
    
    const fontFiles = [];
    
    // Descargar cada archivo de fuente
    for (const fontUrl of fontUrls) {
      try {
        const urlObj = new URL(fontUrl);
        const fileName = path.basename(urlObj.pathname);
        const localPath = path.join(fontsDir, fileName);
        
        // Si ya existe, saltar
        if (fs.existsSync(localPath)) {
          console.log(`  ✓ ${fileName} ya existe, saltando...`);
          fontFiles.push({
            fileName: fileName,
            url: `./assets/fonts/${fileName}`,
            originalUrl: fontUrl
          });
          continue;
        }
        
        console.log(`  ⬇️  Descargando ${fileName}...`);
        await downloadFile(fontUrl, localPath);
        console.log(`  ✅ ${fileName} descargado`);
        
        fontFiles.push({
          fileName: fileName,
          url: `../assets/fonts/${fileName}`,
          originalUrl: fontUrl
        });
        
        // Pequeña pausa para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`  ❌ Error descargando archivo: ${error.message}`);
      }
    }
    
    // Generar @font-face declarations
    const fontFacesCSS = css.split('@font-face').slice(1).map(face => {
      let localFace = '@font-face' + face;
      
      // Reemplazar cada URL remota con la local correspondiente
      fontFiles.forEach(fontFile => {
        // Buscar la URL original en el CSS
        if (localFace.includes(fontFile.originalUrl) || localFace.includes(fontFile.fileName)) {
          localFace = localFace.replace(
            /url\([^)]+\)/g,
            (match) => {
              if (match.includes(fontFile.fileName) || match.includes(fontFile.originalUrl.split('/').pop())) {
                // Usar ruta relativa desde src/styles/ a src/assets/fonts/
                return `url('../assets/fonts/${fontFile.fileName}')`;
              }
              return match;
            }
          );
        }
      });
      
      return localFace;
    }).join('\n\n');
    
    return {
      name: font.name,
      css: fontFacesCSS
    };
  } catch (error) {
    console.error(`  ❌ Error descargando ${font.name}:`, error.message);
    console.log(`  💡 Esta fuente usará el fallback del sistema si está instalada`);
    return null;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando descarga de fuentes...\n');
  console.log(`📁 Directorio de destino: ${fontsDir}\n`);
  
  const allFontFaces = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const font of fontsToDownload) {
    const result = await downloadFont(font);
    if (result && result.css) {
      allFontFaces.push(result.css);
      successCount++;
    } else {
      failCount++;
    }
    
    // Pausa entre fuentes
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Generar archivo CSS con todas las fuentes
  const cssContent = `/**
 * Fuentes monoespaciadas integradas en NodeTerm
 * Generado automáticamente - NO EDITAR MANUALMENTE
 * Ejecutar: npm run download-fonts
 */

${allFontFaces.join('\n\n')}
`;
  
  fs.writeFileSync(fontsCSSFile, cssContent);
  console.log(`\n✅ Archivo CSS generado: ${fontsCSSFile}`);
  console.log(`\n✨ Descarga completada!`);
  console.log(`   ✅ ${successCount} fuentes descargadas correctamente`);
  if (failCount > 0) {
    console.log(`   ⚠️  ${failCount} fuentes no están disponibles en Google Fonts`);
    console.log(`   💡 Nota: Hack y Monoid no están en Google Fonts`);
    console.log(`   💡 Estas fuentes funcionarán si están instaladas en el sistema`);
    console.log(`   💡 Puedes descargarlas desde: https://github.com/source-foundry/Hack y https://larsenwork.com/monoid/`);
  }
  console.log(`\n📦 Las fuentes descargadas están listas para usar offline!`);
  console.log(`\n💡 Total: ${fontsToDownload.length} fuentes en la lista`);
  console.log(`   ✅ ${successCount} integradas en la app (funcionan offline)`);
  console.log(`   ⚠️  ${failCount} requieren instalación del sistema`);
}

// Ejecutar
main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});

