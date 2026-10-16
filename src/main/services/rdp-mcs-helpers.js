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

const CHANNEL_DEF_LEN = 12;
const CHANNEL_OPTION_INITIALIZED = 0x80000000;
const CHANNEL_OPTION_ENCRYPT_RDP = 0x40000000;
const CHANNEL_OPTION_COMPRESS_RDP = 0x00800000;
const CHANNEL_OPTION_SHOW_PROTOCOL = 0x00200000;

/**
 * Opciones TS_UD_CS_NET a paridad mstsc (matrix/mstsc-rdp-frio / selector-file-frio).
 * Sin SHOW_PROTOCOL en cliprdr Wallix tiende a saludar CLIPRDR por IO 1003
 * (flags ChanHdr 0x3) en vez del VC nombrado 1006 (0x13).
 */
const MSTSC_CS_NET_OPTIONS = Object.freeze({
  rdpdr: (CHANNEL_OPTION_INITIALIZED | CHANNEL_OPTION_COMPRESS_RDP) >>> 0,
  rdpsnd: (CHANNEL_OPTION_INITIALIZED | CHANNEL_OPTION_ENCRYPT_RDP) >>> 0,
  cliprdr: (CHANNEL_OPTION_INITIALIZED | CHANNEL_OPTION_ENCRYPT_RDP
    | CHANNEL_OPTION_COMPRESS_RDP | CHANNEL_OPTION_SHOW_PROTOCOL) >>> 0,
  drdynvc: (CHANNEL_OPTION_INITIALIZED | CHANNEL_OPTION_ENCRYPT_RDP
    | CHANNEL_OPTION_COMPRESS_RDP) >>> 0
});

function csNetOptionsForChannel(name, currentOpt = 0) {
  const key = String(name || '').toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MSTSC_CS_NET_OPTIONS, key)) {
    return MSTSC_CS_NET_OPTIONS[key];
  }
  return (currentOpt | CHANNEL_OPTION_INITIALIZED) >>> 0;
}

/**
 * Alinea opciones TS_UD_CS_NET a mstsc / MS-RDPBCGR 2.2.1.3.4 (Wallix exige INITIALIZED
 * y espeja SHOW_PROTOCOL/ENCRYPT_RDP del cliente al demultiplexar CLIPRDR).
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
      const standardOpt = csNetOptionsForChannel(name, currentOpt);
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

/** Acepta las dos formas de injectClientNetworkChannels: array plano o {before, after}. */
function hasChannelsToInject(spec) {
  if (Array.isArray(spec)) return spec.length > 0;
  if (!spec || typeof spec !== 'object') return false;
  return (spec.before || []).length > 0 || (spec.after || []).length > 0;
}

/**
 * Añade canales virtuales estáticos a TS_UD_CS_NET de un MCS Connect Initial.
 *
 * Wallix entrega cliprdr por un canal MCS que no es el que él mismo asignó, y el destino cierra
 * la sesión al recibir datos del cliente por el canal negociado. IronRDP declara un solo canal
 * mientras los clientes que sí funcionan a través del bastión declaran el juego estándar, así que
 * esto iguala el reparto de canales al de un cliente normal.
 *
 * Los canales se pueden colocar delante o detrás de los que ya declara el cliente, porque lo que
 * importa es el indice: el bastion empareja su lista con la del cliente por posicion, ignorando los
 * nombres, y solo si el indice de cliprdr coincide en las dos listas acaba proyectado sobre un
 * canal virtual de verdad. Meter canales delante desplaza el cliprdr del cliente, y entonces
 * IronRDP (que tambien empareja SC_NET con CS_NET por indice) se queda con un id que no es el suyo;
 * de eso se encarga el remapeo por contenido del bridge, que aprende el canal real en los dos
 * sentidos.
 *
 * Hay que recalcular longitudes anidadas (CS_NET, userData de 'Duca', OCTET STRING de userData,
 * Connect-Initial y TPKT). Se validan todas antes de tocar nada y, si alguna no cuadra o no cabe
 * en su ancho original, se aborta devolviendo el buffer intacto.
 *
 * @param {Buffer} buf
 * @param {string[]|{before?: string[], after?: string[]}} names
 */
