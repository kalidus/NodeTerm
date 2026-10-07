#!/usr/bin/env node
/**
 * Smoke estático del vendor IronRDP EGFX (sin servidor RDP).
 * Verifica artefactos, exports WebCodecs y anuncio EGFX en el bridge helpers.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const vendorJs = path.join(root, 'vendor/iron-remote-desktop-rdp/iron-remote-desktop-rdp.js');
const vendorPkg = path.join(root, 'vendor/iron-remote-desktop-rdp/package.json');

assert.ok(fs.existsSync(vendorJs), 'falta vendor JS');
assert.ok(fs.existsSync(vendorPkg), 'falta vendor package.json');

const js = fs.readFileSync(vendorJs, 'utf8');
const pkg = JSON.parse(fs.readFileSync(vendorPkg, 'utf8'));

assert.ok(js.length > 1_000_000, 'JS vendor demasiado pequeno');
assert.ok(js.includes('SessionBuilder'), 'API SessionBuilder');
assert.ok(js.includes('enableCredssp') || js.includes('enable_credssp'), 'API enableCredssp');
assert.ok(js.includes('displayControl') || js.includes('display_control'), 'API displayControl');
assert.ok(
  js.includes('setAvc420WebcodecsCallback') || js.includes('set_avc420_webcodecs_callback'),
  'export WebCodecs callback'
);
assert.ok(js.includes('avc420Webcodecs') || js.includes('avc420_webcodecs'), 'export avc420Webcodecs');
assert.ok(String(pkg.version).includes('egfx'), `version vendor: ${pkg.version}`);

const { RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL } = require('../src/main/services/rdp-caps-helpers');
assert.equal(RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL, 0x0100);

const { isGraphicsChannelName } = require('../src/main/services/rdp-dynvc');
assert.equal(isGraphicsChannelName('Microsoft::Windows::RDS::Graphics'), true);
assert.equal(isGraphicsChannelName('Microsoft::Windows::RDS::DisplayControl'), false);

const {
  createChannelFilterState,
  learnFromServerGcc,
  processServerFrame
} = require('../src/main/services/rdp-channel-filter');

function buildMcsIndication(channelId, userData) {
  const lenField = userData.length < 0x80
    ? Buffer.from([userData.length])
    : Buffer.from([0x80 | ((userData.length >> 8) & 0x7f), userData.length & 0xff]);
  const mcsHdr = Buffer.concat([
    Buffer.from([0x02, 0xf0, 0x80, 0x68, 0x00, 0x00, (channelId >> 8) & 0xff, channelId & 0xff, 0x70]),
    lenField
  ]);
  const tpktLen = 4 + mcsHdr.length + userData.length;
  return Buffer.concat([
    Buffer.from([0x03, 0x00, (tpktLen >> 8) & 0xff, tpktLen & 0xff]),
    mcsHdr,
    userData
  ]);
}

function buildScNet(ioId, channelIds) {
  const count = channelIds.length;
  const blockLen = 8 + count * 2;
  const body = Buffer.alloc(blockLen);
  body.writeUInt16LE(0x0c03, 0);
  body.writeUInt16LE(blockLen, 2);
  body.writeUInt16LE(ioId, 4);
  body.writeUInt16LE(count, 6);
  channelIds.forEach((id, i) => body.writeUInt16LE(id, 8 + i * 2));
  const tpkt = Buffer.alloc(4 + body.length);
  tpkt.writeUInt8(0x03, 0);
  tpkt.writeUInt16BE(tpkt.length, 2);
  body.copy(tpkt, 4);
  return tpkt;
}

// Smoke framing: fragmento middle ~1590B en drdynvc no se dropea
{
  const state = createChannelFilterState();
  state.wasmChannelNames = ['cliprdr', 'drdynvc'];
  state.clientChannelNames = ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'];
  assert.equal(learnFromServerGcc(state, buildScNet(1003, [1004, 1005, 1006, 1007])), true);
  const body = Buffer.alloc(1590, 0xab);
  body[0] = 0xe0;
  const channelPdu = Buffer.alloc(8 + body.length);
  channelPdu.writeUInt32LE(body.length, 0);
  channelPdu.writeUInt32LE(0x00, 4);
  body.copy(channelPdu, 8);
  const res = processServerFrame(state, buildMcsIndication(1007, channelPdu));
  assert.equal(res.dropped, false, 'middle DynVC frag must forward');
  assert.equal(res.dvcForward, true);
  assert.ok(String(res.note).includes('dvc-passthrough-frag'));
}

console.log('[measure-ironrdp-egfx] OK');
console.log(`  vendor version=${pkg.version} size=${js.length}`);
console.log('  Framing: drdynvc CHANNEL_PDU middle passthrough OK');
console.log('  Criterio live: NODETERM_RDP_EGFX=1 + NODETERM_RDP_DEBUG=1');
console.log('    -> DynVC->WASM hex + escritorio; sin undecodable GFX spam');
console.log('  Bastion Wallix puede seguir en BITMAP aunque el cliente pida EGFX.');

// Sumario opcional del diagnostico H.264 en movimiento.
// Uso: node scripts/measure-ironrdp-egfx.js --h264-stats [ruta-al-jsonl]
if (process.argv.includes('--h264-stats')) {
  summarizeH264Stats();
}

function defaultJournalPath() {
  const appData = process.env.APPDATA
    || (process.env.HOME ? path.join(process.env.HOME, '.config') : null);
  if (!appData) return null;
  return path.join(appData, 'nodeterm', 'logs', 'rdp-egfx-diag.jsonl');
}

function summarizeH264Stats() {
  const argPath = process.argv[process.argv.indexOf('--h264-stats') + 1];
  const file = argPath && !argPath.startsWith('--') ? argPath : defaultJournalPath();
  if (!file || !fs.existsSync(file)) {
    console.log(`\n[h264stats] no encontrado: ${file || '(sin APPDATA)'}`);
    return;
  }
  const rows = fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch (_) { return null; } })
    .filter((o) => o && o.t === 'h264stats');
  if (!rows.length) {
    console.log('\n[h264stats] sin lineas t==h264stats en el journal');
    return;
  }
  const n = rows.length;
  const sum = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const max = (k) => rows.reduce((a, r) => Math.max(a, Number(r[k]) || 0), 0);
  const avg = (k) => (sum(k) / n);
  const fmt = (x) => Math.round(x * 10) / 10;
  console.log(`\n[h264stats] ${n} ventanas de 1s`);
  console.log(`  fps medio:      ${fmt(avg('fps'))}`);
  console.log(`  cola max:       ${max('qDepth')}`);
  console.log(`  %444 medio:     ${fmt(avg('pct444'))}%   (frames 4:4:4 vs total)`);
  console.log(`  %drop croma:    ${fmt(avg('dropPct'))}%  (max ${max('dropPct')}%)`);
  console.log(`  merge medio:    ${fmt(avg('mergeMs'))} ms (coste bucle JS croma)`);
  console.log(`  kbps luma med:  ${fmt(avg('kbpsLuma'))}  (max ${max('kbpsLuma')})  <- proxy QP/bitrate`);
  console.log(`  kbps croma med: ${fmt(avg('kbpsChroma'))}`);
  if (rows.some((r) => 'wireChroma' in r)) {
    console.log(`  wire L/C med:   ${fmt(avg('wireLuma'))}/${fmt(avg('wireChroma'))}  (AU en borde WASM→JS)`);
    console.log(`  wire other med: ${fmt(avg('wireOther'))}  (display raro/undefined)`);
  }
  console.log('  Lectura:');
  console.log('    wireChroma=0 -> residual AVC444 no llega al JS (servidor manda solo LUMA/Avc420, o bug WASM)');
  console.log('    drop/%444 malos -> CLIENTE tira croma; merge alto -> bucle JS; kbpsLuma alto + drop bajo -> SERVIDOR QP');
}
