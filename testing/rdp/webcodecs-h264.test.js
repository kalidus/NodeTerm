'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { avcToAnnexB, avcChunkType, avcCodecString, inspectAvcAccessUnit, cropRgbaRect, isWebCodecsH264Available } = require('../../src/utils/rdpWebCodecsH264');

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

  it('isWebCodecsH264Available refleja el entorno', () => {
    assert.equal(typeof isWebCodecsH264Available(), 'boolean');
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
});
