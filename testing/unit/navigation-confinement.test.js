const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Confinamiento de Navegación en Electron (H-08)', () => {
  // Función validadora equivalente a la lógica de will-navigate en mainWindow
  function validateMainWindowNavigation(navigationUrl) {
    if (!navigationUrl || typeof navigationUrl !== 'string') {
      return { allowed: false, reason: 'empty_or_invalid' };
    }

    const isLocalDev = navigationUrl.startsWith('http://localhost:3000') || navigationUrl.startsWith('http://127.0.0.1:3000');
    const isAppBundle = navigationUrl.startsWith('file://') && (
      navigationUrl.includes('/dist/index.html') ||
      navigationUrl.includes('\\dist\\index.html') ||
      navigationUrl.includes('/src/index.html') ||
      navigationUrl.includes('\\src\\index.html')
    );

    if (isLocalDev || isAppBundle) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'unauthorized_navigation' };
  }

  // Función validadora equivalente a will-navigate en webview
  function validateWebviewNavigation(navUrl) {
    if (!navUrl || typeof navUrl !== 'string') return { allowed: false };
    try {
      const parsed = new URL(navUrl);
      const allowedProtocols = ['http:', 'https:', 'about:'];
      if (allowedProtocols.includes(parsed.protocol)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'unallowed_protocol' };
    } catch {
      return { allowed: false, reason: 'invalid_url' };
    }
  }

  it('permite navegación en mainWindow a localhost:3000 en desarrollo', () => {
    const res = validateMainWindowNavigation('http://localhost:3000');
    assert.strictEqual(res.allowed, true);
  });

  it('permite navegación en mainWindow al bundle local dist/index.html en producción', () => {
    const resWin = validateMainWindowNavigation('file:///C:/Users/User/AppData/Local/Programs/NodeTerm/resources/app.asar/dist/index.html');
    assert.strictEqual(resWin.allowed, true);

    const resUnix = validateMainWindowNavigation('file:///opt/nodeterm/dist/index.html');
    assert.strictEqual(resUnix.allowed, true);
  });

  it('bloquea navegación en mainWindow a URLs externas de internet', () => {
    const res = validateMainWindowNavigation('https://malicious.example.com/exploit.html');
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.reason, 'unauthorized_navigation');
  });

  it('bloquea drag & drop de archivos arbitrarios (file://) hacia mainWindow', () => {
    const res = validateMainWindowNavigation('file:///C:/Windows/win.ini');
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.reason, 'unauthorized_navigation');
  });

  it('bloquea esquemas data: y javascript: hacia mainWindow', () => {
    const resData = validateMainWindowNavigation('data:text/html,<script>alert(1)</script>');
    assert.strictEqual(resData.allowed, false);

    const resJs = validateMainWindowNavigation('javascript:alert(1)');
    assert.strictEqual(resJs.allowed, false);
  });

  it('en webviews permite HTTP, HTTPS y about:blank', () => {
    assert.strictEqual(validateWebviewNavigation('https://ubuntu.com/security/esm').allowed, true);
    assert.strictEqual(validateWebviewNavigation('http://192.168.1.1').allowed, true);
    assert.strictEqual(validateWebviewNavigation('about:blank').allowed, true);
  });

  it('en webviews bloquea esquemas peligrosos como file://, javascript: o chrome://', () => {
    assert.strictEqual(validateWebviewNavigation('file:///etc/passwd').allowed, false);
    assert.strictEqual(validateWebviewNavigation('chrome://settings').allowed, false);
    assert.strictEqual(validateWebviewNavigation('javascript:alert(1)').allowed, false);
  });
});
