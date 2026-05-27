#!/usr/bin/env node
/**
 * Garantiza que el binario de Electron esté descargado y extraído.
 * postinstall + predev: evita instalaciones rotas en Linux (sudo, extracción a medias).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const ELECTRON_DIR = path.join(REPO_ROOT, 'node_modules', 'electron');

function log(msg) {
  console.log(`[nodeterm] ${msg}`);
}

function warn(msg) {
  console.warn(`[nodeterm] ${msg}`);
}

function getExpectedExecutable() {
  switch (process.platform) {
    case 'darwin':
      return 'Electron.app/Contents/MacOS/Electron';
    case 'win32':
      return 'electron.exe';
    default:
      return 'electron';
  }
}

function isElectronReady() {
  if (!fs.existsSync(ELECTRON_DIR)) {
    return true;
  }

  const pathFile = path.join(ELECTRON_DIR, 'path.txt');
  if (!fs.existsSync(pathFile)) {
    return false;
  }

  const executable = fs.readFileSync(pathFile, 'utf8').trim();
  const binaryPath = path.join(ELECTRON_DIR, 'dist', executable);
  return fs.existsSync(binaryPath);
}

function isOwnedByCurrentUser(dir) {
  try {
    return fs.statSync(dir).uid === process.getuid();
  } catch {
    return true;
  }
}

function canWriteDir(dir) {
  try {
    const probe = path.join(dir, `.write-probe-${process.pid}`);
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function printPermissionHelp() {
  warn('node_modules/electron pertenece a otro usuario (normalmente root).');
  warn('No uses "sudo npm install" dentro del proyecto. Corrige permisos y reinstala:');
  warn('  sudo chown -R "$USER:$USER" .');
  warn('  npm install');
}

function cleanBrokenDist() {
  const distDir = path.join(ELECTRON_DIR, 'dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
}

function extractZip(zipPath, distDir) {
  if (process.platform === 'win32') {
    const extract = require('extract-zip');
    return extract(zipPath, { dir: distDir });
  }

  const unzip = spawnSync('unzip', ['-oq', zipPath, '-d', distDir], {
    stdio: 'inherit'
  });

  if (unzip.status === 0) {
    return;
  }

  if (unzip.error && unzip.error.code === 'ENOENT') {
    warn('unzip no encontrado; usando extract-zip. En Arch/CachyOS: sudo pacman -S unzip');
  }

  const extract = require('extract-zip');
  return extract(zipPath, { dir: distDir });
}

async function downloadAndExtract() {
  const { downloadArtifact } = require('@electron/get');

  const { version } = require(path.join(ELECTRON_DIR, 'package.json'));
  const platformPath = getExpectedExecutable();
  const platform = process.env.npm_config_platform || process.platform;
  const arch = process.env.npm_config_arch || process.arch;

  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    force: true,
    checksums: require(path.join(ELECTRON_DIR, 'checksums.json')),
    platform,
    arch
  });

  const distDir = path.join(ELECTRON_DIR, 'dist');
  cleanBrokenDist();
  await extractZip(zipPath, distDir);

  const srcTypeDefPath = path.join(distDir, 'electron.d.ts');
  const targetTypeDefPath = path.join(ELECTRON_DIR, 'electron.d.ts');
  if (fs.existsSync(srcTypeDefPath)) {
    fs.renameSync(srcTypeDefPath, targetTypeDefPath);
  }

  fs.writeFileSync(path.join(ELECTRON_DIR, 'path.txt'), platformPath);
}

async function main() {
  if (
    process.env.ELECTRON_SKIP_BINARY_DOWNLOAD === '1' ||
    process.env.ELECTRON_SKIP_BINARY_DOWNLOAD === 'true'
  ) {
    return;
  }

  if (!fs.existsSync(ELECTRON_DIR)) {
    return;
  }

  if (isElectronReady()) {
    return;
  }

  if (!isOwnedByCurrentUser(ELECTRON_DIR) || !canWriteDir(ELECTRON_DIR)) {
    printPermissionHelp();
    process.exit(1);
  }

  log('Electron incompleto; descargando binario...');

  try {
    await downloadAndExtract();
  } catch (err) {
    warn(`Error al instalar Electron: ${err.message}`);
    process.exit(1);
  }

  if (!isElectronReady()) {
    warn('El binario de Electron no quedó disponible tras la instalación.');
    process.exit(1);
  }

  log('Electron listo.');
}

main().catch((err) => {
  warn(err.stack || String(err));
  process.exit(1);
});
