const { describe, it } = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

describe('ipc-trust — no tumbar get-master-key del renderer', () => {
  it('rechaza solo webviews; permite sender de ventana sin fromWebContents', () => {
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === 'electron') {
        return {
          BrowserWindow: {
            fromWebContents: () => null // caso frágil que antes fallaba cerrado
          }
        };
      }
      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve('../../src/main/utils/ipc-trust')];
    const { assertTrustedIpcSender } = require('../../src/main/utils/ipc-trust');

    const windowSender = {
      isDestroyed: () => false,
      getType: () => 'window'
    };
    assert.strictEqual(assertTrustedIpcSender({ sender: windowSender }).ok, true);

    const webviewSender = {
      isDestroyed: () => false,
      getType: () => 'webview'
    };
    const blocked = assertTrustedIpcSender({ sender: webviewSender });
    assert.strictEqual(blocked.ok, false);
    assert.match(blocked.error, /webview/i);

    Module._load = originalLoad;
    delete require.cache[require.resolve('../../src/main/utils/ipc-trust')];
  });

  it('get-master-key sigue devolviendo clave con sender de ventana (fromWebContents null)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodeterm-ipc-trust-'));
    const securityPath = path.join(tmpDir, 'security.json');
    const ipcHandlers = new Map();

    const plain = 'clave-auto-unlock';
    const safeStorageMock = {
      isEncryptionAvailable: () => true,
      encryptString: (s) => Buffer.from(`enc:${s}`),
      decryptString: (buf) => buf.toString().replace(/^enc:/, '')
    };

    fs.writeFileSync(securityPath, JSON.stringify({
      masterKeyEncrypted: Buffer.from(`enc:${plain}`).toString('base64'),
      rememberPassword: true,
      vaultVerifier: { salt: [1], iv: [1], data: [1] }
    }), 'utf8');

    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === 'electron') {
        return {
          ipcMain: {
            removeHandler(channel) { ipcHandlers.delete(channel); },
            handle(channel, handler) { ipcHandlers.set(channel, handler); }
          },
          safeStorage: safeStorageMock,
          BrowserWindow: {
            fromWebContents: () => null
          }
        };
      }
      if (request === '../utils/file-utils' || request.endsWith('file-utils')) {
        return { getNodeTermDataDir: () => tmpDir };
      }
      if (request === '../services/vault-security-migrations' || request.endsWith('vault-security-migrations')) {
        return { VAULT_SECURITY_VERSION: 2 };
      }
      if (request === '../utils/ipc-trust' || request.endsWith('ipc-trust')) {
        // Usar implementación real
        return originalLoad.call(this, request, parent, isMain);
      }
      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve('../../src/main/utils/ipc-trust')];
    delete require.cache[require.resolve('../../src/main/handlers/security-handlers')];
    const { registerSecurityHandlers } = require('../../src/main/handlers/security-handlers');
    registerSecurityHandlers();

    const getHandler = ipcHandlers.get('security:get-master-key');
    assert.ok(getHandler);

    const event = {
      sender: {
        isDestroyed: () => false,
        getType: () => 'window'
      }
    };
    // Stub sigue activo: BrowserWindow.fromWebContents → null (antes devolvía null al renderer)
    const key = await getHandler(event);
    Module._load = originalLoad;
    assert.strictEqual(key, plain);

    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  });
});
