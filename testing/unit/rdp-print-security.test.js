const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const os = require('os');
const { sanitizePrintPdfFilename } = require('../../src/main/handlers/rdp-handlers');

describe('Seguridad en Impresión RDP: Path Traversal (H-10)', () => {
  const mockDownloads = path.join(os.tmpdir(), 'nodeterm-mock-downloads');

  it('guarda un archivo PDF normal de forma segura dentro de downloadsDir', () => {
    const { targetPath, cleanName } = sanitizePrintPdfFilename('balance-2026.pdf', mockDownloads);
    assert.strictEqual(cleanName, 'balance-2026.pdf');
    assert.strictEqual(targetPath, path.join(path.resolve(mockDownloads), 'balance-2026.pdf'));
  });

  it('neutraliza intentos de Path Traversal con barras diagonales (../../Windows/System32/evil.exe)', () => {
    const { targetPath, cleanName } = sanitizePrintPdfFilename('../../../../Windows/System32/evil.exe', mockDownloads);
    assert.strictEqual(cleanName, 'evil.exe.pdf');
    assert.ok(targetPath.startsWith(path.resolve(mockDownloads)));
    assert.ok(!targetPath.includes('System32'));
  });

  it('neutraliza intentos de Path Traversal con barras invertidas de Windows (..\\..\\Startup\\trojan.bat)', () => {
    const { targetPath, cleanName } = sanitizePrintPdfFilename('..\\..\\Startup\\trojan.bat', mockDownloads);
    assert.strictEqual(cleanName, 'trojan.bat.pdf');
    assert.ok(targetPath.startsWith(path.resolve(mockDownloads)));
    assert.ok(!targetPath.includes('Startup'));
  });

  it('fuerza siempre la extensión .pdf para impedir ejecutables o scripts maliciosos', () => {
    const resExe = sanitizePrintPdfFilename('payload.exe', mockDownloads);
    assert.strictEqual(resExe.cleanName, 'payload.exe.pdf');

    const resCmd = sanitizePrintPdfFilename('script.cmd', mockDownloads);
    assert.strictEqual(resCmd.cleanName, 'script.cmd.pdf');

    const resVbs = sanitizePrintPdfFilename('test.vbs', mockDownloads);
    assert.strictEqual(resVbs.cleanName, 'test.vbs.pdf');
  });

  it('genera un nombre seguro por defecto si el filename está vacío, es nulo o contiene solo puntos', () => {
    const resEmpty = sanitizePrintPdfFilename('', mockDownloads);
    assert.ok(resEmpty.cleanName.startsWith('nodeterm-rdp-print-'));
    assert.ok(resEmpty.cleanName.endsWith('.pdf'));

    const resNull = sanitizePrintPdfFilename(null, mockDownloads);
    assert.ok(resNull.cleanName.startsWith('nodeterm-rdp-print-'));
    assert.ok(resNull.cleanName.endsWith('.pdf'));

    const resDots = sanitizePrintPdfFilename('...', mockDownloads);
    assert.ok(resDots.cleanName.startsWith('nodeterm-rdp-print-'));
    assert.ok(resDots.cleanName.endsWith('.pdf'));
  });

  it('sanitiza caracteres prohibidos o reservados de sistemas de archivos', () => {
    const { cleanName } = sanitizePrintPdfFilename('factura:enero*2026?|final.pdf', mockDownloads);
    assert.strictEqual(cleanName, 'factura_enero_2026__final.pdf');
    assert.ok(!cleanName.includes(':'));
    assert.ok(!cleanName.includes('*'));
    assert.ok(!cleanName.includes('?'));
    assert.ok(!cleanName.includes('|'));
  });

  it('rechaza llamadas con downloadsDir inválido o ausente', () => {
    assert.throws(() => {
      sanitizePrintPdfFilename('test.pdf', null);
    }, /Directorio de descargas inválido/);

    assert.throws(() => {
      sanitizePrintPdfFilename('test.pdf', '');
    }, /Directorio de descargas inválido/);
  });
});
