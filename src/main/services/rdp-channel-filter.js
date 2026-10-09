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
  buildMcsSendDataIndication,
  createAutoDetectState,
  handleAutoDetectRequest,
  stripSecAutodetect,
  isChannelPduHeader,
  CHANNEL_PDU_HEADER_LEN,
  rewriteMcsChannelId
} = require('./rdp-autodetect');
const { handleDvcRequest } = require('./rdp-dynvc');
const { handleRdpdrRequest } = require('./rdp-rdpdr');
const { handleRailRequest } = require('./rdp-rail');
const { createCliprdrHealth } = require('./rdp-cliprdr-health');

const TPKT_X224_MCS_HEADER = 8;
const CHANNEL_FLAG_FIRST = 0x01;
const CHANNEL_FLAG_LAST = 0x02;
const CHANNEL_FLAG_SHOW_PROTOCOL = 0x10;
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
  let scNetOffset = -1;

  for (let i = 0; i + 4 <= buf.length; i++) {
    const type = buf.readUInt16LE(i);
    const len = buf.readUInt16LE(i + 2);
    if (len < 4 || i + len > buf.length) continue;

    if (type === SC_NET && len >= 8) {
      scNetOffset = i;
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
  return { ioChannelId, channelIds, messageChannelId, scNetOffset };
}

/**
 * IDs de SC_NET que IronRDP debe ver: los del servidor para cada nombre del CS_NET
 * original del WASM (sin canales inyectados). Si WASM recibe la lista inyectada completa,
 * hace zip por indice y cliprdr/rdpsnd/drdynvc caen en IDs ajenos → remap fragil y
 * dechunkify huerfano.
 */
function resolveWasmAlignedServerIds(wasmNames, clientNames, serverIds) {
  if (!Array.isArray(wasmNames) || !Array.isArray(clientNames) || !Array.isArray(serverIds)) {
    return null;
  }
  if (!wasmNames.length || wasmNames.length >= clientNames.length) return null;
  const out = [];
  for (const raw of wasmNames) {
    const want = String(raw || '').toLowerCase();
    const idx = clientNames.findIndex((n) => String(n || '').toLowerCase() === want);
    if (idx < 0 || serverIds[idx] == null) return null;
    out.push(serverIds[idx]);
  }
  return out.length ? out : null;
}

/**
 * IDs que IronRDP asigna por zip de indice cuando SC_NET no se recorta:
 * wasmNames[i] ↔ serverIds[i]. Usado en bastion (Wallix exige joins de todos los VCs).
 */
function resolveWasmZipVisibleIds(wasmNames, serverIds) {
  if (!Array.isArray(wasmNames) || !Array.isArray(serverIds)) return null;
  if (!wasmNames.length || wasmNames.length > serverIds.length) return null;
  const out = [];
  for (let i = 0; i < wasmNames.length; i++) {
    if (serverIds[i] == null) return null;
    out.push(serverIds[i]);
  }
  return out.length ? out : null;
}

/**
 * Reescribe count+IDs de SC_NET in-place (sin tocar longitudes TPKT/GCC).
 * Las entradas sobrantes se ponen a 0; IronRDP solo lee `count`.
 */
function rewriteScNetChannelIds(buf, newIds) {
  if (!Buffer.isBuffer(buf) || !Array.isArray(newIds) || !newIds.length) {
    return { buf, patched: false, reason: 'bad-args' };
  }
  const parsed = parseServerNetworkChannels(buf);
  if (!parsed || parsed.scNetOffset < 0) {
    return { buf, patched: false, reason: 'sc-net-not-found' };
  }
  const i = parsed.scNetOffset;
  const len = buf.readUInt16LE(i + 2);
  const oldCount = buf.readUInt16LE(i + 6);
  if (newIds.length > oldCount) {
    return { buf, patched: false, reason: 'too-many-ids' };
  }
  if (i + 8 + oldCount * 2 > i + len) {
    return { buf, patched: false, reason: 'sc-net-truncated' };
  }
  const same = oldCount === newIds.length
    && newIds.every((id, idx) => parsed.channelIds[idx] === id);
  if (same) return { buf, patched: false, reason: 'already-aligned' };

  const out = Buffer.from(buf);
  out.writeUInt16LE(newIds.length, i + 6);
  for (let c = 0; c < oldCount; c++) {
    const off = i + 8 + c * 2;
    out.writeUInt16LE(c < newIds.length ? (newIds[c] & 0xffff) : 0, off);
  }
  return {
    buf: out,
    patched: true,
    previousIds: parsed.channelIds.slice(),
    newIds: newIds.slice()
  };
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
  let extra = '';
  // CB_CLIP_CAPS con un solo General Capability Set: generalFlags queda en el
  // offset 20 del payload (cabecera cliprdr 8 + cSets/pad 4 + type/len/version 8).
  if (msgType === 0x0007 && payload.length >= 24) {
    extra = ` generalFlags=0x${payload.readUInt32LE(20).toString(16)}`;
  }
  return `${chanHdr}${name} (flags=0x${msgFlags.toString(16)}, dataLen=${dataLen}, payloadLen=${payload.length}B)${extra}`;
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
    // DynVC por sesion (Echo Soft-Sync). NUNCA compartir entre pestañas.
    activeDvcChannels: new Map(),
    messageChannelId: null,
    staticVcChannelId: null,
    cliprdrChannelId: null,
    // Canal MCS por el que el servidor entrega cliprdr. Normalmente coincide con
    // cliprdrChannelId, pero Wallix usa otro (p.ej. 1001) y hay que remapear.
    serverCliprdrChannelId: null,
    serverCliprdrFragmentOpen: false,
    // Servidor→WASM: reensamblado CHANNEL_PDU por clave (cliprdr, rdpsnd, drdynvc, …).
    staticVcReasmByKey: null,
    // Tras alinear SC_NET: canales que IronRDP unió vs solo inyectados (p. ej. rdpdr 1004).
    wasmJoinedChannelIds: null,
    injectOnlyChannelIds: null,
    injectOnlyFragmentOpen: false,
    injectOnlyFragmentChannelId: null,
    serverRdpdrFragmentOpen: false,
    serverRdpdrFragmentChannelId: null,
    // WASM->RDP: FORMAT_DATA_RESPONSE grande (FIRST sin LAST). Las continuaciones
    // no llevan CLIPRDR_HEADER; hay que seguir remapeando al write path.
    clientCliprdrFragmentOpen: false,
    // VC estatico seguro para WASM->RDP. Un CAPS en 1001 no se confirma aqui:
    // eso muteaba el cliente aunque el handshake real llegara despues por 1004.
    cliprdrWriteChannelId: null,
    pendingClientCliprdr: [],
    cliprdrOnUnsafeChannel: null,
    unsafeCliprdrFragmentOpen: false,
    drdynvcChannelId: null,
    wasmDrdynvcChannelId: null,
    // Si se absorbe un DynVC con FIRST y sin LAST (comprimido / cmd raro), las
    // continuaciones no pueden ir al WASM: IronRDP revienta con dechunkify huerfano.
    serverDrdynvcDropFragmentOpen: false,
    serverDrdynvcDropChannelId: null,
    rdpsndChannelId: null,
    wasmRdpsndChannelId: null,
    // Opt-in de sesion (redirectAudio): respaldo si CS_NET no listo rdpsnd a tiempo (NLA).
    allowAudioPlayback: false,
    // EGFX: no reenviar AUDIO_PLAYBACK_DVC (multiplex con Graphics tumba DynVC).
    egfxGraphics: false,
    loggedAudioDvc: false,
    loggedEgfxAudioReject: false,
    loggedStaticRdpsnd: false,
    isBastion: false,
    cliprdrServerReady: false,
    // El selector de Wallix completa un cliprdr y, al elegir maquina, repite
    // CB_MONITOR_READY en la misma conexion. IronRDP ya esta en Ready y no
    // reenvia CAPS. Se guarda el primer handshake del cliente para repetirlo.
    cliprdrMonitorReadyCount: 0,
    cliprdrServerChannelFlags: null,
    cliprdrRehandshakePending: false,
    cachedClientCaps: null,
    cachedClientTempDir: null,
    cachedClientFormatList: null,
    cliprdrServerGeneralFlags: null,
    cliprdrMuteClientFormatList: false,
    clientInitiator: 0,
    droppedCount: 0,
    droppedByChannel: Object.create(null),
    cliprdrHealth: createCliprdrHealth(),
    cliprdrHandshakeSentToRecoveredDest: false,
    autoDetect: createAutoDetectState()
  };
}

/**
 * SC_NET rewrite solo en conexion directa con inyeccion.
 * Wallix/bastion mantiene SC_NET completo (exige Channel Join de todos los VCs).
 */
function isDirectInjectAlignPath(state) {
  return state && state.isBastion !== true
    && Array.isArray(state.wasmAlignedServerIds)
    && state.wasmAlignedServerIds.length > 0;
}

/**
 * Canales solo-inyectados (rdpdr/rail/…) que no deben llegar al WASM.
 * Usa IDs reales de nombres WASM (wasmAlignedServerIds), en directo y bastion.
 */
function syncWasmJoinedChannels(state, serverChannelIds) {
  if (!state || !Array.isArray(state.wasmAlignedServerIds) || !state.wasmAlignedServerIds.length) {
    state.wasmJoinedChannelIds = null;
    state.injectOnlyChannelIds = null;
    return;
  }
  const joined = new Set([state.ioChannelId, ...state.wasmAlignedServerIds]);
  state.wasmJoinedChannelIds = joined;
  state.injectOnlyChannelIds = new Set();
  if (Array.isArray(serverChannelIds)) {
    for (const id of serverChannelIds) {
      if (id != null && !joined.has(id)) state.injectOnlyChannelIds.add(id);
    }
  }
}

