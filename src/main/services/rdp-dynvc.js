/**
 * rdp-dynvc.js
 * Manejo y respuesta inmediata a peticiones DYNVC (Dynamic Virtual Channels - MS-RDPEDYC).
 * 
 * 🚀 Característica Clave: Responde instantáneamente (0 ms) con STATUS_NOT_SUPPORTED (0xC00000BB)
 * o STATUS_UNSUCCESSFUL (0xC0000001) a las solicitudes DVC_CREATE_REQ de canales no soportados
 * (AUDIO_PLAYBACK_DVC, RDCamera, RDS::Input, Geometry, etc.).
 *
 * DisplayControl y EGFX (Microsoft::Windows::RDS::Graphics) se reenvian al WASM
 * cuando la sesion declaro drdynvc. AUDIO_PLAYBACK_DVC solo con allowAudio
 * (WASM anuncio rdpsnd + ya hay DynVC por EGFX/DisplayControl).
 * El resto sigue rechazandose en 0 ms para evitar timeouts Wallix/RDS.
 */

'use strict';

const { isChannelPduHeader, buildMcsSendDataRequest } = require('./rdp-autodetect');

// MS-RDPEDYC 2.2: Cmd nibble (Create REQ/RSP comparten 0x01).
const DVC_CMD_CREATE = 0x01;
const DVC_CMD_CREATE_REQ = DVC_CMD_CREATE;
const DVC_CMD_CREATE_RSP = DVC_CMD_CREATE;
const DVC_CMD_DATA_FIRST = 0x02;
const DVC_CMD_DATA = 0x03;
const DVC_CMD_CLOSE = 0x04;
const DVC_CMD_CAPS = 0x05;
const DVC_CMD_DATA_FIRST_COMPRESSED = 0x06;
const DVC_CMD_DATA_COMPRESSED = 0x07;
const DVC_CMD_SOFT_SYNC_REQUEST = 0x08;
const DVC_CMD_SOFT_SYNC_RESPONSE = 0x09;

const STATUS_SUCCESS = 0x00000000;
const STATUS_NOT_SUPPORTED = 0xc00000bb;
const STATUS_UNSUCCESSFUL = 0xc0000001;

const CHANNEL_FLAG_FIRST = 0x01;
const CHANNEL_FLAG_LAST = 0x02;

// Fallback solo para tests legacy que no pasan options.activeDvcChannels.
// En el bridge cada sesion usa su propio Map en channelFilter.state.
const fallbackActiveDvcChannels = new Map();

/** ChannelId DVC plausibles en MS-RDPEDYC (1/2/4 bytes; en la practica caben en 16 bits). */
const MAX_PLAUSIBLE_DVC_CHANNEL_ID = 0xffff;

const DISPLAYCONTROL_NAME = 'DISPLAYCONTROL';
const GRAPHICS_CHANNEL_NAME = 'MICROSOFT::WINDOWS::RDS::GRAPHICS';

function resolveActiveDvcMap(options = {}) {
  if (options.activeDvcChannels instanceof Map) return options.activeDvcChannels;
  return fallbackActiveDvcChannels;
}

/** Limpia el fallback de tests. No usar en el bridge (cada sesion tiene su Map). */
function clearActiveDvcChannels() {
  fallbackActiveDvcChannels.clear();
}

function wantsDynvcPassthrough(options = {}) {
  return options.allowGraphics === true
    || options.allowDisplayControl === true
    || options.allowAudio === true;
}

/** PDU DynVC completo (FIRST|LAST). Un fragmento no se puede rechazar ni absorber. */
function isCompleteChannelPdu(userData) {
  if (!Buffer.isBuffer(userData) || userData.length < 8) return false;
  const flags = userData.readUInt32LE(4);
  return (flags & CHANNEL_FLAG_FIRST) !== 0 && (flags & CHANNEL_FLAG_LAST) !== 0;
}

function isChannelPduFirst(userData) {
  if (!Buffer.isBuffer(userData) || userData.length < 8) return false;
  return (userData.readUInt32LE(4) & CHANNEL_FLAG_FIRST) !== 0;
}

