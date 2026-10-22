/**
 * Descarga las fuentes del catálogo y genera el CSS local.
 * Ejecutar: node scripts/download-fonts.js
 *
 * Google Fonts: solo latin y latin-ext.
 * Nerd Symbols: zip oficial de nerd-fonts (iconos PUA para eza/ll).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const unzipper = require('unzipper');

const fontsDir = path.join(__dirname, '../src/assets/fonts');
const fontsCSSFile = path.join(__dirname, '../src/styles/fonts.css');
const fontsCoreCSSFile = path.join(__dirname, '../src/styles/fonts-core.css');
let fontsToDownload = [];

const NERD_SYMBOLS_ZIP_URL =
  'https://github.com/ryanoasis/nerd-fonts/releases/download/v3.5.1/NerdFontsSymbolsOnly.zip';
const NERD_SYMBOLS_ZIP_ENTRY = 'SymbolsNerdFontMono-Regular.ttf';
const NERD_SYMBOLS_LOCAL_FILE = 'SymbolsNerdFontMono-Regular.ttf';

const stats = {
  skipped: 0,
  downloaded: 0,
  errors: 0,
  removed: 0
};

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function request(url, headers) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { headers }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        response.resume();
        const next = response.headers.location;
        if (!next) {
          reject(new Error(`Redirección sin destino al pedir ${url}`));
          return;
        }
        const absolute = next.startsWith('http') ? next : new URL(next, url).href;
        request(absolute, headers).then(resolve).catch(reject);
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          body: Buffer.concat(chunks)
        });
      });
    });
    req.on('error', reject);
  });
}

function downloadFile(url, filePath) {
  return request(url, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }).then(({ statusCode, body }) => {
    if (statusCode !== 200) {
      throw new Error(`Error ${statusCode} descargando ${url}`);
    }
    fs.writeFileSync(filePath, body);
  });
}

function getFontCSS(family, weights) {
  const weightsParam = weights.join(';');
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightsParam}&display=swap`;
  return request(url, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }).then(({ statusCode, body }) => {
    const css = body.toString('utf8');
    if (statusCode !== 200) {
      throw new Error(`Google Fonts respondió ${statusCode} para ${family}: ${css.slice(0, 180)}`);
    }
    return css;
  });
}

function splitFontFaces(css) {
  return css
    .split(/@font-face\s*/i)
    .slice(1)
    .map((part) => `@font-face ${part.trim()}`)
    .filter((part) => part.length > 20);
}

function isLatinFace(block) {
  const match = block.match(/unicode-range:\s*([^;]+)/i);
  if (!match) return true;
  const range = match[1];
  return range.includes('U+0000-00FF') || range.includes('U+0100-02BA') || range.includes('U+0100-024F');
}

function isCoreWeight(block) {
  const match = block.match(/font-weight:\s*([^;]+)/i);
  if (!match) return false;
  const nums = match[1].trim().split(/\s+/).map((part) => parseInt(part, 10)).filter((n) => !isNaN(n));
  if (nums.length === 1) return nums[0] === 400 || nums[0] === 700;
  if (nums.length >= 2) {
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return (min <= 400 && max >= 400) || (min <= 700 && max >= 700);
  }
  return false;
}

