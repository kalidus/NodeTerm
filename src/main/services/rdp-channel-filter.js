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
  isChannelPduHeader,
  CHANNEL_PDU_HEADER_LEN,
  rewriteMcsChannelId
} = require('./rdp-autodetect');
const { handleDvcRequest } = require('./rdp-dynvc');
const { handleRdpdrRequest } = require('./rdp-rdpdr');

const TPKT_X224_MCS_HEADER = 8;
const CHANNEL_FLAG_FIRST = 0x01;
const CHANNEL_FLAG_LAST = 0x02;
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

const CLIPRDR_MSG_NAMES = {
  0x0001: 'CB_MONITOR_READY',
  0x0002: 'CB_FORMAT_LIST',
  0x0003: 'CB_FORMAT_LIST_RESPONSE',
  0x0004: 'CB_FORMAT_DATA_REQUEST',
  0x0005: 'CB_FORMAT_DATA_RESPONSE',
  0x0006: 'CB_TEMP_DIRECTORY',
  0x0007: 'CB_CLIP_CAPS',
  0x0008: 'CB_FILECONTENTS_REQUEST',
  0x0009: 'CB_FILECONTENTS_RESPONSE',
  0x000a: 'CB_LOCK_CLIPDATA',
  0x000b: 'CB_UNLOCK_CLIPDATA'
};

function describeCliprdrPdu(userData) {
  if (!Buffer.isBuffer(userData) || userData.length < 4) return null;
  let payload = userData;
  let chanHdr = '';
  if (isChannelPduHeader(userData)) {
    const len = userData.readUInt32LE(0);
    const flags = userData.readUInt32LE(4);
    chanHdr = `[ChanHdr len=${len} flags=0x${flags.toString(16)}] `;
    payload = userData.subarray(CHANNEL_PDU_HEADER_LEN);
    // Sólo el primer fragmento lleva CLIPRDR_HEADER; decodificar los siguientes da basura
    if ((flags & CHANNEL_FLAG_FIRST) === 0) {
      return `${chanHdr}continuación de fragmento (${payload.length}B)`;
    }
  }
  if (payload.length < 6) return `${chanHdr}raw len=${payload.length}B hex=${payload.toString('hex')}`;
  const msgType = payload.readUInt16LE(0);
  const msgFlags = payload.readUInt16LE(2);
  const dataLen = payload.length >= 8 ? payload.readUInt32LE(4) : 0;
  const name = CLIPRDR_MSG_NAMES[msgType] || `msgType=0x${msgType.toString(16)}`;
  return `${chanHdr}${name} (flags=0x${msgFlags.toString(16)}, dataLen=${dataLen}, payloadLen=${payload.length}B)`;
}

function isCliprdrHeader(userData) {
  if (!isChannelPduHeader(userData)) return false;
  if (userData.length < CHANNEL_PDU_HEADER_LEN + 8) return false;
  const payload = userData.subarray(CHANNEL_PDU_HEADER_LEN);
  const msgType = payload.readUInt16LE(0);
  const dataLen = payload.readUInt32LE(4);

  // Tipos estándar MS-RDPECLIP (1..11)
  if (msgType < 0x0001 || msgType > 0x000b) return false;

  const avail = payload.length - 8;
  // Longitudes válidas:
  // 1. Exacto: avail === dataLen
  // 2. Con padding (hasta 4 bytes, como en CB_FORMAT_LIST con alineación a 4 bytes): avail >= dataLen && avail - dataLen <= 4
  // 3. Fragmentado (primer chunk de payload grande): avail < dataLen && dataLen <= 0x04000000
  if (avail === dataLen) return true;
  if (avail >= dataLen && (avail - dataLen) <= 4) return true;
  if (avail < dataLen && dataLen <= 0x04000000) return true;
  return false;
}

