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

function clipboardTempDir() {
  return path.join(os.tmpdir(), 'nodeterm-clipboard');
}

function toNodeBuffer(buffer) {
  if (Buffer.isBuffer(buffer)) return buffer;
  if (buffer instanceof Uint8Array || (buffer && buffer.buffer)) {
    return Buffer.from(buffer.buffer, buffer.byteOffset || 0, buffer.byteLength || buffer.length);
  }
  if (typeof buffer === 'string') return Buffer.from(buffer, 'base64');
  return Buffer.from(buffer || []);
}

function isSafeClipboardTempPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const root = path.resolve(clipboardTempDir());
  const resolved = path.resolve(filePath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

function registerClipboardHandlers() {
  safeHandle('clipboard:readText', () => clipboard.readText());

  safeHandle('clipboard:writeText', (event, text) => {
    clipboard.writeText(text == null ? '' : String(text));
    return true;
  });

  safeHandle('clipboard:beginTempFile', async (event, { fileName }) => {
    try {
      const tempDir = clipboardTempDir();
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const safeName = path.basename(fileName || 'file');
      const filePath = path.join(tempDir, safeName);
      fs.writeFileSync(filePath, Buffer.alloc(0));
      return { success: true, filePath };
    } catch (err) {
      console.error('[Clipboard] Error creating temp file:', err);
      return { success: false, error: err.message };
    }
  });

  safeHandle('clipboard:appendTempFile', async (event, { filePath, buffer }) => {
    try {
      if (!isSafeClipboardTempPath(filePath)) {
        return { success: false, error: 'invalid_temp_path' };
      }
      fs.appendFileSync(filePath, toNodeBuffer(buffer));
      return { success: true };
    } catch (err) {
      console.error('[Clipboard] Error appending temp file:', err);
      return { success: false, error: err.message };
    }
  });

  safeHandle('clipboard:saveTempFile', async (event, { fileName, buffer }) => {
    try {
      const tempDir = clipboardTempDir();
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const safeName = path.basename(fileName || 'file');
      const filePath = path.join(tempDir, safeName);
      const data = toNodeBuffer(buffer);
      fs.writeFileSync(filePath, data);
      if (process.env.NODETERM_RDP_DEBUG === '1' || process.env.NODETERM_DEBUG === '1') {
        console.log(`💾 [Clipboard] Archivo temporal guardado (${data.length} bytes): ${filePath}`);
      }
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
              if (process.env.NODETERM_RDP_DEBUG === '1' || process.env.NODETERM_DEBUG === '1') {
                console.log('📋 [Clipboard] Archivos listos en portapapeles de Windows:', filePaths);
              }
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
