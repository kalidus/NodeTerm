'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  findClientCoreData,
  ensureMcsServerSelectedProtocol,
  fixWallixGccConnectPduLength,
  prepareMcsConnectInitial,
  SERVER_SELECTED_PROTOCOL_OFFSET
} = require('../../src/main/services/rdp-mcs-helpers');

function buildFakeMcsWithCore(serverSelectedProtocol, coreLen = 216) {
  // Prefijo ficticio + CS_CORE
  const prefix = Buffer.from([0x03, 0x00, 0x01, 0x00, 0x02, 0xf0, 0x80, 0x7f, 0x65, 0x82]);
  const core = Buffer.alloc(coreLen, 0);
  core.writeUInt16LE(0xc001, 0);
  core.writeUInt16LE(coreLen, 2);
  // version RDP 5+ 
  core.writeUInt32LE(0x00080004, 4);
  if (coreLen >= 216) {
    core.writeUInt32LE(serverSelectedProtocol >>> 0, SERVER_SELECTED_PROTOCOL_OFFSET);
  }
  return Buffer.concat([prefix, core, Buffer.from([0xaa, 0xbb])]);
}

describe('ensureMcsServerSelectedProtocol', () => {
  it('parchea 0x00 -> 0x01', () => {
    const input = buildFakeMcsWithCore(0x00);
    const before = findClientCoreData(input);
    assert.equal(before.serverSelectedProtocol, 0);

    const { buf, patched, previous } = ensureMcsServerSelectedProtocol(input, 0x01);
    assert.equal(patched, true);
    assert.equal(previous, 0);
    assert.equal(findClientCoreData(buf).serverSelectedProtocol, 0x01);
    // no muta input
    assert.equal(findClientCoreData(input).serverSelectedProtocol, 0);
  });

  it('no toca si ya es correcto', () => {
    const input = buildFakeMcsWithCore(0x01);
    const { patched, reason } = ensureMcsServerSelectedProtocol(input, 0x01);
    assert.equal(patched, false);
    assert.equal(reason, 'already-correct');
  });
});

describe('fixWallixGccConnectPduLength', () => {
  function loadIronMcs() {
    const candidates = [
      path.join(__dirname, 'frames/to-01-403b.hex'),
      path.join(__dirname, 'last-mcs-connect-initial.hex')
    ];
    for (const hexPath of candidates) {
      if (!fs.existsSync(hexPath)) continue;
      const buf = Buffer.from(fs.readFileSync(hexPath, 'utf8').trim(), 'hex');
      if (buf.length > 100 && buf[0] === 0x03) return buf;
    }
    return null;
  }

  it('corrige connectPDU len +12 -> +14 en dump Iron real', () => {
    const iron = loadIronMcs();
    if (!iron) return;
    const result = fixWallixGccConnectPduLength(iron);
    assert.equal(result.patched, true);
    assert.equal(result.userDataLen, 266);
    assert.equal(result.oldLen, 278); // 266+12
    assert.equal(result.newLen, 280); // 266+14

    const again = fixWallixGccConnectPduLength(result.buf);
    assert.equal(again.patched, false);
    assert.equal(again.reason, 'already-ok');
  });

  it('prepareMcsConnectInitial incluye parche Wallix', () => {
    const iron = loadIronMcs();
    if (!iron) return;
    const prepared = prepareMcsConnectInitial(iron, 1);
    assert.ok(prepared.notes.some((n) => n.includes('Wallix GCC connectPDU')));
    const core = findClientCoreData(prepared.buf);
    assert.ok(core);
    assert.equal(core.serverSelectedProtocol, 1);
    assert.equal(prepared.buf.readUInt32LE(core.offset + 20), 19041);
  });
});
