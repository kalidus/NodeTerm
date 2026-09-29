const { describe, it } = require('node:test');
const assert = require('node:assert');

const { isRendererSendable, sendToRenderer } = require('../../src/main/utils/connection-utils');

function makeWebContents(overrides = {}) {
  return {
    isDestroyed: () => false,
    isCrashed: () => false,
    mainFrame: { isDestroyed: () => false },
    send() {},
    ...overrides
  };
}

describe('isRendererSendable', () => {
  it('devuelve null si el sender no existe', () => {
    assert.strictEqual(isRendererSendable(null), null);
    assert.strictEqual(isRendererSendable(undefined), null);
  });

  it('devuelve null si la ventana esta destroyed', () => {
    const win = { isDestroyed: () => true, webContents: makeWebContents() };
    assert.strictEqual(isRendererSendable(win), null);
  });

  it('devuelve null si el renderer ha crasheado', () => {
    const wc = makeWebContents({ isCrashed: () => true });
    assert.strictEqual(isRendererSendable(wc), null);
  });

  it('devuelve null si mainFrame esta destroyed', () => {
    const wc = makeWebContents({
      mainFrame: { isDestroyed: () => true }
    });
    assert.strictEqual(isRendererSendable(wc), null);
  });

  it('devuelve webContents si la ventana esta viva', () => {
    const wc = makeWebContents();
    const win = { isDestroyed: () => false, webContents: wc };
    assert.strictEqual(isRendererSendable(win), wc);
  });
});

describe('sendToRenderer', () => {
  it('no llama send si el renderer ha crasheado', () => {
    let sent = false;
    const wc = makeWebContents({
      isCrashed: () => true,
      send() { sent = true; }
    });
    sendToRenderer(wc, 'rdp:native-session-closed', { tokenId: 'x' });
    assert.strictEqual(sent, false);
  });

  it('envia si el renderer esta vivo', () => {
    const calls = [];
    const wc = makeWebContents({
      send(eventName, payload) { calls.push([eventName, payload]); }
    });
    sendToRenderer(wc, 'rdp:native-session-closed', { tokenId: 'x' });
    assert.deepStrictEqual(calls, [['rdp:native-session-closed', { tokenId: 'x' }]]);
  });
});
