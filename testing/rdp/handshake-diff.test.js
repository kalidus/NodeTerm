'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { parseConnectInitial, diffHandshake, firstConnectInitial } = require('./handshake-diff');
const { prepareMcsConnectInitial } = require('../../src/main/services/rdp-mcs-helpers');

const fixture = () => Buffer.from(
  fs.readFileSync(path.join(__dirname, 'frames', 'to-01-403b.hex'), 'utf8').trim(), 'hex'
);

describe('handshake-diff', () => {
  test('parsea CS_CORE y CS_NET del Connect Initial real', () => {
    const hs = parseConnectInitial(fixture());
    assert.ok(hs.blocks.includes('CS_CORE'));
    assert.ok(hs.blocks.includes('CS_NET'));
    assert.deepEqual(hs.net.map((c) => c.name), ['drdynvc']);
    assert.ok(hs.core.width > 0 && hs.core.height > 0);
  });

  test('tras inyeccion mstsc, CS_NET difiere solo en nombres inyectados', () => {
    const before = parseConnectInitial(fixture());
    const res = prepareMcsConnectInitial(fixture(), 0x01, {
      injectChannels: { before: ['rdpdr', 'rdpsnd'], after: [] }
    });
    const after = parseConnectInitial(res.buf);
    assert.deepEqual(after.net.map((c) => c.name), ['rdpdr', 'rdpsnd', 'drdynvc']);
    const diffs = diffHandshake(before, after);
    assert.ok(diffs.some((d) => d.startsWith('CS_NET')));
  });

  test('sin hex completo avisa en vez de fallar', () => {
    assert.equal(firstConnectInitial([{ dir: 'c2s', hex64: '0300' }]), null);
    assert.equal(diffHandshake(null, null).length, 1);
  });
});
