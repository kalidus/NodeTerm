'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  createChannelFilterState,
  processServerFrame,
  describeCliprdrPdu,
  isCliprdrHeader,
  cliprdrMustDropShowProtocol,
  rememberClientCliprdrHandshake,
  shouldRecordMutedClientCliprdr,
  takeCliprdrRehandshake
} = require('../../src/main/services/rdp-channel-filter');
const {
  CHANNEL_PDU_HEADER_LEN,
  parseMcsSendData,
  clearChannelPduShowProtocol
} = require('../../src/main/services/rdp-autodetect');

const CHANNEL_FLAG_FIRST = 0x01;
const CHANNEL_FLAG_LAST = 0x02;
const CHANNEL_FLAG_SHOW_PROTOCOL = 0x10;

// MCS SendDataIndication (0x68) envuelto en TPKT.
// La longitud usa el determinante PER: 1 byte si <128, si no 2 bytes con 0x8000.
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

// CHANNEL_PDU_HEADER (MS-RDPBCGR 2.2.6.1.1): length:u32 + flags:u32. Mide SIEMPRE 8 bytes,
// CHANNEL_FLAG_SHOW_PROTOCOL no añade campos.
function buildChannelPdu(payload, flags = CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST, declaredLength = null) {
  const hdr = Buffer.alloc(CHANNEL_PDU_HEADER_LEN);
  hdr.writeUInt32LE(declaredLength == null ? payload.length : declaredLength, 0);
  hdr.writeUInt32LE(flags, 4);
  return Buffer.concat([hdr, payload]);
}

// CLIPRDR_HEADER (MS-RDPECLIP 2.2.1): msgType:u16 + msgFlags:u16 + dataLen:u32
function buildCliprdrPayload(msgType, msgFlags = 0, data = Buffer.alloc(0)) {
  const hdr = Buffer.alloc(8);
  hdr.writeUInt16LE(msgType, 0);
  hdr.writeUInt16LE(msgFlags, 2);
  hdr.writeUInt32LE(data.length, 4);
  return Buffer.concat([hdr, data]);
}

function buildGeneralCaps(generalFlags) {
  const body = Buffer.alloc(16);
  body.writeUInt16LE(1, 0);
  body.writeUInt16LE(1, 4);
  body.writeUInt16LE(12, 6);
  body.writeUInt32LE(2, 8);
  body.writeUInt32LE(generalFlags, 12);
  return body;
}

function stateWithCliprdr() {
  const state = createChannelFilterState();
  state.ready = true;
  state.ioChannelId = 1003;
  state.cliprdrChannelId = 1004;
  return state;
}

describe('CLIPRDR: parseo de cabeceras', () => {
  test('CHANNEL_PDU_HEADER mide 8 bytes tambien con CHANNEL_FLAG_SHOW_PROTOCOL', () => {
    // CB_FORMAT_LIST_RESPONSE(OK): el PDU real que IronRDP emite con flags=0x13 y que
    // antes se interpretaba con una cabecera ficticia de 12 bytes
    const payload = buildCliprdrPayload(3, 0x0001);
    const userData = buildChannelPdu(
      payload,
      CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST | CHANNEL_FLAG_SHOW_PROTOCOL
    );

    assert.equal(userData.length, 16);
    assert.equal(isCliprdrHeader(userData), true);

    const desc = describeCliprdrPdu(userData);
    assert.match(desc, /ChanHdr len=8 flags=0x13/);
    assert.match(desc, /CB_FORMAT_LIST_RESPONSE/);
    assert.doesNotMatch(desc, /raw len=/);
  });

  test('describeCliprdrPdu resuelve el saludo completo del servidor', () => {
    const caps = buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16)));
    assert.match(describeCliprdrPdu(caps), /CB_CLIP_CAPS \(flags=0x0, dataLen=16, payloadLen=24B\)/);

    const monitorReady = buildChannelPdu(buildCliprdrPayload(1));
    assert.match(describeCliprdrPdu(monitorReady), /CB_MONITOR_READY/);

    const formatList = buildChannelPdu(buildCliprdrPayload(2, 0, Buffer.alloc(64)));
    assert.match(describeCliprdrPdu(formatList), /CB_FORMAT_LIST \(flags=0x0, dataLen=64, payloadLen=72B\)/);
  });

  test('isCliprdrHeader admite padding de alineacion a 4 bytes en CB_FORMAT_LIST', () => {
    // dataLen declara 18 pero Windows alinea el payload a 20 bytes
    const hdr = Buffer.alloc(8);
    hdr.writeUInt16LE(2, 0);
    hdr.writeUInt16LE(0, 2);
    hdr.writeUInt32LE(18, 4);
    const userData = buildChannelPdu(Buffer.concat([hdr, Buffer.alloc(20)]));

    assert.equal(isCliprdrHeader(userData), true);
  });

  test('isCliprdrHeader rechaza msgType fuera del rango MS-RDPECLIP', () => {
    const userData = buildChannelPdu(buildCliprdrPayload(0x00ff, 0, Buffer.alloc(4)));
    assert.equal(isCliprdrHeader(userData), false);
  });
});

