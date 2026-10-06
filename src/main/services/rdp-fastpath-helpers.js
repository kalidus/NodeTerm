/**
 * Helpers Fast-Path BITMAP (MS-RDPBCGR 2.2.9.1.2.1.2).
 *
 * IronRDP 0.7 (WASM) usa el ancho del dest-rect como stride al pintar.
 * Wallix (como xrdp) rellena TS_BITMAP_DATA.width a multiplo de 4, distinto
 * del ancho inclusivo del dest-rect -> cizalla / texto dentado.
 *
 * Fix: descomprimir RLE16, recortar al dest-rect y reenviar en RLE compacto
 * con width/height = tamano del dest (IronRDP master ya tiene source_width;
 * npm 0.7.0 no). Las teselas 64xN (el recuadro que deja el RLE por deltas)
 * se reescriben aunque el ancho ya coincida. Si no cabe en un Fast-Path,
 * se parte en tiras horizontales.
 * No se agranda el dest-rect: el padding pintaria encima de los pixeles vecinos.
 *
 * TS_UPDATE_BITMAP_DATA (tambien en Fast-Path) incluye updateType=0x0001;
 * IronRDP lo exige. No eliminarlo.
 */

'use strict';

const {
  decompress16bpp,
  cropRgb16,
  encodeCompactRgb16,
  isAbsoluteColorRle,
  RleError
} = require('./rdp-rle16');

const FASTPATH_UPDATETYPE_BITMAP = 0x1;
const UPDATETYPE_BITMAP = 0x0001;
const BITMAP_COMPRESSION = 0x0001;
const NO_BITMAP_COMPRESSION_HDR = 0x0400;
const FP_FRAG_SINGLE = 0;
const FP_FRAG_LAST = 1;
const FP_FRAG_FIRST = 2;
const FP_FRAG_NEXT = 3;

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
 * Fast-Path update completo (MS-RDPBCGR 2.2.9.1.2.1), con o sin fragmentacion.
 * No interpreta el cuerpo: solo separa cabecera y updateData.
 */
function parseFastPathUpdate(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 6) return null;
  if (buf[0] === 0x03) return null;
  if ((buf[0] & 0x3) !== 0 || (buf[0] >> 6) !== 0) return null;

  const fpLen = readFpLength(buf);
  if (!fpLen || fpLen.length !== buf.length) return null;

  let o = fpLen.headerLen;
  if (o >= buf.length) return null;
  const updateHeader = buf[o];
  o += 1;
  const updateCode = updateHeader & 0x0f;
  const fragmentation = (updateHeader >> 4) & 0x03;
  const compression = (updateHeader >> 6) & 0x03;
  if (compression !== 0) {
    if (o >= buf.length) return null;
    o += 1;
  }
  if (o + 2 > buf.length) return null;
  const size = buf.readUInt16LE(o);
  o += 2;
  if (size < 0 || o + size > buf.length) return null;

  return {
    fpHeaderByte: buf[0],
    updateHeader,
    updateCode,
    fragmentation,
    compression,
    updateData: buf.subarray(o, o + size),
    headerLen: fpLen.headerLen
  };
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
 * Tesela con la que Windows parte el escritorio (64x64, a menudo 64x62 + 64x2).
 * El ancho ya coincide con el dest, asi que el corrector de stride la dejaba
 * pasar. IronRDP 0.7 a veces no aplica ese RLE por deltas y el rectangulo se
 * queda en el color solido de debajo: un recuadro.
 */
function isWindowsTile(iw, ih) {
  return iw >= 56 && iw <= 64 && ih >= 2 && ih <= 64;
}

/**
 * TS_BITMAP_DATA con pixeles ya recortados al dest-rect, en RLE compacto.
 * @returns {{ kind: string, buf: Buffer } | null}
 */
