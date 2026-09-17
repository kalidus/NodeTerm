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
 * Asegura que las opciones de los canales de TS_UD_CS_NET incluyan CHANNEL_OPTION_INITIALIZED (0x80000000)
 * y flags estándar según MS-RDPBCGR 2.2.1.3.4 (requerido por proxies RDP como Wallix).
 */
function patchClientNetworkChannelOptions(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return { buf, patched: false, changes: [] };

  const duca = buf.indexOf(Buffer.from('Duca'));
  const start = duca >= 0 ? duca : 0;

  for (let i = start; i + 8 <= buf.length; i++) {
    if (buf.readUInt16LE(i) !== CS_NET) continue;
    const length = buf.readUInt16LE(i + 2);
    if (length < 8 || i + length > buf.length) continue;
    const count = buf.readUInt32LE(i + 4);
    if (count < 1 || count > 32) continue;
    if (i + 8 + count * 12 > buf.length) continue;

    let out = null;
    const changes = [];

    for (let c = 0; c < count; c++) {
      const off = i + 8 + c * 12;
      const rawName = buf.subarray(off, off + 8).toString('ascii');
      const nullIdx = rawName.indexOf('\0');
      const name = (nullIdx >= 0 ? rawName.slice(0, nullIdx) : rawName).trim();
      const currentOpt = buf.readUInt32LE(off + 8);

      // CHANNEL_OPTION_INITIALIZED = 0x80000000 (MS-RDPBCGR: "This flag MUST be set", exigido por Wallix).
      // El resto de opciones se preservan tal cual las declara IronRDP: si aquí se quitara
      // CHANNEL_OPTION_SHOW_PROTOCOL, IronRDP seguiría marcando CHANNEL_FLAG_SHOW_PROTOCOL (0x10)
      // en sus PDUs y el servidor vería una incoherencia de protocolo.
      const standardOpt = (currentOpt | 0x80000000) >>> 0;
      if (currentOpt !== standardOpt) {
        if (!out) out = Buffer.from(buf);
        out.writeUInt32LE(standardOpt, off + 8);
        changes.push(`channel '${name}' opt 0x${currentOpt.toString(16)}->0x${standardOpt.toString(16)}`);
      }
    }

    if (changes.length > 0) {
      return { buf: out, patched: true, changes };
    }
    return { buf, patched: false, changes: [], reason: 'already-correct' };
  }

  return { buf, patched: false, changes: [], reason: 'cs-net-not-found' };
}

const CHANNEL_DEF_LEN = 12;
const CHANNEL_OPTION_INITIALIZED = 0x80000000;
const CHANNEL_OPTION_COMPRESS_RDP = 0x00800000;

function findClientNetworkBlock(buf) {
  const duca = buf.indexOf(Buffer.from('Duca'));
  const start = duca >= 0 ? duca : 0;

  for (let i = start; i + 8 <= buf.length; i++) {
    if (buf.readUInt16LE(i) !== CS_NET) continue;
    const length = buf.readUInt16LE(i + 2);
    if (length < 8 || i + length > buf.length) continue;
    const count = buf.readUInt32LE(i + 4);
    if (count < 1 || count > 32) continue;
    if (i + 8 + count * CHANNEL_DEF_LEN > buf.length) continue;
    return { offset: i, length, count, ducaOffset: duca };
  }
  return null;
}

function readBerLength(buf, off) {
  if (off >= buf.length) return null;
  const first = buf[off];
  if ((first & 0x80) === 0) return { value: first, size: 1 };
  const n = first & 0x7f;
  if (n < 1 || n > 2 || off + n >= buf.length) return null;
  let value = 0;
  for (let i = 1; i <= n; i++) value = (value << 8) | buf[off + i];
  return { value, size: 1 + n };
}

// Reescribe una longitud BER conservando el ancho original. Devuelve false si el valor nuevo no
// cabe: ensanchar el campo desplazaria todo el buffer y es preferible abortar el parche.
function writeBerLength(buf, off, value) {
  const current = readBerLength(buf, off);
  if (!current) return false;
  if (current.size === 1) {
    if (value > 0x7f) return false;
    buf[off] = value;
    return true;
  }
  if (current.size === 2) {
    if (value > 0xff) return false;
    buf[off + 1] = value;
    return true;
  }
  if (value > 0xffff) return false;
  buf.writeUInt16BE(value, off + 1);
  return true;
}

