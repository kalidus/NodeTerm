/**
 * Sondeo (y parche opt-in) de capacidades RDP: Demand Active (servidor) y
 * Confirm Active (cliente), MS-RDPBCGR 2.2.1.13.1 / 2.2.1.13.2 / 2.2.7.
 *
 * Sirve para saber, con datos, si el cliente WASM anuncia RemoteFX / Surface
 * Commands / 32bpp / EGFX (earlyCapabilityFlags) y que ofrece el servidor.
 * No modifica nada salvo `patchConfirmActiveBitmapBpp`, que solo se usa detras
 * de NODETERM_RDP_FORCE32.
 */

'use strict';

const SHARE_PDU_DEMAND_ACTIVE = 1;
const SHARE_PDU_CONFIRM_ACTIVE = 3;

const CAPSET_BITMAP = 0x0002;
const CAPSET_LARGE_POINTER = 0x001b;
const CAPSET_SURFACE_COMMANDS = 0x001c;
const CAPSET_BITMAP_CODECS = 0x001d;

/** RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL — MS-RDPBCGR 2.2.1.3.2 */
const RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL = 0x0100;

const CAPSET_NAMES = {
  0x01: 'General', 0x02: 'Bitmap', 0x03: 'Order', 0x04: 'BitmapCache', 0x05: 'Control',
  0x07: 'Activation', 0x08: 'Pointer', 0x09: 'Share', 0x0a: 'ColorCache', 0x0c: 'Sound',
  0x0d: 'Input', 0x0e: 'Font', 0x0f: 'Brush', 0x10: 'GlyphCache', 0x11: 'OffscreenCache',
  0x12: 'BitmapCacheHostSupport', 0x13: 'BitmapCacheRev2', 0x14: 'VirtualChannel',
  0x15: 'DrawNineGrid', 0x16: 'DrawGdiPlus', 0x17: 'Rail', 0x18: 'Window', 0x19: 'CompDesk',
  0x1a: 'MultifragmentUpdate', 0x1b: 'LargePointer', 0x1c: 'SurfaceCommands',
  0x1d: 'BitmapCodecs', 0x1e: 'FrameAcknowledge'
};

const CODEC_GUIDS = [
  { name: 'RemoteFX', hex: '122f777672bd6344afb3b73c9c6f7886' },
  { name: 'ImageRemoteFX', hex: 'd4cc44278a9d744e803c0ecbeea19c54' },
  { name: 'NSCodec', hex: 'b91b8dca0f004f15589fae2d1a87e2d6' },
  { name: 'Ignore', hex: 'a651430c3535ae42910ccdfce5760b58' }
];

function codecNameFromGuid(guid) {
  const hex = guid.toString('hex');
  const known = CODEC_GUIDS.find((g) => g.hex === hex);
  return known ? known.name : `guid:${hex}`;
}

/**
 * Localiza la zona de capacidades de un Demand/Confirm Active dentro de un frame TPKT completo.
 * @returns {{ kind: 'DEMAND'|'CONFIRM', udOff: number, setsOff: number, numCaps: number,
 *             setsEnd: number, lenCombinedOff: number } | null}
 */
function locateCapabilities(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24 || buf[0] !== 0x03) return null;
  if (buf[4] !== 0x02 || buf[5] !== 0xf0 || buf[6] !== 0x80) return null;
  const mcsType = buf[7];
  if (mcsType !== 0x64 && mcsType !== 0x68) return null;

  let off = 13;
  const b0 = buf[off++];
  let dataLen;
  if (b0 & 0x80) {
    if (off >= buf.length) return null;
    dataLen = ((b0 & 0x7f) << 8) | buf[off++];
  } else {
    dataLen = b0;
  }
  const udOff = off;
  if (udOff + 14 > buf.length || udOff + dataLen > buf.length) return null;

  const pduType = buf.readUInt16LE(udOff + 2) & 0x0f;
  let kind;
  let lenSrcOff;
  let lenCombinedOff;
  if (pduType === SHARE_PDU_DEMAND_ACTIVE) {
    kind = 'DEMAND';
    lenSrcOff = udOff + 10;
    lenCombinedOff = udOff + 12;
  } else if (pduType === SHARE_PDU_CONFIRM_ACTIVE) {
    kind = 'CONFIRM';
    lenSrcOff = udOff + 12;
    lenCombinedOff = udOff + 14;
  } else {
    return null;
  }
  if (lenCombinedOff + 2 > buf.length) return null;
  const lenSrc = buf.readUInt16LE(lenSrcOff);
  const numCapsOff = lenCombinedOff + 2 + lenSrc;
  if (numCapsOff + 4 > buf.length) return null;
  const numCaps = buf.readUInt16LE(numCapsOff);
  const setsOff = numCapsOff + 4; // numberCapabilities(2) + pad2octets(2)
  const setsEnd = Math.min(buf.length, udOff + dataLen);
  return { kind, udOff, setsOff, numCaps, setsEnd, lenCombinedOff };
}

