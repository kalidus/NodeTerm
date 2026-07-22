const https = require('https');
const http = require('http');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { app } = require('electron');
const { URL } = require('url');
const { getNodeTermDataDir } = require('../utils/file-utils');

/**
 * Instala Cygwin portable desde la web oficial (setup-x86_64.exe + mirror).
 * Destino: %APPDATA%/nodeterm/cygwin64
 */

const CYGWIN_SETUP_URL = 'https://cygwin.com/setup-x86_64.exe';
const CYGWIN_MIRROR = 'https://mirrors.kernel.org/sourceware/cygwin/';
const CYGWIN_DIR_NAME = 'cygwin64';
const META_FILE = 'nodeterm-cygwin-meta.json';
const MAX_REDIRECTS = 8;

const MINIMAL_PACKAGES = [
  'bash', 'coreutils', 'grep', 'sed', 'gawk', 'findutils', 'which', 'less', 'ncurses'
];

const MEDIUM_PACKAGES = [
  ...MINIMAL_PACKAGES,
  'wget', 'curl', 'git', 'vim', 'nano', 'openssh', 'tar', 'gzip', 'procps-ng',
  'netcat', 'net-tools', 'bind-utils', 'openssl', 'ca-certificates',
  'libcurl4', 'libssh2', 'rsync', 'unzip', 'zip'
];

const FULL_PACKAGES = [
  ...MEDIUM_PACKAGES,
  'gcc', 'g++', 'make', 'cmake', 'autoconf', 'automake', 'libtool', 'pkg-config', 'binutils'
];

const TIER_META = {
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    packages: MINIMAL_PACKAGES,
    sizeHint: '~50-100 MB',
    description: 'bash + coreutils basicos'
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    packages: MEDIUM_PACKAGES,
    sizeHint: '~150-300 MB',
    description: 'Minimal + git, ssh, curl, vim, rsync...'
  },
  full: {
    id: 'full',
    label: 'Full',
    packages: FULL_PACKAGES,
    sizeHint: '~500-800 MB',
    description: 'Medium + gcc, make, cmake y herramientas de desarrollo'
  }
};

function normalizeTier(tier) {
  const key = String(tier || 'medium').toLowerCase();
  if (key === 'minimal' || key === 'min') return 'minimal';
  if (key === 'full') return 'full';
  return 'medium';
}

function getCygwinInstallRoot() {
  return path.join(getNodeTermDataDir(), CYGWIN_DIR_NAME);
}

function getBashPath(root = getCygwinInstallRoot()) {
  return path.join(root, 'bin', 'bash.exe');
}

function getMetaPath(root = getCygwinInstallRoot()) {
  return path.join(root, META_FILE);
}

function isInstalledAt(root = getCygwinInstallRoot()) {
  try {
    return fs.existsSync(getBashPath(root));
  } catch {
    return false;
  }
}

function readMeta(root = getCygwinInstallRoot()) {
  try {
    const metaPath = getMetaPath(root);
    if (!fs.existsSync(metaPath)) return null;
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

function getAvailableTiers() {
  return Object.values(TIER_META).map((t) => ({
    id: t.id,
    label: t.label,
    sizeHint: t.sizeHint,
    description: t.description
  }));
}

function getInstallStatus() {
  const root = getCygwinInstallRoot();
  const installed = isInstalledAt(root);
  const meta = installed ? readMeta(root) : null;
  return {
    installed,
    root: installed ? root : null,
    path: installed ? getBashPath(root) : null,
    tier: meta?.tier || null,
    packageVersion: meta?.tier || null,
    source: meta?.source || 'cygwin.com',
    installedAt: meta?.installedAt || null,
    tiers: getAvailableTiers()
  };
}

function followDownload(urlString, destPath, progressCallback, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      reject(new Error('Demasiadas redirecciones al descargar setup de Cygwin'));
      return;
    }

    let parsed;
    try {
      parsed = new URL(urlString);
    } catch {
      reject(new Error(`URL invalida: ${urlString}`));
      return;
    }

    const client = parsed.protocol === 'http:' ? http : https;
    const request = client.get(urlString, (response) => {
      const status = response.statusCode || 0;

      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        const nextUrl = new URL(response.headers.location, urlString).toString();
        followDownload(nextUrl, destPath, progressCallback, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (status !== 200) {
        response.resume();
        reject(new Error(`Descarga fallida (HTTP ${status}) desde cygwin.com`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'], 10) || 2 * 1024 * 1024;
      let downloadedBytes = 0;
      const fileStream = fs.createWriteStream(destPath);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (progressCallback) progressCallback(downloadedBytes, totalBytes);
      });

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => resolve({ downloadedBytes, totalBytes }));
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });

      response.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    request.on('error', reject);
    request.setTimeout(120000, () => {
      request.destroy(new Error('Timeout descargando setup de Cygwin'));
    });
  });
}

