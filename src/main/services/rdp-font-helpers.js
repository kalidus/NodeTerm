/**
 * Parche Font List/Map PDU (MS-RDPBCGR 2.2.1.18 / 2.2.1.22).
 *
 * IronRDP usa SequenceFlags::from_bits y solo admite FIRST|LAST (0x1|0x2).
 * Wallix a veces manda mapFlags=0x28 (u otros bits) en FontMap, incluso en
 * FontMap grandes con entradas de glifos (~190B). Eso no es UPDATE: reclasificar
 * a PDUTYPE2_UPDATE rompe el decode (updateType basura) y el WASM cierra.
 *
 * IronRDP solo lee 8 bytes de FontPdu; el resto del Share Data se trata como
 * padding (ShareControlHeader), asi que basta con forzar flags validos.
 */

'use strict';

const PDUTYPE2_FONTLIST = 0x27;
const PDUTYPE2_FONTMAP = 0x28;
const PDUTYPE_DATAPDU = 0x0017;
const SEQUENCE_FLAGS_FIRST_LAST = 0x0003;

/**
 * Localiza Share Data FontList/FontMap SOLO con Share Control 0x17 bien formado.
 * Sin heuristica suelta (provocaba falsos positivos en bitmaps).
 */
function findFontPduCandidates(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 26) return [];
  // Nunca escanear frames enormes de grafismo
  if (buf.length > 512) return [];

  const found = [];

  for (let i = 0; i + 26 <= buf.length; i++) {
    if (buf.readUInt16LE(i + 2) !== PDUTYPE_DATAPDU) continue;

    const totalLength = buf.readUInt16LE(i);
    if (totalLength < 18 || totalLength > 4096) continue;
    if (i + totalLength > buf.length) continue;
    if (i + 6 + 12 > buf.length) continue;

    const shareDataStart = i + 6;
    const type2Offset = shareDataStart + 8;
    const type2 = buf[type2Offset];
    if (type2 !== PDUTYPE2_FONTLIST && type2 !== PDUTYPE2_FONTMAP) continue;

    const uncompressedLength = buf.readUInt16LE(shareDataStart + 6);
    const payload = shareDataStart + 12;
    if (payload + 8 > buf.length) continue;

    const number = buf.readUInt16LE(payload);
    const total = buf.readUInt16LE(payload + 2);
    const flags = buf.readUInt16LE(payload + 4);
    const entrySize = buf.readUInt16LE(payload + 6);

    found.push({
      shareControlOffset: i,
      type2Offset,
      type2,
      number,
      total,
      flags,
      flagsOffset: payload + 4,
      entrySize,
      uncompressedLength,
      totalLength
    });
  }

  return found;
}

/**
 * Fuerza mapFlags a FIRST|LAST cuando hay bits invalidos para IronRDP.
 * No reclasifica a UPDATE (rompe FontMap grandes de Wallix).
 */
function patchFontSequenceFlags(buf) {
  const candidates = findFontPduCandidates(buf);
  if (!candidates.length) {
    return { buf, patchedCount: 0, details: [], candidates: [] };
  }

  const out = Buffer.from(buf);
  const details = [];
  let patchedCount = 0;

  for (const c of candidates) {
    if ((c.flags & ~SEQUENCE_FLAGS_FIRST_LAST) === 0) continue;

    out.writeUInt16LE(SEQUENCE_FLAGS_FIRST_LAST, c.flagsOffset);
    patchedCount += 1;
    details.push({
      action: 'flags',
      offset: c.flagsOffset,
      type2: c.type2,
      totalLength: c.totalLength,
      previous: c.flags,
      next: SEQUENCE_FLAGS_FIRST_LAST
    });
  }

  return {
    buf: patchedCount ? out : buf,
    patchedCount,
    details,
    candidates
  };
}

module.exports = {
  PDUTYPE2_FONTLIST,
  PDUTYPE2_FONTMAP,
  PDUTYPE_DATAPDU,
  SEQUENCE_FLAGS_FIRST_LAST,
  findFontPduCandidates,
  patchFontSequenceFlags
};