/** Lista {type, off, len} de cada capability set, con comprobacion de limites. */
function listCapabilitySets(buf, loc) {
  const sets = [];
  let p = loc.setsOff;
  for (let i = 0; i < loc.numCaps; i++) {
    if (p + 4 > loc.setsEnd) break;
    const type = buf.readUInt16LE(p);
    const len = buf.readUInt16LE(p + 2);
    if (len < 4 || p + len > loc.setsEnd) break;
    sets.push({ type, off: p, len });
    p += len;
  }
  return sets;
}

/**
 * Resume las capacidades relevantes para el grafico.
 * @returns {null | {
 *   kind: 'DEMAND'|'CONFIRM', bpp: number|null, desktop: string|null,
 *   surfaceCmds: number|null, largePointer: boolean, codecs: Array<{name:string,id:number}>,
 *   setNames: string[], likelyEgfxSurface: boolean
 * }}
 */
function describeCapabilities(buf) {
  const loc = locateCapabilities(buf);
  if (!loc) return null;
  const sets = listCapabilitySets(buf, loc);
  const info = {
    kind: loc.kind,
    bpp: null,
    desktop: null,
    surfaceCmds: null,
    largePointer: false,
    codecs: [],
    setNames: sets.map((s) => CAPSET_NAMES[s.type] || `0x${s.type.toString(16)}`),
    likelyEgfxSurface: false
  };

  for (const set of sets) {
    const d = set.off + 4;
    if (set.type === CAPSET_BITMAP && set.len >= 4 + 12) {
      info.bpp = buf.readUInt16LE(d);
      info.desktop = `${buf.readUInt16LE(d + 8)}x${buf.readUInt16LE(d + 10)}`;
    } else if (set.type === CAPSET_SURFACE_COMMANDS && set.len >= 4 + 4) {
      info.surfaceCmds = buf.readUInt32LE(d);
    } else if (set.type === CAPSET_LARGE_POINTER) {
      info.largePointer = true;
    } else if (set.type === CAPSET_BITMAP_CODECS && set.len >= 5) {
      const end = set.off + set.len;
      const count = buf[d];
      let p = d + 1;
      for (let i = 0; i < count; i++) {
        if (p + 19 > end) break;
        const guid = buf.subarray(p, p + 16);
        const id = buf[p + 16];
        const propLen = buf.readUInt16LE(p + 17);
        info.codecs.push({ name: codecNameFromGuid(guid), id });
        p += 19 + propLen;
      }
    }
  }
  // SurfaceCommands + RemoteFX en Confirm Active sugiere camino SURFACE_CMDS;
  // EGFX real se confirma con earlyCapabilityFlags SUPPORT_DYNVC_GFX + canal Graphics.
  info.likelyEgfxSurface = info.surfaceCmds != null && info.surfaceCmds !== 0
    && info.codecs.some((c) => c.name === 'RemoteFX' || c.name === 'ImageRemoteFX');
  return info;
}

function formatCapabilities(info) {
  if (!info) return '';
  const codecs = info.codecs.length
    ? info.codecs.map((c) => `${c.name}#${c.id}`).join(',')
    : 'ninguno';
  const surf = info.surfaceCmds == null ? 'no' : `0x${info.surfaceCmds.toString(16)}`;
  const who = info.kind === 'CONFIRM' ? 'cliente' : 'servidor';
  return `[Bridge] caps ${who}: bpp=${info.bpp == null ? '?' : info.bpp}`
    + ` desktop=${info.desktop || '?'} codecs=[${codecs}] surfaceCmds=${surf}`
    + ` largePointer=${info.largePointer ? 'si' : 'no'}`
    + ` egfxHint=${info.likelyEgfxSurface ? 'si' : 'no'}`
    + ` sets=[${info.setNames.join(',')}]`;
}

/**
 * Cambia preferredBitsPerPixel del Bitmap Capability de un Confirm Active del cliente.
 * No cambia longitudes. Solo para el experimento NODETERM_RDP_FORCE32.
 */
function patchConfirmActiveBitmapBpp(buf, bpp = 32) {
  const loc = locateCapabilities(buf);
  if (!loc || loc.kind !== 'CONFIRM') return { buf, patched: false };
  const sets = listCapabilitySets(buf, loc);
  const bmp = sets.find((s) => s.type === CAPSET_BITMAP);
  if (!bmp || bmp.len < 4 + 2) return { buf, patched: false };
  const at = bmp.off + 4;
  const before = buf.readUInt16LE(at);
  if (before === bpp) return { buf, patched: false, before };
  const out = Buffer.from(buf);
  out.writeUInt16LE(bpp, at);
  return { buf: out, patched: true, before, after: bpp };
}

module.exports = {
  CAPSET_BITMAP,
  CAPSET_SURFACE_COMMANDS,
  CAPSET_BITMAP_CODECS,
  RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL,
  locateCapabilities,
  listCapabilitySets,
  describeCapabilities,
  formatCapabilities,
  patchConfirmActiveBitmapBpp
};
