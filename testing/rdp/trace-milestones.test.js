'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { analyzeTrace, decodeFpInput } = require('./trace-milestones');
const { loadJsonl, milestoneDiffs } = require('./trace-diff');
const { createPduTraceWriter } = require('../../src/main/services/rdp-pdu-trace');

const TRACES = path.join(__dirname, 'traces');
const hasTrace = (name) => fs.existsSync(path.join(TRACES, name));

describe('trace-milestones sobre baselines mstsc', () => {
  test('mstsc APP: CS_NET sin rail, saludo cliprdr en 1006 y gen2 0x3e', { skip: !hasTrace('mstsc-app-clipboard.jsonl') }, () => {
    const a = analyzeTrace(loadJsonl(path.join(TRACES, 'mstsc-app-clipboard.jsonl')));
    assert.deepEqual(a.csNet, ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc']);
    assert.equal(a.channels.cliprdr.id, 1006);
    assert.ok(a.channels.cliprdr.firstS2c < 1500, 'gen1 en el primer segundo');
    assert.ok(a.cliprdrGenerations.length >= 2);
    assert.equal(a.cliprdrGenerations[0].generalFlags, '0x2');
    assert.equal(a.cliprdrGenerations[1].generalFlags, '0x3e');
    assert.ok(a.cliprdrGenerations[0].clientFormatListMs != null, 'mstsc contesta FORMAT_LIST en gen1');
    assert.ok(a.cliprdrGenerations[1].clientFormatListMs != null, 'mstsc contesta FORMAT_LIST en gen2');
  });

  test('mstsc RDP y selector: mismo CS_NET y cliprdr en 1006', { skip: !hasTrace('mstsc-rdp-clipboard.jsonl') }, () => {
    for (const f of ['mstsc-rdp-clipboard.jsonl', 'mstsc-selector-clipboard.jsonl']) {
      const a = analyzeTrace(loadJsonl(path.join(TRACES, f)));
      assert.deepEqual(a.csNet, ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'], f);
      assert.equal(a.channels.cliprdr.id, 1006, f);
    }
  });

  test('milestoneDiffs detecta rail y otro canal de saludo', () => {
    const a = {
      csNet: ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'],
      channels: { cliprdr: { id: 1006, firstS2c: 600 } },
      cliprdrGenerations: [{ generalFlags: '0x2', clientFormatListMs: 1 }]
    };
    const b = {
      csNet: ['rail', 'rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc'],
      channels: { cliprdr: { id: 1007, firstS2c: 5700 } },
      cliprdrGenerations: []
    };
    const d = milestoneDiffs(a, b).join('\n');
    assert.match(d, /CS_NET distinto/);
    assert.match(d, /cliprdr canal: A=1006 B=1007/);
    assert.match(d, /generaciones cliprdr: A=1 B=0/);
  });
});

describe('decodeFpInput', () => {
  test('decodifica click de raton y tecla', () => {
    // header(1) + len(1) + eventHeader 0x20 (mouse) + flags(2) + x(2) + y(2)
    const mk = (flagsLo, flagsHi) => {
      const f = Buffer.from([0x04, 0x00, 0x20, flagsLo, flagsHi, 0x10, 0x00, 0x10, 0x00]);
      f[1] = f.length;
      return f;
    };
    assert.deepEqual(decodeFpInput(mk(0x00, 0x08)), ['MOVE']);
    assert.deepEqual(decodeFpInput(mk(0x00, 0x90)), ['CLICK']);
    assert.equal(decodeFpInput(Buffer.from([0x04, 0x30, 0x20])), null);
  });
});

describe('createPduTraceWriter', () => {
  test('hex completo en los primeros frames, input compacto y src', () => {
    const file = path.join(os.tmpdir(), `nt-trace-${process.pid}-${Date.now()}.jsonl`);
    const w = createPduTraceWriter(file, { label: 'test' });
    const frame = Buffer.concat([Buffer.from([0x03, 0x00, 0x00, 0x20]), Buffer.alloc(28, 0xab)]);
    w.write('s2c', frame, undefined, { src: 'wire' });
    w.write('s2c-wasm', frame, undefined, { src: 'wasm' });
    w.writeInput('c2s', Buffer.from([0x04, 0x05, 0x20, 0x00, 0x00]), 'client');
    w.close();
    return new Promise((resolve) => setTimeout(resolve, 80)).then(() => {
      const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
      fs.unlinkSync(file);
      const wire = rows.find((r) => r.dir === 's2c');
      assert.equal(wire.src, 'wire');
      assert.equal(wire.hex, frame.toString('hex'));
      const wasm = rows.find((r) => r.dir === 's2c-wasm');
      assert.equal(wasm.src, 'wasm');
      const inp = rows.find((r) => r.tipo === 'FastPath INPUT');
      assert.equal(inp.note, 'client');
      assert.equal(inp.hex, undefined);
    });
  });
});
