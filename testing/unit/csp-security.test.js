const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('Content Security Policy (CSP) Security Tests', () => {
  const indexHtmlPath = path.join(__dirname, '..', '..', 'src', 'index.html');
  const mainJsPath = path.join(__dirname, '..', '..', 'main.js');

  it('src/index.html debe contener meta tag con Content-Security-Policy estricta', () => {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    assert.ok(htmlContent.includes('http-equiv="Content-Security-Policy"'), 'Debe incluir http-equiv="Content-Security-Policy"');

    // Verificar directivas críticas
    assert.ok(htmlContent.includes("default-src 'self'"), 'Debe incluir default-src');
    assert.ok(htmlContent.includes("script-src 'self'"), 'Debe restringir script-src');
    assert.ok(htmlContent.includes("object-src 'none'"), 'Debe deshabilitar object-src');
    assert.ok(htmlContent.includes("base-uri 'self'"), 'Debe restringir base-uri');
    assert.ok(htmlContent.includes("https://fonts.googleapis.com"), 'Debe permitir estilos de Google Fonts');
    assert.ok(htmlContent.includes("https://fonts.gstatic.com"), 'Debe permitir fuentes de Google Fonts');
  });

  it('main.js debe registrar listener de onHeadersReceived para inyectar cabecera CSP', () => {
    const mainContent = fs.readFileSync(mainJsPath, 'utf8');
    assert.ok(mainContent.includes('onHeadersReceived'), 'main.js debe incluir onHeadersReceived');
    assert.ok(mainContent.includes("'Content-Security-Policy'"), 'main.js debe inyectar Content-Security-Policy');
  });
});
