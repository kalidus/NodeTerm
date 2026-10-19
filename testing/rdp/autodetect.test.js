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

  it('SEC_AUTODETECT_REQ con flagsHi != 0 tambien se strippea (IronRDP #1629)', () => {
    // flags=0x9000 (AUTODETECT_REQ|FLAGSHI_VALID), flagsHi=0x0001
    const withSec = Buffer.from([0x00, 0x90, 0x01, 0x00, 0x06, 0x00, 0x00, 0x00, 0x14, 0x00]);
    const stripped = stripSecAutodetect(withSec);
    assert.equal(stripped.hadSec, true);
    assert.equal(stripped.body[0], 0x06);
    assert.equal(stripped.body[1], 0x00);
  });
});

describe('license exchange gate (IronRDP #1629)', () => {
  function loadScNet(state) {
    const scNet = Buffer.from(
      fs.readFileSync(path.join(__dirname, 'frames/from-01-105b.hex'), 'utf8').trim(),
      'hex'
    );
    learnFromServerGcc(state, scNet);
  }

  function buildIoIndication(userData) {
    const indication = buildMcsSendDataRequest(0, 1003, userData);
    indication[7] = 0x68;
    return indication;
  }

  it('PDU #1629 SEC_AUTODETECT_REQ en IO no llega a WASM', () => {
    const state = createChannelFilterState();
    loadScNet(state);
    assert.equal(state.licenseExchangeOpen, true);

    // user_data del issue: flags=0x1000, requestType 0x0014 (BW_START; no genera reply)
    const userData = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x14, 0x00]);
    const result = processServerFrame(state, buildIoIndication(userData));
    assert.equal(result.dropped, true);
    assert.equal(result.forward, null);
    assert.match(String(result.note || ''), /bw-start|autodetect|pre-license/);
    assert.equal(state.licenseExchangeOpen, true);
  });

  it('SEC_AUTODETECT_REQ RTT en IO responde y no reenvia a WASM', () => {
    const state = createChannelFilterState();
    loadScNet(state);

    const userData = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x06, 0x00, 0x09, 0x00, 0x01, 0x00]);
    const result = processServerFrame(state, buildIoIndication(userData));
    assert.equal(result.dropped, true);
    assert.equal(result.forward, null);
    assert.ok(result.replies.length >= 1);
    const mcs = parseMcsSendData(result.replies[0]);
    assert.equal(mcs.userData.readUInt16LE(0), SEC_AUTODETECT_RSP);
  });

  it('SEC_AUTODETECT_REQ con flagsHi que parece ShareControl type 7 se dropea en fase licencia', () => {
    const state = createChannelFilterState();
    loadScNet(state);

    // Siphon puede fallar si el body no parsea; el gate debe dropear igual.
    // flags=0x1000, flagsHi=0x0007 (nibble type=7) — sin body AD valido.
    const userData = Buffer.alloc(12);
    userData.writeUInt16LE(SEC_AUTODETECT_REQ, 0);
    userData.writeUInt16LE(0x0007, 2);
    userData.writeUInt16LE(0xabcd, 4);
    userData.writeUInt32LE(0, 6);

    const result = processServerFrame(state, buildIoIndication(userData));
    assert.equal(result.dropped, true);
    assert.equal(result.forward, null);
    assert.match(String(result.note || ''), /pre-license-autodetect|autodetect|sec-autodetect/);
  });

  it('SEC_LICENSE_PKT sigue pasando durante licenseExchangeOpen', () => {
    const state = createChannelFilterState();
    loadScNet(state);

    const userData = Buffer.from('8000000001023e017b3c31a6aee874f6', 'hex');
    const result = processServerFrame(state, buildIoIndication(userData));
    assert.equal(result.dropped, false);
    assert.ok(result.forward);
    assert.equal(state.licenseExchangeOpen, true);
  });

  it('STATUS_VALID_CLIENT real cierra licenseExchangeOpen', () => {
    const {
      buildStatusValidClientUserData,
      noteLicenseValidClient
    } = require('../../src/main/services/rdp-channel-filter');
    const state = createChannelFilterState();
    loadScNet(state);
    assert.equal(state.licenseExchangeOpen, true);

    const userData = buildStatusValidClientUserData();
    assert.equal(noteLicenseValidClient(state, userData), true);
    assert.equal(state.licenseExchangeOpen, false);

    // processServerFrame debe reenviar el PDU y dejar el gate cerrado
    state.licenseExchangeOpen = true;
    const result = processServerFrame(state, buildIoIndication(userData));
    assert.equal(result.dropped, false);
    assert.ok(result.forward);
    assert.equal(state.licenseExchangeOpen, false);
  });

  it('Demand Active inyecta STATUS_VALID_CLIENT y cierra el gate', () => {
    const state = createChannelFilterState();
    loadScNet(state);

    // Demand Active minimo: totalLength=12, pduType|ver=0x0011, pduSource=1003, shareId
    const demandActive = Buffer.alloc(12);
    demandActive.writeUInt16LE(12, 0);
    demandActive.writeUInt16LE(0x0011, 2);
    demandActive.writeUInt16LE(1003, 4);
    demandActive.writeUInt32LE(0x00010001, 6);

    const da = processServerFrame(state, buildIoIndication(demandActive));
    assert.equal(da.dropped, false);
    assert.ok(da.forward);
    assert.equal(state.licenseExchangeOpen, false);
    assert.ok(Array.isArray(da.wasmInjectBefore) && da.wasmInjectBefore.length === 1);
    const lic = parseMcsSendData(da.wasmInjectBefore[0]);
    assert.ok(lic);
    assert.equal(lic.userData.readUInt16LE(0) & 0x0080, 0x0080);
    assert.equal(lic.userData[4], 0xff);

    // Tras el gate: un PDU con bit 0x1000 en length que sea ShareControl Data (type 7)
    // no debe clasificarse como pre-license-autodetect.
    const dataPdu = Buffer.alloc(12);
    dataPdu.writeUInt16LE(0x100c, 0); // length con bit AUTODETECT
    dataPdu.writeUInt16LE(0x0017, 2); // type 7 | ver 0x10
    dataPdu.writeUInt16LE(1003, 4);
    dataPdu.writeUInt32LE(0x00010001, 6);

    const after = processServerFrame(state, buildIoIndication(dataPdu));
    assert.equal(after.dropped, false);
    assert.ok(after.forward);
    assert.ok(!String(after.note || '').includes('pre-license'));
  });

  it('DeactivateAll en licencia → STATUS_VALID_CLIENT sintético (sin reenviar DA)', () => {
    const state = createChannelFilterState();
    loadScNet(state);

    // Frame real del host 192.168.10.52
    const userData = Buffer.from('0d001600f10300000000010000', 'hex');
    const result = processServerFrame(state, buildIoIndication(userData));
    assert.equal(result.dropped, false);
    assert.ok(result.forward);
    assert.equal(state.licenseExchangeOpen, false);
    assert.match(String(result.note || ''), /synth-valid-client/);
    const lic = parseMcsSendData(result.forward);
    assert.ok(lic);
    assert.equal(lic.userData.readUInt16LE(0) & 0x0080, 0x0080);
    assert.equal(lic.userData[4], 0xff);
  });
});