function peekDvcCmd(userData) {
  if (!Buffer.isBuffer(userData) || userData.length < 9) return null;
  return (userData[8] >> 4) & 0x0f;
}

function isCompressedDvcCmd(cmd) {
  return cmd === DVC_CMD_DATA_FIRST_COMPRESSED || cmd === DVC_CMD_DATA_COMPRESSED;
}

/** Cmds que IronRDP TryFrom acepta (0x01-0x09). Fuera de eso tumba la sesion WASM. */
function isIronRdpKnownDvcCmd(cmd) {
  return typeof cmd === 'number' && cmd >= DVC_CMD_CREATE && cmd <= DVC_CMD_SOFT_SYNC_RESPONSE;
}

/**
 * Soft-Sync Response minimo (MS-RDPEDYC 2.2.5.2): Cmd=0x09, Pad=0, Length=0.
 * @returns {Buffer} CHANNEL_PDU completo
 */
function buildDvcSoftSyncResponse() {
  const dvc = Buffer.from([
    (DVC_CMD_SOFT_SYNC_RESPONSE << 4),
    0x00,
    0x00, 0x00, 0x00, 0x00
  ]);
  const cpdu = Buffer.alloc(8 + dvc.length);
  cpdu.writeUInt32LE(dvc.length, 0);
  cpdu.writeUInt32LE(CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST, 4);
  dvc.copy(cpdu, 8);
  return cpdu;
}

function isDisplayControlName(name) {
  return String(name || '').toUpperCase().includes(DISPLAYCONTROL_NAME);
}

function isGraphicsChannelName(name) {
  const upper = String(name || '').toUpperCase();
  return upper === GRAPHICS_CHANNEL_NAME || upper.endsWith('::GRAPHICS') || upper.includes('RDS::GRAPHICS');
}

function isEchoName(name) {
  return String(name || '').toUpperCase().includes('ECHO');
}

function isAudioPlaybackName(name) {
  return String(name || '').toUpperCase().includes('AUDIO_PLAYBACK');
}

function isGeometryName(name) {
  return String(name || '').toUpperCase().includes('GEOMETRY');
}

function isTelemetryName(name) {
  return String(name || '').toUpperCase().includes('TELEMETRY');
}

function shouldForwardDvcChannel(channelName, options) {
  if (options.allowGraphics === true && isGraphicsChannelName(channelName)) return true;
  if (options.allowDisplayControl === true && isDisplayControlName(channelName)) return true;
  if (options.allowAudio === true && isAudioPlaybackName(channelName)) return true;
  return false;
}

/**
 * Bastion+EGFX: SUCCESS local (sin WASM) para canales que Wallix reintenta 20-30 s
 * si ve NOT_SUPPORTED. DisplayControl off de verdad: no reenviamos DATA al WASM.
 */
function shouldStubAcceptDvc(channelName, options) {
  if (options.bastionStub !== true) return false;
  return isDisplayControlName(channelName)
    || isGeometryName(channelName)
    || isTelemetryName(channelName);
}

function dvcForwardResult(note) {
  return {
    handled: true,
    forward: true,
    replies: [],
    note
  };
}

function dvcReplyResult(replies, note) {
  return {
    handled: true,
    forward: false,
    replies,
    note
  };
}

/**
 * Parsea una PDU de Dynamic Virtual Channel dentro del payload de CHANNEL_PDU_HEADER
 * @param {Buffer} userData 
 * @returns {object|null}
 */
