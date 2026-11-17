const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Oleada 3 — seguridad subprocess y wrappers', () => {
  it('DockerService no usa shell:true ni execSync de string libre', () => {
    const src = read('src/main/services/DockerService.js');
    assert.ok(!src.includes('shell: true') && !src.includes('shell:true'));
    assert.ok(src.includes('execFileSync'));
    assert.ok(src.includes('dockerExecSync'));
    assert.ok(!/\bexecSync\s*\(\s*['"]docker/.test(src));
  });

  it('dns-whois y NetworkTools availability van por execFile', () => {
    const dns = read('src/main/services/network-tools/dns-whois.js');
    const net = read('src/main/services/NetworkToolsService.js');
    assert.ok(!dns.includes('shell: true') && !dns.includes('shell:true'));
    assert.ok(dns.includes("execFile('arp'"));
    assert.ok(dns.includes("execFileAsync('ip'"));
    assert.ok(!net.includes('shell: true') && !net.includes('shell:true'));
    assert.ok(net.includes("execFileAsync('where'"));
    assert.ok(net.includes("execFileAsync('which'"));
  });

  it('DockerTerminal es wrapper de localPtyTerminalFactory', () => {
    const src = read('src/components/DockerTerminal.js');
    assert.ok(src.includes("createLocalPtyTerminal('docker')"));
    assert.ok(src.length < 400, 'wrapper debe ser fino');
    const session = read('src/utils/localPtySession.js');
    assert.ok(session.includes('docker:'));
    assert.ok(session.includes("channel === 'docker'"));
  });

  it('hermescli y antigravitycli usan ai-cli-handler-factory', () => {
    const hermes = read('src/main/handlers/hermescli-handlers.js');
    const anti = read('src/main/handlers/antigravitycli-handlers.js');
    assert.ok(hermes.includes('createAiCliHandler'));
    assert.ok(anti.includes('createAiCliHandler'));
    assert.ok(hermes.includes('installPs1Url'));
    assert.ok(anti.includes('installPs1Url'));
    assert.ok(!hermes.includes("exec(\n        `curl"));
    assert.ok(!anti.includes("exec(\n        `curl"));
  });

  it('formDebugger solo exporta la API del menú manual', () => {
    const src = read('src/utils/formDebugger.js');
    assert.ok(src.includes('detectBlockedInputs'));
    assert.ok(src.includes('unblockAllInputs'));
    assert.ok(!src.includes('emergencyUnblockForms'));
    assert.ok(!src.includes('resolveFormBlocking'));
    assert.ok(!src.includes('useFormDebugger'));
  });

  it('main quit Docker usa execFile stop', () => {
    const main = read('main.js');
    assert.ok(main.includes('stopAiClientDockerContainersOnQuit'));
    assert.ok(main.includes("execFileAsync(dockerBin, ['stop', name]"));
    assert.ok(!/execAsync\(`\$\{dockerPrefix\} stop/.test(main));
  });
});
