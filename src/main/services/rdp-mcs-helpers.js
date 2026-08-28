/**
 * Helpers MCS / TS_UD_CS_CORE (MS-RDPBCGR).
 * CS_CORE type = 0xC001. serverSelectedProtocol esta en offset 212 si length >= 216.
 */

'use strict';

const { parseMcsSendData } = require('./rdp-autodetect');

const CS_CORE = 0xc001;
const CS_NET = 0xc003;
const SERVER_SELECTED_PROTOCOL_OFFSET = 212;
const CS_CORE_MIN_LEN_WITH_PROTOCOL = 216;
const CLIENT_BUILD_OFFSET = 20;
const KEYBOARD_LAYOUT_OFFSET = 16;
const DESKTOP_WIDTH_OFFSET = 8;
const DESKTOP_HEIGHT_OFFSET = 10;
// Build tipico Windows 10 20H2 / aceptado por la mayoria de bastiones
const DEFAULT_CLIENT_BUILD = 19041;
const DEFAULT_KEYBOARD_LAYOUT = 0x00000409;

/** Multiplo de 4 exacto (MS-RDPBCGR). */
function alignDesktopDimension(n) {
  const base = Math.max(1, n >>> 0);
  return (base + 3) & ~3;
}

/**
 * Localiza el bloque TS_UD_CS_NET en un TPKT/MCS Connect Initial.
 * @param {Buffer} buf
 * @returns {string[]} Lista de nombres de canales estáticos solicitados (ej: ['cliprdr', 'drdynvc'])
 */
function findClientNetworkChannels(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return [];

  const duca = buf.indexOf(Buffer.from('Duca'));
  const start = duca >= 0 ? duca : 0;

  for (let i = start; i + 8 <= buf.length; i++) {
    if (buf.readUInt16LE(i) !== CS_NET) continue;
    const length = buf.readUInt16LE(i + 2);
    if (length < 8 || i + length > buf.length) continue;
    const count = buf.readUInt32LE(i + 4);
    if (count < 1 || count > 32) continue;
    if (i + 8 + count * 12 > buf.length) continue;

    const channels = [];
    for (let c = 0; c < count; c++) {
      const off = i + 8 + c * 12;
      const rawName = buf.subarray(off, off + 8).toString('ascii');
      const nullIdx = rawName.indexOf('\0');
      const name = (nullIdx >= 0 ? rawName.slice(0, nullIdx) : rawName).trim();
      if (name) {
        channels.push(name);
      }
    }
    return channels;
  }
  return [];
}

/**
 * Localiza el bloque TS_UD_CS_CORE en un TPKT/MCS Connect Initial.
 * @returns {{ offset: number, length: number, serverSelectedProtocol: number|null }|null}
 */
function findClientCoreData(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return null;

  // Preferir el bloque tras la clave H.221 "Duca" para evitar falsos positivos
  const duca = buf.indexOf(Buffer.from('Duca'));
  const start = duca >= 0 ? duca : 0;

  for (let i = start; i + 8 <= buf.length; i++) {
    if (buf.readUInt16LE(i) !== CS_CORE) continue;
    const length = buf.readUInt16LE(i + 2);
    if (length < 132 || length > 512) continue;
    if (i + length > buf.length) continue;
    // version RDP tipico 0x00080004 (o cercano)
    const version = buf.readUInt32LE(i + 4) >>> 0;
    if ((version & 0xffff0000) !== 0x00080000 && version !== 0x00080001) continue;

    let serverSelectedProtocol = null;
    if (length >= CS_CORE_MIN_LEN_WITH_PROTOCOL) {
      serverSelectedProtocol = buf.readUInt32LE(i + SERVER_SELECTED_PROTOCOL_OFFSET) >>> 0;
    }

    return { offset: i, length, serverSelectedProtocol, version };
  }
  return null;
}

/**
 * Asegura que serverSelectedProtocol del CS_CORE coincida con el negociado en X.224.
 * Si el campo no existe (length < 216), no modifica (ampliar el bloque rompe longitudes ASN.1/PER).
 */
function ensureMcsServerSelectedProtocol(buf, selectedProtocol) {
  const proto = selectedProtocol >>> 0;
  const found = findClientCoreData(buf);
  if (!found) {
    return { buf, patched: false, reason: 'cs-core-not-found' };
  }

  if (found.length < CS_CORE_MIN_LEN_WITH_PROTOCOL) {
    return {
      buf,
      patched: false,
      reason: 'cs-core-too-short',
      previous: null,
      coreOffset: found.offset,
      coreLength: found.length
    };
  }

  const previous = found.serverSelectedProtocol;
  if (previous === proto) {
    return {
      buf,
      patched: false,
      reason: 'already-correct',
      previous,
      coreOffset: found.offset,
      coreLength: found.length
    };
  }

  const out = Buffer.from(buf);
  out.writeUInt32LE(proto, found.offset + SERVER_SELECTED_PROTOCOL_OFFSET);
  return {
    buf: out,
    patched: true,
    reason: 'patched',
    previous,
    coreOffset: found.offset,
    coreLength: found.length
  };
}

