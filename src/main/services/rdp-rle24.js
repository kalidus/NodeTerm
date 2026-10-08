/**
 * Interleaved RLE 24bpp (MS-RDPBCGR 3.1.9 Mode24Bpp).
 * Misma familia de ordenes que rdp-rle16.js; pixel = 3 bytes BGR.
 * Wallix APP suele enviar bitsPerPixel=24 tras negociar highColorDepth 24/32.
 */

'use strict';

const COLOR_DEPTH = 3;
const BLACK = Object.freeze([0, 0, 0]);
const WHITE = Object.freeze([0xff, 0xff, 0xff]);

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

function ensureFrom(rd, expected) {
  if (expected > rd.n - rd.p) {
    throw new RleError(`not enough bytes: expected ${expected}, got ${rd.n - rd.p}`);
  }
}

function ensureInto(dstPos, dstLen, required) {
  if (required > dstLen - dstPos) {
    throw new RleError(`invalid image size: can receive ${dstLen - dstPos}, need ${required}`);
  }
}

function extractRunLengthFgBg(header, lengthMask, rd) {
  const rl = header & lengthMask;
  if (rl === 0) {
    ensureFrom(rd, 1);
    return rd.b[rd.p++] + 1;
  }
  return rl * 8;
}

function extractRunLengthRegular(header, rd) {
  const rl = header & MASK_REGULAR_RUN_LENGTH;
  if (rl === 0) {
    ensureFrom(rd, 1);
    return rd.b[rd.p++] + 32;
  }
  return rl;
}

function extractRunLengthLite(header, rd) {
  const rl = header & MASK_LITE_RUN_LENGTH;
  if (rl === 0) {
    ensureFrom(rd, 1);
    return rd.b[rd.p++] + 16;
  }
  return rl;
}

function extractRunLengthMegaMega(rd) {
  ensureFrom(rd, 2);
  const runLength = rd.b[rd.p] | (rd.b[rd.p + 1] << 8);
  rd.p += 2;
  if (runLength === 0) throw new RleError('unexpected zero-length');
  return runLength;
}

function extractRunLength(code, header, rd) {
  switch (code) {
    case CODE.REGULAR_FGBG_IMAGE:
      return extractRunLengthFgBg(header, MASK_REGULAR_RUN_LENGTH, rd);
    case CODE.LITE_SET_FG_FGBG_IMAGE:
      return extractRunLengthFgBg(header, MASK_LITE_RUN_LENGTH, rd);
    case CODE.REGULAR_BG_RUN:
    case CODE.REGULAR_FG_RUN:
    case CODE.REGULAR_COLOR_RUN:
    case CODE.REGULAR_COLOR_IMAGE:
      return extractRunLengthRegular(header, rd);
    case CODE.LITE_SET_FG_FG_RUN:
    case CODE.LITE_DITHERED_RUN:
      return extractRunLengthLite(header, rd);
    case CODE.MEGA_MEGA_BG_RUN:
    case CODE.MEGA_MEGA_FG_RUN:
    case CODE.MEGA_MEGA_SET_FG_RUN:
    case CODE.MEGA_MEGA_DITHERED_RUN:
    case CODE.MEGA_MEGA_COLOR_RUN:
    case CODE.MEGA_MEGA_FGBG_IMAGE:
    case CODE.MEGA_MEGA_SET_FGBG_IMAGE:
    case CODE.MEGA_MEGA_COLOR_IMAGE:
      return extractRunLengthMegaMega(rd);
    default:
      return 0;
  }
}

function readPixel(rd) {
  ensureFrom(rd, 3);
  const p = rd.p;
  rd.p = p + 3;
  return [rd.b[p], rd.b[p + 1], rd.b[p + 2]];
}

function putPixel(dst, pos, pel) {
  dst[pos] = pel[0];
  dst[pos + 1] = pel[1];
  dst[pos + 2] = pel[2];
  return pos + 3;
}

