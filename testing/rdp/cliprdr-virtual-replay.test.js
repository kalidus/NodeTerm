'use strict';

/**
 * Replay de las trazas mstsc (APP / RDP / selector) contra la capa virtual:
 * el servidor saluda cliprdr en el VC nombrado (1006) y el filtro debe entregarlo a
 * IronRDP verbatim, detectar la 2a generacion (CAPS 0x3e tras el dialogo de Wallix)
 * y preparar el rehandshake hacia el servidor con flags 0x3e.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  createChannelFilterState,
  processServerFrame,
  takeCliprdrRehandshake,
  buildClientCliprdrCapsFrame
} = require('../../src/main/services/rdp-channel-filter');

const TR = path.join(__dirname, 'traces');
// Baselines versionadas en traces/matrix/ (traces/*.jsonl esta en .gitignore).
const BASELINES = [
  { scenario: 'APP', service: 'APP', file: path.join(TR, 'matrix', 'mstsc-app-frio-1.jsonl') },
  { scenario: 'RDP', service: 'RDP', file: path.join(TR, 'matrix', 'mstsc-rdp-frio-1.jsonl') }
];

function loadRows(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function scNetFrame() {
  const ids = [1004, 1005, 1006, 1007];
  const f = Buffer.alloc(4 + 8 + ids.length * 2);
  f[0] = 3;
  f.writeUInt16BE(f.length, 2);
  f.writeUInt16LE(0x0c03, 4);
  f.writeUInt16LE(8 + ids.length * 2, 6);
  f.writeUInt16LE(1003, 8);
  f.writeUInt16LE(ids.length, 10);
  ids.forEach((id, i) => f.writeUInt16LE(id, 12 + i * 2));
  return f;
}

function virtualState(service) {
  const st = createChannelFilterState();
  st.isBastion = true;
  st.virtualChannels = true;
  st.wallixService = service;
  st.wasmChannelNames = ['cliprdr', 'drdynvc'];
  st.clientChannelNames = ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'];
  processServerFrame(st, scNetFrame());
  return st;
}

/** Frames s2c completos (hex64 sin truncar) del canal cliprdr 1006. */
function cliprdrFrames(rows) {
  return rows
    .filter((r) => r.dir === 's2c' && r.canal === 1006 && r.hex64)
    .map((r) => ({ t: r.t_ms, buf: Buffer.from(r.hex64, 'hex'), len: r.len }))
    .filter((f) => f.buf.length === f.len);
}

for (const b of BASELINES) {
  describe(`replay mstsc ${b.scenario}: cliprdr en VC nombrado`, () => {
    const frames = cliprdrFrames(loadRows(b.file));

    test('hay saludo gen1 y gen2 en la traza', () => {
      assert.ok(frames.length >= 4, `frames=${frames.length}`);
    });

    test('cada PDU del servidor llega verbatim a WASM, sin descartes', () => {
      const st = virtualState(b.service);
      const descs = [];
      for (const f of frames) {
        const res = processServerFrame(st, f.buf);
        assert.equal(res.dropped, false, `t=${f.t} ${res.note}`);
        assert.ok(res.forward && res.forward.equals(f.buf), `t=${f.t} no verbatim: ${res.note}`);
        assert.equal(res.isCliprdr, true);
        descs.push(res.cliprdrDesc);
      }
      const first = descs.findIndex((d) => /CB_CLIP_CAPS/.test(d));
      const ready1 = descs.findIndex((d) => /CB_MONITOR_READY/.test(d));
      assert.ok(first >= 0 && ready1 > first, 'CAPS antes de MONITOR_READY');
      assert.ok(descs.filter((d) => /CB_MONITOR_READY/.test(d)).length >= 2, 'dos generaciones');
    });

    test('gen1 CAPS 0x2; gen2 CAPS 0x3e y rehandshake pendiente tras el 2o READY', () => {
      const st = virtualState(b.service);
      const seenFlags = [];
      for (const f of frames) {
        const res = processServerFrame(st, f.buf);
        if (/CB_CLIP_CAPS/.test(res.cliprdrDesc || '')) seenFlags.push(st.cliprdrServerGeneralFlags);
      }
      assert.equal(seenFlags[0], 0x2);
      assert.equal(seenFlags[seenFlags.length - 1], 0x3e);
      assert.equal(st.cliprdrMonitorReadyCount >= 2, true);
    });

    test('rehandshake hacia el servidor: CAPS con flags 0x3e por el VC real', () => {
      const st = virtualState(b.service);
      for (const f of frames) processServerFrame(st, f.buf);
      st.cliprdrRehandshakePending = true;
      st.cachedClientCaps = buildClientCliprdrCapsFrame(1006, { initiator: 1002, generalFlags: 0x2 });
      st.cliprdrWriteChannelId = 1006;
      const out = takeCliprdrRehandshake(st);
      assert.ok(out.length >= 1, 'se emite al menos CAPS');
      const caps = out[0];
      // MCS SendDataRequest: canal en bytes 10..11
      assert.equal(caps.readUInt16BE(10), 1006);
      assert.equal(caps.readUInt32LE(caps.length - 4), 0x3e);
    });
  });
}
