'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  parseServerNetworkChannels,
  readSendDataIndicationChannelId,
  readChannelJoinConfirmId,
  createChannelFilterState,
  filterServerFrame,
  processServerFrame,
  rewriteScNetChannelIds,
  resolveWasmAlignedServerIds,
  reassembleServerCliprdrForWasm,
  reassembleStaticChannelPduForWasm,
  syncWasmJoinedChannels,
  describeCliprdrPdu,
  CHANNEL_FLAG_FIRST,
  CHANNEL_FLAG_LAST
} = require('../../src/main/services/rdp-channel-filter');
const { parseMcsSendData, CHANNEL_PDU_HEADER_LEN } = require('../../src/main/services/rdp-autodetect');

describe('parseServerNetworkChannels', () => {
  it('lee SC_NET de from-01-105b (io=1003, vc=1004)', () => {
    const p = path.join(__dirname, 'frames/from-01-105b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const parsed = parseServerNetworkChannels(raw);
    assert.ok(parsed);
    assert.equal(parsed.ioChannelId, 1003);
    assert.deepEqual(parsed.channelIds, [1004]);
  });
});

describe('readSendDataIndicationChannelId', () => {
  it('lee canal 1003 / 1004 de dumps Wallix', () => {
    const io = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-09-36b.hex'), 'utf8').trim(), 'hex');
    assert.equal(readSendDataIndicationChannelId(io), 1003);
    const dvc = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-18-66b.hex'), 'utf8').trim(), 'hex');
    assert.equal(readSendDataIndicationChannelId(dvc), 1004);
  });
});

describe('readChannelJoinConfirmId', () => {
  it('detecta join confirm de canal (1003)', () => {
    const p = path.join(__dirname, 'frames/from-05-15b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    assert.equal(readChannelJoinConfirmId(raw), 1003);
  });
});

describe('filterServerFrame', () => {
  it('deja pasar IO y drdynvc; dropea 1001 tras aprender SC_NET', () => {
    const state = createChannelFilterState();
    const scNet = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-01-105b.hex'), 'utf8').trim(), 'hex');
    assert.equal(filterServerFrame(state, scNet), scNet);
    assert.equal(state.ready, true);
    assert.ok(state.allowed.has(1003));
    assert.ok(state.allowed.has(1004));
    assert.equal(state.allowed.has(1001), false);

    // from-18-22b: 8B IO con SEC_FLAGSHI — IronRDP ShareControl pide 10B; dropear.
    const shortIo = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-18-22b.hex'), 'utf8').trim(), 'hex');
    assert.equal(filterServerFrame(state, shortIo), null);

    const ioOk = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-09-36b.hex'), 'utf8').trim(), 'hex');
    assert.equal(filterServerFrame(state, ioOk), ioOk);

    const dvc = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-18-66b.hex'), 'utf8').trim(), 'hex');
    const procDvc = processServerFrame(state, dvc);
    assert.equal(procDvc.dropped, true);
    assert.equal(procDvc.replies.length, 1);
    assert.equal(procDvc.forward, null);

    // Fabricar SendDataIndication a canal 1001
    const bad = Buffer.from('0300001602f08068000003e97008008041000000e903', 'hex');
    assert.equal(readSendDataIndicationChannelId(bad), 1001);
    assert.equal(filterServerFrame(state, bad), null);
    assert.equal(state.droppedCount, 3); // short-io + dvc + ch1001
    assert.equal(state.droppedByChannel[1001], 1);
    assert.equal(state.droppedByChannel[1003], 1);
  });

  it('no toca Fast-Path', () => {
    const state = createChannelFilterState();
    const fp = Buffer.from(fs.readFileSync(path.join(__dirname, 'frames/from-14-581b.hex'), 'utf8').trim(), 'hex');
    assert.equal(filterServerFrame(state, fp), fp);
  });

  it('alinea SC_NET al CS_NET del WASM tras inyectar rdpdr', () => {
    assert.deepEqual(
      resolveWasmAlignedServerIds(
        ['cliprdr', 'rdpsnd', 'drdynvc'],
        ['rdpdr', 'cliprdr', 'rdpsnd', 'drdynvc'],
        [1004, 1005, 1006, 1007]
      ),
      [1005, 1006, 1007]
    );

    // TPKT minimo con SC_NET (io + 4 canales), mismo layout que dynvc.test.
    const scLen = 8 + 4 * 2;
    const sc = Buffer.alloc(scLen);
    sc.writeUInt16LE(0x0c03, 0);
    sc.writeUInt16LE(scLen, 2);
    sc.writeUInt16LE(1003, 4);
    sc.writeUInt16LE(4, 6);
    [1004, 1005, 1006, 1007].forEach((id, i) => sc.writeUInt16LE(id, 8 + i * 2));
    const frame = Buffer.alloc(4 + sc.length);
    frame[0] = 0x03;
    frame[1] = 0x00;
    frame.writeUInt16BE(frame.length, 2);
    sc.copy(frame, 4);

    const state = createChannelFilterState();
    state.wasmChannelNames = ['cliprdr', 'rdpsnd', 'drdynvc'];
    state.clientChannelNames = ['rdpdr', 'cliprdr', 'rdpsnd', 'drdynvc'];
    const res = processServerFrame(state, frame);
    assert.equal(res.scNetAligned, true);
    assert.equal(state.cliprdrChannelId, 1005);
    assert.equal(state.wasmRdpsndChannelId, 1006);
    assert.equal(state.wasmDrdynvcChannelId, 1007);
    const parsed = parseServerNetworkChannels(res.forward);
    assert.deepEqual(parsed.channelIds, [1005, 1006, 1007]);

    const rewritten = rewriteScNetChannelIds(frame, [1005, 1006, 1007]);
    assert.equal(rewritten.patched, true);
    assert.deepEqual(parseServerNetworkChannels(rewritten.buf).channelIds, [1005, 1006, 1007]);
  });

  it('bastion APP: no recorta SC_NET; WASM-facing = zip; inject-only = rail/rdpdr/rdpsnd', () => {
    const ids = [1004, 1005, 1006, 1007, 1008];
    const scLen = 8 + ids.length * 2;
    const sc = Buffer.alloc(scLen);
    sc.writeUInt16LE(0x0c03, 0);
    sc.writeUInt16LE(scLen, 2);
    sc.writeUInt16LE(1003, 4);
    sc.writeUInt16LE(ids.length, 6);
    ids.forEach((id, i) => sc.writeUInt16LE(id, 8 + i * 2));
    const frame = Buffer.alloc(4 + sc.length);
    frame[0] = 0x03;
    frame[1] = 0x00;
    frame.writeUInt16BE(frame.length, 2);
    sc.copy(frame, 4);

    const state = createChannelFilterState();
    state.isBastion = true;
    state.wasmChannelNames = ['cliprdr', 'drdynvc'];
    state.clientChannelNames = ['rail', 'rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'];
    const res = processServerFrame(state, frame);
    assert.notEqual(res.scNetAligned, true);
    assert.ok(state.wasmAlignedServerIds);
    assert.deepEqual(state.wasmAlignedServerIds, [1007, 1008]);
    assert.ok(state.injectOnlyChannelIds);
    assert.ok(state.injectOnlyChannelIds.has(1004));
    assert.ok(state.injectOnlyChannelIds.has(1005));
    assert.ok(state.injectOnlyChannelIds.has(1006));
    assert.ok(!state.injectOnlyChannelIds.has(1007));
    assert.ok(!state.injectOnlyChannelIds.has(1008));
    const parsed = parseServerNetworkChannels(res.forward);
    assert.deepEqual(parsed.channelIds, ids);
    // IronRDP zip sin align: cliprdr→1004, drdynvc→1005; wire real cliprdr=1007, drdynvc=1008
    assert.equal(state.cliprdrChannelId, 1004);
    assert.equal(state.wasmDrdynvcChannelId, 1005);
    assert.equal(state.drdynvcChannelId, 1008);
  });

  it('bastion APP: DynVC en 1008 se remapea a zip 1005 hacia WASM', () => {
    const state = createChannelFilterState();
    state.isBastion = true;
    state.ready = true;
    state.ioChannelId = 1003;
    state.wasmChannelNames = ['cliprdr', 'drdynvc'];
    state.clientChannelNames = ['rail', 'rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'];
    state.cliprdrChannelId = 1004;
    state.wasmDrdynvcChannelId = 1005;
    state.drdynvcChannelId = 1008;
    state.channelIdToName = new Map([
      [1004, 'rail'],
      [1005, 'rdpdr'],
      [1006, 'rdpsnd'],
      [1007, 'cliprdr'],
      [1008, 'drdynvc']
    ]);
    state.wasmAlignedServerIds = [1007, 1008];
    syncWasmJoinedChannels(state, [1004, 1005, 1006, 1007, 1008]);
    state.clientInitiator = 1;
    state.egfxGraphics = true;

    // CAPS DVC FIRST|LAST (mismo layout que dynvc.test)
    const dvcPayload = Buffer.from('54000300333311113d0aa704', 'hex');
    const channelPdu = Buffer.alloc(8 + dvcPayload.length);
    channelPdu.writeUInt32LE(dvcPayload.length, 0);
    channelPdu.writeUInt32LE(0x03, 4);
    dvcPayload.copy(channelPdu, 8);
    const frame = buildMcsIndication(1008, channelPdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.forward.readUInt16BE(10), 1005, 'remap wire 1008 → zip 1005');
  });

  it('bastion APP: cliprdr en 1007 se remapea a zip 1004 hacia WASM', () => {
    const state = createChannelFilterState();
    state.isBastion = true;
    state.ready = true;
    state.ioChannelId = 1003;
    state.cliprdrChannelId = 1004;
    state.drdynvcChannelId = 1008;
    state.wasmDrdynvcChannelId = 1005;
    state.channelIdToName = new Map([
      [1004, 'rail'],
      [1005, 'rdpdr'],
      [1006, 'rdpsnd'],
      [1007, 'cliprdr'],
      [1008, 'drdynvc']
    ]);
    state.clientInitiator = 1;

    const clipPdu = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // CB_MONITOR_READY
    const channelPdu = Buffer.concat([
      Buffer.from([0x08, 0x00, 0x00, 0x00, 0x13, 0x00, 0x00, 0x00]),
      clipPdu
    ]);
    const frame = buildMcsIndication(1007, channelPdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.isCliprdr, true);
    assert.equal(res.forward.readUInt16BE(10), 1004, 'remap wire 1007 → zip 1004');
  });
});

function buildChannelPdu(payload, flags = CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST, declaredLength = null) {
  const hdr = Buffer.alloc(CHANNEL_PDU_HEADER_LEN);
  hdr.writeUInt32LE(declaredLength == null ? payload.length : declaredLength, 0);
  hdr.writeUInt32LE(flags, 4);
  return Buffer.concat([hdr, payload]);
}

function directInjectFilterState() {
  const state = createChannelFilterState();
  state.ready = true;
  state.ioChannelId = 1003;
  state.cliprdrChannelId = 1005;
  state.rdpsndChannelId = 1006;
  state.wasmRdpsndChannelId = 1006;
  state.wasmChannelNames = ['cliprdr', 'rdpsnd', 'drdynvc'];
  state.wasmAlignedServerIds = [1005, 1006, 1007];
  syncWasmJoinedChannels(state, [1004, 1005, 1006, 1007]);
  state.channelIdToName = new Map([
    [1004, 'rdpdr'],
    [1005, 'cliprdr'],
    [1006, 'rdpsnd'],
    [1007, 'drdynvc']
  ]);
  state.clientInitiator = 1;
  return state;
}

function buildMcsIndication(channelId, userData) {
  const lenField = userData.length < 0x80
    ? Buffer.from([userData.length])
    : Buffer.from([0x80 | ((userData.length >> 8) & 0x7f), userData.length & 0xff]);
  const mcsHdr = Buffer.concat([
    Buffer.from([
      0x02, 0xf0, 0x80, 0x68,
      0x00, 0x01,
      (channelId >> 8) & 0xff, channelId & 0xff,
      0x70
    ]),
    lenField
  ]);
  const tpktLen = 4 + mcsHdr.length + userData.length;
  const tpktHdr = Buffer.from([0x03, 0x00, (tpktLen >> 8) & 0xff, tpktLen & 0xff]);
  return Buffer.concat([tpktHdr, mcsHdr, userData]);
}

describe('wasmJoined e inject-only', () => {
  it('marca rdpdr 1004 como inject-only tras alinear SC_NET', () => {
    const state = createChannelFilterState();
    state.ioChannelId = 1003;
    state.wasmAlignedServerIds = [1005, 1006, 1007];
    syncWasmJoinedChannels(state, [1004, 1005, 1006, 1007]);
    assert.ok(state.injectOnlyChannelIds.has(1004));
    assert.ok(state.wasmJoinedChannelIds.has(1005));
    assert.ok(!state.wasmJoinedChannelIds.has(1004));
  });

  it('absorbe tráfico en canal inject-only 1004 sin reenviar al WASM', () => {
    const state = directInjectFilterState();
    const cont = buildChannelPdu(Buffer.from('abcd'), CHANNEL_FLAG_LAST);
    const res = processServerFrame(state, buildMcsIndication(1004, cont));
    assert.equal(res.forward, null);
    assert.equal(res.dropped, true);
    assert.match(res.note, /inject-only-absorb/);
  });
});

describe('cliprdr servidor→WASM reensamblado', () => {
  it('promueve FIRST-only cuando el payload ya cumple length', () => {
    const state = createChannelFilterState();
    const payload = Buffer.alloc(24, 0x61);
    const chan = buildChannelPdu(payload, CHANNEL_FLAG_FIRST, 24);
    const frame = buildMcsIndication(1005, chan);
    const r = reassembleStaticChannelPduForWasm(
      state,
      'promote',
      frame,
      1005,
      parseMcsSendData(frame).userData
    );
    assert.equal(r.action, 'complete');
    assert.ok(r.promotedFirstOnly);
    assert.equal(parseMcsSendData(r.buf).userData.readUInt32LE(4) & 0x03, 0x03);
  });

  it('processServerFrame entrega un solo forward tras serie de 3 fragmentos', () => {
    const state = directInjectFilterState();
    const clipHdr = Buffer.alloc(8);
    clipHdr.writeUInt16LE(0x0005, 0);
    clipHdr.writeUInt16LE(0x1, 2);
    clipHdr.writeUInt32LE(8, 4);
    const partA = Buffer.concat([clipHdr, Buffer.from('AAAA')]);
    const partB = Buffer.from('BBBB');
    const totalPayload = partA.length + partB.length;
    const makeChan = (chunk, flags) => buildMcsIndication(
      1005,
      buildChannelPdu(chunk, flags, totalPayload)
    );

    const r1 = processServerFrame(state, makeChan(partA, CHANNEL_FLAG_FIRST));
    assert.equal(r1.forward, null);
    assert.equal(r1.buffered, true);

    const r2 = processServerFrame(state, makeChan(partB, CHANNEL_FLAG_LAST));
    assert.ok(r2.forward);
    assert.match(String(r2.note), /reassembled FIRST\|LAST/);
    const ud = parseMcsSendData(r2.forward).userData;
    assert.equal(ud.readUInt32LE(4) & 0x03, 0x03);
  });

  it('rdpsnd fragmentado se reensambla antes de forward', () => {
    const state = directInjectFilterState();
    const partA = Buffer.from('SNDAAAA');
    const partB = Buffer.from('SNDBBBB');
    const total = partA.length + partB.length;
    const f1 = buildMcsIndication(1006, buildChannelPdu(partA, CHANNEL_FLAG_FIRST, total));
    const f2 = buildMcsIndication(1006, buildChannelPdu(partB, CHANNEL_FLAG_LAST, total));

    const r1 = processServerFrame(state, f1);
    assert.equal(r1.forward, null);
    assert.equal(r1.buffered, true);

    const r2 = processServerFrame(state, f2);
    assert.ok(r2.forward);
    assert.match(String(r2.note), /static-vc-reasm.*rdpsnd/);
    assert.equal(parseMcsSendData(r2.forward).userData.readUInt32LE(4) & 0x03, 0x03);
  });
  it('une fragmentos CHANNEL_PDU en FIRST|LAST', () => {
    const state = createChannelFilterState();
    state.cliprdrChannelId = 1005;
    const clipHdr = Buffer.alloc(8);
    clipHdr.writeUInt16LE(0x0005, 0);
    clipHdr.writeUInt16LE(0x1, 2);
    clipHdr.writeUInt32LE(8, 4);
    const partA = Buffer.concat([clipHdr, Buffer.from('AAAA')]);
    const partB = Buffer.from('BBBB');
    const totalPayload = partA.length + partB.length;
    const makeChan = (chunk, flags) => {
      const h = Buffer.alloc(8);
      h.writeUInt32LE(totalPayload, 0);
      h.writeUInt32LE(flags, 4);
      return buildMcsIndication(1005, Buffer.concat([h, chunk]));
    };

    const f1 = makeChan(partA, 0x01);
    let r = reassembleServerCliprdrForWasm(
      state,
      f1,
      1005,
      parseMcsSendData(f1).userData
    );
    assert.equal(r.action, 'buffer');

    const f2 = makeChan(partB, 0x02);
    r = reassembleServerCliprdrForWasm(
      state,
      f2,
      1005,
      parseMcsSendData(f2).userData
    );
    assert.equal(r.action, 'complete');
    const outUd = parseMcsSendData(r.buf).userData;
    assert.equal(outUd.readUInt32LE(4) & 0x03, 0x03);
    assert.ok(describeCliprdrPdu(outUd).includes('CB_FORMAT_DATA_RESPONSE'));
  });

  it('descarta continuación huérfana', () => {
    const state = createChannelFilterState();
    state.cliprdrChannelId = 1005;
    const h = Buffer.alloc(8);
    h.writeUInt32LE(4, 0);
    h.writeUInt32LE(0x02, 4);
    const f = buildMcsIndication(1005, Buffer.concat([h, Buffer.from('xxxx')]));
    const r = reassembleServerCliprdrForWasm(state, f, 1005, parseMcsSendData(f).userData);
    assert.equal(r.action, 'drop-orphan');
  });
});

describe('patchInfoAutoLogon', () => {
  it('inyecta flag INFO_AUTOLOGON (0x08) en TS_INFO_PACKET real', () => {
    const { patchInfoAutoLogon } = require('../../src/main/services/rdp-mcs-helpers');
    const p = path.join(__dirname, 'frames/to-05-421b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const res = patchInfoAutoLogon(raw);
    assert.equal(res.patched, true);
    assert.ok(res.newFlags & 0x0008);
  });
});
