'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  parseAutoDetectRequest,
  buildRttResponse,
  buildMcsSendDataRequest,
  parseMcsSendData,
  createAutoDetectState,
  handleAutoDetectRequest,
  stripSecAutodetect,
  isChannelPduHeader,
  RTT_REQUEST_CONTINUOUS,
  RTT_RESPONSE,
  SEC_AUTODETECT_REQ,
  SEC_AUTODETECT_RSP
} = require('../../src/main/services/rdp-autodetect');
const {
  createChannelFilterState,
  learnFromServerGcc,
  processServerFrame,
  siphonAutoDetectFrames
} = require('../../src/main/services/rdp-channel-filter');

describe('parseAutoDetectRequest / RTT response', () => {
  it('parsea RTT continuo y genera respuesta 6B', () => {
    const req = Buffer.alloc(6);
    req[0] = 0x06;
    req[1] = 0x00;
    req.writeUInt16LE(7, 2);
    req.writeUInt16LE(RTT_REQUEST_CONTINUOUS, 4);
    const parsed = parseAutoDetectRequest(req);
    assert.equal(parsed.kind, 'rtt');
    assert.equal(parsed.sequenceNumber, 7);

    const rsp = buildRttResponse(7);
    assert.equal(rsp.length, 6);
    assert.equal(rsp[1], 0x01);
    assert.equal(rsp.readUInt16LE(2), 7);
    assert.equal(rsp.readUInt16LE(4), RTT_RESPONSE);
  });

  it('handleAutoDetectRequest emite MCS SendDataRequest en canal 1001', () => {
    const state = createAutoDetectState();
    const req = Buffer.from([0x06, 0x00, 0x03, 0x00, 0x01, 0x00]);
    const out = handleAutoDetectRequest(state, 1001, 0, req, { forceSec: true });
    assert.equal(out.handled, true);
    assert.equal(out.replies.length, 1);
    const mcs = parseMcsSendData(out.replies[0]);
    assert.ok(mcs);
    assert.equal(mcs.channelId, 1001);
    assert.equal(mcs.userData.readUInt16LE(0), SEC_AUTODETECT_RSP);
  });

  it('NO trata CHANNEL_PDU flags=0x03 como AutoDetect', () => {
    const dynvc = Buffer.from(
      '250000000300000018034d6963726f736f66743a3a57696e',
      'hex'
    );
    assert.equal(isChannelPduHeader(dynvc), true);
    assert.equal(parseAutoDetectRequest(dynvc), null);
    const state = createAutoDetectState();
    const out = handleAutoDetectRequest(state, 1001, 0, dynvc, { forceSec: true });
    assert.equal(out.handled, false);
    assert.equal(out.replies.length, 0);
  });

  it('SEC_AUTODETECT_REQ se strippea y la respuesta lleva SEC_AUTODETECT_RSP', () => {
    const body = Buffer.from([0x06, 0x00, 0x02, 0x00, 0x01, 0x00]);
    const withSec = Buffer.alloc(4 + body.length);
    withSec.writeUInt16LE(SEC_AUTODETECT_REQ, 0);
    withSec.writeUInt16LE(0, 2);
    body.copy(withSec, 4);

    const stripped = stripSecAutodetect(withSec);
    assert.equal(stripped.hadSec, true);

    const state = createAutoDetectState();
    const out = handleAutoDetectRequest(state, 1003, 0, withSec);
    assert.equal(out.replies.length, 1);
    const mcs = parseMcsSendData(out.replies[0]);
    assert.equal(mcs.userData.readUInt16LE(0), SEC_AUTODETECT_RSP);
  });
});