/** Asigna cliprdr/drdynvc/rdpsnd WASM-facing: zip por indice en bastion+inyeccion; IDs reales en directo. */
function applyWasmFacingChannelIds(state, wasmNames, sourceNames, serverIds, idForName) {
  const injected = Array.isArray(wasmNames) && Array.isArray(sourceNames)
    && wasmNames.length > 0
    && wasmNames.length < sourceNames.length;
  if (state.isBastion === true && injected) {
    const zipIds = resolveWasmZipVisibleIds(wasmNames, serverIds);
    if (zipIds && zipIds.length === wasmNames.length) {
      for (let i = 0; i < wasmNames.length; i++) {
        const name = String(wasmNames[i] || '').toLowerCase();
        const zipId = zipIds[i];
        if (name === 'cliprdr') state.cliprdrChannelId = zipId;
        else if (name === 'drdynvc') state.wasmDrdynvcChannelId = zipId;
        else if (name === 'rdpsnd') state.wasmRdpsndChannelId = zipId;
      }
      return;
    }
  }
  const clipId = idForName('cliprdr');
  if (clipId != null) state.cliprdrChannelId = clipId;
  state.wasmDrdynvcChannelId = idForName('drdynvc');
  state.wasmRdpsndChannelId = idForName('rdpsnd');
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
  // Usar clientChannelNames (con inyeccion) para el mapa servidor->nombre.
  // Si GCC del cliente no se pudo parsear (cs-net-not-found), clientChannelNames
  // queda vacio; intentamos con wasmChannelNames como fallback de segundo nivel.
  const sourceNames = (Array.isArray(state.clientChannelNames) && state.clientChannelNames.length)
    ? state.clientChannelNames
    : (Array.isArray(state.wasmChannelNames) && state.wasmChannelNames.length)
      ? state.wasmChannelNames
      : [];
  if (sourceNames.length) {
    parsed.channelIds.forEach((id, idx) => {
      const name = sourceNames[idx];
      if (name) {
        state.channelIdToName.set(id, name);
        if (name === 'drdynvc') {
          state.drdynvcChannelId = id;
        }
        if (String(name).toLowerCase() === 'rdpsnd') {
          state.rdpsndChannelId = id;
        }
      }
    });
  }

  // IDs que vera IronRDP tras alinear SC_NET: los del servidor para cada nombre del
  // CS_NET original (wasmChannelNames), NO el zip por indice sobre la lista inyectada.
  const wasmNames = (state.wasmChannelNames && state.wasmChannelNames.length)
    ? state.wasmChannelNames
    : sourceNames;
  const idForName = (want) => {
    const needle = String(want || '').toLowerCase();
    if (sourceNames.length && parsed.channelIds.length) {
      const idx = sourceNames.findIndex((n) => String(n || '').toLowerCase() === needle);
      if (idx >= 0 && parsed.channelIds[idx] != null) return parsed.channelIds[idx];
    }
    for (const [id, name] of state.channelIdToName) {
      if (String(name || '').toLowerCase() === needle) return id;
    }
    return null;
  };

  // Wire IDs reales ya en channelIdToName / drdynvcChannelId / rdpsndChannelId.
  // WASM-facing: zip por indice en bastion; IDs reales (post-align) en directo.
  applyWasmFacingChannelIds(state, wasmNames, sourceNames, parsed.channelIds, idForName);

  // IDs reales de nombres WASM (para inject-only). SC_NET rewrite solo en directo.
  state.wasmAlignedServerIds = resolveWasmAlignedServerIds(
    wasmNames,
    sourceNames,
    parsed.channelIds
  );
  syncWasmJoinedChannels(state, parsed.channelIds);

  state.ready = true;
  retryConfirmAppCliprdrWrite(state);
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

// PDU no-cliprdr en VC estatico (no el keepalive 4B, que ya hace eco arriba).
// Una linea por canal basta para ver la forma en el volcado de desconexion.
function noteFirstDroppedNonCliprdr(state, channelId, userData) {
  if (!state || channelId == null || !Buffer.isBuffer(userData)) return;
  if (userData.length === 4) return;
  const clipCheck = describeCliprdrPdu(userData);
  if (clipCheck && clipCheck.includes('CB_')) return;
  if (!(state.loggedDroppedVc instanceof Set)) state.loggedDroppedVc = new Set();
  if (state.loggedDroppedVc.has(channelId)) return;
  state.loggedDroppedVc.add(channelId);
  const name = state.channelIdToName instanceof Map
    ? (state.channelIdToName.get(channelId) || 'sin-nombre')
    : 'sin-nombre';
  const hex = userData.toString('hex').slice(0, 32);
  const msg = `[Bridge] PDU no-cliprdr descartado ch=${channelId} (${name}) len=${userData.length}B hex=${hex}`;
  if (typeof state.recordCliprdr === 'function') state.recordCliprdr(msg);
}

// Con el saludo en 1001 o en el IO el cliente repite CAPS y FORMAT_LIST sin que
// salgan al servidor. Solo el primero de cada tipo entra en el anillo.
function shouldRecordMutedClientCliprdr(state, desc) {
  if (!state || typeof desc !== 'string') return true;
  const writeCh = state.cliprdrWriteChannelId;
  const serverClipCh = state.serverCliprdrChannelId;
  const muted = writeCh == null && serverClipCh != null && (
    isUserMcsChannel(state, serverClipCh)
    || (state.ioChannelId != null && serverClipCh === state.ioChannelId)
  );
  if (!muted) return true;
  const kind = desc.includes('CB_CLIP_CAPS')
    ? 'caps'
    : (desc.includes('CB_FORMAT_LIST') && !desc.includes('CB_FORMAT_LIST_RESPONSE') ? 'list' : null);
  if (!kind) return true;
  if (!(state.loggedMutedCliprdrKinds instanceof Set)) state.loggedMutedCliprdrKinds = new Set();
  if (state.loggedMutedCliprdrKinds.has(kind)) return false;
  state.loggedMutedCliprdrKinds.add(kind);
  return true;
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
 * El stub cierra el handshake y no se reenvia a WASM. Nunca se escribe CHANNEL_PDU
 * rdpdr en el canal IO (1003): corrompe Share Control y el servidor cierra con FIN.
 * Si el announce llega por IO o por cliprdr, las respuestas salen por el VC nombrado
 * rdpdr (si esta declarado); sin VC rdpdr y en IO se absorbe en silencio.
 */
function consumeRdpdr(state, channelId, userData) {
  // Un fragmento CLIPRDR de fichero no lleva CLIPRDR_HEADER. Si se mira antes que
  // claimCliprdrPdu, bytes 0x4472 ('rD') se absorben como rdpdr y IronRDP decodifica
  // FileContentsResponse corto (faltan ~1600B) y tumba la sesion.
  if (state && state.serverCliprdrFragmentOpen && state.serverCliprdrChannelId === channelId) {
    return null;
  }
  // Continuaciones rdpdr (sin cabecera 0x4472) solo en directo/inject-only.
  // En bastion el stub previo no abría series: no cambiar el comportamiento.
  const trackRdpdrFrags = state && state.isBastion !== true
    && (state.injectOnlyChannelIds instanceof Set || state.serverRdpdrFragmentOpen);
  if (trackRdpdrFrags && state.serverRdpdrFragmentOpen
      && state.serverRdpdrFragmentChannelId === channelId
      && Buffer.isBuffer(userData) && isChannelPduHeader(userData)
      && (userData.readUInt32LE(4) & CHANNEL_FLAG_FIRST) === 0) {
    markDropped(state, channelId);
    if ((userData.readUInt32LE(4) & CHANNEL_FLAG_LAST) !== 0) {
      state.serverRdpdrFragmentOpen = false;
      state.serverRdpdrFragmentChannelId = null;
    }
    return {
      forward: null,
      replies: [],
      dropped: true,
      note: `rdpdr-fragment-continuation ch=${channelId}`,
      channelId,
      isCliprdr: false
    };
  }
  const rdpdr = handleRdpdrRequest(channelId, state.clientInitiator, userData);
  if (!rdpdr.handled) return null;

  if (trackRdpdrFrags && Buffer.isBuffer(userData) && isChannelPduHeader(userData)) {
    const chFlags = userData.readUInt32LE(4);
    state.serverRdpdrFragmentOpen = (chFlags & CHANNEL_FLAG_LAST) === 0;
    state.serverRdpdrFragmentChannelId = channelId;
  }

  const ioChannelId = state.ioChannelId != null ? state.ioChannelId : 1003;
  const onIo = channelId === ioChannelId;
  const rdpdrCh = declaredChannelId(state, 'rdpdr');
  const onCliprdr = state.cliprdrChannelId != null && channelId === state.cliprdrChannelId;
  let replies = rdpdr.replies || [];
  let note = rdpdr.note;

  if (onIo) {
    // Contestar en IO tumba la sesion; redirigir al VC rdpdr si existe.
    if (rdpdrCh != null && replies.length) {
      replies = replies.map((buf) => rewriteMcsChannelId(buf, rdpdrCh) || buf);
      note = `${rdpdr.note} (replies->ch=${rdpdrCh}; saludo por IO)`;
    } else {
      replies = [];
      note = `${rdpdr.note} (sin respuesta: canal IO)`;
    }
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

/**
 * rail solo se anuncia para alinear indices :APP:. El stub vive en el VC
 * nombrado 'rail'; no se decide por contenido (orderType 0x0005 choca con
 * CB_FORMAT_DATA_RESPONSE). Nunca se contesta por el canal IO.
 */
function consumeRail(state, channelId, userData) {
  const railCh = declaredChannelId(state, 'rail');
  if (railCh == null || channelId !== railCh) return null;

  const rail = handleRailRequest(channelId, state.clientInitiator, userData);
  if (!rail.handled) return null;

  const ioChannelId = state.ioChannelId != null ? state.ioChannelId : 1003;
  const onIo = channelId === ioChannelId;
  const cliprdrCh = state.cliprdrChannelId;
  const onCliprdr = cliprdrCh != null && channelId === cliprdrCh;
  let replies = onIo ? [] : (rail.replies || []);
  let note = rail.note;

  if (onIo) {
    note = `${rail.note} (sin respuesta: canal IO)`;
  } else if (onCliprdr && railCh !== channelId && replies.length) {
    replies = replies.map((buf) => rewriteMcsChannelId(buf, railCh) || buf);
    note = `${rail.note} (replies->ch=${railCh})`;
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

/**
 * Resumen corto para NODETERM_RDP_DEBUG de un CHANNEL_PDU DynVC reenviado.
 * @returns {string|null}
 */
function formatDrdynvcForwardDebug(userData) {
  if (!Buffer.isBuffer(userData) || userData.length < 8) return null;
  const length = userData.readUInt32LE(0);
  const flags = userData.readUInt32LE(4);
  const frag = [
    (flags & CHANNEL_FLAG_FIRST) ? 'F' : '-',
    (flags & CHANNEL_FLAG_LAST) ? 'L' : '-'
  ].join('');
  const body = userData.subarray(8);
  let dvcCmd = '?';
  if (body.length >= 1) {
    const cmd = (body[0] >> 4) & 0x0f;
    dvcCmd = `0x${cmd.toString(16)}`;
  }
  const hex = body.subarray(0, Math.min(16, body.length)).toString('hex');
  return `chFlags=0x${flags.toString(16)} frag=${frag} dvcCmd=${dvcCmd} pduLen=${length} body=${body.length}B hex16=${hex}`;
}

/**
 * Auto-Detect suelto, sin el resto del filtro. null si el frame no lo es
 * (y en ese caso no cambia el estado). Así la respuesta RTT/ancho de banda
 * sale antes de procesar la ráfaga gráfica del mismo tick.
 */
function tryConsumeAutoDetectFrame(state, buf) {
  if (!state?.ready || !Buffer.isBuffer(buf) || buf[0] !== 0x03) return null;
  const channelId = readSendDataIndicationChannelId(buf);
  if (channelId == null) return null;
  const parsed = parseMcsSendData(buf);
  if (!parsed) return null;
  const isIo = channelId === state.ioChannelId;
  return consumeAutodetect(state, channelId, parsed.userData, !isIo);
}

/**
 * Saca los PDUs Auto-Detect de una ráfaga ya reensamblada y deja el resto
 * en orden. `notes` trae el índice dentro de la ráfaga y el retraso hasta
 * armar la respuesta, para NODETERM_RDP_DEBUG.
 */
function siphonAutoDetectFrames(state, frames) {
  const kept = [];
  const replies = [];
  const notes = [];
  if (!Array.isArray(frames) || frames.length === 0) {
    return { kept: Array.isArray(frames) ? frames : [], replies, notes };
  }
  const started = Date.now();
  for (let i = 0; i < frames.length; i++) {
    const hit = tryConsumeAutoDetectFrame(state, frames[i]);
    if (!hit) {
      kept.push(frames[i]);
      continue;
    }
    if (hit.replies && hit.replies.length) replies.push(...hit.replies);
    notes.push({
      index: i,
      burst: frames.length,
      lagMs: Date.now() - started,
      note: hit.note || 'autodetect'
    });
  }
  return { kept, replies, notes };
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
  if (state && state.clientInitiator != null && channelId === state.clientInitiator) return true;
  if (state && state.messageChannelId != null && channelId === state.messageChannelId) return true;
  return false;
}

function cliprdrDeclaredName(state, channelId) {
  if (!(state && state.channelIdToName instanceof Map)) return null;
  return state.channelIdToName.get(channelId) || null;
}

/**
 * Canal en el que se puede escribir CHANNEL_PDU sin usar MCS 1001 ni el IO:
 * el VC de IronRDP, uno nombrado cliprdr, o cualquier VC estatico unido (Wallix a veces
 * entrega cliprdr por rdpsnd/rdpdr). CAPS en rdpsnd se filtra aparte.
 */
function isSafeStaticCliprdrWrite(state, channelId) {
  if (!state || channelId == null) return false;
  if (isUserMcsChannel(state, channelId)) return false;
  if (state.ioChannelId != null && channelId === state.ioChannelId) return false;
  if (state.cliprdrChannelId != null && channelId === state.cliprdrChannelId) return true;
  if (cliprdrDeclaredName(state, channelId) === 'cliprdr') return true;
  if (state.allowed instanceof Set && state.allowed.has(channelId)) return true;
  return false;
}

/**
 * Si el saludo va por 1001, solo en :APP: (RemoteApp) el VC que SC_NET nombro cliprdr (1007)
 * es el destino de vuelta. En :RDP:, escribir en 1004, 1005 o 1006 tras un saludo
 * por 1001 cierra el TLS (Wallix ESAH corta con FIN).
 */
function fallbackNamedCliprdrWrite(state) {
  if (!state || state.wallixService !== 'APP') return null;
  const named = declaredChannelId(state, 'cliprdr');
  if (named == null) return null;
  if (!isSafeStaticCliprdrWrite(state, named)) return null;
  return named;
}

function greetingOnUnsafeCliprdr(state) {
  const ch = state && state.serverCliprdrChannelId;
  if (ch == null) return false;
  if (isUserMcsChannel(state, ch)) return true;
  if (state.ioChannelId != null && ch === state.ioChannelId) return true;
  return false;
}

/**
 * Selector Wallix sin cadena :APP:: el hop a RemoteApp deja el saludo cliprdr
 * en MCS 1001. El 2o MONITOR_READY ahi, con write path aun null y un VC
 * nombrado cliprdr, es el mismo patron que :APP:. No se toca :RDP:.
 */
function maybePromoteSelectorAppCliprdr(state) {
  if (!state) return false;
  if (state.wallixService === 'APP' || state.wallixService === 'RDP') return false;
  if (state.cliprdrSelectorAppInferred) return false;
  if ((state.cliprdrMonitorReadyCount || 0) < 2) return false;
  const isIo = state.ioChannelId != null && state.serverCliprdrChannelId === state.ioChannelId;
  const isUser = isUserMcsChannel(state, state.serverCliprdrChannelId);
  if (!isUser && !isIo) return false;
  const named = declaredChannelId(state, 'cliprdr');
  if (named == null || !isSafeStaticCliprdrWrite(state, named)) return false;
  state.wallixService = isUser ? 'APP' : 'RDP';
  state.cliprdrSelectorAppInferred = true;
  state.cliprdrRehandshakePending = true;
  state.isBastion = true;
  if (state.cliprdrWriteChannelId == null) {
    state.cliprdrWriteChannelId = named;
  }
  return true;
}

function retryConfirmAppCliprdrWrite(state) {
  if (!state || state.wallixService !== 'APP') return false;
  if (state.cliprdrWriteChannelId != null) return false;
  if (!isUserMcsChannel(state, state.serverCliprdrChannelId)) return false;
  const fallback = fallbackNamedCliprdrWrite(state);
  if (fallback == null) return false;
  state.cliprdrWriteChannelId = fallback;
  return true;
}

/**
 * Saludo por el canal IO (1003): el VC nombrado cliprdr (o el negociado) es destino
 * seguro para CAPS y lista en sesiones RDP estándar.
 * En bastiones Wallix (service=n/a, service=RDP o isBastion), escribir en 1006 tras saludo por IO
 * cierra la conexión TLS (Wallix ESAH corta con FIN): nunca se usa el VC nombrado.
 */
function fallbackIoNamedCliprdrWrite(state) {
  if (!state) return null;
  if (state.wallixService != null) {
    return null;
  }
  const named = declaredChannelId(state, 'cliprdr');
  if (named != null && isSafeStaticCliprdrWrite(state, named)) return named;
  if (isSafeStaticCliprdrWrite(state, state.cliprdrChannelId)) return state.cliprdrChannelId;
  return null;
}

function isCliprdrClientPayloadDesc(desc) {
  if (typeof desc !== 'string' || !desc) return false;
  if (desc.includes('CB_CLIP_CAPS') || desc.includes('CB_TEMP_DIRECTORY')) return false;
  return desc.includes('CB_FORMAT_DATA_')
    || desc.includes('CB_FILECONTENTS_')
    || desc.includes('CB_LOCK_CLIPDATA')
    || desc.includes('CB_UNLOCK_CLIPDATA')
    || desc.includes('CB_FORMAT_LIST');
}

/**
 * Destino para lista/datos cuando el saludo cayo en un canal inseguro.
 * 1001: en RemoteApp (:APP:), el servidor habla cliprdr ahi; la lista y los request se escriben en 1001.
 * IO (1003) / selector Wallix (service=n/a): nunca se escribe directamente CHANNEL_PDU; escribir en 1001,
 * 1003 o 1006 aborta la sesion o congela el grafico.
 */
function unsafeCliprdrClientWriteDest(state, dest) {
  if (!state || dest == null) return null;
  if (state.wallixService === 'n/a') {
    return null;
  }
  if (isUserMcsChannel(state, dest)) return dest;
  const destIsIo = state.ioChannelId != null && dest === state.ioChannelId;
  if (!destIsIo) return null;
  const named = declaredChannelId(state, 'cliprdr');
  if (named != null && isSafeStaticCliprdrWrite(state, named)) return named;
  if (isSafeStaticCliprdrWrite(state, state.cliprdrChannelId)) return state.cliprdrChannelId;
  return null;
}

function confirmCliprdrWriteChannel(state, channelId) {
  if (state.cliprdrWriteChannelId != null) return false;
  // El saludo ya es CLIPRDR valido. Si el canal no es 1001/1002, el message
  // channel de GCC ni el IO, se escribe ahi aunque no este en el mapa SC_NET.
  const isIo = state.ioChannelId != null && channelId === state.ioChannelId;
  const userOrIo = channelId == null
    || isUserMcsChannel(state, channelId)
    || isIo;
  if (!userOrIo) {
    state.cliprdrWriteChannelId = channelId;
    return true;
  }
  if (isIo) {
    const ioFallback = fallbackIoNamedCliprdrWrite(state);
    if (ioFallback == null) return false;
    state.cliprdrWriteChannelId = ioFallback;
    return true;
  }
  const fallback = fallbackNamedCliprdrWrite(state);
  if (fallback == null) return false;
  state.cliprdrWriteChannelId = fallback;
  return true;
}

function enqueueClientCliprdr(state, frame) {
  if (!state || !Buffer.isBuffer(frame)) return;
  if (!Array.isArray(state.pendingClientCliprdr)) state.pendingClientCliprdr = [];
  state.pendingClientCliprdr.push(frame);
}

function takePendingClientCliprdr(state) {
  if (!state || !Array.isArray(state.pendingClientCliprdr) || state.pendingClientCliprdr.length === 0) {
    return [];
  }
  const pending = state.pendingClientCliprdr;
  state.pendingClientCliprdr = [];
  return pending;
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

  // MS-RDPEA SNDC_TRAINING=0x06 ≡ CB_TEMP_DIRECTORY; SNDC_FORMATS=0x07 ≡ CB_CLIP_CAPS.
  // No reclamar rdpsnd/drdynvc/rail. rdpdr se deja (consumeRdpdr va antes) por si el
  // saludo cliprdr llega por un VC mal etiquetado en bastion.
  const declared = channelNameForId(state, channelId);
  if (declared) {
    const n = declared.toLowerCase();
    if (n === 'rdpsnd' || n === 'drdynvc' || n === 'rail') return false;
  }

  const flags = isChannelPduHeader(userData) ? userData.readUInt32LE(4) : 0;
  const starts = isCliprdrHeader(userData) && (flags & CHANNEL_FLAG_FIRST) !== 0;
  const continuationsOnly = isChannelPduHeader(userData) && (flags & CHANNEL_FLAG_FIRST) === 0;
  const continues = state.serverCliprdrFragmentOpen && (
    state.serverCliprdrChannelId === channelId
    || (continuationsOnly && channelId === state.cliprdrChannelId)
  );
  if (!starts && !continues) return false;

  state.serverCliprdrChannelId = channelId;
  state.serverCliprdrFragmentOpen = (flags & CHANNEL_FLAG_LAST) === 0;
  confirmCliprdrWriteChannel(state, channelId);
  maybePromoteSelectorAppCliprdr(state);
  retryConfirmAppCliprdrWrite(state);
  return true;
}

function readChannelPduFlags(userData) {
  if (!isChannelPduHeader(userData) || userData.length < 8) return null;
  return userData.readUInt32LE(4);
}

// Solo CB_MONITOR_READY cuenta como saludo. CB_CLIP_CAPS llega en el mismo
// par y no debe abrir una generacion nueva.
// MS-RDPECLIP 2.2.2.1. Sin este bit IronRDP hace downgrade y pierde file clip y lock.
const CB_STREAM_FILECLIP_ENABLED = 0x0004;

function cliprdrOffersFileClip(flags) {
  return ((flags >>> 0) & CB_STREAM_FILECLIP_ENABLED) !== 0;
}

function noteServerCliprdrCaps(state, userData) {
  if (!state || !Buffer.isBuffer(userData) || !isChannelPduHeader(userData)) return;
  const payload = userData.subarray(CHANNEL_PDU_HEADER_LEN);
  if (payload.length < 24 || payload.readUInt16LE(0) !== 0x0007) return;
  state.cliprdrServerGeneralFlags = payload.readUInt32LE(20);
}

function noteServerCliprdrMonitorReady(state, userData) {
  if (!state) return;
  const desc = describeCliprdrPdu(userData);
  if (!desc || !desc.includes('CB_MONITOR_READY')) return;
  state.cliprdrMonitorReadyCount = (state.cliprdrMonitorReadyCount || 0) + 1;
  const flags = readChannelPduFlags(userData);
  if (flags != null) state.cliprdrServerChannelFlags = flags;
  if (state.cliprdrMonitorReadyCount >= 2) {
    state.cliprdrRehandshakePending = true;
    state.isBastion = true;
  }
  else if (state.wallixService === 'APP' && state.cliprdrMonitorReadyCount >= 1) {
    state.cliprdrRehandshakePending = true;
  }
  if (maybePromoteSelectorAppCliprdr(state)) {
    retryConfirmAppCliprdrWrite(state);
  }
}

// El segundo saludo del selector no trae SHOW_PROTOCOL. Los PDU del cliente
// de esa generacion tienen que salir igual, aunque el write path sea un VC
// estatico alineado (rdpsnd) y isBastion quede en falso.
function cliprdrMustDropShowProtocol(state) {
  if (!state || (state.cliprdrMonitorReadyCount || 0) < 2) return false;
  if (state.cliprdrServerChannelFlags == null) return false;
  return (state.cliprdrServerChannelFlags & CHANNEL_FLAG_SHOW_PROTOCOL) === 0;
}

function rememberClientCliprdrHandshake(state, desc, frame) {
  if (!state || !Buffer.isBuffer(frame) || typeof desc !== 'string') return;
  if (desc.includes('CB_CLIP_CAPS')) {
    if (!state.cachedClientCaps) state.cachedClientCaps = Buffer.from(frame);
    if (state.appCliprdrCapsWaitTimer) {
      clearTimeout(state.appCliprdrCapsWaitTimer);
      state.appCliprdrCapsWaitTimer = null;
    }
    if (state.wallixService === 'APP'
        && isSafeStaticCliprdrWrite(state, state.cliprdrWriteChannelId)) {
      state.cliprdrRehandshakePending = false;
    }
    return;
  }
  if (desc.includes('CB_TEMP_DIRECTORY')) {
    if (!state.cachedClientTempDir) state.cachedClientTempDir = Buffer.from(frame);
    return;
  }
  if (desc.includes('CB_FORMAT_LIST') && !desc.includes('CB_FORMAT_LIST_RESPONSE')) {
    if (!state.cachedClientFormatList) state.cachedClientFormatList = Buffer.from(frame);
  }
}

function setChannelPduFlags(buf, flags) {
  const parsed = parseMcsSendData(buf);
  if (!parsed || readChannelPduFlags(parsed.userData) == null) return null;
  const flagsOffset = parsed.dataOff + 4;
  if (buf.length < flagsOffset + 4) return null;
  const out = Buffer.from(buf);
  out.writeUInt32LE(flags >>> 0, flagsOffset);
  return out;
}

// CB_CLIP_CAPS: ChannelPDU(8) + ClipHdr(8) + cSets/pad(4) + type/len/version(8) + generalFlags.
function patchClientCapsGeneralFlags(frame, generalFlags) {
  if (!Buffer.isBuffer(frame) || generalFlags == null) return null;
  const parsed = parseMcsSendData(frame);
  if (!parsed || !isChannelPduHeader(parsed.userData)) return null;
  const payloadOff = parsed.dataOff + CHANNEL_PDU_HEADER_LEN;
  if (frame.length < payloadOff + 24) return null;
  if (frame.readUInt16LE(payloadOff) !== 0x0007) return null;
  const out = Buffer.from(frame);
  out.writeUInt32LE(generalFlags >>> 0, payloadOff + 20);
  return out;
}

function buildAppProbeCliprdrWrites(state, payloadFrame, desc) {
  const empty = { before: [], after: [] };
  const service = state && state.wallixService;
  if (!state || (service !== 'APP' && service !== 'RDP') || !greetingOnUnsafeCliprdr(state)) {
    return empty;
  }
  if (!isCliprdrClientPayloadDesc(desc)) return empty;
  const flags = CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST | CHANNEL_FLAG_SHOW_PROTOCOL;
  const probeCh = state.serverCliprdrChannelId || 1001;
  const before = [];
  const after = [];
  const isList = desc.includes('CB_FORMAT_LIST') && !desc.includes('CB_FORMAT_LIST_RESPONSE');
  const isProbeUserChannel = isUserMcsChannel(state, probeCh);
  if (isList && !state.appProbeCapsOnUserSent && isProbeUserChannel && Buffer.isBuffer(state.cachedClientCaps)) {
    state.appProbeCapsOnUserSent = true;
    before.push(applyCliprdrReplayFrame(state.cachedClientCaps, probeCh, flags));
  }
  // Solo APP espeja al VC nombrado. En RDP ESAH escribir en 1004/1005/1006 tras 1001 cierra TLS.
  const named = state.cliprdrWriteChannelId;
  if (service === 'APP'
      && isSafeStaticCliprdrWrite(state, named)
      && Buffer.isBuffer(payloadFrame)) {
    after.push(applyCliprdrReplayFrame(payloadFrame, named, flags));
  }
  return { before, after };
}

function applyCliprdrReplayFrame(frame, writeCh, flags) {
  let out = Buffer.from(frame);
  if (writeCh != null) {
    const rewritten = rewriteMcsChannelId(out, writeCh);
    if (rewritten) out = rewritten;
  }
  if (flags != null) {
    const flagged = setChannelPduFlags(out, flags);
    if (flagged) out = flagged;
  }
  return out;
}

// El selector completo el handshake con flags 0x13 y generalFlags=0x2. La maquina
// saluda con 0x3 / 0x3e. Se repite solo CAPS (+ TEMPDIR) hacia el servidor; el
// MONITOR_READY se reenvia a IronRDP para que forceClipboardUpdate anuncie el
// portapapeles local real (si se traga el READY, la Format List queda vacia y
// el pegado no funciona aunque el servidor acuse).
// Solo si hay write path estatico seguro: escribir en 1004 tras un saludo por
// 1001 cierra el TLS (Wallix).
function takeCliprdrRehandshake(state) {
  if (!state || !state.cliprdrRehandshakePending) return [];
  if (!Buffer.isBuffer(state.cachedClientCaps)) return [];
  state.cliprdrRehandshakePending = false;
  const writeCh = state.cliprdrWriteChannelId;
  if (!isSafeStaticCliprdrWrite(state, writeCh)) {
    state.cliprdrRehandshakeSkippedUnsafe = true;
    return [];
  }
  state.cliprdrHandshakeSentToRecoveredDest = true;
  const flags = CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST | CHANNEL_FLAG_SHOW_PROTOCOL;
  const frames = [];
  for (const cached of [state.cachedClientCaps, state.cachedClientTempDir]) {
    if (!Buffer.isBuffer(cached)) continue;
    frames.push(applyCliprdrReplayFrame(cached, writeCh, flags));
  }
  return frames;
}

function staticVcReasmSlot(state, reasmKey) {
  if (!state.staticVcReasmByKey) state.staticVcReasmByKey = Object.create(null);
  return state.staticVcReasmByKey[reasmKey] || null;
}

function setStaticVcReasmSlot(state, reasmKey, slot) {
  if (!state.staticVcReasmByKey) state.staticVcReasmByKey = Object.create(null);
  if (slot == null) delete state.staticVcReasmByKey[reasmKey];
  else state.staticVcReasmByKey[reasmKey] = slot;
}

function buildMcsIndicationWithChannelPdu(initiator, channelId, payload, chFlags) {
  const chanUserData = Buffer.alloc(CHANNEL_PDU_HEADER_LEN + payload.length);
  chanUserData.writeUInt32LE(payload.length, 0);
  chanUserData.writeUInt32LE(chFlags >>> 0, 4);
  payload.copy(chanUserData, 8);
  return {
    buf: buildMcsSendDataIndication(initiator == null ? 0 : initiator, channelId, chanUserData),
    userData: chanUserData
  };
}

/**
 * IronRDP StaticVirtualChannel::dechunkify exige la serie FIRST…LAST intacta.
 * Promueve FIRST-only cuando el payload ya cumple length (BeeSer).
 */
function reassembleStaticChannelPduForWasm(state, reasmKey, buf, channelId, userData) {
  if (!isChannelPduHeader(userData)) {
    return { action: 'pass', buf, userData };
  }
  const totalLen = userData.readUInt32LE(0);
  const flags = userData.readUInt32LE(4);
  const first = (flags & CHANNEL_FLAG_FIRST) !== 0;
  const last = (flags & CHANNEL_FLAG_LAST) !== 0;
  const chunk = userData.subarray(CHANNEL_PDU_HEADER_LEN);

  if (first && last) {
    setStaticVcReasmSlot(state, reasmKey, null);
    return { action: 'pass', buf, userData };
  }

  if (first && !last) {
    const parsed = parseMcsSendData(buf);
    const initiator = parsed ? parsed.initiator : null;
    if (chunk.length >= totalLen && totalLen > 0) {
      const payload = chunk.subarray(0, totalLen);
      const outFlags = (flags | CHANNEL_FLAG_LAST) >>> 0;
      setStaticVcReasmSlot(state, reasmKey, null);
      const built = buildMcsIndicationWithChannelPdu(initiator, channelId, payload, outFlags);
      return {
        action: 'complete',
        buf: built.buf,
        userData: built.userData,
        promotedFirstOnly: true
      };
    }
    setStaticVcReasmSlot(state, reasmKey, {
      wireChannelId: channelId,
      totalLen,
      acc: Buffer.from(chunk),
      initiator,
      firstFlags: flags
    });
    return { action: 'buffer' };
  }

  const reasm = staticVcReasmSlot(state, reasmKey);
  if (!reasm || reasm.wireChannelId !== channelId) {
    setStaticVcReasmSlot(state, reasmKey, null);
    return { action: 'drop-orphan' };
  }
  reasm.acc = Buffer.concat([reasm.acc, chunk]);
  if (!last) {
    return { action: 'buffer' };
  }

  const payload = reasm.acc;
  setStaticVcReasmSlot(state, reasmKey, null);
  const outFlags = ((reasm.firstFlags || CHANNEL_FLAG_FIRST) | CHANNEL_FLAG_LAST) >>> 0;
  const parsed = parseMcsSendData(buf);
  const initiator = reasm.initiator != null
    ? reasm.initiator
    : (parsed ? parsed.initiator : 0);
  const built = buildMcsIndicationWithChannelPdu(initiator, channelId, payload, outFlags);
  return {
    action: 'complete',
    buf: built.buf,
    userData: built.userData,
    lengthMismatch: reasm.totalLen != null && payload.length !== reasm.totalLen
  };
}

function reassembleServerCliprdrForWasm(state, buf, channelId, userData) {
  return reassembleStaticChannelPduForWasm(state, 'cliprdr', buf, channelId, userData);
}

/**
 * Canales anunciados al servidor pero omitidos en SC_NET al WASM (rdpdr): nunca reenviar.
 */
function consumeInjectOnlyChannelFragment(state, channelId, userData) {
  if (!state || !state.injectOnlyChannelIds || !state.injectOnlyChannelIds.has(channelId)) {
    return null;
  }
  if (Buffer.isBuffer(userData) && isChannelPduHeader(userData)) {
    const chFlags = userData.readUInt32LE(4);
    const first = (chFlags & CHANNEL_FLAG_FIRST) !== 0;
    const last = (chFlags & CHANNEL_FLAG_LAST) !== 0;
    if (first && !last) {
      state.injectOnlyFragmentOpen = true;
      state.injectOnlyFragmentChannelId = channelId;
    } else if (last && state.injectOnlyFragmentOpen
        && state.injectOnlyFragmentChannelId === channelId) {
      state.injectOnlyFragmentOpen = false;
      state.injectOnlyFragmentChannelId = null;
    }
  }
  markDropped(state, channelId);
  return {
    forward: null,
    replies: [],
    dropped: true,
    note: `inject-only-absorb ch=${channelId} len=${userData ? userData.length : 0}B`,
    channelId,
    isCliprdr: false,
    cliprdrDesc: null
  };
}

/** Aplica reensamblado estático; devuelve frame listo para remap/forward o null si buffer/drop. */
function applyStaticVcReasmForward(state, reasmKey, frame, channelId, userData, remapFn) {
  const reasmOut = reassembleStaticChannelPduForWasm(state, reasmKey, frame, channelId, userData);
  if (reasmOut.action === 'buffer') {
    return {
      status: 'buffer',
      note: `static-vc-reasm-buffer key=${reasmKey} ch=${channelId}`
    };
  }
  if (reasmOut.action === 'drop-orphan') {
    return { status: 'drop', note: `static-vc-reasm-orphan key=${reasmKey} ch=${channelId}` };
  }
  let outFrame = reasmOut.action === 'complete' ? reasmOut.buf : frame;
  if (typeof remapFn === 'function') {
    outFrame = remapFn(state, outFrame, channelId) || outFrame;
  }
  let note = `static-vc-reasm key=${reasmKey} ch=${channelId}`;
  if (reasmOut.action === 'complete') note += ' (reassembled FIRST|LAST)';
  if (reasmOut.promotedFirstOnly) note += ' (promoted FIRST-only)';
  return { status: 'forward', frame: outFrame, note, reasmOut };
}

function buildCliprdrResult(state, buf, channelId, userData) {
  let desc = describeCliprdrPdu(userData);
  if (desc && (desc.includes('CB_MONITOR_READY') || desc.includes('CB_CLIP_CAPS'))) {
    state.cliprdrServerReady = true;
  }
  if (desc && desc.includes('CB_CLIP_CAPS')) {
    noteServerCliprdrCaps(state, userData);
  }
  if (desc && desc.includes('CB_MONITOR_READY')) {
    noteServerCliprdrMonitorReady(state, userData);
    retryConfirmAppCliprdrWrite(state);
  }

  // El selector a veces saluda por rdpsnd/rdpdr y a veces por 1001 o el canal IO,
  // sin nombre en el mapa. Si solo ofrece generalFlags sin file clip, IronRDP
  // recorta para siempre y el 0x3e de la maquina ya no recupera lock ni archivos.
  const capsName = state.channelIdToName instanceof Map
    ? (state.channelIdToName.get(channelId) || null)
    : null;
  const misnamedClip = capsName != null && capsName !== 'cliprdr';
  const unnamedUnsafe = capsName == null && (
    isUserMcsChannel(state, channelId)
    || (state.ioChannelId != null && channelId === state.ioChannelId)
  );
  if (misnamedClip || unnamedUnsafe) {
    state.isBastion = true;
  }
  const isCaps = desc && desc.includes('CB_CLIP_CAPS');
  const firstGen = (state.cliprdrMonitorReadyCount || 0) < 1;
  if (isCaps && firstGen && (misnamedClip || unnamedUnsafe) && !cliprdrOffersFileClip(state.cliprdrServerGeneralFlags)) {
    state.cliprdrDeferWeakCaps = true;
    return {
      forward: null,
      replies: [],
      dropped: true,
      note: `cliprdr-defer-weak-caps: ${desc}`,
      channelId: state.cliprdrChannelId,
      serverChannelId: channelId,
      isCliprdr: true,
      cliprdrDesc: desc
    };
  }

  // Un segundo CAPS sin file clip no aporta. El de la maquina (0x3e) si: IronRDP
  // aun conserva sus flags si el del selector no se le entrego.
  const secondGenCaps = isCaps && (state.cliprdrMonitorReadyCount || 0) >= 1;
  if (secondGenCaps && !cliprdrOffersFileClip(state.cliprdrServerGeneralFlags)) {
    return {
      forward: null,
      replies: [],
      dropped: true,
      note: `cliprdr-swallow-2nd-gen: ${desc}`,
      channelId: state.cliprdrChannelId,
      serverChannelId: channelId,
      isCliprdr: true,
      cliprdrDesc: desc
    };
  }

  const reasmOut = reassembleServerCliprdrForWasm(state, buf, channelId, userData);
  if (reasmOut.action === 'buffer') {
    return {
      forward: null,
      replies: [],
      dropped: false,
      buffered: true,
      note: `cliprdr-reasm-buffer ch=${channelId}`,
      channelId: state.cliprdrChannelId,
      serverChannelId: channelId,
      isCliprdr: true,
      cliprdrDesc: desc
    };
  }
  if (reasmOut.action === 'drop-orphan') {
    state.serverCliprdrFragmentOpen = false;
    return {
      forward: null,
      replies: [],
      dropped: true,
      note: 'cliprdr-reasm-orphan',
      channelId: state.cliprdrChannelId,
      serverChannelId: channelId,
      isCliprdr: true,
      cliprdrDesc: desc
    };
  }
  if (reasmOut.action === 'complete') {
    buf = reasmOut.buf;
    userData = reasmOut.userData;
    desc = describeCliprdrPdu(userData);
    const udLen = userData.length;
    console.log(
      `[Bridge] cliprdr reassembled ch=${channelId} len=${udLen}B` +
      (reasmOut.promotedFirstOnly ? ' (FIRST-only promoted)' : '')
    );
  }

  const remapped = channelId !== state.cliprdrChannelId
    ? rewriteMcsChannelId(buf, state.cliprdrChannelId)
    : null;

  const reasmNote = reasmOut.action === 'complete' ? ' (reassembled FIRST|LAST)' : '';

  return {
    forward: remapped || buf,
    replies: [],
    dropped: false,
    note: remapped
      ? `cliprdr (remap ch=${channelId}->${state.cliprdrChannelId}): ${desc || 'fragmento'}${reasmNote}`
      : `cliprdr: ${desc || 'fragmento'}${reasmNote}`,
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

function wasmHasDrdynvcName(state) {
  const names = state && Array.isArray(state.wasmChannelNames) ? state.wasmChannelNames : [];
  return names.some((n) => String(n).toUpperCase() === 'DRDYNVC' || String(n).toLowerCase() === 'drdynvc');
}

/**
 * DisplayControl solo en directo (bastion lo stub-acepta con EGFX, sin WASM).
 * EGFX Graphics sigue permitido en bastion via wasmAllowsGraphicsDvc.
 */
function wasmDeclaredDrdynvc(state) {
  if (state && state.isBastion) return false;
  return wasmHasDrdynvcName(state);
}

function wasmAllowsGraphicsDvc(state) {
  // egfxGraphics cubre el caso en que el flag de sesion ya pide EGFX aunque
  // wasmChannelNames aun no liste drdynvc (carrera tras el MCS prepare).
  if (state && state.egfxGraphics === true) return true;
  return wasmHasDrdynvcName(state);
}

function wasmHasRdpsndName(state) {
  const names = state && Array.isArray(state.wasmChannelNames) ? state.wasmChannelNames : [];
  return names.some((n) => String(n).toLowerCase() === 'rdpsnd');
}

/** Audio opt-in: CS_NET con rdpsnd o flag de sesion redirectAudio. */
function wasmAllowsStaticRdpsnd(state) {
  if (!state) return false;
  return state.allowAudioPlayback === true || wasmHasRdpsndName(state);
}

/** AUDIO_PLAYBACK_DVC solo con audio opt-in y DynVC; nunca con EGFX (static rdpsnd). */
function wasmAllowsAudioDvc(state) {
  if (state && state.egfxGraphics === true) return false;
  if (!wasmHasDrdynvcName(state)) return false;
  return wasmAllowsStaticRdpsnd(state);
}

function channelNameForId(state, channelId) {
  if (!(state && state.channelIdToName instanceof Map) || channelId == null) return null;
  const name = state.channelIdToName.get(channelId);
  return name != null ? String(name) : null;
}

function isServerRdpsndChannel(state, channelId) {
  if (state && state.rdpsndChannelId != null && channelId === state.rdpsndChannelId) return true;
  const name = channelNameForId(state, channelId);
  return name != null && name.toLowerCase() === 'rdpsnd';
}

function logAudioOnce(state, key, message) {
  if (!state || state[key]) return;
  state[key] = true;
  console.log(message);
  if (typeof state.recordCliprdr === 'function') {
    try { state.recordCliprdr(message); } catch (_) { /* noop */ }
  }
}

function logAudioDvcRejectOnce(state, note) {
  if (state && state.egfxGraphics === true) {
    logAudioOnce(
      state,
      'loggedEgfxAudioReject',
      '[Bridge] Audio: EGFX → AUDIO_PLAYBACK_DVC rejected (static rdpsnd)'
    );
    return;
  }
  if (note && /AUDIO_PLAYBACK/i.test(note)) {
    logAudioOnce(state, 'loggedAudioDvc', `[Bridge] Audio: reject ${note}`);
  }
}

/**
 * Tras absorber un DynVC FIRST sin LAST, las continuaciones del mismo canal MCS
 * deben tirarse: si van al WASM, ChunkProcessor revienta (fragmento huerfano).
 */
function noteDrdynvcAbsorbedFragment(state, channelId, userData) {
  if (!state || channelId == null || !Buffer.isBuffer(userData) || userData.length < 8) return;
  const flags = userData.readUInt32LE(4);
  const first = (flags & CHANNEL_FLAG_FIRST) !== 0;
  const last = (flags & CHANNEL_FLAG_LAST) !== 0;
  if (first && !last) {
    state.serverDrdynvcDropFragmentOpen = true;
    state.serverDrdynvcDropChannelId = channelId;
    return;
  }
  if (last && state.serverDrdynvcDropFragmentOpen
      && state.serverDrdynvcDropChannelId === channelId) {
    state.serverDrdynvcDropFragmentOpen = false;
    state.serverDrdynvcDropChannelId = null;
  }
}

/**
 * Continuacion de una serie DynVC ya absorbida. Un nuevo FIRST cierra la serie
 * abandonada y deja que handleDvcRequest decida el PDU actual.
 * @returns {object|null} resultado processServerFrame o null
 */
function consumeDrdynvcDropContinuation(state, channelId, userData) {
  if (!state || !state.serverDrdynvcDropFragmentOpen) return null;
  if (state.serverDrdynvcDropChannelId !== channelId) return null;
  if (!Buffer.isBuffer(userData) || userData.length < 8) return null;
  const flags = userData.readUInt32LE(4);
  if ((flags & CHANNEL_FLAG_FIRST) !== 0) {
    state.serverDrdynvcDropFragmentOpen = false;
    state.serverDrdynvcDropChannelId = null;
    return null;
  }
  if ((flags & CHANNEL_FLAG_LAST) !== 0) {
    state.serverDrdynvcDropFragmentOpen = false;
    state.serverDrdynvcDropChannelId = null;
  }
  markDropped(state, channelId);
  return {
    forward: null,
    replies: [],
    dropped: true,
    note: `dvc-drop-fragment-continuation ch=${channelId} flags=0x${flags.toString(16)} len=${userData.length}B`,
    channelId,
    isCliprdr: false,
    cliprdrDesc: null
  };
}

function remapServerRdpsndFrame(state, buf, incomingChannelId) {
  const wasmId = state && state.wasmRdpsndChannelId;
  if (wasmId == null || incomingChannelId === wasmId) return buf;
  return rewriteMcsChannelId(buf, wasmId) || buf;
}

function remapServerDrdynvcFrame(state, buf, incomingChannelId) {
  // En bastion no remapeamos IDs de DisplayControl historico, pero EGFX necesita
  // el mismo remap servidor->wasm cuando los channel IDs difieren.
  const wasmId = state && state.wasmDrdynvcChannelId;
  if (wasmId == null || incomingChannelId === wasmId) return buf;
  if (state && state.isBastion && !wasmAllowsGraphicsDvc(state)) return buf;
  return rewriteMcsChannelId(buf, wasmId) || buf;
}

function remapClientRdpsndFrame(state, frame) {
  if (!state || !Buffer.isBuffer(frame) || !wasmAllowsStaticRdpsnd(state)) return frame;
  const parsed = parseMcsSendData(frame);
  if (!parsed) return frame;
  const wasmId = state.wasmRdpsndChannelId;
  const serverId = state.rdpsndChannelId;
  if (wasmId == null || serverId == null || parsed.channelId !== wasmId || wasmId === serverId) {
    return frame;
  }
  return rewriteMcsChannelId(frame, serverId) || frame;
}

function remapClientDrdynvcFrame(state, frame) {
  if (!state || !Buffer.isBuffer(frame)) return frame;
  // DisplayControl cliente->servidor sigue sin remap en bastion puro sin EGFX.
  // Con Graphics activo, el remapeo es necesario para que el create_rsp llegue.
  if (state.isBastion && !wasmAllowsGraphicsDvc(state)) return frame;
  const parsed = parseMcsSendData(frame);
  if (!parsed) return frame;
  const wasmId = state.wasmDrdynvcChannelId;
  const serverId = state.drdynvcChannelId;
  if (wasmId == null || serverId == null || parsed.channelId !== wasmId || wasmId === serverId) {
    return frame;
  }
  return rewriteMcsChannelId(frame, serverId) || frame;
}

/**
 * Procesa frame RDP->WASM.
 * @returns {{ forward: Buffer|null, replies: Buffer[], dropped: boolean, note: string|null, channelId: number|null }}
 */
function processServerFrame(state, buf) {
  const empty = { forward: buf, replies: [], dropped: false, note: null, channelId: null };
  if (!state || !Buffer.isBuffer(buf)) return empty;
  if (buf[0] !== 0x03) return empty;

  let frame = buf;
  if (!state.ready) {
    const learned = learnFromServerGcc(state, frame);
    // Tras inyectar rdpdr/etc., SC_NET trae mas IDs que canales del WASM. Sin recortar,
    // IronRDP hace zip por indice y deja cliprdr/rdpsnd/drdynvc en IDs ajenos.
    // Solo directo: bastion Wallix necesita la lista SC_NET completa (rail/rdpdr/rdpsnd).
    if (learned && isDirectInjectAlignPath(state)) {
      const aligned = rewriteScNetChannelIds(frame, state.wasmAlignedServerIds);
      if (aligned.patched) {
        frame = aligned.buf;
        if (!state.loggedScNetAlign) {
          state.loggedScNetAlign = true;
          console.log(
            `[Bridge] SC_NET alineado al WASM: [${aligned.previousIds.join(',')}]` +
            ` -> [${aligned.newIds.join(',')}]`
          );
        }
        return {
          forward: frame,
          replies: [],
          dropped: false,
          note: `sc-net-align [${aligned.previousIds.join(',')}]→[${aligned.newIds.join(',')}]`,
          channelId: null,
          isCliprdr: false,
          cliprdrDesc: null,
          scNetAligned: true
        };
      }
    }
  }

  const channelId = readSendDataIndicationChannelId(frame);
  if (channelId == null) {
    return frame === buf ? empty : { ...empty, forward: frame };
  }

  const parsed = parseMcsSendData(frame);

  const isIoChannel = state.ready ? (channelId === state.ioChannelId) : (channelId === 1003);

  // rail solo vive en el canal explicitamente declarado como 'rail'.
  // Evaluarlo ANTES de claimCliprdrPdu evita que el handshake de RAIL (orderType 0x0005)
  // choque con CB_FORMAT_DATA_RESPONSE (0x0005) de cliprdr.
  if (!isIoChannel && parsed) {
    const stubbedRail = consumeRail(state, channelId, parsed.userData);
    if (stubbedRail) return stubbedRail;
    noteUnsafeCliprdr(state, channelId, parsed.userData);
  }

  // rdpsnd ANTES de claimCliprdr: SNDC_TRAINING/FORMATS chocan con TEMP_DIRECTORY/CAPS.
  if (!isIoChannel && parsed && isServerRdpsndChannel(state, channelId) && wasmAllowsStaticRdpsnd(state)) {
    // Bastion: remap directo sin reensamblar (flujo Wallix ya estable).
    if (state.isBastion === true) {
      const fwd = remapServerRdpsndFrame(state, frame, channelId);
      logAudioOnce(state, 'loggedStaticRdpsnd', `[Bridge] Audio: forward static rdpsnd ch=${channelId}`);
      return {
        forward: fwd,
        replies: [],
        dropped: false,
        note: `rdpsnd-forward ch=${channelId} len=${parsed.userData.length}B`,
        channelId,
        isCliprdr: false,
        cliprdrDesc: null,
        rdpsndForward: true
      };
    }
    const rdpsndReasm = applyStaticVcReasmForward(
      state,
      'rdpsnd',
      frame,
      channelId,
      parsed.userData,
      remapServerRdpsndFrame
    );
    if (rdpsndReasm.status === 'buffer') {
      return {
        forward: null,
        replies: [],
        dropped: false,
        buffered: true,
        note: rdpsndReasm.note,
        channelId,
        isCliprdr: false,
        cliprdrDesc: null,
        rdpsndForward: true
      };
    }
    if (rdpsndReasm.status === 'drop') {
      markDropped(state, channelId);
      return {
        forward: null,
        replies: [],
        dropped: true,
        note: rdpsndReasm.note,
        channelId,
        isCliprdr: false,
        cliprdrDesc: null
      };
    }
    logAudioOnce(state, 'loggedStaticRdpsnd', `[Bridge] Audio: forward static rdpsnd ch=${channelId}`);
    let rdpsndNote = rdpsndReasm.note || `rdpsnd-forward ch=${channelId} len=${parsed.userData.length}B`;
    if (rdpsndNote.includes('static-vc-reasm key=rdpsnd') && !rdpsndNote.includes('reassembled')) {
      rdpsndNote = `rdpsnd-forward ch=${channelId} len=${parsed.userData.length}B`;
    }
    return {
      forward: rdpsndReasm.frame,
      replies: [],
      dropped: false,
      note: rdpsndNote,
      channelId,
      isCliprdr: false,
      cliprdrDesc: null,
      rdpsndForward: true
    };
  }

  // DynVC (EGFX / DisplayControl / AUDIO_PLAYBACK) antes de claimCliprdr: el canal
  // inyectado puede compartir patrones de header con cliprdr.
  if (!isIoChannel && parsed && isChannelPduHeader(parsed.userData)
      && state.drdynvcChannelId != null && channelId === state.drdynvcChannelId) {
    const dropCont = consumeDrdynvcDropContinuation(state, channelId, parsed.userData);
    if (dropCont) return dropCont;
    const allowDisplayControl = wasmDeclaredDrdynvc(state);
    const allowGraphics = wasmAllowsGraphicsDvc(state);
    const allowAudio = wasmAllowsAudioDvc(state);
    const bastionStub = state.isBastion === true && state.egfxGraphics === true;
    const passthroughDrdynvcFrags = allowGraphics || allowDisplayControl || allowAudio;
    const dvc = handleDvcRequest(channelId, state.clientInitiator, parsed.userData, {
      allowDisplayControl,
      allowGraphics,
      allowAudio,
      bastionStub,
      activeDvcChannels: state.activeDvcChannels
    });
    if (dvc.handled && dvc.forward) {
      if (dvc.note && /AUDIO_PLAYBACK/i.test(dvc.note)) {
        logAudioOnce(state, 'loggedAudioDvc', `[Bridge] Audio: forward ${dvc.note}`);
      }
      if (dvc.capsQuickReply) state.egfxCapsRepliedByBridge = true;
      // Bastion: remap sin reensamblar CHANNEL_PDU (EGFX Wallix ya estable).
      if (state.isBastion === true) {
        return {
          forward: remapServerDrdynvcFrame(state, frame, channelId),
          replies: dvc.replies || [],
          dropped: false,
          note: dvc.note || channelPduHint(parsed.userData),
          channelId,
          isCliprdr: false,
          cliprdrDesc: null,
          dvcForward: true
        };
      }
      const dvcReasm = applyStaticVcReasmForward(
        state,
        'drdynvc',
        frame,
        channelId,
        parsed.userData,
        remapServerDrdynvcFrame
      );
      if (dvcReasm.status === 'buffer') {
        return {
          forward: null,
          replies: dvc.replies || [],
          dropped: false,
          buffered: true,
          note: dvcReasm.note,
          channelId,
          isCliprdr: false,
          cliprdrDesc: null,
          dvcForward: true
        };
      }
      if (dvcReasm.status === 'drop') {
        markDropped(state, channelId);
        return {
          forward: null,
          replies: dvc.replies || [],
          dropped: true,
          note: dvcReasm.note,
          channelId,
          isCliprdr: false,
          cliprdrDesc: null
        };
      }
      return {
        forward: dvcReasm.frame,
        replies: dvc.replies || [],
        dropped: false,
        note: dvc.note || dvcReasm.note || channelPduHint(parsed.userData),
        channelId,
        isCliprdr: false,
        cliprdrDesc: null,
        dvcForward: true
      };
    }
    if (dvc.handled) {
      logAudioDvcRejectOnce(state, dvc.note);
      noteDrdynvcAbsorbedFragment(state, channelId, parsed.userData);
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
    // Solo fragmentos / create vacio (note *passthrough*). No reenviar Cmd
    // desconocidos (p.ej. 0x0b): IronRDP cierra con invalid Cmd.
    // Tampoco si hay una serie drop-open (FIRST absorbido sin LAST).
    if (passthroughDrdynvcFrags && dvc.note && /passthrough/i.test(dvc.note)
        && !(state.serverDrdynvcDropFragmentOpen
          && state.serverDrdynvcDropChannelId === channelId)) {
      const ud = parsed.userData;
      const chFlags = ud.length >= 8 ? ud.readUInt32LE(4) : 0;
      if (state.isBastion === true) {
        return {
          forward: remapServerDrdynvcFrame(state, frame, channelId),
          replies: [],
          dropped: false,
          note: `dvc-passthrough-frag ch=${channelId} flags=0x${chFlags.toString(16)} len=${ud.length}B`,
          channelId,
          isCliprdr: false,
          cliprdrDesc: null,
          dvcForward: true
        };
      }
      const passthroughReasm = applyStaticVcReasmForward(
        state,
        'drdynvc',
        frame,
        channelId,
        ud,
        remapServerDrdynvcFrame
      );
      if (passthroughReasm.status === 'buffer') {
        return {
          forward: null,
          replies: [],
          dropped: false,
          buffered: true,
          note: passthroughReasm.note,
          channelId,
          isCliprdr: false,
          cliprdrDesc: null,
          dvcForward: true
        };
      }
      if (passthroughReasm.status === 'drop') {
        markDropped(state, channelId);
        return {
          forward: null,
          replies: [],
          dropped: true,
          note: passthroughReasm.note,
          channelId,
          isCliprdr: false,
          cliprdrDesc: null
        };
      }
      return {
        forward: passthroughReasm.frame,
        replies: [],
        dropped: false,
        note: passthroughReasm.note
          || `dvc-passthrough-frag ch=${channelId} flags=0x${chFlags.toString(16)} len=${ud.length}B`,
        channelId,
        isCliprdr: false,
        cliprdrDesc: null,
        dvcForward: true
      };
    }
  }

  // rdpdr antes de claimCliprdr: con inyeccion el ID de rdpdr coincide a veces con el
  // indice wasm de cliprdr; hay que stubbear el handshake de dispositivos o la sesion cuelga.
  if (parsed) {
    const stubbedRdpdr = consumeRdpdr(state, channelId, parsed.userData);
    if (stubbedRdpdr) return stubbedRdpdr;
    const injectOnly = consumeInjectOnlyChannelFragment(state, channelId, parsed.userData);
    if (injectOnly) return injectOnly;
  }

  if (!isIoChannel && parsed && claimCliprdrPdu(state, channelId, parsed.userData)) {
    return buildCliprdrResult(state, frame, channelId, parsed.userData);
  }

  // 2. Canales que no son el canal IO ni cliprdr (canal de usuario 1001, drdynvc, etc.):
  // NUNCA reenviar a IronRDP WASM (evita el crash 'unexpected channel received: ID ...'),
  // salvo CAPS + DisplayControl/EGFX Graphics (y fragmentos CHANNEL_PDU de drdynvc)
  // cuando WASM declaro drdynvc, y rdpsnd estatico cuando hay audio opt-in.
  // Sin passthrough de fragmentos, EGFX llega a medias (~1.5KB)
  // y el decoder ve ZGFX/GFX basura.
  if (!isIoChannel) {
    // messageChannelId solo sale de SC_MSGCHANNEL. Adivinarlo con el primer
    // canal desconocido marcaba un VC estatico como canal de usuario y
    // bloqueaba el write path de cliprdr.
    // DynVC en canal aun no aprendido (antes de SC_NET) u otro MCS: mismo filtro.
    if (parsed && isChannelPduHeader(parsed.userData)
        && (state.drdynvcChannelId == null || channelId !== state.drdynvcChannelId)) {
      const dropCont = consumeDrdynvcDropContinuation(state, channelId, parsed.userData);
      if (dropCont) return dropCont;
      const allowDisplayControl = wasmDeclaredDrdynvc(state);
      const allowGraphics = wasmAllowsGraphicsDvc(state);
      const allowAudio = wasmAllowsAudioDvc(state);
      const bastionStub = state.isBastion === true && state.egfxGraphics === true;
      const dvc = handleDvcRequest(channelId, state.clientInitiator, parsed.userData, {
        allowDisplayControl,
        allowGraphics,
        allowAudio,
        bastionStub,
        activeDvcChannels: state.activeDvcChannels
      });
      if (dvc.handled && dvc.forward) {
        if (dvc.note && /AUDIO_PLAYBACK/i.test(dvc.note)) {
          logAudioOnce(state, 'loggedAudioDvc', `[Bridge] Audio: forward ${dvc.note}`);
        }
        if (dvc.capsQuickReply) state.egfxCapsRepliedByBridge = true;
        if (state.isBastion === true) {
          return {
            forward: remapServerDrdynvcFrame(state, frame, channelId),
            replies: dvc.replies || [],
            dropped: false,
            note: dvc.note || channelPduHint(parsed.userData),
            channelId,
            isCliprdr: false,
            cliprdrDesc: null,
            dvcForward: true
          };
        }
        const dvcReasmAlt = applyStaticVcReasmForward(
          state,
          'drdynvc',
          frame,
          channelId,
          parsed.userData,
          remapServerDrdynvcFrame
        );
        if (dvcReasmAlt.status === 'buffer') {
          return {
            forward: null,
            replies: dvc.replies || [],
            dropped: false,
            buffered: true,
            note: dvcReasmAlt.note,
            channelId,
            isCliprdr: false,
            cliprdrDesc: null,
            dvcForward: true
          };
        }
        if (dvcReasmAlt.status === 'drop') {
          markDropped(state, channelId);
          return {
            forward: null,
            replies: dvc.replies || [],
            dropped: true,
            note: dvcReasmAlt.note,
            channelId,
            isCliprdr: false,
            cliprdrDesc: null
          };
        }
        return {
          forward: dvcReasmAlt.frame,
          replies: dvc.replies || [],
          dropped: false,
          note: dvc.note || dvcReasmAlt.note || channelPduHint(parsed.userData),
          channelId,
          isCliprdr: false,
          cliprdrDesc: null,
          dvcForward: true
        };
      }
      if (dvc.handled) {
        logAudioDvcRejectOnce(state, dvc.note);
        noteDrdynvcAbsorbedFragment(state, channelId, parsed.userData);
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
      // Fragmentos / IDs imposibles en canal aun no mapeado: mismo passthrough EGFX.
      // Sin esto caen al DROP generico y Wallix no completa Graphics.
      if ((allowGraphics || allowDisplayControl || allowAudio)
          && dvc.note
          && /passthrough|implausible/i.test(dvc.note)
          && !(state.serverDrdynvcDropFragmentOpen
            && state.serverDrdynvcDropChannelId === channelId)) {
        if (state.isBastion === true) {
          return {
            forward: remapServerDrdynvcFrame(state, frame, channelId),
            replies: [],
            dropped: false,
            note: dvc.note,
            channelId,
            isCliprdr: false,
            cliprdrDesc: null,
            dvcForward: true
          };
        }
        const passthroughReasmAlt = applyStaticVcReasmForward(
          state,
          'drdynvc',
          frame,
          channelId,
          parsed.userData,
          remapServerDrdynvcFrame
        );
        if (passthroughReasmAlt.status === 'buffer') {
          return {
            forward: null,
            replies: [],
            dropped: false,
            buffered: true,
            note: passthroughReasmAlt.note,
            channelId,
            isCliprdr: false,
            cliprdrDesc: null,
            dvcForward: true
          };
        }
        if (passthroughReasmAlt.status === 'drop') {
          markDropped(state, channelId);
          return {
            forward: null,
            replies: [],
            dropped: true,
            note: passthroughReasmAlt.note,
            channelId,
            isCliprdr: false,
            cliprdrDesc: null
          };
        }
        return {
          forward: passthroughReasmAlt.frame,
          replies: [],
          dropped: false,
          note: passthroughReasmAlt.note || dvc.note,
          channelId,
          isCliprdr: false,
          cliprdrDesc: null,
          dvcForward: true
        };
      }
    }

    if (parsed) {
      const siphoned = consumeAutodetect(state, channelId, parsed.userData, true);
      if (siphoned) return siphoned;
    }

    // Session Probe keepalive (típicamente 4B en MCS 1001): eco al servidor sin
    // reenviar a WASM (IronRDP no soporta ese canal).
    if (parsed && Buffer.isBuffer(parsed.userData) && parsed.userData.length === 4) {
      markDropped(state, channelId);
      const initiator = state.clientInitiator || 0;
      const reply = buildMcsSendDataRequest(initiator, channelId, parsed.userData);
      return {
        forward: null,
        replies: [reply],
        dropped: true,
        note: `probe-keepalive-echo ch=${channelId}`,
        channelId,
        isCliprdr: false,
        cliprdrDesc: null
      };
    }

    noteFirstDroppedNonCliprdr(state, channelId, parsed?.userData);
    markDropped(state, channelId);
    const clipCheck = parsed?.userData ? describeCliprdrPdu(parsed.userData) : null;
    const note = parsed?.userData
      ? `drop ch=${channelId} len=${parsed.userData.length}B${clipCheck ? ` [clip-like: ${clipCheck}]` : ` hex=${parsed.userData.toString('hex').slice(0, 40)}`}`
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
      return buildCliprdrResult(state, frame, channelId, parsed.userData);
    }
    return ioDrop;
  }

  return frame === buf ? empty : { ...empty, forward: frame };
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
  resolveWasmAlignedServerIds,
  resolveWasmZipVisibleIds,
  rewriteScNetChannelIds,
  describeCliprdrPdu,
  reassembleServerCliprdrForWasm,
  reassembleStaticChannelPduForWasm,
  isDirectInjectAlignPath,
  syncWasmJoinedChannels,
  consumeInjectOnlyChannelFragment,
  applyStaticVcReasmForward,
  isCliprdrHeader,
  parseServerNetworkChannels,
  readSendDataIndicationChannelId,
  readChannelJoinConfirmId,
  createChannelFilterState,
  learnFromServerGcc,
  learnClientInitiator,
  isUserMcsChannel,
  isSafeStaticCliprdrWrite,
  fallbackNamedCliprdrWrite,
  greetingOnUnsafeCliprdr,
  maybePromoteSelectorAppCliprdr,
  retryConfirmAppCliprdrWrite,
  fallbackIoNamedCliprdrWrite,
  isCliprdrClientPayloadDesc,
  unsafeCliprdrClientWriteDest,
  confirmCliprdrWriteChannel,
  enqueueClientCliprdr,
  takePendingClientCliprdr,
  shouldRecordMutedClientCliprdr,
  noteServerCliprdrMonitorReady,
  cliprdrMustDropShowProtocol,
  rememberClientCliprdrHandshake,
  patchClientCapsGeneralFlags,
  takeCliprdrRehandshake,
  applyCliprdrReplayFrame,
  CHANNEL_FLAG_FIRST,
  CHANNEL_FLAG_LAST,
  CHANNEL_FLAG_SHOW_PROTOCOL,
  buildAppProbeCliprdrWrites,
  filterServerFrame,
  processServerFrame,
  tryConsumeAutoDetectFrame,
  siphonAutoDetectFrames,
  wasmDeclaredDrdynvc,
  wasmAllowsGraphicsDvc,
  wasmAllowsAudioDvc,
  wasmAllowsStaticRdpsnd,
  wasmHasDrdynvcName,
  wasmHasRdpsndName,
  remapClientDrdynvcFrame,
  remapClientRdpsndFrame,
  remapServerDrdynvcFrame,
  remapServerRdpsndFrame,
  formatDrdynvcForwardDebug
};