describe('CLIPRDR: filtrado de frames del servidor', () => {
  test('el saludo completo del servidor llega a WASM sin modificar el buffer', () => {
    const state = stateWithCliprdr();

    const caps = buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16))));
    const resCaps = processServerFrame(state, caps);
    assert.equal(resCaps.dropped, false);
    assert.equal(resCaps.isCliprdr, true);
    assert.equal(resCaps.channelId, 1004);
    assert.deepEqual(resCaps.forward, caps);
    assert.equal(state.cliprdrServerReady, true);

    const monitorReady = buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(1)));
    const resMon = processServerFrame(state, monitorReady);
    assert.equal(resMon.dropped, false);
    assert.deepEqual(resMon.forward, monitorReady);

    const formatList = buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(2, 0, Buffer.alloc(64))));
    const resList = processServerFrame(state, formatList);
    assert.equal(resList.dropped, false);
    assert.equal(resList.isCliprdr, true);
    assert.deepEqual(resList.forward, formatList);
  });

  test('los fragmentos de un CB_FORMAT_DATA_RESPONSE grande nunca se descartan', () => {
    const state = stateWithCliprdr();
    const total = 4096;

    // Primer fragmento: lleva CLIPRDR_HEADER y declara el total del mensaje
    const first = buildMcsIndication(
      1004,
      buildChannelPdu(buildCliprdrPayload(5, 0x0001, Buffer.alloc(1400)), CHANNEL_FLAG_FIRST, total)
    );
    // Fragmentos intermedio y final: datos crudos, sin CLIPRDR_HEADER
    const middle = buildMcsIndication(1004, buildChannelPdu(Buffer.alloc(1400), 0, total));
    const last = buildMcsIndication(1004, buildChannelPdu(Buffer.alloc(1288), CHANNEL_FLAG_LAST, total));

    for (const frame of [first, middle, last]) {
      const res = processServerFrame(state, frame);
      assert.equal(res.dropped, false);
      assert.equal(res.channelId, 1004);
      assert.deepEqual(res.forward, frame);
    }
  });

  test('el trafico del canal de usuario 1001 sigue sin reenviarse a WASM', () => {
    const state = stateWithCliprdr();
    const frame = buildMcsIndication(1001, Buffer.from([0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa]));

    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, true);
    assert.equal(res.forward, null);
    assert.equal(res.channelId, 1001);
    assert.equal(state.serverCliprdrChannelId, null);
  });

  test('el primer PDU no-cliprdr de un canal se anota una sola vez', () => {
    const state = stateWithCliprdr();
    state.channelIdToName = new Map([[1005, 'rdpsnd']]);
    const seen = [];
    state.recordCliprdr = (msg) => seen.push(msg);

    processServerFrame(state, buildMcsIndication(1005, Buffer.alloc(4)));
    assert.equal(seen.length, 0);

    const frame = buildMcsIndication(1005, Buffer.alloc(16, 0xab));
    processServerFrame(state, frame);
    processServerFrame(state, frame);

    assert.equal(seen.length, 1);
    assert.match(seen[0], /ch=1005 \(rdpsnd\) len=16B hex=abababababababababababababababab/);

    processServerFrame(state, buildMcsIndication(1006, Buffer.alloc(8, 0x11)));
    assert.equal(seen.length, 2);
    assert.match(seen[1], /ch=1006 \(sin-nombre\) len=8B/);
  });

  test('en 1001 solo se anota el primer CAPS y el primer FORMAT_LIST', () => {
    const state = stateWithCliprdr();
    state.serverCliprdrChannelId = 1001;
    state.cliprdrWriteChannelId = null;
    const caps = 'CB_CLIP_CAPS (flags=0x0, dataLen=16)';
    const list = 'CB_FORMAT_LIST (flags=0x0, dataLen=6)';
    const response = 'CB_FORMAT_LIST_RESPONSE (flags=0x1, dataLen=0)';

    assert.equal(shouldRecordMutedClientCliprdr(state, caps), true);
    assert.equal(shouldRecordMutedClientCliprdr(state, caps), false);
    assert.equal(shouldRecordMutedClientCliprdr(state, list), true);
    assert.equal(shouldRecordMutedClientCliprdr(state, list), false);
    assert.equal(shouldRecordMutedClientCliprdr(state, response), true);

    state.serverCliprdrChannelId = 1004;
    assert.equal(shouldRecordMutedClientCliprdr(state, caps), true);
    assert.equal(shouldRecordMutedClientCliprdr(state, caps), true);
  });
});

