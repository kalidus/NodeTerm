const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const {
  assertSafeOutboundUrl,
  isBlockedMetadataHost,
  isLoopbackHost,
  isPrivateHost
} = require('../../src/main/utils/ssrf-guard');

describe('Fase 2 — ssrf-guard', () => {
  it('bloquea metadata cloud y link-local', () => {
    assert.strictEqual(isBlockedMetadataHost('169.254.169.254'), true);
    assert.strictEqual(isBlockedMetadataHost('metadata.google.internal'), true);
    assert.strictEqual(
      assertSafeOutboundUrl('http://169.254.169.254/latest/meta-data/', { allowPrivate: true, allowLoopback: true }).ok,
      false
    );
  });

  it('bloquea loopback salvo allowLoopback', () => {
    assert.strictEqual(isLoopbackHost('127.0.0.1'), true);
    assert.strictEqual(assertSafeOutboundUrl('http://127.0.0.1:8080/').ok, false);
    assert.strictEqual(
      assertSafeOutboundUrl('http://127.0.0.1:8080/', { allowLoopback: true, allowPrivate: true }).ok,
      true
    );
  });

  it('bloquea privadas salvo allowPrivate', () => {
    assert.strictEqual(isPrivateHost('192.168.1.10'), true);
    assert.strictEqual(assertSafeOutboundUrl('http://192.168.1.10/').ok, false);
    assert.strictEqual(
      assertSafeOutboundUrl('https://192.168.1.10/status', { allowPrivate: true }).ok,
      true
    );
  });

  it('exige mismo origin cuando allowedOrigin está definido', () => {
    const ok = assertSafeOutboundUrl('https://cloud.example.com/remote.php/dav', {
      allowedOrigin: 'https://cloud.example.com'
    });
    assert.strictEqual(ok.ok, true);

    const bad = assertSafeOutboundUrl('https://evil.example/steal', {
      allowedOrigin: 'https://cloud.example.com'
    });
    assert.strictEqual(bad.ok, false);
  });

  it('rechaza protocolos no http(s)', () => {
    assert.strictEqual(assertSafeOutboundUrl('file:///etc/passwd').ok, false);
    assert.strictEqual(assertSafeOutboundUrl('ftp://example.com/').ok, false);
  });
});

describe('Fase 2 — Joplin tar-slip filter', () => {
  const { JoplinImportService } = (() => {
    // Cargar clase sin ejecutar import
    const mod = require('../../src/main/services/JoplinImportService');
    return { JoplinImportService: mod };
  })();

  it('rechaza rutas con .. y absolutas', () => {
    const tempDir = path.join(require('os').tmpdir(), 'nodeterm-joplin-test');
    assert.strictEqual(
      JoplinImportService.isSafeTarEntry({ path: '../evil.md' }, tempDir),
      false
    );
    assert.strictEqual(
      JoplinImportService.isSafeTarEntry({ path: '/etc/passwd' }, tempDir),
      false
    );
    assert.strictEqual(
      JoplinImportService.isSafeTarEntry({ path: 'notes/hello.md' }, tempDir),
      true
    );
  });
});

describe('Fase 2 — validateImportFilePath para .jex', () => {
  const { validateImportFilePath } = require('../../src/main/handlers/system-handlers');

  it('acepta extensión .jex', () => {
    const res = validateImportFilePath('C:\\Users\\test\\export.jex');
    assert.strictEqual(res.ok, true);
  });

  it('rechaza archivos sensibles aunque tengan extensión rara', () => {
    // .env no está en allowlist
    const res = validateImportFilePath('C:\\Users\\test\\.env');
    assert.strictEqual(res.ok, false);
  });
});
