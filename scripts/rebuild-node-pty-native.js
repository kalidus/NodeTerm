#!/usr/bin/env node
/**
 * Recompila node-pty para la ABI de Electron.
 *
 * En Linux (y macOS sin prebuild usable) node-pty no trae binario listo;
 * sin rebuild, fallan las terminales locales y cualquier require('node-pty').
 *
 * - postinstall / npm run rebuild:native
 * - Si ya está compilado para esta Electron + node-pty, no hace nada (stamp)
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const STAMP_FILE = path.join(REPO_ROOT, 'node_modules', '.node-pty-electron.stamp');
const PTY_NODE = path.join(REPO_ROOT, 'node_modules', 'node-pty', 'build', 'Release', 'pty.node');
const FORCE = process.argv.includes('--force');
const IS_POSTINSTALL = process.env.npm_lifecycle_event === 'postinstall';

function log(msg) {
  console.log(`[nodeterm] ${msg}`);
}

function warn(msg) {
  console.warn(`[nodeterm] ${msg}`);
}

function fail(msg) {
  console.error(`[nodeterm] ${msg}`);
}

function getBuildStamp() {
  try {
    const electronPkg = require(path.join(REPO_ROOT, 'node_modules', 'electron', 'package.json'));
    const ptyPkg = require(path.join(REPO_ROOT, 'node_modules', 'node-pty', 'package.json'));
    return `${electronPkg.version}:${ptyPkg.version}:${process.platform}-${process.arch}`;
  } catch {
    return null;
  }
}

function isAlreadyBuiltForElectron() {
  if (FORCE) return false;
  const stamp = getBuildStamp();
  if (!stamp || !fs.existsSync(PTY_NODE)) return false;
  try {
    return fs.readFileSync(STAMP_FILE, 'utf8').trim() === stamp;
  } catch {
    return false;
  }
}

function writeBuildStamp() {
  const stamp = getBuildStamp();
  if (!stamp) return;
  fs.writeFileSync(STAMP_FILE, stamp, 'utf8');
}

function verifyLoadsInElectron() {
  const electronExe = require(path.join(REPO_ROOT, 'node_modules', 'electron'));
  const checkScript = path.join(__dirname, 'verify-node-pty-native.js');
  const result = spawnSync(electronExe, [checkScript], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30000
  });
  return result.status === 0;
}

function finishFailed(output) {
  const hasBinary = fs.existsSync(PTY_NODE);
  const locked = /EPERM|EBUSY|operation not permitted|cannot unlink/i.test(output);

  if (locked && hasBinary) {
    warn(
      'No se pudo actualizar node-pty (archivo en uso). Cierra NodeTerm; no hace falta hacer nada si la app ya funciona.'
    );
    return 0;
  }

  if (IS_POSTINSTALL && !hasBinary) {
    fail('No se pudo compilar node-pty para Electron (terminales locales).');
    fail('Instala herramientas de build (python, make, g++) y ejecuta: npm run rebuild:native');
    if (output.trim()) {
      console.error(output.trim().split(/\r?\n/).slice(-12).join('\n'));
    }
    return 1;
  }

  warn('Compilación de node-pty incompleta. Cierra NodeTerm y ejecuta: npm run rebuild:native');
  return 0;
}

try {
  fs.accessSync(path.join(REPO_ROOT, 'node_modules', 'node-pty'));
} catch {
  process.exit(0);
}

if (isAlreadyBuiltForElectron()) {
  process.exit(0);
}

if (IS_POSTINSTALL) {
  log('Preparando node-pty para Electron (se ejecuta tras npm install)...');
} else {
  log('Recompilando node-pty para Electron...');
}

const isWin = process.platform === 'win32';
const binName = isWin ? 'electron-rebuild.cmd' : 'electron-rebuild';
const bin = path.join(REPO_ROOT, 'node_modules', '.bin', binName);
const rebuildArgs = ['-f', '-o', 'node-pty'];
const useNpx = !fs.existsSync(bin);

const result = spawnSync(
  useNpx ? 'npx' : bin,
  useNpx ? ['@electron/rebuild', ...rebuildArgs] : rebuildArgs,
  { cwd: REPO_ROOT, shell: isWin, encoding: 'utf8' }
);

const output = `${result.stdout || ''}${result.stderr || ''}`;

if (result.status === 0 && fs.existsSync(PTY_NODE)) {
  if (verifyLoadsInElectron()) {
    writeBuildStamp();
    log('node-pty listo para Electron.');
    process.exit(0);
  }
  warn('Rebuild de node-pty terminó pero la verificación en Electron falló.');
}

process.exit(finishFailed(output));