/**
 * Ajustes CS_CORE para bastiones estrictos (Wallix, etc.):
 * - clientBuild 0 suele provocar reset silencioso
 * - keyboardLayout 0 tambien es sospechoso; MSTSC usa 0x409
 */
function hardenClientCoreData(buf, options = {}) {
  const found = findClientCoreData(buf);
  if (!found || found.length < 68) {
    return { buf, patched: false, changes: [], reason: 'cs-core-not-found' };
  }

  const out = Buffer.from(buf);
  const base = found.offset;
  const changes = [];

  const clientBuild = out.readUInt32LE(base + CLIENT_BUILD_OFFSET) >>> 0;
  const wantBuild = options.clientBuild != null ? options.clientBuild : DEFAULT_CLIENT_BUILD;
  if (clientBuild === 0) {
    out.writeUInt32LE(wantBuild >>> 0, base + CLIENT_BUILD_OFFSET);
    changes.push(`clientBuild 0->${wantBuild}`);
  }

  const kbd = out.readUInt32LE(base + KEYBOARD_LAYOUT_OFFSET) >>> 0;
  const wantKbd = options.keyboardLayout != null ? options.keyboardLayout : DEFAULT_KEYBOARD_LAYOUT;
  if (kbd === 0) {
    out.writeUInt32LE(wantKbd >>> 0, base + KEYBOARD_LAYOUT_OFFSET);
    changes.push(`keyboardLayout 0->0x${wantKbd.toString(16)}`);
  }

  if (found.length >= 12) {
    const dw = out.readUInt16LE(base + DESKTOP_WIDTH_OFFSET);
    const dh = out.readUInt16LE(base + DESKTOP_HEIGHT_OFFSET);
    const wantW = alignDesktopDimension(dw);
    const wantH = alignDesktopDimension(dh);
    if (wantW !== dw) {
      out.writeUInt16LE(wantW, base + DESKTOP_WIDTH_OFFSET);
      changes.push(`desktopWidth ${dw}->${wantW}`);
    }
    if (wantH !== dh) {
      out.writeUInt16LE(wantH, base + DESKTOP_HEIGHT_OFFSET);
      changes.push(`desktopHeight ${dh}->${wantH}`);
    }
  }

  return {
    buf: out,
    patched: changes.length > 0,
    changes,
    reason: changes.length ? 'hardened' : 'no-change',
    clientBuildBefore: clientBuild,
    keyboardLayoutBefore: kbd
  };
}

/**
 * Wallix redemption (rdpproxy) valida estrictamente:
 *   connectPDU_length == userData_length + 14
 * IronRDP envia userData_length + 12 (Windows lo tolera; Wallix hace ERR_GCC y cierra).
 * Ver GCC::Create_Request_Recv en wallix/redemption.
 */
function fixWallixGccConnectPduLength(buf) {
  if (!Buffer.isBuffer(buf)) return { buf, patched: false, reason: 'not-buffer' };

  const duca = buf.indexOf(Buffer.from('Duca'));
  if (duca < 0 || duca + 6 > buf.length) {
    return { buf, patched: false, reason: 'duca-not-found' };
  }

  let userDataLen;
  const udLenPos = duca + 4;
  if (buf[udLenPos] & 0x80) {
    userDataLen = ((buf[udLenPos] & 0x3f) << 8) | buf[udLenPos + 1];
  } else {
    userDataLen = buf[udLenPos];
  }

  const expectedConnectPduLen = userDataLen + 14;

  const oid = Buffer.from([0x00, 0x14, 0x7c, 0x00, 0x01]);
  const oidAt = buf.indexOf(oid);
  if (oidAt < 0 || oidAt > duca) {
    return { buf, patched: false, reason: 'oid-not-found' };
  }

  const lp = oidAt + oid.length;
  if (lp >= buf.length) return { buf, patched: false, reason: 'len-oob' };

  const out = Buffer.from(buf);
  let oldLen;
  if (out[lp] & 0x80) {
    oldLen = ((out[lp] & 0x3f) << 8) | out[lp + 1];
    if (expectedConnectPduLen < 0x80 || expectedConnectPduLen > 0x3fff) {
      return { buf, patched: false, reason: 'len-out-of-range', oldLen, expectedConnectPduLen };
    }
    if (oldLen === expectedConnectPduLen) {
      return { buf, patched: false, reason: 'already-ok', oldLen, expectedConnectPduLen };
    }
    out[lp] = 0x80 | ((expectedConnectPduLen >> 8) & 0x3f);
    out[lp + 1] = expectedConnectPduLen & 0xff;
  } else {
    oldLen = out[lp];
    if (expectedConnectPduLen < 0x80) {
      if (oldLen === expectedConnectPduLen) {
        return { buf, patched: false, reason: 'already-ok', oldLen, expectedConnectPduLen };
      }
      out[lp] = expectedConnectPduLen;
    } else {
      return { buf, patched: false, reason: 'need-2byte-len', oldLen, expectedConnectPduLen };
    }
  }

  return {
    buf: out,
    patched: true,
    reason: 'wallix-gcc-len',
    oldLen,
    newLen: expectedConnectPduLen,
    userDataLen
  };
}

