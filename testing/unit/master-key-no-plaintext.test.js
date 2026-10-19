const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

describe('security-handlers: no persistir masterKey en claro', () => {
  let tmpDir;
  let securityPath;
  let ipcHandlers;
  let safeStorageMock;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodeterm-sec-'));
    securityPath = path.join(tmpDir, 'security.json');
    ipcHandlers = new Map();

    safeStorageMock = {
      isEncryptionAvailable: () => false,
      encryptString: () => { throw new Error('unavailable'); },
      decryptString: () => { throw new Error('unavailable'); }
    };

    // stub modules usados por security-handlers
    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === 'electron') {
        return {
          ipcMain: {
            removeHandler(channel) { ipcHandlers.delete(channel); },
            handle(channel, handler) { ipcHandlers.set(channel, handler); }
          },
          safeStorage: safeStorageMock
        };
      }
      if (request === '../utils/file-utils' || request.endsWith('file-utils')) {
        return { getNodeTermDataDir: () => tmpDir };
      }
      if (request === '../services/vault-security-migrations' || request.endsWith('vault-security-migrations')) {
        return { VAULT_SECURITY_VERSION: 2 };
      }
      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve('../../src/main/handlers/security-handlers')];
    const { registerSecurityHandlers } = require('../../src/main/handlers/security-handlers');
    registerSecurityHandlers();
    Module._load = originalLoad;
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  });

  it('save-master-key falla cerrado si safeStorage no está disponible', async () => {
    const handler = ipcHandlers.get('security:save-master-key');
    assert.ok(handler, 'handler registrado');
    const result = await handler({}, {
      masterKey: 'mi-clave-secreta',
      rememberPassword: true
    });
    assert.strictEqual(result.success, false);
    assert.ok(!fs.existsSync(securityPath) || !JSON.parse(fs.readFileSync(securityPath, 'utf8')).masterKey);
  });

  it('save-master-key cifra y no deja masterKey cuando safeStorage funciona', async () => {
    safeStorageMock.isEncryptionAvailable = () => true;
    safeStorageMock.encryptString = (s) => Buffer.from(`enc:${s}`);

    // Re-registrar con mock actualizado
    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === 'electron') {
        return {
          ipcMain: {
            removeHandler(channel) { ipcHandlers.delete(channel); },
            handle(channel, handler) { ipcHandlers.set(channel, handler); }
          },
          safeStorage: safeStorageMock
        };
      }
      if (request === '../utils/file-utils' || request.endsWith('file-utils')) {
        return { getNodeTermDataDir: () => tmpDir };
      }
      if (request === '../services/vault-security-migrations' || request.endsWith('vault-security-migrations')) {
        return { VAULT_SECURITY_VERSION: 2 };
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[require.resolve('../../src/main/handlers/security-handlers')];
    const { registerSecurityHandlers } = require('../../src/main/handlers/security-handlers');
    registerSecurityHandlers();
    Module._load = originalLoad;

    const handler = ipcHandlers.get('security:save-master-key');
    const result = await handler({}, {
      masterKey: 'mi-clave-secreta',
      rememberPassword: true
    });
    assert.strictEqual(result.success, true);
    const config = JSON.parse(fs.readFileSync(securityPath, 'utf8'));
    assert.ok(config.masterKeyEncrypted);
    assert.strictEqual(config.masterKey, undefined);
  });

  it('get-master-key migra legado a encrypted y no deja plaintext en disco', async () => {
    safeStorageMock.isEncryptionAvailable = () => true;
    safeStorageMock.encryptString = (s) => Buffer.from(`enc:${s}`);
    safeStorageMock.decryptString = (buf) => buf.toString().replace(/^enc:/, '');

    fs.writeFileSync(securityPath, JSON.stringify({
      masterKey: 'legacy-plain-key',
      rememberPassword: true
    }), 'utf8');

    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === 'electron') {
        return {
          ipcMain: {
            removeHandler(channel) { ipcHandlers.delete(channel); },
            handle(channel, handler) { ipcHandlers.set(channel, handler); }
          },
          safeStorage: safeStorageMock
        };
      }
      if (request === '../utils/file-utils' || request.endsWith('file-utils')) {
        return { getNodeTermDataDir: () => tmpDir };
      }
      if (request === '../services/vault-security-migrations' || request.endsWith('vault-security-migrations')) {
        return { VAULT_SECURITY_VERSION: 2 };
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[require.resolve('../../src/main/handlers/security-handlers')];
    const { registerSecurityHandlers } = require('../../src/main/handlers/security-handlers');
    registerSecurityHandlers();
    Module._load = originalLoad;

    const getHandler = ipcHandlers.get('security:get-master-key');
    const key = await getHandler({});
    assert.strictEqual(key, 'legacy-plain-key');
    const config = JSON.parse(fs.readFileSync(securityPath, 'utf8'));
    assert.ok(config.masterKeyEncrypted);
    assert.strictEqual(config.masterKey, undefined);
  });

  it('get-master-key sigue devolviendo legado si no se puede migrar (no bloquea unlock)', async () => {
    safeStorageMock.isEncryptionAvailable = () => false;
    fs.writeFileSync(securityPath, JSON.stringify({
      masterKey: 'legacy-still-needed',
      rememberPassword: true
    }), 'utf8');

    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === 'electron') {
        return {
          ipcMain: {
            removeHandler(channel) { ipcHandlers.delete(channel); },
            handle(channel, handler) { ipcHandlers.set(channel, handler); }
          },
          safeStorage: safeStorageMock
        };
      }
      if (request === '../utils/file-utils' || request.endsWith('file-utils')) {
        return { getNodeTermDataDir: () => tmpDir };
      }
      if (request === '../services/vault-security-migrations' || request.endsWith('vault-security-migrations')) {
        return { VAULT_SECURITY_VERSION: 2 };
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[require.resolve('../../src/main/handlers/security-handlers')];
    const { registerSecurityHandlers } = require('../../src/main/handlers/security-handlers');
    registerSecurityHandlers();
    Module._load = originalLoad;

    const getHandler = ipcHandlers.get('security:get-master-key');
    const key = await getHandler({});
    assert.strictEqual(key, 'legacy-still-needed');
  });
});
