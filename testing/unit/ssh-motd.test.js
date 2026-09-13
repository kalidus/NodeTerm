const { describe, it } = require('node:test');
const assert = require('node:assert');

const { extractMotdBanner } = require('../../src/main/utils/ssh-motd');

describe('SSH MOTD Extraction & Caching Unit Tests', () => {
  it('debe manejar entradas inválidas o vacías', () => {
    assert.deepStrictEqual(extractMotdBanner(null), { matched: false, motd: null });
    assert.deepStrictEqual(extractMotdBanner(undefined), { matched: false, motd: null });
    assert.deepStrictEqual(extractMotdBanner(''), { matched: false, motd: null });
  });

  it('debe extraer el MOTD de Ubuntu con Last login en inglés', () => {
    const rawData = [
      'Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-31-generic x86_64)',
      '',
      ' * Documentation:  https://help.ubuntu.com',
      ' * Management:     https://landscape.canonical.com',
      ' * Support:        https://ubuntu.com/pro',
      '',
      '  System information as of Sun Sep 13 19:02:02 UTC 2026',
      '',
      '  System load:  0.08               Processes:             142',
      '  Usage of /:   12.3% of 28.90GB   Users logged in:       1',
      '  Memory usage: 22%                IPv4 address for eth0: 192.168.10.50',
      '  Swap usage:   0%',
      '',
      'Last login: Sun Sep 13 19:02:02 2026 from 192.168.10.221',
      'kalidus@Kepler:~$ '
    ].join('\n');

    const result = extractMotdBanner(rawData);
    assert.strictEqual(result.matched, true);
    assert.ok(result.motd.includes('Welcome to Ubuntu 24.04 LTS'));
    assert.ok(result.motd.includes('System load:  0.08'));
    // No debe incluir Last login ni el prompt de la shell
    assert.strictEqual(result.motd.includes('Last login:'), false);
    assert.strictEqual(result.motd.includes('kalidus@Kepler'), false);
    // Debe terminar en CRLF
    assert.ok(result.motd.endsWith('\r\n\r\n'));
  });

  it('debe soportar Last login precedido por CRLF y no coincidir si no hay Last login', () => {
    const routerOutput = [
      'ASUSWRT-Merlin RT-BE86U 3006.102.7_0 Sun Feb 22 16:48:39 UTC 2026',
      'kalidus@RT-BE86U:/tmp/home/root# '
    ].join('\r\n');

    const result = extractMotdBanner(routerOutput);
    assert.strictEqual(result.matched, false);
    assert.strictEqual(result.motd, null);
  });

  it('debe soportar Último inicio de sesión localizado en español', () => {
    const rawData = [
      'Linux debian-srv 6.1.0-21-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.90-1',
      'Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY.',
      '',
      'Último inicio de sesión: Sun Sep 13 18:30:10 2026 desde 192.168.1.50',
      'user@debian:~$ '
    ].join('\n');

    const result = extractMotdBanner(rawData);
    assert.strictEqual(result.matched, true);
    assert.ok(result.motd.includes('Linux debian-srv'));
    assert.strictEqual(result.motd.includes('Último inicio de sesión:'), false);
  });

  it('debe retornar matched: true y motd: null si Last login es la primera línea', () => {
    const rawData = 'Last login: Sun Sep 13 19:02:02 2026 from 192.168.10.221\r\nuser@host:~$ ';
    const result = extractMotdBanner(rawData);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.motd, null);
  });
});
