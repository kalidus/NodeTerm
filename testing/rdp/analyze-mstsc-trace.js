'use strict';

const fs = require('fs');
const path = require('path');

const tracePath = process.argv[2] || path.join(__dirname, 'traces/mstsc-selector-frio.jsonl');
const lines = fs.readFileSync(tracePath, 'utf8').trim().split(/\n/).map((l) => JSON.parse(l));

console.log('=== RESUMEN ===');
console.log({
  frames: lines.length,
  duration_ms: lines.at(-1).t_ms,
  bytes: lines.reduce(
    (a, o) => {
      if (o.len) {
        if (o.dir === 'c2s') a.c2s += o.len;
        if (o.dir === 's2c') a.s2c += o.len;
      }
      return a;
    },
    { c2s: 0, s2c: 0 }
  )
});

const marks = lines.filter((o) => o.dir === 'mark' || o.dir === 'meta');
for (const o of marks) {
  console.log(`MARK ${o.t_ms}ms ${o.tipo} ${o.detail || o.label || ''}`);
}

/** Fast-Path Input (cliente): eventCode en bits altos del eventHeader. */
function decodeFpInput(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 3) return null;
  if ((buf[0] & 0x03) !== 0) return null;
  const long = (buf[1] & 0x80) !== 0;
  const len = long ? ((buf[1] & 0x7f) << 8) | buf[2] : buf[1];
  if (len !== buf.length) return null;
  let off = long ? 3 : 2;
  const events = [];
  while (off < buf.length) {
    const eh = buf[off++];
    const eventCode = (eh >> 5) & 0x07;
    const eventFlags = eh & 0x1f;
    if (eventCode === 0) {
      if (off >= buf.length) break;
      events.push({ type: 'SCAN', flags: eventFlags, code: buf[off++], up: !!(eventFlags & 1) });
    } else if (eventCode === 1) {
      if (off + 6 > buf.length) break;
      const flags = buf.readUInt16LE(off);
      off += 2;
      const x = buf.readUInt16LE(off);
      off += 2;
      const y = buf.readUInt16LE(off);
      off += 2;
      events.push({ type: 'MOUSE', flags, x, y });
    } else if (eventCode === 2) {
      if (off + 6 > buf.length) break;
      off += 6;
      events.push({ type: 'MOUSEX' });
    } else if (eventCode === 3) {
      events.push({ type: 'SYNC', flags: eventFlags });
    } else if (eventCode === 4) {
      if (off + 2 > buf.length) break;
      const u = buf.readUInt16LE(off);
      off += 2;
      events.push({ type: 'UNICODE', flags: eventFlags, u, up: !!(eventFlags & 1) });
    } else {
      events.push({ type: `CODE${eventCode}`, flags: eventFlags });
      break;
    }
  }
  return events;
}

const scans = [];
const mice = [];
for (const o of lines.filter((x) => x.dir === 'c2s' && x.hex64 && x.len && x.len <= 64)) {
  const buf = Buffer.from(o.hex64, 'hex').subarray(0, o.len);
  const events = decodeFpInput(buf);
  if (!events) continue;
  for (const e of events) {
    if (e.type === 'SCAN' || e.type === 'UNICODE' || e.type === 'SYNC') {
      scans.push({ t: o.t_ms, ...e });
    } else if (e.type === 'MOUSE' || e.type === 'MOUSEX') {
      mice.push({ t: o.t_ms, ...e });
    }
  }
}

console.log('\n=== INPUT CLIENTE (Fast-Path decodificado, frames <=64B) ===');
console.log(`teclado/sync: ${scans.length}  raton: ${mice.length}`);
const scanSummary = {};
for (const s of scans) {
  const k =
    s.type === 'SCAN'
      ? `SCAN 0x${s.code.toString(16)}${s.up ? ' UP' : ' DN'}`
      : s.type === 'UNICODE'
        ? `UNI U+${s.u.toString(16)}${s.up ? ' UP' : ' DN'}`
        : s.type;
  scanSummary[k] = (scanSummary[k] | 0) + 1;
}
console.log('teclas:', scanSummary);
console.log('primeras teclas:', scans.slice(0, 30));
console.log(
  'clicks raton:',
  mice.filter((m) => m.type === 'MOUSE' && m.flags && m.flags !== 0x0800).slice(0, 20)
);