function isSingleColorRun(encoded) {
  if (!encoded || encoded.length === 0) return false;
  if (encoded.length === 5 && encoded[0] === 0xf3) return true;
  if (encoded.length === 3 && (encoded[0] & 0xe0) === 0x60 && (encoded[0] & 0x1f) !== 0) return true;
  if (encoded.length === 4 && encoded[0] === 0x60) return true;
  return false;
}

function encodeOneTileBuffer(destLeft, destTop, destRight, destBottom, width, height, tilePixels) {
  let encoded;
  try {
    encoded = encodeCompactRgb16(tilePixels);
  } catch (err) {
    if (err instanceof RleError) return null;
    throw err;
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

  const kind = isSingleColorRun(encoded) ? 'solid-run' : 'crop';
  return { kind, buf: Buffer.concat([header, encoded]) };
}

/**
 * Tira horizontal del bitmap bottom-up. ty es el desplazamiento desde arriba.
 */
function extractHorizontalStrip(pixels, iw, ih, ty, th) {
  const tilePixels = Buffer.alloc(iw * th * 2);
  const startRow = ih - (ty + th);
  for (let y = 0; y < th; y++) {
    const srcOff = ((startRow + y) * iw) * 2;
    pixels.copy(tilePixels, y * iw * 2, srcOff, srcOff + iw * 2);
  }
  return tilePixels;
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
  const tile = isWindowsTile(iw, ih);

  // Sin desfase y sin forma de tesela: no tocar. Los glifos y las tiras anchas
  // siguen igual y el arrastre no se infla.
  if (!needsCrop && !tile) return null;

  let full;

  if (flags & BITMAP_COMPRESSION) {
    let rle = raw;
    if ((flags & NO_BITMAP_COMPRESSION_HDR) === 0) {
      if (raw.length < 8) return null;
      rle = raw.subarray(8);
    }
    // Ya esta en COLOR_RUN/COLOR_IMAGE y el stride cuadra: IronRDP lo pinta.
    if (!needsCrop && isAbsoluteColorRle(rle)) return null;
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

  const encoded = encodeRectOrStrips(destLeft, destTop, destRight, destBottom, iw, ih, pixels);
  if (!encoded) return null;
  return encoded;
}

/**
 * Un rectangulo si el RLE cabe en un Fast-Path; si no, tiras horizontales
 * del ancho completo. No se usa una malla: partir en las dos direcciones
 * multiplica PDUs al mover ventanas.
 */
function encodeRectOrStrips(destLeft, destTop, destRight, destBottom, iw, ih, pixels) {
  const maxRect = MAX_FASTPATH_PDU - 10;
  const whole = encodeOneTileBuffer(destLeft, destTop, destRight, destBottom, iw, ih, pixels);
  if (whole && whole.buf.length <= maxRect) {
    return {
      kind: whole.kind,
      buf: whole.buf,
      buffers: [whole.buf],
      solidCount: whole.kind === 'solid-run' ? 1 : 0,
      cropCount: whole.kind === 'solid-run' ? 0 : 1
    };
  }

  const rowBytes = iw * 2;
  const budget = maxRect - 18 - 3;
  if (rowBytes <= 0 || budget < rowBytes) return null;
  let rowsPerStrip = Math.max(1, Math.floor(budget / rowBytes));

  while (rowsPerStrip >= 1) {
    const buffers = [];
    let solidCount = 0;
    let cropCount = 0;
    let ok = true;
    for (let ty = 0; ty < ih; ty += rowsPerStrip) {
      const th = Math.min(rowsPerStrip, ih - ty);
      const stripPixels = extractHorizontalStrip(pixels, iw, ih, ty, th);
      const tileTop = destTop + ty;
      const tileBottom = tileTop + th - 1;
      const encoded = encodeOneTileBuffer(destLeft, tileTop, destRight, tileBottom, iw, th, stripPixels);
      if (!encoded || encoded.buf.length > maxRect) {
        ok = false;
        break;
      }
      buffers.push(encoded.buf);
      if (encoded.kind === 'solid-run') solidCount += 1;
      else cropCount += 1;
    }
    if (ok && buffers.length) {
      return {
        kind: buffers.length === 1 ? (solidCount ? 'solid-run' : 'crop') : 'strips',
        buf: buffers[0],
        buffers,
        solidCount,
        cropCount
      };
    }
    if (rowsPerStrip === 1) return null;
    rowsPerStrip = Math.floor(rowsPerStrip / 2);
  }
  return null;
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

/** Fast-Path standard max: 16384 (16KB). */
const MAX_FASTPATH_PDU = 16384;

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

function finishBitmapRewrite(fpHeaderByte, updateHeader, rectBuffers, meta, originalBuf) {
  const { patchedCount, solidCount, cropCount, numberRectangles, failed } = meta;
  if (patchedCount === 0) {
    return {
      buf: originalBuf || null,
      buffers: originalBuf ? [originalBuf] : [],
      patchedCount: 0,
      numberRectangles,
      fallback: false,
      failed
    };
  }

  let pdus = packRectBuffersToFastPath(fpHeaderByte, updateHeader, rectBuffers);
  if (!pdus || !pdus.length) {
    pdus = [];
    for (const rect of rectBuffers) {
      const one = packRectBuffersToFastPath(fpHeaderByte, updateHeader, [rect]);
      if (!one || !one.length) {
        pdus = [];
        break;
      }
      pdus.push(...one);
    }
  }
  if (!pdus.length) {
    return {
      buf: originalBuf || null,
      buffers: originalBuf ? [originalBuf] : [],
      patchedCount: 0,
      numberRectangles,
      fallback: true,
      failed: failed + patchedCount
    };
  }

  const totalNew = pdus.reduce((s, b) => s + b.length, 0);
  return {
    buf: pdus[0],
    buffers: pdus,
    extras: pdus.slice(1),
    patchedCount,
    solidCount,
    cropCount,
    numberRectangles,
    fallback: false,
    failed,
    originalLength: originalBuf ? originalBuf.length : 0,
    newLength: totalNew,
    pduCount: pdus.length
  };
}

/**
 * ¿Algún rectángulo del payload necesita decode/reencode?
 * Evita el bucle caro de rewrite cuando todo ya es passthrough.
 */
function bitmapPayloadNeedsRewrite(payload) {
  if (!Buffer.isBuffer(payload) || payload.length < 8) return false;
  if (payload.readUInt16LE(0) !== UPDATETYPE_BITMAP) return false;
  const n = payload.readUInt16LE(2);
  let p = 4;
  for (let i = 0; i < n; i++) {
    if (p + 18 > payload.length) return false;
    const bitmapLength = payload.readUInt16LE(p + 16);
    const rectEnd = p + 18 + bitmapLength;
    if (rectEnd > payload.length) return false;

    const width = payload.readUInt16LE(p + 8);
    const height = payload.readUInt16LE(p + 10);
    const destLeft = payload.readUInt16LE(p);
    const destTop = payload.readUInt16LE(p + 2);
    const destRight = payload.readUInt16LE(p + 4);
    const destBottom = payload.readUInt16LE(p + 6);
    const iw = destRight - destLeft + 1;
    const ih = destBottom - destTop + 1;
    const wantsCrop = needsStrideCrop(width, height, destLeft, destTop, destRight, destBottom);
    if (wantsCrop) return true;
    if (isWindowsTile(iw, ih)) {
      const flags = payload.readUInt16LE(p + 14);
      if (flags & BITMAP_COMPRESSION) {
        let rle = payload.subarray(p + 18, rectEnd);
        if ((flags & NO_BITMAP_COMPRESSION_HDR) === 0) {
          if (rle.length < 8) return true;
          rle = rle.subarray(8);
        }
        if (!isAbsoluteColorRle(rle)) return true;
      } else {
        return true;
      }
    }
    p = rectEnd;
  }
  return false;
}

/**
 * Empaqueta updateData ya reunido en un Fast-Path SINGLE (sin rewrite).
 */
function wrapFastPathUpdate(fpHeaderByte, updateHeader, updateData) {
  if (!Buffer.isBuffer(updateData) || updateData.length > 0xffff) return null;
  // Conservar updateCode + compression; limpiar bits de fragmentacion.
  const uh = (updateHeader & 0x0f) | (updateHeader & 0xc0);
  const sizeBuf = Buffer.alloc(2);
  sizeBuf.writeUInt16LE(updateData.length, 0);

  let lengthField = encodeFpLength(1 + 2 + 1 + 2 + updateData.length);
  let totalLen = 1 + lengthField.length + 1 + 2 + updateData.length;
  lengthField = encodeFpLength(totalLen);
  totalLen = 1 + lengthField.length + 1 + 2 + updateData.length;

  const out = Buffer.concat([
    Buffer.from([fpHeaderByte & 0xff]),
    lengthField,
    Buffer.from([uh]),
    sizeBuf,
    updateData
  ]);
  if (out.length !== totalLen) return null;
  return out;
}

/**
 * Reescribe un TS_UPDATE_BITMAP_DATA ya reunido (un Fast-Path o varios fragmentos).
 * updateHeader debe ir sin bits de fragmentacion.
 */
function rewriteBitmapPayload(fpHeaderByte, updateHeader, payload) {
  if (!Buffer.isBuffer(payload) || payload.length < 8) return null;
  if (payload.readUInt16LE(0) !== UPDATETYPE_BITMAP) return null;

  const n = payload.readUInt16LE(2);
  if (!bitmapPayloadNeedsRewrite(payload)) {
    return {
      buf: null,
      buffers: [],
      patchedCount: 0,
      numberRectangles: n,
      fallback: false,
      failed: 0
    };
  }

  const rectBuffers = [];
  let p = 4;
  let patchedCount = 0;
  let solidCount = 0;
  let cropCount = 0;
  let failed = 0;

  for (let i = 0; i < n; i++) {
    if (p + 18 > payload.length) return null;
    const bitmapLength = payload.readUInt16LE(p + 16);
    const rectEnd = p + 18 + bitmapLength;
    if (rectEnd > payload.length) return null;

    const rectBuf = payload.subarray(p, rectEnd);
    const width = rectBuf.readUInt16LE(8);
    const height = rectBuf.readUInt16LE(10);
    const destLeft = rectBuf.readUInt16LE(0);
    const destTop = rectBuf.readUInt16LE(2);
    const destRight = rectBuf.readUInt16LE(4);
    const destBottom = rectBuf.readUInt16LE(6);
    const iw = destRight - destLeft + 1;
    const ih = destBottom - destTop + 1;
    const wantsCrop = needsStrideCrop(width, height, destLeft, destTop, destRight, destBottom);
    const fixed = (wantsCrop || isWindowsTile(iw, ih)) ? fixOneBitmapRectStride(rectBuf) : null;

    if (fixed && fixed.buffers && fixed.buffers.length) {
      rectBuffers.push(...fixed.buffers);
      patchedCount += 1;
      solidCount += fixed.solidCount || 0;
      cropCount += fixed.cropCount || 0;
    } else {
      if (wantsCrop) failed += 1;
      // Copiar solo si hace falta reempaquetar; subarray se invalida al mutar el original.
      rectBuffers.push(Buffer.from(rectBuf));
    }
    p = rectEnd;
  }

  return finishBitmapRewrite(fpHeaderByte, updateHeader & 0x0f, rectBuffers, {
    patchedCount,
    solidCount,
    cropCount,
    numberRectangles: n,
    failed
  }, null);
}

function fixWallixBitmapStrideCrop(buf) {
  const info = inspectWallixFastPathBitmap(buf);
  if (!info || !info.ok) {
    return { buf, buffers: [buf], patchedCount: 0, numberRectangles: 0, fallback: false };
  }

  const payload = buf.subarray(info.payloadOffset, info.payloadOffset + info.size);
  const rewritten = rewriteBitmapPayload(info.fpHeaderByte, info.updateHeader, payload);
  if (!rewritten || !rewritten.buffers || !rewritten.buffers.length || rewritten.patchedCount === 0) {
    return {
      buf,
      buffers: [buf],
      patchedCount: 0,
      numberRectangles: rewritten ? rewritten.numberRectangles : 0,
      fallback: !rewritten,
      failed: rewritten ? rewritten.failed : 0
    };
  }
  rewritten.originalLength = buf.length;
  if (!rewritten.buf) rewritten.buf = rewritten.buffers[0];
  return rewritten;
}

/**
 * Junta fragmentos Fast-Path de bitmap (FIRST/NEXT/LAST) en un PDU SINGLE.
 * No reescribe RLE: eso lo hace fixWallixBitmapStrideCrop una sola vez.
 * El resto de PDUs sale en orden, sin esperar.
 */
class FastPathBitmapReassembler {
  constructor() {
    this.pending = null;
  }

  reset() {
    this.pending = null;
  }

  _abort() {
    if (!this.pending) return [];
    const frames = this.pending.frames;
    this.pending = null;
    return frames;
  }

  push(frame) {
    const parsed = parseFastPathUpdate(frame);
    const isBitmap = parsed
      && parsed.updateCode === FASTPATH_UPDATETYPE_BITMAP
      && parsed.compression === 0;
    const frag = isBitmap ? parsed.fragmentation : null;

    if (frag === FP_FRAG_FIRST) {
      const flushed = this._abort();
      // Copiar: el buffer del TLS puede reutilizarse en el siguiente chunk.
      this.pending = {
        frames: [Buffer.from(frame)],
        parts: [Buffer.from(parsed.updateData)],
        fpHeaderByte: parsed.fpHeaderByte,
        updateHeader: parsed.updateHeader
      };
      return flushed;
    }

    if (frag === FP_FRAG_NEXT || frag === FP_FRAG_LAST) {
      if (!this.pending) return [frame];
      this.pending.frames.push(Buffer.from(frame));
      this.pending.parts.push(Buffer.from(parsed.updateData));
      if (frag !== FP_FRAG_LAST) return [];
      const pending = this.pending;
      this.pending = null;
      const payload = Buffer.concat(pending.parts);
      const wrapped = wrapFastPathUpdate(pending.fpHeaderByte, pending.updateHeader, payload);
      if (!wrapped) return pending.frames;
      return [wrapped];
    }

    // SINGLE u otros updates: sin copia del frame (el bridge lo consume ya).
    const flushed = this._abort();
    flushed.push(frame);
    return flushed;
  }
}

module.exports = {
  FASTPATH_UPDATETYPE_BITMAP,
  UPDATETYPE_BITMAP,
  BITMAP_COMPRESSION,
  NO_BITMAP_COMPRESSION_HDR,
  FP_FRAG_SINGLE,
  FP_FRAG_LAST,
  FP_FRAG_FIRST,
  FP_FRAG_NEXT,
  MAX_FASTPATH_PDU,
  readFpLength,
  encodeFpLength,
  parseFastPathUpdate,
  inspectWallixFastPathBitmap,
  fixWallixBitmapDestStride,
  fixWallixBitmapStrideCrop,
  rewriteBitmapPayload,
  bitmapPayloadNeedsRewrite,
  wrapFastPathUpdate,
  fixOneBitmapRectStride,
  cropOneBitmapRect,
  needsStrideCrop,
  buildFastPathBitmapPdu,
  packRectBuffersToFastPath,
  FastPathBitmapReassembler
};
