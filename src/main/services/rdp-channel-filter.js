/**
 * Filtra PDUs que IronRDP 0.7 no soporta bien:
 * - Message channel (1001): no reenviar a WASM (unexpected channel).
 *   - Auto-detect real (SEC o cabecera AD estricta) -> responder
 *   - CHANNEL_PDU / DYNVC -> dropear (NO remapear a 1004: corrompe drdynvc)
 * - Canal IO: SEC_AUTODETECT_REQ y PDUs cortos (<10B) ShareControl
 */

'use strict';

const {
  parseMcsSendData,
  buildMcsSendDataRequest,
  createAutoDetectState,
  handleAutoDetectRequest,
  stripSecAutodetect,
  isChannelPduHeader
} = require('./rdp-autodetect');
const { handleDvcRequest } = require('./rdp-dynvc');

const TPKT_X224_MCS_HEADER = 8;
const MCS_SEND_DATA_INDICATION = 0x68;
const MCS_CHANNEL_JOIN_CONFIRM = 0x3e;
const SC_NET = 0x0c03;
const SC_MSGCHANNEL = 0x0c04;

/** IronRDP ShareControlHeader: totalLength+pduType+pduSource+shareId */
const IRONRDP_SHARE_CONTROL_MIN = 10;

const SEC_FLAGSHI_VALID = 0x8000;
const SEC_AUTODETECT_REQ = 0x1000;
const SEC_HEARTBEAT = 0x4000;

function isTpkt(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 7 && buf[0] === 0x03 && buf[1] === 0x00;
}

function parseServerNetworkChannels(buf) {
  if (!isTpkt(buf)) return null;

  let ioChannelId = null;
  let channelIds = [];
  let messageChannelId = null;

  for (let i = 0; i + 4 <= buf.length; i++) {
    const type = buf.readUInt16LE(i);
    const len = buf.readUInt16LE(i + 2);
    if (len < 4 || i + len > buf.length) continue;

    if (type === SC_NET && len >= 8) {
      ioChannelId = buf.readUInt16LE(i + 4);
      const count = buf.readUInt16LE(i + 6);
      channelIds = [];
      for (let c = 0; c < count; c++) {
        const off = i + 8 + c * 2;
        if (off + 2 > i + len) break;
        channelIds.push(buf.readUInt16LE(off));
      }
    } else if (type === SC_MSGCHANNEL && len >= 6) {
      messageChannelId = buf.readUInt16LE(i + 4);
    }
  }

  if (ioChannelId == null) return null;
  return { ioChannelId, channelIds, messageChannelId };
}

function readSendDataIndicationChannelId(buf) {
  if (!isTpkt(buf) || buf.length < TPKT_X224_MCS_HEADER + 4) return null;
  if (buf[4] !== 0x02 || buf[5] !== 0xf0 || buf[6] !== 0x80) return null;
  if (buf[7] !== MCS_SEND_DATA_INDICATION) return null;
  return buf.readUInt16BE(TPKT_X224_MCS_HEADER + 2);
}

function readChannelJoinConfirmId(buf) {
  if (!isTpkt(buf) || buf.length < 15) return null;
  if (buf[7] !== MCS_CHANNEL_JOIN_CONFIRM) return null;
  return buf.readUInt16BE(11);
}

function isCliprdrHeader(userData) {
  if (!isChannelPduHeader(userData) || userData.length < 16) return false;
  const payload = userData.subarray(8);
  const msgType = payload.readUInt16LE(0);
  const dataLen = payload.readUInt32LE(4);
  // Tipos estándar MS-RDPECLIP (1..11) y consistencia de longitud
  return msgType >= 0x0001 && msgType <= 0x000b && dataLen === (payload.length - 8);
}

function createChannelFilterState() {
  return {
    ready: false,
    ioChannelId: null,
    allowed: new Set(),
    clientChannelNames: [],
    channelIdToName: new Map(),
    messageChannelId: null,
    staticVcChannelId: null,
    cliprdrChannelId: null,
    drdynvcChannelId: null,
    clientInitiator: 0,
    droppedCount: 0,
    droppedByChannel: Object.create(null),
    autoDetect: createAutoDetectState()
  };
}

