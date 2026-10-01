const { describe, it } = require('node:test');
const assert = require('node:assert');
const NetworkToolsService = require('../../src/main/services/NetworkToolsService');

describe('Seguridad en NetworkToolsService (H-15)', () => {
  const service = new NetworkToolsService();

  it('valida correctamente direcciones IPv4 legítimas', () => {
    assert.strictEqual(service._isValidIp('192.168.1.1'), true);
    assert.strictEqual(service._isValidIp('10.0.0.254'), true);
    assert.strictEqual(service._isValidIp('127.0.0.1'), true);
    assert.strictEqual(service._isValidIp('8.8.8.8'), true);
    assert.strictEqual(service._isValidIp('  172.16.0.1  '), true);
  });

  it('valida correctamente direcciones IPv6 legítimas', () => {
    assert.strictEqual(service._isValidIp('::1'), true);
    assert.strictEqual(service._isValidIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), true);
    assert.strictEqual(service._isValidIp('fe80::1'), true);
  });

  it('rechaza intentos de inyección de comandos en PowerShell/Shell', () => {
    assert.strictEqual(service._isValidIp("127.0.0.1'; calc.exe; #"), false);
    assert.strictEqual(service._isValidIp("192.168.1.1 | Out-File evil.txt"), false);
    assert.strictEqual(service._isValidIp("10.0.0.1; rm -rf /"), false);
    assert.strictEqual(service._isValidIp("$(whoami)"), false);
    assert.strictEqual(service._isValidIp("`calc.exe`"), false);
    assert.strictEqual(service._isValidIp("127.0.0.1 & echo pwned"), false);
    assert.strictEqual(service._isValidIp("127.0.0.1 && dir"), false);
  });

  it('rechaza entradas malformadas, nulas o vacías', () => {
    assert.strictEqual(service._isValidIp(''), false);
    assert.strictEqual(service._isValidIp(null), false);
    assert.strictEqual(service._isValidIp(undefined), false);
    assert.strictEqual(service._isValidIp('not-an-ip'), false);
    assert.strictEqual(service._isValidIp('256.256.256.256'), false);
    assert.strictEqual(service._isValidIp('192.168.1'), false);
    assert.strictEqual(service._isValidIp('192.168.1.1.1'), false);
  });

  it('descarta llamadas con IPs maliciosas en _getMacFromNetNeighbor sin ejecutar subprocesos', async () => {
    const res = await service._getMacFromNetNeighbor("127.0.0.1'; Write-Host 'injected'; #");
    assert.strictEqual(res, null);
  });

  it('descarta llamadas con IPs maliciosas en _resolveHostnameNslookup sin ejecutar subprocesos', async () => {
    const res = await service._resolveHostnameNslookup("8.8.8.8 && dir");
    assert.strictEqual(res, null);
  });

  it('descarta llamadas con IPs maliciosas en _nmapEnrichHost sin ejecutar subprocesos', async () => {
    const res = await service._nmapEnrichHost("192.168.1.1; whoami");
    assert.strictEqual(res, null);
  });
});