describe('processServerFrame message channel', () => {
  function loadScNet(state) {
    const scNet = Buffer.from(
      fs.readFileSync(path.join(__dirname, 'frames/from-01-105b.hex'), 'utf8').trim(),
      'hex'
    );
    learnFromServerGcc(state, scNet);
  }

  it('en canal 1001 responde RTT real y no reenvia a WASM', () => {
    const state = createChannelFilterState();
    loadScNet(state);

    const userData = Buffer.from([0x06, 0x00, 0x09, 0x00, 0x01, 0x00]);
    const indication = buildMcsSendDataRequest(0, 1001, userData);
    indication[7] = 0x68;

    const result = processServerFrame(state, indication);
    assert.equal(result.dropped, true);
    assert.equal(result.forward, null);
    assert.equal(result.replies.length, 1);
    assert.match(result.note, /rtt/);
  });

  it('dropea DYNVC en 1001 sin remapear a 1004 (evita crash IronRDP)', () => {
    const state = createChannelFilterState();
    loadScNet(state);

    const userData = Buffer.from('070000000300000018084543484f00', 'hex');
    assert.equal(isChannelPduHeader(userData), true);

    const indication = buildMcsSendDataRequest(0, 1001, userData);
    indication[7] = 0x68;

    const result = processServerFrame(state, indication);
    assert.equal(result.dropped, true);
    assert.equal(result.forward, null);
    assert.equal(result.replies.length, 1);
    assert.match(result.note, /dvc-(accept|reject)/);
  });

  it('eco Session Probe keepalive 4B en canal 1001 sin forward a WASM', () => {
    const state = createChannelFilterState();
    loadScNet(state);
    state.clientInitiator = 1002;

    const userData = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const indication = buildMcsSendDataRequest(0, 1001, userData);
    indication[7] = 0x68;

    const result = processServerFrame(state, indication);
    assert.equal(result.dropped, true);
    assert.equal(result.forward, null);
    assert.equal(result.replies.length, 1);
    assert.match(result.note, /probe-keepalive-echo/);
    const mcs = parseMcsSendData(result.replies[0]);
    assert.equal(mcs.channelId, 1001);
    assert.equal(mcs.initiator, 1002);
    assert.deepEqual(Buffer.from(mcs.userData), userData);
  });

  it('dropea from-18-22b (8B IO) que tumba ShareControl IronRDP', () => {
    const state = createChannelFilterState();
    loadScNet(state);
    const io = Buffer.from(
      fs.readFileSync(path.join(__dirname, 'frames/from-18-22b.hex'), 'utf8').trim(),
      'hex'
    );
    const result = processServerFrame(state, io);
    assert.equal(result.dropped, true);
    assert.equal(result.replies.length, 0);
    assert.match(result.note, /(short-io 8B|server-heartbeat|heartbeat)/);
  });

  it('no intercepta trafico IO normal (>=10B ShareControl)', () => {
    const state = createChannelFilterState();
    loadScNet(state);
    const io = Buffer.from(
      fs.readFileSync(path.join(__dirname, 'frames/from-09-36b.hex'), 'utf8').trim(),
      'hex'
    );
    const result = processServerFrame(state, io);
    assert.equal(result.dropped, false);
    assert.equal(result.forward, io);
  });
});

describe('siphonAutoDetectFrames', () => {
  function loadScNet(state) {
    const scNet = Buffer.from(
      fs.readFileSync(path.join(__dirname, 'frames/from-01-105b.hex'), 'utf8').trim(),
      'hex'
    );
    learnFromServerGcc(state, scNet);
  }

  it('contesta el RTT antes de dejar pasar el resto de la ráfaga', () => {
    const state = createChannelFilterState();
    loadScNet(state);

    const rtt = Buffer.from([0x06, 0x00, 0x09, 0x00, 0x01, 0x00]);
    const autodetect = buildMcsSendDataRequest(0, 1001, rtt);
    autodetect[7] = 0x68;

    const graphics = Buffer.from([0x00, 0x10, 0x08, 0x00]);
    const early = siphonAutoDetectFrames(state, [graphics, autodetect, graphics]);
    assert.equal(early.replies.length, 1);
    assert.equal(early.kept.length, 2);
    assert.equal(early.notes.length, 1);
    assert.equal(early.notes[0].index, 1);
    assert.equal(early.notes[0].burst, 3);
    assert.ok(early.notes[0].lagMs >= 0);
    assert.match(early.notes[0].note, /rtt/);
    assert.equal(state.autoDetect.repliedCount, 1);

    const again = processServerFrame(state, early.kept[0]);
    assert.equal(again.replies.length, 0);
    assert.equal(state.autoDetect.repliedCount, 1);
  });
});
