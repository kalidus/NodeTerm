'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  handleRdpdrRequest,
  parseRdpdrPdu,
  PAKID_CORE_SERVER_ANNOUNCE,
  PAKID_CORE_CLIENTID_CONFIRM,
  PAKID_CORE_CLIENT_NAME,
  PAKID_CORE_SERVER_CAPABILITY,
  PAKID_CORE_CLIENT_CAPABILITY,
  PAKID_CORE_DEVICELIST_ANNOUNCE
} = require('../../src/main/services/rdp-rdpdr');
const { processServerFrame, createChannelFilterState } = require('../../src/main/services/rdp-channel-filter');
const { parseMcsSendData, buildMcsSendDataIndication } = require('../../src/main/services/rdp-autodetect');

function wrapChannelPdu(payload) {
  const buf = Buffer.alloc(8 + payload.length);
  buf.writeUInt32LE(payload.length, 0);
  buf.writeUInt32LE(0x03, 4);
  payload.copy(buf, 8);
  return buf;
}

function serverAnnounce(versionMinor, clientId) {
  const body = Buffer.alloc(12);
  body.writeUInt16LE(0x4472, 0);
  body.writeUInt16LE(PAKID_CORE_SERVER_ANNOUNCE, 2);
  body.writeUInt16LE(1, 4);
  body.writeUInt16LE(versionMinor, 6);
  body.writeUInt32LE(clientId, 8);
  return wrapChannelPdu(body);
}

describe('rdpdr stub', () => {
  test('el Server Announce de Wallix (hex del log) no se reenvia y se contesta en el acto', () => {
    // hex=0c0000000300000072446e4901000d00 + clientId
    const userData = serverAnnounce(13, 0x7e);
    const res = handleRdpdrRequest(1003, 0, userData);

    assert.equal(res.handled, true);
    assert.equal(res.replies.length, 2);
    assert.ok(res.note.includes('rdpdr-announce'));

    const confirm = parseMcsSendData(res.replies[0]);
    assert.equal(confirm.channelId, 1003);
    assert.equal(confirm.initiator, 0, 'tiene que usar el mismo initiator 0 que IronRDP');
    const confirmPdu = parseRdpdrPdu(confirm.userData);
    assert.equal(confirmPdu.packetId, PAKID_CORE_CLIENTID_CONFIRM);
    assert.equal(confirmPdu.payload.readUInt16LE(6), 13);
    assert.equal(confirmPdu.payload.readUInt32LE(8), 0x7e);

    const name = parseRdpdrPdu(parseMcsSendData(res.replies[1]).userData);
    assert.equal(name.packetId, PAKID_CORE_CLIENT_NAME);
  });

  test('las capabilities del servidor cierran el handshake con device list vacia', () => {
    const body = Buffer.alloc(8);
    body.writeUInt16LE(0x4472, 0);
    body.writeUInt16LE(PAKID_CORE_SERVER_CAPABILITY, 2);
    body.writeUInt16LE(1, 4);
    body.writeUInt16LE(0, 6);
    const res = handleRdpdrRequest(1004, 1002, wrapChannelPdu(body));

    assert.equal(res.replies.length, 2);
    assert.equal(parseRdpdrPdu(parseMcsSendData(res.replies[0]).userData).packetId, PAKID_CORE_CLIENT_CAPABILITY);
    assert.equal(parseRdpdrPdu(parseMcsSendData(res.replies[1]).userData).packetId, PAKID_CORE_DEVICELIST_ANNOUNCE);
  });

  test('en el canal IO se absorbe el Server Announce y no se contesta', () => {
    const state = createChannelFilterState();
    state.ready = true;
    state.ioChannelId = 1003;
    state.cliprdrChannelId = 1004;
    state.allowed = new Set([1003, 1004, 1005]);
    state.clientInitiator = 0;

    const frame = buildMcsSendDataIndication(0, 1003, serverAnnounce(13, 0x7e));
    const res = processServerFrame(state, frame);

    assert.equal(res.dropped, true);
    assert.equal(res.forward, null);
    assert.equal(res.replies.length, 0, 'escribir rdpdr en el canal IO cierra la sesion');
    assert.ok(res.note.includes('canal IO'));
  });

  test('rdpdr en el canal cliprdr se contesta por el VC rdpdr declarado', () => {
    const state = createChannelFilterState();
    state.ready = true;
    state.ioChannelId = 1003;
    state.cliprdrChannelId = 1004;
    state.allowed = new Set([1003, 1004, 1005, 1006]);
    state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpdr'], [1006, 'rdpsnd']]);
    state.clientInitiator = 0;

    const frame = buildMcsSendDataIndication(0, 1004, serverAnnounce(13, 0x7e));
    const res = processServerFrame(state, frame);

    assert.equal(res.dropped, true);
    assert.ok(res.replies.length >= 2);
    assert.equal(parseMcsSendData(res.replies[0]).channelId, 1005);
    assert.ok(res.note.includes('replies->ch=1005'));
  });

  test('en un canal virtual si se cierra el handshake', () => {
    const state = createChannelFilterState();
    state.ready = true;
    state.ioChannelId = 1003;
    state.cliprdrChannelId = 1004;
    state.allowed = new Set([1003, 1004, 1005]);
    state.clientInitiator = 0;

    const frame = buildMcsSendDataIndication(0, 1005, serverAnnounce(13, 0x7e));
    const res = processServerFrame(state, frame);

    assert.equal(res.dropped, true);
    assert.ok(res.replies.length >= 2);
    assert.equal(parseMcsSendData(res.replies[0]).channelId, 1005);
  });

  test('un PDU que no es rdpdr no se reclama', () => {
    const res = handleRdpdrRequest(1004, 0, Buffer.from([0x01, 0x00, 0x00, 0x00]));
    assert.equal(res.handled, false);
    assert.equal(res.replies.length, 0);
  });
});
