/**
 * Stub de RDPDR (MS-RDPEFS). Declaramos el canal para que Wallix reparta IDs como un
 * cliente Windows, pero IronRDP no implementa redireccion de discos. Sin respuesta, el
 * servidor espera el Client Announce / Device List 20-30 s y la sesion se queda en negro
 * o se congela. Aqui se cierra el handshake en 0 ms con cero dispositivos.
 */

'use strict';

const { isChannelPduHeader, buildMcsSendDataRequest } = require('./rdp-autodetect');

const RDPDR_CTYP_CORE = 0x4472;
const PAKID_CORE_SERVER_ANNOUNCE = 0x496e;
const PAKID_CORE_CLIENTID_CONFIRM = 0x4343;
const PAKID_CORE_CLIENT_NAME = 0x434e;
const PAKID_CORE_SERVER_CAPABILITY = 0x5350;
const PAKID_CORE_CLIENT_CAPABILITY = 0x4350;
const PAKID_CORE_DEVICELIST_ANNOUNCE = 0x4441;
const PAKID_CORE_USER_LOGGEDON = 0x554c;

const CAPSET_TYPE_GENERAL = 1;
const GENERAL_CAPABILITY_VERSION_02 = 2;
const CHANNEL_FLAG_FIRST_LAST = 0x03;

function wrapChannelPdu(payload) {
  const buf = Buffer.alloc(8 + payload.length);
  buf.writeUInt32LE(payload.length, 0);
  buf.writeUInt32LE(CHANNEL_FLAG_FIRST_LAST, 4);
  payload.copy(buf, 8);
  return buf;
}

function rdpdrHeader(packetId) {
  const hdr = Buffer.alloc(4);
  hdr.writeUInt16LE(RDPDR_CTYP_CORE, 0);
  hdr.writeUInt16LE(packetId, 2);
  return hdr;
}

function parseRdpdrPdu(userData) {
  if (!isChannelPduHeader(userData) || userData.length < 12) return null;
  const payload = userData.subarray(8);
  if (payload.length < 4) return null;
  const component = payload.readUInt16LE(0);
  if (component !== RDPDR_CTYP_CORE) return null;
  const packetId = payload.readUInt16LE(2);
  return { component, packetId, payload };
}

function buildClientIdConfirm(versionMajor, versionMinor, clientId) {
  const body = Buffer.alloc(12);
  rdpdrHeader(PAKID_CORE_CLIENTID_CONFIRM).copy(body, 0);
  body.writeUInt16LE(versionMajor, 4);
  body.writeUInt16LE(versionMinor, 6);
  body.writeUInt32LE(clientId >>> 0, 8);
  return wrapChannelPdu(body);
}

function buildClientName(computerName) {
  const name = Buffer.from(`${computerName}\0`, 'utf16le');
  const body = Buffer.alloc(4 + 12 + name.length);
  rdpdrHeader(PAKID_CORE_CLIENT_NAME).copy(body, 0);
  body.writeUInt32LE(1, 4); // UnicodeFlag
  body.writeUInt32LE(0, 8); // CodePage
  body.writeUInt32LE(name.length, 12);
  name.copy(body, 16);
  return wrapChannelPdu(body);
}

function buildClientCapability() {
  // MS-RDPEFS 2.2.2.7.1 General Capability Set, version 2, sin dispositivos.
  const cap = Buffer.alloc(44);
  cap.writeUInt16LE(CAPSET_TYPE_GENERAL, 0);
  cap.writeUInt16LE(44, 2);
  cap.writeUInt32LE(GENERAL_CAPABILITY_VERSION_02, 4);
  cap.writeUInt32LE(0, 8);  // osType
  cap.writeUInt32LE(0, 12); // osVersion
  cap.writeUInt16LE(1, 16); // protocolMajor
  cap.writeUInt16LE(12, 18); // protocolMinor
  cap.writeUInt32LE(0xffff, 20); // ioCode1
  cap.writeUInt32LE(0, 24); // ioCode2
  cap.writeUInt32LE(0x7, 28); // extendedPDU: REMOVE | DISPLAY_NAME | USER_LOGGEDON
  cap.writeUInt32LE(0x0001, 32); // extraFlags1 ENABLE_ASYNCIO
  cap.writeUInt32LE(0, 36);
  cap.writeUInt32LE(0, 40); // SpecialTypeDeviceCap

  const body = Buffer.alloc(8 + cap.length);
  rdpdrHeader(PAKID_CORE_CLIENT_CAPABILITY).copy(body, 0);
  body.writeUInt16LE(1, 4); // numCapabilities
  body.writeUInt16LE(0, 6);
  cap.copy(body, 8);
  return wrapChannelPdu(body);
}

function buildEmptyDeviceList() {
  const body = Buffer.alloc(8);
  rdpdrHeader(PAKID_CORE_DEVICELIST_ANNOUNCE).copy(body, 0);
  body.writeUInt32LE(0, 4);
  return wrapChannelPdu(body);
}

function wrapMcs(initiator, channelId, channelPdu) {
  const effectiveInitiator = initiator == null ? 0 : initiator;
  return buildMcsSendDataRequest(effectiveInitiator, channelId, channelPdu);
}

function handleRdpdrRequest(mcsChannelId, initiator, userData) {
  const parsed = parseRdpdrPdu(userData);
  if (!parsed) return { handled: false, replies: [], note: null };

  if (parsed.packetId === PAKID_CORE_SERVER_ANNOUNCE) {
    if (parsed.payload.length < 12) {
      return { handled: true, replies: [], note: 'rdpdr-announce corto' };
    }
    const versionMajor = parsed.payload.readUInt16LE(4);
    const versionMinor = parsed.payload.readUInt16LE(6);
    const clientId = parsed.payload.readUInt32LE(8);
    const replies = [
      wrapMcs(initiator, mcsChannelId, buildClientIdConfirm(versionMajor, versionMinor, clientId)),
      wrapMcs(initiator, mcsChannelId, buildClientName('NODETERM'))
    ];
    return {
      handled: true,
      replies,
      note: `rdpdr-announce v=${versionMajor}.${versionMinor} clientId=${clientId} (0ms stub)`
    };
  }

  if (parsed.packetId === PAKID_CORE_SERVER_CAPABILITY) {
    return {
      handled: true,
      replies: [
        wrapMcs(initiator, mcsChannelId, buildClientCapability()),
        wrapMcs(initiator, mcsChannelId, buildEmptyDeviceList())
      ],
      note: 'rdpdr-caps -> client-caps + device-list vacia (0ms stub)'
    };
  }

  if (parsed.packetId === PAKID_CORE_USER_LOGGEDON) {
    return { handled: true, replies: [], note: 'rdpdr-user-loggedon' };
  }

  return {
    handled: true,
    replies: [],
    note: `rdpdr-absorb packetId=0x${parsed.packetId.toString(16)}`
  };
}

module.exports = {
  RDPDR_CTYP_CORE,
  PAKID_CORE_SERVER_ANNOUNCE,
  PAKID_CORE_CLIENTID_CONFIRM,
  PAKID_CORE_CLIENT_NAME,
  PAKID_CORE_SERVER_CAPABILITY,
  PAKID_CORE_CLIENT_CAPABILITY,
  PAKID_CORE_DEVICELIST_ANNOUNCE,
  parseRdpdrPdu,
  handleRdpdrRequest
};
