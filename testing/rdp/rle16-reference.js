/**
 * Interleaved RLE 16bpp (MS-RDPBCGR 3.1.9), port de IronRDP ironrdp-graphics/rle.rs.
 * Solo Mode16Bpp: Wallix envia bitsPerPixel=16.
 */

'use strict';

const COLOR_DEPTH = 2;
const BLACK_PIXEL = 0x0000;
const WHITE_PIXEL = 0xffff;

const CODE = {
  REGULAR_BG_RUN: 0x00,
  REGULAR_FG_RUN: 0x01,
  REGULAR_FGBG_IMAGE: 0x02,
  REGULAR_COLOR_RUN: 0x03,
  REGULAR_COLOR_IMAGE: 0x04,
  LITE_SET_FG_FG_RUN: 0x0c,
  LITE_SET_FG_FGBG_IMAGE: 0x0d,
  LITE_DITHERED_RUN: 0x0e,
  MEGA_MEGA_BG_RUN: 0xf0,
  MEGA_MEGA_FG_RUN: 0xf1,
  MEGA_MEGA_FGBG_IMAGE: 0xf2,
  MEGA_MEGA_COLOR_RUN: 0xf3,
  MEGA_MEGA_COLOR_IMAGE: 0xf4,
  MEGA_MEGA_SET_FG_RUN: 0xf6,
  MEGA_MEGA_SET_FGBG_IMAGE: 0xf7,
  MEGA_MEGA_DITHERED_RUN: 0xf8,
  SPECIAL_FGBG_1: 0xf9,
  SPECIAL_FGBG_2: 0xfa,
  SPECIAL_WHITE: 0xfd,
  SPECIAL_BLACK: 0xfe
};

const MASK_REGULAR_RUN_LENGTH = 0x1f;
const MASK_LITE_RUN_LENGTH = 0x0f;
const MASK_SPECIAL_FG_BG_1 = 0x03;
const MASK_SPECIAL_FG_BG_2 = 0x05;

class RleError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RleError';
  }
}

function decodeCode(header) {
  if ((header & 0xc0) !== 0xc0) return header >> 5;
  if ((header & 0xf0) === 0xf0) return header;
  return header >> 4;
}

function extractRunLengthFgBg(header, lengthMask, src) {
  const rl = header & lengthMask;
  if (rl === 0) {
    ensureFrom(src, 1);
    return src.readUInt8(src._pos++) + 1;
  }
  return rl * 8;
}

function extractRunLengthRegular(header, src) {
  const rl = header & MASK_REGULAR_RUN_LENGTH;
  if (rl === 0) {
    ensureFrom(src, 1);
    return src.readUInt8(src._pos++) + 32;
  }
  return rl;
}

function extractRunLengthLite(header, src) {
  const rl = header & MASK_LITE_RUN_LENGTH;
  if (rl === 0) {
    ensureFrom(src, 1);
    return src.readUInt8(src._pos++) + 16;
  }
  return rl;
}

function extractRunLengthMegaMega(src) {
  ensureFrom(src, 2);
  const runLength = src.readUInt16LE(src._pos);
  src._pos += 2;
  if (runLength === 0) throw new RleError('unexpected zero-length');
  return runLength;
}

function extractRunLength(code, header, src) {
  switch (code) {
    case CODE.REGULAR_FGBG_IMAGE:
      return extractRunLengthFgBg(header, MASK_REGULAR_RUN_LENGTH, src);
    case CODE.LITE_SET_FG_FGBG_IMAGE:
      return extractRunLengthFgBg(header, MASK_LITE_RUN_LENGTH, src);
    case CODE.REGULAR_BG_RUN:
    case CODE.REGULAR_FG_RUN:
    case CODE.REGULAR_COLOR_RUN:
    case CODE.REGULAR_COLOR_IMAGE:
      return extractRunLengthRegular(header, src);
    case CODE.LITE_SET_FG_FG_RUN:
    case CODE.LITE_DITHERED_RUN:
      return extractRunLengthLite(header, src);
    case CODE.MEGA_MEGA_BG_RUN:
    case CODE.MEGA_MEGA_FG_RUN:
    case CODE.MEGA_MEGA_SET_FG_RUN:
    case CODE.MEGA_MEGA_DITHERED_RUN:
    case CODE.MEGA_MEGA_COLOR_RUN:
    case CODE.MEGA_MEGA_FGBG_IMAGE:
    case CODE.MEGA_MEGA_SET_FGBG_IMAGE:
    case CODE.MEGA_MEGA_COLOR_IMAGE:
      return extractRunLengthMegaMega(src);
    case CODE.SPECIAL_FGBG_1:
    case CODE.SPECIAL_FGBG_2:
    case CODE.SPECIAL_WHITE:
    case CODE.SPECIAL_BLACK:
      return 0;
    default:
      return 0;
  }
}

