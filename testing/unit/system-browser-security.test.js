const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateBrowserUrl, getWindowsBrowserPath } = require('../../src/main/handlers/system-handlers');

describe('System Browser Launcher Security Tests (Command Injection Prevention)', () => {
  describe('validateBrowserUrl', () => {
    it('debe permitir URLs HTTP y HTTPS válidas', () => {
      const validUrls = [
        'https://google.com',
        'http://example.com',
        'https://sub.domain.org/path/to/resource?arg1=val1&arg2=val2#anchor',
        'https://192.168.1.1:8443/login?redirect=%2Fdashboard',
        'https://en.wikipedia.org/wiki/C_(programming_language)'
      ];

      for (const u of validUrls) {
        const res = validateBrowserUrl(u);
        assert.strictEqual(res.valid, true, `Debería ser válida: ${u}`);
        assert.ok(res.url.startsWith('http://') || res.url.startsWith('https://'));
      }
    });

    it('debe rechazar protocolos peligrosos o no web', () => {
      const dangerousProtocols = [
        'javascript:alert(1)',
        'file:///C:/Windows/System32/cmd.exe',
        'smb://evil.com/share',
        'calc.exe',
        'data:text/html,<script>alert(1)</script>',
        'ftp://anonymous@ftp.example.com',
        'powershell.exe'
      ];

      for (const u of dangerousProtocols) {
        const res = validateBrowserUrl(u);
        assert.strictEqual(res.valid, false, `Debería ser rechazada: ${u}`);
      }
    });

    it('debe rechazar intentos de inyección de comandos en shell y caracteres de control', () => {
      const injectionAttempts = [
        'https://example.com" & calc.exe',
        'https://example.com/test`whoami`',
        'https://example.com/test$(id)',
        'https://example.com/test\r\nstart calc.exe',
        'https://example.com/test\0evil',
        'https://example.com/test;notepad',
        'https://example.com/test<script>',
        'https://example.com/test>output.txt',
        'https://example.com/test^',
        'https://example.com/test\' OR 1=1'
      ];

      for (const u of injectionAttempts) {
        const res = validateBrowserUrl(u);
        assert.strictEqual(res.valid, false, `Debería ser rechazada por inyección: ${u}`);
      }
    });

    it('debe rechazar URLs nulas, vacías o no string', () => {
      assert.strictEqual(validateBrowserUrl(null).valid, false);
      assert.strictEqual(validateBrowserUrl(undefined).valid, false);
      assert.strictEqual(validateBrowserUrl('').valid, false);
      assert.strictEqual(validateBrowserUrl('   ').valid, false);
      assert.strictEqual(validateBrowserUrl(12345).valid, false);
      assert.strictEqual(validateBrowserUrl({}).valid, false);
    });
  });

  describe('getWindowsBrowserPath', () => {
    it('debe detectar al menos un navegador si está en Windows', () => {
      if (process.platform === 'win32') {
        const chromePath = getWindowsBrowserPath('chrome');
        const edgePath = getWindowsBrowserPath('edge');
        assert.ok(chromePath || edgePath, 'Al menos Chrome o Edge deberían detectarse en Windows');
      }
    });

    it('debe devolver null para navegadores no soportados', () => {
      assert.strictEqual(getWindowsBrowserPath('nonexistent_browser_xyz'), null);
    });
  });
});
