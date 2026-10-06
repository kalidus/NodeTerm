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
const { RdpStreamDeframer } = require('../../src/main/services/rdp-protocol-helpers');
const {
  buildFastPathBitmapPdu,
  encodeFpLength,
  parseFastPathUpdate,
  FastPathBitmapReassembler,
  FP_FRAG_FIRST,
  FP_FRAG_LAST,
  MAX_FASTPATH_PDU
} = require('../../src/main/services/rdp-fastpath-helpers');

const NO_BITMAP_COMPRESSION_HDR = 0x0400;

function paintFixedRects(rectBuffers, originLeft, originTop, iw, ih) {
  const canvas = Buffer.alloc(iw * ih * 2);
  for (const tile of rectBuffers) {
    const flags = tile.readUInt16LE(14);
    const blen = tile.readUInt16LE(16);
    const width = tile.readUInt16LE(8);
    const height = tile.readUInt16LE(10);
    let raw = tile.subarray(18, 18 + blen);
    if ((flags & 0x0001) && (flags & NO_BITMAP_COMPRESSION_HDR) === 0) raw = raw.subarray(8);
    const pix = (flags & 0x0001) ? decompress16bpp(raw, width, height) : raw.subarray(0, width * height * 2);
    const tx = tile.readUInt16LE(0) - originLeft;
    const ty = tile.readUInt16LE(2) - originTop;
    const startRow = ih - (ty + height);
    for (let y = 0; y < height; y++) {
      pix.copy(canvas, ((startRow + y) * iw + tx) * 2, y * width * 2, (y + 1) * width * 2);
    }
  }
  return canvas;
}

function paintPdus(pdus, originLeft, originTop, iw, ih) {
  const rects = [];
  for (const pdu of pdus) {
    const info = inspectWallixFastPathBitmap(pdu);
    assert.ok(info && info.ok);
    assert.ok(pdu.length <= MAX_FASTPATH_PDU);
    const pay = pdu.subarray(info.payloadOffset, info.payloadOffset + info.size);
    let o = 4;
    for (let i = 0; i < info.numberRectangles; i++) {
      const blen = pay.readUInt16LE(o + 16);
      rects.push(Buffer.from(pay.subarray(o, o + 18 + blen)));
      o += 18 + blen;
    }
  }
  return paintFixedRects(rects, originLeft, originTop, iw, ih);
}

function buildUncompressedPdu(pixels, srcW, srcH, left, top, iw, ih) {
  const rect = Buffer.alloc(18 + pixels.length);
  rect.writeUInt16LE(left, 0);
  rect.writeUInt16LE(top, 2);
  rect.writeUInt16LE(left + iw - 1, 4);
  rect.writeUInt16LE(top + ih - 1, 6);
  rect.writeUInt16LE(srcW, 8);
  rect.writeUInt16LE(srcH, 10);
  rect.writeUInt16LE(16, 12);
  rect.writeUInt16LE(0, 14);
  rect.writeUInt16LE(pixels.length, 16);
  pixels.copy(rect, 18);
  return buildFastPathBitmapPdu(0x00, 0x01, [rect]);
}