function ensureFrom(src, expected) {
  const actual = src.length - src._pos;
  if (expected > actual) {
    throw new RleError(`not enough bytes: expected ${expected}, got ${actual}`);
  }
}

function ensureInto(dstPos, dstLen, required) {
  if (required > dstLen - dstPos) {
    throw new RleError(
      `invalid image size: can receive ${dstLen - dstPos}, need ${required}`
    );
  }
}

function readPixel(src) {
  const v = src.readUInt16LE(src._pos);
  src._pos += 2;
  return v;
}

function writePixel(dst, pos, pixel) {
  dst.writeUInt16LE(pixel, pos);
  return pos + 2;
}

function readPixelAbove(dst, pos, rowDelta) {
  return dst.readUInt16LE(pos - rowDelta);
}

function writeFgBgImage(dst, pos, rowDelta, bitmask, fgPel, cBits) {
  ensureInto(pos, dst.length, cBits * COLOR_DEPTH);
  let mask = 0x01;
  for (let i = 0; i < 8 && cBits > 0; i++) {
    const above = readPixelAbove(dst, pos, rowDelta);
    pos = writePixel(dst, pos, bitmask & mask ? above ^ fgPel : above);
    cBits -= 1;
    mask <<= 1;
  }
  return pos;
}

function writeFirstLineFgBgImage(dst, pos, bitmask, fgPel, cBits) {
  ensureInto(pos, dst.length, cBits * COLOR_DEPTH);
  let mask = 0x01;
  for (let i = 0; i < 8 && cBits > 0; i++) {
    pos = writePixel(dst, pos, bitmask & mask ? fgPel : BLACK_PIXEL);
    cBits -= 1;
    mask <<= 1;
  }
  return pos;
}

/**
 * Descomprime RLE 16bpp a buffer bottom-up (primera fila = abajo de la imagen).
 * @returns {Buffer} tamanio width*height*2
 */
