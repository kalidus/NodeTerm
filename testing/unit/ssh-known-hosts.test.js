const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sshKnownHostsService = require('../../src/main/services/SSHKnownHostsService');

function buildFakeEd25519HostKey() {
  const keyType = 'ssh-ed25519';
  const typeBuf = Buffer.from(keyType, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(typeBuf.length, 0);
  // Clave host mínima válida para isValidHostKeyBlob (>= 40 bytes)
  const payload = Buffer.alloc(32, 0x42);
  return Buffer.concat([header, typeBuf, payload]);
}

describe('SSHKnownHostsService - primer contacto sin directorio ssh/', () => {
  let tempDir;
  let previousPath;
  let previousLoaded;
  let previousEntries;

  beforeEach(() => {
    previousPath = sshKnownHostsService.filePath;
    previousLoaded = sshKnownHostsService.loaded;
    previousEntries = new Map(sshKnownHostsService.entries);

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodeterm-known-hosts-'));
    sshKnownHostsService.setUserDataPath(tempDir);
  });

  afterEach(() => {
    sshKnownHostsService.filePath = previousPath;
    sshKnownHostsService.loaded = previousLoaded;
    sshKnownHostsService.entries = previousEntries;

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('lookup no marca loaded cuando known_hosts no existe', () => {
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'ssh')), false);
    const entry = sshKnownHostsService.lookup('example.test', 22);
    assert.strictEqual(entry, null);
    assert.strictEqual(sshKnownHostsService.loaded, false);
  });

  it('verifyHostKey con warn_new crea ssh/known_hosts tras lookup previo', async () => {
    const hostKey = buildFakeEd25519HostKey();

    // Reproduce el orden real: applyHostKeyPolicy llama lookup antes del handshake
    assert.strictEqual(sshKnownHostsService.lookup('10.0.0.1', 22), null);
    assert.strictEqual(sshKnownHostsService.loaded, false);

    const accepted = await sshKnownHostsService.verifyHostKey(
      '10.0.0.1',
      22,
      hostKey,
      'warn_new',
      () => {}
    );

    assert.strictEqual(accepted, true);

    const knownHostsPath = path.join(tempDir, 'ssh', 'known_hosts');
    assert.ok(fs.existsSync(knownHostsPath), 'debe crear ssh/known_hosts');

    const content = fs.readFileSync(knownHostsPath, 'utf8');
    assert.match(content, /\[10\.0\.0\.1\]:22\s+ssh-ed25519\s+/);
  });
});
