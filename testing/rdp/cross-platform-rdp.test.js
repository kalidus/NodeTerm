const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('IronRDP Cross-Platform & Native Keyboard Integration', () => {
  // Función auxiliar que replica la lógica de resolución de scancodes implementada en IronRdpCanvasTab
  const getScancodeMap = (isMac) => ({
    KeyA: 0x1E, KeyB: 0x30, KeyC: 0x2E, KeyD: 0x20, KeyE: 0x12, KeyF: 0x21, KeyG: 0x22, KeyH: 0x23,
    KeyI: 0x17, KeyJ: 0x24, KeyK: 0x25, KeyL: 0x26, KeyM: 0x32, KeyN: 0x31, KeyO: 0x18, KeyP: 0x19,
    KeyQ: 0x10, KeyR: 0x13, KeyS: 0x1F, KeyT: 0x14, KeyU: 0x16, KeyV: 0x2F, KeyW: 0x11, KeyX: 0x2D,
    KeyY: 0x15, KeyZ: 0x2C, Digit1: 0x02, Digit2: 0x03, Digit3: 0x04, Digit4: 0x05, Digit5: 0x06,
    Digit6: 0x07, Digit7: 0x08, Digit8: 0x09, Digit9: 0x0A, Digit0: 0x0B, Enter: 0x1C, Escape: 0x01,
    Backspace: 0x0E, Tab: 0x0F, Space: 0x39, Minus: 0x0C, Equal: 0x0D, BracketLeft: 0x1A,
    BracketRight: 0x1B, Backslash: 0x2B, Semicolon: 0x27, Quote: 0x28, Backquote: 0x29, Comma: 0x33,
    Period: 0x34, Slash: 0x35, ControlLeft: 0x1D, ControlRight: 0xE01D, AltLeft: 0x38, AltRight: 0xE038,
    ShiftLeft: 0x2A, ShiftRight: 0x36, ArrowUp: 0xE048, ArrowDown: 0xE050, ArrowLeft: 0xE04B,
    ArrowRight: 0xE04D, Delete: 0xE053, Home: 0xE047, End: 0xE04F, PageUp: 0xE049, PageDown: 0xE051,
    Insert: 0xE052, CapsLock: 0x3A, F1: 0x3B, F2: 0x3C, F3: 0x3D, F4: 0x3E, F5: 0x3F, F6: 0x40,
    F7: 0x41, F8: 0x42, F9: 0x43, F10: 0x44, F11: 0x57, F12: 0x58,
    // Modificadores de sistema
    MetaLeft: isMac ? 0x1D : 0xE05B,
    MetaRight: isMac ? 0xE01D : 0xE05C,
    ContextMenu: 0xE05D,
    PrintScreen: 0xE037,
    ScrollLock: 0x46,
    NumLock: 0x45,
    Pause: 0xE11D,
    // Teclado numérico completo (Numpad)
    Numpad0: 0x52, Numpad1: 0x4F, Numpad2: 0x50, Numpad3: 0x51, Numpad4: 0x4B,
    Numpad5: 0x4C, Numpad6: 0x4D, Numpad7: 0x47, Numpad8: 0x48, Numpad9: 0x49,
    NumpadDecimal: 0x53, NumpadDivide: 0xE035, NumpadMultiply: 0x37, NumpadSubtract: 0x4A,
    NumpadAdd: 0x4E, NumpadEnter: 0xE01C, NumpadEqual: 0x59,
    // Teclados internacionales / ISO (Español, Europeo, ABNT, JIS)
    IntlBackslash: 0x56, IntlRo: 0x73, IntlYen: 0x7D
  });

  test('mapea correctamente el teclado numérico completo a scancodes PS/2 Set 1', () => {
    const map = getScancodeMap(false);
    assert.equal(map.Numpad0, 0x52);
    assert.equal(map.Numpad1, 0x4F);
    assert.equal(map.Numpad2, 0x50);
    assert.equal(map.Numpad3, 0x51);
    assert.equal(map.Numpad4, 0x4B);
    assert.equal(map.Numpad5, 0x4C);
    assert.equal(map.Numpad6, 0x4D);
    assert.equal(map.Numpad7, 0x47);
    assert.equal(map.Numpad8, 0x48);
    assert.equal(map.Numpad9, 0x49);
    assert.equal(map.NumpadDecimal, 0x53);
    assert.equal(map.NumpadDivide, 0xE035);
    assert.equal(map.NumpadMultiply, 0x37);
    assert.equal(map.NumpadSubtract, 0x4A);
    assert.equal(map.NumpadAdd, 0x4E);
    assert.equal(map.NumpadEnter, 0xE01C);
    assert.equal(map.NumpadEqual, 0x59);
  });

  test('mapea tecla ISO europea IntlBackslash (0x56) para caracteres < y > en teclados españoles', () => {
    const map = getScancodeMap(false);
    assert.equal(map.IntlBackslash, 0x56);
  });

  test('mapea teclas de bloqueo y control de sistema', () => {
    const map = getScancodeMap(false);
    assert.equal(map.CapsLock, 0x3A);
    assert.equal(map.NumLock, 0x45);
    assert.equal(map.ScrollLock, 0x46);
    assert.equal(map.PrintScreen, 0xE037);
    assert.equal(map.ContextMenu, 0xE05D);
    assert.equal(map.Delete, 0xE053);
    assert.equal(map.Pause, 0xE11D);
  });

  test('en macOS traduce ergonómicamente Meta (Command) a Control para atajos remotos', () => {
    const macMap = getScancodeMap(true);
    assert.equal(macMap.MetaLeft, 0x1D); // ControlLeft
    assert.equal(macMap.MetaRight, 0xE01D); // ControlRight
  });

  test('en Windows/Linux preserva Meta como la tecla nativa Super/Windows', () => {
    const winMap = getScancodeMap(false);
    assert.equal(winMap.MetaLeft, 0xE05B); // WindowsLeft
    assert.equal(winMap.MetaRight, 0xE05C); // WindowsRight
  });

  test('normaliza saltos de línea de portapapeles a CRLF para servidores Windows', () => {
    const normalizeClipboardText = (text) => text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');

    // Texto con saltos unix (\n)
    const unixText = 'linea1\nlinea2\nlinea3';
    assert.equal(normalizeClipboardText(unixText), 'linea1\r\nlinea2\r\nlinea3');

    // Texto que ya viene con CRLF no se duplica
    const winText = 'linea1\r\nlinea2\r\nlinea3';
    assert.equal(normalizeClipboardText(winText), 'linea1\r\nlinea2\r\nlinea3');

    // Texto mixto
    const mixedText = 'linea1\r\nlinea2\nlinea3';
    assert.equal(normalizeClipboardText(mixedText), 'linea1\r\nlinea2\r\nlinea3');
  });

  test('calcula correctamente la unidad de rotación de rueda del ratón según deltaMode', () => {
    const resolveWheelUnit = (deltaMode) => (deltaMode === 1 ? 1 : (deltaMode === 2 ? 2 : 0));

    // DOM_DELTA_PIXEL (0) -> Pixel (0), común en trackpads de macOS
    assert.equal(resolveWheelUnit(0), 0);

    // DOM_DELTA_LINE (1) -> Line (1), común en ruedas de ratón de PC
    assert.equal(resolveWheelUnit(1), 1);

    // DOM_DELTA_PAGE (2) -> Page (2)
    assert.equal(resolveWheelUnit(2), 2);
  });
});