function decompress16bpp(src, width, height) {
  if (!Buffer.isBuffer(src)) src = Buffer.from(src);
  if (width <= 0 || height <= 0) throw new RleError('empty image');

  const rowDelta = COLOR_DEPTH * width;
  const dst = Buffer.alloc(rowDelta * height);
  const srcBuf = src;
  srcBuf._pos = 0;

  let dstPos = 0;
  let fgPel = WHITE_PIXEL;
  let insertFgPel = false;
  let isFirstLine = true;

  while (srcBuf._pos < srcBuf.length) {
    if (isFirstLine && dstPos >= rowDelta) {
      isFirstLine = false;
      insertFgPel = false;
    }

    ensureFrom(srcBuf, 1);
    const header = srcBuf.readUInt8(srcBuf._pos++);
    const code = decodeCode(header);
    const runLength = extractRunLength(code, header, srcBuf);

    if (code === CODE.REGULAR_BG_RUN || code === CODE.MEGA_MEGA_BG_RUN) {
      ensureInto(dstPos, dst.length, runLength * COLOR_DEPTH);
      if (isFirstLine) {
        let n = runLength;
        if (insertFgPel) {
          dstPos = writePixel(dst, dstPos, fgPel);
          n -= 1;
        }
        for (let i = 0; i < n; i++) dstPos = writePixel(dst, dstPos, BLACK_PIXEL);
      } else {
        let n = runLength;
        if (insertFgPel) {
          const xored = readPixelAbove(dst, dstPos, rowDelta) ^ fgPel;
          dstPos = writePixel(dst, dstPos, xored);
          n -= 1;
        }
        for (let i = 0; i < n; i++) {
          dstPos = writePixel(dst, dstPos, readPixelAbove(dst, dstPos, rowDelta));
        }
      }
      insertFgPel = true;
      continue;
    }

    insertFgPel = false;

    if (
      code === CODE.REGULAR_FG_RUN ||
      code === CODE.MEGA_MEGA_FG_RUN ||
      code === CODE.LITE_SET_FG_FG_RUN ||
      code === CODE.MEGA_MEGA_SET_FG_RUN
    ) {
      if (code === CODE.LITE_SET_FG_FG_RUN || code === CODE.MEGA_MEGA_SET_FG_RUN) {
        ensureFrom(srcBuf, COLOR_DEPTH);
        fgPel = readPixel(srcBuf);
      }
      ensureInto(dstPos, dst.length, runLength * COLOR_DEPTH);
      if (isFirstLine) {
        for (let i = 0; i < runLength; i++) dstPos = writePixel(dst, dstPos, fgPel);
      } else {
        for (let i = 0; i < runLength; i++) {
          dstPos = writePixel(dst, dstPos, readPixelAbove(dst, dstPos, rowDelta) ^ fgPel);
        }
      }
    } else if (code === CODE.LITE_DITHERED_RUN || code === CODE.MEGA_MEGA_DITHERED_RUN) {
      ensureFrom(srcBuf, 2 * COLOR_DEPTH);
      const pixelA = readPixel(srcBuf);
      const pixelB = readPixel(srcBuf);
      ensureInto(dstPos, dst.length, runLength * 2 * COLOR_DEPTH);
      for (let i = 0; i < runLength; i++) {
        dstPos = writePixel(dst, dstPos, pixelA);
        dstPos = writePixel(dst, dstPos, pixelB);
      }
    } else if (code === CODE.REGULAR_COLOR_RUN || code === CODE.MEGA_MEGA_COLOR_RUN) {
      ensureFrom(srcBuf, COLOR_DEPTH);
      const pixel = readPixel(srcBuf);
      ensureInto(dstPos, dst.length, runLength * COLOR_DEPTH);
      for (let i = 0; i < runLength; i++) dstPos = writePixel(dst, dstPos, pixel);
    } else if (
      code === CODE.REGULAR_FGBG_IMAGE ||
      code === CODE.MEGA_MEGA_FGBG_IMAGE ||
      code === CODE.LITE_SET_FG_FGBG_IMAGE ||
      code === CODE.MEGA_MEGA_SET_FGBG_IMAGE
    ) {
      if (code === CODE.LITE_SET_FG_FGBG_IMAGE || code === CODE.MEGA_MEGA_SET_FGBG_IMAGE) {
        ensureFrom(srcBuf, COLOR_DEPTH);
        fgPel = readPixel(srcBuf);
      }
      let numberToRead = runLength;
      while (numberToRead > 0) {
        const cBits = Math.min(8, numberToRead);
        ensureFrom(srcBuf, 1);
        const bitmask = srcBuf.readUInt8(srcBuf._pos++);
        if (isFirstLine) {
          dstPos = writeFirstLineFgBgImage(dst, dstPos, bitmask, fgPel, cBits);
        } else {
          dstPos = writeFgBgImage(dst, dstPos, rowDelta, bitmask, fgPel, cBits);
        }
        numberToRead -= cBits;
      }
    } else if (code === CODE.REGULAR_COLOR_IMAGE || code === CODE.MEGA_MEGA_COLOR_IMAGE) {
      const byteCount = runLength * COLOR_DEPTH;
      ensureFrom(srcBuf, byteCount);
      ensureInto(dstPos, dst.length, byteCount);
      srcBuf.copy(dst, dstPos, srcBuf._pos, srcBuf._pos + byteCount);
      srcBuf._pos += byteCount;
      dstPos += byteCount;
    } else if (code === CODE.SPECIAL_FGBG_1) {
      if (isFirstLine) {
        dstPos = writeFirstLineFgBgImage(dst, dstPos, MASK_SPECIAL_FG_BG_1, fgPel, 8);
      } else {
        dstPos = writeFgBgImage(dst, dstPos, rowDelta, MASK_SPECIAL_FG_BG_1, fgPel, 8);
      }
    } else if (code === CODE.SPECIAL_FGBG_2) {
      if (isFirstLine) {
        dstPos = writeFirstLineFgBgImage(dst, dstPos, MASK_SPECIAL_FG_BG_2, fgPel, 8);
      } else {
        dstPos = writeFgBgImage(dst, dstPos, rowDelta, MASK_SPECIAL_FG_BG_2, fgPel, 8);
      }
    } else if (code === CODE.SPECIAL_WHITE) {
      ensureInto(dstPos, dst.length, COLOR_DEPTH);
      dstPos = writePixel(dst, dstPos, WHITE_PIXEL);
    } else if (code === CODE.SPECIAL_BLACK) {
      ensureInto(dstPos, dst.length, COLOR_DEPTH);
      dstPos = writePixel(dst, dstPos, BLACK_PIXEL);
    } else {
      throw new RleError(`bad RLE order code 0x${code.toString(16)}`);
    }
  }

  return dst;
}

