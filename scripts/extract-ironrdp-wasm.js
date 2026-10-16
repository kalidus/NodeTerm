#!/usr/bin/env node
/**
 * Extrae el WASM embebido (data:application/wasm;base64,...) del glue IronRDP
 * a un fichero .wasm hermano y reescribe el default a new URL('./….wasm', import.meta.url).
 *
 * Idempotente: si ya no hay data URL y existe el .wasm, valida y sale OK.
 *
 * Uso: node scripts/extract-ironrdp-wasm.js [dir-vendor]
 * Default: third_party/ironrdp/wasm
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_URL_PREFIX = 'data:application/wasm;base64,';
const JS_NAME = 'iron-remote-desktop-rdp.js';
const WASM_NAME = 'iron-remote-desktop-rdp_bg.wasm';

const vendorDir = path.resolve(
  process.argv[2] || path.join(__dirname, '..', 'third_party', 'ironrdp', 'wasm')
);
const jsPath = path.join(vendorDir, JS_NAME);
const wasmPath = path.join(vendorDir, WASM_NAME);

function fail(msg) {
  console.error(`[extract-ironrdp-wasm] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(jsPath)) {
  fail(`no existe ${jsPath}`);
}

let js = fs.readFileSync(jsPath, 'utf8');
const marker = js.indexOf(DATA_URL_PREFIX);

if (marker < 0) {
  if (!fs.existsSync(wasmPath)) {
    fail(`no hay data URL en el JS y falta ${WASM_NAME}`);
  }
  const st = fs.statSync(wasmPath);
  if (st.size < 100_000) {
    fail(`${WASM_NAME} demasiado pequeño (${st.size} bytes)`);
  }
  if (!js.includes(`./${WASM_NAME}`) && !js.includes(WASM_NAME)) {
    fail(`JS sin data URL pero tampoco referencia a ${WASM_NAME}`);
  }
  console.log(
    `[extract-ironrdp-wasm] Ya extraído: ${WASM_NAME} (${st.size} bytes), JS ${js.length} bytes`
  );
  process.exit(0);
}

// El payload base64 termina en la comilla que cierra el string del data URL.
// Patrones típicos del glue wasm-bindgen/Vite:
//   new URL("data:application/wasm;base64,AAAA...", import.meta.url)
//   new URL('data:application/wasm;base64,AAAA...', import.meta.url)
const quote = js[marker - 1];
if (quote !== '"' && quote !== "'") {
  fail(`carácter antes del data URL no es comilla (got ${JSON.stringify(quote)})`);
}

const b64Start = marker + DATA_URL_PREFIX.length;
const b64End = js.indexOf(quote, b64Start);
if (b64End < 0) {
  fail('no se encontró el cierre del string data URL');
}

const b64 = js.slice(b64Start, b64End);
if (b64.length < 100_000) {
  fail(`base64 demasiado corto (${b64.length})`);
}

let wasmBuf;
try {
  wasmBuf = Buffer.from(b64, 'base64');
} catch (err) {
  fail(`base64 inválido: ${err.message}`);
}

if (wasmBuf.length < 100_000) {
  fail(`WASM decodificado demasiado pequeño (${wasmBuf.length} bytes)`);
}
if (wasmBuf[0] !== 0x00 || wasmBuf[1] !== 0x61 || wasmBuf[2] !== 0x73 || wasmBuf[3] !== 0x6d) {
  fail('magic WASM inválido (no empieza por \\0asm)');
}

fs.writeFileSync(wasmPath, wasmBuf);

// Sustituir todo el literal del data URL por la ruta relativa al .wasm
const oldLiteral = js.slice(marker - 1, b64End + 1); // incluye comillas
const newLiteral = `"./${WASM_NAME}"`;
const replaced = js.split(oldLiteral).join(newLiteral);
if (replaced === js) {
  fail('no se pudo reescribir el data URL');
}
if (replaced.includes(DATA_URL_PREFIX)) {
  fail('quedan data URL residuales tras la extracción');
}

fs.writeFileSync(jsPath, replaced, 'utf8');

const pkgPath = path.join(vendorDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const nextFiles = [JS_NAME, WASM_NAME, 'index.d.ts'];
  const prev = Array.isArray(pkg.files) ? pkg.files : [];
  for (const f of prev) {
    if (!nextFiles.includes(f)) nextFiles.push(f);
  }
  pkg.files = nextFiles;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

console.log(
  `[extract-ironrdp-wasm] OK: ${WASM_NAME} ${wasmBuf.length} bytes; JS ${js.length} → ${replaced.length} bytes`
);
