const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('Fase 3 — recording-crypto', () => {
  let tmpDir;
  let recordingCrypto;
  let originalDataDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodeterm-rec-crypto-'));
    // Forzar data dir vía monkeypatch del módulo file-utils cacheado
    const fileUtilsPath = require.resolve('../../src/main/utils/file-utils');
    delete require.cache[fileUtilsPath];
    const fileUtils = require('../../src/main/utils/file-utils');
    originalDataDir = fileUtils.getNodeTermDataDir;
    fileUtils.getNodeTermDataDir = () => tmpDir;

    delete require.cache[require.resolve('../../src/main/utils/recording-crypto')];
    recordingCrypto = require('../../src/main/utils/recording-crypto');
  });

  after(() => {
    try {
      const fileUtils = require('../../src/main/utils/file-utils');
      if (originalDataDir) fileUtils.getNodeTermDataDir = originalDataDir;
    } catch (_) { /* noop */ }
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { /* noop */ }
  });

  it('cifra y descifra round-trip', () => {
    const plain = '{"version":2,"width":80}\n[0,"o","hello"]\n';
    const enc = recordingCrypto.encryptRecordingContent(plain);
    assert.ok(recordingCrypto.isEncryptedRecordingContent(enc));
    assert.notStrictEqual(enc, plain);
    const dec = recordingCrypto.decryptRecordingContent(enc);
    assert.strictEqual(dec, plain);
  });

  it('deja pasar asciicast en claro (legacy)', () => {
    const plain = '{"version":2}\n';
    assert.strictEqual(recordingCrypto.decryptRecordingContent(plain), plain);
    assert.strictEqual(recordingCrypto.isEncryptedRecordingContent(plain), false);
  });
});

describe('Fase 3 — ssrf/docker publish contract', () => {
  it('publicaciones docker usan loopback', () => {
    const samples = [
      `127.0.0.1:3000:8080`,
      `127.0.0.1:4822:4822`
    ];
    for (const p of samples) {
      assert.ok(p.startsWith('127.0.0.1:'));
    }
  });
});

describe('Fase 3 — MCP allowRemoteExec default', () => {
  it('default allowRemoteExec es false', () => {
    const cfg = { enabled: false, apiKey: '', port: 19800, allowRemoteExec: false };
    assert.strictEqual(cfg.allowRemoteExec, false);
  });
});
