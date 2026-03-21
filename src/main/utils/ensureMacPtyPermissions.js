'use strict';

const fs = require('fs');
const path = require('path');

/**
 * En macOS, node-pty puede quedar con spawn-helper sin bit ejecutable (ZIP, copias, etc.),
 * lo que provoca "posix_spawnp failed". Debe ejecutarse antes de cualquier require('node-pty').
 */
function ensureMacPtyPermissions() {
  if (process.platform !== 'darwin') return;

  try {
    const ptyRoot = path.dirname(require.resolve('node-pty/package.json'));
    const arch = process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
    const helper = path.join(ptyRoot, 'prebuilds', arch, 'spawn-helper');

    if (fs.existsSync(helper)) {
      const stats = fs.statSync(helper);
      if (!(stats.mode & 0o111)) {
        fs.chmodSync(helper, 0o755);
        console.log(`[SafeGuard] Permisos de spawn-helper corregidos (macOS): ${helper}`);
      }
    }
  } catch (e) {
    console.warn('[SafeGuard] No se pudo ajustar permisos de node-pty:', e.message);
  }
}

module.exports = ensureMacPtyPermissions;
