/**
 * Verifica (sin WASM) el camino IronRDP sobre from-12-205b.hex:
 * SequenceFlags::from_bits + FontPdu 8B + padding del ShareControlHeader.
 *
 * Exit 0 si el parche hace aceptable lo que el raw rechaza.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { patchFontSequenceFlags } = require('../../src/main/services/rdp-font-helpers');

function sequenceFlagsFromBits(v) {
  // IronRDP: bitflags without `const _ = !0` => from_bits fails on unknown bits
  if ((v & ~0x0003) !== 0) return null;
  return v;
}

function tryDecodeFontMapShare(buf) {
  // Localiza Share Control 0x17 + type2 FontMap
  for (let i = 0; i + 26 <= buf.length; i++) {
    if (buf.readUInt16LE(i + 2) !== 0x0017) continue;
    const totalLength = buf.readUInt16LE(i);
    if (i + totalLength > buf.length) continue;
    const sd = i + 6;
    const type2 = buf[sd + 8];
    if (type2 !== 0x28) continue;

    const payload = sd + 12;
    const number = buf.readUInt16LE(payload);
    const total = buf.readUInt16LE(payload + 2);
    const flagsRaw = buf.readUInt16LE(payload + 4);
    const entrySize = buf.readUInt16LE(payload + 6);
    const flags = sequenceFlagsFromBits(flagsRaw);
    if (flags === null) {
      return { ok: false, reason: `invalid sequence flags 0x${flagsRaw.toString(16)}`, totalLength };
    }

    // FontPdu.size()=8; ShareControlHeader.size() para Data+FontMap = 6+4+8+8 = 26
    const headerLength = 26;
    if (totalLength < headerLength) {
      return { ok: false, reason: 'totalLength < headerLength', totalLength, headerLength };
    }
    const padding = totalLength - headerLength;
    return {
      ok: true,
      number,
      total,
      flags,
      entrySize,
      totalLength,
      headerLength,
      padding
    };
  }
  return { ok: false, reason: 'FontMap Share Data not found' };
}

const hexPath = path.join(__dirname, 'frames/from-12-205b.hex');
const raw = Buffer.from(fs.readFileSync(hexPath, 'utf8').trim(), 'hex');
const baseline = tryDecodeFontMapShare(raw);
const patched = patchFontSequenceFlags(raw);
const treatment = tryDecodeFontMapShare(patched.buf);

console.log('BASELINE', JSON.stringify(baseline));
console.log('TREATMENT', JSON.stringify(treatment));
console.log('PATCHED_COUNT', patched.patchedCount);

if (baseline.ok) {
  console.error('FAIL: baseline should reject raw Wallix FontMap');
  process.exit(2);
}
if (!treatment.ok) {
  console.error('FAIL: treatment should accept patched FontMap:', treatment.reason);
  process.exit(3);
}
if (patched.patchedCount < 1) {
  console.error('FAIL: expected flags patch');
  process.exit(4);
}
if (treatment.flags !== 3) {
  console.error('FAIL: expected flags=3');
  process.exit(5);
}

console.log('VERDICT: IronRDP-compatible FontMap decode OK after flags patch');
process.exit(0);