describe('bridge mandatory Channel Joins', () => {
  const {
    holdOrReleaseClientInfo,
    takePendingClientInfoAfterIoJoin,
    readAttachUserConfirmInitiator,
    buildMcsChannelJoinRequest
  } = require('../../src/main/services/rdp-channel-filter');

  function loadScNet(state) {
    const scNet = Buffer.from(
      fs.readFileSync(path.join(__dirname, 'frames/from-01-105b.hex'), 'utf8').trim(),
      'hex'
    );
    learnFromServerGcc(state, scNet);
  }

  function buildAttachUserConfirm(userId) {
    // TPKT + X224 + MCS Attach User Confirm (0x2e), result=0, userId BE
    const body = Buffer.from([
      0x02, 0xf0, 0x80, 0x2e, 0x00,
      (userId >> 8) & 0xff, userId & 0xff
    ]);
    const out = Buffer.alloc(4 + body.length);
    out[0] = 0x03;
    out[1] = 0x00;
    out.writeUInt16BE(out.length, 2);
    body.copy(out, 4);
    return out;
  }

  function buildJoinConfirm(channelId) {
    const out = Buffer.alloc(15);
    out[0] = 0x03;
    out[1] = 0x00;
    out.writeUInt16BE(15, 2);
    out[4] = 0x02;
    out[5] = 0xf0;
    out[6] = 0x80;
    out[7] = 0x3e;
    out[8] = 0x00; // result success in high nibble path — (buf[8]>>3)&0xf == 0
    out.writeUInt16BE(channelId, 11);
    return out;
  }

  it('inyecta joins tras Attach User Confirm si WASM no los pidio', () => {
    const state = createChannelFilterState();
    loadScNet(state);
    assert.equal(state.ioChannelId, 1003);

    const auc = buildAttachUserConfirm(8);
    assert.equal(readAttachUserConfirmInitiator(auc), 8);
    const result = processServerFrame(state, auc);
    assert.ok(result.replies && result.replies.length >= 2);
    assert.match(String(result.note || ''), /bridge-mandatory-joins/);
    assert.equal(state.bridgeMandatoryJoinsSent, true);
    const joined = result.replies.map((j) => j.readUInt16BE(10)).sort((a, b) => a - b);
    // Canal user logico = 1001+8=1009 (no el offset de cable 8).
    assert.ok(joined.includes(1009));
    assert.ok(joined.includes(1003));
    assert.ok(!joined.includes(8));
    // Initiator en cable sigue siendo el offset PER.
    assert.equal(result.replies[0].readUInt16BE(8), 8);
  });

  it('retiene Client Info y lo libera tras JoinConfirm de IO', () => {
    const state = createChannelFilterState();
    loadScNet(state);
    processServerFrame(state, buildAttachUserConfirm(8));

    const infoUd = Buffer.alloc(20);
    infoUd.writeUInt16LE(0x0040, 0); // SEC_INFO_PKT
    const infoFrame = buildMcsSendDataRequest(8, 1003, infoUd);
    infoFrame[7] = 0x64;

    const hold = holdOrReleaseClientInfo(state, infoFrame);
    assert.equal(hold.hold, true);
    assert.ok(state.pendingClientInfo);

    const jc = buildJoinConfirm(1003);
    const released = processServerFrame(state, jc);
    assert.equal(released.dropped, true);
    assert.equal(released.replies.length, 1);
    assert.match(String(released.note || ''), /release-client-info/);
    assert.equal(state.pendingClientInfo, null);
  });

  it('no inyecta joins si el WASM ya pidio user+IO', () => {
    const state = createChannelFilterState();
    state.ioChannelId = 1003;
    state.allowed = new Set([1003]);
    state.ready = true;
    const { noteClientChannelJoinRequest: noteJoin } = require('../../src/main/services/rdp-channel-filter');
    noteJoin(state, buildMcsChannelJoinRequest(8, 1003));
    noteJoin(state, buildMcsChannelJoinRequest(8, 1009));
    const result = processServerFrame(state, buildAttachUserConfirm(8));
    assert.ok(!result.note || !/bridge-mandatory-joins/.test(result.note));
    assert.equal(state.bridgeMandatoryJoinsSent, false);
  });

  it('inyecta solo el canal user (1009) si el WASM ya pidio IO', () => {
    const state = createChannelFilterState();
    state.ioChannelId = 1003;
    state.allowed = new Set([1003]);
    state.ready = true;
    require('../../src/main/services/rdp-channel-filter')
      .noteClientChannelJoinRequest(state, buildMcsChannelJoinRequest(8, 1003));
    const result = processServerFrame(state, buildAttachUserConfirm(8));
    assert.match(String(result.note || ''), /bridge-mandatory-joins/);
    assert.equal(result.replies.length, 1);
    assert.equal(result.replies[0].readUInt16BE(10), 1009);
    assert.equal(result.replies[0].readUInt16BE(8), 8);
  });

  it('lee userId aunque byte 8 tenga nibble bajo distinto de 0', () => {
    const auc = buildAttachUserConfirm(8);
    auc[8] = 0x01; // result=0 en nibble alto, flag en bajo
    assert.equal(readAttachUserConfirmInitiator(auc), 8);
  });

  it('no inyecta joins ni retiene Info si skipChannelJoin', () => {
    const state = createChannelFilterState();
    state.ioChannelId = 1003;
    state.allowed = new Set([1003]);
    state.ready = true;
    state.skipChannelJoin = true;
    const result = processServerFrame(state, buildAttachUserConfirm(8));
    assert.ok(!result.note || !/bridge-mandatory-joins/.test(result.note));
    assert.equal(state.bridgeMandatoryJoinsSent, false);

    const infoUd = Buffer.alloc(20);
    infoUd.writeUInt16LE(0x0040, 0);
    const { buildMcsSendDataRequest } = require('../../src/main/services/rdp-autodetect');
    const infoFrame = buildMcsSendDataRequest(8, 1003, infoUd);
    infoFrame[7] = 0x64;
    const hold = holdOrReleaseClientInfo(state, infoFrame);
    assert.equal(hold.hold, false);
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

  function buildTransportReqUserData(requestId, protocol = 0x01) {
    // Windows: TS_SECURITY_HEADER 4B (flags+flagsHi) + body 24B
    const userData = Buffer.alloc(28);
    userData.writeUInt16LE(0x0002, 0); // SEC_TRANSPORT_REQ
    userData.writeUInt16LE(0, 2); // flagsHi
    userData.writeUInt32LE(requestId >>> 0, 4);
    userData.writeUInt16LE(protocol, 8);
    userData.writeUInt16LE(0, 10);
    for (let i = 0; i < 16; i++) userData[12 + i] = (i + 1) & 0xff;
    return userData;
  }

  it('SEC_TRANSPORT_REQ en message channel → SEC_TRANSPORT_RSP E_ABORT (TCP-only)', () => {
    const {
      parseSecTransportRequest,
      buildSecTransportFailResponse
    } = require('../../src/main/services/rdp-channel-filter');
    const state = createChannelFilterState();
    loadScNet(state);
    state.clientInitiator = 1002;
    state.licenseExchangeOpen = false;

    const requestId = 0xabcd1234;
    const userData = buildTransportReqUserData(requestId);
    assert.equal(parseSecTransportRequest(userData).requestId, requestId);
    // Capture real 192.168.10.52: flagsHi presente sin SEC_FLAGSHI_VALID
    const winUd = Buffer.from(
      '020000000700000001000000c0c471322114bbc8cd401ffc11223344',
      'hex'
    );
    assert.equal(parseSecTransportRequest(winUd).requestId, 7);
    // ShareControl con length que tiene bit 0x0002 no es Multitransport
    assert.equal(parseSecTransportRequest(Buffer.from('16001700e903020001000002', 'hex')), null);

    const indication = buildMcsSendDataRequest(0, 1001, userData);
    indication[7] = 0x68;

    const result = processServerFrame(state, indication);
    assert.equal(result.dropped, true);
    assert.equal(result.forward, null);
    assert.equal(result.replies.length, 1);
    assert.match(String(result.note || ''), /multitransport-rsp-fail/);

    const mcs = parseMcsSendData(result.replies[0]);
    assert.equal(mcs.channelId, 1001);
    assert.equal(mcs.initiator, 1002);
    const expected = buildSecTransportFailResponse(requestId);
    assert.deepEqual(Buffer.from(mcs.userData), expected);
    assert.equal(mcs.userData.readUInt16LE(0), 0x0004); // SEC_TRANSPORT_RSP
    assert.equal(mcs.userData.readUInt16LE(2), 0); // flagsHi
    assert.equal(mcs.userData.readUInt32LE(4), requestId);
    assert.equal(mcs.userData.readUInt32LE(8), 0x80004004); // E_ABORT
  });

  it('SEC_TRANSPORT_REQ en IO también ACK fail sin forward a WASM', () => {
    const state = createChannelFilterState();
    loadScNet(state);
    state.clientInitiator = 1002;
    state.licenseExchangeOpen = false;

    const requestId = 42;
    const userData = buildTransportReqUserData(requestId);

    const indication = buildMcsSendDataRequest(0, 1003, userData);
    indication[7] = 0x68;

    const result = processServerFrame(state, indication);
    assert.equal(result.dropped, true);
    assert.equal(result.forward, null);
    assert.equal(result.replies.length, 1);
    assert.match(String(result.note || ''), /multitransport-rsp-fail/);
    const mcs = parseMcsSendData(result.replies[0]);
    assert.equal(mcs.channelId, 1003);
    assert.equal(mcs.userData.readUInt32LE(8), 0x80004004);
  });

  it('dropea from-18-22b (8B IO) que tumba ShareControl IronRDP', () => {
    const state = createChannelFilterState();
    loadScNet(state);
    state.licenseExchangeOpen = false;
    const io = Buffer.from(
      fs.readFileSync(path.join(__dirname, 'frames/from-18-22b.hex'), 'utf8').trim(),
      'hex'
    );
    const result = processServerFrame(state, io);
    assert.equal(result.dropped, true);
    assert.equal(result.replies.length, 0);
    assert.match(result.note, /(short-io 8B|server-heartbeat|heartbeat|pre-license)/);
  });

  it('no intercepta trafico IO normal (>=10B ShareControl)', () => {
    const state = createChannelFilterState();
    loadScNet(state);
    // Tras licencia: ShareControl Data no debe dropearse.
    state.licenseExchangeOpen = false;
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
