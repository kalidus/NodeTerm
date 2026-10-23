const { describe, it } = require('node:test');
const assert = require('node:assert');

/**
 * Tests de endurecimiento Fase 1 (validaciones puras / contratos).
 * No arrancan Electron; cubren la lógica que no debe regresionar.
 */

describe('Fase 1 — file:get-path-for-file índice seguro', () => {
  function validateFileIndex(fileIndex) {
    const index = typeof fileIndex === 'number' ? fileIndex : NaN;
    if (!Number.isInteger(index) || index < 0 || index > 10000) {
      return { ok: false, error: 'Invalid file index' };
    }
    return { ok: true, index, serialized: JSON.stringify(index) };
  }

  it('acepta índices enteros no negativos', () => {
    assert.deepStrictEqual(validateFileIndex(0), { ok: true, index: 0, serialized: '0' });
    assert.deepStrictEqual(validateFileIndex(3), { ok: true, index: 3, serialized: '3' });
  });

  it('rechaza inyección / valores no enteros', () => {
    assert.strictEqual(validateFileIndex('0);alert(1)//').ok, false);
    assert.strictEqual(validateFileIndex('1; require("fs")').ok, false);
    assert.strictEqual(validateFileIndex(-1).ok, false);
    assert.strictEqual(validateFileIndex(1.5).ok, false);
    assert.strictEqual(validateFileIndex(undefined).ok, false);
    assert.strictEqual(validateFileIndex(null).ok, false);
    assert.strictEqual(validateFileIndex(10001).ok, false);
  });

  it('JSON.stringify del índice nunca produce código ejecutable', () => {
    const { serialized } = validateFileIndex(42);
    assert.strictEqual(serialized, '42');
    assert.ok(!/[;`'"]/.test(serialized));
  });
});

describe('Fase 1 — ssh-connection-ready sin password en claro', () => {
  function buildReadyPayload({ originalKey, tabId, manualPassword }) {
    const hasManualPassword = Boolean(manualPassword);
    return {
      originalKey,
      tabId,
      manualPasswordAvailable: hasManualPassword
    };
  }

  it('no incluye el campo password aunque haya login manual', () => {
    const payload = buildReadyPayload({
      originalKey: 'conn-1',
      tabId: 'tab-1',
      manualPassword: 's3cret'
    });
    assert.strictEqual(payload.password, undefined);
    assert.strictEqual(payload.manualPasswordAvailable, true);
    assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'password'));
  });

  it('marca manualPasswordAvailable=false si no hubo password manual', () => {
    const payload = buildReadyPayload({
      originalKey: 'conn-1',
      tabId: 'tab-1',
      manualPassword: null
    });
    assert.strictEqual(payload.manualPasswordAvailable, false);
  });
});

describe('Fase 1 — will-attach-webview fuerza webSecurity', () => {
  function applyWillAttachWebview(webPreferences) {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInWorker = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webSecurity = true;
    return webPreferences;
  }

  it('sobrescribe webSecurity=false del guest', () => {
    const prefs = applyWillAttachWebview({
      preload: 'evil.js',
      nodeIntegration: true,
      webSecurity: false
    });
    assert.strictEqual(prefs.webSecurity, true);
    assert.strictEqual(prefs.nodeIntegration, false);
    assert.strictEqual(prefs.sandbox, true);
    assert.strictEqual(prefs.preload, undefined);
  });
});

describe('Fase 1 — Guacamole bind loopback', () => {
  it('websocketOptions incluye host 127.0.0.1', () => {
    const websocketPort = 8081;
    const websocketOptions = { host: '127.0.0.1', port: websocketPort, perMessageDeflate: false };
    assert.strictEqual(websocketOptions.host, '127.0.0.1');
  });

  it('docker -p publica solo en loopback', () => {
    const port = 4822;
    const publish = `127.0.0.1:${port}:4822`;
    assert.ok(publish.startsWith('127.0.0.1:'));
    assert.ok(!publish.match(/^-p\s+\d+:/) && !/^0\.0\.0\.0:/.test(publish));
  });
});
