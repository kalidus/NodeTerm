/**
 * Clipboard IPC aislado (sin deps pesadas).
 * Debe poder cargarse siempre en prod/asar aunque fallen otros handlers.
 */
const { ipcMain, clipboard } = require('electron');

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

function registerClipboardHandlers() {
  safeHandle('clipboard:readText', () => clipboard.readText());

  safeHandle('clipboard:writeText', (event, text) => {
    clipboard.writeText(text == null ? '' : String(text));
    return true;
  });
}

module.exports = {
  registerClipboardHandlers
};
