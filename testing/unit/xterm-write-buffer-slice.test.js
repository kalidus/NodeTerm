const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

function loadWriteBuffer() {
  const src = fs.readFileSync(path.join(__dirname, '../../src/utils/xtermWriteBuffer.js'), 'utf8');
  const wrapped = src
    .replace(/export function /g, 'function ')
    + '\nmodule.exports = { takePaintSlice, createXtermWriteBuffer };';
  const module = { exports: {} };
  const fn = new Function('module', 'exports', 'requestAnimationFrame', 'cancelAnimationFrame', wrapped);
  fn(module, module.exports, () => 0, () => {});
  return module.exports;
}

const { takePaintSlice, createXtermWriteBuffer } = loadWriteBuffer();

describe('takePaintSlice', () => {
  it('no parte un CSI que cae en el límite de 64 KB', () => {
    const maxLen = 65536;
    const csi = '\x1b[31m';
    const prefix = 'a'.repeat(maxLen - 2);
    const text = prefix + csi + 'XYZ';
    const cut = takePaintSlice(text, maxLen);
    const head = text.slice(0, cut);
    const tail = text.slice(cut);
    assert.ok(!head.endsWith('\x1b') && !head.endsWith('\x1b[') && !head.endsWith('\x1b[31'));
    assert.ok(head.includes(csi) || tail.startsWith(csi));
    assert.ok(!head.includes('\x1b[31') || head.includes(csi));
    assert.strictEqual(head.includes(csi) && tail.includes('\x1b['), false);
  });

  it('deja entero un frame sincronizado ?2026 que cruza el corte', () => {
    const maxLen = 65536;
    const begin = '\x1b[?2026h';
    const end = '\x1b[?2026l';
    const frame = begin + 'dli' + end;
    const prefix = 'a'.repeat(maxLen - 4);
    const text = prefix + frame + 'tail';
    const cut = takePaintSlice(text, maxLen);
    const head = text.slice(0, cut);
    const tail = text.slice(cut);
    const headOpen = head.includes(begin) && !head.includes(end);
    const tailOpen = tail.includes(end) && !tail.includes(begin);
    assert.strictEqual(headOpen && tailOpen, false);
    assert.ok(head.includes(frame) || tail.startsWith(frame) || tail.includes(frame));
  });

  it('retiene el pintado lejos del final y lo suelta en un solo write', () => {
    const writes = [];
    const term = {
      write(data, cb) {
        writes.push(data);
        if (typeof cb === 'function') cb();
      }
    };
    let painted = 0;
    const buf = createXtermWriteBuffer({ current: term }, {
      active: true,
      onPainted: () => { painted += 1; }
    });
    buf.setHold(true);
    buf.write('hola');
    buf.write('mundo');
    assert.deepStrictEqual(writes, []);
    assert.strictEqual(buf.isHeld(), true);
    buf.setHold(false);
    assert.deepStrictEqual(writes, ['holamundo']);
    assert.strictEqual(painted, 1);
    assert.strictEqual(buf.isHeld(), false);
  });

  it('no parte un par subrogado', () => {
    const maxLen = 8;
    const text = 'abcdefg😀z';
    const cut = takePaintSlice(text, maxLen);
    const head = text.slice(0, cut);
    assert.strictEqual(/[\uD800-\uDBFF]$/.test(head), false);
    assert.ok(head.includes('😀') || !head.includes('\uD83D'));
  });
});