/**
 * Recorta al dest-rect (columnas derechas + filas que IronRDP pintaria fuera).
 * Buffer bottom-up: fila 0 = abajo de la imagen.
 * IronRDP apply_rgb16 hace chunks(anchoDestino).rev() y pinta la ultima fila
 * del buffer en destTop. Con alto de mas, esas filas de abajo se dibujan
 * por debajo del rectangulo. Se conservan las ultimas destHeight filas
 * (la parte superior visible) y se descarta el inicio del buffer.
 */
function cropRgb16(src, srcWidth, srcHeight, destWidth, destHeight) {
  if (destWidth > srcWidth || destHeight > srcHeight) {
    throw new RleError('crop larger than source');
  }
  if (destWidth === srcWidth && destHeight === srcHeight) {
    return Buffer.from(src);
  }
  const out = Buffer.alloc(destWidth * destHeight * COLOR_DEPTH);
  const y0 = srcHeight - destHeight;
  for (let y = 0; y < destHeight; y++) {
    const srcOff = (y0 + y) * srcWidth * COLOR_DEPTH;
    const dstOff = y * destWidth * COLOR_DEPTH;
    src.copy(out, dstOff, srcOff, srcOff + destWidth * COLOR_DEPTH);
  }
  return out;
}

/**
 * True si el RLE es solo color absoluto (REGULAR o MEGA_MEGA COLOR_RUN /
 * COLOR_IMAGE, o SPECIAL blanco/negro). IronRDP 0.7 pinta eso sin el codec
 * por deltas. Un FG_RUN o un FGBG devuelve false.
 */
function isAbsoluteColorRle(rle) {
  if (!Buffer.isBuffer(rle) || rle.length === 0) return false;
  let o = 0;
  while (o < rle.length) {
    const b = rle[o];
    if (b === CODE.SPECIAL_WHITE || b === CODE.SPECIAL_BLACK) {
      o += 1;
      continue;
    }
    if (b === CODE.MEGA_MEGA_COLOR_RUN || b === CODE.MEGA_MEGA_COLOR_IMAGE) {
      if (o + 3 > rle.length) return false;
      const run = rle.readUInt16LE(o + 1);
      if (run === 0) return false;
      if (b === CODE.MEGA_MEGA_COLOR_RUN) {
        if (o + 5 > rle.length) return false;
        o += 5;
      } else {
        const bytes = 3 + run * COLOR_DEPTH;
        if (o + bytes > rle.length) return false;
        o += bytes;
      }
      continue;
    }
    const op = b & 0xe0;
    if (op === 0x60 || op === 0x80) {
      let run = b & MASK_REGULAR_RUN_LENGTH;
      let hdr = 1;
      if (run === 0) {
        if (o + 2 > rle.length) return false;
        run = rle[o + 1] + 32;
        hdr = 2;
      }
      if (run === 0) return false;
      if (op === 0x60) {
        if (o + hdr + COLOR_DEPTH > rle.length) return false;
        o += hdr + COLOR_DEPTH;
      } else {
        const bytes = hdr + run * COLOR_DEPTH;
        if (o + bytes > rle.length) return false;
        o += bytes;
      }
      continue;
    }
    return false;
  }
  return true;
}

function isUniformRgb16(pixels) {
  if (!Buffer.isBuffer(pixels) || pixels.length < COLOR_DEPTH) return false;
  if (pixels.length % COLOR_DEPTH !== 0) return false;
  const a = pixels[0];
  const b = pixels[1];
  for (let i = 2; i < pixels.length; i += 2) {
    if (pixels[i] !== a || pixels[i + 1] !== b) return false;
  }
  return true;
}

/**
 * Empaqueta pixels RGB16 como un unico MEGA_MEGA_COLOR_IMAGE (sin hdr RDP).
 */
function encodeMegaMegaColorImage(pixels) {
  if (!Buffer.isBuffer(pixels) || pixels.length % COLOR_DEPTH !== 0) {
    throw new RleError('invalid pixel buffer');
  }
  const pixelCount = pixels.length / COLOR_DEPTH;
  if (pixelCount === 0 || pixelCount > 0xffff) {
    throw new RleError('pixel count out of range for MEGA_MEGA_COLOR_IMAGE');
  }
  const out = Buffer.alloc(3 + pixels.length);
  out[0] = 0xf4; // MEGA_MEGA_COLOR_IMAGE
  out.writeUInt16LE(pixelCount, 1);
  pixels.copy(out, 3);
  return out;
}

/**
 * Relleno solido: MEGA_MEGA_COLOR_RUN (5 bytes) en lugar de volcar todos los pixels.
 */