function learnFromServerGcc(state, buf) {
  const parsed = parseServerNetworkChannels(buf);
  if (!parsed) return false;

  state.ioChannelId = parsed.ioChannelId;
  state.allowed = new Set([parsed.ioChannelId, ...parsed.channelIds]);
  state.staticVcChannelId = parsed.channelIds.length ? parsed.channelIds[0] : null;
  state.messageChannelId = parsed.messageChannelId;
  if (parsed.messageChannelId != null) {
    state.allowed.delete(parsed.messageChannelId);
  }

  // Mapear nombres de canales solicitados por el cliente a channelIds asignados por el servidor
  state.channelIdToName = new Map();
  if (Array.isArray(state.clientChannelNames)) {
    parsed.channelIds.forEach((id, idx) => {
      const name = state.clientChannelNames[idx];
      if (name) {
        state.channelIdToName.set(id, name);
        if (name === 'cliprdr') {
          state.cliprdrChannelId = id;
        } else if (name === 'drdynvc') {
          state.drdynvcChannelId = id;
        }
      }
    });
  }

  state.ready = true;
  return true;
}

function learnClientInitiator(state, buf) {
  if (!state || !Buffer.isBuffer(buf) || buf[0] !== 0x03) return false;

  if (!state.clientChannelNames || state.clientChannelNames.length === 0) {
    try {
      const { findClientNetworkChannels } = require('./rdp-mcs-helpers');
      const chs = findClientNetworkChannels(buf);
      if (chs.length) {
        state.clientChannelNames = chs;
      }
    } catch (_) {}
  }

  const parsed = parseMcsSendData(buf);
  if (!parsed || parsed.mcsType !== 0x64) return false;
  if (parsed.initiator > 0) {
    state.clientInitiator = parsed.initiator;
    return true;
  }
  return false;
}

function markDropped(state, channelId) {
  state.droppedCount += 1;
  state.droppedByChannel[channelId] = (state.droppedByChannel[channelId] || 0) + 1;
}

function channelPduHint(userData) {
  if (!isChannelPduHeader(userData) || userData.length < 10) return 'channel-pdu';
  const payload = userData.subarray(8);
  const ascii = payload.toString('ascii').replace(/[^\x20-\x7e]/g, '.');
  if (ascii.includes('Microsoft') || ascii.includes('ECHO') || ascii.includes('AUDIO')) {
    return `dynvc:${ascii.slice(0, 28)}`;
  }
  return `channel-pdu len=${userData.readUInt32LE(0)}`;
}

function consumeAutodetect(state, channelId, userData, force) {
  const sec = stripSecAutodetect(userData);
  if (!sec.hadSec && !force) {
    return null;
  }

  // CHANNEL_PDU / DYNVC nunca es auto-detect
  if (isChannelPduHeader(userData) || isChannelPduHeader(sec.body)) {
    return null;
  }

  const ad = handleAutoDetectRequest(
    state.autoDetect,
    channelId,
    state.clientInitiator,
    userData,
    { wrapSec: sec.hadSec, forceSec: !!force }
  );

  if (ad.channelPdu || !ad.handled) {
    if (!force && !sec.hadSec) return null;
    if (force && !sec.hadSec && !ad.handled) return null;
    if (!ad.handled) return null;
  }

  if (!ad.handled) return null;

  markDropped(state, channelId);

  const note = ad.note || (sec.hadSec ? 'sec-autodetect' : 'drop');
  const withHex =
    ad.reqHex && state.droppedCount <= 12 ? `${note} req=${ad.reqHex}` : note;

  return {
    forward: null,
    replies: ad.replies || [],
    dropped: true,
    note: withHex,
    channelId
  };
}

function dropShortIoPdu(state, channelId, userData) {
  if (!Buffer.isBuffer(userData) || userData.length >= IRONRDP_SHARE_CONTROL_MIN) {
    return null;
  }

  // Dropear Heartbeat del servidor (MS-RDPBCGR 2.2.16.1 / Wallix):
  // El cliente no debe responder al Server Heartbeat PDU.
  // Dropearlo evita que IronRDP WASM crashee por PDU corto (<10B) en ShareControl.
  if (userData.length >= 6) {
    const flags = userData.readUInt16LE(0);
    const hasFlagsHi = (flags & 0x8000) !== 0;
    const flagsHi = hasFlagsHi && userData.length >= 4 ? userData.readUInt16LE(2) : 0;
    const isHeartbeat = (flags & 0x4000) !== 0 || (hasFlagsHi && ((flagsHi & 0x0041) !== 0));

    if (isHeartbeat) {
      markDropped(state, channelId);
      return {
        forward: null,
        replies: [],
        dropped: true,
        note: `server-heartbeat (${userData.length}B dropped for WASM)`,
        channelId
      };
    }
  }

  let note = `short-io ${userData.length}B`;
  if (userData.length >= 4) {
    const flags = userData.readUInt16LE(0);
    const flagsHi = userData.readUInt16LE(2);
    note += ` flags=0x${flags.toString(16)} flagsHi=0x${flagsHi.toString(16)}`;
    if (flags & SEC_AUTODETECT_REQ) note += ' autodetect';
    else if (flags & SEC_HEARTBEAT) note += ' heartbeat';
    else if (flags & SEC_FLAGSHI_VALID) note += ' sec-flagshi';
  }
  note += ` hex=${userData.toString('hex').slice(0, 24)}`;

  markDropped(state, channelId);
  return {
    forward: null,
    replies: [],
    dropped: true,
    note,
    channelId
  };
}

