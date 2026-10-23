'use strict';

/**
 * Gate: inject por defecto = orden mstsc, y las capturas MITM baseline lo cumplen.
 */

const { describe, test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  resolveInjectedChannels,
  RDP_INJECTED_CHANNELS
} = require('../../src/main/services/RdpNativeBridgeService');
const {
  prepareMcsConnectInitial,
  findClientNetworkChannels,
  CS_NET
} = require('../../src/main/services/rdp-mcs-helpers');
const {
  loadJsonl,
  firstCsNet,
  csNetMatchesMstsc,
  MSTSC_CS_NET_PREFIX
} = require('./trace-diff');

function buildCsNet(channels) {
  const buf = Buffer.alloc(8 + channels.length * 12);
  buf.writeUInt16LE(CS_NET, 0);
  buf.writeUInt16LE(buf.length, 2);
  buf.writeUInt32LE(channels.length, 4);
  channels.forEach(([name, options], i) => {
    const off = 8 + i * 12;
    buf.write(name, off, 'ascii');
    buf.writeUInt32LE(options >>> 0, off + 8);
  });
  return buf;
}

function buildMcsConnectInitial(channels) {
  const userDataBlocks = buildCsNet(channels);
  const ducaLen = Buffer.from([
    0x80 | ((userDataBlocks.length >> 8) & 0x3f),
    userDataBlocks.length & 0xff
  ]);
  const gcc = Buffer.concat([
    Buffer.from([0x00, 0x05, 0x00, 0x14, 0x7c, 0x00, 0x01]),
    Buffer.from([0x81, 0x00]),
    Buffer.from([0x00, 0x08, 0x00, 0x10, 0x00, 0x01, 0xc0, 0x00]),
    Buffer.from('Duca', 'ascii'),
    ducaLen,
    userDataBlocks
  ]);
  const berPrefix = Buffer.concat([
    Buffer.from([0x04, 0x01, 0x01, 0x04, 0x01, 0x01, 0x01, 0x01, 0xff]),
    Buffer.alloc(0x1b, 0x30),
    Buffer.from([0x04, 0x82, (gcc.length >> 8) & 0xff, gcc.length & 0xff])
  ]);
  const ciContent = Buffer.concat([berPrefix, gcc]);
  const ci = Buffer.concat([
    Buffer.from([0x7f, 0x65, 0x82, (ciContent.length >> 8) & 0xff, ciContent.length & 0xff]),
    ciContent
  ]);
  const total = 4 + 3 + ci.length;
  return Buffer.concat([
    Buffer.from([0x03, 0x00, (total >> 8) & 0xff, total & 0xff]),
    Buffer.from([0x02, 0xf0, 0x80]),
    ci
  ]);
}

describe('alineacion baseline mstsc', () => {
  const prev = process.env.NODETERM_RDP_INJECT_CHANNELS;
  afterEach(() => {
    if (prev === undefined) delete process.env.NODETERM_RDP_INJECT_CHANNELS;
    else process.env.NODETERM_RDP_INJECT_CHANNELS = prev;
  });

  test('RDP_INJECTED_CHANNELS default = rdpdr+rdpsnd (orden mstsc)', () => {
    process.env.NODETERM_RDP_INJECT_CHANNELS = '';
    assert.deepEqual(RDP_INJECTED_CHANNELS, { before: ['rdpdr', 'rdpsnd'], after: [] });
    // Sin sesión: RDP directo — no inyectar por defecto.
    assert.equal(resolveInjectedChannels(), null);
    assert.deepEqual(
      resolveInjectedChannels({ useBastionWallix: true }),
      { before: ['rdpdr', 'rdpsnd'], after: [] }
    );
    assert.deepEqual(MSTSC_CS_NET_PREFIX, ['rdpdr', 'rdpsnd', 'cliprdr']);
  });

  test('prepare+inject produce prefijo rdpdr,rdpsnd,cliprdr', () => {
    process.env.NODETERM_RDP_INJECT_CHANNELS = '';
    const frame = buildMcsConnectInitial([['cliprdr', 0xc0a00000], ['drdynvc', 0xc0a00000]]);
    const inject = resolveInjectedChannels({ useBastionWallix: true });
    assert.deepEqual(inject, { before: ['rdpdr', 'rdpsnd'], after: [] });
    const res = prepareMcsConnectInitial(frame, 0x01, {
      injectChannels: inject,
      isBastion: true
    });
    const chs = findClientNetworkChannels(res.buf);
    assert.ok(csNetMatchesMstsc(chs), `got [${chs.join(',')}]`);
    assert.deepEqual(chs.slice(0, 4), ['rdpdr', 'rdpsnd', 'cliprdr', 'drdynvc']);
  });

  test('capturas MITM baseline cumplen CS_NET mstsc', () => {
    const tracesDir = path.join(__dirname, 'traces');
    const files = [
      'mstsc-selector-frio-ok.jsonl',
      'mstsc-selector-clipboard.jsonl'
    ];
    for (const name of files) {
      const p = path.join(tracesDir, name);
      if (!fs.existsSync(p)) continue;
      const rows = loadJsonl(p);
      const csNet = firstCsNet(rows);
      assert.ok(csNetMatchesMstsc(csNet), `${name} CS_NET=[${(csNet || []).join(',')}]`);
    }
  });
});
