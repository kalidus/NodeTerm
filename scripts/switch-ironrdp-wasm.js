#!/usr/bin/env node
/**
 * Kill-switch IronRDP WASM: vendor (EGFX) <-> npm oficial 0.7.0
 *
 *   NODETERM_RDP_WASM=vendor|npm node scripts/switch-ironrdp-wasm.js
 *   (por defecto: vendor)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const mode = String(process.env.NODETERM_RDP_WASM || 'vendor').toLowerCase();

const VENDOR = 'file:vendor/iron-remote-desktop-rdp';
const NPM = '@devolutions/iron-remote-desktop-rdp@^0.7.0';

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const deps = pkg.dependencies || {};

if (mode === 'npm') {
  deps['@devolutions/iron-remote-desktop-rdp'] = '^0.7.0';
  console.log(`[switch-ironrdp-wasm] Dependencia -> ${NPM}`);
  console.log('[switch-ironrdp-wasm] Ejecuta: npm install');
} else if (mode === 'vendor') {
  deps['@devolutions/iron-remote-desktop-rdp'] = VENDOR;
  console.log(`[switch-ironrdp-wasm] Dependencia -> ${VENDOR}`);
  console.log('[switch-ironrdp-wasm] Ejecuta: npm install');
} else {
  console.error(`Modo desconocido: ${mode} (usa vendor|npm)`);
  process.exit(1);
}

pkg.dependencies = deps;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