function parseDvcPdu(userData) {
  if (!isChannelPduHeader(userData) || userData.length < 9) {
    return null;
  }

  // CHANNEL_PDU_HEADER: length:u32 LE (0..3), flags:u32 LE (4..7), data (8..)
  const dvcPayload = userData.subarray(8);
  if (dvcPayload.length < 1) return null;

  const headerByte = dvcPayload[0];
  const cmd = (headerByte >> 4) & 0x0f;
  const sp = (headerByte >> 2) & 0x03;
  const cbId = headerByte & 0x03;

  if (cmd === DVC_CMD_CREATE) {
    // CREATE_REQ (servidor→cliente): ChannelId + ChannelName\0
    // CREATE_RSP (cliente→servidor): ChannelId + CreationStatus u32
    let idLen = 1;
    if (cbId === 1) idLen = 2;
    else if (cbId === 2) idLen = 4;

    if (dvcPayload.length < 1 + idLen) return null;

    let channelId = 0;
    if (idLen === 1) {
      channelId = dvcPayload.readUInt8(1);
    } else if (idLen === 2) {
      channelId = dvcPayload.readUInt16LE(1);
    } else if (idLen === 4) {
      channelId = dvcPayload.readUInt32LE(1);
    }

    const rest = dvcPayload.subarray(1 + idLen);
    // Exactamente 4 bytes restantes ⇒ CreationStatus (CREATE_RSP).
    if (rest.length === 4) {
      return {
        type: 'create-rsp',
        cmd,
        cbId,
        idLen,
        sp,
        channelId,
        status: rest.readUInt32LE(0),
        dvcPayload
      };
    }

    const nullIdx = rest.indexOf(0);
    const channelName = (nullIdx >= 0 ? rest.subarray(0, nullIdx) : rest).toString('ascii');

    return {
      type: 'create-req',
      cmd,
      cbId,
      idLen,
      sp,
      channelId,
      channelName,
      dvcPayload
    };
  }

  if (
    cmd === DVC_CMD_DATA
    || cmd === DVC_CMD_DATA_FIRST
    || cmd === DVC_CMD_DATA_COMPRESSED
    || cmd === DVC_CMD_DATA_FIRST_COMPRESSED
  ) {
    let idLen = 1;
    if (cbId === 1) idLen = 2;
    else if (cbId === 2) idLen = 4;

    if (dvcPayload.length < 1 + idLen) return null;

    let channelId = 0;
    if (idLen === 1) {
      channelId = dvcPayload.readUInt8(1);
    } else if (idLen === 2) {
      channelId = dvcPayload.readUInt16LE(1);
    } else if (idLen === 4) {
      channelId = dvcPayload.readUInt32LE(1);
    }

    let offset = 1 + idLen;
    let totalLength = null;
    // DATA_FIRST / DATA_FIRST_COMPRESSED: Sp indica tamaño del campo Length.
    if (cmd === DVC_CMD_DATA_FIRST || cmd === DVC_CMD_DATA_FIRST_COMPRESSED) {
      const lenSize = sp === 1 ? 2 : (sp === 2 ? 4 : 1);
      if (dvcPayload.length < offset + lenSize) return null;
      if (lenSize === 1) totalLength = dvcPayload.readUInt8(offset);
      else if (lenSize === 2) totalLength = dvcPayload.readUInt16LE(offset);
      else totalLength = dvcPayload.readUInt32LE(offset);
      offset += lenSize;
    }

    const data = dvcPayload.subarray(offset);
    return {
      type: 'data',
      cmd,
      cbId,
      idLen,
      sp,
      channelId,
      totalLength,
      data,
      dvcPayload
    };
  }

  if (cmd === DVC_CMD_CAPS) {
    let version = 1;
    let maxDataSize = 1600;
    let flags = 0;
    if (dvcPayload.length >= 4) {
      // MS-RDPEDYC 2.2.1.1: offset 0: cmd/cbId/sp, offset 1: pad8, offset 2..3: Version (u16 LE)
      version = dvcPayload.readUInt16LE(2);
    }
    if (version === 3 && dvcPayload.length >= 12) {
      maxDataSize = dvcPayload.readUInt32LE(4);
      flags = dvcPayload.readUInt32LE(8);
    } else if (version === 2 && dvcPayload.length >= 8) {
      maxDataSize = dvcPayload.readUInt16LE(4);
    }
    return {
      type: 'caps-req',
      cmd,
      sp,
      cbId,
      version,
      maxDataSize,
      flags,
      dvcPayload
    };
  }

  if (cmd === DVC_CMD_CLOSE) {
    let idLen = 1;
    if (cbId === 1) idLen = 2;
    else if (cbId === 2) idLen = 4;

    let channelId = 0;
    if (dvcPayload.length >= 1 + idLen) {
      if (idLen === 1) channelId = dvcPayload.readUInt8(1);
      else if (idLen === 2) channelId = dvcPayload.readUInt16LE(1);
      else if (idLen === 4) channelId = dvcPayload.readUInt32LE(1);
    }

    return {
      type: 'close',
      cmd,
      cbId,
      channelId,
      dvcPayload
    };
  }

  return {
    type: 'dvc-other',
    cmd,
    cbId,
    dvcPayload
  };
}

