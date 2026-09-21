/**
 * Stub minimo de RAIL (MS-RDPERAIL). Se anuncia el canal solo para alinear
 * indices Wallix :APP: cuando rdpdr+rdpsnd delante no bastan. IronRDP no es
 * cliente RemoteApp: se absorbe el trafico y se contesta el handshake para
 * que el servidor no espere. Nunca se reenvia a WASM.
 */

'use strict';

const { isChannelPduHeader, buildMcsSendDataRequest } = require('./rdp-autodetect');

const TS_RAIL_ORDER_EXEC = 0x0001;
const TS_RAIL_ORDER_ACTIVATE = 0x0002;
const TS_RAIL_ORDER_SYSPARAM = 0x0003;
const TS_RAIL_ORDER_SYSCOMMAND = 0x0004;
const TS_RAIL_ORDER_HANDSHAKE = 0x0005;
const TS_RAIL_ORDER_NOTIFY_EVENT = 0x0006;
const TS_RAIL_ORDER_WINDOWMOVE = 0x0008;
const TS_RAIL_ORDER_LOCALMOVESIZE = 0x0009;
const TS_RAIL_ORDER_MINMAXINFO = 0x000a;
const TS_RAIL_ORDER_CLIENTSTATUS = 0x000b;
const TS_RAIL_ORDER_SYSPARAM_CLIENT = 0x000c;
const TS_RAIL_ORDER_LANGBARINFO = 0x000d;
const TS_RAIL_ORDER_GET_APPID_REQ = 0x000e;
const TS_RAIL_ORDER_GET_APPID_RESP = 0x000f;
const TS_RAIL_ORDER_TASKBARINFO = 0x0010;
const TS_RAIL_ORDER_LANGUAGEIMEINFO = 0x0011;
const TS_RAIL_ORDER_COMPARTMENTINFO = 0x0012;
const TS_RAIL_ORDER_HANDSHAKE_EX = 0x0013;
const TS_RAIL_ORDER_ZORDER_SYNC = 0x0014;
const TS_RAIL_ORDER_CLOAK = 0x0015;
const TS_RAIL_ORDER_POWER_DISPLAY_REQUEST = 0x0016;
const TS_RAIL_ORDER_SNAP_ARRANGE = 0x0017;
const TS_RAIL_ORDER_GET_APPID_RESP_EX = 0x0018;

const KNOWN_ORDERS = new Set([
  TS_RAIL_ORDER_EXEC,
  TS_RAIL_ORDER_ACTIVATE,
  TS_RAIL_ORDER_SYSPARAM,
  TS_RAIL_ORDER_SYSCOMMAND,
  TS_RAIL_ORDER_HANDSHAKE,
  TS_RAIL_ORDER_NOTIFY_EVENT,
  TS_RAIL_ORDER_WINDOWMOVE,
  TS_RAIL_ORDER_LOCALMOVESIZE,
  TS_RAIL_ORDER_MINMAXINFO,
  TS_RAIL_ORDER_CLIENTSTATUS,
  TS_RAIL_ORDER_SYSPARAM_CLIENT,
  TS_RAIL_ORDER_LANGBARINFO,
  TS_RAIL_ORDER_GET_APPID_REQ,
  TS_RAIL_ORDER_GET_APPID_RESP,
  TS_RAIL_ORDER_TASKBARINFO,
  TS_RAIL_ORDER_LANGUAGEIMEINFO,
  TS_RAIL_ORDER_COMPARTMENTINFO,
  TS_RAIL_ORDER_HANDSHAKE_EX,
  TS_RAIL_ORDER_ZORDER_SYNC,
  TS_RAIL_ORDER_CLOAK,
  TS_RAIL_ORDER_POWER_DISPLAY_REQUEST,
  TS_RAIL_ORDER_SNAP_ARRANGE,
  TS_RAIL_ORDER_GET_APPID_RESP_EX
]);

const CHANNEL_FLAG_FIRST_LAST = 0x03;
const CLIENT_BUILD = 19041;

function wrapChannelPdu(payload) {
  const buf = Buffer.alloc(8 + payload.length);
  buf.writeUInt32LE(payload.length, 0);
  buf.writeUInt32LE(CHANNEL_FLAG_FIRST_LAST, 4);
  payload.copy(buf, 8);
  return buf;
}

function parseRailPdu(userData) {
  if (!isChannelPduHeader(userData) || userData.length < 12) return null;
  const payload = userData.subarray(8);
  if (payload.length < 4) return null;
  const orderType = payload.readUInt16LE(0);
  const orderLength = payload.readUInt16LE(2);
  // orderLength cubre el PDU RAIL entero (cabecera 4B incluida). msgFlags de
  // cliprdr suele ser 0 o 1 y no pasa este umbral, asi no se confunde con CLIPRDR.
  if (orderLength < 4 || orderLength > payload.length) return null;
  if (!KNOWN_ORDERS.has(orderType)) return null;
  return { orderType, orderLength, payload };
}

function buildHandshake(buildNumber) {
  const body = Buffer.alloc(8);
  body.writeUInt16LE(TS_RAIL_ORDER_HANDSHAKE, 0);
  body.writeUInt16LE(8, 2);
  body.writeUInt32LE(buildNumber >>> 0, 4);
  return wrapChannelPdu(body);
}

function wrapMcs(initiator, channelId, channelPdu) {
  const effectiveInitiator = initiator == null ? 0 : initiator;
  return buildMcsSendDataRequest(effectiveInitiator, channelId, channelPdu);
}

function handleRailRequest(mcsChannelId, initiator, userData) {
  const parsed = parseRailPdu(userData);
  if (!parsed) return { handled: false, replies: [], note: null };

  if (parsed.orderType === TS_RAIL_ORDER_HANDSHAKE || parsed.orderType === TS_RAIL_ORDER_HANDSHAKE_EX) {
    return {
      handled: true,
      replies: [wrapMcs(initiator, mcsChannelId, buildHandshake(CLIENT_BUILD))],
      note: `rail-handshake order=0x${parsed.orderType.toString(16)}`
    };
  }

  return {
    handled: true,
    replies: [],
    note: `rail-absorb order=0x${parsed.orderType.toString(16)}`
  };
}

module.exports = {
  TS_RAIL_ORDER_HANDSHAKE,
  TS_RAIL_ORDER_HANDSHAKE_EX,
  parseRailPdu,
  handleRailRequest
};
