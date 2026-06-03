#!/usr/bin/env node
/**
 * Recompila better-sqlite3 para la ABI de Electron (importación de contraseñas desde navegador).
 * Solo Windows; se invoca desde postinstall/predev o manualmente: npm run rebuild:native
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

function log(msg) {
  console.log(`[nodeterm] ${msg}`);
}

if (process.platform !== 'win32') {
  process.exit(0);
}

const sqlitePath = path.join(REPO_ROOT, 'node_modules', 'better-sqlite3');
try {
  require('fs').accessSync(sqlitePath);
} catch {
  process.exit(0);
}

log('Recompilando better-sqlite3 para Electron...');
const bin = path.join(REPO_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-rebuild.cmd' : 'electron-rebuild');
const args = ['-f', '-m', 'node_modules/better-sqlite3'];
const useNpx = !require('fs').existsSync(bin);

const result = spawnSync(
  useNpx ? 'npx' : bin,
  useNpx ? ['@electron/rebuild', ...args] : args,
  { cwd: REPO_ROOT, stdio: 'inherit', shell: process.platform === 'win32' }
);

if (result.status !== 0) {
  console.warn('[nodeterm] rebuild:native falló (puedes ejecutar: npm run rebuild:native)');
  process.exit(0);
}

log('better-sqlite3 listo para Electron.');
