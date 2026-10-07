'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseMcsSendData } = require('../../src/main/services/rdp-autodetect');
const {
  parseDvcPdu,
  buildDvcCreateResponse,
  handleDvcRequest,
  STATUS_SUCCESS,
  STATUS_NOT_SUPPORTED
} = require('../../src/main/services/rdp-dynvc');
const {
  createChannelFilterState,
  learnFromServerGcc,
  processServerFrame,
  remapClientDrdynvcFrame
} = require('../../src/main/services/rdp-channel-filter');
const { isBastionSession } = require('../../src/main/services/RdpNativeBridgeService');

function buildMcsIndication(channelId, userData) {
  const lenField = userData.length < 0x80
    ? Buffer.from([userData.length])
    : Buffer.from([0x80 | ((userData.length >> 8) & 0x7f), userData.length & 0xff]);
  const mcsHdr = Buffer.concat([
    Buffer.from([
      0x02, 0xf0, 0x80, 0x68,
      0x00, 0x00,
      (channelId >> 8) & 0xff, channelId & 0xff,
      0x70
    ]),
    lenField
  ]);
  const tpktLen = 4 + mcsHdr.length + userData.length;
  const tpktHdr = Buffer.from([0x03, 0x00, (tpktLen >> 8) & 0xff, tpktLen & 0xff]);
  return Buffer.concat([tpktHdr, mcsHdr, userData]);
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
  tpkt[0] = 0x03;
  tpkt[1] = 0x00;
  tpkt.writeUInt16BE(tpkt.length, 2);
  body.copy(tpkt, 4);
  return tpkt;
}

function buildDisplayControlCreatePdu(dvcChannelId = 0x15) {
  const nameBuf = Buffer.from('Microsoft::Windows::RDS::DisplayControl\0', 'ascii');
  const createReq = Buffer.concat([Buffer.from([0x10, dvcChannelId]), nameBuf]);
  const cpdu = Buffer.alloc(8 + createReq.length);
  cpdu.writeUInt32LE(createReq.length, 0);
  cpdu.writeUInt32LE(0x03, 4);
  createReq.copy(cpdu, 8);
  return cpdu;
}

