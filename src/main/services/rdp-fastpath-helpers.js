/**
 * Helpers Fast-Path BITMAP (MS-RDPBCGR 2.2.9.1.2.1.2).
 *
 * IronRDP 0.7 (WASM) usa el ancho del dest-rect como stride al pintar.
 * Wallix (como xrdp) rellena TS_BITMAP_DATA.width a multiplo de 4, distinto
 * del ancho inclusivo del dest-rect -> cizalla / texto dentado.
 *
 * Fix: descomprimir RLE16, recortar al dest-rect, reenviar sin comprimir
 * con width/height = tamano del dest (IronRDP master ya tiene source_width;
 * npm 0.7.0 no).
 *
 * TS_UPDATE_BITMAP_DATA (tambien en Fast-Path) incluye updateType=0x0001;
 * IronRDP lo exige. No eliminarlo.
 */

'use strict';

const {
  decompress16bpp,
  cropRgb16,
  encodeRgb16Rle,
  encodeMegaMegaColorImage,
  encodeMegaMegaColorRun,
  isUniformRgb16,
  RleError
} = require('./rdp-rle16');

const FASTPATH_UPDATETYPE_BITMAP = 0x1;
const UPDATETYPE_BITMAP = 0x0001;
const BITMAP_COMPRESSION = 0x0001;
const NO_BITMAP_COMPRESSION_HDR = 0x0400;

function readFpLength(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 2) return null;
  if (buf[1] & 0x80) {
    if (buf.length < 3) return null;
    return {
      headerLen: 3,
      length: ((buf[1] & 0x7f) << 8) | buf[2]
    };
  }
  return { headerLen: 2, length: buf[1] };
}

function encodeFpLength(totalLen) {
  if (totalLen < 0x80) {
    return Buffer.from([totalLen & 0xff]);
  }
  return Buffer.from([0x80 | ((totalLen >> 8) & 0x7f), totalLen & 0xff]);
}

/**
 * Inspecciona Fast-Path BITMAP Wallix (con updateType). Solo diagnostico.
 */
function inspectWallixFastPathBitmap(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 10) return null;
  if (buf[0] === 0x03) return null;
  if ((buf[0] & 0x3) !== 0 || (buf[0] >> 6) !== 0) return null;

  const fpLen = readFpLength(buf);
  if (!fpLen || fpLen.length !== buf.length) return null;

  let o = fpLen.headerLen;
  const updateHeader = buf[o];
  o += 1;
  const updateCode = updateHeader & 0x0f;
  if (updateCode !== FASTPATH_UPDATETYPE_BITMAP) return null;
  if (((updateHeader >> 4) & 0x03) !== 0) return null;
  if (((updateHeader >> 6) & 0x03) !== 0) return null;

  const size = buf.readUInt16LE(o);
  o += 2;
  if (size < 20 || o + size > buf.length) return null;

  const payload = buf.subarray(o, o + size);
  if (payload.readUInt16LE(0) !== UPDATETYPE_BITMAP) {
    return { ok: false, reason: 'missing-updateType', size };
  }

  const numberRectangles = payload.readUInt16LE(2);
  return {
    ok: true,
    numberRectangles,
    size,
    hasUpdateType: true,
    payloadOffset: o,
    updateHeader,
    headerLen: fpLen.headerLen,
    fpHeaderByte: buf[0]
  };
}

function needsStrideCrop(width, height, destLeft, destTop, destRight, destBottom) {
  const iw = destRight - destLeft + 1;
  const ih = destBottom - destTop + 1;
  return width > 0 && height > 0 && (width !== iw || height !== ih);
}

/**
 * Expande dest-rect in-place (mismo bitmap). OK si el tile es color uniforme
 * (el padding se pinta del mismo color; sin ghosting visible).
 */
function destExpandOneBitmapRect(rectBuf) {
  const out = Buffer.from(rectBuf);
  const destLeft = out.readUInt16LE(0);
  const destTop = out.readUInt16LE(2);
  const width = out.readUInt16LE(8);
  const height = out.readUInt16LE(10);
  out.writeUInt16LE((destLeft + width - 1) & 0xffff, 4);
  out.writeUInt16LE((destTop + height - 1) & 0xffff, 6);
  return out;
}

/**
 * Corrige stride Wallix de un TS_BITMAP_DATA.
 * - Solido: dest-expand (mantiene RLE original, 0 coste de tamaño).
 * - Complejo: crop + RLE compacto (COLOR_RUN / COLOR_IMAGE).
 * @returns {{ kind: 'dest-expand'|'crop', buf: Buffer } | null}
 */
const SUBTILE_MAX = 64;

