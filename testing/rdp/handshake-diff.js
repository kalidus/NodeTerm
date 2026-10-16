#!/usr/bin/env node
/**
 * Diff del MCS Connect Initial (CS_CORE / CS_SECURITY / CS_NET / ...) entre dos trazas JSONL.
 * Necesita el campo `hex` completo del frame (trazas nuevas: csNet siempre lo lleva).
 *
 * Uso: node testing/rdp/handshake-diff.js <mstsc.jsonl> <nodeterm.jsonl>
 */
'use strict';

const fs = require('fs');

const BLOCK_NAMES = {
  0xc001: 'CS_CORE',
  0xc002: 'CS_SECURITY',
  0xc003: 'CS_NET',
  0xc004: 'CS_CLUSTER',
  0xc005: 'CS_MONITOR',
  0xc006: 'CS_MCS_MSGCHANNEL',
  0xc008: 'CS_MONITOR_EX',
  0xc00a: 'CS_MULTITRANSPORT'
};

/** Parsea bloques GCC del Connect Initial (TPKT completo). */
function parseConnectInitial(buf) {
  if (!Buffer.isBuffer(buf)) return null;
  const duca = buf.indexOf(Buffer.from('Duca'));
  if (duca < 0) return null;
  let i = duca + 4;
  let len = buf[i++];
  if (len & 0x80) { len = ((len & 0x3f) << 8) | buf[i++]; }
  const end = Math.min(buf.length, i + len);
  const blocks = [];
  while (i + 4 <= end) {
    const type = buf.readUInt16LE(i);
    const blen = buf.readUInt16LE(i + 2);
    if (blen < 4 || i + blen > buf.length) break;
    blocks.push({ type, name: BLOCK_NAMES[type] || `0x${type.toString(16)}`, offset: i, data: buf.subarray(i, i + blen) });
    i += blen;
  }
  const out = { blocks: blocks.map((b) => b.name), core: null, net: null };
  for (const b of blocks) {
    const d = b.data;
    if (b.type === 0xc001 && d.length >= 24) {
      out.core = {
        version: d.readUInt32LE(4),
        width: d.readUInt16LE(8),
        height: d.readUInt16LE(10),
        keyboardLayout: d.readUInt32LE(16),
        clientBuild: d.readUInt32LE(20),
        length: d.length,
        earlyCapabilityFlags: d.length >= 144 ? d.readUInt16LE(142) : null,
        serverSelectedProtocol: d.length >= 216 ? d.readUInt32LE(212) : null
      };
    } else if (b.type === 0xc003 && d.length >= 8) {
      const count = d.readUInt32LE(4);
      out.net = [];
      for (let c = 0; c < count && 8 + (c + 1) * 12 <= d.length; c++) {
        const off = 8 + c * 12;
        const raw = d.subarray(off, off + 8).toString('ascii');
        out.net.push({ name: raw.split('\0')[0], options: d.readUInt32LE(off + 8) >>> 0 });
      }
    }
  }
  return out;
}

function loadRows(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function firstConnectInitial(rows) {
  for (const r of rows) {
    if (r.dir !== 'c2s' || !r.hex) continue;
    const b = Buffer.from(r.hex, 'hex');
    if (b.length > 100 && b[0] === 0x03 && b.indexOf(Buffer.from('Duca')) > 0) return parseConnectInitial(b);
  }
  return null;
}

function diffHandshake(a, b) {
  const diffs = [];
  if (!a || !b) return ['falta Connect Initial con hex completo en una de las trazas'];
  if (a.blocks.join(',') !== b.blocks.join(',')) diffs.push(`bloques GCC: ${a.blocks.join(',')} vs ${b.blocks.join(',')}`);
  for (const k of Object.keys(a.core || {})) {
    if (a.core[k] !== (b.core || {})[k]) diffs.push(`CS_CORE.${k}: ${a.core[k]} vs ${(b.core || {})[k]}`);
  }
  const na = (a.net || []).map((c) => `${c.name}:0x${c.options.toString(16)}`).join(',');
  const nb = (b.net || []).map((c) => `${c.name}:0x${c.options.toString(16)}`).join(',');
  if (na !== nb) diffs.push(`CS_NET: [${na}] vs [${nb}]`);
  return diffs;
}

function main() {
  const [fa, fb] = process.argv.slice(2);
  if (!fa || !fb) {
    console.error('Uso: node testing/rdp/handshake-diff.js <mstsc.jsonl> <nodeterm.jsonl>');
    process.exit(1);
  }
  const diffs = diffHandshake(firstConnectInitial(loadRows(fa)), firstConnectInitial(loadRows(fb)));
  if (!diffs.length) console.log('Handshake MCS Connect Initial equivalente.');
  else diffs.forEach((d) => console.log(' -', d));
  process.exit(diffs.length ? 2 : 0);
}

if (require.main === module) main();

module.exports = { parseConnectInitial, firstConnectInitial, diffHandshake };
