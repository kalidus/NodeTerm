const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { resolveRecordingPaths } = require('../../src/main/handlers/recording-handlers');

describe('Contención de recordingId (path traversal)', () => {
  const recordingsDir = path.join('C:', 'Users', 'test', 'NodeTerm', 'recordings');

  it('resuelve ids legítimos dentro del directorio', () => {
    const result = resolveRecordingPaths(recordingsDir, 'session-abc123');
    assert.ok(result);
    assert.strictEqual(result.recordingId, 'session-abc123');
    assert.ok(result.castPath.endsWith(`${path.sep}session-abc123.cast`));
    assert.ok(result.metaPath.endsWith(`${path.sep}session-abc123.meta.json`));
  });

  it('neutraliza traversal con ../ usando basename (queda dentro del dir)', () => {
    const a = resolveRecordingPaths(recordingsDir, '../secrets');
    const b = resolveRecordingPaths(recordingsDir, '..\\secrets');
    const c = resolveRecordingPaths(recordingsDir, 'foo/../../etc/passwd');
    assert.ok(a);
    assert.strictEqual(a.recordingId, 'secrets');
    assert.ok(a.castPath.startsWith(path.resolve(recordingsDir)));
    assert.ok(b);
    assert.strictEqual(b.recordingId, 'secrets');
    assert.ok(c);
    assert.strictEqual(c.recordingId, 'passwd');
    assert.ok(!c.castPath.includes(`${path.sep}etc${path.sep}`));
  });

  it('rechaza ids vacíos o peligrosos', () => {
    assert.strictEqual(resolveRecordingPaths(recordingsDir, ''), null);
    assert.strictEqual(resolveRecordingPaths(recordingsDir, null), null);
    assert.strictEqual(resolveRecordingPaths(recordingsDir, '.'), null);
    assert.strictEqual(resolveRecordingPaths(recordingsDir, '..'), null);
  });

  it('usa solo el basename si el id incluye separadores', () => {
    const result = resolveRecordingPaths(recordingsDir, 'subdir/evil-id');
    assert.ok(result);
    assert.strictEqual(result.recordingId, 'evil-id');
    assert.ok(!result.castPath.includes(`${path.sep}subdir${path.sep}`));
  });
});
