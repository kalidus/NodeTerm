'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  inspectWallixFastPathBitmap,
  fixWallixBitmapDestStride,
  fixWallixBitmapStrideCrop,
  readFpLength
} = require('../../src/main/services/rdp-fastpath-helpers');
const {
  decompress16bpp,
  cropRgb16,
  encodeMegaMegaColorImage,
  encodeRgb16Rle,
  encodeMegaMegaColorRun
} = require('../../src/main/services/rdp-rle16');
const { alignDesktopDimension } = require('../../src/main/services/rdp-mcs-helpers');

describe('inspectWallixFastPathBitmap', () => {
  for (const name of ['from-14-7966b.hex', 'from-15-7960b.hex', 'from-16-7956b.hex', 'from-17-5651b.hex']) {
    it(`${name} trae updateType=1 (IronRDP lo necesita)`, () => {
      const p = path.join(__dirname, 'frames', name);
      if (!fs.existsSync(p)) return;
      const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
      const info = inspectWallixFastPathBitmap(raw);
      assert.ok(info);
      assert.equal(info.ok, true);
      assert.equal(info.hasUpdateType, true);
      assert.ok(info.numberRectangles > 1);
    });
  }
});

describe('decompress16bpp', () => {
  it('regular foreground run (IronRDP unit test)', () => {
    const out = decompress16bpp(Buffer.from([0x22]), 1, 2);
    assert.deepEqual([...out], [0xff, 0xff, 0xff, 0xff]);
  });

  it('cropRgb16 descarta padding derecho e inferior (bottom-up)', () => {
    // 4x3, dest 3x2: quitar col derecha y 1 fila inferior (inicio buffer)
    const src = Buffer.alloc(4 * 3 * 2);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        src.writeUInt16LE((y << 8) | x, (y * 4 + x) * 2);
      }
    }
    const out = cropRgb16(src, 4, 3, 3, 2);
    assert.equal(out.length, 3 * 2 * 2);
    // filas buffer 1 y 2 (skip row 0), cols 0..2
    assert.equal(out.readUInt16LE(0), 0x0100);
    assert.equal(out.readUInt16LE(2), 0x0101);
    assert.equal(out.readUInt16LE(4), 0x0102);
    assert.equal(out.readUInt16LE(6), 0x0200);
  });

  it('encodeMegaMegaColorImage roundtrip', () => {
    const pixels = Buffer.alloc(8);
    pixels.writeUInt16LE(0x1234, 0);
    pixels.writeUInt16LE(0xabcd, 2);
    pixels.writeUInt16LE(0x0000, 4);
    pixels.writeUInt16LE(0xffff, 6);
    const enc = encodeMegaMegaColorImage(pixels);
    const dec = decompress16bpp(enc, 2, 2);
    assert.deepEqual([...dec], [...pixels]);
  });

  it('encodeRgb16Rle usa COLOR_RUN para solidos', () => {
    const pixels = Buffer.alloc(20);
    for (let i = 0; i < 10; i++) pixels.writeUInt16LE(0xfff3, i * 2);
    const enc = encodeRgb16Rle(pixels);
    assert.equal(enc[0], 0xf3);
    assert.equal(enc.length, 5);
    const dec = decompress16bpp(enc, 5, 2);
    assert.equal(dec.length, 20);
    assert.equal(dec.readUInt16LE(0), 0xfff3);
  });

  it('encodeMegaMegaColorRun roundtrip', () => {
    const enc = encodeMegaMegaColorRun(4, 0x1234);
    const dec = decompress16bpp(enc, 2, 2);
    assert.deepEqual([...dec], [0x34, 0x12, 0x34, 0x12, 0x34, 0x12, 0x34, 0x12]);
  });
});

describe('fixWallixBitmapDestStride', () => {
  it('expande dest para coincidir con width/height (from-14-581)', () => {
    const p = path.join(__dirname, 'frames/from-14-581b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const result = fixWallixBitmapDestStride(raw);
    assert.ok(result.patchedCount > 0);

    const info = inspectWallixFastPathBitmap(result.buf);
    const pay = result.buf.subarray(info.payloadOffset, info.payloadOffset + info.size);
    let pOff = 4;
    for (let i = 0; i < Math.min(3, info.numberRectangles); i++) {
      const L = pay.readUInt16LE(pOff);
      const T = pay.readUInt16LE(pOff + 2);
      const R = pay.readUInt16LE(pOff + 4);
      const B = pay.readUInt16LE(pOff + 6);
      const W = pay.readUInt16LE(pOff + 8);
      const H = pay.readUInt16LE(pOff + 10);
      const blen = pay.readUInt16LE(pOff + 16);
      assert.equal(R - L + 1, W);
      assert.equal(B - T + 1, H);
      pOff += 18 + blen;
    }
  });

  it('no toca TPKT', () => {
    const p = path.join(__dirname, 'frames/from-12-205b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const result = fixWallixBitmapDestStride(raw);
    assert.equal(result.patchedCount, 0);
  });
});

describe('fixWallixBitmapStrideCrop', () => {
  it('corrige stride en from-14-581 eliminando el padding sin skew', () => {
    const p = path.join(__dirname, 'frames/from-14-581b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const result = fixWallixBitmapStrideCrop(raw);
    assert.ok(result.patchedCount > 0);
    assert.equal(result.fallback, false);
    assert.ok(result.buffers.length >= 1);

    for (const pdu of result.buffers) {
      const fp = readFpLength(pdu);
      assert.ok(fp);
      assert.equal(fp.length, pdu.length);
      const info = inspectWallixFastPathBitmap(pdu);
      assert.ok(info && info.ok);
      const pay = pdu.subarray(info.payloadOffset, info.payloadOffset + info.size);
      let o = 4;
      for (let i = 0; i < info.numberRectangles; i++) {
        const L = pay.readUInt16LE(o);
        const T = pay.readUInt16LE(o + 2);
        const R = pay.readUInt16LE(o + 4);
        const B = pay.readUInt16LE(o + 6);
        const W = pay.readUInt16LE(o + 8);
        const H = pay.readUInt16LE(o + 10);
        const blen = pay.readUInt16LE(o + 16);
        assert.equal(W, R - L + 1);
        assert.equal(H, B - T + 1);
        o += 18 + blen;
      }
    }
  });

  it('no toca TPKT', () => {
    const p = path.join(__dirname, 'frames/from-12-205b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const result = fixWallixBitmapStrideCrop(raw);
    assert.equal(result.patchedCount, 0);
  });
});

describe('alignDesktopDimension', () => {
  it('alinea a multiplo de 4 con margen', () => {
    assert.equal(alignDesktopDimension(1271), 1276);
    assert.equal(alignDesktopDimension(1272), 1276);
    assert.equal(alignDesktopDimension(800), 804);
  });
});
