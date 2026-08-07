/**
 * Auto-Detect (MS-RDPBCGR 2.2.14).
 *
 * Cuidado: el CHANNEL_PDU_HEADER de VC estaticas (length:u32 + flags:u32)
 * con flags=0x03 (FIRST|LAST) se parece a un AutoDetect type=0x0003.
 * NUNCA tratar ese patron como auto-detect (rompe DYNVC / pantalla negra).
 */

'use strict';

const TYPE_ID_AUTODETECT_REQUEST = 0x00;
const TYPE_ID_AUTODETECT_RESPONSE = 0x01;

const RTT_REQUEST_CONTINUOUS = 0x0001;
const RTT_REQUEST_CONNECT_TIME = 0x1001;
const BW_START_CONNECT_TIME = 0x1014;
const BW_START_RELIABLE_UDP = 0x0014;
const BW_START_LOSSY_UDP = 0x0114;
const BW_PAYLOAD = 0x0002;
const BW_STOP_CONNECT_TIME = 0x002b;
const BW_STOP_RELIABLE_UDP = 0x0429;
const BW_STOP_LOSSY_UDP = 0x0629;

const RTT_RESPONSE = 0x0000;
const BW_RESULTS_CONNECT_TIME = 0x0003;
const BW_RESULTS_CONTINUOUS = 0x000b;
const NETCHAR_SYNC = 0x0018;

const SEC_AUTODETECT_REQ = 0x1000;
const SEC_AUTODETECT_RSP = 0x2000;

const MCS_SEND_DATA_REQUEST = 0x64;
const MCS_SEND_DATA_INDICATION = 0x68;

const DEFAULT_TIME_DELTA_MS = 40;
const DEFAULT_BYTE_COUNT = 256000;
const DEFAULT_BANDWIDTH_KBPS = 50000;
const DEFAULT_RTT_MS = 5;

/** Flags tipicos CHANNEL_FLAG_FIRST|LAST (+ SHOW_PROTOCOL opcional). */
const CHANNEL_FLAG_FIRST = 0x01;
const CHANNEL_FLAG_LAST = 0x02;
const CHANNEL_FLAG_SHOW_PROTOCOL = 0x10;

function readPerLength(buf, offset) {
  if (offset >= buf.length) return null;
  const b0 = buf[offset];
  if ((b0 & 0x80) === 0) {
    return { length: b0, size: 1 };
  }
  if (offset + 1 >= buf.length) return null;
  const length = ((b0 & 0x7f) << 8) | buf[offset + 1];
  return { length, size: 2 };
}

function writePerLength(length) {
  if (length < 0x80) return Buffer.from([length & 0xff]);
  return Buffer.from([0x80 | ((length >> 8) & 0x7f), length & 0xff]);
}

function parseMcsSendData(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 13) return null;
  if (buf[0] !== 0x03 || buf[1] !== 0x00) return null;
  if (buf[4] !== 0x02 || buf[5] !== 0xf0 || buf[6] !== 0x80) return null;
  const mcsType = buf[7];
  if (mcsType !== MCS_SEND_DATA_INDICATION && mcsType !== MCS_SEND_DATA_REQUEST) return null;

  const initiator = buf.readUInt16BE(8);
  const channelId = buf.readUInt16BE(10);
  const lenInfo = readPerLength(buf, 13);
  if (!lenInfo) return null;
  const dataOff = 13 + lenInfo.size;
  if (dataOff + lenInfo.length > buf.length) return null;
  return {
    mcsType,
    initiator,
    channelId,
    userData: buf.subarray(dataOff, dataOff + lenInfo.length),
    dataOff,
    userDataLength: lenInfo.length
  };
}

function buildMcsSendDataRequest(initiator, channelId, userData) {
  const lenField = writePerLength(userData.length);
  const body = Buffer.concat([
    Buffer.from([
      MCS_SEND_DATA_REQUEST,
      (initiator >> 8) & 0xff,
      initiator & 0xff,
      (channelId >> 8) & 0xff,
      channelId & 0xff,
      0x70
    ]),
    lenField,
    userData
  ]);
  const total = 4 + 3 + body.length;
  const out = Buffer.alloc(total);
  out[0] = 0x03;
  out[1] = 0x00;
  out.writeUInt16BE(total, 2);
  out[4] = 0x02;
  out[5] = 0xf0;
  out[6] = 0x80;
  body.copy(out, 7);
  return out;
}

/**
 * CHANNEL_PDU_HEADER (MS-RDPBCGR 2.2.6.1): length:u32 + flags:u32 + data.
 * Con flags=0x03 el offset 4:u16 parece AutoDetect type 0x0003 (falso positivo).
 */