function encodeOneTileBuffer(destLeft, destTop, destRight, destBottom, width, height, tilePixels) {
  let encoded;
  let kind = 'crop';
  if (isUniformRgb16(tilePixels)) {
    const color = tilePixels.readUInt16LE(0);
    try {
      encoded = encodeMegaMegaColorRun(width * height, color);
      kind = 'solid-run';
    } catch (err) {
      if (err instanceof RleError) return null;
      throw err;
    }
  } else {
    try {
      encoded = encodeMegaMegaColorImage(tilePixels);
    } catch (err) {
      if (err instanceof RleError) return null;
      throw err;
    }
  }
  if (!encoded || encoded.length > 0xffff) return null;

  const header = Buffer.alloc(18);
  header.writeUInt16LE(destLeft, 0);
  header.writeUInt16LE(destTop, 2);
  header.writeUInt16LE(destRight, 4);
  header.writeUInt16LE(destBottom, 6);
  header.writeUInt16LE(width, 8);
  header.writeUInt16LE(height, 10);
  header.writeUInt16LE(16, 12);
  header.writeUInt16LE(BITMAP_COMPRESSION | NO_BITMAP_COMPRESSION_HDR, 14);
  header.writeUInt16LE(encoded.length, 16);

  return { kind, buf: Buffer.concat([header, encoded]) };
}

function fixOneBitmapRectStride(rectBuf) {
  if (!Buffer.isBuffer(rectBuf) || rectBuf.length < 18) return null;

  const destLeft = rectBuf.readUInt16LE(0);
  const destTop = rectBuf.readUInt16LE(2);
  const destRight = rectBuf.readUInt16LE(4);
  const destBottom = rectBuf.readUInt16LE(6);
  const width = rectBuf.readUInt16LE(8);
  const height = rectBuf.readUInt16LE(10);
  const bitsPerPixel = rectBuf.readUInt16LE(12);
  const flags = rectBuf.readUInt16LE(14);
  const bitmapLength = rectBuf.readUInt16LE(16);

  if (18 + bitmapLength > rectBuf.length) return null;

  const iw = destRight - destLeft + 1;
  const ih = destBottom - destTop + 1;
  if (bitsPerPixel !== 16) return null;
  if (iw <= 0 || ih <= 0 || iw > width || ih > height) return null;
  if (iw > 8192 || ih > 8192 || width > 8192 || height > 8192) return null;

  const raw = rectBuf.subarray(18, 18 + bitmapLength);
  const needsCrop = needsStrideCrop(width, height, destLeft, destTop, destRight, destBottom);

  // Si ya es un formato elemental 0xf3 o 0xf4 sin desfase de stride y <=64x64, pasar directo
  if (
    !needsCrop &&
    (flags & NO_BITMAP_COMPRESSION_HDR) &&
    raw.length > 0 &&
    (raw[0] === 0xf3 || raw[0] === 0xf4) &&
    iw <= SUBTILE_MAX &&
    ih <= SUBTILE_MAX
  ) {
    return null;
  }

  let full;

  if (flags & BITMAP_COMPRESSION) {
    let rle = raw;
    if ((flags & NO_BITMAP_COMPRESSION_HDR) === 0) {
      if (raw.length < 8) return null;
      rle = raw.subarray(8);
    }
    try {
      full = decompress16bpp(rle, width, height);
    } catch (err) {
      if (err instanceof RleError) return null;
      throw err;
    }
  } else {
    const rowBytes = width * 2;
    if (raw.length < rowBytes * height) return null;
    full = raw.subarray(0, rowBytes * height);
  }

  let pixels;
  if (needsCrop) {
    try {
      pixels = cropRgb16(full, width, height, iw, ih);
    } catch (err) {
      if (err instanceof RleError) return null;
      throw err;
    }
  } else {
    pixels = full;
  }

  // Si es un relleno sólido completo, un único solid-run (5B) basta para cualquier tamaño
  if (isUniformRgb16(pixels) && iw * ih <= 0xffff) {
    const solid = encodeOneTileBuffer(destLeft, destTop, destRight, destBottom, iw, ih, pixels);
    if (!solid) return null;
    return { kind: 'solid-run', buf: solid.buf, buffers: [solid.buf] };
  }

  // Si cabe en un único subtile pequeño (<= 64x64)
  if (iw <= SUBTILE_MAX && ih <= SUBTILE_MAX) {
    const single = encodeOneTileBuffer(destLeft, destTop, destRight, destBottom, iw, ih, pixels);
    if (!single) return null;
    return { kind: single.kind, buf: single.buf, buffers: [single.buf] };
  }

  // Subdividir rectángulos grandes en teselas de máximo 64x64 para que nunca
  // superen el límite de tamaño de Fast-Path PDU ni dejen recuadros sin repintar.
  const tiles = [];
  let solidCount = 0;
  let cropCount = 0;

  for (let ty = 0; ty < ih; ty += SUBTILE_MAX) {
    const th = Math.min(SUBTILE_MAX, ih - ty);
    for (let tx = 0; tx < iw; tx += SUBTILE_MAX) {
      const tw = Math.min(SUBTILE_MAX, iw - tx);
      const tileLeft = destLeft + tx;
      const tileTop = destTop + ty;
      const tileRight = tileLeft + tw - 1;
      const tileBottom = tileTop + th - 1;

      const tilePixels = Buffer.alloc(tw * th * 2);
      const startRow = ih - (ty + th);
      for (let y = 0; y < th; y++) {
        const srcRow = startRow + y;
        const srcOff = (srcRow * iw + tx) * 2;
        const dstOff = y * tw * 2;
        pixels.copy(tilePixels, dstOff, srcOff, srcOff + tw * 2);
      }

      const encodedTile = encodeOneTileBuffer(tileLeft, tileTop, tileRight, tileBottom, tw, th, tilePixels);
      if (!encodedTile) return null;
      tiles.push(encodedTile.buf);
      if (encodedTile.kind === 'solid-run') solidCount += 1;
      else cropCount += 1;
    }
  }

  return {
    kind: 'subtiles',
    buf: tiles[0],
    buffers: tiles,
    solidCount,
    cropCount
  };
}

