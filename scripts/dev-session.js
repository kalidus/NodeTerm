/**
 * Una sola sesión de `npm run dev` por repo.
 * El proceso vive mientras webpack y Electron estén en marcha y suelta el lock al salir.
 * concurrently usa SIGTERM (no SIGKILL) para que Electron llegue a before-quit.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const lockPath = path.join(root, '.dev-webpack.lock');

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return !!(err && err.code === 'EPERM');
  }
}

function readLockPid() {
  try {
    return parseInt(String(fs.readFileSync(lockPath, 'utf8')).trim(), 10);
  } catch (_) {
    return 0;
  }
}

const existing = readLockPid();
if (existing && existing !== process.pid && isAlive(existing)) {
  console.error(`[dev] Ya hay un webpack watch de este repo (pid ${existing}).`);
  console.error('[dev] Cierra esa sesión de npm run dev antes de lanzar otra.');
  process.exit(1);
}

fs.writeFileSync(lockPath, String(process.pid));

function releaseLock() {
  try {
    if (readLockPid() === process.pid) fs.unlinkSync(lockPath);
  } catch (_) {}
}

process.on('exit', releaseLock);

try {
  fs.rmSync(path.join(root, 'dist', '.webpack-ready'), { force: true });
} catch (_) {}

const concurrentlyBin = path.join(root, 'node_modules', 'concurrently', 'dist', 'bin', 'concurrently.js');
const env = { ...process.env, NODE_OPTIONS: '--no-deprecation' };

// Si el sistema dispone de GPU dedicada NVIDIA en Linux, forzar automáticamente
// PRIME Render Offload para que NodeTerm corra siempre con la máxima potencia de la GPU dedicada.
if (process.platform === 'linux' && !env.__NV_PRIME_RENDER_OFFLOAD) {
  try {
    if (fs.existsSync('/proc/driver/nvidia') || fs.existsSync('/dev/nvidia0')) {
      env.__NV_PRIME_RENDER_OFFLOAD = '1';
      env.__GLX_VENDOR_LIBRARY_NAME = 'nvidia';
      env.__VK_LAYER_NV_optimus = 'NVIDIA_only';
    }
  } catch (_) {}
}

const child = spawn(process.execPath, [
  concurrentlyBin,
  '--kill-others',
  'node node_modules/webpack-cli/bin/cli.js --watch --mode development',
  'wait-on dist/.webpack-ready -t 180000 && electron . --disable-vulkan --disable-features=Vulkan'
], {
  cwd: root,
  stdio: 'inherit',
  env,
  windowsHide: false
});

child.on('exit', (code) => {
  releaseLock();
  process.exit(code == null ? 1 : code);
});

child.on('error', (err) => {
  console.error('[dev] No se pudo arrancar concurrently:', err?.message || err);
  releaseLock();
  process.exit(1);
});
