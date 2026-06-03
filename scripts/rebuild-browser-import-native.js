#!/usr/bin/env node
/**
 * Recompila módulos nativos de importación desde navegador para la ABI de Electron.
 * Windows: better-sqlite3 + @primno/dpapi
 *
 * - Se ejecuta solo en postinstall (npm install) o con npm run rebuild:native
 * - Si ya está compilado para esta versión de Electron, no hace nada (stamp)
 * - En postinstall, si falla y no hay binario, npm install termina con error visible
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const STAMP_FILE = path.join(REPO_ROOT, 'node_modules', '.browser-import-native-electron.stamp');
const NODE_FILE = path.join(REPO_ROOT, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
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
    const sqlitePkg = require(path.join(REPO_ROOT, 'node_modules', 'better-sqlite3', 'package.json'));
    let dpapiVer = '-';
    try {
      dpapiVer = require(path.join(REPO_ROOT, 'node_modules', '@primno', 'dpapi', 'package.json')).version;
    } catch {
      /* optional */
    }
    return `${electronPkg.version}:${sqlitePkg.version}:${dpapiVer}`;
  } catch {
    return null;
  }
}

function isAlreadyBuiltForElectron() {
  if (FORCE) return false;
  const stamp = getBuildStamp();
  if (!stamp || !fs.existsSync(NODE_FILE)) return false;
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
  const checkScript = path.join(__dirname, 'verify-browser-import-native.js');
  const result = spawnSync(electronExe, [checkScript], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30000
  });
  return result.status === 0;
}

function finishFailed(output) {
  const hasBinary = fs.existsSync(NODE_FILE);
  const locked = /EPERM|EBUSY|operation not permitted|cannot unlink/i.test(output);

  if (locked && hasBinary) {
    warn(
      'No se pudo actualizar módulos nativos (archivo en uso). Cierra NodeTerm; no hace falta hacer nada si la app ya funciona.'
    );
    return 0;
  }

  if (IS_POSTINSTALL && !hasBinary) {
    fail('No se pudieron compilar los módulos nativos para Electron (importación desde navegador).');
    fail('Cierra NodeTerm si está abierto y vuelve a ejecutar: npm install');
    if (output.trim()) {
      console.error(output.trim().split(/\r?\n/).slice(-8).join('\n'));
    }
    return 1;
  }

  warn('Compilación nativa incompleta. Cierra NodeTerm y ejecuta: npm run rebuild:native');
  return 0;
}

if (process.platform !== 'win32') {
  process.exit(0);
}

try {
  fs.accessSync(path.join(REPO_ROOT, 'node_modules', 'better-sqlite3'));
} catch {
  process.exit(0);
}

if (isAlreadyBuiltForElectron()) {
  process.exit(0);
}

if (IS_POSTINSTALL) {
  log('Preparando módulos nativos para Electron (se ejecuta una vez tras npm install)...');
} else {
  log('Recompilando módulos nativos para Electron...');
}

const nativeModules = ['better-sqlite3'];
try {
  fs.accessSync(path.join(REPO_ROOT, 'node_modules', '@primno', 'dpapi'));
  nativeModules.push('@primno/dpapi');
} catch {
  /* dpapi no instalado */
}

const bin = path.join(REPO_ROOT, 'node_modules', '.bin', 'electron-rebuild.cmd');
const rebuildArgs = ['-f'];
for (const mod of nativeModules) {
  rebuildArgs.push('-m', mod);
}
const useNpx = !fs.existsSync(bin);

const result = spawnSync(
  useNpx ? 'npx' : bin,
  useNpx ? ['@electron/rebuild', ...rebuildArgs] : rebuildArgs,
  { cwd: REPO_ROOT, shell: true, encoding: 'utf8' }
);

const output = `${result.stdout || ''}${result.stderr || ''}`;

if (result.status === 0 && fs.existsSync(NODE_FILE)) {
  if (verifyLoadsInElectron()) {
    writeBuildStamp();
    log('Módulos nativos listos para Electron (importación desde navegador).');
    process.exit(0);
  }
  warn('Rebuild terminó pero la verificación en Electron falló.');
}

process.exit(finishFailed(output));
