const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  parseLsOutput,
  escapeShellPath,
  parseListeningPorts
} = require('../../src/main/handlers/ssh-handlers');

const {
  getDrives,
  sanitizeLocalPath
} = require('../../src/main/handlers/local-fs-handlers');

describe('SSH Parser & Shell Security Unit Tests', () => {
  describe('parseLsOutput', () => {
    it('debe manejar entradas vacías o nulas de forma segura', () => {
      assert.deepStrictEqual(parseLsOutput(null), []);
      assert.deepStrictEqual(parseLsOutput(undefined), []);
      assert.deepStrictEqual(parseLsOutput(''), []);
      assert.deepStrictEqual(parseLsOutput('   \n\n  '), []);
      assert.deepStrictEqual(parseLsOutput('total 48\n'), []);
    });

    it('debe parsear archivos estándar y directorios con precisión', () => {
      const output = [
        'total 24',
        '-rw-r--r-- 1 root root 4096 Jan 15 10:23 config.yaml',
        'drwxr-xr-x 5 user dev  4096 Jan 15 10:25 projects'
      ].join('\n');

      const files = parseLsOutput(output);
      assert.strictEqual(files.length, 2);

      // Archivo
      assert.strictEqual(files[0].name, 'config.yaml');
      assert.strictEqual(files[0].type, 'file');
      assert.strictEqual(files[0].size, 4096);
      assert.strictEqual(files[0].owner, 'root');
      assert.strictEqual(files[0].group, 'root');
      assert.strictEqual(files[0].permissions, '-rw-r--r--');
      assert.strictEqual(files[0].target, null);

      // Directorio
      assert.strictEqual(files[1].name, 'projects');
      assert.strictEqual(files[1].type, 'directory');
      assert.strictEqual(files[1].owner, 'user');
      assert.strictEqual(files[1].group, 'dev');
      assert.strictEqual(files[1].permissions, 'drwxr-xr-x');
    });

    it('debe soportar nombres de archivos y directorios con múltiples espacios', () => {
      const output = [
        '-rw-r--r-- 1 user group 1024 Jan 15 10:23 Reporte de Ventas Q1 2024 Final.xlsx',
        'drwxr-xr-x 2 user group 4096 Jan 15 10:30 Carpeta con Espacios y Acentos'
      ].join('\n');

      const files = parseLsOutput(output);
      assert.strictEqual(files.length, 2);
      assert.strictEqual(files[0].name, 'Reporte de Ventas Q1 2024 Final.xlsx');
      assert.strictEqual(files[0].type, 'file');
      assert.strictEqual(files[0].size, 1024);

      assert.strictEqual(files[1].name, 'Carpeta con Espacios y Acentos');
      assert.strictEqual(files[1].type, 'directory');
    });

    it('debe parsear enlaces simbólicos extrayendo name y target correctamente', () => {
      const output = [
        'lrwxrwxrwx 1 root root 15 Sep 13 12:00 current_app -> /var/www/app_v2',
        'lrwxrwxrwx 1 user group 28 Sep 13 12:05 link con espacios -> /ruta con espacios/destino.txt'
      ].join('\n');

      const files = parseLsOutput(output);
      assert.strictEqual(files.length, 2);

      assert.strictEqual(files[0].name, 'current_app');
      assert.strictEqual(files[0].type, 'symlink');
      assert.strictEqual(files[0].target, '/var/www/app_v2');

      assert.strictEqual(files[1].name, 'link con espacios');
      assert.strictEqual(files[1].type, 'symlink');
      assert.strictEqual(files[1].target, '/ruta con espacios/destino.txt');
    });

    it('debe soportar formatos de fecha ISO 8601 (ls --time-style=long-iso)', () => {
      const output = [
        '-rw-r--r-- 1 user group 2048 2024-05-12 14:30 backup.tar.gz',
        '-rw-r--r-- 1 user group 1024 2024-05-12 14:30:45 detailed.log'
      ].join('\n');

      const files = parseLsOutput(output);
      assert.strictEqual(files.length, 2);
      assert.strictEqual(files[0].name, 'backup.tar.gz');
      assert.strictEqual(files[0].modified, '2024-05-12 14:30');
      assert.strictEqual(files[1].name, 'detailed.log');
      assert.strictEqual(files[1].modified, '2024-05-12 14:30:45');
    });

    it('debe soportar formatos de fecha localizados (español / europeo)', () => {
      const output = [
        '-rw-r--r-- 1 user group 1024 15 ene 10:23 archivo_esp1.txt',
        '-rw-r--r-- 1 user group 1024 ene 15 10:23 archivo_esp2.txt',
        '-rw-r--r-- 1 user group 1024 15 ene 2023 archivo_esp3.txt'
      ].join('\n');

      const files = parseLsOutput(output);
      assert.strictEqual(files.length, 3);
      assert.strictEqual(files[0].name, 'archivo_esp1.txt');
      assert.strictEqual(files[1].name, 'archivo_esp2.txt');
      assert.strictEqual(files[2].name, 'archivo_esp3.txt');
    });

    it('debe soportar atributos extendidos de permisos (SELinux dot y ACL plus)', () => {
      const output = [
        '-rw-r--r--. 1 root root 512 Jan 15 10:23 selinux_file.txt',
        '-rw-r--r--+ 1 root root 512 Jan 15 10:23 acl_file.txt',
        'drwxrwxrwt  2 root root 4096 Jan 15 10:23 sticky_tmp'
      ].join('\n');

      const files = parseLsOutput(output);
      assert.strictEqual(files.length, 3);
      assert.strictEqual(files[0].name, 'selinux_file.txt');
      assert.strictEqual(files[0].type, 'file');
      assert.strictEqual(files[1].name, 'acl_file.txt');
      assert.strictEqual(files[1].type, 'file');
      assert.strictEqual(files[2].name, 'sticky_tmp');
      assert.strictEqual(files[2].type, 'directory');
    });
  });

  describe('escapeShellPath', () => {
    it('debe escapar caracteres peligrosos y operadores shell', () => {
      const dangerous = 'file; rm -rf / && echo "pwned" | cat `whoami` $PATH < > !';
      const escaped = escapeShellPath(dangerous);

      assert.ok(escaped.includes('\\;'));
      assert.ok(escaped.includes('\\|'));
      assert.ok(escaped.includes('\\&'));
      assert.ok(escaped.includes('\\"'));
      assert.ok(escaped.includes('\\`'));
      assert.ok(escaped.includes('\\$'));
      assert.ok(escaped.includes('\\<'));
      assert.ok(escaped.includes('\\>'));
      assert.ok(escaped.includes('\\!'));
      // Verificar que no hay punto y coma sin escapar
      assert.ok(!/(?<!\\);/.test(escaped));
    });

    it('debe eliminar saltos de línea para evitar command injection', () => {
      const injection = 'test\nrm -rf /\r\nevil';
      const sanitized = escapeShellPath(injection);
      assert.strictEqual(sanitized.includes('\n'), false);
      assert.strictEqual(sanitized.includes('\r'), false);
    });

    it('debe retornar string vacío si recibe tipos no-string', () => {
      assert.strictEqual(escapeShellPath(null), '');
      assert.strictEqual(escapeShellPath(undefined), '');
      assert.strictEqual(escapeShellPath(123), '');
      assert.strictEqual(escapeShellPath({}), '');
    });
  });

  describe('parseListeningPorts', () => {
    it('debe parsear puertos en escucha de ss y netstat', () => {
      const netstatOutput = [
        'Proto Recv-Q Send-Q Local Address           Foreign Address         State',
        'tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN',
        'tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN',
        'udp        0      0 0.0.0.0:68              0.0.0.0:*'
      ].join('\n');

      const netstatPorts = parseListeningPorts(netstatOutput);
      assert.ok(Array.isArray(netstatPorts));
      assert.strictEqual(netstatPorts.length, 3);
      const sshNetstat = netstatPorts.find((p) => p.localPort === '22');
      assert.ok(sshNetstat !== undefined);
      assert.strictEqual(sshNetstat.state, 'LISTEN');

      const ssOutput = [
        'Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process',
        'tcp   LISTEN 0      128          0.0.0.0:80         0.0.0.0:*',
        'tcp   LISTEN 0      128        127.0.0.1:5432       0.0.0.0:*'
      ].join('\n');

      const ssPorts = parseListeningPorts(ssOutput);
      assert.ok(Array.isArray(ssPorts));
      assert.strictEqual(ssPorts.length, 2);
      const httpPort = ssPorts.find((p) => p.localPort === '80');
      assert.ok(httpPort !== undefined);
      assert.strictEqual(httpPort.state, 'LISTEN');
    });
  });

  describe('Local FS Security & Drives', () => {
    it('getDrives retorna al menos C:\\ en Windows sin invocar wmic', async () => {
      const result = await getDrives();
      assert.strictEqual(result.success, true);
      assert.ok(Array.isArray(result.drives));
      if (process.platform === 'win32') {
        assert.ok(result.drives.includes('C:\\'));
      }
    });

    it('sanitizeLocalPath previene path traversal con ..', () => {
      const safe = sanitizeLocalPath('C:\\test\\..\\windows\\system32');
      assert.ok(typeof safe === 'string');
      assert.ok(!safe.includes('..'));
    });
  });
});
