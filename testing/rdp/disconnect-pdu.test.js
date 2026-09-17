const { describe, test } = require('node:test');
const assert = require('node:assert');

const { describeDisconnectPdu, describeRdpPdu } = require('../../src/main/services/rdp-protocol-helpers');

const PDUTYPE_DATAPDU = 7;
const PDUTYPE2_SET_ERROR_INFO = 47;
const PDUTYPE2_POINTER = 27;

function wrapMcsIndication(userData) {
  const lenField = userData.length < 0x80
    ? Buffer.from([userData.length])
    : Buffer.from([0x80 | ((userData.length >> 8) & 0x7f), userData.length & 0xff]);
  const mcs = Buffer.concat([
    Buffer.from([0x02, 0xf0, 0x80, 0x68, 0x00, 0x00, 0x03, 0xeb, 0x70]),
    lenField
  ]);
  const total = 4 + mcs.length + userData.length;
  return Buffer.concat([
    Buffer.from([0x03, 0x00, (total >> 8) & 0xff, total & 0xff]),
    mcs,
    userData
  ]);
}

// TS_SHARECONTROLHEADER + TS_SHAREDATAHEADER (18B) + cuerpo, con base opcional de seguridad
function buildShareDataPdu(pduType2, body, { securityHeader = false } = {}) {
  const share = Buffer.alloc(18 + body.length);
  share.writeUInt16LE(share.length, 0);          // totalLength
  share.writeUInt16LE(PDUTYPE_DATAPDU | 0x10, 2); // pduType + version
  share.writeUInt16LE(1002, 4);                  // pduSource
  share.writeUInt32LE(0x0003ea03, 6);            // shareId
  share[14] = pduType2;
  share.writeUInt16LE(share.length, 12);         // uncompressedLength
  body.copy(share, 18);
  return securityHeader ? Buffer.concat([Buffer.alloc(4), share]) : share;
}

describe('deteccion del PDU de cierre del servidor', () => {
  test('decodifica TS_SET_ERROR_INFO sin cabecera de seguridad', () => {
    const body = Buffer.alloc(4);
    body.writeUInt32LE(0x00000003, 0); // ERRINFO_IDLE_TIMEOUT
    const frame = wrapMcsIndication(buildShareDataPdu(PDUTYPE2_SET_ERROR_INFO, body));

    const desc = describeDisconnectPdu(frame);
    assert.match(desc, /TS_SET_ERROR_INFO/);
    assert.match(desc, /0x00000003/);
    assert.match(desc, /ERRINFO_IDLE_TIMEOUT/);
  });

  test('decodifica TS_SET_ERROR_INFO con cabecera de seguridad de 4 bytes', () => {
    const body = Buffer.alloc(4);
    body.writeUInt32LE(0x00001003, 0); // ERRINFO_DATAPDUSEQUENCE
    const frame = wrapMcsIndication(buildShareDataPdu(PDUTYPE2_SET_ERROR_INFO, body, { securityHeader: true }));

    assert.match(describeDisconnectPdu(frame), /ERRINFO_DATAPDUSEQUENCE/);
  });

  test('un codigo desconocido se reporta en hexadecimal sin inventar nombre', () => {
    const body = Buffer.alloc(4);
    body.writeUInt32LE(0x0000abcd, 0);
    const frame = wrapMcsIndication(buildShareDataPdu(PDUTYPE2_SET_ERROR_INFO, body));

    const desc = describeDisconnectPdu(frame);
    assert.match(desc, /0x0000abcd/);
    assert.match(desc, /MS-RDPBCGR/);
  });

  // Regresion: con pduType2 == 20 (PDUTYPE2_CONTROL real) y sin validar totalLength, estos
  // frames normales se reportaban como cierres inminentes con codigos inventados.
  test('no da falso positivo en un DATA_PDU normal de puntero', () => {
    const frame = wrapMcsIndication(buildShareDataPdu(PDUTYPE2_POINTER, Buffer.alloc(22, 0x04)));
    assert.equal(describeDisconnectPdu(frame), null);
  });

  test('no da falso positivo en un frame con un 20 suelto en el offset antiguo', () => {
    const body = Buffer.alloc(16, 0x00);
    body[0] = 20; // caia justo donde el detector roto leia pduType2
    const frame = wrapMcsIndication(buildShareDataPdu(PDUTYPE2_POINTER, body));
    assert.equal(describeDisconnectPdu(frame), null);
  });

  test('no da falso positivo en FastPath ni en frames cortos', () => {
    assert.equal(describeDisconnectPdu(Buffer.from([0x00, 0x05, 0x01, 0x02, 0x03])), null);
    assert.equal(describeDisconnectPdu(Buffer.alloc(4)), null);
    assert.equal(describeDisconnectPdu(null), null);
  });

  test('detecta MCS Disconnect Provider Ultimatum con su reason', () => {
    const frame = Buffer.from([0x03, 0x00, 0x00, 0x0a, 0x02, 0xf0, 0x80, 0x21, 0x80, 0x00]);
    assert.match(describeDisconnectPdu(frame), /Disconnect Provider Ultimatum/);
  });
});

describe('ChannelJoinConfirm', () => {
  function buildJoinConfirm(hdrByte, requested, granted) {
    return Buffer.concat([
      Buffer.from([0x03, 0x00, 0x00, 0x0f, 0x02, 0xf0, 0x80, 0x3e, hdrByte, 0x00, 0x00]),
      Buffer.from([(requested >> 8) & 0xff, requested & 0xff]),
      Buffer.from([(granted >> 8) & 0xff, granted & 0xff])
    ]);
  }

  test('reporta el canal pedido y rt-successful', () => {
    const desc = describeRdpPdu(buildJoinConfirm(0x00, 1004, 1004));
    assert.match(desc, /ch=1004/);
    assert.match(desc, /rt-successful/);
    assert.doesNotMatch(desc, /concedido=/);
  });

  // El servidor puede conceder un canal distinto del pedido: el offset 11 es el PEDIDO
  test('avisa cuando el canal concedido no es el pedido', () => {
    const desc = describeRdpPdu(buildJoinConfirm(0x00, 1004, 1001));
    assert.match(desc, /ch=1004/);
    assert.match(desc, /concedido=1001/);
  });

  test('nombra un join fallido en vez de darlo por bueno', () => {
    // result = 3 (rt-no-such-channel) en los bits 6..3
    const desc = describeRdpPdu(buildJoinConfirm(3 << 3, 1004, 1004));
    assert.match(desc, /rt-no-such-channel/);
  });
});