/**
 * Construye DVC_CREATE_RSP (MS-RDPEDYC 2.2.2.2)
 * @param {number} cbId 
 * @param {number} channelId 
 * @param {number} [status] STATUS_SUCCESS (0) o código NTSTATUS
 * @returns {Buffer}
 */
function buildDvcCreateResponse(cbId, channelId, status = STATUS_SUCCESS) {
  let idLen = 1;
  if (cbId === 1) idLen = 2;
  else if (cbId === 2) idLen = 4;

  const dvcLen = 1 + idLen + 4;
  const dvcBuf = Buffer.alloc(dvcLen);

  // Header: Cmd = 0x01 (Create), Sp = 0, cbId — igual que CREATE_REQ (MS-RDPEDYC 2.2.2.2)
  dvcBuf[0] = (DVC_CMD_CREATE_RSP << 4) | (cbId & 0x03);

  if (idLen === 1) {
    dvcBuf.writeUInt8(channelId, 1);
  } else if (idLen === 2) {
    dvcBuf.writeUInt16LE(channelId, 1);
  } else if (idLen === 4) {
    dvcBuf.writeUInt32LE(channelId, 1);
  }

  dvcBuf.writeUInt32LE(status >>> 0, 1 + idLen);

  // Envolver en CHANNEL_PDU_HEADER (8 bytes)
  const channelPdu = Buffer.alloc(8 + dvcLen);
  channelPdu.writeUInt32LE(dvcLen, 0);
  channelPdu.writeUInt32LE(CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST, 4);
  dvcBuf.copy(channelPdu, 8);

  return channelPdu;
}

/**
 * Construye DVC_DATA PDU (MS-RDPEDYC 2.2.3.1)
 * @param {number} cbId 
 * @param {number} channelId 
 * @param {Buffer} data 
 * @returns {Buffer}
 */
function buildDvcDataResponse(cbId, channelId, data) {
  let idLen = 1;
  if (cbId === 1) idLen = 2;
  else if (cbId === 2) idLen = 4;

  const dvcLen = 1 + idLen + (data ? data.length : 0);
  const dvcBuf = Buffer.alloc(dvcLen);
  dvcBuf[0] = (DVC_CMD_DATA << 4) | (cbId & 0x03);

  if (idLen === 1) {
    dvcBuf.writeUInt8(channelId, 1);
  } else if (idLen === 2) {
    dvcBuf.writeUInt16LE(channelId, 1);
  } else if (idLen === 4) {
    dvcBuf.writeUInt32LE(channelId, 1);
  }

  if (data && data.length > 0) {
    data.copy(dvcBuf, 1 + idLen);
  }

  const channelPdu = Buffer.alloc(8 + dvcLen);
  channelPdu.writeUInt32LE(dvcLen, 0);
  channelPdu.writeUInt32LE(CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST, 4);
  dvcBuf.copy(channelPdu, 8);

  return channelPdu;
}

/**
 * Construye DVC_CAPABILITIES_RSP (MS-RDPEDYC 2.2.1.2)
 * Soporta V1 (4 bytes), V2 (8 bytes) y V3 (12 bytes)
 * @param {number} version 
 * @param {number} [sp] 
 * @param {number} [maxDataSize] 
 * @param {number} [flags] 
 * @returns {Buffer}
 */
