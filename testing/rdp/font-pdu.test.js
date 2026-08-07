'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  patchFontSequenceFlags,
  findFontPduCandidates,
  PDUTYPE2_FONTMAP,
  SEQUENCE_FLAGS_FIRST_LAST
} = require('../../src/main/services/rdp-font-helpers');

function buildShareDataFontMap(flags, totalLength = 26) {
  const buf = Buffer.alloc(Math.max(40, 10 + totalLength), 0);
  const sc = 10;
  buf.writeUInt16LE(totalLength, sc);
  buf.writeUInt16LE(0x0017, sc + 2);
  buf.writeUInt16LE(1001, sc + 4);
  const sd = sc + 6;
  buf.writeUInt32LE(0x10000, sd);
  buf[sd + 4] = 0;
  buf[sd + 5] = 1;
  buf.writeUInt16LE(totalLength, sd + 6);
  buf[sd + 8] = PDUTYPE2_FONTMAP;
  buf[sd + 9] = 0;
  buf.writeUInt16LE(0, sd + 10);
  const payload = sd + 12;
  buf.writeUInt16LE(0, payload);
  buf.writeUInt16LE(0, payload + 2);
  buf.writeUInt16LE(flags, payload + 4);
  buf.writeUInt16LE(4, payload + 6);
  return buf;
}

describe('patchFontSequenceFlags', () => {
  it('parchea flags de FontMap pequeno real', () => {
    const input = buildShareDataFontMap(0x00ff, 26);
    const { buf, patchedCount } = patchFontSequenceFlags(input);
    assert.equal(patchedCount, 1);
    const c = findFontPduCandidates(buf)[0];
    assert.equal(c.flags, SEQUENCE_FLAGS_FIRST_LAST);
    assert.equal(c.type2, PDUTYPE2_FONTMAP);
  });

  it('FontMap grande Wallix: solo flags, mantiene type2 FontMap', () => {
    const input = buildShareDataFontMap(0x28, 190);
    const { patchedCount, buf, details } = patchFontSequenceFlags(input);
    assert.equal(patchedCount, 1);
    assert.equal(details[0].action, 'flags');
    const c = findFontPduCandidates(buf)[0];
    assert.equal(c.type2, PDUTYPE2_FONTMAP);
    assert.equal(c.flags, SEQUENCE_FLAGS_FIRST_LAST);
  });

  it('ignora frames enormes (sin falsos positivos en bitmaps)', () => {
    const huge = Buffer.alloc(5651, 0);
    huge[100] = 0x28;
    huge.writeUInt16LE(4, 110);
    const { patchedCount, candidates } = patchFontSequenceFlags(huge);
    assert.equal(candidates.length, 0);
    assert.equal(patchedCount, 0);
  });

  it('dump Wallix from-12: flags invalidos -> 0x3, sin retype', () => {
    const p = path.join(__dirname, 'frames/from-12-205b.hex');
    if (!fs.existsSync(p)) return;
    const buf = Buffer.from(fs.readFileSync(p, 'utf8').trim(), 'hex');
    const before = findFontPduCandidates(buf)[0];
    assert.ok(before);
    assert.equal(before.type2, PDUTYPE2_FONTMAP);
    assert.equal(before.flags, 0x28);

    const result = patchFontSequenceFlags(buf);
    assert.equal(result.patchedCount, 1);
    const after = findFontPduCandidates(result.buf)[0];
    assert.equal(after.type2, PDUTYPE2_FONTMAP);
    assert.equal(after.flags, SEQUENCE_FLAGS_FIRST_LAST);
    // payload de glifos no tocado (byte tras FontPdu header)
    const payload0 = before.flagsOffset - 4;
    assert.equal(result.buf.slice(payload0 + 8, payload0 + 16).toString('hex'),
      buf.slice(payload0 + 8, payload0 + 16).toString('hex'));
  });

  it('no toca FontMap con flags ya validos', () => {
    const input = buildShareDataFontMap(SEQUENCE_FLAGS_FIRST_LAST, 26);
    const result = patchFontSequenceFlags(input);
    assert.equal(result.patchedCount, 0);
  });
});
