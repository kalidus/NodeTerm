/**
 * Compara dos trazas JSONL (mstsc MITM vs NodeTerm) y resume diferencias criticas.
 *
 * Uso:
 *   node testing/rdp/trace-diff.js testing/rdp/traces/mstsc-....jsonl testing/rdp/traces/nodeterm-....jsonl
 */

'use strict';

const fs = require('fs');
const path = require('path');

function loadJsonl(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch (e) {
      console.warn(`[trace-diff] linea invalida en ${filePath}: ${e.message}`);
    }
  }
  return rows;
}

function firstCsNet(rows) {
  for (const r of rows) {
    if (Array.isArray(r.csNet) && r.csNet.length) return r.csNet;
  }
  return null;
}

function firstOf(rows, pred) {
  for (const r of rows) {
    if (pred(r)) return r;
  }
  return null;
}

function countDir(rows, dir) {
  return rows.filter((r) => r.dir === dir).length;
}

function postBannerSilence(rows) {
  const firstBmp = firstOf(rows, (r) =>
    r.dir === 's2c' && typeof r.tipo === 'string' && /FastPath|BITMAP/i.test(r.tipo));
  if (!firstBmp) return null;
  // Hueco: mayor salto t_ms entre frames s2c tras el primer bitmap, hasta el siguiente
  // burst significativo (len>200 o muchos frames).
  let maxGap = 0;
  let gapAt = null;
  let prev = firstBmp.t_ms;
  let resume = null;
  for (const r of rows) {
    if (r.t_ms <= firstBmp.t_ms) continue;
    if (r.dir !== 's2c' && r.dir !== 'c2s') continue;
    const gap = r.t_ms - prev;
    if (gap > maxGap) {
      maxGap = gap;
      gapAt = prev;
      resume = r.t_ms;
    }
    prev = r.t_ms;
  }
  return {
    firstBitmapMs: firstBmp.t_ms,
    maxGapMs: maxGap,
    silenceFromMs: gapAt,
    resumeMs: resume
  };
}

function cliprdrDialog(rows) {
  const events = rows.filter((r) => r.cliprdr || (typeof r.tipo === 'string' && /cliprdr/i.test(r.tipo)));
  const firstServer = events.find((r) => r.dir === 's2c');
  const firstClient = events.find((r) => r.dir === 'c2s');
  return {
    count: events.length,
    firstServerMs: firstServer ? firstServer.t_ms : null,
    firstServer: firstServer
      ? `${firstServer.cliprdr || firstServer.tipo} ch=${firstServer.canal}`
      : null,
    firstClientMs: firstClient ? firstClient.t_ms : null,
    firstClient: firstClient
      ? `${firstClient.cliprdr || firstClient.tipo} ch=${firstClient.canal}`
      : null,
    clientResponseLagMs: (firstServer && firstClient && firstClient.t_ms >= firstServer.t_ms)
      ? firstClient.t_ms - firstServer.t_ms
      : null
  };
}

function joinMarks(rows) {
  return rows.filter((r) => r.dir === 'mark').map((r) => `${r.tipo}@${r.t_ms}ms`);
}

function summarize(label, rows) {
  const last = rows.length ? rows[rows.length - 1].t_ms : 0;
  return {
    label,
    frames: rows.length,
    durationMs: last,
    c2s: countDir(rows, 'c2s'),
    s2c: countDir(rows, 's2c'),
    csNet: firstCsNet(rows),
    silence: postBannerSilence(rows),
    cliprdr: cliprdrDialog(rows),
    marks: joinMarks(rows)
  };
}

function fmt(v) {
  return v == null ? 'n/a' : String(v);
}

function printSummary(s) {
  console.log(`\n=== ${s.label} ===`);
  console.log(`  frames=${s.frames} duration=${s.durationMs}ms c2s=${s.c2s} s2c=${s.s2c}`);
  console.log(`  CS_NET=[${(s.csNet || []).join(',') || '?'}]`);
  if (s.silence) {
    console.log(
      `  first-bitmap=+${s.silence.firstBitmapMs}ms` +
      ` maxGap=${s.silence.maxGapMs}ms` +
      ` (silence@${fmt(s.silence.silenceFromMs)} -> resume@${fmt(s.silence.resumeMs)})`
    );
  }
  console.log(
    `  cliprdr: events=${s.cliprdr.count}` +
    ` server=${fmt(s.cliprdr.firstServer)}@${fmt(s.cliprdr.firstServerMs)}ms` +
    ` client=${fmt(s.cliprdr.firstClient)}@${fmt(s.cliprdr.firstClientMs)}ms` +
    ` lag=${fmt(s.cliprdr.clientResponseLagMs)}ms`
  );
  if (s.marks.length) console.log(`  marks: ${s.marks.join(', ')}`);
}

/** Prefijo CS_NET del baseline mstsc MITM (selector/RDP). */
const MSTSC_CS_NET_PREFIX = ['rdpdr', 'rdpsnd', 'cliprdr'];

function csNetMatchesMstsc(csNet) {
  if (!Array.isArray(csNet) || csNet.length < MSTSC_CS_NET_PREFIX.length) return false;
  return MSTSC_CS_NET_PREFIX.every((n, i) => String(csNet[i] || '').toLowerCase() === n);
}

function diff(a, b) {
  console.log('\n=== DIFF ===');
  const csA = (a.csNet || []).join(',');
  const csB = (b.csNet || []).join(',');
  if (csA !== csB) {
    console.log(`  CS_NET distinto:\n    A=[${csA}]\n    B=[${csB}]`);
  } else {
    console.log(`  CS_NET igual: [${csA}]`);
  }
  console.log(
    `  CS_NET mstsc-prefix (rdpdr,rdpsnd,cliprdr):` +
    ` A=${csNetMatchesMstsc(a.csNet) ? 'OK' : 'NO'}` +
    ` B=${csNetMatchesMstsc(b.csNet) ? 'OK' : 'NO'}`
  );
  const gA = a.silence && a.silence.maxGapMs;
  const gB = b.silence && b.silence.maxGapMs;
  console.log(`  maxGap post-banner: A=${fmt(gA)}ms B=${fmt(gB)}ms delta=${fmt((gA ?? 0) - (gB ?? 0))}ms`);
  console.log(
    `  cliprdr response lag: A=${fmt(a.cliprdr.clientResponseLagMs)}ms` +
    ` B=${fmt(b.cliprdr.clientResponseLagMs)}ms`
  );
  console.log(
    `  cliprdr first server: A=${fmt(a.cliprdr.firstServer)} B=${fmt(b.cliprdr.firstServer)}`
  );
}

function main() {
  const aPath = process.argv[2];
  const bPath = process.argv[3];
  if (!aPath || !bPath) {
    console.error('Uso: node testing/rdp/trace-diff.js <mstsc.jsonl> <nodeterm.jsonl>');
    process.exit(1);
  }
  const aRows = loadJsonl(path.resolve(aPath));
  const bRows = loadJsonl(path.resolve(bPath));
  const a = summarize(path.basename(aPath), aRows);
  const b = summarize(path.basename(bPath), bRows);
  printSummary(a);
  printSummary(b);
  diff(a, b);
  // Exit 2 si NodeTerm (B) no alinea CS_NET al baseline mstsc.
  if (!csNetMatchesMstsc(b.csNet)) {
    console.error('\n[trace-diff] FAIL: NodeTerm CS_NET no empieza por rdpdr,rdpsnd,cliprdr');
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadJsonl,
  firstCsNet,
  summarize,
  csNetMatchesMstsc,
  MSTSC_CS_NET_PREFIX
};
