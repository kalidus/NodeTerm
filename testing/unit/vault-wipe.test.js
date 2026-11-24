/**
 * Tests del wipe destructivo de vault + flag pending setup.
 */
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('vault wipe pending setup flag', () => {
  let vaultWrite;

  beforeEach(() => {
    global.sessionStorage = {
      _d: {},
      getItem(k) {
        return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null;
      },
      setItem(k, v) {
        this._d[k] = String(v);
      },
      removeItem(k) {
        delete this._d[k];
      }
    };
    delete require.cache[require.resolve('../../src/shared/vault-write')];
    vaultWrite = require('../../src/shared/vault-write');
  });

  afterEach(() => {
    delete global.sessionStorage;
  });

  it('setVaultWipePendingSetup toggles isVaultWipePendingSetup', () => {
    assert.equal(vaultWrite.isVaultWipePendingSetup(), false);
    vaultWrite.setVaultWipePendingSetup(true);
    assert.equal(vaultWrite.isVaultWipePendingSetup(), true);
    vaultWrite.setVaultWipePendingSetup(false);
    assert.equal(vaultWrite.isVaultWipePendingSetup(), false);
  });
});

describe('wipeAllVaultSidecarsOnDisk', () => {
  let tmpRoot;
  let vaultSidecar;
  let prevEnv;

  beforeEach(() => {
    prevEnv = process.env.NODETERM_TEST_DATA_DIR;
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nodeterm-wipe-'));
    process.env.NODETERM_TEST_DATA_DIR = tmpRoot;
    delete require.cache[require.resolve('../../src/main/utils/vault-sidecar')];
    vaultSidecar = require('../../src/main/utils/vault-sidecar');
    vaultSidecar.ensureVaultDir();
    const pwPath = vaultSidecar.sidecarPathForKey('passwords_encrypted');
    fs.writeFileSync(pwPath, Buffer.from('NTV1' + 'x'.repeat(40)));
    const workDir = path.join(tmpRoot, 'vault', 'work');
    fs.mkdirSync(workDir, { recursive: true });
    fs.writeFileSync(path.join(workDir, 'connections.bin'), Buffer.from('NTV1' + 'y'.repeat(40)));
  });

  afterEach(() => {
    if (prevEnv === undefined) delete process.env.NODETERM_TEST_DATA_DIR;
    else process.env.NODETERM_TEST_DATA_DIR = prevEnv;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('borra sidecars principales y directorios extra', () => {
    const beforePw = vaultSidecar.sidecarPathForKey('passwords_encrypted');
    assert.ok(fs.existsSync(beforePw));
    assert.ok(fs.existsSync(path.join(tmpRoot, 'vault', 'work')));

    const result = vaultSidecar.wipeAllVaultSidecarsOnDisk();
    assert.equal(result.success, true);
    assert.equal(fs.existsSync(beforePw), false);
    assert.equal(fs.existsSync(path.join(tmpRoot, 'vault', 'work')), false);
  });
});
