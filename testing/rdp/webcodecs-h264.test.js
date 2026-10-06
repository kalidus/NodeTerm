'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { avcToAnnexB, isWebCodecsH264Available } = require('../../src/utils/rdpWebCodecsH264');

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
});
