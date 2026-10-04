const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

describe('Terminal Clipboard Unit Tests', async () => {
  const { setupTerminalClipboard, pasteToTerminal } = await import('../../src/utils/terminalClipboard.js');

  it('pasteToTerminal enfoca el terminal y envía los datos', async () => {
    let focused = 0;
    let sentData = null;
    const mockTerm = {
      focus: () => { focused++; },
      element: {
        dispatchEvent: () => {}
      }
    };

    pasteToTerminal(mockTerm, 'hello world', (data) => {
      sentData = data;
    });

    assert.strictEqual(focused, 1, 'Debe enfocar inmediatamente');

    // Esperar al timeout de 10ms
    await new Promise((resolve) => setTimeout(resolve, 25));

    assert.strictEqual(sentData, 'hello world', 'Debe enviar los datos al callback');
    assert.strictEqual(focused, 2, 'Debe re-enfocar tras enviar los datos');
  });

  it('setupTerminalClipboard intercepta Ctrl+C cuando hay texto seleccionado', async () => {
    let customKeyHandler = null;
    let writtenText = null;

    global.window = {
      electron: {
        platform: 'win32',
        clipboard: {
          writeText: async (t) => { writtenText = t; },
          readText: async () => 'clipboard content'
        }
      }
    };

    const mockTerm = {
      attachCustomKeyEventHandler: (fn) => {
        customKeyHandler = fn;
      },
      getSelection: () => 'texto seleccionado'
    };

    const mockContainer = {
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    setupTerminalClipboard({
      term: mockTerm,
      container: mockContainer,
      tabId: 'tab-test',
      onSendData: () => {}
    });

    assert.ok(customKeyHandler, 'Debe registrar customKeyHandler');

    // Simular evento Ctrl+C con selección
    const copyEventWithSelection = {
      type: 'keydown',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      key: 'c'
    };

    const resultWithSelection = customKeyHandler(copyEventWithSelection);
    assert.strictEqual(resultWithSelection, false, 'Debe retornar false para evitar que xterm envíe \\x03');
    assert.strictEqual(writtenText, 'texto seleccionado');

    // Simular evento Ctrl+C SIN selección (debe permitir SIGINT)
    mockTerm.getSelection = () => '';
    const resultWithoutSelection = customKeyHandler(copyEventWithSelection);
    assert.strictEqual(resultWithoutSelection, true, 'Debe retornar true para permitir que xterm envíe \\x03');
  });

  it('setupTerminalClipboard maneja Ctrl+Shift+C y Ctrl+V', async () => {
    let customKeyHandler = null;
    let sentData = null;

    global.window = {
      electron: {
        platform: 'win32',
        clipboard: {
          writeText: async () => {},
          readText: async () => 'contenido pegado'
        }
      }
    };

    const mockTerm = {
      attachCustomKeyEventHandler: (fn) => {
        customKeyHandler = fn;
      },
      getSelection: () => 'copiado shift',
      focus: () => {},
      element: { dispatchEvent: () => {} }
    };

    const mockContainer = {
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    setupTerminalClipboard({
      term: mockTerm,
      container: mockContainer,
      tabId: 'tab-test',
      onSendData: (data) => { sentData = data; }
    });

    // Ctrl+Shift+C
    const ctrlShiftC = {
      type: 'keydown',
      ctrlKey: true,
      metaKey: false,
      shiftKey: true,
      key: 'C'
    };
    const shiftCResult = customKeyHandler(ctrlShiftC);
    assert.strictEqual(shiftCResult, false);

    // Ctrl+V
    const ctrlV = {
      type: 'keydown',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      key: 'v'
    };
    const ctrlVResult = customKeyHandler(ctrlV);
    assert.strictEqual(ctrlVResult, false, 'Ctrl+V debe retornar false para evitar inserción de carácter de control');

    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.strictEqual(sentData, 'contenido pegado', 'Debe haber pegado el texto');
  });

  it('setupTerminalClipboard delega a onContextMenu si está provisto', () => {
    let contextMenuListener = null;
    let onContextMenuCalled = false;

    const mockTerm = {
      attachCustomKeyEventHandler: () => {}
    };

    const mockContainer = {
      addEventListener: (evt, fn) => {
        if (evt === 'contextmenu') contextMenuListener = fn;
      },
      removeEventListener: () => {}
    };

    setupTerminalClipboard({
      term: mockTerm,
      container: mockContainer,
      tabId: 'tab-context',
      onContextMenu: (e, tabId) => {
        onContextMenuCalled = true;
        assert.strictEqual(tabId, 'tab-context');
      },
      onSendData: () => {}
    });

    assert.ok(contextMenuListener, 'Debe registrar listener de contextmenu');
    contextMenuListener({ preventDefault: () => {} });
    assert.strictEqual(onContextMenuCalled, true, 'Debe invocar callback onContextMenu');
  });
});
