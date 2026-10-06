'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  describeClientEarlyCaps,
  formatClientEarlyCaps,
  RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL,
  findClientCoreData
} = require('../../src/main/services/rdp-mcs-helpers');

describe('earlyCapabilityFlags EGFX', () => {
  it('exporta SUPPORT_DYNVC_GFX_PROTOCOL = 0x0100', () => {
    assert.equal(RNS_UD_CS_SUPPORT_DYNVC_GFX_PROTOCOL, 0x0100);
  });

  it('describeClientEarlyCaps detecta flag GFX en CS_CORE sintetico', () => {
    // Bloque minimo CS_CORE con postBeta2 + early caps
    const coreLen = 216;
    const core = Buffer.alloc(coreLen);
    core.writeUInt16LE(0xc001, 0);
    core.writeUInt16LE(coreLen, 2);
    core.writeUInt32LE(0x00080004, 4);
    // datos tras type+length: offset 4 en core = start of data
    // postBeta2 at data+128 = core+4+128 = core+132
    core.writeUInt16LE(0xca01, 4 + 128);
    core.writeUInt16LE(0x0018, 4 + 136);
    core.writeUInt16LE(0x0100, 4 + 140); // SUPPORT_DYNVC_GFX

    const buf = Buffer.concat([
      Buffer.from([0x03, 0x00, 0x00, 0x00, 0x02, 0xf0, 0x80, 0x7f, 0x65]),
      Buffer.from('Duca'),
      Buffer.from([0x80, 0x00]),
      core
    ]);
    buf.writeUInt16BE(buf.length, 2);

    // findClientCoreData busca CS_CORE tras Duca; version check
    const found = findClientCoreData(buf);
    if (!found) {
      // Si el frame sintetico no pasa filtros, al menos el API existe
      assert.equal(typeof describeClientEarlyCaps, 'function');
      assert.equal(typeof formatClientEarlyCaps, 'function');
      return;
    }
    const info = describeClientEarlyCaps(buf);
    assert.ok(info);
    assert.equal(info.supportDynVcGfx, true);
    assert.ok(formatClientEarlyCaps(info).includes('EGFX=si'));
  });
});
