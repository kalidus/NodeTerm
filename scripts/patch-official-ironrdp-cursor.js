#!/usr/bin/env node
/**
 * Parche mínimo del WASM oficial @devolutions/iron-remote-desktop-rdp@0.7.0
 * (IronRDP #1900 / #1910): habilita cursores remotos sin recompilar el WASM.
 *
 * El binario npm tiene enable_server_pointer=false y descarta todos los Pointer
 * Updates. Aquí se anula solo el early-return en process_pointer_update
 * (7 bytes), conservando el rendimiento del artefacto oficial.
 *
 * Sustituye:
 *   local.get 1 ; i32.load8_u offset=1251 ; i32.eqz
 * por:
 *   local.get 1 ; drop ; i32.const 0 ; nop ; nop
 */
'use strict';

const fs = require('fs');
const path = require('path');

const JS = path.join(
  __dirname,
  '..',
  'node_modules',
  '@devolutions',
  'iron-remote-desktop-rdp',
  'iron-remote-desktop-rdp.js'
);

const NEEDLE = Buffer.from([0x20, 0x01, 0x2d, 0x00, 0xe3, 0x09, 0x45]);
const REPLACEMENT = Buffer.from([0x20, 0x01, 0x1a, 0x41, 0x00, 0x01, 0x01]);

function log(msg) {
  console.log(`[nodeterm] ${msg}`);
}

function extractWasm(js) {
  const marker = 'data:application/wasm;base64,';
  const i = js.indexOf(marker);
  if (i < 0) throw new Error('No se encontró data:application/wasm;base64 en iron-remote-desktop-rdp.js');
  const start = i + marker.length;
  const end = js.indexOf('"', start);
  if (end < 0) throw new Error('WASM base64 sin terminar');
  return {
    start,
    end,
    wasm: Buffer.from(js.slice(start, end), 'base64'),
    prefix: js.slice(0, start),
    suffix: js.slice(end)
  };
}

function findAll(buf, needle) {
  const hits = [];
  let idx = 0;
  while (true) {
    idx = buf.indexOf(needle, idx);
    if (idx < 0) break;
    hits.push(idx);
    idx += 1;
  }
  return hits;
}

function main() {
  if (!fs.existsSync(JS)) {
    log('iron-remote-desktop-rdp no instalado; se omite el parche de cursores');
    return;
  }

  const js = fs.readFileSync(JS, 'utf8');
  const { wasm, prefix, suffix } = extractWasm(js);

  const already = findAll(wasm, REPLACEMENT);
  if (already.length && findAll(wasm, NEEDLE).length === 0) {
    log('Parche de cursores IronRDP ya aplicado');
    return;
  }

  const hits = findAll(wasm, NEEDLE);
  if (hits.length === 0) {
    // Vendor EGFX (master) ya trae enable_server_pointer=true; el patrón del 0.7.0 no aplica.
    const pkgPath = path.join(path.dirname(JS), 'package.json');
    let ver = '';
    try { ver = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || ''; } catch (_) { /* noop */ }
    if (String(ver).includes('egfx') || String(ver).includes('nodeterm')) {
      log(`Parche de cursores omitido (vendor ${ver} ya habilita server pointer)`);
      return;
    }
    throw new Error(
      'No se encontró el patrón enable_server_pointer en el WASM. ' +
        '¿Cambió la versión de @devolutions/iron-remote-desktop-rdp?'
    );
  }
  if (hits.length !== 1) {
    throw new Error(`Se esperaba 1 hit del early-return de puntero, hay ${hits.length}`);
  }

  const patched = Buffer.from(wasm);
  REPLACEMENT.copy(patched, hits[0]);
  fs.writeFileSync(JS, prefix + patched.toString('base64') + suffix);
  log('Aplicado parche de cursores IronRDP (7 bytes en WASM oficial, #1900/#1910)');
}

main();