function buildFragment(updateHeader, updateData) {
  let lengthField = encodeFpLength(1 + 2 + 1 + 2 + updateData.length);
  let total = 1 + lengthField.length + 1 + 2 + updateData.length;
  lengthField = encodeFpLength(total);
  total = 1 + lengthField.length + 1 + 2 + updateData.length;
  const sizeBuf = Buffer.alloc(2);
  sizeBuf.writeUInt16LE(updateData.length, 0);
  const out = Buffer.concat([
    Buffer.from([0x00]),
    lengthField,
    Buffer.from([updateHeader]),
    sizeBuf,
    updateData
  ]);
  assert.equal(out.length, total);
  return out;
}

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

  it('cropRgb16 deja, tras rev(), el dest-rect sin filas de mas abajo', () => {
    // 4x3 bottom-up, dest 3x2. IronRDP pinta chunks().rev() desde destTop.
    // Las filas que caben en el rectangulo son las dos ultimas (parte superior).
    const src = Buffer.alloc(4 * 3 * 2);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        src.writeUInt16LE((y << 8) | x, (y * 4 + x) * 2);
      }
    }
    const out = cropRgb16(src, 4, 3, 3, 2);
    assert.equal(out.length, 3 * 2 * 2);
    // filas fuente 1 y 2, columnas 0..2. Fila 0 del buffer (abajo) se descarta.
    assert.equal(out.readUInt16LE(0), 0x0100);
    assert.equal(out.readUInt16LE(2), 0x0101);
    assert.equal(out.readUInt16LE(4), 0x0102);
    assert.equal(out.readUInt16LE(6), 0x0200);
    assert.equal(out.readUInt16LE(8), 0x0201);
    assert.equal(out.readUInt16LE(10), 0x0202);
    // .rev(): la primera fila pintada (destTop) es la ultima del buffer.
    const visualTop = out.readUInt16LE((2 - 1) * 3 * 2);
    assert.equal(visualTop, 0x0200);
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
    assert.equal(enc[0] & 0xe0, 0x60);
    assert.equal(enc[0] & 0x1f, 10);
    assert.equal(enc.length, 3);
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

  it('un bitmap ancho se parte en tiras horizontales, no en malla 64x64', () => {
    const { fixOneBitmapRectStride, MAX_FASTPATH_PDU } = require('../../src/main/services/rdp-fastpath-helpers');
    const srcW = 152;
    const srcH = 120;
    const iw = 150;
    const ih = 120;
    const rectBuf = Buffer.alloc(18 + srcW * srcH * 2);
    rectBuf.writeUInt16LE(10, 0);
    rectBuf.writeUInt16LE(20, 2);
    rectBuf.writeUInt16LE(10 + iw - 1, 4);
    rectBuf.writeUInt16LE(20 + ih - 1, 6);
    rectBuf.writeUInt16LE(srcW, 8);
    rectBuf.writeUInt16LE(srcH, 10);
    rectBuf.writeUInt16LE(16, 12);
    rectBuf.writeUInt16LE(0, 14);
    rectBuf.writeUInt16LE(srcW * srcH * 2, 16);
    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        rectBuf.writeUInt16LE((y * 3 + x * 5) & 0xffff, 18 + (y * srcW + x) * 2);
      }
    }

    const fixed = fixOneBitmapRectStride(rectBuf);
    assert.ok(fixed);
    assert.equal(fixed.kind, 'strips');
    let covered = 0;
    for (const tile of fixed.buffers) {
      const tw = tile.readUInt16LE(8);
      const th = tile.readUInt16LE(10);
      assert.equal(tw, iw);
      assert.ok(th > 0 && th <= ih);
      assert.ok(18 + tile.readUInt16LE(16) <= MAX_FASTPATH_PDU);
      covered += th;
    }
    assert.equal(covered, ih);
    const painted = paintFixedRects(fixed.buffers, 10, 20, iw, ih);
    const expected = cropRgb16(rectBuf.subarray(18, 18 + srcW * srcH * 2), srcW, srcH, iw, ih);
    assert.deepEqual(painted, expected);
  });

  it('no toca TPKT', () => {
    const p = path.join(__dirname, 'frames/from-12-205b.hex');
    if (!fs.existsSync(p)) return;
    const raw = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const result = fixWallixBitmapStrideCrop(raw);
    assert.equal(result.patchedCount, 0);
  });

  it('una tesela 64x62 con stride correcto se reescribe a RLE absoluto', () => {
    const { fixOneBitmapRectStride } = require('../../src/main/services/rdp-fastpath-helpers');
    const iw = 64;
    const ih = 62;
    // RLE por deltas capturado de Wallix (no es COLOR_RUN/COLOR_IMAGE).
    const delta = Buffer.from('200081dbde3ff08002c0106108819ad63fc0308210c010e31881dbde601ffffff0200ac03041086020aa52202060e0ffff', 'hex');
    const rect = Buffer.alloc(18 + delta.length);
    rect.writeUInt16LE(10, 0);
    rect.writeUInt16LE(20, 2);
    rect.writeUInt16LE(10 + iw - 1, 4);
    rect.writeUInt16LE(20 + ih - 1, 6);
    rect.writeUInt16LE(iw, 8);
    rect.writeUInt16LE(ih, 10);
    rect.writeUInt16LE(16, 12);
    rect.writeUInt16LE(0x0401, 14);
    rect.writeUInt16LE(delta.length, 16);
    delta.copy(rect, 18);
    const fixed = fixOneBitmapRectStride(rect);
    assert.ok(fixed && fixed.buffers && fixed.buffers.length === 1);
    const out = fixed.buffers[0];
    assert.equal(out.readUInt16LE(8), iw);
    assert.equal(out.readUInt16LE(10), ih);
    const bl = out.readUInt16LE(16);
    const got = decompress16bpp(out.subarray(18, 18 + bl), iw, ih);
    const expect = decompress16bpp(delta, iw, ih);
    assert.deepEqual([...got], [...expect]);
    // La segunda pasada ya es RLE absoluto: no se vuelve a tocar.
    assert.equal(fixOneBitmapRectStride(out), null);
  });

  it('omite descompresion y retorna null si width coincide con dest width (!needsCrop)', () => {
    const { fixOneBitmapRectStride } = require('../../src/main/services/rdp-fastpath-helpers');
    const rectBuf = Buffer.alloc(18 + 200 * 100 * 2);
    rectBuf.writeUInt16LE(0, 0); // destLeft
    rectBuf.writeUInt16LE(0, 2); // destTop
    rectBuf.writeUInt16LE(199, 4); // destRight (iw = 200)
    rectBuf.writeUInt16LE(99, 6); // destBottom (ih = 100)
    rectBuf.writeUInt16LE(200, 8); // width exacto (200)
    rectBuf.writeUInt16LE(100, 10); // height exacto (100)
    rectBuf.writeUInt16LE(16, 12); // bitsPerPixel
    rectBuf.writeUInt16LE(0, 14); // flags
    rectBuf.writeUInt16LE(200 * 100 * 2, 16); // bitmapLength
    const result = fixOneBitmapRectStride(rectBuf);
    assert.equal(result, null);
  });

  it('una PDU partida en dos lecturas TCP se corrige al reunirse', () => {
    const srcW = 8;
    const srcH = 5;
    const iw = 6;
    const ih = 4;
    const pixels = Buffer.alloc(srcW * srcH * 2);
    for (let i = 0; i < srcW * srcH; i++) pixels.writeUInt16LE((i * 17 + 3) & 0xffff, i * 2);
    const pdu = buildUncompressedPdu(pixels, srcW, srcH, 4, 8, iw, ih);
    assert.ok(pdu);

    const deframer = new RdpStreamDeframer();
    assert.equal(deframer.push(pdu.subarray(0, 30)).length, 0);
    const frames = deframer.push(pdu.subarray(30));
    assert.equal(frames.length, 1);
    assert.deepEqual(frames[0], pdu);

    const fixed = fixWallixBitmapStrideCrop(frames[0]);
    assert.ok(fixed.patchedCount > 0);
    assert.equal(fixed.fallback, false);
    const painted = paintPdus(fixed.buffers, 4, 8, iw, ih);
    assert.deepEqual(painted, cropRgb16(pixels, srcW, srcH, iw, ih));
  });

  it('un Fast-Path FIRST+LAST se corrige y cada PDU cabe en 16KB', () => {
    const srcW = 8;
    const srcH = 5;
    const iw = 6;
    const ih = 4;
    const pixels = Buffer.alloc(srcW * srcH * 2);
    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) pixels.writeUInt16LE(((y + 1) << 8) | (x + 1), (y * srcW + x) * 2);
    }
    const pdu = buildUncompressedPdu(pixels, srcW, srcH, 1, 2, iw, ih);
    const parsed = parseFastPathUpdate(pdu);
    assert.ok(parsed);
    const mid = Math.floor(parsed.updateData.length / 2);
    const first = buildFragment((FP_FRAG_FIRST << 4) | 0x1, parsed.updateData.subarray(0, mid));
    const last = buildFragment((FP_FRAG_LAST << 4) | 0x1, parsed.updateData.subarray(mid));

    const asm = new FastPathBitmapReassembler();
    assert.equal(asm.push(first).length, 0);
    const ready = asm.push(last);
    assert.equal(ready.length, 1);
    // El reensamblador solo junta; el crop lo hace fixWallix una sola vez.
    const fixed = fixWallixBitmapStrideCrop(ready[0]);
    assert.ok(fixed.patchedCount > 0);
    for (const out of fixed.buffers) assert.ok(out.length <= MAX_FASTPATH_PDU);
    const painted = paintPdus(fixed.buffers, 1, 2, iw, ih);
    assert.deepEqual(painted, cropRgb16(pixels, srcW, srcH, iw, ih));
  });
});

describe('alignDesktopDimension', () => {
  it('alinea a multiplo de 4 exacto', () => {
    assert.equal(alignDesktopDimension(1271), 1272);
    assert.equal(alignDesktopDimension(1272), 1272);
    assert.equal(alignDesktopDimension(800), 800);
    assert.equal(alignDesktopDimension(1280), 1280);
  });
});
