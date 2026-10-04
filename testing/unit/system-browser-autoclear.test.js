const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const {
  setClipboardWithAutoClear,
  cancelClipboardAutoClear,
  getCurrentAutoClearSecret,
  getAutoClearTimer
} = require('../../src/main/handlers/system-handlers');

describe('H-12: Secure Clipboard Auto-Clear System', () => {
  let mockStore = '';
  let clearCallCount = 0;
  let writeCallCount = 0;

  const mockClipboard = {
    writeText: (val) => {
      writeCallCount++;
      mockStore = String(val);
    },
    readText: () => mockStore,
    clear: () => {
      clearCallCount++;
      mockStore = '';
    }
  };

  beforeEach(() => {
    cancelClipboardAutoClear();
    mockStore = '';
    clearCallCount = 0;
    writeCallCount = 0;
  });

  afterEach(() => {
    cancelClipboardAutoClear();
  });

  it('escribe inmediatamente la contraseña en el portapapeles (0s retardo)', () => {
    const timer = setClipboardWithAutoClear('SuperSecretPassword123', 50, mockClipboard);

    assert.ok(timer, 'Debería retornar un temporizador activo');
    assert.strictEqual(mockStore, 'SuperSecretPassword123');
    assert.strictEqual(writeCallCount, 1);
    assert.strictEqual(clearCallCount, 0);
    assert.strictEqual(getCurrentAutoClearSecret(), 'SuperSecretPassword123');
  });

  it('limpia automáticamente el portapapeles cuando expira el temporizador', async () => {
    setClipboardWithAutoClear('AutoClearPass456', 30, mockClipboard);

    assert.strictEqual(mockStore, 'AutoClearPass456');

    // Esperar a que el temporizador de 30ms se dispare
    await new Promise((resolve) => setTimeout(resolve, 60));

    assert.strictEqual(clearCallCount, 1, 'clear() debe haberse ejecutado');
    assert.strictEqual(mockStore, '', 'El portapapeles debe estar vacío');
    assert.strictEqual(getCurrentAutoClearSecret(), null, 'El secreto activo debe quedar nulo');
    assert.strictEqual(getAutoClearTimer(), null, 'El temporizador debe quedar nulo');
  });

  it('NO borra el portapapeles si el usuario copió otro texto antes de que expire el tiempo', async () => {
    setClipboardWithAutoClear('PasswordToKeep', 40, mockClipboard);

    // Simular que el usuario copió otro texto a los 15ms
    await new Promise((resolve) => setTimeout(resolve, 15));
    mockClipboard.writeText('TextoImportanteDelUsuario');

    // Esperar a que expire el temporizador original (40ms)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // El clear() NO debe haberse invocado porque el contenido ya no coincide con el password
    assert.strictEqual(clearCallCount, 0, 'No debe limpiar texto ajeno del usuario');
    assert.strictEqual(mockStore, 'TextoImportanteDelUsuario', 'Debe preservar el contenido que el usuario copió');
  });

  it('reinicia el temporizador si se copia un nuevo secreto antes de que expire el anterior', async () => {
    setClipboardWithAutoClear('FirstSecret', 60, mockClipboard);
    assert.strictEqual(mockStore, 'FirstSecret');

    await new Promise((resolve) => setTimeout(resolve, 20));

    // Copiar segundo secreto antes de los 60ms
    setClipboardWithAutoClear('SecondSecret', 60, mockClipboard);
    assert.strictEqual(mockStore, 'SecondSecret');
    assert.strictEqual(getCurrentAutoClearSecret(), 'SecondSecret');

    // Esperar 45ms (el primer timer habría expirado a los 60ms totales, pero fue cancelado)
    await new Promise((resolve) => setTimeout(resolve, 45));
    assert.strictEqual(clearCallCount, 0, 'El primer timer no debe borrar el segundo secreto prematuramente');
    assert.strictEqual(mockStore, 'SecondSecret');

    // Esperar a que expire el segundo timer
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.strictEqual(clearCallCount, 1, 'El segundo timer debe limpiar el portapapeles');
    assert.strictEqual(mockStore, '');
  });

  it('cancelClipboardAutoClear cancela el temporizador activo limpiamente', async () => {
    setClipboardWithAutoClear('SecretToCancel', 30, mockClipboard);
    assert.strictEqual(mockStore, 'SecretToCancel');

    cancelClipboardAutoClear();
    assert.strictEqual(getCurrentAutoClearSecret(), null);
    assert.strictEqual(getAutoClearTimer(), null);

    // Esperar a que el timer original hubiera expirado
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.strictEqual(clearCallCount, 0, 'No debe llamar a clear() tras haber sido cancelado');
    assert.strictEqual(mockStore, 'SecretToCancel');
  });

  it('gestiona inputs vacíos o inválidos sin fallar', () => {
    assert.strictEqual(setClipboardWithAutoClear(null, 50, mockClipboard), null);
    assert.strictEqual(setClipboardWithAutoClear(undefined, 50, mockClipboard), null);
    assert.strictEqual(setClipboardWithAutoClear('', 50, mockClipboard), null);
    assert.strictEqual(writeCallCount, 0);
  });

  it('maneja excepciones de clipboard sin propagar errores fatales', async () => {
    const brokenClipboard = {
      writeText: () => { throw new Error('Write permission denied'); },
      readText: () => { throw new Error('Read error'); },
      clear: () => { throw new Error('Clear error'); }
    };

    // No debe lanzar excepción
    assert.doesNotThrow(() => {
      setClipboardWithAutoClear('ResilientPass', 20, brokenClipboard);
    });

    await new Promise((resolve) => setTimeout(resolve, 40));
  });
});
