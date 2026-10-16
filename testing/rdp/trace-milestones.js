/**
 * Hitos comparables entre trazas JSONL (mstsc MITM vs NodeTerm bridge).
 *
 * En ambas, dir 's2c'/'c2s' = CABLE (NodeTerm: antes de filtros; mstsc: MITM).
 * Las filas 's2c-wasm' / 'c2s-wasm' (solo NodeTerm) son el lado WASM y se ignoran aqui.
 */

'use strict';

const STATIC_CHANNEL_BASE = 1004;
const BURST_MIN_BYTES = 8000;
const BURST_GAP_MS = 2500;
const INPUT_CLUSTER_GAP_MS = 2000;
const IGNORE_INPUT_BEFORE_MS = 1500;

function decodeFpInput(buf) {
  try {
    if (!Buffer.isBuffer(buf) || buf.length < 3) return null;
    if ((buf[0] & 0x03) !== 0) return null;
    const long = (buf[1] & 0x80) !== 0;
    const len = long ? ((buf[1] & 0x7f) << 8) | buf[2] : buf[1];
    if (len !== buf.length) return null;
    let off = long ? 3 : 2;
    const events = [];
    while (off < buf.length) {
      const eh = buf[off++];
      const code = (eh >> 5) & 0x07;
      if (code === 0) { events.push('KEY'); off += 1; }
      else if (code === 1) {
        const flags = buf.readUInt16LE(off);
        off += 6;
        events.push(flags & 0x8000 ? 'CLICK' : 'MOVE');
      } else if (code === 2) { events.push('MOUSEX'); off += 6; }
      else if (code === 3) { events.push('SYNC'); }
      else if (code === 4) { events.push('UNICODE'); off += 2; }
      else break;
    }
    return events;
  } catch (_) {
    return null;
  }
}

function isWireS2c(r) { return r.dir === 's2c'; }
function isWireC2s(r) { return r.dir === 'c2s'; }

function firstCsNet(rows) {
  for (const r of rows) {
    if (Array.isArray(r.csNet) && r.csNet.length && (r.dir === 'c2s')) return r.csNet;
  }
  for (const r of rows) {
    if (Array.isArray(r.csNet) && r.csNet.length) return r.csNet;
  }
  return null;
}

function channelNameById(csNet) {
  const map = new Map();
  (csNet || []).forEach((name, i) => map.set(STATIC_CHANNEL_BASE + i, String(name).toLowerCase()));
  return map;
}

function parseCliprdrEvent(r) {
  const text = r.cliprdr || '';
  const m = text.match(/(CB_[A-Z_]+)/);
  if (!m) return null;
  const caps = text.match(/generalFlags=(0x[0-9a-f]+)/i);
  return {
    t: r.t_ms,
    dir: r.dir,
    canal: r.canal,
    msg: m[1],
    generalFlags: caps ? caps[1].toLowerCase() : null
  };
}

/**
 * Rafagas graficas: ventanas de 500 ms con >= BURST_MIN_BYTES s2c de cable, fusionando huecos < BURST_GAP_MS.
 * (Por bytes y no por tamano de frame: mstsc usa orders pequenos, IronRDP bitmaps grandes.)
 */
function graphicsBursts(rows) {
  const win = new Map();
  for (const r of rows) {
    if (!isWireS2c(r) || !r.len) continue;
    if (r.canal === 1007 || (r.tipo || '').startsWith('MCS-Ind ch=')) continue;
    const k = Math.floor(r.t_ms / 500);
    win.set(k, (win.get(k) || 0) + r.len);
  }
  const hot = [...win.entries()].filter(([, b]) => b >= BURST_MIN_BYTES).map(([k]) => k * 500).sort((a, b) => a - b);
  const bursts = [];
  let start = null;
  let prev = null;
  for (const t of hot) {
    if (start === null) { start = t; prev = t; continue; }
    if (t - prev > BURST_GAP_MS) { bursts.push({ start, end: prev + 500 }); start = t; }
    prev = t;
  }
  if (start !== null) bursts.push({ start, end: prev + 500 });
  return bursts;
}