console.log('\n=== HANDSHAKE MCS / SHARE ===');
for (const o of lines) {
  const t = o.tipo || '';
  if (
    /x224|MCS-PDU 0x7f|Erect|Attach|ChannelJoin|SHARE_0|DEMAND|CONFIRM|Licens|sc-core/i.test(t) ||
    o.note
  ) {
    if (o.t_ms > 500 && !o.note) continue;
    console.log(
      `${o.t_ms}ms ${o.dir} ${(t + (o.note ? ' [' + o.note + ']' : '')).slice(0, 90)} len=${o.len || ''}` +
        (o.csNet ? ` csNet=${o.csNet.join(',')}` : '')
    );
  }
}

console.log('\n=== CANALES ESTATICOS (joins + trafico) ===');
const joins = lines.filter((o) => /ChannelJoinConfirm/.test(o.tipo || ''));
for (const o of joins) console.log(`${o.t_ms}ms ${o.tipo}`);

const chanMap = {
  1003: 'I/O (share)',
  1004: 'rdpdr?',
  1005: 'rdpsnd?',
  1006: 'cliprdr?',
  1007: 'drdynvc?'
};
// CS_NET order rdpdr,rdpsnd,cliprdr,drdynvc => 1004..1007
Object.assign(chanMap, { 1004: 'rdpdr', 1005: 'rdpsnd', 1006: 'cliprdr', 1007: 'drdynvc' });

const byCh = {};
for (const o of lines) {
  const m = (o.tipo || '').match(/ch=(\d+)/);
  if (!m) continue;
  const id = m[1];
  const key = `${o.dir}:${id}:${chanMap[id] || '?'}`;
  if (!byCh[key]) byCh[key] = { n: 0, bytes: 0 };
  byCh[key].n += 1;
  byCh[key].bytes += o.len || 0;
}
console.log(byCh);

console.log('\n=== TRAFICO ch 1006/1007 detalle ===');
for (const o of lines.filter((o) => /ch=100[67]/.test(o.tipo || ''))) {
  console.log(`${o.t_ms}ms ${o.dir} ${(o.tipo || '').slice(0, 75)} len=${o.len}`);
}

console.log('\n=== S2C KB/s (grafico selector) ===');
const buckets = new Map();
for (const o of lines.filter((x) => x.dir === 's2c' && x.len)) {
  const b = Math.floor(o.t_ms / 1000);
  buckets.set(b, (buckets.get(b) | 0) + o.len);
}
for (const [s, b] of [...buckets.entries()].sort((a, c) => a[0] - c[0])) {
  const bar = '#'.repeat(Math.min(60, Math.round(b / 1024 / 5)));
  console.log(`${String(s).padStart(2)}s ${(b / 1024).toFixed(1).padStart(7)}KB ${bar}`);
}

// Fases burdas
console.log('\n=== FASES (heuristica) ===');
const firstFp = lines.find((o) => o.dir === 's2c' && /FastPath/.test(o.tipo || ''));
const firstBig = lines.find((o) => o.dir === 's2c' && (o.len || 0) > 5000);
const lastBigBurst = [...lines].reverse().find((o) => o.dir === 's2c' && (o.len || 0) > 2000);
const firstScan = scans[0];
const lastScan = scans[scans.length - 1];
console.log({
  handshake_ms: firstFp ? firstFp.t_ms : null,
  primer_frame_grande_ms: firstBig && firstBig.t_ms,
  ultimo_burst_grafico_ms: lastBigBurst && lastBigBurst.t_ms,
  primer_tecla_ms: firstScan && firstScan.t,
  ultima_tecla_ms: lastScan && lastScan.t,
  cierre_ms: lines.at(-1).t_ms
});
