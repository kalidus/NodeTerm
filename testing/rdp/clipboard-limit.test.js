'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { clipRdpClipboardText, RDP_CLIPBOARD_TEXT_MAX_CHARS } = require('../../src/utils/rdpClipboardLimit');

describe('rdpClipboardLimit', () => {
  it('deja pasar un texto que cabe en el WebSocket', () => {
    const out = clipRdpClipboardText('hola');
    assert.equal(out.dropped, false);
    assert.equal(out.text, 'hola');
    assert.equal(out.length, 4);
  });

  it('descarta el texto que cerraria el WebSocket con 1009', () => {
    const huge = 'x'.repeat(RDP_CLIPBOARD_TEXT_MAX_CHARS + 1);
    const out = clipRdpClipboardText(huge);
    assert.equal(out.dropped, true);
    assert.equal(out.text, '');
    assert.equal(out.length, RDP_CLIPBOARD_TEXT_MAX_CHARS + 1);
  });

  it('un texto del tamaño del tope sigue siendo válido', () => {
    const exact = 'y'.repeat(RDP_CLIPBOARD_TEXT_MAX_CHARS);
    const out = clipRdpClipboardText(exact);
    assert.equal(out.dropped, false);
    assert.equal(out.text.length, RDP_CLIPBOARD_TEXT_MAX_CHARS);
  });
});
