/**
 * rdp-dynvc.js
 * Manejo y respuesta inmediata a peticiones DYNVC (Dynamic Virtual Channels - MS-RDPEDYC).
 * 
 * 🚀 Característica Clave: Responde instantáneamente (0 ms) con STATUS_NOT_SUPPORTED (0xC00000BB)
 * o STATUS_UNSUCCESSFUL (0xC0000001) a las solicitudes DVC_CREATE_REQ de canales no soportados
 * (AUDIO_PLAYBACK_DVC, RDCamera, RDS::Input, RDS::DisplayControl, etc.).
 * 
 * Esto ELIMINA de forma definitiva los retardos/timeouts de 20 a 30 segundos (pantalla negra)
 * provocados por bastiones Wallix y servidores Windows RDS al esperar respuesta del cliente.
 */

'use strict';

const { isChannelPduHeader, buildMcsSendDataRequest } = require('./rdp-autodetect');

const DVC_CMD_CREATE_REQ = 0x01;
const DVC_CMD_CREATE_RSP = 0x02;
const DVC_CMD_DATA_FIRST = 0x03;
const DVC_CMD_DATA = 0x04;
const DVC_CMD_CAPS = 0x05;
const DVC_CMD_CLOSE = 0x06;

const STATUS_SUCCESS = 0x00000000;
const STATUS_NOT_SUPPORTED = 0xc00000bb;
const STATUS_UNSUCCESSFUL = 0xc0000001;

const CHANNEL_FLAG_FIRST = 0x01;
const CHANNEL_FLAG_LAST = 0x02;

// Mapa de canales DVC conocidos (channelId -> channelName)
const activeDvcChannels = new Map();

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

  if (cmd === DVC_CMD_CREATE_REQ) {
    // DVC_CREATE_REQ: cbId determina longitud del ChannelId (0=1B, 1=2B, 2=4B)
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

    const rawName = dvcPayload.subarray(1 + idLen);
    const nullIdx = rawName.indexOf(0);
    const channelName = (nullIdx >= 0 ? rawName.subarray(0, nullIdx) : rawName).toString('ascii');

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

  if (cmd === DVC_CMD_DATA || cmd === DVC_CMD_DATA_FIRST) {
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

    const data = dvcPayload.subarray(1 + idLen);
    return {
      type: 'data',
      cmd,
      cbId,
      idLen,
      channelId,
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

  // Header byte: Cmd = DVC_CMD_CREATE_RSP (0x02), Sp = 0, cbId
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
 * @returns {{ handled: boolean, replies: Buffer[], note: string|null }}
 */
function handleDvcRequest(mcsChannelId, initiator, userData) {
  const parsed = parseDvcPdu(userData);
  if (!parsed) {
    return { handled: false, replies: [], note: null };
  }

  const effectiveInitiator = initiator > 0 ? initiator : 1002;

  if (parsed.type === 'create-req') {
    const chUpper = (parsed.channelName || '').toUpperCase();
    activeDvcChannels.set(parsed.channelId, parsed.channelName);

    // Responder STATUS_SUCCESS a ECHO, y STATUS_NOT_SUPPORTED a los demás en 0ms
    // para que el servidor no espere 40 segundos de timeout.
    const isEcho = chUpper.includes('ECHO');
    const status = isEcho ? STATUS_SUCCESS : STATUS_NOT_SUPPORTED;

    const respPdu = buildDvcCreateResponse(parsed.cbId, parsed.channelId, status);
    const mcsPacket = buildMcsSendDataRequest(effectiveInitiator, mcsChannelId, respPdu);

    return {
      handled: true,
      replies: [mcsPacket],
      note: isEcho
        ? `dvc-accept ch=${parsed.channelId} "${parsed.channelName}" (0ms ok)`
        : `dvc-reject ch=${parsed.channelId} "${parsed.channelName}" (0ms fast fallback)`
    };
  }

  if (parsed.type === 'data') {
    const chName = activeDvcChannels.get(parsed.channelId) || '';
    if (chName.toUpperCase().includes('ECHO')) {
      // MS-RDPEECO: responder con el mismo payload al ping Echo
      const respPdu = buildDvcDataResponse(parsed.cbId, parsed.channelId, parsed.data);
      const mcsPacket = buildMcsSendDataRequest(effectiveInitiator, mcsChannelId, respPdu);

      return {
        handled: true,
        replies: [mcsPacket],
        note: `dvc-echo-reply ch=${parsed.channelId} (${parsed.data.length}B)`
      };
    }

    return {
      handled: true,
      replies: [],
      note: `dvc-data ch=${parsed.channelId} "${chName}" (${parsed.data.length}B absorbed)`
    };
  }

  if (parsed.type === 'caps-req') {
    const respPdu = buildDvcCapabilitiesResponse(parsed.version, parsed.sp, parsed.maxDataSize, parsed.flags);
    const mcsPacket = buildMcsSendDataRequest(effectiveInitiator, mcsChannelId, respPdu);

    return {
      handled: true,
      replies: [mcsPacket],
      note: `dvc-caps v=${parsed.version} (len=${respPdu.length}B)`
    };
  }

  if (parsed.type === 'close') {
    activeDvcChannels.delete(parsed.channelId);
    return {
      handled: true,
      replies: [],
      note: `dvc-close ch=${parsed.channelId}`
    };
  }

  return {
    handled: true,
    replies: [],
    note: `dvc-ignore cmd=0x${parsed.cmd.toString(16)}`
  };
}

module.exports = {
  DVC_CMD_CREATE_REQ,
  DVC_CMD_CREATE_RSP,
  DVC_CMD_DATA,
  DVC_CMD_CAPS,
  DVC_CMD_CLOSE,
  STATUS_SUCCESS,
  STATUS_NOT_SUPPORTED,
  STATUS_UNSUCCESSFUL,
  parseDvcPdu,
  buildDvcCreateResponse,
  buildDvcDataResponse,
  buildDvcCapabilitiesResponse,
  handleDvcRequest
};