function isChannelPduHeader(userData) {
  if (!Buffer.isBuffer(userData) || userData.length < 8) return false;
  const length = userData.readUInt32LE(0);
  const flags = userData.readUInt32LE(4);
  if (length === 0 || length > 0x100000) return false;
  // flags altos casi siempre 0; debe tener FIRST y/o LAST
  if ((flags & 0xffffff00) !== 0) return false;
  if ((flags & (CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST)) === 0) return false;
  const allowed = CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST | CHANNEL_FLAG_SHOW_PROTOCOL;
  if ((flags & ~allowed) !== 0) return false;
  // length suele ser el tamano del payload tras el header de 8B
  if (length === userData.length - 8) return true;
  // fragmentacion: length declara el total del mensaje, el chunk es mas corto
  if (length >= userData.length - 8 && userData.length > 8) return true;
  return false;
}

function stripSecAutodetect(userData) {
  if (!Buffer.isBuffer(userData) || userData.length < 4) {
    return { hadSec: false, body: userData };
  }
  const flags = userData.readUInt16LE(0);
  const flagsHi = userData.readUInt16LE(2);
  if (flagsHi === 0 && (flags & SEC_AUTODETECT_REQ) !== 0) {
    return { hadSec: true, body: userData.subarray(4), flags };
  }
  return { hadSec: false, body: userData };
}

function wrapSecAutodetectRsp(body) {
  const out = Buffer.alloc(4 + body.length);
  out.writeUInt16LE(SEC_AUTODETECT_RSP, 0);
  out.writeUInt16LE(0, 2);
  body.copy(out, 4);
  return out;
}

function buildRttResponse(sequenceNumber) {
  const out = Buffer.alloc(6);
  out[0] = 0x06;
  out[1] = TYPE_ID_AUTODETECT_RESPONSE;
  out.writeUInt16LE(sequenceNumber, 2);
  out.writeUInt16LE(RTT_RESPONSE, 4);
  return out;
}

function buildBwResultsResponse(sequenceNumber, responseType, timeDeltaMs, byteCount) {
  const out = Buffer.alloc(14);
  out[0] = 0x0e;
  out[1] = TYPE_ID_AUTODETECT_RESPONSE;
  out.writeUInt16LE(sequenceNumber, 2);
  out.writeUInt16LE(responseType, 4);
  out.writeUInt32LE(timeDeltaMs >>> 0, 6);
  out.writeUInt32LE(byteCount >>> 0, 10);
  return out;
}

function buildNetcharSync(sequenceNumber, bandwidthKbps, rttMs) {
  const out = Buffer.alloc(14);
  out[0] = 0x0e;
  out[1] = TYPE_ID_AUTODETECT_RESPONSE;
  out.writeUInt16LE(sequenceNumber, 2);
  out.writeUInt16LE(NETCHAR_SYNC, 4);
  out.writeUInt32LE(bandwidthKbps >>> 0, 6);
  out.writeUInt32LE(rttMs >>> 0, 10);
  return out;
}

function parseAutoDetectRequest(userData) {
  if (!Buffer.isBuffer(userData) || userData.length < 6) return null;
  // Evitar confundir CHANNEL_PDU (DYNVC) con AutoDetect type=0x0003
  if (isChannelPduHeader(userData)) return null;

  const headerLength = userData[0];
  const typeId = userData[1];
  if (typeId !== TYPE_ID_AUTODETECT_REQUEST) return null;
  // Cabeceras AD reales: 6 (RTT/BW start/stop corto) u 8+ (payload/stop con datos)
  if (headerLength !== 0x06 && headerLength !== 0x08 && headerLength !== 0x0e) return null;
  if (userData.length < headerLength) return null;

  const sequenceNumber = userData.readUInt16LE(2);
  const requestType = userData.readUInt16LE(4);

  if (requestType === RTT_REQUEST_CONTINUOUS || requestType === RTT_REQUEST_CONNECT_TIME) {
    return { kind: 'rtt', sequenceNumber, requestType };
  }
  if (
    requestType === BW_START_CONNECT_TIME ||
    requestType === BW_START_RELIABLE_UDP ||
    requestType === BW_START_LOSSY_UDP
  ) {
    return { kind: 'bw-start', sequenceNumber, requestType };
  }
  if (requestType === BW_PAYLOAD) {
    let payload = Buffer.alloc(0);
    if (userData.length >= 8) {
      const plen = userData.readUInt16LE(6);
      payload = userData.subarray(8, Math.min(userData.length, 8 + plen));
    }
    return { kind: 'bw-payload', sequenceNumber, requestType, payload };
  }
  if (
    requestType === BW_STOP_CONNECT_TIME ||
    requestType === BW_STOP_RELIABLE_UDP ||
    requestType === BW_STOP_LOSSY_UDP
  ) {
    let payload = Buffer.alloc(0);
    if (requestType === BW_STOP_CONNECT_TIME && userData.length >= 8) {
      const plen = userData.readUInt16LE(6);
      payload = userData.subarray(8, Math.min(userData.length, 8 + plen));
    }
    return { kind: 'bw-stop', sequenceNumber, requestType, payload };
  }

  // 0x0003/0x000B son RESPONSE types; no tratarlos como request (era el falso positivo DYNVC)
  return null;
}