function buildDvcCapabilitiesResponse(version = 1, sp = 0, maxDataSize = 1600, flags = 0) {
  let dvcBuf;
  if (version === 3) {
    dvcBuf = Buffer.alloc(12);
    dvcBuf[0] = (DVC_CMD_CAPS << 4) | ((sp & 0x03) << 2);
    dvcBuf[1] = 0x00; // pad8
    dvcBuf.writeUInt16LE(3, 2); // Version = 3
    dvcBuf.writeUInt32LE(maxDataSize || 1600, 4);
    dvcBuf.writeUInt32LE(flags || 0, 8);
  } else if (version === 2) {
    dvcBuf = Buffer.alloc(8);
    dvcBuf[0] = (DVC_CMD_CAPS << 4) | ((sp & 0x03) << 2);
    dvcBuf[1] = 0x00; // pad8
    dvcBuf.writeUInt16LE(2, 2); // Version = 2
    dvcBuf.writeUInt16LE(maxDataSize || 1600, 4);
    dvcBuf.writeUInt16LE(0, 6);
  } else {
    dvcBuf = Buffer.alloc(4);
    dvcBuf[0] = 0x50; // Cmd = 0x05, cbId = 0, Sp = 0
    dvcBuf[1] = 0x00; // pad8
    dvcBuf.writeUInt16LE(1, 2); // Version = 1
  }

  const channelPdu = Buffer.alloc(8 + dvcBuf.length);
  channelPdu.writeUInt32LE(dvcBuf.length, 0);
  channelPdu.writeUInt32LE(CHANNEL_FLAG_FIRST | CHANNEL_FLAG_LAST, 4);
  dvcBuf.copy(channelPdu, 8);

  return channelPdu;
}

/**
 * Procesa peticiones DVC de Wallix/RDS y genera respuestas inmediatas
 * @param {number} mcsChannelId
 * @param {number} initiator
 * @param {Buffer} userData
 * @param {{ allowDisplayControl?: boolean, allowGraphics?: boolean,
 *           allowAudio?: boolean, bastionStub?: boolean, activeDvcChannels?: Map }} [options]
 * @returns {{ handled: boolean, forward: boolean, replies: Buffer[], note: string|null }}
 */