describe('CLIPRDR: bastion Wallix que usa otro canal MCS', () => {
  // Destinos :APP: (Fortigate_JC): Wallix declara cliprdr=1004 pero manda el saludo por 1001.
  // Se remapea hacia el VC negociado para que IronRDP vea MONITOR_READY; no se escribe en 1001.
  test('remapea el saludo cliprdr que llega por el canal de usuario 1001', () => {
    const state = stateWithCliprdr();

    const caps = buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(7, 0, buildGeneralCaps(0x3e))));
    const resCaps = processServerFrame(state, caps);
    assert.equal(resCaps.dropped, false);
    assert.equal(resCaps.isCliprdr, true);
    assert.equal(resCaps.channelId, 1004);
    assert.equal(resCaps.serverChannelId, 1001);
    assert.equal(resCaps.forward.readUInt16BE(10), 1004);
    assert.equal(state.serverCliprdrChannelId, 1001);
    assert.equal(state.cliprdrOnUnsafeChannel, 1001);
    assert.equal(state.cliprdrServerReady, true);

    const monitorReady = buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(1)));
    const resReady = processServerFrame(state, monitorReady);
    assert.equal(resReady.dropped, false);
    assert.equal(resReady.isCliprdr, true);
    assert.equal(resReady.forward.readUInt16BE(10), 1004);

    const formatList = buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(2, 0, Buffer.alloc(64))));
    const resList = processServerFrame(state, formatList);
    assert.equal(resList.dropped, false);
    assert.equal(resList.forward.readUInt16BE(10), 1004);
    assert.equal(state.serverCliprdrChannelId, 1001);
  });

  test('CAPS en 1001 no confirma write path; MONITOR_READY en 1004 si', () => {
    const state = stateWithCliprdr();
    state.allowed = new Set([1003, 1004, 1005]);
    state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']]);

    const caps = buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16))));
    const resCaps = processServerFrame(state, caps);
    assert.equal(resCaps.isCliprdr, true);
    assert.equal(resCaps.serverChannelId, 1001);
    assert.equal(state.serverCliprdrChannelId, 1001);
    assert.equal(state.cliprdrOnUnsafeChannel, 1001);
    assert.equal(state.cliprdrWriteChannelId, null, '1001 no; 1005 tras saludo 1001 cierra TLS');

    const monitorReady = buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(1)));
    const resReady = processServerFrame(state, monitorReady);
    assert.equal(resReady.isCliprdr, true);
    assert.equal(resReady.serverChannelId, 1004);
    assert.equal(state.cliprdrWriteChannelId, 1004);
  });

  test('RDP saludo por 1001 no confirma write path en 1004 ni en 1005', () => {
    const state = stateWithCliprdr();
    state.allowed = new Set([1003, 1004, 1005]);
    state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']]);

    const caps = buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16))));
    processServerFrame(state, caps);
    const ready = buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(1)));
    processServerFrame(state, ready);

    assert.equal(state.serverCliprdrChannelId, 1001);
    assert.equal(state.cliprdrWriteChannelId, null);
  });

  test('ESJC saludo por 1004 deja el write path en 1004', () => {
    const state = stateWithCliprdr();
    state.allowed = new Set([1003, 1004, 1005]);
    state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']]);

    const caps = buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16))));
    processServerFrame(state, caps);
    const ready = buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(1)));
    processServerFrame(state, ready);

    assert.equal(state.serverCliprdrChannelId, 1004);
    assert.equal(state.cliprdrWriteChannelId, 1004);
  });

  test('ESAH saludo por 1001 en RDP no confirma write path en 1006 (evita TLS FIN de Wallix)', () => {
    const state = stateWithCliprdr();
    state.wallixService = 'RDP';
    state.allowed = new Set([1003, 1004, 1005, 1006]);
    state.channelIdToName = new Map([
      [1004, 'rdpdr'],
      [1005, 'rdpsnd'],
      [1006, 'cliprdr']
    ]);

    const caps = buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16))));
    const resCaps = processServerFrame(state, caps);
    assert.equal(resCaps.isCliprdr, true);
    assert.equal(resCaps.serverChannelId, 1001);
    assert.equal(state.serverCliprdrChannelId, 1001);
    assert.equal(state.cliprdrWriteChannelId, null, 'en RDP el saludo por 1001 no debe escribir en 1006');
  });

  test('APP saludo por 1001 usa el VC nombrado cliprdr 1007, no el indice 0', () => {
    const state = stateWithCliprdr();
    state.wallixService = 'APP';
    state.allowed = new Set([1003, 1004, 1005, 1006, 1007]);
    state.channelIdToName = new Map([
      [1004, 'rail'],
      [1005, 'rdpdr'],
      [1006, 'rdpsnd'],
      [1007, 'cliprdr']
    ]);

    const caps = buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16))));
    const resCaps = processServerFrame(state, caps);
    assert.equal(resCaps.isCliprdr, true);
    assert.equal(resCaps.serverChannelId, 1001);
    assert.equal(state.serverCliprdrChannelId, 1001);
    assert.equal(state.cliprdrWriteChannelId, 1007, 'no se escribe en 1004 (rail) ni en 1001');
  });

  test('saludo cliprdr por rdpsnd 1005 confirma el write path en 1005', () => {
    const state = stateWithCliprdr();
    state.allowed = new Set([1003, 1004, 1005]);
    state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']]);

    const caps = buildMcsIndication(1005, buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16))));
    const resCaps = processServerFrame(state, caps);
    assert.equal(resCaps.isCliprdr, true);
    assert.equal(resCaps.serverChannelId, 1005);
    assert.equal(state.cliprdrWriteChannelId, 1005);
    assert.equal(state.serverCliprdrChannelId, 1005);
  });

  test('tambien remapea los fragmentos cliprdr del canal de usuario 1001', () => {
    const state = stateWithCliprdr();
    const total = 48722;

    const first = buildMcsIndication(
      1001,
      buildChannelPdu(buildCliprdrPayload(5, 0x0001, Buffer.alloc(1592)), CHANNEL_FLAG_FIRST, total)
    );
    const resFirst = processServerFrame(state, first);
    assert.equal(resFirst.dropped, false);
    assert.equal(resFirst.isCliprdr, true);
    assert.equal(resFirst.forward.readUInt16BE(10), 1004);
    assert.equal(state.cliprdrOnUnsafeChannel, 1001);
    assert.equal(state.serverCliprdrChannelId, 1001);
    assert.equal(state.unsafeCliprdrFragmentOpen, true);

    const middle = buildMcsIndication(1001, buildChannelPdu(Buffer.alloc(1600, 0xab), 0, total));
    const resMid = processServerFrame(state, middle);
    assert.equal(resMid.dropped, false);
    assert.equal(resMid.forward.readUInt16BE(10), 1004);

    const last = buildMcsIndication(1001, buildChannelPdu(Buffer.alloc(722, 0xcd), CHANNEL_FLAG_LAST, total));
    const resLast = processServerFrame(state, last);
    assert.equal(resLast.dropped, false);
    assert.equal(resLast.forward.readUInt16BE(10), 1004);
    assert.equal(state.unsafeCliprdrFragmentOpen, false);
  });

  // 1001 es el canal de usuario MCS del cliente: una vez cerrado el mensaje CLIPRDR, el resto
  // del trafico que pase por el no se puede colar en el canal cliprdr de IronRDP.
  test('cerrado el mensaje, el trafico no-CLIPRDR del canal de usuario se sigue descartando', () => {
    const state = stateWithCliprdr();

    const monitorReady = buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(1)));
    const resReady = processServerFrame(state, monitorReady);
    assert.equal(resReady.dropped, false);
    assert.equal(resReady.isCliprdr, true);
    assert.equal(state.cliprdrOnUnsafeChannel, 1001);
    assert.equal(state.serverCliprdrChannelId, 1001);

    const noise = buildMcsIndication(1001, Buffer.from([0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa]));
    const resNoise = processServerFrame(state, noise);
    assert.equal(resNoise.dropped, true);
    assert.equal(resNoise.forward, null);
  });

  // Wallix ignora los nombres de CS_NET y proyecta su propio orden sobre los IDs, asi que el
  // canal que el cliente reservo para cliprdr puede traer rdpdr y viceversa.
  test('descarta un Server Announce de rdpdr que llega por el canal cliprdr negociado', () => {
    const state = stateWithCliprdr();

    // RDPDR_HEADER: component=0x4472 (RDPDR_CTYP_CORE), packetId=0x496e (PAKID_CORE_SERVER_ANNOUNCE)
    const rdpdr = Buffer.from([0x72, 0x44, 0x6e, 0x49, 0x01, 0x00, 0x0d, 0x00, 0x7e, 0x00, 0x00, 0x00]);
    const frame = buildMcsIndication(1004, buildChannelPdu(rdpdr));

    const res = processServerFrame(state, frame);
    assert.equal(res.isCliprdr, false);
    assert.equal(res.forward, null);
    assert.equal(res.dropped, true);
    assert.ok(res.replies && res.replies.length >= 2, 'el stub debe contestar el Server Announce');
    assert.equal(state.serverCliprdrChannelId, null);
  });

  test('aprende el canal real cuando cliprdr llega por el que el cliente reservo a rdpdr', () => {
    const state = stateWithCliprdr();
    state.allowed = new Set([1003, 1004, 1005, 1006, 1007]);

    const caps = buildMcsIndication(1006, buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16))));
    const res = processServerFrame(state, caps);

    assert.equal(res.isCliprdr, true);
    assert.equal(res.channelId, 1004);
    assert.equal(res.serverChannelId, 1006);
    assert.equal(res.forward.readUInt16BE(10), 1004);
    assert.equal(state.serverCliprdrChannelId, 1006);
  });

  test('APP alineado: saludo en VC nombrado cliprdr (1006) confirma el write path', () => {
    const state = stateWithCliprdr();
    state.allowed = new Set([1003, 1004, 1005, 1006]);
    state.channelIdToName = new Map([
      [1004, 'rdpdr'],
      [1005, 'rdpsnd'],
      [1006, 'cliprdr']
    ]);

    const caps = buildMcsIndication(1006, buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16))));
    const resCaps = processServerFrame(state, caps);
    assert.equal(resCaps.isCliprdr, true);
    assert.equal(resCaps.serverChannelId, 1006);
    assert.equal(resCaps.forward.readUInt16BE(10), 1004);
    assert.equal(state.serverCliprdrChannelId, 1006);
    assert.equal(state.cliprdrWriteChannelId, 1006, 'el VC nombrado cliprdr es seguro para escribir');

    const ready = buildMcsIndication(1006, buildChannelPdu(buildCliprdrPayload(1)));
    const resReady = processServerFrame(state, ready);
    assert.equal(resReady.isCliprdr, true);
    assert.equal(state.cliprdrWriteChannelId, 1006);
  });

  test('en conexion directa el canal aprendido es el negociado y no se reescribe', () => {
    const state = stateWithCliprdr();
    const frame = buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(1)));

    const res = processServerFrame(state, frame);
    assert.equal(res.isCliprdr, true);
    assert.equal(res.serverChannelId, 1004);
    assert.deepEqual(res.forward, frame);
    assert.equal(state.serverCliprdrChannelId, 1004);
  });

  // Capturado en real: el bastion entrega el saludo cliprdr por el canal IO (1003), donde caia
  // descartado como 'invalid-share-control-0x0' con tamanos 46B / 30B / 94B.
  test('rescata el saludo cliprdr que el bastion entrega por el canal IO', () => {
    const state = stateWithCliprdr();

    const caps = buildMcsIndication(1003, buildChannelPdu(buildCliprdrPayload(7, 0, buildGeneralCaps(0x3e))));
    const resCaps = processServerFrame(state, caps);
    assert.equal(resCaps.dropped, false);
    assert.equal(resCaps.isCliprdr, true);
    assert.equal(resCaps.channelId, 1004);
    assert.equal(resCaps.serverChannelId, 1003);
    assert.equal(resCaps.forward.readUInt16BE(10), 1004);
    assert.equal(state.cliprdrServerReady, true);

    const monitorReady = buildMcsIndication(1003, buildChannelPdu(buildCliprdrPayload(1)));
    assert.equal(processServerFrame(state, monitorReady).forward.readUInt16BE(10), 1004);

    const formatList = buildMcsIndication(1003, buildChannelPdu(buildCliprdrPayload(2, 0, Buffer.alloc(64))));
    assert.equal(processServerFrame(state, formatList).forward.readUInt16BE(10), 1004);
  });

  // Garantia de no regresion: el rescate corre DESPUES del filtro de IO, asi que una PDU legitima
  // del canal IO no puede acabar desviada al canal cliprdr de IronRDP.
  test('no desvia trafico legitimo del canal IO al canal cliprdr', () => {
    const state = stateWithCliprdr();

    // DATA_PDU valido: pduType = 7 en el offset 2 del userData
    const share = Buffer.alloc(40);
    share.writeUInt16LE(share.length, 0);
    share.writeUInt16LE(7 | 0x10, 2);
    share.writeUInt16LE(1002, 4);
    const frame = buildMcsIndication(1003, share);

    const res = processServerFrame(state, frame);
    assert.notEqual(res.isCliprdr, true);
    assert.equal(state.serverCliprdrChannelId, null);
    assert.deepEqual(res.forward, frame);
  });

  test('el heartbeat del servidor se sigue descartando y no se confunde con cliprdr', () => {
    const state = stateWithCliprdr();
    const heartbeat = Buffer.from([0x00, 0x80, 0x41, 0x00, 0x00, 0x00, 0xe9, 0x03]);
    const frame = buildMcsIndication(1003, heartbeat);

    const res = processServerFrame(state, frame);
    assert.equal(res.dropped, true);
    assert.notEqual(res.isCliprdr, true);
    assert.equal(state.serverCliprdrChannelId, null);
  });

  test('clearChannelPduShowProtocol deja el encuadre del cliente en flags=0x3', () => {
    const userData = buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16)), 0x13);
    const frame = buildMcsIndication(1004, userData);
    const dataOff = parseMcsSendData(frame).dataOff;

    const cleaned = clearChannelPduShowProtocol(frame, dataOff);
    assert.notEqual(cleaned, null);
    assert.equal(parseMcsSendData(cleaned).userData.readUInt32LE(4), 0x3);
    // El resto del frame no se toca: misma longitud y mismo payload CLIPRDR
    assert.equal(cleaned.length, frame.length);
    assert.deepEqual(parseMcsSendData(cleaned).userData.subarray(8), userData.subarray(8));
  });

  test('clearChannelPduShowProtocol no toca un encuadre que ya viene sin el flag', () => {
    const frame = buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(1)));
    const dataOff = parseMcsSendData(frame).dataOff;

    assert.equal(clearChannelPduShowProtocol(frame, dataOff), null);
  });

  test('no remapea si el cliente no negocio canal cliprdr', () => {
    const state = createChannelFilterState();
    state.ready = true;
    state.ioChannelId = 1003;

    const frame = buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(1)));
    const res = processServerFrame(state, frame);

    assert.equal(res.dropped, true);
    assert.equal(state.serverCliprdrChannelId, null);
  });

});