/**
 * Procesa frame RDP->WASM.
 * @returns {{ forward: Buffer|null, replies: Buffer[], dropped: boolean, note: string|null, channelId: number|null }}
 */
function processServerFrame(state, buf) {
  const empty = { forward: buf, replies: [], dropped: false, note: null, channelId: null };
  if (!state || !Buffer.isBuffer(buf)) return empty;
  if (buf[0] !== 0x03) return empty;

  if (!state.ready) {
    learnFromServerGcc(state, buf);
  }

  const channelId = readSendDataIndicationChannelId(buf);
  if (channelId == null) return empty;
  if (!state.ready) return empty;

  const parsed = parseMcsSendData(buf);
  if (!parsed) return empty;

  // 1. Portapapeles (cliprdr): Si es el canal cliprdr o el contenido es un PDU de CLIPRDR,
  // REENVIAR DIRECTAMENTE A IRONRDP WASM SIN INTERCEPTAR NI DROPEAR!
  const isCliprdr = channelId === state.cliprdrChannelId || 
                    state.channelIdToName?.get(channelId) === 'cliprdr' ||
                    isCliprdrHeader(parsed.userData);
  if (isCliprdr) {
    if (state.cliprdrChannelId == null) {
      state.cliprdrChannelId = channelId;
      if (state.channelIdToName) state.channelIdToName.set(channelId, 'cliprdr');
    }
    return empty; // forward: buf, dropped: false -> reenviar a WASM
  }

  // 2. DYNVC / Otros Virtual Channels (CHANNEL_PDU_HEADER que no sea cliprdr):
  // Interceptar peticiones DVC y responder en 0ms para evitar timeouts de servidores RDS / Wallix.
  if (isChannelPduHeader(parsed.userData)) {
    const dvc = handleDvcRequest(channelId, state.clientInitiator, parsed.userData);
    markDropped(state, channelId);
    return {
      forward: null,
      replies: dvc.replies || [],
      dropped: true,
      note: dvc.note || `drop ${channelPduHint(parsed.userData)}`,
      channelId
    };
  }

  const allowed = state.allowed.has(channelId);

  if (allowed) {
    const siphoned = consumeAutodetect(state, channelId, parsed.userData, false);
    if (siphoned) return siphoned;

    if (channelId === state.ioChannelId) {
      const shortDrop = dropShortIoPdu(state, channelId, parsed.userData);
      if (shortDrop) return shortDrop;
    }
    return empty;
  }

  // Canal no permitido (message channel)
  if (state.messageChannelId == null) {
    state.messageChannelId = channelId;
  }

  const siphoned = consumeAutodetect(state, channelId, parsed.userData, true);
  if (siphoned) return siphoned;

  markDropped(state, channelId);
  const note =
    parsed.userData.length === 4
      ? 'heartbeat'
      : `drop raw ${parsed.userData.length}B hex=${parsed.userData.toString('hex').slice(0, 40)}`;

  return {
    forward: null,
    replies: [],
    dropped: true,
    note,
    channelId
  };
}

function filterServerFrame(state, buf) {
  return processServerFrame(state, buf).forward;
}

module.exports = {
  SC_NET,
  SC_MSGCHANNEL,
  MCS_SEND_DATA_INDICATION,
  IRONRDP_SHARE_CONTROL_MIN,
  parseServerNetworkChannels,
  readSendDataIndicationChannelId,
  readChannelJoinConfirmId,
  createChannelFilterState,
  learnFromServerGcc,
  learnClientInitiator,
  filterServerFrame,
  processServerFrame
};