/**
 * Añade canales virtuales estáticos a TS_UD_CS_NET de un MCS Connect Initial.
 *
 * Wallix entrega cliprdr por un canal MCS que no es el que él mismo asignó, y el destino cierra
 * la sesión al recibir datos del cliente por el canal negociado. IronRDP declara un solo canal
 * mientras los clientes que sí funcionan a través del bastión declaran el juego estándar, así que
 * esto iguala el reparto de canales al de un cliente normal.
 *
 * Los canales nuevos se añaden DETRÁS de los existentes a propósito: IronRDP empareja SC_NET con
 * CS_NET por índice, y meterlos delante le haría confundir su cliprdr con otro canal.
 *
 * Hay que recalcular longitudes anidadas (CS_NET, userData de 'Duca', OCTET STRING de userData,
 * Connect-Initial y TPKT). Se validan todas antes de tocar nada y, si alguna no cuadra o no cabe
 * en su ancho original, se aborta devolviendo el buffer intacto.
 */
function injectClientNetworkChannels(buf, names) {
  const abort = (reason) => ({ buf, patched: false, added: [], reason });

  if (!Buffer.isBuffer(buf)) return abort('not-buffer');
  if (!Array.isArray(names) || names.length === 0) return abort('no-names');

  const block = findClientNetworkBlock(buf);
  if (!block) return abort('cs-net-not-found');
  if (block.ducaOffset < 0) return abort('duca-not-found');

  const present = new Set(findClientNetworkChannels(buf).map((n) => n.toLowerCase()));
  const toAdd = [];
  for (const raw of names) {
    const name = String(raw || '').trim();
    // El nombre ocupa 8 bytes con terminador nulo, asi que el limite real son 7 caracteres
    if (!name || name.length > 7) continue;
    if (present.has(name.toLowerCase())) continue;
    present.add(name.toLowerCase());
    toAdd.push(name);
  }
  if (!toAdd.length) return abort('already-present');
  if (block.count + toAdd.length > 31) return abort('too-many-channels');

  const delta = toAdd.length * CHANNEL_DEF_LEN;

  if (buf.length < 11 || buf[0] !== 0x03) return abort('not-tpkt');
  if (buf.readUInt16BE(2) !== buf.length) return abort('tpkt-len-mismatch');
  if (buf.length + delta > 0xffff) return abort('tpkt-overflow');

  if (buf[7] !== 0x7f || buf[8] !== 0x65) return abort('not-connect-initial');
  const ciLen = readBerLength(buf, 9);
  if (!ciLen || 9 + ciLen.size + ciLen.value !== buf.length) return abort('connect-initial-len');

  // El userData OCTET STRING acaba al final del PDU y su contenido arranca 2 bytes antes del OID
  // de GCC ("00 05" de la clave H.221). Se prueban los tres anchos BER y se valida la longitud.
  const oidAt = buf.indexOf(Buffer.from([0x00, 0x14, 0x7c, 0x00, 0x01]));
  if (oidAt < 6) return abort('gcc-oid-not-found');
  let udTagAt = -1;
  let udLen = null;
  for (const back of [4, 5, 6]) {
    const tag = oidAt - back;
    if (tag < 0 || buf[tag] !== 0x04) continue;
    const len = readBerLength(buf, tag + 1);
    if (!len || tag + 1 + len.size + len.value !== buf.length) continue;
    udTagAt = tag;
    udLen = len;
    break;
  }
  if (udTagAt < 0) return abort('user-data-len-not-found');

  const ducaLenAt = block.ducaOffset + 4;
  if (ducaLenAt + 1 >= buf.length) return abort('duca-len-oob');
  const ducaWide = (buf[ducaLenAt] & 0x80) !== 0;
  const ducaLen = ducaWide
    ? ((buf[ducaLenAt] & 0x3f) << 8) | buf[ducaLenAt + 1]
    : buf[ducaLenAt];
  const newDucaLen = ducaLen + delta;
  if (ducaWide ? newDucaLen > 0x3fff : newDucaLen > 0x7f) return abort('duca-len-overflow');

  const insertAt = block.offset + 8 + block.count * CHANNEL_DEF_LEN;
  const out = Buffer.alloc(buf.length + delta);
  buf.copy(out, 0, 0, insertAt);
  let write = insertAt;
  for (const name of toAdd) {
    // El relleno a 8 bytes y el terminador nulo ya vienen a cero de Buffer.alloc
    out.write(name, write, 'ascii');
    out.writeUInt32LE((CHANNEL_OPTION_INITIALIZED | CHANNEL_OPTION_COMPRESS_RDP) >>> 0, write + 8);
    write += CHANNEL_DEF_LEN;
  }
  buf.copy(out, write, insertAt);

  if (!writeBerLength(out, 9, ciLen.value + delta)) return abort('connect-initial-len-overflow');
  if (!writeBerLength(out, udTagAt + 1, udLen.value + delta)) return abort('user-data-len-overflow');

  if (ducaWide) {
    out[ducaLenAt] = 0x80 | ((newDucaLen >> 8) & 0x3f);
    out[ducaLenAt + 1] = newDucaLen & 0xff;
  } else {
    out[ducaLenAt] = newDucaLen;
  }

  out.writeUInt16LE(block.length + delta, block.offset + 2);
  out.writeUInt32LE(block.count + toAdd.length, block.offset + 4);
  out.writeUInt16BE(out.length, 2);

  return {
    buf: out,
    patched: true,
    added: toAdd,
    reason: 'injected',
    channelCount: block.count + toAdd.length
  };
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
function prepareMcsConnectInitial(buf, selectedProtocol, options = {}) {
  let current = Buffer.from(buf);
  const notes = [];

  // Se inyecta primero: cambia el tamaño del PDU y fixWallixGccConnectPduLength recalcula la
  // longitud del connectPDU a partir del userData ya actualizado.
  if (Array.isArray(options.injectChannels) && options.injectChannels.length) {
    const injected = injectClientNetworkChannels(current, options.injectChannels);
    if (injected.patched) {
      current = injected.buf;
      notes.push(`canales inyectados [${injected.added.join(', ')}] -> count=${injected.channelCount}`);
    } else {
      notes.push(`canales sin inyectar (${injected.reason})`);
    }
  }

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

  const netPatch = patchClientNetworkChannelOptions(current);
  if (netPatch.patched) {
    current = netPatch.buf;
    notes.push(...netPatch.changes);
  }

  return { buf: current, notes, core: findClientCoreData(current) };
}

const PERF_DISABLE_WALLPAPER = 0x00000001;
const PERF_DISABLE_FULLWINDOWDRAG = 0x00000002;
const PERF_DISABLE_MENUANIMATIONS = 0x00000004;
const PERF_DISABLE_THEMING = 0x00000008;
const PERF_DISABLE_CURSOR_SHADOW = 0x00000020;
const PERF_DISABLE_CURSORSETTINGS = 0x00000040;
const PERF_ENABLE_FONT_SMOOTHING = 0x00000080;
const PERF_ENABLE_DESKTOP_COMPOSITION = 0x00000100;

/**
 * Inyecta INFO_AUTOLOGON (0x00000008) y ajusta TS_PERF_FLAGS en TS_INFO_PACKET (MS-RDPBCGR 2.2.1.11.1.1)
 * para inicio de sesión automático y aplicación de flags de rendimiento (wallpaper, fuentes ClearType, etc.)
 */
function patchInfoPacket(buf, options = {}) {
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
      const cbDomain = u.readUInt16LE(off + 8);
      const cbUserName = u.readUInt16LE(off + 10);
      const cbPassword = u.readUInt16LE(off + 12);
      const cbAlternateShell = u.readUInt16LE(off + 14);
      const cbWorkingDir = u.readUInt16LE(off + 16);

      if (cbUserName > 0 && cbPassword > 0) {
        let out = Buffer.from(buf);
        let wasPatched = false;
        const changes = [];

        // 1. Inyectar INFO_AUTOLOGON si no está activo
        if ((flags & 0x0008) === 0) {
          const dataOff = parsed.dataOff + off + 4;
          out.writeUInt32LE(flags | 0x0008, dataOff);
          wasPatched = true;
          changes.push('autologon');
        }

        // 2. Localizar TS_EXTENDED_INFO_PACKET y ajustar performanceFlags
        const extOff = off + 18 + cbDomain + cbUserName + cbPassword + cbAlternateShell + cbWorkingDir;
        if (extOff + 4 <= u.length) {
          const cbClientAddress = u.readUInt16LE(extOff + 2);
          const dirOff = extOff + 4 + cbClientAddress;
          if (dirOff + 2 <= u.length) {
            const cbClientDir = u.readUInt16LE(dirOff);
            const tzOff = dirOff + 2 + cbClientDir;
            const perfFlagsOff = tzOff + 172 + 4; // 172B TimeZone + 4B clientSessionId

            if (perfFlagsOff + 4 <= u.length) {
              const oldPerfFlags = u.readUInt32LE(perfFlagsOff);
              let newPerfFlags = oldPerfFlags;

              if (options.enableWallpaper === true) {
                newPerfFlags &= ~PERF_DISABLE_WALLPAPER;
              } else if (options.enableWallpaper === false) {
                newPerfFlags |= PERF_DISABLE_WALLPAPER;
              }

              if (options.enableFontSmoothing === true) {
                newPerfFlags |= PERF_ENABLE_FONT_SMOOTHING;
              } else if (options.enableFontSmoothing === false) {
                newPerfFlags &= ~PERF_ENABLE_FONT_SMOOTHING;
              }

              if (options.enableTheming === true) {
                newPerfFlags &= ~PERF_DISABLE_THEMING;
              } else if (options.enableTheming === false) {
                newPerfFlags |= PERF_DISABLE_THEMING;
              }

              if (options.enableDesktopComposition === true) {
                newPerfFlags |= PERF_ENABLE_DESKTOP_COMPOSITION;
              } else if (options.enableDesktopComposition === false) {
                newPerfFlags &= ~PERF_ENABLE_DESKTOP_COMPOSITION;
              }

              if (options.enableFullWindowDrag === true) {
                newPerfFlags &= ~PERF_DISABLE_FULLWINDOWDRAG;
              } else if (options.enableFullWindowDrag === false) {
                newPerfFlags |= PERF_DISABLE_FULLWINDOWDRAG;
              }

              if (options.enableMenuAnimations === true) {
                newPerfFlags &= ~PERF_DISABLE_MENUANIMATIONS;
              } else if (options.enableMenuAnimations === false) {
                newPerfFlags |= PERF_DISABLE_MENUANIMATIONS;
              }

              if (newPerfFlags !== oldPerfFlags) {
                const perfDataOff = parsed.dataOff + perfFlagsOff;
                out.writeUInt32LE(newPerfFlags >>> 0, perfDataOff);
                wasPatched = true;
                changes.push(`perfFlags 0x${oldPerfFlags.toString(16)}->0x${newPerfFlags.toString(16)}`);
              }
            }
          }
        }

        return {
          buf: wasPatched ? out : buf,
          patched: wasPatched,
          oldFlags: flags,
          newFlags: flags | 0x0008,
          changes
        };
      }
    }
  }
  return { buf, patched: false, changes: [] };
}

function patchInfoAutoLogon(buf) {
  return patchInfoPacket(buf);
}

module.exports = {
  CS_CORE,
  CS_NET,
  SERVER_SELECTED_PROTOCOL_OFFSET,
  alignDesktopDimension,
  DEFAULT_CLIENT_BUILD,
  DEFAULT_KEYBOARD_LAYOUT,
  PERF_DISABLE_WALLPAPER,
  PERF_DISABLE_FULLWINDOWDRAG,
  PERF_DISABLE_MENUANIMATIONS,
  PERF_DISABLE_THEMING,
  PERF_ENABLE_FONT_SMOOTHING,
  PERF_ENABLE_DESKTOP_COMPOSITION,
  findClientCoreData,
  findClientNetworkChannels,
  patchClientNetworkChannelOptions,
  injectClientNetworkChannels,
  ensureMcsServerSelectedProtocol,
  hardenClientCoreData,
  fixWallixGccConnectPduLength,
  prepareMcsConnectInitial,
  patchInfoPacket,
  patchInfoAutoLogon
};