function pelEq(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function fillPixels(dst, pos, n, pel) {
  for (let i = 0; i < n; i++) {
    pos = putPixel(dst, pos, pel);
  }
  return pos;
}

function writeFgBgImage(dst, pos, rowDelta, bitmask, fgPel, cBits) {
  ensureInto(pos, dst.length, cBits * COLOR_DEPTH);
  let mask = 0x01;
  for (let i = 0; i < 8 && cBits > 0; i++) {
    const a = pos - rowDelta;
    let b0 = dst[a];
    let b1 = dst[a + 1];
    let b2 = dst[a + 2];
    if (bitmask & mask) {
      b0 ^= fgPel[0];
      b1 ^= fgPel[1];
      b2 ^= fgPel[2];
    }
    dst[pos] = b0;
    dst[pos + 1] = b1;
    dst[pos + 2] = b2;
    pos += 3;
    cBits -= 1;
    mask <<= 1;
  }
  return pos;
}

function writeFirstLineFgBgImage(dst, pos, bitmask, fgPel, cBits) {
  ensureInto(pos, dst.length, cBits * COLOR_DEPTH);
  let mask = 0x01;
  for (let i = 0; i < 8 && cBits > 0; i++) {
    const pel = bitmask & mask ? fgPel : BLACK;
    pos = putPixel(dst, pos, pel);
    cBits -= 1;
    mask <<= 1;
  }
  return pos;
}

/**
 * Descomprime RLE 24bpp a buffer bottom-up (BGR, 3 bytes/pixel).
 * @returns {Buffer} width*height*3
 */
function decompress24bpp(src, width, height) {
  if (!Buffer.isBuffer(src)) src = Buffer.from(src);
  if (width <= 0 || height <= 0) throw new RleError('empty image');

  const rowDelta = COLOR_DEPTH * width;
  const dst = Buffer.alloc(rowDelta * height);
  const dstLen = dst.length;
  const rd = { b: src, p: 0, n: src.length };

  let dstPos = 0;
  let fgPel = WHITE.slice();
  let insertFgPel = false;
  let isFirstLine = true;

  while (rd.p < rd.n) {
    if (isFirstLine && dstPos >= rowDelta) {
      isFirstLine = false;
      insertFgPel = false;
    }

    ensureFrom(rd, 1);
    const header = rd.b[rd.p++];
    const code = decodeCode(header);
    const runLength = extractRunLength(code, header, rd);

    if (code === CODE.REGULAR_BG_RUN || code === CODE.MEGA_MEGA_BG_RUN) {
      ensureInto(dstPos, dstLen, runLength * COLOR_DEPTH);
      let n = runLength;
      if (isFirstLine) {
        if (insertFgPel) {
          dstPos = putPixel(dst, dstPos, fgPel);
          n -= 1;
        }
        dstPos += n * 3;
      } else {
        if (insertFgPel) {
          const a = dstPos - rowDelta;
          dst[dstPos] = dst[a] ^ fgPel[0];
          dst[dstPos + 1] = dst[a + 1] ^ fgPel[1];
          dst[dstPos + 2] = dst[a + 2] ^ fgPel[2];
          dstPos += 3;
          n -= 1;
        }
        if (n > 0) {
          const bytes = n * 3;
          if (bytes <= rowDelta) {
            dst.copyWithin(dstPos, dstPos - rowDelta, dstPos - rowDelta + bytes);
            dstPos += bytes;
          } else {
            for (let i = 0; i < n; i++) {
              dst[dstPos] = dst[dstPos - rowDelta];
              dst[dstPos + 1] = dst[dstPos - rowDelta + 1];
              dst[dstPos + 2] = dst[dstPos - rowDelta + 2];
              dstPos += 3;
            }
          }
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
        fgPel = readPixel(rd);
      }
      ensureInto(dstPos, dstLen, runLength * COLOR_DEPTH);
      if (isFirstLine) {
        dstPos = fillPixels(dst, dstPos, runLength, fgPel);
      } else {
        for (let i = 0; i < runLength; i++) {
          const a = dstPos - rowDelta;
          dst[dstPos] = dst[a] ^ fgPel[0];
          dst[dstPos + 1] = dst[a + 1] ^ fgPel[1];
          dst[dstPos + 2] = dst[a + 2] ^ fgPel[2];
          dstPos += 3;
        }
      }
    } else if (code === CODE.LITE_DITHERED_RUN || code === CODE.MEGA_MEGA_DITHERED_RUN) {
      const pixelA = readPixel(rd);
      const pixelB = readPixel(rd);
      ensureInto(dstPos, dstLen, runLength * 2 * COLOR_DEPTH);
      for (let i = 0; i < runLength; i++) {
        dstPos = putPixel(dst, dstPos, pixelA);
        dstPos = putPixel(dst, dstPos, pixelB);
      }
    } else if (code === CODE.REGULAR_COLOR_RUN || code === CODE.MEGA_MEGA_COLOR_RUN) {
      const pixel = readPixel(rd);
      ensureInto(dstPos, dstLen, runLength * COLOR_DEPTH);
      dstPos = fillPixels(dst, dstPos, runLength, pixel);
    } else if (
      code === CODE.REGULAR_FGBG_IMAGE ||
      code === CODE.MEGA_MEGA_FGBG_IMAGE ||
      code === CODE.LITE_SET_FG_FGBG_IMAGE ||
      code === CODE.MEGA_MEGA_SET_FGBG_IMAGE
    ) {
      if (code === CODE.LITE_SET_FG_FGBG_IMAGE || code === CODE.MEGA_MEGA_SET_FGBG_IMAGE) {
        fgPel = readPixel(rd);
      }
      let numberToRead = runLength;
      while (numberToRead > 0) {
        const cBits = numberToRead < 8 ? numberToRead : 8;
        ensureFrom(rd, 1);
        const bitmask = rd.b[rd.p++];
        if (isFirstLine) {
          dstPos = writeFirstLineFgBgImage(dst, dstPos, bitmask, fgPel, cBits);
        } else {
          dstPos = writeFgBgImage(dst, dstPos, rowDelta, bitmask, fgPel, cBits);
        }
        numberToRead -= cBits;
      }
    } else if (code === CODE.REGULAR_COLOR_IMAGE || code === CODE.MEGA_MEGA_COLOR_IMAGE) {
      const byteCount = runLength * COLOR_DEPTH;
      ensureFrom(rd, byteCount);
      ensureInto(dstPos, dstLen, byteCount);
      src.copy(dst, dstPos, rd.p, rd.p + byteCount);
      rd.p += byteCount;
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
      ensureInto(dstPos, dstLen, COLOR_DEPTH);
      dstPos = putPixel(dst, dstPos, WHITE);
    } else if (code === CODE.SPECIAL_BLACK) {
      ensureInto(dstPos, dstLen, COLOR_DEPTH);
      dstPos = putPixel(dst, dstPos, BLACK);
    } else {
      throw new RleError(`bad RLE order code 0x${code.toString(16)}`);
    }
  }

  return dst;
}

function cropRgb24(src, srcWidth, srcHeight, destWidth, destHeight) {
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

function isAbsoluteColorRle24(rle) {
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
        if (o + 3 + COLOR_DEPTH > rle.length) return false;
        o += 3 + COLOR_DEPTH;
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

function writeColorRun(out, o, run, pel) {
  let left = run;
  while (left > 0) {
    if (left >= 288) {
      const n = Math.min(left, 0xffff);
      out[o++] = CODE.MEGA_MEGA_COLOR_RUN;
      out[o++] = n & 0xff;
      out[o++] = n >> 8;
      out[o++] = pel[0];
      out[o++] = pel[1];
      out[o++] = pel[2];
      left -= n;
      continue;
    }
    if (left >= 32) {
      out[o++] = 0x60;
      out[o++] = left - 32;
    } else {
      out[o++] = 0x60 | left;
    }
    out[o++] = pel[0];
    out[o++] = pel[1];
    out[o++] = pel[2];
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

function encodeCompactRgb24(pixels) {
  if (!Buffer.isBuffer(pixels) || pixels.length % COLOR_DEPTH !== 0) {
    throw new RleError('invalid pixel buffer');
  }
  const pixelCount = pixels.length / COLOR_DEPTH;
  if (pixelCount === 0) throw new RleError('empty pixels');

  const out = Buffer.allocUnsafe(pixelCount * 4);
  let o = 0;
  let i = 0;
  while (i < pixelCount) {
    const base = i * 3;
    const pel = [pixels[base], pixels[base + 1], pixels[base + 2]];
    let run = 1;
    const runCap = Math.min(0xffff, pixelCount - i);
    let rp = base + 3;
    while (
      run < runCap &&
      pixels[rp] === pel[0] &&
      pixels[rp + 1] === pel[1] &&
      pixels[rp + 2] === pel[2]
    ) {
      run += 1;
      rp += 3;
    }
    if (run >= 2) {
      o = writeColorRun(out, o, run, pel);
      i += run;
      continue;
    }

    let j = i;
    while (j < pixelCount && (j - i) < 0xffff) {
      if (j + 1 < pixelCount) {
        const q = j * 3;
        if (
          pixels[q] === pixels[q + 3] &&
          pixels[q + 1] === pixels[q + 4] &&
          pixels[q + 2] === pixels[q + 5]
        ) break;
      }
      j += 1;
    }
    if (j === i) j = i + 1;
    const n = j - i;
    if (n === 1 && pelEq(pel, WHITE)) {
      out[o++] = CODE.SPECIAL_WHITE;
    } else if (n === 1 && pelEq(pel, BLACK)) {
      out[o++] = CODE.SPECIAL_BLACK;
    } else {
      o = writeColorImage(out, o, pixels, i, n);
    }
    i = j;
  }
  return out.subarray(0, o);
}

function encodeRgb24Rle(pixels) {
  return encodeCompactRgb24(pixels);
}

module.exports = {
  RleError,
  decompress24bpp,
  cropRgb24,
  encodeCompactRgb24,
  encodeRgb24Rle,
  isAbsoluteColorRle24,
  COLOR_DEPTH
};
