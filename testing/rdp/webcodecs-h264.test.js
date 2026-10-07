'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { avcToAnnexB, avcChunkType, avcCodecString, inspectAvcAccessUnit, cropRgbaRect, unionAlignedBox, chromaSpansFor, combineAvc444v2Chroma, isWebCodecsH264Available, avcUnitHoldAction, shouldDeferLumaPresent, shouldSkipStaleChroma } = require('../../src/utils/rdpWebCodecsH264');

describe('rdpWebCodecsH264', () => {
  it('convierte AVC length-prefixed a Annex B', () => {
    const nalu = Buffer.from([0x67, 0x42, 0x00, 0x0a]);
    const avc = Buffer.alloc(4 + nalu.length);
    avc.writeUInt32BE(nalu.length, 0);
    nalu.copy(avc, 4);
    const annex = avcToAnnexB(avc);
    assert.deepEqual(Buffer.from(annex.subarray(0, 4)), Buffer.from([0, 0, 0, 1]));
    assert.deepEqual(Buffer.from(annex.subarray(4)), nalu);
  });

  it('pinta el 4:2:0 al momento y solo retiene el luma si el siguiente AU es croma', () => {
    assert.equal(avcUnitHoldAction(true, false), 'present-420');
    assert.equal(avcUnitHoldAction(true, true), 'hold-luma');
    assert.equal(avcUnitHoldAction(false, true), 'merge-444');
    assert.equal(avcUnitHoldAction(false, false), 'merge-444');
  });

  it('no pinta el 4:2:0 si el siguiente access unit es croma, y descarta pares viejos', () => {
    assert.equal(shouldDeferLumaPresent(true), true);
    assert.equal(shouldDeferLumaPresent(false), false);
    assert.equal(shouldSkipStaleChroma(2), true);
    assert.equal(shouldSkipStaleChroma(1), false);
  });

  it('el SPS de un escritorio grande anuncia al menos nivel 5.1', () => {
    const sps = Buffer.from([0x67, 0x64, 0x00, 0x1f, 0xac]);
    const avc = Buffer.alloc(4 + sps.length);
    avc.writeUInt32BE(sps.length, 0);
    sps.copy(avc, 4);
    assert.equal(avcCodecString(avc), 'avc1.640033');
    assert.equal(avcCodecString(Buffer.alloc(0)), null);
  });

  it('un Annex B con AUD y SPS es clave', () => {
    const avc = Buffer.from('00000001091000000001674d40289590', 'hex');
    const unit = inspectAvcAccessUnit(avc);
    assert.equal(unit.key, true);
    assert.equal(unit.codec, 'avc1.4D4033');
  });

  it('un slice con SPS es clave y genera avcC', () => {
    const sps = Buffer.from([0x67, 0x64, 0x00, 0x1f, 0xac]);
    const pps = Buffer.from([0x68, 0xce, 0x06, 0xe2]);
    const slice = Buffer.from([0x41, 0x9a]);
    const parts = [sps, pps, slice];
    const avc = Buffer.concat(parts.map((nal) => {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(nal.length, 0);
      return Buffer.concat([len, nal]);
    }));
    const unit = inspectAvcAccessUnit(avc);
    assert.equal(unit.key, true);
    assert.equal(unit.codec, 'avc1.640033');
    assert.equal(unit.description[0], 1);
    assert.equal(unit.description[1], 0x64);
    assert.equal(unit.description[4], 0xFF);
  });

  it('un IDR es key y un slice P es delta', () => {
    const idr = Buffer.alloc(6);
    idr.writeUInt32BE(2, 0);
    idr[4] = 0x65;
    idr[5] = 0x88;
    assert.equal(avcChunkType(idr), 'key');

    const slice = Buffer.alloc(6);
    slice.writeUInt32BE(2, 0);
    slice[4] = 0x41;
    slice[5] = 0x9a;
    assert.equal(avcChunkType(slice), 'delta');
  });

  it('cropRgbaRect copia solo el rectángulo pedido', () => {
    const src = new Uint8Array([
      1, 0, 0, 255, 2, 0, 0, 255,
      3, 0, 0, 255, 4, 0, 0, 255
    ]);
    const crop = cropRgbaRect(src, 2, 2, 1, 0, 2, 1);
    assert.deepEqual(Array.from(crop.rgba), [2, 0, 0, 255]);
    assert.equal(crop.left, 1);
    assert.equal(crop.top, 0);
    assert.equal(crop.right, 2);
    assert.equal(crop.bottom, 1);
    assert.equal(cropRgbaRect(src, 2, 2, 2, 0, 2, 1), null);
  });

  it('la caja de copyTo es la ventana, no el escritorio', () => {
    const box = unionAlignedBox([{ left: 101, top: 50, right: 400, bottom: 301 }], 2600, 1800);
    assert.equal(box.left, 100);
    assert.equal(box.top, 50);
    assert.equal(box.right, 400);
    assert.equal(box.bottom, 302);
    assert.ok((box.right - box.left) * (box.bottom - box.top) < 2600 * 1800);
  });

  it('un macrobloque AVC444v2 usa el croma impar del frame auxiliar', () => {
    const width = 16;
    const height = 16;
    const chroma = 8;
    const main = {
      width,
      height,
      y: new Uint8Array(width * height).fill(128),
      u: new Uint8Array(chroma * chroma).fill(40),
      v: new Uint8Array(chroma * chroma).fill(50)
    };
    const auxY = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) auxY[y * width + x] = x < 8 ? 200 : 210;
    }
    const auxU = new Uint8Array(chroma * chroma).fill(180);
    const auxV = new Uint8Array(chroma * chroma).fill(190);
    for (let y = 0; y < chroma; y++) {
      for (let x = 4; x < 8; x++) {
        auxU[y * chroma + x] = 181;
        auxV[y * chroma + x] = 191;
      }
    }
    const aux = { width, height, y: auxY, u: auxU, v: auxV };
    const rect = { left: 0, top: 0, right: 16, bottom: 16 };
    const out = combineAvc444v2Chroma(main, aux, rect);

    assert.equal(out.u[0], 40);
    assert.equal(out.v[0], 50);
    assert.equal(out.u[1], 200);
    assert.equal(out.v[1], 210);
    assert.notEqual(out.u[1], 40);
    assert.equal(out.u[16], 180);
    assert.equal(out.v[16], 181);
    assert.equal(out.u[18], 190);
    assert.equal(out.v[18], 191);

    const spans = chromaSpansFor(rect, width, height);
    const cropped = {
      frameWidth: width,
      width,
      spans: {
        u: sliceI420(aux, spans.u),
        v: sliceI420(aux, spans.v)
      }
    };
    const fromSpans = combineAvc444v2Chroma(main, cropped, rect);
    assert.equal(fromSpans.u[1], 200);
    assert.equal(fromSpans.v[1], 210);
    assert.equal(fromSpans.u[0], 40);
    assert.equal(fromSpans.u[16], 180);
    assert.equal(fromSpans.v[16], 181);
    assert.equal(fromSpans.u[18], 190);
    assert.equal(fromSpans.v[18], 191);
  });
});

function sliceI420(src, box) {
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  const cw = w >> 1;
  const ch = h >> 1;
  const y = new Uint8Array(w * h);
  const u = new Uint8Array(cw * ch);
  const v = new Uint8Array(cw * ch);
  const cStride = src.width >> 1;
  for (let row = 0; row < h; row++) {
    y.set(src.y.subarray((box.top + row) * src.width + box.left, (box.top + row) * src.width + box.left + w), row * w);
  }
  for (let row = 0; row < ch; row++) {
    const sy = (box.top >> 1) + row;
    const sx = box.left >> 1;
    u.set(src.u.subarray(sy * cStride + sx, sy * cStride + sx + cw), row * cw);
    v.set(src.v.subarray(sy * cStride + sx, sy * cStride + sx + cw), row * cw);
  }
  return { y, u, v, width: w, height: h, originX: box.left, originY: box.top };
}
