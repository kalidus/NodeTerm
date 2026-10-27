/**
 * Handlers IPC de chrome de ventana (minimize/maximize/close/corners).
 * window:focus-changed permanece en main.js (acoplado al statsWorker).
 */

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { getNodeTermDataDir } = require('../utils/file-utils');

function safeHandle(channel, handler) {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {
    /* noop */
  }
  ipcMain.handle(channel, handler);
}

function applyWindowCornersForLayout(win, layoutId) {
  if (process.platform !== 'win32' || !win || win.isDestroyed()) {
    return;
  }

  // Preference values:
  // 0 = DWMWCP_DEFAULT (System decides)
  // 1 = DWMWCP_DONOTROUND (Square corners)
  // 2 = DWMWCP_ROUND (Rounded corners)
  // 3 = DWMWCP_ROUNDSMALL (Slightly rounded corners)
  let preference = 2; // Default to rounded

  if (layoutId === 'unified' || layoutId === 'unified-rounded' || layoutId === 'cyberpunk' || layoutId === 'studio') {
    preference = 1; // Square corners
  } else if (layoutId === 'tablero') {
    preference = 3; // Slightly rounded corners
  }

  try {
    const hwnd = win.getNativeWindowHandle();
    let hwndAddress = 0;
    try {
      if (hwnd.length >= 8) {
        hwndAddress = hwnd.readBigInt64LE(0).toString();
      } else if (hwnd.length >= 4) {
        hwndAddress = hwnd.readInt32LE(0).toString();
      } else {
        hwndAddress = hwnd.readUInt32LE(0).toString();
      }
    } catch (e) {
      hwndAddress = parseInt(hwnd.toString('hex'), 16).toString();
    }

    const { spawn } = require('child_process');

    const minimalEnv = {};
    const keysToKeep = ['SystemRoot', 'windir', 'PATH', 'PSModulePath', 'USERPROFILE', 'SystemDrive', 'TEMP', 'TMP'];
    for (const key of keysToKeep) {
      if (process.env[key]) {
        minimalEnv[key] = process.env[key];
      }
    }

    const psScript = `
$code = @"
using System;
using System.Runtime.InteropServices;
public class DwmApi {
    [DllImport("dwmapi.dll")]
    public static extern int DwmSetWindowAttribute(IntPtr hwnd, int dwAttribute, ref int pvAttribute, int cbAttribute);
}
public class User32 {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hwnd, IntPtr hwndInsertAfter, int x, int y, int cx, int cy, uint flags);
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$hwndIntPtr = [IntPtr]([long]${hwndAddress})
$pref = ${preference}
$res = [DwmApi]::DwmSetWindowAttribute($hwndIntPtr, 33, [ref]$pref, 4)
$flags = 0x0020 -bor 0x0002 -bor 0x0001 -bor 0x0004 -bor 0x0010
$posRes = [User32]::SetWindowPos($hwndIntPtr, [IntPtr]0, 0, 0, 0, 0, $flags)
Write-Host "SUCCESS HWND=${hwndAddress} preference=${preference} DwmRes=$res SetWindowPosRes=$posRes"
`;

    const encodedScript = Buffer.from(psScript, 'utf-16le').toString('base64');

    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encodedScript
    ], {
      env: minimalEnv
    });

    child.on('error', () => {});
    child.stdout.on('data', () => {});
    child.stderr.on('data', () => {});
    child.on('close', () => {});
  } catch (err) {
    // Ignored error log
  }
}

function applyWindowCornersOnStartup(win) {
  try {
    const appDataPath = path.join(getNodeTermDataDir(), 'app-data.json');
    if (fs.existsSync(appDataPath)) {
      const raw = fs.readFileSync(appDataPath, 'utf8');
      const { parseAppDataFileContent } = require('../utils/file-utils');
      const parsed = parseAppDataFileContent(raw);
      if (parsed && parsed.ui_layout) {
        applyWindowCornersForLayout(win, parsed.ui_layout);
      }
    }
  } catch (err) {
    console.error('[WindowCorners] Error applying startup corners:', err);
  }
}

/**
 * @param {{ getMainWindow: () => import('electron').BrowserWindow | null | undefined }} dependencies
 */
function registerWindowHandlers(dependencies = {}) {
  const { getMainWindow } = dependencies;
  if (typeof getMainWindow !== 'function') {
    console.error('[Window] registerWindowHandlers: falta getMainWindow');
    return;
  }

  safeHandle('window:minimize', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.minimize();
  });

  safeHandle('window:maximize', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.maximize();
  });

  safeHandle('window:unmaximize', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.unmaximize();
  });

  safeHandle('window:isMaximized', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) return mainWindow.isMaximized();
    return false;
  });

  safeHandle('window:close', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.close();
  });

  safeHandle('window:set-corners', (_event, layoutId) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      applyWindowCornersForLayout(mainWindow, layoutId);
    }
  });
}

module.exports = {
  registerWindowHandlers,
  applyWindowCornersForLayout,
  applyWindowCornersOnStartup
};