function createChannelFilterState() {
  return {
    ready: false,
    ioChannelId: null,
    allowed: new Set(),
    clientChannelNames: [],
    // Nombres que IronRDP declaro de verdad, antes de inyectar. El WASM mapea cliprdr al indice
    // 0 de SC_NET aunque hacia el servidor hayamos anunciado rdpdr/rdpsnd delante.
    wasmChannelNames: [],
    channelIdToName: new Map(),
    messageChannelId: null,
    staticVcChannelId: null,
    cliprdrChannelId: null,
    // Canal MCS por el que el servidor entrega cliprdr. Normalmente coincide con
    // cliprdrChannelId, pero Wallix usa otro (p.ej. 1001) y hay que remapear.
    serverCliprdrChannelId: null,
    serverCliprdrFragmentOpen: false,
    cliprdrOnUnsafeChannel: null,
    unsafeCliprdrFragmentOpen: false,
    drdynvcChannelId: null,
    cliprdrServerReady: false,
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

  // Mapear lo que ANUNCIAMOS al servidor (tras la inyeccion) a los IDs de SC_NET.
  state.channelIdToName = new Map();
  if (Array.isArray(state.clientChannelNames)) {
    parsed.channelIds.forEach((id, idx) => {
      const name = state.clientChannelNames[idx];
      if (name) {
        state.channelIdToName.set(id, name);
        if (name === 'drdynvc') {
          state.drdynvcChannelId = id;
        }
      }
    });
  }

  // IronRDP no ve la inyeccion: su cliprdr sigue siendo el indice que tenia en CS_NET original.
  const wasmNames = (state.wasmChannelNames && state.wasmChannelNames.length)
    ? state.wasmChannelNames
    : state.clientChannelNames;
  const clipIdx = Array.isArray(wasmNames) ? wasmNames.indexOf('cliprdr') : -1;
  if (clipIdx >= 0 && parsed.channelIds[clipIdx] != null) {
    state.cliprdrChannelId = parsed.channelIds[clipIdx];
  } else {
    for (const [id, name] of state.channelIdToName) {
      if (name === 'cliprdr') {
        state.cliprdrChannelId = id;
        break;
      }
    }
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
        if (!state.wasmChannelNames || state.wasmChannelNames.length === 0) {
          state.wasmChannelNames = chs.slice();
        }
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

function declaredChannelId(state, wantedName) {
  if (!(state.channelIdToName instanceof Map)) return null;
  for (const [id, name] of state.channelIdToName) {
    if (name === wantedName) return id;
  }
  return null;
}

/**
 * rdpdr se anuncia para alinear indices con Wallix, pero no hay cliente de discos.
 * El stub cierra el handshake y no se reenvia a WASM. Nunca se contesta por el canal
 * IO (1003): escribir ahi CHANNEL_PDU de rdpdr corrompe el Share Control y el servidor
 * cierra con FIN, que es lo que se vio justo despues de replies=2 en ch=1003.
 * Si Wallix manda rdpdr por el canal que IronRDP reserva a cliprdr, las respuestas
 * salen por el VC que anunciamos como rdpdr, para no confirmar 1004 como disco.
 */
function consumeRdpdr(state, channelId, userData) {
  const rdpdr = handleRdpdrRequest(channelId, state.clientInitiator, userData);
  if (!rdpdr.handled) return null;

  const ioChannelId = state.ioChannelId != null ? state.ioChannelId : 1003;
  const onIo = channelId === ioChannelId;
  const rdpdrCh = declaredChannelId(state, 'rdpdr');
  const onCliprdr = state.cliprdrChannelId != null && channelId === state.cliprdrChannelId;
  let replies = onIo ? [] : (rdpdr.replies || []);
  let note = rdpdr.note;

  if (onIo) {
    note = `${rdpdr.note} (sin respuesta: canal IO)`;
  } else if (onCliprdr && rdpdrCh != null && rdpdrCh !== channelId && replies.length) {
    replies = replies.map((buf) => rewriteMcsChannelId(buf, rdpdrCh) || buf);
    note = `${rdpdr.note} (replies->ch=${rdpdrCh})`;
  }

  markDropped(state, channelId);
  return {
    forward: null,
    replies,
    dropped: true,
    note: `${note} hex=${userData.toString('hex').slice(0, 48)}`,
    channelId,
    isCliprdr: false
  };
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

/**
 * 1001/1002 son IDs de usuario MCS, no canales virtuales. En destinos Wallix :APP: el
 * saludo cliprdr llega por ahi: se remapea hacia el VC negociado para IronRDP, pero el
 * cliente no debe escribir CHANNEL_PDU de vuelta en 1001 (congela el grafico).
 */
function isUserMcsChannel(state, channelId) {
  if (channelId == null) return false;
  if (channelId === 1001 || channelId === 1002) return true;
  if (state && state.messageChannelId != null && channelId === state.messageChannelId) return true;
  return false;
}

function noteUnsafeCliprdr(state, channelId, userData) {
  if (!isUserMcsChannel(state, channelId) || state.cliprdrChannelId == null || !Buffer.isBuffer(userData)) {
    return false;
  }
  const flags = isChannelPduHeader(userData) ? userData.readUInt32LE(4) : 0;
  const starts = isCliprdrHeader(userData) && (flags & CHANNEL_FLAG_FIRST) !== 0;
  const continues = state.cliprdrOnUnsafeChannel === channelId && state.unsafeCliprdrFragmentOpen;
  if (!starts && !continues) return false;
  state.cliprdrOnUnsafeChannel = channelId;
  state.unsafeCliprdrFragmentOpen = (flags & CHANNEL_FLAG_LAST) === 0;
  return true;
}

/**
 * Decide si una PDU de canal virtual pertenece al flujo cliprdr y actualiza el estado de
 * fragmentación. Es cliprdr si abre un mensaje CLIPRDR válido o si continúa uno ya abierto en el
 * mismo canal: los fragmentos de continuación no llevan CLIPRDR_HEADER y descartarlos rompería el
 * reensamblado. No se decide por ID de canal porque el bastión entrega cliprdr por canales
 * distintos en cada sesión: un VC estatico ajeno, el negociado o el canal de usuario (:APP:).
 */
function claimCliprdrPdu(state, channelId, userData) {
  if (state.cliprdrChannelId == null || !Buffer.isBuffer(userData)) return false;

  const flags = isChannelPduHeader(userData) ? userData.readUInt32LE(4) : 0;
  const starts = isCliprdrHeader(userData) && (flags & CHANNEL_FLAG_FIRST) !== 0;
  const continues = state.serverCliprdrChannelId === channelId && state.serverCliprdrFragmentOpen;
  if (!starts && !continues) return false;

  state.serverCliprdrChannelId = channelId;
  state.serverCliprdrFragmentOpen = (flags & CHANNEL_FLAG_LAST) === 0;
  return true;
}

function buildCliprdrResult(state, buf, channelId, userData) {
  const desc = describeCliprdrPdu(userData);
  if (desc && (desc.includes('CB_MONITOR_READY') || desc.includes('CB_CLIP_CAPS'))) {
    state.cliprdrServerReady = true;
  }

  const remapped = channelId !== state.cliprdrChannelId
    ? rewriteMcsChannelId(buf, state.cliprdrChannelId)
    : null;

  return {
    forward: remapped || buf,
    replies: [],
    dropped: false,
    note: remapped
      ? `cliprdr (remap ch=${channelId}->${state.cliprdrChannelId}): ${desc || 'fragmento'}`
      : `cliprdr: ${desc || 'fragmento'}`,
    channelId: state.cliprdrChannelId,
    serverChannelId: channelId,
    isCliprdr: true,
    cliprdrDesc: desc
  };
}

function filterIoChannelPdu(state, channelId, userData) {
  if (!Buffer.isBuffer(userData) || userData.length < 2) {
    return null;
  }

  // 1. Dropear Heartbeat del servidor (MS-RDPBCGR 2.2.16.1 / Wallix):
  // Comprobar sin importar si userData es corto o largo (puede ser 8, 12, 16 o 22 bytes)
  if (userData.length >= 4) {
    const flags = userData.readUInt16LE(0);
    const hasFlagsHi = (flags & SEC_FLAGSHI_VALID) !== 0;
    const flagsHi = hasFlagsHi && userData.length >= 4 ? userData.readUInt16LE(2) : 0;
    const isHeartbeat = (flags & SEC_HEARTBEAT) !== 0 ||
                        (hasFlagsHi && (((flagsHi & 0x0041) !== 0) || ((flagsHi & 0x000b) !== 0)));

    if (isHeartbeat) {
      markDropped(state, channelId);
      return {
        forward: null,
        replies: [],
        dropped: true,
        note: `server-heartbeat (${userData.length}B dropped for WASM) hex=${userData.toString('hex').slice(0, 32)}`,
        channelId
      };
    }
  }

  // 2. Si es un paquete de licencia (SEC_LICENSE_PKT = 0x0080), DEBE PASAR para completar el handshake
  const secFlags = userData.length >= 2 ? userData.readUInt16LE(0) : 0;
  if ((secFlags & 0x0080) !== 0) {
    return null;
  }

  // 3. PDUs con longitud menor a la mínima de ShareControlHeader (10 bytes)
  if (userData.length < IRONRDP_SHARE_CONTROL_MIN) {
    let note = `short-io ${userData.length}B`;
    if (userData.length >= 4) {
      const flagsHi = userData.readUInt16LE(2);
      note += ` flags=0x${secFlags.toString(16)} flagsHi=0x${flagsHi.toString(16)}`;
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

  // 4. Si el tipo PDU de ShareControlHeader no es soportado por IronRDP WASM:
  // Tipos válidos: 1 (DemandActive), 2 (RequestActive), 3 (ConfirmActive), 4/6 (DeactivateAll), 7 (Data), 10 (ServerRedirection).
  // Tipos no soportados (ej. 0x0b=11) crashean fatalmente IronRDP: 'invalid pdu_type: invalid pdu type ...'
  const pduTypeWithVersion = userData.readUInt16LE(2);
  const pduType = pduTypeWithVersion & 0x000f;
  const VALID_SHARE_CONTROL_TYPES = [1, 2, 3, 4, 6, 7, 10];
  if (!VALID_SHARE_CONTROL_TYPES.includes(pduType)) {
    markDropped(state, channelId);
    return {
      forward: null,
      replies: [],
      dropped: true,
      note: `drop invalid-share-control-0x${pduType.toString(16)} len=${userData.length}B hex=${userData.toString('hex').slice(0, 32)}`,
      channelId
    };
  }

  return null;
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

  const parsed = parseMcsSendData(buf);

  const isIoChannel = state.ready ? (channelId === state.ioChannelId) : (channelId === 1003);

  // rdpdr por contenido, no por ID: Wallix lo ha llegado a mandar por el canal IO (1003),
  // donde el filtro lo veia como ShareControl invalido y no contestaba.
  if (parsed) {
    const stubbed = consumeRdpdr(state, channelId, parsed.userData);
    if (stubbed) return stubbed;
  }

  // Cliprdr en canal de usuario (:APP:): se marca como inseguro para no escribir ahi de
  // vuelta, y se remapea hacia el VC negociado mas abajo para que IronRDP vea MONITOR_READY.
  if (!isIoChannel && parsed) {
    noteUnsafeCliprdr(state, channelId, parsed.userData);
  }

  // 1. Portapapeles (cliprdr). Wallix ignora los nombres de canal que declara el cliente y
  // proyecta su propio orden sobre los IDs: cliprdr puede llegar por un canal que el cliente
  // reservó para otra cosa y, a la vez, ese canal puede traer rdpdr. Así que no se decide por ID
  // sino por contenido: es cliprdr si abre un mensaje CLIPRDR válido o si continúa uno ya
  // abierto, porque los fragmentos de continuación no llevan CLIPRDR_HEADER y descartarlos
  // rompería el reensamblado. Lo que no encaje, aunque venga por el canal cliprdr negociado, cae
  // al bloque siguiente y se descarta: reenviarlo le metería basura de otro protocolo al canal
  // cliprdr de IronRDP.
  if (!isIoChannel && parsed && claimCliprdrPdu(state, channelId, parsed.userData)) {
    return buildCliprdrResult(state, buf, channelId, parsed.userData);
  }

  // 2. Canales que no son el canal IO ni cliprdr (canal de usuario 1001, drdynvc, etc.):
  // NUNCA reenviar a IronRDP WASM (evita el crash 'unexpected channel received: ID ...').
  // El interceptor DVC sólo se aplica aquí: drdynvc es un canal virtual estático, el canal IO
  // jamás transporta CHANNEL_PDU_HEADER y aplicarle esta heurística descartaba PDUs legítimas.
  if (!isIoChannel) {
    if (state.messageChannelId == null) {
      state.messageChannelId = channelId;
    }

    if (parsed && isChannelPduHeader(parsed.userData)) {
      const dvc = handleDvcRequest(channelId, state.clientInitiator, parsed.userData);
      if (dvc.handled) {
        markDropped(state, channelId);
        return {
          forward: null,
          replies: dvc.replies || [],
          dropped: true,
          note: `${dvc.note || channelPduHint(parsed.userData)} hex=${parsed.userData.toString('hex').slice(0, 48)}`,
          channelId,
          isCliprdr: false,
          cliprdrDesc: null
        };
      }
    }

    if (parsed) {
      const siphoned = consumeAutodetect(state, channelId, parsed.userData, true);
      if (siphoned) return siphoned;
    }

    markDropped(state, channelId);
    const clipCheck = parsed?.userData ? describeCliprdrPdu(parsed.userData) : null;
    const note = parsed?.userData
      ? (parsed.userData.length === 4 ? 'heartbeat' : `drop ch=${channelId} len=${parsed.userData.length}B${clipCheck ? ` [clip-like: ${clipCheck}]` : ` hex=${parsed.userData.toString('hex').slice(0, 40)}`}`)
      : `drop ch=${channelId}`;

    return {
      forward: null,
      replies: [],
      dropped: true,
      note,
      channelId,
      isCliprdr: false,
      cliprdrDesc: clipCheck
    };
  }

  // 3. Tráfico en el Canal IO:
  if (!parsed) return empty;

  const siphoned = consumeAutodetect(state, channelId, parsed.userData, false);
  if (siphoned) return siphoned;

  const ioDrop = filterIoChannelPdu(state, channelId, parsed.userData);
  if (ioDrop) {
    // El bastión entrega cliprdr por el canal IO en algunas sesiones, y ahí caía descartado como
    // 'invalid-share-control-0x0'. Se rescata DESPUÉS del filtro y sólo lo que el filtro ya iba a
    // tirar: así el tráfico legítimo del canal IO no pasa nunca por esta heurística, que es lo
    // que antes provocaba falsos positivos. Las respuestas del bridge (auto-detect) se respetan.
    if (ioDrop.dropped && !(ioDrop.replies && ioDrop.replies.length) &&
        claimCliprdrPdu(state, channelId, parsed.userData)) {
      return buildCliprdrResult(state, buf, channelId, parsed.userData);
    }
    return ioDrop;
  }

  return empty;
}

function filterServerFrame(state, buf) {
  return processServerFrame(state, buf).forward;
}

module.exports = {
  SC_NET,
  SC_MSGCHANNEL,
  MCS_SEND_DATA_INDICATION,
  IRONRDP_SHARE_CONTROL_MIN,
  CLIPRDR_MSG_NAMES,
  describeCliprdrPdu,
  isCliprdrHeader,
  parseServerNetworkChannels,
  readSendDataIndicationChannelId,
  readChannelJoinConfirmId,
  createChannelFilterState,
  learnFromServerGcc,
  learnClientInitiator,
  filterServerFrame,
  processServerFrame
};
