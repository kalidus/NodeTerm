'use strict';

/**
 * Simetria cliprdr en modo virtual:
 *  - saludo en canal etiquetado drdynvc llega al WASM (claim antes de DynVC)
 *  - saludo en IO 1003 llega al WASM (claim antes de DynVC-on-IO); sin write c2s en IO
 *  - c2s se escribe al canal del saludo (1001 / 1007), no flush EGFX a 1006 ni a IO 1003
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const rdpBridge = require('../../src/main/services/RdpNativeBridgeService');
const {
  createChannelFilterState,
  processServerFrame,
  isCliprdrGreetingPdu,
  canEmitCliprdrToWire,
  canFlushCliprdrToNamedVc
} = require('../../src/main/services/rdp-channel-filter');
const { parseMcsSendData, buildMcsSendDataIndication } = require('../../src/main/services/rdp-autodetect');

const CHANNEL_FLAG_FIRST_LAST = 0x03;
const CB_MONITOR_READY = 0x0001;
const CB_CLIP_CAPS = 0x0007;
const CB_FORMAT_DATA_REQUEST = 0x0004;

function wrapClip(msgType, data) {
  const payload = Buffer.alloc(8 + (data ? data.length : 0));
  payload.writeUInt16LE(msgType, 0);
  payload.writeUInt16LE(0, 2);
  payload.writeUInt32LE(data ? data.length : 0, 4);
  if (data) data.copy(payload, 8);
  const chan = Buffer.alloc(8 + payload.length);
  chan.writeUInt32LE(payload.length, 0);
  chan.writeUInt32LE(CHANNEL_FLAG_FIRST_LAST | 0x10, 4);
  payload.copy(chan, 8);
  return chan;
}

function buildMcsRequest(channelId, userData) {
  const lenField = userData.length < 0x80
    ? Buffer.from([userData.length])
    : Buffer.from([0x80 | ((userData.length >> 8) & 0x7f), userData.length & 0xff]);
  const mcsHdr = Buffer.concat([
    Buffer.from([0x02, 0xf0, 0x80, 0x64, 0x00, 0x00, (channelId >> 8) & 0xff, channelId & 0xff, 0x70]),
    lenField
  ]);
  const tpktLen = 4 + mcsHdr.length + userData.length;
  return Buffer.concat([
    Buffer.from([0x03, 0x00, (tpktLen >> 8) & 0xff, tpktLen & 0xff]),
    mcsHdr,
    userData
  ]);
}

function virtualAppState() {
  const st = createChannelFilterState();
  st.ready = true;
  st.isBastion = true;
  st.virtualChannels = true;
  st.wallixService = 'APP';
  st.egfxGraphics = true;
  st.ioChannelId = 1003;
  st.cliprdrChannelId = 1006;
  st.wasmDrdynvcChannelId = 1007;
  st.drdynvcChannelId = 1007;
  st.clientInitiator = 0;
  st.clientChannelNames = ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'];
  st.wasmChannelNames = ['cliprdr', 'drdynvc'];
  st.allowed = new Set([1003, 1004, 1005, 1006, 1007, 1001]);
  st.channelIdToName = new Map([
    [1004, 'rdpdr'],
    [1005, 'rdpsnd'],
    [1006, 'cliprdr'],
    [1007, 'drdynvc']
  ]);
  return st;
}

describe('isCliprdrGreetingPdu', () => {
  test('detecta CAPS y MONITOR_READY', () => {
    assert.equal(isCliprdrGreetingPdu(wrapClip(CB_CLIP_CAPS, Buffer.alloc(16))), true);
    assert.equal(isCliprdrGreetingPdu(wrapClip(CB_MONITOR_READY, Buffer.alloc(0))), true);
    assert.equal(isCliprdrGreetingPdu(wrapClip(CB_FORMAT_DATA_REQUEST, Buffer.alloc(4))), false);
  });
});

describe('virtual: claim saludo en canal drdynvc', () => {
  test('CAPS+READY en 1007 llegan como cliprdr al WASM', () => {
    const st = virtualAppState();
    const capsData = Buffer.alloc(16);
    capsData.writeUInt32LE(0x3e, 12);
    const caps = buildMcsSendDataIndication(0, 1007, wrapClip(CB_CLIP_CAPS, capsData));
    const ready = buildMcsSendDataIndication(0, 1007, wrapClip(CB_MONITOR_READY, Buffer.alloc(0)));

    const r1 = processServerFrame(st, caps);
    assert.equal(r1.dropped, false);
    assert.equal(r1.isCliprdr, true);
    assert.ok(r1.forward);
    assert.equal(st.serverCliprdrChannelId, 1007);
    assert.match(r1.cliprdrDesc || '', /CB_CLIP_CAPS/);

    const r2 = processServerFrame(st, ready);
    assert.equal(r2.isCliprdr, true);
    assert.ok(r2.forward);
    assert.equal(st.serverCliprdrChannelId, 1007);
    // Write path simetrico: el saludo esta en 1007 (estatico), no en 1001.
    assert.equal(st.cliprdrWriteChannelId, 1007);
  });

  test('sin virtualChannels DynVC sigue bloqueando el claim en 1007', () => {
    const st = virtualAppState();
    st.virtualChannels = false;
    const capsData = Buffer.alloc(16);
    capsData.writeUInt32LE(0x3e, 12);
    const caps = buildMcsSendDataIndication(0, 1007, wrapClip(CB_CLIP_CAPS, capsData));
    const r = processServerFrame(st, caps);
    assert.notEqual(r.isCliprdr, true);
    assert.equal(st.serverCliprdrChannelId, null);
  });
});

describe('virtual: c2s simetrico al canal del saludo', () => {
  test('FORMAT_DATA_REQUEST va a 1001, no a 1006', () => {
    const st = virtualAppState();
    st.serverCliprdrChannelId = 1001;
    st.cliprdrWriteChannelId = 1001;
    st.cliprdrServerReady = true;
    st.wallixService = 'APP';

    const reqBody = Buffer.alloc(4);
    reqBody.writeUInt32LE(1, 0);
    const frame = buildMcsRequest(1006, wrapClip(CB_FORMAT_DATA_REQUEST, reqBody));
    const { forward } = rdpBridge.filterClientVirtualChannelFrame(frame, st);

    assert.ok(forward, 'debe salir al wire');
    const parsed = parseMcsSendData(forward);
    assert.equal(parsed.channelId, 1001, 'simetria: mismo canal del saludo');
    assert.notEqual(parsed.channelId, 1006);
  });

  test('saludo en 1001 fija write path a 1001 (no VC nombrado)', () => {
    const st = virtualAppState();
    const capsData = Buffer.alloc(16);
    capsData.writeUInt32LE(0x3e, 12);
    const caps = buildMcsSendDataIndication(0, 1001, wrapClip(CB_CLIP_CAPS, capsData));
    const ready = buildMcsSendDataIndication(0, 1001, wrapClip(CB_MONITOR_READY, Buffer.alloc(0)));
    processServerFrame(st, caps);
    processServerFrame(st, ready);
    assert.equal(st.serverCliprdrChannelId, 1001);
    assert.equal(st.cliprdrWriteChannelId, 1001);
  });
});

describe('virtual: claim saludo en IO antes de DynVC', () => {
  test('CAPS+READY en 1003 con DynVC activo llegan como cliprdr al WASM', () => {
    const st = virtualAppState();
    const capsData = Buffer.alloc(16);
    capsData.writeUInt32LE(0x3e, 12);
    const caps = buildMcsSendDataIndication(0, 1003, wrapClip(CB_CLIP_CAPS, capsData));
    const ready = buildMcsSendDataIndication(0, 1003, wrapClip(CB_MONITOR_READY, Buffer.alloc(0)));

    const r1 = processServerFrame(st, caps);
    assert.equal(r1.dropped, false);
    assert.equal(r1.isCliprdr, true);
    assert.ok(r1.forward, 'CAPS debe llegar a WASM');
    assert.equal(st.serverCliprdrChannelId, 1003);
    assert.match(r1.cliprdrDesc || '', /CB_CLIP_CAPS/);

    const r2 = processServerFrame(st, ready);
    assert.equal(r2.isCliprdr, true);
    assert.ok(r2.forward, 'READY debe llegar a WASM');
    assert.equal(st.serverCliprdrChannelId, 1003);
    assert.equal(st.cliprdrWriteChannelId, null, 'sin write en IO (corta sesion)');
    assert.equal(canEmitCliprdrToWire(st, 1003), false);
    assert.equal(canFlushCliprdrToNamedVc(st), false, 'named flush sigue prohibido con saludo en IO');
  });

  test('c2s FORMAT_DATA_REQUEST con saludo IO no sale al wire por 1003', () => {
    const st = virtualAppState();
    st.serverCliprdrChannelId = 1003;
    st.cliprdrWriteChannelId = null;
    st.cliprdrServerReady = true;

    const reqBody = Buffer.alloc(4);
    reqBody.writeUInt32LE(1, 0);
    const frame = buildMcsRequest(1006, wrapClip(CB_FORMAT_DATA_REQUEST, reqBody));
    const { forward } = rdpBridge.filterClientVirtualChannelFrame(frame, st);

    assert.equal(forward, null, 'mute: no CHANNEL_PDU en MCS 1003');
  });

  test('legacy: saludo IO no confirma write path (sin virtual)', () => {
    const st = virtualAppState();
    st.virtualChannels = false;
    const capsData = Buffer.alloc(16);
    capsData.writeUInt32LE(0x3e, 12);
    const caps = buildMcsSendDataIndication(0, 1003, wrapClip(CB_CLIP_CAPS, capsData));
    const ready = buildMcsSendDataIndication(0, 1003, wrapClip(CB_MONITOR_READY, Buffer.alloc(0)));
    const r1 = processServerFrame(st, caps);
    assert.equal(r1.isCliprdr, true, 'claim antes de DynVC tambien en legacy');
    assert.equal(st.serverCliprdrChannelId, 1003);
    processServerFrame(st, ready);
    assert.equal(st.cliprdrWriteChannelId, null, 'legacy: sin write en IO');
    assert.equal(canEmitCliprdrToWire(st, 1003), false);
  });
});
