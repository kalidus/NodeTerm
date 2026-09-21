'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  handleRailRequest,
  parseRailPdu,
  TS_RAIL_ORDER_HANDSHAKE,
  TS_RAIL_ORDER_HANDSHAKE_EX
} = require('../../src/main/services/rdp-rail');
const { processServerFrame, createChannelFilterState } = require('../../src/main/services/rdp-channel-filter');
const { parseMcsSendData, buildMcsSendDataIndication } = require('../../src/main/services/rdp-autodetect');

function wrapChannelPdu(payload) {
  const buf = Buffer.alloc(8 + payload.length);
  buf.writeUInt32LE(payload.length, 0);
  buf.writeUInt32LE(0x03, 4);
  payload.copy(buf, 8);
  return buf;
}

function railHandshake(buildNumber) {
  const body = Buffer.alloc(8);
  body.writeUInt16LE(TS_RAIL_ORDER_HANDSHAKE, 0);
  body.writeUInt16LE(8, 2);
  body.writeUInt32LE(buildNumber >>> 0, 4);
  return wrapChannelPdu(body);
}

function railHandshakeEx(buildNumber) {
  const body = Buffer.alloc(12);
  body.writeUInt16LE(TS_RAIL_ORDER_HANDSHAKE_EX, 0);
  body.writeUInt16LE(12, 2);
  body.writeUInt32LE(buildNumber >>> 0, 4);
  body.writeUInt32LE(0, 8);
  return wrapChannelPdu(body);
}

function cliprdrCaps() {
  const body = Buffer.alloc(24);
  body.writeUInt16LE(0x0007, 0); // CB_CLIP_CAPS
  body.writeUInt16LE(0, 2);
  body.writeUInt32LE(16, 4);
  return wrapChannelPdu(body);
}

describe('rail stub', () => {
  test('el handshake se absorbe y se contesta en el acto', () => {
    const res = handleRailRequest(1004, 0, railHandshake(19041));
    assert.equal(res.handled, true);
    assert.equal(res.replies.length, 1);
    assert.ok(res.note.includes('rail-handshake'));

    const reply = parseMcsSendData(res.replies[0]);
    assert.equal(reply.channelId, 1004);
    const parsed = parseRailPdu(reply.userData);
    assert.equal(parsed.orderType, TS_RAIL_ORDER_HANDSHAKE);
  });

  test('HANDSHAKE_EX tambien se contesta con handshake de cliente', () => {
    const res = handleRailRequest(1004, 0, railHandshakeEx(19041));
    assert.equal(res.handled, true);
    assert.equal(res.replies.length, 1);
  });

  test('un CB_CLIP_CAPS no se interpreta como RAIL', () => {
    const res = handleRailRequest(1004, 0, cliprdrCaps());
    assert.equal(res.handled, false);
  });

  test('solo el VC nombrado rail absorbe el handshake; cliprdr no se toca', () => {
    const state = createChannelFilterState();
    state.ready = true;
    state.ioChannelId = 1003;
    state.cliprdrChannelId = 1004;
    state.allowed = new Set([1003, 1004, 1005, 1006, 1007]);
    state.channelIdToName = new Map([
      [1004, 'rail'],
      [1005, 'rdpdr'],
      [1006, 'rdpsnd'],
      [1007, 'cliprdr']
    ]);
    state.clientInitiator = 0;

    const railFrame = buildMcsSendDataIndication(0, 1004, railHandshake(19041));
    const railRes = processServerFrame(state, railFrame);
    assert.equal(railRes.dropped, true);
    assert.equal(railRes.forward, null);
    assert.equal(railRes.replies.length, 1);
    assert.ok(railRes.note.includes('rail-handshake'));

    const clipFrame = buildMcsSendDataIndication(0, 1007, cliprdrCaps());
    const clipRes = processServerFrame(state, clipFrame);
    assert.equal(clipRes.isCliprdr, true);
    assert.equal(clipRes.dropped, false);
    assert.equal(clipRes.serverChannelId, 1007);
  });

  test('sin canal rail declarado el handshake no se stubbea', () => {
    const state = createChannelFilterState();
    state.ready = true;
    state.ioChannelId = 1003;
    state.cliprdrChannelId = 1004;
    state.allowed = new Set([1003, 1004, 1005]);
    state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']]);

    const frame = buildMcsSendDataIndication(0, 1005, railHandshake(19041));
    const res = processServerFrame(state, frame);
    assert.ok(!res.note || !String(res.note).includes('rail-handshake'));
  });
});