async function safeRm(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return;
  await fsp.rm(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mata procesos cuyo ejecutable vive bajo el root de Cygwin (liberar DLLs bloqueadas).
 */
function killProcessesUnderRoot(rootPath) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32' || !rootPath) {
      resolve();
      return;
    }

    const normalized = rootPath.replace(/'/g, "''");
    const ps = `
$root = '${normalized}'
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {
    $_.ExecutablePath -and
    ($_.ExecutablePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase))
  } |
  ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
  }
`;

    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps],
      { windowsHide: true, stdio: 'ignore' }
    );
    child.on('close', () => resolve());
    child.on('error', () => resolve());
    setTimeout(() => resolve(), 5000);
  });
}

async function forceRemoveDir(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return;

  const attempts = 5;
  let lastError = null;

  for (let i = 0; i < attempts; i++) {
    try {
      await killProcessesUnderRoot(targetPath);
      await sleep(300 + i * 250);
      await fsp.rm(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
      if (!fs.existsSync(targetPath)) return;
    } catch (err) {
      lastError = err;
      console.warn(`[CygwinDownloader] Intento ${i + 1}/${attempts} al borrar fallo:`, err.message);
    }
  }

  // Ultimo recurso: renombrar y borrar el nombre pendiente
  try {
    const pending = `${targetPath}.pending-delete-${Date.now()}`;
    await killProcessesUnderRoot(targetPath);
    await sleep(400);
    await fsp.rename(targetPath, pending);
    await fsp.rm(pending, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    if (!fs.existsSync(pending) && !fs.existsSync(targetPath)) return;
  } catch (err) {
    lastError = err;
  }

  throw lastError || new Error(`No se pudo eliminar ${targetPath}. Cierra terminales Cygwin e intentalo de nuevo.`);
}

function runCygwinSetup(setupPath, rootPath, packages, onStdout) {
  return new Promise((resolve, reject) => {
    const args = [
      '--quiet-mode',
      '--root', rootPath,
      '--site', CYGWIN_MIRROR,
      '--packages', packages.join(','),
      '--no-shortcuts',
      '--no-desktop',
      '--no-startmenu'
    ];

    console.log('[CygwinDownloader] Ejecutando setup-x86_64.exe ...');
    const child = spawn(setupPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    child.stdout.on('data', (data) => {
      const text = data.toString();
      if (onStdout) onStdout(text);
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`setup-x86_64.exe salio con codigo ${code}${stderr ? `: ${stderr.trim()}` : ''}`));
    });
  });
}

/**
 * @param {object|Function} optionsOrCallback
 * @param {string} [optionsOrCallback.tier] - minimal | medium | full
 * @param {Function} [progressCallback] - (phase, current, total) => void
 */
async function installCygwinPackage(optionsOrCallback, maybeCallback) {
  let tier = 'medium';
  let progressCallback = null;

  if (typeof optionsOrCallback === 'function') {
    progressCallback = optionsOrCallback;
  } else if (optionsOrCallback && typeof optionsOrCallback === 'object') {
    tier = normalizeTier(optionsOrCallback.tier);
    progressCallback = typeof optionsOrCallback.progressCallback === 'function'
      ? optionsOrCallback.progressCallback
      : maybeCallback;
  } else if (typeof maybeCallback === 'function') {
    progressCallback = maybeCallback;
  }

  const tierKey = normalizeTier(tier);
  const tierInfo = TIER_META[tierKey];
  const finalRoot = getCygwinInstallRoot();
  const tempBase = path.join(app.getPath('temp'), 'nodeterm-cygwin-official');
  const setupPath = path.join(tempBase, 'setup-x86_64.exe');

  try {
    await safeRm(tempBase);
    await fsp.mkdir(tempBase, { recursive: true });

    if (progressCallback) progressCallback('downloading', 0, 100);

    console.log(`[CygwinDownloader] Descargando setup desde: ${CYGWIN_SETUP_URL}`);
    await followDownload(CYGWIN_SETUP_URL, setupPath, (downloaded, total) => {
      if (progressCallback) {
        const pct = total > 0 ? Math.min(40, Math.round((downloaded / total) * 40)) : 10;
        progressCallback('downloading', pct, 100);
      }
    });

    if (progressCallback) progressCallback('installing', 45, 100);

    // Instalar directo en AppData (Cygwin puede referenciar rutas absolutas)
    await fsp.mkdir(path.dirname(finalRoot), { recursive: true });
    await safeRm(finalRoot);
    await fsp.mkdir(finalRoot, { recursive: true });

    let pulse = 45;
    const pulseTimer = setInterval(() => {
      pulse = Math.min(90, pulse + 1);
      if (progressCallback) progressCallback('installing', pulse, 100);
    }, 3000);

    try {
      await runCygwinSetup(setupPath, finalRoot, tierInfo.packages);
    } finally {
      clearInterval(pulseTimer);
    }

    if (!isInstalledAt(finalRoot)) {
      throw new Error('La instalacion termino pero no se encontro bin/bash.exe');
    }

    if (progressCallback) progressCallback('finalizing', 95, 100);

    const meta = {
      tier: tierKey,
      source: 'cygwin.com',
      mirror: CYGWIN_MIRROR,
      packages: tierInfo.packages,
      installedAt: new Date().toISOString()
    };
    await fsp.writeFile(getMetaPath(finalRoot), JSON.stringify(meta, null, 2), 'utf8');

    try {
      await safeRm(tempBase);
    } catch (cleanupErr) {
      console.warn('[CygwinDownloader] No se pudo limpiar temp:', cleanupErr.message);
    }

    if (progressCallback) progressCallback('completed', 100, 100);

    return {
      success: true,
      ...getInstallStatus()
    };
  } catch (error) {
    console.error('[CygwinDownloader] Error instalando Cygwin:', error);
    try {
      await safeRm(tempBase);
    } catch {
      // ignore
    }
    return {
      success: false,
      error: error.message || String(error),
      tiers: getAvailableTiers()
    };
  }
}

async function uninstallCygwinPackage() {
  const root = getCygwinInstallRoot();
  try {
    if (!fs.existsSync(root)) {
      return { success: true, removed: false, message: 'Cygwin no estaba instalado' };
    }

    await killProcessesUnderRoot(root);
    await sleep(400);
    await forceRemoveDir(root);

    return { success: true, removed: true, root };
  } catch (error) {
    const msg = error.message || String(error);
    return {
      success: false,
      error: /EPERM|EBUSY|operation not permitted/i.test(msg)
        ? `${msg}. Cierra todas las pestanas Cygwin y vuelve a desinstalar.`
        : msg
    };
  }
}

module.exports = {
  CYGWIN_SETUP_URL,
  CYGWIN_MIRROR,
  TIER_META,
  getCygwinInstallRoot,
  getInstallStatus,
  getAvailableTiers,
  isInstalledAt,
  normalizeTier,
  installCygwinPackage,
  uninstallCygwinPackage
};