/**
 * Aplica parches MCS post-TLS para path SSL/TLS Direct / Wallix.
 */
function prepareMcsConnectInitial(buf, selectedProtocol) {
  let current = Buffer.from(buf);
  const notes = [];

  if (selectedProtocol != null) {
    const proto = ensureMcsServerSelectedProtocol(current, selectedProtocol);
    if (proto.patched) {
      current = proto.buf;
      notes.push(`serverSelectedProtocol 0x${(proto.previous >>> 0).toString(16)}->0x${(selectedProtocol >>> 0).toString(16)}`);
    } else if (proto.reason === 'already-correct') {
      notes.push('serverSelectedProtocol ok');
    } else {
      notes.push(`serverSelectedProtocol ${proto.reason}`);
    }
  }

  const hard = hardenClientCoreData(current);
  if (hard.patched) {
    current = hard.buf;
    notes.push(...hard.changes);
  }

  const gccLen = fixWallixGccConnectPduLength(current);
  if (gccLen.patched) {
    current = gccLen.buf;
    notes.push(`Wallix GCC connectPDU ${gccLen.oldLen}->${gccLen.newLen} (udata+14)`);
  } else if (gccLen.reason === 'already-ok') {
    notes.push('Wallix GCC connectPDU ok');
  } else {
    notes.push(`Wallix GCC connectPDU ${gccLen.reason}`);
  }

  return { buf: current, notes, core: findClientCoreData(current) };
}

/**
 * Inyecta INFO_AUTOLOGON (0x00000008) en TS_INFO_PACKET (MS-RDPBCGR 2.2.1.11.1.1)
 * para que Wallix/Windows Server inicie sesión automáticamente con la contraseña guardada
 * sin mostrar la pantalla interactiva de selección de usuario / petición de contraseña.
 */
function patchInfoAutoLogon(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 32) return { buf, patched: false };
  const parsed = parseMcsSendData(buf);
  if (!parsed || parsed.userData.length < 26) return { buf, patched: false };

  const u = parsed.userData;
  // Offset 4 en userData (tras length u32 / sec header u32)
  for (const off of [4, 0, 8]) {
    if (off + 20 > u.length) continue;
    const flags = u.readUInt32LE(off + 4);
    // INFO_UNICODE (0x10) + INFO_MOUSE (0x01)
    if ((flags & 0x0011) === 0x0011 && (flags & 0xff000000) === 0) {
      const cbUserName = u.readUInt16LE(off + 10);
      const cbPassword = u.readUInt16LE(off + 12);
      if (cbUserName > 0 && cbPassword > 0) {
        if ((flags & 0x0008) === 0) {
          const out = Buffer.from(buf);
          const dataOff = parsed.dataOff + off + 4;
          out.writeUInt32LE(flags | 0x0008, dataOff);
          return { buf: out, patched: true, oldFlags: flags, newFlags: flags | 0x0008 };
        }
        return { buf, patched: false, reason: 'already-autologon' };
      }
    }
  }
  return { buf, patched: false };
}

module.exports = {
  CS_CORE,
  CS_NET,
  SERVER_SELECTED_PROTOCOL_OFFSET,
  alignDesktopDimension,
  DEFAULT_CLIENT_BUILD,
  DEFAULT_KEYBOARD_LAYOUT,
  findClientCoreData,
  findClientNetworkChannels,
  ensureMcsServerSelectedProtocol,
  hardenClientCoreData,
  fixWallixGccConnectPduLength,
  prepareMcsConnectInitial,
  patchInfoAutoLogon
};