describe('CLIPRDR: robustez del filtro', () => {

  test('el interceptor DVC no se aplica al canal IO', () => {
    const state = stateWithCliprdr();

    // PDU del canal IO cuyo userData pasa la heuristica de CHANNEL_PDU_HEADER: antes se
    // entregaba a handleDvcRequest y se descartaba como 'dvc-ignore cmd=0x0'
    const payload = Buffer.alloc(24);
    const userData = buildChannelPdu(payload);
    assert.equal(isCliprdrHeader(userData), false);

    const frame = buildMcsIndication(1003, userData);
    const res = processServerFrame(state, frame);

    assert.ok(res.note == null || !res.note.includes('dvc'));
  });

  test('un cmd DVC desconocido no se traga el PDU', () => {
    const { handleDvcRequest } = require('../../src/main/services/rdp-dynvc');
    const userData = buildChannelPdu(Buffer.alloc(24));

    const res = handleDvcRequest(1004, 1005, userData);
    assert.equal(res.handled, false);
    assert.deepEqual(res.replies, []);
  });

  test('los fragmentos de continuacion no se describen como CLIPRDR_HEADER', () => {
    // Fragmento intermedio de una transferencia de 48722B en trozos de 1600B
    const userData = buildChannelPdu(Buffer.alloc(1600, 0xab), 0, 48722);
    const desc = describeCliprdrPdu(userData);

    assert.match(desc, /ChanHdr len=48722 flags=0x0/);
    assert.match(desc, /continuación de fragmento \(1600B\)/);
    assert.doesNotMatch(desc, /msgType=/);
  });

  test('isChannelPduHeader rechaza flags con bits no documentados', () => {
    const { isChannelPduHeader } = require('../../src/main/services/rdp-autodetect');
    const hdr = Buffer.alloc(16);
    hdr.writeUInt32LE(8, 0);
    hdr.writeUInt32LE(0x81000003, 4); // bits 24..31 activos: no existen en MS-RDPBCGR 2.2.6.1.1

    assert.equal(isChannelPduHeader(hdr), false);
  });

  test('un CB_MONITOR_READY no arma el rehandshake', () => {
    const state = stateWithCliprdr();
    state.allowed = new Set([1003, 1004, 1005]);
    state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']]);

    const capsUser = buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16)), 0x13);
    const caps = buildMcsIndication(1004, capsUser);
    rememberClientCliprdrHandshake(state, describeCliprdrPdu(capsUser), caps);

    const serverCaps = buildMcsIndication(1005, buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16)), 0x13));
    processServerFrame(state, serverCaps);
    const ready = buildMcsIndication(1005, buildChannelPdu(buildCliprdrPayload(1), 0x13));
    processServerFrame(state, ready);

    assert.equal(state.cliprdrMonitorReadyCount, 1);
    assert.equal(state.cliprdrWriteChannelId, 1005);
    assert.equal(state.cliprdrRehandshakePending, false);
    assert.equal(cliprdrMustDropShowProtocol(state), false);
    assert.deepEqual(takeCliprdrRehandshake(state), []);
  });

  test('el segundo MONITOR_READY reenvia a WASM y solo reescribe CAPS+TEMPDIR', () => {
    const state = stateWithCliprdr();
    state.allowed = new Set([1003, 1004, 1005]);
    state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']]);

    const capsPayload = Buffer.alloc(16);
    capsPayload.writeUInt16LE(1, 0);
    capsPayload.writeUInt16LE(1, 4);
    capsPayload.writeUInt16LE(12, 6);
    capsPayload.writeUInt32LE(2, 8);
    capsPayload.writeUInt32LE(0x2, 12);
    const capsUser = buildChannelPdu(buildCliprdrPayload(7, 0, capsPayload), 0x13);
    const tempUser = buildChannelPdu(buildCliprdrPayload(6, 0, Buffer.alloc(520)), 0x13);
    const listUser = buildChannelPdu(buildCliprdrPayload(2, 0, Buffer.alloc(6)), 0x13);
    rememberClientCliprdrHandshake(state, describeCliprdrPdu(capsUser), buildMcsIndication(1004, capsUser));
    rememberClientCliprdrHandshake(state, describeCliprdrPdu(tempUser), buildMcsIndication(1004, tempUser));
    rememberClientCliprdrHandshake(state, describeCliprdrPdu(listUser), buildMcsIndication(1004, listUser));

    const firstReady = processServerFrame(state, buildMcsIndication(1005, buildChannelPdu(buildCliprdrPayload(1), 0x13)));
    assert.equal(firstReady.dropped, false);
    assert.equal(state.cliprdrWriteChannelId, 1005);
    assert.deepEqual(takeCliprdrRehandshake(state), []);

    const machineCaps = Buffer.alloc(16);
    machineCaps.writeUInt16LE(1, 0);
    machineCaps.writeUInt16LE(1, 4);
    machineCaps.writeUInt16LE(12, 6);
    machineCaps.writeUInt32LE(2, 8);
    machineCaps.writeUInt32LE(0x3e, 12);
    const secondCaps = processServerFrame(
      state,
      buildMcsIndication(1005, buildChannelPdu(buildCliprdrPayload(7, 0, machineCaps), 0x03))
    );
    assert.equal(secondCaps.dropped, false);
    assert.ok(secondCaps.forward);
    assert.doesNotMatch(secondCaps.note, /swallow-2nd-gen/);

    const secondReady = processServerFrame(
      state,
      buildMcsIndication(1005, buildChannelPdu(buildCliprdrPayload(1), 0x03))
    );
    assert.equal(secondReady.dropped, false);
    assert.ok(secondReady.forward);
    assert.equal(state.cliprdrServerGeneralFlags, 0x3e);

    const replay = takeCliprdrRehandshake(state);
    assert.equal(replay.length, 2);
    assert.deepEqual(replay.map((frame) => parseMcsSendData(frame).userData.readUInt16LE(8)), [7, 6]);
    for (const frame of replay) {
      const parsed = parseMcsSendData(frame);
      assert.equal(parsed.channelId, 1005);
      assert.equal(parsed.userData.readUInt32LE(4), 0x13);
    }
    assert.equal(parseMcsSendData(replay[0]).userData.readUInt32LE(28), 0x2);
    assert.deepEqual(takeCliprdrRehandshake(state), []);
  });

  test('el CAPS 0x2 del selector en rdpsnd no se entrega y el 0x3e de la maquina si', () => {
    const state = stateWithCliprdr();
    state.allowed = new Set([1003, 1004, 1005]);
    state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']]);

    const weak = Buffer.alloc(16);
    weak.writeUInt16LE(1, 0);
    weak.writeUInt16LE(1, 4);
    weak.writeUInt16LE(12, 6);
    weak.writeUInt32LE(2, 8);
    weak.writeUInt32LE(0x2, 12);
    const firstCaps = processServerFrame(
      state,
      buildMcsIndication(1005, buildChannelPdu(buildCliprdrPayload(7, 0, weak), 0x13))
    );
    assert.equal(firstCaps.dropped, true);
    assert.match(firstCaps.note, /defer-weak-caps/);
    assert.equal(state.cliprdrDeferWeakCaps, true);

    const named = stateWithCliprdr();
    named.allowed = new Set([1003, 1004]);
    named.channelIdToName = new Map([[1004, 'cliprdr']]);
    const direct = processServerFrame(
      named,
      buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(7, 0, weak), 0x13))
    );
    assert.equal(direct.dropped, false);
  });

  test('el CAPS 0x2 en 1001 o en el IO no se entrega y el 0x3e posterior si', () => {
    const weakOn = (channelId) => {
      const state = stateWithCliprdr();
      state.allowed = new Set([1003, 1004, 1005]);
      state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']]);
      const first = processServerFrame(
        state,
        buildMcsIndication(channelId, buildChannelPdu(buildCliprdrPayload(7, 0, buildGeneralCaps(0x2)), 0x03))
      );
      assert.equal(first.dropped, true, `canal ${channelId}`);
      assert.match(first.note, /defer-weak-caps/);
      assert.equal(state.cliprdrDeferWeakCaps, true);
      assert.equal(first.forward, null);

      processServerFrame(state, buildMcsIndication(channelId, buildChannelPdu(buildCliprdrPayload(1), 0x03)));
      const machine = processServerFrame(
        state,
        buildMcsIndication(channelId, buildChannelPdu(buildCliprdrPayload(7, 0, buildGeneralCaps(0x3e)), 0x03))
      );
      assert.equal(machine.dropped, false, `canal ${channelId}`);
      assert.ok(machine.forward);
      assert.equal(state.cliprdrServerGeneralFlags, 0x3e);
    };

    weakOn(1001);
    weakOn(1003);
  });

  test('rehandshake no escribe si el saludo fue por MCS 1001 sin write path', () => {
    const state = stateWithCliprdr();
    state.allowed = new Set([1003, 1004, 1005]);
    state.channelIdToName = new Map([[1004, 'cliprdr'], [1005, 'rdpsnd']]);

    const capsUser = buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16)), 0x13);
    rememberClientCliprdrHandshake(state, describeCliprdrPdu(capsUser), buildMcsIndication(1004, capsUser));

    processServerFrame(state, buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(1), 0x13)));
    assert.equal(state.cliprdrWriteChannelId, null);
    processServerFrame(state, buildMcsIndication(1001, buildChannelPdu(buildCliprdrPayload(1), 0x03)));

    assert.equal(state.cliprdrRehandshakePending, true);
    const replay = takeCliprdrRehandshake(state);
    assert.deepEqual(replay, []);
    assert.equal(state.cliprdrRehandshakeSkippedUnsafe, true);
  });

  test('un solo saludo en cliprdr 1004 no genera la repeticion', () => {
    const state = stateWithCliprdr();
    state.wallixService = 'RDP';
    state.allowed = new Set([1003, 1004]);
    state.channelIdToName = new Map([[1004, 'cliprdr']]);

    const capsUser = buildChannelPdu(buildCliprdrPayload(7, 0, Buffer.alloc(16)), 0x13);
    rememberClientCliprdrHandshake(state, describeCliprdrPdu(capsUser), buildMcsIndication(1004, capsUser));
    processServerFrame(state, buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(1), 0x13)));

    assert.equal(state.cliprdrWriteChannelId, 1004);
    assert.equal(state.cliprdrMonitorReadyCount, 1);
    assert.equal(cliprdrMustDropShowProtocol(state), false);
    assert.deepEqual(takeCliprdrRehandshake(state), []);
  });

  test('sin canal cliprdr negociado no se asume 1004', () => {
    const state = createChannelFilterState();
    state.ready = true;
    state.ioChannelId = 1003;

    const frame = buildMcsIndication(1004, buildChannelPdu(buildCliprdrPayload(1)));
    const res = processServerFrame(state, frame);

    assert.equal(res.isCliprdr, false);
    assert.equal(state.cliprdrChannelId, null);
  });
});
