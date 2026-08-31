const { ipcMain, clipboard } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createDropFilesBuffer(filePaths) {
  const header = Buffer.alloc(20);
  header.writeUInt32LE(20, 0); // pFiles offset = 20
  header.writeUInt32LE(0, 4);  // pt.x = 0
  header.writeUInt32LE(0, 8);  // pt.y = 0
  header.writeUInt32LE(0, 12); // fNC = 0
  header.writeUInt32LE(1, 16); // fWide = 1 (Unicode UTF-16LE)

  const pathBuffers = filePaths.map(p => Buffer.from(p + '\0', 'utf16le'));
  const listBuf = Buffer.concat([...pathBuffers, Buffer.from('\0', 'utf16le')]);
  return Buffer.concat([header, listBuf]);
}

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

  safeHandle('clipboard:saveTempFile', async (event, { fileName, buffer }) => {
    try {
      const tempDir = path.join(os.tmpdir(), 'nodeterm-clipboard');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const safeName = path.basename(fileName || 'file');
      const filePath = path.join(tempDir, safeName);
      let data;
      if (Buffer.isBuffer(buffer)) {
        data = buffer;
      } else if (buffer instanceof Uint8Array || (buffer && buffer.buffer)) {
        data = Buffer.from(buffer.buffer, buffer.byteOffset || 0, buffer.byteLength || buffer.length);
      } else if (typeof buffer === 'string') {
        data = Buffer.from(buffer, 'base64');
      } else if (buffer && typeof buffer === 'object' && Object.keys(buffer).length > 0) {
        data = Buffer.from(Object.values(buffer));
      } else {
        data = Buffer.from(buffer || []);
      }
      fs.writeFileSync(filePath, data);
      console.log(`💾 [Clipboard] Archivo temporal guardado (${data.length} bytes): ${filePath}`);
      return { success: true, filePath };
    } catch (err) {
      console.error('[Clipboard] Error saving temp file:', err);
      return { success: false, error: err.message };
    }
  });

  safeHandle('clipboard:writeFiles', async (event, filePaths) => {
    if (!Array.isArray(filePaths) || !filePaths.length) return false;
    try {
      if (process.platform === 'win32') {
        const { execFile } = require('child_process');
        const formattedPaths = filePaths.map(p => `'${p.replace(/'/g, "''")}'`).join(', ');
        return new Promise((resolve) => {
          execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', `Set-Clipboard -Path ${formattedPaths}`], { timeout: 4000 }, (err) => {
            if (err) {
              console.warn('[Clipboard] Error ejecutando PowerShell Set-Clipboard, aplicando fallback CF_HDROP:', err);
              try {
                const dropFilesBuf = createDropFilesBuffer(filePaths);
                clipboard.writeBuffer('CF_HDROP', dropFilesBuf);
                clipboard.writeBuffer('FileNameW', Buffer.from(filePaths[0] + '\0', 'utf16le'));
              } catch (_) {}
              resolve(false);
            } else {
              console.log('📋 [Clipboard] Archivos listos en portapapeles de Windows:', filePaths);
              resolve(true);
            }
          });
        });
      } else {
        clipboard.writeBuffer('text/uri-list', Buffer.from(filePaths.map(p => `file://${p}`).join('\r\n')));
        return true;
      }
    } catch (err) {
      console.error('[Clipboard] Error writing files to clipboard:', err);
      return false;
    }
  });
}

module.exports = {
  registerClipboardHandlers
};
