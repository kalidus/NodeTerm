const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('Startup & Fonts: Offline 100% & Instant Cold Start', () => {
  const indexHtmlPath = path.join(__dirname, '..', '..', 'src', 'index.html');
  const indexJsPath = path.join(__dirname, '..', '..', 'src', 'index.js');
  const fontsCssPath = path.join(__dirname, '..', '..', 'src', 'styles', 'fonts.css');

  it('src/index.html NO debe contener etiquetas <link> a Google Fonts ni preconnect externos', () => {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

    // No debe contener enlaces externos en el HTML que bloqueen o retrasen el arranque
    assert.strictEqual(
      htmlContent.includes('<link rel="preconnect" href="https://fonts.googleapis.com">'),
      false,
      'No debe tener preconnect a fonts.googleapis.com'
    );
    assert.strictEqual(
      htmlContent.includes('<link rel="preconnect" href="https://fonts.gstatic.com"'),
      false,
      'No debe tener preconnect a fonts.gstatic.com'
    );
    assert.strictEqual(
      htmlContent.includes('fonts.googleapis.com/css2'),
      false,
      'No debe cargar hojas de estilo desde fonts.googleapis.com'
    );
  });

  it('src/index.html debe preservar https://fonts.googleapis.com y https://fonts.gstatic.com en el CSP meta tag', () => {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    assert.ok(htmlContent.includes('http-equiv="Content-Security-Policy"'), 'Debe incluir CSP meta tag');
    assert.ok(htmlContent.includes('https://fonts.googleapis.com'), 'CSP debe mantener compatibilidad de estilos');
    assert.ok(htmlContent.includes('https://fonts.gstatic.com'), 'CSP debe mantener compatibilidad de fuentes');
  });

  it('src/index.js debe cargar src/styles/fonts.css de forma diferida (requestIdleCallback / setTimeout)', () => {
    const jsContent = fs.readFileSync(indexJsPath, 'utf8');
    assert.ok(
      jsContent.includes('./styles/fonts.css'),
      'index.js debe importar ./styles/fonts.css para registrar las fuentes locales'
    );
    assert.ok(
      jsContent.includes('loadLocalFonts'),
      'index.js debe usar carga diferida para fuentes locales'
    );
  });

  it('src/styles/fonts.css debe existir con fuentes locales empaquetadas (woff2)', () => {
    assert.ok(fs.existsSync(fontsCssPath), 'fonts.css debe existir');
    const cssContent = fs.readFileSync(fontsCssPath, 'utf8');
    assert.ok(cssContent.includes('@font-face'), 'fonts.css debe declarar reglas @font-face');
    assert.ok(cssContent.includes('.woff2'), 'fonts.css debe enlazar archivos locales woff2');
  });
});
