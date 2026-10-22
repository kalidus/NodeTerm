const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('nerdFontCellWidth', () => {
  it('marca iconos PUA de Nerd Font como anchos y deja powerline en 1', async () => {
    const { isNerdFontWideIcon } = await import('../../src/utils/nerdFontCellWidth.js');

    assert.strictEqual(isNerdFontWideIcon(0xf07b), true); // folder típico
    assert.strictEqual(isNerdFontWideIcon(0xe5ff), true);
    assert.strictEqual(isNerdFontWideIcon(0xf0001), true);
    assert.strictEqual(isNerdFontWideIcon(0x23fb), true);

    // Separadores powerline: no forzar doble celda
    assert.strictEqual(isNerdFontWideIcon(0xe0a0), false);
    assert.strictEqual(isNerdFontWideIcon(0xe0b0), false);
    assert.strictEqual(isNerdFontWideIcon(0xe0bf), false);

    assert.strictEqual(isNerdFontWideIcon(0x41), false); // 'A'
    assert.strictEqual(isNerdFontWideIcon(0x1f4c1), false); // emoji carpeta (ya lo cubre Unicode 11)
  });
});