/** @deprecated usar fixOneBitmapRectStride */
function cropOneBitmapRect(rectBuf) {
  const fixed = fixOneBitmapRectStride(rectBuf);
  if (!fixed) return null;
  return { header: fixed.buf.subarray(0, 18), data: fixed.buf.subarray(18) };
}

/**
 * Expande dest-rect al width/height (fallback legacy). Pinta padding.
 */
function fixWallixBitmapDestStride(buf) {
  const info = inspectWallixFastPathBitmap(buf);
  if (!info || !info.ok) {
    return { buf, patchedCount: 0, numberRectangles: 0 };
  }

  const out = Buffer.from(buf);
  const payload = out.subarray(info.payloadOffset, info.payloadOffset + info.size);
  const n = payload.readUInt16LE(2);
  let p = 4;
  let patchedCount = 0;

  for (let i = 0; i < n; i++) {
    if (p + 18 > payload.length) break;

    const destLeft = payload.readUInt16LE(p);
    const destTop = payload.readUInt16LE(p + 2);
    const destRight = payload.readUInt16LE(p + 4);
    const destBottom = payload.readUInt16LE(p + 6);
    const width = payload.readUInt16LE(p + 8);
    const height = payload.readUInt16LE(p + 10);
    const bitmapLength = payload.readUInt16LE(p + 16);

    if (width > 0 && height > 0 && width <= 8192 && height <= 8192) {
      const wantRight = (destLeft + width - 1) & 0xffff;
      const wantBottom = (destTop + height - 1) & 0xffff;
      if (wantRight !== destRight || wantBottom !== destBottom) {
        payload.writeUInt16LE(wantRight, p + 4);
        payload.writeUInt16LE(wantBottom, p + 6);
        patchedCount += 1;
      }
    }

    p += 18 + bitmapLength;
  }

  return {
    buf: patchedCount ? out : buf,
    patchedCount,
    numberRectangles: n
  };
}

/** Fast-Path standard max: 16384 (16KB). Usar 14000 para margen seguro. */
const MAX_FASTPATH_PDU = 14000;

/**
 * Construye un Fast-Path BITMAP con N rectangulos ya serializados.
 */
function buildFastPathBitmapPdu(fpHeaderByte, updateHeader, rectBuffers) {
  const n = rectBuffers.length;
  const hdr = Buffer.alloc(4);
  hdr.writeUInt16LE(UPDATETYPE_BITMAP, 0);
  hdr.writeUInt16LE(n, 2);
  const newPayload = Buffer.concat([hdr, ...rectBuffers]);
  if (newPayload.length > 0xffff) return null;

  const sizeBuf = Buffer.alloc(2);
  sizeBuf.writeUInt16LE(newPayload.length, 0);

  let lengthField = encodeFpLength(1 + 2 + 1 + 2 + newPayload.length);
  let totalLen = 1 + lengthField.length + 1 + 2 + newPayload.length;
  lengthField = encodeFpLength(totalLen);
  totalLen = 1 + lengthField.length + 1 + 2 + newPayload.length;

  const out = Buffer.concat([
    Buffer.from([fpHeaderByte]),
    lengthField,
    Buffer.from([updateHeader]),
    sizeBuf,
    newPayload
  ]);
  if (out.length !== totalLen || out.length > MAX_FASTPATH_PDU) return null;
  return out;
}

