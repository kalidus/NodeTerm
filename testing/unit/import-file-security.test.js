const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { validateImportFilePath } = require('../../src/main/handlers/system-handlers');

describe('Seguridad en Lectura de Archivos de Importación (H-09)', () => {
  it('permite archivos legítimos de importación con extensiones autorizadas', () => {
    assert.strictEqual(validateImportFilePath('C:\\Users\\User\\Downloads\\connections.xml').ok, true);
    assert.strictEqual(validateImportFilePath('/home/user/backup.nodeterm').ok, true);
    assert.strictEqual(validateImportFilePath('config.json').ok, true);
    assert.strictEqual(validateImportFilePath('hosts.csv').ok, true);
    assert.strictEqual(validateImportFilePath('servers.yaml').ok, true);
    assert.strictEqual(validateImportFilePath('ansible.yml').ok, true);
    assert.strictEqual(validateImportFilePath('list.txt').ok, true);
    assert.strictEqual(validateImportFilePath('session.rdp').ok, true);
    assert.strictEqual(validateImportFilePath('notes.jex').ok, true);
  });

  it('rechaza archivos sin extensión o con extensiones peligrosas / del sistema', () => {
    assert.strictEqual(validateImportFilePath('C:\\Windows\\System32\\calc.exe').ok, false);
    assert.strictEqual(validateImportFilePath('C:\\Windows\\System32\\drivers\\etc\\hosts').ok, false);
    assert.strictEqual(validateImportFilePath('/etc/shadow').ok, false);
    assert.strictEqual(validateImportFilePath('/etc/passwd').ok, false);
    assert.strictEqual(validateImportFilePath('payload.bat').ok, false);
    assert.strictEqual(validateImportFilePath('exploit.cmd').ok, false);
    assert.strictEqual(validateImportFilePath('script.sh').ok, false);
    assert.strictEqual(validateImportFilePath('library.dll').ok, false);
    assert.strictEqual(validateImportFilePath('win.ini').ok, false);
  });

  it('bloquea patrones de archivos sensibles y claves criptográficas', () => {
    assert.strictEqual(validateImportFilePath('.env').ok, false);
    assert.strictEqual(validateImportFilePath('.env.local').ok, false);
    assert.strictEqual(validateImportFilePath('.env.production').ok, false);
    assert.strictEqual(validateImportFilePath('security.json').ok, false);
    assert.strictEqual(validateImportFilePath('app-data.json').ok, false);
    assert.strictEqual(validateImportFilePath('id_rsa').ok, false);
    assert.strictEqual(validateImportFilePath('id_ed25519').ok, false);
    assert.strictEqual(validateImportFilePath('id_rsa.pub').ok, false);
    assert.strictEqual(validateImportFilePath('known_hosts').ok, false);
    assert.strictEqual(validateImportFilePath('authorized_keys').ok, false);
    assert.strictEqual(validateImportFilePath('nodeterm_master_key.json').ok, false);
  });

  it('rechaza entradas nulas, vacías o malformadas', () => {
    assert.strictEqual(validateImportFilePath(null).ok, false);
    assert.strictEqual(validateImportFilePath(undefined).ok, false);
    assert.strictEqual(validateImportFilePath('').ok, false);
    assert.strictEqual(validateImportFilePath('   ').ok, false);
  });
});