function extractFontUrls(css) {
  const urls = [];
  const regex = /url\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    let url = match[1].replace(/['"]/g, '');
    if (url.startsWith('//')) url = `https:${url}`;
    if (url.startsWith('http')) urls.push(url);
  }
  return urls;
}

function localizeCss(css) {
  return css.replace(/url\(([^)]+)\)/g, (match, raw) => {
    const cleaned = raw.replace(/['"]/g, '');
    if (!cleaned.includes('fonts.gstatic.com') && !cleaned.includes('/assets/fonts/')) {
      return match;
    }
    const fileName = path.basename(cleaned.split('?')[0]);
    return `url('../assets/fonts/${fileName}')`;
  });
}

function nerdSymbolsFontFaceCss() {
  return `@font-face {
  font-family: 'Symbols Nerd Font Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fonts/${NERD_SYMBOLS_LOCAL_FILE}') format('truetype');
}`;
}

async function downloadNerdSymbols(font) {
  const localPath = path.join(fontsDir, NERD_SYMBOLS_LOCAL_FILE);
  if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100000) {
    stats.skipped++;
    console.log(`  ${font.family}: ya existe`);
    return { name: font.family, css: nerdSymbolsFontFaceCss(), coreCss: '' };
  }

  const { statusCode, body } = await request(NERD_SYMBOLS_ZIP_URL, {
    'User-Agent': 'NodeTerm-FontDownload'
  });
  if (statusCode !== 200) {
    throw new Error(`GitHub respondió ${statusCode} al pedir Symbols Nerd Font`);
  }

  const directory = await unzipper.Open.buffer(body);
  const entry = directory.files.find((file) => (
    file.path === NERD_SYMBOLS_ZIP_ENTRY || file.path.endsWith(`/${NERD_SYMBOLS_ZIP_ENTRY}`)
  ));
  if (!entry) {
    throw new Error(`el zip no contiene ${NERD_SYMBOLS_ZIP_ENTRY}`);
  }

  const ttfBuffer = await entry.buffer();
  fs.writeFileSync(localPath, ttfBuffer);
  stats.downloaded++;
  console.log(`  ${font.family}: 1 archivo nuevo (${Math.round(ttfBuffer.length / 1024)} KB)`);

  return { name: font.family, css: nerdSymbolsFontFaceCss(), coreCss: '' };
}

async function downloadGoogleFont(font) {
  const css = await getFontCSS(font.family, font.weights);
  const latinCss = splitFontFaces(css).filter(isLatinFace).join('\n\n');
  if (!latinCss || latinCss.length < 40) {
    throw new Error(`sin bloques latin para ${font.family}`);
  }

  const fontUrls = extractFontUrls(latinCss);
  if (fontUrls.length === 0) {
    throw new Error(`sin archivos woff2 para ${font.family}`);
  }

  let fontDownloaded = 0;
  for (const fontUrl of fontUrls) {
    const fileName = path.basename(new URL(fontUrl).pathname);
    const localPath = path.join(fontsDir, fileName);
    if (fs.existsSync(localPath)) {
      stats.skipped++;
      continue;
    }
    await downloadFile(fontUrl, localPath);
    stats.downloaded++;
    fontDownloaded++;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  if (fontDownloaded > 0) {
    console.log(`  ${font.family}: ${fontDownloaded} archivo(s) nuevo(s)`);
  }

  const localCss = localizeCss(latinCss);
  const coreCss = font.core
    ? splitFontFaces(localCss).filter(isCoreWeight).join('\n\n')
    : '';

  return { name: font.family, css: localCss, coreCss };
}

async function downloadFont(font) {
  if (font.download === 'nerd-symbols') {
    return downloadNerdSymbols(font);
  }
  if (!font.weights || font.weights.length === 0) {
    throw new Error(`faltan weights para ${font.family}`);
  }
  return downloadGoogleFont(font);
}

function referencedFontFiles(css) {
  const names = new Set();
  const regex = /url\((?:'|")?\.\.\/assets\/fonts\/([^'")]+)(?:'|")?\)/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    names.add(match[1]);
  }
  return names;
}

function removeUnreferencedFonts(css) {
  const referenced = referencedFontFiles(css);
  for (const entry of fs.readdirSync(fontsDir)) {
    if (entry === '.gitkeep') continue;
    if (!/\.(woff2?|ttf|otf|eot)$/i.test(entry)) continue;
    if (referenced.has(entry)) continue;
    fs.unlinkSync(path.join(fontsDir, entry));
    stats.removed++;
  }
}

function cssHeader(description) {
  return `/**
 * ${description}
 * Generado automáticamente - NO EDITAR MANUALMENTE
 * Ejecutar: npm run download-fonts
 */

`;
}

async function main() {
  const { default: catalog } = await import('../src/utils/fontCatalog.js');
  fontsToDownload = catalog.fonts.filter((font) => font.source === 'bundled');
  console.log('Descargando fuentes del catálogo...\n');

  const allFontFaces = [];
  const coreFontFaces = [];
  const failures = [];

  for (const font of fontsToDownload) {
    try {
      const result = await downloadFont(font);
      allFontFaces.push(result.css);
      if (result.coreCss) coreFontFaces.push(result.coreCss);
    } catch (error) {
      stats.errors++;
      failures.push(`${font.family}: ${error.message}`);
      console.warn(`  fallo ${font.family}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 180));
  }

  if (failures.length > 0) {
    console.error(`\nNo se generó el CSS. Fallaron ${failures.length} familias:`);
    failures.forEach((line) => console.error(`  - ${line}`));
    process.exit(1);
  }

  const fullCss = `${cssHeader('Fuentes integradas en NodeTerm (latin/latin-ext + Symbols Nerd Font Mono).')}${allFontFaces.join('\n\n')}\n`;
  const coreCss = `${cssHeader('Subconjunto de arranque: Inter, JetBrains Mono y Fira Code, pesos 400 y 700.')}${coreFontFaces.join('\n\n')}\n`;

  fs.writeFileSync(fontsCSSFile, fullCss);
  fs.writeFileSync(fontsCoreCSSFile, coreCss);
  removeUnreferencedFonts(`${fullCss}\n${coreCss}`);

  console.log('\nCompletado');
  console.log(`   Familias: ${fontsToDownload.length}`);
  console.log(`   Archivos: ${stats.downloaded} nuevos, ${stats.skipped} ya existían, ${stats.removed} sin uso eliminados`);
}

main().catch((error) => {
  console.error('\nError fatal:', error);
  process.exit(1);
});
