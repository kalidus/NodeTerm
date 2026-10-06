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