function encodeMegaMegaColorRun(pixelCount, color) {
  if (pixelCount <= 0 || pixelCount > 0xffff) {
    throw new RleError('pixel count out of range for MEGA_MEGA_COLOR_RUN');
  }
  const out = Buffer.alloc(5);
  out[0] = 0xf3; // MEGA_MEGA_COLOR_RUN
  out.writeUInt16LE(pixelCount, 1);
  out.writeUInt16LE(color & 0xffff, 3);
  return out;
}

function pelAt(pixels, index) {
  const o = index * COLOR_DEPTH;
  return pixels[o] | (pixels[o + 1] << 8);
}

/**
 * COLOR_RUN absoluto. Corridas cortas van en la orden regular (3 o 4 bytes);
 * a partir de 288 pixeles, MEGA_MEGA (5 bytes) sale mas corta.
 */
function writeColorRun(out, o, run, color) {
  let left = run;
  while (left > 0) {
    if (left >= 288) {
      const n = Math.min(left, 0xffff);
      out[o++] = CODE.MEGA_MEGA_COLOR_RUN;
      out.writeUInt16LE(n, o);
      o += 2;
      out.writeUInt16LE(color, o);
      o += 2;
      left -= n;
      continue;
    }
    if (left >= 32) {
      out[o++] = 0x60;
      out[o++] = left - 32;
    } else {
      out[o++] = 0x60 | left;
    }
    out.writeUInt16LE(color, o);
    o += 2;
    break;
  }
  return o;
}

function writeColorImage(out, o, pixels, startPixel, count) {
  let left = count;
  let p = startPixel;
  while (left > 0) {
    const n = Math.min(left, 0xffff);
    if (n >= 288) {
      out[o++] = CODE.MEGA_MEGA_COLOR_IMAGE;
      out.writeUInt16LE(n, o);
      o += 2;
    } else if (n >= 32) {
      out[o++] = 0x80;
      out[o++] = n - 32;
    } else {
      out[o++] = 0x80 | n;
    }
    const bytes = n * COLOR_DEPTH;
    pixels.copy(out, o, p * COLOR_DEPTH, p * COLOR_DEPTH + bytes);
    o += bytes;
    p += n;
    left -= n;
  }
  return o;
}

/**
 * RLE absoluto y corto: COLOR_RUN / COLOR_IMAGE regulares, MEGA_MEGA solo
 * en tramos largos, SPECIAL para un pixel blanco o negro suelto.
 * Una sola reserva: el arrastre reescribe decenas de teselas por frame y
 * un Buffer por orden llenaba el hilo principal.
 */
function encodeCompactRgb16(pixels) {
  if (!Buffer.isBuffer(pixels) || pixels.length % COLOR_DEPTH !== 0) {
    throw new RleError('invalid pixel buffer');
  }
  const pixelCount = pixels.length / COLOR_DEPTH;
  if (pixelCount === 0) throw new RleError('empty pixels');

  const out = Buffer.alloc(pixelCount * 3);
  let o = 0;
  let i = 0;
  while (i < pixelCount) {
    const color = pelAt(pixels, i);
    let run = 1;
    const runCap = Math.min(0xffff, pixelCount - i);
    while (run < runCap && pelAt(pixels, i + run) === color) run += 1;
    if (run >= 2) {
      o = writeColorRun(out, o, run, color);
      i += run;
      continue;
    }

    let j = i;
    while (j < pixelCount && (j - i) < 0xffff) {
      const c = pelAt(pixels, j);
      if (j + 1 < pixelCount && pelAt(pixels, j + 1) === c) break;
      j += 1;
    }
    if (j === i) j = i + 1;
    const n = j - i;
    if (n === 1 && color === WHITE_PIXEL) {
      out[o++] = CODE.SPECIAL_WHITE;
    } else if (n === 1 && color === BLACK_PIXEL) {
      out[o++] = CODE.SPECIAL_BLACK;
    } else {
      o = writeColorImage(out, o, pixels, i, n);
    }
    i = j;
  }
  return out.subarray(0, o);
}

/**
 * Elige encoding compacto: solido -> COLOR_RUN; si no -> COLOR_RUN + COLOR_IMAGE.
 */
function encodeRgb16Rle(pixels) {
  return encodeCompactRgb16(pixels);
}

module.exports = {
  RleError,
  decompress16bpp,
  cropRgb16,
  isUniformRgb16,
  encodeMegaMegaColorImage,
  encodeMegaMegaColorRun,
  encodeCompactRgb16,
  encodeRgb16Rle,
  isAbsoluteColorRle,
  COLOR_DEPTH
};
