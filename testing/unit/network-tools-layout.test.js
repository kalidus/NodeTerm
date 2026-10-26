const { describe, it } = require('node:test');
const assert = require('node:assert');
const NetworkToolsService = require('../../src/main/services/NetworkToolsService');

describe('Herramientas de red ampliadas', () => {
  const service = new NetworkToolsService();

  it('comprueba si una IP está dentro del CIDR', () => {
    const inside = service.ipInCidr('192.168.1.10', '192.168.1.0/24');
    assert.strictEqual(inside.success, true);
    assert.strictEqual(inside.contains, true);
    assert.strictEqual(inside.queryIp, '192.168.1.10');

    const outside = service.ipInCidr('10.0.0.1', '192.168.1.0/24');
    assert.strictEqual(outside.contains, false);

    const hostRoute = service.ipInCidr('192.168.1.10', '192.168.1.10/32');
    assert.strictEqual(hostRoute.contains, true);
  });

  it('rechaza IP o CIDR maliciosos al comprobar pertenencia', () => {
    const badIp = service.ipInCidr("192.168.1.1; calc", '192.168.1.0/24');
    assert.strictEqual(badIp.success, false);
    const badCidr = service.ipInCidr('192.168.1.1', '192.168.1.0/24 && whoami');
    assert.strictEqual(badCidr.success, false);
  });

  it('rechaza nombres DNS inseguros', () => {
    assert.strictEqual(service._isSafeDnsName('ejemplo.com'), true);
    assert.strictEqual(service._isSafeDnsName('ejemplo.com.'), true);
    assert.strictEqual(service._isSafeDnsName('ejemplo.com; whoami'), false);
    assert.strictEqual(service._isSafeDnsName('$(whoami)'), false);
    assert.strictEqual(service._isSafeDnsName(''), false);
  });

  it('resume un documento RDAP', () => {
    const summary = service._summarizeRdap({
      name: 'NET-8-8-8-0',
      handle: 'NET-8-8-8-0',
      country: 'US',
      type: 'ALLOCATION',
      startAddress: '8.8.8.0',
      endAddress: '8.8.8.255',
      cidr0_cidrs: [{ v4prefix: '8.8.8.0', length: 24 }],
      entities: [{ vcardArray: ['vcard', [['fn', {}, 'text', 'Google LLC']]] }],
      port43: 'whois.arin.net'
    });
    assert.strictEqual(summary.name, 'NET-8-8-8-0');
    assert.deepStrictEqual(summary.cidrs, ['8.8.8.0/24']);
    assert.deepStrictEqual(summary.organizations, ['Google LLC']);
    assert.strictEqual(summary.country, 'US');
  });

  it('describe la clave SSH en formato wire', () => {
    const type = Buffer.from('ssh-ed25519');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(type.length);
    const key = Buffer.concat([len, type, Buffer.from('material')]);
    const described = service._describeHostKey(key);
    assert.strictEqual(described.keyType, 'ssh-ed25519');
    assert.match(described.fingerprintSha256, /^SHA256:/);
    assert.match(described.fingerprintMd5, /^[0-9a-f]{2}(?::[0-9a-f]{2}){15}$/);
  });

  it('parsea rutas de Windows, Linux y BSD', () => {
    const windows = service._parseWindowsRoutes('0.0.0.0/0|192.168.1.1|Ethernet|10\n192.168.1.0/24|0.0.0.0|Wi-Fi|256\n');
    assert.strictEqual(windows[0].destination, '0.0.0.0/0');
    assert.strictEqual(windows[0].gateway, '192.168.1.1');
    assert.strictEqual(windows[0].interface, 'Ethernet');
    assert.strictEqual(windows[0].metric, 10);
    assert.strictEqual(windows[1].interface, 'Wi-Fi');

    const linux = service._parseLinuxRoutes('default via 10.0.0.1 dev eth0 metric 100\n10.0.0.0/24 dev eth0 proto kernel scope link\n');
    assert.strictEqual(linux[0].destination, '0.0.0.0/0');
    assert.strictEqual(linux[0].gateway, '10.0.0.1');
    assert.strictEqual(linux[0].metric, 100);
    assert.strictEqual(linux[1].gateway, 'on-link');

    const bsd = service._parseBsdRoutes('Destination Gateway Flags Netif\ndefault 192.168.0.1 UGSc en0\n');
    assert.strictEqual(bsd[0].destination, '0.0.0.0/0');
    assert.strictEqual(bsd[0].gateway, '192.168.0.1');
    assert.strictEqual(bsd[0].interface, 'en0');
  });

  it('no consulta RDAP ni SSH con entrada inválida', async () => {
    const whois = await service.whoisIp('no-es-una-ip');
    assert.strictEqual(whois.success, false);
    const ssh = await service.sshFingerprint('host; calc.exe', 22);
    assert.strictEqual(ssh.success, false);
    const mail = await service.mailDns('ejemplo.com', 'selector con espacios');
    assert.strictEqual(mail.success, false);
  });

  it('bloquea redirecciones hacia metadata sin hacer la petición', async () => {
    const blocked = await service.redirectChain('http://169.254.169.254/latest/meta-data');
    assert.strictEqual(blocked.success, false);
    assert.match(blocked.error, /bloqueada/i);
    assert.deepStrictEqual(blocked.hops, []);
  });
});