function injectClientNetworkChannels(buf, names) {
  const abort = (reason) => ({ buf, patched: false, added: [], reason });

  if (!Buffer.isBuffer(buf)) return abort('not-buffer');

  const spec = Array.isArray(names) ? { before: [], after: names } : (names || {});
  const wanted = [
    ...(Array.isArray(spec.before) ? spec.before : []),
    ...(Array.isArray(spec.after) ? spec.after : [])
  ];
  if (wanted.length === 0) return abort('no-names');

  const block = findClientNetworkBlock(buf);
  if (!block) return abort('cs-net-not-found');
  if (block.ducaOffset < 0) return abort('duca-not-found');

  const present = new Set(findClientNetworkChannels(buf).map((n) => n.toLowerCase()));
  const accept = (list) => {
    const out = [];
    for (const raw of Array.isArray(list) ? list : []) {
      const name = String(raw || '').trim();
      // El nombre ocupa 8 bytes con terminador nulo, asi que el limite real son 7 caracteres
      if (!name || name.length > 7) continue;
      if (present.has(name.toLowerCase())) continue;
      present.add(name.toLowerCase());
      out.push(name);
    }
    return out;
  };

  const addBefore = accept(spec.before);
  const addAfter = accept(spec.after);
  const toAdd = [...addBefore, ...addAfter];
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

  const channelsAt = block.offset + 8;
  const channelsEnd = channelsAt + block.count * CHANNEL_DEF_LEN;

  const out = Buffer.alloc(buf.length + delta);
  const writeDefs = (list, at) => {
    let write = at;
    for (const name of list) {
      // El relleno a 8 bytes y el terminador nulo ya vienen a cero de Buffer.alloc
      out.write(name, write, 'ascii');
      out.writeUInt32LE(csNetOptionsForChannel(name, 0), write + 8);
      write += CHANNEL_DEF_LEN;
    }
    return write;
  };

  // Cabecera del bloque y todo lo anterior, luego los canales nuevos de delante, los que ya
  // declaraba el cliente, los nuevos de detras y el resto del PDU.
  buf.copy(out, 0, 0, channelsAt);
  let write = writeDefs(addBefore, channelsAt);
  buf.copy(out, write, channelsAt, channelsEnd);
  write += block.count * CHANNEL_DEF_LEN;
  write = writeDefs(addAfter, write);
  buf.copy(out, write, channelsEnd);

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

const CS_CORE_POST_BETA2_OFFSET = 128;
const CS_CORE_HIGH_COLOR_DEPTH_OFFSET = 136;
const CS_CORE_EARLY_CAPS_OFFSET = 140;
const CS_CORE_MIN_LEN_COLOR_FIELDS = 4 + 142;
const RNS_UD_COLOR_8BPP_POST_BETA2 = 0xca01;
const RNS_UD_CS_WANT_32BPP_SESSION = 0x0002;
/** MS-RDPBCGR 2.2.1.3.2 — cliente anuncia EGFX / DynVC Graphics */
const RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL = 0x0100;
const HIGH_COLOR_24BPP = 0x0018;
const HIGH_COLOR_16BPP = 0x0010;

/**
 * Lee earlyCapabilityFlags del CS_CORE (MCS Connect Initial).
 * @returns {{ earlyCapabilityFlags: number, supportDynVcGfx: boolean, highColorDepth: number|null }|null}
 */
function describeClientEarlyCaps(buf) {
  const found = findClientCoreData(buf);
  if (!found || found.length < CS_CORE_MIN_LEN_COLOR_FIELDS) return null;
  const d = found.offset + 4;
  if (buf.readUInt16LE(d + CS_CORE_POST_BETA2_OFFSET) !== RNS_UD_COLOR_8BPP_POST_BETA2) {
    return null;
  }
  const early = buf.readUInt16LE(d + CS_CORE_EARLY_CAPS_OFFSET);
  const high = buf.readUInt16LE(d + CS_CORE_HIGH_COLOR_DEPTH_OFFSET);
  return {
    earlyCapabilityFlags: early,
    supportDynVcGfx: (early & RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL) !== 0,
    highColorDepth: high
  };
}

function formatClientEarlyCaps(info) {
  if (!info) return '';
  return `[Bridge] early caps cliente: flags=0x${info.earlyCapabilityFlags.toString(16)}`
    + ` EGFX=${info.supportDynVcGfx ? 'si' : 'no'}`
    + ` highColor=0x${(info.highColorDepth ?? 0).toString(16)}`;
}

/** ¿Es un MCS Connect Initial completo (TPKT + X.224 data + BER 7f 65)? */
function isMcsConnectInitial(buf) {
  return Buffer.isBuffer(buf) && buf.length > 12 && buf[0] === 0x03
    && buf[4] === 0x02 && buf[5] === 0xf0 && buf[6] === 0x80
    && buf[7] === 0x7f && buf[8] === 0x65;
}

function isMcsConnectResponse(buf) {
  return Buffer.isBuffer(buf) && buf.length > 12 && buf[0] === 0x03
    && buf[4] === 0x02 && buf[5] === 0xf0 && buf[6] === 0x80
    && buf[7] === 0x7f && buf[8] === 0x66;
}

const SC_CORE = 0x0c01;

/**
 * MS-RDPBCGR 3.2.5.3.4: mstsc exige que SC_CORE.clientRequestedProtocols coincida
 * con el RDP_NEG_REQ original. Si un MITM reescribe el CR a SSL-only, el bastion
 * echoa 0x01 y el cliente corta — hay que restaurar los flags originales hacia mstsc.
 */
function patchScCoreClientRequestedProtocols(buf, requestedProtocols) {
  if (!Buffer.isBuffer(buf) || requestedProtocols == null) {
    return { buf, patched: false, reason: 'bad-args' };
  }
  const want = requestedProtocols >>> 0;
  const mcdn = buf.indexOf(Buffer.from('McDn'));
  const start = mcdn >= 0 ? mcdn + 4 : 0;

  for (let i = start; i + 12 <= buf.length; i++) {
    if (buf.readUInt16LE(i) !== SC_CORE) continue;
    const length = buf.readUInt16LE(i + 2);
    if (length < 12 || i + length > buf.length) continue;
    // header(4) + versionMajor(2) + versionMinor(2) + clientRequestedProtocols(4)
    const old = buf.readUInt32LE(i + 8) >>> 0;
    if (old === want) {
      return { buf, patched: false, reason: 'already-ok', old };
    }
    const out = Buffer.from(buf);
    out.writeUInt32LE(want, i + 8);
    return { buf: out, patched: true, old, newVal: want, scCoreLen: length };
  }
  return { buf, patched: false, reason: mcdn < 0 ? 'no-mcdn' : 'no-sc-core-with-protocols' };
}

/**
 * Pide una sesion de 32bpp (experimento NODETERM_RDP_FORCE32): activa WANT_32BPP_SESSION en
 * earlyCapabilityFlags y deja highColorDepth en 24, como exige MS-RDPBCGR 2.2.1.3.2 (el campo
 * highColorDepth no admite 32). No cambia longitudes. Solo se llama con el flag activo.
 */
function patchClientCoreWant32bpp(buf) {
  const found = findClientCoreData(buf);
  if (!found || found.length < CS_CORE_MIN_LEN_COLOR_FIELDS) {
    return { buf, patched: false, changes: [], reason: 'cs-core-not-found' };
  }
  const d = found.offset + 4;
  if (buf.readUInt16LE(d + CS_CORE_POST_BETA2_OFFSET) !== RNS_UD_COLOR_8BPP_POST_BETA2) {
    return { buf, patched: false, changes: [], reason: 'post-beta2-not-8bpp' };
  }
  const high = buf.readUInt16LE(d + CS_CORE_HIGH_COLOR_DEPTH_OFFSET);
  const early = buf.readUInt16LE(d + CS_CORE_EARLY_CAPS_OFFSET);
  const changes = [];
  const out = Buffer.from(buf);
  if ((early & RNS_UD_CS_WANT_32BPP_SESSION) === 0) {
    out.writeUInt16LE((early | RNS_UD_CS_WANT_32BPP_SESSION) & 0xffff, d + CS_CORE_EARLY_CAPS_OFFSET);
    changes.push(`earlyCapabilityFlags 0x${early.toString(16)}->0x${((early | RNS_UD_CS_WANT_32BPP_SESSION) & 0xffff).toString(16)}`);
  }
  if (high !== HIGH_COLOR_24BPP) {
    out.writeUInt16LE(HIGH_COLOR_24BPP, d + CS_CORE_HIGH_COLOR_DEPTH_OFFSET);
    changes.push(`highColorDepth 0x${high.toString(16)}->0x18`);
  }
  return { buf: changes.length ? out : buf, patched: changes.length > 0, changes, reason: changes.length ? 'want32' : 'already' };
}

/**
 * Bastion Wallix: highColorDepth 16bpp, sin WANT_32BPP ni SUPPORT_DYNVC_GFX.
 * Evita que el proxy pinte banners/APP en 24bpp (el rewriter solo estabiliza RLE16).
 */
function patchClientCoreBastion16bpp(buf) {
  const found = findClientCoreData(buf);
  if (!found || found.length < CS_CORE_MIN_LEN_COLOR_FIELDS) {
    return { buf, patched: false, changes: [], reason: 'cs-core-not-found' };
  }
  const d = found.offset + 4;
  if (buf.readUInt16LE(d + CS_CORE_POST_BETA2_OFFSET) !== RNS_UD_COLOR_8BPP_POST_BETA2) {
    return { buf, patched: false, changes: [], reason: 'post-beta2-not-8bpp' };
  }
  const high = buf.readUInt16LE(d + CS_CORE_HIGH_COLOR_DEPTH_OFFSET);
  const early = buf.readUInt16LE(d + CS_CORE_EARLY_CAPS_OFFSET);
  const clearBits = RNS_UD_CS_WANT_32BPP_SESSION | RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL;
  const newEarly = early & ~clearBits;
  const changes = [];
  const out = Buffer.from(buf);
  if (newEarly !== early) {
    out.writeUInt16LE(newEarly & 0xffff, d + CS_CORE_EARLY_CAPS_OFFSET);
    changes.push(`earlyCapabilityFlags 0x${early.toString(16)}->0x${newEarly.toString(16)}`);
  }
  if (high !== HIGH_COLOR_16BPP) {
    out.writeUInt16LE(HIGH_COLOR_16BPP, d + CS_CORE_HIGH_COLOR_DEPTH_OFFSET);
    changes.push(`highColorDepth 0x${high.toString(16)}->0x10`);
  }
  return {
    buf: changes.length ? out : buf,
    patched: changes.length > 0,
    changes,
    reason: changes.length ? 'bastion16' : 'already'
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
 * Elimina canales virtuales estáticos de TS_UD_CS_NET (inverso de inject).
 * Recalcula longitudes anidadas (CS_NET, Duca, OCTET STRING, Connect-Initial, TPKT).
 *
 * Uso: experimento selector Wallix sin cliprdr/rdpdr — no anunciar canales que
 * Windows espera completar (Device List / clipboard handshake) y provocan timeout.
 *
 * @param {Buffer} buf
 * @param {string[]} names
 */
function removeClientNetworkChannels(buf, names) {
  const abort = (reason) => ({ buf, patched: false, removed: [], reason });

  if (!Buffer.isBuffer(buf)) return abort('not-buffer');
  const wanted = [...new Set(
    (Array.isArray(names) ? names : [])
      .map((n) => String(n || '').trim().toLowerCase())
      .filter(Boolean)
  )];
  if (!wanted.length) return abort('no-names');

  const block = findClientNetworkBlock(buf);
  if (!block) return abort('cs-net-not-found');
  if (block.ducaOffset < 0) return abort('duca-not-found');

  const channelsAt = block.offset + 8;
  const keep = [];
  const removed = [];
  for (let c = 0; c < block.count; c++) {
    const off = channelsAt + c * CHANNEL_DEF_LEN;
    const rawName = buf.subarray(off, off + 8).toString('ascii');
    const nullIdx = rawName.indexOf('\0');
    const name = (nullIdx >= 0 ? rawName.slice(0, nullIdx) : rawName).trim();
    if (wanted.includes(name.toLowerCase())) {
      removed.push(name);
    } else {
      keep.push(buf.subarray(off, off + CHANNEL_DEF_LEN));
    }
  }
  if (!removed.length) return abort('not-present');
  if (keep.length < 1) return abort('would-empty-cs-net');

  const delta = removed.length * CHANNEL_DEF_LEN;
  if (buf.length < 11 || buf[0] !== 0x03) return abort('not-tpkt');
  if (buf.readUInt16BE(2) !== buf.length) return abort('tpkt-len-mismatch');

  if (buf[7] !== 0x7f || buf[8] !== 0x65) return abort('not-connect-initial');
  const ciLen = readBerLength(buf, 9);
  if (!ciLen || 9 + ciLen.size + ciLen.value !== buf.length) return abort('connect-initial-len');

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
  const newDucaLen = ducaLen - delta;
  if (newDucaLen < 0) return abort('duca-len-underflow');
  if (ducaWide ? newDucaLen > 0x3fff : newDucaLen > 0x7f) return abort('duca-len-overflow');

  const channelsEnd = channelsAt + block.count * CHANNEL_DEF_LEN;
  const out = Buffer.alloc(buf.length - delta);
  buf.copy(out, 0, 0, channelsAt);
  let write = channelsAt;
  for (const def of keep) {
    def.copy(out, write);
    write += CHANNEL_DEF_LEN;
  }
  buf.copy(out, write, channelsEnd);

  if (!writeBerLength(out, 9, ciLen.value - delta)) return abort('connect-initial-len-overflow');
  if (!writeBerLength(out, udTagAt + 1, udLen.value - delta)) return abort('user-data-len-overflow');

  if (ducaWide) {
    out[ducaLenAt] = 0x80 | ((newDucaLen >> 8) & 0x3f);
    out[ducaLenAt + 1] = newDucaLen & 0xff;
  } else {
    out[ducaLenAt] = newDucaLen;
  }

  out.writeUInt16LE(block.length - delta, block.offset + 2);
  out.writeUInt32LE(keep.length, block.offset + 4);
  out.writeUInt16BE(out.length, 2);

  return {
    buf: out,
    patched: true,
    removed,
    reason: 'removed',
    channelCount: keep.length
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
  if (hasChannelsToInject(options.injectChannels)) {
    const injected = injectClientNetworkChannels(current, options.injectChannels);
    if (injected.patched) {
      current = injected.buf;
      notes.push(`canales inyectados [${injected.added.join(', ')}] -> count=${injected.channelCount}`);
    } else {
      notes.push(`canales sin inyectar (${injected.reason})`);
    }
  }

  // Tras inject: quitar canales (cliprdr/rdpdr) que no queremos anunciar a Wallix.
  if (Array.isArray(options.stripChannels) && options.stripChannels.length) {
    const stripped = removeClientNetworkChannels(current, options.stripChannels);
    if (stripped.patched) {
      current = stripped.buf;
      notes.push(
        `canales eliminados [${stripped.removed.join(', ')}] -> count=${stripped.channelCount}`
      );
    } else {
      notes.push(`canales sin eliminar (${stripped.reason})`);
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

  if (options.bastion16 === true) {
    const b16 = patchClientCoreBastion16bpp(current);
    if (b16.patched) {
      current = b16.buf;
      notes.push(`bastion16 ${b16.changes.join(', ')}`);
    }
  } else if (options.force32 === true) {
    const want32 = patchClientCoreWant32bpp(current);
    if (want32.patched) {
      current = want32.buf;
      notes.push(`FORCE32 ${want32.changes.join(', ')}`);
    }
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

      // Heuristica: con usuario vacio no es un Info Packet de logon (p. ej. un PDU ajeno).
      if (cbUserName > 0) {
        let out = Buffer.from(buf);
        let wasPatched = false;
        const changes = [];
        let perfFlagsBefore = null;
        let perfFlagsAfter = null;

        // 1. Inyectar INFO_AUTOLOGON si no está activo (solo con credenciales completas)
        if (cbPassword > 0 && (flags & 0x0008) === 0) {
          const dataOff = parsed.dataOff + off + 4;
          out.writeUInt32LE(flags | 0x0008, dataOff);
          wasPatched = true;
          changes.push('autologon');
        }

        // 2. Localizar TS_EXTENDED_INFO_PACKET y ajustar performanceFlags.
        // Cada string (Domain, UserName, Password, AlternateShell, WorkingDir) va seguido de
        // un terminador nulo de 2 bytes que NO cuenta en su cb* (MS-RDPBCGR 2.2.1.11.1.1).
        const extOff = off + 18
          + (cbDomain + 2) + (cbUserName + 2) + (cbPassword + 2)
          + (cbAlternateShell + 2) + (cbWorkingDir + 2);
        if (extOff + 4 <= u.length) {
          const cbClientAddress = u.readUInt16LE(extOff + 2);
          const dirOff = extOff + 4 + cbClientAddress;
          // Sanidad: el cb de la direccion es par y pequeno; si no, no se toca nada.
          if (cbClientAddress % 2 === 0 && cbClientAddress <= 128 && dirOff + 2 <= u.length) {
            const cbClientDir = u.readUInt16LE(dirOff);
            const tzOff = dirOff + 2 + cbClientDir;
            const perfFlagsOff = tzOff + 172 + 4; // 172B TimeZone + 4B clientSessionId

            if (cbClientDir % 2 === 0 && cbClientDir <= 1024 && perfFlagsOff + 4 <= u.length) {
              const oldPerfFlags = u.readUInt32LE(perfFlagsOff);
              perfFlagsBefore = oldPerfFlags;
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

              perfFlagsAfter = newPerfFlags >>> 0;
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
          newFlags: (flags | 0x0008) >>> 0,
          perfFlagsBefore,
          perfFlagsAfter,
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
  csNetOptionsForChannel,
  MSTSC_CS_NET_OPTIONS,
  CHANNEL_OPTION_INITIALIZED,
  CHANNEL_OPTION_ENCRYPT_RDP,
  CHANNEL_OPTION_COMPRESS_RDP,
  CHANNEL_OPTION_SHOW_PROTOCOL,
  injectClientNetworkChannels,
  removeClientNetworkChannels,
  ensureMcsServerSelectedProtocol,
  hardenClientCoreData,
  isMcsConnectInitial,
  isMcsConnectResponse,
  SC_CORE,
  patchScCoreClientRequestedProtocols,
  patchClientCoreWant32bpp,
  patchClientCoreBastion16bpp,
  HIGH_COLOR_16BPP,
  describeClientEarlyCaps,
  formatClientEarlyCaps,
  RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL,
  fixWallixGccConnectPduLength,
  prepareMcsConnectInitial,
  patchInfoPacket,
  patchInfoAutoLogon
};