function handleDvcRequest(mcsChannelId, initiator, userData, options = {}) {
  const activeDvcChannels = resolveActiveDvcMap(options);
  // IronRDP en esta sesion envia initiator 0 (se ve en cliprdr y en el canal IO). Sustituirlo
  // por 1002 hacia que Wallix tirara las respuestas DVC, el servidor reintentaba Geometry/Audio
  // y DisplayControl se iba al timeout de 20-30 s.
  const effectiveInitiator = initiator == null ? 0 : initiator;

  // Cmd solo es fiable con FLAG_FIRST (en continuaciones el byte 8 es payload).
  const peekCmd = isChannelPduFirst(userData) ? peekDvcCmd(userData) : null;
  // El WASM vendor no implementa DataCompressed / DataFirstCompressed.
  if (isCompressedDvcCmd(peekCmd)) {
    return dvcReplyResult(
      [],
      `dvc-compressed-drop cmd=0x${peekCmd.toString(16)} (${userData.length}B; IronRDP no soporta DynVC comprimido)`
    );
  }
  // Soft-Sync Request: respuesta local Length=0. Cmd desconocido (0x0a+): NUNCA al WASM.
  if (peekCmd === DVC_CMD_SOFT_SYNC_REQUEST) {
    const mcsPacket = buildMcsSendDataRequest(
      effectiveInitiator,
      mcsChannelId,
      buildDvcSoftSyncResponse()
    );
    return dvcReplyResult([mcsPacket], 'dvc-soft-sync-response (0ms local)');
  }
  if (peekCmd === DVC_CMD_SOFT_SYNC_RESPONSE) {
    return dvcReplyResult([], 'dvc-soft-sync-response-drop');
  }
  if (peekCmd != null && !isIronRdpKnownDvcCmd(peekCmd)) {
    return dvcReplyResult(
      [],
      `dvc-unsupported-cmd-drop cmd=0x${peekCmd.toString(16)} (${userData.length}B; IronRDP invalid Cmd)`
    );
  }

  // Fragmentos CHANNEL_PDU: con EGFX/DisplayControl no se interpretan aqui.
  // Un CREATE de Graphics a medias mal parseado + NOT_SUPPORTED tumba EGFX
  // (Wallix no reabre Graphics y el salto se va a bitmap con esperas de 20-30 s).
  if (wantsDynvcPassthrough(options) && !isCompleteChannelPdu(userData)) {
    return {
      handled: false,
      forward: false,
      replies: [],
      note: 'dvc-fragment-passthrough'
    };
  }

  const parsed = parseDvcPdu(userData);
  if (!parsed) {
    return { handled: false, forward: false, replies: [], note: null };
  }

  if (parsed.type === 'create-req') {
    const channelName = parsed.channelName || '';
    // CREATE sin nombre usable: casi seguro fragmento mal clasificado como completo.
    if (wantsDynvcPassthrough(options) && !channelName) {
      return {
        handled: false,
        forward: false,
        replies: [],
        note: 'dvc-create-empty-name-passthrough'
      };
    }
    activeDvcChannels.set(parsed.channelId, channelName);

    if (shouldForwardDvcChannel(channelName, options)) {
      return dvcForwardResult(`dvc-forward ch=${parsed.channelId} "${channelName}"`);
    }

    const isEcho = isEchoName(channelName);
    const isStub = shouldStubAcceptDvc(channelName, options);
    const status = (isEcho || isStub) ? STATUS_SUCCESS : STATUS_NOT_SUPPORTED;
    const respPdu = buildDvcCreateResponse(parsed.cbId, parsed.channelId, status);
    const mcsPacket = buildMcsSendDataRequest(effectiveInitiator, mcsChannelId, respPdu);

    return dvcReplyResult(
      [mcsPacket],
      isEcho
        ? `dvc-accept ch=${parsed.channelId} "${channelName}" (0ms ok)`
        : isStub
          ? `dvc-accept-stub ch=${parsed.channelId} "${channelName}" (0ms SUCCESS local)`
          : `dvc-reject ch=${parsed.channelId} "${channelName}" (0ms fast fallback)`
    );
  }

  // CREATE_RSP del servidor es inusual; no lo absorbemos como create-req.
  if (parsed.type === 'create-rsp') {
    return {
      handled: false,
      forward: false,
      replies: [],
      note: `dvc-create-rsp ch=${parsed.channelId} status=0x${(parsed.status >>> 0).toString(16)}`
    };
  }

  if (parsed.type === 'data') {
    // ID imposible: basura de un fragmento mal parseado. Passthrough al WASM
    // solo si no es DynVC comprimido (ya filtrado arriba por peekCmd).
    if (typeof parsed.channelId === 'number' && parsed.channelId > MAX_PLAUSIBLE_DVC_CHANNEL_ID) {
      return {
        handled: false,
        forward: false,
        replies: [],
        note: `dvc-data-id-implausible ch=${parsed.channelId}`
      };
    }
    const chName = activeDvcChannels.get(parsed.channelId) || '';
    const kind = parsed.cmd === DVC_CMD_DATA_FIRST || parsed.cmd === DVC_CMD_DATA_FIRST_COMPRESSED
      ? 'data-first'
      : 'data';
    if (isEchoName(chName)) {
      const respPdu = buildDvcDataResponse(parsed.cbId, parsed.channelId, parsed.data);
      const mcsPacket = buildMcsSendDataRequest(effectiveInitiator, mcsChannelId, respPdu);
      return dvcReplyResult(
        [mcsPacket],
        `dvc-echo-reply ch=${parsed.channelId} (${parsed.data.length}B)`
      );
    }

    if (shouldForwardDvcChannel(chName, options)) {
      const totalHint = parsed.totalLength != null ? ` total=${parsed.totalLength}` : '';
      return dvcForwardResult(
        `dvc-forward-${kind} ch=${parsed.channelId} "${chName}" (${parsed.data.length}B${totalHint})`
      );
    }

    // Canal ya visto (rechazado o stub): NUNCA reenviar su DATA al WASM.
    // Antes, con allowGraphics, el DATA de Camera/Telemetry iba al WASM y
    // DataCompressed tumbaba la sesion / alargaba la espera.
    if (chName) {
      return dvcReplyResult(
        [],
        `dvc-${kind} ch=${parsed.channelId} "${chName}" (${parsed.data.length}B absorbed)`
      );
    }

    // Solo canal desconocido (CREATE lo vio solo el WASM): reenviar sin comprimir.
    if (wantsDynvcPassthrough(options)) {
      return dvcForwardResult(
        `dvc-forward-${kind}-unknown ch=${parsed.channelId} (${parsed.data.length}B)`
      );
    }

    return dvcReplyResult(
      [],
      `dvc-${kind} ch=${parsed.channelId} "${chName}" (${parsed.data.length}B absorbed)`
    );
  }

  if (parsed.type === 'caps-req') {
    // EGFX/DisplayControl/Audio: reenviar CAPS al WASM (estado del cliente) Y
    // responder ya al servidor (0 ms). Si solo se reenvio, Wallix/RDS encadenaba
    // CREATE mientras el CapsResponse del WASM iba por el WS y el salto tardaba.
    // El CapsResponse duplicado del WASM se descarta en el filtro cliente.
    if (options.allowGraphics === true || options.allowDisplayControl === true || options.allowAudio === true) {
      const respPdu = buildDvcCapabilitiesResponse(parsed.version, parsed.sp, parsed.maxDataSize, parsed.flags);
      const mcsPacket = buildMcsSendDataRequest(effectiveInitiator, mcsChannelId, respPdu);
      return {
        handled: true,
        forward: true,
        replies: [mcsPacket],
        note: `dvc-forward-caps-quick v=${parsed.version}`,
        capsQuickReply: true
      };
    }
    const respPdu = buildDvcCapabilitiesResponse(parsed.version, parsed.sp, parsed.maxDataSize, parsed.flags);
    const mcsPacket = buildMcsSendDataRequest(effectiveInitiator, mcsChannelId, respPdu);
    return dvcReplyResult([mcsPacket], `dvc-caps v=${parsed.version} (len=${respPdu.length}B)`);
  }

  if (parsed.type === 'close') {
    const chName = activeDvcChannels.get(parsed.channelId) || '';
    activeDvcChannels.delete(parsed.channelId);
    if (shouldForwardDvcChannel(chName, options)) {
      return dvcForwardResult(`dvc-forward-close ch=${parsed.channelId}`);
    }
    return dvcReplyResult([], `dvc-close ch=${parsed.channelId}`);
  }

  // dvc-other u otros: absorber (el passthrough del filtro ya no reenvia handled:false).
  return dvcReplyResult(
    [],
    `dvc-unsupported-cmd-drop cmd=0x${(parsed.cmd >>> 0).toString(16)} (${userData.length}B)`
  );
}

module.exports = {
  DVC_CMD_CREATE,
  DVC_CMD_CREATE_REQ,
  DVC_CMD_CREATE_RSP,
  DVC_CMD_DATA_FIRST,
  DVC_CMD_DATA,
  DVC_CMD_CLOSE,
  DVC_CMD_CAPS,
  DVC_CMD_DATA_FIRST_COMPRESSED,
  DVC_CMD_DATA_COMPRESSED,
  DVC_CMD_SOFT_SYNC_REQUEST,
  DVC_CMD_SOFT_SYNC_RESPONSE,
  STATUS_SUCCESS,
  STATUS_NOT_SUPPORTED,
  STATUS_UNSUCCESSFUL,
  parseDvcPdu,
  buildDvcCreateResponse,
  buildDvcDataResponse,
  buildDvcCapabilitiesResponse,
  handleDvcRequest,
  clearActiveDvcChannels,
  isCompleteChannelPdu,
  isDisplayControlName,
  isGraphicsChannelName,
  isAudioPlaybackName
};
