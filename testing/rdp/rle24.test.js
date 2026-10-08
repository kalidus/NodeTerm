'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  decompress24bpp,
  cropRgb24,
  encodeCompactRgb24,
  isAbsoluteColorRle24,
  RleError
} = require('../../src/main/services/rdp-rle24');

describe('rdp-rle24', () => {
  it('COLOR_RUN solido round-trip', () => {
    const w = 8;
    const h = 4;
    const pixels = Buffer.alloc(w * h * 3);
    for (let i = 0; i < pixels.length; i += 3) {
      pixels[i] = 0x10;
      pixels[i + 1] = 0x20;
      pixels[i + 2] = 0x30;
    }
    const rle = encodeCompactRgb24(pixels);
    assert.equal(isAbsoluteColorRle24(rle), true);
    const out = decompress24bpp(rle, w, h);
    assert.ok(out.equals(pixels));
  });

  it('COLOR_IMAGE mixto round-trip', () => {
    const w = 5;
    const h = 3;
    const pixels = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      pixels[i * 3] = i & 0xff;
      pixels[i * 3 + 1] = (i * 3) & 0xff;
      pixels[i * 3 + 2] = (i * 7) & 0xff;
    }
    const rle = encodeCompactRgb24(pixels);
    assert.equal(isAbsoluteColorRle24(rle), true);
    const out = decompress24bpp(rle, w, h);
    assert.ok(out.equals(pixels));
  });

  it('cropRgb24 conserva la parte superior visible (bottom-up)', () => {
    const srcW = 6;
    const srcH = 4;
    const src = Buffer.alloc(srcW * srcH * 3);
    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        const o = (y * srcW + x) * 3;
        src[o] = y;
        src[o + 1] = x;
        src[o + 2] = 99;
      }
    }
    const cropped = cropRgb24(src, srcW, srcH, 4, 2);
    assert.equal(cropped.length, 4 * 2 * 3);
    // y0 = srcH - destH = 2: filas 2 y 3 del origen
    assert.equal(cropped[0], 2);
    assert.equal(cropped[1], 0);
    assert.equal(cropped[4 * 3], 3);
    assert.equal(cropped[4 * 3 + 1], 0);
  });

  it('rechaza buffers invalidos', () => {
    assert.throws(() => encodeCompactRgb24(Buffer.alloc(2)), RleError);
    assert.throws(() => decompress24bpp(Buffer.alloc(0), 0, 1), RleError);
  });
});
