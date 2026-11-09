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

// Detección inteligente de GPU en Linux (/sys/class/drm):
// En portátiles híbridos (Optimus / PRIME), la GPU que tiene conectada físicamente la pantalla
// (eDP / DP / HDMI con status='connected') es la que ejecuta el compositor Wayland/X11.
// Usar la GPU titular del display evita copias DMA-BUF entre GPUs por PCIe y parones de sincronización.
function detectDisplayGpuVendor() {
  try {
    const drmDir = '/sys/class/drm';
    if (!fs.existsSync(drmDir)) return null;
    const entries = fs.readdirSync(drmDir);
    const connectedVendors = new Set();
    const allCardVendors = new Set();

    for (const entry of entries) {
      if (/^card\d+$/.test(entry)) {
        try {
          const v = fs.readFileSync(path.join(drmDir, entry, 'device/vendor'), 'utf8').trim().toLowerCase();
          if (v) allCardVendors.add(v);
        } catch (_) {}
      } else if (/^card\d+-/.test(entry)) {
        try {
          const status = fs.readFileSync(path.join(drmDir, entry, 'status'), 'utf8').trim().toLowerCase();
          if (status === 'connected') {
            const cardName = entry.split('-')[0];
            const v = fs.readFileSync(path.join(drmDir, cardName, 'device/vendor'), 'utf8').trim().toLowerCase();
            if (v) connectedVendors.add(v);
          }
        } catch (_) {}
      }
    }

    // 0x1002 = AMD, 0x8086 = Intel, 0x10de = NVIDIA
    // Si hay una pantalla conectada a AMD o Intel (portátil en modo híbrido), priorizar esa GPU para cero copia.
    if (connectedVendors.has('0x1002') || connectedVendors.has('0x8086')) {
      return 'integrated';
    }
    if (connectedVendors.has('0x10de')) {
      return 'nvidia';
    }
    if (!allCardVendors.has('0x1002') && !allCardVendors.has('0x8086') && allCardVendors.has('0x10de')) {
      return 'nvidia';
    }
  } catch (_) {}
  return 'integrated';
}

const gpuPref = (env.NODETERM_GPU || 'auto').trim().toLowerCase();
if (process.platform === 'linux') {
  // Si el usuario lanza con `NODETERM_GPU=nvidia` o con `prime-run` (__NV_PRIME_RENDER_OFFLOAD=1),
  // respetar el uso de la GPU dedicada NVIDIA. En modo 'auto', elegir la GPU conectada a la pantalla.
  const targetGpu = (gpuPref === 'nvidia' || gpuPref === 'integrated')
    ? gpuPref
    : (env.__NV_PRIME_RENDER_OFFLOAD === '1' ? 'nvidia' : detectDisplayGpuVendor());

  if (targetGpu === 'nvidia') {
    try {
      if (fs.existsSync('/proc/driver/nvidia') || fs.existsSync('/dev/nvidia0')) {
        env.NODETERM_GPU = 'nvidia';
        env.__NV_PRIME_RENDER_OFFLOAD = '1';
        env.__GLX_VENDOR_LIBRARY_NAME = 'nvidia';
        env.__VK_LAYER_NV_optimus = 'NVIDIA_only';
        if (fs.existsSync('/usr/lib/dri/nvidia_drv_video.so') || fs.existsSync('/usr/lib64/dri/nvidia_drv_video.so')) {
          env.NVD_BACKEND = 'direct';
          env.LIBVA_DRIVER_NAME = 'nvidia';
        }
      }
    } catch (_) {}
  } else {
    // La pantalla está gobernada por la GPU integrada (AMD/Intel): limpiar variables de NVIDIA
    // que puedan venir heredadas del perfil del sistema para que VA-API cargue radeonsi/iHD limpiamente.
    if (env.LIBVA_DRIVER_NAME === 'nvidia') {
      delete env.LIBVA_DRIVER_NAME;
    }
    delete env.NVD_BACKEND;
    delete env.__NV_PRIME_RENDER_OFFLOAD;
    if (env.__GLX_VENDOR_LIBRARY_NAME === 'nvidia') {
      delete env.__GLX_VENDOR_LIBRARY_NAME;
    }
    delete env.__VK_LAYER_NV_optimus;
  }
}

const child = spawn(process.execPath, [
  concurrentlyBin,
  '--kill-others',
  'node node_modules/webpack-cli/bin/cli.js --watch --mode development',
  'wait-on dist/.webpack-ready -t 180000 && electron . --disable-gpu-sandbox --disable-vulkan --disable-features=Vulkan'
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