/** Clusters de input de usuario (teclas/clics) tras el handshake. */
function inputClusters(rows) {
  const stamps = [];
  for (const r of rows) {
    if (!isWireC2s(r) || !r.hex64 || !r.len || r.len > 64) continue;
    if (r.t_ms < IGNORE_INPUT_BEFORE_MS) continue;
    const ev = decodeFpInput(Buffer.from(r.hex64, 'hex').subarray(0, r.len));
    if (!ev) continue;
    if (ev.some((e) => e === 'KEY' || e === 'CLICK' || e === 'UNICODE')) stamps.push(r.t_ms);
  }
  const clusters = [];
  let cur = null;
  for (const t of stamps) {
    if (!cur || t - cur.end > INPUT_CLUSTER_GAP_MS) {
      cur = { start: t, end: t, count: 1 };
      clusters.push(cur);
    } else {
      cur.end = t;
      cur.count += 1;
    }
  }
  return clusters;
}

function analyzeTrace(rows) {
  const csNet = firstCsNet(rows);
  const nameById = channelNameById(csNet);
  const channels = {};
  for (const r of rows) {
    if (r.dir !== 's2c' && r.dir !== 'c2s') continue;
    if (r.canal == null) continue;
    const name = nameById.get(r.canal) || (r.canal === 1003 ? 'io' : `ch${r.canal}`);
    const slot = channels[name] || (channels[name] = {
      id: r.canal, firstS2c: null, firstC2s: null, s2c: 0, c2s: 0
    });
    if (r.dir === 's2c') {
      slot.s2c += 1;
      if (slot.firstS2c == null) slot.firstS2c = r.t_ms;
    } else {
      slot.c2s += 1;
      if (slot.firstC2s == null) slot.firstC2s = r.t_ms;
    }
  }

  const clip = [];
  for (const r of rows) {
    if (r.dir !== 's2c' && r.dir !== 'c2s') continue;
    if (r.canal === 1003 || r.canal == null) continue;
    const ev = parseCliprdrEvent(r);
    if (ev) clip.push(ev);
  }
  const greetings = clip.filter((e) => e.dir === 's2c' && e.msg === 'CB_CLIP_CAPS');
  const gens = greetings.map((g, i) => ({
    gen: i + 1,
    t: g.t,
    canal: g.canal,
    generalFlags: g.generalFlags,
    clientAnswerMs: (() => {
      const ans = clip.find((e) => e.dir === 'c2s' && e.msg === 'CB_CLIP_CAPS' && e.t >= g.t);
      return ans ? ans.t - g.t : null;
    })(),
    clientFormatListMs: (() => {
      const ans = clip.find((e) => e.dir === 'c2s' && e.msg === 'CB_FORMAT_LIST' && e.t >= g.t);
      return ans ? ans.t - g.t : null;
    })()
  }));

  const bursts = graphicsBursts(rows);
  const clusters = inputClusters(rows).map((c) => {
    // Primera rafaga que termina despues del ultimo input del cluster (puede solaparse con el input).
    const next = bursts.find((b) => b.end > c.end && b.start >= c.start);
    return { ...c, nextBurstMs: next ? Math.max(0, next.start - c.end) : null };
  });

  return {
    csNet,
    channels,
    cliprdrGenerations: gens,
    cliprdrSequence: clip.slice(0, 40).map((e) => `${e.t}${e.dir}:${e.msg}${e.generalFlags ? '(' + e.generalFlags + ')' : ''}`),
    bursts,
    inputClusters: clusters,
    durationMs: rows.length ? rows[rows.length - 1].t_ms : 0
  };
}

function printMilestones(label, a) {
  console.log(`\n--- hitos ${label} ---`);
  console.log(`  CS_NET=[${(a.csNet || []).join(',')}]`);
  for (const [name, c] of Object.entries(a.channels)) {
    console.log(`  canal ${name}(${c.id}): firstS2c=${c.firstS2c}ms firstC2s=${c.firstC2s}ms s2c=${c.s2c} c2s=${c.c2s}`);
  }
  for (const g of a.cliprdrGenerations) {
    console.log(
      `  cliprdr gen${g.gen}: greet@${g.t}ms ch=${g.canal} flags=${g.generalFlags}` +
      ` clientCAPS+${g.clientAnswerMs}ms FORMAT_LIST+${g.clientFormatListMs}ms`
    );
  }
  console.log(`  rafagas (>=8KB/500ms): ${a.bursts.slice(0, 8).map((b) => `${b.start}-${b.end}`).join(' ') || 'ninguna'}`);
  for (const c of a.inputClusters.slice(0, 6)) {
    console.log(`  input ${c.start}-${c.end}ms (n=${c.count}) -> siguiente rafaga +${c.nextBurstMs}ms`);
  }
}

module.exports = {
  decodeFpInput,
  firstCsNet,
  channelNameById,
  graphicsBursts,
  inputClusters,
  analyzeTrace,
  printMilestones,
  STATIC_CHANNEL_BASE
};