/**
 * Empaqueta rects en uno o mas Fast-Path PDUs (< MAX_FASTPATH_PDU).
 */
function packRectBuffersToFastPath(fpHeaderByte, updateHeader, rectBuffers) {
  const pdus = [];
  let batch = [];
  let batchBytes = 4; // updateType + numberRectangles

  const flush = () => {
    if (!batch.length) return true;
    const pdu = buildFastPathBitmapPdu(fpHeaderByte, updateHeader, batch);
    batch = [];
    batchBytes = 4;
    if (!pdu) return false;
    pdus.push(pdu);
    return true;
  };

  for (const rect of rectBuffers) {
    // overhead FP ~6 + payload header 4 + size field accounted in build
    const nextBytes = batchBytes + rect.length;
    const approxPdu = 1 + 2 + 1 + 2 + nextBytes;
    if (batch.length && approxPdu > MAX_FASTPATH_PDU) {
      if (!flush()) return null;
    }
    if (1 + 2 + 1 + 2 + 4 + rect.length > MAX_FASTPATH_PDU) {
      // Un solo rect no cabe ni descomprimido: no soportado.
      return null;
    }
    batch.push(rect);
    batchBytes += rect.length;
  }
  if (!flush()) return null;
  return pdus;
}

function fixWallixBitmapStrideCrop(buf) {
  const info = inspectWallixFastPathBitmap(buf);
  if (!info || !info.ok) {
    return { buf, buffers: [buf], patchedCount: 0, numberRectangles: 0, fallback: false };
  }

  const payload = buf.subarray(info.payloadOffset, info.payloadOffset + info.size);
  const n = payload.readUInt16LE(2);
  const rectBuffers = [];
  let p = 4;
  let patchedCount = 0;
  let solidCount = 0;
  let cropCount = 0;
  let failed = 0;

  for (let i = 0; i < n; i++) {
    if (p + 18 > payload.length) {
      return { buf, buffers: [buf], patchedCount: 0, numberRectangles: n, fallback: true };
    }

    const bitmapLength = payload.readUInt16LE(p + 16);
    const rectEnd = p + 18 + bitmapLength;
    if (rectEnd > payload.length) {
      return { buf, buffers: [buf], patchedCount: 0, numberRectangles: n, fallback: true };
    }

    const rectBuf = payload.subarray(p, rectEnd);
    const width = rectBuf.readUInt16LE(8);
    const height = rectBuf.readUInt16LE(10);
    const destLeft = rectBuf.readUInt16LE(0);
    const destTop = rectBuf.readUInt16LE(2);
    const destRight = rectBuf.readUInt16LE(4);
    const destBottom = rectBuf.readUInt16LE(6);

    const fixed = fixOneBitmapRectStride(rectBuf);
    if (fixed && fixed.buffers && fixed.buffers.length) {
      rectBuffers.push(...fixed.buffers);
      patchedCount += 1;
      if (fixed.kind === 'solid-run') {
        solidCount += 1;
      } else if (fixed.kind === 'subtiles') {
        solidCount += fixed.solidCount || 0;
        cropCount += fixed.cropCount || 0;
      } else {
        cropCount += 1;
      }
    } else {
      rectBuffers.push(Buffer.from(rectBuf));
    }

    p = rectEnd;
  }

  if (patchedCount === 0) {
    return { buf, buffers: [buf], patchedCount: 0, numberRectangles: n, fallback: false, failed };
  }

  const pdus = packRectBuffersToFastPath(info.fpHeaderByte, info.updateHeader, rectBuffers);
  if (!pdus || !pdus.length) {
    return { buf, buffers: [buf], patchedCount: 0, numberRectangles: n, fallback: true, failed };
  }

  const totalNew = pdus.reduce((s, b) => s + b.length, 0);
  return {
    buf: pdus[0],
    buffers: pdus,
    extras: pdus.slice(1),
    patchedCount,
    solidCount,
    cropCount,
    numberRectangles: n,
    fallback: false,
    failed: 0,
    originalLength: buf.length,
    newLength: totalNew,
    pduCount: pdus.length
  };
}

module.exports = {
  FASTPATH_UPDATETYPE_BITMAP,
  UPDATETYPE_BITMAP,
  BITMAP_COMPRESSION,
  NO_BITMAP_COMPRESSION_HDR,
  MAX_FASTPATH_PDU,
  readFpLength,
  encodeFpLength,
  inspectWallixFastPathBitmap,
  fixWallixBitmapDestStride,
  fixWallixBitmapStrideCrop,
  fixOneBitmapRectStride,
  cropOneBitmapRect,
  needsStrideCrop,
  buildFastPathBitmapPdu,
  packRectBuffersToFastPath
};