function createAutoDetectState() {
  return {
    bwStartedAt: null,
    bwBytes: 0,
    repliedCount: 0
  };
}

function pushReply(replies, initiator, channelId, body, wrapSec) {
  const userData = wrapSec ? wrapSecAutodetectRsp(body) : body;
  replies.push(buildMcsSendDataRequest(initiator, channelId, userData));
}

function measuredOrDefault(autoState) {
  if (autoState.bwStartedAt != null && autoState.bwBytes > 0) {
    const timeDelta = Math.max(1, Date.now() - autoState.bwStartedAt);
    return {
      timeDelta,
      byteCount: autoState.bwBytes,
      bandwidthKbps: Math.max(1, Math.floor((autoState.bwBytes * 8) / timeDelta)),
      rttMs: Math.min(timeDelta, 200)
    };
  }
  return {
    timeDelta: DEFAULT_TIME_DELTA_MS,
    byteCount: DEFAULT_BYTE_COUNT,
    bandwidthKbps: DEFAULT_BANDWIDTH_KBPS,
    rttMs: DEFAULT_RTT_MS
  };
}

/**
 * @param {{ wrapSec?: boolean, forceSec?: boolean }} [opts]
 */
function handleAutoDetectRequest(autoState, channelId, initiator, userData, opts = {}) {
  const stripped = stripSecAutodetect(userData);
  const body = stripped.body;
  const useSec = !!(opts.forceSec || opts.wrapSec || stripped.hadSec);

  if (isChannelPduHeader(userData) || isChannelPduHeader(body)) {
    return {
      handled: false,
      replies: [],
      note: null,
      channelPdu: true,
      reqHex: userData.toString('hex').slice(0, 48)
    };
  }

  const req = parseAutoDetectRequest(body);
  if (!req) {
    return {
      handled: stripped.hadSec,
      replies: [],
      note: stripped.hadSec
        ? `sec-autodetect empty/short ${body.length}B hex=${body.toString('hex').slice(0, 32)}`
        : null,
      reqHex: Buffer.isBuffer(userData) ? userData.toString('hex').slice(0, 48) : null
    };
  }

  const replies = [];
  let note = req.kind;
  const metrics = measuredOrDefault(autoState);

  if (req.kind === 'rtt') {
    pushReply(replies, initiator, channelId, buildRttResponse(req.sequenceNumber), useSec);
    autoState.repliedCount += 1;
    note = `rtt seq=${req.sequenceNumber}${useSec ? ' sec' : ''}`;
  } else if (req.kind === 'bw-start') {
    autoState.bwStartedAt = Date.now();
    autoState.bwBytes = 0;
    note = `bw-start seq=${req.sequenceNumber}`;
  } else if (req.kind === 'bw-payload') {
    autoState.bwBytes += req.payload.length;
    note = `bw-payload +${req.payload.length}`;
  } else if (req.kind === 'bw-stop') {
    autoState.bwBytes += req.payload ? req.payload.length : 0;
    const m = measuredOrDefault(autoState);
    const responseType =
      req.requestType === BW_STOP_CONNECT_TIME ? BW_RESULTS_CONNECT_TIME : BW_RESULTS_CONTINUOUS;
    pushReply(
      replies,
      initiator,
      channelId,
      buildBwResultsResponse(req.sequenceNumber, responseType, m.timeDelta, m.byteCount),
      useSec
    );
    autoState.repliedCount += 1;
    note = `bw-stop seq=${req.sequenceNumber} dt=${m.timeDelta}${useSec ? ' sec' : ''}`;
    autoState.bwStartedAt = null;
    autoState.bwBytes = 0;
  } else {
    note = `other type=0x${req.requestType.toString(16)}`;
  }

  return {
    handled: true,
    replies,
    note,
    reqHex: Buffer.isBuffer(userData) ? userData.toString('hex').slice(0, 48) : null
  };
}

/** Reescribe channelId de un MCS SendDataIndication/Request (offset 10 BE). */
function rewriteMcsChannelId(buf, newChannelId) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  const out = Buffer.from(buf);
  out.writeUInt16BE(newChannelId & 0xffff, 10);
  return out;
}

module.exports = {
  TYPE_ID_AUTODETECT_REQUEST,
  TYPE_ID_AUTODETECT_RESPONSE,
  RTT_REQUEST_CONTINUOUS,
  RTT_REQUEST_CONNECT_TIME,
  RTT_RESPONSE,
  BW_RESULTS_CONNECT_TIME,
  NETCHAR_SYNC,
  SEC_AUTODETECT_REQ,
  SEC_AUTODETECT_RSP,
  parseMcsSendData,
  buildMcsSendDataRequest,
  buildRttResponse,
  buildBwResultsResponse,
  buildNetcharSync,
  parseAutoDetectRequest,
  isChannelPduHeader,
  stripSecAutodetect,
  wrapSecAutodetectRsp,
  rewriteMcsChannelId,
  createAutoDetectState,
  handleAutoDetectRequest,
  readPerLength,
  writePerLength
};