describe('rdp-dynvc', () => {
  it('responde instantáneamente a AUDIO_PLAYBACK_DVC (gap-6994ms)', () => {
    const p = path.join(__dirname, 'frames/gap-6994ms-from-f122-43b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const mcs = parseMcsSendData(raw);
    assert.ok(mcs);
    assert.equal(mcs.channelId, 1001);

    const dvc = parseDvcPdu(mcs.userData);
    assert.ok(dvc);
    assert.equal(dvc.type, 'create-req');
    assert.equal(dvc.channelId, 0x12);
    assert.equal(dvc.channelName, 'AUDIO_PLAYBACK_DVC');

    const res = handleDvcRequest(mcs.channelId, 1002, mcs.userData);
    assert.ok(res.handled);
    assert.equal(res.replies.length, 1);
    assert.ok(res.note.includes('AUDIO_PLAYBACK_DVC'));

    // Verificar estructura del paquete de respuesta generado
    const reply = res.replies[0];
    const replyMcs = parseMcsSendData(reply);
    assert.ok(replyMcs);
    assert.equal(replyMcs.channelId, 1001);
    assert.equal(replyMcs.initiator, 1002);

    // CHANNEL_PDU length
    assert.equal(replyMcs.userData.readUInt32LE(0), 6); // 1 header + 1 id + 4 status
    // DVC header byte (0x10 = Create/CREATE_RSP Cmd=0x01, cbId=0) — MS-RDPEDYC
    assert.equal(replyMcs.userData[8], 0x10);
    assert.equal(replyMcs.userData[9], 0x12); // ChannelId 0x12
    assert.equal(replyMcs.userData.readUInt32LE(10), STATUS_NOT_SUPPORTED);
  });

  it('responde a Microsoft::Windows::RDS::Input (gap-2131ms)', () => {
    const p = path.join(__dirname, 'frames/gap-2131ms-from-f123-55b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const mcs = parseMcsSendData(raw);
    assert.ok(mcs);

    const dvc = parseDvcPdu(mcs.userData);
    assert.ok(dvc);
    assert.equal(dvc.channelName, 'Microsoft::Windows::RDS::Input');

    const res = handleDvcRequest(mcs.channelId, 1002, mcs.userData);
    assert.ok(res.handled);
    assert.equal(res.replies.length, 1);
  });

  it('responde a RDCamera_Device_Enumerator (gap-7876ms)', () => {
    const p = path.join(__dirname, 'frames/gap-7876ms-from-f124-51b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const mcs = parseMcsSendData(raw);
    assert.ok(mcs);

    const dvc = parseDvcPdu(mcs.userData);
    assert.ok(dvc);
    assert.equal(dvc.channelName, 'RDCamera_Device_Enumerator');

    const res = handleDvcRequest(mcs.channelId, 1002, mcs.userData);
    assert.ok(res.handled);
    assert.equal(res.replies.length, 1);
  });

  it('rechaza DisplayControl si WASM no declara drdynvc', () => {
    const p = path.join(__dirname, 'frames/gap-2136ms-from-f125-64b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const mcs = parseMcsSendData(raw);
    assert.ok(mcs);

    const dvc = parseDvcPdu(mcs.userData);
    assert.ok(dvc);
    assert.equal(dvc.channelName, 'Microsoft::Windows::RDS::DisplayControl');

    const res = handleDvcRequest(mcs.channelId, 1002, mcs.userData);
    assert.ok(res.handled);
    assert.equal(res.forward, false);
    assert.equal(res.replies.length, 1);
    assert.equal(parseMcsSendData(res.replies[0]).userData.readUInt32LE(10), STATUS_NOT_SUPPORTED);
  });

  it('reenvia DisplayControl al WASM cuando allowDisplayControl', () => {
    const p = path.join(__dirname, 'frames/gap-2136ms-from-f125-64b.hex');
    const userData = fs.existsSync(p)
      ? parseMcsSendData(Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex')).userData
      : buildDisplayControlCreatePdu();
    const dvc = parseDvcPdu(userData);
    assert.ok(dvc);
    assert.equal(dvc.channelName, 'Microsoft::Windows::RDS::DisplayControl');

    const res = handleDvcRequest(1005, 1002, userData, { allowDisplayControl: true });
    assert.ok(res.handled);
    assert.equal(res.forward, true);
    assert.equal(res.replies.length, 0);
    assert.ok(res.note.includes('DisplayControl'));
  });

  it('reenvia EGFX Graphics al WASM cuando allowGraphics', () => {
    const nameBuf = Buffer.from('Microsoft::Windows::RDS::Graphics\0', 'ascii');
    const createReq = Buffer.concat([Buffer.from([0x10, 0x20]), nameBuf]);
    const cpdu = Buffer.alloc(8 + createReq.length);
    cpdu.writeUInt32LE(createReq.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    createReq.copy(cpdu, 8);
    const res = handleDvcRequest(1005, 1002, cpdu, { allowGraphics: true });
    assert.ok(res.handled);
    assert.equal(res.forward, true);
    assert.equal(res.replies.length, 0);
    assert.ok(res.note.includes('Graphics'));
  });

  it('reenvia DYNVC_DATA_FIRST (Cmd=0x02) de Graphics, no lo trata como CREATE_RSP', () => {
    // Header 0x24 = Cmd=DataFirst(2), Sp=1 (Length u16), cbId=0; chId=7; Length=0x06f9; payload ZGFX 0xe0
    const dvc = Buffer.from('2407f906e0240900', 'hex');
    const cpdu = Buffer.alloc(8 + dvc.length);
    cpdu.writeUInt32LE(dvc.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    dvc.copy(cpdu, 8);

    // Registrar canal Graphics (CREATE previo)
    const nameBuf = Buffer.from('Microsoft::Windows::RDS::Graphics\0', 'ascii');
    const createReq = Buffer.concat([Buffer.from([0x10, 0x07]), nameBuf]);
    const createPdu = Buffer.alloc(8 + createReq.length);
    createPdu.writeUInt32LE(createReq.length, 0);
    createPdu.writeUInt32LE(0x03, 4);
    createReq.copy(createPdu, 8);
    handleDvcRequest(1005, 1002, createPdu, { allowGraphics: true });

    const parsed = parseDvcPdu(cpdu);
    assert.ok(parsed);
    assert.equal(parsed.type, 'data');
    assert.equal(parsed.cmd, 0x02);
    assert.equal(parsed.channelId, 7);
    assert.equal(parsed.totalLength, 0x06f9);
    assert.equal(parsed.data[0], 0xe0);

    const res = handleDvcRequest(1005, 1002, cpdu, { allowGraphics: true });
    assert.ok(res.handled);
    assert.equal(res.forward, true);
    assert.ok((res.note || '').includes('data-first'));
    assert.ok((res.note || '').includes('Graphics'));
  });

  it('emite CREATE_RSP con Cmd=0x01 (no 0x02 DataFirst)', () => {
    const pdu = buildDvcCreateResponse(0, 0x12, STATUS_NOT_SUPPORTED);
    assert.equal(pdu[8], 0x10);
    assert.equal(pdu[9], 0x12);
    assert.equal(pdu.readUInt32LE(10), STATUS_NOT_SUPPORTED);
  });

  it('sigue rechazando AUDIO con allowDisplayControl', () => {
    const p = path.join(__dirname, 'frames/gap-6994ms-from-f122-43b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const mcs = parseMcsSendData(raw);
    const res = handleDvcRequest(mcs.channelId, 1002, mcs.userData, { allowDisplayControl: true });
    assert.ok(res.handled);
    assert.equal(res.forward, false);
    assert.equal(res.replies.length, 1);
    assert.equal(parseMcsSendData(res.replies[0]).userData.readUInt32LE(10), STATUS_NOT_SUPPORTED);
  });

  it('reenvia AUDIO_PLAYBACK_DVC cuando allowAudio', () => {
    const p = path.join(__dirname, 'frames/gap-6994ms-from-f122-43b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const mcs = parseMcsSendData(raw);
    const res = handleDvcRequest(mcs.channelId, 1002, mcs.userData, { allowAudio: true });
    assert.ok(res.handled);
    assert.equal(res.forward, true);
    assert.equal(res.replies.length, 0);
    assert.ok((res.note || '').includes('AUDIO'));
  });

  it('responde a DVC Capabilities Request con estructura correcta', () => {
    // DVC Caps Request V3: Cmd=0x05, Sp=0x01 (0x54), pad8=0x00, Version=0x0003, MaxDataSize, Flags
    const dvcPayload = Buffer.from('54000300333311113d0aa704', 'hex');
    const channelPdu = Buffer.alloc(8 + dvcPayload.length);
    channelPdu.writeUInt32LE(dvcPayload.length, 0);
    channelPdu.writeUInt32LE(0x03, 4);
    dvcPayload.copy(channelPdu, 8);

    const parsed = parseDvcPdu(channelPdu);
    assert.ok(parsed);
    assert.equal(parsed.type, 'caps-req');
    assert.equal(parsed.version, 3);
    assert.equal(parsed.sp, 1);

    const res = handleDvcRequest(1003, 1002, channelPdu);
    assert.ok(res.handled);
    assert.equal(res.forward, false);
    assert.equal(res.replies.length, 1);

    const replyMcs = parseMcsSendData(res.replies[0]);
    assert.ok(replyMcs);
    assert.equal(replyMcs.userData.readUInt32LE(0), 12); // V3 len = 12
    assert.equal(replyMcs.userData[8], 0x54); // Cmd = 0x05, Sp = 1
    assert.equal(replyMcs.userData[9], 0x00); // pad8 = 0
    assert.equal(replyMcs.userData.readUInt16LE(10), 3); // Version = 3
    assert.equal(replyMcs.userData.readUInt32LE(12), 0x11113333);
  });

  it('acepta ECHO DVC y responde a ping Echo (MS-RDPEECO)', () => {
    // 1. Create REQ for "ECHO"
    const nameBuf = Buffer.from('ECHO\0', 'ascii');
    const createReq = Buffer.concat([Buffer.from([0x10, 0x08]), nameBuf]); // Cmd=1, cbId=0, chId=8, "ECHO\0"
    const cpdu = Buffer.alloc(8 + createReq.length);
    cpdu.writeUInt32LE(createReq.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    createReq.copy(cpdu, 8);

    const resCreate = handleDvcRequest(1003, 1002, cpdu);
    assert.ok(resCreate.handled);
    assert.equal(resCreate.replies.length, 1);
    assert.ok(resCreate.note.includes('dvc-accept'));

    // 2. Data Ping on channel 8 (MS-RDPEDYC: DATA Cmd=0x03 → header 0x30)
    const pingData = Buffer.from('HEARTBEAT_TEST_123', 'ascii');
    const dataReq = Buffer.concat([Buffer.from([0x30, 0x08]), pingData]);
    const cpduData = Buffer.alloc(8 + dataReq.length);
    cpduData.writeUInt32LE(dataReq.length, 0);
    cpduData.writeUInt32LE(0x03, 4);
    dataReq.copy(cpduData, 8);

    const resData = handleDvcRequest(1003, 1002, cpduData);
    assert.ok(resData.handled);
    assert.equal(resData.replies.length, 1);
    assert.ok(resData.note.includes('dvc-echo-reply'));

    const replyMcs = parseMcsSendData(resData.replies[0]);
    assert.ok(replyMcs);
    assert.equal(replyMcs.userData[8], 0x30); // Cmd=3 DATA, cbId=0
    assert.equal(replyMcs.userData[9], 0x08); // chId=8
    assert.equal(replyMcs.userData.subarray(10).toString('ascii'), 'HEARTBEAT_TEST_123');
  });

  it('reenvia CAPS DVC al WASM cuando allowDisplayControl/EGFX (handshake DynVC real)', () => {
    const dvcPayload = Buffer.from('54000300333311113d0aa704', 'hex');
    const channelPdu = Buffer.alloc(8 + dvcPayload.length);
    channelPdu.writeUInt32LE(dvcPayload.length, 0);
    channelPdu.writeUInt32LE(0x03, 4);
    dvcPayload.copy(channelPdu, 8);

    const res = handleDvcRequest(1003, 1002, channelPdu, { allowDisplayControl: true });
    assert.ok(res.handled);
    assert.equal(res.forward, true);
    assert.equal(res.replies.length, 0);
    assert.ok(res.note.includes('dvc-forward-caps'));
  });

  it('responde CAPS DVC en local si WASM no consume DynVC', () => {
    const dvcPayload = Buffer.from('54000300333311113d0aa704', 'hex');
    const channelPdu = Buffer.alloc(8 + dvcPayload.length);
    channelPdu.writeUInt32LE(dvcPayload.length, 0);
    channelPdu.writeUInt32LE(0x03, 4);
    dvcPayload.copy(channelPdu, 8);

    const res = handleDvcRequest(1003, 1002, channelPdu, {});
    assert.ok(res.handled);
    assert.equal(res.forward, false);
    assert.equal(res.replies.length, 1);
    assert.ok(res.note.includes('dvc-caps'));
  });

  it('conserva initiator 0, que es el que usa IronRDP con Wallix', () => {
    const nameBuf = Buffer.from('Microsoft::Windows::RDS::DisplayControl\0', 'ascii');
    const createReq = Buffer.concat([Buffer.from([0x10, 0x15]), nameBuf]);
    const cpdu = Buffer.alloc(8 + createReq.length);
    cpdu.writeUInt32LE(createReq.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    createReq.copy(cpdu, 8);

    const res = handleDvcRequest(1005, 0, cpdu);
    const replyMcs = parseMcsSendData(res.replies[0]);
    assert.equal(replyMcs.initiator, 0);
    assert.equal(replyMcs.channelId, 1005);
  });
});

describe('drdynvc remap DisplayControl', () => {
  function injectedDrdynvcState() {
    const state = createChannelFilterState();
    state.wasmChannelNames = ['cliprdr', 'drdynvc'];
    state.clientChannelNames = ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'];
    assert.equal(learnFromServerGcc(state, buildScNet(1003, [1004, 1005, 1006, 1007])), true);
    assert.equal(state.drdynvcChannelId, 1007);
    assert.equal(state.wasmDrdynvcChannelId, 1005);
    return state;
  }

  it('reenvia DisplayControl remapeando servidor->wasm', () => {
    const state = injectedDrdynvcState();
    const frame = buildMcsIndication(1007, buildDisplayControlCreatePdu());
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.replies.length, 0);
    assert.equal(res.forward.readUInt16BE(10), 1005);
  });

  it('reenvia CAPS al WASM en processServerFrame cuando hay drdynvc', () => {
    const state = injectedDrdynvcState();
    const dvcPayload = Buffer.from('54000300333311113d0aa704', 'hex');
    const channelPdu = Buffer.alloc(8 + dvcPayload.length);
    channelPdu.writeUInt32LE(dvcPayload.length, 0);
    channelPdu.writeUInt32LE(0x03, 4);
    dvcPayload.copy(channelPdu, 8);
    const frame = buildMcsIndication(1007, channelPdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.replies.length, 0);
    assert.ok((res.note || '').includes('dvc-forward-caps'));
  });

  it('sigue rechazando Geometry aunque WASM declare drdynvc', () => {
    const state = injectedDrdynvcState();
    const p = path.join(__dirname, 'frames/from-18-66b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const parsed = parseMcsSendData(raw);
    const frame = buildMcsIndication(1007, parsed.userData);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, true);
    assert.equal(res.forward, null);
    assert.equal(res.replies.length, 1);
  });

  it('remapear WASM->servidor el canal drdynvc inyectado', () => {
    const state = injectedDrdynvcState();
    const frame = buildMcsIndication(1005, buildDisplayControlCreatePdu());
    const out = remapClientDrdynvcFrame(state, frame);
    assert.equal(out.readUInt16BE(10), 1007);
  });

  it('rechaza DisplayControl si la sesion es de bastion (isBastion = true)', () => {
    const state = injectedDrdynvcState();
    state.isBastion = true;
    const frame = buildMcsIndication(1007, buildDisplayControlCreatePdu());
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, true);
    assert.equal(res.forward, null);
    assert.equal(res.replies.length, 1);
  });

  it('reenvia EGFX Graphics en bastion cuando WASM declara drdynvc', () => {
    const state = injectedDrdynvcState();
    state.isBastion = true;
    const nameBuf = Buffer.from('Microsoft::Windows::RDS::Graphics\0', 'ascii');
    const createReq = Buffer.concat([Buffer.from([0x10, 0x21]), nameBuf]);
    const cpdu = Buffer.alloc(8 + createReq.length);
    cpdu.writeUInt32LE(createReq.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    createReq.copy(cpdu, 8);
    const frame = buildMcsIndication(1007, cpdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.forward.readUInt16BE(10), 1005);
  });

  it('remapea drdynvc cliente en bastion para EGFX (WASM declaro drdynvc)', () => {
    const state = injectedDrdynvcState();
    state.isBastion = true;
    const frame = buildMcsIndication(1005, buildDisplayControlCreatePdu());
    const out = remapClientDrdynvcFrame(state, frame);
    assert.equal(out.readUInt16BE(10), 1007);
  });

  it('no remapea drdynvc si los IDs coinciden', () => {
    const state = createChannelFilterState();
    state.wasmChannelNames = ['cliprdr', 'drdynvc'];
    state.clientChannelNames = ['cliprdr', 'drdynvc'];
    assert.equal(learnFromServerGcc(state, buildScNet(1003, [1004, 1005])), true);
    assert.equal(state.drdynvcChannelId, 1005);
    assert.equal(state.wasmDrdynvcChannelId, 1005);
    const frame = buildMcsIndication(1005, buildDisplayControlCreatePdu());
    const out = remapClientDrdynvcFrame(state, frame);
    assert.equal(out.readUInt16BE(10), 1005);
    assert.equal(out, frame);
  });

  it('detecta bastion por flag explícito, formato de cadena PAM o protocolo SSL sin mirar hostname', () => {
    assert.equal(isBastionSession({ host: '10.0.0.1', useBastionWallix: true }), true);
    assert.equal(isBastionSession({ host: '10.0.0.1', isBastion: true }), true);
    assert.equal(isBastionSession({ host: '10.0.0.1', username: 'rt01119@default@target:APP:rt01119' }), true);
    assert.equal(isBastionSession({ host: '10.0.0.1', username: 'rt01119#target#vault' }), true);
    assert.equal(isBastionSession({ host: '10.0.0.1', username: 'Administrator' }), false);
    assert.equal(isBastionSession({ host: '10.0.0.1', username: 'Administrator', selectedProtocol: 0x01 }), true);
    assert.equal(isBastionSession({ host: '192.168.10.52', username: 'Administrator', selectedProtocol: 0x08 }), false);
    assert.equal(isBastionSession({ host: '192.168.10.52', bastionHost: '10.0.0.1' }), true);
  });

  it('activa isBastion dinámicamente si cliprdr llega por canal 1001 y rechaza DVC en 0ms', () => {
    const state = injectedDrdynvcState();
    assert.equal(state.isBastion, false);

    // Saludo cliprdr por canal 1001 (Wallix selector)
    const clipPdu = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // CB_MONITOR_READY
    const clipChannelPdu = Buffer.concat([
      Buffer.from([0x08, 0x00, 0x00, 0x00, 0x13, 0x00, 0x00, 0x00]),
      clipPdu
    ]);
    processServerFrame(state, buildMcsIndication(1001, clipChannelPdu));

    assert.equal(state.isBastion, true);

    // La siguiente petición DVC de DisplayControl debe ser rechazada inmediatamente
    const dvcFrame = buildMcsIndication(1007, buildDisplayControlCreatePdu());
    const res = processServerFrame(state, dvcFrame);
    assert.equal(res.dropped, true);
    assert.equal(res.forward, null);
    assert.equal(res.replies.length, 1);
  });

  it('reenvia fragmento CHANNEL_PDU drdynvc sin header DVC cuando allowGraphics', () => {
    const state = injectedDrdynvcState();
    // MIDDLE fragment: no FIRST/LAST, payload ZGFX-like (0xe0…) — no es PDU DVC parseable
    const body = Buffer.alloc(1590, 0xab);
    body[0] = 0xe0;
    body[1] = 0x01;
    const channelPdu = Buffer.alloc(8 + body.length);
    channelPdu.writeUInt32LE(body.length, 0);
    channelPdu.writeUInt32LE(0x00, 4); // middle: ni FIRST ni LAST
    body.copy(channelPdu, 8);
    const frame = buildMcsIndication(1007, channelPdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.dvcForward, true);
    assert.ok((res.note || '').includes('dvc-passthrough-frag'));
    assert.equal(res.forward.readUInt16BE(10), 1005);
  });

  it('sigue rechazando CREATE Audio en processServerFrame aunque allowGraphics', () => {
    const state = injectedDrdynvcState();
    const nameBuf = Buffer.from('AUDIO_PLAYBACK_DVC\0', 'ascii');
    const createReq = Buffer.concat([Buffer.from([0x10, 0x30]), nameBuf]);
    const cpdu = Buffer.alloc(8 + createReq.length);
    cpdu.writeUInt32LE(createReq.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    createReq.copy(cpdu, 8);
    const frame = buildMcsIndication(1007, cpdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, true);
    assert.equal(res.forward, null);
    assert.equal(res.replies.length, 1);
    assert.ok((res.note || '').includes('dvc-reject'));
    assert.ok((res.note || '').includes('AUDIO'));
    assert.equal(parseMcsSendData(res.replies[0]).userData.readUInt32LE(10), STATUS_NOT_SUPPORTED);
  });

  it('reenvia CREATE Audio en processServerFrame si WASM anuncio rdpsnd+drdynvc', () => {
    const state = injectedDrdynvcState();
    state.wasmChannelNames = ['cliprdr', 'rdpsnd', 'drdynvc'];
    const nameBuf = Buffer.from('AUDIO_PLAYBACK_DVC\0', 'ascii');
    const createReq = Buffer.concat([Buffer.from([0x10, 0x30]), nameBuf]);
    const cpdu = Buffer.alloc(8 + createReq.length);
    cpdu.writeUInt32LE(createReq.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    createReq.copy(cpdu, 8);
    const frame = buildMcsIndication(1007, cpdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.dvcForward, true);
    assert.ok((res.note || '').includes('AUDIO'));
  });

  it('reenvia CREATE Audio con allowAudioPlayback aunque wasmChannelNames no liste rdpsnd', () => {
    const state = injectedDrdynvcState();
    assert.ok(!state.wasmChannelNames.some((n) => String(n).toLowerCase() === 'rdpsnd'));
    state.allowAudioPlayback = true;
    const nameBuf = Buffer.from('AUDIO_PLAYBACK_DVC\0', 'ascii');
    const createReq = Buffer.concat([Buffer.from([0x10, 0x30]), nameBuf]);
    const cpdu = Buffer.alloc(8 + createReq.length);
    cpdu.writeUInt32LE(createReq.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    createReq.copy(cpdu, 8);
    const frame = buildMcsIndication(1007, cpdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.dvcForward, true);
    assert.ok((res.note || '').includes('AUDIO'));
  });

  it('con egfxGraphics rechaza AUDIO_PLAYBACK_DVC aunque haya rdpsnd+drdynvc', () => {
    const state = injectedDrdynvcState();
    state.wasmChannelNames = ['cliprdr', 'rdpsnd', 'drdynvc'];
    state.egfxGraphics = true;
    state.allowAudioPlayback = true;
    const nameBuf = Buffer.from('AUDIO_PLAYBACK_DVC\0', 'ascii');
    const createReq = Buffer.concat([Buffer.from([0x10, 0x30]), nameBuf]);
    const cpdu = Buffer.alloc(8 + createReq.length);
    cpdu.writeUInt32LE(createReq.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    createReq.copy(cpdu, 8);
    const frame = buildMcsIndication(1007, cpdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, true);
    assert.equal(res.forward, null);
    assert.equal(res.replies.length, 1);
    assert.ok((res.note || '').includes('dvc-reject'));
    assert.ok((res.note || '').includes('AUDIO'));
    assert.equal(parseMcsSendData(res.replies[0]).userData.readUInt32LE(10), STATUS_NOT_SUPPORTED);
  });

  it('con egfxGraphics sigue reenviando rdpsnd estatico', () => {
    const state = createChannelFilterState();
    state.wasmChannelNames = ['cliprdr', 'rdpsnd', 'drdynvc'];
    state.clientChannelNames = ['rdpdr', 'cliprdr', 'rdpsnd', 'drdynvc'];
    state.egfxGraphics = true;
    state.allowAudioPlayback = true;
    assert.equal(learnFromServerGcc(state, buildScNet(1003, [1004, 1005, 1006, 1007])), true);
    assert.equal(state.rdpsndChannelId, 1006);
    const payload = Buffer.alloc(4, 0xab);
    const cpdu = Buffer.alloc(8 + payload.length);
    cpdu.writeUInt32LE(payload.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    payload.copy(cpdu, 8);
    const frame = buildMcsIndication(1006, cpdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.rdpsndForward, true);
  });
});

describe('static rdpsnd forward', () => {
  function buildChannelPdu(payloadLen = 4) {
    const payload = Buffer.alloc(payloadLen, 0xab);
    const cpdu = Buffer.alloc(8 + payload.length);
    cpdu.writeUInt32LE(payload.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    payload.copy(cpdu, 8);
    return cpdu;
  }

  function rdpsndState(wasmNames) {
    const state = createChannelFilterState();
    state.wasmChannelNames = wasmNames;
    state.clientChannelNames = ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'];
    assert.equal(learnFromServerGcc(state, buildScNet(1003, [1004, 1005, 1006, 1007])), true);
    assert.equal(state.rdpsndChannelId, 1005);
    return state;
  }

  it('reenvia PDU estatico rdpsnd si WASM anuncio rdpsnd', () => {
    const state = rdpsndState(['cliprdr', 'rdpsnd', 'drdynvc']);
    assert.equal(state.wasmRdpsndChannelId, 1005);
    const frame = buildMcsIndication(1005, buildChannelPdu());
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.rdpsndForward, true);
    assert.ok((res.note || '').includes('rdpsnd-forward'));
    assert.equal(res.forward.readUInt16BE(10), 1005);
  });

  it('descarta PDU estatico rdpsnd si no hay opt-in audio', () => {
    const state = rdpsndState(['cliprdr', 'drdynvc']);
    assert.equal(state.allowAudioPlayback, false);
    const frame = buildMcsIndication(1005, buildChannelPdu());
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, true);
    assert.equal(res.forward, null);
  });

  it('reenvia PDU estatico rdpsnd con allowAudioPlayback sin nombre en CS_NET wasm', () => {
    const state = rdpsndState(['cliprdr', 'drdynvc']);
    state.allowAudioPlayback = true;
    const frame = buildMcsIndication(1005, buildChannelPdu());
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.rdpsndForward, true);
  });

  it('remapea rdpsnd servidor->wasm cuando los indices difieren por inyeccion', () => {
    const state = createChannelFilterState();
    // WASM: rdpsnd en indice 0; servidor inyecta rdpdr delante → IDs distintos.
    state.wasmChannelNames = ['rdpsnd', 'cliprdr', 'drdynvc'];
    state.clientChannelNames = ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'];
    assert.equal(learnFromServerGcc(state, buildScNet(1003, [1004, 1005, 1006, 1007])), true);
    assert.equal(state.rdpsndChannelId, 1005);
    assert.equal(state.wasmRdpsndChannelId, 1004);
    const frame = buildMcsIndication(1005, buildChannelPdu());
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.ok(res.forward);
    assert.equal(res.forward.readUInt16BE(10), 1004);
  });

  it('no trata SNDC_TRAINING (0x06) en rdpsnd como CB_TEMP_DIRECTORY', () => {
    // Caso real NLA: solo rdpdr inyectado → wire rdpsnd=1006, wasm index rdpsnd→1005.
    const state = createChannelFilterState();
    state.wasmChannelNames = ['cliprdr', 'rdpsnd', 'drdynvc'];
    state.clientChannelNames = ['rdpdr', 'cliprdr', 'rdpsnd', 'drdynvc'];
    assert.equal(learnFromServerGcc(state, buildScNet(1003, [1004, 1005, 1006, 1007])), true);
    assert.equal(state.rdpsndChannelId, 1006);
    assert.equal(state.channelIdToName.get(1006), 'rdpsnd');
    // CHANNEL_PDU + payload que parece cliprdr TEMP_DIRECTORY (msgType=0x0006, dataLen=520)
    // pero es SNDC_TRAINING en rdpsnd.
    const clipLike = Buffer.alloc(8);
    clipLike.writeUInt16LE(0x0006, 0);
    clipLike.writeUInt16LE(0, 2);
    clipLike.writeUInt32LE(520, 4);
    const cpdu = Buffer.alloc(8 + clipLike.length);
    cpdu.writeUInt32LE(clipLike.length, 0);
    cpdu.writeUInt32LE(0x03, 4);
    clipLike.copy(cpdu, 8);
    const frame = buildMcsIndication(1006, cpdu);
    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, false);
    assert.equal(res.rdpsndForward, true);
    assert.equal(res.isCliprdr, false);
    assert.ok(!(res.note || '').includes('cliprdr'));
  });
});


